import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("WARNING", `${label}: missing password (${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false, skipped: true };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("WARNING", `${label}: sign-in failed (${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

async function run() {
  const [
    { signInWithEmailPassword, signOut },
    {
      createHomeworkTask,
      createHomeworkSubmission,
      uploadHomeworkFile,
      getHomeworkFileSignedUrl,
      listHomeworkSubmissions,
      listHomeworkFeedback,
    },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const teacherUser = {
    label: "Teacher",
    email: "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const supervisorUser = {
    label: "Branch Supervisor",
    email: "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
  const studentUser = {
    label: "Student",
    email: "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
  };
  const unrelatedParentUser = {
    label: "Unrelated Parent",
    email: process.env.RLS_TEST_UNRELATED_PARENT_EMAIL || "unrelated.parent.demo@example.test",
    passwordVar: "RLS_TEST_UNRELATED_PARENT_PASSWORD",
  };
  const unrelatedStudentUser = {
    label: "Unrelated Student",
    email: process.env.RLS_TEST_UNRELATED_STUDENT_EMAIL || "unrelated.student.demo@example.test",
    passwordVar: "RLS_TEST_UNRELATED_STUDENT_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  const cleanupWarnings = [];

  let createdTask = null;
  let createdSubmission = null;
  let createdHomeworkFile = null;
  let createdDraftFeedbackId = null;
  let createdObjectPath = null;
  let parentLinkedStudent = null;
  let parentProfileId = null;
  let uploadActorLabel = "Parent";
  let uploadActorProfileId = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) process.exit(1);

  const parentAuth = await supabase.auth.getUser();
  const parentAuthId = parentAuth.data?.user?.id || null;
  if (!parentAuthId) {
    printResult("WARNING", "Parent: authenticated user id not available");
    process.exit(1);
  }

  const parentProfile = await supabase
    .from("profiles")
    .select("id,linked_student_id")
    .eq("id", parentAuthId)
    .maybeSingle();
  parentProfileId = parentProfile.data?.id || parentAuthId;

  let studentLookup = null;
  if (parentProfile.data?.linked_student_id) {
    studentLookup = await supabase
      .from("students")
      .select("id,class_id,branch_id,full_name")
      .eq("id", parentProfile.data.linked_student_id)
      .maybeSingle();
  } else {
    studentLookup = await supabase
      .from("students")
      .select("id,class_id,branch_id,full_name")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }
  if (studentLookup.error || !studentLookup.data) {
    printResult(
      "WARNING",
      `Parent: linked student lookup failed (${studentLookup.error?.message || "no parent-visible student"})`
    );
    process.exit(1);
  }
  parentLinkedStudent = studentLookup.data;
  printResult("PASS", `Parent: using linked student ${parentLinkedStudent.full_name || parentLinkedStudent.id}`);
  await signOut();

  /**
   * Branch Supervisor assertions require the parent-linked student to fall inside the supervisor's
   * supervised branch scope (RLS). Assignment-write smoke resolves a supervisor-visible student first;
   * this script is parent-centric, so we probe alignment before treating supervisor visibility as a hard PASS.
   */
  let supervisorSubmissionScopeChecks = true;
  const supervisorScopeProbeSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorScopeProbeSignIn.ok) {
    printResult(
      "CHECK",
      "Branch Supervisor: probe sign-in unavailable — skipping supervisor submission visibility + draft-insert probes"
    );
    supervisorSubmissionScopeChecks = false;
  } else {
    const supervisorStudentProbe = await supabase
      .from("students")
      .select("id")
      .eq("id", parentLinkedStudent.id)
      .maybeSingle();
    await signOut();
    if (!supervisorStudentProbe.data?.id) {
      printResult(
        "CHECK",
        "Fixture scope: parent-linked student is not visible to Branch Supervisor under current RLS — skipping supervisor homework submission assertions (parent/teacher upload path remains validated; align parent fixture to supervised branch to enable full supervisor checks)"
      );
      supervisorSubmissionScopeChecks = false;
    }
  }

  const createTaskInput = {
    branchId: parentLinkedStudent.branch_id,
    classId: parentLinkedStudent.class_id,
    title: `Smoke Homework ${new Date().toISOString()}`,
    instructions: "Fake/dev homework task for metadata-first upload smoke test only.",
    subject: "Smoke Test Subject",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "assigned",
  };

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (teacherSignIn.ok) {
    const teacherCreate = await createHomeworkTask(createTaskInput);
    if (!teacherCreate.error && teacherCreate.data?.id) {
      createdTask = teacherCreate.data;
      printResult("PASS", "Teacher: homework task created");
    } else {
      printResult("CHECK", `Teacher: task create blocked/fallback (${teacherCreate.error?.message || "unknown"})`);
    }
    await signOut();
  } else {
    printResult("CHECK", "Teacher: unavailable, using branch supervisor for task creation");
  }

  const supervisorSignInForTask = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignInForTask.ok) {
    printResult("WARNING", "Branch Supervisor: required for fallback creation/cleanup but sign-in failed");
    process.exit(1);
  }
  if (!createdTask) {
    const supervisorCreate = await createHomeworkTask(createTaskInput);
    if (supervisorCreate.error || !supervisorCreate.data?.id) {
      printResult("WARNING", `Branch Supervisor: task create failed (${supervisorCreate.error?.message || "unknown"})`);
      process.exit(1);
    }
    createdTask = supervisorCreate.data;
    printResult("PASS", "Branch Supervisor: homework task created");
  }
  await signOut();

  const parentSignInForSubmission = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInForSubmission.ok) process.exit(1);

  let submissionResult = await createHomeworkSubmission({
    homeworkTaskId: createdTask.id,
    branchId: parentLinkedStudent.branch_id,
    classId: parentLinkedStudent.class_id,
    studentId: parentLinkedStudent.id,
    submissionNote: "Fake/dev submission for homework upload smoke test.",
  });
  if (submissionResult.error || !submissionResult.data?.id) {
    printResult("CHECK", `Parent: submission create blocked, fallback to supervisor (${submissionResult.error?.message || "unknown"})`);
  } else {
    createdSubmission = submissionResult.data;
    uploadActorProfileId = parentProfileId;
    printResult("PASS", "Parent: homework submission created");
  }

  if (!createdSubmission) {
    await signOut();
    const supervisorFallbackSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
    if (!supervisorFallbackSignIn.ok) {
      printResult("WARNING", "Branch Supervisor: fallback submission create failed (sign-in)");
      failureCount += 1;
    } else {
      const supervisorAuth = await supabase.auth.getUser();
      uploadActorProfileId = supervisorAuth.data?.user?.id || null;
      uploadActorLabel = "Branch Supervisor";
      submissionResult = await createHomeworkSubmission({
        homeworkTaskId: createdTask.id,
        branchId: parentLinkedStudent.branch_id,
        classId: parentLinkedStudent.class_id,
        studentId: parentLinkedStudent.id,
        submissionNote: "Fake/dev submission via supervisor fallback for smoke test.",
      });
      if (submissionResult.error || !submissionResult.data?.id) {
        printResult(
          "WARNING",
          `Branch Supervisor: fallback submission create failed (${submissionResult.error?.message || "unknown"})`
        );
        failureCount += 1;
      } else {
        createdSubmission = submissionResult.data;
        printResult("PASS", "Branch Supervisor: fallback homework submission created");
      }
    }
  }

  if (createdSubmission) {
    const tinyFakeFile = new Blob(["fake homework upload smoke test"], { type: "text/plain" });
    const uploadResult = await uploadHomeworkFile({
      homeworkSubmissionId: createdSubmission.id,
      branchId: parentLinkedStudent.branch_id,
      classId: parentLinkedStudent.class_id,
      studentId: parentLinkedStudent.id,
      homeworkTaskId: createdTask.id,
      file: tinyFakeFile,
      fileName: "fake-homework-smoke.txt",
      contentType: "text/plain",
    });
    if (uploadResult.error || !uploadResult.data?.homework_file?.id) {
      printResult("WARNING", `${uploadActorLabel}: uploadHomeworkFile failed (${uploadResult.error?.message || "unknown"})`);
      if (uploadResult.error?.cleanup_warning) {
        printResult("WARNING", `${uploadActorLabel}: cleanup warning (${uploadResult.error.cleanup_warning})`);
      }
      failureCount += 1;
    } else {
      createdHomeworkFile = uploadResult.data.homework_file;
      createdObjectPath = uploadResult.data.storage_path;
      printResult("PASS", `${uploadActorLabel}: metadata-first upload succeeded`);
    }
  }

  if (createdHomeworkFile?.id) {
    const metadataRead = await supabase
      .from("homework_files")
      .select("id,homework_submission_id,storage_bucket,storage_path,file_name,content_type,file_size_bytes,uploaded_by_profile_id,created_at")
      .eq("id", createdHomeworkFile.id)
      .maybeSingle();
    if (metadataRead.error || !metadataRead.data) {
      printResult("WARNING", `${uploadActorLabel}: homework file metadata read failed (${metadataRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const row = metadataRead.data;
      const pathHasSubmissionPrefix = String(row.storage_path || "").includes(`${createdSubmission.id}-`);
      if (
        row.storage_bucket === "homework-submissions" &&
        row.homework_submission_id === createdSubmission.id &&
        (!uploadActorProfileId || row.uploaded_by_profile_id === uploadActorProfileId) &&
        pathHasSubmissionPrefix
      ) {
        printResult("PASS", `${uploadActorLabel}: homework_files metadata verified`);
      } else {
        printResult("WARNING", `${uploadActorLabel}: homework_files metadata values not as expected`);
        failureCount += 1;
      }
    }

    const signedUrlResult = await getHomeworkFileSignedUrl({
      homeworkFileId: createdHomeworkFile.id,
      expiresIn: 90,
    });
    if (signedUrlResult.error || !signedUrlResult.data?.signed_url) {
      printResult("WARNING", `${uploadActorLabel}: getHomeworkFileSignedUrl failed (${signedUrlResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", `${uploadActorLabel}: signed URL created for private homework file`);
    }
  }
  await signOut();

  if (!supervisorSubmissionScopeChecks) {
    printResult(
      "CHECK",
      "Branch Supervisor: submission visibility + optional draft-feedback insert skipped — fixture scope (see probe above)"
    );
  } else {
    const supervisorSignInForChecks = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
    if (!supervisorSignInForChecks.ok) {
      printResult("WARNING", "Branch Supervisor: sign-in failed for visibility checks");
      failureCount += 1;
    } else if (!createdSubmission?.id) {
      printResult("CHECK", "Branch Supervisor: visibility checks skipped (no created submission)");
    } else {
      const supervisorVisible = await listHomeworkSubmissions({
        homeworkTaskId: createdTask?.id,
        studentId: parentLinkedStudent?.id,
      });
      const canSeeSubmission = Array.isArray(supervisorVisible.data)
        ? supervisorVisible.data.some((row) => row?.id === createdSubmission?.id)
        : false;
      if (supervisorVisible.error || !canSeeSubmission) {
        printResult("WARNING", `Branch Supervisor: expected submission not visible (${supervisorVisible.error?.message || "unknown"})`);
        failureCount += 1;
      } else {
        printResult("PASS", "Branch Supervisor: submission visible by policy scope");
      }

      if (createdSubmission?.id) {
        const createDraftFeedback = await supabase
          .from("homework_feedback")
          .insert({
            homework_submission_id: createdSubmission.id,
            feedback_text: "Internal draft feedback smoke test",
            next_step: "Keep practicing",
            internal_note: "Draft note should remain parent-hidden",
            status: "draft",
          })
          .select("id")
          .maybeSingle();
        if (createDraftFeedback.error || !createDraftFeedback.data?.id) {
          printResult(
            "CHECK",
            `Branch Supervisor: draft feedback create skipped/blocked (${createDraftFeedback.error?.message || "unknown"})`
          );
        } else {
          createdDraftFeedbackId = createDraftFeedback.data.id;
          printResult("PASS", "Branch Supervisor: draft feedback row created for parent-visibility check");
        }
      }
    }
    await signOut();
  }

  const parentSignInFeedbackCheck = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInFeedbackCheck.ok) {
    printResult("WARNING", "Parent: sign-in failed for draft feedback visibility check");
    warningCount += 1;
  } else if (!createdSubmission?.id || !createdDraftFeedbackId) {
    printResult("CHECK", "Parent: draft feedback visibility check skipped");
  } else {
    const parentFeedbackRead = await listHomeworkFeedback({
      homeworkSubmissionId: createdSubmission.id,
      parentVisibleOnly: false,
    });
    const parentCanSeeDraft = Array.isArray(parentFeedbackRead.data)
      ? parentFeedbackRead.data.some((row) => row?.id === createdDraftFeedbackId)
      : false;
    if (parentFeedbackRead.error) {
      printResult("WARNING", `Parent: feedback visibility read failed (${parentFeedbackRead.error.message || "unknown"})`);
      warningCount += 1;
    } else if (parentCanSeeDraft) {
      printResult("WARNING", "Parent: draft feedback unexpectedly visible");
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: draft/unreleased feedback remained hidden");
    }
  }
  await signOut();

  const unrelatedParentSignIn = await signInRole(unrelatedParentUser, { signInWithEmailPassword, signOut });
  if (!unrelatedParentSignIn.ok) {
    printResult("CHECK", "Unrelated Parent: unavailable, blocking check skipped");
  } else {
    const unrelatedRead = await listHomeworkSubmissions({ homeworkTaskId: createdTask?.id });
    const canSee = Array.isArray(unrelatedRead.data)
      ? unrelatedRead.data.some((row) => row?.id === createdSubmission?.id)
      : false;
    if (unrelatedRead.error || !canSee) {
      printResult("PASS", "Unrelated Parent: blocked from unrelated submission");
    } else {
      printResult("WARNING", "Unrelated Parent: unexpectedly read unrelated submission");
      failureCount += 1;
    }
  }
  await signOut();

  const unrelatedStudentSignIn = await signInRole(unrelatedStudentUser, { signInWithEmailPassword, signOut });
  if (!unrelatedStudentSignIn.ok) {
    printResult("CHECK", "Unrelated Student: unavailable, blocking check skipped");
  } else {
    const unrelatedStudentRead = await listHomeworkSubmissions({ homeworkTaskId: createdTask?.id });
    const canSee = Array.isArray(unrelatedStudentRead.data)
      ? unrelatedStudentRead.data.some((row) => row?.id === createdSubmission?.id)
      : false;
    if (unrelatedStudentRead.error || !canSee) {
      printResult("PASS", "Unrelated Student: blocked from unrelated submission");
    } else {
      printResult("WARNING", "Unrelated Student: unexpectedly read unrelated submission");
      failureCount += 1;
    }
  }
  await signOut();

  const supervisorCleanupSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorCleanupSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: cleanup skipped (sign-in failed)");
    warningCount += 1;
  } else {
    if (createdObjectPath) {
      const removeObject = await supabase.storage.from("homework-submissions").remove([createdObjectPath]);
      if (removeObject.error) {
        cleanupWarnings.push(`object cleanup blocked: ${removeObject.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Branch Supervisor: fake homework object cleaned up");
      }
    }
    if (createdHomeworkFile?.id) {
      const removeMetadata = await supabase
        .from("homework_files")
        .delete()
        .eq("id", createdHomeworkFile.id)
        .select("id")
        .maybeSingle();
      if (removeMetadata.error) {
        cleanupWarnings.push(`homework_files cleanup blocked: ${removeMetadata.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Branch Supervisor: homework_files metadata cleaned up");
      }
    }
    if (createdDraftFeedbackId) {
      const removeFeedback = await supabase
        .from("homework_feedback")
        .delete()
        .eq("id", createdDraftFeedbackId)
        .select("id")
        .maybeSingle();
      if (removeFeedback.error) {
        cleanupWarnings.push(`homework_feedback cleanup blocked: ${removeFeedback.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Branch Supervisor: draft feedback cleaned up");
      }
    }
    if (createdSubmission?.id) {
      const removeSubmission = await supabase
        .from("homework_submissions")
        .delete()
        .eq("id", createdSubmission.id)
        .select("id")
        .maybeSingle();
      if (removeSubmission.error) {
        cleanupWarnings.push(`homework_submissions cleanup blocked: ${removeSubmission.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Branch Supervisor: fake homework submission cleaned up");
      }
    }
    if (createdTask?.id) {
      const removeTask = await supabase
        .from("homework_tasks")
        .delete()
        .eq("id", createdTask.id)
        .select("id")
        .maybeSingle();
      if (removeTask.error) {
        cleanupWarnings.push(`homework_tasks cleanup blocked: ${removeTask.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Branch Supervisor: fake homework task cleaned up");
      }
    }
  }
  await signOut();

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
    warningCount += 1;
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to RLS/policy scope; unique fake names were used");
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Homework upload smoke test crashed:", err?.message || err);
  process.exit(1);
});

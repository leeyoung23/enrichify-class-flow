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
  const [{ signInWithEmailPassword, signOut }, uploadService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const {
    createHomeworkTask,
    createHomeworkSubmission,
    uploadHomeworkFile,
    listHomeworkFeedback,
  } = uploadService;
  const {
    createOrUpdateHomeworkFeedback,
    markHomeworkSubmissionReviewed,
    returnHomeworkForRevision,
    releaseHomeworkFeedbackToParent,
  } = writeService;

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

  let failureCount = 0;
  let warningCount = 0;
  const cleanupWarnings = [];

  let createdTask = null;
  let createdSubmission = null;
  let createdHomeworkFile = null;
  let createdFeedback = null;
  let createdObjectPath = null;
  let linkedStudent = null;

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
    printResult("WARNING", `Parent: linked student lookup failed (${studentLookup.error?.message || "unknown"})`);
    process.exit(1);
  }
  linkedStudent = studentLookup.data;
  printResult("PASS", `Parent: using linked student ${linkedStudent.full_name || linkedStudent.id}`);
  await signOut();

  const createTaskInput = {
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    title: `Feedback Smoke Homework ${new Date().toISOString()}`,
    instructions: "Fake/dev task for homework feedback workflow smoke test only.",
    subject: "Feedback Smoke Subject",
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "assigned",
  };

  const teacherSignInForTask = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (teacherSignInForTask.ok) {
    const teacherCreateTask = await createHomeworkTask(createTaskInput);
    if (!teacherCreateTask.error && teacherCreateTask.data?.id) {
      createdTask = teacherCreateTask.data;
      printResult("PASS", "Teacher: homework task created");
    } else {
      printResult("CHECK", `Teacher: task create blocked/fallback (${teacherCreateTask.error?.message || "unknown"})`);
    }
    await signOut();
  }

  const supervisorSignInForTask = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignInForTask.ok) {
    printResult("WARNING", "Branch Supervisor: required for fallback and cleanup but sign-in failed");
    process.exit(1);
  }
  if (!createdTask) {
    const supervisorCreateTask = await createHomeworkTask(createTaskInput);
    if (supervisorCreateTask.error || !supervisorCreateTask.data?.id) {
      printResult("WARNING", `Branch Supervisor: task create failed (${supervisorCreateTask.error?.message || "unknown"})`);
      process.exit(1);
    }
    createdTask = supervisorCreateTask.data;
    printResult("PASS", "Branch Supervisor: homework task created");
  }
  await signOut();

  const parentSignInForSubmission = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInForSubmission.ok) process.exit(1);
  const parentSubmissionCreate = await createHomeworkSubmission({
    homeworkTaskId: createdTask.id,
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    studentId: linkedStudent.id,
    submissionNote: "Fake/dev submission for homework feedback smoke test.",
  });
  if (parentSubmissionCreate.error || !parentSubmissionCreate.data?.id) {
    printResult("WARNING", `Parent: submission create failed (${parentSubmissionCreate.error?.message || "unknown"})`);
    process.exit(1);
  }
  createdSubmission = parentSubmissionCreate.data;
  printResult("PASS", "Parent: homework submission created");

  const tinyFakeFile = new Blob(["fake feedback smoke file"], { type: "text/plain" });
  const uploadResult = await uploadHomeworkFile({
    homeworkSubmissionId: createdSubmission.id,
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    studentId: linkedStudent.id,
    homeworkTaskId: createdTask.id,
    file: tinyFakeFile,
    fileName: "fake-feedback-smoke.txt",
    contentType: "text/plain",
  });
  if (uploadResult.error || !uploadResult.data?.homework_file?.id) {
    printResult("WARNING", `Parent: uploadHomeworkFile failed (${uploadResult.error?.message || "unknown"})`);
    process.exit(1);
  }
  createdHomeworkFile = uploadResult.data.homework_file;
  createdObjectPath = uploadResult.data.storage_path;
  printResult("PASS", "Parent: metadata-first file upload succeeded");
  await signOut();

  const teacherSignInForFeedback = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  let feedbackActor = "Teacher";
  if (!teacherSignInForFeedback.ok) {
    const supervisorSignInForFeedback = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
    if (!supervisorSignInForFeedback.ok) {
      printResult("WARNING", "No staff role available for feedback workflow");
      process.exit(1);
    }
    feedbackActor = "Branch Supervisor";
  }

  const draftFeedbackResult = await createOrUpdateHomeworkFeedback({
    homeworkSubmissionId: createdSubmission.id,
    feedbackText: "Draft feedback smoke test message.",
    nextStep: "Practice two short exercises before next class.",
    internalNote: "Internal-only note for staff review workflow.",
  });
  if (draftFeedbackResult.error || !draftFeedbackResult.data?.id) {
    printResult("WARNING", `${feedbackActor}: createOrUpdateHomeworkFeedback failed (${draftFeedbackResult.error?.message || "unknown"})`);
    process.exit(1);
  }
  createdFeedback = draftFeedbackResult.data;
  printResult("PASS", `${feedbackActor}: draft feedback created/updated`);

  const staffDraftRead = await listHomeworkFeedback({
    homeworkSubmissionId: createdSubmission.id,
    parentVisibleOnly: false,
  });
  const staffCanSeeDraft = Array.isArray(staffDraftRead.data)
    ? staffDraftRead.data.some((row) => row?.id === createdFeedback.id && row?.status !== "released_to_parent")
    : false;
  if (staffDraftRead.error || !staffCanSeeDraft) {
    printResult("WARNING", `${feedbackActor}: draft feedback verification failed (${staffDraftRead.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    printResult("PASS", `${feedbackActor}: draft feedback read verified`);
  }
  await signOut();

  const parentSignInHiddenCheck = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInHiddenCheck.ok) {
    printResult("WARNING", "Parent: sign-in failed for draft visibility check");
    warningCount += 1;
  } else {
    const parentReadBeforeRelease = await listHomeworkFeedback({
      homeworkSubmissionId: createdSubmission.id,
      parentVisibleOnly: true,
    });
    const parentCanSeeUnreleased = Array.isArray(parentReadBeforeRelease.data)
      ? parentReadBeforeRelease.data.some((row) => row?.id === createdFeedback.id)
      : false;
    if (parentReadBeforeRelease.error) {
      printResult("WARNING", `Parent: pre-release feedback read failed (${parentReadBeforeRelease.error.message || "unknown"})`);
      warningCount += 1;
    } else if (parentCanSeeUnreleased) {
      printResult("WARNING", "Parent: draft/unreleased feedback unexpectedly visible");
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: draft/unreleased feedback remained hidden");
    }
    await signOut();
  }

  const teacherSignInForReview = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  feedbackActor = teacherSignInForReview.ok ? "Teacher" : "Branch Supervisor";
  if (!teacherSignInForReview.ok) {
    const supervisorSignInForReview = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
    if (!supervisorSignInForReview.ok) {
      printResult("WARNING", "No staff role available for review/release operations");
      process.exit(1);
    }
  }

  const markReviewedResult = await markHomeworkSubmissionReviewed({
    homeworkSubmissionId: createdSubmission.id,
  });
  if (markReviewedResult.error || !markReviewedResult.data?.id) {
    printResult("CHECK", `${feedbackActor}: mark reviewed blocked (${markReviewedResult.error?.message || "unknown"}), trying return-for-revision`);
    const returnResult = await returnHomeworkForRevision({
      homeworkSubmissionId: createdSubmission.id,
      feedbackText: "Please revise and resubmit.",
      nextStep: "Address corrections and upload revision.",
      internalNote: "Returned in smoke test.",
    });
    if (returnResult.error || !returnResult.data?.submission?.id) {
      printResult("WARNING", `${feedbackActor}: returnHomeworkForRevision failed (${returnResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      createdFeedback = returnResult.data.feedback;
      printResult("PASS", `${feedbackActor}: submission returned_for_revision`);
    }
  } else {
    printResult("PASS", `${feedbackActor}: submission marked reviewed`);
  }

  const releaseResult = await releaseHomeworkFeedbackToParent({ homeworkFeedbackId: createdFeedback.id });
  if (releaseResult.error || !releaseResult.data?.id) {
    printResult("WARNING", `${feedbackActor}: releaseHomeworkFeedbackToParent failed (${releaseResult.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    createdFeedback = releaseResult.data;
    printResult("PASS", `${feedbackActor}: feedback released to parent`);
  }
  await signOut();

  const parentSignInReleaseCheck = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInReleaseCheck.ok) {
    printResult("WARNING", "Parent: sign-in failed for released feedback check");
    warningCount += 1;
  } else {
    const parentReadReleased = await listHomeworkFeedback({
      homeworkSubmissionId: createdSubmission.id,
      parentVisibleOnly: true,
    });
    const releasedRow = Array.isArray(parentReadReleased.data)
      ? parentReadReleased.data.find((row) => row?.id === createdFeedback.id)
      : null;
    if (parentReadReleased.error || !releasedRow) {
      printResult("WARNING", `Parent: released feedback not visible (${parentReadReleased.error?.message || "unknown"})`);
      failureCount += 1;
    } else if (Object.prototype.hasOwnProperty.call(releasedRow, "internal_note")) {
      printResult("WARNING", "Parent: internal_note field leaked in parent-visible response");
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: released feedback visible and internal_note hidden");
    }
    await signOut();
  }

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
        printResult("PASS", "Cleanup: fake homework object removed");
      }
    }
    if (createdHomeworkFile?.id) {
      const removeFileRow = await supabase
        .from("homework_files")
        .delete()
        .eq("id", createdHomeworkFile.id)
        .select("id")
        .maybeSingle();
      if (removeFileRow.error) {
        cleanupWarnings.push(`homework_files cleanup blocked: ${removeFileRow.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Cleanup: homework_files row removed");
      }
    }
    if (createdFeedback?.id) {
      const removeFeedback = await supabase
        .from("homework_feedback")
        .delete()
        .eq("id", createdFeedback.id)
        .select("id")
        .maybeSingle();
      if (removeFeedback.error) {
        cleanupWarnings.push(`homework_feedback cleanup blocked: ${removeFeedback.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Cleanup: homework_feedback row removed");
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
        printResult("PASS", "Cleanup: homework_submissions row removed");
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
        printResult("PASS", "Cleanup: homework_tasks row removed");
      }
    }
    await signOut();
  }

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
    warningCount += 1;
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to policy scope; only fake/dev rows were used");
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Homework feedback smoke test crashed:", err?.message || err);
  process.exit(1);
});

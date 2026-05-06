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
    printResult("CHECK", `${label}: missing password (${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false, skipped: true };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("CHECK", `${label}: sign-in failed (${error.message || "unknown"})`);
    await signOut();
    return { ok: false, skipped: true };
  }
  return { ok: true };
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, uploadService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const {
    createHomeworkTask,
    createHomeworkSubmission,
    uploadMarkedHomeworkFile,
    listHomeworkFiles,
    getHomeworkFileSignedUrl,
    releaseHomeworkFileToParent,
  } = uploadService;

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

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

  let failureCount = 0;
  let warningCount = 0;
  const cleanupWarnings = [];

  let createdTask = null;
  let createdSubmission = null;
  let createdMarkedFile = null;
  let createdObjectPath = null;
  let linkedStudent = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    printResult("WARNING", "Parent: required for linked student context and parent checks");
    process.exit(1);
  }

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

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: required for upload/release flow");
    process.exit(1);
  }

  const createTaskInput = {
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    title: `Marked File Smoke Homework ${new Date().toISOString()}`,
    instructions: "Fake/dev task for manual marked-file smoke test only.",
    subject: "Marked File Smoke",
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "assigned",
  };
  const taskCreate = await createHomeworkTask(createTaskInput);
  if (taskCreate.error || !taskCreate.data?.id) {
    printResult("WARNING", `Branch Supervisor: homework task create failed (${taskCreate.error?.message || "unknown"})`);
    process.exit(1);
  }
  createdTask = taskCreate.data;
  printResult("PASS", "Branch Supervisor: homework task created");

  const submissionCreate = await createHomeworkSubmission({
    homeworkTaskId: createdTask.id,
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    studentId: linkedStudent.id,
    submissionNote: "Fake/dev submission for marked-file smoke test.",
  });
  if (submissionCreate.error || !submissionCreate.data?.id) {
    printResult(
      "WARNING",
      `Branch Supervisor: homework submission create failed (${submissionCreate.error?.message || "unknown"})`
    );
    process.exit(1);
  }
  createdSubmission = submissionCreate.data;
  printResult("PASS", "Branch Supervisor: homework submission created");

  const tinyFakeMarkedFile = new Blob(["fake marked homework file"], { type: "text/plain" });
  const uploadMarkedResult = await uploadMarkedHomeworkFile({
    homeworkSubmissionId: createdSubmission.id,
    file: tinyFakeMarkedFile,
    notes: "Fake/dev staff note for marked file smoke test.",
    fileName: "fake-marked-homework.txt",
    contentType: "text/plain",
  });
  if (uploadMarkedResult.error || !uploadMarkedResult.data?.homework_file?.id) {
    printResult(
      "WARNING",
      `Branch Supervisor: uploadMarkedHomeworkFile failed (${uploadMarkedResult.error?.message || "unknown"})`
    );
    if (uploadMarkedResult.error?.cleanup_warning) {
      printResult("WARNING", `Branch Supervisor: cleanup warning (${uploadMarkedResult.error.cleanup_warning})`);
    }
    process.exit(1);
  }
  createdMarkedFile = uploadMarkedResult.data.homework_file;
  createdObjectPath = uploadMarkedResult.data.storage_path;
  printResult("PASS", "Branch Supervisor: marked-file metadata-first upload succeeded");

  if (createdMarkedFile.file_role !== "teacher_marked_homework" || createdMarkedFile.released_to_parent !== false) {
    printResult("WARNING", "Branch Supervisor: marked file row did not return expected role/release defaults");
    failureCount += 1;
  } else {
    printResult("PASS", "Branch Supervisor: marked file role/release defaults verified");
  }

  const staffSignedUrl = await getHomeworkFileSignedUrl({
    homeworkFileId: createdMarkedFile.id,
    expiresIn: 90,
  });
  if (staffSignedUrl.error || !staffSignedUrl.data?.signed_url) {
    printResult(
      "WARNING",
      `Branch Supervisor: getHomeworkFileSignedUrl failed (${staffSignedUrl.error?.message || "unknown"})`
    );
    failureCount += 1;
  } else {
    printResult("PASS", "Branch Supervisor: signed URL created for marked file");
  }
  await signOut();

  const parentSignInBeforeRelease = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInBeforeRelease.ok) {
    printResult("CHECK", "Parent: pre-release visibility check skipped (credentials unavailable)");
  } else {
    const parentBeforeRelease = await listHomeworkFiles({
      homeworkSubmissionId: createdSubmission.id,
      fileRole: "teacher_marked_homework",
      parentVisibleOnly: true,
    });
    const parentCanSeeBeforeRelease = Array.isArray(parentBeforeRelease.data)
      ? parentBeforeRelease.data.some((row) => row?.id === createdMarkedFile.id)
      : false;
    if (parentBeforeRelease.error) {
      printResult("WARNING", `Parent: pre-release list read failed (${parentBeforeRelease.error.message || "unknown"})`);
      warningCount += 1;
    } else if (parentCanSeeBeforeRelease) {
      printResult("WARNING", "Parent: marked file visible before release");
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: marked file hidden before release");
    }
    await signOut();
  }

  const supervisorSignInRelease = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignInRelease.ok) {
    printResult("WARNING", "Branch Supervisor: release check blocked (credentials unavailable)");
    process.exit(1);
  }
  const releaseResult = await releaseHomeworkFileToParent({ fileId: createdMarkedFile.id });
  if (releaseResult.error || !releaseResult.data?.id) {
    printResult(
      "WARNING",
      `Branch Supervisor: releaseHomeworkFileToParent failed (${releaseResult.error?.message || "unknown"})`
    );
    failureCount += 1;
  } else if (!releaseResult.data.released_to_parent) {
    printResult("WARNING", "Branch Supervisor: release row did not set released_to_parent=true");
    failureCount += 1;
  } else {
    printResult("PASS", "Branch Supervisor: marked file released_to_parent");
  }
  await signOut();

  const parentSignInAfterRelease = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInAfterRelease.ok) {
    printResult("CHECK", "Parent: post-release visibility check skipped (credentials unavailable)");
  } else {
    const parentAfterRelease = await listHomeworkFiles({
      homeworkSubmissionId: createdSubmission.id,
      fileRole: "teacher_marked_homework",
      parentVisibleOnly: true,
    });
    const parentCanSeeAfterRelease = Array.isArray(parentAfterRelease.data)
      ? parentAfterRelease.data.some((row) => row?.id === createdMarkedFile.id)
      : false;
    if (parentAfterRelease.error) {
      printResult("WARNING", `Parent: post-release list read failed (${parentAfterRelease.error.message || "unknown"})`);
      warningCount += 1;
    } else if (!parentCanSeeAfterRelease) {
      printResult("WARNING", "Parent: released marked file is not visible");
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: released marked file visible");
    }
    await signOut();
  }

  const parentUploadAttempt = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentUploadAttempt.ok) {
    printResult("CHECK", "Parent: blocked-upload check skipped (credentials unavailable)");
  } else {
    const parentMarkedAttempt = await uploadMarkedHomeworkFile({
      homeworkSubmissionId: createdSubmission.id,
      file: new Blob(["fake parent blocked upload"], { type: "text/plain" }),
      notes: "Parent blocked check only",
      fileName: "parent-should-not-upload-marked.txt",
      contentType: "text/plain",
    });
    if (parentMarkedAttempt.error) {
      printResult("PASS", "Parent: blocked from uploadMarkedHomeworkFile as expected");
    } else {
      printResult("WARNING", "Parent: uploadMarkedHomeworkFile unexpectedly succeeded");
      failureCount += 1;
      if (parentMarkedAttempt.data?.storage_path) {
        cleanupWarnings.push("unexpected parent marked-file upload occurred; manual cleanup may be needed");
      }
    }
    await signOut();
  }

  const studentUploadAttempt = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentUploadAttempt.ok) {
    printResult("CHECK", "Student: blocked-upload check skipped (credentials unavailable)");
  } else {
    const studentMarkedAttempt = await uploadMarkedHomeworkFile({
      homeworkSubmissionId: createdSubmission.id,
      file: new Blob(["fake student blocked upload"], { type: "text/plain" }),
      notes: "Student blocked check only",
      fileName: "student-should-not-upload-marked.txt",
      contentType: "text/plain",
    });
    if (studentMarkedAttempt.error) {
      printResult("PASS", "Student: blocked from uploadMarkedHomeworkFile as expected");
    } else {
      printResult("WARNING", "Student: uploadMarkedHomeworkFile unexpectedly succeeded");
      failureCount += 1;
      if (studentMarkedAttempt.data?.storage_path) {
        cleanupWarnings.push("unexpected student marked-file upload occurred; manual cleanup may be needed");
      }
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
        printResult("PASS", "Cleanup: fake marked-file object removed");
      }
    }
    if (createdMarkedFile?.id) {
      const removeMarkedRow = await supabase
        .from("homework_files")
        .delete()
        .eq("id", createdMarkedFile.id)
        .select("id")
        .maybeSingle();
      if (removeMarkedRow.error) {
        cleanupWarnings.push(`homework_files cleanup blocked: ${removeMarkedRow.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Cleanup: marked homework_files row removed");
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
        printResult("PASS", "Cleanup: fake submission removed");
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
        printResult("PASS", "Cleanup: fake task removed");
      }
    }
    await signOut();
  }

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
    warningCount += 1;
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to policy scope; fake/dev unique names were used");
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Homework marked-file smoke test crashed:", err?.message || err);
  process.exit(1);
});

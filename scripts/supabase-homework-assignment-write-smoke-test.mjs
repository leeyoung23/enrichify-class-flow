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

function hasStableShape(value) {
  return !!value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "data")
    && Object.prototype.hasOwnProperty.call(value, "error");
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

function isUuidLike(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("WARNING", `${label}: missing password (${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false };
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
  const [{ signInWithEmailPassword, signOut }, readService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const { listAssignedHomeworkForStudent, listHomeworkTrackerByClass, listHomeworkTrackerByStudent } = readService;
  const { createHomeworkTaskWithAssignees } = writeService;

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const supervisorUser = { label: "Branch Supervisor", email: "supervisor.demo@example.test", passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD" };
  const teacherUser = { label: "Teacher", email: "teacher.demo@example.test", passwordVar: "RLS_TEST_TEACHER_PASSWORD" };
  const parentUser = { label: "Parent", email: "parent.demo@example.test", passwordVar: "RLS_TEST_PARENT_PASSWORD" };
  const studentUser = { label: "Student", email: process.env.RLS_TEST_STUDENT_EMAIL || "student.demo@example.test", passwordVar: "RLS_TEST_STUDENT_PASSWORD" };

  let failureCount = 0;
  let warningCount = 0;
  const cleanupWarnings = [];

  let linkedStudent = null;
  let createdSelectedTaskId = null;
  let createdIndividualTaskId = null;
  let createdClassTaskId = null;

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    printResult("WARNING", "Branch Supervisor unavailable; expected allowed write cannot be verified");
    process.exit(1);
  }

  // Use a fixture that is visible to the authenticated supervisor under current RLS.
  // This keeps the "expected allowed write" assertion legitimate without weakening policy.
  const supervisorStudentRead = await supabase
    .from("students")
    .select("id,branch_id,class_id,full_name")
    .not("branch_id", "is", null)
    .not("class_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (supervisorStudentRead.error || !Array.isArray(supervisorStudentRead.data)) {
    printResult("WARNING", `Branch Supervisor: unable to load visible students (${supervisorStudentRead.error?.message || "unknown"})`);
    process.exit(1);
  }
  linkedStudent = supervisorStudentRead.data.find(
    (row) => isUuidLike(row?.id) && isUuidLike(row?.branch_id) && isUuidLike(row?.class_id)
  ) || null;
  if (!linkedStudent) {
    printResult("WARNING", "Branch Supervisor: no RLS-visible student fixture with branch/class UUIDs");
    process.exit(1);
  }
  printResult(
    "PASS",
    `Branch Supervisor: using visible fixture ${linkedStudent.full_name || linkedStudent.id}`
  );

  const selectedTaskResult = await createHomeworkTaskWithAssignees({
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    title: `Smoke Selected Assignment ${new Date().toISOString()}`,
    instructions: "Fake/dev selected assignment write smoke task.",
    subject: "Smoke",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    assignmentScope: "selected_students",
    studentIds: [linkedStudent.id],
    notes: "Smoke selected-student assignment",
  });
  if (!hasStableShape(selectedTaskResult)) {
    printResult("WARNING", "Selected task creation returned invalid response shape");
    process.exit(1);
  }
  if (selectedTaskResult.error || !selectedTaskResult.data?.task?.id) {
    printResult("WARNING", `Expected allowed branch-supervisor selected write failed (${selectedTaskResult.error?.message || "unknown"})`);
    process.exit(1);
  }
  createdSelectedTaskId = selectedTaskResult.data.task.id;
  if (selectedTaskResult.data.task.assignment_scope !== "selected_students") {
    printResult("WARNING", "Selected task assignment_scope mismatch");
    failureCount += 1;
  } else {
    printResult("PASS", "Selected-student task created with assignment_scope=selected_students");
  }
  if (!Array.isArray(selectedTaskResult.data.assignees) || selectedTaskResult.data.assignees.length === 0) {
    printResult("WARNING", "Selected-student task assignee rows were not created");
    failureCount += 1;
  } else {
    printResult("PASS", "Selected-student assignee row(s) created");
  }

  const assignedStudentRead = await listAssignedHomeworkForStudent({ studentId: linkedStudent.id });
  if (!hasStableShape(assignedStudentRead)) {
    printResult("WARNING", "listAssignedHomeworkForStudent returned invalid response shape");
    failureCount += 1;
  } else if (assignedStudentRead.error) {
    printResult("WARNING", `listAssignedHomeworkForStudent failed (${assignedStudentRead.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    const hasSelectedTask = (assignedStudentRead.data || []).some((row) => row?.homework_task_id === createdSelectedTaskId);
    if (hasSelectedTask) printResult("PASS", "Assigned-but-not-submitted selected task visible in assigned-homework read");
    else {
      printResult("WARNING", "Selected task missing from assigned-homework read");
      failureCount += 1;
    }
  }

  const byClassRead = await listHomeworkTrackerByClass({ classId: linkedStudent.class_id });
  if (!hasStableShape(byClassRead)) {
    printResult("WARNING", "listHomeworkTrackerByClass returned invalid response shape");
    failureCount += 1;
  } else if (byClassRead.error) {
    printResult("WARNING", `listHomeworkTrackerByClass failed (${byClassRead.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    const row = (byClassRead.data || []).find((item) => item?.task?.id === createdSelectedTaskId);
    if (row) printResult("PASS", "By Task tracker includes selected-student assignment");
    else {
      printResult("WARNING", "By Task tracker missing selected-student assignment");
      failureCount += 1;
    }
  }

  const byStudentRead = await listHomeworkTrackerByStudent({ studentId: linkedStudent.id });
  if (!hasStableShape(byStudentRead)) {
    printResult("WARNING", "listHomeworkTrackerByStudent returned invalid response shape");
    failureCount += 1;
  } else if (byStudentRead.error || !byStudentRead.data) {
    printResult("WARNING", `listHomeworkTrackerByStudent failed (${byStudentRead.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    const hasRow = (byStudentRead.data.assignedItems || []).some((item) => item?.task?.id === createdSelectedTaskId);
    if (hasRow) printResult("PASS", "By Student tracker includes selected-student assignment");
    else {
      printResult("WARNING", "By Student tracker missing selected-student assignment");
      failureCount += 1;
    }
  }

  const individualResult = await createHomeworkTaskWithAssignees({
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    title: `Smoke Individual Assignment ${new Date().toISOString()}`,
    instructions: "Fake/dev individual assignment write smoke task.",
    subject: "Smoke",
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    assignmentScope: "individual",
    studentIds: [linkedStudent.id],
    notes: "Smoke individual assignment",
  });
  if (!hasStableShape(individualResult)) {
    printResult("WARNING", "Individual task creation returned invalid response shape");
    failureCount += 1;
  } else if (individualResult.error || !individualResult.data?.task?.id) {
    printResult("WARNING", `Individual task create failed (${individualResult.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    createdIndividualTaskId = individualResult.data.task.id;
    printResult("PASS", "Individual task created with one assignee row");
  }

  const classResult = await createHomeworkTaskWithAssignees({
    branchId: linkedStudent.branch_id,
    classId: linkedStudent.class_id,
    title: `Smoke Class Assignment ${new Date().toISOString()}`,
    instructions: "Fake/dev class assignment write smoke task.",
    subject: "Smoke",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    assignmentScope: "class",
    studentIds: [],
    notes: "Smoke class assignment",
  });
  if (!hasStableShape(classResult)) {
    printResult("WARNING", "Class task creation returned invalid response shape");
    failureCount += 1;
  } else if (classResult.error || !classResult.data?.task?.id) {
    printResult("WARNING", `Class task create failed (${classResult.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    createdClassTaskId = classResult.data.task.id;
    if (Array.isArray(classResult.data.assignees) && classResult.data.assignees.length === 0) {
      printResult("PASS", "Class-scope task created without requiring assignee rows");
    } else {
      printResult("WARNING", "Class-scope task unexpectedly returned assignee rows");
      failureCount += 1;
    }
  }

  await signOut();

  const parentWriteSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentWriteSignIn.ok) {
    printResult("CHECK", "Parent credentials unavailable; parent write-block check skipped");
  } else {
    const parentWrite = await createHomeworkTaskWithAssignees({
      branchId: linkedStudent.branch_id,
      classId: linkedStudent.class_id,
      title: `Parent Should Not Create ${new Date().toISOString()}`,
      assignmentScope: "class",
    });
    if (!hasStableShape(parentWrite)) {
      printResult("WARNING", "Parent write returned invalid response shape");
      failureCount += 1;
    } else if (parentWrite.error) {
      printResult("PASS", "Parent write blocked as expected");
    } else {
      printResult("WARNING", "Unsafe access: parent unexpectedly created homework task");
      failureCount += 1;
    }
  }
  await signOut();

  const studentWriteSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentWriteSignIn.ok) {
    printResult("CHECK", "Student credentials unavailable; student write-block check skipped");
  } else {
    const studentWrite = await createHomeworkTaskWithAssignees({
      branchId: linkedStudent.branch_id,
      classId: linkedStudent.class_id,
      title: `Student Should Not Create ${new Date().toISOString()}`,
      assignmentScope: "class",
    });
    if (!hasStableShape(studentWrite)) {
      printResult("WARNING", "Student write returned invalid response shape");
      failureCount += 1;
    } else if (studentWrite.error) {
      printResult("PASS", "Student write blocked as expected");
    } else {
      printResult("WARNING", "Unsafe access: student unexpectedly created homework task");
      failureCount += 1;
    }
  }
  await signOut();

  const teacherWriteSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherWriteSignIn.ok) {
    printResult("CHECK", "Teacher credentials unavailable; teacher write check skipped");
  } else {
    const teacherWrite = await createHomeworkTaskWithAssignees({
      branchId: linkedStudent.branch_id,
      classId: linkedStudent.class_id,
      title: `Teacher Write Check ${new Date().toISOString()}`,
      assignmentScope: "class",
    });
    if (!hasStableShape(teacherWrite)) {
      printResult("WARNING", "Teacher write returned invalid response shape");
      failureCount += 1;
    } else if (teacherWrite.error) {
      printResult("CHECK", `Teacher write blocked by current RLS/product role scope (${teacherWrite.error.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher write allowed by current RLS/product role scope");
      if (teacherWrite.data?.task?.id) cleanupWarnings.push(`teacher-created-task:${teacherWrite.data.task.id}`);
    }
  }
  await signOut();

  const supervisorCleanupSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorCleanupSignIn.ok) {
    printResult("WARNING", "Cleanup skipped (branch supervisor sign-in failed)");
    warningCount += 1;
  } else {
    for (const taskId of [createdSelectedTaskId, createdIndividualTaskId, createdClassTaskId]) {
      if (!taskId) continue;
      const removeTask = await supabase.from("homework_tasks").delete().eq("id", taskId).select("id").maybeSingle();
      if (removeTask.error) cleanupWarnings.push(`homework_tasks cleanup blocked (${taskId}): ${removeTask.error.message || "unknown"}`);
      else printResult("PASS", `Cleanup: fixture task removed (${taskId})`);
    }

    for (const marker of cleanupWarnings.filter((item) => item.startsWith("teacher-created-task:"))) {
      const taskId = marker.replace("teacher-created-task:", "");
      const removeTask = await supabase.from("homework_tasks").delete().eq("id", taskId).select("id").maybeSingle();
      if (removeTask.error) {
        cleanupWarnings.push(`teacher cleanup blocked (${taskId}): ${removeTask.error.message || "unknown"}`);
      } else {
        printResult("PASS", `Cleanup: teacher-created check task removed (${taskId})`);
      }
    }
  }
  await signOut();

  const cleanupMessages = cleanupWarnings.filter((item) => !item.startsWith("teacher-created-task:"));
  for (const warning of cleanupMessages) {
    printResult("WARNING", `Cleanup: ${warning}`);
    warningCount += 1;
  }
  if (cleanupMessages.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to policy scope; no service-role cleanup was used");
  }
  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Homework assignment-write smoke test crashed:", err?.message || err);
  process.exit(1);
});


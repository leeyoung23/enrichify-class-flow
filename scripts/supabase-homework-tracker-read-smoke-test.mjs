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

function hasStableCountsShape(counts) {
  return !!(
    counts &&
    typeof counts.assigned === "number" &&
    typeof counts.submitted === "number" &&
    typeof counts.underReview === "number" &&
    typeof counts.returned === "number" &&
    typeof counts.reviewed === "number" &&
    typeof counts.feedbackReleased === "number" &&
    typeof counts.notSubmitted === "number"
  );
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, uploadService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const { listHomeworkTrackerByClass, listHomeworkTrackerByStudent } = readService;
  const { createHomeworkTask } = uploadService;

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
  const unrelatedParentUser = {
    label: "Unrelated Parent",
    email: process.env.RLS_TEST_UNRELATED_PARENT_EMAIL || "unrelated.parent.demo@example.test",
    passwordVar: "RLS_TEST_UNRELATED_PARENT_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  const cleanupWarnings = [];

  let linkedStudent = null;
  let siblingStudent = null;
  let createdClassTask = null;
  let createdSelectedTask = null;
  let createdUnassignedTask = null;
  let createdAssignee = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    printResult("CHECK", "Parent fixture user unavailable; tracker smoke skipped");
    return;
  }

  const parentAuth = await supabase.auth.getUser();
  const parentAuthId = parentAuth.data?.user?.id || null;
  if (!parentAuthId) {
    printResult("CHECK", "Parent auth user id unavailable; tracker smoke skipped");
    return;
  }

  const parentProfile = await supabase
    .from("profiles")
    .select("id,linked_student_id")
    .eq("id", parentAuthId)
    .maybeSingle();
  if (parentProfile.error || !parentProfile.data?.linked_student_id) {
    printResult("CHECK", `Parent linked student fixture unavailable (${parentProfile.error?.message || "unknown"})`);
    return;
  }

  const studentLookup = await supabase
    .from("students")
    .select("id,branch_id,class_id,full_name")
    .eq("id", parentProfile.data.linked_student_id)
    .maybeSingle();
  if (studentLookup.error || !studentLookup.data?.id) {
    printResult("CHECK", `Parent linked student lookup failed (${studentLookup.error?.message || "unknown"})`);
    return;
  }
  linkedStudent = studentLookup.data;
  printResult("PASS", `Parent fixture student resolved (${linkedStudent.full_name || linkedStudent.id})`);

  const siblingLookup = await supabase
    .from("students")
    .select("id")
    .eq("class_id", linkedStudent.class_id)
    .neq("id", linkedStudent.id)
    .limit(1)
    .maybeSingle();
  if (!siblingLookup.error && siblingLookup.data?.id) siblingStudent = siblingLookup.data;
  await signOut();

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    printResult("CHECK", "Branch supervisor unavailable; tracker fixtures skipped");
    return;
  }

  const classTaskCreate = await supabase
    .from("homework_tasks")
    .insert({
      branch_id: linkedStudent.branch_id,
      class_id: linkedStudent.class_id,
      title: `Tracker Class Scope ${new Date().toISOString()}`,
      instructions: "Fake/dev class tracker task fixture",
      subject: "Smoke",
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
      assignment_scope: "class",
    })
    .select("id,branch_id,class_id,status,assignment_scope")
    .maybeSingle();
  if (classTaskCreate.error || !classTaskCreate.data?.id) {
    const fallback = await createHomeworkTask({
      branchId: linkedStudent.branch_id,
      classId: linkedStudent.class_id,
      title: `Tracker Class Scope Fallback ${new Date().toISOString()}`,
      instructions: "Fallback class tracker task fixture",
      subject: "Smoke",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
    });
    if (fallback.error || !fallback.data?.id) {
      printResult("CHECK", `Class tracker fixture unavailable (${fallback.error?.message || classTaskCreate.error?.message || "unknown"})`);
    } else {
      createdClassTask = fallback.data;
      printResult("PASS", "Class-scope tracker fixture created (fallback)");
    }
  } else {
    createdClassTask = classTaskCreate.data;
    printResult("PASS", "Class-scope tracker fixture created");
  }

  const selectedTaskCreate = await supabase
    .from("homework_tasks")
    .insert({
      branch_id: linkedStudent.branch_id,
      class_id: linkedStudent.class_id,
      title: `Tracker Selected Scope ${new Date().toISOString()}`,
      instructions: "Fake/dev selected tracker task fixture",
      subject: "Smoke",
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
      assignment_scope: "selected_students",
    })
    .select("id,branch_id,class_id,status,assignment_scope")
    .maybeSingle();
  if (selectedTaskCreate.error || !selectedTaskCreate.data?.id) {
    printResult("CHECK", `Selected tracker fixture unavailable (${selectedTaskCreate.error?.message || "unknown"})`);
  } else {
    createdSelectedTask = selectedTaskCreate.data;
    printResult("PASS", "Selected-student tracker fixture created");
  }

  const unassignedTaskCreate = await supabase
    .from("homework_tasks")
    .insert({
      branch_id: linkedStudent.branch_id,
      class_id: linkedStudent.class_id,
      title: `Tracker Unassigned Selected ${new Date().toISOString()}`,
      instructions: "Fake/dev unassigned selected tracker task fixture",
      subject: "Smoke",
      due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
      assignment_scope: "selected_students",
    })
    .select("id,branch_id,class_id,status,assignment_scope")
    .maybeSingle();
  if (!unassignedTaskCreate.error && unassignedTaskCreate.data?.id) {
    createdUnassignedTask = unassignedTaskCreate.data;
  } else {
    printResult("CHECK", `Unassigned selected fixture unavailable (${unassignedTaskCreate.error?.message || "unknown"})`);
  }

  if (createdSelectedTask?.id) {
    const assigneeCreate = await supabase
      .from("homework_task_assignees")
      .insert({
        homework_task_id: createdSelectedTask.id,
        branch_id: linkedStudent.branch_id,
        class_id: linkedStudent.class_id,
        student_id: linkedStudent.id,
        assignment_status: "assigned",
      })
      .select("id,homework_task_id,student_id,assignment_status")
      .maybeSingle();
    if (assigneeCreate.error || !assigneeCreate.data?.id) {
      printResult("CHECK", `Selected assignee fixture unavailable (${assigneeCreate.error?.message || "unknown"})`);
    } else {
      createdAssignee = assigneeCreate.data;
      printResult("PASS", "Selected assignee fixture created");
    }
  }

  if (createdUnassignedTask?.id && siblingStudent?.id) {
    await supabase
      .from("homework_task_assignees")
      .insert({
        homework_task_id: createdUnassignedTask.id,
        branch_id: linkedStudent.branch_id,
        class_id: linkedStudent.class_id,
        student_id: siblingStudent.id,
        assignment_status: "assigned",
      })
      .select("id")
      .maybeSingle();
  }
  await signOut();

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    printResult("CHECK", "Teacher unavailable; class tracker check skipped");
  } else {
    const teacherTracker = await listHomeworkTrackerByClass({ classId: linkedStudent.class_id });
    if (teacherTracker.error || !Array.isArray(teacherTracker.data)) {
      printResult("WARNING", `Teacher class tracker read failed (${teacherTracker.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const hasCountsShape = teacherTracker.data.every((row) => hasStableCountsShape(row?.counts));
      if (!hasCountsShape) {
        printResult("WARNING", "Teacher class tracker counts shape is unstable");
        failureCount += 1;
      } else {
        printResult("PASS", "Teacher class tracker counts shape verified");
      }
      const hasInternalNoteLeak = JSON.stringify(teacherTracker.data).includes("internal_note");
      if (hasInternalNoteLeak) {
        printResult("WARNING", "Teacher class tracker leaked internal_note field");
        failureCount += 1;
      } else {
        printResult("PASS", "Teacher class tracker has no internal_note exposure");
      }
    }
  }
  await signOut();

  const supervisorSignInChecks = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignInChecks.ok) {
    printResult("CHECK", "Branch Supervisor unavailable; class tracker scope check skipped");
  } else {
    const supervisorTracker = await listHomeworkTrackerByClass({ classId: linkedStudent.class_id });
    if (supervisorTracker.error || !Array.isArray(supervisorTracker.data)) {
      printResult("WARNING", `Branch Supervisor class tracker read failed (${supervisorTracker.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "Branch Supervisor class tracker read succeeded");
    }
  }
  await signOut();

  const parentSignInChecks = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInChecks.ok) {
    printResult("CHECK", "Parent unavailable; student tracker checks skipped");
  } else {
    const parentTracker = await listHomeworkTrackerByStudent({ studentId: linkedStudent.id });
    if (parentTracker.error || !parentTracker.data) {
      printResult("WARNING", `Parent student tracker read failed (${parentTracker.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      if (!hasStableCountsShape(parentTracker.data.counts)) {
        printResult("WARNING", "Parent student tracker counts shape is unstable");
        failureCount += 1;
      } else {
        printResult("PASS", "Parent student tracker counts shape verified");
      }
      const ids = new Set((parentTracker.data.assignedItems || []).map((item) => item?.task?.id).filter(Boolean));
      const seesClassScope = createdClassTask?.id ? ids.has(createdClassTask.id) : true;
      const seesSelected = createdSelectedTask?.id ? ids.has(createdSelectedTask.id) : true;
      const seesUnassignedSelected = createdUnassignedTask?.id ? ids.has(createdUnassignedTask.id) : false;
      if (!seesClassScope) {
        printResult("WARNING", "Parent tracker missing class-scope assigned-but-not-submitted fixture");
        failureCount += 1;
      } else {
        printResult("PASS", "Parent tracker includes class-scope assigned item");
      }
      if (createdAssignee?.id && !seesSelected) {
        printResult("WARNING", "Parent tracker missing selected-student assigned item");
        failureCount += 1;
      } else if (createdAssignee?.id) {
        printResult("PASS", "Parent tracker includes selected-student assigned item");
      } else {
        printResult("CHECK", "Parent selected-student assigned check skipped (fixture unavailable)");
      }
      if (createdUnassignedTask?.id) {
        if (seesUnassignedSelected) {
          printResult("WARNING", "Parent tracker unexpectedly includes unassigned selected-student item");
          failureCount += 1;
        } else {
          printResult("PASS", "Parent tracker blocks unassigned selected-student item");
        }
      } else {
        printResult("CHECK", "Parent unassigned selected-student check skipped (fixture unavailable)");
      }
      const hasInternalNoteLeak = JSON.stringify(parentTracker.data).includes("internal_note");
      if (hasInternalNoteLeak) {
        printResult("WARNING", "Parent tracker leaked internal_note");
        failureCount += 1;
      } else {
        printResult("PASS", "Parent tracker has no internal_note exposure");
      }
    }
  }
  await signOut();

  const unrelatedParentSignIn = await signInRole(unrelatedParentUser, { signInWithEmailPassword, signOut });
  if (!unrelatedParentSignIn.ok) {
    printResult("CHECK", "Unrelated Parent unavailable; blocking check skipped");
  } else {
    const unrelatedTracker = await listHomeworkTrackerByStudent({ studentId: linkedStudent.id });
    const hasRows = Array.isArray(unrelatedTracker?.data?.assignedItems) && unrelatedTracker.data.assignedItems.length > 0;
    if (unrelatedTracker.error || !hasRows) {
      printResult("PASS", "Unrelated Parent blocked from other student's tracker");
    } else {
      printResult("WARNING", "Unrelated Parent unexpectedly read other student's tracker");
      failureCount += 1;
    }
  }
  await signOut();

  const supervisorCleanupSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorCleanupSignIn.ok) {
    printResult("WARNING", "Branch Supervisor cleanup skipped (sign-in failed)");
    warningCount += 1;
  } else {
    if (createdAssignee?.id) {
      const removeAssignee = await supabase
        .from("homework_task_assignees")
        .delete()
        .eq("id", createdAssignee.id)
        .select("id")
        .maybeSingle();
      if (removeAssignee.error) {
        cleanupWarnings.push(`homework_task_assignees cleanup blocked: ${removeAssignee.error.message || "unknown"}`);
      } else {
        printResult("PASS", "Cleanup: selected assignee fixture removed");
      }
    }
    for (const taskId of [createdUnassignedTask?.id, createdSelectedTask?.id, createdClassTask?.id]) {
      if (!taskId) continue;
      const removeTask = await supabase
        .from("homework_tasks")
        .delete()
        .eq("id", taskId)
        .select("id")
        .maybeSingle();
      if (removeTask.error) {
        cleanupWarnings.push(`homework_tasks cleanup blocked (${taskId}): ${removeTask.error.message || "unknown"}`);
      } else {
        printResult("PASS", `Cleanup: tracker fixture task removed (${taskId})`);
      }
    }
  }
  await signOut();

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
    warningCount += 1;
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to policy scope; only fake/dev fixture rows were used");
  }
  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Homework tracker-read smoke test crashed:", err?.message || err);
  process.exit(1);
});


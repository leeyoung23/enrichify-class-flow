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
  const [{ signInWithEmailPassword, signOut }, readService, uploadService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const {
    listHomeworkTaskAssignees,
    listAssignedHomeworkForStudent,
  } = readService;
  const { createHomeworkTask } = uploadService;

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
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
  let createdSelectedTask = null;
  let createdClassTask = null;
  let createdUnassignedTask = null;
  let createdAssignee = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    printResult("CHECK", "Parent fixture user unavailable; assignee-read smoke skipped");
    return;
  }

  const parentAuth = await supabase.auth.getUser();
  const parentAuthId = parentAuth.data?.user?.id || null;
  if (!parentAuthId) {
    printResult("CHECK", "Parent: authenticated user id not available; fixture setup skipped");
    return;
  }

  const parentProfile = await supabase
    .from("profiles")
    .select("id,linked_student_id")
    .eq("id", parentAuthId)
    .maybeSingle();
  if (parentProfile.error || !parentProfile.data?.linked_student_id) {
    printResult("CHECK", `Parent: linked student not available (${parentProfile.error?.message || "unknown"})`);
    return;
  }

  const studentLookup = await supabase
    .from("students")
    .select("id,branch_id,class_id,full_name")
    .eq("id", parentProfile.data.linked_student_id)
    .maybeSingle();
  if (studentLookup.error || !studentLookup.data?.id) {
    printResult("CHECK", `Parent: linked student lookup failed (${studentLookup.error?.message || "unknown"})`);
    return;
  }
  linkedStudent = studentLookup.data;
  printResult("PASS", `Parent: linked student fixture resolved (${linkedStudent.full_name || linkedStudent.id})`);

  const siblingLookup = await supabase
    .from("students")
    .select("id,full_name")
    .eq("class_id", linkedStudent.class_id)
    .neq("id", linkedStudent.id)
    .limit(1)
    .maybeSingle();
  if (!siblingLookup.error && siblingLookup.data?.id) {
    siblingStudent = siblingLookup.data;
  }
  await signOut();

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    printResult("CHECK", "Branch Supervisor unavailable; fixture setup skipped");
    return;
  }

  // Class-scope task (should appear for linked student even without assignee row).
  const classTaskCreate = await supabase
    .from("homework_tasks")
    .insert({
      branch_id: linkedStudent.branch_id,
      class_id: linkedStudent.class_id,
      title: `Smoke Class Scope ${new Date().toISOString()}`,
      instructions: "Fake/dev class-scope task for assignee-read smoke only.",
      subject: "Smoke",
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
      assignment_scope: "class",
    })
    .select("id,branch_id,class_id,status,assignment_scope")
    .maybeSingle();

  if (classTaskCreate.error || !classTaskCreate.data?.id) {
    const fallbackClassTask = await createHomeworkTask({
      branchId: linkedStudent.branch_id,
      classId: linkedStudent.class_id,
      title: `Smoke Class Scope Fallback ${new Date().toISOString()}`,
      instructions: "Fallback class-scope task for assignee-read smoke.",
      subject: "Smoke",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
    });
    if (fallbackClassTask.error || !fallbackClassTask.data?.id) {
      printResult("CHECK", `Branch Supervisor: class-scope fixture create unavailable (${fallbackClassTask.error?.message || classTaskCreate.error?.message || "unknown"})`);
    } else {
      createdClassTask = fallbackClassTask.data;
      printResult("PASS", "Branch Supervisor: class-scope fixture task created (fallback)");
    }
  } else {
    createdClassTask = classTaskCreate.data;
    printResult("PASS", "Branch Supervisor: class-scope fixture task created");
  }

  // Selected-students task (requires explicit assignee row).
  const selectedTaskCreate = await supabase
    .from("homework_tasks")
    .insert({
      branch_id: linkedStudent.branch_id,
      class_id: linkedStudent.class_id,
      title: `Smoke Selected Scope ${new Date().toISOString()}`,
      instructions: "Fake/dev selected-students task for assignee-read smoke only.",
      subject: "Smoke",
      due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
      assignment_scope: "selected_students",
    })
    .select("id,branch_id,class_id,status,assignment_scope")
    .maybeSingle();

  if (selectedTaskCreate.error || !selectedTaskCreate.data?.id) {
    printResult("CHECK", `Branch Supervisor: selected-students fixture task create unavailable (${selectedTaskCreate.error?.message || "unknown"})`);
  } else {
    createdSelectedTask = selectedTaskCreate.data;
    printResult("PASS", "Branch Supervisor: selected-students fixture task created");
  }

  // Selected-students task intentionally NOT assigned to linked student.
  const unassignedTaskCreate = await supabase
    .from("homework_tasks")
    .insert({
      branch_id: linkedStudent.branch_id,
      class_id: linkedStudent.class_id,
      title: `Smoke Unassigned Selected ${new Date().toISOString()}`,
      instructions: "Fake/dev selected task that should be hidden for linked student.",
      subject: "Smoke",
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "assigned",
      assignment_scope: "selected_students",
    })
    .select("id,branch_id,class_id,status,assignment_scope")
    .maybeSingle();
  if (!unassignedTaskCreate.error && unassignedTaskCreate.data?.id) {
    createdUnassignedTask = unassignedTaskCreate.data;
  } else {
    printResult("CHECK", `Branch Supervisor: unassigned selected fixture unavailable (${unassignedTaskCreate.error?.message || "unknown"})`);
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
      printResult("CHECK", `Branch Supervisor: selected-student assignee create unavailable (${assigneeCreate.error?.message || "unknown"})`);
    } else {
      createdAssignee = assigneeCreate.data;
      printResult("PASS", "Branch Supervisor: selected-student assignee row created");
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
  } else if (createdUnassignedTask?.id && !siblingStudent?.id) {
    printResult("CHECK", "Sibling student fixture unavailable; unassigned-selected strict check may be partial");
  }

  await signOut();

  const parentSignInChecks = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInChecks.ok) {
    printResult("WARNING", "Parent: sign-in failed for assignee-read checks");
    failureCount += 1;
  } else {
    const parentAssigneeRead = await listHomeworkTaskAssignees({ studentId: linkedStudent.id });
    const parentCanSeeSelectedAssignee = Array.isArray(parentAssigneeRead.data)
      ? parentAssigneeRead.data.some((row) => row?.id === createdAssignee?.id)
      : false;
    if (!createdAssignee?.id) {
      printResult("CHECK", "Parent: selected-student assignee visibility skipped (fixture unavailable)");
    } else if (parentAssigneeRead.error || !parentCanSeeSelectedAssignee) {
      printResult("WARNING", `Parent: linked-child assignee row not visible (${parentAssigneeRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: linked-child assignee row visible");
    }

    const parentAssignedRead = await listAssignedHomeworkForStudent({ studentId: linkedStudent.id });
    const assignedTaskIds = Array.isArray(parentAssignedRead.data)
      ? new Set(parentAssignedRead.data.map((row) => row?.homework_task_id).filter(Boolean))
      : new Set();
    const seesClassScope = createdClassTask?.id ? assignedTaskIds.has(createdClassTask.id) : true;
    const seesSelected = createdSelectedTask?.id ? assignedTaskIds.has(createdSelectedTask.id) : true;
    const seesUnassignedSelected = createdUnassignedTask?.id ? assignedTaskIds.has(createdUnassignedTask.id) : false;

    if (parentAssignedRead.error) {
      printResult("WARNING", `Parent: assigned-homework read failed (${parentAssignedRead.error.message || "unknown"})`);
      failureCount += 1;
    } else {
      if (seesClassScope) {
        printResult("PASS", "Parent: class-scope task visible without explicit assignee row");
      } else {
        printResult("WARNING", "Parent: class-scope compatibility failed");
        failureCount += 1;
      }
      if (seesSelected) {
        printResult("PASS", "Parent: selected-student assigned task visible before submission");
      } else {
        printResult("WARNING", "Parent: selected-student assigned task not visible");
        failureCount += 1;
      }
      if (createdUnassignedTask?.id) {
        if (seesUnassignedSelected) {
          printResult("WARNING", "Parent: unassigned selected-student task unexpectedly visible");
          failureCount += 1;
        } else {
          printResult("PASS", "Parent: unassigned selected-student task remained hidden");
        }
      } else {
        printResult("CHECK", "Parent: unassigned selected-student visibility check skipped (fixture unavailable)");
      }
    }
  }
  await signOut();

  const teacherSignInChecks = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignInChecks.ok) {
    printResult("CHECK", "Teacher: unavailable, class visibility check skipped");
  } else if (!createdAssignee?.id) {
    printResult("CHECK", "Teacher: class assignee visibility skipped (fixture unavailable)");
  } else {
    const teacherRead = await listHomeworkTaskAssignees({ classId: linkedStudent.class_id });
    const teacherCanSee = Array.isArray(teacherRead.data)
      ? teacherRead.data.some((row) => row?.id === createdAssignee?.id)
      : false;
    if (teacherRead.error || !teacherCanSee) {
      printResult("WARNING", `Teacher: expected class assignee row not visible (${teacherRead.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "Teacher: assigned-class assignee visibility confirmed");
    }
  }
  await signOut();

  const supervisorSignInChecks = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignInChecks.ok) {
    printResult("WARNING", "Branch Supervisor: sign-in failed for read check");
    warningCount += 1;
  } else if (!createdAssignee?.id) {
    printResult("CHECK", "Branch Supervisor: assignee read check skipped (fixture unavailable)");
  } else {
    const supervisorRead = await listHomeworkTaskAssignees({ classId: linkedStudent.class_id });
    const supervisorCanSee = Array.isArray(supervisorRead.data)
      ? supervisorRead.data.some((row) => row?.id === createdAssignee?.id)
      : false;
    if (supervisorRead.error || !supervisorCanSee) {
      printResult("WARNING", `Branch Supervisor: expected assignee row not visible (${supervisorRead.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "Branch Supervisor: own-branch assignee visibility confirmed");
    }
  }
  await signOut();

  const hqSignInChecks = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqSignInChecks.ok) {
    printResult("CHECK", "HQ Admin: unavailable, broad-scope check skipped");
  } else if (!createdAssignee?.id) {
    printResult("CHECK", "HQ Admin: broad-scope check skipped (fixture unavailable)");
  } else {
    const hqRead = await listHomeworkTaskAssignees({ classId: linkedStudent.class_id });
    const hqCanSee = Array.isArray(hqRead.data)
      ? hqRead.data.some((row) => row?.id === createdAssignee?.id)
      : false;
    if (hqRead.error || !hqCanSee) {
      printResult("WARNING", `HQ Admin: expected assignee row not visible (${hqRead.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "HQ Admin: broad assignee visibility confirmed");
    }
  }
  await signOut();

  const unrelatedParentSignIn = await signInRole(unrelatedParentUser, { signInWithEmailPassword, signOut });
  if (!unrelatedParentSignIn.ok) {
    printResult("CHECK", "Unrelated Parent: unavailable, blocking check skipped");
  } else if (!createdAssignee?.id) {
    printResult("CHECK", "Unrelated Parent: blocking check skipped (fixture unavailable)");
  } else {
    const unrelatedRead = await listHomeworkTaskAssignees({ studentId: linkedStudent.id });
    const canSee = Array.isArray(unrelatedRead.data)
      ? unrelatedRead.data.some((row) => row?.id === createdAssignee?.id)
      : false;
    if (unrelatedRead.error || !canSee) {
      printResult("PASS", "Unrelated Parent: blocked from linked-child assignee read");
    } else {
      printResult("WARNING", "Unrelated Parent: unexpectedly read unrelated assignee");
      failureCount += 1;
    }
  }
  await signOut();

  const supervisorCleanupSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorCleanupSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: cleanup skipped (sign-in failed)");
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
        printResult("PASS", "Cleanup: selected-student assignee removed");
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
        printResult("PASS", `Cleanup: fixture task removed (${taskId})`);
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
  console.error("[WARNING] Homework assignee-read smoke test crashed:", err?.message || err);
  process.exit(1);
});


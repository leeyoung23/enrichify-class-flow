import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

const FAKE_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const FAKE_PROFILE_ENGLISH = "91300000-0000-0000-0000-000000000011";
const FAKE_PROFILE_MATHS = "91300000-0000-0000-0000-000000000012";

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
  return { ok: true, skipped: false };
}

function getSnapshotRow(snapshotRows) {
  if (!Array.isArray(snapshotRows) || snapshotRows.length === 0) return null;
  return snapshotRows[0];
}

async function run() {
  const [
    { signInWithEmailPassword, signOut },
    { assignCurriculumToClass, updateClassCurriculumAssignment },
    { getClassLearningContext, listClassCurriculumAssignments },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const users = {
    supervisor: {
      label: "Branch Supervisor",
      email: "supervisor.demo@example.test",
      passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
    },
    teacher: {
      label: "Teacher",
      email: "teacher.demo@example.test",
      passwordVar: "RLS_TEST_TEACHER_PASSWORD",
    },
    parent: {
      label: "Parent",
      email: "parent.demo@example.test",
      passwordVar: "RLS_TEST_PARENT_PASSWORD",
    },
    student: {
      label: "Student",
      email: "student.demo@example.test",
      passwordVar: "RLS_TEST_STUDENT_PASSWORD",
    },
    hq: {
      label: "HQ Admin",
      email: "hq.demo@example.test",
      passwordVar: "RLS_TEST_HQ_PASSWORD",
    },
  };

  let failureCount = 0;
  let warningCount = 0;
  let checkCount = 0;

  let snapshotAssignments = [];
  let workingAssignmentId = null;

  const supervisorSignIn = await signInRole(users.supervisor, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    process.exit(1);
  }

  const snapshotRead = await listClassCurriculumAssignments({ classId: FAKE_CLASS_ID });
  if (snapshotRead.error) {
    printResult(
      "WARNING",
      `Branch Supervisor: unable to snapshot class assignments (${snapshotRead.error.message || "unknown"})`
    );
    failureCount += 1;
  } else {
    snapshotAssignments = Array.isArray(snapshotRead.data) ? snapshotRead.data : [];
    printResult("PASS", `Branch Supervisor: snapshotted ${snapshotAssignments.length} assignment row(s)`);
  }

  const assignResult = await assignCurriculumToClass({
    classId: FAKE_CLASS_ID,
    curriculumProfileId: FAKE_PROFILE_MATHS,
    learningFocus: "Write smoke assignment focus for safe fake curriculum validation.",
    termLabel: "Write Smoke Term A",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
  });

  if (assignResult.error || !assignResult.data?.id) {
    printResult("WARNING", `Branch Supervisor: assignCurriculumToClass failed (${assignResult.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    workingAssignmentId = assignResult.data.id;
    printResult("PASS", `Branch Supervisor: assignCurriculumToClass wrote ${workingAssignmentId}`);
  }

  const classContext = await getClassLearningContext({ classId: FAKE_CLASS_ID });
  if (classContext.error) {
    printResult("WARNING", `Branch Supervisor: getClassLearningContext failed (${classContext.error.message || "unknown"})`);
    failureCount += 1;
  } else {
    const rows = classContext.data?.class_curriculum_assignments || [];
    const visible = rows.some((row) => row.id === workingAssignmentId);
    if (!visible) {
      printResult("CHECK", "Branch Supervisor: assigned row not visible through getClassLearningContext");
      checkCount += 1;
      failureCount += 1;
    } else {
      printResult("PASS", "Branch Supervisor: assignment visible through getClassLearningContext");
    }
  }

  const updateResult = await updateClassCurriculumAssignment({
    assignmentId: workingAssignmentId,
    learningFocus: "Write smoke updated focus for safe fake curriculum validation.",
    termLabel: "Write Smoke Term B",
    startDate: "2026-05-01",
    endDate: "2026-07-31",
  });

  if (updateResult.error || !updateResult.data) {
    printResult("WARNING", `Branch Supervisor: updateClassCurriculumAssignment failed (${updateResult.error?.message || "unknown"})`);
    failureCount += 1;
  } else if (
    updateResult.data.learning_focus !== "Write smoke updated focus for safe fake curriculum validation."
    || updateResult.data.term_label !== "Write Smoke Term B"
  ) {
    printResult("CHECK", "Branch Supervisor: update response missing expected learning_focus/term_label");
    checkCount += 1;
    failureCount += 1;
  } else {
    printResult("PASS", "Branch Supervisor: updateClassCurriculumAssignment returned expected fields");
  }

  await signOut();

  for (const role of [users.parent, users.student, users.teacher]) {
    const signedIn = await signInRole(role, { signInWithEmailPassword, signOut });
    if (!signedIn.ok) {
      warningCount += 1;
      failureCount += 1;
      continue;
    }

    const blockedAttempt = await updateClassCurriculumAssignment({
      assignmentId: workingAssignmentId,
      learningFocus: `${role.label} blocked write attempt`,
      termLabel: "Blocked Write",
      startDate: "2026-05-10",
      endDate: "2026-07-10",
    });

    if (blockedAttempt.error || !blockedAttempt.data) {
      printResult("PASS", `${role.label}: curriculum assignment write blocked by RLS`);
    } else {
      printResult("WARNING", `${role.label}: unexpectedly wrote curriculum assignment ${blockedAttempt.data.id}`);
      warningCount += 1;
      failureCount += 1;
    }
    await signOut();
  }

  const hqSignIn = await signInRole(users.hq, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) {
    printResult("CHECK", "HQ Admin: optional write check skipped");
    checkCount += 1;
  } else {
    const hqAttempt = await updateClassCurriculumAssignment({
      assignmentId: workingAssignmentId,
      learningFocus: "HQ optional write check",
      termLabel: "HQ Optional",
      startDate: "2026-05-15",
      endDate: "2026-07-15",
    });
    if (hqAttempt.error || !hqAttempt.data) {
      printResult("CHECK", `HQ Admin: optional write did not succeed (${hqAttempt.error?.message || "blocked"})`);
      checkCount += 1;
    } else {
      printResult("PASS", "HQ Admin: optional write succeeded");
    }
    await signOut();
  }

  const cleanupSignIn = await signInRole(users.supervisor, { signInWithEmailPassword, signOut });
  if (!cleanupSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: cleanup skipped due to sign-in failure");
    warningCount += 1;
    failureCount += 1;
  } else {
    const snapshotRow = getSnapshotRow(snapshotAssignments);
    if (snapshotRow) {
      const restoreResult = await supabase
        .from("class_curriculum_assignments")
        .update({
          curriculum_profile_id: snapshotRow.curriculum_profile_id,
          learning_focus: snapshotRow.learning_focus,
          term_label: snapshotRow.term_label,
          start_date: snapshotRow.start_date,
          end_date: snapshotRow.end_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", snapshotRow.id)
        .select("id")
        .maybeSingle();

      if (restoreResult.error || !restoreResult.data) {
        printResult("WARNING", `Branch Supervisor: cleanup restore failed (${restoreResult.error?.message || "unknown"})`);
        warningCount += 1;
        failureCount += 1;
      } else {
        printResult("PASS", `Branch Supervisor: restored assignment ${snapshotRow.id} to original fake values`);
      }
    } else if (workingAssignmentId) {
      const deleteResult = await supabase
        .from("class_curriculum_assignments")
        .delete()
        .eq("id", workingAssignmentId)
        .select("id")
        .maybeSingle();
      if (deleteResult.error) {
        printResult("WARNING", `Branch Supervisor: cleanup delete failed (${deleteResult.error.message || "unknown"})`);
        warningCount += 1;
        failureCount += 1;
      } else {
        printResult("PASS", `Branch Supervisor: removed smoke-created assignment ${workingAssignmentId}`);
      }
    } else {
      printResult("CHECK", "Branch Supervisor: no cleanup action needed");
      checkCount += 1;
    }
    await signOut();
  }

  if (warningCount > 0 || checkCount > 0) {
    printResult("CHECK", `Summary warnings=${warningCount} checks=${checkCount}`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
  printResult("PASS", "School curriculum write smoke test completed");
}

run().catch((err) => {
  console.error("[WARNING] School curriculum write smoke test crashed:", err?.message || err);
  process.exit(1);
});

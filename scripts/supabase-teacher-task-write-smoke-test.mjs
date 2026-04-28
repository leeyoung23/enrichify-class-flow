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
    { updateTeacherTaskAssignmentStatus },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseWriteService.js"),
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
  let targetAssignment = null;

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    process.exit(1);
  }

  const assignmentQuery = await supabase
    .from("teacher_task_assignments")
    .select("id,status,completed_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignmentQuery.error) {
    printResult("WARNING", `Teacher: failed to read own assignment (${assignmentQuery.error.message || "unknown"})`);
    warningCount += 1;
    failureCount += 1;
  } else if (!assignmentQuery.data) {
    printResult("CHECK", "Teacher: no visible teacher_task_assignments row to test");
    failureCount += 1;
  } else {
    targetAssignment = assignmentQuery.data;
    printResult("PASS", `Teacher: found assignment ${targetAssignment.id}`);
  }

  if (targetAssignment) {
    const completeAt = new Date().toISOString();
    const teacherUpdate = await updateTeacherTaskAssignmentStatus({
      assignmentId: targetAssignment.id,
      status: "completed",
      completedAt: completeAt,
    });

    if (teacherUpdate.error) {
      printResult("WARNING", `Teacher: update failed (${teacherUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!teacherUpdate.data) {
      printResult("CHECK", "Teacher: update returned no row (unexpected for own assignment)");
      failureCount += 1;
    } else {
      printResult(
        "PASS",
        `Teacher: updated assignment ${teacherUpdate.data.id} to status=${teacherUpdate.data.status}`
      );
    }

    const verifyQuery = await supabase
      .from("teacher_task_assignments")
      .select("id,status,completed_at")
      .eq("id", targetAssignment.id)
      .maybeSingle();

    if (verifyQuery.error) {
      printResult("WARNING", `Teacher: verify read failed (${verifyQuery.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (
      !verifyQuery.data ||
      verifyQuery.data.status !== "completed" ||
      !verifyQuery.data.completed_at
    ) {
      printResult("CHECK", "Teacher: assignment verify did not show completed status with completed_at");
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: completed status verified");
    }

    const revertUpdate = await updateTeacherTaskAssignmentStatus({
      assignmentId: targetAssignment.id,
      status: targetAssignment.status,
      completedAt: targetAssignment.completed_at ?? null,
    });

    if (revertUpdate.error) {
      printResult("WARNING", `Teacher: revert failed (${revertUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: assignment reverted to original status/completed_at");
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const denyChecks = [parentUser, studentUser];
  for (const user of denyChecks) {
    const signedIn = await signInRole(user, { signInWithEmailPassword, signOut });
    if (!signedIn.ok) {
      failureCount += 1;
      continue;
    }

    if (!targetAssignment) {
      printResult("CHECK", `${user.label}: skipped deny check (no assignment id from teacher step)`);
      failureCount += 1;
    } else {
      const attempt = await updateTeacherTaskAssignmentStatus({
        assignmentId: targetAssignment.id,
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      if (attempt.error) {
        printResult("PASS", `${user.label}: update blocked by RLS (${attempt.error.message || "error"})`);
      } else if (!attempt.data) {
        printResult("PASS", `${user.label}: update blocked (0 visible updated rows)`);
      } else {
        printResult("WARNING", `${user.label}: unexpectedly updated assignment ${attempt.data.id}`);
        warningCount += 1;
        failureCount += 1;
      }
    }

    const signedOut = await signOut();
    if (signedOut.error) {
      printResult("WARNING", `${user.label}: sign-out warning (${signedOut.error.message || "unknown"})`);
      warningCount += 1;
    }
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }

  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Teacher task write smoke test crashed:", err?.message || err);
  process.exit(1);
});


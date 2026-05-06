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
    { updateAttendanceRecord },
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
  let targetRecord = null;
  const ATTENDANCE_ARRIVAL_NOTIFY_TITLE = "Your child has arrived";
  let parentArrivalNotifBaseline = -1;

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    process.exit(1);
  }

  const attendanceQuery = await supabase
    .from("attendance_records")
    .select("id,status,note,branch_id,class_id,student_id,session_date,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attendanceQuery.error) {
    printResult("WARNING", `Teacher: failed to read own attendance row (${attendanceQuery.error.message || "unknown"})`);
    warningCount += 1;
    failureCount += 1;
  } else if (!attendanceQuery.data) {
    printResult("CHECK", "Teacher: no visible attendance_records row to test");
    failureCount += 1;
  } else {
    targetRecord = attendanceQuery.data;
    printResult("PASS", `Teacher: found attendance record ${targetRecord.id}`);
  }

  await signOut();

  const parentBaselineSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (parentBaselineSignIn.ok) {
    const bc = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("channel", "in_app")
      .eq("title", ATTENDANCE_ARRIVAL_NOTIFY_TITLE);
    parentArrivalNotifBaseline = typeof bc.count === "number" ? bc.count : -1;
    printResult("PASS", `Parent: pre-transition arrival-notification baseline count=${parentArrivalNotifBaseline}`);
    await signOut();
  } else {
    printResult("CHECK", "Parent: arrival-notification baseline skipped (sign-in failed)");
  }

  const teacherSignInAgain = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignInAgain.ok) {
    process.exit(1);
  }

  if (targetRecord) {
    const testNote = "attendance write smoke test note";
    const originalStatus = targetRecord.status;
    const originalNote = targetRecord.note ?? null;
    const arrivalStatuses = new Set(["present", "late"]);
    const firstWasArrival = arrivalStatuses.has(originalStatus);

    if (firstWasArrival) {
      const toAbsent = await updateAttendanceRecord({
        recordId: targetRecord.id,
        status: "absent",
        note: originalNote,
      });
      if (toAbsent.error || !toAbsent.data?.id) {
        printResult("WARNING", `Teacher: could not reset to absent before arrival test (${toAbsent.error?.message || "unknown"})`);
        warningCount += 1;
      } else {
        printResult("PASS", "Teacher: reset row to absent for arrival transition test");
      }
    }

    const teacherUpdate = await updateAttendanceRecord({
      recordId: targetRecord.id,
      status: "late",
      note: testNote,
    });

    if (teacherUpdate.error) {
      printResult("WARNING", `Teacher: update failed (${teacherUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!teacherUpdate.data) {
      printResult("CHECK", "Teacher: update returned no row (unexpected for own attendance row)");
      failureCount += 1;
    } else {
      printResult("PASS", `Teacher: updated attendance ${teacherUpdate.data.id} to status=${teacherUpdate.data.status}`);
    }

    const verifyQuery = await supabase
      .from("attendance_records")
      .select("id,status,note")
      .eq("id", targetRecord.id)
      .maybeSingle();

    if (verifyQuery.error) {
      printResult("WARNING", `Teacher: verify read failed (${verifyQuery.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!verifyQuery.data || verifyQuery.data.status !== "late" || verifyQuery.data.note !== testNote) {
      printResult("CHECK", "Teacher: verify did not show expected late status + note");
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: attendance update verified");
    }

    const dupSameStatus = await updateAttendanceRecord({
      recordId: targetRecord.id,
      status: "late",
      note: testNote,
    });
    if (dupSameStatus.error || !dupSameStatus.data?.id) {
      printResult("CHECK", `Teacher: duplicate late save CHECK (${dupSameStatus.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: duplicate late save completed (idempotent arrival notify expected)");
    }

    const revertUpdate = await updateAttendanceRecord({
      recordId: targetRecord.id,
      status: originalStatus,
      note: originalNote,
    });

    if (revertUpdate.error) {
      printResult("WARNING", `Teacher: revert failed (${revertUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: attendance record reverted to original status/note");
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const parentAfterSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (parentAfterSignIn.ok && parentArrivalNotifBaseline >= 0 && targetRecord) {
    const ac = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("channel", "in_app")
      .eq("title", ATTENDANCE_ARRIVAL_NOTIFY_TITLE);
    const afterN = typeof ac.count === "number" ? ac.count : -1;
    if (afterN > parentArrivalNotifBaseline) {
      printResult(
        "PASS",
        `Parent: attendance arrival created in-app notification (${parentArrivalNotifBaseline} -> ${afterN})`
      );
    } else {
      printResult(
        "WARNING",
        `Parent: expected arrival notification after transition (baseline=${parentArrivalNotifBaseline}, after=${afterN})`
      );
      failureCount += 1;
    }
    await signOut();
  } else if (!parentAfterSignIn.ok) {
    printResult("CHECK", "Parent: post-transition arrival notification check skipped (sign-in failed)");
  }

  const denyChecks = [parentUser, studentUser];
  for (const user of denyChecks) {
    const signedIn = await signInRole(user, { signInWithEmailPassword, signOut });
    if (!signedIn.ok) {
      failureCount += 1;
      continue;
    }

    if (!targetRecord) {
      printResult("CHECK", `${user.label}: skipped deny check (no attendance record id from teacher step)`);
      failureCount += 1;
    } else {
      const attempt = await updateAttendanceRecord({
        recordId: targetRecord.id,
        status: "late",
        note: "blocked write test",
      });

      if (attempt.error) {
        printResult("PASS", `${user.label}: update blocked by RLS (${attempt.error.message || "error"})`);
      } else if (!attempt.data) {
        printResult("PASS", `${user.label}: update blocked (0 visible updated rows)`);
      } else {
        printResult("WARNING", `${user.label}: unexpectedly updated attendance ${attempt.data.id}`);
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
  console.error("[WARNING] Attendance write smoke test crashed:", err?.message || err);
  process.exit(1);
});


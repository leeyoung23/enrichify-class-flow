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
    { updateWeeklyProgressReportDraft, releaseWeeklyProgressReport },
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
  let targetReport = null;
  const draftStatus = "draft";

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    process.exit(1);
  }

  const weeklyReportQuery = await supabase
    .from("weekly_progress_reports")
    .select("id,report_text,status,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (weeklyReportQuery.error) {
    printResult("WARNING", `Teacher: failed to read own weekly report (${weeklyReportQuery.error.message || "unknown"})`);
    warningCount += 1;
    failureCount += 1;
  } else if (!weeklyReportQuery.data) {
    printResult("CHECK", "Teacher: no visible weekly_progress_reports row to test");
    failureCount += 1;
  } else {
    targetReport = weeklyReportQuery.data;
    printResult("PASS", `Teacher: found weekly report ${targetReport.id}`);
  }

  const originalReportText = targetReport?.report_text ?? "";
  const originalStatus = targetReport?.status ?? "draft";

  if (targetReport) {
    const teacherDraftText = `weekly report draft smoke test ${new Date().toISOString()}`;
    const teacherDraftUpdate = await updateWeeklyProgressReportDraft({
      reportId: targetReport.id,
      reportText: teacherDraftText,
      status: draftStatus,
    });

    if (teacherDraftUpdate.error) {
      printResult("WARNING", `Teacher: draft update failed (${teacherDraftUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!teacherDraftUpdate.data) {
      printResult("CHECK", "Teacher: draft update returned no row (unexpected for own weekly report)");
      failureCount += 1;
    } else {
      printResult("PASS", `Teacher: updated weekly report ${teacherDraftUpdate.data.id} to status=draft`);
    }

    const teacherVerifyDraft = await supabase
      .from("weekly_progress_reports")
      .select("id,report_text,status")
      .eq("id", targetReport.id)
      .maybeSingle();

    if (teacherVerifyDraft.error) {
      printResult("WARNING", `Teacher: verify read failed (${teacherVerifyDraft.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (
      !teacherVerifyDraft.data
      || teacherVerifyDraft.data.status !== draftStatus
      || teacherVerifyDraft.data.report_text !== teacherDraftText
    ) {
      printResult("CHECK", "Teacher: verify did not show expected draft status + updated report_text");
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: draft weekly report update verified");
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const parentSignInDraftCheck = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInDraftCheck.ok) {
    failureCount += 1;
  } else if (!targetReport) {
    printResult("CHECK", "Parent: skipped draft visibility check (no weekly report id from teacher step)");
    failureCount += 1;
  } else {
    const parentReadDraft = await supabase
      .from("weekly_progress_reports")
      .select("id,status")
      .eq("id", targetReport.id)
      .maybeSingle();

    if (parentReadDraft.error) {
      printResult("PASS", `Parent: draft row hidden (${parentReadDraft.error.message || "not visible"})`);
    } else if (!parentReadDraft.data) {
      printResult("PASS", "Parent: draft row hidden (0 visible rows)");
    } else {
      printResult("WARNING", `Parent: unexpectedly read draft row ${parentReadDraft.data.id}`);
      warningCount += 1;
      failureCount += 1;
    }
  }

  const parentSignOutDraftCheck = await signOut();
  if (parentSignOutDraftCheck.error) {
    printResult("WARNING", `Parent: sign-out warning (${parentSignOutDraftCheck.error.message || "unknown"})`);
    warningCount += 1;
  }

  const teacherSignInRelease = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignInRelease.ok) {
    failureCount += 1;
  } else if (!targetReport) {
    printResult("CHECK", "Teacher: skipped release step (no weekly report id from earlier step)");
    failureCount += 1;
  } else {
    const teacherReleasedText = `weekly report released smoke test ${new Date().toISOString()}`;
    const releaseResult = await releaseWeeklyProgressReport({
      reportId: targetReport.id,
      reportText: teacherReleasedText,
    });

    if (releaseResult.error) {
      printResult("WARNING", `Teacher: release failed (${releaseResult.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!releaseResult.data) {
      printResult("CHECK", "Teacher: release returned no row (unexpected for own weekly report)");
      failureCount += 1;
    } else if (releaseResult.data.status !== "released") {
      printResult("CHECK", `Teacher: release returned unexpected status=${releaseResult.data.status}`);
      failureCount += 1;
    } else {
      printResult("PASS", `Teacher: released weekly report ${releaseResult.data.id} to status=released`);
    }
  }

  const teacherSignOutRelease = await signOut();
  if (teacherSignOutRelease.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOutRelease.error.message || "unknown"})`);
    warningCount += 1;
  }

  const parentSignInReleaseCheck = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignInReleaseCheck.ok) {
    failureCount += 1;
  } else if (!targetReport) {
    printResult("CHECK", "Parent: skipped released visibility check (no weekly report id from teacher step)");
    failureCount += 1;
  } else {
    const parentReadReleased = await supabase
      .from("weekly_progress_reports")
      .select("id,status,report_text")
      .eq("id", targetReport.id)
      .maybeSingle();

    if (parentReadReleased.error) {
      printResult("WARNING", `Parent: failed to read released row (${parentReadReleased.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!parentReadReleased.data) {
      printResult("CHECK", "Parent: released row not visible (unexpected)");
      failureCount += 1;
    } else if (parentReadReleased.data.status !== "released") {
      printResult("CHECK", `Parent: expected released status but found ${parentReadReleased.data.status}`);
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: released row is visible");
    }

    const parentWriteAttempt = await updateWeeklyProgressReportDraft({
      reportId: targetReport.id,
      reportText: "blocked parent weekly report write test",
      status: "draft",
    });

    if (parentWriteAttempt.error) {
      printResult("PASS", `Parent: write blocked by RLS (${parentWriteAttempt.error.message || "error"})`);
    } else if (!parentWriteAttempt.data) {
      printResult("PASS", "Parent: write blocked (0 visible updated rows)");
    } else {
      printResult("WARNING", `Parent: unexpectedly updated weekly report ${parentWriteAttempt.data.id}`);
      warningCount += 1;
      failureCount += 1;
    }
  }

  const parentSignOutReleaseCheck = await signOut();
  if (parentSignOutReleaseCheck.error) {
    printResult("WARNING", `Parent: sign-out warning (${parentSignOutReleaseCheck.error.message || "unknown"})`);
    warningCount += 1;
  }

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentSignIn.ok) {
    failureCount += 1;
  } else if (!targetReport) {
    printResult("CHECK", "Student: skipped write deny check (no weekly report id from teacher step)");
    failureCount += 1;
  } else {
    const studentWriteAttempt = await updateWeeklyProgressReportDraft({
      reportId: targetReport.id,
      reportText: "blocked student weekly report write test",
      status: "draft",
    });

    if (studentWriteAttempt.error) {
      printResult("PASS", `Student: write blocked by RLS (${studentWriteAttempt.error.message || "error"})`);
    } else if (!studentWriteAttempt.data) {
      printResult("PASS", "Student: write blocked (0 visible updated rows)");
    } else {
      printResult("WARNING", `Student: unexpectedly updated weekly report ${studentWriteAttempt.data.id}`);
      warningCount += 1;
      failureCount += 1;
    }
  }

  const studentSignOut = await signOut();
  if (studentSignOut.error) {
    printResult("WARNING", `Student: sign-out warning (${studentSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const teacherSignInForRevert = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignInForRevert.ok) {
    failureCount += 1;
  } else if (!targetReport) {
    printResult("CHECK", "Teacher: skipped revert (no weekly report id from earlier step)");
    failureCount += 1;
  } else {
    const revertUpdate = await updateWeeklyProgressReportDraft({
      reportId: targetReport.id,
      reportText: originalReportText,
      status: originalStatus,
    });

    if (revertUpdate.error) {
      printResult("WARNING", `Teacher: revert failed (${revertUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: weekly report reverted to original report_text/status");
    }
  }

  const finalTeacherSignOut = await signOut();
  if (finalTeacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${finalTeacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Weekly report write smoke test crashed:", err?.message || err);
  process.exit(1);
});

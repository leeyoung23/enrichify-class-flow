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
    { updateParentCommentDraft, releaseParentComment },
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
  let targetComment = null;
  let teacherDraftMessage = "";
  let teacherReleasedMessage = "";
  const draftStatus = "draft";

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    process.exit(1);
  }

  const parentCommentQuery = await supabase
    .from("parent_comments")
    .select("id,comment_text,status,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (parentCommentQuery.error) {
    printResult("WARNING", `Teacher: failed to read own parent comment (${parentCommentQuery.error.message || "unknown"})`);
    warningCount += 1;
    failureCount += 1;
  } else if (!parentCommentQuery.data) {
    printResult("CHECK", "Teacher: no visible parent_comments row to test");
    failureCount += 1;
  } else {
    targetComment = parentCommentQuery.data;
    printResult("PASS", `Teacher: found parent comment ${targetComment.id}`);
  }

  if (targetComment) {
    teacherDraftMessage = `parent update draft smoke test ${new Date().toISOString()}`;
    const teacherUpdate = await updateParentCommentDraft({
      commentId: targetComment.id,
      message: teacherDraftMessage,
      status: draftStatus,
    });

    if (teacherUpdate.error) {
      printResult("WARNING", `Teacher: draft update failed (${teacherUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!teacherUpdate.data) {
      printResult("CHECK", "Teacher: draft update returned no row (unexpected for own parent comment)");
      failureCount += 1;
    } else {
      printResult("PASS", `Teacher: updated parent comment ${teacherUpdate.data.id} to status=${teacherUpdate.data.status}`);
    }

    const verifyTeacherQuery = await supabase
      .from("parent_comments")
      .select("id,comment_text,status")
      .eq("id", targetComment.id)
      .maybeSingle();

    if (verifyTeacherQuery.error) {
      printResult("WARNING", `Teacher: verify read failed (${verifyTeacherQuery.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (
      !verifyTeacherQuery.data ||
      verifyTeacherQuery.data.status !== draftStatus ||
      verifyTeacherQuery.data.comment_text !== teacherDraftMessage
    ) {
      printResult("CHECK", "Teacher: verify did not show expected draft status + updated comment_text");
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: draft parent comment update verified");
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
  } else if (!targetComment) {
    printResult("CHECK", "Parent: skipped draft visibility check (no parent comment id from teacher step)");
    failureCount += 1;
  } else {
    const parentReadDraft = await supabase
      .from("parent_comments")
      .select("id,status")
      .eq("id", targetComment.id)
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

    const parentWriteAttempt = await updateParentCommentDraft({
      commentId: targetComment.id,
      message: "blocked parent write test",
      status: "draft",
    });

    if (parentWriteAttempt.error) {
      printResult("PASS", `Parent: write blocked by RLS (${parentWriteAttempt.error.message || "error"})`);
    } else if (!parentWriteAttempt.data) {
      printResult("PASS", "Parent: write blocked (0 visible updated rows)");
    } else {
      printResult("WARNING", `Parent: unexpectedly updated parent comment ${parentWriteAttempt.data.id}`);
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
  } else if (!targetComment) {
    printResult("CHECK", "Teacher: skipped release step (no parent comment id from earlier step)");
    failureCount += 1;
  } else {
    teacherReleasedMessage = `parent update released smoke test ${new Date().toISOString()}`;
    const releaseResult = await releaseParentComment({
      commentId: targetComment.id,
      message: teacherReleasedMessage,
    });

    if (releaseResult.error) {
      printResult("WARNING", `Teacher: release failed (${releaseResult.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else if (!releaseResult.data) {
      printResult("CHECK", "Teacher: release returned no row (unexpected for own parent comment)");
      failureCount += 1;
    } else if (releaseResult.data.status !== "released") {
      printResult("CHECK", `Teacher: release returned unexpected status=${releaseResult.data.status}`);
      failureCount += 1;
    } else {
      printResult("PASS", `Teacher: released parent comment ${releaseResult.data.id} to status=released`);
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
  } else if (!targetComment) {
    printResult("CHECK", "Parent: skipped released visibility check (no parent comment id from teacher step)");
    failureCount += 1;
  } else {
    const parentReadReleased = await supabase
      .from("parent_comments")
      .select("id,status,comment_text")
      .eq("id", targetComment.id)
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

    const parentWriteAttemptAfterRelease = await updateParentCommentDraft({
      commentId: targetComment.id,
      message: "blocked parent write test after release",
      status: "draft",
    });

    if (parentWriteAttemptAfterRelease.error) {
      printResult("PASS", `Parent: write blocked by RLS (${parentWriteAttemptAfterRelease.error.message || "error"})`);
    } else if (!parentWriteAttemptAfterRelease.data) {
      printResult("PASS", "Parent: write blocked (0 visible updated rows)");
    } else {
      printResult("WARNING", `Parent: unexpectedly updated parent comment ${parentWriteAttemptAfterRelease.data.id}`);
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
  } else if (!targetComment) {
    printResult("CHECK", "Student: skipped write deny check (no parent comment id from teacher step)");
    failureCount += 1;
  } else {
    const studentWriteAttempt = await updateParentCommentDraft({
      commentId: targetComment.id,
      message: "blocked student write test",
      status: "draft",
    });

    if (studentWriteAttempt.error) {
      printResult("PASS", `Student: write blocked by RLS (${studentWriteAttempt.error.message || "error"})`);
    } else if (!studentWriteAttempt.data) {
      printResult("PASS", "Student: write blocked (0 visible updated rows)");
    } else {
      printResult("WARNING", `Student: unexpectedly updated parent comment ${studentWriteAttempt.data.id}`);
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
  } else if (!targetComment) {
    printResult("CHECK", "Teacher: skipped revert (no parent comment id from earlier step)");
    failureCount += 1;
  } else {
    const revertUpdate = await updateParentCommentDraft({
      commentId: targetComment.id,
      message: targetComment.comment_text,
      status: targetComment.status,
    });

    if (revertUpdate.error) {
      printResult("WARNING", `Teacher: revert failed (${revertUpdate.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: parent comment reverted to original message/status");
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
  console.error("[WARNING] Parent updates write smoke test crashed:", err?.message || err);
  process.exit(1);
});

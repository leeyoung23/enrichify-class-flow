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
  const [
    { signInWithEmailPassword, signOut },
    { listMyAuthSessions, listAuthSessionsForAdmin },
    {
      createAuthSession,
      updateAuthSessionHeartbeat,
      markAuthSessionSignedOut,
      markAuthSessionTimedOut,
      endOwnAuthSession,
      revokeAuthSession,
    },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
  const studentUser = {
    label: "Student",
    email: process.env.RLS_TEST_STUDENT_EMAIL || "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
  };
  const teacherUser = {
    label: "Teacher",
    email: process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  let parentSessionId = null;
  let parentProfileId = null;
  let studentSessionId = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) process.exit(1);

  const parentAuth = await supabase.auth.getUser();
  parentProfileId = parentAuth?.data?.user?.id || null;
  if (!parentProfileId) {
    printResult("WARNING", "Parent: failed to resolve authenticated profile id");
    failureCount += 1;
  }

  const parentCreate = await createAuthSession({
    rememberMeEnabled: false,
    safeDeviceLabel: "parent-smoke-browser",
  });
  if (parentCreate.error || !parentCreate.data?.id) {
    const msg = parentCreate.error?.message || "unknown";
    if (msg.toLowerCase().includes("auth_sessions")) {
      printResult("WARNING", "Parent: auth_sessions table not found. Apply SQL 043 before running this smoke.");
    } else {
      printResult("WARNING", `Parent: create auth session failed (${msg})`);
    }
    failureCount += 1;
  } else {
    parentSessionId = parentCreate.data.id;
    printResult("PASS", "Parent: created own auth session row");
  }

  const parentList = await listMyAuthSessions({ limit: 30 });
  if (parentList.error) {
    printResult("WARNING", `Parent: list own auth sessions failed (${parentList.error?.message || "unknown"})`);
    failureCount += 1;
  } else if (!Array.isArray(parentList.data) || !parentList.data.some((row) => row?.id === parentSessionId)) {
    printResult("WARNING", "Parent: expected own auth session row not visible");
    failureCount += 1;
  } else {
    printResult("PASS", "Parent: can read own auth session row");
  }

  if (parentSessionId) {
    const parentHeartbeat = await updateAuthSessionHeartbeat({ sessionId: parentSessionId });
    if (parentHeartbeat.error || !parentHeartbeat.data?.id) {
      printResult("WARNING", `Parent: heartbeat update failed (${parentHeartbeat.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const parentSignOutMark = await markAuthSessionSignedOut({ sessionId: parentSessionId });
      if (parentSignOutMark.error || !parentSignOutMark.data?.id || parentSignOutMark.data.session_status !== "signed_out") {
        printResult(
          "WARNING",
          `Parent: signed_out update failed (${parentSignOutMark.error?.message || "unknown"})`
        );
        failureCount += 1;
      } else {
        printResult("PASS", "Parent: can update own auth session status/heartbeat");
      }
    }

    const parentTimeoutSession = await createAuthSession({
      rememberMeEnabled: false,
      safeDeviceLabel: "parent-timeout-smoke",
    });
    if (parentTimeoutSession.error || !parentTimeoutSession.data?.id) {
      printResult(
        "WARNING",
        `Parent: timed_out fixture session create failed (${parentTimeoutSession.error?.message || "unknown"})`
      );
      failureCount += 1;
    } else {
      const parentTimedOut = await markAuthSessionTimedOut({ sessionId: parentTimeoutSession.data.id });
      if (parentTimedOut.error || !parentTimedOut.data?.id || parentTimedOut.data.session_status !== "timed_out") {
        printResult(
          "WARNING",
          `Parent: timed_out update failed (${parentTimedOut.error?.message || "unknown"})`
        );
        failureCount += 1;
      } else {
        printResult("PASS", "Parent: can mark own auth session timed_out");
      }
    }

    const parentEndSession = await createAuthSession({
      rememberMeEnabled: true,
      safeDeviceLabel: "parent-self-end-smoke",
    });
    if (parentEndSession.error || !parentEndSession.data?.id) {
      printResult(
        "WARNING",
        `Parent: self-end fixture session create failed (${parentEndSession.error?.message || "unknown"})`
      );
      failureCount += 1;
    } else {
      const parentEnded = await endOwnAuthSession({
        sessionId: parentEndSession.data.id,
        source: "auth_sessions_smoke",
      });
      if (parentEnded.error || !parentEnded.data?.id || parentEnded.data.session_status !== "signed_out") {
        printResult(
          "WARNING",
          `Parent: self-end own session failed (${parentEnded.error?.message || "unknown"})`
        );
        failureCount += 1;
      } else {
        printResult("PASS", "Parent: can end own non-current auth session");
      }
    }
  }

  const parentForbiddenInsert = await supabase
    .from("auth_sessions")
    .insert({
      profile_id: "11111111-1111-1111-1111-111111111111",
      role: "parent",
      branch_id: null,
      remember_me_enabled: false,
      session_status: "active",
      safe_device_label: "forbidden-parent-insert",
    })
    .select("id")
    .maybeSingle();
  if (parentForbiddenInsert.error || !parentForbiddenInsert.data?.id) {
    printResult("PASS", "Parent: cannot create auth session for another profile");
  } else {
    printResult("WARNING", "Parent: unexpectedly created auth session for another profile");
    failureCount += 1;
  }

  await signOut();

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Student: unavailable, read-block check skipped");
  } else if (!parentSessionId) {
    warningCount += 1;
    printResult("CHECK", "Student: skipped parent-session read check (missing parent session id)");
  } else {
    const studentCreate = await createAuthSession({
      rememberMeEnabled: false,
      safeDeviceLabel: "student-smoke-browser",
    });
    if (studentCreate.error || !studentCreate.data?.id) {
      printResult("WARNING", `Student: fixture session create failed (${studentCreate.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      studentSessionId = studentCreate.data.id;
    }

    const studentReadParent = await supabase
      .from("auth_sessions")
      .select("id")
      .eq("id", parentSessionId)
      .maybeSingle();
    if (studentReadParent.error || !studentReadParent.data?.id) {
      printResult("PASS", "Student: cannot read parent auth session");
    } else {
      printResult("WARNING", "Student: unexpectedly read parent auth session");
      failureCount += 1;
    }
  }
  await signOut();

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Teacher: unavailable, read-block check skipped");
  } else if (!parentSessionId) {
    warningCount += 1;
    printResult("CHECK", "Teacher: skipped parent-session read check (missing parent session id)");
  } else {
    const teacherReadParent = await supabase
      .from("auth_sessions")
      .select("id")
      .eq("id", parentSessionId)
      .maybeSingle();
    if (teacherReadParent.error || !teacherReadParent.data?.id) {
      printResult("PASS", "Teacher: cannot read parent auth session");
    } else {
      printResult("WARNING", "Teacher: unexpectedly read parent auth session");
      failureCount += 1;
    }
  }
  await signOut();

  const parentReSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentReSignIn.ok) {
    failureCount += 1;
    printResult("WARNING", "Parent: unable to re-sign-in for cross-user self-end check");
  } else if (!studentSessionId) {
    warningCount += 1;
    printResult("CHECK", "Parent: skipped cross-user self-end check (missing student session id)");
  } else {
    const parentCrossEndAttempt = await endOwnAuthSession({
      sessionId: studentSessionId,
      source: "auth_sessions_smoke_cross_user",
    });
    if (parentCrossEndAttempt.error || !parentCrossEndAttempt.data?.id) {
      printResult("PASS", "Parent: cannot end another profile auth session");
    } else {
      printResult("WARNING", "Parent: unexpectedly ended another profile auth session");
      failureCount += 1;
    }
  }
  await signOut();

  const hqSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) {
    failureCount += 1;
    printResult("WARNING", "HQ Admin: unable to sign in for admin checks");
  } else if (!parentSessionId) {
    warningCount += 1;
    printResult("CHECK", "HQ Admin: skipped checks (missing parent session id)");
  } else {
    const hqRead = await listAuthSessionsForAdmin({ profileId: parentProfileId, limit: 30 });
    if (hqRead.error) {
      printResult("WARNING", `HQ Admin: list auth sessions failed (${hqRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else if (!Array.isArray(hqRead.data) || !hqRead.data.some((row) => row?.id === parentSessionId)) {
      printResult("WARNING", "HQ Admin: expected parent auth session not visible");
      failureCount += 1;
    } else {
      printResult("PASS", "HQ Admin: can read auth session row");
    }

    const hqRevoke = await revokeAuthSession({
      sessionId: parentSessionId,
      reason: "smoke_test_revoke",
    });
    if (hqRevoke.error || !hqRevoke.data?.id || hqRevoke.data.session_status !== "revoked") {
      printResult("WARNING", `HQ Admin: revoke session failed (${hqRevoke.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "HQ Admin: can revoke auth session row");
    }

    const hqDelete = await supabase
      .from("auth_sessions")
      .delete()
      .eq("id", parentSessionId)
      .select("id")
      .maybeSingle();
    if (hqDelete.error || !hqDelete.data?.id) {
      printResult("PASS", "Delete blocked for auth_sessions as expected");
    } else {
      printResult("WARNING", "Delete unexpectedly succeeded for auth_sessions");
      failureCount += 1;
    }
  }
  await signOut();

  if (parentSessionId) {
    const fieldProbe = await supabase
      .from("auth_sessions")
      .select("id,ip_hash,user_agent_hash,device_fingerprint,raw_user_agent")
      .eq("id", parentSessionId)
      .maybeSingle();
    if (fieldProbe.error) {
      printResult("PASS", "No raw IP/full user-agent/fingerprint columns exposed in auth_sessions");
    } else {
      printResult("WARNING", "Unexpected telemetry columns found in auth_sessions");
      failureCount += 1;
    }
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning/check item(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Auth sessions smoke crashed:", err?.message || err);
  process.exit(1);
});

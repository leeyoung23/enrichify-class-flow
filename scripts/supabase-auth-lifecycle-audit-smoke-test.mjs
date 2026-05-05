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
  const [{ signInWithEmailPassword, signOut }, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);
  const { recordAuthLifecycleAudit } = writeService;

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
    email: process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  let createdAuditEventId = null;

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    process.exit(1);
  }

  const createLoginAudit = await recordAuthLifecycleAudit({
    actionType: "user.login",
    role: "teacher",
    rememberMeEnabled: false,
    reason: "smoke_test",
    source: "login",
  });
  if (createLoginAudit.error || !createLoginAudit.data?.id) {
    printResult(
      "WARNING",
      `Teacher: auth lifecycle audit insert failed (${createLoginAudit.error?.message || "unknown"})`
    );
    failureCount += 1;
  } else {
    createdAuditEventId = createLoginAudit.data.id;
    printResult("PASS", `Teacher: auth lifecycle audit inserted (${createdAuditEventId})`);
  }

  if (createdAuditEventId) {
    const teacherRead = await supabase
      .from("audit_events")
      .select("id,action_type,entity_type,metadata")
      .eq("id", createdAuditEventId)
      .maybeSingle();
    if (teacherRead.error || !teacherRead.data?.id) {
      printResult(
        "WARNING",
        `Teacher: unable to read own auth lifecycle audit (${teacherRead.error?.message || "unknown"})`
      );
      failureCount += 1;
    } else if (teacherRead.data.action_type !== "user.login" || teacherRead.data.entity_type !== "user_session") {
      printResult("WARNING", "Teacher: auth lifecycle audit shape mismatch");
      failureCount += 1;
    } else if ((teacherRead.data.metadata || {}).rememberMeEnabled !== false) {
      printResult("WARNING", "Teacher: rememberMeEnabled metadata missing/mismatch");
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: auth lifecycle audit readable with safe metadata");
    }
  }
  await signOut();

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Parent: unavailable, read-block check skipped");
  } else if (!createdAuditEventId) {
    warningCount += 1;
    printResult("CHECK", "Parent: skipped read-block check (missing created audit event id)");
  } else {
    const parentRead = await supabase
      .from("audit_events")
      .select("id")
      .eq("id", createdAuditEventId)
      .maybeSingle();
    if (parentRead.error || !parentRead.data) {
      printResult("PASS", "Parent: auth lifecycle audit read blocked as expected");
    } else {
      printResult("WARNING", `Parent: unexpectedly read audit event ${parentRead.data.id}`);
      failureCount += 1;
    }
  }
  await signOut();

  const hqSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "HQ Admin: unavailable, HQ read/delete checks skipped");
  } else if (!createdAuditEventId) {
    warningCount += 1;
    printResult("CHECK", "HQ Admin: skipped read/delete checks (missing created audit event id)");
  } else {
    const hqRead = await supabase
      .from("audit_events")
      .select("id,action_type,entity_type,metadata")
      .eq("id", createdAuditEventId)
      .maybeSingle();
    if (hqRead.error || !hqRead.data?.id) {
      printResult("WARNING", `HQ Admin: failed to read audit event (${hqRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "HQ Admin: auth lifecycle audit visible");
    }

    const cleanup = await supabase
      .from("audit_events")
      .delete()
      .eq("id", createdAuditEventId)
      .select("id")
      .maybeSingle();
    if (cleanup.error || !cleanup.data?.id) {
      printResult("CHECK", `HQ Admin: cleanup unavailable (${cleanup.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "HQ Admin: cleanup deleted auth lifecycle smoke event");
    }
  }
  await signOut();

  if (failureCount > 0) {
    printResult("WARNING", `Auth lifecycle audit smoke finished with ${failureCount} failing checks`);
    process.exit(1);
  }
  if (warningCount > 0) {
    printResult("CHECK", `Auth lifecycle audit smoke finished with ${warningCount} warning/check items`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

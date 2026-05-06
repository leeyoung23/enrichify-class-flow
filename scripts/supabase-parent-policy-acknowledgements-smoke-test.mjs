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
    { listMyPolicyAcknowledgements, listParentPolicyAcknowledgementsForStudent },
    { createMyPolicyAcknowledgement },
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
  const supervisorUser = {
    label: "Branch Supervisor",
    email: process.env.RLS_TEST_SUPERVISOR_EMAIL || "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
  };
  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  let parentProfileId = null;
  let parentStudentId = null;
  const policyKey = "parent_portal_terms_privacy";
  const policyVersion = "v1";

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) process.exit(1);

  const parentAuth = await supabase.auth.getUser();
  parentProfileId = parentAuth?.data?.user?.id || null;
  if (!parentProfileId) {
    printResult("WARNING", "Parent: failed to resolve authenticated profile id");
    failureCount += 1;
  }

  const parentProfileRead = await supabase
    .from("profiles")
    .select("id,linked_student_id")
    .eq("id", parentProfileId)
    .maybeSingle();
  if (parentProfileRead.error || !parentProfileRead.data?.id) {
    printResult("WARNING", `Parent: failed to load profile (${parentProfileRead.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    parentStudentId = parentProfileRead.data.linked_student_id || null;
  }

  const createAck = await createMyPolicyAcknowledgement({
    policyKey,
    policyVersion,
    acknowledgementSource: "parent_portal_first_login",
    metadata: { ui_version: "v1" },
  });
  if (createAck.error || !createAck.data?.id) {
    const msg = createAck.error?.message || "unknown";
    if (msg.toLowerCase().includes("parent_policy_acknowledgements")) {
      printResult("WARNING", "Parent: policy acknowledgement table not found. Apply SQL 041 before running this smoke.");
    } else {
      printResult("WARNING", `Parent: create acknowledgement failed (${msg})`);
    }
    failureCount += 1;
  } else {
    printResult("PASS", "Parent: created/loaded own parent_portal_terms_privacy acknowledgement");
  }

  const duplicateAck = await createMyPolicyAcknowledgement({
    policyKey,
    policyVersion,
    acknowledgementSource: "parent_portal_first_login",
    metadata: { ui_version: "v1" },
  });
  if (duplicateAck.error || !duplicateAck.data?.id) {
    printResult("WARNING", `Parent: duplicate acknowledgement handling failed (${duplicateAck.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    printResult("PASS", "Parent: duplicate acknowledgement returned existing/safe result");
  }

  const listMine = await listMyPolicyAcknowledgements({ policyKey, policyVersion, limit: 20 });
  if (listMine.error) {
    printResult("WARNING", `Parent: list own acknowledgements failed (${listMine.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    const rows = Array.isArray(listMine.data) ? listMine.data : [];
    const mine = rows.find((row) => row?.policy_key === policyKey && row?.policy_version === policyVersion);
    if (!mine) {
      printResult("WARNING", "Parent: expected own acknowledgement row not found");
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: can read own acknowledgement row");
    }
  }

  if (parentProfileId) {
    const forbiddenInsert = await supabase
      .from("parent_policy_acknowledgements")
      .insert({
        parent_profile_id: "11111111-1111-1111-1111-111111111111",
        policy_key: policyKey,
        policy_version: policyVersion,
        acknowledgement_source: "parent_portal_first_login",
        metadata: { ui_version: "v1" },
      })
      .select("id")
      .maybeSingle();
    if (forbiddenInsert.error || !forbiddenInsert.data?.id) {
      printResult("PASS", `Parent: cannot create acknowledgement for another profile (${forbiddenInsert.error?.message || "blocked"})`);
    } else {
      printResult("WARNING", "Parent: unexpectedly created acknowledgement for another profile");
      failureCount += 1;
    }
  }

  await signOut();

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Student: unavailable, acknowledgement access checks skipped");
  } else {
    const studentRead = await supabase
      .from("parent_policy_acknowledgements")
      .select("id")
      .limit(1);
    if (studentRead.error || (Array.isArray(studentRead.data) && studentRead.data.length === 0)) {
      printResult("PASS", "Student: read blocked/empty as expected");
    } else {
      printResult("WARNING", "Student: unexpectedly read parent acknowledgement rows");
      failureCount += 1;
    }

    const studentWrite = await createMyPolicyAcknowledgement({
      policyKey,
      policyVersion,
      acknowledgementSource: "parent_portal_first_login",
      metadata: { ui_version: "v1" },
    });
    if (studentWrite.error || !studentWrite.data) {
      printResult("PASS", `Student: write blocked (${studentWrite.error?.message || "unknown"})`);
    } else {
      printResult("WARNING", "Student: unexpectedly created parent acknowledgement");
      failureCount += 1;
    }
  }
  await signOut();

  const hqSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) {
    failureCount += 1;
    printResult("WARNING", "HQ Admin: unable to sign in for read check");
  } else if (!parentProfileId) {
    warningCount += 1;
    printResult("CHECK", "HQ Admin: read check skipped (parent profile id missing)");
  } else {
    const hqRead = await supabase
      .from("parent_policy_acknowledgements")
      .select("id,parent_profile_id,policy_key,policy_version")
      .eq("parent_profile_id", parentProfileId)
      .eq("policy_key", policyKey)
      .eq("policy_version", policyVersion)
      .limit(1)
      .maybeSingle();
    if (hqRead.error || !hqRead.data?.id) {
      printResult("WARNING", `HQ Admin: failed to read parent acknowledgement (${hqRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "HQ Admin: can read parent acknowledgement");
    }
  }
  await signOut();

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Branch Supervisor: unavailable, branch-scope read skipped");
  } else if (!parentStudentId) {
    warningCount += 1;
    printResult("CHECK", "Branch Supervisor: read check skipped (parent student fixture missing)");
  } else {
    const supervisorRead = await listParentPolicyAcknowledgementsForStudent({
      studentId: parentStudentId,
      policyKey,
      policyVersion,
      limit: 20,
    });
    if (supervisorRead.error) {
      warningCount += 1;
      printResult("CHECK", `Branch Supervisor: read check skipped/blocked (${supervisorRead.error?.message || "unknown"})`);
    } else if (Array.isArray(supervisorRead.data) && supervisorRead.data.length > 0) {
      printResult("PASS", "Branch Supervisor: branch-linked acknowledgement visible (read-only)");
    } else {
      warningCount += 1;
      printResult("CHECK", "Branch Supervisor: no visible branch-linked acknowledgement row");
    }
  }
  await signOut();

  printResult("PASS", "No email/Gmail sending occurs in this smoke.");
  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning/check item(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Parent policy acknowledgement smoke crashed:", err?.message || err);
  process.exit(1);
});

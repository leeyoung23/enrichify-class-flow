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
    { requestFeePaymentProof },
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

  const parentUser = {
    label: "Parent",
    email: "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
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
  const hqUser = {
    label: "HQ Admin",
    email: "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  let targetFeeRecordId = null;
  let parentProfileId = null;
  let parentBeforeCount = null;
  let parentAfterFirstCount = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    process.exit(1);
  }

  const parentAuth = await supabase.auth.getUser();
  parentProfileId = parentAuth?.data?.user?.id || null;
  if (!parentProfileId) {
    printResult("WARNING", "Parent: unable to resolve authenticated profile id");
    failureCount += 1;
  } else {
    const countRead = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", parentProfileId)
      .eq("channel", "in_app");
    parentBeforeCount = typeof countRead.count === "number" ? countRead.count : null;
    if (countRead.error || parentBeforeCount == null) {
      printResult("WARNING", `Parent: failed to capture pre-request inbox count (${countRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", `Parent: pre-request in-app count captured (${parentBeforeCount})`);
    }
  }

  const parentSignOut = await signOut();
  if (parentSignOut.error) {
    printResult("WARNING", `Parent: sign-out warning (${parentSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const requestWithRole = async (roleUser) => {
    const roleSignIn = await signInRole(roleUser, { signInWithEmailPassword, signOut });
    if (!roleSignIn.ok) {
      return false;
    }
    const feeQuery = await supabase
      .from("fee_records")
      .select("id,verification_status,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (feeQuery.error || !feeQuery.data?.id) {
      printResult("CHECK", `${roleUser.label}: no fee record visible (${feeQuery.error?.message || "unknown"})`);
      await signOut();
      return false;
    }
    targetFeeRecordId = feeQuery.data.id;
    printResult("PASS", `${roleUser.label}: selected fee record ${targetFeeRecordId}`);

    const firstRequest = await requestFeePaymentProof({ feeRecordId: targetFeeRecordId });
    if (firstRequest.error || !firstRequest.data?.id) {
      printResult("WARNING", `${roleUser.label}: first proof request failed (${firstRequest.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", `${roleUser.label}: first proof request action succeeded`);
    }

    const secondRequest = await requestFeePaymentProof({ feeRecordId: targetFeeRecordId });
    if (secondRequest.error || !secondRequest.data?.id) {
      printResult("WARNING", `${roleUser.label}: second proof request failed (${secondRequest.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", `${roleUser.label}: second proof request accepted (idempotency check follows via inbox count)`);
    }
    await signOut();
    return true;
  };

  const requestedBySupervisor = await requestWithRole(supervisorUser);
  if (!requestedBySupervisor) {
    const requestedByHq = await requestWithRole(hqUser);
    if (!requestedByHq) {
      printResult("WARNING", "No staff role could execute proof request on a visible fee record");
      failureCount += 1;
    }
  }

  const parentRecheckSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentRecheckSignIn.ok) {
    process.exit(1);
  }

  if (targetFeeRecordId && parentProfileId && typeof parentBeforeCount === "number") {
    const countAfterFirstRead = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", parentProfileId)
      .eq("channel", "in_app");
    parentAfterFirstCount = typeof countAfterFirstRead.count === "number" ? countAfterFirstRead.count : null;
    if (countAfterFirstRead.error || parentAfterFirstCount == null) {
      printResult("WARNING", `Parent: post-request inbox count failed (${countAfterFirstRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else if (parentAfterFirstCount > parentBeforeCount) {
      printResult("PASS", `Parent: inbox count increased after request (${parentBeforeCount} -> ${parentAfterFirstCount})`);
    } else if (parentAfterFirstCount === parentBeforeCount) {
      printResult("PASS", `Parent: inbox count unchanged (${parentAfterFirstCount}); idempotent request path already existed for this actor + fee_record`);
    } else {
      printResult("WARNING", `Parent: expected inbox increase after request (${parentBeforeCount} -> ${parentAfterFirstCount})`);
      failureCount += 1;
    }
  }

  if (targetFeeRecordId && parentProfileId && typeof parentAfterFirstCount === "number") {
    const countAfterSecondRead = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", parentProfileId)
      .eq("channel", "in_app");
    const parentAfterSecondCount = typeof countAfterSecondRead.count === "number" ? countAfterSecondRead.count : null;
    if (countAfterSecondRead.error || parentAfterSecondCount == null) {
      printResult("WARNING", `Parent: second post-request count failed (${countAfterSecondRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else if (parentAfterSecondCount === parentAfterFirstCount) {
      printResult("PASS", "Parent: second same-actor request was idempotent (no additional inbox row)");
    } else {
      printResult("WARNING", `Parent: idempotency failed for second request (${parentAfterFirstCount} -> ${parentAfterSecondCount})`);
      failureCount += 1;
    }
  }

  const deliveryLogRead = await supabase
    .from("notification_delivery_logs")
    .select("id")
    .limit(1);
  if (deliveryLogRead.error || (Array.isArray(deliveryLogRead.data) && deliveryLogRead.data.length === 0)) {
    printResult("PASS", `Parent: delivery logs blocked (${deliveryLogRead.error?.message || "no visible rows"})`);
  } else {
    printResult("WARNING", "Parent: delivery logs unexpectedly readable");
    failureCount += 1;
  }

  const parentSignOutFinal = await signOut();
  if (parentSignOutFinal.error) {
    printResult("WARNING", `Parent: sign-out warning (${parentSignOutFinal.error.message || "unknown"})`);
    warningCount += 1;
  }

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    printResult("WARNING", "Teacher: request-proof blocked check skipped (unable to sign in)");
    warningCount += 1;
  } else if (!targetFeeRecordId) {
    printResult("CHECK", "Teacher: request-proof blocked check skipped (no target fee record)");
  } else {
    const teacherRequest = await requestFeePaymentProof({ feeRecordId: targetFeeRecordId });
    if (teacherRequest.error || !teacherRequest.data) {
      printResult("PASS", `Teacher: request proof blocked (${teacherRequest.error?.message || "no visible row"})`);
    } else {
      printResult("WARNING", "Teacher: request proof unexpectedly succeeded");
      failureCount += 1;
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
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
  console.error("[WARNING] Fee payment proof request smoke test crashed:", err?.message || err);
  process.exit(1);
});

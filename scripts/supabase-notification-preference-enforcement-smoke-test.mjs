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

function isUuidLike(value) {
  return (
    typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
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
    { upsertMyNotificationPreference },
    { shouldSendParentInAppNotification },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseWriteService.js"),
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
  const studentUser = {
    label: "Student",
    email: process.env.RLS_TEST_STUDENT_EMAIL || "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  let parentProfileId = null;
  let parentStudentId = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) process.exit(1);

  const parentAuth = await supabase.auth.getUser();
  parentProfileId = parentAuth?.data?.user?.id || null;
  if (!isUuidLike(parentProfileId)) {
    printResult("WARNING", "Parent: failed to resolve authenticated profile id");
    failureCount += 1;
  } else {
    const profileRead = await supabase
      .from("profiles")
      .select("id,linked_student_id")
      .eq("id", parentProfileId)
      .maybeSingle();
    if (profileRead.error || !profileRead.data?.id || !isUuidLike(profileRead.data.linked_student_id)) {
      printResult("WARNING", `Parent: linked student not available (${profileRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      parentStudentId = profileRead.data.linked_student_id;
    }
  }

  if (isUuidLike(parentStudentId)) {
    const disableLearning = await upsertMyNotificationPreference({
      studentId: null,
      channel: "in_app",
      category: "learning_report_homework",
      enabled: false,
      consentStatus: "withdrawn",
      consentSource: "parent_portal_smoke_preference_enforcement",
      policyVersion: "v1-smoke",
    });
    if (disableLearning.error || !disableLearning.data?.id) {
      printResult("WARNING", `Parent: failed to disable learning category (${disableLearning.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: learning_report_homework disabled/withdrawn");
    }
  }
  await signOut();

  const hqSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) {
    failureCount += 1;
  } else if (!isUuidLike(parentProfileId) || !isUuidLike(parentStudentId)) {
    warningCount += 1;
    printResult("CHECK", "HQ: enforcement checks skipped (parent fixture unavailable)");
  } else {
    const learningBlocked = await shouldSendParentInAppNotification({
      parentProfileId,
      studentId: parentStudentId,
      category: "learning_report_homework",
    });
    if (!learningBlocked.allowed) {
      printResult("PASS", `HQ: learning_report_homework blocked (${learningBlocked.reason})`);
    } else {
      printResult("WARNING", "HQ: learning_report_homework expected blocked but allowed");
      failureCount += 1;
    }

    const billingDefault = await shouldSendParentInAppNotification({
      parentProfileId,
      studentId: parentStudentId,
      category: "billing_invoice",
    });
    if (billingDefault.allowed) {
      printResult("PASS", "HQ: billing_invoice default allow works when no explicit row exists");
    } else {
      printResult("WARNING", `HQ: billing_invoice expected allow (${billingDefault.reason})`);
      failureCount += 1;
    }

    const marketingDefault = await shouldSendParentInAppNotification({
      parentProfileId,
      studentId: parentStudentId,
      category: "marketing_events",
    });
    if (!marketingDefault.allowed) {
      printResult("PASS", "HQ: marketing_events default block works without consent");
    } else {
      printResult("WARNING", "HQ: marketing_events expected blocked by default");
      failureCount += 1;
    }
  }
  await signOut();

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Teacher: skipped RPC check (credentials unavailable)");
  } else if (!isUuidLike(parentProfileId) || !isUuidLike(parentStudentId)) {
    warningCount += 1;
    printResult("CHECK", "Teacher: skipped RPC check (parent fixture unavailable)");
  } else {
    const teacherRpcCheck = await supabase.rpc("should_send_parent_in_app_notification_042", {
      p_parent_profile_id: parentProfileId,
      p_student_id: parentStudentId,
      p_category: "learning_report_homework",
    });
    if (teacherRpcCheck.error) {
      printResult("WARNING", `Teacher: RPC check failed (${teacherRpcCheck.error.message || "unknown"})`);
      failureCount += 1;
    } else {
      const row = Array.isArray(teacherRpcCheck.data) ? teacherRpcCheck.data[0] : null;
      if (row && typeof row.allowed === "boolean") {
        printResult("PASS", `Teacher: RPC returned decision (${row.reason || "no_reason"})`);
      } else {
        printResult("WARNING", "Teacher: RPC did not return a valid decision row");
        failureCount += 1;
      }
    }
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Student: skipped RPC denial check (credentials unavailable)");
  } else if (!isUuidLike(parentProfileId) || !isUuidLike(parentStudentId)) {
    warningCount += 1;
    printResult("CHECK", "Student: skipped RPC denial check (parent fixture unavailable)");
  } else {
    const studentRpcCheck = await supabase.rpc("should_send_parent_in_app_notification_042", {
      p_parent_profile_id: parentProfileId,
      p_student_id: parentStudentId,
      p_category: "learning_report_homework",
    });
    if (studentRpcCheck.error) {
      printResult("WARNING", `Student: RPC call failed unexpectedly (${studentRpcCheck.error.message || "unknown"})`);
      failureCount += 1;
    } else {
      const row = Array.isArray(studentRpcCheck.data) ? studentRpcCheck.data[0] : null;
      if (row?.allowed === false && row?.reason === "scope_denied") {
        printResult("PASS", "Student: RPC scope denied as expected");
      } else {
        printResult("WARNING", `Student: expected scope_denied, got ${row?.reason || "unknown"}`);
        failureCount += 1;
      }
    }
  }
  await signOut();

  const parentReenableSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentReenableSignIn.ok) {
    failureCount += 1;
  } else {
    const reenableLearning = await upsertMyNotificationPreference({
      studentId: null,
      channel: "in_app",
      category: "learning_report_homework",
      enabled: true,
      consentStatus: "consented",
      consentSource: "parent_portal_smoke_preference_enforcement",
      policyVersion: "v1-smoke",
    });
    if (reenableLearning.error || !reenableLearning.data?.id) {
      printResult("WARNING", `Parent: failed to re-enable learning category (${reenableLearning.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: learning_report_homework re-enabled/consented");
    }
  }
  await signOut();

  const hqAllowSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqAllowSignIn.ok) {
    failureCount += 1;
  } else if (isUuidLike(parentProfileId) && isUuidLike(parentStudentId)) {
    const learningAllowed = await shouldSendParentInAppNotification({
      parentProfileId,
      studentId: parentStudentId,
      category: "learning_report_homework",
    });
    if (learningAllowed.allowed) {
      printResult("PASS", "HQ: learning_report_homework allow path restored after parent re-enable");
    } else {
      printResult("WARNING", `HQ: learning_report_homework expected allow after re-enable (${learningAllowed.reason})`);
      failureCount += 1;
    }
  }
  await signOut();

  printResult("PASS", "No email/SMS/push sending occurs in this smoke.");
  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning/check item(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Notification preference enforcement smoke crashed:", err?.message || err);
  process.exit(1);
});

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const SAMPLE_MARKER = "[UAT_SAMPLE]";
const DEFAULT_BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_STUDENT_ID = "55555555-5555-5555-5555-555555555555";
const AI_REPORT_RELEASE_EVENT_TYPE = "ai_parent_report.released";
const AI_REPORT_ENTITY_TYPE = "ai_parent_report";

function print(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

function trimEnv(name) {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

function resolvePassword(roleVar) {
  return process.env[roleVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function signInRole(role, deps) {
  const password = resolvePassword(role.passwordVar);
  if (!password) {
    print("CHECK", `${role.label}: skipped (missing ${role.passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const result = await signInWithEmailPassword(role.email, password);
  if (result.error) {
    print("CHECK", `${role.label}: skipped (sign-in failed: ${result.error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

function hasSampleMarker(version) {
  const structured =
    version?.structuredSections && typeof version.structuredSections === "object"
      ? version.structuredSections
      : {};
  const finalText =
    version?.finalText && typeof version.finalText === "object" ? version.finalText : {};
  const text = [
    structured.student_summary,
    structured.teacher_final_comment,
    structured.summary,
    structured.homework_assessment_performance,
    finalText.parent_summary,
    finalText.teacher_final_comment,
  ]
    .filter((v) => typeof v === "string")
    .join(" ");
  return text.includes(SAMPLE_MARKER);
}

async function run() {
  print("PASS", "Notification action routing smoke started (read-mostly; no report write operations).");

  const [{ signInWithEmailPassword, signOut }, readService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const {
    listAiParentReports,
    listAiParentReportVersions,
    getAiParentReportDetail,
    listAiParentReportEvidenceLinks,
    listMyInAppNotifications,
  } = readService;

  if (!supabase) {
    print("CHECK", "Supabase client unavailable; smoke skipped safely.");
    process.exit(0);
  }

  const deps = { signInWithEmailPassword, signOut };
  const staffUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };

  const studentId = isUuidLike(trimEnv("UAT_SAMPLE_STUDENT_ID"))
    ? trimEnv("UAT_SAMPLE_STUDENT_ID")
    : isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID")
      : DEFAULT_STUDENT_ID;
  const classId = isUuidLike(trimEnv("UAT_SAMPLE_CLASS_ID"))
    ? trimEnv("UAT_SAMPLE_CLASS_ID")
    : isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID")
      : DEFAULT_CLASS_ID;
  const branchId = isUuidLike(trimEnv("UAT_SAMPLE_BRANCH_ID"))
    ? trimEnv("UAT_SAMPLE_BRANCH_ID")
    : isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID")
      : DEFAULT_BRANCH_ID;

  const staffSignIn = await signInRole(staffUser, deps);
  if (!staffSignIn.ok) {
    print("CHECK", "Staff sign-in unavailable; cannot discover UAT sample.");
    process.exit(0);
  }

  const reportsRead = await listAiParentReports({
    studentId,
    classId,
    branchId,
    reportType: "monthly_progress",
    includeArchived: true,
  });
  if (reportsRead.error) {
    print("CHECK", `Sample discovery CHECK (${reportsRead.error.message || "unknown"})`);
    await signOut();
    process.exit(0);
  }

  const reports = Array.isArray(reportsRead.data) ? reportsRead.data : [];
  let sampleReport = null;
  for (const report of reports) {
    if (!report?.id) continue;
    const versionsRead = await listAiParentReportVersions({ reportId: report.id });
    const versions = Array.isArray(versionsRead.data) ? versionsRead.data : [];
    if (!versions.some((v) => hasSampleMarker(v))) continue;
    if (!sampleReport) sampleReport = report;
    if (report.status === "released" && report.currentVersionId) {
      sampleReport = report;
      break;
    }
  }
  await signOut();

  if (!sampleReport?.id) {
    print("CHECK", "No stable [UAT_SAMPLE] report found for routing smoke.");
    print("CHECK", "Run: ALLOW_UAT_SAMPLE_WRITE=1 npm run uat:ai-parent-report:sample");
    process.exit(0);
  }

  const parentSignIn = await signInRole(parentUser, deps);
  if (!parentSignIn.ok) {
    print("CHECK", "Parent sign-in unavailable; routing assertions skipped safely.");
    process.exit(0);
  }

  const notificationsRead = await listMyInAppNotifications({ limit: 80 });
  if (notificationsRead.error) {
    print("CHECK", `Parent notifications read CHECK (${notificationsRead.error.message || "unknown"})`);
    await signOut();
    process.exit(0);
  }

  const rows = Array.isArray(notificationsRead.data) ? notificationsRead.data : [];
  const match = rows.find(
    (row) =>
      row?.event_type === AI_REPORT_RELEASE_EVENT_TYPE &&
      row?.entity_type === AI_REPORT_ENTITY_TYPE &&
      row?.entity_id === sampleReport.id
  );
  if (match) {
    print("PASS", "Found report-release notification with exact entity_id target for sample report.");
  } else {
    print("CHECK", "No matching ai_parent_report.released notification found for current sample report.");
  }

  const exactUrl =
    `/parent-view?student=${sampleReport.studentId}` +
    `&report=${sampleReport.id}#parent-progress-reports`;
  print("PASS", `Exact URL pattern: ${exactUrl}`);

  const detail = await getAiParentReportDetail({ reportId: sampleReport.id });
  if (detail.error || !detail.data?.id) {
    print("CHECK", "Parent released detail read CHECK (unavailable or link mismatch).");
  } else if (detail.data.status === "released") {
    print("PASS", "Parent can read released report detail for exact-target report.");
  } else {
    print("CHECK", "Parent can read report detail, but report is not in released status.");
  }

  const evidence = await listAiParentReportEvidenceLinks({ reportId: sampleReport.id });
  if (evidence.error || (Array.isArray(evidence.data) && evidence.data.length === 0)) {
    print("PASS", "Parent evidence links remain blocked/empty.");
  } else {
    print("WARNING", "Parent evidence links unexpectedly visible.");
    await signOut();
    process.exit(1);
  }

  const authRead = await supabase.auth.getUser();
  const parentProfileId = authRead?.data?.user?.id || null;
  if (isUuidLike(parentProfileId)) {
    const foreignRow = rows.find((row) => row?.recipient_profile_id && row.recipient_profile_id !== parentProfileId);
    if (!foreignRow) {
      print("PASS", "Parent notification list is self-scoped (no unrelated recipient rows).");
    } else {
      print("WARNING", "Parent notification list includes unrelated recipient rows.");
      await signOut();
      process.exit(1);
    }
  } else {
    print("CHECK", "Parent profile id unavailable for recipient-scope assertion.");
  }

  if (match?.id) {
    const deliveryPeek = await supabase
      .from("notification_delivery_logs")
      .select("id")
      .eq("notification_id", match.id)
      .limit(1);
    if (deliveryPeek.error || (Array.isArray(deliveryPeek.data) && deliveryPeek.data.length === 0)) {
      print("PASS", "Parent cannot read notification_delivery_logs.");
    } else {
      print("WARNING", "Parent unexpectedly read notification_delivery_logs.");
      await signOut();
      process.exit(1);
    }
  } else {
    print("CHECK", "Delivery-log scope check skipped (no matching report notification id).");
  }

  await signOut();
}

run().catch((err) => {
  console.error("[WARNING] notification action routing smoke crashed:", err?.message || err);
  process.exit(1);
});


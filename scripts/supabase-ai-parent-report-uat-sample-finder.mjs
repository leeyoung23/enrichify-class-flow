import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const SAMPLE_MARKER = "[UAT_SAMPLE]";
const DEFAULT_BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_STUDENT_ID = "55555555-5555-5555-5555-555555555555";

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

function formatSuggestedScreenshotNames({ reportId, studentId }) {
  const rid = String(reportId || "").slice(0, 8) || "report";
  const sid = String(studentId || "").slice(0, 8) || "student";
  return [
    `uat-ai-report-staff-source-evidence-${sid}-${rid}.png`,
    `uat-ai-report-staff-lifecycle-released-${sid}-${rid}.png`,
    `uat-ai-report-parent-progress-list-${sid}-${rid}.png`,
    `uat-ai-report-parent-report-detail-${sid}-${rid}.png`,
    `uat-ai-report-parent-printable-layout-${sid}-${rid}.png`,
  ];
}

async function run() {
  print(
    "PASS",
    "Read-only UAT sample finder started. No create/update/release/archive/delete operations are performed."
  );

  const [{ signInWithEmailPassword, signOut }, readService] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
  ]);

  const {
    listAiParentReports,
    listAiParentReportVersions,
    getAiParentReportCurrentVersion,
    getAiParentReportDetail,
    listAiParentReportEvidenceLinks,
  } = readService;

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
    print("CHECK", "Staff sign-in unavailable; finder exiting safely.");
    process.exit(0);
  }

  print(
    "CHECK",
    `Finder scope: student=${studentId.slice(0, 8)}... class=${classId.slice(0, 8)}... branch=${branchId.slice(0, 8)}...`
  );

  const list = await listAiParentReports({
    studentId,
    classId,
    branchId,
    reportType: "monthly_progress",
    includeArchived: true,
  });
  if (list.error) {
    print("CHECK", `Report list read CHECK (${list.error.message || "unknown"})`);
    await signOut();
    process.exit(0);
  }

  const reports = Array.isArray(list.data) ? list.data : [];
  const matched = [];

  for (const report of reports) {
    if (!report?.id) continue;
    const [current, versions] = await Promise.all([
      getAiParentReportCurrentVersion({ reportId: report.id }),
      listAiParentReportVersions({ reportId: report.id }),
    ]);
    const currentVersion = current?.data || null;
    const versionRows = Array.isArray(versions?.data) ? versions.data : [];
    const markerInCurrent = currentVersion ? hasSampleMarker(currentVersion) : false;
    const markerInAnyVersion = versionRows.some((v) => hasSampleMarker(v));
    if (!markerInCurrent && !markerInAnyVersion) continue;

    matched.push({
      report,
      currentVersion,
      markerInCurrent,
      markerInAnyVersion,
      latestVersionId: versionRows[0]?.id || null,
      latestVersionNumber: versionRows[0]?.versionNumber ?? null,
    });
  }

  if (matched.length === 0) {
    print("CHECK", "No UAT sample marker found for this scope.");
    print(
      "CHECK",
      "Create one manually with: ALLOW_UAT_SAMPLE_WRITE=1 npm run uat:ai-parent-report:sample"
    );
    await signOut();
    process.exit(0);
  }

  matched.sort((a, b) => {
    const ta = Date.parse(a.report?.updatedAt || a.report?.createdAt || 0);
    const tb = Date.parse(b.report?.updatedAt || b.report?.createdAt || 0);
    return tb - ta;
  });

  const preferred =
    matched.find((m) => m.report?.status === "released" && m.markerInCurrent) ||
    matched.find((m) => m.report?.status === "released") ||
    matched[0];

  print("PASS", `Found ${matched.length} sample-marked report(s).`);
  for (const [idx, item] of matched.entries()) {
    const r = item.report;
    print(
      "PASS",
      `sample[${idx + 1}] reportId=${r.id} studentId=${r.studentId} classId=${r.classId || "none"} branchId=${r.branchId} status=${r.status} currentVersionId=${r.currentVersionId || "none"} markerInCurrent=${item.markerInCurrent ? "yes" : "no"}`
    );
  }

  const pr = preferred.report;
  const parentViewUrl = `/parent-view?student=${pr.studentId}#parent-progress-reports`;
  print("PASS", "Recommended screenshot sample:");
  print(
    "PASS",
    `reportId=${pr.id} studentId=${pr.studentId} classId=${pr.classId || "none"} branchId=${pr.branchId} status=${pr.status} currentVersionId=${pr.currentVersionId || "none"}`
  );
  print(
    "PASS",
    `releasedCurrent=${pr.status === "released" && Boolean(pr.currentVersionId) ? "yes" : "no"}`
  );
  print("PASS", `ParentView URL: ${parentViewUrl}`);

  const suggested = formatSuggestedScreenshotNames({
    reportId: pr.id,
    studentId: pr.studentId,
  });
  for (const name of suggested) {
    print("PASS", `suggested_screenshot=${name}`);
  }

  await signOut();

  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const detail = await getAiParentReportDetail({ reportId: pr.id });
    if (detail.error || !detail.data?.id) {
      print("CHECK", "Parent visibility CHECK (unavailable or parent not linked to fixture student).");
    } else if (detail.data.status === "released") {
      print("PASS", "Parent can read the released sample report detail.");
    } else {
      print("CHECK", "Parent found report detail but status is not released.");
    }

    const ev = await listAiParentReportEvidenceLinks({ reportId: pr.id });
    if (ev.error || (Array.isArray(ev.data) && ev.data.length === 0)) {
      print("PASS", "Parent evidence links blocked/empty as expected.");
    } else {
      print("CHECK", "Parent evidence links unexpectedly visible.");
    }
  } else {
    print("CHECK", "Parent verification skipped (credentials unavailable).");
  }
  await signOut();
}

run().catch((err) => {
  console.error("[WARNING] UAT sample finder crashed:", err?.message || err);
  process.exit(1);
});


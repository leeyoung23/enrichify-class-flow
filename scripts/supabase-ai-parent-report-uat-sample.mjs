import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const ALLOW_WRITE = String(process.env.ALLOW_UAT_SAMPLE_WRITE || "").trim() === "1";
const ALLOW_ARCHIVE_OLD =
  String(process.env.ALLOW_UAT_SAMPLE_ARCHIVE_OLD || "").trim() === "1";

const DEFAULT_BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_STUDENT_ID = "55555555-5555-5555-5555-555555555555";

const SAMPLE_REPORT_TYPE = "monthly_progress";
const SAMPLE_PERIOD_START = "2026-04-01";
const SAMPLE_PERIOD_END = "2026-04-30";
const SAMPLE_MARKER = "[UAT_SAMPLE] UAT Monthly Learning Report Sample";

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

function print(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function sampleSections({ studentLabel }) {
  return {
    student_summary: `${SAMPLE_MARKER}\n${studentLabel} showed steady effort and confidence growth throughout the month.`,
    attendance_summary:
      "Attendance remained consistent for most sessions, with punctual arrival in the majority of classes.",
    lesson_progression:
      "Lesson participation improved during guided activities, with clearer understanding of current class goals.",
    homework_completion:
      "Homework completion was generally on track, with most assigned tasks submitted during the report period.",
    homework_assessment_performance:
      "Released homework feedback highlights improving response quality and stronger follow-through on next-step guidance.",
    strengths:
      "Strengths this month include classroom focus, willingness to ask for clarification, and positive peer collaboration.",
    areas_for_improvement:
      "Main area to improve is consistency when applying feedback independently across similar task types.",
    next_recommendations:
      "Continue short weekly review cycles and reinforce one priority goal at a time before adding new targets.",
    parent_support_suggestions:
      "At home, keep a simple routine: 10-15 minutes of recap after class days and one check-in before submission deadlines.",
    teacher_final_comment:
      "This is a manually curated UAT sample report for workflow verification. It reflects release-gated content only.",
  };
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
  const text = [
    structured.student_summary,
    structured.teacher_final_comment,
    structured.summary,
  ]
    .filter((v) => typeof v === "string")
    .join(" ");
  return text.includes(SAMPLE_MARKER);
}

async function findExistingSampleReport({
  listAiParentReports,
  getAiParentReportCurrentVersion,
  studentId,
  classId,
  branchId,
}) {
  const list = await listAiParentReports({
    studentId,
    classId,
    branchId,
    reportType: SAMPLE_REPORT_TYPE,
    includeArchived: true,
  });
  if (list.error || !Array.isArray(list.data)) return { report: null, error: list.error || null };

  const nonArchived = list.data.filter((row) => row?.status !== "archived");
  for (const row of nonArchived) {
    if (!row?.id) continue;
    const cur = await getAiParentReportCurrentVersion({ reportId: row.id });
    if (!cur.error && cur.data && hasSampleMarker(cur.data)) {
      return { report: row, error: null };
    }
  }
  return { report: null, error: null };
}

async function run() {
  print("WARNING", "Manual-only script: writes a persistent UAT/demo AI parent report sample.");
  print("WARNING", "This script is gated and MUST NOT run in normal CI/build/test paths.");
  if (!ALLOW_WRITE) {
    print(
      "SKIP",
      "Refusing to run because ALLOW_UAT_SAMPLE_WRITE is not set to 1. No writes performed."
    );
    process.exit(0);
  }
  if (ALLOW_ARCHIVE_OLD) {
    print(
      "WARNING",
      "ALLOW_UAT_SAMPLE_ARCHIVE_OLD=1 enabled: old sample reports may be archived before creating a new one."
    );
  } else {
    print("CHECK", "Reuse-first mode active: existing sample is reused and no archive occurs by default.");
  }

  const [{ signInWithEmailPassword, signOut }, readService, writeService] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
  ]);

  const {
    listAiParentReports,
    getAiParentReportCurrentVersion,
    getAiParentReportDetail,
    listAiParentReportEvidenceLinks,
  } = readService;
  const {
    createAiParentReportDraft,
    createAiParentReportVersion,
    submitAiParentReportForReview,
    approveAiParentReport,
    releaseAiParentReport,
    archiveAiParentReport,
  } = writeService;

  const deps = { signInWithEmailPassword, signOut };
  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };

  const branchId = isUuidLike(trimEnv("UAT_SAMPLE_BRANCH_ID"))
    ? trimEnv("UAT_SAMPLE_BRANCH_ID")
    : isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID")
      : DEFAULT_BRANCH_ID;
  const classId = isUuidLike(trimEnv("UAT_SAMPLE_CLASS_ID"))
    ? trimEnv("UAT_SAMPLE_CLASS_ID")
    : isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID")
      : DEFAULT_CLASS_ID;
  const studentId = isUuidLike(trimEnv("UAT_SAMPLE_STUDENT_ID"))
    ? trimEnv("UAT_SAMPLE_STUDENT_ID")
    : isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID")
      : DEFAULT_STUDENT_ID;

  print(
    "CHECK",
    `fixture student=${studentId.slice(0, 8)}... class=${classId.slice(0, 8)}... branch=${branchId.slice(0, 8)}...`
  );

  const hqSignIn = await signInRole(hqUser, deps);
  if (!hqSignIn.ok) {
    print("CHECK", "HQ sign-in unavailable; script cannot proceed safely.");
    process.exit(0);
  }

  let sampleReportId = null;
  let sampleVersionId = null;
  let reused = false;

  const existing = await findExistingSampleReport({
    listAiParentReports,
    getAiParentReportCurrentVersion,
    studentId,
    classId,
    branchId,
  });

  if (existing.error) {
    print("CHECK", `Existing sample lookup CHECK (${existing.error.message || "unknown"})`);
  }

  if (existing.report?.id && !ALLOW_ARCHIVE_OLD) {
    reused = true;
    sampleReportId = existing.report.id;
    const current = await getAiParentReportCurrentVersion({ reportId: sampleReportId });
    sampleVersionId = current.data?.id || null;
    print("PASS", `Reusing existing UAT sample report (${sampleReportId})`);
  }

  if (existing.report?.id && ALLOW_ARCHIVE_OLD) {
    const arch = await archiveAiParentReport({ reportId: existing.report.id });
    if (arch.error) {
      print("CHECK", `Archive old sample CHECK (${arch.error.message || "unknown"})`);
      await signOut();
      process.exit(1);
    }
    print("PASS", `Archived old sample report (${existing.report.id})`);
  }

  if (!sampleReportId) {
    const create = await createAiParentReportDraft({
      studentId,
      classId,
      branchId,
      reportType: SAMPLE_REPORT_TYPE,
      reportPeriodStart: SAMPLE_PERIOD_START,
      reportPeriodEnd: SAMPLE_PERIOD_END,
    });
    if (create.error || !create.data?.id) {
      print("CHECK", `Create sample draft CHECK (${create.error?.message || "unknown"})`);
      await signOut();
      process.exit(1);
    }
    sampleReportId = create.data.id;
    print("PASS", `Created sample draft report (${sampleReportId})`);

    const version = await createAiParentReportVersion({
      reportId: sampleReportId,
      generationSource: "manual",
      structuredSections: sampleSections({ studentLabel: "Student" }),
      teacherEdits: {
        uat_sample: true,
        marker: SAMPLE_MARKER,
        source_mode: "manual_curated_no_provider",
      },
      finalText: {
        parent_summary:
          "UAT Monthly Learning Report Sample. This released sample is manually curated for workflow and screenshot proof.",
      },
      aiModelLabel: "manual-uat-sample",
    });
    if (version.error || !version.data?.version?.id) {
      print("CHECK", `Create sample version CHECK (${version.error?.message || "unknown"})`);
      await signOut();
      process.exit(1);
    }
    sampleVersionId = version.data.version.id;
    print("PASS", `Created sample version (${sampleVersionId})`);

    const submitted = await submitAiParentReportForReview({ reportId: sampleReportId });
    if (submitted.error) {
      print("CHECK", `Submit sample CHECK (${submitted.error.message || "unknown"})`);
      await signOut();
      process.exit(1);
    }
    print("PASS", "Sample submit_for_review succeeded");

    const approved = await approveAiParentReport({ reportId: sampleReportId });
    if (approved.error) {
      print("CHECK", `Approve sample CHECK (${approved.error.message || "unknown"})`);
      await signOut();
      process.exit(1);
    }
    print("PASS", "Sample approve succeeded");

    const released = await releaseAiParentReport({
      reportId: sampleReportId,
      versionId: sampleVersionId,
    });
    if (released.error) {
      print("CHECK", `Release sample CHECK (${released.error.message || "unknown"})`);
      await signOut();
      process.exit(1);
    }
    print("PASS", "Sample release succeeded");
  }

  await signOut();

  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const parentDetail = await getAiParentReportDetail({ reportId: sampleReportId });
    if (parentDetail.error || !parentDetail.data?.id) {
      print("CHECK", "Parent visibility CHECK (parent fixture unavailable or not linked)");
    } else if (parentDetail.data.status === "released") {
      print("PASS", "Parent can read released sample detail");
    } else {
      print("CHECK", "Parent detail read but status is not released");
    }

    const parentEvidence = await listAiParentReportEvidenceLinks({ reportId: sampleReportId });
    if (parentEvidence.error || (Array.isArray(parentEvidence.data) && parentEvidence.data.length === 0)) {
      print("PASS", "Parent evidence-link read blocked/empty as expected");
    } else {
      print("CHECK", "Parent evidence-link visibility CHECK (unexpected rows visible)");
    }
  } else {
    print("CHECK", "Parent verification skipped (credentials unavailable)");
  }
  await signOut();

  const parentViewUrl = `/parent-view?student=${studentId}#parent-progress-reports`;
  print("PASS", `Sample workflow complete (${reused ? "reused existing sample" : "created new sample"}).`);
  print("PASS", `Open this URL for screenshots: ${parentViewUrl}`);
  print(
    "PASS",
    "No live provider calls used. No archive cleanup executed for the active sample in default reuse-first mode."
  );
}

run().catch((err) => {
  console.error("[WARNING] UAT sample script crashed:", err?.message || err);
  process.exit(1);
});


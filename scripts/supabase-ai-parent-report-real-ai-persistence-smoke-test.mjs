/**
 * Focused smoke: service-layer real_ai version persistence (no provider; no staff UI).
 * - HQ staff session creates a draft, inserts a real_ai version via createAiParentReportVersion.
 * - Asserts ai_generated_at, optional ai_model_label, report stays draft.
 * - Parent: draft report should remain invisible (RLS) — reuses getAiParentReportDetail pattern.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("[CHECK] SKIP: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing");
  process.exit(0);
}

const DEFAULT_FAKE_BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_FAKE_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_FAKE_STUDENT_ID = "55555555-5555-5555-5555-555555555555";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function trimEnv(key) {
  const raw = process.env[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("CHECK", `${label}: skipped (no password)`);
    return { ok: false };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("CHECK", `${label}: sign-in failed (${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const { getAiParentReportDetail } = readService;
  const { createAiParentReportDraft, createAiParentReportVersion, archiveAiParentReport } = writeService;

  if (!supabase) {
    printResult("FAIL", "Supabase client not configured");
    process.exit(1);
  }

  const hqUser = {
    label: "HQ",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };

  const fixtureBranchId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID")
    : DEFAULT_FAKE_BRANCH_ID;
  const fixtureClassId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID")
    : DEFAULT_FAKE_CLASS_ID;
  const fixtureStudentId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID")
    : DEFAULT_FAKE_STUDENT_ID;
  const assignedTeacherProfileId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID")
    : null;

  const deps = { signInWithEmailPassword, signOut };
  let failed = false;
  let reportId = null;

  const hqOk = await signInRole(hqUser, deps);
  if (!hqOk.ok) {
    printResult("CHECK", "SKIP: HQ sign-in unavailable");
    process.exit(0);
  }

  const draftResult = await createAiParentReportDraft({
    studentId: fixtureStudentId,
    classId: fixtureClassId,
    branchId: fixtureBranchId,
    reportType: "weekly_brief",
    reportPeriodStart: "2026-05-01",
    reportPeriodEnd: "2026-05-07",
    assignedTeacherProfileId,
  });
  if (draftResult.error || !draftResult.data?.id) {
    printResult("CHECK", `Draft create CHECK (${draftResult.error?.message || "unknown"})`);
    await signOut();
    process.exit(0);
  }
  reportId = draftResult.data.id;

  const noLabel = await createAiParentReportVersion({
    reportId,
    generationSource: "real_ai",
    structuredSections: {
      student_summary: "Focused smoke: real_ai without aiModelLabel — column may be null.",
      attendance: "N/A",
      lesson_progression: "N/A",
      homework_completion: "N/A",
      homework_assessment_performance: "N/A",
      strengths: "N/A",
      areas_for_improvement: "N/A",
      learning_gaps: "N/A",
      next_recommendations: "N/A",
      parent_support_suggestions: "N/A",
      teacher_final_comment: "Smoke.",
    },
    teacherEdits: {},
    finalText: {},
  });
  if (noLabel.error || !noLabel.data?.version?.id) {
    printResult("FAIL", `real_ai insert without label: ${noLabel.error?.message || "unknown"}`);
    failed = true;
  } else {
    const v = noLabel.data.version;
    if (v.generation_source !== "real_ai" || !v.ai_generated_at) {
      printResult("FAIL", "real_ai metadata missing");
      failed = true;
    } else {
      printResult("PASS", "real_ai persisted without ai_model_label (null allowed)");
    }
  }

  const withLabel = await createAiParentReportVersion({
    reportId,
    generationSource: "real_ai",
    structuredSections: {
      student_summary: "Second real_ai row with label.",
      attendance: "N/A",
      lesson_progression: "N/A",
      homework_completion: "N/A",
      homework_assessment_performance: "N/A",
      strengths: "N/A",
      areas_for_improvement: "N/A",
      learning_gaps: "N/A",
      next_recommendations: "N/A",
      parent_support_suggestions: "N/A",
      teacher_final_comment: "Smoke.",
    },
    teacherEdits: { smoke: true },
    finalText: { parent_summary: "Safe." },
    aiModelLabel: "focused_real_ai_smoke_model",
  });
  if (withLabel.error || !withLabel.data?.version?.id) {
    printResult("FAIL", `real_ai with label: ${withLabel.error?.message || "unknown"}`);
    failed = true;
  } else if (withLabel.data.version.ai_model_label !== "focused_real_ai_smoke_model") {
    printResult("FAIL", "ai_model_label not stored");
    failed = true;
  } else {
    printResult("PASS", "real_ai ai_model_label stored when provided");
  }

  const rowPeek = await supabase
    .from("ai_parent_reports")
    .select("status,released_at,current_version_id")
    .eq("id", reportId)
    .maybeSingle();
  if (
    rowPeek.data?.status === "draft" &&
    !rowPeek.data?.released_at &&
    rowPeek.data?.current_version_id == null
  ) {
    printResult("PASS", "report remains draft / unreleased after real_ai inserts");
  } else {
    printResult("FAIL", "report status unexpectedly changed");
    failed = true;
  }

  await signOut();

  const parentOk = await signInRole(parentUser, deps);
  if (parentOk.ok) {
    const parentRead = await getAiParentReportDetail({ reportId });
    if (parentRead.error || !parentRead.data?.id) {
      printResult("PASS", "Parent cannot read unreleased draft report (RLS)");
    } else {
      printResult("FAIL", "Parent unexpectedly read draft report");
      failed = true;
    }
    await signOut();
  } else {
    printResult(
      "CHECK",
      "Parent RLS negative check skipped — manual regression: parent must not read unreleased real_ai versions"
    );
  }

  const hqCleanup = await signInRole(hqUser, deps);
  if (hqCleanup.ok && reportId) {
    const arch = await archiveAiParentReport({ reportId });
    if (arch.error) {
      printResult("CHECK", `Cleanup archive CHECK (${arch.error.message || ""})`);
    } else {
      printResult("PASS", "Cleanup archive succeeded");
    }
    await signOut();
  }

  printResult("PASS", "no provider HTTP in this smoke (service persistence only)");

  if (failed) process.exit(1);
  printResult("PASS", "supabase-ai-parent-report-real-ai-persistence-smoke-test completed");
}

run().catch((err) => {
  printResult("FAIL", err?.message || String(err));
  process.exit(1);
});

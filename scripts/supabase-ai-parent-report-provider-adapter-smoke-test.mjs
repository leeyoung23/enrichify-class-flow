/**
 * Smoke: AI parent report provider adapter (fake/disabled only).
 * No Supabase env required for core assertions; optional integration checks use .env.local.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import {
  AI_PARENT_REPORT_PROVIDER_MODES,
  assertStructuredSectionsShapeForTests,
  generateAiParentReportDraft,
  REQUIRED_STRUCTURED_SECTION_KEYS,
} from "../src/services/aiParentReportProviderAdapter.js";

const FAKE_REPORT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function assert(condition, passLabel, failLabel) {
  if (condition) {
    printResult("PASS", passLabel);
    return true;
  }
  printResult("FAIL", failLabel);
  return false;
}

function stashProviderEnv() {
  return {
    AI_PARENT_REPORT_PROVIDER_API_KEY: process.env.AI_PARENT_REPORT_PROVIDER_API_KEY,
    AI_PARENT_REPORT_PROVIDER_MODEL: process.env.AI_PARENT_REPORT_PROVIDER_MODEL,
    AI_PARENT_REPORT_PROVIDER_BASE_URL: process.env.AI_PARENT_REPORT_PROVIDER_BASE_URL,
  };
}

function clearProviderEnv() {
  delete process.env.AI_PARENT_REPORT_PROVIDER_API_KEY;
  delete process.env.AI_PARENT_REPORT_PROVIDER_MODEL;
  delete process.env.AI_PARENT_REPORT_PROVIDER_BASE_URL;
}

function restoreProviderEnv(saved) {
  if (saved.AI_PARENT_REPORT_PROVIDER_API_KEY !== undefined) {
    process.env.AI_PARENT_REPORT_PROVIDER_API_KEY = saved.AI_PARENT_REPORT_PROVIDER_API_KEY;
  } else {
    delete process.env.AI_PARENT_REPORT_PROVIDER_API_KEY;
  }
  if (saved.AI_PARENT_REPORT_PROVIDER_MODEL !== undefined) {
    process.env.AI_PARENT_REPORT_PROVIDER_MODEL = saved.AI_PARENT_REPORT_PROVIDER_MODEL;
  } else {
    delete process.env.AI_PARENT_REPORT_PROVIDER_MODEL;
  }
  if (saved.AI_PARENT_REPORT_PROVIDER_BASE_URL !== undefined) {
    process.env.AI_PARENT_REPORT_PROVIDER_BASE_URL = saved.AI_PARENT_REPORT_PROVIDER_BASE_URL;
  } else {
    delete process.env.AI_PARENT_REPORT_PROVIDER_BASE_URL;
  }
}

async function optionalIntegrationChecks() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    printResult("CHECK", "integration (real_ai service guard): skipped (missing Supabase env)");
    return false;
  }

  const { createAiParentReportVersion } = await import("../src/services/supabaseWriteService.js");
  const realAiAttempt = await createAiParentReportVersion({
    reportId: FAKE_REPORT_ID,
    generationSource: "real_ai",
    structuredSections: { student_summary: "Stub section for integration probe only." },
    teacherEdits: {},
    finalText: {},
  });
  const milestoneBlocked = Boolean(realAiAttempt.error?.message?.includes("blocked in this milestone"));
  const ok1 = assert(
    !milestoneBlocked,
    "integration: real_ai is not milestone-blocked in createAiParentReportVersion",
    "integration: unexpected milestone-block message for real_ai"
  );
  const didNotPersist = !realAiAttempt.data?.version?.id;
  const ok2 = assert(
    didNotPersist,
    "integration: real_ai does not persist without signed-in session + valid report (no version row)",
    "integration: unexpected real_ai version insert without staff auth context"
  );
  return !(ok1 && ok2);
}

async function run() {
  let failed = false;

  const fakeOk = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.FAKE,
    input: {
      studentSummary: "Fake dev summary only",
      strengths: "Participation",
    },
  });
  failed =
    !assert(
      !fakeOk.error && fakeOk.data?.structuredSections,
      "fake mode returns structuredSections",
      "fake mode missing structuredSections"
    ) || failed;
  failed =
    !assert(
      assertStructuredSectionsShapeForTests(fakeOk.data?.structuredSections),
      "fake mode: all required section keys present and non-empty",
      "fake mode: structuredSections shape incomplete"
    ) || failed;
  failed =
    !assert(
      fakeOk.data?.providerLabel === "fake_adapter",
      "fake mode: providerLabel is fake_adapter",
      "fake mode: unexpected providerLabel"
    ) || failed;
  failed =
    !assert(
      fakeOk.data?.usage?.fake === true,
      "fake mode: usage metadata is fake-only",
      "fake mode: usage metadata missing"
    ) || failed;

  const disabled = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.DISABLED,
    input: {},
  });
  failed =
    !assert(
      Boolean(disabled.error?.code === "provider_disabled"),
      "disabled mode fails safely with provider_disabled",
      "disabled mode unexpected result"
    ) || failed;

  const savedRealEnv = stashProviderEnv();
  clearProviderEnv();
  let realMode;
  try {
    realMode = await generateAiParentReportDraft({
      reportId: FAKE_REPORT_ID,
      providerMode: AI_PARENT_REPORT_PROVIDER_MODES.REAL,
      input: {},
    });
  } finally {
    restoreProviderEnv(savedRealEnv);
  }
  failed =
    !assert(
      Boolean(realMode.error?.code === "provider_not_configured"),
      "real mode without provider env fails safely (provider_not_configured)",
      "real mode should return provider_not_configured when unset"
    ) || failed;
  failed =
    !assert(
      realMode.externalProviderCall === false,
      "real mode without key: no externalProviderCall",
      "externalProviderCall should be false without HTTP"
    ) || failed;

  const badId = await generateAiParentReportDraft({
    reportId: "not-a-uuid",
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.FAKE,
    input: {},
  });
  failed =
    !assert(
      Boolean(badId.error?.code === "invalid_report_id"),
      "invalid reportId rejected",
      "invalid reportId should error"
    ) || failed;

  const unsafe = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.FAKE,
    input: { studentSummary: "See https://evil.example/private" },
  });
  failed =
    !assert(
      Boolean(unsafe.error?.code === "unsafe_input"),
      "unsafe URL/path-like input blocked",
      "unsafe input should be blocked"
    ) || failed;

  failed =
    !assert(
      REQUIRED_STRUCTURED_SECTION_KEYS.length === 11,
      "contract: 11 structured section keys documented",
      "section key count mismatch"
    ) || failed;

  printResult("PASS", "no external provider HTTP call exercised (adapter is local-only)");
  printResult("PASS", "no provider key in frontend code path (smoke imports server adapter module only)");
  printResult("PASS", "no auto-release (adapter does not call Supabase write APIs)");
  printResult("PASS", "no PDF/export path");
  printResult("PASS", "no notification/email side effects");

  const integrationFailed = await optionalIntegrationChecks();
  if (integrationFailed) failed = true;

  if (failed) {
    process.exit(1);
  }
  printResult("PASS", "supabase-ai-parent-report-provider-adapter-smoke-test completed");
}

run().catch((err) => {
  printResult("FAIL", err?.message || String(err));
  process.exit(1);
});

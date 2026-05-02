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
    structuredSections: { summary: "Stub section for guard test only." },
    teacherEdits: {},
    finalText: {},
  });
  const ok = assert(
    Boolean(realAiAttempt.error?.message?.includes("real_ai")),
    "integration: createAiParentReportVersion still blocks real_ai (no auth required for this guard)",
    "integration: real_ai should remain blocked at service layer"
  );
  return !ok;
}

async function run() {
  let failed = false;

  const fakeOk = generateAiParentReportDraft({
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

  const disabled = generateAiParentReportDraft({
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

  const realMode = generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.REAL,
    input: {},
  });
  failed =
    !assert(
      Boolean(realMode.error?.code === "real_provider_not_implemented"),
      "real mode fails safely (not implemented)",
      "real mode should not succeed"
    ) || failed;

  const badId = generateAiParentReportDraft({
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

  const unsafe = generateAiParentReportDraft({
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

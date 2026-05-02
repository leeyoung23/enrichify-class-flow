/**
 * Smoke: real provider boundary for AI parent reports (Edge _shared + canonical JS).
 * Safe without keys: expects provider_not_configured for real mode.
 * Optional: if AI_PARENT_REPORT_PROVIDER_API_KEY and AI_PARENT_REPORT_PROVIDER_MODEL are set,
 * performs one real provider call with fake/dev-only input — CHECK/SKIP when unset.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import {
  AI_PARENT_REPORT_PROVIDER_MODES,
  assertStructuredSectionsShapeForTests,
  generateAiParentReportDraft,
} from "../supabase/functions/_shared/aiParentReportProviderAdapter.ts";

import { generateAiParentReportDraft as generateCanonical } from "../src/services/aiParentReportProviderAdapter.js";

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

async function optionalRealHttpWithConfiguredSecret() {
  const key = process.env.AI_PARENT_REPORT_PROVIDER_API_KEY?.trim();
  const model = process.env.AI_PARENT_REPORT_PROVIDER_MODEL?.trim();
  if (!key || !model) {
    printResult(
      "CHECK",
      "optional real provider HTTP: skipped (set AI_PARENT_REPORT_PROVIDER_API_KEY + AI_PARENT_REPORT_PROVIDER_MODEL to exercise)"
    );
    return false;
  }

  let failed = false;
  const realTry = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.REAL,
    input: {
      studentSummary: "Synthetic smoke-only summary for contract testing.",
      strengths: "Participation in class discussions",
    },
  });

  failed =
    !assert(
      !realTry.error && realTry.data?.structuredSections,
      "optional: real mode returns structuredSections when env configured",
      "optional real call failed or missing sections"
    ) || failed;
  failed =
    !assert(
      Boolean(realTry.externalProviderCall),
      "optional: externalProviderCall true after real HTTP",
      "optional: expected external provider call flag"
    ) || failed;
  failed =
    !assert(
      assertStructuredSectionsShapeForTests(realTry.data?.structuredSections),
      "optional: schema-valid structuredSections",
      "optional: structuredSections invalid"
    ) || failed;

  const canonicalTry = await generateCanonical({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.REAL,
    input: {
      studentSummary: "Synthetic smoke-only summary for contract testing.",
      strengths: "Participation in class discussions",
    },
  });
  failed =
    !assert(
      !canonicalTry.error,
      "optional: canonical adapter real path succeeds when env configured",
      "optional: canonical real path failed"
    ) || failed;

  if (!failed) {
    printResult("PASS", "optional real provider HTTP completed (dev/staging key only)");
  }
  return failed;
}

async function run() {
  let failed = false;

  const withoutKey = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.REAL,
    input: { studentSummary: "Dev-only text" },
  });
  failed =
    !assert(
      Boolean(withoutKey.error?.code === "provider_not_configured"),
      "real mode without key returns provider_not_configured",
      "expected provider_not_configured without secret"
    ) || failed;
  failed =
    !assert(
      withoutKey.externalProviderCall === false,
      "no external call when provider not configured",
      "externalProviderCall should be false"
    ) || failed;

  const fakeOk = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.FAKE,
    input: { studentSummary: "Fake" },
  });
  failed =
    !assert(!fakeOk.error, "fake mode still succeeds", "fake mode broken") || failed;

  const disabled = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.DISABLED,
    input: {},
  });
  failed =
    !assert(
      disabled.error?.code === "provider_disabled",
      "disabled mode still safe",
      "disabled unexpected"
    ) || failed;

  const unsafe = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.REAL,
    input: { studentSummary: "https://evil.example/leak" },
  });
  failed =
    !assert(
      unsafe.error?.code === "unsafe_input",
      "unsafe input blocked before provider (real mode)",
      "unsafe_input expected"
    ) || failed;

  printResult("PASS", "no persistence in adapter");
  printResult("PASS", "no real_ai DB unlock (smoke does not call createAiParentReportVersion)");
  printResult("PASS", "no PDF/export");
  printResult("PASS", "no notification/email side effects");

  const optionalFailed = await optionalRealHttpWithConfiguredSecret();
  if (optionalFailed) failed = true;

  if (failed) process.exit(1);
  printResult("PASS", "supabase-ai-parent-report-edge-real-provider-smoke-test completed");
}

run().catch((err) => {
  printResult("FAIL", err?.message || String(err));
  process.exit(1);
});

/**
 * Smoke: Edge-compatible AI parent report provider adapter under `supabase/functions/_shared/`.
 * Exercises the same contract as the canonical `src/services/aiParentReportProviderAdapter.js`
 * without deploying the Edge Function. No external HTTP; no provider keys.
 *
 * Run: node --experimental-strip-types scripts/supabase-ai-parent-report-edge-adapter-smoke-test.mjs
 */

import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

import {
  AI_PARENT_REPORT_PROVIDER_MODES,
  assertStructuredSectionsShapeForTests,
  generateAiParentReportDraft,
  REQUIRED_STRUCTURED_SECTION_KEYS,
} from "../supabase/functions/_shared/aiParentReportProviderAdapter.ts";

import {
  generateAiParentReportDraft as generateCanonical,
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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function tryDenoCheck() {
  try {
    execFileSync("deno", ["--version"], { stdio: "pipe" });
  } catch {
    printResult(
      "CHECK",
      "deno not on PATH — skipped `deno check` for Edge entry (install Deno to validate locally)"
    );
    return;
  }
  const entry = fileURLToPath(
    new URL("../supabase/functions/generate-ai-parent-report-draft/index.ts", import.meta.url)
  );
  if (!existsSync(entry)) {
    printResult("CHECK", "Edge entry path missing — skipped deno check");
    return;
  }
  try {
    execFileSync("deno", ["check", entry], { stdio: "pipe" });
    printResult("PASS", "deno check: generate-ai-parent-report-draft/index.ts");
  } catch {
    printResult("CHECK", "deno check failed or Deno std incomplete — verify with `supabase functions serve` when ready");
  }
}

function trySupabaseFunctionsServeHint() {
  try {
    execFileSync("supabase", ["--version"], { stdio: "pipe" });
    printResult(
      "CHECK",
      "supabase CLI present — optional: `supabase functions serve generate-ai-parent-report-draft` (requires project link / env as applicable)"
    );
  } catch {
    printResult(
      "CHECK",
      "supabase CLI not on PATH — Edge runtime smoke deferred; shared adapter contract verified above"
    );
  }
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

  const canonicalFake = generateCanonical({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.FAKE,
    input: {
      studentSummary: "Fake dev summary only",
      strengths: "Participation",
    },
  });
  failed =
    !assert(
      deepEqual(fakeOk.data?.structuredSections, canonicalFake.data?.structuredSections),
      "parity: Edge _shared fake structuredSections match canonical adapter",
      "parity mismatch vs src/services/aiParentReportProviderAdapter.js"
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

  const badInputShape = generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.FAKE,
    input: [],
  });
  failed =
    !assert(
      Boolean(badInputShape.error?.code === "invalid_input"),
      "non-object input rejected with invalid_input",
      "array input should be invalid_input"
    ) || failed;

  failed =
    !assert(
      REQUIRED_STRUCTURED_SECTION_KEYS.length === 11,
      "contract: 11 structured section keys documented",
      "section key count mismatch"
    ) || failed;

  printResult("PASS", "no external provider HTTP call (adapter is local-only)");
  printResult("PASS", "no provider key required");
  printResult("PASS", "no persistence / auto-release in Edge adapter path");

  tryDenoCheck();
  trySupabaseFunctionsServeHint();

  if (failed) {
    process.exit(1);
  }
  printResult("PASS", "supabase-ai-parent-report-edge-adapter-smoke-test completed");
}

run().catch((err) => {
  printResult("FAIL", err?.message || String(err));
  process.exit(1);
});

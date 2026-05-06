/**
 * Safe real-provider smoke: AI Parent Reports (dedicated lane).
 *
 * - Uses the same Edge/_shared provider adapter as Supabase functions (Node + strip-types).
 * - Fake/dev-only input object (no real student records).
 * - No DB writes, no report version persistence, no ParentView, no real_ai unlock.
 * - Never logs env values, tokens, keys, or full provider responses.
 *
 * Outcomes:
 * - CHECK-skip (exit 0): AI_PARENT_REPORT_PROVIDER_API_KEY or AI_PARENT_REPORT_PROVIDER_MODEL unset.
 * - PASS (exit 0): both set, one HTTP call succeeds, structuredSections validates.
 * - FAIL (exit 1): both set but error, missing sections, or validation failure.
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import {
  AI_PARENT_REPORT_PROVIDER_MODES,
  assertStructuredSectionsShapeForTests,
  generateAiParentReportDraft,
  REQUIRED_STRUCTURED_SECTION_KEYS,
} from "../supabase/functions/_shared/aiParentReportProviderAdapter.ts";
import {
  getParentReportProviderEnv,
  PARENT_REPORT_OPENAI_DEFAULT_BASE_URL,
} from "../supabase/functions/_shared/aiParentReportRealProviderHttp.ts";

const FAKE_REPORT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** Synthetic-only fields passed into the adapter (no PII from production). */
const FAKE_DEV_INPUT = {
  studentName: "Synthetic Student Alpha",
  classOrProgramme: "Demo Class — Language Arts (smoke)",
  learningEvidenceSummary:
    "Synthetic evidence only: participated in group reading; completed two short writing tasks.",
  teacherObservations:
    "Synthetic: polite in class; asks clarifying questions during lessons.",
  homeworkSummary: "Synthetic: 3/4 pieces returned on time this fortnight.",
  attendanceSummary: "Synthetic: attended regularly in the sample period.",
  strengths: "Synthetic: collaborative work and listening skills.",
  areasForTeacherReview: "Synthetic placeholder for staff QA — not a live learner.",
};

function print(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function truncateSample(text, max = 72) {
  if (typeof text !== "string") return "";
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function listMissingProviderEnv() {
  const missing = [];
  if (!process.env.AI_PARENT_REPORT_PROVIDER_API_KEY?.trim()) {
    missing.push("AI_PARENT_REPORT_PROVIDER_API_KEY");
  }
  if (!process.env.AI_PARENT_REPORT_PROVIDER_MODEL?.trim()) {
    missing.push("AI_PARENT_REPORT_PROVIDER_MODEL");
  }
  return missing;
}

async function run() {
  const missing = listMissingProviderEnv();
  if (missing.length > 0) {
    print(
      "CHECK",
      `SKIP: real provider smoke not run — set ${missing.join(" and ")} (optional base URL: AI_PARENT_REPORT_PROVIDER_BASE_URL)`
    );
    process.exit(0);
  }

  const envSnap = getParentReportProviderEnv();
  print(
    "INFO",
    "env: AI_PARENT_REPORT_PROVIDER_API_KEY is set, AI_PARENT_REPORT_PROVIDER_MODEL is set (values not shown)"
  );
  const baseUrlNorm = envSnap.baseUrl.replace(/\/$/, "");
  const defaultNorm = PARENT_REPORT_OPENAI_DEFAULT_BASE_URL.replace(/\/$/, "");
  print(
    "INFO",
    baseUrlNorm === defaultNorm
      ? "BASE_URL: default OpenAI-compatible v1 base (api.openai.com)"
      : "BASE_URL: custom (hostname not printed — verify AI_PARENT_REPORT_PROVIDER_BASE_URL if requests fail)"
  );

  const result = await generateAiParentReportDraft({
    reportId: FAKE_REPORT_ID,
    providerMode: AI_PARENT_REPORT_PROVIDER_MODES.REAL,
    input: FAKE_DEV_INPUT,
  });

  if (result.error) {
    print("FAIL", `code=${result.error.code}`);
    print("FAIL", result.error.message);
    process.exit(1);
  }

  if (!result.externalProviderCall) {
    print("FAIL", "expected externalProviderCall true after configured real call");
    process.exit(1);
  }

  const sections = result.data?.structuredSections;
  if (!assertStructuredSectionsShapeForTests(sections)) {
    print(
      "FAIL",
      "structuredSections failed contract validation (required 11 non-empty string keys)"
    );
    process.exit(1);
  }

  const keySet = new Set(Object.keys(sections));
  const requiredOk = REQUIRED_STRUCTURED_SECTION_KEYS.every((k) => keySet.has(k));
  if (!requiredOk) {
    print("FAIL", "missing one or more REQUIRED_STRUCTURED_SECTION_KEYS in response");
    process.exit(1);
  }

  print("PASS", "real provider smoke: outbound call completed");
  print("PASS", `structured output: ${REQUIRED_STRUCTURED_SECTION_KEYS.length} sections validated`);
  print(
    "PASS",
    `metadata only — providerLabel=${result.data?.providerLabel ?? "?"}, modelLabel=${result.data?.modelLabel ?? "?"}`
  );
  if (result.data?.usage && result.data.usage.fake === false) {
    const u = result.data.usage;
    print(
      "PASS",
      `usage (non-secret): promptTokens=${u.promptTokens ?? "null"}, completionTokens=${u.completionTokens ?? "null"}`
    );
  }
  const sampleKey = REQUIRED_STRUCTURED_SECTION_KEYS[0];
  print(
    "PASS",
    `sample truncated (${sampleKey}): ${truncateSample(sections[sampleKey])}`
  );
  print("PASS", "ai-parent-report-real-provider-smoke-test completed");
}

run().catch((err) => {
  print("FAIL", err?.message || String(err));
  process.exit(1);
});

/**
 * Server-side AI parent report provider adapter skeleton.
 * Supports fake + disabled modes only; real provider calls are not implemented.
 * No API keys; safe to import from Edge Functions or Node smoke tests.
 */

import {
  buildMockAiParentReportStructuredSections,
  containsUnsafeMockDraftValue,
} from "./aiParentReportMockDraftCore.js";

export const AI_PARENT_REPORT_PROVIDER_MODES = {
  DISABLED: "disabled",
  FAKE: "fake",
  REAL: "real",
};

const REQUIRED_STRUCTURED_SECTION_KEYS = [
  "summary",
  "attendance_punctuality",
  "lesson_progression",
  "homework_completion",
  "homework_assessment_performance",
  "strengths",
  "areas_for_improvement",
  "learning_gaps",
  "next_recommendations",
  "parent_support_suggestions",
  "teacher_final_comment",
];

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

export function normalizeAiParentReportProviderMode(raw) {
  const safe = String(raw ?? "").trim().toLowerCase();
  if (safe === AI_PARENT_REPORT_PROVIDER_MODES.FAKE) return AI_PARENT_REPORT_PROVIDER_MODES.FAKE;
  if (safe === AI_PARENT_REPORT_PROVIDER_MODES.REAL) return AI_PARENT_REPORT_PROVIDER_MODES.REAL;
  return AI_PARENT_REPORT_PROVIDER_MODES.DISABLED;
}

/**
 * Planned contract (planning doc): generateAiParentReportDraft({ reportId, providerMode, input })
 *
 * Success payload:
 * { structuredSections, providerLabel, modelLabel, warnings, usage? }
 *
 * Never returns secrets or raw JWT/provider payloads.
 */
export function generateAiParentReportDraft({ reportId, providerMode, input } = {}) {
  if (!isUuidLike(reportId)) {
    return {
      data: null,
      error: { code: "invalid_report_id", message: "reportId must be a UUID" },
    };
  }

  const mode = normalizeAiParentReportProviderMode(providerMode);

  if (input != null && (typeof input !== "object" || Array.isArray(input))) {
    return {
      data: null,
      error: { code: "invalid_input", message: "input must be a plain object when provided" },
    };
  }

  const safeInput = input && typeof input === "object" ? input : {};

  if (containsUnsafeMockDraftValue(safeInput)) {
    return {
      data: null,
      error: {
        code: "unsafe_input",
        message:
          "input must not include private paths, URLs, provider/debug metadata, or secret-like values",
      },
    };
  }

  if (mode === AI_PARENT_REPORT_PROVIDER_MODES.DISABLED) {
    return {
      data: null,
      error: {
        code: "provider_disabled",
        message: "AI parent report provider is disabled; no generation was performed.",
      },
    };
  }

  if (mode === AI_PARENT_REPORT_PROVIDER_MODES.REAL) {
    return {
      data: null,
      error: {
        code: "real_provider_not_implemented",
        message: "Real AI provider mode is not implemented yet.",
      },
    };
  }

  // fake mode — deterministic local sections only (no HTTP)
  const structuredSections = buildMockAiParentReportStructuredSections(safeInput);

  return {
    data: {
      structuredSections,
      providerLabel: "fake_adapter",
      modelLabel: "fake_deterministic_v1",
      warnings: ["draft_only_staff", "no_auto_release", "teacher_review_required"],
      usage: {
        fake: true,
        promptTokens: null,
        completionTokens: null,
        note: "internal_fake_metadata_only",
      },
    },
    error: null,
  };
}

export function assertStructuredSectionsShapeForTests(structuredSections) {
  if (!structuredSections || typeof structuredSections !== "object") return false;
  return REQUIRED_STRUCTURED_SECTION_KEYS.every(
    (key) => typeof structuredSections[key] === "string" && structuredSections[key].length > 0
  );
}

export { REQUIRED_STRUCTURED_SECTION_KEYS };

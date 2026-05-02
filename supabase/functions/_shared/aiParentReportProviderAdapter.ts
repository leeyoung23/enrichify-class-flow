/**
 * Edge-compatible AI parent report provider adapter (fake / disabled / real stub only).
 * Aligned with `src/services/aiParentReportProviderAdapter.js`.
 * No API keys; no external HTTP; safe for Supabase Edge bundling under `functions/_shared`.
 */

import {
  buildMockAiParentReportStructuredSections,
  containsUnsafeMockDraftValue,
} from "./aiParentReportMockDraftCore.ts";

export const AI_PARENT_REPORT_PROVIDER_MODES = {
  DISABLED: "disabled",
  FAKE: "fake",
  REAL: "real",
} as const;

export const REQUIRED_STRUCTURED_SECTION_KEYS = [
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
] as const;

function isUuidLike(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

export function normalizeAiParentReportProviderMode(raw: unknown): string {
  const safe = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (safe === AI_PARENT_REPORT_PROVIDER_MODES.FAKE) return AI_PARENT_REPORT_PROVIDER_MODES.FAKE;
  if (safe === AI_PARENT_REPORT_PROVIDER_MODES.REAL) return AI_PARENT_REPORT_PROVIDER_MODES.REAL;
  return AI_PARENT_REPORT_PROVIDER_MODES.DISABLED;
}

export type GenerateDraftArgs = {
  reportId?: string;
  providerMode?: unknown;
  input?: unknown;
};

export type GenerateDraftError = {
  code: string;
  message: string;
};

export type GenerateDraftResult = {
  data: {
    structuredSections: Record<string, string>;
    providerLabel: string;
    modelLabel: string;
    warnings: string[];
    usage: {
      fake: boolean;
      promptTokens: null;
      completionTokens: null;
      note: string;
    };
  } | null;
  error: GenerateDraftError | null;
};

/**
 * Planned contract: generateAiParentReportDraft({ reportId, providerMode, input })
 */
export function generateAiParentReportDraft({
  reportId,
  providerMode,
  input,
}: GenerateDraftArgs = {}): GenerateDraftResult {
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

  const safeInput =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

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

export function assertStructuredSectionsShapeForTests(
  structuredSections: Record<string, string> | null | undefined
): boolean {
  if (!structuredSections || typeof structuredSections !== "object") return false;
  return REQUIRED_STRUCTURED_SECTION_KEYS.every(
    (key) =>
      typeof structuredSections[key] === "string" &&
      (structuredSections[key] as string).length > 0
  );
}

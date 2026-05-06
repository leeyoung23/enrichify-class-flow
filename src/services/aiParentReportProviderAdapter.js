/**
 * Server-side AI parent report provider adapter.
 * fake + disabled + real (OpenAI-compatible HTTP when env configured).
 * No API keys in repo; real mode uses process.env in Node only.
 */

import {
  buildMockAiParentReportStructuredSections,
  containsUnsafeMockDraftValue,
} from "./aiParentReportMockDraftCore.js";
import { callOpenAiCompatibleParentReport } from "./aiParentReportRealProviderHttp.js";
import { REQUIRED_STRUCTURED_SECTION_KEYS } from "./aiParentReportSectionKeys.js";

export { REQUIRED_STRUCTURED_SECTION_KEYS };

export const AI_PARENT_REPORT_PROVIDER_MODES = {
  DISABLED: "disabled",
  FAKE: "fake",
  REAL: "real",
};

const MAX_INPUT_SERIALIZED_CHARS = 24_000;

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

function inputPayloadSizeOk(input) {
  try {
    return JSON.stringify(input).length <= MAX_INPUT_SERIALIZED_CHARS;
  } catch {
    return false;
  }
}

export function normalizeAiParentReportProviderMode(raw) {
  const safe = String(raw ?? "").trim().toLowerCase();
  if (safe === AI_PARENT_REPORT_PROVIDER_MODES.FAKE) return AI_PARENT_REPORT_PROVIDER_MODES.FAKE;
  if (safe === AI_PARENT_REPORT_PROVIDER_MODES.REAL) return AI_PARENT_REPORT_PROVIDER_MODES.REAL;
  return AI_PARENT_REPORT_PROVIDER_MODES.DISABLED;
}

/**
 * generateAiParentReportDraft({ reportId, providerMode, input })
 */
export async function generateAiParentReportDraft({ reportId, providerMode, input } = {}) {
  if (!isUuidLike(reportId)) {
    return {
      data: null,
      error: { code: "invalid_report_id", message: "reportId must be a UUID" },
      externalProviderCall: false,
    };
  }

  const mode = normalizeAiParentReportProviderMode(providerMode);

  if (input != null && (typeof input !== "object" || Array.isArray(input))) {
    return {
      data: null,
      error: { code: "invalid_input", message: "input must be a plain object when provided" },
      externalProviderCall: false,
    };
  }

  const safeInput = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  if (!inputPayloadSizeOk(safeInput)) {
    return {
      data: null,
      error: {
        code: "input_too_large",
        message: "Input exceeds maximum allowed size for generation.",
      },
      externalProviderCall: false,
    };
  }

  if (containsUnsafeMockDraftValue(safeInput)) {
    return {
      data: null,
      error: {
        code: "unsafe_input",
        message:
          "input must not include private paths, URLs, provider/debug metadata, or secret-like values",
      },
      externalProviderCall: false,
    };
  }

  if (mode === AI_PARENT_REPORT_PROVIDER_MODES.DISABLED) {
    return {
      data: null,
      error: {
        code: "provider_disabled",
        message: "AI parent report provider is disabled; no generation was performed.",
      },
      externalProviderCall: false,
    };
  }

  if (mode === AI_PARENT_REPORT_PROVIDER_MODES.REAL) {
    const res = await callOpenAiCompatibleParentReport(String(reportId), safeInput);
    if (res.error) {
      return {
        data: null,
        error: res.error,
        externalProviderCall: res.externalProviderCall,
      };
    }
    return {
      data: res.data,
      error: null,
      externalProviderCall: res.externalProviderCall,
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
    externalProviderCall: false,
  };
}

export function assertStructuredSectionsShapeForTests(structuredSections) {
  if (!structuredSections || typeof structuredSections !== "object") return false;
  return REQUIRED_STRUCTURED_SECTION_KEYS.every(
    (key) => typeof structuredSections[key] === "string" && structuredSections[key].length > 0
  );
}

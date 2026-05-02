/**
 * OpenAI-compatible real provider call for AI parent report drafts.
 * Edge + Node: reads env via getParentReportProviderEnv; never logs secrets.
 * No persistence. No key => no fetch.
 */

import { REQUIRED_STRUCTURED_SECTION_KEYS } from "./aiParentReportSectionKeys.ts";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const CHAT_PATH = "/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_INPUT_SERIALIZED_CHARS = 24_000;

function getEnv(key: string): string | undefined {
  // Deno (Edge)
  if (typeof (globalThis as { Deno?: { env: { get: (k: string) => string | undefined } } }).Deno !==
    "undefined"
  ) {
    return (globalThis as { Deno: { env: { get: (k: string) => string | undefined } } }).Deno.env.get(
      key
    );
  }
  if (typeof process !== "undefined" && process.env) {
    const v = process.env[key];
    return v !== undefined && v !== "" ? v : undefined;
  }
  return undefined;
}

export function getParentReportProviderEnv(): {
  apiKey: string | undefined;
  model: string | undefined;
  baseUrl: string;
} {
  const apiKey = getEnv("AI_PARENT_REPORT_PROVIDER_API_KEY")?.trim() || undefined;
  const model = getEnv("AI_PARENT_REPORT_PROVIDER_MODEL")?.trim() || undefined;
  const baseRaw = getEnv("AI_PARENT_REPORT_PROVIDER_BASE_URL")?.trim();
  const baseUrl = (baseRaw || DEFAULT_BASE_URL).replace(/\/$/, "");
  return { apiKey, model, baseUrl };
}

function buildSystemPrompt(): string {
  return [
    "You write parent-friendly school progress report sections for teachers to review.",
    "Output MUST be a single JSON object with exactly these string keys (all required, non-empty strings):",
    REQUIRED_STRUCTURED_SECTION_KEYS.join(", ") + ".",
    "Rules: evidence-grounded only; no invented facts; no medical or diagnosis-like claims;",
    "no harsh or unsupported negative labels; parent-friendly, concise, specific tone;",
    "if evidence is insufficient for a section, use a neutral line that the school has limited evidence in that area (no blame).",
    "Do not include storage paths, URLs, private file paths, or internal IDs in the text.",
    "Return JSON only, no markdown fences.",
  ].join(" ");
}

function buildUserPayload(reportId: string, input: Record<string, unknown>): string {
  return JSON.stringify({
    reportId,
    context: input,
    task: "Produce the 11 sections as JSON keys listed in the system message.",
  });
}

export function validateStructuredSectionsShape(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return REQUIRED_STRUCTURED_SECTION_KEYS.every(
    (k) => typeof o[k] === "string" && (o[k] as string).trim().length > 0
  );
}

function parseMessageContentToJson(content: string): unknown {
  const trimmed = content.trim();
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(trimmed);
  if (parsed !== null) return parsed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    parsed = tryParse(fence[1].trim());
    if (parsed !== null) return parsed;
  }
  return null;
}

export type RealProviderSuccess = {
  data: {
    structuredSections: Record<string, string>;
    providerLabel: string;
    modelLabel: string;
    warnings: string[];
    usage: {
      fake: false;
      promptTokens: number | null;
      completionTokens: number | null;
      note: string;
    };
  };
  externalProviderCall: true;
};

export type RealProviderFailure = {
  error: { code: string; message: string };
  /** False if no request was sent; true if a provider HTTP round-trip occurred but failed validation */
  externalProviderCall: boolean;
};

/**
 * Calls the provider when API key and model are set; otherwise caller should not invoke.
 */
export async function callOpenAiCompatibleParentReport(
  reportId: string,
  input: Record<string, unknown>
): Promise<RealProviderSuccess | RealProviderFailure> {
  const { apiKey, model, baseUrl } = getParentReportProviderEnv();
  if (!apiKey || !model) {
    return {
      error: {
        code: "provider_not_configured",
        message: "Real AI provider is not configured (missing API key or model).",
      },
      externalProviderCall: false,
    };
  }

  const serialized = buildUserPayload(reportId, input);
  if (serialized.length > MAX_INPUT_SERIALIZED_CHARS) {
    return {
      error: {
        code: "input_too_large",
        message: "Input exceeds maximum allowed size for provider generation.",
      },
      externalProviderCall: false,
    };
  }

  const url = `${baseUrl}${CHAT_PATH}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: serialized },
        ],
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      error: {
        code: aborted ? "provider_timeout" : "provider_request_failed",
        message: aborted
          ? "The AI provider request timed out."
          : "The AI provider request could not be completed.",
      },
      externalProviderCall: false,
    };
  } finally {
    clearTimeout(t);
  }

  if (!response.ok) {
    return {
      error: {
        code: "provider_request_failed",
        message: "The AI provider returned an error response.",
      },
      externalProviderCall: true,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      error: {
        code: "provider_response_invalid",
        message: "The AI provider response could not be read.",
      },
      externalProviderCall: true,
    };
  }

  const content =
    body &&
    typeof body === "object" &&
    Array.isArray((body as { choices?: unknown }).choices) &&
    (body as { choices: { message?: { content?: string } }[] }).choices[0]?.message?.content;

  if (typeof content !== "string") {
    return {
      error: {
        code: "provider_response_invalid",
        message: "The AI provider response format was unexpected.",
      },
      externalProviderCall: true,
    };
  }

  const parsed = parseMessageContentToJson(content);
  if (!validateStructuredSectionsShape(parsed)) {
    return {
      error: {
        code: "provider_response_invalid",
        message: "The AI provider output failed schema validation.",
      },
      externalProviderCall: true,
    };
  }

  const usageRaw = (body as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;

  return {
    data: {
      structuredSections: parsed as Record<string, string>,
      providerLabel: "openai_compatible_edge",
      modelLabel: model,
      warnings: ["draft_only_staff", "no_auto_release", "teacher_review_required", "real_provider"],
      usage: {
        fake: false,
        promptTokens: typeof usageRaw?.prompt_tokens === "number" ? usageRaw.prompt_tokens : null,
        completionTokens:
          typeof usageRaw?.completion_tokens === "number" ? usageRaw.completion_tokens : null,
        note: "provider_usage_metadata_internal_only",
      },
    },
    externalProviderCall: true,
  };
}

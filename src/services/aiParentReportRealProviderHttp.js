/**
 * OpenAI-compatible real provider (Node). Mirrors `_shared/aiParentReportRealProviderHttp.ts`.
 * Never logs API keys or full provider bodies.
 */

import { REQUIRED_STRUCTURED_SECTION_KEYS } from "./aiParentReportSectionKeys.js";

export const PARENT_REPORT_OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_BASE_URL = PARENT_REPORT_OPENAI_DEFAULT_BASE_URL;
const CHAT_PATH = "/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_INPUT_SERIALIZED_CHARS = 24_000;
const MAX_ERROR_BODY_READ_CHARS = 4096;

function getEnv(key) {
  if (typeof process !== "undefined" && process.env) {
    const v = process.env[key];
    return v !== undefined && v !== "" ? v : undefined;
  }
  return undefined;
}

export function getParentReportProviderEnv() {
  const apiKey = getEnv("AI_PARENT_REPORT_PROVIDER_API_KEY")?.trim() || undefined;
  const model = getEnv("AI_PARENT_REPORT_PROVIDER_MODEL")?.trim() || undefined;
  const baseRaw = getEnv("AI_PARENT_REPORT_PROVIDER_BASE_URL")?.trim();
  const baseUrl = (baseRaw || DEFAULT_BASE_URL).replace(/\/$/, "");
  return { apiKey, model, baseUrl };
}

export function isOpenAiGpt5FamilyModel(model) {
  return /\bgpt-5/i.test(String(model || "").trim());
}

function classifyOpenAiStyleError(httpStatus, providerCode) {
  const code = (providerCode || "").toLowerCase();
  if (httpStatus === 401 || code === "invalid_api_key" || code === "incorrect_api_key") {
    return "provider_auth_failed";
  }
  if (httpStatus === 403) return "provider_permission_denied";
  if (code === "insufficient_quota" || code === "billing_hard_limit_reached") {
    return "provider_quota_exceeded";
  }
  if (code === "rate_limit_exceeded" || code === "engine_overloaded") {
    return "provider_rate_limited";
  }
  if (code === "model_not_found") {
    return "provider_model_not_found";
  }
  if (httpStatus === 404) return "provider_not_found";
  if (httpStatus === 429) return "provider_rate_limited";
  if (httpStatus === 400) return "provider_bad_request";
  if (httpStatus >= 500) return "provider_server_error";
  return "provider_request_failed";
}

const MAX_SAFE_PROVIDER_MESSAGE_CHARS = 200;

function truncateSafeApiMessage(raw) {
  if (!raw || typeof raw !== "string") return undefined;
  const oneLine = raw.replace(/\s+/g, " ").trim();
  if (oneLine.length <= MAX_SAFE_PROVIDER_MESSAGE_CHARS) return oneLine;
  return `${oneLine.slice(0, MAX_SAFE_PROVIDER_MESSAGE_CHARS)}…`;
}

function safeMessageForClassifiedError(
  classified,
  httpStatus,
  providerCode,
  providerParam,
  apiMessageSnippet
) {
  const codeNote =
    providerCode && typeof providerCode === "string" && providerCode.length > 0
      ? ` (provider code: ${providerCode})`
      : "";
  const paramNote =
    providerParam && typeof providerParam === "string" && /^[a-zA-Z0-9_.-]+$/.test(providerParam)
      ? ` (unsupported parameter: ${providerParam})`
      : "";
  const hintNote = apiMessageSnippet ? ` ${apiMessageSnippet}` : "";
  const http = `HTTP ${httpStatus}`;

  switch (classified) {
    case "provider_auth_failed":
      return `${http}${codeNote}: API key rejected or missing permissions. Use an API key from your AI platform's developer/API keys page (e.g. OpenAI: platform.openai.com/api-keys). This is not the same as a ChatGPT web login, passkey, or PIN.`;
    case "provider_permission_denied":
      return `${http}${codeNote}: Access denied for this API key or organization.`;
    case "provider_quota_exceeded":
      return `${http}${codeNote}: Billing or quota limit reached on the provider account.`;
    case "provider_rate_limited":
      return `${http}${codeNote}: Rate limited — retry later or reduce request frequency.`;
    case "provider_model_not_found":
      return `${http}${codeNote}: Model id may be wrong or not enabled for this account. Check AI_PARENT_REPORT_PROVIDER_MODEL matches a model your provider exposes.`;
    case "provider_not_found":
      return `${http}: Endpoint or resource not found — if using a custom base URL, verify AI_PARENT_REPORT_PROVIDER_BASE_URL.`;
    case "provider_bad_request":
      return `${http}${codeNote}${paramNote}: Bad request to the provider — check model name and request shape.${hintNote}`;
    case "provider_server_error":
      return `${http}: Provider server error — retry later.`;
    default:
      return `${http}${codeNote}${paramNote}: Provider returned an error (see code ${classified}).${hintNote}`;
  }
}

async function failureFromNonOkResponse(response) {
  const httpStatus = response.status;
  let providerCode;
  let providerParam;
  let apiMessageSnippet;
  try {
    const text = (await response.text()).slice(0, MAX_ERROR_BODY_READ_CHARS);
    const parsed = JSON.parse(text);
    if (parsed?.error && typeof parsed.error === "object") {
      if (typeof parsed.error.code === "string") providerCode = parsed.error.code;
      if (typeof parsed.error.param === "string") providerParam = parsed.error.param;
      apiMessageSnippet = truncateSafeApiMessage(parsed.error.message);
    }
  } catch {
    /* ignore */
  }
  const classified = classifyOpenAiStyleError(httpStatus, providerCode);
  return {
    error: {
      code: classified,
      message: safeMessageForClassifiedError(
        classified,
        httpStatus,
        providerCode,
        providerParam,
        apiMessageSnippet
      ),
    },
    externalProviderCall: true,
  };
}

function buildSystemPrompt() {
  return [
    "You write parent-friendly school progress report sections for teachers to review.",
    "Output MUST be a single JSON object with exactly these string keys (all required, non-empty strings):",
    `${REQUIRED_STRUCTURED_SECTION_KEYS.join(", ")}.`,
    "Rules: evidence-grounded only; no invented facts; no medical or diagnosis-like claims;",
    "no harsh or unsupported negative labels; parent-friendly, concise, specific tone;",
    "if evidence is insufficient for a section, use a neutral line that the school has limited evidence in that area (no blame).",
    "Do not include storage paths, URLs, private file paths, or internal IDs in the text.",
    "Return JSON only, no markdown fences.",
  ].join(" ");
}

function buildUserPayload(reportId, input) {
  return JSON.stringify({
    reportId,
    context: input,
    task: "Produce the 11 sections as JSON keys listed in the system message.",
  });
}

function buildChatCompletionsRequestBody(model, messages) {
  const gpt5 = isOpenAiGpt5FamilyModel(model);
  if (gpt5) {
    return {
      model,
      messages,
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
    };
  }
  return {
    model,
    messages,
    temperature: 0.35,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  };
}

export function validateStructuredSectionsShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return REQUIRED_STRUCTURED_SECTION_KEYS.every(
    (k) => typeof value[k] === "string" && value[k].trim().length > 0
  );
}

function parseMessageContentToJson(content) {
  const trimmed = content.trim();
  const tryParse = (s) => {
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

export async function callOpenAiCompatibleParentReport(reportId, input) {
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

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        buildChatCompletionsRequestBody(model, [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: serialized },
        ])
      ),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    const aborted = e instanceof Error && e.name === "AbortError";
    if (aborted) {
      return {
        error: {
          code: "provider_timeout",
          message: "The AI provider request timed out.",
        },
        externalProviderCall: false,
      };
    }
    return {
      error: {
        code: "provider_network_error",
        message:
          "Could not reach the provider (network/DNS/TLS). Check connectivity and AI_PARENT_REPORT_PROVIDER_BASE_URL if using a custom gateway.",
      },
      externalProviderCall: false,
    };
  } finally {
    clearTimeout(t);
  }

  if (!response.ok) {
    return failureFromNonOkResponse(response);
  }

  let body;
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
    Array.isArray(body.choices) &&
    body.choices[0]?.message?.content;

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

  const usageRaw = body.usage;

  return {
    data: {
      structuredSections: parsed,
      providerLabel: "openai_compatible_edge",
      modelLabel: model,
      warnings: [
        "draft_only_staff",
        "no_auto_release",
        "teacher_review_required",
        "real_provider",
      ],
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

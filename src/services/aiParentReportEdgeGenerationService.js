/**
 * Staff-only: call secured Edge `generate-ai-parent-report-draft` with the user JWT,
 * then persist via createAiParentReportVersion (real_ai). No provider keys in browser.
 */

import { containsUnsafeMockDraftValue } from "./aiParentReportMockDraftCore.js";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { createAiParentReportVersion } from "./supabaseWriteService.js";

const EDGE_FUNCTION_NAME = "generate-ai-parent-report-draft";

function supabaseUrlTrimmed() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : "") ||
    "";
  return String(raw).replace(/\/$/, "");
}

function supabaseAnonKey() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_ANON_KEY : "") ||
    ""
  );
}

function friendlyEdgeFailure(code, httpStatus, fallbackMessage) {
  const c = typeof code === "string" ? code.trim() : "";
  if (c === "missing_auth" || c === "invalid_auth" || httpStatus === 401) {
    return "Sign in required or session expired. Try signing in again.";
  }
  if (c === "scope_denied" || httpStatus === 403) {
    return "You are not allowed to generate an AI draft for this report.";
  }
  if (c === "provider_not_configured" || c === "provider_disabled") {
    return "AI generation is not available in this environment right now.";
  }
  if (
    c.startsWith("provider_") ||
    c === "internal_error" ||
    httpStatus === 502 ||
    httpStatus === 503
  ) {
    return "The AI draft service could not complete this request. Try again later.";
  }
  return fallbackMessage || "Unable to generate AI draft right now.";
}

/**
 * @param {{ reportId?: string, input?: Record<string, unknown> }} args
 */
export async function generateRealAiParentReportDraftViaEdge({ reportId, input } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured." } };
  }

  const rid = typeof reportId === "string" ? reportId.trim() : "";
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(rid)) {
    return { data: null, error: { message: "Select a valid report." } };
  }

  const safeInput =
    input && typeof input === "object" && !Array.isArray(input) ? { ...input } : {};

  if (containsUnsafeMockDraftValue(safeInput)) {
    return {
      data: null,
      error: {
        message:
          "Input contains blocked patterns (URLs, storage paths, or secret-like text). Remove them and try again.",
      },
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) {
    return {
      data: null,
      error: { message: "Sign in required to generate a real AI draft." },
    };
  }

  const accessToken = sessionData.session.access_token;
  const base = supabaseUrlTrimmed();
  const anon = supabaseAnonKey();
  if (!base || !anon) {
    return { data: null, error: { message: "App configuration is incomplete." } };
  }

  const url = `${base}/functions/v1/${EDGE_FUNCTION_NAME}`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: anon,
      },
      body: JSON.stringify({
        reportId: rid,
        providerMode: "real",
        input: safeInput,
      }),
    });
  } catch {
    return { data: null, error: { message: "Network error. Check your connection and try again." } };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { data: null, error: { message: "Invalid response from AI draft service." } };
  }

  const errCode = body?.error?.code;
  const errMsg = typeof body?.error?.message === "string" ? body.error.message : "";

  if (!res.ok || body?.ok === false) {
    return {
      data: null,
      error: {
        message: friendlyEdgeFailure(errCode, res.status, errMsg),
      },
    };
  }

  const draft = body?.data;
  if (!draft || typeof draft.structuredSections !== "object" || Array.isArray(draft.structuredSections)) {
    return { data: null, error: { message: "AI draft response was incomplete." } };
  }

  const structuredSections = draft.structuredSections;
  const modelRaw = typeof draft.modelLabel === "string" ? draft.modelLabel.trim() : "";
  const providerRaw = typeof draft.providerLabel === "string" ? draft.providerLabel.trim() : "";

  const teacherFinal =
    typeof structuredSections.teacher_final_comment === "string"
      ? structuredSections.teacher_final_comment.trim()
      : "";

  return createAiParentReportVersion({
    reportId: rid,
    generationSource: "real_ai",
    structuredSections,
    teacherEdits: {
      real_ai_generation: true,
      ...(providerRaw ? { provider_label: providerRaw.slice(0, 120) } : {}),
    },
    finalText: teacherFinal ? { teacher_final_comment: teacherFinal } : null,
    aiModelLabel: modelRaw || null,
  });
}

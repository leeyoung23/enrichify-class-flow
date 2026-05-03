// @ts-nocheck
/* eslint-disable no-undef */
/**
 * Edge Function for AI parent report draft generation (fake / disabled / real HTTP when configured).
 * Requires valid staff JWT and can_manage_ai_parent_report(report_id) before any adapter/provider work.
 * Uses `supabase/functions/_shared/` adapter — deploy-safe.
 * Provider secrets: Supabase Edge secrets only (e.g. AI_PARENT_REPORT_PROVIDER_API_KEY).
 * No persistence; no auto-release.
 */

import { generateAiParentReportDraft } from "../_shared/aiParentReportProviderAdapter.ts";
import { authorizeAiParentReportDraftGeneration } from "../_shared/aiParentReportEdgeAuth.ts";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function httpStatusForError(code: string | undefined): number {
  if (
    code === "invalid_report_id" ||
    code === "unsafe_input" ||
    code === "invalid_input" ||
    code === "input_too_large"
  ) {
    return 400;
  }
  if (code === "missing_auth" || code === "invalid_auth") {
    return 401;
  }
  if (code === "scope_denied") {
    return 403;
  }
  if (code === "auth_config_missing") {
    return 500;
  }
  if (code === "provider_disabled" || code === "provider_not_configured") {
    return 503;
  }
  if (
    code === "provider_timeout" ||
    code === "provider_request_failed" ||
    code === "provider_response_invalid" ||
    code === "provider_network_error" ||
    code === "provider_auth_failed" ||
    code === "provider_permission_denied" ||
    code === "provider_quota_exceeded" ||
    code === "provider_rate_limited" ||
    code === "provider_model_not_found" ||
    code === "provider_not_found" ||
    code === "provider_bad_request" ||
    code === "provider_server_error"
  ) {
    return 502;
  }
  if (code === "internal_error") {
    return 500;
  }
  return 500;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", expected_method: "POST" }, 405);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "Request body must be a JSON object" }, 400);
  }

  const body = payload as {
    reportId?: string;
    providerMode?: string;
    input?: Record<string, unknown>;
  };

  const auth = await authorizeAiParentReportDraftGeneration(req, body.reportId);
  if (!auth.ok) {
    return jsonResponse(
      {
        ok: false,
        error: { code: auth.code, message: auth.message },
        data: null,
        external_provider_call: false,
      },
      auth.status
    );
  }

  let result;
  try {
    result = await generateAiParentReportDraft({
      reportId: body.reportId ?? "",
      providerMode: body.providerMode,
      input: body.input,
    });
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: { code: "internal_error", message: "Draft generation could not be completed." },
        data: null,
        external_provider_call: false,
      },
      500
    );
  }

  const err = result.error;
  const status = err ? httpStatusForError(err.code) : 200;

  return jsonResponse(
    {
      ok: !err,
      data: result.data,
      error: err,
      external_provider_call: result.externalProviderCall,
    },
    status
  );
});

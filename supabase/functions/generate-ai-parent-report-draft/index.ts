// @ts-nocheck
/* eslint-disable no-undef */
/**
 * Edge Function for AI parent report draft generation (fake / disabled / real-stub only).
 * Uses `supabase/functions/_shared/` adapter — deploy-safe (no ../../../src imports).
 * No provider API keys; no external HTTP; no persistence; no auto-release.
 */

import { generateAiParentReportDraft } from "../_shared/aiParentReportProviderAdapter.ts";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
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

  let result;
  try {
    result = generateAiParentReportDraft({
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

  const status =
    result.error?.code === "invalid_report_id" ||
    result.error?.code === "unsafe_input" ||
    result.error?.code === "invalid_input"
      ? 400
      : 200;

  return jsonResponse(
    {
      ok: !result.error,
      ...result,
      external_provider_call: false,
    },
    status
  );
});

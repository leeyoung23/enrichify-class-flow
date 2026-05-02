// @ts-nocheck
/* eslint-disable no-undef */
/**
 * Edge Function scaffold for AI parent report draft generation.
 * Delegates to src/services/aiParentReportProviderAdapter.js (fake/disabled/real-stub only).
 * No provider API keys; no external HTTP calls in fake/disabled modes.
 *
 * Deploy/import path note: local `supabase functions serve` must resolve ../../../src;
 * if deployment bundling excludes repo src, move shared adapter into supabase/functions/_shared.
 */

import { generateAiParentReportDraft } from "../../../src/services/aiParentReportProviderAdapter.js";

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

  let payload: { reportId?: string; providerMode?: string; input?: Record<string, unknown> };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const result = generateAiParentReportDraft({
    reportId: payload.reportId ?? "",
    providerMode: payload.providerMode,
    input: payload.input && typeof payload.input === "object" ? payload.input : {},
  });

  const status =
    result.error?.code === "invalid_report_id" || result.error?.code === "unsafe_input"
      ? 400
      : 200;

  return jsonResponse(
    {
      ok: !result.error,
      ...result,
      external_provider_call: false,
    },
    status,
  );
});

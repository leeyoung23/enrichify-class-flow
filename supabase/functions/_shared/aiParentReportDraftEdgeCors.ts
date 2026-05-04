/**
 * CORS for generate-ai-parent-report-draft only.
 * Browser staff UI uses cross-origin fetch with Authorization + apikey + JSON body → preflight OPTIONS.
 * Values are static; no secrets.
 */

export const AI_PARENT_REPORT_DRAFT_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function mergeAiParentReportDraftCorsHeaders(
  base: Headers | Record<string, string>
): Headers {
  const h = base instanceof Headers ? new Headers(base) : new Headers(base);
  for (const [k, v] of Object.entries(AI_PARENT_REPORT_DRAFT_CORS_HEADERS)) {
    h.set(k, v);
  }
  return h;
}

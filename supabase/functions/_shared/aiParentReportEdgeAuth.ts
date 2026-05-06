/**
 * Edge-only authorization for AI parent report draft generation.
 * Uses user JWT + anon Supabase client (RLS-aware RPC). No service-role bypass.
 * Never logs JWT, Authorization headers, or secrets.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function extractBearerToken(req: Request): string {
  const raw = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? "";
}

export function isAiParentReportUuid(value: unknown): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export type AiParentReportEdgeAuthFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type AiParentReportEdgeAuthSuccess = {
  ok: true;
  userId: string;
};

/**
 * Ensures caller may manage the AI parent report (staff scope via DB RPC).
 * Fails closed on RPC errors (no provider call).
 */
export async function authorizeAiParentReportDraftGeneration(
  req: Request,
  reportIdRaw: unknown
): Promise<AiParentReportEdgeAuthFailure | AiParentReportEdgeAuthSuccess> {
  const reportId = typeof reportIdRaw === "string" ? reportIdRaw.trim() : "";
  if (!isAiParentReportUuid(reportId)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_report_id",
      message: "reportId must be a valid UUID.",
    };
  }

  const bearer = extractBearerToken(req);
  if (!bearer) {
    return {
      ok: false,
      status: 401,
      code: "missing_auth",
      message: "Authorization Bearer token is required.",
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      status: 500,
      code: "auth_config_missing",
      message: "Edge auth configuration is missing.",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${bearer}` },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(bearer);
  const userId = authData?.user?.id;
  if (authError || !userId) {
    return {
      ok: false,
      status: 401,
      code: "invalid_auth",
      message: "Invalid or expired auth token.",
    };
  }

  const { data: canManage, error: rpcError } = await supabase.rpc("can_manage_ai_parent_report", {
    report_uuid: reportId,
  });

  if (rpcError) {
    return {
      ok: false,
      status: 403,
      code: "scope_denied",
      message: "You are not allowed to generate drafts for this AI parent report.",
    };
  }

  if (canManage !== true) {
    return {
      ok: false,
      status: 403,
      code: "scope_denied",
      message: "You are not allowed to generate drafts for this AI parent report.",
    };
  }

  return { ok: true, userId };
}

/**
 * Optional integration: verify generate-ai-parent-report-draft Edge HTTP auth gate.
 * - OPTIONS browser preflight returns 204 with CORS headers (after CORS fix deploy).
 * - Unauthenticated POST must return 401 with missing_auth (no provider call), with CORS headers.
 * - Does not print JWTs, tokens, or env values.
 * - Deployed Supabase project required for HTTP branch; otherwise CHECK-skip.
 *
 * Optional env (names only in logs):
 * - AI_PARENT_REPORT_EDGE_TEST_JWT — staff session access_token for authorized probe
 * - AI_PARENT_REPORT_EDGE_TEST_REPORT_ID — UUID of a report the staff user can manage
 */

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

function print(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function assertCorsHeaders(res, context) {
  const origin = res.headers.get("access-control-allow-origin");
  if (origin !== "*") {
    print("FAIL", `${context}: expected Access-Control-Allow-Origin *, got ${origin || "(missing)"}`);
    process.exit(1);
  }
  const methods = (res.headers.get("access-control-allow-methods") || "").toLowerCase();
  if (!methods.includes("post") || !methods.includes("options")) {
    print(
      "FAIL",
      `${context}: Access-Control-Allow-Methods should include POST and OPTIONS, got ${methods || "(missing)"}`
    );
    process.exit(1);
  }
  const allowHdrs = (res.headers.get("access-control-allow-headers") || "").toLowerCase();
  for (const need of ["authorization", "apikey", "content-type", "x-client-info"]) {
    if (!allowHdrs.includes(need)) {
      print(
        "FAIL",
        `${context}: Access-Control-Allow-Headers should include ${need}, got ${allowHdrs || "(missing)"}`
      );
      process.exit(1);
    }
  }
}

async function main() {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) {
    print(
      "CHECK",
      "SKIP: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to exercise Edge HTTP auth integration"
    );
    process.exit(0);
  }

  const fnUrl = `${String(base).replace(/\/$/, "")}/functions/v1/generate-ai-parent-report-draft`;
  const fakeReportId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  let optRes;
  try {
    optRes = await fetch(fnUrl, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, apikey, content-type, x-client-info",
      },
    });
  } catch {
    print(
      "CHECK",
      "SKIP: could not reach Edge URL for OPTIONS (network offline or functions not deployed)"
    );
    process.exit(0);
  }

  if (optRes.status === 404) {
    print(
      "CHECK",
      "SKIP: Edge returned 404 on OPTIONS — generate-ai-parent-report-draft not deployed or URL mismatch"
    );
    process.exit(0);
  }

  if (optRes.status !== 204 && optRes.status !== 200) {
    print(
      "FAIL",
      `OPTIONS preflight expected 204 or 200, got HTTP ${optRes.status} (redeploy function with CORS if 405)`
    );
    process.exit(1);
  }
  assertCorsHeaders(optRes, "OPTIONS preflight");
  print("PASS", "OPTIONS preflight returns CORS headers (browser cross-origin safe)");

  let res;
  try {
    res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
      },
      body: JSON.stringify({
        reportId: fakeReportId,
        providerMode: "fake",
        input: { studentSummary: "edge-auth-smoke" },
      }),
    });
  } catch {
    print(
      "CHECK",
      "SKIP: could not reach Edge URL (network offline or functions not deployed to this project)"
    );
    process.exit(0);
  }

  if (res.status === 404) {
    print(
      "CHECK",
      "SKIP: Edge returned 404 — generate-ai-parent-report-draft not deployed to this Supabase project or URL mismatch"
    );
    process.exit(0);
  }

  if (res.status !== 401) {
    print("FAIL", `expected HTTP 401 without Authorization, got ${res.status}`);
    process.exit(1);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    print("FAIL", "response body is not JSON");
    process.exit(1);
  }
  const hasMissingAuth =
    body?.ok === false && body?.error?.code === "missing_auth";
  if (!hasMissingAuth) {
    print("FAIL", "expected ok:false and error.code missing_auth in JSON body");
    process.exit(1);
  }
  assertCorsHeaders(res, "unauthenticated POST (401)");
  print("PASS", "Edge rejected unauthenticated request (missing_auth) before generation");

  const staffJwt = process.env.AI_PARENT_REPORT_EDGE_TEST_JWT?.trim();
  const staffReportId = process.env.AI_PARENT_REPORT_EDGE_TEST_REPORT_ID?.trim();
  if (!staffJwt || !staffReportId) {
    print(
      "CHECK",
      "SKIP: set AI_PARENT_REPORT_EDGE_TEST_JWT and AI_PARENT_REPORT_EDGE_TEST_REPORT_ID for authorized Edge probe"
    );
    process.exit(0);
  }

  let res2;
  try {
    res2 = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${staffJwt}`,
      },
      body: JSON.stringify({
        reportId: staffReportId,
        providerMode: "fake",
        input: { studentSummary: "edge-auth-smoke" },
      }),
    });
  } catch {
    print("CHECK", "SKIP: authorized probe fetch failed (network)");
    process.exit(0);
  }

  print(
    "CHECK",
    `authorized probe HTTP ${res2.status} — verify manually (200=fake ok, 403=out of scope, 5xx=config)`
  );
  process.exit(0);
}

main().catch((err) => {
  print("FAIL", err?.message || String(err));
  process.exit(1);
});

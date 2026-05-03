/**
 * Optional integration: verify generate-ai-parent-report-draft Edge HTTP auth gate.
 * - Unauthenticated POST must return 401 with missing_auth (no provider call).
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

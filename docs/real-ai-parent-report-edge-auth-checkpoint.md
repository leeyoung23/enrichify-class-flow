# Real AI parent report — Edge generation auth gate (Stage 2A)

## What was added

- **`supabase/functions/_shared/aiParentReportEdgeAuth.ts`**
  - Requires **`Authorization: Bearer <access_token>`** (JWT).
  - Validates the user with **`supabase.auth.getUser(jwt)`** using **`SUPABASE_URL`** + **`SUPABASE_ANON_KEY`** (no service-role bypass for authorization).
  - Enforces report scope with **`rpc('can_manage_ai_parent_report', { report_uuid })`**, which matches staff manage rules in SQL (`is_hq_admin` / branch supervisor / teacher class-student scope). Parents who can *read* a released report are **not** granted manage; RPC returns false → **403** before any provider work.
  - Rejects **missing/invalid UUID** `reportId` with **400** before auth (no provider call).
  - Does **not** log JWTs, `Authorization` headers, env values, or provider bodies.

- **`supabase/functions/generate-ai-parent-report-draft/index.ts`**
  - Runs **authorization first**, then **`generateAiParentReportDraft`** (adapter). Unauthorized callers never reach the provider adapter; **no quota** used for those requests.

- **`supabase/sql/032_grant_execute_can_manage_ai_parent_report.sql`** (optional manual apply)
  - **`GRANT EXECUTE`** on **`public.can_manage_ai_parent_report(uuid)`** to **`authenticated`** if PostgREST/RPC returns permission errors for the Edge runtime.

## What is explicitly unchanged (this stage)

- **`createAiParentReportVersion`** still **blocks** **`generationSource === 'real_ai'`** (no persistence unlock).
- **No** inserts into **`ai_parent_report_versions`** from the Edge function.
- **No** ParentView, release, or notification/email changes.
- **No** OCR / PDF download or storage work.
- Provider keys remain **Edge secrets** / server env only; not exposed to the browser bundle.

## HTTP behaviour

| Case | Result |
|------|--------|
| No `Authorization` | **401** `missing_auth` — before adapter |
| Invalid/expired JWT | **401** `invalid_auth` — before adapter |
| Valid JWT, cannot manage report (RPC not true) | **403** `scope_denied` — before adapter |
| Valid JWT, can manage, adapter/provider error | Existing adapter error mapping (e.g. 502) |

## Tests

| Script | Role |
|--------|------|
| `npm run test:ai-parent-report:real-provider-smoke` | Calls **adapter** in Node (unchanged contract). |
| `npm run test:supabase:ai-parent-report:edge-real-provider` | Same — **not** HTTP Edge. |
| `npm run test:supabase:ai-parent-report:edge-generation-auth` | **Optional** HTTP to deployed `.../functions/v1/generate-ai-parent-report-draft`; **401** unauthenticated check; **CHECK-skip** if URL/keys missing or host unreachable. Optional **`AI_PARENT_REPORT_EDGE_TEST_JWT`** + **`AI_PARENT_REPORT_EDGE_TEST_REPORT_ID`** for a manual **CHECK** probe. |

## CHECK-skip / limitations

- **RPC execute grant:** If the database has not granted **`EXECUTE`** on **`can_manage_ai_parent_report`** to **`authenticated`**, the RPC may fail; apply **`032_...sql`** in the target Supabase project.
- **Edge HTTP smokes** require a **deployed** project and network; local-only dev may **CHECK-skip**.
- **`test:supabase:ai-parent-report:edge-generation-auth`:** If the gateway returns **404**, the function is not deployed to the **`VITE_SUPABASE_URL` / `SUPABASE_URL`** project (or the path is wrong) — the script **CHECK-skip**s; this does **not** assert the auth gate is live until deploy + **`supabase functions deploy generate-ai-parent-report-draft`** (or CI deploy).

## Next milestone

- **real_ai draft persistence unlock** (service/UI) **after** this gate is verified in the target environment (JWT + RPC + optional HTTP smoke green).

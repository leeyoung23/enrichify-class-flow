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

- **Edge** does **not** insert into **`ai_parent_report_versions`**; **Stage 2B** unlocked **`real_ai`** **persistence in the browser write service** only (see **`docs/real-ai-draft-persistence-unlock-checkpoint.md`**). The Edge function still returns **draft JSON only**.
- **No** inserts into **`ai_parent_report_versions`** from the Edge function.
- **No** ParentView, release, or notification/email changes.
- **No** OCR / PDF download or storage work.
- Provider keys remain **Edge secrets** / server env only; not exposed to the browser bundle.

## CORS (browser staff UI)

**Symptom:** Chrome DevTools shows **CORS error** on **`POST …/functions/v1/generate-ai-parent-report-draft`**; the app surfaces **`client_network_error`** because the browser blocks reading the response when CORS headers are missing.

**Cause:** Cross-origin requests with **`Authorization`**, **`apikey`**, and **`Content-Type: application/json`** trigger a **preflight `OPTIONS`** request and require **`Access-Control-Allow-*`** on **both** the preflight response and the actual **POST** response (including **401** JSON).

**Fix (Edge function):**

- **`supabase/functions/_shared/aiParentReportDraftEdgeCors.ts`** — static header map: **`Access-Control-Allow-Origin: *`**, **`Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`**, **`Access-Control-Allow-Methods: POST, OPTIONS`**.
- **`supabase/functions/generate-ai-parent-report-draft/index.ts`** — **`OPTIONS`** returns **204** with CORS headers **before** auth or provider logic; every **`jsonResponse`** merges the same CORS headers (success, **`missing_auth`**, **`scope_denied`**, provider errors, **`internal_error`**, etc.).

**Unchanged:** JWT validation and **`can_manage_ai_parent_report`** gate; no provider keys in responses; no persistence in Edge.

**Smoke:** **`npm run test:supabase:ai-parent-report:edge-generation-auth`** — **`OPTIONS`** preflight + CORS headers; unauthenticated **`POST`** still **401** **`missing_auth`** with CORS headers on the response.

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
| `npm run test:supabase:ai-parent-report:edge-generation-auth` | **Optional** HTTP to deployed `.../functions/v1/generate-ai-parent-report-draft`; **OPTIONS** + CORS headers; **401** unauthenticated **POST** + **`missing_auth`** + CORS on response; **CHECK-skip** if URL/keys missing or host unreachable. Optional **`AI_PARENT_REPORT_EDGE_TEST_JWT`** + **`AI_PARENT_REPORT_EDGE_TEST_REPORT_ID`** for a manual **CHECK** probe. |

## CHECK-skip / limitations

- **RPC execute grant:** If the database has not granted **`EXECUTE`** on **`can_manage_ai_parent_report`** to **`authenticated`**, the RPC may fail; apply **`032_...sql`** in the target Supabase project.
- **Edge HTTP smokes** require a **deployed** project and network; local-only dev may **CHECK-skip**.
- **`test:supabase:ai-parent-report:edge-generation-auth`:** If the gateway returns **404**, the function is not deployed to the **`VITE_SUPABASE_URL` / `SUPABASE_URL`** project (or the path is wrong) — the script **CHECK-skip**s until the function exists at **`.../functions/v1/generate-ai-parent-report-draft`**.

## Deployment verification (2026-05-03)

### Supabase CLI — deploy `generate-ai-parent-report-draft`

From the repo root (requires **`supabase login`** and access to the target project):

```bash
supabase functions deploy generate-ai-parent-report-draft \
  --project-ref <YOUR_PROJECT_REF> \
  --no-verify-jwt \
  --use-api \
  --yes
```

- **`--use-api`:** bundles without local Docker.
- **`--no-verify-jwt`:** disables **platform** JWT verification at the Edge gateway so unauthenticated requests **reach the function** and receive **`401`** + **`error.code: missing_auth`** in the JSON body from **`aiParentReportEdgeAuth`**. Authorization remains enforced **inside** the function (Bearer JWT + **`can_manage_ai_parent_report`**); **no** provider call runs without passing that gate.

### SQL 032 — grant RPC execute to `authenticated`

**File:** **`supabase/sql/032_grant_execute_can_manage_ai_parent_report.sql`**

```sql
grant execute on function public.can_manage_ai_parent_report(uuid) to authenticated;
```

**Apply via CLI (linked project):**

```bash
supabase link --project-ref <YOUR_PROJECT_REF> --yes
supabase db query --linked --file supabase/sql/032_grant_execute_can_manage_ai_parent_report.sql --yes
```

Alternatively: paste the single **`GRANT`** statement into the Supabase **SQL Editor** for the same project.

**Status (this checkpoint):** **`GRANT`** applied successfully via **`supabase db query --linked`**; idempotent if re-run.

### Edge runtime / secrets (names only)

Inject via Supabase Dashboard → **Edge Functions → Secrets** (or CLI secrets), as needed:

- **`SUPABASE_URL`** — auto-provided in Edge; **`aiParentReportEdgeAuth`** uses it with **`SUPABASE_ANON_KEY`**.
- **`SUPABASE_ANON_KEY`** — auto-provided in Edge for **`createClient`** + user JWT.
- **`AI_PARENT_REPORT_PROVIDER_API_KEY`** — optional; required only for real provider HTTP.
- **`AI_PARENT_REPORT_PROVIDER_MODEL`** — optional; real mode.
- **`AI_PARENT_REPORT_PROVIDER_BASE_URL`** — optional; overrides default OpenAI-compatible base.

### HTTP auth smoke (`npm run test:supabase:ai-parent-report:edge-generation-auth`)

**Result (this checkpoint):** **PASS** — unauthenticated **`POST`** returns **HTTP 401** with **`ok: false`**, **`error.code: missing_auth`**, **`external_provider_call: false`** (no adapter/provider execution). **404** resolved after deploy (was **CHECK-skip** when the function was missing).

Optional probe (**CHECK-skip** if unset): **`AI_PARENT_REPORT_EDGE_TEST_JWT`** + **`AI_PARENT_REPORT_EDGE_TEST_REPORT_ID`**.

### Tooling availability

- **Supabase CLI** and **Deno** were available locally (`supabase --version`, `deno --version`).
- **`supabase status`** (local stack) may require Docker; **remote deploy** used **`--use-api`** and did not require local Docker.

### Remaining blockers before **real_ai** persistence unlock

- **Product/service change:** explicitly allow **`generationSource === 'real_ai'`** in **`createAiParentReportVersion`** (and UI) when ready — **not** done here.
- **Staff UI** wired to call Edge with JWT remains a separate milestone.
- This checkpoint only confirms **Edge HTTP auth + RPC grant + smoke** on the linked project; persistence is still intentionally blocked.

## Next milestone

- **real_ai draft persistence unlock** (service/UI) **after** this gate is verified in the target environment (JWT + RPC + optional HTTP smoke green).

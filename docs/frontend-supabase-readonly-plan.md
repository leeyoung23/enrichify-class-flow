# Frontend Supabase Read-Only Plan

This document defines the first safe Supabase frontend read-only migration slice behind the existing service layer.

Scope for this phase:

- Planning only.
- No UI changes.
- No direct Supabase calls from pages/components.
- No real auth implementation.
- No writes/uploads/messaging.
- Keep fake/demo data behavior stable.

## 1) Current frontend data flow

Current app routes/pages are rendered from `src/App.jsx` and page components call service-layer methods, mostly from `src/services/dataService.js`, with role/demo behavior from `src/services/authService.js` and `src/services/permissionService.js`.

Current state by layer:

- `src/services/authService.js`
  - Reads `demoRole` from URL and returns demo users when present.
  - Falls back to Base44 auth (`base44.auth.me()`) when no `demoRole`.
- `src/services/dataService.js`
  - Contains large in-memory fake/demo datasets (`demoData`) and role-based filtering.
  - Uses demo data whenever `demoRole` is present.
  - Otherwise uses Base44 entity/function calls for many reads and writes.
- `src/services/classSessionService.js`
  - Uses demo-mode in-memory behavior when `demoRole` is present.
  - Otherwise uses Base44 writes for attendance/parent updates.
- `src/services/permissionService.js`
  - Defines roles, route access, and role checks; no backend IO.

Relevant pages and current behavior:

- `src/pages/Dashboard.jsx`
  - Uses `dataService` read methods and local summary builders.
- `src/pages/Classes.jsx`
  - Reads classes/branches/staff through `dataService`; can create classes via `dataService`.
- `src/pages/Students.jsx`
  - Reads students/classes/homework through `dataService`; can create students and trigger demo report path.
- `src/pages/SalesKit.jsx`
  - Uses static local demo resources (not service-backed yet).

Conclusion: the project already has a service-layer boundary. That boundary should be preserved and used for Supabase migration.

## 2) Read-only connection principle

Migration rule for this phase:

- Pages/components must keep calling existing service methods.
- Supabase query logic must live in service files (or new Supabase-focused service files).
- Do not place Supabase queries directly in page components.
- Preserve route behavior and existing query keys unless intentionally revised in a small scoped slice.

Security/architecture rule:

- RLS enforcement is at the database layer.
- Frontend filtering is presentation logic only and must not be treated as authorization.

## 3) Proposed new files

Recommended file additions for phased migration:

- `src/services/supabaseClient.js`
  - Create and export browser-safe Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - Include a helper to report whether Supabase read mode is available.
- `src/services/supabaseReadService.js`
  - Read-only Supabase queries for first safe tables.
  - Returns normalized shapes expected by existing UI/service consumers.
- `src/services/supabaseAuthAdapter.js` (later, not now)
  - Future adapter layer for profile/role mapping once real auth rollout begins.
  - Explicitly out of scope for first read-only slice.

## 4) Environment requirements

Frontend-safe env vars for read-only client:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Must not be used in browser/frontend:

- `SUPABASE_SERVICE_ROLE_KEY`

Rules:

- Real values stay in local `.env.local`.
- `.env.local` must never be committed.
- Missing frontend-safe env vars must trigger safe fallback to demo/local data behavior.

## 5) Demo fallback rule

Fallback behavior must be explicit and stable:

1. If `demoRole` is present, always use existing demo/local data paths.
2. If Supabase env vars are missing, use existing demo/local data paths.
3. If a Supabase read fails, fail safely and return stable fallback values so current demo UI does not break.
4. Log non-sensitive diagnostics in development only; do not expose keys/passwords/errors with secrets.

Implementation note:

- Keep fallback decisions in service layer, not pages.

## 6) First read-only tables to connect

Safest first tables for read-only migration:

- `profiles`
- `branches`
- `classes`
- `students`
- `sales_kit_resources`

Rationale:

- These are core read domains aligned with current dashboard/list pages and service migration order.
- Smoke tests already validated key role visibility expectations, including `sales_kit_resources` scope behavior.

Out of scope for first slice:

- attendance writes
- homework uploads
- fee receipts
- parent report release/sending
- real auth login rollout
- any insert/update/delete paths

## 7) Suggested first implementation slice

Recommended smallest safe slice:

1. Add `src/services/supabaseClient.js` with guarded client initialization.
2. Add `src/services/supabaseReadService.js` with one read method only:
   - Option A (preferred): read approved Sales Kit resources.
   - Option B: read branches/classes for list pages.
3. Add one adapter call inside existing `dataService` read method(s) behind strict fallback checks.
4. Do not wire all pages at once; keep blast radius narrow.
5. Optionally create a temporary local debug script for service-level read verification before wiring page consumption widely.

Success criteria for first slice:

- Existing demo flows still work with `demoRole`.
- If env vars are absent, UI remains stable via demo/local data.
- Read-only Supabase path works for fake authenticated sessions when enabled later.
- `npm run build`, `npm run lint`, and `npm run typecheck` stay green.

## 8) Risks and controls

Key risks:

- Mistaking frontend filtering for security.
- Accidental reliance on browser-side service role key.
- Breaking demo paths while adding Supabase read path.
- Expanding scope too early into writes/auth/storage.

Controls:

- Keep RLS as source of truth for access control.
- Never use service role key in frontend code.
- Preserve `demoRole` fallback through migration.
- Keep fake/demo data only until role-by-role parity and security checks are complete.
- Limit first implementation to one read-only domain and verify checks after each incremental change.

## 9) Proposed next Cursor implementation prompt

Use this prompt for the next implementation step:

> Implement the first safe Supabase read-only service-layer slice only.
>
> Constraints:
> - Do not change UI components/pages directly unless needed to keep existing service call signatures.
> - Do not remove `demoRole` fallback.
> - Do not remove demo/local data.
> - Do not add writes/uploads/auth login.
> - Do not use `SUPABASE_SERVICE_ROLE_KEY` in frontend.
>
> Tasks:
> 1. Create `src/services/supabaseClient.js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with safe availability checks.
> 2. Create `src/services/supabaseReadService.js` with one read-only method for approved `sales_kit_resources` (plus branch scope support if already available in schema).
> 3. Update `src/services/dataService.js` minimally so one existing read method can use Supabase read path when:
>    - no `demoRole`,
>    - env vars exist,
>    - and query succeeds;
>    otherwise fallback to current behavior.
> 4. Keep all existing page behavior stable.
> 5. Run `npm run build`, `npm run lint`, `npm run typecheck`.
> 6. Summarize changed files and fallback behavior.

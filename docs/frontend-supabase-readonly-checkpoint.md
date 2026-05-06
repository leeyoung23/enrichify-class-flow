# Frontend Supabase Read-Only Checkpoint

This checkpoint records the current frontend migration state after the first guarded Supabase read-only integration.

## 1) What was implemented

- `src/services/supabaseClient.js`
  - Browser-safe Supabase client setup using only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - Exposes `supabase` and `isSupabaseConfigured()`.
  - Keeps safe null behavior when env vars are missing.
- `src/services/supabaseReadService.js`
  - Read-only method `getApprovedSalesKitResources()`.
  - Reads approved rows from `sales_kit_resources` with safe selected fields.
  - Returns predictable `{ data, error }` and avoids unhandled throws.
- Authenticated read smoke test
  - `scripts/supabase-readonly-smoke-test.mjs` signs in fake users with anon key only.
  - Verifies role-scoped read behavior for HQ Admin, Branch Supervisor, and Teacher.
  - Signs out after each role check.
- Guarded Sales Kit read-only UI path
  - `src/pages/SalesKit.jsx` now attempts Supabase read only for HQ/Branch Supervisor when safe to do so.
  - Falls back to existing demo cards when `demoRole` is active, Supabase is not configured, read fails, or read returns empty.
  - Includes source label:
    - `Loaded from Supabase test data` when Supabase rows are displayed.
    - `Demo resources` when fallback cards are used.

## 2) What remains demo-only

The following areas remain demo/local-only and are not Supabase-wired in this checkpoint:

- dashboards
- attendance
- homework
- parent updates (`/parent-updates` — product label **Parent Updates**)
- class session
- fee tracking
- uploads

## 3) Safety rules preserved

- `demoRole` fallback remains active.
- No service role key usage in frontend (`SUPABASE_SERVICE_ROLE_KEY` is not used).
- No real data introduced.
- No writes/uploads/inserts/updates/deletes/messaging paths added.
- Route guard behavior remains unchanged (`AppLayout` + `permissionService`).

## 4) Verified behavior

- `npm run test:supabase:read` passed.
- Teacher cannot see Sales Kit resources in authenticated smoke test.
- HQ Admin and Branch Supervisor can read approved Sales Kit resources in authenticated smoke test.
- Teacher dashboard still previews in `demoRole` mode.

Note:

- Unauthenticated anon reads may return zero rows under RLS for this table.
- Authenticated fake-user role checks are required before any additional UI wiring decisions.

## 5) Recommended next step

Choose the next low-risk read-only domain behind the service layer:

- Recommended: `branches` / `classes` / `students` read service path.
- Defer attendance/homework/payment write flows until read-only parity and role validation are stable.

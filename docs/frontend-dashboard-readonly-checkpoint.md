# Frontend Dashboard Read-Only Checkpoint

This checkpoint records the first guarded Supabase read-only dashboard summary integration.

## What dashboard summary reads from Supabase

A new service-layer summary method was added:

- `dataService.getDashboardReadSummary(user)`

It reads only low-risk, read-only counts from existing Supabase read methods:

- `branches` count
- `classes` count
- `students` count
- approved `sales_kit_resources` count (optional signal)

No write operations are performed.

## Guarded fallback behavior

Dashboard summary uses fallback-first safety rules:

1. If `demoRole` is active -> use demo/local summary counts.
2. If Supabase env is missing -> use demo/local summary counts.
3. If Supabase read fails -> use demo/local summary counts.
4. If Supabase core results are empty (`branches`/`classes`/`students`) -> use demo/local summary counts for now.

Source label behavior:

- `Loaded from Supabase test data` when Supabase summary is used.
- `Demo data` when fallback summary is used.

## UI scope in this checkpoint

- Dashboard design remains intact.
- Existing sections/cards are preserved.
- A small non-intrusive summary card/label was added for HQ and Branch Supervisor views only.
- No unfinished/sensitive modules were connected.

## What remains demo-only

- Attendance save/edit behavior
- Homework upload/review workflows
- Parent Communication release flows
- Weekly report release flows
- Teacher task updates
- Fee receipt uploads/verification writes
- Real login/auth UI rollout

## Safety rules preserved

- `demoRole` fallback remains active.
- No `SUPABASE_SERVICE_ROLE_KEY` usage in frontend.
- No writes/inserts/updates/deletes/uploads/messaging added.
- No route-guard behavior changes.
- Fake/demo data workflow remains intact.

## Smoke test and verification

`npm run test:supabase:read` now also prints dashboard summary input counts derived from:

- branches/classes/students role-scoped read counts.

Checkpoint verification requires:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:read`

## Recommended next milestone

Choose one of:

- Expand dashboard read-only planning for additional non-sensitive summary domains (still read-only), or
- Pause and validate parity/QA before any write-operation rollout.

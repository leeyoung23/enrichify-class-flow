# Frontend Branches/Classes/Students Read-Only Plan

This document plans the next low-risk Supabase read-only slice for `branches`, `classes`, and `students`, while preserving demo safety.

## 1) Current demo data flow for branches/classes/students

Current flow is service-driven and already centralized in `src/services/dataService.js`:

- `listBranches(user)`
  - Uses in-memory `demoData.branches` when `demoRole` is active.
  - Otherwise currently falls back to Base44 reads.
- `listClasses(user)`
  - Uses in-memory `demoData.classes` + role filtering when `demoRole` is active.
  - Otherwise currently falls back to Base44 reads.
- `listStudents(user)`
  - Uses in-memory `demoData.students` + role filtering when `demoRole` is active.
  - Otherwise currently falls back to Base44 reads.

Page usage:

- `src/pages/Classes.jsx` reads `listClasses` + `listBranches` (and currently keeps create-class write path via existing service).
- `src/pages/Students.jsx` reads `listStudents` + `listClasses` (and keeps existing write/demo actions unchanged).
- `src/pages/Dashboard.jsx` still derives many metrics from demo-centric helpers in `dataService`; it is intentionally out of this slice.

## 2) Proposed Supabase read-only methods

Add read-only methods in `src/services/supabaseReadService.js`:

- `getBranches()`
- `getClasses()`
- `getStudents()`

Preferred safer shape:

- Role-aware variants that still rely on RLS as source of truth, e.g.:
  - `getBranchesReadOnly()`
  - `getClassesReadOnly()`
  - `getStudentsReadOnly()`

Method contract recommendation:

- Return `{ data, error }` consistently.
- Select only fields required by current UI/service consumers.
- Use stable ordering for deterministic UI behavior.
- Catch and return errors (no unhandled throws).

## 3) How RLS will control visibility by role

RLS remains the security layer for Supabase reads:

- HQ Admin: broad visibility.
- Branch Supervisor: branch-scoped visibility.
- Teacher: assigned class/student visibility.
- Parent/Student: highly restricted linked-child/self visibility.

Frontend/service responsibilities:

- Do not attempt to recreate authorization in UI.
- Use service-level fallbacks only for resilience/UX.
- Treat frontend filtering as display shaping, not security.

## 4) Fallback rules

For this slice, apply strict fallback behavior in `dataService` read methods:

1. `demoRole` present -> use demo/local data.
2. Supabase env missing -> use demo/local data.
3. Supabase read error -> use demo/local data.
4. Supabase read empty result -> use demo/local data for now.

Reason:

- Keeps UX stable while validating Supabase parity role-by-role.
- Avoids empty-state regressions during early rollout.

## 5) First implementation recommendation

Safest sequence:

1. Add read-only methods in `supabaseReadService` first (`getBranches`, `getClasses`, `getStudents`).
2. Add a service smoke test script for authenticated fake-user role checks on these three methods.
3. Update `dataService` read methods (`listBranches`, `listClasses`, `listStudents`) with guarded Supabase-first + demo fallback logic.
4. Do not change page UI/components initially; rely on unchanged service call signatures.
5. Keep writes (`createClass`, `createStudent`, etc.) untouched and out of scope.

Gate before any UI-specific tweaks:

- Service smoke checks pass for HQ, Branch Supervisor, Teacher (and optionally Parent/Student reads where applicable).

## 6) Risks

- Role scope differences:
  - Supabase RLS output may not match existing demo-filter assumptions exactly.
- Parent/Student restricted views:
  - Parent/student class/student relationships may need careful service shaping without bypassing RLS.
- Dashboard metric drift:
  - Dashboard currently relies heavily on demo data helpers; totals/trends may not match Supabase reads yet.
- Empty-result masking:
  - Demo fallback on empty results is safe now, but can hide data-mapping gaps if not logged/tested.

## 7) Clear next implementation prompt

Use this prompt for the next coding step:

> Implement the next guarded Supabase read-only service slice for `branches`, `classes`, and `students` only.
>
> Constraints:
> - Do not change UI components/pages directly unless required to preserve existing service method contracts.
> - Do not remove `demoRole`.
> - Do not remove demo/local fallback.
> - Do not add writes/inserts/updates/deletes/uploads/messaging.
> - Do not use `SUPABASE_SERVICE_ROLE_KEY`.
>
> Tasks:
> 1. Add read-only methods in `src/services/supabaseReadService.js`:
>    - `getBranches()`
>    - `getClasses()`
>    - `getStudents()`
> 2. Keep method return contract as `{ data, error }` and catch errors safely.
> 3. Add/extend a read-only authenticated smoke test script for HQ/Branch Supervisor/Teacher visibility checks on these methods.
> 4. Update `src/services/dataService.js` read methods only (`listBranches`, `listClasses`, `listStudents`) to use guarded Supabase-first with fallback rules:
>    - `demoRole` -> demo data
>    - Supabase not configured -> demo data
>    - Supabase error -> demo data
>    - Supabase empty -> demo data (for now)
> 5. Do not modify write methods.
> 6. Run `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test:supabase:read`.
> 7. Report changed files, fallback behavior, and role-based read outcomes.

## 8) Implementation status

Implemented in this checkpoint:

- Added read-only service methods in `src/services/supabaseReadService.js`:
  - `getBranches()`
  - `getClasses()`
  - `getStudents()`
- Methods use only the frontend Supabase client (anon key path), return `{ data, error }`, and catch exceptions safely.
- Updated `scripts/supabase-readonly-smoke-test.mjs` to include authenticated checks for:
  - Sales Kit approved resources
  - `branches`
  - `classes`
  - `students`
  across HQ Admin, Branch Supervisor, Teacher, Parent, and Student fake users.

Still intentionally not done in this checkpoint:

- No `dataService` Supabase wiring for branches/classes/students yet.
- No UI/page wiring changes in `Classes.jsx`, `Students.jsx`, or `Dashboard.jsx`.
- No write/upload/auth UI changes.

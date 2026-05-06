# Frontend Branches/Classes/Students Read-Only Checkpoint

This checkpoint captures the current guarded Supabase read-only rollout for `branches`, `classes`, and `students`.

## 1) What was implemented

- Added read-only Supabase service methods in `src/services/supabaseReadService.js`:
  - `getBranches()`
  - `getClasses()`
  - `getStudents()`
- Expanded authenticated smoke test coverage in `scripts/supabase-readonly-smoke-test.mjs`:
  - Sales Kit approved resources
  - branches/classes/students visibility checks for HQ, Branch Supervisor, Teacher, Parent, and Student fake users
- Wired `Classes` and `Students` pages through existing service layer (`dataService`) with guarded Supabase read path:
  - no direct page-to-Supabase queries
  - unchanged page structure and actions
- Added small source labels on `Classes` and `Students` pages:
  - `Loaded from Supabase test data`
  - `Demo data`

## 2) Which files changed

- `src/services/supabaseReadService.js`
- `src/services/dataService.js`
- `src/pages/Classes.jsx`
- `src/pages/Students.jsx`
- `scripts/supabase-readonly-smoke-test.mjs`
- `docs/frontend-branches-classes-students-readonly-plan.md`

## 3) How Classes fallback works

`dataService.listClasses(user)` now follows guarded fallback rules:

1. If `demoRole` is active -> return demo/local role-filtered classes.
2. Else if Supabase is configured -> attempt `getClasses()`.
3. Use Supabase rows only when read succeeds and returns non-empty data.
4. If Supabase is missing, errors, or returns empty -> fallback to demo/local role-filtered classes.

Note:

- Supabase rows are mapped to existing UI shape (`schedule_note` -> `schedule`) for compatibility.

## 4) How Students fallback works

`dataService.listStudents(user)` now follows guarded fallback rules:

1. If `demoRole` is active -> return demo/local role-filtered students.
2. Else if Supabase is configured -> attempt `getStudents()`.
3. Use Supabase rows only when read succeeds and returns non-empty data.
4. If Supabase is missing, errors, or returns empty -> fallback to demo/local role-filtered students.

Note:

- Supabase rows are mapped to existing UI shape (`full_name` -> `name`) for compatibility.

## 5) Safety rules preserved

- `demoRole` fallback remains active.
- No service role key is used in frontend.
- No real data introduced.
- No writes/inserts/updates/deletes/uploads/messaging added.
- Route guard behavior remains unchanged.
- No real login/auth UI added.

## 6) What remains demo-only

- Dashboard metrics
- Attendance
- Homework
- Parent Updates
- Class Session
- Fee Tracking
- Uploads
- Real login/auth

## 7) Test results

Latest checkpoint verification:

- `npm run build` passed
- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test:supabase:read` passed
  - HQ and Branch Supervisor see approved Sales Kit resources
  - Teacher does not see Sales Kit resources
  - Role-scoped branches/classes/students counts returned for all fake-user roles

## 8) Recommended next milestone

Choose one of:

- Dashboard read-only summary planning (service-layer first, no writes), or
- Pause here before any write operation rollout to validate branch/class/student parity and QA behavior.

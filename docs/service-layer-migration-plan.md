# Service Layer Migration Plan

This plan describes how to replace Base44 with Supabase **behind the existing service layer**.

Do not change UI pages/components directly for database logic. Keep this as preparation-only documentation.

## 1) Current service files

Current core service files:

- `src/services/authService.js`
- `src/services/dataService.js`
- `src/services/classSessionService.js`
- `src/services/permissionService.js`

## 2) Future Supabase service files

Target service files for phased migration:

- `src/api/supabaseClient.js`
- `src/services/supabaseAuthService.js`
- `src/services/supabaseDataService.js`
- `src/services/supabaseClassSessionService.js`
- `src/services/supabaseStorageService.js`

## 3) Migration rule

Pages and components should keep calling services.

- Do not move database logic directly into pages/components.
- Preserve current route behavior and component structure.
- Replace internals behind service interfaces.

## 4) Service migration order

Recommended migration order:

1. auth/profile loading
2. branches/classes/students read methods
3. attendance/homework read methods
4. parent comments and weekly reports read methods
5. class session writes
6. homework attachment upload
7. teacher tasks
8. fee records
9. observations
10. leads/trial schedules
11. report sending later through secure backend/Edge Function

## 5) Base44 dependencies to replace

Replace these dependency areas progressively:

- Base44 auth
- Base44 entities
- Base44 functions
- Base44 file upload
- Base44 invite/user flow
- Base44 report/sending workflows

## 6) Safety rules

Follow these non-negotiable rules during migration:

- Preserve current UI and routes.
- Preserve `demoRole` until real auth is fully tested.
- Use fake seed data first.
- Do not remove Base44 fallback until Supabase parity is confirmed.
- Do not use real data.

## Practical mapping notes

- `authService.js` -> split toward `supabaseAuthService.js` while keeping demo role fallback.
- `dataService.js` -> move read/write methods to `supabaseDataService.js` by domain group.
- `classSessionService.js` -> move session writes to `supabaseClassSessionService.js`.
- Storage-facing helpers -> move to `supabaseStorageService.js`.
- Keep `permissionService.js` role constants/navigation model stable; role values can be sourced from Supabase profiles later.

## Rollout control gates

Before deprecating any Base44 path:

- Feature parity exists for the migrated methods.
- RLS checks pass for HQ, Branch Supervisor, Teacher, Parent, Student.
- Demo mode behavior still works.
- `npm run build`, `npm run lint`, and `npm run typecheck` remain green.

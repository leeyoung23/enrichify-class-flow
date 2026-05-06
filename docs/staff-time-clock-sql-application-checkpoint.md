# Staff Time Clock SQL application checkpoint

This checkpoint records the manual dev-project application result for the Staff Time Clock SQL foundation.

Scope note:

- Documentation only in this step.
- No app UI/runtime/service changes.
- No live location/camera/selfie capture implementation.

## 1) What was applied

- Manually applied SQL draft: `supabase/sql/010_staff_time_clock_foundation.sql`

## 2) Manual Supabase result

- Applied successfully in the dev Supabase project.
- `staff_time_entries` table confirmed.
- `staff_time_adjustment_requests` table confirmed.
- Branch geofence columns from `010` are expected (`latitude`, `longitude`, `geofence_radius_meters`).
- `staff-clock-selfies` private bucket/policy foundation from `010` is expected.

## 3) Security/product intent

- Staff attendance is evidence-based, not button-only.
- GPS/geofence/selfie proof model is planned.
- **Active GPS / geofence verification** at clock-in and clock-out; **location evidence** stored per punch. Default product is **not** continuous background tracking.
- Staff selfies are private-storage scoped.
- HQ has all-branch review scope.
- Branch supervisor has own-branch review scope.
- Staff is scoped to own entries.
- Parent/student access is blocked.

## 4) Service + smoke progress

Implemented:

- Service file: `src/services/staffTimeClockService.js`
  - `clockInStaff(...)`
  - `clockOutStaff(...)`
  - `getStaffTimeSelfieSignedUrl(...)`
- Smoke script: `scripts/supabase-staff-time-clock-smoke-test.mjs`
- Command: `npm run test:supabase:staff-time-clock`
- Smoke inputs remain fake GPS values + fake tiny selfie blob only.

## 5) What remains

- Real mobile clock-in/out UI is not implemented yet.
- Supervisor/HQ review/report runtime UI is not implemented yet.
- Real location/camera capture flow is not implemented yet.

## 6) Recommended next milestone

Recommended next: **Staff Time Clock runtime integration (service wiring into future mobile clock flow), still using controlled fake test data in non-production validation**.

Reason:

- SQL/RLS/storage foundation is in place and service/smoke now exist.
- Next value is controlled runtime wiring without enabling real live location/camera in early validation.

---

Checkpoint status: SQL foundation manually applied in dev; runtime clock flow remains intentionally unimplemented.

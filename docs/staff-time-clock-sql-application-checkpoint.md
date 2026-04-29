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
- Location model remains snapshot-only by default (not continuous tracking).
- Staff selfies are private-storage scoped.
- HQ has all-branch review scope.
- Branch supervisor has own-branch review scope.
- Staff is scoped to own entries.
- Parent/student access is blocked.

## 4) What remains

- Staff Time Clock service write methods are not implemented yet.
- Staff selfie upload/signed URL runtime service is not implemented yet.
- Fake-location/fake-selfie smoke test is not implemented yet.
- Real mobile clock-in/out UI is not implemented yet.
- Supervisor/HQ review/report runtime UI is not implemented yet.

## 5) Recommended next milestone

Recommended next: **Staff Time Clock service + smoke test with fake location and fake selfie blob only**.

Reason:

- SQL/RLS/storage foundation is now in place at draft-applied level in dev.
- Next highest-value checkpoint is proving role-scoped write/read behavior with fake evidence data before UI wiring.

---

Checkpoint status: SQL foundation manually applied in dev; runtime clock flow remains intentionally unimplemented.

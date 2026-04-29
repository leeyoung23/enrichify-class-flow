# Staff Time Clock advanced plan

This document defines advanced Staff Time Clock requirements and architecture for a mobile-first, evidence-based attendance system.

Scope note:

- Planning only in this step.
- No app UI/runtime/service/SQL/storage changes are introduced by this document.

## 1) Product principle

Staff Time Clock should prove attendance fairly, not just record a button click.

Clock-in/out evidence model:

- Authenticated staff identity (`profile_id` from real session JWT).
- Trusted event timestamp (`clock_in_at` / `clock_out_at`).
- Branch context (`branch_id`).
- GPS location snapshot at event time.
- Calculated distance from branch geofence center.
- Location accuracy metadata (meters).
- Selfie proof for identity-at-event.
- Status and exception flags for review workflow.

## 2) Privacy and consent

Privacy requirements:

- Staff must be clearly informed that location and selfie are collected only for attendance proof.
- Default model should avoid continuous live tracking.
- Use point-in-time location snapshots at clock-in and clock-out.
- Selfies must be stored in private storage only.
- Access must be restricted to HQ and relevant branch supervisor scope.
- Parent/student surfaces must never expose staff location/selfie data.
- Retention policy is required in a later compliance phase (for example 60/90/180-day options by legal policy).

Consent and transparency expectations:

- Permission prompts should explain why location/camera are requested.
- UI should show captured accuracy/distance and resulting status.
- Exception handling should be explicit (outside geofence, low accuracy, manual review).

## 3) Recommended model

Recommended operational model:

- Capture location snapshot at clock-in and clock-out.
- Require selfie at clock-in; optional at clock-out (policy switchable later).
- Use branch geofence check against branch latitude/longitude + configured radius.
- Compute status values such as:
  - `valid`
  - `outside_geofence`
  - `pending_review`
  - `approved_exception`
  - `rejected_exception`
- Route non-valid events to supervisor/HQ review queue with auditable decisions.

## 4) Data model proposal

### `staff_time_entries`

Proposed fields:

- `id`
- `profile_id`
- `branch_id`
- `clock_type` (optional) or use separate `clock_in_at`/`clock_out_at` lifecycle
- `clock_in_at`
- `clock_out_at`
- `clock_in_latitude`
- `clock_in_longitude`
- `clock_in_accuracy_meters`
- `clock_in_distance_meters`
- `clock_in_selfie_path`
- `clock_out_latitude`
- `clock_out_longitude`
- `clock_out_accuracy_meters`
- `clock_out_distance_meters`
- `clock_out_selfie_path` (optional)
- `status`
- `exception_reason`
- `reviewed_by_profile_id`
- `reviewed_at`
- `created_at`
- `updated_at`

Recommended constraints (future SQL phase):

- One open entry per staff (`clock_out_at is null`) at a time.
- Immutable evidence fields after submission for non-reviewers.
- Distance and status generated server-side (or verified server-side) to prevent client tampering.

### `branches` additions

- `latitude`
- `longitude`
- `geofence_radius_meters`

### Optional `staff_time_adjustment_requests`

Suggested fields:

- `id`, `entry_id`, `requested_by_profile_id`
- `request_reason`
- `proposed_clock_in_at`, `proposed_clock_out_at`
- `status` (`pending`, `approved`, `rejected`)
- `reviewed_by_profile_id`, `reviewed_at`
- `created_at`, `updated_at`

## 5) Storage proposal

Private bucket:

- `staff-clock-selfies`

Path convention:

- `staff-clock-selfies/{branch_id}/{profile_id}/{date}/{entry_id}-{clock_type}.jpg`

Access rules target:

- Staff can upload selfie for own clock event only.
- Staff may view own selfie (optional by policy; can be restricted).
- Branch supervisor can view own-branch staff clock selfies.
- HQ can view all branches.
- Parent/student blocked.
- Teacher/staff cannot view other staff selfies.

## 6) RLS/security expectations

Data access model:

- HQ: read/report all branches; approve/reject exceptions.
- Branch supervisor: read/review own branch only.
- Staff: create own clock-in/out, read own entries.
- Staff cannot edit submitted location/selfie evidence directly; correction via adjustment request flow.
- Parent/student blocked from staff-time tables and selfie bucket.
- No service role key in frontend; all runtime access must use anon client + end-user JWT.

Security design notes:

- Avoid trusting client-computed distance/status without server validation.
- Use signed URLs for private selfie access.
- Add audit fields for review decisions.

## 7) Mobile-first UX flow

### Staff phone flow

1. Open Staff Time Clock.
2. Tap **Clock In**.
3. Grant location permission.
4. App shows branch, distance, and location accuracy.
5. Take selfie.
6. Submit event.
7. See result (`valid` or `outside branch, pending review`).
8. Repeat similar flow for Clock Out later.

### Supervisor/HQ flow

- Branch-categorized dashboard.
- Exception queue (outside geofence, low accuracy, missing selfie, etc.).
- Late/missed clock-out queue.
- Selfie review per event.
- Export/monthly reporting later.

## 8) Edge cases

- Location permission denied.
- Camera permission denied.
- GPS accuracy too poor.
- Staff at wrong branch.
- Approved remote-work exception scenario.
- Offline/poor network during capture.
- Forgot clock-out.
- Duplicate clock-in attempts with open shift.
- Selfie upload fails after time event capture.
- Clock-in near geofence boundary.
- Device time mismatch (server timestamp should remain source of truth).

## 9) Implementation sequence

- **Phase 1:** Advanced plan (this document).
- **Phase 2:** SQL/storage/RLS draft for staff time + selfie proof model.
- **Phase 3:** Smoke tests for staff clock entry + selfie upload using fake blob data.
- **Phase 4:** Staff mobile clock-in UI mock/local flow (no production writes yet).
- **Phase 5:** Real staff clock-in/out service integration.
- **Phase 6:** Supervisor/HQ review and reporting UI.
- **Phase 7:** Exception and adjustment workflow.
- **Phase 8:** Export/payroll support.

## 10) Validation/test plan (future)

- Staff can create own clock entry.
- Staff cannot create entry for another profile.
- Supervisor can view/review own branch.
- HQ can view all branches.
- Parent/student blocked.
- Fake selfie upload works under private bucket policy.
- Signed URL access works for authorized roles only.
- Outside-geofence status is calculated correctly and consistently.

## 11) Immediate next recommendation

Recommended next: **A. SQL/storage/RLS draft for `staff_time_entries` + `staff-clock-selfies`**.

Why:

- This is the highest-risk foundation for correctness and security before UI wiring.
- Geofence, evidence immutability, role scope, and private selfie access need DB/policy clarity first.
- It keeps scope disciplined: define secure contracts early, then build UI/services against stable constraints.

## 12) Next implementation prompt

Copy-paste prompt for next step (A only):

```text
Implement Staff Time Clock Phase 2 only: SQL/storage/RLS draft for evidence-based clock-in/out.

Constraints:
- Do not change app UI yet.
- Do not add runtime clock-in/out service logic yet.
- Do not access live location or camera.
- Use fake/safe test assumptions only.
- Do not use service role key in frontend.
- Preserve demoRole and demo/local fallback behavior.

Tasks:
1) Draft SQL migration plan for staff time evidence model:
   - New table: staff_time_entries with clock in/out timestamp, location snapshot fields, distance/accuracy, selfie path, status, review fields.
   - Branch geofence fields: latitude, longitude, geofence_radius_meters.
   - Optional table: staff_time_adjustment_requests.
2) Draft RLS policies:
   - HQ all-branch read/review.
   - Branch supervisor own-branch read/review.
   - Staff self create/read only.
   - Parent/student blocked.
   - Prevent direct post-submit evidence edits by staff.
3) Draft storage bucket/policies:
   - Private bucket: staff-clock-selfies.
   - Path convention with branch/profile/date/entry and clock type.
   - Authorized signed URL access only per role scope.
4) Add/update a checkpoint doc summarizing schema + RLS + storage policy decisions and known risk/trade-off items.

Validation:
- SQL lint/review only for this phase.
- No UI build/test required unless app files are changed.
```

---

Planning verdict: Staff Time Clock should be built as an evidence-based attendance system (identity + timestamp + geofence snapshot + selfie + review workflow), not a simple button clock.

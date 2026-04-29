# Staff Time Clock — full vertical checkpoint

This document records the current end-to-end implementation status for the Staff Time Clock vertical.

Scope guardrails for this checkpoint:

- Documentation-only update.
- No app UI or runtime logic changes in this step.
- No new services.
- No SQL or storage policy changes.
- No service role key usage in frontend.
- `demoRole` and demo/local fallback remain unchanged.

---

## 1) What is now implemented

- SQL/RLS/storage foundation for Staff Time Clock is applied in Supabase.
- `staff_time_entries` table is in use for attendance evidence rows.
- `staff-clock-selfies` private bucket is in use for selfie evidence objects.
- Browser location/geofence helpers exist and are integrated in Staff Time Clock flow.
- Browser selfie helper exists and is integrated in Staff Time Clock flow.
- Mobile-first `StaffTimeClock` UI supports explicit GPS/geofence checks.
- Mobile-first `StaffTimeClock` UI supports explicit selfie capture.
- `clockInStaff(...)` and `clockOutStaff(...)` are wired to Supabase with evidence fields.
- Review read methods exist:
  - `listStaffTimeEntries(...)`
  - `getStaffTimeEntryById(...)`
  - `getStaffTimeSummary(...)`
  - `getStaffTimeSelfieSignedUrl(...)`
- HQ/branch supervisor read-only review dashboard is wired.
- Signed selfie viewing for review dashboard is wired via signed URL flow.

---

## 2) End-to-end staff flow

1. Staff opens `Staff Time Clock` on phone.
2. Staff runs explicit clock-in GPS/geofence check.
3. Staff captures clock-in selfie by explicit camera actions.
4. Staff taps Clock In; row is written to `staff_time_entries`.
5. Staff runs explicit clock-out GPS/geofence check.
6. Staff captures clock-out selfie by explicit camera actions.
7. Staff taps Clock Out; same entry is finalized with clock-out evidence.
8. Evidence is stored privately (`staff_time_entries` + private selfie object paths in `staff-clock-selfies`).

---

## 3) HQ/supervisor review flow

- HQ can see all entries visible by RLS.
- Branch supervisor can see own-branch entries visible by RLS.
- Read-only dashboard provides:
  - summary cards
  - basic filters (status/date)
  - responsive entry cards
- Reviewers can view clock-in/clock-out selfie evidence through signed URL actions.
- Dashboard is read-only for now (no approve/reject actions yet).

---

## 4) Privacy/security model

- No continuous/background location tracking.
- GPS/geofence checks run only on explicit user action.
- Selfie camera flow runs only on explicit user action.
- Selfies are stored in a private bucket.
- Evidence access is through signed URLs (time-limited) rather than public objects.
- Frontend uses anon client + end-user JWT only.
- No service role key is used in frontend codepaths.
- Parent/student roles are blocked from staff review data by role/RLS design.
- `demoRole` remains local/mock only (no Supabase write path for demo behavior).

---

## 5) Known limitations / future work

- Review approve/reject actions are not wired yet.
- Missed clock-out action handling is not wired yet.
- Adjustment/correction request workflow is not wired yet.
- Export/monthly reporting is not wired yet.
- Production-grade staff consent wording still needs legal/product finalization.
- GPS/selfie retention policy still needs compliance/legal finalization.
- Stronger server-side geofence validation can be added in a later hardening pass.
- Mobile QA should still be validated on real iOS/Android browsers/devices.

---

## 6) Manual preview checklist

Use demo/dev-safe accounts and fake seed rows only.

- [ ] Log in as teacher/staff on mobile-sized viewport.
- [ ] Allow GPS permission when prompted.
- [ ] Run clock-in GPS/geofence check.
- [ ] Allow camera permission when prompted.
- [ ] Capture selfie and Clock In successfully.
- [ ] Run clock-out GPS/geofence check.
- [ ] Capture selfie and Clock Out successfully.
- [ ] Log in as branch supervisor and verify read-only review dashboard renders entries visible by RLS.
- [ ] Log in as HQ and verify read-only review dashboard renders broader RLS-visible entries.
- [ ] Open clock-in/clock-out selfie from dashboard via signed URL buttons.
- [ ] Switch to `demoRole` and verify no Supabase writes occur.

---

## 7) Recommended next major milestone

Recommend moving to **Memories backend/storage/RLS planning** next, unless there is a product priority to implement Staff Time Clock review actions first.

Why this is the best next step:

- Staff Time Clock is now strong enough for internal prototype walkthroughs (mobile evidence flow + read-only review dashboard).
- Memories is the next parent engagement layer with high cross-role product value.
- Staff Time Clock review actions/export can follow as a focused hardening pass after Memories planning starts.

---

## 8) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Task: Memories backend/storage/RLS planning only.

Constraints:
- Planning/docs only in this step.
- Do not change app UI.
- Do not change runtime logic.
- Do not add runtime services yet.
- Do not apply SQL yet.
- Do not change existing Staff Time Clock runtime paths.
- Do not expose env values or secrets.
- Keep demoRole/demo-local fallback behavior unchanged.

Deliverables:
1) Create/update a planning doc for Memories backend/storage/RLS scope:
   - tables/entities
   - object storage bucket model
   - access model by role (HQ/branch/teacher/parent/student)
   - RLS policy intent matrix
   - upload/read flow boundaries
   - signed URL rules
   - retention/compliance considerations
2) Define phased implementation order (schema -> storage -> service reads/writes -> UI wiring).
3) Include risk list and validation plan for each phase.
4) Include explicit non-goals for this planning phase.

Validation efficiency:
- Docs-only change, run only:
  - git diff --name-only
- Do not run build/lint/test unless runtime files changed.
```


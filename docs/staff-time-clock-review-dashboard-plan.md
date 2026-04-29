# Staff Time Clock — HQ/Supervisor Review Dashboard plan

Planning document for the **review dashboard only** (no runtime implementation in this step).

Scope guardrails:

- No app UI/runtime/service/SQL/storage changes in this doc.
- Use existing anon Supabase client + RLS model only.
- Keep `demoRole` and demo/local fallback behavior unchanged.

Related context:

- `docs/staff-time-clock-advanced-plan.md`
- `docs/staff-time-clock-mobile-flow-checkpoint.md`
- `docs/staff-time-clock-mobile-ui-plan.md`
- `docs/staff-time-clock-browser-permission-plan.md`
- `supabase/sql/010_staff_time_clock_foundation.sql`

---

## 1) Current state

- Staff mobile flow is implemented: explicit GPS/geofence checks and selfie capture in `StaffTimeClock`.
- Clock In / Clock Out submit to Supabase through `clockInStaff(...)` / `clockOutStaff(...)`.
- Punch evidence rows are written to `staff_time_entries` with status and distance/accuracy fields.
- Selfie paths are stored in private bucket `staff-clock-selfies`; signed URL helper exists (`getStaffTimeSelfieSignedUrl`).
- Real branch geofence can load from `branches.latitude/longitude/geofence_radius_meters` for non-demo staff.
- HQ / Branch Supervisor dashboard is still placeholder-only (no live review UI yet).

---

## 2) Target HQ/supervisor review behavior

### HQ Admin target

- See **all branches** in one overview.
- Filter by **branch / date / status**.
- View all staff entries with clock-in/out evidence.
- Inspect status, distance, accuracy, and timestamps.
- Open selfie proof via signed URL (future read wiring).
- Detect and prioritize exceptions: `outside_geofence`, `pending_review`, `missed_clock_out`.
- Exports/monthly reporting added in later phase.

### Branch Supervisor target

- Scope limited to **own branch only**.
- Daily staff attendance list.
- Exceptions queue for own branch.
- Evidence verification/review for own branch staff entries.
- No access to other branch data.

### Staff target

- Only own recent entries (already aligned with RLS intent).
- No cross-staff review authority.

### Parent/Student target

- Blocked from staff time review data.

---

## 3) Dashboard sections (recommended)

1. **Summary cards**
   - Present/on shift
   - Completed shifts
   - Exceptions
   - Missed clock-out
2. **Filter bar**
   - Branch (HQ only or multi-branch roles)
   - Date/day range
   - Status
3. **Exceptions queue**
   - Prioritized list of non-valid entries
4. **Staff time entries list/cards**
   - Desktop table + responsive card fallback
5. **Entry detail panel/drawer**
   - Full evidence details and notes
6. **Selfie evidence view**
   - Signed URL preview flow
7. **Review/approval actions**
   - Later phase (approve/reject/missed clock-out handling)
8. **Export/reporting**
   - Later phase

---

## 4) Data/read method plan

Implemented service methods (Phase 2 read foundation):

- `listStaffTimeEntries({ branchId, date, status, page, pageSize })`
- `getStaffTimeEntryById(entryId)`
- `getStaffTimeSummary({ branchId, dateRange })`
- `getStaffTimeSelfieSignedUrl({ entryId, clockType })` (already available)

Planned read usage in dashboard UI:

- `listStaffTimeEntries(...)` for filtered table/card list.
- `getStaffTimeEntryById(...)` for detail panel.
- `getStaffTimeSelfieSignedUrl(...)` for evidence preview action.
- `getStaffTimeSummary(...)` for summary cards.

Read model rules:

- Use anon client + end-user JWT.
- Rely on RLS for branch/user scope.
- No service role in frontend.
- Keep return shape consistent with existing style: `{ data, error }`.
- Avoid over-fetching fields in list views; fetch detail lazily for entry panel.

---

## 5) Review action plan (future)

Planned methods/actions:

- `approveStaffTimeException({ entryId, note })`
- `rejectStaffTimeException({ entryId, note })`
- `markMissedClockOut({ entryId, note })`
- Adjustment workflow:
  - staff `createAdjustmentRequest(...)` and supervisor/HQ decision flow later

Action design notes:

- Actions should be auditable (`reviewed_by_profile_id`, `reviewed_at`, note/reason trail).
- Status transitions must be explicit and constrained (e.g. `pending_review` -> `approved_exception` / `rejected_exception`).
- Branch supervisor action scope must remain own-branch only.

---

## 6) Mobile/desktop distinction

- Staff punch flow remains **phone-first** (clocking actions).
- HQ/supervisor review is **desktop/laptop friendly** for information density.
- Branch supervisor should remain usable on tablet/phone for urgent review.
- Avoid table-only experience; provide responsive exception cards and detail views.

---

## 7) Privacy/security plan

- Staff selfie objects remain private (`staff-clock-selfies`).
- GPS/selfie evidence visibility:
  - HQ: all branch scope
  - Branch supervisor: own branch scope
  - Staff: own entries only
- Parent/student access remains blocked by RLS/policies.
- No service role in frontend codepaths.
- Review actions need auditable fields and change history semantics.
- Data retention policy remains a future compliance/legal decision.

---

## 8) Recommended implementation sequence

1. **Phase 1 (this doc):** review dashboard plan.
2. **Phase 2 (implemented):** read service + smoke test for `staff_time_entries` visibility and selfie signed URL access.
3. **Phase 3:** HQ/supervisor read-only dashboard (summary + filters + entry list/detail). **UI still future.**
4. **Phase 4:** exception review actions (approve/reject/missed clock-out).
5. **Phase 5:** exports/monthly reporting.
6. **Phase 6:** adjustment request workflow.

Phase 2 artifacts:

- Service reads in `src/services/staffTimeClockService.js`
- Review smoke test: `scripts/supabase-staff-time-clock-review-smoke-test.mjs`
- Script: `npm run test:supabase:staff-time-clock:review`
- Fake/demo test data only; anon key + end-user JWT only.

---

## 9) Next implementation prompt (Phase 2 only)

```text
Implement Staff Time Clock Phase 2 only: review-read service + smoke test.

Constraints:
- Do not change app UI in this phase.
- Do not add review action write methods yet.
- Do not change SQL or storage policies.
- Use anon Supabase client + end-user JWT only (no service role).
- Keep demoRole/demo-local fallback intact.
- Use fake/dev-safe data only for smoke checks.

Tasks:
1) Add read helpers in src/services/supabaseReadService.js for Staff Time Clock review:
   - listStaffTimeEntries({ branchId, date, status, page, pageSize })
   - getStaffTimeEntryById(entryId)
   - (optional wrapper) getStaffTimeSummary({ dateRange, branchId })
   Return { data, error } and keep field selection minimal/safe.

2) Reuse existing getStaffTimeSelfieSignedUrl(...) from staffTimeClockService.js for selfie evidence access checks.

3) Add or extend a smoke script to verify role visibility:
   - HQ sees cross-branch entries
   - Branch Supervisor sees own branch only
   - Teacher sees own entries only
   - Parent/Student blocked
   - Signed URL succeeds only when row visibility allows

4) Add/update docs checkpoint with read-scope results and known gaps before UI phase.

Validation:
- git diff --name-only
- npm run test:supabase:read
- npm run test:supabase:staff-time-clock (only if read path reuses that flow)
- No build/lint/typecheck required if runtime UI is unchanged.
```

---

Planning outcome:

- The next highest-value implementation step is **Phase 2 read service + visibility smoke checks**, so review UI can be built safely on verified RLS scope.

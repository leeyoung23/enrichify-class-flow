# Attendance Supabase write plan

This document plans and tracks the attendance real-write vertical using Supabase anon client + RLS, while keeping current UI contracts and `demoRole` preview behavior unchanged until implementation phases.

Related context:

- `src/pages/Attendance.jsx`
- `src/services/dataService.js`
- `src/services/supabaseReadService.js`
- `src/services/supabaseWriteService.js`
- `supabase/sql/001_mvp_schema.sql`
- `supabase/sql/003_rls_policies_draft.sql`
- `docs/product-feature-gap-audit.md`
- `docs/service-layer-migration-plan.md`
- `docs/first-real-supabase-write-checkpoint.md`

---

## 1) Current attendance behavior

### What UI exists now

- `Attendance` page supports:
  - class selector
  - date selector
  - per-student attendance status buttons (`present`, `absent`, `late`, `leave`)
  - per-student notes field
  - one save action (`Save Demo Changes`)
- Uses React Query for reads and local draft state for edits.

### What is demo/local today

- In `dataService`, attendance reads come from `demoData.attendance` when `demoRole` is active.
- When not in demo mode, current attendance read path still points to Base44 (`base44.entities.Attendance.filter`), not Supabase attendance tables.
- Save actions currently call `classSessionService` helpers (`saveAttendanceRecord`, `saveAttendanceNotes`) and then invalidate query cache.
- Page copy explicitly indicates demo-only behavior today.

### Buttons/actions today

- Per-row status selection buttons:
  - `present`, `absent`, `late`, `leave`
- Notes input per student row.
- One bottom save button:
  - `Save Demo Changes`.

### Roles that can view/edit in current demo behavior

- `canEdit` is `teacher` or `branch_supervisor`.
- HQ currently sees attendance page and records list but not edit controls (`canEdit` false).
- Parent/student do not use this attendance marking page for writes.

---

## 2) Database / RLS readiness

## `attendance_records` table readiness

From `001_mvp_schema.sql`:

- Table: `attendance_records`
- Key fields:
  - `id` (uuid PK)
  - `branch_id` (FK -> `branches.id`)
  - `class_id` (FK -> `classes.id`)
  - `student_id` (FK -> `students.id`)
  - `teacher_id` (FK -> `teachers.id`)
  - `session_date` (date)
  - `status` (`attendance_status` enum)
  - `note` (text)
  - timestamps (`created_at`, `updated_at`)
- Status enum values:
  - `present`, `absent`, `late`, `leave`.

### Relationship shape

- Record is scoped by branch/class/student/session_date and authored/owned operationally by `teacher_id`.
- Existing schema currently has no explicit uniqueness constraint on `(student_id, class_id, session_date)`; this is a risk for upsert strategy (see risks).

### RLS policy readiness (`003_rls_policies_draft.sql`)

- `attendance_select` policy allows read for:
  - HQ (`is_hq_admin`)
  - branch supervisor in own branch
  - teacher for class
  - guardian for linked student
  - student self
- `attendance_modify_teacher` (`for all`) allows write for:
  - HQ
  - branch supervisor in own branch
  - teacher for class
  - mirrored `with check` enforces same scope on resulting rows.

### Role expectation summary

- **HQ**: view all attendance rows; write currently allowed by draft policy.
- **Branch Supervisor**: own-branch view and write allowed by draft policy.
- **Teacher**: assigned-class/student scope view and write allowed by draft policy.
- **Parent/student**: limited read-only by linked/self student; no write policy grant expected.

---

## 3) Recommended first write action

Recommended safest first action:

- **Teacher updates an existing attendance record status/note by `recordId`**.

Why this first (vs upsert first):

1. Lower risk than upsert because existing schema lacks explicit uniqueness guard for session rows.
2. Aligns directly with current UI interaction model (editing rows already loaded for class/date).
3. Easier RLS validation (single-row update by id, class/branch scope enforced).
4. Avoids accidental duplicate inserts until uniqueness strategy is finalized.

Follow-up after initial update path is stable:

- Add explicit insert/upsert path with DB uniqueness constraint (or guarded query+insert flow) for missing rows.

---

## 4) Service layer plan

Add attendance write methods behind service layer (no page-level DB calls), using anon client + RLS only.

Recommended method for phase 2:

- `updateAttendanceRecordStatus({ recordId, status, note })`

Method contract:

- Uses Supabase anon client from `supabaseClient`.
- Updates only safe fields:
  - `status`
  - `note`
  - `updated_at`
- Returns predictable `{ data, error }`.
- Catches exceptions and returns structured error object (no unhandled throw).

Optional follow-up method (after uniqueness decision):

- `upsertAttendanceRecord({ studentId, classId, branchId, teacherId, sessionDate, status, note })`

Constraint:

- Do not use service role key in frontend services/scripts.

---

## 5) UI wiring plan (later implementation)

- Keep `demoRole` mode local/demo only and non-writing.
- For authenticated non-demo teacher/branch-supervisor sessions:
  - invoke Supabase attendance write service on save.
- Add per-row or per-student loading state to avoid broad blocking.
- Show success/error feedback for each saved change batch.
- Refresh attendance list after save via query invalidation/refetch.
- Start with single-row/small-batch safe updates only (no broad bulk mutation at first).

---

## 6) Smoke test plan (future script)

Planned script:

- `scripts/supabase-attendance-write-smoke-test.mjs`

Coverage targets:

1. Teacher can update attendance for assigned class/student row.
2. Branch supervisor can update own branch attendance row (if policy remains allowing it).
3. HQ can read all rows; update check optional based on policy contract.
4. Parent/student cannot write attendance rows.
5. Revert changed rows to original values for repeatability.
6. Use anon key only; never service role key.

---

## 7) Risks

1. **Accidental broad update**
   - Missing tight row filters could update many rows.
2. **`demoRole` writing to Supabase**
   - Must hard-gate demo mode to local-only path.
3. **Teacher vs branch supervisor scope mistakes**
   - Incorrect assumptions can violate branch/class ownership boundaries.
4. **Upsert duplicates**
   - No current unique constraint on attendance session key can create duplicate rows.
5. **Session/date uniqueness ambiguity**
   - Need clear rule: one row per student+class+session_date (or expanded key).
6. **Stale UI state**
   - Save may succeed but view remains stale if refetch/invalidation is incomplete.
7. **Parent/student notes exposure**
   - Attendance note visibility must be reviewed so internal notes are not unintentionally exposed.

---

## 8) Recommended implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** service write method + smoke test only.
- **Status:** Implemented via:
  - `src/services/supabaseWriteService.js` -> `updateAttendanceRecord({ recordId, status, note })`
  - `scripts/supabase-attendance-write-smoke-test.mjs`
  - npm script `test:supabase:attendance:write`
- **Phase 3:** wire Attendance UI for one safe row/action only.
- **Status:** Not started (intentionally deferred).
- **Phase 4:** expand into bulk save/session attendance behaviors.
- **Phase 5:** parent-facing attendance summary refinements later.

---

## 9) Next implementation prompt (Phase 2 only)

Copy-paste prompt:

---

Implement Attendance write foundation only (service method + smoke test), no UI wiring yet.

Constraints:

- Do not change Attendance page UI behavior yet.
- Keep `demoRole` and demo/local fallback unchanged.
- Use Supabase anon client + RLS only.
- Never use service role key in frontend code/scripts.
- Use fake seed users only.

Tasks:

1. Add method in `src/services/supabaseWriteService.js`:
   - `updateAttendanceRecordStatus({ recordId, status, note })`
   - Validate `status` against attendance enum (`present|absent|late|leave`).
   - Update only `attendance_records` safe fields (`status`, `note`, `updated_at`).
   - Return structured `{ data, error }`, catch exceptions safely.

2. Add smoke test script:
   - `scripts/supabase-attendance-write-smoke-test.mjs`
   - Teacher: update allowed row and verify.
   - Branch supervisor: update own-branch row and verify (if policy allows).
   - Parent/student: update denied or 0 rows.
   - Revert all modified rows for repeatability.

3. Add npm script:
   - `test:supabase:attendance:write`

4. Run:
   - `npm run build`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:supabase:read`
   - `npm run test:supabase:auth`
   - `npm run test:supabase:tasks:write`
   - `npm run test:supabase:attendance:write`

Do not add runtime attendance UI writes in this phase.

---

*Document type: planning only; no runtime behavior changes are introduced by this file.*

## Implementation status snapshot

- Service write method implemented:
  - `updateAttendanceRecord({ recordId, status, note })`
  - validates allowed status values (`present|absent|late|leave`)
  - updates safe fields only (`status`, `note`, `updated_at`)
  - returns predictable `{ data, error }`, catches exceptions safely
- Authenticated smoke test implemented:
  - teacher can update visible attendance row and revert
  - parent/student write attempts are blocked (RLS error or 0 visible updated rows)
- UI wiring still intentionally not done:
  - Attendance page remains unchanged in this phase
  - `demoRole` remains local/demo only and does not write

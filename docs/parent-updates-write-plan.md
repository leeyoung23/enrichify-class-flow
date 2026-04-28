# Parent Updates Supabase write plan

This document plans the Parent Updates real save/release vertical using Supabase anon client + RLS, while preserving current UI contracts, `demoRole` behavior, and local/demo fallback.

Scope constraints for this plan:

- Planning only (no runtime/UI changes in this step).
- Do not remove `demoRole`.
- Do not remove demo/local fallback.
- Do not add uploads in this phase.
- Do not call AI APIs in this phase.
- Do not use service role key in frontend/runtime scripts.

---

## 1) Current Parent Updates behavior

### Quick Parent Comment workflow (current)

In `src/pages/ParentUpdates.jsx`, teacher flow for Quick Parent Comment is:

1. Select class + student.
2. Enter teacher lesson note (`notes`).
3. Generate demo AI draft (`generateParentMessage` in `dataService`, local string generation).
4. Edit final message.
5. Optionally fill approved text and shared/released text.
6. Trigger one of three actions:
   - Save Draft (`status: edited`)
   - Approve Comment (`status: approved`)
   - Approve & Release to Parent (`status: shared`)

Writes currently go through `createParentUpdate(data)` from `src/services/dataService.js`.

### Weekly Progress Report workflow (current)

In `src/pages/ParentUpdates.jsx`, Weekly Progress Report flow uses fixed template state:

1. Teacher generates demo weekly draft.
2. Teacher marks report approved in local component state.
3. Teacher releases to parent, which currently calls `createParentUpdate(...)` with:
   - `update_type: 'weekly_report'`
   - `status: 'shared'`
   - serialized weekly content fields

### What is demo/local right now

- `demoRole` is first-priority and uses `demoData.parentUpdates` via `listParentUpdates`.
- Parent/student visibility in demo is filtered to `approved`/`shared` only.
- AI generation is demo/local string generation only (`generateParentMessage`); no external AI API call.
- Weekly draft generation and approval state are local UI state transitions.

### What buttons/actions exist now

Quick Parent Comment actions:

- `Generate AI Comment Draft`
- `Save Draft`
- `Approve Comment`
- `Approve & Release to Parent`
- `Back to Note`
- `Discard`

Weekly Progress Report actions:

- `Generate Weekly Report Draft`
- `Approve Weekly Report`
- `Release to Parent`

### How teacher approval/release is represented now

- Represented by `status` transitions in update rows (`edited` -> `approved` -> `shared`) and text fields (`approved_report`, `shared_report`).
- Parent/student read filtering relies on status checks in demo role paths.
- Non-demo currently uses Base44 entity path for parent updates, not Supabase write/read services yet.

---

## 2) Database / RLS readiness

### `parent_comments` table readiness

From `supabase/sql/001_mvp_schema.sql`:

- Core fields:
  - `id`
  - `branch_id`
  - `class_id`
  - `student_id`
  - `teacher_id`
  - `comment_text`
  - `status communication_status` (default `draft`)
  - `created_at`, `updated_at`

### `weekly_progress_reports` table readiness

- Core fields:
  - `id`
  - `branch_id`
  - `class_id`
  - `student_id`
  - `teacher_id`
  - `week_start_date`
  - `report_text`
  - `status communication_status` (default `draft`)
  - `created_at`, `updated_at`

### Related student/class/branch scope fields

Both tables carry `branch_id`, `class_id`, and `student_id`, which matches role-scoped access patterns already used in attendance/homework policies.

### Status / approval field readiness

- Both tables use `communication_status` enum:
  - `draft`
  - `ready_for_review`
  - `approved`
  - `released`
  - `shared`
- This aligns with teacher approval gate and parent-visible release states.

### RLS policy readiness (`supabase/sql/003_rls_policies_draft.sql`)

`parent_comments`:

- `parent_comments_select`:
  - HQ: allowed
  - Branch Supervisor (own branch): allowed
  - Teacher for class: allowed
  - Parent/student: only when `status in ('approved', 'released', 'shared')` and linked to student
- `parent_comments_modify_teacher` (`for all`):
  - HQ, own-branch supervisor, teacher-for-class allowed with mirrored `with check`

`weekly_progress_reports`:

- `weekly_reports_select`:
  - Same role model as parent comments
  - Parent/student restricted to approved/released/shared only
- `weekly_reports_modify_teacher` (`for all`):
  - HQ, own-branch supervisor, teacher-for-class allowed with mirrored `with check`

### Role expectations summary

- HQ can review all parent updates.
- Branch Supervisor can review/act within own branch.
- Teacher can act on assigned class/student scope.
- Parent can read approved/released/shared updates for linked child only.
- Student should remain conservative/read-only, same released-status gate as parent.

---

## 3) Recommended first write action

Options considered:

- A: save/update Quick Parent Comment draft
- B: approve/release existing Quick Parent Comment
- C: weekly report draft/release

Recommended first write: **Option A — save/update Quick Parent Comment draft**.

Why this is safest first:

1. Smallest vertical and lowest blast radius (single table, single text payload, single status transition to `draft`/`ready_for_review` style behavior).
2. Avoids early parent-visibility risk while still proving authenticated teacher write path.
3. Mirrors successful pattern used by MyTasks and Attendance: one scoped update action under RLS.
4. Weekly reports include larger templated payload shape and more process states, so they are better as a follow-up phase.
5. Release action can be Phase 2.5/3 once draft-write and read visibility checks are stable.

---

## 4) Service layer plan

Implement future write methods in `src/services/supabaseWriteService.js` only (not page-level DB logic), using Supabase anon client + authenticated JWT + RLS.

Candidate methods:

- `updateParentCommentDraft({ commentId, content, status })`
- `releaseParentComment({ commentId })`
- `updateWeeklyProgressReport({ reportId, fields, status })`

Method behavior requirements:

- Validate IDs and status values against allowed enum set.
- Restrict updates to safe writable fields per method scope.
- Return predictable `{ data, error }`.
- Catch exceptions safely; no uncaught throw at callsite.
- No service role key in frontend/runtime scripts.

Suggested first implementation scope (Phase 2):

- One method for Quick Parent Comment draft save/update only.
- Optional second method for release only after draft path and smoke tests are stable.

---

## 5) UI wiring plan (future phase)

- Keep `demoRole` as first-priority local/demo only behavior.
- Keep demo/local fallback in place when Supabase path is unavailable.
- For authenticated non-demo teacher sessions, route save/release actions through service-layer Supabase write methods.
- Add per-action loading states to prevent duplicate writes.
- Show success/error feedback per action.
- Parent and student views must only show approved/released/shared records.
- No automatic sending to parent; teacher/staff approval gate remains required.

---

## 6) Smoke test plan

Implemented script:

- `scripts/supabase-parent-updates-write-smoke-test.mjs`

Current coverage targets:

1. Teacher can update assigned-student draft parent comment and verify.
2. Parent cannot read draft update.
4. Parent cannot write parent comments.
5. Student remains conservative/read-only with no write access.
6. Revert changed rows for repeatability.
7. Use anon key only; never service role key.

Deferred to later phase:

- release-to-parent read verification (after release method implementation).

---

## 7) Risks

1. Draft exposure risk: parent accidentally sees non-released comments.
2. Status ambiguity risk: inconsistent mapping between UI statuses and DB enum statuses.
3. Scope risk: teacher writes comment for non-assigned student/class.
4. Approval bypass risk: release action without teacher/staff approval gate.
5. Demo boundary risk: `demoRole` path accidentally writing to Supabase.
6. Weekly template complexity risk: large text payload and status handling create early coupling.
7. AI confusion risk: AI draft content mistaken for approved/released teacher content.

---

## 8) Recommended implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** service write method + smoke test for Quick Parent Comment only.
  - **Status:** Implemented.
  - `src/services/supabaseWriteService.js` -> `updateParentCommentDraft({ commentId, message, status })`
  - `scripts/supabase-parent-updates-write-smoke-test.mjs`
  - npm script `test:supabase:parent-updates:write`
- **Phase 3:** wire Parent Updates Quick Comment save/release UI.
  - **Status:** Not started (intentionally unchanged in this checkpoint).
- **Phase 4:** weekly report real save/release path.
- **Phase 5:** AI draft via Edge Function later.
- **Phase 6:** Memories attachment later.

---

## 9) Next implementation prompt (Phase 2 only)

Copy-paste prompt:

---

Implement Parent Updates write foundation for **Quick Parent Comment only** (service method + smoke test), no UI wiring yet.

Constraints:

- Do not change Parent Updates page UI behavior yet.
- Keep `demoRole` and demo/local fallback unchanged.
- Use Supabase anon client + RLS only.
- Never use service role key in frontend code/scripts.
- Use fake seed users only.
- Do not add weekly report writes in this phase.
- Do not add AI API calls.

Tasks:

1. Add method in `src/services/supabaseWriteService.js`:
   - `updateParentCommentDraft({ commentId, content, status })`
   - Validate status against allowed communication statuses for draft lifecycle (for example: `draft|ready_for_review|approved` depending on chosen checkpoint scope).
   - Update only safe fields in `parent_comments`:
     - `comment_text`
     - `status`
     - `updated_at`
   - Return structured `{ data, error }` with safe exception handling.

2. Add smoke test script:
   - `scripts/supabase-parent-updates-write-smoke-test.mjs`
   - Teacher: update assigned student draft comment and verify.
   - Parent: cannot read draft comment.
   - Parent: cannot write.
   - Student: cannot write.
   - (Optional in this phase) Parent can read only after status transitions to released/shared.
   - Revert modified rows for repeatability.

3. Add npm script:
   - `test:supabase:parent-updates:write`

4. Run:
   - `npm run build`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:supabase:read`
   - `npm run test:supabase:auth`
   - `npm run test:supabase:tasks:write`
   - `npm run test:supabase:attendance:write`
   - `npm run test:supabase:parent-updates:write` (after script exists)

Do not add runtime parent update UI writes in this phase.

---

*Document type: planning only; no runtime behavior changes are introduced by this file.*

## Implementation status snapshot

- Service write method implemented:
  - `updateParentCommentDraft({ commentId, message, status })`
  - validates allowed `communication_status` values
  - updates safe fields only (`comment_text`, `status`, `updated_at`)
  - returns predictable `{ data, error }` with safe exception handling
- Authenticated smoke test implemented:
  - teacher can update visible `parent_comments` draft row and verify
  - parent cannot read draft row
  - parent/student write attempts are blocked (RLS error or 0 visible updated rows)
  - teacher revert step restores original row for repeatability
- UI wiring still intentionally not done:
  - Parent Updates page remains unchanged in this phase
  - release/approval runtime wiring remains later
  - AI remains demo/local only

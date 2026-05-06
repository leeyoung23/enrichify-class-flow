# Weekly Progress Report Supabase write/release plan

This document defines the planning-only path for Weekly Progress Report real Supabase save/release, while preserving current behavior constraints:

- Keep `demoRole` first-priority and local/demo only.
- Keep demo/local fallback intact.
- Do not add runtime writes in this step.
- Do not call AI APIs.
- Do not add uploads.
- Do not use service role key in frontend.
- Do not use real data.

## 1) Current Weekly Progress Report behavior

Weekly Progress Report currently runs inside `src/pages/ParentUpdates.jsx` as a fixed-template, mostly local/demo workflow:

- Fixed template fields in local state:
  - `weekRange`
  - `learningFocus`
  - `strengths`
  - `areasToImprove`
  - `teacherComment`
  - `suggestedHomePractice`
  - `nextWeekFocus`
  - local `status` (Draft/Ready for Review/Approved)
- Demo/local generation:
  - `Generate Weekly Report Draft` updates local component state only.
  - Teacher comment can be auto-filled locally in demo mode.
- Approve/release buttons exist:
  - `Approve Weekly Report` changes local status to Approved.
  - `Release to Parent` currently uses legacy `createParentUpdate(...)` payload as `update_type: 'weekly_report'`.
- Not currently persisted to Supabase:
  - No dedicated write/update to `weekly_progress_reports`.
  - No dedicated release transition in `weekly_progress_reports`.
  - No dedicated service-layer methods for weekly report draft/release yet.
  - Current weekly flow is still demo/local + legacy fallback behavior.

## 2) Database / RLS readiness

### `weekly_progress_reports` table readiness

From `supabase/sql/001_mvp_schema.sql`, the table already exists with core columns:

- Identity/scope:
  - `id`
  - `branch_id`
  - `class_id`
  - `student_id`
  - `teacher_id`
- Report content:
  - `week_start_date`
  - `report_text`
- Status:
  - `status communication_status` (default `draft`)
- Timestamps:
  - `created_at`
  - `updated_at`

### Status field / communication status

- Uses shared enum `communication_status`:
  - `draft`
  - `ready_for_review`
  - `approved`
  - `released`
  - `shared`
- This supports teacher draft -> approval -> release progression.

### Student/class/branch/teacher relationships

- Strong relational coverage exists through non-null foreign keys:
  - `branch_id -> branches.id`
  - `class_id -> classes.id`
  - `student_id -> students.id`
  - `teacher_id -> teachers.id`
- This aligns with existing role-scoped access conventions already used by attendance and parent comments.

### RLS select/modify rules

From `supabase/sql/003_rls_policies_draft.sql`:

- `weekly_reports_select` allows:
  - HQ admin
  - branch supervisor in branch scope
  - teacher for class
  - parent/student only if status is parent-visible (`approved`, `released`, `shared`) and linked to that student
- `weekly_reports_modify_teacher` allows writes for:
  - HQ admin
  - branch supervisor in branch scope
  - teacher for class
  - with matching `using` + `with check` constraints

### Parent visibility rules

- Parent/student cannot read weekly drafts under current RLS design.
- Parent/student visibility starts only from parent-visible statuses.
- This is consistent with current parent-comment release model and should be preserved for weekly reports.

## 3) Recommended first write action

Options:

- Option A: save/update Weekly Progress Report draft
- Option B: release existing Weekly Progress Report

Recommended first step: **Option A (save/update draft first).**

Why this is safest:

- Smaller blast radius: no immediate parent-facing visibility change.
- Confirms table/field mapping and RLS write behavior before release logic.
- Establishes deterministic teacher-authored draft persistence before status promotion.
- Reuses proven pattern from existing Parent Comment draft-first rollout.
- Reduces risk of accidental early parent exposure from status mistakes.

## 4) Service layer plan

Add weekly report write methods in `src/services/supabaseWriteService.js` (future phase), following existing write service patterns:

- `updateWeeklyProgressReportDraft({ reportId, fields, status })`
- `releaseWeeklyProgressReport({ reportId, fields })`

Service rules:

- Use Supabase anon client + authenticated JWT + RLS.
- Never use service role key in frontend/runtime paths.
- Validate inputs (`reportId`, status, field shapes).
- Update only safe fields (`report_text`, `status`, `updated_at`, and any explicitly mapped approved-safe fields).
- Return predictable `{ data, error }`.
- Catch exceptions and convert to safe structured errors.

Field mapping recommendation:

- Keep a single canonical serialized `report_text` for initial write/release phases.
- Maintain deterministic formatter from template fields to `report_text`.
- Defer schema expansion (separate per-field DB columns) until after stable write/release lifecycle and tests.

## 5) UI wiring plan

Future runtime wiring (not in this planning-only phase):

- Keep `demoRole` local/demo only and non-writing.
- Authenticated non-demo teacher:
  - Save Draft routes to `updateWeeklyProgressReportDraft(...)`.
  - Release routes later to `releaseWeeklyProgressReport(...)` setting parent-visible status.
- Parent view:
  - Sees released/parent-visible weekly reports only.
- UX behavior:
  - Add loading state for save/release actions.
  - Show success/error toast per action outcome.
  - Prevent duplicate submits while in-flight.
- No auto-send behavior:
  - No automatic email/WhatsApp.
  - No AI API call yet.

## 6) Smoke test plan

Future script:

- `scripts/supabase-weekly-report-write-smoke-test.mjs`

Coverage:

1. Teacher can update weekly report draft.
2. Parent cannot see draft.
3. Teacher can release weekly report.
4. Parent can see released report.
5. Parent/student cannot write weekly report rows.
6. Script reverts original content/status for repeatability.
7. Script uses anon auth only (no service role key).

## 7) Risks

- Complex report field mapping can cause content mismatch.
- Draft might be accidentally exposed by wrong status transition.
- Wrong status value may bypass intended lifecycle.
- Release may happen without true approval guard if UI/state checks are weak.
- Parent may see another child’s report if student linkage filters are wrong.
- AI draft content may be mixed with teacher-approved report content if boundaries are unclear.

## 8) Recommended implementation sequence

- Phase 1: planning doc (`docs/weekly-progress-report-write-plan.md`) - current phase.
- Phase 2: service write methods + smoke test (`updateWeeklyProgressReportDraft` + weekly write smoke). - implemented.
- Phase 3: wire Weekly Progress Report Save Draft in UI for authenticated non-demo teacher only. - implemented.
- Phase 4: wire Weekly Progress Report Release in UI with parent-visible status transition. - implemented.
- Phase 5: AI generation later via secure Edge Function (server-side only, approval-gated).

## 9) Next implementation prompt (Phase 2 only)

Copy-paste prompt:

---

Implement **Phase 2 only** for Weekly Progress Report real Supabase write foundation (service methods + smoke test), no UI wiring yet.

Project constraints:

- Keep `demoRole` as local/demo-only and non-writing.
- Keep demo/local fallback.
- Do not add UI runtime wiring yet.
- Do not call AI APIs.
- Do not add uploads.
- Do not use real data.
- Never use service role key in frontend/runtime scripts.

Tasks:

1. In `src/services/supabaseWriteService.js`, add:
   - `updateWeeklyProgressReportDraft({ reportId, fields, status })`
   - `releaseWeeklyProgressReport({ reportId, fields })`
2. Method behavior:
   - Validate `reportId`, required fields, and allowed `communication_status`.
   - Serialize template fields into deterministic `report_text`.
   - Update safe fields only (`report_text`, `status`, `updated_at`).
   - Return `{ data, error }` consistently.
   - Catch exceptions safely.
3. Add smoke script:
   - `scripts/supabase-weekly-report-write-smoke-test.mjs`
4. Smoke coverage:
   - Teacher can update draft.
   - Parent cannot read draft.
   - Teacher can release.
   - Parent can read released.
   - Parent/student cannot write.
   - Revert original row data/status.
5. Add npm script:
   - `test:supabase:weekly-report:write`
6. Run:
   - `npm run build`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:supabase:read`
   - `npm run test:supabase:auth`
   - `npm run test:supabase:tasks:write`
   - `npm run test:supabase:attendance:write`
   - `npm run test:supabase:parent-updates:write`
   - `npm run test:supabase:weekly-report:write`

Do not change app UI in this phase.

---

## Implementation status snapshot

- Phase 2 implemented:
  - `src/services/supabaseWriteService.js`
    - `updateWeeklyProgressReportDraft({ reportId, reportText, status })`
    - `releaseWeeklyProgressReport({ reportId, reportText })`
  - `scripts/supabase-weekly-report-write-smoke-test.mjs`
  - npm script: `test:supabase:weekly-report:write`
- Weekly Progress Report UI wiring now implemented for authenticated non-demo users when a real Supabase-backed `weekly_progress_reports.id` is available:
  - Save Draft -> `updateWeeklyProgressReportDraft(...)`
  - Release to Parent -> `releaseWeeklyProgressReport(...)`
  - demoRole path remains local/demo-only and non-writing.
- AI generation remains demo/local only (no AI API wiring in this phase).
- Memories attachment remains future scope (not wired here).

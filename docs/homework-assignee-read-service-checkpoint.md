# Homework Assignee Read Service Checkpoint

## 1) What was implemented

Homework assignee-aware read support is now implemented at service + smoke-test level (no UI wiring in this milestone):

- added assignee-aware read methods in `src/services/supabaseReadService.js`
- added dedicated assignee-read smoke test in `scripts/supabase-homework-assignees-read-smoke-test.mjs`
- added npm command `test:supabase:homework:assignees:read` in `package.json`
- updated related homework/RLS/handoff checkpoint docs for continuity

This step is service-proof focused only. No app UI changes, no runtime page behavior changes, no SQL/RLS changes, and no SQL apply actions were performed here.

## 2) Files changed in implementation milestone

- `src/services/supabaseReadService.js`
- `scripts/supabase-homework-assignees-read-smoke-test.mjs`
- `package.json`
- `docs/homework-task-assignees-sql-application-checkpoint.md`
- `docs/homework-flexible-assignment-data-model-review.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

## 3) Read methods added

- `listHomeworkTaskAssignees({ homeworkTaskId, studentId, classId, status })`
- `listAssignedHomeworkForStudent({ studentId, classId, status })`

## 4) Read method behavior

- Supabase anon client + current JWT only
- no service role usage
- stable return shape: `{ data, error }`
- UUID validation for supported filter inputs
- optional filters are applied safely
- selected/individual assignment visibility uses explicit assignee rows
- class-scope fallback is supported for `assignment_scope = 'class'`
- duplicate prevention exists between explicit assignee rows and class fallback rows
- no create/update/delete writes occur inside read methods

## 5) Assignee visibility behavior

- parent/student scope remains RLS-governed
- selected/individual assignment visibility depends on explicit assignee rows
- class-scope homework remains compatible without requiring per-student assignee rows
- parent assigned-but-not-submitted visibility is now service-testable

## 6) Smoke test coverage

`scripts/supabase-homework-assignees-read-smoke-test.mjs` covers:

- parent linked-child assignee visibility
- class-scope task visibility without assignee row
- selected-student assigned visibility before submission
- unassigned selected-student blocking
- teacher assigned-class visibility
- branch supervisor own-branch visibility
- optional HQ visibility
- optional unrelated-parent blocking
- cleanup behavior for temporary fake/dev fixtures

## 7) CHECK/WARNING notes

- parent linked-student fixture unavailability currently produces a safe `CHECK` skip in the assignee-read smoke flow
- existing unrelated-user credential warnings in upload smoke remain expected in environments without those optional credentials
- no policy broadening or scope weakening was introduced

## 8) Tests executed in implementation milestone

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:assignees:read`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`

## 9) What remains future

- write-side assignment services (selected students / individual assignment creation flows)
- tracker-focused methods:
  - `listHomeworkTrackerByClass`
  - `listHomeworkTrackerByStudent`
- Teacher Homework `By Task` / `By Student` UI wiring
- parent assigned-but-not-submitted UI consumption from assignee-aware reads
- manual marked-file upload path
- AI marking integration with flexible assignment context

## 10) Recommended next milestone

Recommendation: **A. Tracker-focused read methods (`listHomeworkTrackerByClass` / `listHomeworkTrackerByStudent`)**.

Why A first:

- assignee-aware baseline reads now exist and are smoke-testable
- tracker methods can normalize both legacy submission-centric rows and new flexible assignee model
- stabilizing tracker data shape before UI wiring reduces regressions and rework
- parent/teacher view wiring should follow once tracker outputs are stable and validated

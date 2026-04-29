# Homework Task Assignees SQL Application Checkpoint

## 1) Application summary

- Applied SQL file: `supabase/sql/017_homework_task_assignees_foundation.sql`
- Application mode: manual Supabase SQL Editor execution in dev only
- SQL Editor result: successful execution
- Production status: not applied to production
- Runtime/UI/service status in this step: unchanged (docs checkpoint only)

## 2) Manual verification confirmed

Manual verification screenshots confirmed:

- `public.homework_task_assignees` table exists
- `public.homework_tasks.assignment_scope` column exists
- `homework_task_assignees` RLS policies exist
- patched `homework_submissions_insert_014` policy exists
- helper/alignment functions exist:
  - `homework_task_assignee_alignment_is_valid_017`
  - `enforce_homework_task_assignee_alignment_017`
  - `homework_task_assignee_branch_id`
  - `can_access_homework_assignee`
  - `can_access_homework_task_assignment`

## 3) Schema additions now active in dev

- Additive `homework_tasks.assignment_scope` with values:
  - `class`
  - `selected_students`
  - `individual`
  - `curriculum_profile`
- New `public.homework_task_assignees` table
- Unique assignment guard: `unique(homework_task_id, student_id)`
- `assignment_status` values:
  - `assigned`
  - `submitted`
  - `under_review`
  - `returned_for_revision`
  - `reviewed`
  - `feedback_released`
  - `archived`
- Alignment guard trigger path:
  - `homework_task_assignee_alignment_is_valid_017(...)`
  - `enforce_homework_task_assignee_alignment_017()`
  - insert/update trigger on `homework_task_assignees`

## 4) Flexible homework behavior now supported at DB level

Foundation is now available in dev database for:

- class-level homework targeting
- selected-student homework targeting
- individual homework targeting
- assigned-but-not-submitted visibility foundation via assignee rows
- future `By Task` / `By Student` tracker views

## 5) Class-scope behavior

- `assignment_scope = 'class'` keeps class-level compatibility.
- Class-level homework should not require explicit assignee rows for every student.
- `selected_students` and `individual` scopes should require explicit assignee rows.

## 6) Parent/student submission behavior

`homework_submissions_insert_014` remains scoped and now assignment-aware:

- parent/student relationship check remains required (linked-child/self)
- `submitted_by_profile_id = auth.uid()` remains required for parent/student
- task status/alignment gate remains required (`homework_task_allows_submission(...)`)
- assignment semantics now checked via `can_access_homework_task_assignment(...)`
- unassigned `selected_students`/`individual` submissions should be blocked

## 7) RLS/privacy posture in dev

- HQ: full scope
- branch supervisor: own-branch scope
- teacher: assigned-class scope
- parent: linked-child read-only on assignees
- student: self read-only on assignees
- parent/student cannot write assignee rows
- no cross-family visibility expected

## 8) What remains unwired

- assignee-aware homework read service methods
- create/assign homework flow for selected students
- teacher `By Task` / `By Student` tracker UI wiring
- parent assigned-but-not-submitted listing sourced from assignee rows
- manual marked-file upload path wiring
- AI marking flow using flexible assignment context

## 9) Recommended next milestone

Recommendation: **Homework assignee-aware read service + smoke test**.

Why this next:

- SQL/RLS foundation is now applied in dev
- service-level read proof should be established before UI changes
- highest-risk path is assigned-but-not-submitted visibility correctness
- this protects both parent visibility and teacher tracker behavior

## 10) Next implementation prompt (copy/paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
<fill-latest-commit>

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Homework assignee-aware read service + smoke test only.

Scope rules:
- Do not change app UI.
- Do not change runtime logic outside homework read-service scope.
- Do not add unrelated services.
- Do not change Supabase SQL in this step.
- Do not change RLS policies in this step.
- Do not apply SQL automatically.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Use fake/dev data only.

Inspect:
- supabase/sql/014_homework_upload_review_foundation.sql
- supabase/sql/015_fix_homework_upload_rls_policies.sql
- supabase/sql/016_fix_homework_parent_submission_insert.sql
- supabase/sql/017_homework_task_assignees_foundation.sql
- src/services/supabaseUploadService.js
- docs/homework-task-assignees-sql-application-checkpoint.md

Deliverables:
1) Add assignee-aware homework read methods (service layer only):
   - list assigned homework for student/parent scope from `homework_task_assignees`
   - preserve class-scope compatibility
2) Add fake/dev smoke test that validates:
   - assigned-but-not-submitted tasks are returned correctly
   - selected/individual unassigned tasks are not returned
   - parent linked-child scope and no cross-family leakage
3) Documentation checkpoint update with smoke evidence.
4) No UI wiring in this step.

Validation efficiency rule:
- If runtime/service files changed, run targeted checks only.
- If docs-only, run only: git diff --name-only
```

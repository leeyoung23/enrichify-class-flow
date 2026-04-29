# Homework Selected Assignment Write Service Plan

## 1) Current state

- Teacher Homework `By Task` and `By Student` read/tracker views now exist in `src/pages/Homework.jsx`.
- Flexible homework SQL/RLS (`017`) is applied in dev and `homework_task_assignees` exists.
- Selected/individual assignment rows can be read through:
  - `listHomeworkTaskAssignees(...)`
  - `listAssignedHomeworkForStudent(...)`
  - `listHomeworkTrackerByClass(...)`
  - `listHomeworkTrackerByStudent(...)`
- Write services for creating/assigning selected-student homework are not implemented yet.

## 2) Product purpose

Teachers/supervisors need a safe assignment input path to create homework for:

- whole class
- selected students
- individual student

This is operationally required because enrichment students frequently follow different school/syllabus homework expectations inside one class group.  
Read/tracker visibility is now present; assignment write services are the missing input path for flexible homework.

## 3) Assignment creation model

Planned model for future implementation:

1. Create homework task row in `homework_tasks`.
2. Assign to whole class via `assignment_scope = 'class'`.
3. Assign to selected students via:
   - `assignment_scope = 'selected_students'`
   - `homework_task_assignees` rows for each student.
4. Assign to one student via:
   - `assignment_scope = 'individual'`
   - one `homework_task_assignees` row.
5. Keep `curriculum_profile` assignment scope as future-only.

## 4) Service methods to add later

Recommended future methods:

- `createHomeworkTaskWithAssignees({ branchId, classId, title, instructions, subject, dueDate, assignmentScope, studentIds })`
- `assignHomeworkTaskToStudents({ homeworkTaskId, studentIds, dueDate, notes })`
- `updateHomeworkTaskAssignees({ homeworkTaskId, studentIds })`
- `archiveHomeworkTaskAssignee({ assigneeId })`
- `updateHomeworkAssigneeStatus({ assigneeId, status })`

Notes:

- MVP should prioritize creation paths first.
- Update/archive methods can be staged after creation reliability is proven.

## 5) Minimum MVP service scope

First implementation should support only:

- create class-level task
- create selected-student task
- create individual task
- insert `homework_task_assignees` rows for selected/individual
- no complex assignment editing in MVP
- no destructive deletes of real rows; prefer `archived` lifecycle where needed

## 6) RLS/security expectations

- HQ can create/manage across branches.
- Branch supervisor can create/manage within own branch.
- Teacher can create/manage assigned class only if product role policy allows.
- Parent/student cannot create assignment rows.
- No cross-branch/class/student assignment writes.
- Existing alignment trigger in `017` must keep task/class/branch/student consistency enforcement active.

## 7) Validation rules

Future write service validation should include:

- UUID validation for `branchId`, `classId`, `homeworkTaskId`, `studentIds`, `assigneeId`
- non-empty `title`
- `assignmentScope` allowed values only (`class`, `selected_students`, `individual`)
- `selected_students` and `individual` require `studentIds`
- `class` assignment may omit assignee rows
- deduplicate `studentIds`
- reject empty selected-student list
- `dueDate` optional, but strict date validation when provided

## 8) Status behavior

- New assignee rows start at `assignment_status = 'assigned'`.
- Class-level task status remains task-level (`assigned/open`) in existing flow.
- Submission/review/release lifecycle (`submitted`, `under_review`, `reviewed`, `feedback_released`) should continue to be driven by submissions/feedback process.
- Avoid conflicting dual status sources where possible; keep assignment status minimal in MVP.

## 9) Parent visibility

After assignment write is added:

- parent should see assigned-but-not-submitted tasks through assignee-aware reads
- parent upload should remain limited to linked child + assigned/open task
- no visibility to other children or unassigned tasks

## 10) Teacher tracker impact

- `By Task` should correctly show selected-student assignment counts.
- `By Student` should show assigned-but-not-submitted items before upload.
- Old-style quick tracker becomes meaningful for individual and small-group homework.

## 11) Manual marking future

- Teacher manual marked-file upload remains separate future scope.
- Assignment write services should not attempt manual marked-file upload in this phase.

## 12) AI future

- AI should later consume assignment scope + assignee context.
- Selected/individual assignment context can improve student-specific draft quality.
- Teacher/staff approval remains mandatory before any parent-visible output.

## 13) Smoke test plan

Plan future smoke script:

- `scripts/supabase-homework-assignment-write-smoke-test.mjs`

Coverage goals:

- branch supervisor creates selected-student task
- assignee rows created correctly
- linked parent can read assigned task before submission
- unassigned parent/student cannot read selected task
- teacher assigned class can read selected task
- cleanup/archive temporary fake rows
- no service-role usage
- fake/dev data only

## 14) Implementation sequence

- Phase 1: this plan
- Phase 2: write service methods + smoke test
- Phase 3: write-service checkpoint documentation
- Phase 4: Teacher assignment-creation UI planning
- Phase 5: minimal assignment-creation UI
- Phase 6: manual marked-file upload planning

## 15) Recommended next milestone

Recommendation: **Selected-student assignment write service + smoke test**.

Why next:

- read/tracker views are now wired and stable enough for input-path completion
- assignment creation is the next missing workflow step
- smoke proof should happen before UI wiring
- preserves input -> process -> output integrity

## 16) Next implementation prompt

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

Selected-student assignment write service + smoke test only.

Do not change app UI.
Do not add assignment creation UI in this step.
Do not change Supabase SQL.
Do not change RLS policies.
Do not apply SQL.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values or passwords.
Do not commit .env.local.
Do not upload files.
Do not use service role key.
Do not remove demoRole.
Do not remove demo/local fallback.
Use fake/dev data only.

Inspect:
- src/services/supabaseWriteService.js
- src/services/supabaseReadService.js
- src/services/supabaseUploadService.js
- supabase/sql/017_homework_task_assignees_foundation.sql
- docs/homework-selected-assignment-write-service-plan.md
- docs/homework-tracker-read-service-checkpoint.md

Deliverables:
1) Add write service methods for assignment creation MVP:
   - class task creation path
   - selected_students task creation path
   - individual task creation path
   - assignee row insertion for selected/individual
2) Add strict validation:
   - UUID checks
   - assignmentScope rules
   - non-empty title
   - dedupe student IDs
3) Add smoke script:
   - scripts/supabase-homework-assignment-write-smoke-test.mjs
4) Add package command:
   - test:supabase:homework:assignment:write
5) Update checkpoint docs (write-service milestone only).

Validation:
- before tests: git diff --name-only
- run:
  - npm run build
  - npm run lint
  - npm run typecheck
  - npm run test:supabase:homework:assignment:write
  - npm run test:supabase:homework:tracker:read
  - npm run test:supabase:homework:assignees:read
- do not run unrelated full suites unless shared behavior changed.
```

## 17) Implementation checkpoint (write-service MVP)

Write-service MVP is now implemented in `src/services/supabaseWriteService.js`:

- `createHomeworkTaskWithAssignees({ ... })`
- `assignHomeworkTaskToStudents({ ... })`

Current implemented MVP behavior:

- class-level task creation with `assignment_scope = 'class'` and no required assignee rows
- selected-student task creation with `assignment_scope = 'selected_students'` and explicit assignee row inserts
- individual task creation with `assignment_scope = 'individual'` and exactly one assignee row
- strict validation for UUIDs, title, assignment scope, student ID dedupe, and optional `YYYY-MM-DD` due date
- anon client + JWT + RLS only (no service-role use)
- explicit safe rollback limitation note when task insert succeeds but assignee insert fails

Smoke checkpoint:

- `scripts/supabase-homework-assignment-write-smoke-test.mjs`
- package command: `npm run test:supabase:homework:assignment:write`

Scope note:

- assignment creation UI remains future
- manual marked-file upload remains future
- AI provider integration remains future
- Announcements/Internal Communications remains future

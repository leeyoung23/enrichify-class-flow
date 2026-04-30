# Selected Homework Assignment Write Service Checkpoint

## 1) What was implemented

Selected homework assignment write-service MVP is now implemented and verified at service + smoke-test level.

- selected-student assignment write path is implemented
- individual assignment write path is implemented
- class-level assignment creation path is implemented
- implementation used anon client + JWT only
- no app UI/runtime behavior changes were made in this milestone
- no SQL/RLS changes were made in this milestone

## 2) Files changed

- `src/services/supabaseWriteService.js`
- `scripts/supabase-homework-assignment-write-smoke-test.mjs`
- `package.json`
- `docs/homework-selected-assignment-write-service-plan.md`
- `docs/homework-tracker-read-service-checkpoint.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

## 3) Write methods added

- `createHomeworkTaskWithAssignees({ branchId, classId, title, instructions, subject, dueDate, assignmentScope, studentIds, notes })`
- `assignHomeworkTaskToStudents({ homeworkTaskId, branchId, classId, studentIds, dueDate, notes })`

## 4) Validation and safety rules

- anon client + JWT only
- no service role
- stable `{ data, error }` response shape
- UUID validation
- non-empty title validation
- `assignmentScope` restricted to `class` / `selected_students` / `individual`
- `selected_students` requires non-empty `studentIds`
- `individual` requires exactly one `studentId`
- class scope does not require assignee rows
- student ID dedupe
- `dueDate` strict `YYYY-MM-DD` validation when provided
- no destructive delete
- no unsafe raw SQL

## 5) Assignment creation behavior

- class scope creates `homework_tasks` row with `assignment_scope='class'`
- selected_students creates task + `homework_task_assignees` rows
- individual creates task + one `homework_task_assignees` row
- assignee rows include `homework_task_id`, `branch_id`, `class_id`, `student_id`, `assigned_by_profile_id`, `assignment_status='assigned'`, optional `due_date`, optional `notes`
- assignment relies on `017` alignment trigger and RLS
- if assignee insert fails after task insert, service returns safe rollback limitation note without service-role cleanup

## 6) Smoke test coverage

- branch supervisor selected-student task creation
- `assignment_scope` verification
- assignee row verification
- visibility through `listAssignedHomeworkForStudent(...)`
- visibility through `listHomeworkTrackerByClass(...)`
- visibility through `listHomeworkTrackerByStudent(...)`
- individual task creation
- class-level task creation without assignee requirement
- parent/student write blocked checks
- teacher write check as `PASS` or `CHECK` depending current RLS
- cleanup via normal RLS scope only

## 7) CHECK/WARNING notes

- optional parent linked-student fixture unavailable `CHECK` appeared in current environment
- existing unrelated fixture warnings remain non-blocking
- npm warning `unknown env config devdir` is non-blocking
- no unsafe access regression observed

## 8) Tests

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:assignment:write`
- `npm run test:supabase:homework:tracker:read`
- `npm run test:supabase:homework:assignees:read`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`

## 9) What remains

- Teacher assignment creation UI wiring is now started in `Homework` using `createHomeworkTaskWithAssignees(...)` for authenticated non-demo save.
- Remaining UI work is polish/refinement:
  - selected-student creation UX polish
  - edit/archive assignment UI
- manual marked-file upload path
- parent assigned homework UX polish
- AI marking using flexible assignment context
- real AI provider integration
- Announcements/Internal Communications later

## 10) Recommended next milestone

Recommendation: **A. Teacher assignment creation UI planning**

Why A first:

- backend input path now exists
- UI should be planned before wiring creation controls
- assignment creation UI must support class / selected students / individual
- this completes teacher-side flexible homework loop before manual marked-file and AI provider work

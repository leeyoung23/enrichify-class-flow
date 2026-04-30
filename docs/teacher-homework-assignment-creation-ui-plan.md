# Teacher Homework Assignment Creation UI Plan

## 1) Current state

- `Homework` page already has `By Task` and `By Student` views.
- Selected/individual assignment write services now exist in `src/services/supabaseWriteService.js`.
- Teacher assignment creation UI does not exist yet.
- Existing review/release workflow already exists and is currently preserved in `Homework`.
- Parent upload/status/released-feedback display already exists in `ParentView`.

## 2) Product purpose

Teachers/supervisors/HQ need a clear, reliable input path for creating homework assignments directly inside the teacher workflow.

This is required because enrichment operations often run mixed school/syllabus expectations in one class. Assignment creation must support:

- class-level homework
- selected-student homework
- individual homework

The UI should explicitly reflect this mixed-school/mixed-syllabus reality without overloading staff with technical complexity.

## 3) User roles

Planned creation access by role:

- Teacher:
  - can create homework for assigned classes only, if current RLS permits.
- Branch supervisor:
  - can create/manage homework for own branch.
- HQ:
  - can create/manage homework across branches.
- Parent/student:
  - no homework creation access.

## 4) UI placement

Recommended placement in `Homework`:

- add a primary `Create Homework` button in the `By Task` workspace header area.
- optionally expose a context action from `By Student` for quick individual assignment prefill.
- keep creation controls out of the review detail panel to avoid mixing assignment input with submission review/release output actions.

## 5) Creation flow

Planned creation form fields:

- assignment type: `Whole class` / `Selected students` / `Individual student`
- class selector
- student selector (shown only for selected/individual modes)
- title
- subject
- instructions
- due date
- optional notes
- optional future curriculum/profile context slot (non-blocking placeholder)
- actions: `Save` / `Cancel`

Flow intent:

1. staff opens `Create Homework`.
2. staff selects assignment type and class.
3. student selection appears only when needed.
4. staff fills task fields and submits.
5. success closes form and refreshes trackers.

## 6) Assignment type behavior

Whole class:

- uses `assignment_scope = class`
- no explicit assignee rows required

Selected students:

- uses `assignment_scope = selected_students`
- `studentIds` required
- supports multiple student selection

Individual:

- uses `assignment_scope = individual`
- requires exactly one `studentId`

## 7) Student selection UX

Planned UX:

- searchable student list/cards for quick filtering
- future-friendly student context row (school/profile/year) when available
- selected count summary
- clear selected students action
- avoid dense table-first UI on mobile; prefer card/list selection

## 8) Validation and user messaging

Planned validation:

- title required
- class required
- selected/individual types require student selection
- due date format validation

Planned messaging:

- safe error toasts on validation/write failure
- success toast on create
- no raw IDs in user-facing labels
- no confusing AI language in assignment creation form

## 9) Data/service mapping

Primary service for UI wiring:

- `createHomeworkTaskWithAssignees(...)`

Possible future service usage:

- `assignHomeworkTaskToStudents(...)` for later reassignment/expansion flows

Field mapping:

- `branchId`
- `classId`
- `title`
- `instructions`
- `subject`
- `dueDate`
- `assignmentScope`
- `studentIds`
- `notes`

## 10) Success behavior

Planned post-create behavior:

- close creation form
- refresh `By Task` tracker query
- refresh `By Student` tracker query when relevant
- show new task in tracker cards/lists
- no parent notification in this phase (future notification module only)

## 11) demoRole behavior

Demo behavior should remain local-only:

- local fake creation simulation only
- no Supabase writes
- no real files
- no provider/API calls
- create a local fake task row when feasible for preview continuity
- clearly indicate demo-only behavior in UI messaging

## 12) Mobile-first design

Planned mobile-first shape:

- modal or slide-over/card form
- stacked fields with short labels
- touch-friendly student selection controls
- compact confirmation summary before save
- avoid dense tables and overly wide layouts

## 13) Safety / output integrity

Assignment creation UI is input-only.

Safety posture:

- parent visibility remains through linked-child RLS/read paths only
- review/release workflow continues to control feedback output
- no auto-release behavior introduced
- no AI generation during assignment creation

## 14) What not to include yet

- edit/archive complex assignment management
- manual marked-file upload
- AI marking provider integration
- automatic parent notification/email
- bulk import
- curriculum auto-assignment

## 15) Implementation sequence

Recommended sequence:

- Phase 1: this plan
- Phase 2: demo-safe UI shell for `Create Homework`
- Phase 3: wire real `createHomeworkTaskWithAssignees(...)`
- Phase 4: tracker refresh after create
- Phase 5: selected-student UX polish
- Phase 6: edit/archive later
- Phase 7: manual marked-file upload later

## 16) Recommended next milestone

Recommendation: **A. Create Homework UI shell with demo parity**

Why A first:

- creation UX should be previewed safely before real writes
- demo parity prevents confusing split workflows
- real write service is ready, but UI shape should be validated first
- follows the same safe implementation pattern used previously on Homework milestones

## 17) Next implementation prompt

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
Create Homework UI shell with demo parity only.

Do not wire real create writes yet.
Do not change runtime review/release behavior.
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
Use fake/dev/demo data only.

Inspect:
- docs/teacher-homework-assignment-creation-ui-plan.md
- src/pages/Homework.jsx
- src/services/supabaseWriteService.js
- src/services/supabaseReadService.js

Deliverables:
1) Add Create Homework shell entry points in Homework UI:
   - primary button in By Task area
   - optional By Student individual-prefill entry point
2) Add demo-safe Create Homework form shell:
   - assignment type selector
   - class selector
   - conditional student selector
   - title/subject/instructions/due date/notes fields
   - save/cancel actions
3) Demo-only behavior:
   - local fake create simulation only
   - no Supabase writes
   - no provider calls
4) Keep review/release workflow unchanged.
5) Add/update checkpoint docs for this shell milestone.

Validation efficiency rule:
- If docs-only, run: git diff --name-only
- If UI/runtime files changed, run:
  - npm run build
  - npm run lint
  - npm run typecheck
```

## 18) Implementation checkpoint (Create Homework UI shell)

Implemented in this milestone:

- `Create Homework` shell is now added in `Homework` with clear entry point near the tracker controls.
- shell is separate from the submission review/release panel to avoid workflow clutter.
- form fields now include:
  - assignment type (`class` / `selected_students` / `individual`)
  - class selector
  - conditional student selector for selected/individual
  - title, subject, instructions, due date, optional notes
  - `Save` / `Cancel`
- assignment-type behavior now follows this plan in UI validation:
  - class: no student selection required
  - selected_students: one or more students required
  - individual: exactly one student required
- demo mode remains local-only:
  - save simulates local success and appends fake task/assignee rows
  - no Supabase writes
  - no upload
  - no provider/API call
- authenticated non-demo mode is intentionally preview-only:
  - save is blocked with safe "wiring coming next" messaging
  - `createHomeworkTaskWithAssignees(...)` is not called yet

Still future:

- real create-write wiring to `createHomeworkTaskWithAssignees(...)`
- manual marked-file upload path
- AI provider integration

# Homework Flexible Assignment Data Model Review

## 1) Current schema summary

Current homework data model is:

- `homework_tasks`
  - task/request metadata scoped by `branch_id` + `class_id`
  - title/instructions/subject/due_date/status
- `homework_submissions`
  - per-student submission rows linked to `homework_task_id`
  - includes `student_id`, `class_id`, lifecycle status, review fields
- `homework_files`
  - metadata for files linked to `homework_submission_id`
  - private bucket path model and signed URL usage
- `homework_feedback`
  - draft/approved/released feedback linked to submission
  - `internal_note` protected from parent-visible path

## 2) Current limitation

Current model is strong for class-task review lifecycle, but limited for enrichment-centre flexibility:

- `homework_tasks` is class-bound (`class_id`) with no first-class assignment scope.
- Assigned-but-not-submitted student-specific tasks cannot be shown reliably.
- Selected-student/small-group assignment is not first-class.
- Parent visibility currently depends too much on existing submission rows.
- AI marking context stays generic when assignment scope (class vs individual vs group) is unclear.

## 3) Desired assignment model

Model should support:

- class-level task
- individual student task
- selected students/small-group task
- future curriculum/profile-based task targeting

## 4) Recommended schema direction

Use additive-only direction (no destructive replacement).

### Option A: `assignment_scope` on `homework_tasks` + new `homework_task_assignees` join table

Pros:

- one task can target class, selected students, or one student
- avoids duplicating task content rows
- allows assigned-but-not-submitted visibility via assignee rows
- supports future per-student assignment/tracker status
- fits current task/submission/feedback lifecycle with additive migration

Cons:

- requires additional RLS + service queries for assignee lifecycle
- requires transition logic while legacy submission-derived views still exist

### Option B: separate `homework_assignments` table (task content + assignee split)

Pros:

- can be explicit and flexible for advanced assignment abstraction
- clean separation between reusable task template vs assignment instances

Cons:

- bigger migration complexity from current shape
- higher service/UI blast radius early
- risk of duplicating content semantics across tables during transition

### Recommendation

Recommend **Option A**:

- `homework_task_assignees` join table with optional `assignment_scope` on `homework_tasks`.

Why:

- safest additive path on top of existing production-like flow
- enables selected-student and individual targeting without task duplication
- enables parent assigned visibility before submission exists
- preserves current tables and service contracts during staged migration

## 5) Proposed table/fields

For `homework_task_assignees` (additive proposal):

- `id`
- `homework_task_id`
- `branch_id`
- `class_id`
- `student_id`
- `assigned_by_profile_id`
- `assignment_status`
- `due_date_override` (nullable)
- `created_at`
- `updated_at`

Suggested `assignment_status` values:

- `assigned`
- `submitted`
- `under_review`
- `returned_for_revision`
- `reviewed`
- `feedback_released`
- `archived`

Status placement recommendation:

- Source-of-truth review lifecycle remains in `homework_submissions.status` (existing operational flow).
- `homework_task_assignees.assignment_status` can be:
  - either denormalized tracker state updated by workflow actions, or
  - computed in a future view from latest submission/feedback state.

Safe MVP recommendation:

- keep submission lifecycle in `homework_submissions`
- keep assignee status minimal (`assigned`/`archived`) initially or derived
- avoid immediate dual-write complexity in first schema slice

## 6) Submission relationship

Plan:

- `homework_submissions` remains tied to `homework_task_id` + `student_id`.
- Assignee rows define assignment visibility and expected recipients.
- Submission row is created when parent/student uploads (or staff creates review record, if allowed later).
- Assigned-but-not-submitted visibility should come from assignee rows, not forced placeholder submission rows.

## 7) Manual marked-file path

Future attachment roles needed:

- `parent_uploaded_homework`
- `teacher_marked_homework`
- `feedback_attachment`

Recommendation:

- keep within `homework_files` first using additive `file_role`/`file_type` column(s), linked to submission (and optional feedback linkage later).
- Consider separate table only if file-role behavior becomes substantially different.

## 8) Parent visibility

Parent model should be:

- parent sees tasks assigned to linked child via assignee rows
- parent sees linked-child submissions only
- parent sees released feedback only
- parent does not see internal notes or unassigned tasks

## 9) Teacher/HQ/supervisor behavior

Teacher:

- can create/assign for own assigned class/students (policy-scoped)
- can operate By Task and By Student trackers
- can review submissions and release through existing gate controls

Branch supervisor:

- own-branch assignment/review oversight

HQ:

- cross-branch oversight by policy

## 10) RLS implications

Future policy direction (additive):

- assignee select for linked parent child only
- assignee select/manage for assigned-class teacher only
- assignee manage/read for own-branch supervisor
- assignee read/manage for HQ
- parent/student submission insert only for assigned tasks in-scope
- strict no cross-family visibility
- preserve internal note protection and release gating

## 11) Service implications

Future service work likely needed:

- `createHomeworkTask` with assignment scope support
- `assignHomeworkToStudents`
- `listAssignedHomeworkForStudent`
- `listHomeworkTasks` with assignee-aware visibility
- `listHomeworkTrackerByClass`
- `listHomeworkTrackerByStudent`
- optional `updateAssigneeStatus` (if not fully derived)

## 12) UI implications

Future teacher UI:

- Homework tabs: `By Task` / `By Student`
- quick tracker board aligned with operational statuses
- assignment modal (whole class / selected students / one student)

Future parent UI:

- assigned homework from assignee rows
- upload for assigned/open tasks only
- released feedback/attachments only after release gate

## 13) AI implications

Flexible assignment model improves AI quality:

- AI can distinguish class vs individual vs small-group context
- curriculum/student profile context can be attached more accurately
- reduces generic feedback generation
- teacher approval remains mandatory

## 14) Migration/additive safety

Safety plan:

- no destructive table changes
- retain existing `homework_tasks`/`homework_submissions`/`homework_files`/`homework_feedback`
- add assignment table/fields incrementally
- backfill fake/dev assignments later
- keep old flows operational during transition

## 15) Recommended next milestone

Recommendation: **A. Draft additive SQL/RLS patch for `homework_task_assignees`**.

Why A first:

- schema support is required before reliable student/small-group assignment visibility
- services and UI should be built on explicit assignment semantics, not submission-side inference
- additive SQL/RLS draft can be prepared safely without runtime/UI breakage

## 16) SQL application checkpoint (manual/dev-first)

- Applied file: `supabase/sql/017_homework_task_assignees_foundation.sql`.
- `017` has now been manually applied in Supabase dev (SQL Editor success).
- Application checkpoint is recorded at `docs/homework-task-assignees-sql-application-checkpoint.md`.
- Production apply remains out of scope.
- Validation intent remains fake/dev data only before runtime migration.
- Student-specific and selected-student assignment support is now active at DB schema level in dev through:
  - additive `homework_tasks.assignment_scope`
  - new `homework_task_assignees` table + helper functions + RLS
  - assignee row alignment enforcement (task + student must match branch/class scope)
- Existing homework runtime/UI workflow remains unchanged until explicit service/UI migration.
- Parent assigned-but-not-submitted visibility should later read from `homework_task_assignees`, not only from submission rows.

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

Homework flexible assignment SQL/RLS draft patch only (additive).

Hard constraints:
- Do not change app UI.
- Do not change runtime logic.
- Do not apply SQL automatically.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role in frontend.
- Use fake/dev data only.

Inspect:
- supabase/sql/014_homework_upload_review_foundation.sql
- supabase/sql/015_fix_homework_upload_rls_policies.sql
- supabase/sql/016_fix_homework_parent_submission_insert.sql
- docs/homework-flexible-assignment-data-model-review.md

Deliverables:
1) Add a new additive SQL draft file for flexible assignments (manual/dev-first):
   - add `assignment_scope` to `homework_tasks` (safe default for existing rows)
   - add `homework_task_assignees` table
   - add helper functions needed for assignment visibility checks
   - add RLS policies for assignee table and assignment-aware visibility gates
2) Keep existing homework tables/flows compatible.
3) Do not remove existing homework policies yet; extend safely.
4) Include inline comments explaining migration/backfill approach (fake/dev only).
5) Do not apply SQL; draft only.

Validation efficiency rule:
- Docs/SQL-draft only.
- Run only: git diff --name-only
```

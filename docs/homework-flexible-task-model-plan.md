# Homework Flexible Task Model Plan

## 1) Problem statement

Enrichment-centre students may come from different schools, forms/years, syllabi, and homework expectations. A single class-wide homework task model is not enough for real operations because some homework is shared by class, some is student-specific, and some is assigned to small groups.

## 2) Current model

Current end-to-end flow is:

- homework task
- homework submission
- homework file upload
- teacher/staff review
- feedback release gate
- parent display (released only)

This is stable for class-level homework but rigid for mixed-assignment enrichment scenarios.

## 3) Required homework assignment types

Target assignment model should support:

- class-level homework
- student-specific homework
- selected-student/small-group homework
- curriculum/profile-based assignment logic later

## 4) Teacher tracking views

Recommend two primary staff views:

### A) By Homework Task

- Best for class-wide homework.
- Shows submission progress for one task.
- Useful for review queue and release workflow at task level.

### B) By Student

- Best for enrichment/school-specific homework.
- Shows each student’s assigned tasks, submission status, files, and feedback history.
- Helps staff manage mixed-school homework obligations in one class.

Quick status tracker should include:

- Submitted
- Not Submitted
- Under Review
- Returned
- Feedback Released
- Follow-up Needed

## 5) Homework creation flow

Teacher/HQ/supervisor creation options should support:

- assign to whole class
- assign to selected students
- assign to one student
- optional due date
- optional instructions
- optional curriculum/school profile context
- optional file attachment later

## 6) Manual marking path

Manual-first path should remain a first-class workflow:

1. Teacher marks homework manually outside app.
2. Teacher uploads marked PDF/image (future attachment field/path).
3. Teacher writes feedback and/or next step.
4. Teacher releases to parent through existing human gate.
5. AI remains optional and never required for completion.

## 7) AI marking path

AI-assisted path should remain strictly approval-gated:

- AI drafts marking/feedback from available evidence/context.
- Later phases may include OCR/rubric analysis.
- Teacher must review/edit/approve before release.
- No auto-release.

## 8) Parent workflow

Parent-side expectations:

- parent sees only homework assigned to their linked child
- parent uploads homework when requested
- parent sees status transitions
- parent sees released feedback and optionally marked file only after release

## 9) Data model implications

Current `homework_tasks` + `homework_submissions` + `homework_files` + `homework_feedback` model is strong for class-task + submission lifecycle, but has limitations for flexible assignment targeting:

- `homework_tasks` currently binds directly to one `class_id` and has no assignment scope metadata.
- No explicit assignment table exists for selected-student/small-group targeting.
- `listHomeworkTasks({ studentId })` currently derives task visibility from existing submissions, which makes "assigned but not yet submitted" weak for student-specific assignment use cases.
- Manual marked-file attachment is not explicitly modeled in feedback yet.

Future schema-review candidates (no SQL change in this step):

- `assignment_scope` field (`class`, `selected_students`, `individual`)
- `task_student_assignments` join table (task <-> student)
- optional `manually_marked_file_id` or feedback attachment path
- optional `curriculum_profile_id` linkage for assignment intent/context

## 10) RLS/privacy implications

Must preserve and extend existing boundaries:

- parent linked-child only
- teacher assigned-class/student only
- branch supervisor own branch
- HQ all branches
- no cross-family visibility
- internal notes protected
- marked files private until released

## 11) UI implications

Future homework UI should include:

- Homework tabs: `By Task` / `By Student`
- quick status board aligned with operational review states
- review detail panel for files/feedback/actions
- parent-safe output separation
- mobile-first card layout (teacher + parent flows)

## 12) AI implications

AI quality depends on structured context:

- school/curriculum profile
- task instructions
- uploaded work evidence
- teacher observation
- previous feedback

Without this structure, AI marking will remain generic and weak, especially in mixed-syllabus enrichment settings.

## 13) Recommended next milestone

Recommendation: **A. SQL/data model review for student-specific assignments**.

Reason:

- Current schema/service behavior is class-task centric.
- Student task visibility currently depends on existing submissions, which is not sufficient for robust "assigned-but-not-submitted" student/small-group flows.
- A controlled data-model review first is safer than UI prototyping over ambiguous assignment semantics.

## 14) SQL draft progress checkpoint

- Manual/dev-first additive SQL draft is now prepared at `supabase/sql/017_homework_task_assignees_foundation.sql`.
- The draft is not auto-applied and should be reviewed/manual-run in dev only.
- Scope drafted in SQL:
  - optional `homework_tasks.assignment_scope` (`class`, `selected_students`, `individual`, `curriculum_profile`)
  - new `homework_task_assignees` join table
  - assignment helper functions + assignee RLS policies
  - alignment guard for task/class/branch/student consistency in assignee rows
- Runtime services and UI remain unchanged in this step.
- Parent assigned-but-not-submitted task visibility should later be sourced from assignee rows.

## 15) Next implementation prompt

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

Homework flexible assignment data-model review only.

Do not change app UI.
Do not change runtime logic.
Do not change Supabase SQL in this step.
Do not change RLS policies in this step.
Do not add services.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values or passwords.
Do not commit .env.local.
Do not upload files.
Use fake/dev data only.

Inspect:
- supabase/sql/014_homework_upload_review_foundation.sql
- src/services/supabaseUploadService.js
- src/services/supabaseWriteService.js
- src/pages/Homework.jsx
- src/pages/ParentView.jsx
- docs/homework-flexible-task-model-plan.md

Deliverables:
1) A schema-review document that compares:
   - keep current model and emulate flexible assignment via submissions
   - add assignment_scope + task_student_assignments join model
   - hybrid transitional option
2) For each option, include:
   - pros/cons
   - RLS implications
   - migration complexity
   - parent/teacher UX impact
3) Recommend one safe MVP schema direction for:
   - class tasks
   - selected students
   - individual assignments
4) No runtime or SQL implementation yet (planning only).

Validation efficiency rule:
- Docs-only change.
- Run only: git diff --name-only
```

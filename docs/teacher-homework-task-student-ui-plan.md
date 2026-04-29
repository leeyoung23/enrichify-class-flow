# Teacher Homework Task Student UI Plan

## 1) Current state

- `Homework` page already has staff review UI in `src/pages/Homework.jsx`.
- Backend/service flow exists for task -> submission -> file -> feedback -> release.
- Flexible assignment SQL/RLS (`017`) is applied in dev.
- Assignee/tracker reads now exist:
  - `listHomeworkTaskAssignees(...)`
  - `listAssignedHomeworkForStudent(...)`
  - `listHomeworkTrackerByClass(...)`
  - `listHomeworkTrackerByStudent(...)`
- Current UI is not yet organized around explicit `By Task` / `By Student` tracker shape.

## 2) Product problem

Enrichment operations are mixed-context by default:

- students may come from different schools/forms/syllabi in one class
- not all students receive identical homework
- teachers need both:
  - task-first workflow to manage review/release execution
  - student-first workflow to quickly monitor completion gaps

Old-style quick student status rows are operationally useful and should return, but now based on safe tracker reads and flexible assignment semantics.

## 3) Proposed UI structure

Recommend `Homework` page segmented into:

- `By Task`
- `By Student`
- `Review Queue` (either dedicated tab or persistent right panel mode)

Practical structure:

- top segmented tabs for `By Task` and `By Student`
- shared review detail panel on selection
- optional queue chip/filter area retained for workflow speed

## 4) By Task view

Purpose: class/task-level operational control (best for class-wide homework).

Planned surface:

- task list/cards (title, scope badge, due date, status)
- per-task status counts from tracker:
  - assigned
  - submitted
  - under review
  - returned
  - reviewed/feedback released
  - not submitted
- selected task detail area:
  - assignee list + submission state
  - submission list for that task
  - direct entry to review actions

This view remains the primary entry for review/release operations.

## 5) By Student view

Purpose: quick completion and follow-up tracking (best for mixed-syllabus enrichment classes).

Planned surface:

- student list/cards
- per-student assigned homework items (including assigned-but-not-submitted)
- compact status badges
- quick tracker states:
  - Submitted
  - Not Submitted
  - Under Review
  - Returned
  - Feedback Released
  - Follow-up Needed

This reintroduces the useful old-style student tracker in a safer flexible-assignment model.

## 6) Review detail panel (preserve existing workflow)

Preserve existing detail/actions panel behavior:

- selected submission detail
- attachment preview/open (signed URL model)
- feedback text
- next step
- internal note (staff-only)
- actions:
  - save draft
  - mark reviewed
  - return for revision
  - release to parent (role-gated)
- mock AI draft button remains optional + teacher-editable only

No auto-save and no auto-release behavior is introduced.

## 7) Data methods to use

Tracker reads:

- `listHomeworkTrackerByClass(...)`
- `listHomeworkTrackerByStudent(...)`

Current task/submission detail reads:

- `listHomeworkTasks(...)`
- `listHomeworkSubmissions(...)`
- `listHomeworkFiles(...)`
- `listHomeworkFeedback(...)`

Current write actions:

- existing feedback/submission write methods in `src/services/supabaseWriteService.js`

Integration rule:

- tracker methods drive summary rows and quick status chips
- existing detail reads/writes drive review panel actions

## 8) demoRole behavior

For `demoRole` and local preview:

- render local fake `By Task` and `By Student` views
- no Supabase calls/writes
- no real provider calls
- mock AI remains local-only editable helper
- preserve demo/local fallback behavior currently used in `Homework.jsx`

## 9) Mobile-first design

Mobile:

- segmented tabs at top
- card-first layout for tasks/students
- touch-friendly status chips and action buttons
- avoid dense tables

Desktop:

- split layout (left list + right review detail) where practical
- keep list scanning and action depth visible together

## 10) Parent safety / output integrity

Safety model remains unchanged:

- teacher actions affect parent output only through release gate
- `internal_note` remains internal/staff-only
- draft feedback remains hidden from parent path
- parent sees released feedback only
- no AI auto-release path

## 11) Manual marking future

Plan to support manual marking in parallel with AI:

- teacher uploads manually marked file later
- marked files remain private until explicit release-compatible state
- manual marking is not replaced by AI

## 12) AI future

- AI draft remains optional support only
- flexible task/student context should later inform AI drafts
- teacher review/approval remains mandatory
- no real provider call in this planning step

## 13) Implementation sequence

- Phase 1: this plan
- Phase 2: UI shell with demo parity (`By Task` / `By Student` structure only)
- Phase 3: wire `By Task` tracker read
- Phase 4: wire `By Student` tracker read
- Phase 5: preserve/fit existing review detail actions into new layout
- Phase 6: selected-student assignment creation services later
- Phase 7: manual marked-file upload later

## 14) Recommended next milestone

Recommendation: **A. Teacher Homework By Task / By Student UI shell with demo parity**

Why A first:

- planning now transitions safely into a visible shell
- demo parity provides quick UX validation without RLS/runtime risk
- real data wiring can follow section-by-section
- avoids breaking current review workflow while layout evolves

## 15) Next implementation prompt (A only)

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

Teacher Homework By Task / By Student UI shell with demo parity only.

Do not change Supabase SQL.
Do not change RLS policies.
Do not apply SQL.
Do not add write-side selected-student assignment services in this step.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values or passwords.
Do not commit .env.local.
Do not use service role key.
Do not remove demoRole.
Do not remove demo/local fallback.
Use fake/dev data only.

Inspect:
- docs/teacher-homework-task-student-ui-plan.md
- src/pages/Homework.jsx
- src/services/supabaseReadService.js
- src/services/supabaseUploadService.js
- src/services/supabaseWriteService.js

Deliverables:
1) Add `By Task` / `By Student` shell in `Homework.jsx` with mobile-first segmented tabs.
2) Keep current review detail actions intact.
3) Keep demoRole local-only preview parity for both tabs.
4) Do not wire full tracker reads yet beyond safe placeholder/demo shape in this phase.

Validation:
- before tests: git diff --name-only
- run build/lint/typecheck if runtime files changed
- do not run unrelated full suites
```

## Implementation checkpoint (A shell)

Status update:

- Teacher Homework UI shell now includes explicit `By Task` / `By Student` segmented structure in `src/pages/Homework.jsx`.
- Demo parity is now expanded with local fake data for:
  - task cards/scope/counts and selected task detail
  - student cards/per-student items/status badges and quick tracker feel
- Existing review detail/actions remain preserved in the same page flow.
- Mock `Draft feedback with AI` remains local/provider-free and teacher-editable.
- Real tracker read wiring is intentionally deferred to a future phase.
- Selected-student assignment write services remain future.
- Manual marked-file upload remains future.

# Parent Homework Upload/Status UI Plan

## 1) Current backend/staff state

- Parent direct submission works in dev under linked-child scope.
- Parent homework file upload works in dev with private bucket + signed URL access path.
- Teacher Homework review UI exists and is wired on `src/pages/Homework.jsx`.
- Feedback draft/review/release backend methods exist and are smoke-validated.
- Released feedback is parent-visible via service + RLS gating (`released_to_parent` only).
- Parent homework upload/status UI is not wired yet.
- Parent-facing released feedback display UI is not wired yet.

## 2) Product principle

Parent homework upload/status UI is the input layer of a controlled learning loop:

- **Input layer:** parent submits child homework evidence and sees simple progress state.
- **Assignment gate:** parent upload should only be available when a homework task is assigned/open for the linked child.
- **Simple parent status:** parent sees clear lifecycle states, not internal operational details.
- **Process layer ownership:** teacher/staff review workflow remains on staff `Homework` page.
- **Output layer:** parent sees only released feedback after explicit staff release.
- **No auto-AI:** no automatic AI marking or auto-feedback in this milestone.

## 3) Parent workflow

Planned parent workflow:

1. Parent opens `ParentView` (and later optional role-routed Homework entry if needed).
2. Parent sees assigned homework tasks for linked child only.
3. Parent sees due date + current status per task/submission.
4. Parent uploads allowed file (image/PDF) for linked child task.
5. Parent adds optional submission note.
6. Parent sees submission status update in simple language.
7. Parent sees status progression: `under review` / `reviewed` / `returned for revision` / `feedback released`.
8. Parent sees released feedback later; draft/internal feedback remains hidden.

## 4) UI placement

Recommendation: **ParentView section/card first** (not a dedicated parent Homework route in this MVP slice).

Why:

- Parent navigation already anchors to `ParentView` sections (`Child Homework` points there).
- Keeps parent journey single-surface and mobile-first.
- Lowest implementation risk: extend existing parent context screen instead of adding new role-specific routing.
- Preserves future flexibility to split into dedicated parent Homework page after adoption signals.

## 5) MVP UI sections

Recommended MVP sections in `ParentView`:

- Assigned Homework card/list (task title, due date, status).
- Upload submission form (file input + optional note).
- Uploaded file + submission summary.
- Review status badge and plain-language state copy.
- Released feedback summary (only when available).
- Supportive empty state (no assigned homework, or waiting for teacher review).

## 6) Service methods to use

Use existing services:

- `listHomeworkTasks(...)`
- `listHomeworkSubmissions(...)`
- `createHomeworkSubmission(...)`
- `uploadHomeworkFile(...)`
- `listHomeworkFeedback({ parentVisibleOnly: true })`
- `getHomeworkFileSignedUrl(...)` (for parent viewing own linked-child uploads)

Read-helper gap to note:

- A dedicated linked-child assigned-task reader is likely needed (or equivalent enhancement) so parent can reliably see **assigned/open tasks even before first submission**.
- Current `listHomeworkTasks({ studentId })` behavior derives task IDs from existing submissions, which can hide assigned tasks with zero submissions.

## 7) Parent safety / visibility

Parent visibility rules:

- linked-child scope only
- no other students' tasks/submissions/files
- no draft/unreleased feedback
- never expose `internal_note`
- no teacher-only review metadata/actions
- signed URL only for file access (no public bucket/object URL)

## 8) demoRole behavior

- Demo mode remains local placeholder behavior only.
- In demo mode, parent homework UI should not call Supabase read/write/upload/signed URL methods.
- Keep existing `demoRole` and local fallback behavior unchanged.

## 9) Mobile-first design

Mobile-first UX requirements:

- phone-first upload controls
- large touch-friendly upload button
- clear file type/size guard copy near input
- short status copy and clear badges
- avoid dense table layouts; prefer stacked cards

## 10) File validation

MVP validation plan:

- allow `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- max file size 5MB to start
- clear friendly error copy for invalid type/size
- no video in this phase

Note: current homework upload service max size is 2MB; align to 5MB in a later implementation phase only after policy/service update decision.

## 11) Feedback display timing

Parent feedback timing rules:

- show no feedback until `released_to_parent`
- never show `internal_note`
- if `returned_for_revision`, show parent-friendly instruction from released/public fields only
- if `under_review`, show review-pending copy

## 12) Risks and safeguards

Risks:

- wrong child upload attempt
- wrong file uploaded
- overexposure of internal notes or unreleased feedback
- parent expectation of instant grading
- oversized files and upload failure friction
- repeated uploads/version confusion
- notification/email expectations before channel exists
- retention/deletion policy ambiguity

Safeguards:

- enforce linked-child task/submission visibility only
- confirm task context in upload card before submit
- strict parent-visible field filtering
- explicit status copy: "under review, not yet released"
- file type/size guard before upload
- define resubmission/version rules in UI copy
- document notification/email as later milestone
- define retention/deletion policy before production rollout

## 13) Recommended implementation sequence

- **Phase 1:** this planning doc
- **Phase 2:** Parent homework UI read-only status/list
- **Phase 3:** Parent upload form
- **Phase 4:** Parent released feedback display
- **Phase 5:** notification/email later
- **Phase 6:** AI homework feedback later

## 14) Recommended next milestone

Recommendation: **A. Parent homework read-only status/list UI**.

Why A first:

- Lowest-risk way to validate role/RLS visibility.
- Confirms parent can safely see linked-child assigned tasks/submissions before upload actions are enabled.
- Preserves safety-first input -> process -> output sequencing.
- Reduces accidental write-path issues while parent-facing scope is first introduced.

## 15) Next implementation prompt (A only)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent homework read-only status/list UI only (no upload form yet).

Scope rules:
- Do not change runtime logic outside parent homework read/list wiring.
- Do not add submission write/upload actions in this step.
- Do not add new services unless a minimal read helper is required for assigned/open tasks visibility.
- Do not change Supabase SQL/RLS/storage policies in this step.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Use fake/dev data only.

Deliverables:
1) ParentView read-only "Assigned Homework" section for linked child:
   - task title
   - due date
   - current status badge
   - supportive empty states
2) ParentView read-only submission/status summary section:
   - latest submission state per task where available
   - no upload controls yet
3) ParentView released feedback preview indicator only (count/availability), no full feedback body yet.
4) demoRole/local behavior preserved with no Supabase calls in demo mode.
5) Documentation checkpoint for read-only parent homework visibility behavior.

Validation efficiency:
- Before tests: git diff --name-only
- If runtime/UI files changed: run build/lint/typecheck
- Do not run unrelated smoke suites unless service/backend behavior changed
```

## 16) Implementation checkpoint (A complete)

- Parent read-only homework status/list UI is now wired on `src/pages/ParentView.jsx`.
- Parent view now shows assigned homework tasks (class/linked-child scoped), due date, and parent-safe submission/review status badges.
- Parent-safe status wording now includes:
  - Not submitted
  - Submitted
  - Under review
  - Reviewed
  - Returned for revision
  - Feedback released
- Released feedback snippet is shown only when available via `listHomeworkFeedback({ parentVisibleOnly: true })`.
- `internal_note` and teacher-only review data remain hidden.
- Demo mode remains local-only and does not call Supabase for homework reads.
- Upload form/buttons remain intentionally unwired in this phase.
- AI homework feedback remains future.

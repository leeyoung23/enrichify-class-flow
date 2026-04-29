# Parent Homework Status List Checkpoint

This checkpoint records the ParentView read-only homework status/list milestone and confirms scope boundaries.

## 1) What was implemented

- ParentView now includes a read-only `Homework` status/list section for parent users.
- Parent-facing task/submission status visibility is now available in a parent-safe format.
- Upload controls are intentionally excluded in this phase.

## 2) Files changed

- `src/pages/ParentView.jsx`
- `docs/parent-homework-upload-status-ui-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Parent homework status UI behavior

- read-only `Homework` section in `ParentView`
- assigned homework task title
- due date
- parent-safe status badge
- limited released-feedback snippet only when parent-visible feedback exists
- no upload button/form in this phase

## 4) Status labels

- Not submitted
- Submitted
- Under review
- Reviewed
- Returned for revision
- Feedback released

## 5) Data/read behavior

- `listHomeworkTasks(...)`
- `listHomeworkSubmissions(...)`
- `listHomeworkFeedback({ parentVisibleOnly: true })`
- Supabase anon client + RLS only
- no service role usage
- no direct SQL from UI
- no guessed IDs when linked child/class context is missing

## 6) demoRole behavior

- local/demo placeholder only
- no Supabase homework reads
- no signed URL calls
- no writes/uploads

## 7) Parent safety boundaries

- linked-child/class scoped read behavior
- parent-visible feedback only
- no `internal_note` exposure
- no teacher-only review fields/actions
- no upload controls in this phase

## 8) Audit note

- Commit `531a105` removed an old local/demo `HomeworkUpload` placeholder block.
- Removed labels included:
  - "Choose File to Upload"
  - "Upload another file"
  - "Upload History"
- Audit confirmed the removed block was:
  - not payment proof upload
  - not Class Memories flow
  - not a separate real production feature
- No restoration was needed for the read-only status/list phase.

## 9) Tests

The milestone validation run (when runtime files changed) covered:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`

## 10) What remains

- Parent homework upload form
- Parent file upload controls
- richer parent feedback display
- AI homework feedback
- production retention/deletion policy

## 11) Recommended next milestone

Recommendation: Parent homework upload form planning/implementation.

Why next:

- Parent can now safely see homework/status in read-only mode.
- Backend homework upload path is already proven.
- Teacher review process is already in place.
- The next input-path milestone is parent upload form wiring.
- This preserves the input -> process -> output safety sequence.

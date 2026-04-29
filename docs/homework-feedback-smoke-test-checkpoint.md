# Homework Feedback Smoke Test Checkpoint

This checkpoint records the service-layer milestone for homework feedback/review lifecycle validation using fake/dev data only.

## 1) What was implemented

- Homework feedback write methods were added to support draft/update/review/release lifecycle.
- A dedicated homework feedback smoke test was added and is passing in dev.
- Parent visibility gates are confirmed:
  - draft/unreleased feedback hidden
  - released feedback visible
- Parent-visible feedback service path omits internal staff notes.
- No teacher homework review UI was added in this milestone.
- No parent homework status/feedback UI was added in this milestone.
- AI homework feedback remains future.

## 2) Files changed

- `src/services/supabaseWriteService.js`
- `src/services/supabaseUploadService.js`
- `scripts/supabase-homework-feedback-smoke-test.mjs`
- `package.json`
- `docs/teacher-homework-review-ui-plan.md`
- `docs/homework-upload-clean-flow-checkpoint.md`
- `docs/homework-upload-review-pipeline-plan.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

## 3) Write methods added

- `createOrUpdateHomeworkFeedback(...)`
- `markHomeworkSubmissionReviewed(...)`
- `returnHomeworkForRevision(...)`
- `releaseHomeworkFeedbackToParent(...)`

## 4) Feedback lifecycle proven

- draft feedback create/update
- reviewed transition
- returned_for_revision transition
- release_to_parent transition
- parent cannot see draft/unreleased feedback
- parent can see released feedback

## 5) Internal note protection

- `internal_note` remains internal-only.
- `listHomeworkFeedback({ parentVisibleOnly: true })` omits `internal_note`.
- Parent-visible feedback path does not expose internal notes.

## 6) Smoke test proof

- fake homework task/submission/file created
- fake feedback draft created
- parent draft-hidden check PASS
- feedback release PASS
- parent released-visible check PASS
- cleanup PASS for:
  - storage object
  - `homework_files`
  - `homework_feedback`
  - `homework_submissions`
  - `homework_tasks`

## 7) Security/RLS notes

- Supabase anon client + JWT only.
- No service role in frontend.
- RLS decides role scope and row visibility.
- Homework files remain private.
- Signed URL only for file access.
- Parent sees released feedback only.
- Fake/dev data only.

## 8) What remains

- Teacher Homework review UI
- Parent homework upload/status UI
- parent-facing feedback display UI
- AI homework feedback draft
- production retention/deletion policy
- broader unrelated parent/student credential checks

## 9) Recommended next milestone

Recommendation: **Teacher Homework review UI implementation** (from the approved plan baseline).

Why next:

- Backend feedback lifecycle is now proven.
- Teacher review UI is the process layer between parent upload input and parent-facing output.
- This preserves input -> process -> output integrity.
- Parent-facing homework UI should follow once teacher review flow is visible and usable.

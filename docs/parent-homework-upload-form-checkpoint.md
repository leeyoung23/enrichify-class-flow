# Parent Homework Upload Form Checkpoint

## 1) What Was Implemented

The Parent Homework section in `ParentView` now includes a real homework upload form tied to each task card where upload is allowed. Parent users can create a submission and upload an attachment through the existing homework service layer, while preserving existing role boundaries and keeping parent-facing feedback expansion for a later milestone.

## 2) Files Changed

- `src/pages/ParentView.jsx`
- `docs/parent-homework-upload-status-ui-plan.md`
- `docs/parent-homework-status-list-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Upload UI Behavior

- Upload controls are rendered inside the `ParentView` Homework section.
- UI is organized in a per-task card layout.
- Each card shows task title.
- Each card shows due date.
- Each card shows status badge.
- Upload controls are shown only for `Not submitted` and `Returned for revision`.
- Upload controls are hidden for `Submitted`, `Under review`, `Reviewed`, and `Feedback released`.
- Copy is parent-friendly and action oriented.

## 4) Service Flow

- `createHomeworkSubmission(...)`
- `uploadHomeworkFile(...)`
- `listHomeworkTasks(...)`
- `listHomeworkSubmissions(...)`
- `listHomeworkFeedback({ parentVisibleOnly: true })`
- Homework list refreshes after successful parent submission/upload flow.
- No direct SQL is used in the UI flow.
- No service role key is used in frontend flow.
- No public file URLs are exposed in this task.

## 5) File Validation

- Allowed MIME types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `application/pdf`
- Max size: 5MB per file.
- Not allowed: video uploads.
- Not allowed: `doc` / `docx`.

## 6) demoRole Behavior

- `demoRole` remains local/demo-only behavior.
- No Supabase create/upload calls are made in demo fallback mode.
- Demo mode uses simulated local success only.

## 7) Parent Safety Boundaries

- Access is linked-child/class scoped.
- No teacher internal notes are shown.
- No draft feedback is shown.
- No teacher-only review actions are available in parent flow.
- No cross-family visibility is allowed.
- File viewing and signed URL expansion are not part of this task.

## 8) Tests

Runtime/smoke commands for this checkpoint lineage:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`

Validation efficiency rule applied for this docs-only change: run only `git diff --name-only` unless runtime files changed.

## 9) What Remains

- Parent upload history/view UX (if needed after feedback display rollout).
- AI homework feedback.
- Production retention/deletion policy.
- Notification/email workflow (later phase).

Status update:

- Parent-facing released homework feedback display is now implemented in `ParentView`.
- `internal_note` remains protected from parent-visible service/UI path.
- AI homework feedback remains future.
- Notification/email remains future.

## 10) Recommended Next Milestone

**Recommended: Returned-for-revision parent copy polish**

Why next:

- Parent upload and released feedback display are now wired.
- The next low-risk UX improvement is clearer parent guidance in returned-for-revision paths.
- AI feedback should stay later, after the full human review-and-release workflow is fully polished.

## 11) Demo preview parity update

- Parent demo mode now renders visible homework upload controls inside the normal Homework status section (local-only simulation).
- Demo now includes:
  - one `Not submitted` task with visible submit CTA,
  - one released-feedback example task with feedback + next step copy.
- Demo submit action updates local status only and does not upload files to Supabase.
- Real authenticated parent upload behavior remains unchanged.

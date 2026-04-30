# Parent Marked Homework File Display Checkpoint

## 1) What was implemented

Parent-facing released marked homework file display is now wired in `ParentView` for authenticated non-demo flow, while preserving local/demo behavior and parent-safe privacy boundaries.

This milestone documents parent read/open behavior only for released teacher-marked files and does not change SQL/RLS, AI provider wiring, or notifications.

## 2) Files changed

- `src/pages/ParentView.jsx`
- `docs/parent-released-marked-homework-file-display-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Real parent marked-file read behavior

- Authenticated non-demo parent flow reads marked files via:
  - `listHomeworkFiles({ homeworkSubmissionId, fileRole: 'teacher_marked_homework', parentVisibleOnly: true })`
- Reads run only for valid UUID homework submission IDs.
- Reads are scoped to submissions already visible to the parent path.
- Parent display maps to parent-safe fields only:
  - file name
  - file type
  - date label
  - `View marked work` action
- Safe empty copy remains:
  - `Marked work will appear here once your teacher releases it.`
- No unreleased-file hinting is shown in parent UI.

## 4) Signed URL/open behavior

- `View marked work` uses:
  - `getHomeworkFileSignedUrl({ homeworkFileId, expiresIn: 300 })`
- Signed URL opens in new tab/window using `noopener,noreferrer`.
- Safe generic error toast is shown when open is unavailable.
- No public URLs are used.
- No raw storage paths or raw IDs are shown in parent UI.

## 5) demoRole behavior

- Fake released marked file remains in demo parent preview.
- Fake view action remains local toast only.
- No Supabase list calls for marked files in demo mode.
- No signed URL calls in demo mode.
- No real files are used in demo flow.

## 6) Safety/privacy boundaries

- Parent path remains release-gated through `parentVisibleOnly: true` plus RLS.
- `staff_note` is not shown.
- `internal_note` is not shown.
- `released_to_parent` label is not shown.
- `file_role` label is not shown.
- Raw IDs are not shown.
- No teacher/staff controls are shown in parent marked-work area.
- No upload controls are shown in parent marked-work area.
- No unreleased-file hints are shown.
- No SQL/RLS changes were made in this milestone.
- No AI/provider changes were made in this milestone.
- No notification behavior was added.

## 7) End-to-end manual marked-file workflow status

The human marked-file workflow is now functionally complete in current scope:

- Staff upload/list/view/release UI exists.
- Marked-file service smoke coverage passes.
- Parent released marked-file display exists.
- Private-before-release model remains preserved.

## 8) Tests

Validated in the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:marked-file`
- `npm run test:supabase:homework:feedback`

## 9) What remains

- AI OCR/provider integration for marked files.
- Parent UX polish (if needed after further QA).
- Notification/email flows remain future.
- Announcements/Internal Communications later.

## 10) Recommended next milestone

Choose:

- A. Homework human workflow full checkpoint update
- B. Resume AI Edge Function/provider path
- C. Attendance parent notification planning
- D. Printable/exportable PDF report planning
- E. Announcements/Internal Communications planning

Recommendation: **A. Homework human workflow full checkpoint update**

Why A first:

- Manual marked-file flow now completes a major human homework workflow.
- Checkpointing the full homework human loop now reduces regression risk before AI wiring expands.
- After checkpointing, AI provider path can resume from a stronger, validated human foundation.

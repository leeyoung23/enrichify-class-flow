# Manual Marked Homework File Service Checkpoint

## 1) What was implemented

Manual marked homework file backend service support is now implemented and validated with fake/dev smoke coverage.

Scope completed in this milestone:

- marked-file upload service method
- role/release-aware file listing support
- file release-to-parent service method
- dedicated marked-file smoke test

Scope intentionally not included:

- no app UI changes
- no runtime page behavior changes
- no Supabase SQL/RLS changes
- no SQL apply work (already covered by `018`)

## 2) Files changed

- `src/services/supabaseUploadService.js`
- `scripts/supabase-homework-marked-file-smoke-test.mjs`
- `package.json`
- `docs/homework-file-role-release-sql-application-checkpoint.md`
- `docs/manual-marked-homework-file-data-model-review.md`
- `docs/manual-marked-homework-upload-plan.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

## 3) Service methods added

Added in `src/services/supabaseUploadService.js`:

- `uploadMarkedHomeworkFile({ homeworkSubmissionId, file, notes, fileName, contentType })`
- `listHomeworkFiles({ homeworkSubmissionId, fileRole, parentVisibleOnly })`
- `releaseHomeworkFileToParent({ fileId })`

Reused:

- `getHomeworkFileSignedUrl(...)`

## 4) Marked-file upload behavior

`uploadMarkedHomeworkFile(...)` now:

- validates `homeworkSubmissionId` UUID
- requires authenticated user (current JWT)
- validates safe content type and file size (`<= 2MB`)
- uses same safe homework file-type set as existing homework upload flow
- uses anon client only (no service role)
- inserts metadata first into `homework_files`
- sets `file_role = 'teacher_marked_homework'`
- sets `released_to_parent = false`
- sets `marked_by_profile_id = auth user`
- sets `staff_note` from sanitized `notes`
- uploads only to private `homework-submissions` bucket
- returns stable `{ data, error }`
- attempts metadata cleanup when object upload fails
- surfaces `cleanup_warning` when cleanup is blocked by policy

## 5) Release-to-parent behavior

`releaseHomeworkFileToParent({ fileId })` now:

- validates `fileId` UUID
- requires authenticated user
- updates:
  - `released_to_parent = true`
  - `released_at = now`
  - `released_by_profile_id = auth user`
- relies on existing RLS scope/authority
- does not auto-release feedback
- does not trigger notification side effects

## 6) Smoke test coverage

`scripts/supabase-homework-marked-file-smoke-test.mjs` covers:

- supervisor creates fake homework task/submission
- uploads tiny fake marked file
- verifies `file_role` and release defaults
- verifies staff signed URL access
- verifies parent cannot see marked file before release
- releases file to parent
- verifies parent can see marked file after release
- verifies parent/student cannot upload `teacher_marked_homework`
- cleans up fake object and metadata/task/submission rows where allowed
- uses `PASS` / `WARNING` / `CHECK` output contract

## 7) CHECK/WARNING notes

- Marked-file smoke had no `WARNING`/`CHECK` in this environment (all `PASS`).
- Existing upload smoke still has expected unrelated-credential `CHECK` skips.
- No unsafe access regression was observed in this milestone.

## 8) Tests

Executed in the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:marked-file`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`

## 9) What remains

- Teacher marked-file UI wiring
- Parent released marked-file display wiring
- Additional parent-facing runtime page behavior for marked files
- AI OCR/provider integration for marked files
- Announcements/Internal Communications planning/work later

## 10) Recommended next milestone

Options:

- A. Teacher marked-file UI planning
- B. Parent released marked-file display planning
- C. Resume AI Edge Function deployment
- D. Announcements/Internal Communications planning

Recommendation: **A. Teacher marked-file UI planning**

Why A first:

- Backend/service proof now exists and is smoke-validated.
- Staff need clear upload/release controls in the review panel before parent display is introduced.
- Parent display should follow only after teacher upload/release path is safely wired end-to-end.
- AI OCR/provider work should come after the human marked-file workflow is operational and visible.

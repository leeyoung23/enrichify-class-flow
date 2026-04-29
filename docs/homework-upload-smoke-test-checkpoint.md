# Homework Upload Smoke Test Checkpoint

This checkpoint records the service-layer and smoke-test milestone for homework upload/review after manual application of SQL foundations in Supabase dev.

## 1) What was implemented

- Homework upload/review service methods were added for lean MVP task/submission/file operations.
- Metadata-first upload flow was implemented for private homework file handling.
- Dedicated fake-file smoke test was added and is now passing in dev after `015` patch apply.
- No homework UI wiring was included in this milestone.
- AI homework feedback remains future.

## 2) Files changed

- `src/services/supabaseUploadService.js`
- `scripts/supabase-homework-upload-smoke-test.mjs`
- `package.json`
- `docs/homework-upload-review-pipeline-plan.md`
- `docs/homework-sql-application-checkpoint.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

## 3) Service methods added

- `createHomeworkTask(...)`
- `createHomeworkSubmission(...)`
- `uploadHomeworkFile(...)`
- `getHomeworkFileSignedUrl(...)`
- `listHomeworkTasks(...)`
- `listHomeworkSubmissions(...)`
- `listHomeworkFeedback(...)`

## 4) Metadata-first upload behavior

- `homework_files` metadata row is created first.
- Object upload runs second to private `homework-submissions` bucket.
- Signed URL retrieval works through service method (no public URL exposure).
- Public URL usage is not used in this flow.
- Cleanup is attempted on failure paths.

## 5) 015 patch note

- Smoke originally failed because UUID parsing in `homework_path_matches_submission(...)` captured only the first UUID chunk.
- `supabase/sql/015_fix_homework_upload_rls_policies.sql` patched helper matching to accept the full UUID prefix using `LIKE`.
- After manual apply of `015` in dev, homework upload smoke passed end-to-end.

## 6) Smoke test proof

- Homework task creation passes.
- Submission fallback path works.
- Homework file metadata insert passes.
- Private object upload passes.
- Signed URL creation passes.
- Branch supervisor scoped read passes.
- Parent draft/unreleased feedback remains hidden.
- Cleanup passes for object, file row, feedback, submission, and task.

## 7) Remaining CHECK notes

- Parent direct submission insert is still blocked in current dev dataset/policy context.
- Branch supervisor fallback is used for submission creation in current smoke run.
- Unrelated parent/student credentials were unavailable in env, so those checks were skipped.
- Parent direct submission behavior should be revisited during parent upload UI stage.

## 8) Security/RLS notes

- Supabase anon client + JWT only.
- No service role in frontend.
- Private bucket usage only.
- Signed URL only for file access.
- RLS controls scope boundaries.
- Fake files/dev data only in smoke validation.

## 9) What remains

- teacher homework review UI
- parent upload/status UI
- feedback release flow
- AI homework feedback draft
- parent direct submission path verification/seed alignment
- production retention/deletion policy

## 10) Recommended next milestone

Recommendation: **C. Parent submission RLS/seed alignment investigation**.

Why C first:

- Parent upload/status UI depends on reliable parent direct submission behavior.
- Current smoke still uses supervisor fallback for submission create in this dev context.
- Closing this gap first reduces rework risk before parent UI planning/implementation.

If parent upload UI is not immediate, **A. Teacher Homework review UI planning** is the next safe alternative.

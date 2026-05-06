# Homework Upload Clean Flow Checkpoint

This checkpoint records that the homework upload pipeline now passes cleanly in dev with parent direct submission and metadata-first private upload flow.

## 1) What is now proven

- Homework upload/review foundation is operational at service + RLS/storage level in dev.
- Parent direct linked-child submission creation works.
- Metadata-first homework file flow works end-to-end.
- Private object upload and signed URL retrieval work under scoped RLS.
- Parent draft/unreleased feedback remains hidden by policy.
- Smoke cleanup completes for created test rows/objects.

## 2) Important patch history

- `014` foundation applied: homework tables + private bucket + RLS/storage policies.
- `015` applied: UUID path helper fix for `homework_path_matches_submission(...)`.
- `016` applied: parent submission insert recursion fix for first parent submission path.
- Smoke auth/session flow fix applied in script so parent upload executes with active parent JWT session.

## 3) Service/smoke files involved

- `src/services/supabaseUploadService.js`
- `scripts/supabase-homework-upload-smoke-test.mjs`
- `package.json`
- `docs/homework-upload-smoke-test-checkpoint.md`
- `docs/rls-test-checklist.md`

## 4) Proven flow

- homework task creation
- parent linked-child submission creation
- `homework_files` metadata row creation
- private storage object upload
- signed URL retrieval
- parent draft feedback hidden
- cleanup of object + rows

## 5) Security/RLS notes

- Supabase anon client + JWT only.
- No service role in frontend.
- Private bucket only.
- Signed URL only for file access.
- Parent scope is linked-child only.
- Teacher scope is assigned-class only.
- Branch supervisor scope is own branch only.
- HQ scope is all branches by policy.

## 6) Remaining CHECK notes

- Unrelated parent/student credentials are unavailable in env, so those negative-role checks are skipped.
- No homework UI exists yet.
- No production retention/deletion policy is finalized yet.

## 7) What remains

- Teacher Homework review UI
- Parent homework upload/status UI
- feedback release flow
- AI homework feedback draft

## 8) Feedback write service checkpoint

- Homework feedback write service methods are now added in `src/services/supabaseWriteService.js`.
- Homework feedback smoke test is now added at `scripts/supabase-homework-feedback-smoke-test.mjs`.
- Package command is now available: `npm run test:supabase:homework:feedback`.
- Service/smoke flow validates draft create/update, review-state transition, release-to-parent, and parent visibility gates.
- Parent draft/unreleased feedback remains hidden by policy.
- Parent-visible feedback retrieval path excludes `internal_note` in service response for `parentVisibleOnly`.
- No teacher homework review UI is added in this milestone.
- No parent homework status/feedback UI is added in this milestone.
- AI homework feedback remains future.

## 9) Recommended next milestone

Recommendation: **A. Teacher Homework review UI planning**.

Why A first:

- Task/review workflow should be visible and usable for staff before parent UI expands.
- Teachers need a clear review/feedback workflow before parent-facing release experience.
- This keeps the loop safe in order: input -> process -> output.

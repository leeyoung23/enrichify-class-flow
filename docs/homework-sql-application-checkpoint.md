# Homework SQL Application Checkpoint

This checkpoint records manual application status for the homework upload/review foundation in the dev Supabase project.

## 1) What was applied

- Applied SQL: `supabase/sql/014_homework_upload_review_foundation.sql`
- Apply mode: manual/dev-first apply in Supabase SQL editor

## 2) Manual Supabase verification

Verified in Supabase dev:

- `homework_tasks` table exists.
- `homework_submissions` table exists.
- `homework_files` table exists.
- `homework_feedback` table exists.
- Storage bucket `homework-submissions` exists.
- Bucket `homework-submissions` is private (`public = false`).
- RLS policies exist for homework tables.
- Storage object policies exist for `homework-submissions`.
- Policy set includes homework-related `select` / `insert` / `update` / `delete` coverage by role scope.

Expected policy naming pattern includes homework-specific policy names for table/storage read-write actions (for example, names containing `homework` and the action intent such as `select`, `insert`, `update`, `delete`).

## 3) Product/security intent

- Homework/student work is the next learning-evidence layer.
- Flow must be structured workflow, not random file dumping.
- Files remain private only.
- Access should use signed URLs only (later runtime step).
- Parent scope is linked-child only.
- Teacher scope is assigned-class only.
- Branch supervisor scope is own branch only.
- HQ scope is all branches by policy.
- Feedback draft/internal notes must stay non-parent-visible until explicitly released.

## 4) Current implementation boundary

Still not implemented:

- upload/read/write service
- fake file smoke test
- teacher homework review UI
- parent upload/status UI
- feedback release flow
- AI homework feedback
- production retention/deletion policy

## 5) Notes from review hardening

- Parent/student submission update path was tightened before apply.
- Storage path convention was hardened.
- Metadata-backed storage access was hardened.
- Metadata-first upload flow is expected.

## 6) Recommended next milestone

Recommendation: **Homework upload/review service + fake file smoke test**.

Why this next:

- SQL/RLS/storage foundation is now applied in dev.
- Immediate risk is proving metadata-first upload correctness and private file access behavior before UI wiring.
- Teacher/parent UI should follow only after smoke test proof.

## 7) Related doc alignment

Related docs should reflect:

- `014` is applied in dev.
- Homework runtime service layer is now started with metadata-first upload methods in `src/services/supabaseUploadService.js`.
- Homework fake file smoke test is now added at `scripts/supabase-homework-upload-smoke-test.mjs`.
- Smoke run found RLS blocker at `homework_files` insert (`new row violates row-level security policy for table "homework_files"`).
- SQL patch draft now exists at `supabase/sql/015_fix_homework_upload_rls_policies.sql` (manual apply only, not applied yet).
- No homework upload/review UI exists yet.
- Future validation uses fake files/dev data only.
- AI homework feedback remains future.

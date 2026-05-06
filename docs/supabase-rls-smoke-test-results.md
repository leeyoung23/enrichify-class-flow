# Supabase RLS Smoke Test Results

## Checkpoint

- Date: 2026-04-28
- Title: Post-`006_fix_teacher_tasks_rls.sql` smoke-test success

## SQL Applied Before Testing

The following SQL files were manually applied in Supabase:

1. `supabase/sql/001_mvp_schema.sql`
2. `supabase/sql/002_rls_helper_functions.sql`
3. `supabase/sql/003_rls_policies_draft.sql`
4. `supabase/sql/004_storage_buckets_and_policies.sql`
5. `supabase/sql/005_fake_seed_data.sql`
6. `supabase/sql/006_fix_teacher_tasks_rls.sql`

## Fake Users Tested

- `hq.demo@example.test`
- `supervisor.demo@example.test`
- `teacher.demo@example.test`
- `parent.demo@example.test`
- `student.demo@example.test`

## Role Result Summary

- **HQ Admin**
  - Sign-in success.
  - Sees broad/global data as expected.
- **Branch Supervisor**
  - Sign-in success.
  - Sees own-branch records.
  - Sees approved Sales Kit resources.
  - Does not see archived Sales Kit resources.
- **Teacher**
  - Sign-in success.
  - Sees assigned learning/task data.
  - Cannot access `fee_records`.
  - Cannot access `sales_kit_resources`.
- **Parent**
  - Sign-in success.
  - Sees linked-child parent-facing records.
  - Cannot access internal `teacher_tasks`.
  - Cannot see draft `parent_comments` / `weekly_progress_reports`.
- **Student**
  - Sign-in success.
  - Sees own learning records.
  - Cannot access `fee_records`.
  - Cannot access internal `teacher_tasks`.

Additional checkpoint:

- `teacher_tasks` now returns expected role-scoped row counts (no longer failing in smoke test).

## Key Safety Confirmation

- Test harness used Supabase client with anon/publishable key.
- Service role key was not used for smoke testing.
- `.env.local` remains local-only and must not be committed.

## Current Limitation

This is smoke testing only, not a full production security audit.

Still required later:

- Broader insert/update/delete behavior testing by role.
- Deeper storage upload/read/write/delete policy tests by role.
- Additional negative-path and abuse-case testing.

## Recommended Next Step

Begin frontend Supabase read-only connection planning while keeping `demoRole` fallback in place during transition.


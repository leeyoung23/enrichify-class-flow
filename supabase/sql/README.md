# Supabase SQL Draft Preparation (Review-Only)

These files are **draft preparation SQL** for review and iteration.

- They are intended for design discussion and security review first.
- They are **not** production migrations.
- They are **not** meant to be run automatically.

## Draft Run Order (After Review)

1. `001_mvp_schema.sql`
2. `002_rls_helper_functions.sql`
3. `003_rls_policies_draft.sql`
4. `004_storage_buckets_and_policies.sql`
5. `005_fake_seed_data.sql`
6. `006_fix_teacher_tasks_rls.sql`

`006_fix_teacher_tasks_rls.sql` was added after smoke testing exposed a circular RLS dependency between `teacher_tasks` and `teacher_task_assignments`.

If you are recreating the currently tested database state, do not stop at `005`; apply `006` as the final patch in this sequence.

## Safety Rules

- Do not use real student, parent, teacher, school, fee, payment, homework, upload, or attendance data.
- Do not run against production without backup, rollback, and peer review.
- Do not treat `demoRole` as production authorization.
- Keep demo mode active until real Supabase Auth + RLS behavior is validated role-by-role.

## Current Scope

This folder supports a demo-safe transition checkpoint:

- Draft schema design
- Draft RLS helpers
- Draft RLS policies
- Draft storage policy ideas
- Fake seed data for role testing


# Fake Auth Users and Seed Guide

This guide explains how to safely prepare fake Supabase Auth users before running `supabase/sql/005_fake_seed_data.sql`.

These steps are for demo/testing only.

## Why fake Auth users must be created first

The `profiles.id` values in `supabase/sql/005_fake_seed_data.sql` must match real user UUIDs from `auth.users`.

In the current draft, the profile IDs are placeholders (for example, values starting with `aaaaaaaa-...`).
If fake Auth users are not created first (and IDs not replaced), inserts into `profiles` can fail or link incorrectly.

## Fake Auth users to create

Create these exact fake users in Supabase Auth:

- `hq.demo@example.test`
- `supervisor.demo@example.test`
- `teacher.demo@example.test`
- `parent.demo@example.test`
- `student.demo@example.test`

Use fake/demo-only identities. Do not use real people or production accounts.

## Manual creation steps in Supabase

1. Open Supabase project dashboard.
2. Go to `Authentication` -> `Users`.
3. Click `Add user`.
4. Enter one of the fake emails above.
5. Set a temporary test password.
6. Confirm email if Supabase shows that option.
7. Repeat until all 5 users exist.

## How to copy each user UUID

For each created user in `Authentication` -> `Users`:

1. Open the user row/details.
2. Copy the user `id` (UUID) value.
3. Save mappings locally in a temporary note, for example:
   - `hq.demo@example.test -> <uuid>`
   - `supervisor.demo@example.test -> <uuid>`
   - `teacher.demo@example.test -> <uuid>`
   - `parent.demo@example.test -> <uuid>`
   - `student.demo@example.test -> <uuid>`

Do not put sensitive production IDs in public docs.

## Replace placeholder IDs in `005_fake_seed_data.sql`

Open `supabase/sql/005_fake_seed_data.sql` and replace only the placeholder profile IDs used in the `profiles` insert block.

Current placeholders to replace:

- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` -> HQ user UUID
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2` -> Branch Supervisor user UUID
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3` -> Teacher user UUID
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4` -> Parent user UUID
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5` -> Student user UUID

Keep all non-user fake IDs (branch/class/student/task/etc.) as-is unless there is a specific reason to change them.

## Safety warnings

- Do not use real student, parent, teacher, school, fee, payment, homework, or upload data.
- Do not add Supabase URL, anon key, service key, or DB password to docs/SQL.
- Do not commit real production user IDs later.
- Keep this workflow fake/demo only until full auth + RLS + storage verification is complete.

## Running seed SQL after replacement

After placeholder IDs are replaced locally, you can manually run:

- `supabase/sql/005_fake_seed_data.sql`

Run it in Supabase SQL Editor only after confirming readiness checklist below.

## Readiness checklist before running `005`

- [ ] `001_mvp_schema.sql` succeeded
- [ ] `002_rls_helper_functions.sql` succeeded
- [ ] `003_rls_policies_draft.sql` succeeded
- [ ] `004_storage_buckets_and_policies.sql` succeeded
- [ ] All 5 fake Auth users were created
- [ ] Placeholder profile UUIDs were replaced in `005_fake_seed_data.sql`
- [ ] Seed file reviewed and still fake-only
- [ ] No real data included


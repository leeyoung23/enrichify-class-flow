# Supabase Manual Verification Tests (Post-Seed)

These files are manual SQL verification helpers for the current fake/demo Supabase setup.

## Important

- These scripts are for fake/demo data only.
- Review each query before running it in Supabase SQL Editor.
- Do not use real student, parent, teacher, school, fee, payment, homework, upload, or attendance data.

## RLS note

Supabase SQL Editor can run with elevated privileges depending on session/role, which may bypass normal Row Level Security behavior.

Because of that:

- Query results in SQL Editor may differ from authenticated app/client behavior.
- Treat role-visibility queries as draft diagnostics.
- For final RLS validation, repeat critical checks through authenticated sessions/tokens per role.

## Files

1. `001_post_seed_verification.sql`
   - Read-only post-seed counts and bucket visibility checks.
2. `002_rls_role_visibility_tests.sql`
   - Role-by-role visibility test queries with expected outcomes.
3. `003_storage_policy_checks.sql`
   - Bucket/object metadata checks and manual upload/read test checklist.


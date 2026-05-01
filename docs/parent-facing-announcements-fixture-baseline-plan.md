# Parent-facing Announcements Fixture Baseline Plan

Date: 2026-05-01  
Scope: safe fixture-proof planning only (no SQL apply, no RLS change)

## Why this plan exists

Parent-facing smoke diagnostics show two separate CHECK categories:

- create-path RLS insert denial (`42501`) for HQ/supervisor on `parent_announcements`,
- unrelated-parent negative proof blocked by missing/invalid unrelated fake parent auth credentials.

This plan captures safe baseline options without weakening RLS or using real data.

## Current fixture discovery status

- Branch/class/student fixture discovery is now available in smoke via:
  - env override:
    - `PARENT_ANNOUNCEMENTS_TEST_BRANCH_ID`
    - `PARENT_ANNOUNCEMENTS_TEST_CLASS_ID`
    - `PARENT_ANNOUNCEMENTS_TEST_STUDENT_ID`
    - `PARENT_ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`
  - deterministic fake fallback IDs from `supabase/sql/005_fake_seed_data.sql`.
- Parent/Unrelated parent discovery:
  - primary parent uses fake `parent.demo@example.test` by default.
  - unrelated parent uses optional:
    - `PARENT_ANNOUNCEMENTS_TEST_UNRELATED_PARENT_EMAIL`
    - `RLS_TEST_UNRELATED_PARENT_PASSWORD`

## Safe next manual checks (DEV only)

1. Confirm fake auth users exist and are active for:
   - `hq.demo@example.test`
   - `supervisor.demo@example.test`
   - `teacher.demo@example.test`
   - `parent.demo@example.test`
   - optional unrelated fake parent (example.test only)
2. Confirm fake seed (`005`) baseline rows exist for deterministic branch/class/student linkage.
3. Re-run:
   - `npm run test:supabase:parent-announcements`
   - `npm run test:supabase:announcements:phase1`

## SQL draft posture

- No `029` fixture SQL draft is added in this checkpoint.
- Reason:
  - main blocker is current RLS insert denial (`42501`) on create path, not branch/class/student fixture absence.
  - unrelated-parent CHECK requires fake auth credential readiness, which table-only SQL cannot fully solve.

## Boundaries

- fake/dev data only.
- no real identities/data.
- no SQL auto-apply.
- no RLS weakening.
- no UI/media/notification implementation in this plan.

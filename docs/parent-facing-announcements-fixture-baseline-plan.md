# Parent-facing Announcements Fixture Baseline Plan

## Checkpoint update (029 insert RLS manual DEV application + smoke proof)

- `029` manual apply target:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- No parent-facing media service changes in this checkpoint.
- No media/email/notification behavior added.
- Root cause now documented as resolved:
  - before `029`, raw insert without `RETURNING` could succeed while `insert(...).select()` (`INSERT ... RETURNING`) failed with `42501`,
  - `RETURNING` path required `SELECT`-policy visibility for newly inserted draft rows,
  - `029` introduced `can_select_parent_announcement_row_029(...)` and `can_insert_parent_announcement_row_029(...)` policy-helper wiring to resolve this.
- SQL/RLS confirmation after manual apply:
  - `parent_announcements_insert_028` now uses `can_insert_parent_announcement_row_029(...)`,
  - `parent_announcements_select_028` now uses `can_select_parent_announcement_row_029(...)`,
  - helper functions exist: `can_insert_parent_announcement_row_029`, `can_select_parent_announcement_row_029`,
  - only parent-announcements insert/select policy wiring changed,
  - update/delete/target/media/read-receipt/storage policy surfaces remain unchanged,
  - parent read remains published + linked-child scoped,
  - teacher/student remain blocked,
  - supervisor own-branch safeguards remain preserved.
- Parent-facing smoke now strongly passes:
  - HQ context diagnostic + fixture discovery (`branch/class/student/other_branch`) resolved,
  - HQ create draft PASS,
  - HQ publish PASS,
  - HQ other-branch negative fixture PASS,
  - supervisor own-branch create PASS,
  - supervisor own-branch publish PASS,
  - supervisor mixed-target cross-branch create blocked PASS,
  - teacher create/manage blocked PASS,
  - parent create/manage blocked PASS,
  - parent linked published visible PASS,
  - parent detail read PASS,
  - parent mark own read receipt PASS,
  - parent unrelated other-branch blocked/empty PASS,
  - parent internal_staff blocked/empty PASS,
  - student blocked/empty PASS,
  - cleanup PASS.
- Remaining CHECK notes:
  - unrelated parent auth fixture credential-check remains skipped when credentials are missing/invalid,
  - parent negative branch coverage still exists via same parent blocked on unrelated other-branch fixture,
  - Phase1 optional cross-branch check remains env-fixture dependent when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing,
  - no unsafe access observed.
- Regression result note:
  - `npm run test:supabase:announcements:phase1` PASS,
  - request workflow unaffected,
  - parent/student remain blocked from internal_staff announcements,
  - optional cross-branch CHECK remains expected in fixture-missing contexts.
- Canonical checkpoint doc:
  - `docs/parent-facing-announcements-insert-rls-application-checkpoint.md`

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

- A focused insert-RLS patch draft now exists:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
- `029` is manual/dev-first and review-first only (not auto-applied).
- `029` purpose:
  - tighten/clarify draft insert predicate for HQ/supervisor only,
  - preserve teacher/parent/student create block,
  - provide RETURNING-safe select row predicate for manager visibility without widening parent draft access.
- Remaining fixture note:
  - unrelated-parent CHECK still depends on optional fake unrelated auth user + credentials readiness.

## Boundaries

- fake/dev data only.
- no real identities/data.
- no SQL auto-apply.
- no RLS weakening.
- no UI/media/notification implementation in this plan.

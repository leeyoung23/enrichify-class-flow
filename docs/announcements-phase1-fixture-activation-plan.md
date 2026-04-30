# Announcements Phase 1 Fixture Activation Plan

Checkpoint scope: planning only for fake/dev staff fixture activation and verification.

## 1) Current smoke result

Current `npm run test:supabase:announcements:phase1` status:

- HQ and supervisor credentials resolve to profile rows.
- Both staff fixtures are currently inactive:
  - HQ: `role=hq_admin`, `is_active=false`, `branch=null`
  - Supervisor: `role=branch_supervisor`, `is_active=false`, `branch=uuid`
- `public.current_user_role()` requires active profiles (`is_active=true`).
- RLS blocks HQ/supervisor create checks correctly in this fixture context.
- Teacher targeted flow is skipped because create fixtures are unavailable.
- Cross-branch negative check is skipped because prerequisite fixture is unavailable.

## 2) Root cause

- This is a **fake fixture state problem**.
- This is **not** a read/write service payload defect based on current evidence.
- This is **not** a reason to weaken RLS.
- Active-profile requirement is correct and should remain for production safety.

## 3) Required fake/dev fixture state

Required fixture conditions for reliable Announcements Phase 1 smoke:

- Fake HQ profile: `is_active=true`.
- Fake branch supervisor profile: `is_active=true`.
- Fake supervisor `branch_id` points to a valid fake branch.
- Fake teacher profile active if teacher targeted flow should be validated end-to-end.
- Teacher assignment/target scope available in fake/dev fixtures.
- Parent/student remain blocked from `internal_staff` announcements.

## 4) Safe fixture strategy options

### A) Manually update fake profiles in Supabase SQL Editor
- Pros: fastest one-off fix.
- Cons: less auditable/repeatable, easy to drift across sessions.

### B) Add dev-only SQL fixture patch
- Pros: auditable, repeatable, reviewable, aligns with existing manual/dev-first SQL workflow.
- Cons: requires one more draft patch and manual apply step.

### C) Update existing fake seed file
- Pros: central fake seed source.
- Cons: may affect broad seed assumptions and unrelated smoke workflows; riskier blast radius.

### D) Let smoke test create/activate fixtures
- Pros: dynamic setup.
- Cons: mixes environment mutation with verification; less safe/clear; can mask root issues.

Recommendation: **B. Dev-only SQL fixture patch**.

Why B first:

- Keeps fixture change explicit and reviewable.
- Preserves strict RLS logic.
- Avoids hidden test-side fixture mutation.
- Matches existing manual/dev-first governance.

## 5) Proposed dev-only SQL patch

Proposed future file:

- `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql`

Patch intent:

- clearly marked dev-only + fake fixture only,
- manual apply only (no auto-apply),
- no real user targeting,
- only example.test/demo fake user/profile rows,
- set `is_active=true` for fake HQ/supervisor/teacher profiles used by Announcements smoke,
- ensure fake supervisor has valid fake `branch_id`,
- optionally ensure minimal fake announcement target alignment rows if needed for teacher-targeted flow,
- include verification selects for role/is_active/branch only (no secrets).

## 6) Security boundaries

- fake/dev data only,
- no real data,
- no real credentials in repo,
- no password changes in SQL patch,
- no auth user creation unless it matches existing fake-seed pattern and remains fake-only,
- no service role use in frontend,
- no RLS weakening,
- no parent/student access scope changes,
- no production apply.

## 7) Expected smoke result after fixture activation

Expected outcomes after correct fake fixture activation:

- HQ create check: PASS
- Supervisor own-branch create/publish check: PASS
- Teacher create blocked: PASS
- Teacher targeted read/status/reply: PASS (if target fixture path complete)
- Parent/student internal_staff read blocked: PASS
- Cross-branch negative check: PASS (if optional fixture exists)

## 8) Manual vs committed fixture values

- `.env.local` credentials remain local-only.
- No passwords/tokens are committed.
- Fixture SQL patch must not include secrets.
- Verification output should include non-sensitive fixture state only (role/is_active/branch).

## 9) Implementation sequence

- Phase 1: this planning document.
- Phase 2: draft `021` dev-only fixture activation SQL.
- Phase 3: manual review of `021`.
- Phase 4: manual apply in Supabase dev SQL Editor.
- Phase 5: rerun `npm run test:supabase:announcements:phase1`.
- Phase 6: document checkpoint result.
- Phase 7: proceed to Staff Announcements UI shell only when create/read/status/reply paths are proven, or remaining skips are clearly optional and non-blocking.

## 10) Recommended next milestone

Options:

- A. Draft 021 Announcements fake fixture activation SQL
- B. Staff Announcements UI shell with demo parity
- C. Weaken RLS to allow inactive profiles
- D. Attachments SQL/RLS
- E. Company News pop-up design

Recommendation: **A. Draft 021 Announcements fake fixture activation SQL**.

Why A first:

- RLS is correctly blocking inactive profiles.
- Fake fixture state must be fixed before UI.
- Backend create/read/status/reply path should be proven first.
- Weakening RLS would be unsafe.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Announcements fixture activation plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Draft 021 Announcements fake fixture activation SQL only.

Hard constraints:
- SQL draft only (manual/dev-first).
- Do not apply SQL automatically.
- No runtime/UI/service changes.
- No RLS weakening.
- Fake/dev data only.
- No real credentials or secrets.
- No .env.local commit.
- No service role in frontend.

Deliverables:
1) `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql`
2) clear comments: dev-only/fake-only/manual apply.
3) activate fake HQ/supervisor/teacher profiles via `is_active=true`.
4) ensure fake supervisor branch alignment.
5) include safe verification SELECT output (role/is_active/branch only).
6) update checkpoint docs for manual apply plan.

Validation efficiency rule:
Docs/planning and SQL draft only.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke unless runtime files change.
```

## 12) Validation efficiency rule

Docs/planning only.

Run:

- `git diff --name-only`

Do not run build/lint/smoke suite unless runtime files change.

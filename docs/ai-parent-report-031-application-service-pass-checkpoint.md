# AI Parent Report 031 Application + Service Pass Checkpoint

Date: 2026-05-02  
Scope: docs-only checkpoint for manual Supabase DEV application of `031` and post-apply service smoke outcome

## 1) Application status

- Manual apply target:
  - `supabase/sql/031_fix_ai_parent_reports_insert_rls.sql`
- Supabase DEV SQL Editor result:
  - **Success. No rows returned.**
- No production apply in this checkpoint.
- No UI/runtime/service changes in this docs-only checkpoint.
- No real AI provider integration.
- No PDF/export implementation.

## 2) Root cause resolved

- Pre-031 diagnostics:
  - raw insert without RETURNING passed,
  - insert with RETURNING failed with `42501` RLS violation.
- `031` introduced row-predicate select visibility helper/policy shape for `ai_parent_reports` RETURNING reads.
- Post-031 result:
  - AI parent report service draft-create path moved from CHECK to PASS.

## 3) AI parent report smoke PASS result

From `npm run test:supabase:ai-parent-reports` (post-031):

- HQ create AI parent report draft: PASS
- `real_ai` generation source blocked: PASS
- first `version_number` resolved to `1`: PASS
- version lifecycle event insert: PASS
- parent draft report detail blocked before release: PASS
- submit_for_review: PASS
- approve: PASS
- release selected version: PASS
- `current_version_id` set to selected version: PASS
- release lifecycle event insert: PASS
- linked parent released report visible: PASS
- linked parent current released version visible: PASS
- parent version history limited to released current version only: PASS
- student blocked/empty: PASS
- cleanup archive: PASS
- no real AI provider calls: PASS
- no PDF/export paths: PASS
- anon+JWT+RLS only: PASS

## 4) CHECK/WARNING notes

- Evidence link insert CHECK occurred because `summarySnapshot` raw private file-path guard blocked unsafe input.
- This is a guardrail proof (safe behavior), not an unsafe access widening.
- Future smoke should include a positive safe evidence-link insert path.
- Unrelated parent fixture credentials missing/invalid CHECK remains expected.
- Announcements phase1 optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` CHECK remains expected.
- No unsafe RLS widening observed.

## 5) RLS/privacy boundary

- AI drafts remain staff-only.
- Parent cannot see draft report state.
- Parent sees only released linked-child report and current released version.
- Parent version visibility remains limited to released current version only.
- Student is blocked.
- No service-role frontend usage.
- No provider keys in frontend path.
- No auto-release behavior.

## 6) Lifecycle/versioning boundary

- Manual/mock source only in current service milestone.
- `real_ai` source remains blocked.
- Append-first version/release-event posture remains preserved.
- Selected release version becomes `current_version_id`.
- Same-report FK safety from `030` remains a critical guardrail.
- PDF/export remains deferred.

## 7) Regression result

- `npm run test:supabase:parent-announcements`: PASS
- `npm run test:supabase:announcements:phase1`: PASS (expected optional CHECK only)

## 8) Recommended next milestone

Choose:

- A. AI parent report service smoke hardening: safe evidence-link positive test
- B. AI parent report UI shell with demo/manual data
- C. Mock AI report draft service
- D. Real AI provider integration
- E. PDF/export planning

Recommendation: **A first** (small hardening milestone).

Why:

- evidence-link source traceability is core to trustworthy report workflows,
- current smoke proves unsafe raw-path guard but does not yet prove positive safe evidence-link insert,
- safe positive evidence-link smoke should be proven before UI/provider phases,
- keep no real AI/no UI/no PDF constraints unchanged.

## 9) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
0489e65 Investigate AI parent report draft RLS checks

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
AI parent report evidence-link smoke hardening only.

Hard constraints:
- Do not change app UI.
- Do not change runtime page behavior.
- Do not change Supabase SQL/RLS.
- Do not apply SQL.
- Do not add services beyond smoke hardening adjustments already in scope.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values/passwords.
- Do not commit .env.local.
- Do not implement report UI.
- Do not implement mock AI UI.
- Do not implement real provider wiring.
- Do not implement PDF/export.
- Do not auto-release AI-generated content.
- Use fake/dev data only.

Deliverables:
1) Keep existing AI parent report smoke coverage.
2) Add positive safe evidence-link insert smoke case that passes.
3) Keep unsafe raw-path evidence guard negative case (CHECK/PASS as designed).
4) Update checkpoint docs only as needed.

Validation efficiency rule:
Docs-only checkpoint if no runtime files change.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke unless runtime files change.
```

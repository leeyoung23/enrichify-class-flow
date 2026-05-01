# AI Parent Report SQL Application Checkpoint

Date: 2026-05-02  
Scope: documentation-only checkpoint for manual Supabase DEV application of `030`

## 1) Application status

- Manual apply target:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- Supabase DEV SQL Editor result:
  - **Success. No rows returned.**
- No production apply in this checkpoint.
- No app UI/runtime/service changes in this checkpoint.
- No AI provider wiring in this checkpoint.
- No PDF/export implementation in this checkpoint.
- No parent-visible AI report release flow implemented yet.

## 2) Tables confirmed

Verified tables exist:

- `ai_parent_reports`
- `ai_parent_report_versions`
- `ai_parent_report_evidence_links`
- `ai_parent_report_release_events`

## 3) RLS confirmation

- RLS is enabled on all four tables.
- Policies exist for all four tables.
- Parent report visibility remains RLS-bound.
- Frontend posture remains anon client + JWT (no service-role frontend usage).
- Student remains blocked by omission/current MVP policy shape.
- Parent access path remains released-only + linked-child scoped by helper design.

## 4) Helper function confirmation

Verified helper functions exist:

- `ai_parent_report_branch_id`
- `can_manage_ai_parent_report`
- `can_access_ai_parent_report`
- `can_insert_ai_parent_report_row_030`
- `can_manage_ai_parent_report_version`
- `can_access_ai_parent_report_version`

## 5) Constraint/FK confirmation

- `ai_parent_reports` FK constraints are present.
- `current_version_id` FK exists.
- Same-report pair FK exists:
  - `(id, current_version_id) -> ai_parent_report_versions(report_id, id)`
- This prevents `current_version_id` from pointing to another report’s version row.

## 6) Append-first audit/version posture

- `ai_parent_report_versions` is append-first in MVP policy shape:
  - insert/select policies exist,
  - no broad update/delete policies.
- `ai_parent_report_release_events` is append-first in MVP policy shape:
  - insert/select policies exist,
  - no broad update/delete policies.
- Version and release-event audit history is protected in MVP posture.

## 7) Safety boundaries

- AI drafts remain staff-only.
- No parent-visible report release workflow is implemented yet.
- No mock/real AI provider implementation in this checkpoint.
- No auto-release behavior.
- No notification/email behavior.
- No PDF/export behavior.
- Fake/dev data posture only.
- No provider keys in repo/frontend.
- No service-role frontend usage.

## 8) Current product state

- AI parent report data model foundation is now applied in DEV.
- Service/UI flows are not implemented yet.
- Next work should prove draft/review/release service behavior with fake/dev data and manual/mock generation before any real provider integration.

## 9) Recommended next milestone

Choose:

- A. AI parent report service + smoke test with manual/mock source
- B. Report UI shell with demo data
- C. Real AI provider integration
- D. PDF/export planning
- E. Notification/email planning

Recommendation: **A first**.

Why A first:

- SQL/RLS foundation is now applied in DEV.
- Service proof should come before UI wiring.
- Use `generation_source` manual/mock-only in this phase.
- Keep real provider integration deferred.
- Smoke should prove:
  - teacher/staff draft path,
  - parent draft block,
  - released visibility to linked parent only,
  - version/release-event audit rows.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
6b975ae Fix AI parent reports SQL draft review issues

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
AI parent report service + smoke test with manual/mock source only.

Hard constraints:
- Do not change app UI in this milestone.
- Do not change runtime page behavior.
- Do not add real AI provider wiring.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not change Supabase SQL/RLS in this milestone.
- Do not apply SQL.
- Do not use service-role key in frontend.
- Do not expose env values/passwords.
- Do not commit .env.local.
- Do not implement PDF/export.
- Do not auto-release AI-generated content.
- Use fake/dev data only.

Deliverables:
1) Service-layer read/write methods for draft/review/release lifecycle using existing anon+JWT+RLS model.
2) Mock/manual generation-source-safe version creation path (`manual`/`mock_ai` only).
3) Focused smoke script proving:
   - staff draft/create/edit/review path,
   - parent cannot see draft,
   - released report/current version visible to linked parent only,
   - unrelated parent blocked,
   - release/version audit rows recorded.
4) Checkpoint doc summarizing outcomes and safety boundaries.

Validation efficiency rule:
Run only what matches changed files.
- If docs-only: `git diff --name-only`
- If runtime/service files change: run relevant build/lint/typecheck + focused smoke only
```

## 11) Follow-up checkpoint (service + smoke completed)

- Follow-up milestone A is now implemented:
  - AI parent report service read/write path,
  - focused smoke script for draft/review/release boundaries.
- This follow-up does **not** change SQL/RLS from `030`.
- This follow-up does **not** add UI, PDF/export, or real AI provider wiring.
- Manual/mock-only source posture is enforced in service logic.
- Parent draft visibility remains blocked; released linked-child visibility path is tested.
- Checkpoint reference:
  - `docs/ai-parent-report-service-smoke-checkpoint.md`.

# Mock AI Parent Report Draft Generator Plan

Date: 2026-05-02  
Scope: planning-only milestone for mock AI parent report draft generation before any real provider integration

## 1) Current state

- AI parent report SQL/RLS foundation exists and is already applied in DEV for current milestone flows.
- Staff AI parent report UI exists at `/ai-parent-reports`.
- ParentView released-report display exists and is release-bound/current-version-bound.
- AI parent report service + smoke path is passing with expected fixture CHECK notes.
- Real AI provider is not wired.
- Mock draft generator is not implemented yet.
- PDF/export is not implemented.

## 2) Product purpose

This milestone should define a safe mock draft generator that:

- generates a draft report from structured fake/manual evidence inputs,
- helps teachers draft parent-facing report language faster,
- keeps teacher review/edit decisions central,
- never auto-releases content to parents,
- prepares service and workflow contracts for future real provider integration.

## 3) Mock generator scope

Planned scope:

- local/server-side mock function only (no external AI call),
- output is saved as a draft version path only,
- `generationSource='mock_ai'`,
- output uses structured section fields (`structuredSections` + optional final text fields),
- parent-friendly wording style,
- deterministic fake/dev output for repeatable testing.

Out of scope:

- real provider calls,
- provider keys/secrets,
- PDF/export,
- parent auto-notify or auto-release.

## 4) Input data model

Planned generation input contract (fake/dev-safe):

- report metadata (`reportId`, `studentId`, `classId`, `branchId` where available),
- report type (`monthly_progress`, `weekly_brief`, etc.),
- report period (`reportPeriodStart`, `reportPeriodEnd`),
- student/class context labels (parent-safe labels only),
- attendance summary,
- homework completion summary,
- lesson progression summary,
- strengths summary,
- improvement areas summary,
- teacher notes (explicitly selected for inclusion),
- next recommendations seed,
- evidence links summary payload (sanitized, no raw private paths).

Input guard notes:

- no raw storage paths,
- no secret/environment values,
- no unselected internal-only notes.

## 5) Output sections

Mock generator should return these sections:

- summary,
- attendance/punctuality,
- lesson progression,
- homework completion,
- strengths,
- areas for improvement,
- next recommendations,
- parent support suggestions,
- teacher final comment.

Formatting expectations:

- concise parent-friendly wording,
- no diagnosis-like claims,
- explicit insufficient-data wording when inputs are sparse.

## 6) Teacher approval boundary

Required lifecycle boundary:

- mock generation creates a draft version only,
- teacher must review/edit before workflow progression,
- report still follows submit -> approve -> release actions,
- no auto-release to parent,
- parent cannot see draft versions before release.

## 7) Safety/quality rules

Draft generation rules:

- no diagnosis-like claims or medical-style statements,
- no unsupported negative labels,
- use insufficient-data fallback language when data is missing,
- keep section-level traceability to selected evidence domains,
- never include raw private object paths or bucket URLs,
- exclude internal staff notes unless intentionally selected for parent-safe inclusion,
- no provider keys/secrets/logging,
- keep error/status messages safe and generic.

## 8) Service design options

### A) Add mock generator helper inside `src/services/supabaseWriteService.js`
- Pros: smallest surface-area change, reuses existing lifecycle guards and `generationSource` checks, fastest path to smoke coverage.
- Cons: grows write service scope and can reduce separation if AI logic expands later.

### B) Add separate `aiParentReportDraftService`
- Pros: cleaner separation of generation logic from persistence/write lifecycle; easier future migration to real provider adapter.
- Cons: one extra service boundary to wire and maintain.

### C) Add Supabase Edge Function mock endpoint
- Pros: mirrors future real-provider boundary shape.
- Cons: unnecessary deployment/ops overhead for this milestone; not needed before mock contract is stable.

### D) UI-only mock generation
- Pros: very fast visual prototype.
- Cons: weakest correctness/security boundary; not ideal for smoke-proofing service behavior.

Recommendation: **A first**, then evolve toward **B** if generation logic grows.

Reason:

- this milestone should prove service-layer behavior and smoke safety with minimal architecture churn,
- current write service already owns generationSource/lifecycle guardrails,
- Edge Function should wait until real provider planning/contract finalization.

## 9) Smoke test plan

Future focused smoke should prove:

- mock draft generation creates version with `generationSource='mock_ai'`,
- `real_ai` remains blocked,
- teacher/staff can read mock draft version in scope,
- parent cannot see mock draft before release,
- release still required for parent visibility,
- released mock version is visible only to linked parent,
- no real provider calls occur,
- no PDF/export path is exercised.

## 10) UI integration plan

Future staff UI integration (after service proof):

- add `Generate Mock Draft` action in staff report workflow,
- preview generated sections before save,
- allow teacher inline edits,
- save as report version with `mock_ai` source,
- keep parent visibility blocked until explicit release.

## 11) Recommended next milestone

Choose:

- A. Mock AI parent report draft service + smoke test
- B. Mock AI draft UI button
- C. Real AI provider integration planning
- D. PDF/export planning
- E. Notification/email planning

Recommendation: **A first**.

Why:

- service proof should come before UI wiring,
- mock contract should be stable before real provider planning/implementation,
- teacher approval + release boundary is safest when service behavior is validated first.

## 12) Next implementation prompt (copy-paste)

```text
Latest expected commit:
a3cd924 Document ParentView AI report display UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Mock AI parent report draft service + smoke test only.

Do not change app UI.
Do not change runtime logic outside AI parent report mock draft service path.
Do not change Supabase SQL.
Do not change RLS policies.
Do not apply SQL.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values/passwords.
Do not commit .env.local.
Do not upload files.
Do not use real student/parent/teacher/school/curriculum/homework/photo/payment/announcement/attendance/report/communication data.
Use fake/dev data only.
Do not use service role key in frontend.
Do not remove demoRole.
Do not remove demo/local fallback.
Do not auto-send emails/notifications/live-chat.
Do not implement real AI provider wiring.
Do not implement PDF/export.
Do not auto-release AI-generated content to parents.

Goal:
Implement mock AI parent report draft service behavior and focused smoke proof only.

Required deliverables:
1) Service entry-point for deterministic mock section generation.
2) Persist draft version with generationSource='mock_ai'.
3) Preserve teacher review + submit/approve/release boundary.
4) Focused smoke assertions:
   - mock_ai generation PASS
   - real_ai blocked PASS
   - parent draft blocked PASS
   - released linked parent visibility PASS
   - no provider calls, no PDF/export PASS
5) Update checkpoint docs.

Validation efficiency rule:
If runtime files change, run targeted build/lint/typecheck + focused smokes.
If docs-only, run:
- git diff --name-only
```

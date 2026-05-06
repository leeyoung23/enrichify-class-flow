# AI Parent Report UI Shell Checkpoint

Date: 2026-05-02  
Scope: docs-only finalization for staff-side AI parent report UI shell milestone

## 1) Key checkpoint notes

- Staff-only AI Parent Reports UI shell is implemented.
- Route `/ai-parent-reports` is added.
- Sidebar/navigation is wired for staff roles.
- Demo/manual data support is implemented.
- ParentView released-report display is not added yet.
- No real AI provider integration.
- No PDF/export implementation.
- No notification/email side effects.

## 2) Placement and UI behavior

- Placement:
  - dedicated staff page at `/ai-parent-reports`.
  - not placed inside `ParentView`.
- Staff UI includes:
  - report list surface,
  - selected report detail,
  - current version display,
  - version history display,
  - evidence link display,
  - lifecycle action controls.
- Safe state handling includes:
  - loading state,
  - empty state,
  - generic error state.

## 3) Role/demo behavior

- HQ/admin can view/manage where RLS allows.
- Branch supervisor can view/manage own-branch scope where RLS allows.
- Teacher can view/create/edit/review assigned reports where RLS allows.
- Parent/student are not given the staff navigation route.
- Demo mode uses local fake/dev report rows only.
- No Supabase report calls are made in demo mode.
- No real AI calls are made.

## 4) Report list/detail behavior

Report list fields:

- report type
- student/class/branch id labels
- report period
- status badge
- current version indicator
- created/updated timestamps
- open/select report action

Report detail fields:

- report metadata
- current version structured sections
- version history
- evidence links
- staff-facing only

## 5) Manual/mock version behavior

- Draft create form includes:
  - `studentId`
  - `classId` (optional)
  - `branchId`
  - `reportType`
  - `reportPeriodStart`
  - `reportPeriodEnd`
  - `assignedTeacherProfileId` (optional)
- `generationSource` is limited to:
  - `manual`
  - `mock_ai`
- No `real_ai` option is available in UI shell.
- Manual section fields include:
  - summary
  - strengths
  - improvement areas
  - next recommendations
  - teacher final comment

## 6) Lifecycle action behavior

- `Submit for Review`
- `Approve`
- `Release selected version`
- `Archive`
- Release requires selected `versionId`.
- No auto-release behavior.
- No email/notification side effects.
- No PDF/export behavior.

## 7) ParentView relationship

- ParentView report display is intentionally deferred.
- ParentView remains parent-facing and unchanged for AI parent reports.
- Next product gap is released-report display for linked parents.
- Future parent scope should remain:
  - released report/current version only,
  - no evidence links,
  - no raw AI draft visibility.

## 8) Safety boundaries

- No SQL/RLS changes.
- No real AI provider calls.
- No provider keys.
- No service-role frontend usage.
- No parent draft visibility widening.
- No raw SQL/RLS/env leakage in UI messaging.
- No PDF/export.
- No notification/email/live-chat side effects.
- Demo/local fallback remains preserved.

## 9) Validation result

- `git diff --name-only` ran before tests.
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:ai-parent-reports` PASS (expected unrelated-parent CHECK)
- `npm run test:supabase:parent-announcements` PASS (expected unrelated-parent CHECK)
- `npm run test:supabase:announcements:phase1` PASS (expected optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` CHECK)
- `npm run test:supabase:announcements:mytasks` PASS
- `npm run test:supabase:company-news:create` PASS
- npm `devdir` warning remains non-blocking when observed.

## 10) What remains future

- ParentView released-report display UI.
- Mock AI draft-assist UX/service work.
- Real AI provider integration.
- PDF/export planning/implementation.
- Notification/email flow.
- Selector polish for readable student/class/branch labels.
- Mobile manual QA pass.

## 11) Recommended next milestone

Choose:

- A. ParentView released-report display planning
- B. ParentView released-report display UI wiring
- C. Mock AI draft generator planning
- D. Real AI provider integration
- E. PDF/export planning

Recommendation: **A first**.

Why:

- staff release action now exists,
- parent output surface is the missing release boundary,
- parent-safe display should be planned before generating more AI content,
- future parent scope must stay released linked-child current-version only,
- parent must not see evidence links or raw AI draft content,
- mock AI draft generator can follow after parent release surface is shaped.

## 12) Next implementation prompt (copy-paste)

```text
Latest expected commit:
89a1ad5 Add AI parent report UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

ParentView released-report display planning only.

Do not change app UI.
Do not change runtime logic.
Do not add services.
Do not change Supabase SQL/RLS.
Do not apply SQL.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values/passwords.
Do not use service role key in frontend.
Do not add PDF/export.
Do not add notification/email/live-chat side effects.
Do not auto-release AI-generated content.
Use fake/dev data only.

Goal:
Plan a parent-safe released-report display milestone for ParentView.

Planning focus:
1) Parent-only released linked-child current-version visibility boundary.
2) No evidence-links/raw AI draft visibility.
3) UI placement and safe states.
4) Demo/local fallback behavior.
5) Test/validation plan before implementation.

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke unless runtime files change.
```


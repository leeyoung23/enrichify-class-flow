# Mock AI Parent Report Draft UI Final Checkpoint

Date: 2026-05-02  
Scope: docs-only finalization for staff `Generate Mock Draft` wiring milestone

## Follow-up (provider adapter skeleton — no UI change)

- Server-side adapter skeleton added (`fake`/`disabled` only); staff UI still calls `generateMockAiParentReportDraft` only.
- Milestone checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-checkpoint.md`
- Final docs checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`
- ParentView and release boundaries unchanged; **no `real_ai`** unlock.

## 1) Key checkpoint notes

- `Generate Mock Draft` UI is added.
- Staff-side only.
- No real AI provider.
- No provider keys.
- Staff UI does not call Edge Functions; a separate Edge scaffold exists for future wiring (`supabase/functions/generate-ai-parent-report-draft/`).
- No PDF/export.
- No notifications/emails.
- No auto-release.
- ParentView visibility rules are unchanged.

## 2) Generate Mock Draft UI behavior

- Placement:
  - inside selected report detail workflow in `src/pages/AiParentReports.jsx`.
- Availability:
  - button is usable only when a report is selected.
- Authenticated invocation:
  - calls `generateMockAiParentReportDraft({ reportId, input })`.
- No `real_ai` option is exposed in this UI flow.
- No external provider/API call is made.

## 3) Demo behavior

- `demoRole` path is local-only.
- Generates local `mock_ai` version entry only.
- Appends to local version history.
- Updates local report `updatedAt`.
- No Supabase calls in demo generation path.
- No auto-release behavior.
- Parent demo remains released-only.

## 4) Authenticated behavior

- Authenticated staff path calls:
  - `generateMockAiParentReportDraft({ reportId, input })`.
- Success behavior:
  - refreshes report list/detail/version state,
  - shows safe success message.
- Failure behavior:
  - shows generic safe error message.
- No raw SQL/RLS/env leakage in user-facing copy.

## 5) Teacher approval/release boundary

- Mock draft remains staff-side only.
- Not sent to parents automatically.
- No automatic submit/approve/release.
- Existing lifecycle buttons remain the only release path.
- Parent sees report only after explicit release.

## 6) Display/refresh behavior

- Generated mock version appears in `Version History`.
- Current version/detail refreshes through existing load behavior.
- ParentView remains unchanged.
- No evidence links are exposed to parent.
- No provider debug metadata is shown.

## 7) Safety boundaries

- No SQL/RLS changes.
- No service-role frontend usage.
- No provider keys.
- No real provider wiring.
- No PDF/export.
- No notification/email/live-chat side effects.
- Demo/local fallback preserved.

## 8) Validation result

- Validation efficiency rule applied for docs-only checkpoint:
  - `git diff --name-only` executed.
- Historical runtime validation snapshot for this milestone:
  - `npm run build` PASS
  - `npm run lint` PASS
  - `npm run typecheck` PASS
  - `npm run test:supabase:ai-parent-report:mock-draft` PASS
  - `npm run test:supabase:ai-parent-reports` PASS with expected unrelated-parent CHECK
  - `npm run test:supabase:parent-announcements` PASS with expected unrelated-parent CHECK
  - `npm run test:supabase:announcements:phase1` PASS with expected optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` CHECK
  - `npm run test:supabase:parent-announcements:media` PASS
  - `ReadLints` on `src/pages/AiParentReports.jsx` shows no linter errors
  - npm `devdir` warning remains non-blocking if observed

## 9) What remains future

- provider-boundary planning,
- real AI provider selection/integration,
- optional mock source note polish,
- PDF/export planning,
- notification/email planning,
- final manual/mock AI report QA checkpoint.

## 10) Recommended next milestone

Choose:

- A. Real AI provider-boundary planning
- B. Real AI provider implementation
- C. PDF/export planning
- D. Notification/email planning
- E. Final manual/mock AI report QA checkpoint

Recommendation: **A first**.

Why:

- mock workflow is already wired,
- before real AI implementation we need provider boundary, prompt contract, schema, data minimization, server-side key storage, logging, cost controls, and teacher approval guarantees,
- do not jump straight into provider implementation.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document mock AI parent report draft UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Real AI provider-boundary planning only.

Do not change app UI.
Do not change runtime logic.
Do not add services.
Do not change Supabase SQL.
Do not change RLS policies.
Do not apply SQL.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values or passwords.
Do not commit .env.local.
Do not upload files.
Do not use real student, parent, teacher, school, curriculum, homework, photo, payment, announcement, attendance, report, or parent communication data.
Use fake/dev data only.
Do not use service role key in frontend.
Do not remove demoRole.
Do not remove demo/local fallback.
Do not auto-send emails or notifications.
Do not start live chat.
Do not implement real AI provider wiring.
Do not implement PDF/export.
Do not auto-release AI-generated content to parents.
Do not change ParentView visibility rules.

Goal:
Produce provider-boundary planning docs only for future real AI parent report draft generation.

Planning must define:
1) provider boundary and server-side secret model
2) prompt/response contract and section schema
3) data minimization and redaction rules
4) logging/observability and cost controls
5) teacher approval guarantees and no-auto-release enforcement

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

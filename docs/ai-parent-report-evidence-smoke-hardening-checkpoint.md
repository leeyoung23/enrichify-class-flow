# AI Parent Report Evidence Smoke Hardening Checkpoint

Date: 2026-05-02  
Scope: docs-only checkpoint for AI parent report evidence-link smoke hardening

## 0) UI shell alignment update

- Staff AI parent report UI shell is now added in a dedicated staff route:
  - `/ai-parent-reports`
- Evidence-link behavior remains aligned with that UI shell:
  - staff-facing evidence visibility in report detail,
  - parent direct evidence-link visibility remains blocked/empty.
- No SQL/RLS changes were introduced in the UI shell milestone.
- No real AI provider and no PDF/export were added.
- ParentView released-report display was deferred in this evidence checkpoint and is now delivered in a follow-up milestone.
- Follow-up: ParentView released-report display UI is now wired with released/current-version-only boundaries and still does not expose evidence links.

## 1) Key checkpoint notes

- Safe evidence-link positive insert now passes.
- Staff evidence read-back now passes.
- Unsafe raw/private path guard remains proven.
- Parent direct evidence-link visibility remains blocked/empty.
- No UI added.
- No SQL/RLS changes.
- No real AI provider integration.
- No PDF/export implementation.

## 2) Evidence-link positive test behavior

- Smoke uses fake/dev-safe `summarySnapshot` payload.
- Payload excludes:
  - raw file paths,
  - bucket names,
  - private URLs,
  - local file paths,
  - real names/data.
- Result:
  - safe evidence-link insert PASS,
  - staff evidence read-back PASS.

## 3) Unsafe evidence guard behavior

- Unsafe raw/private path-style values in `summarySnapshot` remain blocked by service guard.
- This is a safety proof, not a failure.
- No unsafe data is widened into evidence-link rows.

## 4) Parent visibility behavior

- Parent direct evidence-link read remains blocked/empty.
- MVP boundary remains:
  - parent sees released report/current released version only,
  - parent does not directly read internal `ai_parent_report_evidence_links`.
- Evidence links remain staff-facing traceability metadata.

## 5) Full AI parent report smoke coverage now proven

- draft create PASS
- version create PASS
- first version number = 1 PASS
- submit_for_review PASS
- approve PASS
- release selected version PASS
- `current_version_id` set to selected version PASS
- linked parent released report visible PASS
- linked parent current version visible PASS
- parent version history limited to released current version PASS
- student blocked/empty PASS
- `real_ai` blocked PASS
- no real provider calls PASS
- no PDF/export paths PASS
- safe evidence insert/read-back PASS
- unsafe evidence guard PASS
- parent direct evidence-link read blocked/empty PASS

## 6) CHECK/WARNING notes

- Unrelated parent credentials missing/invalid remains expected CHECK.
- Optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` missing remains expected phase1 CHECK.
- npm `devdir` warning (if shown) remains non-blocking.
- No unsafe widening observed.

## 7) Tests run and results

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:ai-parent-reports` PASS
- `npm run test:supabase:parent-announcements` PASS
- `npm run test:supabase:announcements:phase1` PASS

## 8) Safety boundaries

- AI drafts remain staff-only.
- Parent draft visibility remains blocked.
- Parent released-current-version-only visibility remains enforced.
- Evidence links remain staff-facing only.
- No service-role frontend usage.
- No provider keys.
- No auto-release.
- No notifications/emails.
- No PDF/export.

## 9) Recommended next milestone

Choose:

- A. AI parent report UI shell with demo/manual data
- B. Mock AI report draft service
- C. Real AI provider integration
- D. PDF/export planning
- E. Notification/email planning

Recommendation: **A first**.

Why:

- data model, RLS boundary, service flow, and evidence traceability checks are now proven,
- UI shell can validate teacher workflow safely with demo/manual data only,
- mock AI draft service should follow once UI structure and approval flow are visible,
- real provider integration should wait until manual/demo workflow behavior is stable,
- PDF/export remains a later phase.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
348c31c Harden AI parent report evidence smoke

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
AI parent report UI shell with demo/manual data only.

Hard constraints:
- Do not change Supabase SQL/RLS.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values/passwords.
- Do not use service role in frontend.
- Do not implement real provider wiring.
- Do not implement PDF/export.
- Do not auto-release AI-generated content.
- Use fake/dev data only.
- Preserve demoRole and local/demo fallback.

Deliverables:
1) Teacher/staff-facing UI shell for AI parent report draft/review/release flow using existing services.
2) No parent-facing report UI in this milestone.
3) No real AI generation wiring; manual/mock workflow presentation only.
4) Update checkpoint docs.

Validation efficiency rule:
Run only what matches changed files.
- Docs-only: `git diff --name-only`
- Runtime/UI changes: run relevant build/lint/typecheck + focused smokes
```

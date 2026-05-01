# Company News Create UI Checkpoint

Date: 2026-05-01  
Scope: documentation checkpoint for authenticated HQ Company News create UI wiring only

## 1) What was implemented

- Authenticated HQ/admin Create Company News UI is wired in `src/pages/Announcements.jsx`.
- `Save Draft` is wired.
- `Create & Publish` is wired with safe two-step behavior.
- Existing services are used:
  - `createCompanyNews(...)`
  - `publishCompanyNews(...)`
- Target selection and target payload mapping are wired using existing target payload pattern.
- Post-success behavior is wired:
  - announcement query refresh
  - switch to Company News context
  - select/open created item when available
- Submit actions are loading/disabled while pending.

## 2) Files changed in milestone

- `src/pages/Announcements.jsx`
- `docs/company-news-create-ui-checkpoint.md`
- `docs/company-news-create-service-smoke-checkpoint.md`
- `docs/company-news-create-path-plan.md`
- `docs/company-news-ui-shell-checkpoint.md`
- `docs/company-news-runtime-popup-ui-checkpoint.md`
- `docs/company-news-warm-popup-plan.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Authenticated HQ create behavior

- Non-demo HQ/admin can create Company News.
- Branch supervisor and teacher are view-only for Company News create.
- Parent/student remain blocked from staff `Announcements` route.
- Frontend continues to use anon client + JWT only (no service-role frontend usage).
- Error copy remains safe and generic.

## 4) Draft/publish flow

- `Save Draft` -> `createCompanyNews(...)`.
- `Create & Publish` -> `createCompanyNews(...)` then `publishCompanyNews(...)`.
- Publish requires at least one target.
- Submit buttons are disabled while request is pending.
- Success path:
  - refreshes announcement queries,
  - switches to Company News context,
  - selects/opens created item when available.
- No raw SQL/RLS/env leakage is surfaced in UI errors.

## 5) Target handling

- Supported target types:
  - `branch`
  - `role`
  - `profile`
- Target payload mapping reuses existing pattern.
- `class` target is intentionally not added in this milestone.
- No parent/student target support is added.
- No parent-facing audience is added.
- Publish path includes early target presence validation.

## 6) demoRole behavior

- HQ demo create remains local-only.
- Supervisor/teacher demo remain view-only for Company News create.
- No Supabase Company News create calls are made in demo mode.
- Existing demo/local fallback behavior is preserved.

## 7) Safety boundaries

- No SQL/RLS changes.
- No SQL apply.
- No parent-facing announcements/events.
- No notifications/emails/live chat.
- No MyTasks side effects.
- Company News remains excluded from MyTasks by default.
- No `parent_facing_media`.
- No service-role frontend usage.

## 8) Validation result

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:company-news:create` PASS
- `npm run test:supabase:company-news:popup` PASS
  - note: first popup smoke run had transient auth-session CHECK/FAIL; immediate rerun passed fully
- `npm run test:supabase:announcements:mytasks` PASS
- `npm run test:supabase:announcements:phase1` PASS

## 9) What remains future

- Parent-facing announcements/events.
- Notification/email automation.
- Company News class-target support (if needed later).
- Optional Company News-to-MyTasks opt-in model.
- Additional runtime popup polish/tuning.
- Reports/PDF/AI OCR later.
- Attendance email notification later.

## 10) Recommended next milestone

Options:

- A. Parent-facing announcements/events planning
- B. Notification/email automation planning
- C. Company News polish/tuning
- D. Reports/PDF/AI OCR planning
- E. Attendance email notification planning

Recommendation: **A first**.

Why A first:

- Staff-facing Announcements is now a strong internal prototype.
- Parent-facing announcements/events is the next natural communication layer.
- Notifications/emails should wait until parent/staff communication surfaces are better shaped.
- Reports/PDF/AI OCR and attendance email are separate major tracks.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document HQ Company News create UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent-facing announcements/events planning only.

Hard constraints:
- Docs/planning only.
- Do not change app UI/runtime logic/services in this milestone.
- Do not change Supabase SQL/RLS and do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat.
- Do not enable parent_facing_media.
- Use fake/dev data only.

Deliverables:
1) Parent-facing announcements/events scope and role model.
2) Internal-vs-parent separation boundaries and non-goals.
3) Suggested data/service planning phases without runtime changes.
4) Risks/safeguards and phased rollout recommendation.
5) Documentation checkpoint updates only.

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

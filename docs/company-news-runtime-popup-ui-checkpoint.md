# Company News Runtime Popup UI Checkpoint

Date: 2026-05-01  
Scope: runtime app-shell warm popup UI shell/wiring using existing popup services only

## Checkpoint update (HQ create UI now wired in Announcements)

- Authenticated HQ create/publish UI for Company News is now wired on `Announcements`.
- Runtime popup scope remains unchanged and still relies on existing popup services.
- Company News authoring now uses existing write services:
  - `createCompanyNews(...)`
  - `publishCompanyNews(...)`
- Branch supervisor and teacher remain view-only for Company News create in authenticated mode.
- Company News remains excluded from MyTasks by default.
- No notifications/emails/live chat behavior was added in this checkpoint.
- Parent-facing announcements/events remain future.

## Checkpoint update (027 create-path SQL manual DEV apply)

- Manual DEV apply for Company News create-path SQL is completed:
  - `supabase/sql/027_company_news_create_foundation.sql`
  - SQL Editor result: `Success. No rows returned.`
- Runtime popup wiring in this doc remains unchanged (no runtime/UI/service edits in this checkpoint).
- Relevant impact for runtime popup context:
  - HQ direct `company_news` draft insert is now DB-allowed by insert policy.
  - popup smoke confirms eligible published Company News lifecycle still behaves as expected.
- Preserved boundaries remain unchanged:
  - no parent-facing announcements/events,
  - no `parent_facing_media`,
  - no notifications/emails/live chat,
  - no service-role frontend usage.
- Authenticated Company News create UI remains preview-disabled until service-layer create wrapper milestone.

## 1) What was implemented

- Runtime app-shell Company News popup is wired in `src/components/layout/AppLayout.jsx`.
- Staff-only authenticated popup fetch uses `listEligibleCompanyNewsPopups({ limit: 1 })`.
- Staff demo roles use local fake popup only (no Supabase popup calls in demo).
- Seen mark uses `markCompanyNewsPopupSeen({ announcementId })`.
- Dismiss mark uses `dismissCompanyNewsPopup({ announcementId })`.
- View action navigates to `/announcements` with Company News context.
- Session/frequency guards are implemented.
- No notification/email behavior was added.
- No real HQ Company News create path was added.

## 2) Files changed (runtime popup milestone)

- `src/components/layout/AppLayout.jsx`
- `src/pages/Announcements.jsx`
- `docs/company-news-runtime-popup-ui-checkpoint.md`
- `docs/company-news-runtime-popup-ui-plan.md`
- `docs/company-news-ui-shell-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`
- `docs/company-news-popup-service-smoke-checkpoint.md`

## 3) Runtime placement

Chosen placement: **layout/app-shell adjacent (`AppLayout`)**.

Why:

- Auth/profile/demo role state is already resolved in `AppLayout`.
- Allows staff-wide behavior across routes without Dashboard-only duplication.
- Avoids showing popup before staff-role readiness.

## 4) demoRole behavior

- Staff demo roles (`hq_admin`, `branch_supervisor`, `teacher`) can see one local fake popup candidate.
- Parent/student demo roles do not see staff Company News runtime popup.
- Demo runtime popup does not call Supabase popup services.
- Dismiss is local/session-only in demo.
- View routes to `/announcements` with Company News context.
- No notifications/emails.

## 5) Authenticated read behavior

- Runtime read path uses existing service:
  - `listEligibleCompanyNewsPopups({ limit: 1 })`
- Read is gated to authenticated non-demo staff only.
- Parent/student/non-staff skip popup query path.
- Guarded single app-shell fetch attempt per session avoids repeated route-change query spam.
- Service failures are fail-silent.
- No raw backend error exposure.
- App load remains non-blocking.

## 6) Seen/dismiss behavior

- On popup show, delayed seen mark is triggered once per session/item:
  - `markCompanyNewsPopupSeen({ announcementId })`
- Dismiss action:
  - local hide immediately,
  - `dismissCompanyNewsPopup({ announcementId })` called for authenticated popup.
- View action:
  - marks seen if needed,
  - navigates to `/announcements` with `announcementId` + `preferredFilter: 'Company News'`,
  - hides popup for current session.
- No `done_status` mutation added.
- No forced `read_at` mutation was introduced in runtime UI wiring.

## 7) Frequency/session guard

- Max one popup at a time in UI.
- Session shown/hidden ID guard prevents same-item repeat in current session.
- Route-change spam prevented by one fetch attempt per app-shell session.
- If seen/dismiss backend write fails, local session guard still suppresses repeat storm.
- Backend `popup_dismissed_at` remains cross-session suppression source.

## 8) Safety boundaries

- No Supabase SQL changes.
- No RLS policy changes.
- No SQL apply.
- No new popup services.
- No service-role frontend usage.
- No notifications/emails.
- No live chat.
- No parent-facing announcements/events.
- No `parent_facing_media`.
- No real HQ Company News create path.
- Fake/dev data only in tests.

## 9) Validation result

Commands run:

- `git diff --name-only` (before tests)
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:company-news:popup` PASS

Notes:

- Expected CHECK remains: direct HQ `company_news` create is blocked by current request-first create-path constraints.
- Other popup smoke assertions passed.

## 10) What remains future

- Real HQ Company News create path planning/wiring.
- Parent-facing announcements/events track.
- Notification/email planning.
- Optional popup animation/template polish.
- Optional runtime behavior tuning (duration/priority strategy refinements) after QA feedback.
- Reports/PDF/AI OCR later.

## 11) Recommended next milestone

Choose:

- A. Real HQ Company News create path planning
- B. Parent-facing announcements/events plan
- C. Notification/email planning
- D. Popup animation/template polish
- E. Reports/PDF/AI OCR plan

Recommendation: **A first**.

Why:

- Runtime popup can now display eligible rows safely.
- Production workflow still needs safe HQ creation/publishing path for `company_news`.
- Current smoke CHECK confirms direct HQ `company_news` create remains blocked by request-first create-path constraints.
- Staff-facing Company News creation should be safely supported before parent-facing or notification tracks.

## 12) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News runtime popup UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Real HQ Company News create path planning/review only.

Hard constraints:
- Docs/planning only.
- Do not change app UI/runtime logic/services in this milestone.
- Do not change Supabase SQL/RLS and do not apply SQL.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not add notifications/emails/live chat.
- Do not use service role in frontend.
- Preserve demoRole and demo/local fallback behavior.
- Use fake/dev data assumptions only.

Deliverables:
1) Define safe HQ Company News create/publish path options under current request-first constraints.
2) Identify required policy/service review boundaries and non-goals.
3) Propose phased rollout and validation strategy before implementation.
4) Update checkpoint docs only.

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

# Company News Warm Pop-up Plan

Date: 2026-05-01  
Scope: planning-only checkpoint for Company News / Big News mode and warm portal pop-up behavior

## Checkpoint update (authenticated HQ create UI milestone)

- Authenticated HQ Company News create UI is now wired in `Announcements`.
- Draft + publish path uses existing services:
  - `createCompanyNews(...)`
  - `publishCompanyNews(...)`
- `Save Draft` and `Create & Publish` are both wired.
- Create & Publish uses safe two-step create then publish sequence.
- Publish requires at least one target and validates target presence before publish.
- Supported target types remain `branch|role|profile`; `class` target not added.
- Branch supervisor and teacher remain view-only for Company News create.
- Parent/student remain blocked from staff `Announcements` route.
- Post-success behavior refreshes queries, switches Company News context, and selects created item when available.
- Submit controls are disabled while pending; safe generic errors only.
- Company News remains excluded from MyTasks by default.
- No notification/email/live-chat side effects were added.
- Parent-facing announcements/events remain a future phase.

## Checkpoint update (MyTasks semantics alignment)

- Company News is now explicitly excluded from `listMyAnnouncementTasks(...)` default derived-read behavior.
- This aligns runtime positioning:
  - Company News = news/popup/read path,
  - Request/reminder = task/MyTasks path.
- No SQL/RLS changes were needed for this behavior update.

## Checkpoint update (026 popup status SQL draft only)

- Manual/dev-first SQL draft is now added at `supabase/sql/026_company_news_popup_status_foundation.sql`.
- `026` is SQL draft only and is not auto-applied.
- Drafted additive fields on `announcement_statuses`:
  - `popup_seen_at`
  - `popup_dismissed_at`
  - `popup_last_shown_at`
- `026` pre-apply review hardening now includes popup self-update guard:
  - `guard_announcement_statuses_popup_self_update_026()`
  - `trg_guard_announcement_statuses_popup_self_update_026`
  - this prevents accidental cross-user popup status writes while keeping existing status semantics.
- `read_at` / `last_seen_at` / `done_status` behavior remains unchanged.
- Optional announcement popup config fields are deferred for now:
  - `popup_style`
  - `popup_duration_seconds`
  - `display_until`
- Runtime app-shell popup behavior, popup service methods, notifications/emails, and parent-facing announcements/events remain future milestones.

## Checkpoint update (026 manual DEV apply confirmed)

- `supabase/sql/026_company_news_popup_status_foundation.sql` is now manually applied in Supabase DEV.
- SQL Editor result: **Success. No rows returned.**
- Verified DEV artifacts:
  - popup columns on `announcement_statuses`,
  - popup indexes (`announcement_statuses_popup_seen_at_idx`, `announcement_statuses_popup_dismissed_at_idx`, `announcement_statuses_popup_last_shown_at_idx`, `announcement_statuses_profile_popup_idx`),
  - popup self-update guard trigger/function (`trg_guard_announcement_statuses_popup_self_update_026`, `guard_announcement_statuses_popup_self_update_026`).
- Verified `announcement_statuses` policy shape remains unchanged (4 existing `020` policies).
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- Companion checkpoint:
  - `docs/company-news-popup-status-sql-application-checkpoint.md`

## Checkpoint update (popup service + smoke)

- Company News popup service methods are now implemented in read/write services:
  - `listEligibleCompanyNewsPopups(...)`
  - `markCompanyNewsPopupSeen(...)`
  - `dismissCompanyNewsPopup(...)`
- Focused popup smoke script is now added:
  - `scripts/supabase-company-news-popup-smoke-test.mjs`
  - `npm run test:supabase:company-news:popup`
- Service smoke confirms own-row seen/dismiss path and dismissed-item suppression for targeted teacher.
- Parent/student popup list path remains blocked-or-empty.
- No runtime app-shell popup UI exists yet in this checkpoint.
- No SQL/RLS changes in this checkpoint.
- No notifications/emails in this checkpoint.
- No parent-facing announcements/events in this checkpoint.
- CHECK/WARNING notes for this checkpoint:
  - direct HQ `company_news` insert remains CHECK-blocked by current request-first create-path policy (expected),
  - optional phase1 cross-branch negative fixture remains CHECK when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing,
  - npm `devdir` warning is non-blocking.

## Checkpoint update (Company News UI shell now added)

- Company News UI shell is now present in `src/pages/Announcements.jsx`:
  - Company News cards/detail shell,
  - HQ demo-only local create shell,
  - warm pop-up preview panel (non-runtime).
- No runtime app-shell pop-up behavior is implemented yet.
- No real Company News write wiring was added in this milestone.
- No MyTasks side effects, no parent-facing announcements/events, and no notifications/emails were added.
- Companion checkpoint: `docs/company-news-ui-shell-checkpoint.md`.

## Documentation-only note

- Planning/docs only in this milestone.
- No app UI/runtime logic/service/SQL/RLS changes are included here.
- Validation rule: run `git diff --name-only` only.

## 1) Current state

- Announcements internal request workflow is live.
- Staff attachments upload/list/view is live.
- MyTasks visibility for Announcement Requests is live.
- HQ/supervisor completion overview UI is live.
- Company News UI shell now exists in Announcements (cards/detail/create-demo shell).
- No runtime warm pop-up behavior exists yet.
- No notifications/emails automation exists yet.
- No parent-facing announcements/events in current staff Announcements flow.

## 2) Product purpose

Company News is the warm, HQ-led communication mode for:

- celebrations and congratulations,
- major updates and important centre news,
- event reminders,
- culture-building communication.

It is intentionally different from request/reminder operations:

- not task-oriented by default,
- more news/recognition style,
- should feel warm and lightweight rather than transactional.

Why it matters:

- reduces scattered WhatsApp announcement chains,
- centralizes internal communication context in the portal,
- supports recognition/culture without turning into chat.

## 3) Company News vs Request Announcement

### Request/reminder announcement (current operational mode)

- has target obligations,
- may require reply/upload/done,
- appears in MyTasks,
- completion overview and blocker tracking matter.

### Company News (planned warm mode)

- primarily read/acknowledge,
- no upload required by default,
- no done/undone required by default,
- may trigger warm pop-up presentation,
- optional read acknowledgement,
- no task side effect unless explicitly enabled in a later phase.

## 4) Data model fit

Existing `announcements` model already includes useful MVP fields:

- `announcement_type = company_news`
- `audience_type = internal_staff`
- `status = draft | published`
- `title`, `subtitle`, `body`
- `priority`
- `popup_enabled`
- `popup_emoji`
- `published_at`
- targeting via `announcement_targets`

MVP planning conclusion:

- Existing model is sufficient for **Company News tab + detail + basic warm-style metadata**.
- Existing model is also sufficient for a **first pop-up shell** if repetition control is session-only or read-based via existing status rows.

Likely later SQL/data-model review items (not needed for first shell):

- `popup_style`
- `popup_duration_seconds`
- explicit popup dismissal persistence (if distinct from read acknowledgement)
- `display_until`
- `celebration_theme`
- `template_id`

## 5) Warm pop-up behavior (planned)

Behavior target:

- appears when eligible staff user opens portal after new `company_news` publish,
- brief 5-10 second warm notification style,
- short headline/copy (not full article body),
- `View` action routes to Announcements Company News context/detail,
- `Dismiss` action closes quickly,
- non-blocking to normal work and never chat-like.

Design direction:

- subtle and celebratory, not noisy,
- avoid modal lock-in as default pattern,
- keep interaction one-tap friendly on mobile.

## 6) Pop-up frequency rules (planned MVP)

- show only latest/high-priority unread eligible `company_news`,
- never show multiple pop-ups at once,
- avoid repeated annoyance after dismiss/read,
- MVP repetition policy candidate:
  - at most once per login/session unless user reopens via explicit action,
  - read acknowledgement suppresses future pop-up for that item.
- emergency/urgent forced-repeat behavior is explicitly **later**, not MVP.

## 7) Role/audience rules

- HQ creates/publishes internal Company News.
- Branch supervisor views targeted/internal news allowed by RLS.
- Teacher views targeted/internal news allowed by RLS.
- Parent/student excluded from staff Company News MVP.
- Parent-facing announcements/events remain separate future track.

## 8) Templates / design direction

Candidate templates:

- congratulations,
- event reminder,
- important update,
- welcome/new staff,
- holiday/closure,
- training reminder,
- general news.

Style notes:

- emoji/confetti/spray style is optional and subtle,
- avoid disruptive animations and avoid notification fatigue,
- mobile-first card/popup readability,
- accessible dismiss and keyboard/screen-reader-compatible controls.

## 9) Read/acknowledgement behavior

MVP direction:

- reuse `announcement_statuses.read_at` / `last_seen_at` for acknowledgement signal,
- `done_status` should be ignored or remain neutral for `company_news`,
- no done/undone obligation by default for Company News.

Scope boundaries:

- MyTasks should not include `company_news` by default,
- completion overview can optionally show read/unread for news in later reporting, but task semantics remain request-focused.

## 10) RLS/security boundaries

- HQ create/manage internal Company News only.
- Staff read only targeted/internal Company News.
- Parent/student no access in staff Company News MVP.
- No `parent_facing_media` enablement.
- No cross-branch leakage.
- No service-role frontend usage.
- No public file/media assumptions; keep private/signed-url model where attachments exist.

## 11) UI placement plan

- Company News tab/filter remains inside `Announcements` page.
- News-style card layout for list.
- Detail view for full content.
- Optional celebratory style treatment in cards/detail.
- Warm pop-up component should be near app shell/dashboard load in later runtime milestone.
- No MyTasks placement by default.

## 12) Implementation options

### A) Planning only, then Company News UI shell first

Pros:

- lowest risk, aligns with current docs-first cadence,
- clarifies UX before runtime popup behavior.

Cons:

- delays user-visible differentiation for Company News.

### B) SQL/data-model review for popup fields first

Pros:

- settles future popup persistence/theming schema early.

Cons:

- higher blast radius before validating base UX shape.

### C) Real read/write wiring for `company_news` using current model first

Pros:

- quick functional path with existing fields.

Cons:

- popup behavior details may be under-specified.

### D) Warm pop-up runtime first

Pros:

- fastest visible effect.

Cons:

- highest annoyance risk if frequency/dismiss rules are not settled.

Recommendation:

- Existing fields are enough for a first MVP shell.
- **Recommend B? No.** For safest sequence, use **A-style progression with UI shell first implementation**:
  - keep this planning checkpoint,
  - then implement **Company News UI shell with demo parity**,
  - then evaluate whether SQL/data-model extensions are truly needed for persistent popup behavior.

## 13) Testing plan (future)

Target checks for future implementation milestones:

- HQ can create/publish `company_news` (where supported).
- Teacher/supervisor can view targeted internal Company News.
- Parent/student remain blocked from staff Company News.
- Warm pop-up appears only for unread eligible Company News.
- Dismiss/read suppresses repeat according to chosen MVP rule.
- `View` action routes to Announcements.
- No notification/email side effects.
- No MyTasks task side effect by default.

## 14) Risks and safeguards

Risks:

- pop-up annoyance/fatigue,
- overuse of celebration effects,
- urgent info missed if dismissed too quickly,
- confusion between Company News and task requests,
- internal-vs-parent content confusion,
- cross-branch visibility leakage,
- accessibility/mobile usability regressions.

Safeguards:

- strict frequency cap (single item, limited repeat),
- clear visual distinction: News vs Request,
- conservative animation defaults,
- explicit copy hierarchy (`View details` path),
- RLS scope checks remain authoritative,
- mobile-first QA + accessibility checks before rollout.

## 15) Recommended next milestone

Choose:

- **A.** Runtime warm pop-up planning/data model review
- **B.** Runtime warm pop-up UI shell
- **C.** Parent-facing announcements/events plan
- **D.** Notification/email automation planning
- **E.** Reports/PDF/AI OCR plan

**Recommendation: A (Runtime warm pop-up planning/data model review).**

Why:

- Company News UI shell is already in place.
- Runtime pop-up requires careful dismissal/frequency/persistence rules before any implementation.
- This helps avoid repeated/annoying pop-up behavior.
- Notification/email coupling should remain separate for now.
- Parent-facing announcements should follow after staff runtime model is clear.

## 16) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News runtime warm pop-up planning/data model review only.

Hard constraints:
- Docs/planning only.
- Do not implement runtime warm pop-up behavior in this milestone.
- Do not change Supabase SQL or RLS. Do not apply SQL.
- Do not add services.
- Do not add MyTasks task side effects for Company News.
- Do not auto-send emails/notifications.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only.

Deliverables:
1) Runtime warm pop-up trigger/frequency/dismissal strategy.
2) Data-model review: existing fields vs optional extension candidates.
3) Non-goals and safety boundaries before runtime implementation.
4) Phased rollout recommendation.

Validation efficiency rule:
- Docs-only: run `git diff --name-only` only.
```

# Company News Runtime Popup Data Model Review

Date: 2026-05-01  
Scope: planning/review only for safest runtime warm pop-up strategy and data model requirements

## Checkpoint update (026 popup status SQL draft only)

- New manual/dev-first SQL draft is added at `supabase/sql/026_company_news_popup_status_foundation.sql`.
- `026` is draft-only and is **not applied automatically**.
- `026` drafts additive per-user popup status fields on `announcement_statuses`:
  - `popup_seen_at`
  - `popup_dismissed_at`
  - `popup_last_shown_at`
- `026` adds popup-status indexes only; no destructive operations and no data deletes.
- `026` pre-apply review hardening adds popup-field self-update guard:
  - `guard_announcement_statuses_popup_self_update_026()`
  - `trg_guard_announcement_statuses_popup_self_update_026`
  - purpose: prevent cross-user popup dismissal/seen updates through broad manager update paths.
- Existing `read_at`, `last_seen_at`, and `done_status` behavior remains unchanged.
- RLS posture remains conservative: no policy weakening, no parent/student access opening, no cross-branch widening.
- Optional announcement-level popup config fields (`popup_style`, `popup_duration_seconds`, `display_until`) are intentionally deferred in `026`.
- Runtime popup service/UI behavior remains future, along with notification/email automation and parent-facing announcements/events.

## Checkpoint update (026 manual DEV application documented)

- `026` is now manually applied in Supabase DEV SQL Editor.
- SQL Editor result: **Success. No rows returned.**
- No production apply in this checkpoint.
- Verified in DEV:
  - columns on `public.announcement_statuses`: `popup_seen_at`, `popup_dismissed_at`, `popup_last_shown_at` (all nullable timestamptz),
  - indexes: `announcement_statuses_popup_seen_at_idx`, `announcement_statuses_popup_dismissed_at_idx`, `announcement_statuses_popup_last_shown_at_idx`, `announcement_statuses_profile_popup_idx`,
  - trigger/function: `trg_guard_announcement_statuses_popup_self_update_026`, `guard_announcement_statuses_popup_self_update_026`.
- Verified policy posture remains unchanged for `announcement_statuses` (4 policies):
  - `announcement_statuses_select_020`
  - `announcement_statuses_insert_020`
  - `announcement_statuses_update_020`
  - `announcement_statuses_delete_020`
- No runtime/UI/service changes in this checkpoint.
- Manual application checkpoint doc:
  - `docs/company-news-popup-status-sql-application-checkpoint.md`

## Checkpoint update (popup service + smoke)

- Popup service methods are now added:
  - read: `listEligibleCompanyNewsPopups(...)`
  - write: `markCompanyNewsPopupSeen(...)`, `dismissCompanyNewsPopup(...)`
- Focused smoke test is now added:
  - `scripts/supabase-company-news-popup-smoke-test.mjs`
  - `npm run test:supabase:company-news:popup`
- Verified in service smoke:
  - targeted teacher can list eligible popup,
  - seen/dismiss writes succeed for own row,
  - dismissed item is no longer returned,
  - parent/student blocked-or-empty,
  - cross-user popup dismiss write attempt by manager is blocked.
- No runtime app-shell popup UI is wired in this checkpoint.
- No SQL/RLS changes were made in this checkpoint.
- No notifications/emails were added.
- No parent-facing announcements/events were added.
- Service/smoke checkpoint doc:
  - `docs/company-news-popup-service-smoke-checkpoint.md`
- Checkpoint notes:
  - expected CHECK: direct HQ `company_news` insert remains blocked by current request-first create-path policy shape,
  - expected CHECK: optional phase1 cross-branch negative fixture may remain skipped without `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`,
  - non-blocking npm warning about unknown env config `devdir` may appear in local runs.

## Documentation-only note

- This is a docs/review checkpoint only.
- No app UI/runtime/service/SQL/RLS changes are included here.
- Validation rule for this checkpoint: `git diff --name-only` only.

## 1) Current state

- Company News UI shell exists in `Announcements`.
- Warm pop-up preview panel exists only in Company News detail.
- No runtime app-shell pop-up trigger exists yet.
- No popup persistence/dismissal backend exists yet.
- No notification/email automation exists.
- No parent-facing announcements/events in this scope.

## 2) Product goal

Define a warm runtime behavior that:

- shows a short 5-10 second Company News notice after staff portal entry when eligible news exists,
- increases visibility of company-wide internal updates without WhatsApp spam,
- remains non-disruptive to daily work,
- routes users to Announcements detail through a `View` action,
- avoids repeated annoyance and route-change spam.

## 3) MVP pop-up behavior definition

MVP eligibility and behavior:

- `announcement_type = company_news`
- `audience_type = internal_staff`
- `status = published`
- `popup_enabled = true`
- targeted/visible to current staff under existing RLS
- unread or not-yet-dismissed for that specific user

Display rules:

- show at most one pop-up at a time,
- choose latest/highest-priority eligible item,
- `View` routes to Announcements Company News detail,
- `Dismiss` hides it for that user,
- no email/push/chat coupling.

## 4) Existing data model fit

Current fields already available:

- `announcements.announcement_type`
- `announcements.audience_type`
- `announcements.status`
- `announcements.popup_enabled`
- `announcements.popup_emoji`
- `announcements.published_at`
- `announcement_targets`
- `announcement_statuses.read_at`
- `announcement_statuses.last_seen_at`

Current limitations for real runtime popup:

- no explicit `popup_dismissed_at`
- no explicit `popup_seen_at`
- no `display_until`
- no `popup_style`
- no `popup_duration_seconds`
- no per-user popup dismissal state independent from `read_at`

## 5) Data model options

### A) Reuse `announcement_statuses.read_at` / `last_seen_at` as popup proxy

Pros:

- no SQL change for first runtime attempt.

Cons:

- read vs dismiss semantics blur,
- `read_at` may be set by detail open behavior unrelated to popup UX,
- weaker control for anti-annoyance policies.

### B) Add popup-specific fields to `announcement_statuses`

Pros:

- durable per-user popup behavior,
- clear semantics for seen vs dismissed vs read,
- supports future anti-annoyance controls safely.

Cons:

- requires SQL/RLS review milestone.

### C) Add separate `announcement_popup_statuses` (or `company_news_popup_events`) table

Pros:

- strongest separation of concerns.

Cons:

- higher complexity and migration overhead.

### D) Session/local-only dismissal (e.g. sessionStorage)

Pros:

- quick demo/runtime preview path.

Cons:

- non-durable and inconsistent across device/login,
- not suitable as production-quality runtime behavior.

Recommendation:

- **Recommend B** for real runtime rollout.
- `D` is acceptable only for demo/preview runtime experiments.
- `A` is acceptable only if product explicitly accepts read=dismiss coupling (not preferred).

## 6) Proposed fields if SQL patch is needed

If option B is selected, additive candidates on `announcement_statuses`:

- `popup_seen_at timestamptz null`
- `popup_dismissed_at timestamptz null`
- `popup_last_shown_at timestamptz null`

Optional additive candidates on `announcements` (future, not required for MVP):

- `popup_style text null`
- `popup_duration_seconds integer null`
- `display_until timestamptz null`

Out of scope:

- parent-facing popup fields,
- parent-facing media fields,
- notification/email coupling.

## 7) RLS/privacy rules

Required runtime popup boundaries:

- staff can read/update only their own popup-status row(s),
- HQ manages Company News content,
- supervisor/teacher read only targeted internal Company News under RLS,
- parent/student blocked from staff Company News MVP,
- no service-role frontend,
- no cross-branch leakage,
- no `parent_facing_media` usage.

## 8) Runtime UI placement

Planned runtime placement (future milestone):

- app-shell or dashboard-level component after auth/session/profile is ready,
- query eligible Company News pop-up candidate for current staff,
- render small warm popup/card/toast-like surface,
- include short copy + `View` + `Dismiss`,
- mobile-friendly and accessible,
- optional auto-dismiss at 5-10 seconds only with safe accessibility guardrails (do not hide urgent info too aggressively).

## 9) Frequency / anti-annoyance rules

MVP anti-noise policy:

- show max once per item after `popup_dismissed_at` or `popup_seen_at`,
- never show more than one popup on a login/session,
- do not re-trigger on every route change,
- if multiple eligible exist, choose newest/highest-priority,
- urgent escalation behavior is later (not MVP),
- keep session-level guard even if backend write is delayed.

## 10) Service implications

Possible future service shapes:

- `listEligibleCompanyNewsPopups(...)`
- `markCompanyNewsPopupSeen(...)`
- `dismissCompanyNewsPopup(...)`

Alternative reuse path:

- reuse `listAnnouncements(...)` + `markAnnouncementRead(...)`.

Service recommendation:

- Keep existing reads for broad list/detail.
- Add **small popup-specific helper methods** when runtime milestone starts, so popup semantics remain explicit and decoupled from request/read lifecycle semantics.

## 11) UI implementation phases

- **Phase 1:** SQL/RLS foundation for popup status fields (if B chosen)
- **Phase 2:** service methods + focused smoke test
- **Phase 3:** runtime popup shell/wiring in app-shell/dashboard entry path
- **Phase 4:** polish (template mapping, subtle animations, accessibility hardening)
- **Phase 5:** parent-facing events remains separate later track

## 12) Testing plan (future)

Planned checks:

- HQ can create/publish `company_news` with `popup_enabled`,
- targeted teacher can see eligible popup,
- parent/student blocked,
- dismissal prevents repeat,
- view/read updates status as intended,
- only one popup appears per login/session rule,
- no email/notification side effects,
- mobile manual QA for card/pop-up readability and controls.

## 13) Risks/safeguards

Risks:

- pop-up fatigue,
- repeated-display bug,
- dismiss/read semantic confusion,
- urgent news missed by fast dismissal,
- cross-branch leakage,
- parent/internal content confusion,
- accessibility issues,
- route-change spam.

Safeguards:

- durable per-user popup status,
- explicit semantics for seen vs dismissed vs read,
- one-item display cap,
- route-change debounce/guard,
- strict RLS role/branch checks,
- accessible controls and mobile-first QA,
- no notification/email coupling in MVP runtime rollout.

## 14) Recommended next milestone

Choose:

- **A.** Draft Company News popup status SQL/RLS foundation
- **B.** Runtime pop-up UI shell with local/session-only dismissal
- **C.** Company News real write service
- **D.** Parent-facing announcements/events plan
- **E.** Notification/email automation plan

**Recommendation: A first.**

Why:

- Real runtime popup requires durable per-user seen/dismiss state with RLS safety.
- This avoids fragile repeated popups and read/dismiss ambiguity.
- Runtime UI trigger should follow after state model and access rules are proven.

## 15) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Company News runtime popup data model review

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Draft Company News popup status SQL/RLS foundation only (review-first, no apply).

Hard constraints:
- SQL draft/review only in this milestone.
- Do not apply SQL.
- Do not change app UI/runtime logic/services in this milestone.
- Do not add runtime popup behavior yet.
- Do not add notification/email/live chat behavior.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not use service role in frontend.
- Use fake/dev data assumptions only.

Deliverables:
1) Additive SQL draft for popup status fields (preferred on announcement_statuses):
   - popup_seen_at
   - popup_dismissed_at
   - popup_last_shown_at
2) RLS policy review notes for own-row status updates and role-safe content reads.
3) Companion checkpoint doc with rollout/test plan.

Validation efficiency rule:
- Docs/SQL-draft only: run `git diff --name-only`.
- Do not run build/lint/typecheck/smoke unless runtime files change.
```

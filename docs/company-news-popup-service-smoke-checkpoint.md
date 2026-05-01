# Company News Popup Service + Smoke Checkpoint

Date: 2026-05-01  
Scope: service + smoke only for internal Company News popup eligibility/seen/dismiss path

## Checkpoint update (runtime shell now consuming popup services)

- Runtime app-shell warm popup UI now consumes these popup methods in `AppLayout`:
  - `listEligibleCompanyNewsPopups({ limit: 1 })`
  - `markCompanyNewsPopupSeen({ announcementId })`
  - `dismissCompanyNewsPopup({ announcementId })`
- Wiring keeps service usage staff-only and non-blocking.
- Demo popup path remains local-only and intentionally does not call popup services.
- No service API changes were required for runtime shell wiring.
- Runtime popup validation checkpoint:
  - `npm run build` PASS
  - `npm run lint` PASS
  - `npm run typecheck` PASS
  - `npm run test:supabase:company-news:popup` PASS
  - expected CHECK remains: direct HQ `company_news` create blocked by request-first create-path constraints.

## Checkpoint note

- This checkpoint adds service methods and a focused smoke test only.
- No app UI/runtime page behavior changes.
- No Supabase SQL changes.
- No RLS policy changes.
- No SQL apply in this checkpoint.

## 1) Service methods added

### Read service

- File: `src/services/supabaseReadService.js`
- Added: `listEligibleCompanyNewsPopups({ limit } = {})`

Behavior:

- anon client + current JWT + RLS only
- lists only `published` + `internal_staff` + `company_news` + `popup_enabled = true`
- excludes own rows with `popup_dismissed_at is not null`
- prefers unseen/unread first, then priority, then newest publish time
- default limit 1 (custom `limit` supported)
- safe return shape:
  - `announcementId`
  - `title`
  - `subtitle`
  - `bodyPreview`
  - `popupEmoji`
  - `priority`
  - `publishedAt`
  - `popupSeenAt`
  - `popupDismissedAt`
  - `popupLastShownAt`
  - `actionUrl`
- stable `{ data, error }` with safe generic error message path

### Write service

- File: `src/services/supabaseWriteService.js`
- Added:
  - `markCompanyNewsPopupSeen({ announcementId })`
  - `dismissCompanyNewsPopup({ announcementId })`

Behavior:

- anon client + current JWT + RLS only
- validates announcement is popup-eligible Company News (`company_news`, `internal_staff`, `published`, `popup_enabled = true`)
- create-or-update own `announcement_statuses` row only
- `markCompanyNewsPopupSeen` sets:
  - `popup_seen_at`
  - `popup_last_shown_at`
- `dismissCompanyNewsPopup` sets:
  - `popup_dismissed_at`
  - `popup_last_shown_at`
- preserves `read_at` and `done_status` semantics (no forced changes)
- no notifications/emails side effects
- stable `{ data, error }` with safe generic error message path

## 2) Status row creation strategy

- If own `announcement_statuses` row exists: popup fields are updated on that row.
- If own row does not exist: insert own row with:
  - `announcement_id`
  - `profile_id = auth.uid()`
  - `done_status = 'pending'`
  - popup fields for seen/dismiss context
- No rows are created/updated for other users.

## 3) Smoke test added

- New script: `scripts/supabase-company-news-popup-smoke-test.mjs`
- New package command: `npm run test:supabase:company-news:popup`

Coverage:

- supervisor creates fake/dev request fixture, publishes, converts to popup-enabled `company_news` for test path
- request/reminder fixture with `popup_enabled = true` remains excluded from company-news popup list
- teacher can list eligible popup
- teacher mark seen succeeds
- teacher dismiss succeeds
- dismissed item is no longer listed
- parent/student popup list path is blocked-or-empty
- supervisor cross-user popup dismiss attempt is blocked (trigger guard protection)
- no unintended `read_at` / `done_status` mutation from popup seen/dismiss methods
- cleanup removes fake/dev fixture rows
- no runtime app-shell popup UI and no notification/email behavior exercised

CHECK notes from run:

- HQ direct `company_news` create is blocked under current request-only create-path RLS (expected in this model).
- This does not affect popup service path testing because fixture conversion is performed through existing manager-owned request lifecycle.

## 4) CHECK/WARNING notes

- CHECK: direct HQ `company_news` insert is blocked by current request-first create-path policy shape (expected for now).
- Implication: real HQ Company News creation still needs a future safe `createCompanyNews(...)` path and/or policy/service support review.
- CHECK: optional phase1 cross-branch negative check remains skipped when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured.
- WARNING note observed in npm output: unknown env config `devdir` is non-blocking in this context.

## 5) Validation results

Commands run:

- `git diff --name-only` (before tests)
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:company-news:popup` PASS (with expected CHECK for HQ direct create block)
- `npm run test:supabase:announcements:phase1` PASS (with expected optional cross-branch CHECK skip when env var missing)
- `npm run test:supabase:announcements:mytasks` PASS
- `npm run test:supabase:announcements:completion` PASS

## 6) Scope boundaries preserved

- no SQL/RLS changes
- no runtime app-shell popup UI
- no service-role frontend usage
- no parent/student internal access opening
- no parent-facing announcements/events
- no `parent_facing_media`
- no notification/email automation
- no live chat
- fake/dev data only

## 7) What remains future

- runtime app-shell warm pop-up component/wiring
- session-level popup frequency guard in runtime UI flow
- full `View`/`Dismiss` runtime UX behavior
- real HQ Company News create path (if/when needed)
- optional popup config extensions (`popup_style`, `popup_duration_seconds`, `display_until`) only if later required
- parent-facing announcements/events track
- notifications/emails/live chat

## 8) Recommended next milestone

Choose:

- **A.** Runtime app-shell warm popup UI planning
- **B.** Runtime app-shell warm popup UI shell/wiring
- **C.** Real HQ Company News create path planning
- **D.** Parent-facing announcements/events plan
- **E.** Notification/email planning

**Recommendation: A first.**

Why:

- Popup service path is now proven with focused smoke coverage.
- Runtime app-shell placement and frequency behavior still need careful planning before wiring.
- Real HQ Company News create path can follow after runtime display planning (or before real publishing), but it is not required for popup-display proof.
- Parent-facing and notification tracks remain later.

## 9) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News popup service smoke

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Runtime app-shell warm popup UI planning only.

Hard constraints:
- Docs/planning only.
- Do not change app UI or runtime behavior in this milestone.
- Do not add services in this milestone.
- Do not change Supabase SQL/RLS and do not apply SQL.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not add notifications/emails/live chat.
- Preserve demoRole and demo/local fallback.
- Use fake/dev data assumptions only.

Deliverables:
1) app-shell placement options and recommended trigger point,
2) popup frequency/session guard strategy (anti-annoyance + accessibility),
3) interaction flow for View/Dismiss and fallback behavior,
4) rollout/testing plan and non-goals.

Validation efficiency rule:
- Docs-only checkpoint.
- Run: git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files change.
```

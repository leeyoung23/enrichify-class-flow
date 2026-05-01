# Company News Popup Service + Smoke Checkpoint

Date: 2026-05-01  
Scope: service + smoke only for internal Company News popup eligibility/seen/dismiss path

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

## 4) Validation results

Commands run:

- `git diff --name-only` (before tests)
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:company-news:popup` PASS (with expected CHECK for HQ direct create block)
- `npm run test:supabase:announcements:phase1` PASS (with expected optional cross-branch CHECK skip when env var missing)

## 5) Scope boundaries preserved

- no SQL/RLS changes
- no runtime app-shell popup UI
- no parent-facing announcements/events
- no `parent_facing_media`
- no notification/email automation
- no live chat
- fake/dev data only

## 6) What remains future

- runtime app-shell warm pop-up component/wiring
- session-level popup frequency guard in runtime UI flow
- full `View`/`Dismiss` runtime UX behavior
- optional popup config extensions (`popup_style`, `popup_duration_seconds`, `display_until`) only if later required
- parent-facing announcements/events track

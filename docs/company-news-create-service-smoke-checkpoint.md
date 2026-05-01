# Company News Create Service + Smoke Checkpoint

Date: 2026-05-01  
Scope: service + smoke only (`createCompanyNews` / `publishCompanyNews`), no UI/runtime/SQL changes

## Checkpoint update (authenticated HQ create UI wiring)

- Authenticated Company News create UI is now wired for HQ/admin only in `Announcements`.
- UI flow uses existing services:
  - `createCompanyNews(...)` (Save Draft)
  - `publishCompanyNews(...)` (Create & Publish via safe create->publish sequence)
- Branch supervisor/teacher remain view-only for Company News create.
- Parent/student remain blocked from staff `Announcements`.
- Target mapping supports `branch|role|profile`; publish early-validates target presence.
- Post-success behavior refreshes queries, switches to Company News context, and selects created item when available.
- Submit controls are disabled while pending and errors remain safe/generic (no raw SQL/RLS/env strings).
- Demo behavior remains local-only for HQ create; no Supabase Company News create calls in demo.
- Company News remains excluded from MyTasks by default.
- No notifications/emails/live chat and no parent-facing announcements/events were added.
- No SQL/RLS changes in this UI wiring checkpoint.

## Checkpoint update (MyTasks exclusion fix)

- `listMyAnnouncementTasks(...)` now excludes `company_news` by default.
- Product behavior is now enforced as PASS in Company News create smoke:
  - Company News must not appear in MyTasks unless a future explicit opt-in task mode is designed.
- Request/reminder MyTasks behavior remains intact.
- No SQL/RLS changes and no UI create wiring in this checkpoint.

## 1) What was added

- `src/services/supabaseWriteService.js`:
  - `createCompanyNews({ title, subtitle, body, priority, popupEnabled, popupEmoji, targets })`
  - `publishCompanyNews({ announcementId })`
- `scripts/supabase-company-news-create-smoke-test.mjs`
- `package.json` command:
  - `npm run test:supabase:company-news:create`

## 2) `createCompanyNews(...)` behavior

- Uses anon client + current JWT + RLS only.
- Inserts only `company_news` drafts for `internal_staff`.
- Forces safe defaults:
  - `status='draft'`
  - `requires_response=false`
  - `requires_upload=false`
  - `popup_enabled` defaults to `false` unless passed.
- Validates:
  - `title` required,
  - `body` or `subtitle` required,
  - `priority` constrained to `low|normal|high|urgent`,
  - `popupEnabled` boolean,
  - `popupEmoji` bounded length,
  - targets limited to `branch|role|profile`.
- Does not support `class` targets in this MVP path (safer narrower scope).
- If no targets are provided, draft creation is allowed but response includes:
  - `requires_targeting_before_publish: true`.

## 3) Target handling and cleanup behavior

- `targets` are normalized to existing `announcement_targets` rows.
- Allowed target types for this service:
  - `branch`
  - `role`
  - `profile`
- If target insert fails:
  - attempts immediate draft cleanup (`announcements.delete`) with caller JWT + RLS,
  - returns `cleanup_warning` when cleanup is blocked.

## 4) `publishCompanyNews(...)` behavior

- Adds explicit type/lifecycle guard before publish:
  - validates row exists and is `company_news` + `internal_staff`,
  - allows lifecycle from `draft` (or already `published`),
  - requires at least one target before publish.
- Reuses `publishAnnouncement(...)` for final status update:
  - `status='published'`
  - `published_at=now`
- No notifications/emails and no MyTasks mutation in write methods.

## 5) Smoke coverage

Command:

- `npm run test:supabase:company-news:create`

Coverage:

- HQ: `createCompanyNews` draft PASS.
- HQ: `publishCompanyNews` PASS.
- Teacher: targeted `company_news` read/popup eligibility check.
- Parent/student: internal staff Company News read blocked-or-empty.
- Supervisor create blocked for MVP.
- Teacher create blocked.
- Cleanup of fake/dev fixture rows.
- Explicit note that no notification/email behavior is exercised.

MyTasks note:

- Smoke includes a best-effort check for Company News appearing in MyTasks derived read.
- If current derived semantics include Company News, this is reported as `CHECK` (non-failing) for follow-up hardening.

## 6) Boundaries preserved

- No app UI changes.
- No runtime page behavior changes.
- No Supabase SQL/RLS changes.
- No SQL apply.
- No parent-facing announcements/events.
- No `parent_facing_media`.
- No live chat.
- No service-role frontend usage.

## 7) Future work

- Parent-facing announcements/events planning/implementation.
- Notification/email automation planning/implementation.
- Company News class-target support only if later required.
- Optional Company News-to-MyTasks opt-in model.
- Runtime popup polish/tuning.
- Reports/PDF/AI OCR and attendance email notification later.

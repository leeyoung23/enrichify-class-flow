# Announcements Completion Overview UI Checkpoint

Date: 2026-05-01  
Scope: HQ/supervisor read-only completion overview UI wiring in `Announcements` detail panel

## 1) What was implemented

- Added read-only `Completion Overview` section in `src/pages/Announcements.jsx`.
- Section is shown for `hq_admin` and `branch_supervisor` only.
- Uses existing `listAnnouncementCompletionOverview({ announcementId })` in authenticated non-demo mode.
- Shows loading, empty, and safe generic error states.
- Includes summary metric badges and per-person completion rows.
- No manager write actions (read-only only).

## 2) Demo behavior (`demoRole`)

- Demo mode remains local-only and does not call Supabase for completion overview.
- HQ/supervisor demo sees fake completion overview rows with read/done/reply/upload variation.
- Teacher demo does not see manager overview section.
- No notifications/emails and no write actions are triggered by this UI.

## 3) Authenticated non-demo behavior

- On selected announcement change, HQ/supervisor reads completion overview via:
  - `listAnnouncementCompletionOverview({ announcementId })`
- Teacher does not render manager overview and does not run manager overview query.
- UI error copy is generic and safe:
  - `Completion overview is temporarily unavailable.`
- No raw SQL/RLS/env leakage in UI copy.

## 4) Summary metrics shown

- Total targeted
- Read / unread
- Done / pending / undone
- Response provided / missing
- Upload provided / missing
- Overdue
- Latest reply
- Latest upload

Layout uses stacked/wrapped badges for mobile-first readability.

## 5) Per-person row fields shown

- Staff name
- Role
- Branch
- Read state (`readAt` or unread)
- Done status
- Reply count
- Upload count (`attachmentCount`)
- Response provided/missing
- Upload provided/missing
- Overdue badge
- Last activity
- Undone reason (when present)

Not shown:

- `storage_path`
- `staff_note`
- attachment contents/body

## 6) Safety boundaries preserved

- No Supabase SQL changes
- No RLS policy changes
- No SQL apply
- No new services
- No MyTasks write actions
- No Company News pop-up
- No parent-facing announcements/events
- No parent-facing media enablement
- No live chat
- No reminder/email/export/force-done manager actions
- No auto notifications/emails

## 7) Validation and test plan for this milestone

Run in order:

1. `git diff --name-only`
2. `npm run build`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test:supabase:announcements:completion`
6. `npm run test:supabase:announcements:mytasks`
7. `npm run test:supabase:announcements:phase1`
8. `npm run test:supabase:announcements:attachments`

Use fake/dev fixtures only.

## 8) What remains future

- Manager reminder/notification planning (still no auto-send)
- SQL view/RPC optimization only if scale/performance requires
- Company News warm pop-up
- Parent-facing announcements/events
- Reports/PDF/AI OCR follow-ups

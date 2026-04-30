# Announcements MyTasks UI Checkpoint

Date: 2026-05-01  
Scope: MyTasks UI integration for `Announcement Requests` using existing read service only

## 1) What was implemented

- `src/pages/MyTasks.jsx` now shows `Announcement Requests` cards.
- Integration uses existing `listMyAnnouncementTasks(...)` read service only.
- Demo mode keeps local-only fake announcement task cards.
- Authenticated non-demo staff mode loads RLS-governed derived tasks.
- No write/upload actions are added from MyTasks for announcements.
- No SQL/RLS/service additions were made.

## 2) Demo role behavior

- Demo mode never calls Supabase for announcement requests.
- Local fake cards include:
  - unread request
  - response-required request
  - upload-required request
  - overdue request
  - done request
- `Open Announcement` routes to Announcements page only.
- No real status/reply/upload writes from MyTasks in demo mode.

## 3) Authenticated read behavior

- Staff-only MyTasks page now loads announcement tasks via `listMyAnnouncementTasks({ includeDone: true })`.
- Includes loading, empty, and safe error states.
- Error copy remains generic and non-technical.
- No `storage_path` or raw SQL/RLS/env internals are surfaced.

## 4) Task card behavior

- Each card shows:
  - title
  - `Announcement` source badge
  - priority badge
  - status badge (`unread` / `pending` / `undone` / `overdue` / `done`)
  - due date (if present)
  - response/upload requirement and provided/missing posture
  - reply count
  - attachment count
  - `Open Announcement` action
- Cards are read-only in this milestone.

## 5) Navigation behavior

- `Open Announcement` navigates to `/announcements`.
- If task has `actionUrl`, it is used as route target.
- Route state passes `announcementId` for future deep-selection support.
- Existing Announcements route behavior is unchanged.

## 6) Mobile-first notes

- Cards stack vertically on mobile.
- Badges and metadata use wrapping rows.
- Action button uses touch-friendly height (`min-h-10`).
- Request summary cards remain compact on narrow widths.

## 7) Safety boundaries preserved

- No MyTasks announcement write actions.
- No direct upload path from MyTasks.
- No notifications/emails.
- No Company News pop-up.
- No parent-facing announcements/events.
- No live chat.
- Parent/student remain outside internal staff task scope.

## 8) Validation and result

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:announcements:mytasks` PASS
- `npm run test:supabase:announcements:phase1` PASS (optional CHECK when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is unset)
- `npm run test:supabase:announcements:attachments` PASS (expected diagnostic CHECK lines)

## 9) What remains future

- Completion overview helper for HQ/supervisor.
- Optional SQL view/RPC optimization only if needed by complexity/performance.
- Materialized task records only later for reminder/SLA/escalation use.
- Company News warm pop-up planning.
- Parent-facing announcements/events planning.

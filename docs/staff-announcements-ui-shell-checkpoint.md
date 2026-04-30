# Staff Announcements UI Shell Checkpoint

Checkpoint scope: UI shell only for staff Announcements with demo parity.

## 1) What was implemented

- Added staff `Announcements` navigation tab after `Dashboard` for:
  - HQ admin
  - branch supervisor
  - teacher
- Added route/page:
  - `src/pages/Announcements.jsx`
  - route path: `/announcements`
- Added mobile-first card shell with:
  - page header and subtitle
  - filter chips (`Requests`, `Company News`, `Done`, `Pending`)
  - request/reminder cards
  - detail panel with local status/reply actions
  - disabled attachment placeholder copy
  - Company News placeholder (Phase 3 note)

## 2) Demo parity behavior

In `demoRole` mode:

- Uses local fake announcement data only.
- Supports local-only actions:
  - mark read
  - mark done
  - mark undone
  - add reply
  - create request shell save (local list only)
- HQ/supervisor demo can see and use `Create Request` shell.
- Teacher demo cannot create and sees assigned/visible local request cards only.
- No Supabase calls are made from demo actions.

## 3) Authenticated mode behavior (this milestone)

- Shows safe preview shell message:
  - "Announcements wiring is coming next. Backend Phase 1 service/RLS is ready."
- No real announcements read/write calls are wired in this milestone.
- Create action remains preview-only/disabled in authenticated mode.

## 4) Safety boundaries preserved

- No Supabase SQL changes.
- No RLS policy changes.
- No SQL apply steps.
- No attachment upload implementation.
- No MyTasks integration.
- No Company News pop-up behavior.
- No parent-facing announcements.
- No live chat.
- No auto emails/notifications.
- No service-role frontend usage.
- Fake/dev data only for demo behavior.

## 5) Mobile-first notes

- Cards stack on mobile.
- Filter controls stay usable in horizontal scroll/wrap-friendly row.
- Action buttons use touch-friendly height.
- Detail section remains single-column on small screens.

## 6) What remains future

- Real Announcements service wiring for authenticated mode.
- Attachments and upload flow.
- MyTasks integration.
- Company News pop-up and warm presentation.
- Parent-facing announcements/events rollout.
- Optional live chat in later phase.

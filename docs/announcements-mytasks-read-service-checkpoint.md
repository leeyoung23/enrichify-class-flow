# Announcements MyTasks Read Service Checkpoint

Date: 2026-05-01  
Scope: service + smoke only for Announcements-derived MyTasks read behavior

## 1) What was implemented

- Added `listMyAnnouncementTasks({ includeDone, statusFilter })` in `src/services/supabaseReadService.js`.
- Added focused smoke script:
  - `scripts/supabase-announcements-mytasks-smoke-test.mjs`
  - `npm run test:supabase:announcements:mytasks`
- Added package script entry in `package.json`:
  - `test:supabase:announcements:mytasks`

## 2) Derived read behavior

- Uses Supabase anon client + current JWT + existing RLS only.
- Reads published `internal_staff` announcements visible to current actor.
- Derives per-announcement task posture from:
  - own status row (`announcement_statuses`)
  - visible replies (`announcement_replies`)
  - visible attachments (`announcement_attachments`)
- No `storage_path` is exposed in task output.
- Returns stable `{ data, error }` shape.

## 3) Derived task semantics

- Candidate triggers:
  - unread
  - done_status pending/undone
  - requires response + no actor reply
  - requires upload + no actor `response_upload`
  - overdue due_date while unresolved
- Status set:
  - `unread`
  - `pending`
  - `undone`
  - `overdue`
  - `done`
- Priority rule:
  - `overdue` overrides pending/undone when due_date has passed and task is not fully complete.
- `done` is explicit lifecycle state only; reply/upload do not auto-mark done.
- `includeDone=false` hides fully done tasks unless unresolved requirements or overdue still apply.
- `includeDone=true` includes done tasks with status `done`.

## 4) Smoke coverage

- Supervisor create/publish targeted request fixture (fake/dev).
- Teacher reads derived tasks and validates required response/upload flags.
- Teacher reply transition updates `responseProvided`.
- Optional teacher `response_upload` transition checks `uploadProvided` when available.
- Teacher done transition checks includeDone true/false behavior.
- Parent/student internal task access remains blocked-or-empty.
- Cleanup attempts for fake/dev fixture announcement + attachments.
- Explicit note: no notification/email side effects in this milestone.

## 5) Safety boundaries preserved

- No app UI changes.
- No runtime page behavior wiring changes.
- No Supabase SQL/RLS changes.
- No SQL apply.
- No service role usage in frontend.
- No Company News pop-up behavior.
- No parent-facing announcements/events.
- No `parent_facing_media` enablement.

## 6) What remains future

- MyTasks UI integration for Announcements section/cards/badges.
- Completion overview read helper (HQ/supervisor monitoring view).
- Optional SQL view/RPC derivation if performance/complexity later requires it.
- Notification/reminder workflow remains future and out of scope here.

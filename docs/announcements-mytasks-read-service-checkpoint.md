# Announcements MyTasks Read Service Checkpoint

Date: 2026-05-01  
Scope: documentation checkpoint for Announcements-derived MyTasks read service and smoke validation (no UI/SQL/RLS changes in this milestone)

## Checkpoint update (Company News default exclusion)

- `listMyAnnouncementTasks(...)` now scopes to task-oriented announcements by default:
  - includes `announcement_type='request'`
  - excludes `announcement_type='company_news'`
- This preserves request/reminder MyTasks behavior while removing Company News side effects from MyTasks.
- Future expansion to include Company News in tasks should be explicit opt-in, not default.

## UI integration update (Announcement Requests)

- `MyTasks` now displays `Announcement Requests` cards using existing `listMyAnnouncementTasks(...)`.
- Integration remains read-only for announcements in MyTasks.
- Demo mode remains local-only and does not call Supabase.
- No announcement write/upload actions were added to MyTasks.
- No SQL/RLS/service additions were made.

## 1) What was implemented

- `listMyAnnouncementTasks({ includeDone, statusFilter } = {})` is implemented in `src/services/supabaseReadService.js`.
- Derived announcement-task rows now come from visible RLS-governed announcement data.
- New smoke test is added:
  - `scripts/supabase-announcements-mytasks-smoke-test.mjs`
  - `npm run test:supabase:announcements:mytasks`
- MyTasks UI for Announcement Requests is documented in `docs/announcements-mytasks-ui-checkpoint.md` (separate milestone from the original read-service-only slice).
- No Supabase SQL/RLS changes were introduced.
- No notification/email side effects were added.

## 2) Read service behavior

- Uses anon client + current JWT + RLS only.
- Reads visible published `internal_staff` announcements.
- Derives task rows using:
  - `announcements`
  - own `announcement_statuses`
  - visible `announcement_replies`
  - visible `announcement_attachments`
- Returns stable `{ data, error }` shape.
- Uses generic safe error behavior for read failures.
- Does not expose `storage_path`.
- Does not leak raw SQL/RLS/env details.

## 3) Derived task semantics

- Task candidate if one or more applies:
  - unread
  - pending
  - undone
  - missing required response
  - missing required upload
  - overdue
- Status set:
  - `unread`
  - `pending`
  - `undone`
  - `overdue`
  - `done`
- `overdue` overrides unresolved active states for display.
- `done` is explicit lifecycle state only.
- Reply/upload do not auto-mark done.
- `includeDone=false` hides fully done tasks unless unresolved requirements remain.
- `includeDone=true` includes done tasks.
- `statusFilter` supports allowed status set only.

## 4) Smoke test coverage

- Creates/publishes targeted announcement requiring response/upload.
- Verifies teacher can see derived announcement task.
- Verifies teacher task includes `requiresResponse` and `requiresUpload`.
- Verifies `responseProvided` flips after teacher reply.
- Verifies `uploadProvided` transition using tiny fake `response_upload`.
- Verifies done transition with `includeDone=false` and `includeDone=true`.
- Verifies parent/student internal task access is blocked-or-empty.
- Performs fake fixture cleanup for announcements/attachments.
- Confirms no notification/email side effects.

## 5) Test results

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:announcements:mytasks` PASS
- `npm run test:supabase:announcements:phase1` PASS with optional CHECK for missing `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`
- `npm run test:supabase:announcements:attachments` PASS with expected diagnostic CHECK lines
- npm warning about unknown env config `devdir` observed and treated as non-blocking

## 6) Safety boundaries

- No MyTasks UI integration yet.
- No SQL/RLS changes.
- No service-role usage in frontend.
- No parent/student internal task access.
- No Company News pop-up behavior.
- No parent-facing announcements/events.
- No notifications/emails.
- No live chat.

## 7) What remains future

- MyTasks UI integration.
- Completion overview helper for HQ/supervisor.
- SQL view/RPC optimization only if performance/complexity demands it.
- Materialized task records only later for reminders/SLA/escalation.
- Company News warm pop-up.
- Parent-facing announcements/events.
- Reports/PDF/AI OCR later.

## 8) Recommended next milestone

Choose:

- A. MyTasks UI integration for Announcement Requests
- B. Completion overview helper for HQ/supervisor
- C. SQL view/RPC optimization
- D. Company News pop-up planning
- E. Parent-facing announcements/events planning

Recommendation: **A. MyTasks UI integration for Announcement Requests**.

Why A first:

- Read service + smoke coverage are now proven.
- MyTasks can safely display announcement-derived tasks with existing derived semantics.
- Completion overview can follow once staff task list visibility is live.
- Company News and parent-facing features remain later phases.

## 9) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements MyTasks read service

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
MyTasks UI integration for Announcement Requests only.

Hard constraints:
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add Company News pop-up.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and demo/local fallback behavior.

Deliverables:
1) Add `Announcement Requests` section in `src/pages/MyTasks.jsx`.
2) Read data via existing `listMyAnnouncementTasks(...)` service.
3) Show badges/fields:
   - status (unread/pending/undone/overdue/done)
   - due date and overdue indicator
   - requiresResponse/responseProvided
   - requiresUpload/uploadProvided
4) Add `Open Announcement` action to route to `/announcements` with announcement context.
5) Keep file upload action out of MyTasks (route back to Announcements detail).
6) Keep safe generic error copy (no SQL/RLS/env leakage).

Validation:
- Runtime/UI changed, run:
  - npm run build
  - npm run lint
  - npm run typecheck
```

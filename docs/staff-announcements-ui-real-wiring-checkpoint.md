# Staff Announcements Real Wiring Checkpoint

Checkpoint scope: authenticated non-demo Staff Announcements wiring using existing Phase 1 services, while preserving demo local-only behavior.

## 1) Files changed

- `src/pages/Announcements.jsx`
- `docs/staff-announcements-ui-shell-checkpoint.md`
- `docs/announcements-phase1-smoke-pass-checkpoint.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`
- `docs/staff-announcements-ui-real-wiring-checkpoint.md`

## 2) Authenticated read behavior

- Authenticated non-demo staff mode now calls:
  - `listAnnouncements({ audienceType: 'internal_staff' })`
  - `listAnnouncementTargets({ announcementId })`
  - `listAnnouncementStatuses({ announcementId })`
  - `listAnnouncementReplies({ announcementId })`
- Filter support remains:
  - `Requests`
  - `Company News` placeholder (no live company news pop-up wiring)
  - `Done`
  - `Pending`
- Loading/empty/error states use safe, non-sensitive UI copy.

## 3) Authenticated create/status/reply behavior

- Mark Read -> `markAnnouncementRead({ announcementId })`
- Done -> `updateAnnouncementDoneStatus({ announcementId, doneStatus: 'done' })`
- Undone -> `updateAnnouncementDoneStatus({ announcementId, doneStatus: 'undone', undoneReason })`
- Reply -> `createAnnouncementReply({ announcementId, body, replyType })`
- Create Request (HQ/supervisor only) -> `createAnnouncementRequest(...)`
- After create/status/reply actions, announcements list/detail queries are invalidated/refreshed.

## 4) demoRole behavior

- Demo mode remains local fake-data only:
  - local mark read/done/undone
  - local add reply
  - local create request for HQ/supervisor demo
- Teacher demo cannot create.
- No Supabase calls in demo mode.
- No files, notifications, or emails.

## 5) Safety boundaries (unchanged)

- No SQL changes.
- No RLS changes.
- No SQL apply from UI/runtime.
- No attachment upload flow.
- No MyTasks integration.
- No Company News pop-up behavior.
- No parent-facing announcements.
- No live chat.
- No auto emails/notifications.
- No service-role frontend usage.
- No real AI API wiring.

## 6) Remaining future

- Attachments.
- MyTasks integration.
- Company News warm pop-up behavior.
- Parent-facing announcements/events.
- Live chat (later and optional).
- Notification/email automation (future only).

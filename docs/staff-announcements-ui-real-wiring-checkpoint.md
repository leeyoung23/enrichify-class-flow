# Staff Announcements Real Wiring Checkpoint

Checkpoint scope: authenticated non-demo Staff Announcements wiring using existing Phase 1 services, while preserving demo local-only behavior.

## Update: attachments UI wiring milestone

- Staff Announcements detail panel now includes real internal attachment list/upload/view wiring using existing attachment services.
- Demo mode attachment behavior remains local-only simulation with no Supabase upload/list/signed URL calls.
- No SQL/RLS/storage policy changes were made in this milestone.

## 1) What was implemented

- Authenticated read wiring in non-demo staff mode.
- Announcement detail loading for selected row.
- Status actions wiring (`read`, `done`, `undone`).
- Reply action wiring.
- HQ/supervisor create request action wiring.
- Query refresh/invalidation after actions.
- Demo behavior preservation as local-only fake workflow.

## 2) Files changed

- `src/pages/Announcements.jsx`
- `docs/announcements-attachments-service-smoke-pass-checkpoint.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`
- `docs/staff-announcements-ui-real-wiring-checkpoint.md`
- `docs/staff-announcements-attachments-ui-checkpoint.md`

## 3) Authenticated read behavior

- Authenticated non-demo staff mode now calls:
  - `listAnnouncements({ audienceType: 'internal_staff' })`
- Filter support remains:
  - `Requests`
  - `Done`
  - `Pending`
- `Company News` remains placeholder-only (no pop-up wiring in this milestone).
- Detail data for selected announcement loads via:
  - `listAnnouncementTargets({ announcementId })`
  - `listAnnouncementStatuses({ announcementId })`
  - `listAnnouncementReplies({ announcementId })`
- Loading/empty/error states use safe copy only.
- No raw SQL/RLS/env values are surfaced in UI messages.

## 4) Authenticated create/status/reply behavior

- Mark Read -> `markAnnouncementRead({ announcementId })`
- Done -> `updateAnnouncementDoneStatus({ announcementId, doneStatus: 'done' })`
- Undone -> `updateAnnouncementDoneStatus({ announcementId, doneStatus: 'undone', undoneReason })`
- Reply -> `createAnnouncementReply({ announcementId, body, replyType })`
- HQ/supervisor Create Request -> `createAnnouncementRequest(...)`
- No direct SQL from UI.
- After create/status/reply actions, list/detail queries are invalidated/refreshed.
- Selected announcement is kept stable where possible after refresh.

## 5) demoRole behavior

- Demo mode remains local fake-data only:
  - local mark read/done/undone
  - local add reply
  - local create request for HQ/supervisor demo only
- Teacher demo cannot create.
- No Supabase calls in demo mode.
- No files/uploads.
- No notifications/emails.

## 6) Safety boundaries (unchanged)

- No SQL/RLS changes.
- No SQL apply.
- No SQL/RLS/service additions for attachments (uses existing attachment services only).
- No MyTasks integration.
- No Company News pop-up behavior.
- No parent-facing announcements.
- No live chat.
- No auto emails/notifications.
- No service role in frontend.
- No AI/provider/env changes.
- No `parent_facing_media` enablement.

## 7) Tests

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:announcements:phase1` PASS
- Optional `CHECK` remains when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing.

## 8) What remains future

- MyTasks integration.
- Company News warm pop-up behavior.
- Parent-facing announcements/events.
- Live chat (later and optional).
- Notification/email automation (future only).
- Delete-attachment UI action remains future unless additional RLS proof is required.

## 9) Recommended next milestone

Choose:

- A. MyTasks integration planning
- B. Company News warm pop-up planning
- C. Parent-facing announcements/events planning
- D. Attachment delete UI
- E. Report/PDF/AI OCR planning

Recommendation: **A. MyTasks integration planning**.

Why A first:

- Internal request/reply/upload loop now works in staff announcements.
- MyTasks is the next natural layer for pending/done/undone task visibility.
- Company News and parent-facing announcements should remain later phases.
- Attachment delete UI is lower priority than task visibility.

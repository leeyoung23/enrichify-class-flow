# Staff Announcements Attachments UI Checkpoint

Date: 2026-05-01  
Scope: Staff Announcements attachment list/upload/view wiring only (internal staff detail panel)

## 1) What was implemented

- `src/pages/Announcements.jsx` now wires internal attachments in the detail panel.
- Authenticated non-demo mode now calls existing attachment service methods:
  - `listAnnouncementAttachments({ announcementId })`
  - `uploadAnnouncementAttachment({ announcementId, file, fileRole, staffNote })`
  - `getAnnouncementAttachmentSignedUrl({ attachmentId, expiresIn: 300 })`
- Signed URL open uses new tab with `noopener,noreferrer`.
- No `storage_path` is shown in UI.
- Safe loading/empty/error states are added for attachment list.

## 2) Role-aware upload behavior

- HQ/admin can upload with `hq_attachment` or `supervisor_attachment`.
- Branch supervisor can upload with `supervisor_attachment`.
- Teacher can upload with `response_upload` only.
- Parent/student do not access this staff page.
- Backend/RLS remains authoritative.

## 3) Demo mode behavior (preserved)

- Demo mode remains local-only and does not call Supabase attachment services.
- Demo attachment list is local fake data by announcement.
- Demo upload is local fake simulation only.
- Demo view action shows local fake toast only.
- No real files are required in demo mode.

## 4) Boundaries preserved

- No Supabase SQL changes.
- No RLS changes.
- No SQL apply.
- No parent-facing media enablement (`parent_facing_media` remains disabled/reserved).
- No public URLs (signed URL only for authenticated open action).
- No service-role frontend usage.
- No MyTasks integration.
- No Company News pop-up behavior.
- No parent-facing announcements/events.
- No live chat.
- No notifications/emails.

## 5) Deferred items

- Delete attachment UI remains future unless additional RLS/UX proof is required.
- Parent-facing media/release flows remain future.

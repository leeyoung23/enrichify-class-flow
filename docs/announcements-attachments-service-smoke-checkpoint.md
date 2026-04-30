# Announcements Attachments Service + Smoke Checkpoint

Date: 2026-05-01  
Environment: Supabase dev only (fake/dev identities + tiny fake files only)

## 1) Scope completed

- Added Announcements attachments service methods in `src/services/supabaseUploadService.js`.
- Added fake/dev smoke test script: `scripts/supabase-announcements-attachments-smoke-test.mjs`.
- Added package command: `npm run test:supabase:announcements:attachments`.
- No app UI/runtime page behavior changes in this checkpoint.
- No Supabase SQL/RLS/storage policy changes in this checkpoint.

## 2) Service methods added

- `uploadAnnouncementAttachment({ announcementId, file, fileRole, staffNote, fileName, contentType })`
- `listAnnouncementAttachments({ announcementId, fileRole })`
- `getAnnouncementAttachmentSignedUrl({ attachmentId, expiresIn })`
- `deleteAnnouncementAttachment({ attachmentId })` (cleanup/helper path)

All methods return stable `{ data, error }`.

## 3) Upload/list/signed URL behavior

- Uses Supabase anon client + current JWT only (no service role).
- Validates UUIDs and required file input.
- Validates `fileRole` to internal Phase 2 values only:
  - `hq_attachment`
  - `supervisor_attachment`
  - `response_upload`
- Explicitly does not enable `parent_facing_media`.
- Validates file size `> 0` and `<= 25MB`.
- Validates content type against a safe allowlist.
- Sanitizes file name and staff note.
- Uses private bucket `announcements-attachments`.
- Uses deterministic path format:
  - `announcementId/attachmentId/safe-file-name`
- Uses metadata-first upload flow to match storage policy dependency on metadata row.
- On object upload failure after metadata insert:
  - attempts metadata cleanup and returns `cleanup_warning` when cleanup is blocked.
- Signed URL helper reads attachment row via RLS first, then creates signed URL from private bucket.

## 4) Smoke coverage added

Script: `scripts/supabase-announcements-attachments-smoke-test.mjs`

Coverage intent:

- HQ upload/list/signed URL path for `hq_attachment` (when fixture allows).
- Supervisor own-branch upload/list/signed URL path for `supervisor_attachment` (when fixture allows).
- Teacher `response_upload` allowed path for published/visible internal announcement fixture (when fixture allows).
- Teacher blocked from `hq_attachment`.
- Parent/student blocked from internal attachment list/read.
- No public URL path pattern expected from signed URL.
- Cleanup of fake attachment rows + objects + fake announcement fixtures.
- Safe `CHECK` behavior when fixture/password prerequisites are unavailable.

## 5) Upload CHECK investigation status

- Current CHECK root cause is in **metadata insert RLS** (`announcement_attachments`), not object upload/storage policy.
 - Post-024 diagnostics refined the failing stage:
  - raw insert **without RETURNING** succeeds for HQ/supervisor/teacher-response rows,
  - service insert path using `.insert(...).select(...).maybeSingle()` still fails,
  - this isolates a SELECT policy issue on `INSERT ... RETURNING`, not insert `WITH CHECK`.
- A manual/dev-only SQL patch draft is now added:
  - `supabase/sql/024_fix_announcements_attachments_insert_rls.sql`
- A follow-up manual/dev-only SQL patch draft is now added:
  - `supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`
- `024` adds explicit insert-safe row-predicate helpers and recreates only the two insert policies:
  - `announcement_attachments_insert_manage_023`
  - `announcement_attachments_insert_teacher_023`
- `025` adds row-predicate select helper and recreates:
  - `announcement_attachments_select_023`
- `025` addresses the self-row lookup timing/visibility edge for `INSERT ... RETURNING`.
- `024` keeps strict boundaries:
  - parent/student blocked,
  - `parent_facing_media` blocked,
  - no storage public access widening,
  - no update/delete/select relaxation.
- Source-of-truth draft alignment was also applied to:
  - `supabase/sql/023_announcements_attachments_foundation.sql`

## 6) Manual apply requirement

- `024` is draft-only and is **not auto-applied**.
- `025` is draft-only and is **not auto-applied**.
- Until manual dev apply of `025`, upload paths can continue to show safe CHECK blocks in service RETURNING path.
- After manual dev apply of `025`, rerun:
  - `npm run test:supabase:announcements:attachments`
  - expected: upload/list/signed URL paths move from CHECK to PASS where fixtures are valid.

## 7) Boundaries preserved

- No attachment UI wiring yet.
- No MyTasks integration.
- No Company News pop-up behavior.
- No parent-facing announcements/events rollout.
- No notifications/emails.
- No live chat.
- No service role in frontend.

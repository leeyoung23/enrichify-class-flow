# Parent-facing Announcements Media Service + Smoke Checkpoint

Date: 2026-05-01  
Scope: parent-facing media service + focused smoke proof only (no UI/runtime SQL changes)

## 1) Milestone status

- Added parent-facing media service methods in `src/services/supabaseUploadService.js`:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)` (cleanup helper)
- Added focused smoke script:
  - `scripts/supabase-parent-announcements-media-smoke-test.mjs`
  - package command: `npm run test:supabase:parent-announcements:media`
- No app UI changes.
- No runtime page behavior changes.
- No SQL/RLS changes.
- No notification/email behavior.

## 2) Media service behavior

- anon client + current JWT + RLS only.
- private bucket only:
  - `parent-announcements-media`
- no service-role frontend usage.
- no public URL path model.
- no reuse of internal `announcements-attachments` bucket.
- stable `{ data, error }` shape with safe generic error text.

## 3) Upload/list/signed URL flow

- Metadata-first upload flow is used:
  1. Insert `parent_announcement_media` row with `storage_path`.
  2. Upload object to `parent-announcements-media`.
  3. On upload failure, attempt metadata cleanup and surface `cleanup_warning` when blocked.
- Validation guards include:
  - UUID checks,
  - file required,
  - file size `> 0` and `<= 25MB`,
  - allowed MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`),
  - allowed roles (`parent_media`, `cover_image`, `attachment`).

## 4) Release boundary

- Upload defaults `released_to_parent=false`.
- Added `releaseParentAnnouncementMedia({ mediaId })` for manager release path.
- Parent visibility for media remains release-gated by RLS helper behavior:
  - parent can only read media rows when `released_to_parent=true` and parent announcement visibility passes.
- No notification/email side effects in release path.

## 5) Smoke coverage summary

- HQ upload parent media PASS.
- HQ list parent media PASS.
- HQ signed URL PASS.
- HQ release media PASS.
- Parent unreleased media hidden PASS.
- Parent unreleased media signed URL blocked PASS.
- Parent released media list + signed URL PASS (fixture-dependent where applicable).
- Parent other-branch released media blocked/empty PASS (fixture-dependent where applicable).
- Teacher upload/manage blocked PASS.
- Student media access blocked/empty PASS.
- No public URL pattern PASS.
- Cleanup metadata/object/announcement PASS or CHECK with cleanup warnings when RLS-session constrained.

## 6) Boundaries preserved

- no ParentView parent-facing media UI yet.
- no parent-facing creation UI in this milestone.
- no internal `parent_facing_media` enablement in internal announcements path.
- no internal attachments bucket reuse.
- no email/notification automation.

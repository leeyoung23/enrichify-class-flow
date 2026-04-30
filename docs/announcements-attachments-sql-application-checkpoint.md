# Announcements Attachments SQL Application Checkpoint

Date: 2026-05-01  
Environment: Supabase dev project only  
Patch: `supabase/sql/023_announcements_attachments_foundation.sql`

## 1) What was applied

- `023` Announcements attachments foundation SQL was manually applied in Supabase dev SQL Editor.
- SQL apply completed successfully.
- No production apply was performed.
- No runtime/UI/service code changes were made in this checkpoint.

## 2) Table confirmed

Confirmed table:

- `public.announcement_attachments` exists.
- `information_schema` verification returned 13 columns.

Verified key fields:

- `id`
- `announcement_id`
- `uploaded_by_profile_id`
- `file_role`
- `file_name`
- `storage_path`
- `mime_type`
- `file_size`
- `staff_note`
- `created_at`
- `released_to_parent`
- `released_at`
- `released_by_profile_id`

## 3) RLS policies confirmed

Confirmed metadata policies on `public.announcement_attachments`:

- `announcement_attachments_select_023`
- `announcement_attachments_insert_manage_023`
- `announcement_attachments_insert_teacher_023`
- `announcement_attachments_update_023`
- `announcement_attachments_delete_023`

## 4) Helper functions confirmed

Verified helper functions:

- `announcement_attachment_announcement_id`
- `announcement_attachment_branch_id`
- `can_access_announcement_attachment`
- `can_manage_announcement_attachment`

## 5) Storage bucket and policies confirmed

Storage verification:

- Bucket `announcements-attachments` exists.
- `public = false` is confirmed.
- Storage object policies exist:
  - `announcements_attachments_storage_select_023`
  - `announcements_attachments_storage_insert_023`
  - `announcements_attachments_storage_update_023`
  - `announcements_attachments_storage_delete_023`
- Private bucket + signed URL model remains the expected access pattern.

## 6) Safety boundaries (unchanged)

- Parent/student remain blocked in Phase 2 internal attachments.
- `parent_facing_media` remains reserved only.
- No parent-facing release behavior is enabled in this checkpoint.
- No public URL model is introduced.
- No service role usage in frontend.
- Attachments service/UI wiring remains unwired.
- No MyTasks integration.
- No Company News pop-up behavior.
- No notifications/emails.
- No live chat.

## 7) What remains unwired

- Staff attachment UI
- MyTasks integration
- Company News pop-up
- Parent-facing announcements/events

## 8) Service + smoke checkpoint update

- Service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadAnnouncementAttachment(...)`
  - `listAnnouncementAttachments(...)`
  - `getAnnouncementAttachmentSignedUrl(...)`
  - `deleteAnnouncementAttachment(...)` (cleanup helper path)
- New smoke script added:
  - `scripts/supabase-announcements-attachments-smoke-test.mjs`
  - package command: `npm run test:supabase:announcements:attachments`
- Service/smoke checkpoint doc:
  - `docs/announcements-attachments-service-smoke-checkpoint.md`
- No UI wiring in this checkpoint.
- No MyTasks integration, Company News pop-up, parent-facing rollout, notifications/emails, or live chat in this checkpoint.
- Upload CHECK investigation update:
  - post-024 diagnostics show raw metadata insert (without RETURNING) succeeds,
  - service path still fails on `.insert(...).select(...).maybeSingle()`, indicating SELECT policy issue on INSERT RETURNING,
  - storage object insert policy is not the first failing gate in current smoke output.
- Manual/dev-only follow-up patch draft now exists:
  - `supabase/sql/024_fix_announcements_attachments_insert_rls.sql`
  - `supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`
- `025` is not auto-applied; manual dev SQL Editor review/apply is required before expected upload PASS path.

## 9) Recommended next milestone

Choose:

- A. Announcements attachments UI shell
- B. MyTasks integration plan
- C. Company News pop-up design
- D. Parent-facing announcements/events plan
- E. Live chat feasibility plan

Recommendation: **A. Announcements attachments UI shell**.

Why A first:

- SQL/RLS/storage foundation is applied and service/smoke path now exists.
- Next practical step is controlled UI shell wiring against existing service helpers.
- Keep MyTasks/Company News/parent-facing scope deferred.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements attachments SQL application

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Announcements attachments service + smoke test only.

Hard constraints:
- Do not change app UI.
- Do not change runtime logic outside attachment service path.
- Do not add unrelated services.
- Do not change Supabase SQL.
- Do not change RLS/storage policies.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload real files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat.
- Do not add MyTasks integration.
- Do not add Company News pop-up.
- Do not add parent-facing announcements/events.

Deliverables:
1) `src/services/supabaseUploadService.js` attachment methods:
   - `uploadAnnouncementAttachment(...)`
   - `listAnnouncementAttachments(...)`
   - `getAnnouncementAttachmentSignedUrl(...)`
2) Fake/dev-only attachments smoke script:
   - role-scope and storage policy checks for HQ/supervisor/teacher + parent/student blocked
3) Package script entry for the smoke test.
4) Docs update with smoke command and expected PASS/CHECK outcomes.

Validation efficiency rule:
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

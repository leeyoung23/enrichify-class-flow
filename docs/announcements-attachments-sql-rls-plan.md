# Announcements Attachments SQL/RLS Plan

Scope: planning only for Announcements attachments/document upload as Phase 2 of Internal Communications & Document Hub.

No UI/runtime/service/SQL changes in this checkpoint.

## 0) SQL draft status update

- SQL draft now exists at `supabase/sql/023_announcements_attachments_foundation.sql`.
- `023` is manual/dev-first SQL draft only.
- `023` is not applied automatically and has no production apply assumption.
- `023` keeps parent-facing media blocked in this phase.
- `023` pre-apply security review is completed in-repo before manual Supabase apply.
- `023` review hardening added:
  - unique metadata path guard (`announcement_attachments.storage_path` unique index) to prevent storage-path collision/path-guess metadata poisoning,
  - `file_size` upper bound guard (`<= 26214400` bytes) in addition to non-negative check.
- `023` is now manually applied in Supabase dev SQL Editor (success).
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- Application checkpoint doc: `docs/announcements-attachments-sql-application-checkpoint.md`.
- Attachments service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadAnnouncementAttachment(...)`
  - `listAnnouncementAttachments(...)`
  - `getAnnouncementAttachmentSignedUrl(...)`
  - `deleteAnnouncementAttachment(...)` (cleanup helper)
- Attachments smoke script is now added:
  - `scripts/supabase-announcements-attachments-smoke-test.mjs`
  - `npm run test:supabase:announcements:attachments`
- Service/smoke checkpoint doc: `docs/announcements-attachments-service-smoke-checkpoint.md`.
- Attachments UI wiring remains future.
- MyTasks integration remains future.
- Company News pop-up remains future.
- Upload CHECK investigation status:
  - post-024 diagnostics show raw insert without RETURNING succeeds for HQ/supervisor/teacher-response,
  - current blocker is SELECT policy behavior on `INSERT ... RETURNING` for `announcement_attachments` service insert path,
  - manual/dev-only follow-up draft exists at `supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`.
- Source-of-truth SQL draft `023` has been aligned to the same insert-safe helper pattern.
- Source-of-truth SQL draft `023` is now aligned with row-predicate select helper for safer insert-returning behavior.
- `025` requires manual dev review/apply before upload PASS proof.

## 1) Current state

- Phase 1 real Staff Announcements workflow exists and is checkpointed.
- Phase 1 supports internal staff requests, targets, statuses, and replies.
- Attachments are placeholder-only in current UI (`Attachments coming in Phase 2`).
- No attachment upload/list/view/release runtime behavior exists yet.
- No MyTasks integration yet.
- No parent-facing announcement media yet.

## 2) Product purpose

Phase 2 attachment purpose:

- HQ can request supervisors to upload monthly bills/documents.
- Supervisors can request teachers to upload files/documents.
- Recipients can upload requested files as response evidence.
- HQ/supervisors can view submitted files within role/branch scope.
- This reduces operational reliance on WhatsApp/Google Drive handoffs.

## 3) File roles

Recommended `file_role` values:

- `hq_attachment`
- `response_upload`
- `supervisor_attachment`
- `parent_facing_media` (later only, outside Phase 2 internal scope)

## 4) Recommended table

Recommended table: `announcement_attachments`

Recommended fields:

- `id` (uuid pk)
- `announcement_id` (fk -> `announcements.id`)
- `uploaded_by_profile_id` (fk -> `profiles.id`)
- `file_role` (text/enum-constrained)
- `file_name` (safe display name)
- `storage_path` (private object path)
- `mime_type` (content type)
- `file_size` (bytes)
- `staff_note` (nullable text)
- `created_at` (timestamptz)
- `released_to_parent` (boolean, default `false`, later-use boundary)
- `released_at` (nullable, later-use boundary)
- `released_by_profile_id` (nullable, later-use boundary)

Design note:

- Keep parent-release fields present but unused in Phase 2 internal workflow to avoid later table churn.

## 5) Storage bucket strategy

Recommended storage model:

- Private bucket only.
- Either:
  - reuse an existing suitable private internal bucket if policy model fits cleanly, or
  - create a dedicated future bucket like `announcements-attachments`.
- No public URLs.
- Signed URLs only.
- Path convention should be deterministic and scoped, e.g.:
  - `branch-id/announcement-id/attachment-id/file-name`
  - or equivalent strict branch/announcement prefix convention.

## 6) Visibility/RLS rules

### HQ

- View/manage all internal announcement attachments.

### Branch supervisor

- View/manage own-branch attachments.
- Upload attachments to own-branch managed requests.
- View teacher response uploads for own-branch announcements.

### Teacher

- View attachments for announcements targeted to them.
- Upload `response_upload` only for accessible announcements.
- Cannot view unrelated branch announcements/files.

### Parent

- No access in Phase 2 internal attachments.
- `parent_facing_media` remains later and requires separate boundary.

### Student

- No access.

## 7) Upload permissions

Planned write rules:

- HQ/supervisor can upload `hq_attachment` / `supervisor_attachment` when managing the announcement.
- Targeted teacher can upload `response_upload` for accessible announcements only.
- `uploaded_by_profile_id` must equal `auth.uid()`.
- No spoofing `uploaded_by_profile_id`.
- Parent/student upload blocked.

## 8) Signed URL/service implications

Planned future service methods:

- `uploadAnnouncementAttachment(...)`
- `listAnnouncementAttachments(...)`
- `getAnnouncementAttachmentSignedUrl(...)`
- Optional later: delete/archive soft-lifecycle methods

Frontend security rule remains:

- No service role key in frontend.
- Anon client + JWT + RLS only.

## 9) Interaction with statuses/tasks

Planned behavior:

- Upload event may later map to a “file uploaded” lifecycle signal.
- MyTasks integration later can surface pending upload actions.
- Phase 2 should not auto-complete `Done` unless user explicitly marks done.

## 10) Parent-facing boundary

- Parent-facing announcement media is not Phase 2 scope.
- If added later, parent media needs separate publish/release boundary and dedicated policy checks.
- Internal staff documents must never become visible to parents.

## 11) Testing plan

Future smoke tests should cover:

- HQ upload/list/signed URL.
- Supervisor own-branch upload/list/signed URL.
- Teacher targeted `response_upload`.
- Teacher cannot access unrelated announcement file.
- Parent/student blocked.
- No public URL exposure.
- Cleanup of fake files and metadata rows.

## 12) Risks/safeguards

Primary risks:

- Accidental parent exposure of internal files.
- Cross-branch document leakage.
- Sensitive financial docs uploaded to wrong scope.
- File size/type abuse.
- Path guessing attempts.
- Staff uploading wrong document.
- Weak auditability.

Safeguards:

- Strict branch/target-aware RLS.
- Signed URL only, short TTL.
- Content type + max size validation.
- Metadata-first + scoped object path validation.
- Upload actor enforcement (`uploaded_by_profile_id = auth.uid()`).
- Audit-friendly metadata and timestamps.

## 13) Recommended SQL strategy

Choose:

- A. Draft Phase 2 `announcement_attachments` SQL/RLS foundation
- B. UI shell first
- C. MyTasks integration first
- D. Company News pop-up first

Recommendation: **A. Draft Phase 2 `announcement_attachments` SQL/RLS foundation**.

Why A first:

- Attachments are privacy-sensitive.
- Backend/RLS boundaries must be correct before UI wiring.
- Follows established homework marked-file safety pattern (private bucket + signed URL + strict role/RLS scoping).

## 14) Recommended next milestone

Choose:

- A. Announcements attachments UI shell
- B. MyTasks integration plan
- C. Company News pop-up design
- D. Parent-facing announcements/events plan
- E. Live chat feasibility plan

Recommendation: **A. Announcements attachments UI shell**.

## 15) Next implementation prompt (copy-paste)

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
Announcements attachments UI shell only (service-backed; no SQL changes).

Hard constraints:
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not apply SQL.
- Do not change Supabase SQL.
- Do not change RLS/storage policies.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Do not use real data.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails/notifications.
- Do not start live chat in this milestone.

Deliverables:
1) Staff Announcements attachments UI shell (internal only; no parent-facing behavior).
2) Wire existing attachment service methods (no SQL/RLS edits):
   - `uploadAnnouncementAttachment(...)`
   - `listAnnouncementAttachments(...)`
   - `getAnnouncementAttachmentSignedUrl(...)`
3) Preserve role boundaries and safe fallback behavior.
4) Keep MyTasks/Company News/parent-facing/live-chat out of scope.

Validation efficiency rule:
Docs/planning only.
Run:
- git diff --name-only
Do not run build/lint/smoke suite unless runtime files change.
```

## 16) Validation efficiency rule

Docs/planning only.

Run:

- `git diff --name-only`

Do not run build/lint/smoke suite unless runtime files change.

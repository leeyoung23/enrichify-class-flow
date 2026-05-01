# Parent-facing Announcements SQL Application Checkpoint

Date: 2026-05-01  
Scope: manual Supabase DEV SQL application checkpoint for `028` (docs-only update; no runtime/UI/service implementation)

## Checkpoint update (parent-facing service + smoke)

- Parent-facing announcement service methods are now added:
  - read: `listParentAnnouncements(...)`, `getParentAnnouncementDetail(...)`
  - write: `createParentAnnouncement(...)`, `publishParentAnnouncement(...)`, `archiveParentAnnouncement(...)`, `markParentAnnouncementRead(...)`
- Focused smoke is now added:
  - `scripts/supabase-parent-announcements-smoke-test.mjs`
  - `npm run test:supabase:parent-announcements`
- Boundaries preserved in this service checkpoint:
  - no app UI wiring yet,
  - no ParentView shell yet,
  - no parent-facing media upload/service path in this milestone,
  - no SQL/RLS changes,
  - no notifications/emails.
- Service/smoke checkpoint doc:
  - `docs/parent-facing-announcements-service-smoke-checkpoint.md`
- CHECK investigation note:
  - smoke now prints role/is_active/branch and fixture discovery diagnostics,
  - current create-path CHECKs show RLS insert denial diagnostics (`42501`) while service payload shape remains valid,
  - remaining unrelated-parent CHECK is credential/auth-fixture dependent.
- Follow-up patch draft note:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql` is now drafted for manual DEV review,
  - patch is not auto-applied in this checkpoint.

## 1) Application status

- Manual apply target:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- Supabase DEV SQL Editor status:
  - manually applied
- Environment boundary:
  - DEV only
  - no production apply
- Implementation boundary for this checkpoint:
  - no runtime/UI/service changes
  - no notification/email behavior
  - fake/dev data only

## 2) Tables confirmed

Confirmed parent-facing tables:

- `parent_announcements`
- `parent_announcement_targets`
- `parent_announcement_read_receipts`
- `parent_announcement_media`

## 3) RLS and policies confirmed

- RLS is enabled on all parent-facing tables.
- Parent-facing table policies exist for select/insert/update/delete paths as drafted.
- Role boundary posture remains:
  - HQ global manage,
  - branch supervisor own-branch manage only,
  - parent read path requires published + linked-child target visibility,
  - teacher/student blocked in MVP where intended,
  - parent read receipt path is own-row scoped for parent writes.

## 4) Helper functions confirmed

Confirmed helper functions:

- `parent_announcement_branch_id`
- `can_manage_parent_announcement`
- `can_access_parent_announcement`
- `can_access_parent_announcement_media`
- `parent_has_linked_student_in_branch_028`
- `parent_has_linked_student_in_class_028`
- `can_insert_parent_announcement_row_028`
- `can_manage_parent_announcement_target_write_028`
- `is_parent_announcement_supervisor_scope_safe_028`

## 5) Storage/media confirmed

- Private bucket exists:
  - `parent-announcements-media`
- Bucket visibility:
  - `public=false`
- Storage policies exist for parent announcements media object paths.
- Storage access remains metadata-linked via `parent_announcement_media.storage_path`.
- No public URL model is introduced in this checkpoint.
- Internal `announcements-attachments` bucket is not reused.

## 6) Security hardening note (pre-apply review outcome)

- Before manual apply, a supervisor mixed-target cross-branch manage escalation risk was identified.
- Fix introduced in `028`:
  - `is_parent_announcement_supervisor_scope_safe_028(...)`
  - `can_manage_parent_announcement(...)` tightened to use this guard.
- Current intended result:
  - supervisor management requires announcement row + targets to stay within own branch scope.

## 7) Safety boundaries preserved

- Separate parent-facing model from internal announcements path is preserved.
- Internal `internal_staff` announcements are not exposed through this model.
- Internal `announcement_attachments` are not exposed/reused.
- Internal `parent_facing_media` remains disabled/reserved in internal attachments module.
- No email/notification automation is introduced.
- No service-role frontend usage is introduced.
- Fake/dev data-only posture remains.

## 8) What remains future

- Parent-facing announcements read/write service + smoke test
- Parent-facing media service + smoke test
- `ParentView` UI shell
- Parent-facing creation UI
- Notification/email automation (later phase)
- Attendance arrival email remains separate attendance module track
- Reports/PDF/AI OCR remains separate track

## 9) Recommended next milestone

Options:

- A. Parent-facing announcements service + smoke test
- B. ParentView UI shell with demo parity
- C. Parent-facing media service + smoke test
- D. Notification/email planning
- E. Reports/PDF/AI OCR plan

Recommendation: **A first**.

Why A first:

- SQL/RLS foundation is now manually applied in DEV.
- Service smoke should prove create/read/visibility boundaries before any UI rollout.
- Media service should follow after core parent announcement visibility is proven.
- Email/notification behavior should wait until service-level visibility and governance are stable.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document parent-facing announcements SQL application

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent-facing announcements service + smoke test only.

Hard constraints:
- Service + smoke only in this milestone.
- Do not change app UI.
- Do not change runtime logic outside service/smoke scope.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Do not use real student, parent, teacher, school, curriculum, homework, photo, payment, announcement, or attendance data.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat in this milestone.
- Do not enable internal parent_facing_media.
- Do not implement parent-facing UI/services in this milestone.

Please implement:
1) Parent-facing announcements read/write service methods for DEV RLS path.
2) Focused smoke script covering HQ/supervisor/parent/teacher/student boundaries.
3) Parent published linked-child visibility proof cases.
4) Supervisor own-branch write/manage boundary proof cases (including mixed-target cross-branch deny).
5) Read-receipt own-row parent write proof cases.
6) Docs checkpoint update for service/smoke outcomes.

Validation efficiency rule:
Run only:
- npm run test:supabase:parent-announcements:service-smoke
- git diff --name-only
Do not run build/lint/typecheck/full smoke suite unless runtime files change outside this scope.
```

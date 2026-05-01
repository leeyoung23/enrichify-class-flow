# Parent-facing Announcements SQL Application Checkpoint

## Checkpoint update (parent-facing media service + smoke)

- Parent-facing media service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)` (cleanup helper)
- Focused smoke script/command now exists:
  - `scripts/supabase-parent-announcements-media-smoke-test.mjs`
  - `npm run test:supabase:parent-announcements:media`
- Service posture:
  - anon client + JWT + RLS only,
  - private bucket only (`parent-announcements-media`),
  - signed URL only (no public URL path),
  - no service-role frontend usage,
  - no reuse of internal `announcements-attachments` bucket.
- Upload flow uses metadata-first path with cleanup attempt on object-upload failure.
- Upload validation includes media-role allowlist, content-type allowlist, and size boundary (`<= 25MB`).
- Release boundary update:
  - upload defaults `released_to_parent=false`,
  - manager release helper `releaseParentAnnouncementMedia(...)` sets `released_to_parent=true`,
  - parent access remains release-gated by existing RLS helper path.
- Smoke outcome intent/result:
  - manager upload/list/signed URL proof,
  - parent unreleased deny + released allow proof where fixture allows,
  - teacher/student media-block proof,
  - cleanup proof with CHECK-only warnings when fixture/session constrained.
- No app UI implementation in this checkpoint.
- No SQL/RLS changes in this checkpoint.
- No notifications/emails in this checkpoint.
- Canonical media checkpoint doc:
  - `docs/parent-facing-announcements-media-service-smoke-checkpoint.md`

## Checkpoint update (029 insert RLS manual DEV application + smoke proof)

- `029` manual apply target:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- No parent-facing media service changes in this checkpoint.
- No media/email/notification behavior added.
- Root cause now documented as resolved:
  - before `029`, raw insert without `RETURNING` could succeed while `insert(...).select()` (`INSERT ... RETURNING`) failed with `42501`,
  - `RETURNING` path required `SELECT`-policy visibility for newly inserted draft rows,
  - `029` introduced `can_select_parent_announcement_row_029(...)` and `can_insert_parent_announcement_row_029(...)` policy-helper wiring to resolve this.
- SQL/RLS confirmation after manual apply:
  - `parent_announcements_insert_028` now uses `can_insert_parent_announcement_row_029(...)`,
  - `parent_announcements_select_028` now uses `can_select_parent_announcement_row_029(...)`,
  - helper functions exist: `can_insert_parent_announcement_row_029`, `can_select_parent_announcement_row_029`,
  - only parent-announcements insert/select policy wiring changed,
  - update/delete/target/media/read-receipt/storage policy surfaces remain unchanged,
  - parent read remains published + linked-child scoped,
  - teacher/student remain blocked,
  - supervisor own-branch safeguards remain preserved.
- Parent-facing smoke now strongly passes:
  - HQ context diagnostic + fixture discovery (`branch/class/student/other_branch`) resolved,
  - HQ create draft PASS,
  - HQ publish PASS,
  - HQ other-branch negative fixture PASS,
  - supervisor own-branch create PASS,
  - supervisor own-branch publish PASS,
  - supervisor mixed-target cross-branch create blocked PASS,
  - teacher create/manage blocked PASS,
  - parent create/manage blocked PASS,
  - parent linked published visible PASS,
  - parent detail read PASS,
  - parent mark own read receipt PASS,
  - parent unrelated other-branch blocked/empty PASS,
  - parent internal_staff blocked/empty PASS,
  - student blocked/empty PASS,
  - cleanup PASS.
- Remaining CHECK notes:
  - unrelated parent auth fixture credential-check remains skipped when credentials are missing/invalid,
  - parent negative branch coverage still exists via same parent blocked on unrelated other-branch fixture,
  - Phase1 optional cross-branch check remains env-fixture dependent when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing,
  - no unsafe access observed.
- Regression result note:
  - `npm run test:supabase:announcements:phase1` PASS,
  - request workflow unaffected,
  - parent/student remain blocked from internal_staff announcements,
  - optional cross-branch CHECK remains expected in fixture-missing contexts.
- Canonical checkpoint doc:
  - `docs/parent-facing-announcements-insert-rls-application-checkpoint.md`

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

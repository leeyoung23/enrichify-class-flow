# Parent-facing Announcements Insert RLS Application Checkpoint

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

Date: 2026-05-01  
Scope: manual Supabase DEV application checkpoint for `029` + parent-facing smoke proof update (docs-only)

## 1) Application status

- Manual apply target:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- Environment boundary:
  - DEV only
  - no production apply
- Checkpoint boundary:
  - no runtime/UI/service changes
  - no parent-facing media service changes
  - no media/email/notification behavior added

## 2) Root cause resolved

Before `029`:

- direct raw insert without `RETURNING` could succeed,
- `insert(...).select()` / `INSERT ... RETURNING` failed with `42501`.

Root cause:

- `RETURNING` path requires `SELECT` policy visibility on newly inserted draft rows.

`029` resolution:

- insert predicate helper: `can_insert_parent_announcement_row_029(...)`
- returning-safe select predicate helper: `can_select_parent_announcement_row_029(...)`

## 3) SQL/RLS confirmation

Confirmed in DEV after manual apply:

- `parent_announcements_insert_028` now uses `can_insert_parent_announcement_row_029(...)`.
- `parent_announcements_select_028` now uses `can_select_parent_announcement_row_029(...)`.
- Helper functions exist:
  - `can_insert_parent_announcement_row_029`
  - `can_select_parent_announcement_row_029`

Scope confirmation:

- Only parent announcement insert/select policy wiring changed in this patch.
- `update/delete/targets/media/read_receipt/storage` policy surfaces remain unchanged.
- Parent read remains published + linked-child scoped.
- Teacher/student remain blocked for parent-facing announcement access where intended.
- Supervisor own-branch/mixed-target safeguards from `028` remain preserved.

## 4) Parent-facing smoke result

Latest smoke proof now strongly passes:

- HQ context diagnostic confirms active role context and branch-shape diagnostics.
- Fixture discovery found `branch/class/student/other_branch` IDs.
- HQ create parent announcement draft PASS.
- HQ publish parent announcement PASS.
- HQ other-branch published fixture for parent negative proof PASS.
- Branch Supervisor own-branch create PASS.
- Branch Supervisor own-branch publish PASS.
- Branch Supervisor mixed-target cross-branch create blocked PASS.
- Teacher create/manage blocked PASS.
- Parent create/manage blocked PASS.
- Parent linked published parent announcement visible PASS.
- Parent detail read PASS.
- Parent mark own read receipt PASS.
- Parent unrelated other-branch published fixture blocked/empty PASS.
- Parent internal_staff announcements blocked/empty PASS.
- Student parent announcements blocked/empty PASS.
- Cleanup PASS.

## 5) Remaining CHECK notes

- Unrelated parent credential-auth check remains skipped due missing/invalid unrelated parent fixture credentials.
- Negative parent coverage still exists via same parent blocked from unrelated other-branch published fixture.
- Phase1 optional cross-branch target check remains skipped when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not set.
- No unsafe access behavior observed.

## 6) Regression result

- `npm run test:supabase:announcements:phase1` PASS.
- Internal request workflow behavior remains unaffected.
- Parent/student remain blocked from internal_staff announcements.
- Expected optional cross-branch CHECK remains fixture-env dependent.

## 7) Safety boundaries preserved

- no ParentView parent-facing announcements UI shell implementation yet
- no parent-facing media service implementation yet
- no media storage object access exercised in this checkpoint
- no email/notification side effects
- no service-role frontend usage
- no internal `parent_facing_media` enablement
- separate parent-facing model remains isolated from internal announcements

## 8) Current product state

- Parent-facing data model is applied in DEV.
- Parent-facing services exist.
- Parent-facing create/read/read-receipt RLS boundaries are now strongly smoke-proven.
- ParentView parent-facing announcements UI remains not implemented.
- Parent-facing media service remains not implemented.
- Notification/email automation remains future.

## 9) Recommended next milestone

Recommendation: **A. Parent-facing media service + smoke test** first.

Why:

- Parent-facing media is privacy-sensitive and should be proven before UI exposure.
- Media bucket/policy foundation already exists.
- Service + smoke should prove signed URL and `released_to_parent` boundaries before ParentView media/UI dependency.
- ParentView UI should follow after boundary proof (unless intentionally shipping a no-media shell first).

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document parent-facing announcement insert RLS application

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent-facing media service + smoke test only.

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
- Do not upload real files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat.
- Do not enable internal parent_facing_media.
- Do not implement ParentView UI shell yet.

Please implement:
1) Parent-facing media service helpers for metadata/list/signed URL/release-boundary paths.
2) Focused smoke script for HQ/supervisor manage scope and parent released-only visibility.
3) Signed URL boundary checks for released vs unreleased parent-facing media.
4) No internal announcement attachment reuse.
5) Docs checkpoint update for media service smoke outcomes.

Validation efficiency rule:
Run only:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

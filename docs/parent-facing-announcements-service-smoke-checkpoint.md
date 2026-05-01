# Parent-facing Announcements Service + Smoke Checkpoint

## Checkpoint update (ParentView announcements/events shell with demo parity)

- ParentView now includes a read-only `Announcements & Events` shell near parent communication surfaces.
- Scope is parent viewing only:
  - no parent-facing creation UI,
  - no staff creation/manage controls,
  - no upload controls in this shell milestone.
- Demo parity behavior:
  - uses local fake parent-facing announcements/events only,
  - no Supabase calls for demo announcements list/detail,
  - includes varied fake announcement/event types.
- Authenticated non-demo parent behavior:
  - list via `listParentAnnouncements({ status: 'published', includeArchived: false })`,
  - detail via `getParentAnnouncementDetail(...)`,
  - released media list via `listParentAnnouncementMedia(...)`,
  - released media open via `getParentAnnouncementMediaSignedUrl({ expiresIn: 300 })`,
  - non-blocking read-receipt call via `markParentAnnouncementRead(...)` on detail open.
- Media/read safety:
  - released-only media visibility remains RLS-gated,
  - signed URL only, no public URL model,
  - no `storage_path` display,
  - no internal `announcements-attachments` exposure/reuse.
- No SQL/RLS changes in this checkpoint.
- No notification/email/live chat behavior in this checkpoint.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`


## Checkpoint update (parent-facing media smoke pass documented)

- Parent-facing media service milestone is now documented as PASS and stable.
- Confirmed service methods:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)`
- Boundary confirmation:
  - anon client + JWT + RLS only,
  - private bucket `parent-announcements-media` only,
  - signed URL only (no public URL model),
  - no service-role frontend,
  - no internal `announcements-attachments` bucket reuse.
- Release boundary confirmation:
  - upload defaults `released_to_parent=false`,
  - parent unreleased access blocked,
  - manager release helper gates released visibility.
- Smoke summary confirmation:
  - HQ upload/list/signed URL/release PASS,
  - parent unreleased deny + released allow PASS,
  - parent other-branch blocked PASS,
  - teacher blocked PASS,
  - student blocked/empty PASS,
  - cleanup PASS,
  - expected unrelated-parent credential CHECK remains.
- Validation confirmation:
  - `git diff --name-only` pre-test ran,
  - `build/lint/typecheck` PASS,
  - `test:supabase:parent-announcements:media` PASS,
  - `test:supabase:parent-announcements` PASS,
  - `test:supabase:announcements:phase1` PASS,
  - optional `company-news:create` + `announcements:attachments` PASS,
  - npm `devdir` warning remains non-blocking.
- No SQL/RLS changes in this checkpoint.
- No app UI/runtime behavior changes in this checkpoint.
- No notifications/emails/live chat in this checkpoint.
- Canonical doc:
  - `docs/parent-facing-announcements-media-service-smoke-checkpoint.md`
- Recommended next milestone now:
  - **A. ParentView announcements/events UI shell with demo parity** first.


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
Scope: parent-facing announcements read/write service + focused smoke test only (no UI wiring, no SQL/RLS changes)

## 1) Milestone status

- Added parent-facing announcement service methods:
  - `src/services/supabaseReadService.js`
  - `src/services/supabaseWriteService.js`
- Added focused smoke script:
  - `scripts/supabase-parent-announcements-smoke-test.mjs`
  - package command: `npm run test:supabase:parent-announcements`
- No app UI changes.
- No runtime page behavior changes.
- No Supabase SQL or RLS changes.
- No notification/email behavior.
- No parent-facing media upload/service implementation in this milestone.

## 2) Read service methods added

- `listParentAnnouncements({ status, announcementType, branchId, classId, includeArchived })`
- `getParentAnnouncementDetail({ parentAnnouncementId })`

Behavior:

- anon client + current JWT + RLS only.
- stable `{ data, error }` shape.
- safe generic read errors for policy/permission failures.
- safe parent-facing fields only:
  - `id`, `title`, `subtitle`, `bodyPreview`, `body` (detail only), `announcementType`, `status`,
  - `branchId`, `classId`, `publishedAt`, `eventStartAt`, `eventEndAt`, `location`,
  - `createdAt`, `updatedAt`.
- no internal `announcement_attachments` exposure.
- no internal `internal_staff` exposure via parent-facing methods.
- no `storage_path` exposure in parent-facing reads.

## 3) Write service methods added

- `createParentAnnouncement({...})`
- `publishParentAnnouncement({ parentAnnouncementId })`
- `archiveParentAnnouncement({ parentAnnouncementId })` (safe optional helper)
- `markParentAnnouncementRead({ parentAnnouncementId })`

Behavior:

- anon client + current JWT + RLS only.
- stable `{ data, error }` shape.
- safe generic write errors for policy/permission failures.
- no service-role frontend usage.
- no media upload path.
- no notifications/emails side effects.

## 4) Target handling and publish gate

Supported target types:

- `branch`
- `class`
- `student`

Rules:

- `branch` target requires `branchId`.
- `class` target requires `classId`.
- `student` target requires `studentId`.
- no direct parent/guardian target in MVP.
- no internal staff target model in this service.
- draft creation allows zero targets.
- publish requires at least one target.
- target insert failure after announcement insert triggers delete cleanup attempt; if blocked, returns `cleanup_warning`.

## 5) Input validation

Implemented validation includes:

- `title` required
- `body` required
- `announcementType` allowed values:
  - `event`, `activity`, `centre_notice`, `holiday_closure`, `reminder`, `celebration`, `programme_update`, `parent_workshop`, `graduation_concert`
- `eventEndAt >= eventStartAt` when both provided
- `branchId` / `classId` UUID checks when provided
- target array and target-shape validation

## 6) Smoke coverage summary

Smoke script uses fake/dev credentials and PASS/WARNING/CHECK semantics.

Covered:

- HQ create draft + publish after target.
- branch supervisor own-branch create/publish (PASS or CHECK with fixture constraints).
- branch supervisor mixed-target/cross-branch blocked where testable.
- parent linked visibility and own read-receipt mark where fixture allows.
- unrelated parent blocked/empty where fixture allows.
- parent create/manage blocked.
- teacher create/manage blocked.
- student blocked/empty.
- parent internal-staff announcement read blocked/empty check.
- cleanup of fake/dev rows.
- explicit statement that media service/storage object access is not exercised in this milestone.

## 6.1) CHECK investigation update

Latest diagnostic run confirms:

- HQ create failure is **not** primarily a branch/class/student fixture issue.
- Branch supervisor create failure is **not** primarily a missing own-branch fixture issue.
- Direct insert diagnostics now compare both forms:
  - insert without RETURNING
  - insert with RETURNING (`.insert(...).select(...)`)
- Current failing shape is observed as RLS insert denial on `parent_announcements` (`42501`), and service payload fields are valid for draft create path.

Interpretation:

- Current remaining create/publish CHECKs are primarily due active DEV insert/select policy posture, not missing branch/class/student IDs in smoke script.
- Fixture discovery is now improved and reports non-secret context:
  - actor role / is_active / branch-id shape,
  - fixture ID found/missing status,
  - create failure stage (`insert_or_targets`, `announcement_insert_only`, `publish`).
- Unrelated parent CHECK remains fixture-auth dependent:
  - missing/invalid unrelated fake parent credentials or auth user.

## 6.2) Safe fixture-path decision

- Discovery-first path is implemented in script (env override + deterministic fake fallback IDs from `005`).
- A focused RLS patch draft is now prepared:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
- `029` is manual/dev-first only and is **not auto-applied**.
- `029` introduces row-predicate insert/select helpers to keep strict role boundaries while addressing create-path insert/returning behavior.

## 7) Boundaries preserved

- no ParentView UI shell implementation yet.
- no parent-facing media service/upload implementation yet.
- no SQL/RLS policy changes.
- no internal attachment exposure.
- parent visibility remains fully RLS-bound.

## 8) What remains future

- ParentView announcements/events UI shell.
- Parent-facing media service + signed URL read path.
- Parent-facing media upload flow (if approved later).
- Notification/email automation planning and implementation.
- Further fixture hardening for parent linked/unrelated branch/class/student scenarios.

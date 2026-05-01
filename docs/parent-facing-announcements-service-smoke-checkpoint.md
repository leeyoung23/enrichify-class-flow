# Parent-facing Announcements Service + Smoke Checkpoint

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

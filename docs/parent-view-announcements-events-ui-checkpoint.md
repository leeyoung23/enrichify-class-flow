# ParentView Announcements and Events UI Checkpoint

Date: 2026-05-01  
Scope: ParentView announcements/events shell with demo parity only

## 1) Checkpoint summary

- ParentView now includes an `Announcements & Events` display shell for parent/student portal context.
- Scope is read-only viewing only; no creation/publish/archive/delete/upload controls.
- No SQL/RLS changes.
- No notification/email behavior.
- No live chat behavior.

## 2) ParentView UI behavior

- New section placement is near parent communication areas and Memories context.
- Includes:
  - featured/latest card
  - announcement/event list cards
  - selectable detail card
  - event window and location display when available
  - type badges (`Event`, `Reminder`, `Holiday Closure`, etc.)
- Mobile-first card layout preserved (stacked cards, compact badges, no table dependency).

## 3) Demo parity behavior

In demo parent/student mode:

- uses local fake announcement/event rows only (no Supabase reads for demo list/detail)
- includes varied fake types:
  - `event`
  - `activity`
  - `centre_notice`
  - `holiday_closure`
  - `reminder`
  - `celebration`
  - `parent_workshop`
- includes demo released-media placeholders only (no real file access)
- no upload/create/publish controls
- no notifications/emails/live chat

## 4) Authenticated parent read behavior

In authenticated non-demo mode:

- list uses `listParentAnnouncements({ status: 'published', includeArchived: false })`
- detail uses `getParentAnnouncementDetail({ parentAnnouncementId })`
- released media list uses `listParentAnnouncementMedia({ parentAnnouncementId })`
- media open uses `getParentAnnouncementMediaSignedUrl({ mediaId, expiresIn: 300 })`
- read receipt is non-blocking on detail selection via `markParentAnnouncementRead({ parentAnnouncementId })`
- safe loading/empty/error states are provided

## 5) Safety boundaries

- no parent-facing creation UI
- no parent-facing media upload UI
- no staff controls in ParentView
- no internal `announcement_attachments` exposure
- no `storage_path` display
- no internal `internal_staff` announcement exposure in parent section
- no service-role frontend usage

## 6) Validation and regressions

Validation run includes:

- `git diff --name-only` before tests
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:parent-announcements`
- `npm run test:supabase:parent-announcements:media`
- `npm run test:supabase:announcements:phase1`

Expected safe CHECK notes may remain fixture-dependent (unrelated parent credential fixture and optional phase1 cross-branch env var).

## 7) Next milestone suggestion

After this read-only shell:

- next: parent-facing creation UI planning/implementation in a separate milestone,
- keep SQL/RLS unchanged unless a new reviewed policy need appears.

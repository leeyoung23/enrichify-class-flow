# Parent-facing Media Upload/Release UI Checkpoint

Date: 2026-05-02  
Scope: staff-side Parent Notices media UI wiring in `Announcements` only

## 1) What is wired

- Parent-facing media controls are added inside staff `Announcements` under selected `Parent Notices` detail.
- Added UI flow:
  - upload media
  - list uploaded media
  - signed URL preview
  - explicit `Release to Parents` for unreleased media
  - cautious `Delete media` with confirmation for manager scope.

## 2) Placement and boundary

- Placement is staff-side only in `src/pages/Announcements.jsx`.
- No staff controls were added to `src/pages/ParentView.jsx`.
- ParentView remains a read-only parent surface.

## 3) Role and demo behavior

Authenticated non-demo:

- HQ/admin: media upload/list/preview/release/delete where RLS allows.
- Branch supervisor: media upload/list/preview/release/delete where RLS allows.
- Teacher: view-only media section in MVP.
- Parent/student: no staff-route access.

Demo:

- HQ/supervisor demo: local fake media upload/release/delete simulation only.
- Teacher demo: view-only.
- No Supabase media calls in demo path.
- No real file open/upload required in demo path.

## 4) Upload/list/preview/release behavior

- Upload uses `uploadParentAnnouncementMedia(...)` and defaults unreleased.
- List uses `listParentAnnouncementMedia(...)`.
- Preview uses `getParentAnnouncementMediaSignedUrl({ expiresIn: 300 })` and opens new tab with `noopener,noreferrer`.
- Release uses `releaseParentAnnouncementMedia(...)` and refreshes list to show released badge.
- UI does not display `storage_path`.

## 5) Delete behavior

- Delete uses existing `deleteParentAnnouncementMedia(...)` helper.
- Action is manager-scoped and confirmation-gated.
- List refreshes after delete.
- Safe generic error and cleanup-warning handling are kept.

## 6) Preserved safety constraints

- ParentView remains released-media-only and read-only.
- No notifications/emails/live chat side effects.
- No parent upload path added.
- No SQL/RLS changes and no SQL apply in this milestone.
- No service-role frontend usage.
- Demo/local fallback and `demoRole` behavior remain preserved.

## 7) Follow-up / future

- Optional stronger delete governance UX (eg role-specific warning copy) can be improved later.
- Optional media replace/reorder flow remains future.

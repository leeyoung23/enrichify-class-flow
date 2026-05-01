# Parent-facing Announcements Media Service + Smoke Checkpoint

## Checkpoint update (staff Parent Notices media UI wiring)

- Staff `Announcements` Parent Notices detail now uses existing parent-facing media service methods for runtime UI actions:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)`.
- UI behavior now reflects service boundary guarantees:
  - uploads default unreleased,
  - explicit release action toggles parent visibility boundary,
  - preview uses signed URL only,
  - no `storage_path` shown in UI.
- Demo path remains local-only simulation and does not call Supabase media methods.
- ParentView remains read-only/released-only; no staff controls were added there.
- No SQL/RLS changes, no SQL apply, and no notification/email side effects in this checkpoint.

## Checkpoint update (ParentView announcements/events UI checkpoint documented)

- ParentView `Announcements & Events` UI shell milestone is now documented as complete.
- Key status:
  - read-only parent viewing surface is implemented,
  - no creation/publish/archive/delete/upload controls,
  - no SQL/RLS changes,
  - no notifications/emails,
  - no live chat.
- Behavior confirmation:
  - mobile-first featured/list/detail cards with type badges and event metadata,
  - demo mode uses local fake announcement/event data only,
  - authenticated mode uses existing parent-facing read/media/read-receipt services.
- Security/safety confirmation:
  - RLS-bound parent visibility only,
  - released-media signed URL path only,
  - no internal `internal_staff` announcement exposure,
  - no internal `announcement_attachments` exposure,
  - no `storage_path` display,
  - no service-role frontend usage.
- Validation snapshot retained:
  - `build/lint/typecheck` PASS,
  - parent-facing announcement/media smokes PASS,
  - phase1 regression PASS,
  - expected fixture CHECK notes remain non-blocking.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`
- Recommended next milestone now:
  - **A. Parent-facing creation UI planning** (planning only).


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


Date: 2026-05-01  
Scope: docs-only finalization checkpoint for parent-facing media service + smoke pass

## 1) Key checkpoint notes

- Parent-facing media service is implemented.
- Parent-facing media smoke now passes.
- No app UI changes and no runtime page behavior changes in this checkpoint.
- No SQL/RLS changes in this checkpoint.
- No notifications/emails/live chat behavior in this checkpoint.
- No parent-facing creation UI in this checkpoint.
- No ParentView parent-facing announcements/events UI shell in this checkpoint.

## 2) Media service behavior

Service methods now available in `src/services/supabaseUploadService.js`:

- `uploadParentAnnouncementMedia(...)`
- `listParentAnnouncementMedia(...)`
- `getParentAnnouncementMediaSignedUrl(...)`
- `releaseParentAnnouncementMedia(...)`
- `deleteParentAnnouncementMedia(...)`

Behavior boundaries:

- anon client + JWT + RLS only
- stable `{ data, error }` shape
- safe/generic error responses
- no service-role frontend usage
- no public URL path model
- no reuse of internal `announcements-attachments` bucket

## 3) Upload/list/signed URL flow

- metadata-first flow:
  1. insert `parent_announcement_media` row
  2. upload object to `parent-announcements-media`
  3. if upload fails, attempt metadata cleanup and return `cleanup_warning` when blocked
- validation guards:
  - file required/non-empty
  - max size `<= 25MB`
  - allowed MIME types:
    - `image/jpeg`
    - `image/png`
    - `image/webp`
    - `application/pdf`
  - allowed media roles:
    - `parent_media`
    - `cover_image`
    - `attachment`
- service output does not return `storage_path` in UI-facing return shapes

## 4) `released_to_parent` boundary

- upload defaults to `released_to_parent=false`
- parent cannot access unreleased media
- `releaseParentAnnouncementMedia(...)` sets `released_to_parent=true` under manager RLS scope
- released media can be listed/read by eligible linked parent scope
- signed URL access is RLS-mediated through metadata visibility
- no public bucket/public URL model

## 5) Smoke test coverage

Script + command:

- `scripts/supabase-parent-announcements-media-smoke-test.mjs`
- `npm run test:supabase:parent-announcements:media`

Covered and passing:

- create/publish fake parent announcement
- HQ upload media PASS
- HQ list media PASS
- HQ signed URL PASS
- HQ release media PASS
- parent unreleased media denied PASS
- parent released media visible/access allowed PASS
- parent other-branch media blocked PASS
- teacher upload/manage blocked PASS
- student blocked/empty PASS
- no public URL path PASS
- cleanup media rows/objects + parent announcements PASS
- no notification/email side effects PASS
- no internal attachments bucket reuse PASS

## 6) CHECK/WARNING notes

- unrelated parent fixture login remains CHECK when credentials are missing/invalid
- no unsafe access widening observed
- related phase1 optional cross-branch check remains expected when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing
- npm `devdir` warning remains non-blocking in this environment

## 7) Validation result

Validation sequence and results captured:

- `git diff --name-only` ran before tests
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:parent-announcements:media` PASS (with expected unrelated-parent CHECK)
- `npm run test:supabase:parent-announcements` PASS
- `npm run test:supabase:announcements:phase1` PASS
- optional shared-risk regressions:
  - `npm run test:supabase:company-news:create` PASS
  - `npm run test:supabase:announcements:attachments` PASS

## 8) Safety boundaries preserved

- no ParentView UI yet
- no parent-facing media UI yet
- no parent-facing creation UI yet
- no notifications/emails
- no live chat
- no service-role frontend
- no internal `parent_facing_media` enabled
- separate parent-facing model remains isolated from internal announcements

## 9) Recommended next milestone

Recommendation: **A. ParentView announcements/events UI shell with demo parity** first.

Why:

- read/media services and RLS boundaries are now proven
- parents now need the viewing surface before staff creation UI polish
- demo parity can validate mobile parent experience without new SQL/RLS
- parent-facing creation UI can follow after display shell is safe

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document parent-facing announcement media smoke pass

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
ParentView announcements/events UI shell with demo parity only.

Hard constraints:
- UI shell only for this milestone.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add service-role frontend usage.
- Do not add real AI/provider keys.
- Do not auto-send emails or notifications.
- Do not start live chat.
- Do not enable internal parent_facing_media.
- Keep demoRole and demo/local fallback.
- Use fake/dev data only.

Please implement:
1) ParentView announcements/events read-only shell using existing parent-facing read/media services.
2) Demo parity for ParentView announcements/events shell.
3) Safe empty/loading/error states without SQL/RLS/env leakage.
4) No parent-facing creation UI in this milestone.
5) Docs checkpoint update for ParentView shell outcome.

Validation efficiency rule:
Docs-only checkpoint unless runtime files change.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

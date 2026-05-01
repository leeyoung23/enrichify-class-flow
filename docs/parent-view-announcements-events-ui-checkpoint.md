# ParentView Announcements and Events UI Checkpoint

## Checkpoint update (staff-side parent notice creation wired)

- Parent-facing text-only creation UI is now wired in staff `Announcements` under `Parent Notices`.
- ParentView remains read-only and parent-safe:
  - no create/publish/archive controls in ParentView,
  - no parent media upload UI in ParentView.
- Staff-side parent notice flow now supports draft/publish/archive for allowed roles.
- No SQL/RLS changes in this checkpoint update.
- No notification/email/live chat behavior added.
- Canonical creation checkpoint:
  - `docs/parent-facing-creation-ui-checkpoint.md`

## Checkpoint update (creation UI checkpoint finalized)

- Parent-facing creation checkpoint documentation is now finalized.
- ParentView boundary remains unchanged:
  - read-only parent surface,
  - no parent-facing create/publish/archive controls,
  - no parent media upload/release controls.
- Validation notes for related creation milestone are recorded in:
  - `docs/parent-facing-creation-ui-checkpoint.md`

Date: 2026-05-02  
Scope: ParentView `Announcements & Events` UI shell with demo parity only

## 1) Key checkpoint notes

- ParentView `Announcements & Events` section is now added.
- It is a read-only parent viewing surface.
- No create/publish/archive/delete/upload controls are present.
- No SQL/RLS changes were made in this milestone.
- No notification/email behavior was added.
- No live chat behavior was added.

## 2) ParentView UI behavior

- Placement is near existing parent communication/Memories flow.
- Shell includes:
  - featured/latest card,
  - mobile-first list cards,
  - selectable detail card,
  - type badges,
  - event date/time/location when available.
- Safe loading/empty/error states are included.

## 3) demoRole behavior

In demo parent/student mode:

- uses local fake announcements/events only,
- does not call Supabase for demo announcements/events,
- includes fake types:
  - `event`
  - `activity`
  - `centre_notice`
  - `holiday_closure`
  - `reminder`
  - `celebration`
  - `parent_workshop`
- demo media is placeholder-style only,
- no upload/open real files in demo.

## 4) Authenticated parent read behavior

In authenticated non-demo mode:

- list read:
  - `listParentAnnouncements({ status: 'published', includeArchived: false })`
- detail read:
  - `getParentAnnouncementDetail({ parentAnnouncementId })`
- visibility remains RLS-bound.
- No internal `internal_staff` announcement exposure.
- No internal `announcement_attachments` exposure.
- No raw SQL/RLS/env leakage in parent-facing UI copy.

## 5) Media/read receipt behavior

- released media list read:
  - `listParentAnnouncementMedia({ parentAnnouncementId })`
- released media open:
  - `getParentAnnouncementMediaSignedUrl({ mediaId, expiresIn: 300 })`
- Signed URL only.
- No `storage_path` display in UI.
- No public URL model.
- Released-only media access remains RLS/service mediated.
- read receipt call on detail open:
  - `markParentAnnouncementRead({ parentAnnouncementId })`
- read receipt failure is intentionally non-blocking.

## 6) Safety boundaries

- no parent-facing creation UI
- no parent media upload UI
- no staff controls in ParentView
- no notifications/emails
- no live chat
- no service-role frontend
- no internal `parent_facing_media`
- no internal attachments bucket reuse
- parent-facing model remains separate from internal announcements

## 7) Validation result

- `git diff --name-only` ran before tests.
- `npm run build` PASS.
- `npm run lint` PASS.
- `npm run typecheck` PASS.
- `npm run test:supabase:parent-announcements` PASS.
- `npm run test:supabase:parent-announcements:media` PASS.
- `npm run test:supabase:announcements:phase1` PASS.
- Expected CHECK notes:
  - unrelated parent credentials missing/invalid,
  - `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` missing for optional phase1 cross-branch check,
  - npm `devdir` warning is non-blocking.

## 8) What remains future

- parent-facing creation UI
- parent-facing media upload UI
- notification/email planning and rollout
- additional parent interactions beyond read-only
- reports/PDF/AI OCR (separate track)
- attendance arrival email (separate track)

## 9) Recommended next milestone

Recommendation: **A. Parent-facing creation UI planning** first (planning-only).

Why:

- parent viewing surface now exists,
- service/RLS/media boundaries are proven,
- next step should safely plan HQ/supervisor creation workflow before implementation,
- notification/email should wait until creation workflow shape is finalized,
- media upload UI can be handled inside creation planning or as a follow-up.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document ParentView announcements events UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent-facing creation UI planning only.

Hard constraints:
- Planning/docs only in this milestone.
- Do not change app UI runtime behavior.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add services.
- Do not add notifications/emails.
- Do not add live chat.
- Do not add real AI/provider keys.
- Do not use service role key in frontend.
- Keep demoRole and local/demo fallback.
- Use fake/dev data only.

Please deliver:
1) Safe HQ/supervisor parent-facing creation workflow proposal.
2) Draft validation/permission matrix for create->target->media release sequencing.
3) Non-goals and risk controls (no parent/staff leakage).
4) Phased plan for creation UI and media upload UI follow-up.

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

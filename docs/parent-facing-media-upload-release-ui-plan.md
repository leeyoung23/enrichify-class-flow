# Parent-facing Media Upload/Release UI Plan

Date: 2026-05-02  
Scope: planning-only checkpoint for safe parent-facing media upload/release UI before implementation

## 1) Current state

- Parent-facing text-only creation UI exists in staff `Announcements` (`Parent Notices`).
- Parent-facing media service is implemented and smoke-proven.
- ParentView already displays released parent-facing media using existing released-media read/open methods.
- Parent-facing media upload/release UI does not exist yet.
- Notifications/emails are not implemented in this flow.

## 2) Product purpose

The media upload/release UI should allow HQ/supervisor to attach parent-facing files to official parent notices/events while preserving strict release governance.

Purpose goals:

- support trusted, polished parent communications with optional visual/document evidence,
- keep uploaded media unreleased by default,
- require explicit staff release action before parent visibility,
- reduce dependence on WhatsApp/Drive-style external sharing,
- keep release decisions intentional and auditable.

## 3) Role behavior

MVP role plan:

- **HQ/admin:** upload/release/delete globally where RLS allows.
- **Branch supervisor:** upload/release/delete within own-branch scope where RLS allows.
- **Teacher:** blocked for parent-facing media manage in MVP.
- **Parent/student:** no upload/manage controls.
- **Demo mode:** local-only fake media upload/release simulation; no Supabase calls in demo media create/release path.

## 4) Placement options

### A) Inside Parent Notices create/edit detail

Pros:

- best creator flow continuity (text + media + release in one place),
- clearer pre-publish checklist,
- easier to enforce target/publish/media sequencing UX.

Risks:

- detail view can become dense on mobile if poorly grouped.

### B) Separate Media panel inside selected parent announcement

Pros:

- cleaner separation between content authoring and media lifecycle,
- easier to keep release controls tightly scoped in one panel.

Risks:

- extra navigation/steps for creators.

### C) ParentView admin controls

Not recommended:

- parent portal must remain read-only parent-safe surface,
- higher accidental admin-control leakage risk.

### D) Dashboard shortcut

Not recommended as primary surface:

- weak context for linking media to specific parent notice lifecycle.

### Recommendation

Recommend **A first** (inline within Parent Notices detail flow), optionally with a clearly bordered subsection that behaves like panel **B**.  
Do not use ParentView for admin media controls.

## 5) Upload UI fields

Planned upload UI inputs and states:

- file selector,
- media role selector:
  - `parent_media`
  - `cover_image`
  - `attachment`
- selected file name display,
- type/size validation guidance copy (allowed MIME types and max size),
- upload loading/progress state,
- safe generic error state,
- no `storage_path` display in UI.

Notes:

- keep `staff_note` out of parent-facing media UI scope,
- keep no-public-URL messaging explicit in creator helper text.

## 6) Release workflow

Planned lifecycle:

1. Upload media -> defaults `released_to_parent=false`.
2. Internal staff preview/open for uploaded item.
3. Explicit `Release to Parents` action for approved items.
4. Status badges:
   - `Unreleased`
   - `Released`
5. Optional future controls:
   - unrelease/remove governance (follow-up decision),
   - replace/reupload flow.

Behavior requirements:

- parent visibility remains released-only,
- release action must be explicit and role-gated,
- no email/notification side effects on upload or release in MVP.

## 7) ParentView display relationship

ParentView behavior should remain unchanged:

- only released media is listed,
- opening media uses signed URLs only,
- no public URLs,
- no `storage_path` exposure,
- safe loading/empty/failure fallback messaging.

No ParentView admin upload/release controls should be added.

## 8) Safety/privacy boundaries

Must-hold boundaries:

- no internal `announcements-attachments` bucket reuse,
- no enabling internal `parent_facing_media` flag,
- no public URL model,
- no service-role frontend usage,
- no notifications/emails by default,
- no real data in tests/fixtures,
- no `staff_note` exposure in parent-facing media path,
- no parent upload path in MVP.

## 9) Testing plan (future implementation)

Required future checks:

- HQ upload media PASS,
- HQ release media PASS,
- supervisor own-branch upload/release PASS,
- teacher upload/manage blocked PASS,
- parent unreleased media hidden PASS,
- parent released media visible PASS,
- unrelated parent blocked PASS,
- signed URL works only for eligible released media PASS,
- cleanup of metadata/object rows PASS,
- no email/notification side effects PASS.

## 10) Implementation recommendation

Options:

- A. Upload/list/release UI inside staff Parent Notices detail
- B. Upload-only UI first, release later
- C. Release-only UI first
- D. Defer media UI and do final QA

### Recommendation

Recommend **A** first.

Why:

- service layer is already stable and smoke-proven,
- creators need complete media lifecycle visibility in notice context,
- release gating is a core safety boundary and should ship with upload list/manage surface rather than later split.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add parent-facing media upload release UI plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement parent-facing media upload/release UI wiring only for staff Parent Notices detail.

Hard constraints:
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add new backend services.
- Do not add ParentView admin controls.
- Do not add notifications/emails.
- Do not add live chat.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not use service role in frontend.
- Do not remove demoRole or demo/local fallback.
- Use fake/dev data only in demo/test paths.
- Do not expose storage_path in UI.
- Do not expose staff_note in parent-facing media UI path.

Implement:
1) Add media section in staff Parent Notices detail (upload/list/release controls).
2) Use existing media service methods only:
   - uploadParentAnnouncementMedia(...)
   - listParentAnnouncementMedia(...)
   - getParentAnnouncementMediaSignedUrl(...)
   - releaseParentAnnouncementMedia(...)
   - deleteParentAnnouncementMedia(...)
3) Keep upload default unreleased.
4) Add explicit Release to Parents action with unreleased/released badges.
5) Keep teacher blocked and parent/student without media-manage controls.
6) Keep ParentView read-only released-media behavior unchanged.
7) Ensure safe generic errors and loading/empty states.

Validation:
- Run git diff --name-only before tests.
- Run:
  - npm run build
  - npm run lint
  - npm run typecheck
  - npm run test:supabase:parent-announcements
  - npm run test:supabase:parent-announcements:media
  - npm run test:supabase:announcements:phase1
- If Announcements/Company News/MyTasks behavior is touched in risky ways, also run:
  - npm run test:supabase:company-news:create
  - npm run test:supabase:announcements:mytasks
```

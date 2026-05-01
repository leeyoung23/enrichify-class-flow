# Parent-facing Announcements and Events Plan

## Checkpoint update (text-only creation UI wired in staff Announcements)

- Parent-facing text-only creation mode is now wired as `Parent Notices` inside staff `Announcements`.
- This follows placement recommendation A from this plan.
- Current wired behavior:
  - parent-friendly preview before submit,
  - save draft,
  - create then publish,
  - archive action for HQ/supervisor where allowed.
- MVP role behavior remains aligned:
  - HQ/admin and branch supervisor create path,
  - teacher view-only,
  - parent/student no staff-route creation access.
- Boundaries unchanged:
  - no parent media upload/release UI in this milestone,
  - no SQL/RLS changes,
  - no notifications/emails/live chat.
- Canonical checkpoint:
  - `docs/parent-facing-creation-ui-checkpoint.md`

## Checkpoint update (post-implementation planning direction)

- After text-only creation wiring, recommended next step is now:
  - **A. Parent-facing media upload/release UI planning**.
- Rationale:
  - text-only creation value is delivered,
  - media service boundary is already proven,
  - media UI introduces file-governance and accidental-release risk that should be planned before wiring,
  - notifications/emails remain deferred until media/creation governance is stabilized,
  - real AI provider integration remains later after communication module checkpoints are complete.

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
Scope: planning-only checkpoint for parent-facing announcements/events next layer (no implementation in this milestone)

## Checkpoint update (028 parent-facing SQL/RLS foundation draft)

- New manual/dev-first SQL draft is now added:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- `028` is draft-only and is not auto-applied.
- `028` introduces a separate parent-facing model:
  - `parent_announcements`
  - `parent_announcement_targets`
  - `parent_announcement_read_receipts`
  - `parent_announcement_media`
- `028` includes private parent-facing storage bucket draft:
  - `parent-announcements-media` (`public=false`)
- `028` keeps boundaries explicit:
  - no UI/runtime/service implementation in this milestone,
  - no internal `announcement_attachments` reuse,
  - no enabling of internal `parent_facing_media`,
  - no notifications/emails automation.
- Pre-apply security review update:
  - branch supervisor manage scope was hardened so supervisors can manage only announcements whose row and targets stay fully inside a single managed branch,
  - this closes cross-branch manage risk from mixed-target announcements before manual DEV apply.

## Checkpoint update (028 manual DEV SQL application)

- `028` is now manually applied in Supabase DEV:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- No notification/email behavior was introduced.
- Verification confirms parent-facing foundation exists:
  - tables: `parent_announcements`, `parent_announcement_targets`, `parent_announcement_read_receipts`, `parent_announcement_media`
  - RLS enabled + policies present on parent-facing tables
  - helper functions present including `is_parent_announcement_supervisor_scope_safe_028(...)`
  - private bucket `parent-announcements-media` exists with storage policies
- Internal safety boundaries remain unchanged:
  - no internal `announcement_attachments` reuse
  - internal `parent_facing_media` remains disabled/reserved
  - no parent-facing UI/services in this checkpoint
- Application checkpoint doc:
  - `docs/parent-facing-announcements-sql-application-checkpoint.md`

## Checkpoint update (parent-facing announcements service + smoke)

- Service methods are now added for parent-facing announcements:
  - read: `listParentAnnouncements(...)`, `getParentAnnouncementDetail(...)`
  - write: `createParentAnnouncement(...)`, `publishParentAnnouncement(...)`, `archiveParentAnnouncement(...)`, `markParentAnnouncementRead(...)`
- Focused smoke command now exists:
  - `npm run test:supabase:parent-announcements`
- Service scope remains backend-only:
  - no ParentView UI shell wiring yet,
  - no parent-facing media upload/service in this milestone,
  - no SQL/RLS changes,
  - no notification/email behavior,
  - parent visibility remains RLS-bound.
- Service checkpoint doc:
  - `docs/parent-facing-announcements-service-smoke-checkpoint.md`
- CHECK-investigation update:
  - fixture discovery and diagnostics were strengthened in smoke script,
  - current HQ/supervisor create CHECKs trace to active DEV insert RLS denial (`42501`) rather than missing branch/class/student IDs,
  - unrelated parent check remains dependent on fake unrelated-parent auth fixture credentials.
- Follow-up insert-RLS patch draft:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql` (manual/dev-first, review-first, not auto-applied).

## 1) Current state

- Staff `Announcements` is now a strong internal prototype:
  - request/reminder workflow
  - replies/read/done/undone
  - attachments
  - MyTasks visibility
  - completion overview
  - Company News shell + runtime warm popup + HQ create/publish UI
- Parent portal surface already exists via `ParentView`.
- Parent-facing announcements/events are not implemented yet.
- `parent_facing_media` remains disabled/reserved.
- Notification/email automations are not implemented.

## 2) Product purpose

Parent-facing announcements/events should give parents a trusted, clear, official place to see:

- centre events,
- class or branch notices,
- activities and celebrations,
- holiday/closure updates,
- reminders relevant to families.

Product intent:

- place this near Memories / parent communication area,
- reduce dependence on WhatsApp broadcast chains,
- provide parent-friendly polished communication,
- increase trust, transparency, and parent understanding of centre learning life.

## 3) Parent-facing vs staff/internal announcements

### Staff internal (current)

- HQ/supervisor/teacher operational workflow.
- Request/task patterns (reply/upload/done/undone).
- Completion monitoring and internal documents.
- Company News for internal culture/updates.

### Parent-facing (future)

- Centre events and activity announcements.
- Class/branch notices and holiday/closure messages.
- Parent reminders and programme communication.
- Public-facing/polished copy only.
- No internal staff notes/documents or staff-only operational details.

## 4) Content types

Recommended parent-facing content types:

- `event`
- `activity`
- `centre_notice`
- `holiday_closure`
- `reminder`
- `celebration`
- `programme_update`
- `parent_workshop`
- `graduation_concert_notice`

## 5) Audience / targeting

Targeting plan:

- all parents in a branch,
- class parents,
- selected student/guardian families,
- programme/cohort targeting later (not required in first release).

Safety requirements:

- no unrelated family visibility leakage,
- no staff-only content shown to parents,
- strict linked-child / branch / class scoping for reads.

## 6) Data model options

### Option A: extend existing `announcements`

Approach:

- reuse `announcements` with strict `audience_type = 'parent_facing'`,
- add parent-facing fields as needed,
- tighten RLS and policy predicates around parent visibility.

Pros:

- faster reuse path for MVP.

Risks:

- policy complexity in mixed internal + parent table,
- higher accidental leakage risk if policy predicates are incomplete.

### Option B: separate `parent_announcements` table

Approach:

- separate parent-facing table + targets + statuses/media boundaries.

Pros:

- clearest hard boundary between internal and parent content,
- easier to reason about privacy and audits.

Risks:

- more schema/service work.

### Option C: hybrid

Approach:

- MVP reuse on existing `announcements` under strict audience/RLS rules,
- split to separate table later if complexity rises.

Pros:

- balanced speed + migration path.

Risks:

- still carries mixed-table policy complexity during MVP.

### Recommendation

Recommend **A-first milestone as a planning/review step**, with **B as safest long-term target**:

- For next milestone, do SQL/RLS data model review before any UI/service work.
- If team prioritizes strongest safety boundary over speed, prefer B.
- If MVP speed is required, C is acceptable only with strict audited `audience_type='parent_facing'` policy hardening and explicit migration criteria.

## 7) Parent-facing media / files

Planning direction:

- Parent-facing images/media are likely needed.
- Use private storage + signed URLs only.
- Do not reuse internal staff attachment rows/files for parent release.
- Keep parent-facing media as optional.
- Keep `parent_facing_media` behind separate release boundary.
- No public URLs by default.
- Never expose `staff_note` or internal documents in parent path.

## 8) Parent portal UI placement

Proposed placement:

- add a parent section near Memories/Updates in `ParentView`,
- probable label: `Announcements & Events`.

Suggested structure:

- featured/latest card,
- event list feed,
- detail view route/panel,
- event date/time/location fields,
- mobile-first card layout,
- no staff controls visible in parent views.

## 9) Staff/HQ creation workflow

Planned creation flow:

- HQ/supervisor creates parent-facing post (teacher creator optional later, only if approved),
- parent-friendly template options,
- optional media upload,
- preview before publish,
- publish/release to parent portal,
- edit/archive governance in later phase.

MVP role stance:

- HQ + supervisor creators,
- teacher likely view/non-creator unless product decision approves teacher authoring.

## 10) RLS/privacy boundaries

Must-hold boundaries:

- parent reads only linked-child / branch / class scoped parent-facing records,
- parent cannot read internal staff announcements,
- parent cannot read staff attachments or staff notes,
- internal docs never leak to parent surfaces,
- service role key is never used in frontend,
- child/family boundary checks must be strict,
- parent-facing media boundary remains separate from internal attachment model.

## 11) Notification/email boundary

This planning milestone adds no automatic email/notification behavior.

Future direction only:

- optional email notice when parent-facing post is published,
- optional reminder email for date-based events,
- anti-spam defaults and template safety required,
- audit trail required for sends and templates.

Related boundary:

- attendance arrival email remains separate attendance module track.

## 12) Testing plan (future)

Future smoke/UI tests should cover:

- HQ creates parent-facing draft.
- Supervisor own-branch create if role scope allows.
- Parent linked to class/branch sees eligible post.
- Unrelated parent/family is blocked.
- Parent cannot see `internal_staff` posts.
- Parent cannot see internal attachments/staff notes.
- Parent media signed URL works only for eligible parent.
- No notification/email side effects in base rollout.

## 13) Risks and safeguards

Key risks:

- cross-family leakage,
- internal content accidentally published to parents,
- media/privacy exposure risk,
- stale/outdated posts causing confusion,
- over-notification fatigue,
- inconsistent parent-facing tone quality,
- weak mobile readability,
- unclear audit/edit governance.

Safeguards:

- RLS-first design and review gate,
- explicit publish boundary internal vs parent-facing,
- private storage + signed URL only,
- content lifecycle (draft/review/published/archived),
- parent-friendly copy/template guardrails,
- mobile-first QA before release,
- audit trail for create/edit/publish actions.

## 14) Recommended next milestone

Options:

- A. Parent-facing announcements service + smoke test
- B. ParentView UI shell with demo parity
- C. Parent-facing media service + smoke test
- D. Notification/email planning
- E. Reports/PDF/AI OCR plan

Recommendation: **A first**.

Why A first:

- SQL/RLS foundation is now manually applied in DEV,
- service smoke should prove create/read/visibility boundaries before UI rollout,
- media service can follow after core parent announcement visibility is proven,
- notification/email behavior should wait until service-level safety is validated.

## 15) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add parent-facing announcements events plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent-facing announcements/events SQL/RLS data model review only.

Hard constraints:
- Planning/docs only in this milestone.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Supabase SQL in this milestone.
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
- Do not enable parent_facing_media yet.
- Do not implement parent-facing announcements/events yet.

Please inspect:
- docs/company-news-create-ui-checkpoint.md
- docs/company-news-warm-popup-plan.md
- docs/announcements-internal-communications-plan.md
- docs/mobile-first-qa-checkpoint.md
- docs/project-master-context-handoff.md
- src/pages/ParentView.jsx
- src/pages/Announcements.jsx
- src/services/supabaseReadService.js
- src/services/supabaseWriteService.js
- supabase/sql/020_announcements_phase1_foundation.sql
- supabase/sql/023_announcements_attachments_foundation.sql
- package.json

Deliverables:
1) Compare model options for parent-facing announcement/event data boundaries (extend existing vs separate table vs hybrid).
2) Propose RLS privacy matrix for HQ/supervisor/teacher/parent with strict family scoping.
3) Define parent-facing target model and non-leakage constraints.
4) Define publish/release lifecycle and governance boundaries.
5) Define parent-facing media boundary assumptions (private storage + signed URL + no internal attachment reuse).
6) Document risks, safeguards, and phased recommendation.

Validation efficiency rule:
Docs/planning only.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

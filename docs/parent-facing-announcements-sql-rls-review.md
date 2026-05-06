# Parent-facing Announcements and Events SQL/RLS Review

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
Scope: planning/review only for safest SQL/RLS direction before implementation (no UI/runtime/service/SQL changes in this milestone)

## Checkpoint update (028 SQL draft prepared)

- Manual/dev-first parent-facing SQL draft is now prepared at:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- Draft status:
  - not auto-applied,
  - no production apply assumption,
  - fake/dev data only.
- Draft model follows recommended separate boundary:
  - `parent_announcements`
  - `parent_announcement_targets`
  - `parent_announcement_read_receipts`
  - `parent_announcement_media`
- Private storage bucket draft added:
  - `parent-announcements-media` (`public=false`) with storage policy draft.
- Privacy-first RLS direction in `028`:
  - HQ global manage,
  - branch supervisor own-branch manage,
  - teacher blocked from parent-facing management in MVP,
  - parent read scoped to published targeted rows for linked child context,
  - student blocked in MVP.
- Focused pre-apply fix now included in `028`:
  - added `is_parent_announcement_supervisor_scope_safe_028(...)`,
  - tightened `can_manage_parent_announcement(...)` so branch supervisors cannot manage announcements that include any out-of-branch targets,
  - protects against cross-branch edit/delete/media/target side effects from mixed-target announcements.

## Checkpoint update (028 manual DEV SQL application)

- `028` was manually applied in Supabase DEV SQL Editor.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- No notification/email behavior was introduced.
- SQL application verification confirmed:
  - parent-facing tables exist,
  - RLS is enabled on all parent-facing tables,
  - parent-facing table policies exist,
  - helper functions exist including `is_parent_announcement_supervisor_scope_safe_028(...)`,
  - private storage bucket `parent-announcements-media` exists with policies.
- Security hardening continuity:
  - pre-apply mixed-target cross-branch supervisor manage escalation is fixed and preserved after apply.
- Canonical application checkpoint:
  - `docs/parent-facing-announcements-sql-application-checkpoint.md`

## Checkpoint update (parent-facing announcements service + smoke)

- Parent-facing service layer is now added on top of applied `028` foundation:
  - read methods in `src/services/supabaseReadService.js`
  - write methods in `src/services/supabaseWriteService.js`
- Focused smoke script is now added:
  - `scripts/supabase-parent-announcements-smoke-test.mjs`
- Service smoke intent:
  - prove HQ/supervisor create/publish boundaries,
  - prove parent linked visibility + own read-receipt write path,
  - prove parent/teacher/student management blocks,
  - prove cross-branch supervisor guard where fixture allows.
- No SQL/RLS changes in this checkpoint.
- No UI wiring and no parent-facing media service/upload in this checkpoint.
- No notification/email behavior.
- Service checkpoint doc:
  - `docs/parent-facing-announcements-service-smoke-checkpoint.md`
- CHECK investigation result:
  - direct insert diagnostics now confirm current create-path blocker is RLS insert denial (`42501`) on `parent_announcements`,
  - service create payload matches draft expectations (`status='draft'`, creator self-id, valid parent announcement type),
  - fixture discovery now resolves branch/class/student IDs via env override + deterministic fake fallback where possible,
  - unrelated parent negative check remains auth-fixture dependent when unrelated fake credentials are unavailable.
- Insert RLS patch draft now added:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
  - manual/dev-first only; no auto-apply.

## 1) Current state

- Staff-facing `Announcements` internal module exists and is a strong internal prototype.
- Parent-facing announcements/events planning doc already exists (`docs/parent-facing-announcements-events-plan.md`).
- Parent-facing announcements/events are not implemented yet.
- Parent-facing media is not enabled (`parent_facing_media` remains reserved/disabled).
- Notification/email automation is not implemented.

## 2) Product goal

Parent-facing announcements/events should provide a parent-safe official channel for notices, events, activities, and reminders:

- placed near `ParentView` / Memories communication context,
- reduced dependence on WhatsApp broadcast chains,
- improved trust/transparency through clear official posts,
- strict protection against internal staff content leakage.

## 3) Data model options

### A. Extend existing `announcements` with `audience_type='parent_facing'`

Pros:

- fastest reuse path.

Risks:

- existing internal model already carries request/task semantics (`requires_response`, `requires_upload`, `done/undone`, completion tracking),
- internal attachment model currently includes staff-only roles and notes,
- mixed internal + parent predicates increase RLS policy complexity and regression risk,
- accidental leakage risk is higher if any policy edge is missed.

### B. Separate `parent_announcements` table family

Pros:

- strongest privacy boundary,
- cleaner RLS reasoning and easier audits,
- avoids cross-coupling with internal request/task workflows.

Risks:

- additional schema/service work.

### C. Hybrid: separate parent-facing table now, optional shared design later

Pros:

- keeps strongest boundary now,
- allows later abstraction reuse once behavior is proven safe.

Risks:

- requires future consolidation planning if unification is ever desired.

### D. Reuse Company News and extend parent targets

Pros:

- reuse existing Company News draft/publish flow shape.

Risks:

- Company News is explicitly internal-staff oriented today,
- extending it to parent audience blurs internal-vs-parent release boundary,
- higher chance of internal culture/ops content crossing into parent channel.

### Recommendation

Recommend **Option B** now (with C-style flexibility later): introduce a **separate parent-facing data model** first.  
This is the safest path for privacy and RLS correctness given current internal announcement statuses, internal attachments, and operational workflow fields.

## 4) Recommended core parent-facing tables

Recommended separate model:

- `parent_announcements`
- `parent_announcement_targets`
- `parent_announcement_read_receipts` (or `parent_announcement_statuses` if richer state is needed)
- `parent_announcement_media`

Optional later:

- `parent_announcement_templates`

## 5) `parent_announcements` fields

Planned fields:

- `id`
- `title`
- `subtitle`
- `body`
- `announcement_type` / `event_type`
- `branch_id`
- `class_id` (nullable)
- `status` (`draft` / `published` / `archived`)
- `publish_at` / `published_at`
- `event_start_at` / `event_end_at` (nullable)
- `location` (nullable)
- `created_by_profile_id`
- `updated_by_profile_id`
- `created_at` / `updated_at`

Notes:

- Keep parent-facing lifecycle simple in MVP.
- Do not include internal request/task fields (`requires_response`, `requires_upload`, done/undone workflow) in parent model.

## 6) Targeting model

Targeting plan:

- branch-wide parent audience,
- class-scoped parent audience,
- selected students / linked guardians,
- programme/cohort targeting later.

Non-leakage constraints:

- no unrelated family visibility,
- no cross-branch leakage,
- no fallback to broad targets when specific target resolution fails.

## 7) Parent visibility / RLS

RLS direction by role:

- **HQ**: global create/publish/archive management for parent-facing posts.
- **Supervisor**: own-branch create/publish/archive only when explicitly allowed.
- **Teacher**: blocked from create/publish in MVP (future reconsideration possible).
- **Parent**: read-only access to published parent-facing rows scoped to linked child/branch/class target resolution.

Must-hold boundaries:

- parent cannot read any `internal_staff` announcement content,
- parent cannot read `announcement_attachments` internal rows,
- parent can read parent-facing media only when parent-facing post is published and media is released,
- frontend remains anon client + JWT (no service role in frontend).

## 8) Media/storage model

Planning recommendation:

- private bucket dedicated to parent-facing media (example: `parent-announcements-media`),
- signed URLs only,
- no public URLs by default,
- no reuse of internal `announcements-attachments` bucket or rows,
- `parent_announcement_media` metadata table with explicit release boundary,
- enforce image/file type + size limits,
- never expose staff-only fields such as `staff_note`.

## 9) Staff/HQ creation governance

Creation governance plan:

- HQ can create/publish parent-facing posts,
- supervisor own-branch create/publish if approved by product policy,
- teacher blocked initially,
- template-assisted parent-friendly copy,
- preview before publish,
- edit/archive governance in later phase,
- audit timestamps + actor IDs on create/update/publish/archive.

## 10) ParentView UI implications (future)

Future UI direction only:

- add `Announcements & Events` section near Memories in `ParentView`,
- latest/featured card,
- list + detail view,
- event date/time/location fields,
- optional media thumbnails,
- mobile-first card layout,
- no staff controls exposed in parent view.

## 11) Notification/email boundary

This review adds no auto-email behavior.

Future optional direction:

- publish email notification,
- event reminder email,
- separate notification service with template safety, rate limits, and audit trail.

Boundary reminder:

- attendance arrival email remains a separate attendance module track.

## 12) RLS risks and safeguards

Key risks:

- cross-family leakage,
- internal content leakage into parent surface,
- confusion between internal attachments and parent media,
- branch/class target misconfiguration,
- stale event visibility,
- weak parent-facing copy quality,
- service-role misuse in frontend,
- signed URL leakage risk.

Safeguards:

- separate parent-facing tables and media bucket,
- policy-first review gate before UI/service rollout,
- explicit publish/release lifecycle controls,
- strict linked-child + branch/class eligibility checks,
- short-lived signed URLs only,
- audit logging for create/edit/publish/archive actions.

## 13) Testing plan (future smoke)

Future validation cases:

- HQ create + publish parent-facing announcement,
- supervisor own-branch create + publish when allowed,
- parent linked to targeted class/branch can read published post,
- unrelated parent is blocked,
- parent cannot read internal staff announcements,
- parent cannot read internal attachments,
- parent media signed URL access is scope-limited,
- parent/student/staff role boundary checks,
- no notification/email side effects in base rollout.

## 14) Recommended next milestone

Options:

- A. Parent-facing announcements service + smoke test
- B. ParentView UI shell with demo parity
- C. Parent-facing media service + smoke test
- D. Notification/email planning
- E. Reports/PDF/AI OCR plan

Recommendation: **A first**.

Why:

- SQL/RLS foundation is now manually applied in DEV,
- service smoke should prove create/read/visibility boundaries before any parent-facing UI rollout,
- media service should follow once core visibility boundaries are proven,
- notification/email behavior should remain later until service-level safety is stable.

## 15) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add parent-facing announcements SQL RLS review

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Draft parent-facing announcements SQL/RLS foundation only.

Hard constraints:
- SQL/RLS draft + docs only for this milestone.
- Do not change app UI.
- Do not change runtime logic.
- Do not add UI/services for parent-facing announcements/events yet.
- Do not apply SQL automatically.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole or demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat.
- Keep parent_facing_media release-gated; do not enable by default.

Please draft:
1) `parent_announcements` foundation SQL.
2) `parent_announcement_targets` SQL.
3) `parent_announcement_read_receipts` (or statuses) SQL.
4) `parent_announcement_media` SQL + private bucket policy draft.
5) RLS policies for HQ/supervisor/teacher/parent scopes with strict linked-child checks.
6) Companion checkpoint documentation.

Validation efficiency rule:
Docs/review only unless runtime files change.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

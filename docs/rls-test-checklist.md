# RLS Test Checklist

## Checkpoint update (manual visual QA — AI report hybrid source preview, 2026-05-02)

- **Human runbook (no automated RLS assert):** **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`** — staff **AI Parent Reports** at **desktop** + **~390px**; confirms hybrid preview UX and **no** SQL/env/provider leak **by inspection** before real provider smoke. **Fake/dev data only**; **no** `real_ai` / ParentView change. Complements smokes in **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** §8.

## Checkpoint update (AI parent report Source Evidence Preview hybrid UI — 2026-05-02)

- **UI (`AiParentReports.jsx`):** **demo** → **`mode: 'fake'`**; **authenticated staff** → **`mode: 'hybrid'`** (JWT-scoped reads via existing service — **no** DDL). **Generate Mock Draft** aligned with same bundle path; missing evidence **informational** only. **No** ParentView change; **no** `real_ai`. **Canonical reference:** **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** (shorter index: **`docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`**).
- Smokes: **`source-aggregation`**, **`rls-source-aggregation`**, **`mock-draft`**, **`ai-parent-reports`** — results recorded **§8** in final hybrid UI doc (**`d235344`**). **Docs-only** edits do not require re-running unless **`src/`** changes.

## Checkpoint update (fake AI parent report source aggregation smoke — 2026-05-02)

- Smoke: **`npm run test:supabase:ai-parent-report:source-aggregation`** — in-process **fake** data path; **no** SQL/RLS DDL; **no** `real_ai` unlock; **no** parent access change.
- Service: `src/services/aiParentReportSourceAggregationService.js`. Docs: **`docs/ai-parent-report-source-aggregation-service-smoke-checkpoint.md`**, pass seal **`docs/ai-parent-report-source-aggregation-service-pass-checkpoint.md`**.
- **UI:** **`docs/ai-parent-report-source-preview-ui-checkpoint.md`** — demo uses **fake**; auth uses **hybrid** (see hybrid checkpoint above).

## Checkpoint update (RLS AI parent report source aggregation — 2026-05-02)

- Smoke: **`npm run test:supabase:ai-parent-report:rls-source-aggregation`** — **`mode: 'rls'`** / **`hybrid`**; existing read helpers + JWT only; **no** DDL.
- Doc: **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**. Staff preview uses **hybrid** when authenticated (not **`rls`-only**).

## Checkpoint update (product direction — docs/copy only, 2026-05-02)

- **Reference:** `docs/manual-preview-product-direction-corrections.md` — **no** SQL/RLS edits; parent released-only and **`real_ai`** block unchanged.
- Optional regression awareness: staff labels now say **Parent Communication**; routes unchanged (`/parent-updates`).

## Checkpoint update (manual mobile QA — AI report + parent communication)

- QA runbook: **`docs/manual-mobile-qa-ai-report-parent-communication-checkpoint.md`** — confirms parent **released-only** display and **no** draft/metadata leak **by inspection**; complements automated smokes.

## Checkpoint update (AI parent report MVP final QA)

- Docs-only: **`docs/ai-parent-report-mvp-final-qa-checkpoint.md`** — parent released-only + **`real_ai`** blocked unchanged; no SQL/RLS edits in this milestone; smoke snapshot listed for regression awareness.

## Checkpoint update (real AI Edge HTTP skeleton — docs final)

- **`docs/real-ai-parent-report-edge-http-final-checkpoint.md`** — **no** SQL/RLS change; **`real_ai`** inserts still blocked; parent released-only posture unchanged; optional provider HTTP remains staging/key-gated.

## Checkpoint update (real AI parent report Edge HTTP)

- Server-side **real** provider path exists; **no** SQL/RLS change; **`real_ai`** inserts still blocked at **`createAiParentReportVersion`**; no auto-release. Doc: `docs/real-ai-parent-report-edge-http-checkpoint.md`.

## Checkpoint update (real AI provider tooling re-verification)

- Docs-only: **`docs/real-ai-provider-tooling-verification-checkpoint.md`** — **re-verified:** Deno + Supabase CLI on PATH (`deno check` PASS; CLI help PASS); adapter smokes PASS; no SQL/RLS change; **`real_ai`** still blocked.

## Checkpoint update (real AI provider tooling verification)

- First run only: tools absent on default PATH in automated environment — see checkpoint doc history §0.

## Checkpoint update (AI parent report Edge `_shared` adapter — fake/disabled only)

- Edge Function **`generate-ai-parent-report-draft`** uses **`supabase/functions/_shared/`** only (no repo `src/` import); behavior aligned with `src/services/aiParentReportProviderAdapter.js` for fake/disabled/real-stub.
- Smoke: `npm run test:supabase:ai-parent-report:edge-adapter` (+ existing `test:supabase:ai-parent-report:provider-adapter`).
- No SQL/RLS change; **`real_ai`** inserts still blocked at service layer; no provider keys; no external AI HTTP.
- Docs: `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`.

## Checkpoint update (AI parent report provider adapter skeleton)

- Adapter module (server-side, fake/disabled only): `src/services/aiParentReportProviderAdapter.js`.
- No change to parent visibility; no `real_ai` inserts enabled.
- Smoke: `npm run test:supabase:ai-parent-report:provider-adapter`.
- Optional integration assertion: `createAiParentReportVersion` still rejects `real_ai` before DB writes when env present.
- Checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-checkpoint.md`
- Final docs checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`
- Next focus: **Edge Function deploy/bundling check (fake only)** before real provider keys; `real_ai` unlock remains future.

## Checkpoint update (mock AI draft UI docs finalization)

- Final checkpoint reference:
  - `docs/mock-ai-parent-report-draft-ui-final-checkpoint.md`
- RLS-aligned behavior remains:
  - staff-side generation only,
  - authenticated path calls `generateMockAiParentReportDraft({ reportId, input })`,
  - demo path is local-only and does not call Supabase,
  - parent draft visibility remains blocked until explicit release.
- Security boundary remains unchanged:
  - no SQL/RLS changes in this docs checkpoint,
  - no provider keys,
  - no real provider wiring,
  - no service-role frontend usage.
- Roadmap note: provider-boundary plan and adapter skeleton exist; next safe step is **Edge deploy/bundling check (fake only)** — see `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`.

## Checkpoint update (mock AI parent report draft service path)

- New service helper:
  - `generateMockAiParentReportDraft({ reportId, input })`
  - implemented in `src/services/supabaseWriteService.js`
- RLS safety expectation:
  - helper creates draft version via existing write-service + RLS path only,
  - `generationSource='mock_ai'`,
  - `real_ai` remains blocked.
- Parent boundary expectation:
  - parent cannot read draft/mock versions before release,
  - parent released visibility remains linked-child + released current-version only.
- Focused smoke command:
  - `npm run test:supabase:ai-parent-report:mock-draft`
- Preserve non-goals:
  - no SQL/RLS changes,
  - no service-role usage,
  - no provider keys/provider wiring,
  - no auto-release,
  - no PDF/export.
- Checkpoint reference:
  - `docs/mock-ai-parent-report-draft-service-smoke-checkpoint.md`
- Final pass checkpoint reference:
  - `docs/mock-ai-parent-report-draft-service-pass-checkpoint.md`
- Next milestone recommendation:
  - **A. Real AI provider-boundary planning** while preserving draft block + explicit release boundary.
- Follow-up status:
  - staff-side `Generate Mock Draft` UI action is now wired in `AI Parent Reports`.
- UI wiring expectations under RLS boundary:
  - demo mode is local-only simulation,
  - authenticated mode uses existing helper/service + JWT + RLS only,
  - parent cannot read draft/mock versions before explicit release.
- UI checkpoint reference:
  - `docs/mock-ai-parent-report-draft-ui-checkpoint.md`

## Checkpoint update (AI parent report UI shell alignment)

- New staff UI shell route exists:
  - `/ai-parent-reports` (teacher/supervisor/HQ navigation only).
- RLS-aligned expectations for this UI shell:
  - staff report list/detail uses existing AI parent report read services,
  - lifecycle actions use existing AI parent report write services,
  - parent/student do not access this route via role navigation.
- Demo mode expectation:
  - local fake/dev rows only; no Supabase report calls in demo mode.
- Boundary confirmation:
  - no SQL/RLS policy changes in this milestone,
  - no widening of parent/student report visibility,
  - no service-role frontend usage.
- Follow-up planning target:
  - Parent-side released/current-version-only report visibility checks (no evidence-link/raw-draft exposure) before UI implementation.
- Follow-up status:
  - ParentView released-report display UI is now wired with released/current-version-only boundaries.
- Parent-facing verification emphasis for this milestone:
  - released report visibility only for linked parent,
  - no evidence-link visibility,
  - no draft/unreleased visibility,
  - no raw AI/provider metadata exposure.
- Final docs-only checkpoint reference:
  - `docs/parent-view-ai-report-display-final-checkpoint.md`
- ParentView strict non-exposure list reminder:
  - no `ai_model_label`,
  - no `generation_source`,
  - no provider/debug metadata,
  - no storage paths,
  - no PDF/export links,
  - no staff edit/release/archive controls.

## Checkpoint update (AI parent reports 030 manual DEV apply confirmed)

- Manual apply target:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- Confirmed in DEV:
  - tables exist:
    - `ai_parent_reports`
    - `ai_parent_report_versions`
    - `ai_parent_report_evidence_links`
    - `ai_parent_report_release_events`
  - RLS enabled on all four tables,
  - policies present on all four tables,
  - helper functions present:
    - `ai_parent_report_branch_id`
    - `can_manage_ai_parent_report`
    - `can_access_ai_parent_report`
    - `can_insert_ai_parent_report_row_030`
    - `can_manage_ai_parent_report_version`
    - `can_access_ai_parent_report_version`
  - FK safety present:
    - `current_version_id` FK,
    - same-report pair FK `(id, current_version_id) -> ai_parent_report_versions(report_id, id)`.
- MVP append-first confirmation:
  - `ai_parent_report_versions` and `ai_parent_report_release_events` remain insert/select policy posture,
  - no broad update/delete policy surface for these two audit/history tables.
- Boundary reminders:
  - parent read remains released-only linked-child scoped,
  - parent cannot directly read evidence links in MVP,
  - student blocked by omission/current MVP posture,
  - no provider wiring and no PDF/export in this checkpoint.

## Checkpoint update (AI parent report SQL/RLS draft added - 030)

- Draft patch reference:
  - `supabase/sql/030_ai_parent_reports_foundation.sql` (manual/dev-first, review-first only; not auto-applied)
- `030` draft scope:
  - `ai_parent_reports`
  - `ai_parent_report_versions`
  - `ai_parent_report_evidence_links`
  - `ai_parent_report_release_events`
- `030` draft role intent:
  - HQ: global manage/select
  - branch supervisor: own-branch manage/select
  - teacher: assigned/class-scoped draft/review manage
  - parent: released-only linked-child read
  - student: blocked in MVP
- Parent visibility intent in draft:
  - reports: `status = 'released'` + linked child only
  - versions: released current-version only
  - evidence links/release events: staff-only in MVP
- Security boundary intent:
  - AI drafts are staff-only
  - no auto-release
  - no provider key in frontend
  - no mock/real provider wiring in this SQL milestone
- Deferred in this phase:
  - `ai_parent_report_pdf_exports`
  - `ai_parent_report_templates`
  - report UI/service wiring and PDF/export implementation

## Checkpoint update (AI parent reports 030 reviewed before apply)

- `030` review status: pre-apply SQL/RLS/security review completed (no apply in this checkpoint).
- Fixes now present in draft:
  - same-report `current_version_id` pair FK safety,
  - stricter assigned-teacher insert validation for branch/class alignment,
  - append-first versions/release-events (no update/delete policies in MVP draft).
- RLS expectations after manual DEV apply:
  - parent can read only released + linked-child reports,
  - parent version read limited to released current version,
  - parent cannot directly read evidence links/release events in MVP,
  - teacher/supervisor scope remains constrained to class/branch rules.
- Continue fake/dev data only and manual DEV SQL editor workflow only.

## Checkpoint update (final communication-module QA consolidation)

- Final communication-module QA checkpoint now exists:
  - `docs/announcements-parent-communication-final-qa-checkpoint.md`
- Communication-module RLS/security posture to preserve:
  - internal staff announcements path and parent-facing announcements path remain separated,
  - parent-facing media remains release-gated via `released_to_parent`,
  - ParentView remains read-only + released-media-only,
  - no service-role frontend usage,
  - no notification/email/live chat side effects in current module.
- Latest validation summary references for communication module:
  - `build/lint/typecheck` PASS,
  - `test:supabase:parent-announcements` PASS,
  - `test:supabase:parent-announcements:media` PASS,
  - `test:supabase:announcements:phase1` PASS,
  - `test:supabase:company-news:create` PASS,
  - `test:supabase:company-news:popup` PASS (recorded),
  - `test:supabase:announcements:mytasks` PASS,
  - `test:supabase:announcements:attachments` PASS (recorded),
  - `test:supabase:announcements:completion` PASS/recorded with environment caveat notes where documented.
- Expected CHECK/WARNING notes remain:
  - unrelated parent credential fixture missing/invalid,
  - optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` missing,
  - npm `devdir` warning non-blocking.

## Checkpoint update (parent-facing creation UI documented)

- Parent-facing text-only creation UI checkpoint is documented at:
  - `docs/parent-facing-creation-ui-checkpoint.md`
- Documentation confirms current parent-facing create-path boundaries:
  - create/publish/archive uses existing parent-facing services,
  - branch/class targets supported in UI,
  - student target selector deferred,
  - no parent media upload/release UI in current milestone.
- Validation snapshot reference (from creation checkpoint):
  - build/lint/typecheck PASS,
  - parent-facing announcement/media smokes PASS with safe CHECK notes,
  - phase1/company-news-create/mytasks smokes PASS,
  - npm `devdir` warning non-blocking.

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

This checklist is for future Supabase role testing using fake/demo data only.

Reminder: **Frontend filtering is not security. RLS must enforce access at database level.**

---

## Parent-facing announcements SQL draft note (028)

- Draft patch reference: `supabase/sql/028_parent_announcements_foundation.sql` (manual/dev-first, review-first only).
- `028` is not auto-applied and assumes fake/dev data only.
- `028` drafts separate parent-facing entities:
  - `parent_announcements`
  - `parent_announcement_targets`
  - `parent_announcement_read_receipts`
  - `parent_announcement_media`
- `028` drafts private storage bucket and object policies:
  - `parent-announcements-media` (`public=false`)
- `028` keeps internal boundary explicit:
  - no exposure of internal `announcements` rows to parent-facing path,
  - no exposure/reuse of internal `announcement_attachments`,
  - no enabling of internal `parent_facing_media`.
- `028` role-policy intent:
  - HQ: global manage,
  - branch supervisor: own-branch manage only,
  - teacher: blocked from parent-facing management in MVP,
  - parent: published + targeted + linked-child scoped read; own read-receipt write only,
  - student: blocked in MVP.
- `028` review hardening intent (must validate after manual DEV apply):
  - branch supervisor manage is allowed only when `parent_announcements.branch_id` is in supervisor scope **and** all target rows resolve to that same branch,
  - mixed-target cross-branch announcements must not be manageable by branch supervisors.
- No parent-facing UI/services or notification/email automation are added in this checkpoint.

## Parent-facing announcements SQL manual DEV application note (028)

- Manual apply target: `supabase/sql/028_parent_announcements_foundation.sql`.
- Supabase DEV SQL Editor result: applied in DEV.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- Verification summary:
  - parent-facing tables exist: `parent_announcements`, `parent_announcement_targets`, `parent_announcement_read_receipts`, `parent_announcement_media`,
  - RLS enabled and parent-facing policies present on all four parent-facing tables,
  - helper set present including:
    - `parent_announcement_branch_id`
    - `can_manage_parent_announcement`
    - `can_access_parent_announcement`
    - `can_access_parent_announcement_media`
    - `parent_has_linked_student_in_branch_028`
    - `parent_has_linked_student_in_class_028`
    - `can_insert_parent_announcement_row_028`
    - `can_manage_parent_announcement_target_write_028`
    - `is_parent_announcement_supervisor_scope_safe_028`
  - private storage bucket `parent-announcements-media` exists with storage policies.
- Boundary checks to keep validating with fake/dev role tests:
  - HQ global manage,
  - supervisor own-branch manage only,
  - parent published linked-child scoped visibility only,
  - teacher/student blocked in MVP where intended,
  - parent read-receipt own-row write path only.

## Parent-facing announcements service + smoke note (2026-05-01)

- New service methods added:
  - read (`src/services/supabaseReadService.js`):
    - `listParentAnnouncements(...)`
    - `getParentAnnouncementDetail(...)`
  - write (`src/services/supabaseWriteService.js`):
    - `createParentAnnouncement(...)`
    - `publishParentAnnouncement(...)`
    - `archiveParentAnnouncement(...)`
    - `markParentAnnouncementRead(...)`
- New focused smoke script/command:
  - `scripts/supabase-parent-announcements-smoke-test.mjs`
  - `npm run test:supabase:parent-announcements`
- Smoke intent:
  - HQ create/publish PASS,
  - supervisor own-branch create/publish PASS (or CHECK when fixture-constrained),
  - supervisor mixed-target cross-branch write blocked when testable,
  - parent linked published visibility and own read-receipt write path,
  - unrelated parent blocked/empty (fixture dependent),
  - parent create/manage blocked,
  - teacher create/manage blocked,
  - student blocked/empty.
- Explicit non-goals preserved in this service checkpoint:
  - no ParentView UI wiring,
  - no parent-facing media upload/service path,
  - no SQL/RLS changes,
  - no notifications/emails.
- CHECK investigation update:
  - smoke now logs non-secret actor/fixture context and direct insert diagnostics,
  - current HQ/supervisor create CHECKs show `42501` insert RLS denial on `parent_announcements`,
  - unrelated parent CHECK remains auth-fixture credential dependent.
- Follow-up draft patch note:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql` is prepared for manual DEV review,
  - draft keeps teacher/parent/student create blocked and preserves supervisor mixed-target safety hardening from `028`.

## Announcements completion overview read-service checkpoint note (2026-05-01)

- Full checkpoint (implementation summary, read behavior, metrics, per-person fields, semantics, smoke, tests, boundaries, future, recommended next milestone, copy-paste UI prompt):
  - `docs/announcements-completion-overview-read-service-checkpoint.md`
- Doc-only validation for checkpoint alignment: `git diff --name-only` only (no build/lint/smoke unless runtime files change).

- `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted })` is now added in `src/services/supabaseReadService.js`.
- Derived manager overview uses only existing RLS-governed internal staff data:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
  - `announcement_attachments`
- No SQL/RLS changes were made for this checkpoint.
- Completion-overview UI checkpoint is now documented at:
  - `docs/announcements-completion-overview-ui-checkpoint.md`
- No notification/email side effects were added.
- Smoke script now exists:
  - `scripts/supabase-announcements-completion-overview-smoke-test.mjs`
  - `npm run test:supabase:announcements:completion`
- Expected smoke behavior:
  - HQ can load manager completion overview and observe read/reply/upload/done evidence counts,
  - branch supervisor can load own-branch overview,
  - teacher/parent/student manager-overview paths are blocked-or-empty,
  - cleanup uses fake/dev fixture rows only.
- Latest UI milestone environment note:
  - build/lint/typecheck PASS,
  - announcement smoke scripts completed with DNS `ENOTFOUND` CHECK skips in this environment,
  - rerun smoke scripts when Supabase DNS/network is stable.

## Announcements attachments PASS checkpoint note (2026-05-01)

- `025` (`supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`) is manually applied in Supabase dev.
- `npm run test:supabase:announcements:attachments` now passes internal attachment upload/list/signed URL paths for HQ/supervisor/teacher-response scope.
- CHECK context/predicate/raw-insert lines in smoke output are diagnostic evidence only (not failing skips) and confirm actor context/predicate behavior.
- `npm run test:supabase:announcements:phase1` remains PASS; only optional cross-branch negative fixture CHECK may appear when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing.
- No unsafe internal attachment access observed; parent/student remain blocked-or-empty on internal attachment list/read.

## Announcements MyTasks read-service checkpoint note (2026-05-01)

- `listMyAnnouncementTasks({ includeDone, statusFilter })` is now added in `src/services/supabaseReadService.js`.
- Derived read scope uses only existing RLS-governed internal staff data:
  - `announcements`
  - `announcement_statuses` (self row for actor state)
  - `announcement_replies`
  - `announcement_attachments`
- No SQL/RLS changes were made for this checkpoint.
- No MyTasks UI wiring in this checkpoint.
- No notification/email automation in this checkpoint.
- Smoke script now exists:
  - `scripts/supabase-announcements-mytasks-smoke-test.mjs`
  - `npm run test:supabase:announcements:mytasks`
- Expected smoke behavior:
  - teacher sees targeted derived tasks for published internal staff requests,
  - responseProvided transitions after teacher reply,
  - uploadProvided transition is checked using tiny fake `response_upload`,
  - parent/student internal task visibility is blocked-or-empty.
- Latest command checkpoint:
  - `npm run build` PASS
  - `npm run lint` PASS
  - `npm run typecheck` PASS
  - `npm run test:supabase:announcements:mytasks` PASS
  - `npm run test:supabase:announcements:phase1` PASS (optional CHECK for missing `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`)
  - `npm run test:supabase:announcements:attachments` PASS (expected diagnostic CHECK lines)
  - npm warning about unknown env config `devdir` is non-blocking in this context.

## Company News popup status SQL draft note (2026-05-01)

- Draft patch reference: `supabase/sql/026_company_news_popup_status_foundation.sql` (manual/dev-first review-only).
- `026` is not auto-applied and assumes fake/dev data only.
- `026` adds additive per-user popup status columns on `announcement_statuses`:
  - `popup_seen_at`
  - `popup_dismissed_at`
  - `popup_last_shown_at`
- `026` adds popup status indexes:
  - `announcement_statuses_popup_seen_at_idx`
  - `announcement_statuses_popup_dismissed_at_idx`
  - `announcement_statuses_popup_last_shown_at_idx`
  - `announcement_statuses_profile_popup_idx`
- `026` pre-apply review hardening adds popup self-update guard:
  - function: `guard_announcement_statuses_popup_self_update_026()`
  - trigger: `trg_guard_announcement_statuses_popup_self_update_026`
  - expected behavior: popup_* fields can only be updated when `auth.uid() = announcement_statuses.profile_id`.
- `026` does not modify or weaken existing `announcement_statuses` RLS policies.
- `026` does not open parent/student access and does not widen cross-branch access.
- Existing `read_at`, `last_seen_at`, and `done_status` behavior remains unchanged.
- Runtime popup service/UI behavior remains future; notifications/emails remain future.
- Parent-facing announcements/events remain future and `parent_facing_media` remains out of scope.

## Company News popup status SQL manual DEV apply note (2026-05-01)

- Manual apply target: `supabase/sql/026_company_news_popup_status_foundation.sql`.
- Supabase DEV SQL Editor result: **Success. No rows returned.**
- Verified columns on `public.announcement_statuses`:
  - `popup_seen_at timestamptz null`
  - `popup_dismissed_at timestamptz null`
  - `popup_last_shown_at timestamptz null`
- Verified indexes:
  - `announcement_statuses_popup_seen_at_idx`
  - `announcement_statuses_popup_dismissed_at_idx`
  - `announcement_statuses_popup_last_shown_at_idx`
  - `announcement_statuses_profile_popup_idx`
- Verified trigger/function:
  - trigger `trg_guard_announcement_statuses_popup_self_update_026`
  - function `guard_announcement_statuses_popup_self_update_026`
  - intent: popup_* fields are self-row update only; block cross-user popup dismissal writes.
- Verified policy posture:
  - `announcement_statuses` policy shape remains unchanged at 4 policies (`select/insert/update/delete` from `020`),
  - no parent/student access opening,
  - no cross-branch widening,
  - no RLS weakening.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.

## Company News popup service + smoke note (2026-05-01)

- New service methods:
  - `listEligibleCompanyNewsPopups({ limit })`
  - `markCompanyNewsPopupSeen({ announcementId })`
  - `dismissCompanyNewsPopup({ announcementId })`
- New smoke script and command:
  - `scripts/supabase-company-news-popup-smoke-test.mjs`
  - `npm run test:supabase:company-news:popup`
- Expected smoke behavior:
  - teacher can read eligible internal `company_news` popup row(s),
  - teacher seen/dismiss popup status writes succeed on own row,
  - dismissed item is excluded from eligible popup list,
  - request/reminder rows are excluded from company-news popup list,
  - parent/student popup reads are blocked-or-empty,
  - manager cross-user popup field write is blocked by popup self-update guard.
- Current checkpoint notes:
  - direct HQ `company_news` create remains CHECK-blocked by current request-first create-path policy shape (expected),
  - fixture conversion path still validates popup service behavior safely without SQL/RLS changes.
- Additional observed notes:
  - phase1 optional cross-branch negative fixture remains CHECK when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing,
  - npm warning about unknown env config `devdir` is non-blocking.
- Boundaries unchanged:
  - no runtime app-shell popup UI,
  - no SQL/RLS changes,
  - no notification/email automation,
  - no parent-facing announcements/events,
  - `parent_facing_media` remains out of scope.

## Company News create-path SQL draft note (027)

- Draft patch reference: `supabase/sql/027_company_news_create_foundation.sql` (manual/dev-first, review-first only).
- `027` is not auto-applied and assumes fake/dev data only.
- `027` policy strategy:
  - replaces insert helper usage for `announcements_insert_020` with `can_insert_announcement_row_027(...)`,
  - preserves existing request insert branch from `022` unchanged,
  - adds HQ-only `company_news` draft insert branch for `internal_staff`.
- `027` create allowance requires:
  - `created_by_profile_id = auth.uid()`,
  - `announcement_type = 'company_news'`,
  - `audience_type = 'internal_staff'`,
  - `status = 'draft'`,
  - `requires_response = false`,
  - `requires_upload = false`.
- `027` still blocks:
  - branch supervisor `company_news` create (MVP),
  - teacher create,
  - parent create,
  - student create,
  - parent-facing insert scope expansion.
- `027` does not modify select/update/delete policies in this draft.
- Manual next step after review:
  - apply `027` in Supabase DEV SQL editor,
  - rerun focused Company News create/publish smoke checks with fake/dev fixtures.

## Company News create-path SQL manual DEV apply note (027)

- Manual apply target: `supabase/sql/027_company_news_create_foundation.sql`.
- Supabase DEV SQL Editor result: **Success. No rows returned.**
- Verified policy/helper posture:
  - `announcements_insert_020` now calls `can_insert_announcement_row_027(...)`,
  - `can_insert_announcement_row_027(...)` exists,
  - insert gating changed only; no select/update/delete policy widening in this patch.
- Verified behavior via smoke outputs:
  - HQ direct `company_news` create PASS,
  - teacher popup eligibility/seen/dismiss/suppression PASS,
  - parent/student popup read blocked-or-empty PASS,
  - cross-user popup dismiss blocked PASS,
  - popup write path preserves `read_at` / `done_status`.
- Request-regression validation remains PASS:
  - HQ/supervisor request create path PASS,
  - supervisor publish PASS,
  - teacher create blocked PASS,
  - parent/student internal read blocked-or-empty PASS.
- Optional CHECK still expected when env is missing:
  - `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` for cross-branch negative fixture.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.

## Company News create service + smoke note (2026-05-01)

- Service wrappers now added in `src/services/supabaseWriteService.js`:
  - `createCompanyNews(...)`
  - `publishCompanyNews(...)`
- New smoke script/command:
  - `scripts/supabase-company-news-create-smoke-test.mjs`
  - `npm run test:supabase:company-news:create`
- Expected smoke assertions:
  - HQ create/publish company_news PASS,
  - supervisor/teacher create blocked,
  - parent/student internal staff read blocked-or-empty,
  - fake/dev cleanup PASS.
- Service-level target safety in this milestone:
  - create supports target types `branch|role|profile`,
  - publish requires at least one target row before status transition.
- Boundaries unchanged:
  - no SQL/RLS changes,
  - no parent-facing announcements/events,
  - no notification/email behavior.

## Company News MyTasks exclusion note (2026-05-01)

- `listMyAnnouncementTasks(...)` now excludes `company_news` by default.
- Validation expectation is now strict:
  - Company News should not appear in MyTasks unless a future explicit opt-in mode is introduced.
- Request/reminder MyTasks behavior remains unchanged.
- No SQL/RLS changes were required for this behavior fix.

## HQ Company News create UI checkpoint note (2026-05-01)

- Authenticated HQ/admin Company News create UI is now wired in `src/pages/Announcements.jsx`.
- UI uses existing services:
  - `createCompanyNews(...)` (Save Draft)
  - `publishCompanyNews(...)` (Create & Publish via create->publish)
- Publish path requires at least one target and validates before publish.
- Supported target types remain `branch|role|profile`.
- Branch supervisor/teacher remain view-only for create.
- Parent/student remain blocked from staff Announcements route.
- Demo mode remains local-only for HQ create and does not call Supabase create services.
- Company News remains excluded from MyTasks by default.
- No SQL/RLS changes were made in this UI checkpoint.
- No notifications/emails/live chat/parent-facing announcements were added.
- Validation snapshot for this milestone:
  - `npm run build` PASS
  - `npm run lint` PASS
  - `npm run typecheck` PASS
  - `npm run test:supabase:company-news:create` PASS
  - `npm run test:supabase:company-news:popup` PASS
    - first popup smoke had transient auth-session CHECK/FAIL; immediate rerun passed fully
  - `npm run test:supabase:announcements:mytasks` PASS
  - `npm run test:supabase:announcements:phase1` PASS

### Announcements attachments role checks (current proven state)

- HQ can upload/list/open signed URL for internal attachments.
- Branch supervisor can upload/open signed URL for own-branch internal attachments.
- Teacher can upload/list `response_upload` for targeted announcement.
- Teacher cannot upload `hq_attachment`.
- Parent/student cannot read internal attachment metadata or objects.
- No public URL access pattern is allowed; signed URLs only from private bucket.

---

## HQ Admin

- Dashboard access works.
- Direct restricted URL checks still allow HQ-only routes.
- Can view all branches.
- Can view all students.
- Attendance visibility is global; edit rights match policy.
- Homework visibility is global; edit rights match policy.
- Parent comments visibility includes all statuses by policy.
- Weekly report visibility includes all statuses by policy.
- Fee records visibility is global.
- Payment receipt screenshot metadata and files are visible for all branches under admin scope.
- Can verify receipts across all branches.
- Teacher tasks visibility is global.
- Sales Kit resources can be created/updated/approved/archived by HQ only.
- Storage access is restricted to allowed admin scope.
- Negative test: HQ token should still fail for deleted/disabled account state.

## Branch Supervisor

- Dashboard access works.
- Direct restricted URL checks pass only for allowed branch-supervisor routes.
- Branch visibility limited to own branch.
- Student visibility limited to own branch students.
- Attendance visibility/edit limited to own branch.
- Homework visibility/edit limited to own branch.
- Parent comments visibility/release rights match branch scope policy.
- Weekly report visibility/release rights match branch scope policy.
- Fee records visibility limited to own branch.
- Payment receipt screenshot metadata and files limited to own branch.
- Can verify receipts for own branch only.
- Teacher tasks visibility limited to own branch tasks.
- Sales Kit resources visibility limited to approved items by policy.
- Storage access limited to own branch files/prefixes.
- Negative test: branch supervisor must not read another branch data by direct SQL/API call.

## Teacher

- Dashboard access works.
- Direct restricted URL checks block admin/supervisor-only routes.
- Branch visibility limited to assigned branch context only.
- Student visibility limited to assigned class students.
- Attendance visibility/edit limited to assigned classes.
- Homework visibility/edit limited to assigned classes.
- Parent comments visibility for assigned students; release rights by policy only.
- Weekly report visibility for assigned students; release rights by policy only.
- Fee records visibility should be blocked unless explicitly allowed.
- Payment receipt metadata/file access must be blocked.
- Teacher tasks visibility limited to own assignments.
- Sales Kit visibility must be blocked.
- Storage access limited to assigned class/student files by policy.
- Negative test: teacher cannot query records for unassigned class/student.

## Parent

- Parent dashboard access works.
- Direct restricted URL checks block internal management pages.
- Branch visibility only through linked child context.
- Student visibility only linked child.
- Attendance visibility linked child only; no edit rights.
- Homework visibility linked child only; no edit rights.
- Parent comments visibility only approved/released linked-child items.
- Weekly report visibility only approved/released linked-child items.
- Fee records visibility limited to linked child records where policy allows.
- Payment receipt status visibility limited to linked child records where policy allows.
- Teacher tasks visibility blocked.
- Sales Kit visibility blocked.
- Storage access limited to linked child files where policy allows.
- Negative test: parent cannot query another child via modified URL/ID.

## Student

- Student portal access works.
- Direct restricted URL checks block internal management pages.
- Branch visibility only self context.
- Student visibility self only.
- Attendance visibility self only; no edit rights.
- Homework visibility self only; no edit rights.
- Parent comments visibility approved/released self-only items if policy allows.
- Weekly report visibility approved/released self-only items if policy allows.
- Fee records visibility blocked unless product explicitly allows.
- Payment receipt metadata/file access blocked.
- Teacher tasks visibility blocked.
- Sales Kit visibility blocked.
- Storage access limited to self files where policy allows.
- Negative test: student cannot read sibling/peer data by changing IDs in requests.

---

## Cross-role Blocking Tests

- Teacher must not read branch-supervisor-only sales/lead/fee admin datasets.
- Teacher must not access fee receipt uploads or receipt verification fields.
- Parent must not read teacher draft comments or unapproved weekly reports.
- Student must not read parent-only contact details.
- Branch supervisor must not read HQ-global rows outside own branch.
- Branch supervisor must not access unapproved Sales Kit resources.
- Branch supervisor must not access archived Sales Kit resources.
- Any role must fail reads/writes when JWT role is mismatched to row scope.

## Storage Policy Checks

- Test upload: allowed role + allowed path succeeds.
- Test upload: allowed role + disallowed path fails.
- Test read: linked/assigned file succeeds.
- Test read: unlinked/unassigned file fails.
- Test delete/update metadata: only authorized roles succeed.
- Test `fee-receipts` bucket: parent upload own linked-child receipt succeeds; teacher upload/read fails.
- Test `sales-kit-resources` bucket: HQ upload/manage/archive succeeds; branch supervisor read approved succeeds; draft/archived read fails.

### Fee receipt draft patch note

- Draft patch reference: `supabase/sql/009_fee_receipt_upload_policies.sql` (manual review/apply only).
- Parent receipt upload path is being prepared via policy draft.
- Parent safe-field update guard is enforced in draft via DB trigger for `fee_records`.
- Service method and UI upload flow are still not implemented.
- Continue using fake test files/data only during policy validation.

### Staff Time Clock draft patch note

- Draft patch reference: `supabase/sql/010_staff_time_clock_foundation.sql` (manual review/apply only).
- Draft includes branch geofence columns, `staff_time_entries`, optional adjustment requests, and private `staff-clock-selfies` policy draft.
- Manual dev-project application checkpoint recorded at `docs/staff-time-clock-sql-application-checkpoint.md`.
- Service + smoke references:
  - `src/services/staffTimeClockService.js`
  - `scripts/supabase-staff-time-clock-smoke-test.mjs`
  - `npm run test:supabase:staff-time-clock`
- Review-read service + smoke references:
  - `listStaffTimeEntries(...)`
  - `getStaffTimeEntryById(...)`
  - `getStaffTimeSummary(...)`
  - `scripts/supabase-staff-time-clock-review-smoke-test.mjs`
  - `npm run test:supabase:staff-time-clock:review`
- Dashboard UI and review action writes are still not implemented.
- Continue using fake users and fake selfie blobs only for future validation.

#### Staff Time Clock role checks (after manual apply in dev only)

- HQ can read/review all staff time entries and related selfie objects.
- Branch supervisor can read/review own-branch entries and selfies only.
- Staff can insert/select own entries only.
- Staff can close own open entry (clock-out update path) but cannot rewrite clock-in evidence.
- Staff can submit own adjustment request only for own entry.
- Parent/student must have zero access to staff time entries and staff-clock-selfies.

### Class Memories draft patch note

- Draft patch reference: `supabase/sql/011_class_memories_foundation.sql` (manual review/apply only).
- Adds draft `class_memories` table + private `class-memories` bucket policy set.
- Manual dev-project application checkpoint recorded at `docs/class-memories-sql-application-checkpoint.md`.
- Intended lifecycle in draft: `draft -> submitted -> approved + visible_to_parents=true`; plus `rejected` and `hidden`.
- Upload order in draft is metadata-first:
  1. create `class_memories` draft row with intended `storage_path`
  2. upload object to private bucket
  3. update submit/review status
- Service + smoke references:
  - `src/services/supabaseUploadService.js` (`uploadClassMemory`, `getClassMemorySignedUrl`, `listClassMemories`, `getClassMemoryById`)
  - `scripts/supabase-class-memories-upload-smoke-test.mjs`
  - `npm run test:supabase:class-memories:upload`
- Approval write + smoke references:
  - `src/services/supabaseWriteService.js` (`approveClassMemory`, `rejectClassMemory`, `hideClassMemory`)
  - `scripts/supabase-class-memories-approval-smoke-test.mjs`
  - `npm run test:supabase:class-memories:approval`
- Teacher/parent Memories UI surfaces are still not wired.
- Continue using fake users and fake media blobs only (no real photos/videos).

#### Class Memories role checks (after manual apply in dev only)

- HQ can read/manage all class memories and storage objects.
- Branch supervisor can read/manage own-branch memories and objects only.
- Teacher can create/read/update own assigned-class memories in allowed draft states only.
- Teacher cannot access unrelated branch/class memory rows.
- Parent can read approved + visible memories only for linked child/class scope.
- Student (optional) can read approved + visible own-linked scope only.
- Parent/student cannot insert/update/delete memory rows.
- Parent/student cannot upload/update/delete storage objects in `class-memories`.
- No public object access is allowed for `class-memories`.

### School/Curriculum onboarding draft patch note

- Draft patch reference: `supabase/sql/012_school_curriculum_foundation.sql` (manual review/apply only).
- Fake seed reference: `supabase/sql/013_school_curriculum_fake_seed_data.sql` (manual/dev-only; fake data only).
- Draft scope (lean MVP):
  - normalizes/extends `schools`
  - normalizes/extends `student_school_profiles`
  - adds `curriculum_profiles`
  - adds `class_curriculum_assignments`
  - adds `learning_goals`
- Draft enables RLS on onboarding tables with role intent:
  - HQ full read/manage
  - branch supervisor own-branch manage (with student/class branch inference where needed)
  - teacher read-only class/student scoped curriculum context
  - parent/student read-only linked child/self context
  - parent/student no template/manage writes
- Draft status:
  - manually applied in dev
  - read service + read smoke test now added
  - fake seed `013` is manually applied in dev (Success / No rows returned)
  - no UI wiring yet
  - no AI integration yet
  - continue fake-data-only role checks before any UI/runtime wiring
- Manual application checkpoint:
  - `docs/school-curriculum-sql-application-checkpoint.md`
- Fake seed application checkpoint:
  - `docs/school-curriculum-fake-seed-application-checkpoint.md`
- Read smoke references:
  - `src/services/supabaseReadService.js`
  - `scripts/supabase-school-curriculum-read-smoke-test.mjs`
  - `npm run test:supabase:school-curriculum:read`
- Write smoke references (class assignment only, no UI wiring):
  - `src/services/supabaseWriteService.js`
  - `scripts/supabase-school-curriculum-write-smoke-test.mjs`
  - `npm run test:supabase:school-curriculum:write`
- Write smoke references (student school profile service only, no UI wiring):
  - `src/services/supabaseWriteService.js`
  - `scripts/supabase-school-profile-write-smoke-test.mjs`
  - `npm run test:supabase:school-profile:write`
- Current write scope:
  - class curriculum assignment write service is implemented
  - student school profile write service is implemented
  - `Classes` assignment/edit UI is implemented
  - `Students` school profile edit UI remains future
  - AI context integration remains future
- Continue fake/dev-only role checks and fake data only.

#### School/Curriculum role checks (after manual apply in dev only)

- HQ can read/manage all onboarding tables across branches.
- Branch supervisor can read/manage own-branch school/curriculum rows and inferred own-branch student/class rows.
- Teacher can read assigned class/student curriculum context only.
- Parent can read linked-child school profile/goal context only.
- Student can read own linked profile/goal context only (if product surfaces it).
- Parent/student cannot insert/update/delete schools or curriculum template rows.
- Teacher cannot modify school/curriculum template rows in this MVP draft.
- Parent/student cannot write class curriculum assignments.
- Teacher class curriculum assignment writes are blocked in MVP policy shape.
- Branch supervisor class curriculum assignment write should succeed in own-branch scope.
- Parent/student cannot write student school profiles.
- Teacher student school profile writes are blocked in MVP policy shape.
- Branch supervisor student school profile write should succeed in own-branch scope.

### Homework upload/review foundation draft patch note

- Draft patch reference: `supabase/sql/014_homework_upload_review_foundation.sql` (manual review/apply only).
- Draft adds lean MVP tables:
  - `homework_tasks`
  - `homework_submissions`
  - `homework_files`
  - `homework_feedback`
- Draft adds private storage bucket and object policies for `homework-submissions`.
- Draft status:
  - manual/dev-first SQL draft prepared
  - manually applied in dev
  - runtime service + upload helpers now started in `src/services/supabaseUploadService.js`
  - fake upload smoke script now added: `scripts/supabase-homework-upload-smoke-test.mjs`
  - package command: `npm run test:supabase:homework:upload`
  - feedback write service methods now added in `src/services/supabaseWriteService.js`
  - feedback smoke script now added: `scripts/supabase-homework-feedback-smoke-test.mjs`
  - package command: `npm run test:supabase:homework:feedback`
  - smoke found `homework_files` insert RLS blocker in dev and `015` helper patch has been manually applied
  - parent direct submission insert recursion fix `016` has now been manually applied in dev
  - smoke auth/session order issue was fixed in script so parent upload runs with active parent JWT session
  - feedback smoke validates parent draft-hidden and released-visible behavior
  - parent-visible feedback response omits `internal_note` in service layer read path
  - no homework upload/review UI wiring yet
  - AI homework feedback remains future
- Parent/student feedback visibility rule in draft:
  - only `released_to_parent` feedback is readable to parent/student
  - draft/internal feedback must stay staff-only
- Submission update rule in draft:
  - parent/student can insert own/linked submissions in scope
  - submission updates are staff-only (prevents parent/student edits to review fields)
- Path convention rule in draft:
  - helper validation enforces `{branch_id}/{class_id}/{student_id}/{homework_task_id}/{submission_id}-{safe_filename}`
  - storage/object access requires metadata + path match
- Continue fake/dev-only role checks and fake file blobs only.

#### Homework upload/review role checks (after manual apply in dev only)

- HQ can read/manage all homework tasks, submissions, files, and feedback.
- Branch supervisor can read/manage own-branch homework records and objects only.
- Teacher can read assigned-class homework records only; no out-of-class visibility.
- Teacher feedback is draft-first and release-gated by status.
- Parent can read linked-child homework tasks/submissions/files only.
- Parent can create linked-child submissions/files only for assigned/open tasks.
- Parent cannot read draft/internal feedback; only released feedback.
- Student (if enabled) can read/create own submissions/files only; no peer visibility.
- No cross-family visibility and no cross-student visibility are allowed.

### Homework flexible assignment draft patch note

- Draft patch reference: `supabase/sql/017_homework_task_assignees_foundation.sql` (manual review/apply only).
- Draft status:
  - manually applied in Supabase dev (SQL Editor success)
  - application checkpoint: `docs/homework-task-assignees-sql-application-checkpoint.md`
  - fake/dev data validation only
  - write-service MVP now added in `src/services/supabaseWriteService.js`:
    - `createHomeworkTaskWithAssignees(...)`
    - `assignHomeworkTaskToStudents(...)`
  - write smoke test:
    - `scripts/supabase-homework-assignment-write-smoke-test.mjs`
    - `npm run test:supabase:homework:assignment:write`
  - runtime assignment-creation UI remains future
- Draft scope:
  - additive `homework_tasks.assignment_scope`
  - new `homework_task_assignees` with unique (`homework_task_id`, `student_id`)
  - helper functions for assignee/task-assignment access checks
  - assignee-aware read service methods:
    - `listHomeworkTaskAssignees(...)`
    - `listAssignedHomeworkForStudent(...)`
  - tracker read service methods:
    - `listHomeworkTrackerByClass(...)`
    - `listHomeworkTrackerByStudent(...)`
  - RLS for assignee rows: HQ full, branch supervisor own branch, teacher assigned class, parent linked child read-only, student self read-only
  - narrow `homework_submissions` insert gate patch to require assignment validity
  - smoke test:
    - `scripts/supabase-homework-assignees-read-smoke-test.mjs`
    - `npm run test:supabase:homework:assignees:read`
    - `scripts/supabase-homework-tracker-read-smoke-test.mjs`
    - `npm run test:supabase:homework:tracker:read`
- Manual review focus:
  - teacher manage policy conservatism for assignment creation/updates
  - parent/student cannot manage assignee rows
  - no cross-family assignee visibility
  - assignment-aware submission insert should not regress class-scope uploads
  - assignee row alignment guard should reject task/class/branch/student mismatch writes

### AI homework deployed regression fixture draft note

- Draft patch reference: `supabase/sql/019_ai_homework_deployed_regression_fixture.sql` (manual/dev-only apply).
- Purpose: provide a stable fake baseline for deployed AI Edge regression allowed-role + mismatch checks.
- `019` scope is additive only:
  - fake branch/class/student
  - fake guardian link
  - fake teacher-class assignment
  - fake homework task + fake homework submission
- `019` includes helper SELECT output for:
  - `AI_HOMEWORK_TEST_SUBMISSION_ID`
  - `AI_HOMEWORK_TEST_TASK_ID`
  - `AI_HOMEWORK_TEST_STUDENT_ID`
  - `AI_HOMEWORK_TEST_CLASS_ID`
- After manual apply in dev:
  1. copy those IDs into local `.env.local` only (never commit),
  2. run `npm run test:ai:homework-edge:deployed`,
  3. confirm teacher/supervisor/HQ allowed and mismatch checks can move from `CHECK` to `PASS`.

### Announcements Phase 1 foundation draft note

- Draft patch reference: `supabase/sql/020_announcements_phase1_foundation.sql` (manual review/apply only).
- `020` status:
  - manual/dev-first SQL draft prepared,
  - not applied automatically,
  - review-first before manual apply in Supabase dev,
  - fake/dev data only.
- `020` Phase 1 scope:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
- `020` intentionally excludes:
  - `announcement_attachments` (Phase 2+),
  - MyTasks integration (Phase 2+),
  - Company News pop-up runtime behavior (Phase 3),
  - parent-facing announcements/events runtime access (Phase 4),
  - live chat (Phase 5+).

#### Announcements Phase 1 role checks (after manual apply in dev only)

- HQ/admin can select/manage all internal staff announcements in scope.
- Branch supervisor can create/select/manage own-branch internal staff announcements.
- Teacher can read only published internal announcements targeted to self/role/branch and cannot create announcements.
- Teacher can update own `announcement_statuses` row only.
- Teacher can insert own `announcement_replies` row only.
- Parent/student must have zero access to Phase 1 internal announcements/tables.
- Negative test: teacher cannot read unrelated branch announcement targets/replies/status rows.
- Negative test: parent/student direct SQL/API reads on Phase 1 announcements tables must fail.
- Negative test: branch supervisor must not insert/update `announcement_targets` rows for another branch profile/branch/class scope.
- Verification checkpoint: `pg_policies` query returned 16 policy rows across the four announcements Phase 1 tables in dev after manual `020` apply.

##### Announcements fake fixture activation draft note

- Draft patch reference: `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql` (manual/dev-only apply; fake data only).
- `021` purpose is fixture activation/alignment for fake staff smoke prerequisites only.
- `021` scope is constrained to fake `example.test` identities already used by seed/smoke:
  - `hq.demo@example.test`
  - `supervisor.demo@example.test`
  - `teacher.demo@example.test`
  - plus verification rows for parent/student fixtures.
- `021` does not weaken RLS and does not include real data, passwords, or secrets.
- After manual dev apply, rerun: `npm run test:supabase:announcements:phase1`.

##### Announcements insert RLS fix draft note

- Draft patch reference: `supabase/sql/022_fix_announcements_insert_rls.sql` (manual/dev-only apply; fake data only).
- `022` addresses create-path HQ/supervisor insert CHECK after fixture activation.
- `022` keeps strict Phase 1 boundaries:
  - internal-staff only,
  - HQ create allowed,
  - branch supervisor create only for own branch,
  - teacher/parent/student create blocked,
  - no cross-branch widening,
  - no parent-facing insert path opened.
- Manual dev apply status: completed.
- Current smoke checkpoint now proves core Announcements Phase 1 boundaries:
  - HQ create PASS,
  - supervisor own-branch create/publish PASS,
  - teacher create blocked PASS,
  - teacher targeted read/status/reply PASS,
  - parent/student internal_staff block PASS,
  - cleanup PASS.
- Optional cross-branch negative fixture remains CHECK-skipped when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing.

##### Announcements Phase 1 service smoke reference

- Smoke script: `scripts/supabase-announcements-phase1-smoke-test.mjs`
- Command: `npm run test:supabase:announcements:phase1`
- Service coverage reference:
  - `src/services/supabaseReadService.js`
  - `src/services/supabaseWriteService.js`
- Current checkpoint note:
  - smoke exits successfully,
  - HQ/supervisor create and teacher-targeted flows currently show CHECK skips in fixture context and need focused follow-up validation.
  - current diagnosis: HQ/supervisor fixture profiles are inactive (`is_active=false`), so role helper checks intentionally return non-staff scope for those sessions.

##### Announcements MyTasks derived-read service smoke reference

- Smoke script: `scripts/supabase-announcements-mytasks-smoke-test.mjs`
- Command: `npm run test:supabase:announcements:mytasks`
- Service coverage reference:
  - `src/services/supabaseReadService.js` (`listMyAnnouncementTasks`)
  - `src/services/supabaseWriteService.js` (fixture create/publish/reply/done)
  - `src/services/supabaseUploadService.js` (optional uploadProvided transition)
- Current checkpoint guardrails:
  - fake/dev fixtures only,
  - no SQL apply,
  - no service-role usage,
  - no notifications/emails,
  - parent-facing announcement scope remains disabled.

### Homework marked-file role/release draft patch note

- Draft patch reference: `supabase/sql/018_homework_file_roles_release_foundation.sql` (manual review/apply only).
- Draft adds additive `homework_files` fields:
  - `file_role`
  - `released_to_parent`
  - `released_at`
  - `released_by_profile_id`
  - `marked_by_profile_id`
  - `staff_note`
- Draft role values:
  - `parent_uploaded_homework`
  - `teacher_marked_homework`
  - `feedback_attachment`
- Draft RLS intent:
  - staff can read review files in scope before release
  - parent/student can read marked/feedback files only when `released_to_parent = true`
  - parent/student cannot create `teacher_marked_homework` or `feedback_attachment`
  - parent/student cannot set release metadata
- Draft storage intent:
  - private `homework-submissions` bucket remains
  - object read gate mirrors metadata role/release gate
  - metadata-first upload flow remains required
- Draft status:
  - manually applied in Supabase dev (SQL Editor success)
  - application checkpoint: `docs/homework-file-role-release-sql-application-checkpoint.md`
  - marked-file service methods are now added in `src/services/supabaseUploadService.js`
  - marked-file smoke test is now added at `scripts/supabase-homework-marked-file-smoke-test.mjs`
  - package command: `npm run test:supabase:homework:marked-file`
  - fake/dev data validation only
  - teacher marked-file upload service/UI remains future
  - parent marked-file display remains future

#### Homework marked-file role checks (after manual apply in dev only)

- HQ can read/manage all homework files and release metadata.
- Branch supervisor can read/manage own-branch homework files and release metadata.
- Teacher can read/upload in assigned class scope; teacher release/edit authority remains intentionally conservative until product confirms release ownership.
- Parent can read linked-child `parent_uploaded_homework` rows and released marked/feedback rows only.
- Student can read self `parent_uploaded_homework` rows and released marked/feedback rows only.
- Parent/student cannot insert `teacher_marked_homework` or `feedback_attachment`.
- Parent/student cannot set `released_to_parent`, `released_at`, or `released_by_profile_id`.
- No cross-family visibility for metadata or storage object reads.

## Execution Notes

- Run tests with fake users for each role.
- Validate both UI behavior and direct API/database query behavior.
- Record pass/fail evidence before enabling real data onboarding.

### Announcements attachments foundation draft note

- Draft patch reference: `supabase/sql/023_announcements_attachments_foundation.sql` (manual review/apply only).
- `023` status:
  - manual/dev-first SQL draft prepared,
  - pre-apply security/data-model review completed,
  - not applied automatically,
  - no production apply assumption,
  - fake/dev data only.
- `023` draft scope:
  - new `announcement_attachments` table,
  - file-role/check constraints and indexes,
  - helper access/manage functions,
  - RLS on `announcement_attachments`,
  - private storage bucket/policies for `announcements-attachments`.
- `023` review hardening:
  - `announcement_attachments.storage_path` unique index added to block duplicate-path metadata collisions.
  - `announcement_attachments.file_size` max check added (`<= 26214400`) in addition to non-negative check.
- `023` manual dev apply status: completed (Supabase dev SQL Editor success).
- Application checkpoint doc: `docs/announcements-attachments-sql-application-checkpoint.md`.
- Verification checkpoint confirmed:
  - `announcement_attachments` exists with 13 verified columns,
  - metadata policies present (`announcement_attachments_select_023`, `announcement_attachments_insert_manage_023`, `announcement_attachments_insert_teacher_023`, `announcement_attachments_update_023`, `announcement_attachments_delete_023`),
  - helper functions present (`announcement_attachment_announcement_id`, `announcement_attachment_branch_id`, `can_access_announcement_attachment`, `can_manage_announcement_attachment`),
  - storage bucket `announcements-attachments` exists with `public=false`,
  - storage object policies present (`announcements_attachments_storage_select_023`, `announcements_attachments_storage_insert_023`, `announcements_attachments_storage_update_023`, `announcements_attachments_storage_delete_023`).
- Service + smoke references:
  - `src/services/supabaseUploadService.js` (`uploadAnnouncementAttachment`, `listAnnouncementAttachments`, `getAnnouncementAttachmentSignedUrl`)
  - `scripts/supabase-announcements-attachments-smoke-test.mjs`
  - `npm run test:supabase:announcements:attachments`
- Service/smoke checkpoint doc:
  - `docs/announcements-attachments-service-smoke-checkpoint.md`
- Upload CHECK diagnosis note:
  - post-024 diagnostics: raw metadata insert without RETURNING succeeds; service RETURNING path still CHECK-fails.
  - failure is now isolated to SELECT policy behavior on `INSERT ... RETURNING`.
- Insert-RLS follow-up patch draft:
  - `supabase/sql/024_fix_announcements_attachments_insert_rls.sql` (manual/dev-only apply).
- Select-RETURNING follow-up patch draft:
  - `supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql` (manual/dev-only apply).
- Post-apply expectation:
  - rerun `npm run test:supabase:announcements:attachments`,
  - upload/list/signed URL checks should move from CHECK to PASS where role/fixture prerequisites are valid.
- `023` phase boundary:
  - parent/student access blocked,
  - `parent_facing_media` is reserved but blocked in this phase,
  - no MyTasks integration,
  - no Company News pop-up behavior.

#### Announcements attachments role checks (after manual apply in dev only)

- HQ can read/manage all internal announcement attachments.
- Branch supervisor can read/manage own-branch internal attachments only.
- Teacher can read attachments for accessible targeted announcements only.
- Teacher can insert `response_upload` only as `uploaded_by_profile_id = auth.uid()`.
- Teacher cannot insert `hq_attachment`/`supervisor_attachment`.
- Parent/student must have zero access to internal attachment metadata and objects.
- `parent_facing_media` rows must remain blocked in this phase.
- Storage checks:
  - no public bucket access,
  - select/insert object access only via metadata-linked internal role checks,
  - object update/delete restricted to HQ/supervisor manage path.

## School/Curriculum + AI Foundation (007) Checks

When `supabase/sql/007_school_curriculum_ai_foundation.sql` is manually applied, validate the following (manually and/or via `npm run test:supabase:read`, which performs **read-only count** checks per fake role for `schools`, `student_school_profiles`, and the other 007 foundation tables after **008** seed data exists):

- `schools` and `student_school_profiles` RLS (HQ full; branch supervisor own-branch scope via linked students; teacher assigned students only; parent/student linked self only).
- `curriculum_mappings` and `learning_objectives` staff visibility (teacher + branch supervisor read; **writes HQ-only** per `007` draft).
- `student_subject_enrolments` multi-subject visibility by linked/assigned student.
- `student_learning_profiles` internal staff-only fields (parent/student blocked unless later policy changes).
- `homework_marking_results` parent/student read only when `teacher_approved = true`.
- `ai_generation_requests` and `ai_feedback_tags` staff-only access.
- `ai_generation_outputs` parent/student access only for approved/released rows linked to own child/self.

## AI parent reports service smoke checks (manual/mock milestone)

Use:
- `npm run test:supabase:ai-parent-reports`

Expected outcomes for this milestone:
- staff can create draft/report version in scope (PASS),
- parent cannot read draft report detail (PASS),
- submit/approve/release lifecycle is exercised under existing RLS (PASS/CHECK by fixture role scope),
- released linked-child report visibility path for parent is exercised (PASS/CHECK by fixture),
- unrelated parent is blocked (PASS/CHECK if unrelated parent credentials/fixture are missing),
- student blocked/empty for AI parent report reads (PASS),
- `generation_source='real_ai'` is blocked in service layer (PASS),
- release/version audit event inserts are PASS or CHECK with explicit reason (no privilege widening),
- no service-role frontend usage,
- no real provider/PDF/export flows exercised.

### AI parent reports insert diagnostics (pre-031 apply)

- Stage probes now expected in smoke output:
  - `fixture_discovery`
  - `service_create`
  - `raw_insert_without_returning`
  - `insert_with_returning`
  - `helper_predicate`
  - `constraint_or_fk`
  - `downstream_lifecycle`
- If helper is `true` and raw insert passes but RETURNING fails, classify as select-policy/RETURNING visibility issue.
- Patch draft reference (manual/dev-first only, not auto-applied):
  - `supabase/sql/031_fix_ai_parent_reports_insert_rls.sql`

### AI parent reports post-031 apply expectations

- `031` applied in Supabase DEV should move:
  - `service_create` from CHECK to PASS for HQ draft creation.
- Expected PASS path after apply:
  - HQ draft create,
  - `real_ai` source blocked,
  - first version number = 1,
  - submit/review/approve/release lifecycle,
  - `current_version_id` set to selected release version,
  - parent draft blocked,
  - parent released linked-child visibility,
  - parent current released version visibility only,
  - student blocked,
  - no provider/PDF path exercised,
  - anon+JWT+RLS-only posture.
- Expected safe CHECKs may remain:
  - evidence-link unsafe raw path guard case,
  - unrelated-parent credential fixture missing,
  - optional announcements phase1 cross-branch fixture CHECK.

### AI parent reports evidence-link hardening expectations

- Positive case:
  - safe fake/dev evidence-link insert should PASS.
- Negative case:
  - unsafe raw private file-path style evidence snapshot should be blocked (PASS/CHECK guard proof).
- Visibility case:
  - staff evidence read-back may PASS where RLS permits,
  - parent direct evidence-link read should remain blocked/empty.
- Milestone checkpoint reference:
  - `docs/ai-parent-report-evidence-smoke-hardening-checkpoint.md`.

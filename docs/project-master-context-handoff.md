# Project Master Context Handoff

This master handoff preserves product direction, implemented milestones, architecture constraints, and safe continuation priorities for future ChatGPT/Cursor sessions.

## 1) Product identity and vision

**Young’s Learners / Enrichify Class Flow** is not just an admin dashboard.  
It is an AI-driven education operations + parent trust + learning evidence platform.

Direction to preserve:

- Mobile-first for parent and teacher daily workflows.
- Desktop/laptop-capable for HQ and supervisor reporting/review.
- Future school/curriculum personalisation foundation.
- Future AI learning intelligence layer.
- Build toward a stable, careful, "perfect portal" direction over rushed, unstable feature expansion.

## 2) Current project stage

Current stage should be treated as:

- Strong internal prototype / full-stack hardening stage.
- Not production-ready yet.
- Several real Supabase RLS-backed workflows are already implemented and validated with smoke tests.

## 3) Major completed verticals

Implemented milestones to preserve as "already done":

- Supabase auth/login/role landing foundation.
- Supabase read/write service patterns (anon client + JWT model).
- MyTasks write flow.
- Attendance write flow.
- Parent Updates Quick Comment draft/release flow.
- Weekly Progress Report draft/release flow.
- Fee/payment proof exception workflow.
- Staff Time Clock full vertical.
- Class Memories full vertical.
- AI mock/fallback draft layer (provider-free runtime).

## 4) Fee/payment proof business rule (locked)

This business logic is locked and should remain explicit in future docs/features:

1. Normal payment is internally tracked and confirmed by supervisor/HQ.
2. Invoice/e-invoice is sent after confirmed payment (automation can come later).
3. Parent payment proof upload is exception-only.
4. Parent upload is used only when office cannot confirm payment internally.
5. HQ/supervisor verifies or rejects submitted proof.
6. Parent upload UX must not look like the normal/default payment flow.

## 5) Staff Time Clock product rule (locked)

Staff Time Clock is not button-only attendance.

Required product behavior:

- Active GPS/geofence verification at both clock-in and clock-out.
- Selfie proof at clock-in and clock-out.
- No continuous/background tracking by default.
- Staff punch flow is mobile-first.
- HQ/supervisor review/reporting is desktop-friendly.
- Selfie evidence is private storage with signed URL access only.

Planned future hardening:

- Review actions.
- Export/report tools.
- Adjustment request handling.
- Retention + consent policy finalization.

## 6) Class Memories product rule (locked)

Use the product language **Memory / Memories / Class Memories**, not "class photo".

Required behavior and UX direction:

- Class Memories is for warm parent engagement + learning evidence.
- Teacher upload originates from ParentUpdates/class workflow.
- Approval gate required before parent visibility.
- Parent-facing Latest Memory hero card.
- Memories History should be gallery/grid style, not long stacked list.
- Media remains private storage with signed URL access only.

Planned next enhancements:

- Hide/archive UI wiring.
- Video support.
- Thumbnail generation.
- Consent/photo policy finalization.

## 7) AI strategy (locked)

AI architecture and product guardrails:

- AI output is draft-only.
- Teacher/staff approval is required before parent visibility.
- No direct frontend LLM provider calls.
- Real AI must run through Supabase Edge Function/server-side secret boundary.
- First real AI use case should be parent comment draft generation.

Recommended later AI sequence:

1. Weekly report AI drafts.
2. Homework feedback/marking.
3. Learning gap detection.
4. Next-week recommendations.
5. Curriculum-aware AI personalization.

## 8) Security / RLS / storage rules (locked)

Non-negotiable implementation rules:

- Frontend uses Supabase anon client + JWT only.
- Service role key is never used in frontend.
- Private buckets by default.
- Signed URLs only for sensitive object access.
- `demoRole` must not write to Supabase.
- Parent/student can only see approved and linked content.
- Teacher access is branch/class scoped.
- Branch supervisor access is own-branch scoped.
- HQ can access all branches by policy.
- For risky workflow changes, run smoke tests before UI wiring.

## 9) Validation rule (efficiency policy)

Use the smallest validation scope that matches blast radius:

- **Docs-only:** run `git diff --name-only`.
- **UI-only changes:** run build/lint/typecheck.
- **Service/backend changes:** run build/lint/typecheck + relevant smoke test(s).
- **SQL/RLS/storage/auth/shared risky changes:** run broader/full validation.
- Avoid running full suite after tiny or docs-only changes.

## 10) Known limitations (not production-ready yet)

Current non-production gaps:

- Password reset and production auth polish.
- Real onboarding/admin user management.
- Production privacy/consent wording finalization.
- Data migration and seed cleanup plan.
- Full mobile QA on real iOS/Android devices.
- Exports/monthly reporting completeness.
- Invoice/e-invoice automation.
- Real AI provider integration.
- School/curriculum onboarding not implemented in product flow yet.
- Homework upload/review pipeline not implemented in production shape yet.
- Production monitoring/on-call/support process not finalized.

## 11) Recommended roadmap from here

Recommended order:

A. Project master handoff doc (this doc)  
B. School/curriculum onboarding foundation  
C. Homework upload/review pipeline  
D. Real AI provider integration for parent comments  
E. AI weekly report generation  
F. AI homework feedback/marking  
G. Production auth/privacy/mobile QA hardening  
H. Pilot deployment plan

Why school/curriculum before real AI:

AI needs structured learning context to be truly differentiated, accurate, and school-aligned. Without school/curriculum context, generated output is more generic and less operationally valuable.

Current status note:

- School/curriculum SQL/RLS draft now exists at `supabase/sql/012_school_curriculum_foundation.sql`.
- It is additive/manual draft and is now manually applied in Supabase dev.
- School/curriculum read service + read smoke test are now added for role-scoped read validation.
- School/curriculum fake seed draft exists at `supabase/sql/013_school_curriculum_fake_seed_data.sql` (manual/dev-only).
- School/curriculum fake seed is now manually applied in Supabase dev (Success / No rows returned).
- Fake seed application checkpoint is documented at `docs/school-curriculum-fake-seed-application-checkpoint.md`.
- Classes page read-only curriculum context preview is now started (RLS-scoped read only; no assignment/edit writes).
- Students page read-only school/learning context preview is now started (RLS-scoped read only; no profile write/edit controls).
- ParentView parent-friendly learning focus summary is now started (read-only bridge from curriculum context to parent-facing language).
- School/curriculum class assignment write service is now added in `src/services/supabaseWriteService.js` (service layer only; no UI wiring).
- School/curriculum class assignment write smoke test is now added at `scripts/supabase-school-curriculum-write-smoke-test.mjs`.
- `Classes` curriculum assignment/edit UI is now wired for HQ + branch supervisor using existing write services (teacher/parent/student remain without write controls).
- Student school profile write service is now added in `src/services/supabaseWriteService.js` (service layer only; `Students` edit UI still unwired).
- Student school profile write smoke test is now added at `scripts/supabase-school-profile-write-smoke-test.mjs`.
- `Students` school profile edit UI is now wired for HQ + branch supervisor using existing student profile upsert service (teacher/parent/student remain without edit controls).
- School/curriculum UI now has read/write coverage on `Classes` + `Students`; AI integration remains unwired.
- Parent comment AI mock path now includes curriculum-aware context assembly in `src/services/aiDraftService.js` (provider-free, draft-only, teacher approval still required).
- Homework upload/review foundation SQL/storage/RLS exists at `supabase/sql/014_homework_upload_review_foundation.sql` and is now manually applied in Supabase dev (runtime/UI wiring still pending). Draft includes path-convention validation helper and staff-only submission updates.
- Application checkpoint is documented at `docs/homework-sql-application-checkpoint.md`.
- Homework runtime service + fake file smoke test are now started (`src/services/supabaseUploadService.js`, `scripts/supabase-homework-upload-smoke-test.mjs`) with metadata-first upload and private signed URL checks using fake files only.
- `015` has been manually applied in dev to fix UUID path-prefix matching for metadata-first homework file insert.
- Parent direct submission insert investigation found policy recursion for first parent submission; patch draft exists at `supabase/sql/016_fix_homework_parent_submission_insert.sql` (manual apply only, not applied yet).
- Homework flexible assignment additive SQL/RLS (`017`) is now manually applied in Supabase dev:
  - `supabase/sql/017_homework_task_assignees_foundation.sql`
  - checkpoint doc: `docs/homework-task-assignees-sql-application-checkpoint.md`
- `017` introduces optional `homework_tasks.assignment_scope` and `homework_task_assignees` RLS model to support explicit student/small-group assignment rows.
- `017` includes an assignee alignment guard so task/branch/class/student mismatch rows are rejected at write time.
- Manual marked homework file role/release additive SQL/RLS patch `018` is now manually applied in Supabase dev:
  - `supabase/sql/018_homework_file_roles_release_foundation.sql`
  - checkpoint doc: `docs/homework-file-role-release-sql-application-checkpoint.md`
- `018` adds role/release metadata to `homework_files` and release-aware read restrictions so parent/student marked-file visibility is gated until release.
- `018` draft preserves current parent upload compatibility via backward-compatible default `file_role = 'parent_uploaded_homework'`.
- Manual marked-file service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadMarkedHomeworkFile(...)`
  - `listHomeworkFiles({ homeworkSubmissionId, fileRole, parentVisibleOnly })`
  - `releaseHomeworkFileToParent(...)`
- Marked-file smoke test is now added at `scripts/supabase-homework-marked-file-smoke-test.mjs` with package command `npm run test:supabase:homework:marked-file`.
- Teacher marked-file UI shell is now added in `src/pages/Homework.jsx` review detail panel:
  - demo mode uses local fake list/upload/release/view behavior only,
  - authenticated non-demo mode now wires real marked-file upload/list/view/release actions with existing marked-file services.
- Marked-file release action does not auto-release feedback and does not trigger notification side effects in this phase.
- Parent released marked-file display runtime wiring remains future.
- Parent `Teacher-marked work` display shell is now added in `src/pages/ParentView.jsx` under released feedback cards:
  - demo mode uses local fake released marked-file display and local preview toast only,
  - authenticated non-demo mode currently shows safe waiting copy shell only,
  - real parent marked-file list/signed URL wiring remains future.
- Parent `Teacher-marked work` real read/open wiring is now added in `src/pages/ParentView.jsx` for authenticated non-demo flow:
  - read uses `listHomeworkFiles({ homeworkSubmissionId, fileRole: 'teacher_marked_homework', parentVisibleOnly: true })` for visible submission UUIDs only,
  - open uses `getHomeworkFileSignedUrl(...)` signed URL only,
  - parent-safe empty state remains and does not hint unreleased file existence.
- Parent marked-file release boundary remains protected in this shell milestone:
  - no parent visibility for unreleased teacher-marked files,
  - no teacher controls/upload controls in parent area,
  - no internal notes/raw IDs in parent output.
- AI OCR/provider path for marked files remains future and is not wired in parent display flow.
- Assignee-aware homework read service baseline is now added in `src/services/supabaseReadService.js`:
  - `listHomeworkTaskAssignees(...)`
  - `listAssignedHomeworkForStudent(...)`
- Assignee-read smoke test is now added at `scripts/supabase-homework-assignees-read-smoke-test.mjs` with package command `npm run test:supabase:homework:assignees:read`.
- Homework tracker-focused read service methods are now added in `src/services/supabaseReadService.js`:
  - `listHomeworkTrackerByClass(...)`
  - `listHomeworkTrackerByStudent(...)`
- Tracker-read smoke test is now added at `scripts/supabase-homework-tracker-read-smoke-test.mjs` with package command `npm run test:supabase:homework:tracker:read`.
- Homework assignment write-service MVP is now added in `src/services/supabaseWriteService.js`:
  - `createHomeworkTaskWithAssignees(...)`
  - `assignHomeworkTaskToStudents(...)`
- Assignment write-service MVP supports class, selected-student, and individual homework creation paths via anon client + JWT + RLS only.
- Assignment-write smoke test is now added at `scripts/supabase-homework-assignment-write-smoke-test.mjs` with package command `npm run test:supabase:homework:assignment:write`.
- Teacher Homework UI shell now includes `By Task` / `By Student` segmented structure with demo parity in `src/pages/Homework.jsx`.
- Demo mode now shows local fake task/student tracker cards and quick status badges while preserving no-Supabase/no-provider behavior.
- Authenticated non-demo Homework now wires real `By Task` tracker read using `listHomeworkTrackerByClass(...)` with UUID-safe class handling.
- Authenticated non-demo Homework now wires real `By Student` tracker read using `listHomeworkTrackerByStudent(...)` with UUID-safe student selection from visible homework data.
- `By Task` tracker behavior remains preserved while adding `By Student`.
- `Homework` now includes `Create Homework` UI shell with demo parity:
  - local/demo mode uses fake local form + fake local create simulation only,
- authenticated non-demo mode now wires guarded save to existing `createHomeworkTaskWithAssignees(...)` with validation and query refresh behavior.
- Selected-student assignment write services are now used by the `Homework` create shell in authenticated non-demo mode.
- Manual marked-file upload remains future.
- Existing homework runtime/UI workflow remains unchanged until later service/UI migration; parent assigned-but-not-submitted visibility should later move to assignee-row based reads.
- Real assignment edit/archive wiring remains future.
- Manual marked-file upload remains future.
- AI provider integration remains future.
- Announcements/Internal Communications remains future.
- Homework feedback write service + smoke test are now started (`src/services/supabaseWriteService.js`, `scripts/supabase-homework-feedback-smoke-test.mjs`) for draft/create-update, review transition, release-to-parent, and parent draft-hidden checks.
- Parent-visible feedback read path now omits `internal_note` from service response when `parentVisibleOnly` is requested.
- Teacher homework review UI is now minimally wired on `src/pages/Homework.jsx` for staff-only queue/detail/draft workflow using existing homework read/write services.
- Parent read-only homework status/list UI is now wired on `src/pages/ParentView.jsx` for linked-child visibility using anon client + RLS reads only.
- Parent homework upload form is now minimally wired on `src/pages/ParentView.jsx` for assigned/open tasks using existing submission/upload services.
- Parent released homework feedback display is now wired on `src/pages/ParentView.jsx` using `listHomeworkFeedback({ parentVisibleOnly: true })` with parent-safe fields only (`feedback_text`, `next_step`, release date).
- `internal_note` remains protected from parent-visible service/UI path.
- Demo preview parity is now improved for Homework + Memories:
  - parent demo Homework shows local upload/submit workflow shape and released-feedback example,
  - teacher demo Homework shows local review queue/detail/feedback workflow shape (no Supabase calls),
  - demo Class Memories History now uses gallery/grid style instead of stacked cards.
- Mock homework AI feedback context builder is now added in `src/services/aiDraftService.js` (`buildHomeworkFeedbackDraftContext(...)`, `generateMockHomeworkFeedbackDraft(...)`) with safe context assembly and draft-only output.
- Homework AI mock test is now added at `scripts/ai-homework-feedback-mock-test.mjs` and package command `npm run test:ai:homework-feedback:mock`.
- `Homework` teacher review panel now includes mock-only `Draft feedback with AI` action that fills editable draft fields only (no auto-save/release, no real provider/API call).
- Supabase Edge Function homework AI stub is now added at `supabase/functions/generate-homework-feedback-draft/index.ts` with local handler `supabase/functions/generate-homework-feedback-draft/handler.js` and local contract test `scripts/ai-homework-edge-function-stub-test.mjs`.
- Homework Edge Function stub now includes auth/scope helper flow with Supabase JWT user verification path, role gating (teacher/branch supervisor/HQ only), and submission/task/student/class relationship checks while preserving deterministic draft-only mock output.
- Frontend wrapper is now added at `src/services/aiDraftService.js` (`generateHomeworkFeedbackDraftViaEdgeFunction(...)`) with stable `{ data, error }` handling and required-ID validation; local mock remains default unless explicitly feature-flagged.
- Deployed regression script is now added at `scripts/ai-homework-edge-function-deployed-regression-test.mjs` to validate Edge Function auth/scope behavior in dev deployment with fake/dev fixtures and graceful `CHECK` handling when fixtures are unavailable.
- Frontend `Homework` page remains on local mock draft button path in this phase; provider wiring and broader deployed-environment auth regression hardening remain future work.
- Supabase CLI login is now completed manually and project is linked to `fwturqeaagacoiepvpwb`.
- `generate-homework-feedback-draft` is now deployed to Supabase dev and reachable via deployed regression.
- Deployed regression now shows:
  - `PASS` missing auth -> `401`
  - `PASS` invalid token -> `401`
  - `PASS` parent blocked -> `403`
  - `PASS` student blocked -> `403`
  - `CHECK` teacher/branch supervisor/HQ allowed-role cases due missing accessible fake fixtures
  - `CHECK` relationship mismatch due missing allowed-role fixture
- Deployed regression fixture handling is now improved in `scripts/ai-homework-edge-function-deployed-regression-test.mjs`:
  - optional explicit fixture env IDs: `AI_HOMEWORK_TEST_SUBMISSION_ID`, `AI_HOMEWORK_TEST_TASK_ID`, `AI_HOMEWORK_TEST_STUDENT_ID`, `AI_HOMEWORK_TEST_CLASS_ID`,
  - UUID + relationship validation for explicit fixture IDs before allowed-role tests,
  - role-accessible fallback discovery when explicit IDs are not configured,
  - clearer `CHECK` reasons when fixtures are unavailable.
- Dev-only stable fixture baseline SQL draft is now added at `supabase/sql/019_ai_homework_deployed_regression_fixture.sql`:
  - additive/manual-dev only,
  - no destructive operations,
  - fake-only branch/class/student/task/submission baseline for deployed regression,
  - helper SELECT output for local `AI_HOMEWORK_TEST_*` values,
  - not applied automatically in this milestone.
- `019` fixture baseline is now manually applied in Supabase dev only (no production apply) using fake/dev data only.
- Live deployed AI homework Edge Function regression now has full PASS coverage:
  - `PASS` missing auth -> `401`
  - `PASS` invalid token -> `401`
  - `PASS` parent blocked -> `403`
  - `PASS` student blocked -> `403`
  - `PASS` assigned teacher/branch supervisor own-branch/HQ allowed-role cases
  - `PASS` mismatched task/student/class blocked cases
  - `PASS` draft-only safety note present and no auto-save side effect
- AI homework Edge Function provider adapter stub is now added in `supabase/functions/generate-homework-feedback-draft/providerAdapter.js`:
  - provider mode supports `mock`, `disabled`, and `future_real_provider_placeholder`,
  - default behavior is provider-disabled local stub output (`externalCall: false`),
  - no provider keys/secrets added in repo,
  - no real provider API wiring in this milestone.
- Provider integration remains unwired/disabled; no provider keys added; draft-only and teacher-approval gate remain unchanged.
- AI homework feedback remains a future milestone after full human workflow hardening.
- Announcements Phase 1 SQL/RLS foundation draft is now added at `supabase/sql/020_announcements_phase1_foundation.sql`:
  - manual/dev-first draft only,
  - additive and non-destructive,
  - fake/dev data only,
  - not applied automatically in this milestone,
  - drafted tables: `announcements`, `announcement_targets`, `announcement_statuses`, `announcement_replies`,
  - conservative internal staff RLS scope for HQ/supervisor/teacher; parent/student access remains blocked in Phase 1.
- `020` pre-apply review hardening is now completed before manual dev apply:
  - fixed supervisor target-write scope gap by adding helper `can_manage_announcement_target_write(...)`,
  - `announcement_targets` insert/update now enforce own-branch scope for branch supervisor target writes.
- `020` is now manually applied in Supabase dev SQL Editor (Success / No rows returned):
  - no production apply,
  - no runtime/UI/service changes in this checkpoint,
  - Phase 1 tables confirmed in dev:
    - `announcements`
    - `announcement_targets`
    - `announcement_statuses`
    - `announcement_replies`,
  - `pg_policies` verification showed policies for all four tables (16 rows visible),
  - helper verification confirmed:
    - `announcement_branch_id`
    - `can_access_announcement`
    - `can_manage_announcement`
    - `can_manage_announcement_target_write`
    - `is_announcement_targeted_to_profile`,
  - `information_schema` verification returned 42 column rows across the four Phase 1 tables.
- Announcements Phase 1 read/write service layer is now added:
  - `src/services/supabaseReadService.js`:
    - `listAnnouncements(...)`
    - `listAnnouncementTargets(...)`
    - `listAnnouncementStatuses(...)`
    - `listAnnouncementReplies(...)`
  - `src/services/supabaseWriteService.js`:
    - `createAnnouncementRequest(...)` (safe default `status = draft`)
    - `publishAnnouncement(...)`
    - `markAnnouncementRead(...)`
    - `updateAnnouncementDoneStatus(...)`
    - `createAnnouncementReply(...)`
- Announcements Phase 1 smoke test is now added:
  - `scripts/supabase-announcements-phase1-smoke-test.mjs`
  - package command: `npm run test:supabase:announcements:phase1`
- Service and smoke layer keep guardrails:
  - anon client + JWT + RLS only,
  - no service role in frontend,
  - no attachment upload/public URL behavior in this milestone,
  - no auto email/notification behavior in this milestone.
- Announcements service smoke checkpoint result (current):
  - build/lint/typecheck passed,
  - `test:supabase:announcements:phase1` exited successfully with safe CHECK skips in current fixture context,
  - HQ/supervisor create and teacher-targeted proof remains incomplete pending focused fixture/RLS investigation,
  - latest diagnosis shows HQ/supervisor fake profiles are currently inactive (`is_active=false`), which causes `current_user_role()` helper checks to fail staff-role authorization as designed,
  - recommendation: resolve create/RLS CHECK skips before Announcements UI wiring.
- Announcements fake fixture activation SQL draft `021` is now prepared:
  - `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql`,
  - manual/dev-only draft (not auto-applied),
  - fake `example.test` fixture activation/alignment only,
  - no RLS weakening, no real data, no secrets.
- Next required step for Announcements Phase 1 proof:
  - manual review/apply `021` in Supabase dev SQL Editor,
  - rerun `npm run test:supabase:announcements:phase1`,
  - keep Announcements UI wiring paused until create/status/reply path is proven.
- Announcements create-path RLS follow-up draft is now added:
  - `supabase/sql/022_fix_announcements_insert_rls.sql`,
  - manual/dev-only patch (not auto-applied),
  - fixes HQ/supervisor create-path CHECK after fixture activation by using direct row-predicate checks in `announcements` select/insert policies,
  - keeps teacher/parent/student create blocked and preserves cross-branch restrictions.
- Updated Announcements next required proof sequence:
  - manual review/apply `022` in Supabase dev SQL Editor,
  - rerun `npm run test:supabase:announcements:phase1`,
  - proceed to UI only after HQ/supervisor create and downstream targeted flow are proven.
- Announcements Phase 1 smoke PASS checkpoint is now reached in dev:
  - `021` manually applied,
  - `022` manually applied,
  - PASS: HQ create, supervisor own-branch create/publish, teacher targeted read/status/reply, parent/student internal_staff block, cleanup,
  - CHECK: optional cross-branch negative fixture still skipped without `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`.
- Recommended immediate next milestone is now:
  - Staff Announcements UI shell with demo parity first,
  - keep real UI wiring, attachments, MyTasks integration, Company News pop-up, and parent-facing rollout in later phases.
- Staff Announcements UI shell milestone is now implemented:
  - route/page: `/announcements` via `src/pages/Announcements.jsx`,
  - staff nav tab added after `Dashboard` for HQ/supervisor/teacher only,
  - demo mode uses local fake behavior (local create/status/reply only; no Supabase calls),
  - authenticated mode is intentionally preview-only with no real announcements service wiring in this milestone.
- Announcements next milestone priority is now:
  - real authenticated Announcements UI wiring first (read/status/reply/create using existing services),
  - then attachments, MyTasks integration, Company News pop-up behavior, and parent-facing rollout.
- Real authenticated Staff Announcements UI wiring is now implemented in `src/pages/Announcements.jsx`:
  - authenticated non-demo read list/detail wiring now uses existing Phase 1 services,
  - authenticated non-demo create request wiring is enabled for HQ/supervisor only,
  - authenticated non-demo status/reply wiring is enabled (mark read, done/undone, reply),
  - demo mode remains local-only fake data with no Supabase calls.
- Announcements attachments remain Phase 2+ and are intentionally not included in `020`.
- Announcements MyTasks integration remains Phase 2+ and is intentionally not included in `020`.
- Company News pop-up runtime behavior remains Phase 3.
- Parent-facing announcements/events runtime rollout remains Phase 4.
- Live chat remains Phase 5+ only if needed.
- Notification/email workflow remains a future milestone.
- Announcements attachments Phase 2 SQL/RLS draft now exists at `supabase/sql/023_announcements_attachments_foundation.sql`:
  - manual/dev-first draft only,
  - now manually applied in Supabase dev (successful),
  - pre-apply security/data-model review completed,
  - no production apply assumption,
  - drafts `announcement_attachments` metadata table + internal staff RLS + private storage policies,
  - includes review hardening: unique `storage_path` index and bounded `file_size` check (`<= 25MB`),
  - keeps parent/student blocked and keeps `parent_facing_media` blocked in this phase.
- `023` application verification checkpoint confirms:
  - `announcement_attachments` exists with 13 verified columns,
  - metadata RLS policies exist on `announcement_attachments`,
  - helper functions exist (`announcement_attachment_announcement_id`, `announcement_attachment_branch_id`, `can_access_announcement_attachment`, `can_manage_announcement_attachment`),
  - storage bucket `announcements-attachments` exists with `public=false`,
  - storage object policies exist for select/insert/update/delete paths.
- Announcements attachments service + smoke checkpoint is now added:
  - service methods in `src/services/supabaseUploadService.js`:
    - `uploadAnnouncementAttachment(...)`
    - `listAnnouncementAttachments(...)`
    - `getAnnouncementAttachmentSignedUrl(...)`
    - `deleteAnnouncementAttachment(...)` (cleanup helper path),
  - smoke script: `scripts/supabase-announcements-attachments-smoke-test.mjs`,
  - command: `npm run test:supabase:announcements:attachments`,
  - checkpoint doc: `docs/announcements-attachments-service-smoke-checkpoint.md`.
- Upload CHECK investigation update:
  - post-024 diagnostics show raw metadata insert (without RETURNING) succeeds,
  - current service CHECKs are isolated to SELECT policy behavior on `INSERT ... RETURNING`,
  - follow-up manual/dev SQL patch draft now exists:
    - `supabase/sql/024_fix_announcements_attachments_insert_rls.sql`,
    - `supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`,
  - `024` keeps parent/student blocked, keeps `parent_facing_media` blocked, and avoids storage public-access widening.
- Announcements attachments smoke PASS checkpoint is now reached after manual `025` apply:
  - PASS HQ create fixture + upload/list/signed URL + no public URL pattern,
  - PASS supervisor own-branch create/publish + upload/signed URL,
  - PASS teacher targeted visibility + `response_upload` upload/list,
  - PASS teacher blocked for `hq_attachment`,
  - PASS parent/student internal attachment list/read blocked-or-empty,
  - PASS cleanup for attachment rows and announcement fixtures.
- CHECK lines in attachment smoke output are now treated as diagnostic evidence only:
  - actor context and insert predicate behavior checks,
  - raw insert without RETURNING confirmation,
  - not failing skips.
- Interpretation now locked:
  - metadata insert-RLS issue addressed by `024` + follow-up,
  - `INSERT ... RETURNING` select-RLS issue addressed by `025`,
  - internal attachment boundary (service + RLS + storage) is proven for main paths.
- Attachments UI remains unwired in this checkpoint.
- Staff Announcements attachments UI wiring is now active in `src/pages/Announcements.jsx`:
  - authenticated non-demo detail panel now wires attachment list/upload/view with existing services only,
  - list uses `listAnnouncementAttachments({ announcementId })`,
  - upload uses `uploadAnnouncementAttachment({ announcementId, file, fileRole, staffNote })`,
  - view uses `getAnnouncementAttachmentSignedUrl({ attachmentId, expiresIn: 300 })` with signed URL open in new tab,
  - no raw `storage_path` shown in UI,
  - demo mode attachment behavior remains local-only fake list/upload/view simulation (no Supabase calls).
- Checkpoint doc:
  - `docs/announcements-attachments-sql-application-checkpoint.md`.
- PASS checkpoint doc:
  - `docs/announcements-attachments-service-smoke-pass-checkpoint.md`.
- Attachments UI checkpoint doc:
  - `docs/staff-announcements-attachments-ui-checkpoint.md`.
- Recommended next milestone now is:
  - **MyTasks integration planning** next,
  - then Company News warm pop-up planning and parent-facing announcement/event planning,
  - live chat feasibility remains later/optional.
- Announcements MyTasks derived-read service milestone is now started:
  - `src/services/supabaseReadService.js` now includes `listMyAnnouncementTasks({ includeDone, statusFilter })`,
  - derived read uses existing RLS-governed announcements/statuses/replies/attachments only,
  - no `storage_path` is exposed in derived task rows,
  - no MyTasks UI integration is included in this checkpoint.
- Announcements MyTasks read smoke script is now added:
  - `scripts/supabase-announcements-mytasks-smoke-test.mjs`,
  - package command: `npm run test:supabase:announcements:mytasks`,
  - fake/dev fixtures only,
  - parent/student internal task visibility remains blocked-or-empty.
- Boundaries unchanged in this checkpoint:
  - no SQL/RLS changes,
  - no notification/email automation,
  - no Company News pop-up behavior,
  - no parent-facing announcements/events.
- Announcements MyTasks read-service checkpoint is now documented in:
  - `docs/announcements-mytasks-read-service-checkpoint.md`
- Latest validation checkpoint:
  - `npm run build` PASS,
  - `npm run lint` PASS,
  - `npm run typecheck` PASS,
  - `npm run test:supabase:announcements:mytasks` PASS,
  - `npm run test:supabase:announcements:phase1` PASS with optional cross-branch CHECK when fixture var is missing,
  - `npm run test:supabase:announcements:attachments` PASS with expected diagnostic CHECK lines.
- Recommended immediate next milestone is now:
  - **Company News warm pop-up planning** (completion overview read + UI checkpoint is now documented).
- Completion overview read-service checkpoint is now added:
  - `src/services/supabaseReadService.js` includes `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted })`,
  - `scripts/supabase-announcements-completion-overview-smoke-test.mjs` now validates HQ/supervisor reads plus teacher/parent/student manager-overview block-or-empty behavior,
  - no SQL/RLS changes, and no notifications/emails in this slice.
- Completion overview UI checkpoint is now added:
  - `src/pages/Announcements.jsx` now renders read-only manager `Completion Overview` for HQ/supervisor only,
  - authenticated non-demo mode reads use existing `listAnnouncementCompletionOverview({ announcementId })`,
  - demo mode keeps local-only fake overview rows for HQ/supervisor and no Supabase reads for that block,
  - teacher manager overview remains hidden in demo and authenticated paths,
  - no SQL/RLS changes, no new services, no reminder/email manager actions, and no notification side effects in this slice.
- Company News UI shell checkpoint is now added:
  - `src/pages/Announcements.jsx` now renders Company News shell cards/detail inside the existing `Company News` filter,
  - demo mode includes local fake Company News rows and HQ demo-only local create shell,
  - warm pop-up panel is preview-only in Company News detail (no app-shell runtime pop-up),
  - authenticated mode does not add real Company News write wiring in this slice,
  - no SQL/RLS changes, no MyTasks side effects, no parent-facing announcements/events, and no notifications/emails.
- Company News UI shell checkpoint doc:
  - `docs/company-news-ui-shell-checkpoint.md`
- Recommended immediate next milestone:
  - runtime warm pop-up planning/data model review (docs-only) before any runtime trigger implementation.
- UI milestone validation note:
  - build/lint/typecheck PASS,
  - announcement smoke scripts completed with DNS `ENOTFOUND` CHECK skips in this environment,
  - rerun smoke scripts when Supabase DNS/network is stable.
- MyTasks UI integration checkpoint is **completed** for Announcements (see `docs/announcements-mytasks-ui-checkpoint.md`):
  - `src/pages/MyTasks.jsx` renders read-only `Announcement Requests` cards from `listMyAnnouncementTasks({ includeDone: true })` in authenticated staff mode,
  - demo mode remains local-only with fake announcement task cards and no Supabase calls for that block,
  - loading/empty/safe-error states for announcement request reads,
  - `Open Announcement` navigates to `/announcements` (or `task.actionUrl` when set) with route `state` carrying `announcementId` for future deep selection.
- Boundaries preserved in MyTasks UI checkpoint:
  - no SQL/RLS changes,
  - no new services,
  - no announcement write/upload actions from MyTasks,
  - no notification/email automation,
  - no Company News pop-up behavior,
  - no parent-facing announcements/events,
  - no live chat.
- Company News popup status SQL/RLS foundation draft is now added at `supabase/sql/026_company_news_popup_status_foundation.sql`:
  - manual/dev-first SQL draft only (not auto-applied),
  - additive-only `announcement_statuses` popup state fields:
    - `popup_seen_at`
    - `popup_dismissed_at`
    - `popup_last_shown_at`,
  - pre-apply review hardening added popup self-update guard function/trigger to block cross-user popup field writes,
  - popup-focused indexes added for future runtime lookup/update paths,
  - existing `read_at`/`last_seen_at`/`done_status` behavior is unchanged,
  - no RLS policy weakening and no parent/student access widening,
  - parent-facing announcements/events and `parent_facing_media` remain out of scope,
  - runtime popup service/UI behavior remains future,
  - notifications/emails remain future.
- Company News popup status SQL application checkpoint is now documented:
  - `docs/company-news-popup-status-sql-application-checkpoint.md`
- `026` is now manually applied in Supabase DEV SQL Editor (`Success. No rows returned.`):
  - no production apply in this checkpoint,
  - verified `announcement_statuses` popup columns exist (`popup_seen_at`, `popup_dismissed_at`, `popup_last_shown_at`),
  - verified popup indexes exist (`announcement_statuses_popup_seen_at_idx`, `announcement_statuses_popup_dismissed_at_idx`, `announcement_statuses_popup_last_shown_at_idx`, `announcement_statuses_profile_popup_idx`),
  - verified popup self-update guard exists:
    - trigger `trg_guard_announcement_statuses_popup_self_update_026`,
    - function `guard_announcement_statuses_popup_self_update_026`,
  - verified `announcement_statuses` policy shape remains unchanged at 4 policies from `020`,
  - no runtime/UI/service changes in this checkpoint.
- Company News popup service + smoke checkpoint is now added:
  - `docs/company-news-popup-service-smoke-checkpoint.md`
- New internal Company News popup service methods are now implemented:
  - `src/services/supabaseReadService.js`:
    - `listEligibleCompanyNewsPopups(...)`
  - `src/services/supabaseWriteService.js`:
    - `markCompanyNewsPopupSeen(...)`
    - `dismissCompanyNewsPopup(...)`
- Focused popup smoke script now exists:
  - `scripts/supabase-company-news-popup-smoke-test.mjs`
  - `npm run test:supabase:company-news:popup`
- Popup service/smoke scope remains constrained:
  - no runtime app-shell popup UI wiring in this milestone,
  - no SQL/RLS changes in this milestone,
  - no notifications/emails/live-chat behavior,
  - no parent-facing announcements/events and no `parent_facing_media`.
- Company News runtime warm popup UI shell is now implemented:
  - app-shell placement: `src/components/layout/AppLayout.jsx`,
  - staff-only popup read uses existing `listEligibleCompanyNewsPopups({ limit: 1 })`,
  - popup seen/dismiss use existing `markCompanyNewsPopupSeen(...)` and `dismissCompanyNewsPopup(...)`,
  - demo role uses local fake popup only (no Supabase popup calls in demo),
  - session guard prevents same-item repeat storms in one session,
  - popup `View` routes to `Announcements` with Company News context.
- Runtime popup wiring preserves boundaries:
  - no SQL/RLS changes,
  - no new services,
  - no notification/email/live chat behavior,
  - no parent-facing announcements/events and no `parent_facing_media`,
  - no real HQ Company News create path in this slice.
- Service checkpoint validation notes:
  - `build`/`lint`/`typecheck` PASS,
  - popup smoke PASS with expected CHECK for direct HQ `company_news` create block under request-first create-path policy,
  - phase1/mytasks/completion announcement smokes PASS (optional cross-branch CHECK still possible without fixture env),
  - npm `devdir` warning is non-blocking.
- Recommended next milestone after runtime popup:
  - **A. Real HQ Company News create path planning** first,
  - rationale: runtime popup display is ready, but safe production Company News creation/publish path is still constrained by request-first create-path behavior.
- Company News create-path SQL draft is now added:
  - `supabase/sql/027_company_news_create_foundation.sql`,
  - manual/dev-first and review-first only (not auto-applied),
  - preserves existing request insert behavior from `022`,
  - adds HQ-only internal staff `company_news` draft insert allowance for MVP,
  - keeps branch supervisor `company_news` create blocked for MVP,
  - keeps teacher/parent/student create blocked,
  - does not widen parent-facing announcements/events scope,
  - does not add notifications/emails or service/UI create wiring in this slice.
- Company News create-path SQL application checkpoint is now completed in DEV:
  - `027` manually applied in Supabase DEV SQL Editor (`Success. No rows returned.`),
  - verified `announcements_insert_020` now references `can_insert_announcement_row_027(...)`,
  - verified helper `can_insert_announcement_row_027(...)` exists,
  - verified scope remains insert-gate only (no select/update/delete policy changes),
  - popup smoke now reports HQ direct `company_news` create PASS,
  - phase1 smoke remains PASS for request workflow regression safety,
  - optional cross-branch negative CHECK remains when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured,
  - no production apply, and no runtime/UI/service changes in this checkpoint.
- Company News create service + smoke checkpoint is now added:
  - `src/services/supabaseWriteService.js` now includes:
    - `createCompanyNews(...)`
    - `publishCompanyNews(...)`
  - focused create smoke script:
    - `scripts/supabase-company-news-create-smoke-test.mjs`
    - `npm run test:supabase:company-news:create`
  - service guards enforce internal Company News draft/publish lifecycle and target requirement before publish,
  - no UI/runtime create wiring in this checkpoint,
  - no SQL/RLS changes in this checkpoint.

## 12) Next immediate milestone prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News runtime warm pop-up planning/data model review only.

Hard constraints:
- Docs/planning only.
- Keep existing Company News UI shell and request workflow behavior unchanged.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not add services.
- Do not use service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs; do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add runtime warm pop-up behavior in this milestone.
- Do not add popup persistence/dismissal backend behavior.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only in demo paths and smoke fixtures.
- No storage_path, staff_note, or raw SQL/RLS/env strings in UI.

Deliverables:
1) Define runtime warm pop-up trigger/frequency/dismissal strategy.
2) Review current data model for popup readiness vs optional extension needs.
3) Keep strict non-goals: no runtime trigger implementation, no notifications/emails, no MyTasks side effects.
4) Update docs/checkpoints only for planning milestone.

Validation efficiency rule:
- Docs-only: run git diff --name-only only unless runtime files change.
```

---

Handoff status: complete for continuity. Use this file as the primary context anchor before starting the next milestone.

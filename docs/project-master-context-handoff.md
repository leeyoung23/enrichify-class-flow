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
- Provider integration remains unwired/disabled; no provider keys added; draft-only and teacher-approval gate remain unchanged.
- AI homework feedback remains a future milestone after full human workflow hardening.
- Notification/email workflow remains a future milestone.

## 12) Next immediate milestone prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
School/curriculum onboarding foundation planning only.

Scope rules:
- Planning/docs only.
- Do not implement runtime code.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Supabase SQL in this step.
- Do not change storage policies.
- Do not upload files.
- Do not call AI APIs.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.

Deliverables:
1) A planning document for school/curriculum onboarding foundation:
   - target onboarding workflow (HQ + branch + teacher touchpoints)
   - required entities/relationships already present vs missing
   - role/RLS visibility matrix
   - minimal phased rollout plan (read-first, then write)
   - dependencies for homework and AI milestones
   - risks, non-goals, and validation scope
2) Clear recommendation of first implementation slice after planning.

Validation efficiency rule:
- Docs-only change.
- Run only:
  - git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files changed.
```

---

Handoff status: complete for continuity. Use this file as the primary context anchor before starting the next milestone.

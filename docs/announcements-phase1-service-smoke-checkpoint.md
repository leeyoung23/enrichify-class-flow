# Announcements Phase 1 Service Smoke Checkpoint

Checkpoint scope: documentation only for Announcements Phase 1 service + smoke milestone.
Current status update:

- `021` fake fixture activation SQL is manually applied in Supabase dev.
- `022` Announcements insert/select RLS fix SQL is manually applied in Supabase dev.
- Core Announcements Phase 1 smoke now passes.
- Main backend service/RLS boundaries are proven for HQ/supervisor/teacher/parent/student paths.

## 1) What was implemented

- Added Phase 1 Announcements read service methods.
- Added Phase 1 Announcements write service methods.
- Added Announcements Phase 1 smoke test script.
- Added package command `test:supabase:announcements:phase1`.
- No app UI changes in this milestone.
- No runtime page behavior changes in this milestone.
- No Supabase SQL/RLS changes in this milestone.

## 2) Files changed

- `src/services/supabaseReadService.js`
- `src/services/supabaseWriteService.js`
- `scripts/supabase-announcements-phase1-smoke-test.mjs`
- `package.json`
- `.env.example`
- `docs/announcements-phase1-sql-application-checkpoint.md`
- `docs/announcements-sql-rls-data-model-review.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

## 3) Read service methods added

Methods:

- `listAnnouncements({ status, audienceType, announcementType, doneStatus })`
- `listAnnouncementTargets({ announcementId })`
- `listAnnouncementStatuses({ announcementId, profileId, doneStatus })`
- `listAnnouncementReplies({ announcementId })`

Service behavior notes:

- Stable `{ data, error }` shape.
- UUID/filter validation included.
- Uses anon client + current JWT + RLS only.
- Internal-staff-safe defaults where appropriate (no parent-facing assumptions in this phase).

## 4) Write service methods added

Methods:

- `createAnnouncementRequest(...)`
- `publishAnnouncement({ announcementId })`
- `markAnnouncementRead({ announcementId })`
- `updateAnnouncementDoneStatus({ announcementId, doneStatus, undoneReason })`
- `createAnnouncementReply({ announcementId, body, replyType })`

Service behavior notes:

- `createAnnouncementRequest` forces `announcement_type='request'`.
- `audience_type='internal_staff'`.
- Safe default `status='draft'`.
- `created_by_profile_id` from authenticated user.
- Optional target insert support.
- No attachments in this milestone.
- No notification/email behavior in this milestone.
- No parent-facing rows in this milestone.

## 5) Smoke test coverage

Script:

- `scripts/supabase-announcements-phase1-smoke-test.mjs`
- command: `npm run test:supabase:announcements:phase1`

Coverage scope:

- HQ create check
- Branch supervisor own-branch create/publish check
- Teacher create-block check
- Teacher targeted read/status/reply checks where fixtures exist
- Parent/student internal_staff read-block checks
- Optional cross-branch supervisor target negative check
- No attachment/public URL behavior in this milestone

## 6) Smoke PASS result

- PASS HQ Admin: create announcement request succeeded
- PASS Branch Supervisor: create own-branch announcement request succeeded
- PASS Branch Supervisor: publish announcement succeeded
- PASS Teacher: create announcement blocked as expected
- PASS Branch Supervisor: targeted teacher profile fixture created
- PASS Teacher: targeted published announcement is visible
- PASS Teacher: mark announcement read succeeded
- PASS Teacher: update done_status=done succeeded
- PASS Teacher: update done_status=undone succeeded
- PASS Teacher: structured reply insert as self succeeded
- PASS Teacher: list statuses call succeeded
- PASS Teacher: list replies call succeeded
- PASS Teacher: list targets call succeeded under current RLS
- PASS Parent: internal_staff announcement read blocked/empty as expected
- PASS Student: internal_staff announcement read blocked/empty as expected
- PASS No attachment/public URL behavior was exercised in this Phase 1 smoke test
- PASS Cleanup removed fake announcements

## 7) CHECK note

- Cross-branch target-write negative check still CHECK-skips because `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing.
- This is optional fixture coverage only.
- Main create/read/status/reply path is proven.
- No unsafe access behavior observed.

## 8) Interpretation

- Inactive fake staff fixture issue is resolved.
- Create-path RLS insert/select issue is resolved.
- HQ can create request announcements.
- Branch supervisor can create/publish own-branch request announcements.
- Teacher cannot create but can read targeted published announcements.
- Teacher can mark read/done/undone and can reply.
- Parent/student cannot read internal_staff announcements.
- Cleanup of fake created rows is working.

## 9) Safety boundaries

- No parent-facing access yet.
- No attachments.
- No public URLs.
- No auto emails/notifications.
- No live chat.
- No frontend service-role usage.
- No UI changes yet in this checkpoint.

## 10) What remains future

- Staff Announcements UI shell with demo parity.
- Real Announcements UI wiring.
- Attachments.
- MyTasks integration.
- Company News pop-up.
- Parent-facing announcements/events.
- Optional live chat much later.
- Optional cross-branch negative fixture coverage.

## 11) Recommended next milestone

Options:

- A. Staff Announcements UI shell with demo parity
- B. Real Announcements UI wiring
- C. Attachments SQL/RLS
- D. MyTasks integration plan
- E. Company News pop-up design

Recommendation: **A. Staff Announcements UI shell with demo parity**.

Why A first:

- Backend/service/RLS core path is proven.
- UI shell can be shaped safely without real-write wiring first.
- Demo parity helps validate workflow before real UI wiring.
- Attachments/MyTasks/Company News remain later phases.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements Phase 1 service smoke test

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Investigate Announcements create/RLS smoke CHECK skips only.

Hard constraints:
- Do not change app UI.
- Do not change runtime page behavior.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add services beyond focused investigation scaffolding if absolutely needed.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails/notifications.
- Do not start live chat.

Deliverables:
1) Identify why HQ/supervisor create checks are blocked in current fixture context.
2) Identify why targeted teacher flow prerequisites are unavailable.
3) Verify whether issue is fixture data, role/profile mapping, or service payload assumptions.
4) Keep changes minimal and safe; no policy weakening.
5) Update docs with root-cause and next safe action.

Validation efficiency rule:
Run only commands/tests required by actual changed files.
```

## 11) Validation efficiency rule

Docs-only change for this checkpoint.

Run:

- `git diff --name-only`

Do not run build/lint/smoke suite unless runtime files change.

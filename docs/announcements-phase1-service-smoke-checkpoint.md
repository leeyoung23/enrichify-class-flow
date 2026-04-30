# Announcements Phase 1 Service Smoke Checkpoint

Checkpoint scope: documentation only for Announcements Phase 1 service + smoke milestone.

Fixture activation update:

- `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql` is now drafted for manual dev-only use.
- `021` is not auto-applied and has not been applied by this checkpoint update.
- `021` only targets fake `example.test` fixture activation/alignment for smoke prerequisites.
- `021` does not weaken RLS and does not introduce real data.

Insert RLS investigation update:

- Root cause shifted after `021` fixture activation: active fake staff profiles now exist, but create still CHECK-skipped.
- `createAnnouncementRequest(...)` uses `insert(...).select(...)` (INSERT RETURNING).
- RETURNING requires inserted rows to satisfy `announcements` SELECT policy.
- Previous SELECT policy depended on table lookup helper path (`can_access_announcement(id)`), which is fragile for create-path row visibility timing.
- Fix drafted in SQL patch `supabase/sql/022_fix_announcements_insert_rls.sql` with direct row-predicate SELECT/INSERT checks for create path.
- `022` is manual/dev-only draft and is not auto-applied.

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

## 6) CHECK/WARNING notes

Current safe CHECK skips:

- HQ create check skipped because RLS blocked in current fixture context.
- Supervisor create check skipped because RLS blocked in current fixture context.
- Teacher targeted flow skipped because create fixtures were unavailable.
- Cross-branch negative check skipped because fixture prerequisite was unavailable.

Updated root-cause diagnosis:

- Initial blocker was inactive staff fixtures (`is_active=false`) before `021`.
- After manual `021` apply and active fixtures, create still failed due create-path RLS behavior.
- Insert write path uses RETURNING, so SELECT policy also gates created rows.
- `022` addresses this by using direct row predicates for `announcements_select_020` and `announcements_insert_020` while preserving:
  - HQ internal-staff create,
  - own-branch supervisor create only,
  - teacher create blocked,
  - parent/student blocked,
  - parent-facing create blocked in Phase 1.

Interpretation:

- Smoke script exits successfully with these CHECK outcomes.
- CHECK does not mean policy weakening.
- But create/target flows are not fully proven yet in current fixture context.
- A focused fixture/RLS/service investigation is needed before UI wiring.

## 7) Tests run

- `git diff --name-only`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:announcements:phase1`

## 8) What remains future

- Manual review/apply of `021` fake fixture activation in Supabase dev SQL Editor.
- Rerun `npm run test:supabase:announcements:phase1` after manual apply and record proof.
- Keep UI wiring blocked until create/status/reply path is proven with active fake staff fixtures.
- Resolve CHECK skips and fully prove create paths.
- Staff Announcements UI shell.
- Attachments.
- MyTasks integration.
- Company News pop-up.
- Parent-facing announcements/events.
- Live chat.
- Auto emails/notifications.

## 9) Recommended next milestone

Options:

- A. Investigate Announcements create/RLS smoke CHECK skips
- B. Staff Announcements UI shell with demo parity
- C. Attachments SQL/RLS
- D. MyTasks integration plan
- E. Company News pop-up design plan

Recommendation: **A. Investigate Announcements create/RLS smoke CHECK skips**.

Why A first:

- Service methods already exist.
- Smoke test already exists.
- HQ/supervisor create flows are not fully proven yet due fixture active-state mismatch.
- UI should wait until service/RLS create path is confirmed.
- Prevents building UI over broken or fixture-dependent backend behavior.

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

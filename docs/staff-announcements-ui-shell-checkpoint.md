# Staff Announcements UI Shell Checkpoint

Checkpoint scope: documentation only for Staff Announcements UI shell milestone.

## 1) What was implemented

- Announcements page shell (`src/pages/Announcements.jsx`).
- Route added: `/announcements`.
- Staff-only navigation tab added after `Dashboard` (HQ/supervisor/teacher).
- Demo request/reminder cards.
- Detail panel with local interaction controls.
- Filters: `Requests`, `Company News`, `Done`, `Pending`.
- `Create Request` shell.
- Company News placeholder (no pop-up behavior).
- Attachment placeholder only (`Attachments coming in Phase 2`).

## 2) Files changed in the milestone

- `src/pages/Announcements.jsx`
- `src/App.jsx`
- `src/services/permissionService.js`
- `src/components/layout/Sidebar.jsx`
- `docs/staff-announcements-ui-shell-checkpoint.md`
- `docs/announcements-phase1-smoke-pass-checkpoint.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) demoRole behavior

- Local fake data only.
- Local-only actions:
  - mark read
  - mark done
  - mark undone
  - add reply
  - create request local save (HQ/supervisor demo only)
- Teacher demo cannot create.
- No Supabase calls.
- No real files.
- No notifications/emails.

## 4) Authenticated mode behavior

- Preview-only in this milestone.
- Safe copy shown: "Announcements wiring is coming next. Backend Phase 1 service/RLS is ready."
- No:
  - `listAnnouncements(...)`
  - `createAnnouncementRequest(...)`
  - `publishAnnouncement(...)`
  - `markAnnouncementRead(...)`
  - `updateAnnouncementDoneStatus(...)`
  - `createAnnouncementReply(...)`
- Optional create affordance is disabled/preview-only.

## 5) Safety boundaries

- No SQL or RLS changes.
- No attachment upload.
- No MyTasks integration.
- No Company News pop-up behavior.
- No parent-facing announcements.
- No live chat.
- No auto emails/notifications.
- No service-role frontend usage.
- Fake/dev data only in demo mode.

## 6) Validation result

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:announcements:phase1` PASS with optional CHECK:
  - cross-branch negative check skipped when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing.
- Cross-branch CHECK remains optional fixture coverage only.

## 7) What remains future

- Real authenticated Announcements service wiring.
- Attachments.
- MyTasks integration.
- Company News warm pop-up.
- Parent-facing announcements/events.
- Optional live chat much later.
- Optional cross-branch negative fixture env setup.

## 8) Recommended next milestone

Options:

- A. Real authenticated Announcements UI wiring
- B. Attachments SQL/RLS
- C. MyTasks integration plan
- D. Company News pop-up design
- E. Parent-facing announcements/events plan

Recommendation: **A. Real authenticated Announcements UI wiring**.

Why A first:

- Backend/service/RLS is already proven by smoke.
- UI shell already exists.
- The next missing step is wiring read/status/reply/create to existing service methods.
- Attachments/MyTasks/Company News should wait until core authenticated workflow is real.

## 9) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Staff Announcements UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Real authenticated Announcements UI wiring only.

Hard constraints:
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add attachments in this milestone.
- Do not add MyTasks integration in this milestone.
- Do not add Company News pop-up behavior in this milestone.
- Do not add parent-facing announcements in this milestone.
- Do not start live chat.
- Do not auto-send emails/notifications.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.

Deliverables:
1) Wire authenticated staff mode to existing announcements read/write service methods.
2) Keep demoRole local fake behavior unchanged.
3) Preserve current role boundaries (teacher cannot create; parent/student blocked from internal_staff path).
4) Update docs checkpoint.

Validation efficiency rule:
Run only what matches changed files.
If runtime files change, run build/lint/typecheck and announcements smoke.
```

## 10) Validation efficiency rule

Docs/checkpoint only.

Run:

- `git diff --name-only`

Do not run build/lint/smoke suite unless runtime files change.

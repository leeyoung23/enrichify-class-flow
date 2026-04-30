# Staff Announcements Attachments UI Checkpoint

Date: 2026-05-01  
Scope: checkpoint documentation only for existing Staff Announcements attachment UI wiring

## 1) What was implemented

- Attachment query now runs when selected announcement changes.
- Attachment cards are rendered in the detail panel.
- Upload controls are available in the detail panel for allowed staff roles.
- Signed URL view/open action is wired.
- Demo mode attachment behavior remains local-only.
- Upload role selection is role-aware with file-role limits.

## 2) Files changed

- `src/pages/Announcements.jsx`
- `docs/announcements-attachments-service-smoke-pass-checkpoint.md`
- `docs/staff-announcements-ui-real-wiring-checkpoint.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`
- `docs/staff-announcements-attachments-ui-checkpoint.md`

## 3) Authenticated attachment list behavior

- Uses `listAnnouncementAttachments({ announcementId })` for selected announcement.
- Cards show file name, file role, mime type, size, created date, and optional staff note.
- Loading, empty, and generic error states are present.
- No `storage_path` display.
- No raw SQL/RLS/env leakage in UI copy.

## 4) Authenticated upload/view behavior

- Detail panel includes upload controls:
  - role selector (restricted by role),
  - file input,
  - optional staff note,
  - upload action.
- Upload uses `uploadAnnouncementAttachment({ announcementId, file, fileRole, staffNote })`.
- On upload success, form resets and attachment query is invalidated/refreshed.
- View uses `getAnnouncementAttachmentSignedUrl({ attachmentId, expiresIn: 300 })`.
- Signed URL opens with `noopener,noreferrer`.
- Error toasts stay generic/safe.

## 5) demoRole behavior

- Local fake attachment list is kept per demo announcement.
- Local fake upload simulation is used.
- Local fake view toast is used.
- No Supabase attachment calls in demo mode.
- No real files required in demo mode.
- Teacher demo uses `response_upload` only.
- HQ/supervisor demo uses internal attachment roles only.

## 6) Safety boundaries

- No SQL/RLS changes.
- No SQL apply.
- No MyTasks integration.
- No Company News pop-up.
- No parent-facing announcements/events.
- No live chat.
- No notifications/emails.
- No `parent_facing_media` enablement.
- No service-role frontend.
- No provider/API keys.

## 7) Validation result

- `git diff --name-only` executed for checkpoint validation.
- `npm run build` PASS.
- `npm run lint` PASS.
- `npm run typecheck` PASS.
- `npm run test:supabase:announcements:attachments` PASS with expected diagnostic `CHECK` lines.
- `npm run test:supabase:announcements:phase1` PASS with expected optional `CHECK` for missing `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`.

## 8) What remains future

- Attachment delete UI.
- MyTasks integration.
- Company News warm pop-up.
- Parent-facing announcements/events.
- Notification/email automation.
- Live chat (optional later).
- Reports/PDF/AI OCR later.

## 9) Recommended next milestone

Options:

- A. MyTasks integration planning
- B. Company News warm pop-up planning
- C. Parent-facing announcements/events planning
- D. Attachment delete UI
- E. Reports/PDF/AI OCR plan

Recommendation: **A. MyTasks integration planning**.

Why A first:

- Internal request/reply/upload loop now works.
- MyTasks is the natural next layer for pending/done/undone work tracking.
- Company News and parent-facing announcements can wait.
- Delete UI is lower priority than task visibility.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
MyTasks integration planning for Announcements requests only.

Hard constraints:
- Docs/planning only.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat in this milestone.
- Do not add Company News pop-up.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.

Deliverables:
1) Planning doc for Announcements -> MyTasks integration:
   - request to task mapping model,
   - pending/done/undone state linkage,
   - role visibility matrix (HQ/supervisor/teacher),
   - non-goals and safety boundaries.
2) Proposed phased rollout and validation scope.
3) Recommended first implementation slice.

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

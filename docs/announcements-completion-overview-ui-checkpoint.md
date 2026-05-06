# Announcements Completion Overview UI Checkpoint

Date: 2026-05-01  
Scope: documentation checkpoint for HQ/supervisor read-only completion overview UI wiring in `Announcements` detail panel

## Documentation-only note

- This milestone updates documentation only.
- Validation for this checkpoint: `git diff --name-only` only (no build/lint/smoke rerun unless runtime files change).

## 1) What was implemented

- Added read-only `Completion Overview` block in `src/pages/Announcements.jsx` detail panel.
- Authenticated HQ/supervisor path reads existing `listAnnouncementCompletionOverview({ announcementId })`.
- Demo mode includes local fake completion overview for HQ/supervisor only.
- Teacher remains hidden from manager overview UI and does not query it.
- Summary metrics are shown as stacked/wrapped cards/badges.
- Per-person completion rows/cards are rendered in read-only form.
- No manager actions were added (no reminder/email/export/force-done).

## 2) Files changed

- `src/pages/Announcements.jsx`
- `docs/announcements-completion-overview-ui-checkpoint.md`
- `docs/announcements-completion-overview-read-service-checkpoint.md`
- `docs/announcements-completion-overview-plan.md`
- `docs/staff-announcements-ui-real-wiring-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) demoRole behavior

- Local fake completion overview exists for HQ/supervisor demo only.
- Teacher demo does not see manager overview.
- No Supabase calls are made for completion overview in demo mode.
- Fake rows include read/done/reply/upload variation.
- No reminder/email/write actions in demo path.

## 4) Authenticated read behavior

- HQ/supervisor reads completion overview for the selected announcement.
- Teacher does not render the completion overview section and does not run the query.
- UI states include loading, empty, and safe generic error copy.
- No raw SQL/RLS/env strings are shown.
- No `storage_path` or `staff_note` exposure in this overview UI.

## 5) Summary UI behavior

Cards/badges show:

- total targeted
- read/unread
- done/pending/undone
- response provided/missing
- upload provided/missing
- overdue
- latest reply
- latest upload

## 6) Per-person UI behavior

Per-person cards/rows show:

- staff name
- role
- branch
- read state
- done status
- reply/upload counts
- response/upload provided/missing
- overdue badge
- last activity
- undone reason (when present)

Not shown:

- `storage_path`
- `staff_note`
- attachment content preview

## 7) Safety boundaries

- no SQL/RLS changes
- no SQL apply
- no new services
- no MyTasks write actions
- no Company News pop-up
- no parent-facing announcements/events
- no `parent_facing_media`
- no notifications/emails
- no live chat
- no manager actions (reminder/email/export/force-done)
- no service-role frontend usage

## 8) Validation result

Recorded from UI milestone `f6c38c1`:

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:announcements:completion` completed with DNS `ENOTFOUND` CHECK skips in this environment
- `npm run test:supabase:announcements:mytasks` completed with DNS `ENOTFOUND` CHECK skips in this environment
- `npm run test:supabase:announcements:phase1` completed with DNS `ENOTFOUND` CHECK skips in this environment
- `npm run test:supabase:announcements:attachments` completed with DNS `ENOTFOUND` CHECK skips in this environment
- DNS CHECK lines indicate connectivity/environment issues, not backend-proof failure
- Recommended follow-up: rerun announcement smoke scripts when Supabase DNS/network is stable

## 9) What remains future

- rerun announcement smoke scripts when network is stable
- Company News warm pop-up planning
- parent-facing announcements/events
- notification/email automation
- optional SQL view/RPC optimization if scale/performance requires
- reports/PDF/AI OCR
- attendance email notification

## 10) Recommended next milestone

Choose:

- **A.** Company News warm pop-up planning
- **B.** Notification/email automation planning
- **C.** Parent-facing announcements/events planning
- **D.** Rerun smoke validation only
- **E.** Reports/PDF/AI OCR plan

**Recommendation: A first (Company News warm pop-up planning).**

Why A first:

- Internal request/document/task/overview loop is now complete at a strong prototype level.
- Company News is the second major Announcements mode in the original product vision.
- Notifications/emails should wait until communication states are mature and less noisy.
- Parent-facing announcements should follow after staff-facing Company News patterns are shaped.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements completion overview UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News warm pop-up planning only.

Hard constraints:
- Docs/planning only.
- Do not change app UI or runtime logic in this milestone.
- Do not add services.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not use service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs; do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add parent-facing announcements/events in this milestone.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only in examples.

Deliverables:
1) Company News warm pop-up product shape (timing, dismissal, role scope, non-goals).
2) Safety boundaries and rollout phases.
3) Validation scope and acceptance checklist for a later implementation milestone.

Validation efficiency rule:
- Docs-only checkpoint.
- Run: git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files change.
```

# Announcements MyTasks UI Checkpoint

Date: 2026-05-01  
Scope: checkpoint documentation for MyTasks **Announcement Requests** UI (read-only; existing read service only)

## 1) What was implemented

- **MyTasks Announcement Requests** section with a summary card group (totals / pending / overdue / done) and stacked task cards below.
- **Authenticated read** using existing `listMyAnnouncementTasks({ includeDone: true })` in non-demo staff mode (no new services).
- **Demo mode**: local-only fake announcement task cards; no Supabase calls for this section.
- **Read-only task cards**: no mark read, reply, upload, or done actions from MyTasks for announcements.
- **Open Announcement**: navigates to `/announcements` and passes `announcementId` in **route state** for future deep-selection support (Announcements page does not consume it yet unless added later).

## 2) Files changed (implementation milestone)

- `src/pages/MyTasks.jsx`
- `docs/announcements-mytasks-ui-checkpoint.md` (this file)
- `docs/announcements-mytasks-read-service-checkpoint.md`
- `docs/announcements-mytasks-integration-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) demoRole behavior

- **Local fake announcement task cards only** for the Announcement Requests block; no Supabase calls for that block.
- **Sample tasks** cover: unread, response-required, upload-required, overdue, and done request shapes (fake IDs and copy only).
- **Open Announcement** only **navigates** (and passes optional route state); no toast-only requirement beyond existing page patterns.
- **No real** status / reply / upload **writes** from MyTasks for announcements in demo mode.

## 4) Authenticated read behavior

- **Non-demo staff** path calls `listMyAnnouncementTasks({ includeDone: true })` when Supabase auth + app user are available.
- **Loading**: dedicated loading copy while the read is in flight.
- **Empty**: clear empty state when the derived list has no rows.
- **Safe generic error**: e.g. session missing or read failure uses non-technical copy; **no raw SQL/RLS/env** strings in UI.
- **No `storage_path` exposure** in task rows (read service does not return it; UI does not display it).

## 5) Task card behavior

Each card shows:

- **Title**
- **Source badge**: `Announcement`
- **Priority** badge
- **Status** badge: `unread` / `pending` / `undone` / `overdue` / `done`
- **Due date** when present
- **Requires response** context (label + provided/missing posture where applicable)
- **Requires upload** context (label + provided/missing posture where applicable)
- **Reply count**
- **Attachment count**
- **Open Announcement** button (`min-h-10` for touch)
- **Read-only**: no announcement write controls on the card.

## 6) Navigation behavior

- **Open Announcement** navigates to **`/announcements`**.
- Uses **`task.actionUrl`** when the service provides a non-empty string; otherwise **`/announcements`**.
- Passes **`announcementId`** in **React Router `state`** for future deep-selection (Announcements route unchanged; deep-select from state is **future** unless explicitly wired on `Announcements.jsx` later).

## 7) Safety boundaries

- **No SQL/RLS changes** in this UI milestone.
- **No new services**; only existing `listMyAnnouncementTasks`.
- **No service-role** usage in frontend.
- **No MyTasks** announcement **write / status / reply / upload** actions.
- **Staff-only** internal task visibility (MyTasks access remains staff roles; parent/student do not see this internal Announcement Requests section).
- **No Company News** pop-up.
- **No parent-facing** announcements/events.
- **No notifications/emails** and **no live chat** from this work.
- **`parent_facing_media`** not enabled.

## 8) Validation result

Recorded from the UI wiring milestone run:

- `npm run build` PASS  
- `npm run lint` PASS  
- `npm run typecheck` PASS  
- `npm run test:supabase:announcements:mytasks` PASS  
- `npm run test:supabase:announcements:phase1` PASS with optional **CHECK** when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing  
- `npm run test:supabase:announcements:attachments` PASS with expected diagnostic **CHECK** lines  
- npm warning **`Unknown env config "devdir"`** is **non-blocking** if observed  

*This documentation-only checkpoint does not re-run the suite unless runtime files change.*

## 9) What remains future

- **Completion overview helper** for HQ/supervisor (cross-target / branch monitoring).
- **Optional SQL view/RPC** optimization only if read patterns outgrow client/service derivation.
- **Materialized task records** later for reminder / SLA / escalation durability.
- **Company News** warm pop-up.
- **Parent-facing** announcements/events.
- **Notification/email** automation (after task/completion posture is reliable in product).
- **Reports/PDF/AI OCR** later.

## 10) Recommended next milestone

Choose:

- **A.** Completion overview helper for HQ/supervisor  
- **B.** Company News warm pop-up planning  
- **C.** Parent-facing announcements/events planning  
- **D.** Notification/email automation planning  
- **E.** Reports/PDF/AI OCR plan  

**Recommendation: A (Completion overview helper for HQ/supervisor).**

Why **A** first:

- Staff can already see **their own** announcement tasks in MyTasks.
- HQ and branch supervisors need **completion visibility across targets** (operational monitoring layer).
- That layer should be solid before **Company News** or **parent-facing** surfaces expand scope.
- **Notifications/emails** should wait until task and completion semantics are trustworthy end-to-end.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document MyTasks Announcement Requests UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Announcements completion overview helper — planning/review only.

Hard constraints:
- Planning/docs/review only (unless you explicitly add a read helper in a later milestone after sign-off).
- Do not change app UI unless a separate milestone approves it.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not add new services without explicit scope approval.
- Do not use service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs; do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add Company News pop-up or parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only in examples and tests.

Deliverables:
1) Product shape for HQ vs branch supervisor “completion overview” (what rows mean, what is drill-down vs summary).
2) Read-model options: extend listMyAnnouncementTasks vs new listAnnouncementCompletionOverview(...) vs SQL view/RPC — with RLS/privacy notes.
3) Role matrix: who sees which overview rows (teacher self vs supervisor branch vs HQ global).
4) Non-goals: no notification fan-out, no parent/student internal visibility, no storage_path leakage.
5) Phased rollout: planning first, then smallest read-only implementation slice.

Validation:
- Docs-only: run git diff --name-only only unless runtime files change.
```

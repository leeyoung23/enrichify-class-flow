# Announcements MyTasks Derived Read Review

Date: 2026-05-01  
Scope: review only for safest Announcements -> MyTasks derived-read strategy (no UI/service/SQL implementation in this milestone)

## Checkpoint update (read service + smoke added)

- `listMyAnnouncementTasks({ includeDone, statusFilter })` is now added in `src/services/supabaseReadService.js`.
- New smoke script is now added:
  - `scripts/supabase-announcements-mytasks-smoke-test.mjs`
  - command: `npm run test:supabase:announcements:mytasks`
- No MyTasks UI integration is included in this checkpoint.
- No SQL/RLS changes are included in this checkpoint.
- No notification/email automation is added in this checkpoint.
- Parent-facing announcements/events remain out of scope.
- Build/lint/typecheck and related announcement smoke commands are now passing in this checkpoint.
- Expected optional CHECK behavior remains:
  - phase1 smoke optional cross-branch CHECK when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured,
  - attachment smoke diagnostic CHECK lines for predicate/context evidence.

## 1) Current state

- Announcements request workflow is real for staff (create/read/reply/read-status/done-status).
- Staff attachment workflow is real for internal announcements (upload/list/view via signed URL).
- `MyTasks` does not currently surface announcement-derived tasks.
- No notification/email automation is active for announcements in current runtime.

## 2) Product goal

- Staff should not miss HQ/supervisor operational requests.
- Pending response/upload obligations should appear in MyTasks as actionable items.
- HQ/supervisor should be able to monitor completion posture without separate manual tracking.
- Teachers should see only targeted work relevant to their own profile/role/branch scope.

## 3) Derived task definition

Treat an announcement as a MyTasks candidate when all baseline scope rules pass, then compute per-user task posture.

Baseline scope rules:

- `announcements.status = 'published'`
- `announcements.audience_type = 'internal_staff'`
- actor is targeted to the announcement (direct profile target, role target, or branch target)

Derived task condition flags (per actor):

- `done_status` pending/undone -> active obligation
- unread (`read_at` null) -> unread obligation
- `requires_response = true` and actor has no reply row -> response missing
- `requires_upload = true` and actor has no `response_upload` attachment row -> upload missing
- `due_date` before today with unresolved obligation -> overdue

Derived status priority (recommended):

1. `overdue` (due date passed and still unresolved)  
2. `done` (explicit done status)  
3. `undone` (explicit undone status)  
4. `pending` (default unresolved state)  
5. `unread` (presentation badge/state dimension; can coexist with pending)

Implementation note for MVP semantics:

- Keep `done` as explicit user lifecycle state.
- Keep response/upload completion as separate evidence dimensions; do not auto-convert them into `done`.

## 4) Proposed derived read shape

Recommended `listMyAnnouncementTasks(...)` row shape:

- `taskId` (stable synthetic id) or `announcementId` (UUID)
- `source` = `announcement`
- `title`
- `subtitle` or `bodyPreview`
- `priority`
- `dueDate`
- `status` (`unread` / `pending` / `undone` / `done` / `overdue`)
- `requiresResponse`
- `responseProvided`
- `requiresUpload`
- `uploadProvided`
- `replyCount` (actor or total, choose explicitly in API contract)
- `attachmentCount` (safe metadata count only; no storage path)
- `actionUrl` or `announcementId` for route handoff
- `createdAt`
- `updatedAt`

Suggested optional helpers:

- `isTargetedBy` = `profile|role|branch`
- `isDueSoon` (for UI badge)
- `isUnread` boolean even when status remains `pending`

## 5) Data source options

### A) Client/service derives from existing read methods

Source inputs:

- `listAnnouncements({ audienceType: 'internal_staff' })`
- `listAnnouncementStatuses(...)`
- `listAnnouncementReplies(...)`
- `listAnnouncementAttachments(...)`

Pros:

- Fastest MVP with no schema change.
- Reuses proven tables and RLS.
- Avoids duplicated task-state persistence.

Risks:

- N+1 fetch pattern if detail calls are per announcement.
- Client-side merge logic grows quickly (status/reply/upload/due rules).
- Harder to keep role-specific overview metrics efficient.

### B) SQL view/RPC derives tasks server-side under RLS

Pros:

- Single normalized read shape for MyTasks.
- Cleaner and more consistent status derivation in one place.
- Better long-term maintainability and query efficiency as volume grows.

Risks:

- Requires SQL addition/review (separate milestone).
- Must be carefully reviewed to preserve current RLS boundaries.

### C) Materialized `announcement_task_links` table

Pros:

- Durable task rows for reminders/escalations/SLA and historical analytics.
- Simpler downstream querying once durable workflows are needed.

Risks:

- Duplicated state and sync drift risk from announcements source-of-truth.
- Higher write-path complexity and reconciliation burden too early.

### Recommendation

Recommended strategy: **A first with an implementation shape that can graduate to B**.

Reasoning:

- Current announcement/status/reply/attachment model and RLS are already real and validated.
- Announcement volume is expected to be small initially, so derived read in service layer is acceptable for MVP.
- Keep C deferred until reminders/escalations/SLA require durable task records.

Practical refinement:

- Implement A as a single read-service method (`listMyAnnouncementTasks`) that centralizes derivation logic and hides N+1 internals.
- If A reveals query complexity/perf pressure during smoke usage, next step is B (view/RPC), not C.

## 6) RLS/privacy implications

- Derive only from rows already visible through existing RLS (`announcements`, `announcement_statuses`, `announcement_replies`, `announcement_attachments`).
- Teacher: only targeted own tasks; no cross-branch leakage.
- Branch supervisor: own-branch scope only (plus own targeted items).
- HQ: global internal-staff scope by policy.
- Parent/student: no internal announcement tasks.
- No `storage_path` exposure in task payload.
- Frontend remains anon client + JWT; no service-role key in frontend.

## 7) Performance/complexity considerations

- Initial announcement volume is likely small; client/service derivation is acceptable for MVP.
- Main complexity is data stitching (status + replies + response uploads + due-date posture).
- Server-side derived view/RPC may become cleaner once MyTasks needs richer aggregate reporting.
- Avoid introducing a durable materialized task table before reminder/SLA/escalation requirements exist.

## 8) MyTasks UI implications

Planned implications (future implementation milestone):

- Add `Announcement Requests` section in MyTasks.
- Show badge counts for pending/unread/overdue.
- Primary action: `Open Announcement`.
- Show overdue/due-soon indicators.
- Show `Response required` and `Upload required` badges.
- Do not upload files directly in MyTasks for MVP; route to Announcements detail.

## 9) Completion semantics

- `done` remains explicit user action (`updateAnnouncementDoneStatus`).
- Upload does not auto-mark done in MVP.
- Reply does not auto-mark done in MVP.
- Show `responseProvided` / `uploadProvided` separately from lifecycle done state.
- HQ/supervisor interpret completion posture using combined lifecycle + evidence flags.

## 10) Testing plan

Future targeted tests:

- Teacher sees targeted pending announcement task.
- Teacher does not see unrelated announcement task.
- Supervisor sees own-branch completion overview.
- HQ sees global completion overview.
- Parent/student are blocked from internal announcement tasks.
- `uploadProvided` flips after `response_upload` attachment exists.
- `replyCount` updates after reply creation.
- No notification/email side effect is triggered by derived reads.

## 11) Recommended next milestone

Choose:

- A. MyTasks UI integration for Announcement Requests
- B. Completion overview helper for HQ/supervisor
- C. SQL view/RPC optimization
- D. Company News pop-up planning
- E. Parent-facing announcements/events planning

Recommendation: **A. MyTasks UI integration for Announcement Requests**.

Why A first:

- Read service and smoke behavior are now proven.
- MyTasks can safely render announcement-derived tasks from existing data.
- Completion overview can follow after staff task list visibility is live.
- Company News and parent-facing features remain later milestones.

## 12) Next implementation prompt

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Announcements MyTasks derived read review

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
MyTasks UI integration for Announcement Requests only.

Hard constraints:
- Do not change Supabase SQL/RLS.
- Do not apply SQL.
- Do not add service-role usage in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add Company News pop-up behavior.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallbacks.

Deliverables:
1) Add `Announcement Requests` section in `MyTasks`.
2) Use `listMyAnnouncementTasks(...)` as read source.
3) Render badges and due indicators for status/response/upload posture.
4) Add `Open Announcement` action routing to `/announcements`.
5) Keep upload action out of MyTasks (route to Announcements detail).
6) Keep safe generic error copy (no SQL/RLS/env detail leakage).

Validation rule:
- Runtime/UI files changed, so run:
  - npm run build
  - npm run lint
  - npm run typecheck
  - related task/announcement smoke checks as needed
```


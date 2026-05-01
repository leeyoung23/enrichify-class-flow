# Announcements Completion Overview Plan

Date: 2026-05-01  
Scope: completion overview strategy + read-service checkpoint (no UI/SQL/RLS changes in this milestone)

## Checkpoint update (read service + smoke added)

- Added `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted } = {})` in `src/services/supabaseReadService.js`.
- Added focused smoke script:
  - `scripts/supabase-announcements-completion-overview-smoke-test.mjs`
  - `npm run test:supabase:announcements:completion`
- Current completion-overview milestone remains **service + smoke only** (no UI integration yet).
- No SQL/RLS changes, no notification/email automation, and no parent-facing announcements/events were added.
- Detailed checkpoint record: `docs/announcements-completion-overview-read-service-checkpoint.md`.

## 1) Current state

- Staff own-task visibility is live in `MyTasks` via read-only `Announcement Requests` cards.
- Announcement request workflow is live for staff: read/status/reply/upload in `Announcements`.
- Manager completion overview does not exist yet.
- Notification/email automation does not exist yet.

## 2) Product purpose

HQ and branch supervisors need a reliable way to monitor completion posture for request announcements without chasing updates in ad-hoc channels.

This overview should:

- show who has read, replied, uploaded, marked done, marked undone, or become overdue;
- reduce manual WhatsApp follow-up loops;
- improve operational accountability without introducing real-time chat;
- identify blockers before reminders/emails are introduced.

## 3) Completion overview scope (per announcement)

Planned summary metrics:

- `totalTargetedStaff`
- `readCount` / `unreadCount`
- `doneCount` / `pendingCount` / `undoneCount`
- `responseRequiredCount`
- `responseProvidedCount`
- `responseMissingCount`
- `uploadRequiredCount`
- `uploadProvidedCount`
- `uploadMissingCount`
- `overdueCount`
- `latestReplyAt`
- `latestUploadAt`

## 4) Per-person row model

Planned row fields for manager overview:

- `profileId`
- `staffName`
- `role`
- `branch`
- `targetSource` (`profile` / `role` / `branch` / `class` when present)
- `readAt`
- `doneStatus` (`pending` / `done` / `undone`)
- `undoneReason` (if provided)
- `replyCount`
- `responseProvided`
- `attachmentCount`
- `uploadProvided`
- `isOverdue`
- `lastActivityAt` (latest of read/reply/upload/status timestamps)

## 5) Role behavior

### HQ

- Global overview across internal announcements and branches in allowed internal scope.

### Branch supervisor

- Own-branch overview only.
- Focused on announcements they manage and/or branch-targeted requests under branch scope.

### Teacher

- No manager completion overview access.
- Continues to use own task list in `MyTasks`.

### Parent/student

- No access to internal manager overview.

## 6) Data source options

### A) Client/read-service aggregation from existing RLS-visible tables

Sources:

- `announcements`
- `announcement_targets`
- `announcement_statuses`
- `announcement_replies`
- `announcement_attachments`

Pros:

- no SQL migration needed for first milestone;
- fastest proof path under existing JWT + RLS boundaries;
- consistent with current `listMyAnnouncementTasks(...)` derivation style.

Risks:

- service-layer aggregation complexity grows with manager metrics;
- can become expensive at higher volume if done naively.

### B) SQL view/RPC under RLS

Pros:

- centralizes derivation and metric consistency server-side;
- simpler frontend/service payload once stabilized.

Risks:

- requires SQL review + RLS verification milestone;
- larger blast radius than A.

### C) Materialized overview table

Pros:

- better for scheduled reminders/escalations/SLA/history.

Risks:

- extra write/sync complexity;
- risk of drift from source-of-truth rows.

### Recommendation

Recommend **A first** while volume is still small and current RLS-visible tables are sufficient.  
Move to **B later** if complexity/performance grows.  
Keep **C much later** for reminder/escalation/SLA workflows only.

## 7) Read service proposal (future)

Proposed method:

`listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted } = {})`

Contract:

- returns stable `{ data, error }`;
- no raw `storage_path` in response;
- no raw SQL/RLS/env leakage in errors;
- no service-role frontend usage (anon client + JWT + RLS only).

## 8) UI placement plan (future)

Planned placement (future milestone):

- inside `Announcements` detail panel for HQ/supervisor;
- likely a dedicated `Completion` section/tab;
- summary cards + per-person table/list;
- mobile-friendly stacked rows at narrow widths;
- row action remains `Open Announcement` only;
- no direct reminder/email actions in MVP.

## 9) Completion semantics

- `done` remains explicit user lifecycle status.
- Reply/upload are evidence signals, not auto-done triggers.
- `responseMissing` and `uploadMissing` stay visible as separate blocker dimensions.
- `overdue` is derived from `due_date` + unresolved state.
- `undone` remains visible as an explicit blocker state.

## 10) RLS/privacy boundaries

- Derive only from rows already accessible via RLS (`announcements`, `targets`, `statuses`, `replies`, `attachments`).
- Branch supervisor visibility stays own-branch only.
- Teacher cannot view other staff completion rows.
- Parent/student remain blocked.
- No `storage_path` in overview payload.
- No attachment content previews in completion overview.
- No service-role frontend.

## 11) Testing plan (future)

Planned smoke coverage for the implementation milestone:

- HQ sees global overview for fake targeted announcement.
- Supervisor sees own-branch overview only.
- Teacher cannot access manager overview API/read helper.
- Parent/student blocked.
- Counts update after read/done/reply/upload transitions.
- No notification/email side effects.

## 12) Risks and safeguards

### Risks

- Cross-branch leakage in manager views.
- Exposure of internal notes such as `staff_note`/sensitive context.
- Incorrectly treating reply/upload as full completion.
- Over-surveillance/shaming dynamics if metrics are shown without context.
- Stale derived counts if refresh timing is poor.
- Premature notification pressure before completion state is reliable.

### Safeguards

- strict branch/role scope checks in derivation;
- exclude sensitive free-text fields from overview rows by default;
- keep explicit lifecycle vs evidence dimensions separate;
- show clear status definitions in UI copy;
- gate notifications until overview accuracy is validated.

## 13) Recommended next milestone

Choose:

- **A.** Implement `listAnnouncementCompletionOverview(...)` read service + smoke test
- **B.** Completion overview UI shell first
- **C.** SQL view/RPC draft
- **D.** Company News warm pop-up planning
- **E.** Notification/email planning

**Recommendation: A first.**

Why:

- own-task `MyTasks` UI is already live;
- manager overview needs service-level proof before UI;
- keep notifications/emails later until counts are reliable;
- avoid SQL view/RPC now unless service-layer derivation becomes too complex.

## 14) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Announcements completion overview plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement Announcements completion overview read service + smoke test only.

Scope:
- Service/read + smoke test only.
- Do not change app UI.
- Do not change runtime page logic.
- Do not add SQL/RLS changes in this milestone.
- Do not apply SQL.
- Do not add notifications/emails/live chat.
- Do not add Company News pop-up.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- No service role key in frontend.
- No raw env/password exposure.
- Use fake/dev fixtures only.

Deliverables:
1) Add `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted } = {})`
   in `src/services/supabaseReadService.js`.
2) Return stable `{ data, error }` with:
   - summary metrics per announcement
   - per-person completion rows
   - no `storage_path` exposure.
3) Enforce role-safe behavior under existing RLS expectations:
   - HQ global internal scope,
   - supervisor own-branch scope,
   - teacher/parent/student blocked for manager overview.
4) Add smoke script:
   - `scripts/supabase-announcements-completion-overview-smoke-test.mjs`
   - fake/dev data only.
5) Add/update docs checkpoint for the new helper + smoke outcomes.

Validation efficiency rule:
- Runtime/service files changed -> run targeted checks you add for this milestone.
- If docs-only changes, run only:
  - git diff --name-only
```

---

Validation efficiency note for this planning milestone:

- Docs/planning only.
- Run only: `git diff --name-only`.
- Do not run build/lint/typecheck/smoke unless runtime files change.

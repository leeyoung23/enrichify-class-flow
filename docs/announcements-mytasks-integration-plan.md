# Announcements MyTasks Integration Plan

Date: 2026-05-01  
Scope: planning only for Announcements request visibility in `MyTasks` (no implementation in this milestone)

## 1) Current state

- Announcements request workflow is already real for staff.
- Staff can read announcements, mark done/undone, reply, and upload attachments.
- Staff attachment list/upload/view is already wired in Announcements detail panel.
- MyTasks does not yet surface announcement-derived requests.
- No notification/email automation exists for this workflow yet.

## 2) Product purpose

- HQ/supervisor requests should not be missed in daily staff operations.
- Pending document uploads should be visible as actionable tasks.
- Done/undone states should translate into operational visibility, not hidden status rows.
- Teachers/supervisors need one place to see what they still owe.
- HQ/supervisor need one place to monitor completion posture and blockers.

## 3) Task sources (derived from announcements)

Planned MyTasks task candidates:

- Targeted request announcements (`announcement_type = request` + target scope matches actor).
- Announcements with `requires_response = true`.
- Announcements with `requires_upload = true`.
- Announcements with `due_date` present.
- Announcements where actor done state is `pending` or `undone`.
- Unread published announcements for the actor (`read_at` null for actor status row).
- Reply-requested announcements where no reply has been posted by actor yet.
- Upload-required announcements where required attachment evidence is still missing.

## 4) MyTasks display model

Planned card/list row fields:

- `task_title` (announcement title)
- `source` = `Announcement`
- `priority`
- `due_date`
- `branch_or_target_context`
- `status` (unread / pending / done / undone / overdue)
- `requires_response` badge
- `requires_upload` badge
- `reply_count` (or latest reply summary)
- `attachment_count` (or upload missing/provided badge)
- Primary action: `Open Announcement`

## 5) Role behavior

### Teacher

- Sees only announcement tasks targeted to own profile/role/branch scope via existing RLS.
- Does not see unrelated branch or unrelated profile requests.

### Branch supervisor

- Sees tasks assigned to self via target scope.
- Also sees own-branch completion overview for announcements they manage.

### HQ

- Sees own tasks and global completion overview.

### Parent / Student

- No access to internal announcement tasks.

## 6) Data model options

### A) Derived MyTasks read from announcement tables

- Derive from:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
  - `announcement_attachments`
- Pros:
  - avoids duplicated task state,
  - leverages current RLS and existing state fields,
  - fastest MVP path.
- Risks:
  - query complexity for badges/overview,
  - potential read performance tuning later.

### B) Materialized task table (`announcement_task_links` / similar)

- Persist announcement-task rows and sync state.
- Pros:
  - simpler downstream task queries,
  - easier reminders/SLA/escalation support later.
- Risks:
  - duplicated state and sync drift risk,
  - added write-path complexity and reconciliation burden.

### C) Hybrid (derived first, materialized later)

- MVP uses derived reads; materialized layer introduced only when justified.
- Best long-term balance if escalation/reminder/SLA flows are later required.

Recommendation:

- **A first for MVP**, with planned evolution toward **C** if scale/features demand it.
- Reasoning:
  - existing announcement statuses already encode core pending/done/undone state,
  - avoids premature duplicated state,
  - keeps safety/RLS model simpler in early iteration.
- Move toward materialized B/C later if MyTasks needs reminder jobs, SLA tracking, escalation, or cross-module task unification.

## 7) Read service implications (future)

Candidate read methods:

- `listMyAnnouncementTasks(...)`
- `listAnnouncementCompletionOverview(...)`
- `listAnnouncementPendingUploads(...)` (optional specialized helper)

Read shape should remain:

- anon client + JWT + RLS only
- stable `{ data, error }` service contract
- no raw storage path output
- no raw SQL/RLS/env error leakage in UI copy

## 8) Write/service implications (future)

No new write path is required initially if derived model is used.

Reuse existing writes:

- `markAnnouncementRead(...)`
- `updateAnnouncementDoneStatus(...)`
- `createAnnouncementReply(...)`
- `uploadAnnouncementAttachment(...)`

Implication:

- MyTasks should reflect existing Announcements writes, rather than introducing separate duplicated task writes for MVP.

## 9) UI integration plan (future)

- Add `Announcement Requests` section/tab inside `MyTasks`.
- Render mobile-friendly task cards with:
  - due/overdue badge,
  - response required badge,
  - upload required badge,
  - done/undone badge.
- `Open Announcement` action routes to `/announcements` and selects/focuses announcement when route state/params support it.
- Include clean empty state when no announcement tasks are pending.

## 10) Upload completion logic

- If `requires_upload = true`, do **not** assume task completion solely from `done_status = done`.
- Prefer separate visibility badges:
  - lifecycle: `done` / `undone` / `pending`
  - upload evidence: `provided` / `missing`
- MVP should not auto-mark done on upload unless explicitly approved in a later product decision.

## 11) Notifications/email boundary

- No automatic notifications/emails in this milestone.

Future planning notes:

- Overdue request reminders can be considered later.
- Parent arrival email workflows are separate attendance-domain scope.
- Internal staff notification queue should be planned as separate module/capability.

## 12) RLS/privacy boundaries

- Derive tasks only from announcements visible to the current actor.
- Keep parent/student blocked for internal announcement tasks.
- Preserve no cross-branch leakage.
- Do not expose internal attachment paths (`storage_path`) in task views.
- Keep frontend on anon client + JWT (no service role key).

## 13) Testing plan (future)

Planned smoke/UI checks:

- Teacher sees targeted pending announcement task.
- Teacher cannot see unrelated branch task.
- Branch supervisor sees own-branch completion overview.
- HQ sees global overview.
- Parent/student blocked from internal announcement task visibility.
- Upload-required badge transitions after attachment upload (if implemented in read model).
- No notification/email side effects.

## 14) Recommended next milestone

Options:

- A. MyTasks derived read service planning / SQL view review
- B. MyTasks UI shell first
- C. Company News pop-up planning
- D. Parent-facing announcements/events planning

Recommendation: **A. MyTasks derived read service planning / SQL view review**.

Why A first:

- Task visibility depends on reliable derived data rules.
- RLS/privacy behavior should be reviewed before UI wiring.
- Avoids duplicating task state too early.

## 15) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Announcements MyTasks integration plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Announcements MyTasks derived read service / SQL view review only.

Hard constraints:
- Planning/docs/review only.
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
1) Derived read-model specification for announcement tasks:
   - actor scope resolution,
   - pending/done/undone/unread/overdue computation,
   - requires_response/requires_upload badge rules,
   - upload missing/provided rule.
2) SQL view candidate review (or equivalent query shape) with RLS/privacy guardrails.
3) Service API proposal for:
   - listMyAnnouncementTasks(...)
   - listAnnouncementCompletionOverview(...)
4) Risks, non-goals, and phased rollout recommendation.

Validation efficiency rule:
Docs/planning only.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

# Announcements / Internal Communications and Document Hub Plan

Scope: planning only for Announcements/Internal Communications and Document Hub rollout (no UI/runtime/service/SQL changes in this milestone).

## 1) Product purpose

This module should reduce operational reliance on ad-hoc WhatsApp and Google Drive flows by providing a structured communication layer inside the portal.

Core purpose:

- Create structured HQ/supervisor/teacher communication in one place.
- Support requests, documents, replies, done/undone status, and clear auditability.
- Keep communication operational and trackable rather than chat-noise driven.
- Later extend to parent-facing announcements/events in a controlled release path.
- Avoid real-time live chat in MVP; prioritize request/document workflow first.

## 2) Navigation placement

Staff navigation plan:

- Add tab name: `Announcements`.
- Place it after `Dashboard` in staff navigation.

Parent navigation direction (later phase):

- Parent-facing announcements/events should appear near Memories or a dedicated ParentView announcements/events section.
- Parent placement should preserve existing parent-safe, release-gated content pattern.

## 3) Core users and roles

Initial role scope:

- HQ/admin
- Branch supervisor
- Teacher

Later role scope:

- Parent (for parent-facing published announcements/events only)

Explicitly out of initial internal module:

- Student

## 4) Two HQ announcement modes

### Mode A: Reminder/request announcement

Purpose: operational requests and reminders.

Expected behavior:

- HQ creates request/reminder announcement.
- HQ targets branches/supervisors/teachers.
- Announcement can include attachment references.
- Recipients can reply and ask clarifying questions.
- Recipients can upload requested files/documents (phase 2+).
- Recipients can mark Done / Undone.
- Undone/pending remains visible as task/reminder until resolved.

### Mode B: Company News / Big News

Purpose: culture/news highlights and important broad updates.

Expected behavior:

- HQ-only creation.
- News-style, warm celebratory presentation (not chat-style).
- Optional visual style support (emoji/confetti/spray style treatment).
- Optional 5-10 second portal pop-up on entry:
  - short copy,
  - `View` action linking to `Announcements` tab,
  - dismissible and non-disruptive.

## 5) Supervisor-to-teacher request flow

Branch operations flow:

- Supervisor creates a targeted request to teachers (e.g., upload doc/file).
- Request includes instruction/note and expected completion context.
- Teacher can reply, upload requested file, and mark Done/Undone.
- Pending/undone request should appear in teacher task area.

## 6) Parent-facing announcements/events later

Parent-facing planning direction:

- HQ/supervisor can create parent-facing announcements/events.
- Parent sees upcoming events/activities/centre announcements only.
- Placement likely near Memories or ParentView Announcements/Events section.
- Post types may include:
  - with photo,
  - without photo,
  - heading/subheading layout,
  - selectable parent-facing templates.
- Parent-facing content requires additional review/safety boundary before publish.

## 7) Why not real-time live chat first

Real-time chat is not Phase 1 because it introduces high complexity early:

- unread state and thread state management,
- moderation and abuse handling,
- privacy boundary risk,
- noisy notification patterns,
- spam/noise control burden.

Structured request/document/reply workflows are more operationally useful first and align with existing task-oriented staff process.

Live chat can be revisited in Phase 4+ after request/document workflows are stable and auditable.

## 8) Data model concept (no SQL yet)

Conceptual entities:

- `announcements`
- `announcement_targets`
- `announcement_attachments`
- `announcement_replies`
- `announcement_statuses` (or acknowledgement/status rows)
- `announcement_tasks` (or integration mapping to existing MyTasks model)
- optional `announcement_templates`
- optional `announcement_popup_events`

No SQL draft in this checkpoint.

## 9) Workflow states

Recommended lifecycle states:

- Draft
- Published
- Read
- Replied
- File uploaded
- Done
- Undone / Pending
- Closed / Archived

## 10) Attachment and file rules

Storage and access principles:

- Private storage by default.
- Signed URLs only.
- Role-scoped object access.
- No public URLs.
- Attachments linked to announcement/request records.
- Upload proofs/files remain internal unless parent-facing announcement is explicitly approved for parent release path.

## 11) Task and reminder integration

Task integration direction:

- Request announcements can generate task-like action items.
- Undone/pending items should appear in `MyTasks`.
- HQ/supervisor can monitor completion progress.
- Audit trail records who marked Done and when.

## 12) RLS and security principles

Access principles to preserve:

- HQ sees all announcements in allowed scope.
- Branch supervisor sees own-branch targets and replies.
- Teacher sees assigned/targeted announcements only.
- Parent later sees only published parent-facing announcements relevant to linked child/branch/class (as applicable).
- No cross-branch leakage.
- No parent access to internal staff requests.
- Frontend remains anon client + JWT only (no service role key in frontend).

## 13) Mobile-first UX

Staff UX direction:

- Card/list-first layout for mobile.
- Filter chips: Requests / Company News / Done / Pending.
- Quick Done action.
- Upload file action.
- Reply box in detail view.

Parent UX direction (later):

- Card template layout with optional photo.
- Event/announcement templates for quick scan.

Pop-up behavior:

- Short, dismissible, non-blocking.
- Links to full announcement detail in `Announcements` tab.

## 14) MVP scope recommendation

### Phase 1 (recommended MVP)

- Staff `Announcements` tab shell.
- HQ reminder/request mode only.
- Target branch/supervisor/teacher scope.
- Status baseline: read/done/undone.
- Simple reply support.
- Attachment model planned, but file upload may wait for phase 2.

### Phase 2

- File upload attachments.
- `MyTasks` integration.
- Supervisor-to-teacher request workflows.

### Phase 3

- Company News presentation mode.
- Optional 5-10 second portal pop-up with dismiss + view action.

### Phase 4

- Parent-facing announcements/events.

### Phase 5

- Optional live chat or threaded discussion (only if truly needed).

## 15) Risks and safeguards

Key risks:

- notification overload,
- privacy leakage across branches/parent scope,
- confusion between internal vs parent-facing announcements,
- Done status marked without actual completion,
- file upload misuse,
- pop-up annoyance/fatigue,
- weak auditability.

Safeguards:

- strict role-target scoping and release states,
- parent-facing publish boundary separate from internal publish,
- completion and acknowledgement audit logs,
- conservative notification policy defaults,
- private storage + signed URLs only,
- dismissible and rate-limited pop-up behavior.

## 16) Recommended next milestone

Choose:

- A. Announcements SQL/RLS data model review
- B. Announcements staff UI shell with demo parity
- C. Company News pop-up design plan
- D. Parent announcements/events plan
- E. Live chat feasibility plan

Recommendation: **A. Announcements SQL/RLS data model review**.

Why A first:

- Structured communication depends on backend/RLS boundaries before UI.
- Targets, replies, uploads, done/undone, and task linkage are data-model dependent.
- Early backend scoping prevents cross-branch and parent/internal leakage.
- This follows the same backend-first hardening pattern used in homework workflows.

## 17) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Announcements internal communications plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Announcements SQL/RLS data model review only.

Hard constraints:
- Planning/docs only.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
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
- Use fake/dev data only.

Deliverables:
1) Data model review for Announcements/Internal Communications:
   - announcements
   - targets
   - replies
   - attachments
   - statuses/ack rows
   - task linkage model
2) Role-scope/RLS matrix (HQ, supervisor, teacher, parent-later).
3) Internal vs parent-facing separation boundary.
4) State-machine and audit requirements for read/reply/upload/done/undone.
5) Risks and non-goals.

Validation efficiency rule:
Docs/planning only.
Run:
- git diff --name-only
Do not run build/lint/smoke suite unless runtime files change.
```

## 18) Phase 1 SQL draft status

Implementation checkpoint update:

- Phase 1 Announcements SQL/RLS foundation draft now exists at `supabase/sql/020_announcements_phase1_foundation.sql`.
- `020` is manual/dev-first SQL draft only and is **not applied yet**.
- Scope drafted in `020` is internal staff baseline only:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
- Attachments remain Phase 2+ and are not included in `020`.
- MyTasks integration remains Phase 2+ and is not included in `020`.
- Company News pop-up UX remains Phase 3.
- Parent-facing announcements/events remain Phase 4.
- Live chat remains Phase 5+ only if needed.

Next manual step:

- Review `supabase/sql/020_announcements_phase1_foundation.sql` before any manual apply in Supabase dev.

### 020 pre-apply security review update

- `020` has now been reviewed before manual Supabase apply.
- Review hardening fix was made in `020`:
  - supervisor target-row writes are now constrained to own announcement branch scope via `can_manage_announcement_target_write(...)`.
- Attachments/MyTasks/pop-up/parent-facing/live-chat phase boundaries remain unchanged.
- Manual apply is still pending and must remain dev-only after final review sign-off.

### 020 manual dev SQL application checkpoint

- `020` is now manually applied in Supabase dev SQL Editor (Success. No rows returned).
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- Phase 1 dev tables now exist:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
- `pg_policies` verification showed policy rows for all four tables (16 rows visible).
- Helper verification confirmed:
  - `announcement_branch_id`
  - `can_access_announcement`
  - `can_manage_announcement`
  - `can_manage_announcement_target_write`
  - `is_announcement_targeted_to_profile`
- Column verification returned 42 rows across the four Phase 1 tables.
- Attachments/MyTasks/pop-up/parent-facing/live-chat remain future phases.


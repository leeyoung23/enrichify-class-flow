# Announcements / Internal Communications and Document Hub Plan

Scope: planning only for Announcements/Internal Communications and Document Hub rollout (no UI/runtime/service/SQL changes in this milestone).

## Checkpoint update (Company News create service + smoke)

- Dedicated Company News write path is now present in service layer:
  - `createCompanyNews(...)`
  - `publishCompanyNews(...)`
- Focused smoke added:
  - `npm run test:supabase:company-news:create`
- This checkpoint keeps boundaries unchanged:
  - no SQL/RLS changes,
  - no UI/runtime create wiring,
  - no parent-facing announcements/events,
  - no notifications/emails.

## Checkpoint update (completion overview read service checkpoint doc formalized)

- Canonical checkpoint (sections 1–11: implementation, behavior, metrics, semantics, smoke, tests, boundaries, future, next milestone, copy-paste prompt):
  - `docs/announcements-completion-overview-read-service-checkpoint.md`
- This documentation-only alignment does not change runtime; validation is `git diff --name-only` unless code changes.

## Checkpoint update (027 Company News create-path SQL draft)

- New SQL draft added: `supabase/sql/027_company_news_create_foundation.sql`.
- `027` is manual/dev-first and review-first only (not auto-applied).
- Draft scope is intentionally narrow:
  - preserves existing request/reminder insert behavior,
  - adds HQ-only insert allowance for `announcement_type='company_news'`, `audience_type='internal_staff'`, `status='draft'`,
  - requires `created_by_profile_id = auth.uid()`,
  - keeps `requires_response` and `requires_upload` false for this MVP create path.
- Branch supervisor `company_news` create remains blocked for MVP.
- Teacher/parent/student create remains blocked.
- Parent-facing announcements/events remain future; `parent_facing_media` remains out of scope.
- Service/UI create wiring remains future (this checkpoint is SQL draft + documentation only).

## Checkpoint update (027 Company News create-path SQL manual DEV application)

- `027` is now manually applied in Supabase DEV:
  - `supabase/sql/027_company_news_create_foundation.sql`
  - SQL Editor result: `Success. No rows returned.`
- Verified outcome:
  - `announcements_insert_020` now uses `can_insert_announcement_row_027(...)`,
  - request insert behavior remains preserved,
  - HQ-only internal_staff `company_news` draft insert is now allowed.
- Validation evidence in this checkpoint:
  - `npm run test:supabase:company-news:popup` PASS (including HQ direct `company_news` create PASS),
  - `npm run test:supabase:announcements:phase1` PASS (request workflow regression safe),
  - optional cross-branch CHECK remains when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured.
- Boundaries remain unchanged:
  - teacher/parent/student create blocked,
  - branch supervisor `company_news` create blocked for MVP,
  - no parent-facing announcements/events opening,
  - no `parent_facing_media`,
  - no notifications/emails/live chat,
  - no runtime/UI/service changes in this checkpoint.

## Checkpoint update (Company News UI shell with demo parity)

- Company News tab in `Announcements` now renders a shell experience (not placeholder-only):
  - news-style list cards,
  - detail shell,
  - warm pop-up preview panel (non-runtime).
- Demo mode now includes local fake Company News cards and HQ demo-only local create shell.
- Authenticated mode remains read-safe only in this slice (no real Company News write wiring added).
- Boundaries preserved:
  - no SQL/RLS changes,
  - no runtime app-shell pop-up behavior,
  - no popup persistence backend,
  - no MyTasks side effects,
  - no parent-facing announcements/events,
  - no notifications/emails.
- Checkpoint doc:
  - `docs/company-news-ui-shell-checkpoint.md`.
- Recommended immediate next milestone:
  - **Runtime warm pop-up planning/data model review** (docs-only),
  - define dismissal/frequency/persistence rules before runtime trigger work.

## Checkpoint update (026 Company News popup status SQL draft)

- New draft SQL exists at `supabase/sql/026_company_news_popup_status_foundation.sql`.
- `026` is manual/dev-first and review-first only (not auto-applied).
- `026` scope is additive and limited to per-user popup state fields on `announcement_statuses`:
  - `popup_seen_at`
  - `popup_dismissed_at`
  - `popup_last_shown_at`
- `026` pre-apply review hardening now adds popup self-update guard trigger/function to prevent cross-user popup-field writes.
- `026` keeps existing `announcement_statuses` read/done semantics unchanged.
- `026` adds popup-focused indexes only and does not weaken existing RLS policies.
- Parent-facing announcements/events remain a later phase, and `parent_facing_media` remains out of scope.
- Runtime popup service/UI behavior remains future; notifications/emails remain future.

## Checkpoint update (026 manual DEV SQL application)

- `026` is now manually applied in Supabase DEV (`Success. No rows returned.`).
- No production apply in this checkpoint.
- Verified DEV checkpoint:
  - popup status columns exist on `announcement_statuses`,
  - popup indexes exist (`announcement_statuses_popup_seen_at_idx`, `announcement_statuses_popup_dismissed_at_idx`, `announcement_statuses_popup_last_shown_at_idx`, `announcement_statuses_profile_popup_idx`),
  - popup self-update guard trigger/function exist.
- `announcement_statuses` policy shape remains unchanged at 4 policies (`select/insert/update/delete` from `020`).
- No runtime/UI/service changes in this checkpoint.
- Checkpoint doc:
  - `docs/company-news-popup-status-sql-application-checkpoint.md`

## Checkpoint update (Company News popup service + smoke)

- Service methods now exist for internal Company News popup flow:
  - `listEligibleCompanyNewsPopups(...)`
  - `markCompanyNewsPopupSeen(...)`
  - `dismissCompanyNewsPopup(...)`
- Focused smoke command now exists:
  - `npm run test:supabase:company-news:popup`
- Service smoke confirms:
  - teacher eligible popup read path,
  - own-row seen/dismiss writes,
  - dismissed popup suppression from list,
  - parent/student blocked-or-empty popup reads,
  - manager cross-user popup write blocked by guard.
- No app UI/runtime page behavior changes in this slice.
- No SQL/RLS changes in this slice.
- No notification/email behavior in this slice.
- No parent-facing announcements/events in this slice.
- Checkpoint doc:
  - `docs/company-news-popup-service-smoke-checkpoint.md`
- Additional checkpoint notes:
  - direct HQ `company_news` insert remains CHECK-blocked by current request-first create-path policy shape (expected),
  - phase1 optional cross-branch negative fixture remains CHECK-skipped when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing,
  - npm `devdir` warning is non-blocking.

## Checkpoint update (completion overview read service + smoke)

- Manager completion overview read service is now added:
  - `listAnnouncementCompletionOverview(...)` in `src/services/supabaseReadService.js`.
- Focused smoke test is now added:
  - `scripts/supabase-announcements-completion-overview-smoke-test.mjs`
  - `npm run test:supabase:announcements:completion`
- Current slice is read-service + smoke only:
  - no completion overview UI wiring yet,
  - no SQL/RLS changes,
  - no notifications/emails,
  - no parent-facing announcements/events.
- Companion checkpoint doc:
  - `docs/announcements-completion-overview-read-service-checkpoint.md`.

## Checkpoint update (attachments service smoke PASS)

- Announcements attachments service smoke now passes after `025` manual dev apply.
- Proven PASS paths include HQ upload/list/signed URL, supervisor own-branch upload/signed URL, and teacher targeted `response_upload` upload/list.
- Teacher `hq_attachment` remains blocked; parent/student internal attachment read/list remains blocked-or-empty.
- No public URL behavior observed; private bucket + signed URL model remains enforced.
- Core Phase 1 announcement smoke still passes.

Roadmap implication:

- Staff attachment UI wiring is now completed; **MyTasks Announcement Requests** UI is also completed.
- Completion overview UI is now completed, and Company News UI shell is now added.
- Recommend next milestone **A. Runtime warm pop-up planning/data model review**.
- Rationale: runtime pop-up behavior needs clear dismissal/frequency/persistence rules before implementation.
- Keep parent-facing announcements/events, notification/email automation, and report/PDF/AI OCR for later milestones.

## Checkpoint update (staff attachments UI wired)

- Staff Announcements detail panel now supports internal staff attachment list/upload/view.
- Authenticated non-demo mode uses existing attachment services and signed URL access.
- Demo mode keeps local-only fake attachment simulation (no Supabase calls).
- Parent-facing media remains disabled/reserved and parent/student access remains out of scope.
- MyTasks integration, Company News pop-up, parent-facing announcements/events, notifications/emails, and live chat remain future.

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

### Phase 1 read/write service + smoke checkpoint

- Service-layer Phase 1 methods are now added:
  - read: `listAnnouncements`, `listAnnouncementTargets`, `listAnnouncementStatuses`, `listAnnouncementReplies`
  - write: `createAnnouncementRequest`, `publishAnnouncement`, `markAnnouncementRead`, `updateAnnouncementDoneStatus`, `createAnnouncementReply`
- New smoke test is now added:
  - `scripts/supabase-announcements-phase1-smoke-test.mjs`
  - command: `npm run test:supabase:announcements:phase1`
- This milestone keeps boundaries unchanged:
  - no app UI changes,
  - no runtime page behavior changes,
  - no SQL/RLS changes,
  - no attachments/MyTasks/pop-up/parent-facing/live-chat implementation,
  - no auto notifications/emails,
  - no service role usage in frontend.

### Service smoke checkpoint result

- `npm run test:supabase:announcements:phase1` now exists and runs in current milestone.
- Current run is successful but has safe CHECK skips in fixture context:
  - HQ create check skipped,
  - supervisor create check skipped,
  - teacher targeted flow skipped,
  - cross-branch target negative check skipped.
- Interpretation: backend service structure is in place, but create/target proof is incomplete until fixture/RLS context is investigated.
- Recommendation remains backend-first: resolve CHECK skips before staff Announcements UI shell wiring.

### Phase 1 smoke PASS checkpoint update

- `021` fake fixture activation SQL is now manually applied in Supabase dev.
- `022` Announcements insert/select RLS fix SQL is now manually applied in Supabase dev.
- Core Phase 1 smoke path is now proven:
  - HQ create PASS,
  - supervisor create/publish PASS,
  - teacher targeted read/status/reply PASS,
  - parent/student internal_staff block PASS,
  - cleanup PASS.
- Optional cross-branch negative fixture remains CHECK-skipped when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured.
- Recommended next milestone now shifts to: Staff Announcements UI shell with demo parity.

### Staff Announcements UI shell checkpoint update

- Staff Announcements UI shell is now implemented in `src/pages/Announcements.jsx`.
- Staff nav now includes `Announcements` after `Dashboard` for HQ/supervisor/teacher.
- Demo mode behavior is local fake-data only:
  - request/reminder cards,
  - detail + reply list,
  - local status actions (`read`, `done`, `undone`),
  - local `Create Request` shell for HQ/supervisor.
- Authenticated mode is preview-only in this milestone (no real service wiring yet).
- Attachments/MyTasks/Company News pop-up/parent-facing announcements/live chat remain future.

### Next milestone update (post UI shell)

Options:

- A. Announcements attachments upload/list/signed URL service + smoke test
- B. Announcements attachments UI shell
- C. MyTasks integration plan
- D. Company News pop-up design
- E. Parent-facing announcements/events plan

Recommendation: **A. Announcements attachments upload/list/signed URL service + smoke test**.

Why A first:

- SQL/RLS/storage attachment foundation is now manually applied in dev.
- Service-level verification should be completed before attachment UI wiring.
- Privacy-sensitive attachment role and storage boundaries must be proven with smoke checks first.
- This follows the homework marked-file backend-first safety pattern.

### Real authenticated UI wiring update

- Staff `Announcements` authenticated non-demo UI wiring is now active in `src/pages/Announcements.jsx`.
- Existing Phase 1 services are now used in UI for:
  - `listAnnouncements({ audienceType: 'internal_staff' })`
  - `listAnnouncementTargets({ announcementId })`
  - `listAnnouncementStatuses({ announcementId })`
  - `listAnnouncementReplies({ announcementId })`
  - `createAnnouncementRequest(...)` (HQ/supervisor only)
  - `markAnnouncementRead({ announcementId })`
  - `updateAnnouncementDoneStatus({ announcementId, doneStatus, undoneReason })`
  - `createAnnouncementReply({ announcementId, body, replyType })`
- Demo mode remains local fake-data only; no Supabase calls in demo paths.
- Boundaries remain unchanged:
  - no SQL/RLS edits,
  - no attachment upload,
  - no MyTasks integration,
  - no Company News pop-up behavior,
  - no parent-facing announcements,
  - no live chat,
  - no auto notifications/emails.

### Recommended next milestone (checkpoint)

Options:

- A. Announcements attachments SQL/RLS planning
- B. MyTasks integration planning
- C. Company News warm pop-up planning
- D. Parent-facing announcements/events planning
- E. Live chat feasibility plan

Recommendation: **A. Announcements attachments SQL/RLS planning**.

Why A first:

- Core authenticated request/read/done/reply workflow is now real.
- Attachments are the next natural document-hub capability.
- MyTasks can follow once file/request workflow is richer.
- Company News/pop-up and parent-facing posts should remain later.

### Phase 2 attachments SQL/RLS draft update

- Draft SQL now exists at `supabase/sql/023_announcements_attachments_foundation.sql`.
- `023` is manual/dev-first SQL draft only and is not auto-applied.
- `023` has now had a focused pre-apply security/data-model review.
- `023` drafts:
  - `announcement_attachments` metadata table,
  - attachment role constraints/indexes,
  - helper access functions,
  - RLS policies for HQ/supervisor/teacher internal attachment access,
  - private storage bucket/policies for `announcements-attachments` (signed URL model; no public access).
- `023` review hardening now includes:
  - unique `storage_path` metadata guard (prevents duplicate-path object policy collisions),
  - bounded attachment `file_size` guard (`<= 25MB`).
- `023` is now manually applied in Supabase dev SQL Editor (successful apply).
- Verification checkpoint confirmed:
  - `announcement_attachments` exists with 13 columns,
  - metadata RLS policies exist on `announcement_attachments`,
  - helper functions verified (`announcement_attachment_announcement_id`, `announcement_attachment_branch_id`, `can_access_announcement_attachment`, `can_manage_announcement_attachment`),
  - private storage bucket `announcements-attachments` exists with `public=false`,
  - storage object policies exist for select/insert/update/delete.
- No production apply and no runtime/UI/service changes in this checkpoint.
- Parent-facing media remains blocked in `023` (`parent_facing_media` is reserved but not exposed).
- Attachments service methods are now implemented in `src/services/supabaseUploadService.js`:
  - `uploadAnnouncementAttachment(...)`
  - `listAnnouncementAttachments(...)`
  - `getAnnouncementAttachmentSignedUrl(...)`
  - `deleteAnnouncementAttachment(...)` (cleanup helper path)
- Attachments fake/dev smoke script now exists:
  - `scripts/supabase-announcements-attachments-smoke-test.mjs`
  - package command: `npm run test:supabase:announcements:attachments`
- Service/smoke checkpoint doc:
  - `docs/announcements-attachments-service-smoke-checkpoint.md`
- Attachments UI remains unwired in this checkpoint.
- MyTasks integration remains future.
- Company News pop-up behavior remains future.


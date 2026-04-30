# Announcements SQL/RLS Data Model Review

Scope: SQL/RLS design review only for Announcements/Internal Communications and Document Hub.  
No SQL execution, no runtime/UI/service changes in this checkpoint.

## 1) Current product requirement

Phase-aligned requirement summary:

- HQ reminder/request announcements are core MVP communication type.
- Company News announcements are a separate HQ-led mode.
- Supervisor-to-teacher request flow is required for operational follow-through.
- Recipients need structured replies/questions (not live chat stream).
- File upload support is later phase (Document Hub behavior).
- Done/Undone status tracking is required per recipient.
- Pending work should surface as task/reminder signal.
- Parent-facing announcements/events are later scope with stricter boundary.
- Live chat is explicitly not in MVP.

## 2) Recommended core tables

Recommended conceptual model:

- `announcements`
- `announcement_targets`
- `announcement_replies`
- `announcement_attachments`
- `announcement_statuses` (ack/read/done/undone state)
- `announcement_task_links` (light integration bridge, optional in phase 1)
- `announcement_templates` (later)
- `announcement_popup_events` (later)

## 3) `announcements` table concept

Purpose: canonical announcement/request entity.

Fields to consider:

- `id` (uuid pk)
- `branch_id` (nullable; null for global HQ scope)
- `created_by_profile_id`
- `announcement_type` (`request`, `company_news`, `parent_event` later)
- `title`
- `subtitle`
- `body`
- `priority` (e.g. low/medium/high or text enum)
- `status` (`draft`, `published`, `closed`, `archived`)
- `audience_type` (`internal_staff`, `parent_facing`)
- `due_date` (nullable)
- `requires_response` (boolean)
- `requires_upload` (boolean)
- `popup_enabled` (later)
- `popup_emoji` (nullable, later)
- `created_at`
- `updated_at`
- `published_at` (nullable)

Design note:

- Keep internal and parent-facing in one table with strict `audience_type` + RLS separation to avoid duplicated lifecycle logic.

## 4) `announcement_targets` concept

Purpose: explicit audience mapping for branch/role/profile targeting.

Fields:

- `id` (uuid pk)
- `announcement_id` (fk)
- `target_type` (`branch`, `role`, `profile`, `class` later)
- `branch_id` (nullable)
- `target_profile_id` (nullable)
- `target_role` (nullable)
- `created_at`

Design note:

- Support mixed targeting in one announcement (e.g. one branch + specific profiles) through multiple target rows.

## 5) `announcement_statuses` / acknowledgements concept

Purpose: per-recipient lifecycle tracking and audit.

Fields:

- `id` (uuid pk)
- `announcement_id` (fk)
- `profile_id` (recipient profile)
- `read_at` (nullable)
- `done_status` (`pending`, `done`, `undone`)
- `done_at` (nullable)
- `undone_reason` (nullable text)
- `last_seen_at` (nullable)
- `created_at`
- `updated_at`

Design note:

- This table should be the first operational bridge to MyTasks-style pending/done behavior.

## 6) `announcement_replies` concept

Purpose: structured non-chat responses and clarifications.

Fields:

- `id` (uuid pk)
- `announcement_id` (fk)
- `profile_id` (author)
- `body`
- `reply_type` (`question`, `update`, `completion_note`)
- `parent_reply_id` (nullable, later threading support)
- `created_at`

Design note:

- Keep replies intentionally asynchronous and structured; avoid live-message semantics in MVP.

## 7) `announcement_attachments` concept

Purpose: attachment metadata for HQ-issued files and recipient responses.

Fields:

- `id` (uuid pk)
- `announcement_id` (fk)
- `uploaded_by_profile_id`
- `file_role` (`hq_attachment`, `response_upload`, `parent_facing_media` later)
- `file_name`
- `storage_path`
- `mime_type`
- `file_size`
- `released_to_parent` (boolean, later)
- `created_at`

Design note:

- Align with existing storage metadata-first + signed URL-only pattern used in homework/memories flows.

## 8) Task integration concept

Comparison:

- **A. Separate `announcement_tasks` table**
  - Pros: independent lifecycle and richer assignment semantics.
  - Cons: duplicates status workflow and increases phase-1 scope.
- **B. Integrate with existing teacher task structures immediately**
  - Pros: immediate task feed reuse.
  - Cons: schema coupling too early; announcements needs status semantics first.

Recommendation for MVP:

- Use lightweight `announcement_statuses` first for `pending/done/undone`.
- Add explicit `announcement_task_links` (or direct mapping layer) in phase 2 after status shape is stable.
- Defer hard merge into `teacher_tasks` semantics until operational fit is proven.

## 9) Company News data model

Model treatment:

- `announcement_type = company_news`
- HQ-only create/edit/publish
- Done/Undone not required by default
- optional read acknowledgement via `announcement_statuses.read_at`
- future fields:
  - `popup_enabled`
  - `popup_emoji`
  - `popup_style`
- future popup event log in `announcement_popup_events`
- `View` button routes to Announcements tab (UI phase later)

## 10) Parent-facing announcements later

Model treatment:

- `audience_type = parent_facing`
- stricter publish and review boundary than internal announcements
- HQ/supervisor-only post creation for parent-facing scope
- optional photo/template metadata
- parent visibility restricted to relevant linked child/branch/class scope
- no parent visibility to `internal_staff` announcements

## 11) RLS principles

### HQ

- Full read/write on announcements, targets, statuses, replies, attachments.

### Branch supervisor

- Read own-branch internal announcements and related targets/replies/statuses.
- Can create supervisor-to-teacher requests in own branch (if policy enabled).
- Cannot cross-branch read/write.

### Teacher

- Read targeted announcements only (profile/role/branch-target matched).
- Create/update own reply/status rows.
- Upload own response attachments only (phase 2+).
- Cannot read unrelated target sets or hidden HQ/private mappings.

### Parent (later)

- Read parent-facing published announcements only within linked scope.
- No access to internal staff announcements, replies, statuses, or internal attachments.

### Student

- No initial module access.

## 12) Storage/privacy model

Attachment/media rules:

- Private bucket(s) only.
- Signed URLs only.
- Role- and target-scoped access checks before URL issue.
- No public URL exposure.
- Parent-facing media requires explicit parent-facing published boundary.
- Response uploads must be scoped to announcement target visibility and recipient role.

## 13) Workflow states

Lifecycle mapping:

- Draft
- Published
- Read
- Replied
- File uploaded
- Pending
- Done
- Undone
- Closed
- Archived

Recommended ownership:

- Announcement-level state on `announcements.status`.
- Recipient lifecycle state on `announcement_statuses`.
- Reply/upload events on `announcement_replies` / `announcement_attachments`.

## 14) RLS risk review

Primary risks:

- Cross-branch leakage of internal operational requests.
- Parent exposure to internal staff-only announcements.
- Teacher visibility into unrelated targets or branch-private HQ notices.
- Response uploads visible to wrong roles.
- Company News popup delivered to wrong role/scope.
- Done/Undone status falsified without audit trail.
- Attachment path guessing.

Mitigation direction:

- Strict branch/profile/role target joins in RLS predicates.
- Hard `audience_type` boundary in policies.
- Per-recipient status rows with author/timestamp audit.
- Attachment metadata checks tied to announcement target eligibility.
- Signed URL creation gated by table-level access checks.

## 15) Recommended SQL strategy

Choose:

- A. One large SQL patch for all tables
- B. Phase 1 SQL only: announcements + targets + statuses + replies, attachments later
- C. UI shell first with demo only
- D. Reuse existing teacher_tasks only

Recommendation: **B. Phase 1 SQL only (announcements + targets + statuses + replies)**.

Why B first:

- Proves request/read/done/reply flow without storage/upload complexity.
- Keeps RLS test surface focused and auditable.
- Attachment storage policies can follow once core scope/privacy is validated.
- Avoids overbuilding chat/document hub behavior too early.

## 16) Recommended next milestone

Choose:

- A. Draft Phase 1 Announcements SQL/RLS foundation
- B. Staff Announcements UI shell with demo parity
- C. Company News pop-up design plan
- D. Parent announcements/events plan
- E. Live chat feasibility plan

Recommendation: **A. Draft Phase 1 Announcements SQL/RLS foundation**.

Why A first:

- targets/status/replies must be RLS-safe before UI wiring.
- follows established backend-first pattern from homework and task workflows.
- prevents cross-branch and parent/internal leakage early.

## 17) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Announcements SQL RLS data model review

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Draft Phase 1 Announcements SQL/RLS foundation only.

Hard constraints:
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
1) SQL draft for phase-1 tables:
   - announcements
   - announcement_targets
   - announcement_statuses
   - announcement_replies
2) RLS draft for HQ/supervisor/teacher scope.
3) Parent-facing boundary kept out of internal phase-1 reads.
4) Role-by-role smoke test checklist (planning/checkpoint doc).

Validation efficiency rule:
Docs/review only.
Run:
- git diff --name-only
Do not run build/lint/smoke suite unless runtime files change.
```

## 18) Phase 1 SQL draft checkpoint (020)

Draft status update:

- `supabase/sql/020_announcements_phase1_foundation.sql` is now drafted as **manual/dev-first SQL only**.
- `020` is **not applied automatically** and has no production apply assumption.
- `020` includes only Phase 1 tables:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
- `020` includes additive constraints/indexes/helper functions and conservative internal-staff RLS policy intent for HQ/supervisor/teacher scope.
- Parent/student access remains blocked for this Phase 1 internal scope.
- `announcement_attachments` remains out of scope for this patch (Phase 2+).
- MyTasks integration remains Phase 2+.
- Company News pop-up behavior remains Phase 3.
- Parent-facing announcements/events remain Phase 4.
- Live chat remains Phase 5+ only if needed.

Next manual step:

- Review `supabase/sql/020_announcements_phase1_foundation.sql` line-by-line, then manually apply in Supabase **dev** SQL editor only after review sign-off.

## 19) 020 pre-apply review hardening checkpoint

Review result before manual apply:

- `020` was reviewed for table/constraint validity, helper safety, and RLS boundary behavior.
- One policy issue was fixed in `020` before apply:
  - added `public.can_manage_announcement_target_write(...)`,
  - tightened `announcement_targets` insert/update checks so branch supervisors can only write target rows inside their own announcement branch scope,
  - HQ/internal-staff management path remains available.
- Remaining conservative assumption:
  - `target_type = 'class'` remains schema-allowed but class-level FK wiring is deferred; Phase 1 policy keeps class targeting branch-scoped for supervisor writes.

Exact next manual Supabase step:

- Re-review updated `supabase/sql/020_announcements_phase1_foundation.sql`, then manually apply in Supabase **dev** SQL editor only (fake/dev data only).

## 20) 020 manual dev application checkpoint

Application status update:

- `supabase/sql/020_announcements_phase1_foundation.sql` has now been manually applied in Supabase **dev** SQL Editor.
- Apply result: **Success. No rows returned.**
- No production apply was performed.
- No runtime/UI/service changes were made in this checkpoint.

Verification summary:

- Phase 1 tables confirmed:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
- `pg_policies` verification showed policies for all four tables (**16 policy rows** visible).
- Helper functions verified:
  - `announcement_branch_id`
  - `can_access_announcement`
  - `can_manage_announcement`
  - `can_manage_announcement_target_write`
  - `is_announcement_targeted_to_profile`
- `information_schema.columns` verification returned **42 rows** across the four Phase 1 tables.

Scope boundary reminder:

- Attachments/MyTasks/pop-up/parent-facing/live-chat remain future milestones.

## 21) Phase 1 service + smoke update

Implementation update (post SQL apply):

- Added Phase 1 Announcements read services in `src/services/supabaseReadService.js`.
- Added Phase 1 Announcements write services in `src/services/supabaseWriteService.js`.
- Added role-scoped smoke test `scripts/supabase-announcements-phase1-smoke-test.mjs`.
- Added package command `test:supabase:announcements:phase1`.

Security boundary reminder:

- Uses anon client + JWT + RLS only (no service-role frontend path).
- No attachments in this milestone.
- No parent-facing runtime read/write path in this milestone.
- No auto-notification/email behavior added.
- No UI/runtime page wiring added in this milestone.

## 22) Service smoke checkpoint result

Validation result:

- Build/lint/typecheck passed for this milestone.
- `test:supabase:announcements:phase1` completed successfully with safe CHECK skips in current fixture context.

CHECK outcomes to resolve next:

- HQ create path not proven in current fixture context.
- Branch supervisor create/publish path not proven in current fixture context.
- Teacher targeted flow not proven due fixture dependency.
- Cross-branch negative check not proven due missing prerequisite fixture.

Recommendation:

- Investigate create/RLS fixture gaps before Announcements UI wiring.

Latest diagnosis note:

- Smoke diagnostics now indicate HQ and branch supervisor fixture profiles are `is_active=false`.
- This aligns with helper behavior in `current_user_role()` (`is_active = true` requirement), which explains create-path RLS blocks without requiring policy weakening.

## 23) Insert RLS fix draft (022)

Updated diagnosis after manual fixture activation (`021`):

- Fake HQ/supervisor/teacher fixtures are now active in dev.
- HQ/supervisor create still failed because create path uses `INSERT ... RETURNING` and RETURNING is also gated by SELECT policy.
- Create-path SELECT depended on helper lookup by announcement id, which is fragile during insert visibility timing.

Fix draft:

- Added `supabase/sql/022_fix_announcements_insert_rls.sql` (manual/dev-only; not auto-applied).
- `022` updates `announcements_select_020` and `announcements_insert_020` to direct row-predicate checks for create safety.
- Preserved boundaries:
  - internal staff only (`audience_type = 'internal_staff'`),
  - HQ create allowed,
  - branch supervisor own-branch create only (`branch_id` non-null + own branch),
  - `created_by_profile_id = auth.uid()`,
  - insert limited to request drafts (`announcement_type='request'`, `status='draft'`),
  - teacher/parent/student create remains blocked.


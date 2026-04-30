# Announcements Phase 1 SQL Application Checkpoint

Checkpoint scope: documentation only for manual SQL application status.

## 1) What was applied

- `supabase/sql/020_announcements_phase1_foundation.sql` was manually applied in Supabase **dev** SQL Editor.
- SQL apply result: **Success. No rows returned.**
- No production apply was performed.
- No runtime/UI/service changes were made in this checkpoint.

## 2) Tables confirmed

Phase 1 Announcements tables confirmed in Supabase dev:

- `announcements`
- `announcement_targets`
- `announcement_statuses`
- `announcement_replies`

## 3) RLS / policy verification

- `pg_policies` verification showed policies present for all four Phase 1 tables.
- Verification output showed **16 policy rows** visible across those tables.

## 4) Helper functions confirmed

Helper verification confirmed:

- `announcement_branch_id`
- `can_access_announcement`
- `can_manage_announcement`
- `can_manage_announcement_target_write`
- `is_announcement_targeted_to_profile`

## 5) Column/schema verification

- `information_schema.columns` verification query returned **42 rows** across:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`

## 6) Phase 1 scope now available (dev)

Current SQL/RLS-ready scope in dev:

- Request/reminder announcement structure
- Announcement target mapping
- Read/Done/Undone per-recipient statuses
- Structured replies/questions
- Current policy usage is internal staff focused (`internal_staff`)
- Parent-facing access remains future phase

## 7) Safety boundaries (current)

- HQ/admin has broad internal access by policy.
- Branch supervisor is constrained to own-branch scope.
- Teacher is targeted-only scope for reads.
- Teacher cannot create announcements in Phase 1.
- Teacher can update own status/reply rows only.
- Parent/student have no Phase 1 announcements table access.
- No parent-facing access is granted yet.
- No attachments table is included yet.
- No public URL/storage exposure is introduced in this phase.
- Frontend service-role usage remains disallowed.
- Live chat is not included.
- No auto email/notification behavior is included.

## 8) What remains unwired

- Announcements read services
- Announcements write services
- Phase 1 Supabase smoke tests
- Staff `Announcements` tab UI shell
- Attachments
- MyTasks integration
- Company News pop-up
- Parent-facing announcements/events
- Live chat

## 9) Recommended next milestone

Options:

- A. Announcements read/write service + smoke test
- B. Staff Announcements UI shell with demo parity
- C. Announcements attachments SQL/RLS
- D. Company News pop-up design plan
- E. Parent announcements/events plan

Recommendation: **A. Announcements read/write service + smoke test**.

Why A first:

- SQL/RLS is now applied in dev.
- Service proof should come before UI wiring.
- Smoke tests should verify HQ/supervisor/teacher/parent boundary behavior.
- This follows the same backend-first pattern used in homework milestones.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements Phase 1 SQL application

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Announcements read/write service + smoke test only.

Hard constraints:
- Do not change app UI in this milestone.
- Do not change Supabase SQL in this milestone.
- Do not change RLS policies in this milestone.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat.

Deliverables:
1) Add Announcements read services (Phase 1 tables only).
2) Add Announcements write services (Phase 1 staff scope only).
3) Add role-scoped smoke test(s) for HQ/supervisor/teacher and parent/student negative checks.
4) Keep parent-facing, attachments, MyTasks, pop-up, and live chat out of scope.

Validation efficiency rule:
Run only what matches changed files.
If runtime/service files change, run targeted checks only.
```

## 11) Validation efficiency rule

Docs-only change for this checkpoint.

Run:

- `git diff --name-only`

Do not run build/lint/typecheck/smoke suite unless runtime files change.

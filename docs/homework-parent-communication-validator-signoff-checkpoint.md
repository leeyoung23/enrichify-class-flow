# Homework + Parent Communication Validator Sign-off Checkpoint

Date: 2026-05-04

## Scope

- `src/pages/Homework.jsx`
- `src/pages/ParentUpdates.jsx`
- `src/pages/MyTasks.jsx`
- `src/services/supabaseReadService.js`
- `src/services/supabaseWriteService.js`
- `docs/teacher-homework-parent-communication-validation-cleanup-checkpoint.md`
- `docs/homework-smoke-test-auth-setup-checkpoint.md`

## Sign-off status

- Bounded internal validator walkthrough is ready for teacher-facing Homework, Parent Communication, and My Tasks quick actions.
- This checkpoint is docs-focused and does not change app behavior.
- AI Parent Reports + ParentView lane remains untouched in this checkpoint.

## Manual QA walkthrough checklist

### 1) Homework teacher flow

- Teacher/staff can open `Homework` and see a clear page goal:
  - create homework,
  - review submissions,
  - add marked work,
  - share feedback only when ready.
- Required create fields are explicit in the task-creation form:
  - `Who is it for? *`
  - `Class *`
  - `Title *`
- Create flow is clear and staged:
  - Step 1: choose assignment scope/class/student
  - Step 2: add details
  - Step 3: save task
- Staff-only boundary remains explicit:
  - internal notes are labeled staff-only,
  - marked work stays staff-only until explicit share,
  - draft feedback stays internal until explicit share.
- Parent/student cannot create homework tasks:
  - write path in `createHomeworkTaskWithAssignees()` requires authenticated user context and runs under RLS/JWT constraints.
- Teacher review actions remain clear:
  - save draft feedback,
  - mark reviewed,
  - return for revision,
  - share feedback with family (role-gated).
- Empty states are teacher-friendly (not UUID/dev-heavy), including no-class/no-student/no-submission scenarios.

### 2) Parent Communication teacher flow

- Teacher/staff can open `Parent Communication` with teacher-facing copy.
- Flow reads clearly as staged work:
  - Step 1: add class memory
  - Step 2: choose update type
  - Step 3: select class/student
  - Step 4-5: draft/review/share flow
- Comment lifecycle labels remain understandable for non-technical users:
  - Draft
  - Needs review
  - Ready to share with family
  - Shared with family
- Review/share actions are explicit:
  - `Save Draft`
  - `Step 2: Mark ready to share`
  - `Step 3: Share with family`
- Draft/not-ready content is not parent-visible; only approved/released content is intended for family visibility.
- Demo/debug wording is hidden in normal real mode and appears only when demo/debug URL context is enabled.

### 3) My Tasks quick-action flow

- Teacher can use quick actions:
  - `Open Homework` -> `/homework`
  - `Open Parent Communication` -> `/parent-updates`
- Labels are action-oriented and understandable.
- No fake-clickable items were added for these quick actions.
- Restricted access copy is clear and distinguishes:
  - demo-role restriction, or
  - real account-role restriction.
- Mobile-safe layout remains intact:
  - quick actions stack on small screens,
  - tap targets keep minimum-height button styling.

## Parent-facing safety boundaries (Homework/Parent Communication)

- Parent-facing feedback/marked work visibility remains tied to release/share actions; nothing auto-sends.
- Parent-facing updates remain governed by existing approved/shared workflow and RLS constraints.
- Internal staff notes remain non-parent-visible.
- This checkpoint introduces no visibility widening for parents/students.

## Security and policy boundaries confirmed

- No SQL or RLS policy edits in this checkpoint.
- No service-role usage added to frontend flows.
- No auth relaxation.
- No parent/student homework-task creation path introduced.
- No notification/email sending introduced.
- No AI Parent Reports or ParentView behavior changed in this checkpoint.

## Test environment note

- Homework/parent-updates/mytasks smoke validations can still show intermittent Supabase auth/rate-limit instability.
- Treat intermittent auth/rate-limit failures as environment instability unless deterministic reproduction indicates a real product regression.

## Recommended next milestone

- Production-hardening lane for teacher workflows:
  - deterministic fixture/auth reliability improvements for smoke environments,
  - final validator UAT runbook with screenshots and pass/fail evidence capture,
  - release-readiness checklist (non-functional and operational).

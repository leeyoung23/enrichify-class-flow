# Teacher Tasks Supabase write plan (planning only)

This document plans the first real Supabase write vertical for Teacher Tasks while preserving current UI/route behavior, `demoRole`, and demo/local fallbacks.

Scope in this plan:

- Planning only (no runtime writes added in this document)
- No UI redesign
- No service-role usage in frontend
- No real data, no AI API calls

Related references:

- `src/pages/MyTasks.jsx`
- `src/services/dataService.js`
- `src/services/supabaseReadService.js`
- `src/services/supabaseAuthService.js`
- `supabase/sql/001_mvp_schema.sql`
- `supabase/sql/003_rls_policies_draft.sql`
- `supabase/sql/006_fix_teacher_tasks_rls.sql`
- `docs/product-feature-gap-audit.md`
- `docs/service-layer-migration-plan.md`

---

## 1) Current task behavior

### What is visible now

- `MyTasks` route renders a task notification list with status and priority chips.
- Access scope in page logic: `teacher`, `branch_supervisor`, `hq_admin` can access the page.
- Teacher sees list items plus a `Mark Complete` button for non-completed items.
- Branch/HQ see overview counters (pending/completed/overdue) and task list visibility by branch/global demo scope.

### What is demo/local today

- Task data is currently produced by `getTeacherNotifications()` in `dataService` from in-memory demo arrays.
- Completion overview is derived locally from those same demo notifications (`getTeacherTaskCompletionOverview`).
- `listTeacherTaskSessions()` returns demo-only data when `demoRole` is active, and currently returns `[]` for non-demo path.
- `Mark Complete` button in `MyTasks` is currently UI-only (no click handler, no persistence).

### Current actions/buttons

- Filter actions: `All`, `Pending`, `Completed`, `Overdue`.
- Teacher-only row action button: `Mark Complete` (presentational at this stage).

---

## 2) Database / RLS readiness

### `teacher_tasks` table readiness

From `001_mvp_schema.sql`:

- `teacher_tasks` exists with core fields: `id`, `branch_id`, optional `class_id`, optional `student_id`, `created_by_profile_id`, `title`, `details`, `status`, `due_at`, timestamps.
- `status` uses shared `task_status` enum: `pending`, `in_progress`, `completed`, `overdue`.

RLS:

- `teacher_tasks_select` exists in draft policies.
- Patched by `006_fix_teacher_tasks_rls.sql` to avoid recursive policy dependency.
- Select visibility after patch: HQ admin, branch supervisor for branch, creator, or class teacher.

### `teacher_task_assignments` table readiness

From `001_mvp_schema.sql`:

- `teacher_task_assignments` exists with fields: `id`, `task_id`, `teacher_id`, `assigned_by_profile_id`, `status`, `completed_at`, timestamps.
- Unique `(task_id, teacher_id)` supports one assignment row per teacher-task pair.
- Status also uses `task_status` enum.

RLS:

- `teacher_task_assignments_select` exists and is patched in `006`.
- `teacher_task_assignments_update_self` exists in both draft and patch:
  - `UPDATE` allowed only when assignment row’s `teacher_id` maps to current `auth.uid()` via `teachers.profile_id`.
  - `WITH CHECK` mirrors same condition, preventing teacher from rewriting assignment to another teacher.

### What roles can currently see/update (with patched task policies)

- **HQ admin**: can select tasks and assignments (broad visibility).
- **Branch supervisor**: can select assignments for tasks in their branch (via helper function in `006`).
- **Teacher**: can select own assignments and update own assignment rows only.
- **Parent/student**: no task-assignment select/update policy grants.

---

## 3) Proposed first write action

Recommended safest first write:

- **Teacher updates own `teacher_task_assignments.status` to `completed`** (and sets `completed_at`).

Why this is safest:

1. Assignment row is already identity-scoped by RLS update policy (`update_self`), minimizing blast radius.
2. It avoids editing shared `teacher_tasks` record state that may represent multi-assignee/global semantics.
3. Schema already supports completion metadata directly on assignment (`completed_at`).
4. Works naturally with future reporting: task-level completion can be derived from assignment statuses.

Not chosen for first write:

- Directly mutating `teacher_tasks.status` from teacher UI. That can be ambiguous when a task has multiple assignments or supervisor-created workflows.

---

## 4) Service layer plan

Add write methods behind service abstraction (no direct DB logic in page components), using Supabase anon client + RLS.

### Recommended file direction

Short-term (minimal change): add task write helper in service layer (new file preferred):

- `src/services/supabaseTaskWriteService.js`

Alternative: colocate temporarily in `src/services/supabaseDataService.js` if that file is introduced concurrently.

### Proposed method(s)

- `updateTeacherTaskAssignmentStatus({ assignmentId, nextStatus })`
  - Intended initial allowed transition: `pending`/`in_progress`/`overdue` -> `completed`.
  - Writes:
    - `status = nextStatus`
    - `completed_at = now()` when `nextStatus === "completed"`
    - `updated_at = now()`
  - Filter:
    - `.eq("id", assignmentId)` (RLS enforces owner teacher row)
  - Return:
    - updated row(s) or structured error object.

Optional helper for read-path parity in same domain (future phase):

- `listTeacherTaskAssignmentsForCurrentUser()` and/or `listTeacherTasksForCurrentUser()`

### Integration rule

- `dataService` should remain facade for pages.
- For demo mode (`demoRole` present): keep using demo arrays/local behavior.
- For real Supabase session path (no demoRole): call Supabase task write helper.

---

## 5) UI behavior later (implementation phase)

When wiring `MyTasks` later:

1. Teacher clicks `Mark Complete`.
2. Page calls service-layer update method.
3. On success, reflect status in UI (`completed`) and hide/disable action.
4. On error, show non-blocking error message.

Notes:

- Optimistic update can be added later; not required for first production-safe write.
- Keep branch/HQ views read-focused first; no branch/HQ status mutation in phase 1.
- Keep `demoRole` flow local/demo-only (no Supabase writes on demo URL mode).

---

## 6) Tests (planned)

Add authenticated smoke write test using existing fake users + anon client (no service role key).

### Minimum smoke cases

1. **Teacher self-update success**
   - Sign in as fake teacher.
   - Select one assignment owned by that teacher.
   - Update status to `completed`.
   - Assert returned row has `status = completed` and `completed_at` set.

2. **Parent/student update denied**
   - Sign in as parent or student fake user.
   - Attempt same update by assignment id.
   - Expect RLS rejection / permission error.

3. **Cross-teacher update denied**
   - Teacher A attempts to update Teacher B assignment.
   - Expect RLS rejection.

4. **Supervisor/HQ write scope decision check**
   - For phase 1, expect no supervisor/HQ update unless explicit policy added.
   - If policy remains teacher-self only, test should assert deny for supervisor/HQ updates.

### Test location approach

- Add a targeted script (example): `scripts/supabase-teacher-tasks-write-smoke-test.mjs`
- Add npm script alias (example): `test:supabase:teacher-tasks:write`
- Keep test data fake/demo-seeded only.

---

## 7) Risks

1. **Updating wrong table**
   - Writing `teacher_tasks.status` instead of assignment status can create incorrect multi-assignee semantics.
2. **RLS too broad**
   - Any added policy widening update scope beyond teacher-self should be explicit and tested role-by-role.
3. **`demoRole` accidentally writing**
   - If demo-mode guard is missed, preview clicks could write to Supabase.
4. **Stale UI after update**
   - Without refresh/state sync, button/status can look unchanged after successful write.
5. **Enum/status mismatch**
   - UI labels must map exactly to `task_status` enum values.
6. **Policy drift between draft and deployed DB**
   - If `006_fix_teacher_tasks_rls.sql` patch not applied in target env, behavior may diverge.

---

## 8) Recommended implementation sequence

### Phase 1 (this document)

- Complete planning and confirm schema/policy-first write target.

### Phase 2

- Add service-layer write method only:
  - `updateTeacherTaskAssignmentStatus(...)`
  - no UI wiring yet.

### Phase 3

- Add authenticated smoke write test with fake teacher and role-deny checks.

### Phase 4

- Wire `MyTasks` teacher `Mark Complete` button to service method.
- Keep demoRole branch local/demo behavior unchanged.

### Phase 5

- Expand read/reporting views for branch supervisor/HQ (task completion oversight dashboards).

---

## 9) Next implementation prompt (Phase 2 + Phase 3 only)

Copy-paste for next execution session:

---

Implement Teacher Tasks write foundation only (service method + smoke test), without UI changes.

Constraints:

- Do not redesign pages/components.
- Do not wire `MyTasks` button yet.
- Keep `demoRole` and demo/local fallback unchanged.
- Use Supabase anon client + RLS only (never service role in frontend scripts/services).
- Use fake seed users only.

Tasks:

1. Create `src/services/supabaseTaskWriteService.js` with:
   - `updateTeacherTaskAssignmentStatus({ assignmentId, nextStatus })`
   - Guard for unconfigured Supabase.
   - Update only `teacher_task_assignments` table.
   - For `nextStatus === "completed"`, set `completed_at` timestamp.
   - Return structured `{ data, error }`.

2. Add smoke test script `scripts/supabase-teacher-tasks-write-smoke-test.mjs`:
   - Teacher can update own assignment to completed.
   - Teacher cannot update another teacher assignment.
   - Parent/student cannot update assignment.
   - (Optional) supervisor/HQ update expected deny unless policy explicitly allows.

3. Add npm script entry for this new smoke test.

4. Run:
   - `npm run build`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:supabase:read`
   - `npm run test:supabase:auth`
   - plus new teacher tasks write smoke test command.

Do not add runtime UI writes in this phase.

---

*Document type: planning only. No application behavior change is intended by this file.*

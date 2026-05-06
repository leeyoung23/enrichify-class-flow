# First real Supabase write checkpoint

This checkpoint records the first visible RLS-backed write action now wired in the app, while preserving `demoRole` preview behavior and avoiding service-role usage in frontend code.

---

## 1) What was implemented

- Added a real Supabase write method for teacher task assignment completion:
  - `updateTeacherTaskAssignmentStatus({ assignmentId, status, completedAt })`
- Added authenticated smoke test coverage for task assignment writes:
  - teacher can update own assignment and revert
  - parent/student updates are blocked
- Wired `MyTasks` teacher `Mark Complete` button to call the write service for authenticated non-demo users.
- Preserved demo mode contract:
  - `demoRole` remains local/demo-only and does not write to Supabase.

---

## 2) Files changed

- `src/pages/MyTasks.jsx`
- `src/services/dataService.js`
- `src/services/supabaseWriteService.js`
- `scripts/supabase-teacher-task-write-smoke-test.mjs`
- `package.json`
- `docs/teacher-tasks-write-plan.md`

---

## 3) How real teacher task completion works

1. Teacher signs in via real Supabase auth (non-demo path).
2. `MyTasks` loads assignment-backed items with `assignmentId` from `teacher_task_assignments` read mapping.
3. On `Mark Complete`, page calls:
   - `updateTeacherTaskAssignmentStatus({ assignmentId, status: "completed", completedAt: new Date().toISOString() })`
4. Service updates only safe fields on `teacher_task_assignments`:
   - `status`
   - `completed_at`
   - `updated_at`
5. UI shows item-level loading and success/error feedback; list is refreshed after success.

---

## 4) How `demoRole` avoids writes

- `MyTasks` checks `getSelectedDemoRole()` first.
- When `demoRole` is present:
  - list remains local/demo source
  - `Mark Complete` does not call Supabase write service
  - user sees an informational local/demo message
- This preserves preview mode and prevents accidental writes from URL demo sessions.

---

## 5) RLS safety

- Teacher write scope is assignment-self only (existing RLS policy target):
  - teacher can update own `teacher_task_assignments` rows.
- Parent/student write scope:
  - blocked by RLS (or no visible updated rows under policy scope).
- Frontend key usage:
  - anon/publishable Supabase client only
  - no service role key used in frontend services or smoke tests.

---

## 6) Manual preview checklist

- Sign in as fake teacher account on `/login` (non-demo).
- Open `/my-tasks`.
- Click `Mark Complete` on a non-completed item.
- Confirm loading + success feedback and completed state behavior.
- Open `/my-tasks?demoRole=teacher`.
- Confirm demo preview remains local and does not write.

---

## 7) What remains

- Attendance writes (save/update flow).
- Parent updates release/share workflow persistence.
- Upload/storage-backed flows.
- Staff time clock backend write/read path.
- Memories backend (`class_media`-style metadata + storage).
- AI Edge Functions for generation/marking workflows.

---

## 8) Recommended next write vertical

Recommended next: **Attendance save/update**.

Why this next:

1. High operational impact with limited scope (single domain, familiar statuses).
2. Existing attendance UI already exists and can benefit quickly from durable writes.
3. RLS model for class/teacher scope is already conceptually aligned and easier to validate role-by-role than broader release workflows.
4. It provides a strong foundation for downstream domains (homework, parent updates, teacher KPI accuracy).

Alternative after attendance:

- Parent Updates release flow (higher workflow complexity with draft/review/release transitions).

---

*Checkpoint type: documentation only. No additional app behavior change is introduced by this file.*

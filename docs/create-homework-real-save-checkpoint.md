# Create Homework Real Save Checkpoint

## 1) What was implemented

Real authenticated non-demo **Create Homework** save is wired on the `Homework` page to the existing assignment write service `createHomeworkTaskWithAssignees(...)`, with guarded validation, loading state, success/error messaging, form close/reset, post-create task selection when the service returns a task id, and React Query invalidation for tracker and review-related queries.

Demo mode behavior for creation remains unchanged: local-only fake simulation with no Supabase writes.

## 2) Files changed

Implementation and related documentation updates were:

- `src/pages/Homework.jsx`
- `docs/create-homework-ui-shell-checkpoint.md`
- `docs/homework-selected-assignment-write-service-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

This checkpoint file records the real-save milestone for continuity.

## 3) Real save behavior

- Authenticated non-demo **Create Homework** save calls `createHomeworkTaskWithAssignees(...)` from the existing write service.
- No duplicate service method was added.
- No direct SQL from the UI.
- Guarded validation runs before the service call.
- Loading state is shown while saving (e.g. disabled save / “Saving…” pattern).
- Success: success toast, close/reset create form, select/switch to created task when returned in service data.
- Failure: safe error toast; errors do not expose raw SQL, env values, or sensitive backend details.

## 4) Validation rules

- Title required.
- Valid class UUID required for the selected class.
- Valid branch UUID context required (resolved from existing loaded homework/task context; no guessed IDs).
- Assignment-type student requirements enforced:
  - selected students: one or more students required.
  - individual: exactly one student required.
- Due date format enforced as `YYYY-MM-DD` when provided.
- User-facing errors stay generic/safe (no raw SQL/env/sensitive details).

## 5) Assignment type behavior

**Whole class**

- `assignmentScope = class`
- No student IDs sent (empty / omitted per service contract for class scope).

**Selected students**

- `assignmentScope = selected_students`
- One or more students required.

**Individual**

- `assignmentScope = individual`
- Exactly one student required.

**Service payload mapping**

- `branchId`
- `classId`
- `title`
- `instructions`
- `subject`
- `dueDate`
- `assignmentScope`
- `studentIds`
- `notes`

## 6) demoRole behavior

- Unchanged local-only fake create simulation.
- Fake task and assignee rows appended locally where applicable.
- No Supabase writes.
- No uploads.
- No provider/API calls.
- No real AI.

## 7) Tracker refresh behavior

On real create success, query invalidation includes:

- `homework-review-tasks`
- `homework-tracker-by-class`
- `homework-tracker-by-student`
- `homework-review-submissions`

**Explanation**

- The created task should appear in By Task / By Student views where RLS and visibility rules allow the current user to read it after refresh.
- Existing tracker wiring and review flows remain intact; invalidation only refetches data.

## 8) Review/release preservation

Unchanged and preserved:

- By Task tracker
- By Student tracker
- Submission detail
- Signed URL file viewing
- Feedback fields (feedback text, next step, internal note)
- Save draft
- Mark reviewed
- Return for revision
- Release to parent role gate
- Mock-only AI draft button
- No auto-save
- No auto-release

## 9) Tests

Executed for the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:assignment:write`
- `npm run test:supabase:homework:tracker:read`
- `npm run test:supabase:homework:feedback`
- `npm run test:ai:homework-feedback:mock`

**Notes**

- Assignment and tracker smoke tests passed with non-fatal `CHECK` for unavailable optional parent linked-student fixture (expected in some environments).
- Assignees read smoke (`npm run test:supabase:homework:assignees:read`) was not required because shared read/service behavior was unchanged in that milestone.

## 10) What remains

- Selected-student creation UX polish
- Edit/archive assignment UI
- Manual marked-file upload
- AI provider integration
- Announcements/Internal Communications planning/work

## 11) Recommended next milestone

**Options:** A. Selected-student creation UX polish · B. Manual marked-file upload planning · C. Resume AI Edge Function deployment · D. Edit/archive assignment UI planning · E. Announcements/Internal Communications planning

**CTO recommendation: B — Manual marked-file upload planning first** (strategy: complete the human homework loop before leaning on AI).

**Reason**

- Teachers may mark work manually; that path should be first-class.
- AI should be optional, not the only marking path.
- Marked-file upload reflects real-world operations and parent/staff expectations.
- Once manual marked-file release is planned (and later implemented), AI provider work can build on a complete human workflow rather than a partial one.

**When C might win instead:** If the immediate product bet is AI-assisted marking in dev/staging and manual upload is explicitly deferred, resume Edge Function deployment planning—but default recommendation here is **B** for operational completeness.

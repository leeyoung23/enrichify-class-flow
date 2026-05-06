# Supabase Implementation Roadmap

This roadmap turns the current Young's Learners Supabase schema and RLS planning documents into a practical build sequence for a future real backend.

This is documentation only. Do not connect Supabase, create live tables, implement real authentication, or use real student, parent, teacher, school, fee, payment, homework, or upload data yet.

## 1. Current stage

Young's Learners is currently a React/Vite prototype.

Current state:

- The app still contains Base44 dependencies for auth, entities, functions, uploads, invites, and platform wiring.
- Supabase is planned but not connected.
- `/welcome` is a UI-only public entry page.
- Dashboards, portals, role navigation, and services still run on fake/demo data and Base44 prototype assumptions.
- No real student, parent, teacher, school, fee, payment, homework, or upload data should be used.

The next backend work should happen behind the service layer and after the database/RLS design is reviewed.

## 2. MVP backend scope

### MVP tables

Build these first because they support the current product workflows:

- `profiles`
- `branches`
- `classes`
- `students`
- `guardians`
- `guardian_student_links`
- `teachers`
- `teacher_class_assignments`
- `attendance_records`
- `homework_records`
- `homework_attachments`
- `parent_reports`
- `teacher_tasks`
- `teacher_task_assignments`
- `task_attachments`
- `staff_invites`
- `schools`
- `student_school_profiles`
- `fee_records`
- `observations`
- `leads`
- `trial_schedules`

### Phase 2 tables

Keep these out of the MVP unless the backend, auth, RLS, storage, and seed-data pilot are stable:

- `curriculum_knowledge_base`
- `homework_scans`
- `ai_marking_diagnoses`
- `teacher_follow_up_tasks`
- `student_reminders`
- `student_learning_profiles` if not needed immediately

## 3. Supabase setup sequence

Recommended backend setup order:

1. Create Supabase project.
2. Configure environment variables locally.
3. Create enums.
4. Create MVP tables.
5. Add foreign keys.
6. Add indexes.
7. Enable RLS.
8. Add helper functions.
9. Add RLS policies.
10. Create private storage buckets.
11. Add seed fake data.
12. Create test users for each role.
13. Test RLS using direct queries/API.
14. Only then connect frontend services.

Do not start frontend integration until fake data and role-based direct-query tests pass.

## 4. Frontend migration sequence

Replace Base44 safely by preserving current UI and service boundaries.

Recommended frontend sequence:

1. Keep current UI and routes.
2. Create a Supabase client.
3. Rewrite `authService` behind the same interface.
4. Rewrite `dataService` read methods.
5. Rewrite `classSessionService`.
6. Rewrite write methods one by one.
7. Replace file upload with Supabase Storage.
8. Replace `sendParentReport` with an Edge Function later.
9. Remove Base44 SDK/plugin only after parity is confirmed.

Important rules:

- Pages/components should continue calling services.
- Services should become the Supabase boundary.
- Do not put backend/data logic directly into page components.
- Do not replace `demoRole` until real auth is tested.

## 5. Testing checklist

Each role must be tested with UI navigation, direct URLs, direct API/database access, and storage access where relevant.

### HQ Admin

- Dashboard access.
- Sidebar access.
- Direct restricted URL access.
- Data visibility across all branches.
- Create/update permissions for management records.
- Storage access across all private buckets through allowed metadata.

### Branch Supervisor

- Dashboard access.
- Sidebar access.
- Direct restricted URL access.
- Data visibility limited to own branch.
- Create/update permissions for own branch records.
- Storage access limited to own branch files.

### Teacher

- Dashboard and Class Session access.
- Sidebar access limited to teacher workflow.
- Direct restricted URL access for finance/admin pages.
- Data visibility limited to assigned classes/students/tasks.
- Create/update permissions for attendance, homework review, notes, reports, and assigned tasks.
- Storage access for assigned class materials/homework only.

### Parent

- Parent dashboard access.
- Parent/student-facing sidebar access only.
- Direct restricted URL access for internal pages.
- Data visibility limited to linked children.
- Create/upload permissions only where product rules allow for linked children.
- Storage access only for linked-child files that should be parent-visible.

### Student

- Student learning portal access.
- Student-facing sidebar access only.
- Direct restricted URL access for internal pages.
- Data visibility limited to own learning records.
- Create/upload permissions only if a student upload flow is intentionally enabled.
- Storage access only for own released materials/files.

## 6. Seed data plan

Fake seed data should be realistic enough to test RLS and workflows without using real private data.

Seed these records:

- Branches.
- Classes.
- Teachers.
- Students.
- Guardians.
- Guardian links.
- Attendance.
- Homework.
- Reports.
- Tasks.
- Fees.
- Observations.
- Leads.
- Trial schedules.

Seed data should include at least:

- Two branches.
- One HQ admin.
- One branch supervisor per branch.
- Multiple teachers with different class assignments.
- Multiple students across branches/classes.
- Parent linked to one child only.
- Student user linked to one student only.
- Positive and negative RLS cases.

## 7. Backend safety gates

Do not use real data until all gates pass:

- Supabase Auth works.
- RLS tested.
- Storage policies tested.
- Backup plan confirmed.
- Fake data pilot tested.
- Staff invite code flow tested.
- Parent-child linking tested.
- No Base44 production dependency remains for real data paths.

Additional checks:

- Every private table has RLS enabled.
- Every Storage bucket is private.
- Every role has a direct-query/API test.
- Every invite code is validated server-side.
- Every parent-child relationship is enforced by database relationships.

## 8. What Cursor should do next after this document

Recommended next technical planning tasks:

1. Create `.env.example` for future Supabase variables.
2. Create `docs/seed-data-plan.md`.
3. Create `docs/service-layer-migration-plan.md`.

Do not implement these yet unless explicitly requested.

## 9. What not to do yet

Do not:

- Connect real Supabase yet.
- Import real student data.
- Implement real payment.
- Implement AI marking.
- Remove Base44 until service parity exists.
- Replace `demoRole` until real auth is ready.
- Use real student, parent, teacher, school, fee, payment, homework, or upload data.

The correct next move is still planning and fake-data validation, not production data entry.

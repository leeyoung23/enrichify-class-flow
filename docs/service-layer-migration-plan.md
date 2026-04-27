# Service Layer Migration Plan

This plan explains how to replace Base44 with Supabase behind the existing service layer without changing the product UI first.

This is preparation only. Do not connect Supabase, change runtime service imports, remove Base44, or use real data yet.

## 1. Current service files

Current frontend/service boundaries:

- `src/services/authService.js`
- `src/services/dataService.js`
- `src/services/classSessionService.js`
- `src/services/permissionService.js`

Current responsibilities:

- `authService.js`: demo-role selection, fake demo users, current Base44 user lookup.
- `dataService.js`: demo data, entity reads/writes, summaries, invites, report function call, LLM call, upload call.
- `classSessionService.js`: attendance and session parent-update writes.
- `permissionService.js`: role constants, allowed routes, navigation map, and access helper functions.

Important boundary:

- Pages and components should keep calling service functions.
- Pages and components should not talk directly to Supabase tables.
- Backend/data access logic should move into Supabase-backed services, not into UI files.

## 2. Future Supabase service files

Recommended future service modules:

- `src/api/supabaseClient.js`
- `src/services/supabaseAuthService.js`
- `src/services/supabaseDataService.js`
- `src/services/supabaseClassSessionService.js`
- `src/services/supabaseStorageService.js`

Suggested responsibilities:

### `supabaseClient.js`

- Creates the browser Supabase client.
- Reads only frontend-safe variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Must never read or expose `SUPABASE_SERVICE_ROLE_KEY`.

### `supabaseAuthService.js`

- Loads Supabase session.
- Loads current profile.
- Resolves database-backed role.
- Replaces Base44 auth lookup after testing.
- Keeps demo mode isolated while `demoRole` remains active.

### `supabaseDataService.js`

- Replaces entity reads/writes currently handled by `dataService.js`.
- Owns list/get/create/update helpers for:
  - branches
  - classes
  - students
  - guardians
  - attendance
  - homework
  - reports
  - tasks
  - fees
  - observations
  - leads
  - trial schedules

### `supabaseClassSessionService.js`

- Replaces session-specific attendance and parent-report writes.
- Keeps Class Session UI stable.
- Handles per-student attendance, homework status, notes, drafts, and approvals.

### `supabaseStorageService.js`

- Handles private Supabase Storage uploads/downloads.
- Creates metadata rows before or after upload as required.
- Should cover:
  - homework uploads
  - task attachments
  - receipts
  - observation files
  - learning materials

## 3. Migration rule

Pages and components should keep calling services.

Do:

- Keep page props, hooks, and route behavior stable.
- Preserve current service function names where possible.
- Replace internals behind the service boundary.
- Use fake seed data first.
- Keep `demoRole` until real auth is tested.

Do not:

- Move SQL/query logic directly into page components.
- Add Supabase calls inside dashboard components.
- Add file upload logic directly inside UI components.
- Replace route guards before profile/RLS behavior is tested.
- Remove Base44 before Supabase parity exists.

## 4. Service migration order

Recommended order:

1. Auth/profile loading.
2. Branches/classes/students read methods.
3. Attendance/homework read methods.
4. Parent reports read methods.
5. Class session writes.
6. Homework attachment upload.
7. Teacher tasks.
8. Fee records.
9. Observations.
10. Leads/trial schedules.
11. Report sending later through Edge Function.

### Step 1: Auth/profile loading

Goal:

- Add Supabase session/profile loading behind a service interface.
- Keep `/welcome` and `demoRole` prototype behavior untouched.
- Map Supabase `profiles.role` to current role constants.

Do not:

- Replace `demoRole` yet.
- Add real login UI behavior yet.
- Use real user data.

### Step 2: Branches/classes/students read methods

Goal:

- Replace list/read methods first.
- Confirm HQ, branch supervisor, teacher, parent, and student visibility with fake data.

Candidate methods:

- `listBranches`
- `listClasses`
- `listStudents`
- `listStudentsByClass`
- `getStudentById`
- `getClassById`

### Step 3: Attendance/homework read methods

Goal:

- Replace read paths for dashboards, attendance pages, homework pages, and parent/student views.

Candidate methods:

- `listAttendanceRecords`
- `listHomeworkAttachments`
- `listHomeworkAttachmentsByStudent`
- `getHomeworkAttachmentSummary`

### Step 4: Parent reports read methods

Goal:

- Replace parent update/report reads.
- Confirm parents/students see only approved/shared reports.

Candidate methods:

- `listParentUpdates`
- `listParentUpdatesByStudent`
- report summary helpers

### Step 5: Class session writes

Goal:

- Replace writes after reads are stable.
- Keep Class Session UI unchanged.

Candidate methods:

- `saveAttendanceRecord`
- `saveAttendanceNotes`
- `saveSessionParentUpdate`
- `createParentUpdate`

### Step 6: Homework attachment upload

Goal:

- Replace Base44 file upload with Supabase Storage and metadata rows.
- Use fake/test files only.

Candidate methods:

- `uploadHomeworkAttachment`
- future `createHomeworkAttachment`
- future `getSignedHomeworkUrl`

### Step 7: Teacher tasks

Goal:

- Move task data from demo structures into `teacher_tasks` and `teacher_task_assignments`.
- Preserve dashboard and My Tasks behavior.

### Step 8: Fee records

Goal:

- Persist fee records and receipt metadata.
- Keep financial details hidden from teachers/students.
- Use fake amounts and fake receipt references only.

### Step 9: Observations

Goal:

- Persist observation forms and detail pages.
- Enforce branch/teacher visibility.

### Step 10: Leads/trial schedules

Goal:

- Persist enrolment and trial scheduling records.
- Keep teacher visibility limited to assigned trials/tasks, not full branch operations.

### Step 11: Report sending through Edge Function

Goal:

- Replace Base44 `sendParentReport` function later.
- Validate caller permission server-side.
- Generate parent access through Supabase Auth or signed server flow.

Do not implement until parent auth/linking is ready.

## 5. Base44 dependencies to replace

Replace these only after Supabase equivalents are tested:

- Base44 auth.
- Base44 entities.
- Base44 functions.
- Base44 file upload.
- Base44 invite/user flow.
- Base44 LLM/report generation calls.

Current dependency areas:

- `src/api/base44Client.js`
- `src/lib/AuthContext.jsx`
- `src/lib/app-params.js`
- `src/services/authService.js`
- `src/services/dataService.js`
- `src/services/classSessionService.js`
- `src/components/layout/Sidebar.jsx`
- `src/lib/PageNotFound.jsx`
- `src/components/classSession/StudentSessionCard.jsx`
- `base44/functions/sendParentReport/entry.ts`
- `vite.config.js`
- `package.json`

## 6. Safety rules

Preserve:

- Current UI.
- Current routes.
- Current dashboards.
- Current role navigation.
- Current parent/student portals.
- Current Class Session behavior.
- `demoRole` until real auth is tested.

Use:

- Fake seed data first.
- Role-by-role test users.
- Direct API/database RLS tests.
- Private test storage buckets.

Do not:

- Remove Base44 until Supabase parity is confirmed.
- Use real student data.
- Use real parent data.
- Use real teacher data.
- Use real school data.
- Use real fee/payment data.
- Use real homework/upload data.
- Put Supabase queries directly in page components.

## 7. Completion criteria before removing Base44

Base44 should only be removed after:

- Supabase Auth loads profiles correctly.
- All role dashboards work with fake Supabase data.
- Parent and student portals work with fake Supabase data.
- RLS blocks direct restricted access.
- Storage policies block unauthorized files.
- Class Session reads/writes work.
- Parent reports read/write/approval flow works.
- Homework upload metadata and storage work.
- Staff invites work with server-side validation.
- Edge Function replacement is ready for report sending.
- `npm run build`, `npm run lint`, and `npm run typecheck` pass.

## 8. What not to do yet

Do not:

- Change app UI.
- Change `/welcome`.
- Change dashboards.
- Change services yet.
- Connect real Supabase.
- Create live tables.
- Replace Base44 imports.
- Implement real auth.
- Implement payment.
- Implement AI marking.
- Collect real data.

This plan should be executed only after the schema, RLS, seed data, and service migration plans are approved.

# Attendance Supabase write checkpoint

This checkpoint captures the second visible Supabase write action in the app: Attendance Save writing to `attendance_records` for authenticated non-demo users.

## What was implemented

- Attendance Save is now wired to a real Supabase write path for authenticated, non-demo sessions.
- Existing service method `updateAttendanceRecord({ recordId, status, note })` is used to persist row-level attendance edits.
- Demo mode behavior remains preserved: `demoRole` keeps using local/demo state and does not write to Supabase.
- Attendance write smoke coverage is in place via `npm run test:supabase:attendance:write`.
- This is the second visible RLS-backed write after MyTasks completion writes.

## Files changed

- `src/pages/Attendance.jsx`
- `src/services/dataService.js`
- `src/services/supabaseWriteService.js`
- `scripts/supabase-attendance-write-smoke-test.mjs`
- `package.json`
- `docs/attendance-write-plan.md`

## How real attendance save works

1. User logs in as an authenticated teacher/non-demo user.
2. User opens `/attendance`, edits status and/or note for one or more rows, then saves.
3. The save flow sends changed row payloads through the service layer.
4. `updateAttendanceRecord({ recordId, status, note })` updates `attendance_records` using the Supabase anon client under RLS.
5. After save, the page refresh path confirms persisted values from backend-backed reads.

Write scope remains row-level and safe-field-only (`status`, `note`, `updated_at`) to reduce mutation risk.

## How demoRole avoids writes

- `demoRole` remains first-priority preview mode and local/demo only.
- In demo mode (`/attendance?demoRole=teacher`), attendance interactions stay in local/demo data paths.
- Supabase write calls are not executed for demo role flows.
- This preserves safe preview behavior without touching production-backed records.

## RLS safety

- Teacher write behavior: teacher can update attendance for assigned class/student scope.
- Parent/student behavior: parent and student write attempts are blocked (verified by smoke coverage).
- Service role usage: not used in frontend runtime or this attendance write path.
- Auth path: writes run with Supabase anon client + authenticated user JWT, enforced by RLS.

## Manual preview checklist

1. Log in as a teacher account.
2. Open `/attendance`.
3. Change a student status and/or note.
4. Save attendance changes.
5. Refresh/reload and verify values persist.
6. Open `/attendance?demoRole=teacher` and verify demo edits stay local and do not write.

## What remains

- Bulk/session attendance polish.
- Parent-facing attendance summary.
- Parent Updates real release flow.
- Uploads/storage implementation.
- Staff Time Clock backend.
- Memories backend.
- AI Edge Functions.

## Recommended next milestone

Recommended: **Parent Updates real save/release flow**.

Why this next:

- It extends the same safe service-layer + RLS write pattern already proven by MyTasks and Attendance.
- It delivers clear staff-to-family product value without introducing storage complexity yet.
- It keeps scope focused on relational writes and permissions before adding uploads/storage concerns.

Storage pattern design should follow immediately after Parent Updates write/release flow is stable.

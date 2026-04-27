# Supabase RLS Manual Testing Guide

This guide explains how to manually validate Row Level Security (RLS) with fake/demo users before connecting the main frontend.

Use fake/demo data only.

## 1) Why SQL Editor is not enough

Supabase SQL Editor may run with elevated privileges depending on how queries are executed.
That can bypass normal user-level RLS behavior.

So:

- SQL Editor is useful for setup and diagnostics.
- SQL Editor alone is not enough to prove real role-based access.
- Real RLS validation must be done using authenticated user sessions (one session per fake user role).

## 2) Fake users to test

Test RLS behavior with these fake accounts:

- `hq.demo@example.test`
- `supervisor.demo@example.test`
- `teacher.demo@example.test`
- `parent.demo@example.test`
- `student.demo@example.test`

## 3) Expected access by role

### HQ Admin

- Should see all branch and operational records.
- Should be able to manage staff/internal operational data by policy.

### Branch Supervisor

- Should see own branch records only.
- Should not access other branches.

### Teacher

- Should see assigned classes/students/tasks only.
- Should not access finance/payment/sales management data.

### Parent

- Should see linked-child records only.
- Should only see approved/released parent-facing communication records.

### Student

- Should see own learning records only.
- Should not access internal operations or staff-only records.

## 4) Tables to test for each role

Run visibility checks against:

- `branches`
- `classes`
- `students`
- `attendance_records`
- `homework_records`
- `parent_comments`
- `weekly_progress_reports`
- `fee_records`
- `teacher_tasks`
- `sales_kit_resources`

For each table, confirm both:

- Allowed reads return expected rows.
- Disallowed reads return zero rows or permission errors (depending on query path/tooling).

## 5) Required blocked-access tests

At minimum, verify these negative cases:

- Teacher cannot access `fee_records` / payment receipt records.
- Teacher cannot access `sales_kit_resources`.
- Parent cannot see draft/unapproved `parent_comments`.
- Parent cannot see draft/unapproved `weekly_progress_reports`.
- Branch Supervisor cannot see archived `sales_kit_resources`.
- Student cannot see internal `teacher_tasks`.

## 6) Safe way to test RLS (recommended)

Use one of these approaches later:

1. Supabase client with real fake-user login sessions (recommended first).
2. Temporary local RLS test script/harness that authenticates as each fake role.

Rules:

- Never use real data.
- Keep tests isolated to fake/demo rows.
- Record pass/fail evidence role-by-role.

## 7) Local smoke test harness (available now)

A temporary local harness is available:

- `scripts/rls-smoke-test.mjs`

Run:

`npm run test:rls`

Required local env vars in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Passwords (either one shared or role-specific):
  - `RLS_TEST_PASSWORD` (shared fallback)
  - `RLS_TEST_HQ_PASSWORD`
  - `RLS_TEST_SUPERVISOR_PASSWORD`
  - `RLS_TEST_TEACHER_PASSWORD`
  - `RLS_TEST_PARENT_PASSWORD`
  - `RLS_TEST_STUDENT_PASSWORD`

Notes:

- The script uses anon key only and does not use service role key.
- It signs in each fake user, queries key tables, prints PASS/CHECK/WARNING, then signs out.
- It is a smoke test, not a full assertion suite.

## 8) Recommended next implementation step

Before connecting the main frontend to Supabase:

- Build a temporary RLS test script or minimal local test harness that logs in as each fake user and runs table visibility assertions.

This gives high-confidence RLS validation before production-facing integration work.


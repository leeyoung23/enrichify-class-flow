# Homework Smoke Test Auth Setup Checkpoint

Date: 2026-05-04

## Scope

- `test:supabase:homework:feedback`
- `test:supabase:homework:assignment:write`
- shared smoke auth prerequisites

## Required environment setup

These scripts load `.env.local` and require:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- role passwords via either:
  - role-specific keys:
    - `RLS_TEST_SUPERVISOR_PASSWORD`
    - `RLS_TEST_TEACHER_PASSWORD`
    - `RLS_TEST_PARENT_PASSWORD`
    - `RLS_TEST_STUDENT_PASSWORD`
    - (`RLS_TEST_HQ_PASSWORD` optional for broader suites)
  - or shared fallback: `RLS_TEST_PASSWORD`

Optional:

- `RLS_TEST_STUDENT_EMAIL` (defaults to `student.demo@example.test` in scripts)

## Fixture requirements for deterministic homework smokes

- The parent smoke account must have a valid `linked_student_id`.
- The linked student should be in a class/branch that is visible to staff test accounts used by the script path.
- For `homework:assignment:write`, the script now discovers a supervisor-visible student fixture first (under current RLS), then uses that student/class/branch for allowed-write assertions.
  - This keeps the main assertion aligned with legitimate branch scope.
  - If no supervisor-visible student fixture is available, treat as fixture/setup failure.

## Interpreting common failures

- **`sign-in failed (...)`**:
  - credential or auth-rate-limit issue in test environment.
- **`Auth session missing!`** from a write call:
  - smoke actor session not available at write step (usually environment/auth state issue, not UI logic).
- **`new row violates row-level security policy for table "homework_tasks"`** in assignment write:
  - fixture scope mismatch (branch/class/user scope), or an actual RLS policy regression.
  - Verify fixture alignment first before treating as product bug.

## Why this checkpoint was added

- `.env.example` was missing while project docs referenced copying from it.
- Homework smoke auth/fixture assumptions needed to be explicit so setup-only failures are not mistaken for frontend product defects.

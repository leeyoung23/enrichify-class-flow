# Supabase Project Setup Checklist

This checklist prepares a safe migration path from the current demo prototype to a real Supabase-backed app later.

Use this document as a **do-this-in-order** guide. Do not skip steps.

## 1) Current Safe Checkpoint

Confirm this baseline before any Supabase work:

- Current branch: `cursor/safe-lint-typecheck-486d`
- Current checkpoint commit: `5339528` (`Document successful Supabase RLS smoke test`)
- `npm run build` passes
- `npm run lint` passes
- `npm run typecheck` passes
- App is currently demo-safe
- No real AI call path remains
- `demoRole` must remain enabled during transition
- Project has progressed past initial SQL setup into successful fake-user Supabase RLS smoke testing.

## 2) Supabase Account and Project Setup

When ready to create the real Supabase project:

- Create a Supabase account (if not already created)
- Create a new project in Supabase
- Choose the best region for your expected users
- Save the project URL
- Save the anon/public key
- Save the service role key securely
- Never paste service role key into frontend code
- Never commit real keys to git

## 3) Environment File Setup

Prepare env files safely:

- Use `.env.example` as the template
- Create `.env.local` on your machine only
- Add `VITE_SUPABASE_URL`
- Add `VITE_SUPABASE_ANON_KEY`
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only (never browser/client)
- Ensure `.env.local` is not committed

## 4) Database Build Order

Create database objects in this order:

1. `enums`
2. `profiles`
3. `branches`
4. `classes`
5. `students`
6. `guardians`
7. `guardian_student_links`
8. `teachers`
9. `teacher_class_assignments`
10. `attendance_records`
11. `homework_records`
12. `homework_attachments`
13. `parent_reports` / `parent_comments`
14. `weekly_progress_reports`
15. `teacher_tasks`
16. `fee_records`
17. `leads`
18. `trial_schedules`
19. `observations`

## 5) RLS Setup Order

Apply Row Level Security progressively:

- Enable RLS table by table (not all at once)
- Start with `profiles`, `branches`, `classes`
- Then `students` and `guardian_student_links`
- Then `teachers` and `teacher_class_assignments`
- Then `attendance`, `homework`, and communication/report tables
- Test each role before moving to the next stage

## 6) Fake Seed Data

Seed only fake/demo data first:

- Fake HQ admin
- Fake branch supervisor
- Fake teacher
- Fake parent
- Fake student
- Fake branch/class/student records
- Never use real school/student/parent data at this stage

## 7) Frontend Connection Sequence

Connect frontend in safe phases:

1. Keep current demo data paths first
2. Create Supabase client file later
3. Connect read-only data first
4. Then auth/profile loading
5. Then attendance/homework flows
6. Then Parent Updates flows (`/parent-updates` — quick comments + weekly reports)
7. Then uploads
8. Sending/report automation comes later

## 8) Safety Gates Before Real Data

All checks must pass before any real data:

- Supabase Auth works
- RLS tested for every role
- Parent-child access tested
- Teacher-class access tested
- Storage policy tested
- Backup and recovery process understood
- No real data until all role tests pass

## 9) What Not To Do Yet

Do not do any of these yet:

- Do not import real data
- Do not enable payment
- Do not enable real AI marking
- Do not enable email/WhatsApp sending
- Do not remove `demoRole`
- Do not delete Base44 fallback until Supabase parity exists

## 10) Recommended Next Cursor Task (After This Checklist)

Recommended next planning tasks only:

- Create initial Supabase SQL migration draft files
- Create fake seed data SQL draft
- Create an RLS role-test checklist

Do not implement production integration yet. Keep the app demo-safe during preparation.

-- 021_announcements_phase1_fake_fixture_activation.sql
-- DEV-ONLY / FAKE-FIXTURE-ONLY SQL DRAFT FOR ANNOUNCEMENTS PHASE 1 SMOKE TESTING.
-- Manual review + manual apply in Supabase DEV SQL Editor only.
-- Do NOT apply in production.
-- Do NOT use real users/data.
-- No destructive drops, no deletes, no password changes, no secrets.
-- No RLS weakening is included in this patch.

-- Fake fixture anchors from existing seed assumptions (005_fake_seed_data.sql).
-- These are example.test identities only.
-- If any row is missing, stop and verify fake seed/auth fixture state first.

-- Optional pre-check: review current fake fixture profile state before updates.
select
  p.id as profile_id,
  p.email,
  p.role,
  p.is_active,
  p.branch_id
from public.profiles p
where p.email in (
  'hq.demo@example.test',
  'supervisor.demo@example.test',
  'teacher.demo@example.test',
  'parent.demo@example.test',
  'student.demo@example.test'
)
order by p.email;

-- Activate fake HQ profile only (no branch assignment).
update public.profiles p
set is_active = true
from auth.users u
where u.id = p.id
  and u.email = 'hq.demo@example.test'
  and p.email = 'hq.demo@example.test'
  and p.role = 'hq_admin';

-- Activate + align fake branch supervisor profile to fake north branch.
update public.profiles p
set
  is_active = true,
  branch_id = '11111111-1111-1111-1111-111111111111'
from auth.users u
where u.id = p.id
  and u.email = 'supervisor.demo@example.test'
  and p.email = 'supervisor.demo@example.test'
  and p.role = 'branch_supervisor';

-- Activate + align fake teacher profile to fake north branch for targeted flow checks.
update public.profiles p
set
  is_active = true,
  branch_id = '11111111-1111-1111-1111-111111111111'
from auth.users u
where u.id = p.id
  and u.email = 'teacher.demo@example.test'
  and p.email = 'teacher.demo@example.test'
  and p.role = 'teacher';

-- Keep parent/student non-staff role integrity; no role escalation.
-- This alignment is scoped to fake fixtures only and does not set staff roles.
update public.profiles p
set branch_id = '11111111-1111-1111-1111-111111111111'
from auth.users u
where u.id = p.id
  and u.email = 'parent.demo@example.test'
  and p.email = 'parent.demo@example.test'
  and p.role = 'parent';

update public.profiles p
set branch_id = '11111111-1111-1111-1111-111111111111'
from auth.users u
where u.id = p.id
  and u.email = 'student.demo@example.test'
  and p.email = 'student.demo@example.test'
  and p.role = 'student';

-- Optional teacher-targeted fixture alignment (safe/idempotent).
-- Ensure fake teacher row exists in teachers table with matching fake branch.
update public.teachers t
set branch_id = '11111111-1111-1111-1111-111111111111'
from public.profiles p
where t.profile_id = p.id
  and p.email = 'teacher.demo@example.test'
  and p.role = 'teacher';

-- Verification: fake fixture identity + role + active + branch view.
select
  p.email as fake_fixture_email,
  p.role,
  p.is_active,
  p.branch_id
from public.profiles p
where p.email in (
  'hq.demo@example.test',
  'supervisor.demo@example.test',
  'teacher.demo@example.test',
  'parent.demo@example.test',
  'student.demo@example.test'
)
order by p.email;

-- Verification: fake branch alignment for supervisor/teacher role fixtures.
select
  p.email as fake_staff_email,
  p.role,
  p.branch_id,
  b.name as branch_name
from public.profiles p
left join public.branches b on b.id = p.branch_id
where p.email in ('supervisor.demo@example.test', 'teacher.demo@example.test')
order by p.email;

-- Reminder: after MANUAL DEV apply of this draft, rerun:
-- npm run test:supabase:announcements:phase1
select 'Reminder: rerun npm run test:supabase:announcements:phase1 after manual dev apply of 021.' as next_step;

-- 019_ai_homework_deployed_regression_fixture.sql
-- DEV-ONLY / FAKE-DATA-ONLY fixture draft for deployed AI homework regression.
-- Manual review + manual apply in DEV Supabase project only.
-- DO NOT apply to production.
-- DO NOT use real identities or real student/homework data.
--
-- Safety rules:
-- - additive only
-- - no destructive drops
-- - no deletes
-- - no global RLS disable
-- - no secrets/passwords in SQL
--
-- Preconditions:
-- - Fake auth users should already exist in auth.users:
--   hq.demo@example.test
--   supervisor.demo@example.test
--   teacher.demo@example.test
--   parent.demo@example.test
--   student.demo@example.test
-- - Foundation SQL drafts (including 014 + 017) are expected to be applied in dev.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Ensure required fake auth users exist (do not create auth users here).
-- -----------------------------------------------------------------------------
do $$
declare
  missing_count int;
begin
  select 5 - count(*)
  into missing_count
  from auth.users
  where email in (
    'hq.demo@example.test',
    'supervisor.demo@example.test',
    'teacher.demo@example.test',
    'parent.demo@example.test',
    'student.demo@example.test'
  );

  if missing_count > 0 then
    raise exception
      '019 fixture precondition failed: missing % required fake auth users. Create fake users first in Supabase Authentication (dev only).',
      missing_count;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2) Deterministic dev-only fixture IDs
-- Uses UUIDs compatible with deployed regression UUID validator.
-- -----------------------------------------------------------------------------
-- Branch / class / student chain
-- branch_id:               19aa0000-0000-4000-8000-000000000001
-- class_id:                19aa0000-0000-4000-8000-000000000002
-- student_id:              19aa0000-0000-4000-8000-000000000003
-- teacher_id:              19aa0000-0000-4000-8000-000000000004
-- guardian_id:             19aa0000-0000-4000-8000-000000000005
-- guardian_student_link_id:19aa0000-0000-4000-8000-000000000006
-- teacher_class_assign_id: 19aa0000-0000-4000-8000-000000000007
-- homework_task_id:        19aa0000-0000-4000-8000-000000000008
-- homework_submission_id:  19aa0000-0000-4000-8000-000000000009

-- -----------------------------------------------------------------------------
-- 3) Branch + class + student baseline
-- -----------------------------------------------------------------------------
insert into public.branches (id, name, code)
values (
  '19aa0000-0000-4000-8000-000000000001',
  'AI Homework Fixture Branch (Dev Only)',
  'ai_hw_fixture_dev'
)
on conflict (id) do update
set
  name = excluded.name,
  code = excluded.code;

insert into public.classes (id, branch_id, name, subject, level, schedule_note)
values (
  '19aa0000-0000-4000-8000-000000000002',
  '19aa0000-0000-4000-8000-000000000001',
  'AI Homework Fixture Class (Dev Only)',
  'English',
  'Level Fixture',
  'Dev-only regression fixture class'
)
on conflict (id) do update
set
  branch_id = excluded.branch_id,
  name = excluded.name,
  subject = excluded.subject,
  level = excluded.level,
  schedule_note = excluded.schedule_note;

insert into public.students (id, branch_id, class_id, full_name, student_code)
values (
  '19aa0000-0000-4000-8000-000000000003',
  '19aa0000-0000-4000-8000-000000000001',
  '19aa0000-0000-4000-8000-000000000002',
  'Student AI Fixture Dev',
  'STU-AI-FIXTURE-DEV'
)
on conflict (id) do update
set
  branch_id = excluded.branch_id,
  class_id = excluded.class_id,
  full_name = excluded.full_name,
  student_code = excluded.student_code;

-- -----------------------------------------------------------------------------
-- 4) Profile alignment (auth user IDs are source of truth)
-- -----------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, role, branch_id, linked_student_id)
values
  (
    (select id from auth.users where email = 'hq.demo@example.test' limit 1),
    'hq.demo@example.test',
    'HQ Demo User',
    'hq_admin',
    null,
    null
  ),
  (
    (select id from auth.users where email = 'supervisor.demo@example.test' limit 1),
    'supervisor.demo@example.test',
    'Supervisor Demo User',
    'branch_supervisor',
    '19aa0000-0000-4000-8000-000000000001',
    null
  ),
  (
    (select id from auth.users where email = 'teacher.demo@example.test' limit 1),
    'teacher.demo@example.test',
    'Teacher Demo User',
    'teacher',
    '19aa0000-0000-4000-8000-000000000001',
    null
  ),
  (
    (select id from auth.users where email = 'parent.demo@example.test' limit 1),
    'parent.demo@example.test',
    'Parent Demo User',
    'parent',
    '19aa0000-0000-4000-8000-000000000001',
    '19aa0000-0000-4000-8000-000000000003'
  ),
  (
    (select id from auth.users where email = 'student.demo@example.test' limit 1),
    'student.demo@example.test',
    'Student Demo User',
    'student',
    '19aa0000-0000-4000-8000-000000000001',
    '19aa0000-0000-4000-8000-000000000003'
  )
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  branch_id = excluded.branch_id,
  linked_student_id = excluded.linked_student_id;

-- -----------------------------------------------------------------------------
-- 5) Teacher + class assignment baseline
-- -----------------------------------------------------------------------------
insert into public.teachers (id, profile_id, branch_id)
values (
  '19aa0000-0000-4000-8000-000000000004',
  (select id from auth.users where email = 'teacher.demo@example.test' limit 1),
  '19aa0000-0000-4000-8000-000000000001'
)
on conflict (id) do update
set
  profile_id = excluded.profile_id,
  branch_id = excluded.branch_id;

insert into public.teacher_class_assignments (id, teacher_id, class_id, branch_id)
values (
  '19aa0000-0000-4000-8000-000000000007',
  '19aa0000-0000-4000-8000-000000000004',
  '19aa0000-0000-4000-8000-000000000002',
  '19aa0000-0000-4000-8000-000000000001'
)
on conflict (id) do update
set
  teacher_id = excluded.teacher_id,
  class_id = excluded.class_id,
  branch_id = excluded.branch_id;

-- -----------------------------------------------------------------------------
-- 6) Parent/guardian link baseline
-- -----------------------------------------------------------------------------
insert into public.guardians (id, profile_id)
values (
  '19aa0000-0000-4000-8000-000000000005',
  (select id from auth.users where email = 'parent.demo@example.test' limit 1)
)
on conflict (id) do update
set
  profile_id = excluded.profile_id;

insert into public.guardian_student_links (id, guardian_id, student_id, relationship, is_primary)
values (
  '19aa0000-0000-4000-8000-000000000006',
  '19aa0000-0000-4000-8000-000000000005',
  '19aa0000-0000-4000-8000-000000000003',
  'parent',
  true
)
on conflict (id) do update
set
  guardian_id = excluded.guardian_id,
  student_id = excluded.student_id,
  relationship = excluded.relationship,
  is_primary = excluded.is_primary;

-- -----------------------------------------------------------------------------
-- 7) Homework task + submission baseline for AI deployed regression
-- -----------------------------------------------------------------------------
insert into public.homework_tasks (
  id,
  branch_id,
  class_id,
  created_by_profile_id,
  title,
  instructions,
  subject,
  due_date,
  status,
  assignment_scope
)
values (
  '19aa0000-0000-4000-8000-000000000008',
  '19aa0000-0000-4000-8000-000000000001',
  '19aa0000-0000-4000-8000-000000000002',
  (select id from auth.users where email = 'teacher.demo@example.test' limit 1),
  'AI Homework Deployed Regression Fixture Task',
  'Fake/dev-only instructions for deployed regression fixture.',
  'English',
  current_date + 7,
  'assigned',
  'class'
)
on conflict (id) do update
set
  branch_id = excluded.branch_id,
  class_id = excluded.class_id,
  created_by_profile_id = excluded.created_by_profile_id,
  title = excluded.title,
  instructions = excluded.instructions,
  subject = excluded.subject,
  due_date = excluded.due_date,
  status = excluded.status,
  assignment_scope = excluded.assignment_scope;

insert into public.homework_submissions (
  id,
  homework_task_id,
  branch_id,
  class_id,
  student_id,
  submitted_by_profile_id,
  submission_note,
  status,
  submitted_at
)
values (
  '19aa0000-0000-4000-8000-000000000009',
  '19aa0000-0000-4000-8000-000000000008',
  '19aa0000-0000-4000-8000-000000000001',
  '19aa0000-0000-4000-8000-000000000002',
  '19aa0000-0000-4000-8000-000000000003',
  (select id from auth.users where email = 'parent.demo@example.test' limit 1),
  'Fake/dev-only submission baseline for deployed AI regression.',
  'submitted',
  now()
)
on conflict (id) do update
set
  homework_task_id = excluded.homework_task_id,
  branch_id = excluded.branch_id,
  class_id = excluded.class_id,
  student_id = excluded.student_id,
  submitted_by_profile_id = excluded.submitted_by_profile_id,
  submission_note = excluded.submission_note,
  status = excluded.status,
  submitted_at = excluded.submitted_at;

-- -----------------------------------------------------------------------------
-- 8) Optional assignment row for selected-student/individual policy compatibility
-- Safe no-op if table exists and row already present.
-- -----------------------------------------------------------------------------
insert into public.homework_task_assignees (
  homework_task_id,
  branch_id,
  class_id,
  student_id,
  assigned_by_profile_id,
  assignment_status,
  due_date,
  notes
)
select
  '19aa0000-0000-4000-8000-000000000008',
  '19aa0000-0000-4000-8000-000000000001',
  '19aa0000-0000-4000-8000-000000000002',
  '19aa0000-0000-4000-8000-000000000003',
  (select id from auth.users where email = 'teacher.demo@example.test' limit 1),
  'assigned',
  current_date + 7,
  'Optional dev fixture assignee row for deployed regression compatibility.'
where not exists (
  select 1
  from public.homework_task_assignees hta
  where hta.homework_task_id = '19aa0000-0000-4000-8000-000000000008'
    and hta.student_id = '19aa0000-0000-4000-8000-000000000003'
);

-- -----------------------------------------------------------------------------
-- 9) Relationship consistency verification query
-- -----------------------------------------------------------------------------
-- This should return exactly one row when fixture linkage is valid.
select
  hs.id as homework_submission_id,
  hs.homework_task_id,
  hs.student_id,
  hs.class_id,
  hs.branch_id as submission_branch_id,
  ht.id as homework_task_id_joined,
  ht.class_id as task_class_id,
  ht.branch_id as task_branch_id
from public.homework_submissions hs
join public.homework_tasks ht
  on ht.id = hs.homework_task_id
where hs.id = '19aa0000-0000-4000-8000-000000000009';

-- -----------------------------------------------------------------------------
-- 10) Output helper query for .env.local AI_HOMEWORK_TEST_* values
-- -----------------------------------------------------------------------------
-- Copy these values into local .env.local ONLY (never commit .env.local).
select
  hs.id as "AI_HOMEWORK_TEST_SUBMISSION_ID",
  hs.homework_task_id as "AI_HOMEWORK_TEST_TASK_ID",
  hs.student_id as "AI_HOMEWORK_TEST_STUDENT_ID",
  hs.class_id as "AI_HOMEWORK_TEST_CLASS_ID"
from public.homework_submissions hs
where hs.id = '19aa0000-0000-4000-8000-000000000009';

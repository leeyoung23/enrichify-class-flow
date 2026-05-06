-- 013_school_curriculum_fake_seed_data.sql
-- DEV-ONLY / FAKE DATA ONLY
-- Manual seed script for school/curriculum onboarding tables.
-- Do NOT auto-run in production.
-- Do NOT use real school/student/curriculum identities.
-- No destructive deletes; additive/idempotent updates only.

-- Assumes fake seed references from 005 (if present):
-- - Branch: 11111111-1111-1111-1111-111111111111 (Demo North Branch)
-- - Class: 33333333-3333-3333-3333-333333333331 (North Class A)
-- - Student: 55555555-5555-5555-5555-555555555555 (Student Demo A)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Fake school (linked to fake branch)
-- ---------------------------------------------------------------------------
insert into public.schools (
  id,
  branch_id,
  name,
  school_type,
  country,
  state,
  curriculum_system,
  notes
) values (
  '91300000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Demo Primary School',
  'demo_primary',
  'DemoLand',
  'Demo State',
  'Demo Foundational Curriculum',
  'Fake school row for curriculum onboarding smoke validation only.'
)
on conflict (id) do update
set
  branch_id = excluded.branch_id,
  name = excluded.name,
  school_type = excluded.school_type,
  country = excluded.country,
  state = excluded.state,
  curriculum_system = excluded.curriculum_system,
  notes = excluded.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2) Fake curriculum profiles (English + Maths)
-- ---------------------------------------------------------------------------
insert into public.curriculum_profiles (
  id,
  branch_id,
  name,
  provider,
  curriculum_system,
  level_year_grade,
  subject,
  skill_focus,
  assessment_style,
  notes
) values
(
  '91300000-0000-0000-0000-000000000011',
  '11111111-1111-1111-1111-111111111111',
  'Demo English Literacy Profile',
  'Demo Provider',
  'Demo Foundational Curriculum',
  'Year 4',
  'English',
  'Reading confidence and paragraph comprehension',
  'teacher_observation_plus_short_check',
  'Fake English literacy curriculum profile for dev-only onboarding tests.'
),
(
  '91300000-0000-0000-0000-000000000012',
  '11111111-1111-1111-1111-111111111111',
  'Demo Maths Numeracy Profile',
  'Demo Provider',
  'Demo Foundational Curriculum',
  'Year 4',
  'Mathematics',
  'Number fluency and operations accuracy',
  'teacher_observation_plus_practice_review',
  'Fake Maths numeracy curriculum profile for dev-only onboarding tests.'
)
on conflict (id) do update
set
  branch_id = excluded.branch_id,
  name = excluded.name,
  provider = excluded.provider,
  curriculum_system = excluded.curriculum_system,
  level_year_grade = excluded.level_year_grade,
  subject = excluded.subject,
  skill_focus = excluded.skill_focus,
  assessment_style = excluded.assessment_style,
  notes = excluded.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) Fake class curriculum assignment (existing fake class)
-- ---------------------------------------------------------------------------
insert into public.class_curriculum_assignments (
  id,
  class_id,
  curriculum_profile_id,
  term_label,
  start_date,
  end_date,
  learning_focus
) values (
  '91300000-0000-0000-0000-000000000021',
  '33333333-3333-3333-3333-333333333331',
  '91300000-0000-0000-0000-000000000011',
  'Demo Term 2',
  current_date - 14,
  current_date + 70,
  'Guided reading confidence and short written response structure.'
)
on conflict (id) do update
set
  class_id = excluded.class_id,
  curriculum_profile_id = excluded.curriculum_profile_id,
  term_label = excluded.term_label,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  learning_focus = excluded.learning_focus,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4) Fake student school profile (existing fake student)
-- ---------------------------------------------------------------------------
insert into public.student_school_profiles (
  id,
  student_id,
  school_id,
  school_name,
  grade_year,
  curriculum_profile_id,
  parent_goals,
  teacher_notes
) values (
  '91300000-0000-0000-0000-000000000031',
  '55555555-5555-5555-5555-555555555555',
  '91300000-0000-0000-0000-000000000001',
  'Demo Primary School',
  'Year 4',
  '91300000-0000-0000-0000-000000000011',
  'Build confident daily reading habits at home with short reflection prompts.',
  'Responds well to scaffolded reading and vocabulary preview before class tasks.'
)
on conflict (student_id) do update
set
  school_id = excluded.school_id,
  school_name = excluded.school_name,
  grade_year = excluded.grade_year,
  curriculum_profile_id = excluded.curriculum_profile_id,
  parent_goals = excluded.parent_goals,
  teacher_notes = excluded.teacher_notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5) Fake learning goals (class-level + student-level)
-- ---------------------------------------------------------------------------
insert into public.learning_goals (
  id,
  branch_id,
  student_id,
  class_id,
  curriculum_profile_id,
  goal_title,
  goal_description,
  status,
  priority,
  created_by_profile_id
) values
(
  '91300000-0000-0000-0000-000000000041',
  '11111111-1111-1111-1111-111111111111',
  null,
  '33333333-3333-3333-3333-333333333331',
  '91300000-0000-0000-0000-000000000011',
  'Class reading confidence',
  'Increase class-level reading confidence through guided oral reading and summary checkpoints.',
  'active',
  'high',
  (select p.id from public.profiles p where p.email = 'teacher.demo@example.test' limit 1)
),
(
  '91300000-0000-0000-0000-000000000042',
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333331',
  '91300000-0000-0000-0000-000000000012',
  'Number fluency',
  'Improve number fluency for mixed single-step operations with short daily practice.',
  'active',
  'medium',
  (select p.id from public.profiles p where p.email = 'teacher.demo@example.test' limit 1)
)
on conflict (id) do update
set
  branch_id = excluded.branch_id,
  student_id = excluded.student_id,
  class_id = excluded.class_id,
  curriculum_profile_id = excluded.curriculum_profile_id,
  goal_title = excluded.goal_title,
  goal_description = excluded.goal_description,
  status = excluded.status,
  priority = excluded.priority,
  created_by_profile_id = excluded.created_by_profile_id,
  updated_at = now();

-- End of 013 fake seed draft (manual/dev-only).

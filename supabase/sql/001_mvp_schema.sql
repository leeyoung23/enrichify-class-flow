-- 001_mvp_schema.sql
-- Draft-only MVP schema preparation for Young's Learners.
-- Review before execution. Do not run in production.
-- No real data should be used with this draft.

create extension if not exists pgcrypto;

-- Enums (draft)
do $$ begin
  create type app_role as enum ('hq_admin', 'branch_supervisor', 'teacher', 'parent', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('present', 'absent', 'late', 'leave');
exception when duplicate_object then null; end $$;

do $$ begin
  create type homework_status as enum ('assigned', 'submitted', 'reviewed', 'incomplete', 'not_submitted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type communication_status as enum ('draft', 'ready_for_review', 'approved', 'released', 'shared');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pending', 'in_progress', 'completed', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fee_status as enum ('unpaid', 'pending_verification', 'paid', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trial_status as enum ('enquiry', 'scheduled', 'attended', 'converted', 'lost');
exception when duplicate_object then null; end $$;

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null,
  role app_role not null,
  branch_id uuid references branches(id),
  linked_student_id uuid null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  name text not null,
  subject text,
  level text,
  schedule_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid references classes(id),
  full_name text not null,
  student_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guardian_student_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references guardians(id),
  student_id uuid not null references students(id),
  relationship text default 'parent',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guardian_id, student_id)
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  branch_id uuid not null references branches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teacher_class_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id),
  class_id uuid not null references classes(id),
  branch_id uuid not null references branches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, class_id)
);

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_school_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id),
  school_id uuid not null references schools(id),
  year_grade text,
  curriculum_pathway text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid not null references classes(id),
  student_id uuid not null references students(id),
  teacher_id uuid not null references teachers(id),
  session_date date not null,
  status attendance_status not null default 'present',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homework_records (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid not null references classes(id),
  student_id uuid not null references students(id),
  teacher_id uuid not null references teachers(id),
  title text not null,
  details text,
  due_date date,
  status homework_status not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homework_attachments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid not null references classes(id),
  student_id uuid not null references students(id),
  homework_record_id uuid references homework_records(id),
  uploaded_by_profile_id uuid not null references profiles(id),
  storage_bucket text not null default 'homework-uploads',
  storage_path text not null,
  file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists parent_comments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid not null references classes(id),
  student_id uuid not null references students(id),
  teacher_id uuid not null references teachers(id),
  comment_text text not null,
  status communication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists weekly_progress_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid not null references classes(id),
  student_id uuid not null references students(id),
  teacher_id uuid not null references teachers(id),
  week_start_date date not null,
  report_text text not null,
  status communication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teacher_tasks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid references classes(id),
  student_id uuid references students(id),
  created_by_profile_id uuid not null references profiles(id),
  title text not null,
  details text,
  status task_status not null default 'pending',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teacher_task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references teacher_tasks(id),
  teacher_id uuid not null references teachers(id),
  assigned_by_profile_id uuid not null references profiles(id),
  status task_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, teacher_id)
);

create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references teacher_tasks(id),
  uploaded_by_profile_id uuid not null references profiles(id),
  storage_bucket text not null default 'task-attachments',
  storage_path text not null,
  file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fee_records (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  student_id uuid not null references students(id),
  class_id uuid not null references classes(id),
  fee_period text not null,
  amount numeric(12,2) not null default 0,
  status fee_status not null default 'unpaid',
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid not null references classes(id),
  teacher_id uuid not null references teachers(id),
  observer_profile_id uuid not null references profiles(id),
  observation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  parent_name text,
  child_name text,
  status text default 'new',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trial_schedules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  class_id uuid references classes(id),
  lead_id uuid references leads(id),
  assigned_teacher_id uuid references teachers(id),
  status trial_status not null default 'enquiry',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales_kit_resources (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  title text not null,
  storage_bucket text not null default 'sales-kit-resources',
  storage_path text not null,
  is_global boolean not null default false,
  created_by_profile_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Basic indexes for role and scope filtering in MVP
create index if not exists idx_profiles_branch_id on profiles(branch_id);
create index if not exists idx_classes_branch_id on classes(branch_id);
create index if not exists idx_students_branch_id on students(branch_id);
create index if not exists idx_students_class_id on students(class_id);
create index if not exists idx_guardian_student_links_guardian_id on guardian_student_links(guardian_id);
create index if not exists idx_guardian_student_links_student_id on guardian_student_links(student_id);
create index if not exists idx_teachers_branch_id on teachers(branch_id);
create index if not exists idx_teacher_class_assignments_teacher_id on teacher_class_assignments(teacher_id);
create index if not exists idx_teacher_class_assignments_class_id on teacher_class_assignments(class_id);
create index if not exists idx_attendance_branch_id on attendance_records(branch_id);
create index if not exists idx_attendance_class_id on attendance_records(class_id);
create index if not exists idx_attendance_student_id on attendance_records(student_id);
create index if not exists idx_attendance_teacher_id on attendance_records(teacher_id);
create index if not exists idx_homework_branch_id on homework_records(branch_id);
create index if not exists idx_homework_class_id on homework_records(class_id);
create index if not exists idx_homework_student_id on homework_records(student_id);
create index if not exists idx_homework_teacher_id on homework_records(teacher_id);
create index if not exists idx_homework_attachments_student_id on homework_attachments(student_id);
create index if not exists idx_parent_comments_branch_id on parent_comments(branch_id);
create index if not exists idx_parent_comments_student_id on parent_comments(student_id);
create index if not exists idx_weekly_reports_branch_id on weekly_progress_reports(branch_id);
create index if not exists idx_weekly_reports_student_id on weekly_progress_reports(student_id);
create index if not exists idx_teacher_tasks_branch_id on teacher_tasks(branch_id);
create index if not exists idx_teacher_tasks_teacher_student_class on teacher_tasks(class_id, student_id);
create index if not exists idx_teacher_task_assignments_teacher_id on teacher_task_assignments(teacher_id);
create index if not exists idx_fee_records_branch_id on fee_records(branch_id);
create index if not exists idx_fee_records_student_id on fee_records(student_id);
create index if not exists idx_observations_branch_id on observations(branch_id);
create index if not exists idx_observations_teacher_id on observations(teacher_id);
create index if not exists idx_leads_branch_id on leads(branch_id);
create index if not exists idx_trial_schedules_branch_id on trial_schedules(branch_id);
create index if not exists idx_sales_kit_resources_branch_id on sales_kit_resources(branch_id);


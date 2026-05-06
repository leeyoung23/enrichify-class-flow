# Supabase Schema SQL Draft

This is a readable Supabase/Postgres SQL draft for Young's Learners. It is for founder/developer review only.

Do not apply this SQL to Supabase yet. Do not create real migration files from this document unless explicitly requested. Do not use real student, parent, teacher, school, fee, payment, or homework data with this draft.

## 1. Draft enums

```sql
create type user_role as enum (
  'parent',
  'student',
  'teacher',
  'branch_supervisor',
  'hq_admin'
);

create type account_status as enum (
  'active',
  'pending',
  'invited',
  'suspended',
  'archived'
);

create type attendance_status as enum (
  'present',
  'absent',
  'late',
  'leave'
);

create type homework_status as enum (
  'not_assigned',
  'assigned',
  'completed',
  'incomplete',
  'not_submitted',
  'teacher_reviewed'
);

create type report_status as enum (
  'note_created',
  'ai_draft_generated',
  'edited',
  'approved',
  'shared',
  'archived'
);

create type payment_status as enum (
  'unpaid',
  'pending_verification',
  'paid',
  'overdue',
  'waived',
  'cancelled'
);

create type task_status as enum (
  'open',
  'in_progress',
  'completed',
  'overdue',
  'cancelled'
);

create type task_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type school_type as enum (
  'national',
  'international',
  'homeschool',
  'other'
);

create type curriculum_type as enum (
  'cambridge',
  'local',
  'ib',
  'custom',
  'other'
);

create type upload_status as enum (
  'received',
  'processing',
  'ai_draft_ready',
  'teacher_reviewed',
  'feedback_released',
  'rejected'
);
```

## 2. Core identity tables

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  full_name text not null,
  role user_role not null,
  branch_id uuid null,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  address text,
  phone text,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_branch_id_fkey
  foreign key (branch_id) references branches(id);

create table staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role user_role not null,
  branch_id uuid references branches(id),
  class_id uuid null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  used_by uuid null references profiles(id),
  generated_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null references profiles(id),
  onboarding_type text not null,
  status text not null,
  draft_payload jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 3. Student and family tables

```sql
create table students (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  class_id uuid null,
  full_name text not null,
  date_of_birth date null,
  student_number text unique,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  contact_email text,
  contact_phone text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table guardian_student_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id),
  student_id uuid references students(id),
  relationship text,
  is_primary boolean not null default false,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_type school_type,
  country text,
  region text,
  account_status account_status not null default 'active'
);

create table curriculum_pathways (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  curriculum_type curriculum_type,
  school_type school_type,
  subject text,
  level text,
  description text,
  account_status account_status not null default 'active'
);

create table student_school_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  school_id uuid references schools(id),
  year_grade text,
  school_type school_type,
  curriculum_pathway_id uuid references curriculum_pathways(id),
  subjects_enrolled text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table student_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  preferred_subjects text[],
  weak_skill_tags text[],
  learning_goals text[],
  gamification_level int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 4. Class and teacher tables

```sql
create table classes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  name text not null,
  subject text,
  level text,
  schedule text,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table students
  add constraint students_class_id_fkey
  foreign key (class_id) references classes(id);

alter table staff_invites
  add constraint staff_invites_class_id_fkey
  foreign key (class_id) references classes(id);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  branch_id uuid references branches(id),
  display_name text not null,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table teacher_class_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references teachers(id),
  class_id uuid references classes(id),
  branch_id uuid references branches(id),
  assignment_role text not null default 'lead',
  account_status account_status not null default 'active',
  created_at timestamptz not null default now()
);
```

## 5. Operations tables

```sql
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  branch_id uuid references branches(id),
  teacher_id uuid references teachers(id),
  session_date date not null,
  attendance_status attendance_status,
  homework_status homework_status,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table homework_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  branch_id uuid references branches(id),
  assigned_by uuid references profiles(id),
  title text not null,
  description text,
  due_date date,
  homework_status homework_status not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table homework_attachments (
  id uuid primary key default gen_random_uuid(),
  homework_record_id uuid null references homework_records(id),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  branch_id uuid references branches(id),
  uploaded_by uuid references profiles(id),
  storage_bucket text not null default 'homework',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  upload_status upload_status not null default 'received',
  teacher_comment text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  released_at timestamptz
);

create table parent_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  branch_id uuid references branches(id),
  teacher_id uuid references teachers(id),
  note_text text,
  ai_draft text,
  final_message text,
  approved_report text,
  shared_report text,
  report_status report_status not null default 'note_created',
  approved_by uuid null references profiles(id),
  approved_at timestamptz,
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teacher_tasks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  class_id uuid null references classes(id),
  student_id uuid null references students(id),
  created_by uuid references profiles(id),
  title text not null,
  description text,
  task_status task_status not null default 'open',
  task_priority task_priority not null default 'medium',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table teacher_task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references teacher_tasks(id),
  teacher_id uuid references teachers(id),
  assigned_by uuid references profiles(id),
  task_status task_status not null default 'open',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references teacher_tasks(id),
  uploaded_by uuid references profiles(id),
  storage_bucket text not null default 'task_attachments',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table observations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  class_id uuid references classes(id),
  teacher_id uuid references teachers(id),
  observer_profile_id uuid references profiles(id),
  observation_date date,
  classroom_management_score int,
  teaching_delivery_score int,
  student_engagement_score int,
  notes text,
  follow_up_action text,
  follow_up_due_date date,
  task_status task_status not null default 'open',
  created_at timestamptz not null default now()
);

create table trial_schedules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  class_id uuid null references classes(id),
  student_name text,
  guardian_name text,
  guardian_contact text,
  subject text,
  scheduled_at timestamptz,
  assigned_teacher_id uuid null references teachers(id),
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  parent_name text,
  child_name text,
  contact_phone text,
  contact_email text,
  source text,
  status text,
  interested_subject text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  branch_id uuid references branches(id),
  class_id uuid references classes(id),
  fee_period text not null,
  fee_amount numeric(12, 2) not null,
  currency text not null default 'MYR',
  due_date date,
  payment_status payment_status not null default 'unpaid',
  payment_method text,
  receipt_storage_path text,
  receipt_uploaded boolean not null default false,
  receipt_reference_note text,
  verified_by uuid null references profiles(id),
  verified_at timestamptz,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 6. Future Phase 2+ AI learning tables

These tables are intentionally later. Do not implement them before the MVP backend, Supabase Auth, RLS, Storage policies, backups, and role-based QA are stable.

```sql
create table homework_scans (
  id uuid primary key default gen_random_uuid(),
  homework_attachment_id uuid references homework_attachments(id),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  extraction_status text,
  extracted_question_text text,
  extracted_answer_text text,
  created_at timestamptz not null default now()
);

create table ai_marking_diagnoses (
  id uuid primary key default gen_random_uuid(),
  homework_scan_id uuid references homework_scans(id),
  student_id uuid references students(id),
  marking_result text,
  score numeric(5, 2),
  mistake_explanation text,
  weak_skill_area text,
  recommended_revision_topic text,
  teacher_review_status text,
  created_at timestamptz not null default now()
);

create table curriculum_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  curriculum_pathway_id uuid references curriculum_pathways(id),
  subject text,
  topic_unit text,
  model_answer text,
  marking_guide text,
  skill_tag text,
  account_status account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table teacher_follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  class_id uuid references classes(id),
  teacher_id uuid references teachers(id),
  source text,
  action_title text,
  action_detail text,
  task_status task_status not null default 'open',
  created_at timestamptz not null default now()
);

create table student_reminders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  reminder_type text,
  title text,
  delivery_channel text,
  cadence text,
  task_status task_status not null default 'open',
  created_at timestamptz not null default now()
);
```

## 7. Review notes

- Add indexes after query paths are confirmed.
- Add `updated_at` triggers later.
- Enable RLS on every private table before using real data.
- Keep all buckets private and link Storage policies to metadata tables.
- Validate all invite codes server-side; store only hashes.

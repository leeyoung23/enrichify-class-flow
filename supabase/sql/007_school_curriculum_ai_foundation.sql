-- 007_school_curriculum_ai_foundation.sql
-- Draft-only additive foundation patch for school/curriculum onboarding and future AI personalisation.
-- Review carefully before manual execution.
-- Do NOT auto-run in production.
-- No table drops, no destructive data edits, no global RLS disable.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Strengthen existing school/curriculum tables (additive only)
-- -----------------------------------------------------------------------------

alter table if exists public.schools
  add column if not exists country text,
  add column if not exists state_region text,
  add column if not exists city text,
  add column if not exists website_url text,
  add column if not exists notes text;

alter table if exists public.student_school_profiles
  add column if not exists grade_year text,
  add column if not exists textbook_module text,
  add column if not exists subject_notes text,
  add column if not exists learning_context_notes text;

-- Keep compatibility with existing year_grade while introducing clearer grade_year.
update public.student_school_profiles
set grade_year = coalesce(grade_year, year_grade)
where grade_year is null;

-- -----------------------------------------------------------------------------
-- 2) Add curriculum_mappings
-- -----------------------------------------------------------------------------

create table if not exists public.curriculum_mappings (
  id uuid primary key default gen_random_uuid(),
  school_type text,
  curriculum_pathway text,
  grade_year text,
  subject text,
  textbook_module text,
  unit_name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3) Add learning_objectives
-- -----------------------------------------------------------------------------

create table if not exists public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  curriculum_mapping_id uuid not null references public.curriculum_mappings(id) on delete cascade,
  objective_code text,
  objective_title text not null,
  objective_description text,
  skill_area text,
  cefr_level text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4) Add student_subject_enrolments
-- -----------------------------------------------------------------------------

create table if not exists public.student_subject_enrolments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  subject text,
  level text,
  curriculum_mapping_id uuid references public.curriculum_mappings(id) on delete set null,
  status text not null default 'active',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5) Add student_learning_profiles
-- -----------------------------------------------------------------------------

create table if not exists public.student_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  preferred_learning_style text,
  strength_tags text[] not null default '{}',
  weakness_tags text[] not null default '{}',
  learning_goal_tags text[] not null default '{}',
  teacher_notes_summary text,
  ai_summary text,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6) Add homework_marking_results
-- -----------------------------------------------------------------------------

create table if not exists public.homework_marking_results (
  id uuid primary key default gen_random_uuid(),
  homework_record_id uuid not null references public.homework_records(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  marked_by_profile_id uuid references public.profiles(id) on delete set null,
  marking_source text not null default 'teacher',
  score_text text,
  feedback_summary text,
  strength_tags text[] not null default '{}',
  weakness_tags text[] not null default '{}',
  linked_objective_ids uuid[] not null default '{}',
  teacher_approved boolean not null default false,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 7) Add AI generation tracking tables
-- -----------------------------------------------------------------------------

create table if not exists public.ai_generation_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  requested_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null,
  source_context_summary text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generation_outputs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ai_generation_requests(id) on delete cascade,
  output_type text not null,
  draft_content text,
  teacher_edited_content text,
  approval_status text not null default 'draft',
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_feedback_tags (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  tag_type text not null,
  tag_value text not null,
  confidence numeric(5,4),
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_approval_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8) RLS helpers for branch-scoped checks on new tables
-- -----------------------------------------------------------------------------

create or replace function public.student_branch_id(student_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.branch_id
  from public.students s
  where s.id = student_uuid
  limit 1
$$;

create or replace function public.class_branch_id(class_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.branch_id
  from public.classes c
  where c.id = class_uuid
  limit 1
$$;

-- -----------------------------------------------------------------------------
-- 9) Enable RLS (including existing school tables previously missing in 003)
-- -----------------------------------------------------------------------------

alter table public.schools enable row level security;
alter table public.student_school_profiles enable row level security;
alter table public.curriculum_mappings enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.student_subject_enrolments enable row level security;
alter table public.student_learning_profiles enable row level security;
alter table public.homework_marking_results enable row level security;
alter table public.ai_generation_requests enable row level security;
alter table public.ai_generation_outputs enable row level security;
alter table public.ai_feedback_tags enable row level security;
alter table public.teacher_approval_logs enable row level security;

-- schools: no branch_id column yet; branch-supervisor visibility is inferred via linked students.
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools for select using (
  public.is_hq_admin()
  or exists (
    select 1
    from public.student_school_profiles ssp
    join public.students s on s.id = ssp.student_id
    where ssp.school_id = schools.id
      and (
        public.is_branch_supervisor_for_branch(s.branch_id)
        or public.is_teacher_for_student(s.id)
        or public.is_guardian_for_student(s.id)
        or public.is_student_self(s.id)
      )
  )
);

drop policy if exists schools_modify_staff on public.schools;
create policy schools_modify_staff on public.schools for all using (
  public.is_hq_admin()
) with check (
  public.is_hq_admin()
);

-- student_school_profiles
-- Parent/student access is conservative: read-only via linked student; no parent/student write in this draft.
drop policy if exists student_school_profiles_select on public.student_school_profiles;
create policy student_school_profiles_select on public.student_school_profiles for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
  or public.is_guardian_for_student(student_id)
  or public.is_student_self(student_id)
);

drop policy if exists student_school_profiles_modify_staff on public.student_school_profiles;
create policy student_school_profiles_modify_staff on public.student_school_profiles for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
);

-- curriculum_mappings: staff-only for now.
drop policy if exists curriculum_mappings_select_staff on public.curriculum_mappings;
create policy curriculum_mappings_select_staff on public.curriculum_mappings for select using (
  public.is_hq_admin()
  or public.current_user_role() in ('branch_supervisor', 'teacher')
);

-- Writes are HQ-only: rows have no branch_id, so branch_supervisor cannot be scoped to "own branch".
drop policy if exists curriculum_mappings_modify_staff on public.curriculum_mappings;
create policy curriculum_mappings_modify_staff on public.curriculum_mappings for all using (
  public.is_hq_admin()
) with check (
  public.is_hq_admin()
);

-- learning_objectives: staff-only for now.
drop policy if exists learning_objectives_select_staff on public.learning_objectives;
create policy learning_objectives_select_staff on public.learning_objectives for select using (
  public.is_hq_admin()
  or public.current_user_role() in ('branch_supervisor', 'teacher')
);

drop policy if exists learning_objectives_modify_staff on public.learning_objectives;
create policy learning_objectives_modify_staff on public.learning_objectives for all using (
  public.is_hq_admin()
) with check (
  public.is_hq_admin()
);

-- student_subject_enrolments
drop policy if exists student_subject_enrolments_select on public.student_subject_enrolments;
create policy student_subject_enrolments_select on public.student_subject_enrolments for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
  or public.is_guardian_for_student(student_id)
  or public.is_student_self(student_id)
);

drop policy if exists student_subject_enrolments_modify_staff on public.student_subject_enrolments;
create policy student_subject_enrolments_modify_staff on public.student_subject_enrolments for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
);

-- student_learning_profiles
-- Parent/student are intentionally excluded in this foundation draft (internal summary fields).
drop policy if exists student_learning_profiles_select_staff on public.student_learning_profiles;
create policy student_learning_profiles_select_staff on public.student_learning_profiles for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_student(student_id)
);

drop policy if exists student_learning_profiles_modify_staff on public.student_learning_profiles;
create policy student_learning_profiles_modify_staff on public.student_learning_profiles for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_student(student_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_student(student_id)
);

-- homework_marking_results
-- Parent/student can only read approved results for linked/self student.
drop policy if exists homework_marking_results_select on public.homework_marking_results;
create policy homework_marking_results_select on public.homework_marking_results for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
  or (
    teacher_approved = true
    and (public.is_guardian_for_student(student_id) or public.is_student_self(student_id))
  )
);

drop policy if exists homework_marking_results_modify_staff on public.homework_marking_results;
create policy homework_marking_results_modify_staff on public.homework_marking_results for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
);

-- ai_generation_requests: staff-only in foundation draft.
drop policy if exists ai_generation_requests_select_staff on public.ai_generation_requests;
create policy ai_generation_requests_select_staff on public.ai_generation_requests for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
);

drop policy if exists ai_generation_requests_modify_staff on public.ai_generation_requests;
create policy ai_generation_requests_modify_staff on public.ai_generation_requests for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
);

-- ai_generation_outputs: staff can read all linked outputs; parent/student only approved+released.
drop policy if exists ai_generation_outputs_select on public.ai_generation_outputs;
create policy ai_generation_outputs_select on public.ai_generation_outputs for select using (
  public.is_hq_admin()
  or exists (
    select 1
    from public.ai_generation_requests r
    where r.id = ai_generation_outputs.request_id
      and (
        public.is_branch_supervisor_for_branch(public.student_branch_id(r.student_id))
        or public.is_teacher_for_student(r.student_id)
      )
  )
  or (
    approval_status in ('approved', 'released')
    and exists (
      select 1
      from public.ai_generation_requests r
      where r.id = ai_generation_outputs.request_id
        and (public.is_guardian_for_student(r.student_id) or public.is_student_self(r.student_id))
    )
  )
);

drop policy if exists ai_generation_outputs_modify_staff on public.ai_generation_outputs;
create policy ai_generation_outputs_modify_staff on public.ai_generation_outputs for all using (
  public.is_hq_admin()
  or exists (
    select 1
    from public.ai_generation_requests r
    where r.id = ai_generation_outputs.request_id
      and (
        public.is_branch_supervisor_for_branch(public.student_branch_id(r.student_id))
        or public.is_teacher_for_student(r.student_id)
      )
  )
) with check (
  public.is_hq_admin()
  or exists (
    select 1
    from public.ai_generation_requests r
    where r.id = ai_generation_outputs.request_id
      and (
        public.is_branch_supervisor_for_branch(public.student_branch_id(r.student_id))
        or public.is_teacher_for_student(r.student_id)
      )
  )
);

-- ai_feedback_tags: staff-only for now.
drop policy if exists ai_feedback_tags_select_staff on public.ai_feedback_tags;
create policy ai_feedback_tags_select_staff on public.ai_feedback_tags for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
);

drop policy if exists ai_feedback_tags_modify_staff on public.ai_feedback_tags;
create policy ai_feedback_tags_modify_staff on public.ai_feedback_tags for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
  or public.is_teacher_for_student(student_id)
);

-- teacher_approval_logs: staff-only audit table.
drop policy if exists teacher_approval_logs_select_staff on public.teacher_approval_logs;
create policy teacher_approval_logs_select_staff on public.teacher_approval_logs for select using (
  public.is_hq_admin()
  or public.current_user_role() in ('branch_supervisor', 'teacher')
);

-- Actor must match JWT (HQ may insert on behalf of others only if product later allows; keep actor = self for staff).
drop policy if exists teacher_approval_logs_insert_staff on public.teacher_approval_logs;
create policy teacher_approval_logs_insert_staff on public.teacher_approval_logs for insert with check (
  public.is_hq_admin()
  or (
    public.current_user_role() in ('branch_supervisor', 'teacher')
    and profile_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 10) Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_student_school_profiles_grade_year on public.student_school_profiles(grade_year);
create index if not exists idx_curriculum_mappings_pathway_grade_subject on public.curriculum_mappings(curriculum_pathway, grade_year, subject);
create index if not exists idx_learning_objectives_mapping_id on public.learning_objectives(curriculum_mapping_id);
create index if not exists idx_learning_objectives_skill_area on public.learning_objectives(skill_area);
create index if not exists idx_student_subject_enrolments_student_id on public.student_subject_enrolments(student_id);
create index if not exists idx_student_subject_enrolments_class_id on public.student_subject_enrolments(class_id);
create index if not exists idx_student_subject_enrolments_mapping_id on public.student_subject_enrolments(curriculum_mapping_id);
create index if not exists idx_student_subject_enrolments_status on public.student_subject_enrolments(status);
create index if not exists idx_student_learning_profiles_student_id on public.student_learning_profiles(student_id);
create index if not exists idx_student_learning_profiles_branch_id on public.student_learning_profiles(branch_id);
create index if not exists idx_homework_marking_results_homework_record_id on public.homework_marking_results(homework_record_id);
create index if not exists idx_homework_marking_results_student_id on public.homework_marking_results(student_id);
create index if not exists idx_homework_marking_results_class_id on public.homework_marking_results(class_id);
create index if not exists idx_homework_marking_results_teacher_approved on public.homework_marking_results(teacher_approved);
create index if not exists idx_ai_generation_requests_student_id on public.ai_generation_requests(student_id);
create index if not exists idx_ai_generation_requests_status on public.ai_generation_requests(status);
create index if not exists idx_ai_generation_outputs_request_id on public.ai_generation_outputs(request_id);
create index if not exists idx_ai_generation_outputs_approval_status on public.ai_generation_outputs(approval_status);
create index if not exists idx_ai_feedback_tags_student_id on public.ai_feedback_tags(student_id);
create index if not exists idx_teacher_approval_logs_profile_id on public.teacher_approval_logs(profile_id);
create index if not exists idx_teacher_approval_logs_target on public.teacher_approval_logs(target_type, target_id);

-- End of 007 draft foundation patch.

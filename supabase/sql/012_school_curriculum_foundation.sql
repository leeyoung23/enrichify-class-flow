-- 012_school_curriculum_foundation.sql
-- Manual/dev-first additive draft for school/curriculum onboarding foundation.
-- Review carefully before manual execution in a dev project.
-- Do NOT auto-apply in production.
-- No table drops, no destructive data deletes, no global RLS disable.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) schools (normalize existing MVP shape if table already exists)
-- -----------------------------------------------------------------------------

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid null references public.branches(id),
  name text not null,
  school_type text null,
  country text null,
  state text null,
  curriculum_system text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.schools
  add column if not exists branch_id uuid null references public.branches(id),
  add column if not exists country text null,
  add column if not exists state text null,
  add column if not exists curriculum_system text null,
  add column if not exists notes text null;

-- -----------------------------------------------------------------------------
-- 2) curriculum_profiles
-- -----------------------------------------------------------------------------

create table if not exists public.curriculum_profiles (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid null references public.branches(id),
  name text not null,
  provider text null,
  curriculum_system text null,
  level_year_grade text null,
  subject text null,
  skill_focus text null,
  assessment_style text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3) student_school_profiles (normalize existing MVP shape if already present)
-- -----------------------------------------------------------------------------

create table if not exists public.student_school_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  school_id uuid null references public.schools(id),
  school_name text null,
  grade_year text null,
  curriculum_profile_id uuid null references public.curriculum_profiles(id),
  parent_goals text null,
  teacher_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.student_school_profiles
  alter column school_id drop not null;

alter table if exists public.student_school_profiles
  add column if not exists school_name text null,
  add column if not exists grade_year text null,
  add column if not exists curriculum_profile_id uuid null references public.curriculum_profiles(id),
  add column if not exists parent_goals text null,
  add column if not exists teacher_notes text null;

-- Keep compatibility with earlier `year_grade` naming where present.
update public.student_school_profiles
set grade_year = coalesce(grade_year, year_grade)
where grade_year is null;

-- MVP: one latest profile per student (history/versioning is future scope).
create unique index if not exists idx_student_school_profiles_one_per_student
  on public.student_school_profiles(student_id);

-- -----------------------------------------------------------------------------
-- 4) class_curriculum_assignments
-- -----------------------------------------------------------------------------

create table if not exists public.class_curriculum_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  curriculum_profile_id uuid not null references public.curriculum_profiles(id),
  term_label text null,
  start_date date null,
  end_date date null,
  learning_focus text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_class_curriculum_assignment_date_range
    check (start_date is null or end_date is null or start_date <= end_date)
);

-- -----------------------------------------------------------------------------
-- 5) learning_goals
-- -----------------------------------------------------------------------------

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid null references public.branches(id),
  student_id uuid null references public.students(id),
  class_id uuid null references public.classes(id),
  curriculum_profile_id uuid null references public.curriculum_profiles(id),
  goal_title text not null,
  goal_description text null,
  status text not null default 'active',
  priority text null,
  created_by_profile_id uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_learning_goals_status
    check (status in ('active', 'paused', 'achieved', 'archived'))
);

-- -----------------------------------------------------------------------------
-- 6) Helper functions (RLS-safe scope helpers; SECURITY DEFINER for policy use)
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

create or replace function public.can_access_student_curriculum(student_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(public.student_branch_id(student_uuid))
    or public.is_teacher_for_student(student_uuid)
    or public.is_guardian_for_student(student_uuid)
    or public.is_student_self(student_uuid),
    false
  )
$$;

create or replace function public.can_access_class_curriculum(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(public.class_branch_id(class_uuid))
    or public.is_teacher_for_class(class_uuid),
    false
  )
$$;

-- -----------------------------------------------------------------------------
-- 7) Enable RLS on onboarding tables
-- -----------------------------------------------------------------------------

alter table public.schools enable row level security;
alter table public.curriculum_profiles enable row level security;
alter table public.student_school_profiles enable row level security;
alter table public.class_curriculum_assignments enable row level security;
alter table public.learning_goals enable row level security;

-- -----------------------------------------------------------------------------
-- 8) Policies
-- -----------------------------------------------------------------------------

-- schools
drop policy if exists schools_select_012 on public.schools;
create policy schools_select_012 on public.schools for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or exists (
    select 1
    from public.student_school_profiles ssp
    where ssp.school_id = schools.id
      and public.can_access_student_curriculum(ssp.student_id)
  )
);

drop policy if exists schools_manage_012 on public.schools;
create policy schools_manage_012 on public.schools for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- curriculum_profiles
drop policy if exists curriculum_profiles_select_012 on public.curriculum_profiles;
create policy curriculum_profiles_select_012 on public.curriculum_profiles for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or exists (
    select 1
    from public.class_curriculum_assignments cca
    where cca.curriculum_profile_id = curriculum_profiles.id
      and public.can_access_class_curriculum(cca.class_id)
  )
  or exists (
    select 1
    from public.student_school_profiles ssp
    where ssp.curriculum_profile_id = curriculum_profiles.id
      and public.can_access_student_curriculum(ssp.student_id)
  )
);

drop policy if exists curriculum_profiles_manage_012 on public.curriculum_profiles;
create policy curriculum_profiles_manage_012 on public.curriculum_profiles for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- student_school_profiles
drop policy if exists student_school_profiles_select_012 on public.student_school_profiles;
create policy student_school_profiles_select_012 on public.student_school_profiles for select using (
  public.can_access_student_curriculum(student_id)
);

drop policy if exists student_school_profiles_manage_012 on public.student_school_profiles;
create policy student_school_profiles_manage_012 on public.student_school_profiles for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.student_branch_id(student_id))
);

-- class_curriculum_assignments
drop policy if exists class_curriculum_assignments_select_012 on public.class_curriculum_assignments;
create policy class_curriculum_assignments_select_012 on public.class_curriculum_assignments for select using (
  public.can_access_class_curriculum(class_id)
  or exists (
    select 1
    from public.students s
    where s.class_id = class_curriculum_assignments.class_id
      and (public.is_guardian_for_student(s.id) or public.is_student_self(s.id))
  )
);

drop policy if exists class_curriculum_assignments_manage_012 on public.class_curriculum_assignments;
create policy class_curriculum_assignments_manage_012 on public.class_curriculum_assignments for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.class_branch_id(class_id))
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.class_branch_id(class_id))
);

-- learning_goals
drop policy if exists learning_goals_select_012 on public.learning_goals;
create policy learning_goals_select_012 on public.learning_goals for select using (
  public.is_hq_admin()
  or (branch_id is not null and public.is_branch_supervisor_for_branch(branch_id))
  or (branch_id is null and student_id is not null and public.is_branch_supervisor_for_branch(public.student_branch_id(student_id)))
  or (branch_id is null and class_id is not null and public.is_branch_supervisor_for_branch(public.class_branch_id(class_id)))
  or (student_id is not null and public.is_teacher_for_student(student_id))
  or (class_id is not null and public.is_teacher_for_class(class_id))
  or (student_id is not null and public.is_guardian_for_student(student_id))
  or (student_id is not null and public.is_student_self(student_id))
);

drop policy if exists learning_goals_manage_012 on public.learning_goals;
create policy learning_goals_manage_012 on public.learning_goals for all using (
  public.is_hq_admin()
  or (branch_id is not null and public.is_branch_supervisor_for_branch(branch_id))
  or (branch_id is null and student_id is not null and public.is_branch_supervisor_for_branch(public.student_branch_id(student_id)))
  or (branch_id is null and class_id is not null and public.is_branch_supervisor_for_branch(public.class_branch_id(class_id)))
) with check (
  public.is_hq_admin()
  or (branch_id is not null and public.is_branch_supervisor_for_branch(branch_id))
  or (branch_id is null and student_id is not null and public.is_branch_supervisor_for_branch(public.student_branch_id(student_id)))
  or (branch_id is null and class_id is not null and public.is_branch_supervisor_for_branch(public.class_branch_id(class_id)))
);

-- Teacher/parent/student writes are intentionally not granted in this MVP draft.

-- -----------------------------------------------------------------------------
-- 9) Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_schools_branch_id on public.schools(branch_id);
create index if not exists idx_curriculum_profiles_branch_id on public.curriculum_profiles(branch_id);
create index if not exists idx_student_school_profiles_student_id on public.student_school_profiles(student_id);
create index if not exists idx_student_school_profiles_curriculum_profile_id on public.student_school_profiles(curriculum_profile_id);
create index if not exists idx_class_curriculum_assignments_class_id on public.class_curriculum_assignments(class_id);
create index if not exists idx_class_curriculum_assignments_curriculum_profile_id on public.class_curriculum_assignments(curriculum_profile_id);
create index if not exists idx_learning_goals_student_id on public.learning_goals(student_id);
create index if not exists idx_learning_goals_class_id on public.learning_goals(class_id);
create index if not exists idx_learning_goals_curriculum_profile_id on public.learning_goals(curriculum_profile_id);
create index if not exists idx_learning_goals_status on public.learning_goals(status);

-- -----------------------------------------------------------------------------
-- 10) updated_at trigger pattern (local to this patch)
-- -----------------------------------------------------------------------------

create or replace function public.set_school_curriculum_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_schools_updated_at_012 on public.schools;
create trigger trg_set_schools_updated_at_012
before update on public.schools
for each row execute function public.set_school_curriculum_updated_at();

drop trigger if exists trg_set_curriculum_profiles_updated_at_012 on public.curriculum_profiles;
create trigger trg_set_curriculum_profiles_updated_at_012
before update on public.curriculum_profiles
for each row execute function public.set_school_curriculum_updated_at();

drop trigger if exists trg_set_student_school_profiles_updated_at_012 on public.student_school_profiles;
create trigger trg_set_student_school_profiles_updated_at_012
before update on public.student_school_profiles
for each row execute function public.set_school_curriculum_updated_at();

drop trigger if exists trg_set_class_curriculum_assignments_updated_at_012 on public.class_curriculum_assignments;
create trigger trg_set_class_curriculum_assignments_updated_at_012
before update on public.class_curriculum_assignments
for each row execute function public.set_school_curriculum_updated_at();

drop trigger if exists trg_set_learning_goals_updated_at_012 on public.learning_goals;
create trigger trg_set_learning_goals_updated_at_012
before update on public.learning_goals
for each row execute function public.set_school_curriculum_updated_at();

-- End of 012 draft.

-- 002_rls_helper_functions.sql
-- Draft helper functions for RLS policy readability.
-- Review security-definer behavior before any production usage.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.current_user_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.current_user_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.branch_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.is_hq_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'hq_admin', false);
$$;

create or replace function public.is_branch_supervisor_for_branch(branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() = 'branch_supervisor'
    and public.current_user_branch_id() = branch_id,
    false
  );
$$;

create or replace function public.is_teacher_for_class(class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teachers t
    join public.teacher_class_assignments tca on tca.teacher_id = t.id
    where t.profile_id = auth.uid()
      and tca.class_id = is_teacher_for_class.class_id
  );
$$;

create or replace function public.is_teacher_for_student(student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = is_teacher_for_student.student_id
      and public.is_teacher_for_class(s.class_id)
  );
$$;

create or replace function public.is_guardian_for_student(student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guardians g
    join public.guardian_student_links gsl on gsl.guardian_id = g.id
    where g.profile_id = auth.uid()
      and gsl.student_id = is_guardian_for_student.student_id
  );
$$;

create or replace function public.is_student_self(student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and p.linked_student_id = is_student_self.student_id
  );
$$;

-- WARNING:
-- These functions are intentionally draft and should be reviewed for:
-- 1) performance and index coverage
-- 2) recursion/policy interactions
-- 3) security-definer risk and ownership
-- 4) production hardening prior to live use


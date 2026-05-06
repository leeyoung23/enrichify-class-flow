-- 017_homework_task_assignees_foundation.sql
-- Manual/dev-first additive draft only.
-- Do NOT auto-apply. Review and run manually in dev Supabase SQL editor.
-- Use fake/dev data only for validation (no real student/parent/teacher data).
-- No destructive table drops, no data deletes, no global RLS disable.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Additive homework_tasks assignment scope (optional, backward-compatible)
-- -----------------------------------------------------------------------------
alter table public.homework_tasks
  add column if not exists assignment_scope text not null default 'class';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'homework_tasks_assignment_scope_check_017'
      and conrelid = 'public.homework_tasks'::regclass
  ) then
    alter table public.homework_tasks
      add constraint homework_tasks_assignment_scope_check_017
      check (assignment_scope in ('class', 'selected_students', 'individual', 'curriculum_profile'));
  end if;
end;
$$;

comment on column public.homework_tasks.assignment_scope is
  'Added in 017 manual/dev-first draft. Controls assignment intent (class/selected_students/individual/curriculum_profile).';

-- -----------------------------------------------------------------------------
-- 2) homework_task_assignees table
-- Explicit assignee rows for assigned-but-not-submitted visibility.
-- -----------------------------------------------------------------------------
create table if not exists public.homework_task_assignees (
  id uuid primary key default gen_random_uuid(),
  homework_task_id uuid not null references public.homework_tasks(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  class_id uuid not null references public.classes(id),
  student_id uuid not null references public.students(id),
  assigned_by_profile_id uuid null references public.profiles(id),
  assignment_status text not null default 'assigned'
    check (assignment_status in (
      'assigned',
      'submitted',
      'under_review',
      'returned_for_revision',
      'reviewed',
      'feedback_released',
      'archived'
    )),
  due_date date null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_task_assignees_task_student_uniq unique (homework_task_id, student_id)
);

comment on table public.homework_task_assignees is
  'Added in 017 manual/dev-first draft only. Fake-data validation only until runtime/UI migration is completed.';

-- -----------------------------------------------------------------------------
-- 3) Helper functions for assignment access
-- SECURITY DEFINER used for policy readability and recursion avoidance.
-- -----------------------------------------------------------------------------
create or replace function public.homework_task_assignee_branch_id(assignee_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hta.branch_id
  from public.homework_task_assignees hta
  where hta.id = assignee_uuid
  limit 1
$$;

create or replace function public.can_access_homework_assignee(assignee_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.homework_task_assignees hta
      where hta.id = assignee_uuid
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(hta.branch_id)
          or public.is_teacher_for_class(hta.class_id)
          or public.is_guardian_for_student(hta.student_id)
          or public.is_student_self(hta.student_id)
        )
    ),
    false
  )
$$;

create or replace function public.can_access_homework_task_assignment(task_uuid uuid, student_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.homework_tasks ht
      join public.students s on s.id = student_uuid
      where ht.id = task_uuid
        and ht.status in ('assigned', 'closed')
        and (
          (
            coalesce(ht.assignment_scope, 'class') = 'class'
            and ht.class_id = s.class_id
          )
          or exists (
            select 1
            from public.homework_task_assignees hta
            where hta.homework_task_id = ht.id
              and hta.student_id = student_uuid
              and hta.assignment_status <> 'archived'
          )
        )
    ),
    false
  )
$$;

comment on function public.can_access_homework_task_assignment(uuid, uuid) is
  'Added in 017: validates assignment visibility for submission insert (class-scope by class match; non-class requires assignee row).';

-- -----------------------------------------------------------------------------
-- 4) Assignee alignment validation helpers/trigger
-- Enforces branch/class/student/task consistency on row writes.
-- -----------------------------------------------------------------------------
create or replace function public.homework_task_assignee_alignment_is_valid_017(
  task_uuid uuid,
  assignee_branch_id uuid,
  assignee_class_id uuid,
  assignee_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.homework_tasks ht
      join public.students s on s.id = assignee_student_id
      where ht.id = task_uuid
        and ht.branch_id = assignee_branch_id
        and ht.class_id = assignee_class_id
        and s.branch_id = assignee_branch_id
        and s.class_id = assignee_class_id
    ),
    false
  )
$$;

create or replace function public.enforce_homework_task_assignee_alignment_017()
returns trigger
language plpgsql
as $$
begin
  if not public.homework_task_assignee_alignment_is_valid_017(
    new.homework_task_id,
    new.branch_id,
    new.class_id,
    new.student_id
  ) then
    raise exception 'homework_task_assignees alignment invalid for task/class/branch/student';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_homework_task_assignee_alignment_017 on public.homework_task_assignees;
create trigger trg_enforce_homework_task_assignee_alignment_017
before insert or update on public.homework_task_assignees
for each row execute function public.enforce_homework_task_assignee_alignment_017();

comment on function public.homework_task_assignee_alignment_is_valid_017(uuid, uuid, uuid, uuid) is
  'Added in 017: validates homework_task_assignees row aligns with homework_tasks + students branch/class relationships.';

-- -----------------------------------------------------------------------------
-- 5) Enable RLS on homework_task_assignees
-- -----------------------------------------------------------------------------
alter table public.homework_task_assignees enable row level security;

-- -----------------------------------------------------------------------------
-- 6) RLS policies for homework_task_assignees
-- Teacher manage policy is conservative: assigned-class only.
-- Parent/student are read-only for linked-child/self rows only.
-- -----------------------------------------------------------------------------
drop policy if exists homework_task_assignees_select_017 on public.homework_task_assignees;
create policy homework_task_assignees_select_017
on public.homework_task_assignees
for select
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or public.is_guardian_for_student(student_id)
  or public.is_student_self(student_id)
);

drop policy if exists homework_task_assignees_insert_017 on public.homework_task_assignees;
create policy homework_task_assignees_insert_017
on public.homework_task_assignees
for insert
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
    and assigned_by_profile_id = auth.uid()
  )
);

drop policy if exists homework_task_assignees_update_017 on public.homework_task_assignees;
create policy homework_task_assignees_update_017
on public.homework_task_assignees
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
  )
)
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
  )
);

drop policy if exists homework_task_assignees_delete_017 on public.homework_task_assignees;
create policy homework_task_assignees_delete_017
on public.homework_task_assignees
for delete
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
  )
);

-- -----------------------------------------------------------------------------
-- 7) Narrow patch: submission insert assignment gate
-- Keep existing model, but require assignment validation helper.
-- If this is too strict for a given environment, keep 016 policy and revisit.
-- -----------------------------------------------------------------------------
drop policy if exists homework_submissions_insert_014 on public.homework_submissions;
create policy homework_submissions_insert_014
on public.homework_submissions
for insert
with check (
  (
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(branch_id)
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_for_class(class_id)
    )
    or (
      public.current_user_role() = 'parent'
      and public.is_guardian_for_student(student_id)
      and submitted_by_profile_id = auth.uid()
    )
    or (
      public.current_user_role() = 'student'
      and public.is_student_self(student_id)
      and submitted_by_profile_id = auth.uid()
    )
  )
  and public.homework_task_allows_submission(homework_task_id, class_id, branch_id)
  and public.can_access_homework_task_assignment(homework_task_id, student_id)
);

-- -----------------------------------------------------------------------------
-- 8) Indexes for assignee table
-- -----------------------------------------------------------------------------
create index if not exists homework_task_assignees_homework_task_id_idx
  on public.homework_task_assignees(homework_task_id);
create index if not exists homework_task_assignees_student_id_idx
  on public.homework_task_assignees(student_id);
create index if not exists homework_task_assignees_class_id_idx
  on public.homework_task_assignees(class_id);
create index if not exists homework_task_assignees_branch_id_idx
  on public.homework_task_assignees(branch_id);
create index if not exists homework_task_assignees_assignment_status_idx
  on public.homework_task_assignees(assignment_status);
create index if not exists homework_task_assignees_due_date_idx
  on public.homework_task_assignees(due_date);

-- -----------------------------------------------------------------------------
-- 9) updated_at trigger for homework_task_assignees
-- -----------------------------------------------------------------------------
create or replace function public.set_homework_task_assignees_updated_at_017()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_homework_task_assignees_updated_at_017 on public.homework_task_assignees;
create trigger trg_set_homework_task_assignees_updated_at_017
before update on public.homework_task_assignees
for each row execute function public.set_homework_task_assignees_updated_at_017();

-- End of 017 manual/dev-first draft.

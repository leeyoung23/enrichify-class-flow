-- 006_fix_teacher_tasks_rls.sql
-- Draft patch: fix teacher task policy recursion without touching unrelated tables.
-- Do not run automatically. Review before manual execution.
-- Fake/demo environment only.

-- Root issue addressed:
-- Previous policies created circular dependency:
-- - teacher_tasks_select referenced teacher_task_assignments
-- - teacher_task_assignments_select referenced teacher_tasks
-- This can cause recursive RLS evaluation failures.

-- Helper to safely read task branch scope for assignment visibility checks.
-- SECURITY DEFINER is used to avoid recursive RLS policy dependency.
create or replace function public.teacher_task_branch_id(task_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tt.branch_id
  from public.teacher_tasks tt
  where tt.id = task_uuid
  limit 1
$$;

-- Replace only teacher task related policies.
drop policy if exists teacher_tasks_select on public.teacher_tasks;
create policy teacher_tasks_select
on public.teacher_tasks
for select
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or created_by_profile_id = public.current_profile_id()
  or (class_id is not null and public.is_teacher_for_class(class_id))
);

drop policy if exists teacher_task_assignments_select on public.teacher_task_assignments;
create policy teacher_task_assignments_select
on public.teacher_task_assignments
for select
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.teacher_task_branch_id(task_id))
  or exists (
    select 1
    from public.teachers t
    where t.id = teacher_task_assignments.teacher_id
      and t.profile_id = auth.uid()
  )
);

drop policy if exists teacher_task_assignments_update_self on public.teacher_task_assignments;
create policy teacher_task_assignments_update_self
on public.teacher_task_assignments
for update
using (
  exists (
    select 1
    from public.teachers t
    where t.id = teacher_task_assignments.teacher_id
      and t.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teachers t
    where t.id = teacher_task_assignments.teacher_id
      and t.profile_id = auth.uid()
  )
);


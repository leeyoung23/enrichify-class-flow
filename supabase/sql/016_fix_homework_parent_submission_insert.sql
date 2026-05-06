-- 016_fix_homework_parent_submission_insert.sql
-- Manual/dev-first additive patch only.
-- Purpose: fix parent direct homework_submissions insert gate after smoke investigation.
-- Do NOT auto-apply. Review and run manually in dev Supabase SQL editor.
-- No table drops, no data deletes, no global RLS disable.

-- ---------------------------------------------------------------------------
-- Root cause:
-- homework_submissions_insert_014 validates task status/alignment using a direct
-- subquery on public.homework_tasks.
--
-- Parent SELECT policy on homework_tasks is submission-dependent:
-- parent can see a task only when linked submissions already exist.
-- This creates a circular gate for the first parent submission insert:
-- - insert policy needs homework_tasks row visible
-- - visibility needs a submission row to already exist
--
-- Fix:
-- use SECURITY DEFINER helper for task alignment/status check so policy validation
-- is not blocked by parent task SELECT visibility.
-- ---------------------------------------------------------------------------
create or replace function public.homework_task_allows_submission(
  task_uuid uuid,
  expected_class_id uuid,
  expected_branch_id uuid
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
      where ht.id = task_uuid
        and ht.class_id = expected_class_id
        and ht.branch_id = expected_branch_id
        and ht.status in ('assigned', 'closed')
    ),
    false
  )
$$;

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
);

comment on function public.homework_task_allows_submission(uuid, uuid, uuid) is
  'Added in 016: validates homework task branch/class/status for submission insert without RLS visibility recursion.';

-- 031_fix_ai_parent_reports_insert_rls.sql
-- Manual/dev-first SQL patch draft only.
-- Do NOT auto-apply. Review and run manually in Supabase DEV SQL editor only.
-- No production apply assumption in this draft.
-- No destructive drops, no data deletes, no global RLS disable.
--
-- Purpose:
-- - Fix INSERT ... RETURNING visibility failure on public.ai_parent_reports.
-- - Preserve existing insert predicate and scope rules.
-- - Preserve parent released-only linked-child visibility.
-- - Preserve staff-only draft visibility and staff manage scope.
--
-- Root cause observed in smoke diagnostics:
-- - can_insert_ai_parent_report_row_030(...) returns true
-- - raw insert without RETURNING succeeds
-- - insert(...).select(...).maybeSingle() fails with RLS violation
-- This indicates select-policy RETURNING visibility mismatch, not insert predicate failure.

create or replace function public.can_select_ai_parent_report_row_031(
  report_uuid uuid,
  student_uuid uuid,
  class_uuid uuid,
  branch_uuid uuid,
  status_value text,
  assigned_teacher_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      public.is_hq_admin()
      or (
        public.current_user_role() = 'branch_supervisor'
        and public.is_branch_supervisor_for_branch(branch_uuid)
      )
      or (
        public.current_user_role() = 'teacher'
        and public.current_user_branch_id() = branch_uuid
        and (
          assigned_teacher_uuid = auth.uid()
          or public.is_teacher_for_student(student_uuid)
          or (class_uuid is not null and public.is_teacher_for_class(class_uuid))
        )
      )
      or (
        public.current_user_role() = 'parent'
        and status_value = 'released'
        and public.is_guardian_for_student(student_uuid)
      )
    ),
    false
  )
$$;

comment on function public.can_select_ai_parent_report_row_031(uuid, uuid, uuid, uuid, text, uuid) is
  '031 draft helper. Row-predicate select helper for ai_parent_reports to avoid INSERT RETURNING self-lookup mismatch. Preserves parent released-only linked-child path.';

drop policy if exists ai_parent_reports_select_030 on public.ai_parent_reports;
create policy ai_parent_reports_select_030
on public.ai_parent_reports
for select
using (
  public.can_select_ai_parent_report_row_031(
    id,
    student_id,
    class_id,
    branch_id,
    status,
    assigned_teacher_profile_id
  )
);


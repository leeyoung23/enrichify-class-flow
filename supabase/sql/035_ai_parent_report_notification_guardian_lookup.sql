-- 035_ai_parent_report_notification_guardian_lookup.sql
-- Narrow SECURITY DEFINER helper so staff who may release an AI parent report can resolve
-- linked parent/guardian profile ids without widening SELECT policies on guardians / links.
-- Caller authorization is re-checked inside using existing RLS helper predicates (JWT context).

create or replace function public.list_parent_profile_ids_for_student_staff_scope_035(p_student_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct g.profile_id
  from public.guardians g
  inner join public.guardian_student_links gsl on gsl.guardian_id = g.id
  inner join public.profiles p on p.id = g.profile_id
  where gsl.student_id = p_student_id
    and p.role = 'parent'::public.app_role
    and coalesce(p.is_active, true) = true
    and (
      public.is_hq_admin()
      or (
        public.current_user_role() = 'branch_supervisor'
        and exists (
          select 1
          from public.students s
          where s.id = p_student_id
            and s.branch_id is not null
            and public.is_branch_supervisor_for_branch(s.branch_id)
        )
      )
      or public.is_teacher_for_student(p_student_id)
    );
$$;

comment on function public.list_parent_profile_ids_for_student_staff_scope_035(uuid) is
  '035: return distinct active parent profile ids linked to a student via guardians/guardian_student_links; restricted to HQ, branch supervisor (student branch), or assigned teacher.';

grant execute on function public.list_parent_profile_ids_for_student_staff_scope_035(uuid) to authenticated;

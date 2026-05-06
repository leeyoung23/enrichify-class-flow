-- 042_notification_preference_enforcement_rpc.sql
-- Minimal staff-scoped RPC for parent in-app notification preference checks.
-- Keeps table RLS unchanged and does not expose raw preference rows.

create or replace function public.should_send_parent_in_app_notification_042(
  p_parent_profile_id uuid,
  p_student_id uuid,
  p_category text
)
returns table (
  allowed boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category text := trim(coalesce(p_category, ''));
  v_student_branch_id uuid;
  v_student_class_id uuid;
  v_parent_role public.app_role;
  v_linked boolean := false;
  v_child_enabled boolean;
  v_child_consent_status text;
  v_parent_enabled boolean;
  v_parent_consent_status text;
begin
  if p_parent_profile_id is null or p_student_id is null then
    return query select false, 'invalid_input';
    return;
  end if;

  if v_category not in (
    'operational_service',
    'billing_invoice',
    'learning_report_homework',
    'attendance_safety',
    'parent_communication',
    'marketing_events',
    'media_photo'
  ) then
    return query select false, 'invalid_category';
    return;
  end if;

  select s.branch_id, s.class_id
  into v_student_branch_id, v_student_class_id
  from public.students s
  where s.id = p_student_id
  limit 1;
  if v_student_branch_id is null and v_student_class_id is null then
    return query select false, 'student_not_found';
    return;
  end if;

  if not (
    public.is_hq_admin()
    or (
      public.current_user_role() = 'branch_supervisor'
      and v_student_branch_id is not null
      and public.is_branch_supervisor_for_branch(v_student_branch_id)
    )
    or (
      public.current_user_role() = 'teacher'
      and (
        public.is_teacher_for_student(p_student_id)
        or (
          v_student_class_id is not null
          and public.is_teacher_for_class(v_student_class_id)
        )
      )
    )
    or (
      public.current_user_role() = 'parent'
      and p_parent_profile_id = auth.uid()
      and public.is_guardian_for_student(p_student_id)
    )
  ) then
    return query select false, 'scope_denied';
    return;
  end if;

  select p.role
  into v_parent_role
  from public.profiles p
  where p.id = p_parent_profile_id
  limit 1;
  if v_parent_role is distinct from 'parent'::public.app_role then
    return query select false, 'parent_profile_invalid';
    return;
  end if;

  select exists (
    select 1
    from public.guardians g
    join public.guardian_student_links gsl on gsl.guardian_id = g.id
    where g.profile_id = p_parent_profile_id
      and gsl.student_id = p_student_id
  )
  into v_linked;
  if not coalesce(v_linked, false) then
    return query select false, 'guardian_link_missing';
    return;
  end if;

  select pref.enabled, pref.consent_status
  into v_child_enabled, v_child_consent_status
  from public.parent_notification_preferences pref
  where pref.parent_profile_id = p_parent_profile_id
    and pref.student_id = p_student_id
    and pref.channel = 'in_app'
    and pref.category = v_category
  limit 1;

  if v_child_enabled is not null then
    if v_child_enabled is false then
      return query select false, 'explicit_disabled';
      return;
    end if;
    if v_child_consent_status = 'withdrawn' then
      return query select false, 'withdrawn';
      return;
    end if;
    if v_child_consent_status in ('consented', 'required_service', 'not_set') then
      return query select true, 'explicit_allowed';
      return;
    end if;
  end if;

  select pref.enabled, pref.consent_status
  into v_parent_enabled, v_parent_consent_status
  from public.parent_notification_preferences pref
  where pref.parent_profile_id = p_parent_profile_id
    and pref.student_id is null
    and pref.channel = 'in_app'
    and pref.category = v_category
  limit 1;

  if v_parent_enabled is not null then
    if v_parent_enabled is false then
      return query select false, 'explicit_disabled';
      return;
    end if;
    if v_parent_consent_status = 'withdrawn' then
      return query select false, 'withdrawn';
      return;
    end if;
    if v_parent_consent_status in ('consented', 'required_service', 'not_set') then
      return query select true, 'explicit_allowed';
      return;
    end if;
  end if;

  if v_category in (
    'operational_service',
    'attendance_safety',
    'learning_report_homework',
    'parent_communication',
    'billing_invoice'
  ) then
    return query select true, 'default_no_row';
    return;
  end if;

  return query select false, 'default_no_row';
end;
$$;

comment on function public.should_send_parent_in_app_notification_042(uuid, uuid, text) is
  '042: Returns allow/block decision for in-app parent notification preference checks with strict caller scope and no raw preference row exposure.';

grant execute on function public.should_send_parent_in_app_notification_042(uuid, uuid, text) to authenticated;

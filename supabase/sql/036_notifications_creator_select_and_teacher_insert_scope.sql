-- 036_notifications_creator_select_and_teacher_insert_scope.sql
-- Manual/dev-first migration: run against linked project after 034/035.
--
-- Fixes:
-- 1) INSERT ... RETURNING for staff-created parent notifications: teachers could insert
--    (WITH CHECK) but could not read the returned row; PostgREST surfaces that as an RLS error.
--    Add policy so authenticated staff can SELECT notifications they created (same idea as
--    notification_events creator select in 034).
-- 2) Align teacher INSERT scope on notification_events + notifications with
--    can_manage_ai_parent_report() / teacher branch: class teacher OR teacher-for-student OR
--    assigned_teacher on an ai_parent_report for that student+branch (not class_id only).

-- -----------------------------------------------------------------------------
-- notifications: staff may read rows they created (enables RETURNING; does not widen parent read)
-- -----------------------------------------------------------------------------
drop policy if exists notifications_select_creator_staff_036 on public.notifications;
create policy notifications_select_creator_staff_036
on public.notifications
for select
to authenticated
using (
  created_by_profile_id is not null
  and created_by_profile_id = auth.uid()
  and public.current_user_role() in ('hq_admin', 'branch_supervisor', 'teacher')
);

comment on policy notifications_select_creator_staff_036 on public.notifications is
  '036: staff read own created inbox rows (INSERT RETURNING). Recipients still use recipient/HQ policies.';

-- -----------------------------------------------------------------------------
-- notification_events: teacher insert scope (replace 034 policy)
-- -----------------------------------------------------------------------------
drop policy if exists notification_events_insert_staff_034 on public.notification_events;
create policy notification_events_insert_staff_036
on public.notification_events
for insert
to authenticated
with check (
  created_by_profile_id = auth.uid()
  and public.current_user_role() in ('hq_admin', 'branch_supervisor', 'teacher')
  and (
    public.is_hq_admin()
    or (
      public.current_user_role() = 'branch_supervisor'
      and branch_id is not null
      and public.is_branch_supervisor_for_branch(branch_id)
    )
    or (
      public.current_user_role() = 'teacher'
      and branch_id is not null
      and public.current_user_branch_id() = branch_id
      and (
        (class_id is not null and public.is_teacher_for_class(class_id))
        or (student_id is not null and public.is_teacher_for_student(student_id))
        or (
          student_id is not null
          and exists (
            select 1
            from public.ai_parent_reports r
            where r.student_id = notification_events.student_id
              and r.branch_id = notification_events.branch_id
              and r.assigned_teacher_profile_id = auth.uid()
          )
        )
      )
    )
  )
);

-- -----------------------------------------------------------------------------
-- notifications: teacher insert scope (replace 034 policy)
-- -----------------------------------------------------------------------------
drop policy if exists notifications_insert_staff_034 on public.notifications;
create policy notifications_insert_staff_036
on public.notifications
for insert
to authenticated
with check (
  created_by_profile_id = auth.uid()
  and public.current_user_role() in ('hq_admin', 'branch_supervisor', 'teacher')
  and channel = 'in_app'
  and (
    public.is_hq_admin()
    or (
      public.current_user_role() = 'branch_supervisor'
      and branch_id is not null
      and public.is_branch_supervisor_for_branch(branch_id)
    )
    or (
      public.current_user_role() = 'teacher'
      and branch_id is not null
      and public.current_user_branch_id() = branch_id
      and (
        (class_id is not null and public.is_teacher_for_class(class_id))
        or (student_id is not null and public.is_teacher_for_student(student_id))
        or (
          student_id is not null
          and exists (
            select 1
            from public.ai_parent_reports r
            where r.student_id = notifications.student_id
              and r.branch_id = notifications.branch_id
              and r.assigned_teacher_profile_id = auth.uid()
          )
        )
      )
    )
  )
);

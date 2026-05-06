-- 037_notifications_teacher_branch_fallback.sql
-- Manual/dev-first: apply after 036 on linked projects.
--
-- Problem: homework_feedback update allows teachers via is_teacher_for_class(hs.class_id) without
-- requiring profiles.branch_id to match the submission branch. Notification insert policies in 036
-- required current_user_branch_id() = branch_id for all teacher rows, so homework release could
-- succeed while notification_events INSERT failed.
--
-- Fix: keep existing 036 teacher arms when branch matches; add a narrow fallback when the teacher
-- teaches the notification class_id and the student row exists for student_id + branch_id.

drop policy if exists notification_events_insert_staff_036 on public.notification_events;
drop policy if exists notification_events_insert_staff_037 on public.notification_events;
create policy notification_events_insert_staff_037
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
      and (
        (
          public.current_user_branch_id() = branch_id
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
        or (
          class_id is not null
          and student_id is not null
          and public.is_teacher_for_class(class_id)
          and exists (
            select 1
            from public.students s
            where s.id = notification_events.student_id
              and s.branch_id = notification_events.branch_id
          )
        )
      )
    )
  )
);

drop policy if exists notifications_insert_staff_036 on public.notifications;
drop policy if exists notifications_insert_staff_037 on public.notifications;
create policy notifications_insert_staff_037
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
      and (
        (
          public.current_user_branch_id() = branch_id
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
        or (
          class_id is not null
          and student_id is not null
          and public.is_teacher_for_class(class_id)
          and exists (
            select 1
            from public.students s
            where s.id = notifications.student_id
              and s.branch_id = notifications.branch_id
          )
        )
      )
    )
  )
);

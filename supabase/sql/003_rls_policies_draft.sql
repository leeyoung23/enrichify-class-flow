-- 003_rls_policies_draft.sql
-- Draft-only RLS policies. Must be tested role-by-role before any real data.
-- These are pseudo-production policies and require security review.

alter table profiles enable row level security;
alter table branches enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table guardians enable row level security;
alter table guardian_student_links enable row level security;
alter table teachers enable row level security;
alter table teacher_class_assignments enable row level security;
alter table attendance_records enable row level security;
alter table homework_records enable row level security;
alter table homework_attachments enable row level security;
alter table parent_comments enable row level security;
alter table weekly_progress_reports enable row level security;
alter table teacher_tasks enable row level security;
alter table teacher_task_assignments enable row level security;
alter table task_attachments enable row level security;
alter table fee_records enable row level security;
alter table observations enable row level security;
alter table leads enable row level security;
alter table trial_schedules enable row level security;
alter table sales_kit_resources enable row level security;

-- Profiles
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- Branches
drop policy if exists branches_select on branches;
create policy branches_select on branches for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(id)
  or exists (select 1 from classes c where c.branch_id = branches.id and public.is_teacher_for_class(c.id))
);

-- Classes
drop policy if exists classes_select on classes;
create policy classes_select on classes for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(id)
  or exists (
    select 1 from students s
    where s.class_id = classes.id
      and (public.is_guardian_for_student(s.id) or public.is_student_self(s.id))
  )
);

-- Students
drop policy if exists students_select on students;
create policy students_select on students for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_student(id)
  or public.is_guardian_for_student(id)
  or public.is_student_self(id)
);

-- Guardians
drop policy if exists guardians_select on guardians;
create policy guardians_select on guardians for select using (
  public.is_hq_admin()
  or profile_id = auth.uid()
  or public.is_branch_supervisor_for_branch((select s.branch_id
    from guardian_student_links gsl
    join students s on s.id = gsl.student_id
    where gsl.guardian_id = guardians.id
    limit 1))
);

-- Guardian links
drop policy if exists guardian_links_select on guardian_student_links;
create policy guardian_links_select on guardian_student_links for select using (
  public.is_hq_admin()
  or public.is_guardian_for_student(student_id)
  or public.is_branch_supervisor_for_branch((select s.branch_id from students s where s.id = guardian_student_links.student_id))
);

-- Teachers
drop policy if exists teachers_select on teachers;
create policy teachers_select on teachers for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or profile_id = auth.uid()
);

-- Teacher class assignments
drop policy if exists teacher_class_assignments_select on teacher_class_assignments;
create policy teacher_class_assignments_select on teacher_class_assignments for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or exists (select 1 from teachers t where t.id = teacher_id and t.profile_id = auth.uid())
);

-- Attendance
drop policy if exists attendance_select on attendance_records;
create policy attendance_select on attendance_records for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or public.is_guardian_for_student(student_id)
  or public.is_student_self(student_id)
);

drop policy if exists attendance_modify_teacher on attendance_records;
create policy attendance_modify_teacher on attendance_records for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
);

-- Homework
drop policy if exists homework_select on homework_records;
create policy homework_select on homework_records for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or public.is_guardian_for_student(student_id)
  or public.is_student_self(student_id)
);

drop policy if exists homework_modify_teacher on homework_records;
create policy homework_modify_teacher on homework_records for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
);

drop policy if exists homework_attachments_select on homework_attachments;
create policy homework_attachments_select on homework_attachments for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or public.is_guardian_for_student(student_id)
  or public.is_student_self(student_id)
);

-- Parent comments and weekly reports:
-- parent/student only approved/released/shared, never internal drafts.
drop policy if exists parent_comments_select on parent_comments;
create policy parent_comments_select on parent_comments for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or (
    status in ('approved', 'released', 'shared')
    and (public.is_guardian_for_student(student_id) or public.is_student_self(student_id))
  )
);

drop policy if exists parent_comments_modify_teacher on parent_comments;
create policy parent_comments_modify_teacher on parent_comments for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
);

drop policy if exists weekly_reports_select on weekly_progress_reports;
create policy weekly_reports_select on weekly_progress_reports for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or (
    status in ('approved', 'released', 'shared')
    and (public.is_guardian_for_student(student_id) or public.is_student_self(student_id))
  )
);

drop policy if exists weekly_reports_modify_teacher on weekly_progress_reports;
create policy weekly_reports_modify_teacher on weekly_progress_reports for all using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
) with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
);

-- Tasks
drop policy if exists teacher_tasks_select on teacher_tasks;
create policy teacher_tasks_select on teacher_tasks for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or exists (
    select 1
    from teacher_task_assignments tta
    join teachers t on t.id = tta.teacher_id
    where tta.task_id = teacher_tasks.id
      and t.profile_id = auth.uid()
  )
);

drop policy if exists teacher_task_assignments_select on teacher_task_assignments;
create policy teacher_task_assignments_select on teacher_task_assignments for select using (
  public.is_hq_admin()
  or exists (
    select 1 from teacher_tasks tt
    where tt.id = task_id
      and public.is_branch_supervisor_for_branch(tt.branch_id)
  )
  or exists (
    select 1 from teachers t
    where t.id = teacher_id and t.profile_id = auth.uid()
  )
);

drop policy if exists teacher_task_assignments_update_self on teacher_task_assignments;
create policy teacher_task_assignments_update_self on teacher_task_assignments for update using (
  exists (select 1 from teachers t where t.id = teacher_id and t.profile_id = auth.uid())
) with check (
  exists (select 1 from teachers t where t.id = teacher_id and t.profile_id = auth.uid())
);

drop policy if exists task_attachments_select on task_attachments;
create policy task_attachments_select on task_attachments for select using (
  public.is_hq_admin()
  or exists (
    select 1
    from teacher_tasks tt
    where tt.id = task_attachments.task_id
      and public.is_branch_supervisor_for_branch(tt.branch_id)
  )
  or exists (
    select 1
    from teacher_task_assignments tta
    join teachers t on t.id = tta.teacher_id
    where tta.task_id = task_attachments.task_id
      and t.profile_id = auth.uid()
  )
);

-- Staff-only data
drop policy if exists fee_records_staff_only on fee_records;
create policy fee_records_staff_only on fee_records for select using (
  public.is_hq_admin() or public.is_branch_supervisor_for_branch(branch_id)
);

drop policy if exists fee_records_parent_linked_summary on fee_records;
create policy fee_records_parent_linked_summary on fee_records for select using (
  public.is_guardian_for_student(student_id)
  and verification_status in ('submitted', 'verified')
);

drop policy if exists fee_records_modify_staff_only on fee_records;
create policy fee_records_modify_staff_only on fee_records for all using (
  public.is_hq_admin() or public.is_branch_supervisor_for_branch(branch_id)
) with check (
  public.is_hq_admin() or public.is_branch_supervisor_for_branch(branch_id)
);

drop policy if exists observations_staff_scope on observations;
create policy observations_staff_scope on observations for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or exists (select 1 from teachers t where t.id = teacher_id and t.profile_id = auth.uid())
);

drop policy if exists leads_staff_scope on leads;
create policy leads_staff_scope on leads for select using (
  public.is_hq_admin() or public.is_branch_supervisor_for_branch(branch_id)
);

drop policy if exists trial_schedules_staff_scope on trial_schedules;
create policy trial_schedules_staff_scope on trial_schedules for select using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or exists (select 1 from teachers t where t.id = assigned_teacher_id and t.profile_id = auth.uid())
);

-- Sales Kit: HQ + Branch Supervisor only.
drop policy if exists sales_kit_resources_select on sales_kit_resources;
create policy sales_kit_resources_select on sales_kit_resources for select using (
  public.is_hq_admin()
  or (
    public.current_user_role() = 'branch_supervisor'
    and status = 'approved'
    and (
      is_global = true
      or (branch_id is not null and public.is_branch_supervisor_for_branch(branch_id))
    )
  )
);

drop policy if exists sales_kit_resources_modify on sales_kit_resources;
create policy sales_kit_resources_modify on sales_kit_resources for all using (public.is_hq_admin())
with check (public.is_hq_admin());


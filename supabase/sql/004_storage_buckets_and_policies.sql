-- 004_storage_buckets_and_policies.sql
-- Draft-only Storage setup and policy ideas.
-- Review and test carefully before real usage.
-- No public bucket is enabled by default in this draft.

-- Buckets (private by default)
insert into storage.buckets (id, name, public)
values
  ('homework-uploads', 'homework-uploads', false),
  ('parent-report-samples', 'parent-report-samples', false),
  ('task-attachments', 'task-attachments', false),
  ('sales-kit-resources', 'sales-kit-resources', false)
on conflict (id) do nothing;

-- Homework uploads:
-- - teacher/hq/branch-supervisor can manage per class/student scope
-- - parent/student upload/read only for linked or self student metadata
drop policy if exists homework_uploads_select on storage.objects;
create policy homework_uploads_select
on storage.objects for select
using (
  bucket_id = 'homework-uploads'
  and exists (
    select 1
    from public.homework_attachments ha
    where ha.storage_bucket = 'homework-uploads'
      and ha.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(ha.branch_id)
        or public.is_teacher_for_class(ha.class_id)
        or public.is_guardian_for_student(ha.student_id)
        or public.is_student_self(ha.student_id)
      )
  )
);

drop policy if exists homework_uploads_insert on storage.objects;
create policy homework_uploads_insert
on storage.objects for insert
with check (
  bucket_id = 'homework-uploads'
  and exists (
    select 1
    from public.homework_attachments ha
    where ha.storage_bucket = 'homework-uploads'
      and ha.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(ha.branch_id)
        or public.is_teacher_for_class(ha.class_id)
        or public.is_guardian_for_student(ha.student_id)
        or public.is_student_self(ha.student_id)
      )
  )
);

-- Task attachments:
-- - assigned teacher, supervisor (branch), HQ
drop policy if exists task_attachments_select_storage on storage.objects;
create policy task_attachments_select_storage
on storage.objects for select
using (
  bucket_id = 'task-attachments'
  and exists (
    select 1
    from public.task_attachments ta
    where ta.storage_bucket = 'task-attachments'
      and ta.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or exists (
          select 1 from public.teacher_tasks tt
          where tt.id = ta.task_id
            and public.is_branch_supervisor_for_branch(tt.branch_id)
        )
        or exists (
          select 1
          from public.teacher_task_assignments tta
          join public.teachers t on t.id = tta.teacher_id
          where tta.task_id = ta.task_id
            and t.profile_id = auth.uid()
        )
      )
  )
);

-- Sales kit resources:
-- - HQ manage all
-- - Branch supervisor read (and write where scoped by row policies if enabled later)
drop policy if exists sales_kit_resources_select_storage on storage.objects;
create policy sales_kit_resources_select_storage
on storage.objects for select
using (
  bucket_id = 'sales-kit-resources'
  and (
    public.is_hq_admin()
    or public.current_user_role() = 'branch_supervisor'
  )
);

drop policy if exists sales_kit_resources_insert_storage on storage.objects;
create policy sales_kit_resources_insert_storage
on storage.objects for insert
with check (
  bucket_id = 'sales-kit-resources'
  and public.is_hq_admin()
);

-- Parent report samples:
-- internal-only for now (teacher/supervisor/hq), no parent/student direct access.
drop policy if exists parent_report_samples_select on storage.objects;
create policy parent_report_samples_select
on storage.objects for select
using (
  bucket_id = 'parent-report-samples'
  and (
    public.is_hq_admin()
    or public.current_user_role() in ('branch_supervisor', 'teacher')
  )
);

-- NOTE:
-- Storage policies must be tested with fake users and fake metadata rows.
-- Keep all buckets private unless explicit product/security approval is given.


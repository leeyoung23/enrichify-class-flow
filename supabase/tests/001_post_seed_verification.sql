-- 001_post_seed_verification.sql
-- Read-only post-seed checks for fake/demo environment.
-- Review before running. Do not use real data.

-- Profile counts by role
select role, count(*) as profile_count
from public.profiles
group by role
order by role;

-- Core entity counts
select 'branches' as table_name, count(*) as row_count from public.branches
union all
select 'classes', count(*) from public.classes
union all
select 'students', count(*) from public.students
union all
select 'guardians', count(*) from public.guardians
union all
select 'teacher_class_assignments', count(*) from public.teacher_class_assignments
union all
select 'guardian_student_links', count(*) from public.guardian_student_links
union all
select 'attendance_records', count(*) from public.attendance_records
union all
select 'homework_records', count(*) from public.homework_records
union all
select 'parent_comments', count(*) from public.parent_comments
union all
select 'weekly_progress_reports', count(*) from public.weekly_progress_reports
union all
select 'fee_records', count(*) from public.fee_records
union all
select 'teacher_tasks', count(*) from public.teacher_tasks
order by table_name;

-- Sales kit lifecycle status counts
select status, count(*) as sales_kit_count
from public.sales_kit_resources
group by status
order by status;

-- Storage bucket privacy check (expect public = false for all project-private buckets)
select id, name, public
from storage.buckets
where id in (
  'homework-uploads',
  'fee-receipts',
  'task-attachments',
  'sales-kit-resources',
  'parent-report-samples'
)
order by id;


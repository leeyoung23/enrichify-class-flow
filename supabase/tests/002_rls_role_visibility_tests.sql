-- 002_rls_role_visibility_tests.sql
-- Draft/manual role visibility checks for RLS verification.
-- These are read-only queries.
--
-- IMPORTANT:
-- SQL Editor may run with elevated privileges and can bypass RLS.
-- If results look over-permissive, repeat tests via authenticated session
-- (Supabase client/token) for each role.

-- -------------------------------------------------------------------
-- 0) Shared helpers: identify fake auth/profile IDs by email
-- -------------------------------------------------------------------
with role_users as (
  select
    p.id as profile_id,
    p.email,
    p.role,
    p.branch_id
  from public.profiles p
  where p.email in (
    'hq.demo@example.test',
    'supervisor.demo@example.test',
    'teacher.demo@example.test',
    'parent.demo@example.test',
    'student.demo@example.test'
  )
)
select * from role_users order by role;

-- -------------------------------------------------------------------
-- 1) HQ Admin expectations
-- Expected:
-- - Can see all branches/students/attendance/homework/fee/sales-kit/tasks.
-- -------------------------------------------------------------------
select count(*) as hq_branches_visible from public.branches;
select count(*) as hq_students_visible from public.students;
select count(*) as hq_attendance_visible from public.attendance_records;
select count(*) as hq_homework_visible from public.homework_records;
select count(*) as hq_parent_comments_visible from public.parent_comments;
select count(*) as hq_weekly_reports_visible from public.weekly_progress_reports;
select count(*) as hq_fee_records_visible from public.fee_records;
select count(*) as hq_teacher_tasks_visible from public.teacher_tasks;
select status, count(*) as hq_sales_kit_by_status
from public.sales_kit_resources
group by status
order by status;

-- -------------------------------------------------------------------
-- 2) Branch Supervisor expectations (own branch only)
-- Expected:
-- - Branch-scoped records only.
-- - Sales kit: approved-only and in allowed scope.
-- -------------------------------------------------------------------
-- Replace with authenticated Branch Supervisor context when validating true RLS behavior.
select branch_id, count(*) as supervisor_students_by_branch
from public.students
group by branch_id
order by branch_id;

select branch_id, count(*) as supervisor_attendance_by_branch
from public.attendance_records
group by branch_id
order by branch_id;

select branch_id, count(*) as supervisor_homework_by_branch
from public.homework_records
group by branch_id
order by branch_id;

select branch_id, count(*) as supervisor_fee_records_by_branch
from public.fee_records
group by branch_id
order by branch_id;

select status, is_global, branch_id, count(*) as supervisor_sales_kit_visibility_shape
from public.sales_kit_resources
group by status, is_global, branch_id
order by status, is_global desc, branch_id;

-- -------------------------------------------------------------------
-- 3) Teacher expectations (assigned class/student/task only)
-- Expected:
-- - Class/student-scoped attendance/homework/comments/reports/tasks only.
-- - Fee records blocked.
-- - Sales kit blocked.
-- -------------------------------------------------------------------
-- Replace with authenticated Teacher context for strict RLS verification.
select class_id, count(*) as teacher_attendance_by_class
from public.attendance_records
group by class_id
order by class_id;

select class_id, count(*) as teacher_homework_by_class
from public.homework_records
group by class_id
order by class_id;

select class_id, count(*) as teacher_comments_by_class
from public.parent_comments
group by class_id
order by class_id;

select class_id, count(*) as teacher_reports_by_class
from public.weekly_progress_reports
group by class_id
order by class_id;

select count(*) as teacher_fee_records_should_be_zero_or_blocked from public.fee_records;
select count(*) as teacher_sales_kit_should_be_zero_or_blocked from public.sales_kit_resources;
select count(*) as teacher_tasks_visible from public.teacher_tasks;

-- -------------------------------------------------------------------
-- 4) Parent expectations (linked child only)
-- Expected:
-- - Linked child student/attendance/homework only.
-- - Parent comments/reports: approved/released visibility only.
-- - Fee records limited to linked child summary policy.
-- - Sales kit blocked.
-- -------------------------------------------------------------------
-- Replace with authenticated Parent context for strict RLS verification.
select count(*) as parent_students_visible from public.students;
select count(*) as parent_attendance_visible from public.attendance_records;
select count(*) as parent_homework_visible from public.homework_records;
select status, count(*) as parent_comments_by_status from public.parent_comments group by status order by status;
select status, count(*) as parent_reports_by_status from public.weekly_progress_reports group by status order by status;
select count(*) as parent_fee_records_visible from public.fee_records;
select count(*) as parent_sales_kit_should_be_zero_or_blocked from public.sales_kit_resources;

-- -------------------------------------------------------------------
-- 5) Student expectations (self-only)
-- Expected:
-- - Own student/attendance/homework only.
-- - Communication visibility constrained to approved/released as policy allows.
-- - Fee records blocked by safer default unless explicitly opened.
-- - Sales kit blocked.
-- -------------------------------------------------------------------
-- Replace with authenticated Student context for strict RLS verification.
select count(*) as student_students_visible from public.students;
select count(*) as student_attendance_visible from public.attendance_records;
select count(*) as student_homework_visible from public.homework_records;
select status, count(*) as student_comments_by_status from public.parent_comments group by status order by status;
select status, count(*) as student_reports_by_status from public.weekly_progress_reports group by status order by status;
select count(*) as student_fee_records_should_be_zero_or_blocked from public.fee_records;
select count(*) as student_sales_kit_should_be_zero_or_blocked from public.sales_kit_resources;
select count(*) as student_teacher_tasks_should_be_zero_or_blocked from public.teacher_tasks;


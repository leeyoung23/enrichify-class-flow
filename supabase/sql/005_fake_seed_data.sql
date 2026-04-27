-- 005_fake_seed_data.sql
-- Fake seed data only. Do NOT use real identities or operational data.
-- Auth note: profile IDs below are placeholders and may need replacement
-- with real auth.users IDs after test user creation in Supabase Auth.

-- Deterministic fake IDs for review/testing only
-- Branches
insert into branches (id, name, code) values
  ('11111111-1111-1111-1111-111111111111', 'Demo North Branch', 'north_demo'),
  ('22222222-2222-2222-2222-222222222222', 'Demo South Branch', 'south_demo')
on conflict (id) do nothing;

-- Profiles (placeholder auth user IDs)
insert into profiles (id, email, full_name, role, branch_id, linked_student_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'hq.demo@example.test', 'HQ Demo User', 'hq_admin', null, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'supervisor.demo@example.test', 'Supervisor Demo User', 'branch_supervisor', '11111111-1111-1111-1111-111111111111', null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'teacher.demo@example.test', 'Teacher Demo User', 'teacher', '11111111-1111-1111-1111-111111111111', null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'parent.demo@example.test', 'Parent Demo User', 'parent', '11111111-1111-1111-1111-111111111111', null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'student.demo@example.test', 'Student Demo User', 'student', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555')
on conflict (id) do nothing;

-- Classes
insert into classes (id, branch_id, name, subject, level, schedule_note) values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'North Class A', 'English', 'Level 1', 'Mon/Wed 4PM'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'South Class A', 'Math', 'Level 2', 'Tue/Thu 5PM')
on conflict (id) do nothing;

-- Teacher
insert into teachers (id, profile_id, branch_id) values
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Student
insert into students (id, branch_id, class_id, full_name, student_code) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'Student Demo A', 'STU-DEMO-001')
on conflict (id) do nothing;

-- Guardian
insert into guardians (id, profile_id) values
  ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4')
on conflict (id) do nothing;

insert into guardian_student_links (id, guardian_id, student_id, relationship, is_primary) values
  ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'parent', true)
on conflict (id) do nothing;

-- Teacher assignment
insert into teacher_class_assignments (id, teacher_id, class_id, branch_id) values
  ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Schools and student school profile
insert into schools (id, name, school_type) values
  ('99999999-9999-9999-9999-999999999991', 'Demo Learning School', 'demo_type')
on conflict (id) do nothing;

insert into student_school_profiles (id, student_id, school_id, year_grade, curriculum_pathway) values
  ('99999999-9999-9999-9999-999999999992', '55555555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999991', 'Year 4', 'Demo Pathway')
on conflict (id) do nothing;

-- Attendance and homework
insert into attendance_records (id, branch_id, class_id, student_id, teacher_id, session_date, status, note) values
  ('10101010-1010-1010-1010-101010101010', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', current_date - 1, 'present', 'demo attendance note')
on conflict (id) do nothing;

insert into homework_records (id, branch_id, class_id, student_id, teacher_id, title, details, due_date, status) values
  ('20202020-2020-2020-2020-202020202020', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Demo Worksheet 1', 'Fake worksheet task', current_date + 3, 'assigned')
on conflict (id) do nothing;

insert into homework_attachments (id, branch_id, class_id, student_id, homework_record_id, uploaded_by_profile_id, storage_bucket, storage_path, file_name) values
  ('21212121-2121-2121-2121-212121212121', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555555', '20202020-2020-2020-2020-202020202020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'homework-uploads', 'demo/student-001/homework-001.txt', 'homework-demo.txt')
on conflict (id) do nothing;

-- Parent communication
insert into parent_comments (id, branch_id, class_id, student_id, teacher_id, comment_text, status) values
  ('30303030-3030-3030-3030-303030303030', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Demo parent comment', 'approved')
on conflict (id) do nothing;

insert into weekly_progress_reports (id, branch_id, class_id, student_id, teacher_id, week_start_date, report_text, status) values
  ('31313131-3131-3131-3131-313131313131', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', current_date - 7, 'Demo weekly report text', 'released')
on conflict (id) do nothing;

-- Teacher tasks
insert into teacher_tasks (id, branch_id, class_id, student_id, created_by_profile_id, title, details, status, due_at) values
  ('40404040-4040-4040-4040-404040404040', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Demo follow-up task', 'Prepare demo revision plan', 'in_progress', now() + interval '2 days')
on conflict (id) do nothing;

insert into teacher_task_assignments (id, task_id, teacher_id, assigned_by_profile_id, status) values
  ('41414141-4141-4141-4141-414141414141', '40404040-4040-4040-4040-404040404040', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'in_progress')
on conflict (id) do nothing;

insert into task_attachments (id, task_id, uploaded_by_profile_id, storage_bucket, storage_path, file_name) values
  ('42424242-4242-4242-4242-424242424242', '40404040-4040-4040-4040-404040404040', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'task-attachments', 'demo/tasks/task-001.txt', 'task-demo-note.txt')
on conflict (id) do nothing;

-- Fee record (fake)
insert into fee_records (
  id, branch_id, student_id, class_id, fee_period, amount, status,
  receipt_file_path, receipt_storage_bucket, uploaded_by_profile_id, uploaded_at,
  verified_by_profile_id, verified_at, verification_status, internal_note
) values
  (
    '50505050-5050-5050-5050-505050505050',
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333331',
    '2026-04',
    120.00,
    'pending_verification',
    'demo/receipts/fee-001.png',
    'fee-receipts',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    now() - interval '1 day',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    now(),
    'verified',
    'demo fee record only'
  )
on conflict (id) do nothing;

-- Observations
insert into observations (id, branch_id, class_id, teacher_id, observer_profile_id, observation_note) values
  ('60606060-6060-6060-6060-606060606060', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Demo observation note')
on conflict (id) do nothing;

-- Leads and trial schedules
insert into leads (id, branch_id, parent_name, child_name, status, note) values
  ('70707070-7070-7070-7070-707070707070', '11111111-1111-1111-1111-111111111111', 'Demo Parent Lead', 'Demo Child Lead', 'contacted', 'demo lead note')
on conflict (id) do nothing;

insert into trial_schedules (id, branch_id, class_id, lead_id, assigned_teacher_id, status, scheduled_at) values
  ('71717171-7171-7171-7171-717171717171', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '70707070-7070-7070-7070-707070707070', '44444444-4444-4444-4444-444444444444', 'scheduled', now() + interval '3 days')
on conflict (id) do nothing;

-- Sales kit resources
insert into sales_kit_resources (
  id, branch_id, title, resource_type, description, resource_url,
  storage_bucket, storage_path, status, is_global, branch_scope,
  created_by_profile_id, approved_by_profile_id, approved_at
) values
  (
    '80808080-8080-8080-8080-808080808080',
    null,
    'Demo Sales Brochure',
    'pdf',
    'Global approved demo brochure',
    null,
    'sales-kit-resources',
    'demo/global/sales-brochure.pdf',
    'approved',
    true,
    'global',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    now() - interval '2 days'
  ),
  (
    '81818181-8181-8181-8181-818181818181',
    '11111111-1111-1111-1111-111111111111',
    'Demo North Campaign Deck',
    'pdf',
    'Branch scoped approved demo deck',
    null,
    'sales-kit-resources',
    'demo/north/campaign-deck.pdf',
    'approved',
    false,
    'branch',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    now() - interval '1 day'
  ),
  (
    '82828282-8282-8282-8282-828282828282',
    '11111111-1111-1111-1111-111111111111',
    'Demo Draft Sales Notes',
    'link',
    'Draft example not visible to branch supervisors',
    'https://example.test/demo-draft-sales-notes',
    'sales-kit-resources',
    'demo/north/draft-sales-notes.txt',
    'draft',
    false,
    'branch',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    null,
    null
  )
on conflict (id) do nothing;


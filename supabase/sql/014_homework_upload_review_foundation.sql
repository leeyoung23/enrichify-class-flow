-- 014_homework_upload_review_foundation.sql
-- Manual/dev-first additive draft only.
-- Review carefully before any manual execution in a dev Supabase project.
-- Do NOT auto-apply in production.
-- Use fake/dev data and fake files only for validation.
-- No destructive table drops, no data deletes, no global RLS disable.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Private storage bucket (homework submissions)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('homework-submissions', 'homework-submissions', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) homework_tasks
-- Lean MVP assignment/request metadata.
-- -----------------------------------------------------------------------------
create table if not exists public.homework_tasks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  class_id uuid not null references public.classes(id),
  created_by_profile_id uuid null references public.profiles(id),
  title text not null,
  instructions text null,
  subject text null,
  due_date date null,
  status text not null default 'draft'
    check (status in ('draft', 'assigned', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3) homework_submissions
-- Per-student submission records linked to a homework task.
-- -----------------------------------------------------------------------------
create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_task_id uuid not null references public.homework_tasks(id),
  branch_id uuid not null references public.branches(id),
  class_id uuid not null references public.classes(id),
  student_id uuid not null references public.students(id),
  submitted_by_profile_id uuid null references public.profiles(id),
  submission_note text null,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'reviewed', 'returned_for_revision', 'approved_for_parent', 'archived')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by_profile_id uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4) homework_files
-- File metadata only; objects are stored in private storage bucket.
-- -----------------------------------------------------------------------------
create table if not exists public.homework_files (
  id uuid primary key default gen_random_uuid(),
  homework_submission_id uuid not null references public.homework_submissions(id),
  storage_bucket text not null default 'homework-submissions'
    check (storage_bucket = 'homework-submissions'),
  storage_path text not null,
  file_name text null,
  content_type text null,
  file_size_bytes integer null,
  uploaded_by_profile_id uuid null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5) homework_feedback
-- Feedback lifecycle is draft-first. internal_note is never parent-visible by policy.
-- -----------------------------------------------------------------------------
create table if not exists public.homework_feedback (
  id uuid primary key default gen_random_uuid(),
  homework_submission_id uuid not null references public.homework_submissions(id),
  teacher_profile_id uuid null references public.profiles(id),
  feedback_text text null,
  next_step text null,
  internal_note text null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'released_to_parent', 'archived')),
  released_to_parent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.homework_tasks is
  'Manual/dev-first homework assignment table draft. Lean MVP scope; not auto-applied.';
comment on table public.homework_submissions is
  'Manual/dev-first homework submission table draft. Lean MVP scope; not auto-applied.';
comment on table public.homework_files is
  'Manual/dev-first homework file metadata table draft. Private storage only.';
comment on table public.homework_feedback is
  'Manual/dev-first homework feedback draft. Parent visibility is release-gated.';
comment on column public.homework_feedback.internal_note is
  'Internal staff note only. Parent/student must not read this field via policy/service layer.';

-- -----------------------------------------------------------------------------
-- 6) Helper functions for homework scope checks
-- SECURITY DEFINER is used for RLS policy readability and recursion avoidance.
-- -----------------------------------------------------------------------------
create or replace function public.homework_task_branch_id(task_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ht.branch_id
  from public.homework_tasks ht
  where ht.id = task_uuid
  limit 1
$$;

create or replace function public.homework_submission_branch_id(submission_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hs.branch_id
  from public.homework_submissions hs
  where hs.id = submission_uuid
  limit 1
$$;

create or replace function public.can_access_homework_submission(submission_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.homework_submissions hs
      where hs.id = submission_uuid
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(hs.branch_id)
          or public.is_teacher_for_class(hs.class_id)
          or public.is_guardian_for_student(hs.student_id)
          or public.is_student_self(hs.student_id)
        )
    ),
    false
  )
$$;

create or replace function public.homework_path_matches_submission(path text, submission_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.homework_submissions hs
      where hs.id = submission_uuid
        and array_length(string_to_array(path, '/'), 1) = 5
        and split_part(path, '/', 1) = hs.branch_id::text
        and split_part(path, '/', 2) = hs.class_id::text
        and split_part(path, '/', 3) = hs.student_id::text
        and split_part(path, '/', 4) = hs.homework_task_id::text
        and split_part(split_part(path, '/', 5), '-', 1) = hs.id::text
    ),
    false
  )
$$;

create or replace function public.can_access_homework_path(path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.homework_files hf
      join public.homework_submissions hs on hs.id = hf.homework_submission_id
      where hf.storage_bucket = 'homework-submissions'
        and hf.storage_path = path
        and public.homework_path_matches_submission(hf.storage_path, hf.homework_submission_id)
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(hs.branch_id)
          or public.is_teacher_for_class(hs.class_id)
          or public.is_guardian_for_student(hs.student_id)
          or public.is_student_self(hs.student_id)
        )
    ),
    false
  )
$$;

-- -----------------------------------------------------------------------------
-- 7) Enable RLS
-- -----------------------------------------------------------------------------
alter table public.homework_tasks enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.homework_files enable row level security;
alter table public.homework_feedback enable row level security;

-- -----------------------------------------------------------------------------
-- 8) homework_tasks policies
-- -----------------------------------------------------------------------------
drop policy if exists homework_tasks_select_014 on public.homework_tasks;
create policy homework_tasks_select_014
on public.homework_tasks
for select
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or exists (
    select 1
    from public.homework_submissions hs
    where hs.homework_task_id = homework_tasks.id
      and (public.is_guardian_for_student(hs.student_id) or public.is_student_self(hs.student_id))
  )
);

drop policy if exists homework_tasks_insert_014 on public.homework_tasks;
create policy homework_tasks_insert_014
on public.homework_tasks
for insert
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
    and created_by_profile_id = auth.uid()
  )
);

drop policy if exists homework_tasks_update_014 on public.homework_tasks;
create policy homework_tasks_update_014
on public.homework_tasks
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
  )
)
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
  )
);

drop policy if exists homework_tasks_delete_014 on public.homework_tasks;
create policy homework_tasks_delete_014
on public.homework_tasks
for delete
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- -----------------------------------------------------------------------------
-- 9) homework_submissions policies
-- Parent can insert for linked child only when task is assigned/open.
-- Student self-insert is optional and allowed in this draft for future portal support.
-- -----------------------------------------------------------------------------
drop policy if exists homework_submissions_select_014 on public.homework_submissions;
create policy homework_submissions_select_014
on public.homework_submissions
for select
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or public.is_guardian_for_student(student_id)
  or public.is_student_self(student_id)
);

drop policy if exists homework_submissions_insert_014 on public.homework_submissions;
create policy homework_submissions_insert_014
on public.homework_submissions
for insert
with check (
  (
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(branch_id)
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_for_class(class_id)
    )
    or (
      public.current_user_role() = 'parent'
      and public.is_guardian_for_student(student_id)
      and submitted_by_profile_id = auth.uid()
    )
    or (
      public.current_user_role() = 'student'
      and public.is_student_self(student_id)
      and submitted_by_profile_id = auth.uid()
    )
  )
  and exists (
    select 1
    from public.homework_tasks ht
    where ht.id = homework_task_id
      and ht.class_id = homework_submissions.class_id
      and ht.branch_id = homework_submissions.branch_id
      and ht.status in ('assigned', 'closed')
  )
);

drop policy if exists homework_submissions_update_014 on public.homework_submissions;
create policy homework_submissions_update_014
on public.homework_submissions
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
  )
)
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and public.is_teacher_for_class(class_id)
  )
);

drop policy if exists homework_submissions_delete_014 on public.homework_submissions;
create policy homework_submissions_delete_014
on public.homework_submissions
for delete
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- -----------------------------------------------------------------------------
-- 10) homework_files policies
-- Metadata row references one submission and fixed bucket.
-- -----------------------------------------------------------------------------
drop policy if exists homework_files_select_014 on public.homework_files;
create policy homework_files_select_014
on public.homework_files
for select
using (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_files.homework_submission_id
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
        or public.is_teacher_for_class(hs.class_id)
        or public.is_guardian_for_student(hs.student_id)
        or public.is_student_self(hs.student_id)
      )
  )
);

drop policy if exists homework_files_insert_014 on public.homework_files;
create policy homework_files_insert_014
on public.homework_files
for insert
with check (
  storage_bucket = 'homework-submissions'
  and exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_files.homework_submission_id
      and public.homework_path_matches_submission(homework_files.storage_path, homework_files.homework_submission_id)
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
        or (
          public.current_user_role() = 'teacher'
          and public.is_teacher_for_class(hs.class_id)
        )
        or (
          public.current_user_role() = 'parent'
          and public.is_guardian_for_student(hs.student_id)
          and uploaded_by_profile_id = auth.uid()
        )
        or (
          public.current_user_role() = 'student'
          and public.is_student_self(hs.student_id)
          and uploaded_by_profile_id = auth.uid()
        )
      )
  )
);

drop policy if exists homework_files_update_014 on public.homework_files;
create policy homework_files_update_014
on public.homework_files
for update
using (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_files.homework_submission_id
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
      )
  )
)
with check (
  storage_bucket = 'homework-submissions'
  and exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_files.homework_submission_id
      and public.homework_path_matches_submission(homework_files.storage_path, homework_files.homework_submission_id)
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
      )
  )
);

drop policy if exists homework_files_delete_014 on public.homework_files;
create policy homework_files_delete_014
on public.homework_files
for delete
using (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_files.homework_submission_id
      and public.homework_path_matches_submission(homework_files.storage_path, homework_files.homework_submission_id)
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
      )
  )
);

-- -----------------------------------------------------------------------------
-- 11) homework_feedback policies
-- Parent/student read is restricted to released feedback only.
-- -----------------------------------------------------------------------------
drop policy if exists homework_feedback_select_014 on public.homework_feedback;
create policy homework_feedback_select_014
on public.homework_feedback
for select
using (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_feedback.homework_submission_id
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
        or public.is_teacher_for_class(hs.class_id)
        or (
          homework_feedback.status = 'released_to_parent'
          and (public.is_guardian_for_student(hs.student_id) or public.is_student_self(hs.student_id))
        )
      )
  )
);

drop policy if exists homework_feedback_insert_014 on public.homework_feedback;
create policy homework_feedback_insert_014
on public.homework_feedback
for insert
with check (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_feedback.homework_submission_id
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
        or (
          public.current_user_role() = 'teacher'
          and public.is_teacher_for_class(hs.class_id)
          and teacher_profile_id = auth.uid()
        )
      )
  )
);

drop policy if exists homework_feedback_update_014 on public.homework_feedback;
create policy homework_feedback_update_014
on public.homework_feedback
for update
using (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_feedback.homework_submission_id
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
        or (
          public.current_user_role() = 'teacher'
          and public.is_teacher_for_class(hs.class_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_feedback.homework_submission_id
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
        or (
          public.current_user_role() = 'teacher'
          and public.is_teacher_for_class(hs.class_id)
        )
      )
  )
);

drop policy if exists homework_feedback_delete_014 on public.homework_feedback;
create policy homework_feedback_delete_014
on public.homework_feedback
for delete
using (
  exists (
    select 1
    from public.homework_submissions hs
    where hs.id = homework_feedback.homework_submission_id
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
      )
  )
);

-- -----------------------------------------------------------------------------
-- 12) Storage policies for homework-submissions objects
-- Path intent:
-- {branch_id}/{class_id}/{student_id}/{homework_task_id}/{submission_id}-{safe_filename}
-- Metadata-first model:
-- 1) create homework_submissions + homework_files rows
-- 2) upload storage object using exact storage_path
-- -----------------------------------------------------------------------------
drop policy if exists homework_submissions_storage_select_014 on storage.objects;
create policy homework_submissions_storage_select_014
on storage.objects
for select
using (
  bucket_id = 'homework-submissions'
  and public.can_access_homework_path(storage.objects.name)
);

drop policy if exists homework_submissions_storage_insert_014 on storage.objects;
create policy homework_submissions_storage_insert_014
on storage.objects
for insert
with check (
  bucket_id = 'homework-submissions'
  and exists (
    select 1
    from public.homework_files hf
    join public.homework_submissions hs on hs.id = hf.homework_submission_id
    where hf.storage_bucket = 'homework-submissions'
      and hf.storage_path = storage.objects.name
      and public.homework_path_matches_submission(hf.storage_path, hf.homework_submission_id)
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
        or (
          public.current_user_role() = 'teacher'
          and public.is_teacher_for_class(hs.class_id)
        )
        or (
          public.current_user_role() = 'parent'
          and public.is_guardian_for_student(hs.student_id)
          and hf.uploaded_by_profile_id = auth.uid()
        )
        or (
          public.current_user_role() = 'student'
          and public.is_student_self(hs.student_id)
          and hf.uploaded_by_profile_id = auth.uid()
        )
      )
  )
);

-- Conservative mutation scope: update/delete storage objects only by HQ or branch supervisor.
drop policy if exists homework_submissions_storage_update_014 on storage.objects;
create policy homework_submissions_storage_update_014
on storage.objects
for update
using (
  bucket_id = 'homework-submissions'
  and exists (
    select 1
    from public.homework_files hf
    join public.homework_submissions hs on hs.id = hf.homework_submission_id
    where hf.storage_bucket = 'homework-submissions'
      and hf.storage_path = storage.objects.name
      and public.homework_path_matches_submission(hf.storage_path, hf.homework_submission_id)
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
      )
  )
)
with check (
  bucket_id = 'homework-submissions'
  and exists (
    select 1
    from public.homework_files hf
    join public.homework_submissions hs on hs.id = hf.homework_submission_id
    where hf.storage_bucket = 'homework-submissions'
      and hf.storage_path = storage.objects.name
      and public.homework_path_matches_submission(hf.storage_path, hf.homework_submission_id)
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
      )
  )
);

drop policy if exists homework_submissions_storage_delete_014 on storage.objects;
create policy homework_submissions_storage_delete_014
on storage.objects
for delete
using (
  bucket_id = 'homework-submissions'
  and exists (
    select 1
    from public.homework_files hf
    join public.homework_submissions hs on hs.id = hf.homework_submission_id
    where hf.storage_bucket = 'homework-submissions'
      and hf.storage_path = storage.objects.name
      and public.homework_path_matches_submission(hf.storage_path, hf.homework_submission_id)
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(hs.branch_id)
      )
  )
);

-- -----------------------------------------------------------------------------
-- 13) Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_homework_tasks_branch_id_014 on public.homework_tasks(branch_id);
create index if not exists idx_homework_tasks_class_id_014 on public.homework_tasks(class_id);
create index if not exists idx_homework_tasks_status_014 on public.homework_tasks(status);
create index if not exists idx_homework_tasks_due_date_014 on public.homework_tasks(due_date);

create index if not exists idx_homework_submissions_task_id_014 on public.homework_submissions(homework_task_id);
create index if not exists idx_homework_submissions_student_id_014 on public.homework_submissions(student_id);
create index if not exists idx_homework_submissions_class_id_014 on public.homework_submissions(class_id);
create index if not exists idx_homework_submissions_status_014 on public.homework_submissions(status);

create index if not exists idx_homework_files_submission_id_014 on public.homework_files(homework_submission_id);
create index if not exists idx_homework_feedback_submission_id_014 on public.homework_feedback(homework_submission_id);
create index if not exists idx_homework_feedback_status_014 on public.homework_feedback(status);

-- -----------------------------------------------------------------------------
-- 14) updated_at triggers (local safe trigger pattern for homework tables)
-- -----------------------------------------------------------------------------
create or replace function public.set_homework_pipeline_updated_at_014()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_homework_tasks_updated_at_014 on public.homework_tasks;
create trigger trg_set_homework_tasks_updated_at_014
before update on public.homework_tasks
for each row execute function public.set_homework_pipeline_updated_at_014();

drop trigger if exists trg_set_homework_submissions_updated_at_014 on public.homework_submissions;
create trigger trg_set_homework_submissions_updated_at_014
before update on public.homework_submissions
for each row execute function public.set_homework_pipeline_updated_at_014();

drop trigger if exists trg_set_homework_feedback_updated_at_014 on public.homework_feedback;
create trigger trg_set_homework_feedback_updated_at_014
before update on public.homework_feedback
for each row execute function public.set_homework_pipeline_updated_at_014();

-- End of 014 manual/dev-first draft.

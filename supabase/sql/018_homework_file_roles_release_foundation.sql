-- 018_homework_file_roles_release_foundation.sql
-- Manual/dev-first additive draft only.
-- Do NOT auto-apply. Review and run manually in dev Supabase SQL editor.
-- Use fake/dev data only for validation (no real student/parent/teacher/school data).
-- No destructive table drops, no data deletes, no global RLS disable.

-- -----------------------------------------------------------------------------
-- 1) Additive columns on homework_files
-- Backward-compatible defaults preserve existing parent upload behavior.
-- -----------------------------------------------------------------------------
alter table public.homework_files
  add column if not exists file_role text not null default 'parent_uploaded_homework',
  add column if not exists released_to_parent boolean not null default false,
  add column if not exists released_at timestamptz null,
  add column if not exists released_by_profile_id uuid null references public.profiles(id),
  add column if not exists marked_by_profile_id uuid null references public.profiles(id),
  add column if not exists staff_note text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'homework_files_file_role_check_018'
      and conrelid = 'public.homework_files'::regclass
  ) then
    alter table public.homework_files
      add constraint homework_files_file_role_check_018
      check (file_role in ('parent_uploaded_homework', 'teacher_marked_homework', 'feedback_attachment'));
  end if;
end;
$$;

comment on column public.homework_files.file_role is
  'Added in 018 manual/dev-first draft. File intent role for safe release-aware visibility.';
comment on column public.homework_files.released_to_parent is
  'Added in 018 manual/dev-first draft. Parent-visible gate for teacher_marked_homework and feedback_attachment.';
comment on column public.homework_files.released_at is
  'Added in 018 manual/dev-first draft. Timestamp set by staff when file is released to parent.';
comment on column public.homework_files.released_by_profile_id is
  'Added in 018 manual/dev-first draft. Staff profile who released file to parent.';
comment on column public.homework_files.marked_by_profile_id is
  'Added in 018 manual/dev-first draft. Optional staff marker identity for audit.';
comment on column public.homework_files.staff_note is
  'Added in 018 manual/dev-first draft. Internal staff note, not parent-facing.';

-- -----------------------------------------------------------------------------
-- 2) Helper functions for role/release-aware file access checks
-- SECURITY DEFINER for policy readability and recursion avoidance.
-- -----------------------------------------------------------------------------
create or replace function public.homework_file_submission_id(file_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hf.homework_submission_id
  from public.homework_files hf
  where hf.id = file_uuid
  limit 1
$$;

create or replace function public.homework_file_branch_id(file_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hs.branch_id
  from public.homework_files hf
  join public.homework_submissions hs on hs.id = hf.homework_submission_id
  where hf.id = file_uuid
  limit 1
$$;

create or replace function public.can_access_homework_file(file_uuid uuid)
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
      where hf.id = file_uuid
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(hs.branch_id)
          or public.is_teacher_for_class(hs.class_id)
          or (
            public.is_guardian_for_student(hs.student_id)
            and (
              hf.file_role = 'parent_uploaded_homework'
              or hf.released_to_parent = true
            )
          )
          or (
            public.is_student_self(hs.student_id)
            and (
              hf.file_role = 'parent_uploaded_homework'
              or hf.released_to_parent = true
            )
          )
        )
    ),
    false
  )
$$;

comment on function public.can_access_homework_file(uuid) is
  'Added in 018 manual/dev-first draft. Parent/student can access marked/feedback files only when released_to_parent=true.';

-- -----------------------------------------------------------------------------
-- 3) homework_files RLS patch (narrow replacement of 014 policies)
-- Parent/student remain blocked from creating review/release metadata.
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
        or (
          public.is_guardian_for_student(hs.student_id)
          and (
            homework_files.file_role = 'parent_uploaded_homework'
            or homework_files.released_to_parent = true
          )
        )
        or (
          public.is_student_self(hs.student_id)
          and (
            homework_files.file_role = 'parent_uploaded_homework'
            or homework_files.released_to_parent = true
          )
        )
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
          and file_role = 'parent_uploaded_homework'
          and released_to_parent = false
          and released_at is null
          and released_by_profile_id is null
          and marked_by_profile_id is null
        )
        or (
          public.current_user_role() = 'student'
          and public.is_student_self(hs.student_id)
          and uploaded_by_profile_id = auth.uid()
          and file_role = 'parent_uploaded_homework'
          and released_to_parent = false
          and released_at is null
          and released_by_profile_id is null
          and marked_by_profile_id is null
        )
      )
  )
);

-- Keep conservative update/delete scope from 014:
-- HQ + branch supervisor only. Teacher upload/read remains allowed via insert/select.
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
-- 4) storage.objects policy implications
-- Keep private bucket model. Do not loosen object access.
-- -----------------------------------------------------------------------------
drop policy if exists homework_submissions_storage_select_014 on storage.objects;
create policy homework_submissions_storage_select_014
on storage.objects
for select
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
        or public.is_teacher_for_class(hs.class_id)
        or (
          public.is_guardian_for_student(hs.student_id)
          and (
            hf.file_role = 'parent_uploaded_homework'
            or hf.released_to_parent = true
          )
        )
        or (
          public.is_student_self(hs.student_id)
          and (
            hf.file_role = 'parent_uploaded_homework'
            or hf.released_to_parent = true
          )
        )
      )
  )
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
          and hf.file_role = 'parent_uploaded_homework'
          and hf.released_to_parent = false
        )
        or (
          public.current_user_role() = 'student'
          and public.is_student_self(hs.student_id)
          and hf.uploaded_by_profile_id = auth.uid()
          and hf.file_role = 'parent_uploaded_homework'
          and hf.released_to_parent = false
        )
      )
  )
);

-- Update/delete storage object policies from 014 remain conservative and unchanged:
-- HQ + branch supervisor only.

-- -----------------------------------------------------------------------------
-- 5) Indexes for file-role/release model
-- -----------------------------------------------------------------------------
create index if not exists homework_files_file_role_idx
  on public.homework_files(file_role);
create index if not exists homework_files_released_to_parent_idx
  on public.homework_files(released_to_parent);
create index if not exists homework_files_role_release_idx
  on public.homework_files(file_role, released_to_parent);
create index if not exists homework_files_marked_by_profile_id_idx
  on public.homework_files(marked_by_profile_id);

-- Note: homework_files still does not have an updated_at column/trigger in 014.
-- 018 intentionally does not add updated_at to avoid expanding runtime blast radius.

-- End of 018 manual/dev-first draft.

-- 023_announcements_attachments_foundation.sql
-- Manual/dev-first SQL draft only for Announcements Phase 2 internal attachments.
-- Do NOT auto-apply. Review and run manually in Supabase dev SQL editor only.
-- No production apply assumption in this draft.
-- Use fake/dev data only (no real student/parent/teacher/school/curriculum/homework/payment/announcement data).
-- No destructive table drops, no data deletes, no global RLS disable.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) announcement_attachments table (additive only)
-- Parent-facing media remains blocked in this phase (field exists for later boundary).
-- -----------------------------------------------------------------------------
create table if not exists public.announcement_attachments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  uploaded_by_profile_id uuid not null references public.profiles(id),
  file_role text not null default 'response_upload',
  file_name text not null,
  storage_path text not null,
  mime_type text null,
  file_size bigint null,
  staff_note text null,
  created_at timestamptz not null default now(),
  released_to_parent boolean not null default false,
  released_at timestamptz null,
  released_by_profile_id uuid null references public.profiles(id)
);

-- -----------------------------------------------------------------------------
-- 2) Constraints
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcement_attachments_file_role_check_023'
      and conrelid = 'public.announcement_attachments'::regclass
  ) then
    alter table public.announcement_attachments
      add constraint announcement_attachments_file_role_check_023
      check (file_role in ('hq_attachment', 'supervisor_attachment', 'response_upload', 'parent_facing_media'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcement_attachments_file_size_nonnegative_023'
      and conrelid = 'public.announcement_attachments'::regclass
  ) then
    alter table public.announcement_attachments
      add constraint announcement_attachments_file_size_nonnegative_023
      check (file_size is null or file_size >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcement_attachments_file_size_max_023'
      and conrelid = 'public.announcement_attachments'::regclass
  ) then
    alter table public.announcement_attachments
      add constraint announcement_attachments_file_size_max_023
      check (file_size is null or file_size <= 26214400);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcement_attachments_release_consistency_023'
      and conrelid = 'public.announcement_attachments'::regclass
  ) then
    alter table public.announcement_attachments
      add constraint announcement_attachments_release_consistency_023
      check (
        (released_to_parent = false and released_at is null and released_by_profile_id is null)
        or (released_to_parent = true and released_at is not null and released_by_profile_id is not null)
      );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) Indexes
-- -----------------------------------------------------------------------------
create index if not exists announcement_attachments_announcement_id_idx
  on public.announcement_attachments(announcement_id);
create index if not exists announcement_attachments_uploaded_by_profile_id_idx
  on public.announcement_attachments(uploaded_by_profile_id);
create index if not exists announcement_attachments_file_role_idx
  on public.announcement_attachments(file_role);
create index if not exists announcement_attachments_created_at_idx
  on public.announcement_attachments(created_at);
create index if not exists announcement_attachments_released_to_parent_idx
  on public.announcement_attachments(released_to_parent);
create unique index if not exists announcement_attachments_storage_path_uniq_idx
  on public.announcement_attachments(storage_path);

-- -----------------------------------------------------------------------------
-- 4) Helper functions for RLS readability / recursion avoidance
-- SECURITY DEFINER + fixed search_path pattern.
-- -----------------------------------------------------------------------------
create or replace function public.announcement_attachment_announcement_id(attachment_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select aa.announcement_id
  from public.announcement_attachments aa
  where aa.id = attachment_uuid
  limit 1
$$;

create or replace function public.announcement_attachment_branch_id(attachment_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.branch_id
  from public.announcement_attachments aa
  join public.announcements a on a.id = aa.announcement_id
  where aa.id = attachment_uuid
  limit 1
$$;

create or replace function public.can_access_announcement_attachment(attachment_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.announcement_attachments aa
      join public.announcements a on a.id = aa.announcement_id
      where aa.id = attachment_uuid
        and a.audience_type = 'internal_staff'
        and aa.file_role <> 'parent_facing_media'
        and aa.released_to_parent = false
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(a.branch_id)
          or (
            public.current_user_role() = 'teacher'
            and public.can_access_announcement(a.id)
          )
        )
    ),
    false
  )
$$;

create or replace function public.can_manage_announcement_attachment(attachment_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.announcement_attachments aa
      join public.announcements a on a.id = aa.announcement_id
      where aa.id = attachment_uuid
        and a.audience_type = 'internal_staff'
        and aa.file_role <> 'parent_facing_media'
        and aa.released_to_parent = false
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(a.branch_id)
        )
    ),
    false
  )
$$;

comment on function public.can_access_announcement_attachment(uuid) is
  '023 draft helper. Phase 2 internal attachments only. Parent/student blocked. parent_facing_media blocked.';
comment on function public.can_manage_announcement_attachment(uuid) is
  '023 draft helper. HQ full manage + supervisor own-branch manage for internal attachment rows.';

-- -----------------------------------------------------------------------------
-- 5) Enable RLS
-- -----------------------------------------------------------------------------
alter table public.announcement_attachments enable row level security;

-- -----------------------------------------------------------------------------
-- 6) RLS policies
-- Parent/student remain blocked in this phase.
-- parent_facing_media remains blocked in this phase.
-- -----------------------------------------------------------------------------
drop policy if exists announcement_attachments_select_023 on public.announcement_attachments;
create policy announcement_attachments_select_023
on public.announcement_attachments
for select
using (
  public.can_access_announcement_attachment(id)
);

drop policy if exists announcement_attachments_insert_manage_023 on public.announcement_attachments;
create policy announcement_attachments_insert_manage_023
on public.announcement_attachments
for insert
with check (
  uploaded_by_profile_id = auth.uid()
  and file_role <> 'parent_facing_media'
  and released_to_parent = false
  and released_at is null
  and released_by_profile_id is null
  and exists (
    select 1
    from public.announcements a
    where a.id = announcement_attachments.announcement_id
      and a.audience_type = 'internal_staff'
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(a.branch_id)
      )
      and (
        (public.is_hq_admin() and file_role in ('hq_attachment', 'supervisor_attachment', 'response_upload'))
        or (
          public.current_user_role() = 'branch_supervisor'
          and file_role in ('hq_attachment', 'supervisor_attachment', 'response_upload')
        )
      )
  )
);

drop policy if exists announcement_attachments_insert_teacher_023 on public.announcement_attachments;
create policy announcement_attachments_insert_teacher_023
on public.announcement_attachments
for insert
with check (
  uploaded_by_profile_id = auth.uid()
  and file_role = 'response_upload'
  and released_to_parent = false
  and released_at is null
  and released_by_profile_id is null
  and exists (
    select 1
    from public.announcements a
    where a.id = announcement_attachments.announcement_id
      and a.audience_type = 'internal_staff'
      and public.current_user_role() = 'teacher'
      and public.can_access_announcement(a.id)
  )
);

drop policy if exists announcement_attachments_update_023 on public.announcement_attachments;
create policy announcement_attachments_update_023
on public.announcement_attachments
for update
using (
  public.can_manage_announcement_attachment(id)
)
with check (
  file_role <> 'parent_facing_media'
  and released_to_parent = false
  and released_at is null
  and released_by_profile_id is null
  and exists (
    select 1
    from public.announcements a
    where a.id = announcement_attachments.announcement_id
      and a.audience_type = 'internal_staff'
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(a.branch_id)
      )
  )
);

drop policy if exists announcement_attachments_delete_023 on public.announcement_attachments;
create policy announcement_attachments_delete_023
on public.announcement_attachments
for delete
using (
  public.can_manage_announcement_attachment(id)
);

-- -----------------------------------------------------------------------------
-- 7) Private storage bucket + storage policies (draft)
-- Safe private-only + metadata-linked checks.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
select 'announcements-attachments', 'announcements-attachments', false
where not exists (
  select 1 from storage.buckets where id = 'announcements-attachments'
);

drop policy if exists announcements_attachments_storage_select_023 on storage.objects;
create policy announcements_attachments_storage_select_023
on storage.objects
for select
using (
  bucket_id = 'announcements-attachments'
  and exists (
    select 1
    from public.announcement_attachments aa
    where aa.storage_path = storage.objects.name
      and aa.file_role <> 'parent_facing_media'
      and aa.released_to_parent = false
      and public.can_access_announcement_attachment(aa.id)
  )
);

drop policy if exists announcements_attachments_storage_insert_023 on storage.objects;
create policy announcements_attachments_storage_insert_023
on storage.objects
for insert
with check (
  bucket_id = 'announcements-attachments'
  and exists (
    select 1
    from public.announcement_attachments aa
    where aa.storage_path = storage.objects.name
      and aa.uploaded_by_profile_id = auth.uid()
      and aa.file_role <> 'parent_facing_media'
      and aa.released_to_parent = false
      and aa.released_at is null
      and aa.released_by_profile_id is null
      and public.can_access_announcement_attachment(aa.id)
  )
);

drop policy if exists announcements_attachments_storage_update_023 on storage.objects;
create policy announcements_attachments_storage_update_023
on storage.objects
for update
using (
  bucket_id = 'announcements-attachments'
  and exists (
    select 1
    from public.announcement_attachments aa
    where aa.storage_path = storage.objects.name
      and public.can_manage_announcement_attachment(aa.id)
  )
)
with check (
  bucket_id = 'announcements-attachments'
  and exists (
    select 1
    from public.announcement_attachments aa
    where aa.storage_path = storage.objects.name
      and public.can_manage_announcement_attachment(aa.id)
  )
);

drop policy if exists announcements_attachments_storage_delete_023 on storage.objects;
create policy announcements_attachments_storage_delete_023
on storage.objects
for delete
using (
  bucket_id = 'announcements-attachments'
  and exists (
    select 1
    from public.announcement_attachments aa
    where aa.storage_path = storage.objects.name
      and public.can_manage_announcement_attachment(aa.id)
  )
);

-- End of 023 manual/dev-first SQL draft.

-- 028_parent_announcements_foundation.sql
-- Manual/dev-first SQL draft only for parent-facing announcements/events foundation.
-- Do NOT auto-apply. Review and run manually in Supabase dev SQL editor only.
-- No production apply assumption in this draft.
-- Use fake/dev data only (no real student/parent/teacher/school/curriculum/homework/photo/payment/announcement/attendance data).
-- No destructive table drops, no data deletes, no global RLS disable.
--
-- Parent-facing boundary notes:
-- - Separate model from internal announcements tables.
-- - No internal_staff announcements are exposed through this model.
-- - No internal announcement_attachments are exposed through this model.
-- - parent_facing_media in internal announcement_attachments remains disabled/reserved.
-- - No notification/email automation is introduced in this draft.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Parent-facing foundation tables (additive only)
-- -----------------------------------------------------------------------------
create table if not exists public.parent_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text null,
  body text not null,
  announcement_type text not null,
  branch_id uuid null references public.branches(id),
  class_id uuid null references public.classes(id),
  status text not null default 'draft',
  publish_at timestamptz null,
  published_at timestamptz null,
  event_start_at timestamptz null,
  event_end_at timestamptz null,
  location text null,
  created_by_profile_id uuid not null references public.profiles(id),
  updated_by_profile_id uuid null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parent_announcement_targets (
  id uuid primary key default gen_random_uuid(),
  parent_announcement_id uuid not null references public.parent_announcements(id) on delete cascade,
  target_type text not null,
  branch_id uuid null references public.branches(id),
  class_id uuid null references public.classes(id),
  student_id uuid null references public.students(id),
  created_at timestamptz not null default now()
);

create table if not exists public.parent_announcement_read_receipts (
  id uuid primary key default gen_random_uuid(),
  parent_announcement_id uuid not null references public.parent_announcements(id) on delete cascade,
  guardian_profile_id uuid not null references public.profiles(id),
  read_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_announcement_read_receipts_uniq_028 unique (parent_announcement_id, guardian_profile_id)
);

create table if not exists public.parent_announcement_media (
  id uuid primary key default gen_random_uuid(),
  parent_announcement_id uuid not null references public.parent_announcements(id) on delete cascade,
  uploaded_by_profile_id uuid not null references public.profiles(id),
  file_name text not null,
  storage_path text not null,
  mime_type text null,
  file_size bigint null,
  media_role text not null default 'parent_media',
  released_to_parent boolean not null default false,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2) Constraints
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcements_type_check_028'
      and conrelid = 'public.parent_announcements'::regclass
  ) then
    alter table public.parent_announcements
      add constraint parent_announcements_type_check_028
      check (announcement_type in (
        'event',
        'activity',
        'centre_notice',
        'holiday_closure',
        'reminder',
        'celebration',
        'programme_update',
        'parent_workshop',
        'graduation_concert'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcements_status_check_028'
      and conrelid = 'public.parent_announcements'::regclass
  ) then
    alter table public.parent_announcements
      add constraint parent_announcements_status_check_028
      check (status in ('draft', 'published', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcements_published_at_required_028'
      and conrelid = 'public.parent_announcements'::regclass
  ) then
    alter table public.parent_announcements
      add constraint parent_announcements_published_at_required_028
      check (
        status <> 'published'
        or published_at is not null
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcements_event_window_check_028'
      and conrelid = 'public.parent_announcements'::regclass
  ) then
    alter table public.parent_announcements
      add constraint parent_announcements_event_window_check_028
      check (
        event_start_at is null
        or event_end_at is null
        or event_end_at >= event_start_at
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcement_targets_target_type_check_028'
      and conrelid = 'public.parent_announcement_targets'::regclass
  ) then
    alter table public.parent_announcement_targets
      add constraint parent_announcement_targets_target_type_check_028
      check (target_type in ('branch', 'class', 'student'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcement_targets_shape_check_028'
      and conrelid = 'public.parent_announcement_targets'::regclass
  ) then
    alter table public.parent_announcement_targets
      add constraint parent_announcement_targets_shape_check_028
      check (
        (target_type = 'branch' and branch_id is not null and class_id is null and student_id is null)
        or (target_type = 'class' and class_id is not null and branch_id is null and student_id is null)
        or (target_type = 'student' and student_id is not null and branch_id is null and class_id is null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcement_media_role_check_028'
      and conrelid = 'public.parent_announcement_media'::regclass
  ) then
    alter table public.parent_announcement_media
      add constraint parent_announcement_media_role_check_028
      check (media_role in ('parent_media', 'cover_image', 'attachment'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'parent_announcement_media_file_size_check_028'
      and conrelid = 'public.parent_announcement_media'::regclass
  ) then
    alter table public.parent_announcement_media
      add constraint parent_announcement_media_file_size_check_028
      check (file_size is null or (file_size >= 0 and file_size <= 26214400));
  end if;
end;
$$;

create unique index if not exists parent_announcement_media_storage_path_uniq_idx
  on public.parent_announcement_media(storage_path);

-- -----------------------------------------------------------------------------
-- 3) Indexes
-- -----------------------------------------------------------------------------
create index if not exists parent_announcements_status_idx
  on public.parent_announcements(status);
create index if not exists parent_announcements_branch_id_idx
  on public.parent_announcements(branch_id);
create index if not exists parent_announcements_class_id_idx
  on public.parent_announcements(class_id);
create index if not exists parent_announcements_published_at_idx
  on public.parent_announcements(published_at);
create index if not exists parent_announcements_event_start_at_idx
  on public.parent_announcements(event_start_at);

create index if not exists parent_announcement_targets_parent_announcement_id_idx
  on public.parent_announcement_targets(parent_announcement_id);
create index if not exists parent_announcement_targets_target_type_idx
  on public.parent_announcement_targets(target_type);
create index if not exists parent_announcement_targets_branch_id_idx
  on public.parent_announcement_targets(branch_id);
create index if not exists parent_announcement_targets_class_id_idx
  on public.parent_announcement_targets(class_id);
create index if not exists parent_announcement_targets_student_id_idx
  on public.parent_announcement_targets(student_id);

create index if not exists parent_announcement_read_receipts_parent_announcement_id_idx
  on public.parent_announcement_read_receipts(parent_announcement_id);
create index if not exists parent_announcement_read_receipts_guardian_profile_id_idx
  on public.parent_announcement_read_receipts(guardian_profile_id);

create index if not exists parent_announcement_media_parent_announcement_id_idx
  on public.parent_announcement_media(parent_announcement_id);
create index if not exists parent_announcement_media_released_to_parent_idx
  on public.parent_announcement_media(released_to_parent);

-- -----------------------------------------------------------------------------
-- 4) updated_at trigger helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_parent_announcements_updated_at_028()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_parent_announcements_updated_at_028 on public.parent_announcements;
create trigger trg_set_parent_announcements_updated_at_028
before update on public.parent_announcements
for each row execute function public.set_parent_announcements_updated_at_028();

create or replace function public.set_parent_announcement_read_receipts_updated_at_028()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_parent_announcement_read_receipts_updated_at_028 on public.parent_announcement_read_receipts;
create trigger trg_set_parent_announcement_read_receipts_updated_at_028
before update on public.parent_announcement_read_receipts
for each row execute function public.set_parent_announcement_read_receipts_updated_at_028();

-- -----------------------------------------------------------------------------
-- 5) Helper functions for RLS readability / recursion avoidance
-- -----------------------------------------------------------------------------
create or replace function public.parent_announcement_branch_id(parent_announcement_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pa.branch_id
  from public.parent_announcements pa
  where pa.id = parent_announcement_uuid
  limit 1
$$;

create or replace function public.parent_has_linked_student_in_branch_028(branch_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() = 'parent'
    and exists (
      select 1
      from public.students s
      where s.branch_id = branch_uuid
        and public.is_guardian_for_student(s.id)
    ),
    false
  )
$$;

create or replace function public.parent_has_linked_student_in_class_028(class_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() = 'parent'
    and exists (
      select 1
      from public.students s
      where s.class_id = class_uuid
        and public.is_guardian_for_student(s.id)
    ),
    false
  )
$$;

create or replace function public.can_manage_parent_announcement(parent_announcement_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.parent_announcements pa
      where pa.id = parent_announcement_uuid
        and (
          public.is_hq_admin()
          or (
            public.current_user_role() = 'branch_supervisor'
            and (
              (pa.branch_id is not null and public.is_branch_supervisor_for_branch(pa.branch_id))
              or exists (
                select 1
                from public.parent_announcement_targets pat
                where pat.parent_announcement_id = pa.id
                  and (
                    (pat.target_type = 'branch' and public.is_branch_supervisor_for_branch(pat.branch_id))
                    or (
                      pat.target_type = 'class'
                      and exists (
                        select 1
                        from public.classes c
                        where c.id = pat.class_id
                          and public.is_branch_supervisor_for_branch(c.branch_id)
                      )
                    )
                    or (
                      pat.target_type = 'student'
                      and exists (
                        select 1
                        from public.students s
                        where s.id = pat.student_id
                          and public.is_branch_supervisor_for_branch(s.branch_id)
                      )
                    )
                  )
              )
            )
          )
        )
    ),
    false
  )
$$;

create or replace function public.can_access_parent_announcement(parent_announcement_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.parent_announcements pa
      where pa.id = parent_announcement_uuid
        and (
          public.can_manage_parent_announcement(pa.id)
          or (
            public.current_user_role() = 'parent'
            and pa.status = 'published'
            and exists (
              select 1
              from public.parent_announcement_targets pat
              where pat.parent_announcement_id = pa.id
                and (
                  (pat.target_type = 'branch' and public.parent_has_linked_student_in_branch_028(pat.branch_id))
                  or (pat.target_type = 'class' and public.parent_has_linked_student_in_class_028(pat.class_id))
                  or (pat.target_type = 'student' and public.is_guardian_for_student(pat.student_id))
                )
            )
          )
        )
    ),
    false
  )
$$;

create or replace function public.can_access_parent_announcement_media(media_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.parent_announcement_media pam
      where pam.id = media_uuid
        and (
          public.can_manage_parent_announcement(pam.parent_announcement_id)
          or (
            pam.released_to_parent = true
            and public.can_access_parent_announcement(pam.parent_announcement_id)
          )
        )
    ),
    false
  )
$$;

create or replace function public.can_insert_parent_announcement_row_028(
  row_branch_id uuid,
  row_created_by_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_created_by_profile_id = auth.uid()
    and (
      public.is_hq_admin()
      or (
        public.current_user_role() = 'branch_supervisor'
        and row_branch_id is not null
        and public.is_branch_supervisor_for_branch(row_branch_id)
      )
    ),
    false
  )
$$;

create or replace function public.can_manage_parent_announcement_target_write_028(
  parent_announcement_uuid uuid,
  target_kind text,
  target_branch uuid,
  target_class uuid,
  target_student uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      public.is_hq_admin()
      and public.can_manage_parent_announcement(parent_announcement_uuid)
    )
    or (
      public.current_user_role() = 'branch_supervisor'
      and exists (
        select 1
        from public.parent_announcements pa
        where pa.id = parent_announcement_uuid
          and public.can_manage_parent_announcement(pa.id)
          and (
            (target_kind = 'branch' and public.is_branch_supervisor_for_branch(target_branch))
            or (
              target_kind = 'class'
              and exists (
                select 1
                from public.classes c
                where c.id = target_class
                  and public.is_branch_supervisor_for_branch(c.branch_id)
              )
            )
            or (
              target_kind = 'student'
              and exists (
                select 1
                from public.students s
                where s.id = target_student
                  and public.is_branch_supervisor_for_branch(s.branch_id)
              )
            )
          )
      )
    ),
    false
  )
$$;

comment on function public.can_manage_parent_announcement(uuid) is
  '028 draft helper. HQ manages all parent announcements; branch supervisor manages only own-branch scoped rows/targets.';
comment on function public.can_access_parent_announcement(uuid) is
  '028 draft helper. Parent access is published-only and target-scoped to linked child branch/class/student; student role blocked in MVP.';
comment on function public.can_access_parent_announcement_media(uuid) is
  '028 draft helper. Parent media access requires released_to_parent=true and parent announcement visibility; no internal attachment reuse.';

-- -----------------------------------------------------------------------------
-- 6) Enable RLS
-- -----------------------------------------------------------------------------
alter table public.parent_announcements enable row level security;
alter table public.parent_announcement_targets enable row level security;
alter table public.parent_announcement_read_receipts enable row level security;
alter table public.parent_announcement_media enable row level security;

-- -----------------------------------------------------------------------------
-- 7) parent_announcements policies
-- -----------------------------------------------------------------------------
drop policy if exists parent_announcements_select_028 on public.parent_announcements;
create policy parent_announcements_select_028
on public.parent_announcements
for select
using (
  public.can_access_parent_announcement(id)
);

drop policy if exists parent_announcements_insert_028 on public.parent_announcements;
create policy parent_announcements_insert_028
on public.parent_announcements
for insert
with check (
  public.can_insert_parent_announcement_row_028(branch_id, created_by_profile_id)
);

drop policy if exists parent_announcements_update_028 on public.parent_announcements;
create policy parent_announcements_update_028
on public.parent_announcements
for update
using (
  public.can_manage_parent_announcement(id)
)
with check (
  public.can_manage_parent_announcement(id)
  and (
    updated_by_profile_id is null
    or updated_by_profile_id = auth.uid()
  )
);

drop policy if exists parent_announcements_delete_028 on public.parent_announcements;
create policy parent_announcements_delete_028
on public.parent_announcements
for delete
using (
  public.can_manage_parent_announcement(id)
);

-- -----------------------------------------------------------------------------
-- 8) parent_announcement_targets policies
-- -----------------------------------------------------------------------------
drop policy if exists parent_announcement_targets_select_028 on public.parent_announcement_targets;
create policy parent_announcement_targets_select_028
on public.parent_announcement_targets
for select
using (
  public.can_access_parent_announcement(parent_announcement_id)
);

drop policy if exists parent_announcement_targets_insert_028 on public.parent_announcement_targets;
create policy parent_announcement_targets_insert_028
on public.parent_announcement_targets
for insert
with check (
  public.can_manage_parent_announcement_target_write_028(
    parent_announcement_id,
    target_type,
    branch_id,
    class_id,
    student_id
  )
);

drop policy if exists parent_announcement_targets_update_028 on public.parent_announcement_targets;
create policy parent_announcement_targets_update_028
on public.parent_announcement_targets
for update
using (
  public.can_manage_parent_announcement(parent_announcement_id)
)
with check (
  public.can_manage_parent_announcement_target_write_028(
    parent_announcement_id,
    target_type,
    branch_id,
    class_id,
    student_id
  )
);

drop policy if exists parent_announcement_targets_delete_028 on public.parent_announcement_targets;
create policy parent_announcement_targets_delete_028
on public.parent_announcement_targets
for delete
using (
  public.can_manage_parent_announcement(parent_announcement_id)
);

-- -----------------------------------------------------------------------------
-- 9) parent_announcement_read_receipts policies
-- -----------------------------------------------------------------------------
drop policy if exists parent_announcement_read_receipts_select_028 on public.parent_announcement_read_receipts;
create policy parent_announcement_read_receipts_select_028
on public.parent_announcement_read_receipts
for select
using (
  public.can_manage_parent_announcement(parent_announcement_id)
  or (
    public.current_user_role() = 'parent'
    and guardian_profile_id = auth.uid()
    and public.can_access_parent_announcement(parent_announcement_id)
  )
);

drop policy if exists parent_announcement_read_receipts_insert_028 on public.parent_announcement_read_receipts;
create policy parent_announcement_read_receipts_insert_028
on public.parent_announcement_read_receipts
for insert
with check (
  public.can_manage_parent_announcement(parent_announcement_id)
  or (
    public.current_user_role() = 'parent'
    and guardian_profile_id = auth.uid()
    and public.can_access_parent_announcement(parent_announcement_id)
  )
);

drop policy if exists parent_announcement_read_receipts_update_028 on public.parent_announcement_read_receipts;
create policy parent_announcement_read_receipts_update_028
on public.parent_announcement_read_receipts
for update
using (
  public.can_manage_parent_announcement(parent_announcement_id)
  or (
    public.current_user_role() = 'parent'
    and guardian_profile_id = auth.uid()
    and public.can_access_parent_announcement(parent_announcement_id)
  )
)
with check (
  public.can_manage_parent_announcement(parent_announcement_id)
  or (
    public.current_user_role() = 'parent'
    and guardian_profile_id = auth.uid()
    and public.can_access_parent_announcement(parent_announcement_id)
  )
);

drop policy if exists parent_announcement_read_receipts_delete_028 on public.parent_announcement_read_receipts;
create policy parent_announcement_read_receipts_delete_028
on public.parent_announcement_read_receipts
for delete
using (
  public.can_manage_parent_announcement(parent_announcement_id)
);

-- -----------------------------------------------------------------------------
-- 10) parent_announcement_media policies
-- -----------------------------------------------------------------------------
drop policy if exists parent_announcement_media_select_028 on public.parent_announcement_media;
create policy parent_announcement_media_select_028
on public.parent_announcement_media
for select
using (
  public.can_access_parent_announcement_media(id)
);

drop policy if exists parent_announcement_media_insert_028 on public.parent_announcement_media;
create policy parent_announcement_media_insert_028
on public.parent_announcement_media
for insert
with check (
  uploaded_by_profile_id = auth.uid()
  and public.can_manage_parent_announcement(parent_announcement_id)
);

drop policy if exists parent_announcement_media_update_028 on public.parent_announcement_media;
create policy parent_announcement_media_update_028
on public.parent_announcement_media
for update
using (
  public.can_manage_parent_announcement(parent_announcement_id)
)
with check (
  public.can_manage_parent_announcement(parent_announcement_id)
);

drop policy if exists parent_announcement_media_delete_028 on public.parent_announcement_media;
create policy parent_announcement_media_delete_028
on public.parent_announcement_media
for delete
using (
  public.can_manage_parent_announcement(parent_announcement_id)
);

-- -----------------------------------------------------------------------------
-- 11) Private storage bucket + storage policies (draft)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
select 'parent-announcements-media', 'parent-announcements-media', false
where not exists (
  select 1 from storage.buckets where id = 'parent-announcements-media'
);

drop policy if exists parent_announcements_media_storage_select_028 on storage.objects;
create policy parent_announcements_media_storage_select_028
on storage.objects
for select
using (
  bucket_id = 'parent-announcements-media'
  and exists (
    select 1
    from public.parent_announcement_media pam
    where pam.storage_path = storage.objects.name
      and public.can_access_parent_announcement_media(pam.id)
  )
);

drop policy if exists parent_announcements_media_storage_insert_028 on storage.objects;
create policy parent_announcements_media_storage_insert_028
on storage.objects
for insert
with check (
  bucket_id = 'parent-announcements-media'
  and exists (
    select 1
    from public.parent_announcement_media pam
    where pam.storage_path = storage.objects.name
      and pam.uploaded_by_profile_id = auth.uid()
      and public.can_manage_parent_announcement(pam.parent_announcement_id)
  )
);

drop policy if exists parent_announcements_media_storage_update_028 on storage.objects;
create policy parent_announcements_media_storage_update_028
on storage.objects
for update
using (
  bucket_id = 'parent-announcements-media'
  and exists (
    select 1
    from public.parent_announcement_media pam
    where pam.storage_path = storage.objects.name
      and public.can_manage_parent_announcement(pam.parent_announcement_id)
  )
)
with check (
  bucket_id = 'parent-announcements-media'
  and exists (
    select 1
    from public.parent_announcement_media pam
    where pam.storage_path = storage.objects.name
      and public.can_manage_parent_announcement(pam.parent_announcement_id)
  )
);

drop policy if exists parent_announcements_media_storage_delete_028 on storage.objects;
create policy parent_announcements_media_storage_delete_028
on storage.objects
for delete
using (
  bucket_id = 'parent-announcements-media'
  and exists (
    select 1
    from public.parent_announcement_media pam
    where pam.storage_path = storage.objects.name
      and public.can_manage_parent_announcement(pam.parent_announcement_id)
  )
);

-- End of 028 manual/dev-first SQL draft.

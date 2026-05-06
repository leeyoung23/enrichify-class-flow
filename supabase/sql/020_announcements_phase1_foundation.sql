-- 020_announcements_phase1_foundation.sql
-- Manual/dev-first SQL draft only for Phase 1 staff internal Announcements.
-- Do NOT auto-apply. Review and run manually in Supabase dev SQL editor only.
-- Use fake/dev data only (no real student/parent/teacher/school/curriculum/homework/payment/announcement data).
-- No destructive drops, no data deletes, no global RLS disable.
-- Attachments are explicitly out of scope for this patch (Phase 2+).

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Phase 1 tables (additive only)
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid null references public.branches(id),
  created_by_profile_id uuid not null references public.profiles(id),
  announcement_type text not null default 'request',
  title text not null,
  subtitle text null,
  body text null,
  priority text not null default 'normal',
  status text not null default 'draft',
  audience_type text not null default 'internal_staff',
  due_date date null,
  requires_response boolean not null default false,
  requires_upload boolean not null default false,
  popup_enabled boolean not null default false,
  popup_emoji text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null
);

create table if not exists public.announcement_targets (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  target_type text not null,
  branch_id uuid null references public.branches(id),
  target_profile_id uuid null references public.profiles(id),
  target_role text null,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_statuses (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  read_at timestamptz null,
  done_status text not null default 'pending',
  done_at timestamptz null,
  undone_reason text null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcement_statuses_announcement_profile_uniq unique (announcement_id, profile_id)
);

create table if not exists public.announcement_replies (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  body text not null,
  reply_type text not null default 'update',
  parent_reply_id uuid null references public.announcement_replies(id) on delete set null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2) Safe check constraints
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'announcements_announcement_type_check_020'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_announcement_type_check_020
      check (announcement_type in ('request', 'company_news', 'parent_event'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'announcements_priority_check_020'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_priority_check_020
      check (priority in ('low', 'normal', 'high', 'urgent'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'announcements_status_check_020'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_status_check_020
      check (status in ('draft', 'published', 'closed', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'announcements_audience_type_check_020'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_audience_type_check_020
      check (audience_type in ('internal_staff', 'parent_facing'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'announcement_targets_target_type_check_020'
      and conrelid = 'public.announcement_targets'::regclass
  ) then
    alter table public.announcement_targets
      add constraint announcement_targets_target_type_check_020
      check (target_type in ('branch', 'role', 'profile', 'class'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'announcement_statuses_done_status_check_020'
      and conrelid = 'public.announcement_statuses'::regclass
  ) then
    alter table public.announcement_statuses
      add constraint announcement_statuses_done_status_check_020
      check (done_status in ('pending', 'done', 'undone'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'announcement_replies_reply_type_check_020'
      and conrelid = 'public.announcement_replies'::regclass
  ) then
    alter table public.announcement_replies
      add constraint announcement_replies_reply_type_check_020
      check (reply_type in ('question', 'update', 'completion_note'));
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) Indexes
-- -----------------------------------------------------------------------------
create index if not exists announcements_branch_id_idx
  on public.announcements(branch_id);
create index if not exists announcements_created_by_profile_id_idx
  on public.announcements(created_by_profile_id);
create index if not exists announcements_type_status_idx
  on public.announcements(announcement_type, status);
create index if not exists announcements_audience_status_idx
  on public.announcements(audience_type, status);
create index if not exists announcements_due_date_idx
  on public.announcements(due_date);

create index if not exists announcement_targets_announcement_id_idx
  on public.announcement_targets(announcement_id);
create index if not exists announcement_targets_branch_id_idx
  on public.announcement_targets(branch_id);
create index if not exists announcement_targets_profile_id_idx
  on public.announcement_targets(target_profile_id);
create index if not exists announcement_targets_role_idx
  on public.announcement_targets(target_role);

create index if not exists announcement_statuses_announcement_id_idx
  on public.announcement_statuses(announcement_id);
create index if not exists announcement_statuses_profile_id_idx
  on public.announcement_statuses(profile_id);
create index if not exists announcement_statuses_done_status_idx
  on public.announcement_statuses(done_status);

create index if not exists announcement_replies_announcement_id_idx
  on public.announcement_replies(announcement_id);
create index if not exists announcement_replies_profile_id_idx
  on public.announcement_replies(profile_id);

-- -----------------------------------------------------------------------------
-- 4) updated_at trigger helpers (local to 020; no shared generic helper detected)
-- -----------------------------------------------------------------------------
create or replace function public.set_announcements_updated_at_020()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_announcements_updated_at_020 on public.announcements;
create trigger trg_set_announcements_updated_at_020
before update on public.announcements
for each row execute function public.set_announcements_updated_at_020();

create or replace function public.set_announcement_statuses_updated_at_020()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_announcement_statuses_updated_at_020 on public.announcement_statuses;
create trigger trg_set_announcement_statuses_updated_at_020
before update on public.announcement_statuses
for each row execute function public.set_announcement_statuses_updated_at_020();

-- -----------------------------------------------------------------------------
-- 5) Helper functions for RLS readability / recursion avoidance
-- -----------------------------------------------------------------------------
create or replace function public.announcement_branch_id(announcement_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.branch_id
  from public.announcements a
  where a.id = announcement_uuid
  limit 1
$$;

create or replace function public.is_announcement_targeted_to_profile(
  announcement_uuid uuid,
  profile_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.announcement_targets t
      left join public.profiles target_profile on target_profile.id = t.target_profile_id
      left join public.profiles requested_profile on requested_profile.id = profile_uuid
      where t.announcement_id = announcement_uuid
        and (
          (t.target_type = 'profile' and t.target_profile_id = profile_uuid)
          or (t.target_type = 'role' and requested_profile.role::text = t.target_role)
          or (t.target_type = 'branch' and requested_profile.branch_id = t.branch_id)
        )
    ),
    false
  )
$$;

create or replace function public.can_access_announcement(announcement_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.announcements a
      where a.id = announcement_uuid
        and a.audience_type = 'internal_staff'
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(a.branch_id)
          or (
            public.current_user_role() = 'teacher'
            and a.status = 'published'
            and public.is_announcement_targeted_to_profile(announcement_uuid, auth.uid())
          )
        )
    ),
    false
  )
$$;

create or replace function public.can_manage_announcement(announcement_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.announcements a
      where a.id = announcement_uuid
        and a.audience_type = 'internal_staff'
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(a.branch_id)
        )
    ),
    false
  )
$$;

create or replace function public.can_manage_announcement_target_write(
  announcement_uuid uuid,
  target_kind text,
  target_branch uuid,
  target_profile uuid
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
      and exists (
        select 1
        from public.announcements a
        where a.id = announcement_uuid
          and a.audience_type = 'internal_staff'
      )
    )
    or (
      public.current_user_role() = 'branch_supervisor'
      and exists (
        select 1
        from public.announcements a
        where a.id = announcement_uuid
          and a.audience_type = 'internal_staff'
          and public.is_branch_supervisor_for_branch(a.branch_id)
          and (
            (
              target_kind in ('branch', 'role', 'class')
              and target_branch = a.branch_id
            )
            or (
              target_kind = 'profile'
              and exists (
                select 1
                from public.profiles p
                where p.id = target_profile
                  and p.branch_id = a.branch_id
              )
            )
          )
      )
    ),
    false
  )
$$;

create or replace function public.can_select_announcement_row_020(
  row_audience_type text,
  row_status text,
  row_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_audience_type = 'internal_staff'
    and (
      public.is_hq_admin()
      or public.is_branch_supervisor_for_branch(row_branch_id)
      or (
        public.current_user_role() = 'teacher'
        and row_status = 'published'
      )
    ),
    false
  )
$$;

create or replace function public.can_insert_announcement_row_020(
  row_audience_type text,
  row_created_by_profile_id uuid,
  row_branch_id uuid,
  row_announcement_type text,
  row_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_audience_type = 'internal_staff'
    and row_created_by_profile_id = auth.uid()
    and row_announcement_type = 'request'
    and row_status = 'draft'
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

comment on function public.is_announcement_targeted_to_profile(uuid, uuid) is
  '020 draft helper. Class target_type is reserved for future schema extension; Phase 1 targeting checks profile/role/branch only.';
comment on function public.can_manage_announcement_target_write(uuid, text, uuid, uuid) is
  '020 review hardening: supervisors can only write target rows within their own announcement branch scope; HQ retains full internal-staff scope.';
comment on function public.can_select_announcement_row_020(text, text, uuid) is
  '020 create-path hardening: direct row predicate for select/returning checks; avoids self-lookup timing edge during INSERT RETURNING.';
comment on function public.can_insert_announcement_row_020(text, uuid, uuid, text, text) is
  '020 create-path hardening: insert checks for internal_staff request drafts by active HQ or own-branch supervisor only.';

-- -----------------------------------------------------------------------------
-- 6) Enable RLS
-- -----------------------------------------------------------------------------
alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_statuses enable row level security;
alter table public.announcement_replies enable row level security;

-- -----------------------------------------------------------------------------
-- 7) announcements policies
-- Phase 1 conservative: only internal_staff audience rows are writable/readable.
-- Teachers cannot create announcements in Phase 1.
-- -----------------------------------------------------------------------------
drop policy if exists announcements_select_020 on public.announcements;
create policy announcements_select_020
on public.announcements
for select
using (
  public.can_select_announcement_row_020(
    audience_type,
    status,
    branch_id
  )
);

drop policy if exists announcements_insert_020 on public.announcements;
create policy announcements_insert_020
on public.announcements
for insert
with check (
  public.can_insert_announcement_row_020(
    audience_type,
    created_by_profile_id,
    branch_id,
    announcement_type,
    status
  )
);

drop policy if exists announcements_update_020 on public.announcements;
create policy announcements_update_020
on public.announcements
for update
using (
  public.can_manage_announcement(id)
)
with check (
  audience_type = 'internal_staff'
  and (
    public.is_hq_admin()
    or (
      public.current_user_role() = 'branch_supervisor'
      and public.is_branch_supervisor_for_branch(branch_id)
    )
  )
);

drop policy if exists announcements_delete_020 on public.announcements;
create policy announcements_delete_020
on public.announcements
for delete
using (
  public.can_manage_announcement(id)
);

-- -----------------------------------------------------------------------------
-- 8) announcement_targets policies
-- Teachers can only read directly-personal target rows.
-- -----------------------------------------------------------------------------
drop policy if exists announcement_targets_select_020 on public.announcement_targets;
create policy announcement_targets_select_020
on public.announcement_targets
for select
using (
  public.can_manage_announcement(announcement_id)
  or (
    public.current_user_role() = 'teacher'
    and public.can_access_announcement(announcement_id)
    and target_type = 'profile'
    and target_profile_id = auth.uid()
  )
);

drop policy if exists announcement_targets_insert_020 on public.announcement_targets;
create policy announcement_targets_insert_020
on public.announcement_targets
for insert
with check (
  public.can_manage_announcement_target_write(
    announcement_id,
    target_type,
    branch_id,
    target_profile_id
  )
);

drop policy if exists announcement_targets_update_020 on public.announcement_targets;
create policy announcement_targets_update_020
on public.announcement_targets
for update
using (
  public.can_manage_announcement(announcement_id)
)
with check (
  public.can_manage_announcement_target_write(
    announcement_id,
    target_type,
    branch_id,
    target_profile_id
  )
);

drop policy if exists announcement_targets_delete_020 on public.announcement_targets;
create policy announcement_targets_delete_020
on public.announcement_targets
for delete
using (
  public.can_manage_announcement(announcement_id)
);

-- -----------------------------------------------------------------------------
-- 9) announcement_statuses policies
-- Teacher self-only updates are allowed for rows where the announcement is accessible.
-- -----------------------------------------------------------------------------
drop policy if exists announcement_statuses_select_020 on public.announcement_statuses;
create policy announcement_statuses_select_020
on public.announcement_statuses
for select
using (
  public.can_manage_announcement(announcement_id)
  or (
    profile_id = auth.uid()
    and public.can_access_announcement(announcement_id)
  )
);

drop policy if exists announcement_statuses_insert_020 on public.announcement_statuses;
create policy announcement_statuses_insert_020
on public.announcement_statuses
for insert
with check (
  (
    public.can_manage_announcement(announcement_id)
  )
  or (
    public.current_user_role() = 'teacher'
    and profile_id = auth.uid()
    and public.can_access_announcement(announcement_id)
  )
);

drop policy if exists announcement_statuses_update_020 on public.announcement_statuses;
create policy announcement_statuses_update_020
on public.announcement_statuses
for update
using (
  public.can_manage_announcement(announcement_id)
  or (
    public.current_user_role() = 'teacher'
    and profile_id = auth.uid()
    and public.can_access_announcement(announcement_id)
  )
)
with check (
  public.can_manage_announcement(announcement_id)
  or (
    public.current_user_role() = 'teacher'
    and profile_id = auth.uid()
    and public.can_access_announcement(announcement_id)
  )
);

drop policy if exists announcement_statuses_delete_020 on public.announcement_statuses;
create policy announcement_statuses_delete_020
on public.announcement_statuses
for delete
using (
  public.can_manage_announcement(announcement_id)
);

-- -----------------------------------------------------------------------------
-- 10) announcement_replies policies
-- Teachers can insert replies only as themselves.
-- -----------------------------------------------------------------------------
drop policy if exists announcement_replies_select_020 on public.announcement_replies;
create policy announcement_replies_select_020
on public.announcement_replies
for select
using (
  public.can_access_announcement(announcement_id)
);

drop policy if exists announcement_replies_insert_020 on public.announcement_replies;
create policy announcement_replies_insert_020
on public.announcement_replies
for insert
with check (
  profile_id = auth.uid()
  and public.can_access_announcement(announcement_id)
  and (
    public.is_hq_admin()
    or public.current_user_role() in ('branch_supervisor', 'teacher')
  )
);

drop policy if exists announcement_replies_update_020 on public.announcement_replies;
create policy announcement_replies_update_020
on public.announcement_replies
for update
using (
  public.can_manage_announcement(announcement_id)
)
with check (
  public.can_manage_announcement(announcement_id)
);

drop policy if exists announcement_replies_delete_020 on public.announcement_replies;
create policy announcement_replies_delete_020
on public.announcement_replies
for delete
using (
  public.can_manage_announcement(announcement_id)
);

-- End of 020 manual/dev-first SQL draft.

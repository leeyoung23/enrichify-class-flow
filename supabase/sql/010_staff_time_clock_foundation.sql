-- 010_staff_time_clock_foundation.sql
-- Manual/dev-first draft only. Review and apply manually in a safe dev project.
-- Do not auto-apply in production. Use fake/demo data only.
--
-- Scope:
-- - Add branch geofence columns (if missing)
-- - Add staff_time_entries foundation table
-- - Add optional staff_time_adjustment_requests table
-- - Add private storage bucket and draft storage policies for staff clock selfies
-- - Add draft helper functions + RLS policies
--
-- Non-goals:
-- - No runtime app changes
-- - No camera/location capture implementation
-- - No automatic migration execution in this patch

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Branch geofence columns (additive)
-- numeric is used for latitude/longitude in this draft for portability and
-- deterministic precision handling across SQL-only review stages.
-- ---------------------------------------------------------------------------
alter table public.branches
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists geofence_radius_meters integer not null default 150;

-- ---------------------------------------------------------------------------
-- 2) Staff time entries (evidence-based attendance)
-- status stays text in this draft for easier iterative policy/schema tuning.
-- Suggested values:
-- valid, outside_geofence, pending_review, approved_exception,
-- rejected_exception, missed_clock_out
-- ---------------------------------------------------------------------------
create table if not exists public.staff_time_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  clock_in_latitude numeric,
  clock_in_longitude numeric,
  clock_in_accuracy_meters numeric,
  clock_in_distance_meters numeric,
  clock_in_selfie_path text,
  clock_out_latitude numeric,
  clock_out_longitude numeric,
  clock_out_accuracy_meters numeric,
  clock_out_distance_meters numeric,
  clock_out_selfie_path text,
  status text not null default 'pending_review',
  exception_reason text,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_time_status_check check (
    status in (
      'valid',
      'outside_geofence',
      'pending_review',
      'approved_exception',
      'rejected_exception',
      'missed_clock_out'
    )
  )
);

create index if not exists idx_staff_time_entries_profile_id on public.staff_time_entries(profile_id);
create index if not exists idx_staff_time_entries_branch_id on public.staff_time_entries(branch_id);
create index if not exists idx_staff_time_entries_status on public.staff_time_entries(status);
create index if not exists idx_staff_time_entries_clock_in_at on public.staff_time_entries(clock_in_at);
create index if not exists idx_staff_time_entries_open_entries
  on public.staff_time_entries(profile_id)
  where clock_out_at is null;

-- Optional hardening: one open entry per staff profile.
create unique index if not exists uniq_staff_time_open_entry_per_profile
  on public.staff_time_entries(profile_id)
  where clock_out_at is null;

-- ---------------------------------------------------------------------------
-- 3) Optional adjustment requests table
-- ---------------------------------------------------------------------------
create table if not exists public.staff_time_adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  staff_time_entry_id uuid not null references public.staff_time_entries(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  requested_clock_in_at timestamptz,
  requested_clock_out_at timestamptz,
  status text not null default 'pending_review',
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_time_adjustment_status_check check (
    status in ('pending_review', 'approved_exception', 'rejected_exception')
  )
);

create index if not exists idx_staff_time_adjustments_entry_id on public.staff_time_adjustment_requests(staff_time_entry_id);
create index if not exists idx_staff_time_adjustments_profile_id on public.staff_time_adjustment_requests(profile_id);
create index if not exists idx_staff_time_adjustments_status on public.staff_time_adjustment_requests(status);

-- ---------------------------------------------------------------------------
-- 4) Helper functions for RLS readability (draft)
-- Dependencies:
-- - public.current_user_role()
-- - public.current_user_branch_id()
-- - public.is_hq_admin()
-- - public.is_branch_supervisor_for_branch(uuid)
-- ---------------------------------------------------------------------------
create or replace function public.can_review_staff_time_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(target_branch_id),
    false
  );
$$;

create or replace function public.is_staff_time_entry_owner(entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_time_entries ste
    where ste.id = entry_id
      and ste.profile_id = auth.uid()
  );
$$;

create or replace function public.staff_time_entry_branch(entry_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ste.branch_id
  from public.staff_time_entries ste
  where ste.id = entry_id
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 5) Trigger guardrails for staff self-update behavior
-- Staff can clock out on own open entry, but cannot rewrite core clock-in evidence
-- or reviewer decisions. HQ/branch supervisor review updates are allowed.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_staff_time_entry_update_rules()
returns trigger
language plpgsql
as $$
declare
  role_now public.app_role;
begin
  role_now := public.current_user_role();

  -- Keep updated_at current for all updates.
  new.updated_at := now();

  -- HQ/branch supervisor can review/update by policy scope.
  if role_now = 'hq_admin'
     or public.is_branch_supervisor_for_branch(new.branch_id) then
    return new;
  end if;

  -- Only owner can attempt staff self-update.
  if old.profile_id <> auth.uid() or new.profile_id <> old.profile_id then
    raise exception 'Only the owning staff profile may update this entry';
  end if;

  -- Staff cannot alter clock-in evidence once submitted.
  if new.clock_in_at is distinct from old.clock_in_at
     or new.clock_in_latitude is distinct from old.clock_in_latitude
     or new.clock_in_longitude is distinct from old.clock_in_longitude
     or new.clock_in_accuracy_meters is distinct from old.clock_in_accuracy_meters
     or new.clock_in_distance_meters is distinct from old.clock_in_distance_meters
     or new.clock_in_selfie_path is distinct from old.clock_in_selfie_path
     or new.branch_id is distinct from old.branch_id then
    raise exception 'Clock-in evidence fields are immutable for staff updates';
  end if;

  -- Staff cannot change review decision fields.
  if new.reviewed_by_profile_id is distinct from old.reviewed_by_profile_id
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Review fields cannot be changed by staff';
  end if;

  -- Staff should only close an open entry one time.
  if old.clock_out_at is not null and new.clock_out_at is distinct from old.clock_out_at then
    raise exception 'Clock-out is already recorded for this entry';
  end if;

  -- Staff may not set privileged statuses directly.
  if new.status in ('approved_exception', 'rejected_exception')
     and new.status is distinct from old.status then
    raise exception 'Staff cannot set review outcome statuses directly';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_staff_time_entry_update_rules on public.staff_time_entries;
create trigger trg_enforce_staff_time_entry_update_rules
before update on public.staff_time_entries
for each row execute function public.enforce_staff_time_entry_update_rules();

-- ---------------------------------------------------------------------------
-- 6) RLS for staff time tables
-- ---------------------------------------------------------------------------
alter table public.staff_time_entries enable row level security;
alter table public.staff_time_adjustment_requests enable row level security;

drop policy if exists staff_time_entries_select_scope on public.staff_time_entries;
create policy staff_time_entries_select_scope
on public.staff_time_entries
for select
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or profile_id = auth.uid()
);

drop policy if exists staff_time_entries_insert_own on public.staff_time_entries;
create policy staff_time_entries_insert_own
on public.staff_time_entries
for insert
with check (
  profile_id = auth.uid()
  and public.current_user_role() in ('teacher', 'branch_supervisor', 'hq_admin')
);

drop policy if exists staff_time_entries_update_review_scope on public.staff_time_entries;
create policy staff_time_entries_update_review_scope
on public.staff_time_entries
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
)
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

drop policy if exists staff_time_entries_update_own_open_entry on public.staff_time_entries;
create policy staff_time_entries_update_own_open_entry
on public.staff_time_entries
for update
using (
  profile_id = auth.uid()
  and clock_out_at is null
)
with check (
  profile_id = auth.uid()
);

-- Optional adjustment requests RLS
drop policy if exists staff_time_adjustments_select_scope on public.staff_time_adjustment_requests;
create policy staff_time_adjustments_select_scope
on public.staff_time_adjustment_requests
for select
using (
  profile_id = auth.uid()
  or public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.staff_time_entry_branch(staff_time_entry_id))
);

drop policy if exists staff_time_adjustments_insert_own on public.staff_time_adjustment_requests;
create policy staff_time_adjustments_insert_own
on public.staff_time_adjustment_requests
for insert
with check (
  profile_id = auth.uid()
  and public.is_staff_time_entry_owner(staff_time_entry_id)
);

drop policy if exists staff_time_adjustments_update_review_scope on public.staff_time_adjustment_requests;
create policy staff_time_adjustments_update_review_scope
on public.staff_time_adjustment_requests
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.staff_time_entry_branch(staff_time_entry_id))
)
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(public.staff_time_entry_branch(staff_time_entry_id))
);

-- ---------------------------------------------------------------------------
-- 7) Storage bucket + draft storage policies
-- Bucket is private. Do not expose public access.
-- Intended object key path:
--   {branch_id}/{profile_id}/{date}/{entry_id}-{clock_type}.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('staff-clock-selfies', 'staff-clock-selfies', false)
on conflict (id) do nothing;

drop policy if exists staff_clock_selfies_select on storage.objects;
create policy staff_clock_selfies_select
on storage.objects
for select
using (
  bucket_id = 'staff-clock-selfies'
  and exists (
    select 1
    from public.staff_time_entries ste
    where (ste.clock_in_selfie_path = storage.objects.name or ste.clock_out_selfie_path = storage.objects.name)
      and (
        ste.profile_id = auth.uid()
        or public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(ste.branch_id)
      )
  )
);

drop policy if exists staff_clock_selfies_insert on storage.objects;
create policy staff_clock_selfies_insert
on storage.objects
for insert
with check (
  bucket_id = 'staff-clock-selfies'
  and exists (
    select 1
    from public.staff_time_entries ste
    where (ste.clock_in_selfie_path = storage.objects.name or ste.clock_out_selfie_path = storage.objects.name)
      and ste.profile_id = auth.uid()
  )
);

-- Conservative draft choice: no storage delete/update policy for staff selfies yet.
-- Add only after lifecycle/retention and review-flow decisions are finalized.

-- ---------------------------------------------------------------------------
-- End of draft patch
-- Manual review required before any apply:
-- - role-by-role RLS verification
-- - storage path and upload order validation
-- - adjustment workflow decisions
-- ---------------------------------------------------------------------------

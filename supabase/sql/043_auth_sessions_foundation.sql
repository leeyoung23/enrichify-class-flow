-- 043_auth_sessions_foundation.sql
-- Phase 1E Step 1: server-backed auth session inventory foundation.
-- Conservative scope: no IP/user-agent/fingerprint/token storage.

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (
    role in ('hq_admin', 'branch_supervisor', 'teacher', 'parent', 'student')
  ),
  branch_id uuid null references public.branches(id),
  remember_me_enabled boolean not null default false,
  session_status text not null default 'active' check (
    session_status in ('active', 'signed_out', 'timed_out', 'revoked')
  ),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz null,
  signed_out_at timestamptz null,
  timed_out_at timestamptz null,
  revoked_at timestamptz null,
  revoked_by_profile_id uuid null references public.profiles(id),
  revoke_reason text null,
  safe_device_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.auth_sessions is
  '043: Auth session inventory foundation for future multi-device governance/revocation. Stores privacy-safe metadata only.';

create index if not exists auth_sessions_profile_id_idx_043
  on public.auth_sessions(profile_id);

create index if not exists auth_sessions_role_idx_043
  on public.auth_sessions(role);

create index if not exists auth_sessions_branch_id_idx_043
  on public.auth_sessions(branch_id);

create index if not exists auth_sessions_status_idx_043
  on public.auth_sessions(session_status);

create index if not exists auth_sessions_started_at_idx_043
  on public.auth_sessions(started_at desc);

create index if not exists auth_sessions_last_seen_at_idx_043
  on public.auth_sessions(last_seen_at desc nulls last);

create or replace function public.set_auth_sessions_updated_at_043()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_auth_sessions_updated_at_043 on public.auth_sessions;
create trigger trg_auth_sessions_updated_at_043
before update on public.auth_sessions
for each row execute function public.set_auth_sessions_updated_at_043();

create or replace function public.enforce_auth_sessions_safe_update_043()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Immutable ownership/session identity fields for every updater.
  if new.profile_id is distinct from old.profile_id
     or new.role is distinct from old.role
     or new.branch_id is distinct from old.branch_id
     or new.remember_me_enabled is distinct from old.remember_me_enabled
     or new.started_at is distinct from old.started_at
     or new.created_at is distinct from old.created_at then
    raise exception 'auth_sessions immutable fields cannot be changed';
  end if;

  -- Self updates are limited to heartbeat + non-revocation terminal states.
  if old.profile_id = auth.uid() then
    if new.revoked_at is distinct from old.revoked_at
       or new.revoked_by_profile_id is distinct from old.revoked_by_profile_id
       or new.revoke_reason is distinct from old.revoke_reason then
      raise exception 'Self session updates cannot set revocation fields';
    end if;

    if new.session_status not in ('active', 'signed_out', 'timed_out') then
      raise exception 'Self session updates cannot set revoked status';
    end if;

    return new;
  end if;

  -- HQ-only cross-account revoke mutation.
  if public.is_hq_admin() then
    if new.session_status <> 'revoked' then
      raise exception 'HQ cross-account updates must set session_status=revoked';
    end if;
    if new.revoked_at is null then
      raise exception 'HQ revoke update requires revoked_at';
    end if;
    if new.revoked_by_profile_id is distinct from auth.uid() then
      raise exception 'HQ revoke update requires revoked_by_profile_id=auth.uid()';
    end if;
    return new;
  end if;

  raise exception 'Session update denied by policy';
end;
$$;

drop trigger if exists trg_auth_sessions_safe_update_043 on public.auth_sessions;
create trigger trg_auth_sessions_safe_update_043
before update on public.auth_sessions
for each row execute function public.enforce_auth_sessions_safe_update_043();

alter table public.auth_sessions enable row level security;

drop policy if exists auth_sessions_insert_self_043 on public.auth_sessions;
create policy auth_sessions_insert_self_043
on public.auth_sessions
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and role = public.current_user_role()::text
  and (
    branch_id is null
    or branch_id = public.current_user_branch_id()
    or public.is_hq_admin()
  )
);

drop policy if exists auth_sessions_select_self_043 on public.auth_sessions;
create policy auth_sessions_select_self_043
on public.auth_sessions
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists auth_sessions_select_hq_043 on public.auth_sessions;
create policy auth_sessions_select_hq_043
on public.auth_sessions
for select
to authenticated
using (public.is_hq_admin());

drop policy if exists auth_sessions_update_self_043 on public.auth_sessions;
create policy auth_sessions_update_self_043
on public.auth_sessions
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists auth_sessions_update_hq_043 on public.auth_sessions;
create policy auth_sessions_update_hq_043
on public.auth_sessions
for update
to authenticated
using (public.is_hq_admin())
with check (public.is_hq_admin());

grant select, insert, update on public.auth_sessions to authenticated;

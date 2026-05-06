-- 040_parent_notification_preferences_foundation.sql
-- Parent communication consent/preferences foundation (Phase 1).
-- No email provider integration or sending in this migration.

create table if not exists public.parent_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid null references public.students(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'sms', 'push')),
  category text not null check (
    category in (
      'operational_service',
      'billing_invoice',
      'learning_report_homework',
      'attendance_safety',
      'parent_communication',
      'marketing_events',
      'media_photo'
    )
  ),
  enabled boolean not null default true,
  consent_status text not null default 'not_set' check (
    consent_status in ('not_set', 'consented', 'withdrawn', 'required_service')
  ),
  consent_source text null,
  policy_version text null,
  consented_at timestamptz null,
  withdrawn_at timestamptz null,
  updated_by_profile_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_notification_preferences_withdrawn_at_guard_040
    check (consent_status <> 'withdrawn' or withdrawn_at is not null)
);

comment on table public.parent_notification_preferences is
  '040: Parent notification consent/preferences by channel+category, optionally scoped to one student. Portal/in-app remains source of truth; no outbound email send logic here.';

create unique index if not exists parent_notification_preferences_unique_scope_040
  on public.parent_notification_preferences (
    parent_profile_id,
    coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel,
    category
  );

create index if not exists parent_notification_preferences_parent_idx_040
  on public.parent_notification_preferences(parent_profile_id);

create index if not exists parent_notification_preferences_student_idx_040
  on public.parent_notification_preferences(student_id);

create index if not exists parent_notification_preferences_channel_category_idx_040
  on public.parent_notification_preferences(channel, category);

create index if not exists parent_notification_preferences_enabled_status_idx_040
  on public.parent_notification_preferences(enabled, consent_status);

create or replace function public.set_parent_notification_preferences_updated_at_040()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_parent_notification_preferences_updated_at_040 on public.parent_notification_preferences;
create trigger trg_parent_notification_preferences_updated_at_040
before update on public.parent_notification_preferences
for each row execute function public.set_parent_notification_preferences_updated_at_040();

-- Parent self-update guard: parent must not mutate ownership/scope keys.
create or replace function public.enforce_parent_notification_preferences_safe_update_040()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'parent'
     and old.parent_profile_id = auth.uid() then
    if new.parent_profile_id is distinct from old.parent_profile_id
       or new.student_id is distinct from old.student_id
       or new.channel is distinct from old.channel
       or new.category is distinct from old.category
       or new.created_at is distinct from old.created_at then
      raise exception 'Parent updates are restricted to consent preference values only';
    end if;

    if new.updated_by_profile_id is not null and new.updated_by_profile_id <> auth.uid() then
      raise exception 'updated_by_profile_id must match current parent profile when provided';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_parent_notification_preferences_safe_update_040 on public.parent_notification_preferences;
create trigger trg_parent_notification_preferences_safe_update_040
before update on public.parent_notification_preferences
for each row execute function public.enforce_parent_notification_preferences_safe_update_040();

alter table public.parent_notification_preferences enable row level security;

-- Parent self read/insert/update only.
drop policy if exists parent_notification_preferences_parent_select_040 on public.parent_notification_preferences;
create policy parent_notification_preferences_parent_select_040
on public.parent_notification_preferences
for select
to authenticated
using (parent_profile_id = auth.uid());

drop policy if exists parent_notification_preferences_parent_insert_040 on public.parent_notification_preferences;
create policy parent_notification_preferences_parent_insert_040
on public.parent_notification_preferences
for insert
to authenticated
with check (
  public.current_user_role() = 'parent'
  and parent_profile_id = auth.uid()
  and (
    student_id is null
    or public.is_guardian_for_student(student_id)
  )
  and (updated_by_profile_id is null or updated_by_profile_id = auth.uid())
);

drop policy if exists parent_notification_preferences_parent_update_040 on public.parent_notification_preferences;
create policy parent_notification_preferences_parent_update_040
on public.parent_notification_preferences
for update
to authenticated
using (
  public.current_user_role() = 'parent'
  and parent_profile_id = auth.uid()
)
with check (
  public.current_user_role() = 'parent'
  and parent_profile_id = auth.uid()
  and (
    student_id is null
    or public.is_guardian_for_student(student_id)
  )
  and (updated_by_profile_id is null or updated_by_profile_id = auth.uid())
);

-- HQ full read/write; no delete policy in v1 (withdraw/disable instead).
drop policy if exists parent_notification_preferences_hq_select_040 on public.parent_notification_preferences;
create policy parent_notification_preferences_hq_select_040
on public.parent_notification_preferences
for select
to authenticated
using (public.is_hq_admin());

drop policy if exists parent_notification_preferences_hq_insert_040 on public.parent_notification_preferences;
create policy parent_notification_preferences_hq_insert_040
on public.parent_notification_preferences
for insert
to authenticated
with check (public.is_hq_admin());

drop policy if exists parent_notification_preferences_hq_update_040 on public.parent_notification_preferences;
create policy parent_notification_preferences_hq_update_040
on public.parent_notification_preferences
for update
to authenticated
using (public.is_hq_admin())
with check (public.is_hq_admin());

-- Branch supervisor read-only for parents linked to students in supervised branch.
drop policy if exists parent_notification_preferences_supervisor_select_040 on public.parent_notification_preferences;
create policy parent_notification_preferences_supervisor_select_040
on public.parent_notification_preferences
for select
to authenticated
using (
  public.current_user_role() = 'branch_supervisor'
  and exists (
    select 1
    from public.guardians g
    join public.guardian_student_links gsl on gsl.guardian_id = g.id
    join public.students s on s.id = gsl.student_id
    where g.profile_id = parent_notification_preferences.parent_profile_id
      and (
        (parent_notification_preferences.student_id is not null and s.id = parent_notification_preferences.student_id)
        or (parent_notification_preferences.student_id is null)
      )
      and public.is_branch_supervisor_for_branch(s.branch_id)
  )
);

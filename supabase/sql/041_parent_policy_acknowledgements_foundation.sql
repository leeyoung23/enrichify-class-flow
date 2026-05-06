-- 041_parent_policy_acknowledgements_foundation.sql
-- Parent first-login policy acknowledgement foundation (append-only by policy version).
-- No email provider integration or sending in this migration.

create table if not exists public.parent_policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  parent_profile_id uuid not null references public.profiles(id) on delete cascade,
  policy_key text not null check (
    policy_key in (
      'parent_portal_terms_privacy',
      'parent_communication_policy',
      'media_photo_policy',
      'email_sms_policy',
      'marketing_events_policy'
    )
  ),
  policy_version text not null,
  acknowledgement_source text not null default 'parent_portal' check (
    acknowledgement_source in (
      'parent_portal_first_login',
      'parent_portal_settings',
      'hq_admin_recorded',
      'migration_seed'
    )
  ),
  acknowledged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.parent_policy_acknowledgements is
  '041: Parent policy acknowledgement records by parent + policy key + version. Append-only per policy version; no outbound email/SMS/push behavior.';

create unique index if not exists parent_policy_acknowledgements_unique_parent_policy_version_041
  on public.parent_policy_acknowledgements(parent_profile_id, policy_key, policy_version);

create index if not exists parent_policy_acknowledgements_parent_idx_041
  on public.parent_policy_acknowledgements(parent_profile_id);

create index if not exists parent_policy_acknowledgements_policy_key_idx_041
  on public.parent_policy_acknowledgements(policy_key);

create index if not exists parent_policy_acknowledgements_policy_version_idx_041
  on public.parent_policy_acknowledgements(policy_version);

create index if not exists parent_policy_acknowledgements_acknowledged_at_idx_041
  on public.parent_policy_acknowledgements(acknowledged_at desc);

alter table public.parent_policy_acknowledgements enable row level security;

-- Parent self read/insert only.
drop policy if exists parent_policy_acknowledgements_parent_select_041 on public.parent_policy_acknowledgements;
create policy parent_policy_acknowledgements_parent_select_041
on public.parent_policy_acknowledgements
for select
to authenticated
using (
  public.current_user_role() = 'parent'
  and parent_profile_id = auth.uid()
);

drop policy if exists parent_policy_acknowledgements_parent_insert_041 on public.parent_policy_acknowledgements;
create policy parent_policy_acknowledgements_parent_insert_041
on public.parent_policy_acknowledgements
for insert
to authenticated
with check (
  public.current_user_role() = 'parent'
  and parent_profile_id = auth.uid()
);

-- HQ insert/select.
drop policy if exists parent_policy_acknowledgements_hq_select_041 on public.parent_policy_acknowledgements;
create policy parent_policy_acknowledgements_hq_select_041
on public.parent_policy_acknowledgements
for select
to authenticated
using (public.is_hq_admin());

drop policy if exists parent_policy_acknowledgements_hq_insert_041 on public.parent_policy_acknowledgements;
create policy parent_policy_acknowledgements_hq_insert_041
on public.parent_policy_acknowledgements
for insert
to authenticated
with check (public.is_hq_admin());

-- Branch supervisor read-only for parents linked to students in supervised branch.
drop policy if exists parent_policy_acknowledgements_supervisor_select_041 on public.parent_policy_acknowledgements;
create policy parent_policy_acknowledgements_supervisor_select_041
on public.parent_policy_acknowledgements
for select
to authenticated
using (
  public.current_user_role() = 'branch_supervisor'
  and exists (
    select 1
    from public.guardians g
    join public.guardian_student_links gsl on gsl.guardian_id = g.id
    join public.students s on s.id = gsl.student_id
    where g.profile_id = parent_policy_acknowledgements.parent_profile_id
      and public.is_branch_supervisor_for_branch(s.branch_id)
  )
);

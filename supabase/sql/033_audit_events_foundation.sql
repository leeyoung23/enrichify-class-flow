-- 033_audit_events_foundation.sql
-- Phase 1 foundation for audit logging.
-- Additive migration only. No destructive drops.
-- Uses authenticated JWT/RLS only; no service-role assumptions.

create extension if not exists pgcrypto;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid null references public.profiles(id),
  actor_role text null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid null,
  branch_id uuid null references public.branches(id),
  class_id uuid null references public.classes(id),
  student_id uuid null references public.students(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_events is
  'Phase 1 append-only audit event foundation. Stores safe summaries only; never secrets/tokens/provider bodies.';

create index if not exists audit_events_created_at_idx_033
  on public.audit_events(created_at desc);

create index if not exists audit_events_actor_profile_id_idx_033
  on public.audit_events(actor_profile_id);

create index if not exists audit_events_action_type_idx_033
  on public.audit_events(action_type);

create index if not exists audit_events_entity_idx_033
  on public.audit_events(entity_type, entity_id);

create index if not exists audit_events_branch_id_idx_033
  on public.audit_events(branch_id);

create index if not exists audit_events_student_id_idx_033
  on public.audit_events(student_id);

alter table public.audit_events enable row level security;

drop policy if exists audit_events_insert_authenticated_033 on public.audit_events;
create policy audit_events_insert_authenticated_033
on public.audit_events
for insert
to authenticated
with check (
  actor_profile_id = auth.uid()
  and (
    actor_role is null
    or actor_role = public.current_user_role()::text
  )
);

drop policy if exists audit_events_select_hq_all_033 on public.audit_events;
create policy audit_events_select_hq_all_033
on public.audit_events
for select
to authenticated
using (public.is_hq_admin());

drop policy if exists audit_events_select_supervisor_branch_033 on public.audit_events;
create policy audit_events_select_supervisor_branch_033
on public.audit_events
for select
to authenticated
using (
  public.current_user_role() = 'branch_supervisor'
  and branch_id is not null
  and public.is_branch_supervisor_for_branch(branch_id)
);

drop policy if exists audit_events_select_teacher_own_033 on public.audit_events;
create policy audit_events_select_teacher_own_033
on public.audit_events
for select
to authenticated
using (
  public.current_user_role() = 'teacher'
  and actor_profile_id = auth.uid()
);

drop policy if exists audit_events_delete_hq_033 on public.audit_events;
create policy audit_events_delete_hq_033
on public.audit_events
for delete
to authenticated
using (public.is_hq_admin());

-- 038_notification_templates_foundation.sql
-- HQ-owned default wording for automated notifications (Phase 1: in-app governance only).
-- No email sending, no webhook, no widening of recipient or trigger rules.
--
-- Applied manually (Supabase SQL Editor or CLI) after 034–037.

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  event_type text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email')),
  title_template text not null,
  body_template text not null,
  allowed_variables jsonb not null default '[]'::jsonb,
  branch_id uuid null references public.branches(id) on delete cascade,
  is_active boolean not null default true,
  created_by_profile_id uuid null references public.profiles(id) on delete set null,
  updated_by_profile_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_templates_allowed_variables_is_array_038
    check (jsonb_typeof(allowed_variables) = 'array')
);

create unique index if not exists notification_templates_template_key_key_038
  on public.notification_templates (template_key);

create index if not exists notification_templates_event_channel_active_idx_038
  on public.notification_templates (event_type, channel, is_active);

create index if not exists notification_templates_branch_idx_038
  on public.notification_templates (branch_id);

comment on table public.notification_templates is
  '038: HQ-managed message templates for automated notifications. branch_id null = global default; non-null reserved for optional future branch overrides. Does not gate when notifications fire.';

comment on column public.notification_templates.allowed_variables is
  'JSON array of placeholder names (e.g. ["arrivalKind"]) permitted for substitution; renderer must never invent keys from template text alone.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_notification_templates_updated_at_038()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_notification_templates_updated_at_038 on public.notification_templates;
create trigger trg_notification_templates_updated_at_038
  before update on public.notification_templates
  for each row execute function public.set_notification_templates_updated_at_038();

-- ---------------------------------------------------------------------------
-- RLS: HQ full staff write; supervisors read active branch/global; teachers read
-- active global + own-branch rows for in_app (needed when teacher JWT creates notifications).
-- Parents/students/anon: no policies (deny).
-- ---------------------------------------------------------------------------
alter table public.notification_templates enable row level security;

drop policy if exists notification_templates_select_hq_038 on public.notification_templates;
create policy notification_templates_select_hq_038
on public.notification_templates
for select
to authenticated
using (public.is_hq_admin());

drop policy if exists notification_templates_select_supervisor_038 on public.notification_templates;
create policy notification_templates_select_supervisor_038
on public.notification_templates
for select
to authenticated
using (
  public.current_user_role() = 'branch_supervisor'
  and is_active = true
  and (
    branch_id is null
    or (
      branch_id is not null
      and public.is_branch_supervisor_for_branch(branch_id)
    )
  )
);

drop policy if exists notification_templates_select_teacher_038 on public.notification_templates;
create policy notification_templates_select_teacher_038
on public.notification_templates
for select
to authenticated
using (
  public.current_user_role() = 'teacher'
  and is_active = true
  and channel = 'in_app'
  and (
    branch_id is null
    or (
      branch_id is not null
      and public.current_user_branch_id() is not null
      and branch_id = public.current_user_branch_id()
    )
  )
);

drop policy if exists notification_templates_insert_hq_038 on public.notification_templates;
create policy notification_templates_insert_hq_038
on public.notification_templates
for insert
to authenticated
with check (public.is_hq_admin());

drop policy if exists notification_templates_update_hq_038 on public.notification_templates;
create policy notification_templates_update_hq_038
on public.notification_templates
for update
to authenticated
using (public.is_hq_admin())
with check (public.is_hq_admin());

drop policy if exists notification_templates_delete_hq_038 on public.notification_templates;
create policy notification_templates_delete_hq_038
on public.notification_templates
for delete
to authenticated
using (public.is_hq_admin());

-- ---------------------------------------------------------------------------
-- Seed: global (branch_id null) defaults — same safe copy as current hardcoded strings.
-- ---------------------------------------------------------------------------
insert into public.notification_templates (
  template_key,
  event_type,
  channel,
  title_template,
  body_template,
  allowed_variables,
  branch_id,
  is_active
) values
  (
    'default.ai_parent_report.released.in_app',
    'ai_parent_report.released',
    'in_app',
    'New progress report available',
    'A new progress report has been released for your child.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.homework_feedback.released_to_parent.in_app',
    'homework_feedback.released_to_parent',
    'in_app',
    'Homework feedback is ready',
    'Your child''s teacher has shared new homework feedback.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.homework_file.released_to_parent.in_app',
    'homework_file.released_to_parent',
    'in_app',
    'Homework feedback is ready',
    'Your child''s teacher has shared new homework feedback.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.student_attendance.arrived.in_app',
    'student_attendance.arrived',
    'in_app',
    'Your child has arrived',
    'Your child has been marked present for class.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.parent_comment.released.in_app',
    'parent_comment.released',
    'in_app',
    'New update from your child''s class',
    'Your child''s teacher has shared a new class update.',
    '[]'::jsonb,
    null,
    true
  ),
  (
    'default.weekly_progress_report.released.in_app',
    'weekly_progress_report.released',
    'in_app',
    'New update from your child''s class',
    'Your child''s teacher has shared a new class update.',
    '[]'::jsonb,
    null,
    true
  )
on conflict (template_key) do nothing;

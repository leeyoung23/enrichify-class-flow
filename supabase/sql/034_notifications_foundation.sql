-- 034_notifications_foundation.sql
-- Phase 1 notification persistence foundation only.
-- No email/SMS/push sending implementation in this migration.
-- Additive migration: no destructive drops.

create extension if not exists pgcrypto;

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid null,
  branch_id uuid null references public.branches(id),
  class_id uuid null references public.classes(id),
  student_id uuid null references public.students(id),
  created_by_profile_id uuid null references public.profiles(id),
  status text not null default 'pending' check (status in ('draft', 'pending', 'processed', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.notification_events(id) on delete set null,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text null,
  branch_id uuid null references public.branches(id),
  class_id uuid null references public.classes(id),
  student_id uuid null references public.students(id),
  channel text not null default 'in_app' check (channel in ('in_app')),
  title text not null,
  body text null,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'read', 'archived', 'suppressed', 'failed')),
  read_at timestamptz null,
  created_by_profile_id uuid null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'sms', 'push')),
  status text not null check (status in ('queued', 'sent', 'failed', 'suppressed')),
  provider_message_id text null,
  error_code text null,
  attempt_number int not null default 1 check (attempt_number > 0),
  created_at timestamptz not null default now()
);

create index if not exists notification_events_created_at_idx_034
  on public.notification_events(created_at desc);
create index if not exists notification_events_branch_idx_034
  on public.notification_events(branch_id);
create index if not exists notification_events_student_idx_034
  on public.notification_events(student_id);
create index if not exists notification_events_type_idx_034
  on public.notification_events(event_type);

create index if not exists notifications_recipient_idx_034
  on public.notifications(recipient_profile_id, created_at desc);
create index if not exists notifications_event_idx_034
  on public.notifications(event_id);
create index if not exists notifications_branch_idx_034
  on public.notifications(branch_id);
create index if not exists notifications_status_idx_034
  on public.notifications(status);

create index if not exists notification_delivery_logs_notification_idx_034
  on public.notification_delivery_logs(notification_id, created_at desc);

alter table public.notification_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_delivery_logs enable row level security;

drop policy if exists notification_events_insert_staff_034 on public.notification_events;
create policy notification_events_insert_staff_034
on public.notification_events
for insert
to authenticated
with check (
  created_by_profile_id = auth.uid()
  and public.current_user_role() in ('hq_admin', 'branch_supervisor', 'teacher')
  and (
    public.is_hq_admin()
    or (
      public.current_user_role() = 'branch_supervisor'
      and branch_id is not null
      and public.is_branch_supervisor_for_branch(branch_id)
    )
    or (
      public.current_user_role() = 'teacher'
      and class_id is not null
      and public.is_teacher_for_class(class_id)
    )
  )
);

drop policy if exists notification_events_select_hq_034 on public.notification_events;
create policy notification_events_select_hq_034
on public.notification_events
for select
to authenticated
using (public.is_hq_admin());

drop policy if exists notification_events_select_supervisor_branch_034 on public.notification_events;
create policy notification_events_select_supervisor_branch_034
on public.notification_events
for select
to authenticated
using (
  public.current_user_role() = 'branch_supervisor'
  and branch_id is not null
  and public.is_branch_supervisor_for_branch(branch_id)
);

drop policy if exists notification_events_select_creator_034 on public.notification_events;
create policy notification_events_select_creator_034
on public.notification_events
for select
to authenticated
using (created_by_profile_id = auth.uid());

drop policy if exists notifications_insert_staff_034 on public.notifications;
create policy notifications_insert_staff_034
on public.notifications
for insert
to authenticated
with check (
  created_by_profile_id = auth.uid()
  and public.current_user_role() in ('hq_admin', 'branch_supervisor', 'teacher')
  and channel = 'in_app'
  and (
    public.is_hq_admin()
    or (
      public.current_user_role() = 'branch_supervisor'
      and branch_id is not null
      and public.is_branch_supervisor_for_branch(branch_id)
    )
    or (
      public.current_user_role() = 'teacher'
      and class_id is not null
      and public.is_teacher_for_class(class_id)
    )
  )
);

drop policy if exists notifications_select_recipient_034 on public.notifications;
create policy notifications_select_recipient_034
on public.notifications
for select
to authenticated
using (recipient_profile_id = auth.uid());

drop policy if exists notifications_select_hq_034 on public.notifications;
create policy notifications_select_hq_034
on public.notifications
for select
to authenticated
using (public.is_hq_admin());

drop policy if exists notifications_update_recipient_034 on public.notifications;
create policy notifications_update_recipient_034
on public.notifications
for update
to authenticated
using (recipient_profile_id = auth.uid())
with check (recipient_profile_id = auth.uid());

drop policy if exists notification_delivery_logs_insert_hq_034 on public.notification_delivery_logs;
create policy notification_delivery_logs_insert_hq_034
on public.notification_delivery_logs
for insert
to authenticated
with check (public.is_hq_admin());

drop policy if exists notification_delivery_logs_select_hq_034 on public.notification_delivery_logs;
create policy notification_delivery_logs_select_hq_034
on public.notification_delivery_logs
for select
to authenticated
using (public.is_hq_admin());

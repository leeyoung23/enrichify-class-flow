-- 044_notifications_parent_action_targets_rpc.sql
-- Parent-safe notification action-target helper.
-- Returns only notifications where recipient_profile_id = auth.uid() and channel = in_app.
-- Includes minimal event target fields (event_type/entity_type/entity_id) for exact UI routing.
-- No delivery logs, no raw event metadata, no unrelated rows.

create or replace function public.get_my_in_app_notifications_with_action_targets_044(
  p_status text default null,
  p_unread_only boolean default false,
  p_limit int default 50
)
returns table (
  id uuid,
  event_id uuid,
  recipient_profile_id uuid,
  recipient_role text,
  branch_id uuid,
  class_id uuid,
  student_id uuid,
  channel text,
  title text,
  body text,
  status text,
  read_at timestamptz,
  created_by_profile_id uuid,
  created_at timestamptz,
  event_type text,
  entity_type text,
  entity_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_status text := nullif(trim(coalesce(p_status, '')), '');
begin
  if v_uid is null then
    return;
  end if;

  if v_status is not null and v_status not in ('pending', 'delivered', 'read', 'archived', 'suppressed', 'failed') then
    raise exception 'status is invalid';
  end if;

  return query
  select
    n.id,
    n.event_id,
    n.recipient_profile_id,
    n.recipient_role,
    n.branch_id,
    n.class_id,
    n.student_id,
    n.channel,
    n.title,
    n.body,
    n.status,
    n.read_at,
    n.created_by_profile_id,
    n.created_at,
    ne.event_type,
    ne.entity_type,
    ne.entity_id
  from public.notifications n
  left join public.notification_events ne on ne.id = n.event_id
  where n.recipient_profile_id = v_uid
    and n.channel = 'in_app'
    and (v_status is null or n.status = v_status)
    and (not coalesce(p_unread_only, false) or n.read_at is null)
  order by n.created_at desc
  limit v_limit;
end;
$$;

comment on function public.get_my_in_app_notifications_with_action_targets_044(text, boolean, int) is
  '044: parent-safe in-app notifications with minimal event action target fields for exact UI routing. Returns only auth.uid() recipient rows.';

grant execute on function public.get_my_in_app_notifications_with_action_targets_044(text, boolean, int) to authenticated;


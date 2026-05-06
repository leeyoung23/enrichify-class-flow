-- 025_fix_announcements_attachments_select_returning_rls.sql
-- DEV-ONLY / MANUAL REVIEW-FIRST SQL PATCH.
-- Purpose: fix announcement_attachments SELECT policy for INSERT ... RETURNING
-- by switching to row-predicate select checks (no self-row lookup helper dependency).
-- Do NOT auto-apply. Review and run manually in Supabase DEV SQL editor only.
-- No production apply in this draft.
-- No destructive table drops, no data deletes, no global RLS disable.
-- Parent/student restrictions remain unchanged. parent_facing_media remains blocked.

create or replace function public.can_select_announcement_attachment_row_025(
  row_announcement_id uuid,
  row_file_role text,
  row_released_to_parent boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_file_role <> 'parent_facing_media'
    and row_released_to_parent = false
    and exists (
      select 1
      from public.announcements a
      where a.id = row_announcement_id
        and a.audience_type = 'internal_staff'
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(a.branch_id)
          or (
            public.current_user_role() = 'teacher'
            and public.can_access_announcement(a.id)
          )
        )
    ),
    false
  )
$$;

comment on function public.can_select_announcement_attachment_row_025(uuid, text, boolean) is
  '025 fix: row-predicate select helper for announcement_attachments to support INSERT RETURNING without self-row lookup recursion/timing edge.';

drop policy if exists announcement_attachments_select_023 on public.announcement_attachments;
create policy announcement_attachments_select_023
on public.announcement_attachments
for select
using (
  public.can_select_announcement_attachment_row_025(
    announcement_id,
    file_role,
    released_to_parent
  )
);

-- Reminder: manual DEV apply only, then rerun:
-- npm run test:supabase:announcements:attachments
select 'Reminder: manual DEV apply of 025 is required before INSERT RETURNING select-path checks can reflect updated policy.' as next_step;

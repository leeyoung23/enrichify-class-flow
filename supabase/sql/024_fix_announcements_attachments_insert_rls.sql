-- 024_fix_announcements_attachments_insert_rls.sql
-- DEV-ONLY / MANUAL REVIEW-FIRST SQL PATCH.
-- Purpose: harden and normalize insert-safe row-predicate checks for
-- announcement_attachments metadata insert paths.
-- Do NOT auto-apply. Review and run manually in Supabase DEV SQL editor only.
-- No production apply in this draft.
-- No destructive table drops, no data deletes, no global RLS disable.
-- Parent/student restrictions remain unchanged. parent_facing_media stays blocked.

create or replace function public.can_insert_manage_announcement_attachment_row_024(
  row_announcement_id uuid,
  row_uploaded_by_profile_id uuid,
  row_file_role text,
  row_released_to_parent boolean,
  row_released_at timestamptz,
  row_released_by_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_uploaded_by_profile_id = auth.uid()
    and row_file_role in ('hq_attachment', 'supervisor_attachment', 'response_upload')
    and row_file_role <> 'parent_facing_media'
    and row_released_to_parent = false
    and row_released_at is null
    and row_released_by_profile_id is null
    and exists (
      select 1
      from public.announcements a
      where a.id = row_announcement_id
        and a.audience_type = 'internal_staff'
        and (
          public.is_hq_admin()
          or public.is_branch_supervisor_for_branch(a.branch_id)
        )
        and (
          public.is_hq_admin()
          or public.current_user_role() = 'branch_supervisor'
        )
    ),
    false
  )
$$;

create or replace function public.can_insert_teacher_announcement_attachment_row_024(
  row_announcement_id uuid,
  row_uploaded_by_profile_id uuid,
  row_file_role text,
  row_released_to_parent boolean,
  row_released_at timestamptz,
  row_released_by_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_uploaded_by_profile_id = auth.uid()
    and row_file_role = 'response_upload'
    and row_file_role <> 'parent_facing_media'
    and row_released_to_parent = false
    and row_released_at is null
    and row_released_by_profile_id is null
    and public.current_user_role() = 'teacher'
    and exists (
      select 1
      from public.announcements a
      where a.id = row_announcement_id
        and a.audience_type = 'internal_staff'
        and public.can_access_announcement(a.id)
    ),
    false
  )
$$;

comment on function public.can_insert_manage_announcement_attachment_row_024(uuid, uuid, text, boolean, timestamptz, uuid) is
  '024 fix: insert-safe row predicate for HQ/supervisor internal attachment metadata inserts. Avoids insert-time self-row dependency.';
comment on function public.can_insert_teacher_announcement_attachment_row_024(uuid, uuid, text, boolean, timestamptz, uuid) is
  '024 fix: insert-safe row predicate for teacher response_upload metadata inserts. Parent/student blocked. parent_facing_media blocked.';

drop policy if exists announcement_attachments_insert_manage_023 on public.announcement_attachments;
create policy announcement_attachments_insert_manage_023
on public.announcement_attachments
for insert
with check (
  public.can_insert_manage_announcement_attachment_row_024(
    announcement_id,
    uploaded_by_profile_id,
    file_role,
    released_to_parent,
    released_at,
    released_by_profile_id
  )
);

drop policy if exists announcement_attachments_insert_teacher_023 on public.announcement_attachments;
create policy announcement_attachments_insert_teacher_023
on public.announcement_attachments
for insert
with check (
  public.can_insert_teacher_announcement_attachment_row_024(
    announcement_id,
    uploaded_by_profile_id,
    file_role,
    released_to_parent,
    released_at,
    released_by_profile_id
  )
);

-- Reminder: manual DEV apply only, then rerun:
-- npm run test:supabase:announcements:attachments
select 'Reminder: manual DEV apply of 024 is required before attachment upload CHECKs can reflect updated insert predicates.' as next_step;

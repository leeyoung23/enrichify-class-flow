-- 029_fix_parent_announcements_insert_rls.sql
-- Manual/dev-first patch draft only. Review-first. Do NOT auto-apply.
-- Intended environment: Supabase DEV SQL editor manual run only.
-- No production apply assumption.
-- Fake/dev data only.
--
-- Purpose:
-- - Address parent_announcements create-path RLS CHECKs observed in service smoke.
-- - Keep strict role boundaries:
--   - HQ/admin: draft insert allowed globally
--   - branch supervisor: draft insert allowed for own branch only
--   - teacher/parent/student: insert blocked
-- - Preserve separate parent-facing model and existing supervisor mixed-target safety.
--
-- Non-goals:
-- - No destructive drops/deletes
-- - No global RLS disable
-- - No parent/student access widening
-- - No changes to UI/runtime/service behavior in this patch

create or replace function public.can_insert_parent_announcement_row_029(
  row_branch_id uuid,
  row_class_id uuid,
  row_status text,
  row_created_by_profile_id uuid,
  row_announcement_type text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_created_by_profile_id = auth.uid()
    and row_status = 'draft'
    and row_announcement_type in (
      'event',
      'activity',
      'centre_notice',
      'holiday_closure',
      'reminder',
      'celebration',
      'programme_update',
      'parent_workshop',
      'graduation_concert'
    )
    and (
      (
        public.is_hq_admin()
        and (
          row_class_id is null
          or exists (
            select 1
            from public.classes c
            where c.id = row_class_id
              and (row_branch_id is null or c.branch_id = row_branch_id)
          )
        )
      )
      or (
        public.current_user_role() = 'branch_supervisor'
        and row_branch_id is not null
        and public.is_branch_supervisor_for_branch(row_branch_id)
        and (
          row_class_id is null
          or exists (
            select 1
            from public.classes c
            where c.id = row_class_id
              and c.branch_id = row_branch_id
          )
        )
      )
    ),
    false
  )
$$;

create or replace function public.can_select_parent_announcement_row_029(
  row_id uuid,
  row_status text,
  row_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_hq_admin()
    or (
      public.current_user_role() = 'branch_supervisor'
      and row_branch_id is not null
      and public.is_branch_supervisor_for_branch(row_branch_id)
    )
    or (
      public.current_user_role() = 'parent'
      and row_status = 'published'
      and public.can_access_parent_announcement(row_id)
    ),
    false
  )
$$;

comment on function public.can_insert_parent_announcement_row_029(uuid, uuid, text, uuid, text) is
  '029 draft helper. Parent announcement insert row predicate: HQ global draft insert, supervisor own-branch draft insert, teacher/parent/student blocked.';
comment on function public.can_select_parent_announcement_row_029(uuid, text, uuid) is
  '029 draft helper. Parent announcement select row predicate for RETURNING-safe manager visibility and published-only parent visibility.';

drop policy if exists parent_announcements_select_028 on public.parent_announcements;
create policy parent_announcements_select_028
on public.parent_announcements
for select
using (
  public.can_select_parent_announcement_row_029(id, status, branch_id)
);

drop policy if exists parent_announcements_insert_028 on public.parent_announcements;
create policy parent_announcements_insert_028
on public.parent_announcements
for insert
with check (
  public.can_insert_parent_announcement_row_029(
    branch_id,
    class_id,
    status,
    created_by_profile_id,
    announcement_type
  )
);

-- End of 029 manual/dev-first draft patch.

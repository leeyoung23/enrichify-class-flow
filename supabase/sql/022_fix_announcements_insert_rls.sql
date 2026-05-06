-- 022_fix_announcements_insert_rls.sql
-- DEV-ONLY / MANUAL REVIEW-FIRST SQL PATCH.
-- Purpose: fix Announcements Phase 1 create-path RLS for HQ + own-branch supervisor inserts.
-- Do NOT auto-apply. Review and run manually in Supabase DEV SQL editor only.
-- Do NOT apply in production from this draft.
-- No data deletes, no destructive drops, no RLS disable, no parent/student widening.

-- Root-cause context:
-- createAnnouncementRequest uses INSERT ... RETURNING (...select...).
-- RETURNING must satisfy SELECT policy for the inserted row.
-- Prior select helper relied on table lookup by id, which is fragile for create-path visibility.
-- This patch moves announcements SELECT/INSERT checks to direct row predicates.

create or replace function public.can_select_announcement_row_022(
  row_audience_type text,
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
    row_audience_type = 'internal_staff'
    and (
      public.is_hq_admin()
      or public.is_branch_supervisor_for_branch(row_branch_id)
      or (
        public.current_user_role() = 'teacher'
        and row_status = 'published'
      )
    ),
    false
  )
$$;

create or replace function public.can_insert_announcement_row_022(
  row_audience_type text,
  row_created_by_profile_id uuid,
  row_branch_id uuid,
  row_announcement_type text,
  row_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    row_audience_type = 'internal_staff'
    and row_created_by_profile_id = auth.uid()
    and row_announcement_type = 'request'
    and row_status = 'draft'
    and (
      public.is_hq_admin()
      or (
        public.current_user_role() = 'branch_supervisor'
        and row_branch_id is not null
        and public.is_branch_supervisor_for_branch(row_branch_id)
      )
    ),
    false
  )
$$;

comment on function public.can_select_announcement_row_022(text, text, uuid) is
  '022 fix: row-predicate select gate for announcement rows; avoids create-path self-lookup dependency during INSERT RETURNING.';
comment on function public.can_insert_announcement_row_022(text, uuid, uuid, text, text) is
  '022 fix: row-predicate insert gate for Phase 1 request drafts; HQ allowed globally, branch supervisor limited to own non-null branch.';

drop policy if exists announcements_select_020 on public.announcements;
create policy announcements_select_020
on public.announcements
for select
using (
  public.can_select_announcement_row_022(
    audience_type,
    status,
    branch_id
  )
);

drop policy if exists announcements_insert_020 on public.announcements;
create policy announcements_insert_020
on public.announcements
for insert
with check (
  public.can_insert_announcement_row_022(
    audience_type,
    created_by_profile_id,
    branch_id,
    announcement_type,
    status
  )
);

-- Reminder: manual DEV apply only, then rerun smoke.
select 'Reminder: rerun npm run test:supabase:announcements:phase1 after manual dev apply of 022.' as next_step;

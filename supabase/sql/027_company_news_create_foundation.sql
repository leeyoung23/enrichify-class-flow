-- 027_company_news_create_foundation.sql
-- Manual/dev-first SQL draft only.
-- Review-first patch: do NOT auto-apply.
-- Run manually in Supabase DEV SQL editor only after review sign-off.
-- Do NOT assume production apply from this draft.
-- Fake/dev data only. No real data.
-- No destructive drops, no data deletes, no global RLS disable.
--
-- Purpose:
-- - Preserve existing request/reminder insert behavior.
-- - Add narrow HQ-only create allowance for internal_staff company_news draft rows.
-- - Keep teacher/parent/student insert blocked.
-- - Keep branch supervisor company_news create blocked for MVP.
-- - Do not widen parent-facing scope.

create or replace function public.can_insert_announcement_row_027(
  row_audience_type text,
  row_created_by_profile_id uuid,
  row_branch_id uuid,
  row_announcement_type text,
  row_status text,
  row_requires_response boolean,
  row_requires_upload boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      -- Preserve 022 request-first create behavior unchanged.
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
      )
    )
    or (
      -- New MVP allowance: HQ-only internal staff company_news draft creation.
      row_audience_type = 'internal_staff'
      and row_created_by_profile_id = auth.uid()
      and row_announcement_type = 'company_news'
      and row_status = 'draft'
      and public.is_hq_admin()
      and coalesce(row_requires_response, false) = false
      and coalesce(row_requires_upload, false) = false
    ),
    false
  )
$$;

comment on function public.can_insert_announcement_row_027(text, uuid, uuid, text, text, boolean, boolean) is
  '027 draft: preserve request insert rules and add HQ-only internal_staff company_news draft insert gate; requires_response/requires_upload must remain false; branch supervisor company_news create stays blocked for MVP.';

drop policy if exists announcements_insert_020 on public.announcements;
create policy announcements_insert_020
on public.announcements
for insert
with check (
  public.can_insert_announcement_row_027(
    audience_type,
    created_by_profile_id,
    branch_id,
    announcement_type,
    status,
    requires_response,
    requires_upload
  )
);

-- Reminder: this patch only adjusts announcement row INSERT gating.
-- Target rows still depend on existing announcement_targets policies.
-- Publish/update policy behavior is unchanged in this draft.
select 'Reminder: review/apply 027 manually in DEV only, then run focused company_news create-path smoke checks.' as next_step;

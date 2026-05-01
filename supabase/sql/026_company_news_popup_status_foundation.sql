-- 026_company_news_popup_status_foundation.sql
-- Manual/dev-first SQL draft only for Company News runtime popup status foundation.
-- Do NOT auto-apply. Review and run manually in Supabase DEV SQL editor only.
-- Do NOT assume production apply in this milestone.
-- Use fake/dev data only (no real student/parent/teacher/school/curriculum/homework/payment/announcement/attendance data).
-- No destructive drops, no data deletes, and no global RLS disable.
--
-- Scope boundary for 026:
-- - Internal-staff Company News runtime popup status fields only.
-- - Parent-facing announcements/events remain future.
-- - parent_facing_media remains out of scope and blocked.
-- - Runtime popup UI/service behavior remains future (this is SQL draft only).
-- - Notifications/emails/live chat remain future.

-- -----------------------------------------------------------------------------
-- 1) Add popup status columns to announcement_statuses (additive only)
-- -----------------------------------------------------------------------------
alter table if exists public.announcement_statuses
  add column if not exists popup_seen_at timestamptz null;

alter table if exists public.announcement_statuses
  add column if not exists popup_dismissed_at timestamptz null;

alter table if exists public.announcement_statuses
  add column if not exists popup_last_shown_at timestamptz null;

comment on column public.announcement_statuses.popup_seen_at is
  '026 manual/dev draft: per-user Company News popup seen timestamp (internal_staff only).';
comment on column public.announcement_statuses.popup_dismissed_at is
  '026 manual/dev draft: per-user Company News popup dismissed timestamp (internal_staff only).';
comment on column public.announcement_statuses.popup_last_shown_at is
  '026 manual/dev draft: per-user Company News popup last shown timestamp (internal_staff only).';

-- Existing behavior remains unchanged by 026:
-- - announcement_statuses.read_at semantics remain unchanged.
-- - announcement_statuses.last_seen_at semantics remain unchanged.
-- - announcement_statuses.done_status/done_at/undone_reason semantics remain unchanged.

-- -----------------------------------------------------------------------------
-- 2) Indexes for popup status read paths (additive only)
-- -----------------------------------------------------------------------------
create index if not exists announcement_statuses_popup_seen_at_idx
  on public.announcement_statuses(popup_seen_at);

create index if not exists announcement_statuses_popup_dismissed_at_idx
  on public.announcement_statuses(popup_dismissed_at);

create index if not exists announcement_statuses_popup_last_shown_at_idx
  on public.announcement_statuses(popup_last_shown_at);

create index if not exists announcement_statuses_profile_popup_idx
  on public.announcement_statuses(profile_id, popup_dismissed_at, popup_last_shown_at);

-- -----------------------------------------------------------------------------
-- 3) Optional announcement-level popup config fields: deferred
-- -----------------------------------------------------------------------------
-- Deferred in 026 for MVP safety:
-- - announcements.popup_style
-- - announcements.popup_duration_seconds
-- - announcements.display_until
--
-- Reason:
-- - MVP runtime popup is not implemented yet.
-- - Per-user durable seen/dismiss state is the immediate foundation requirement.
-- - Keep scope minimal and non-disruptive until runtime behavior is finalized.

-- -----------------------------------------------------------------------------
-- 4) RLS posture note (no policy widening in 026)
-- -----------------------------------------------------------------------------
-- announcement_statuses already has RLS policies from 020.
-- 026 does not weaken or broaden any existing policy.
-- 026 does not open parent/student access and does not open cross-branch access.
--
-- Service/runtime expectation for future implementation:
-- - popup updates should use the existing self-status update path for the authenticated staff user.
-- - no parent/student popup status path is introduced by this draft.
--
-- Note:
-- - No helper function is added in 026. Current additive fields are sufficient for this foundation draft.
--
-- Review hardening (added in 026 pre-apply review):
-- - Existing 020 update policy allows HQ/supervisor to update managed status rows.
-- - To prevent accidental cross-user popup dismissal updates, popup_* column writes are restricted
--   to self-row updates only via trigger guard below.
-- - This does not change existing read/done/undone field semantics.

-- -----------------------------------------------------------------------------
-- 5) Popup-field self-update guard (prevents cross-user popup field writes)
-- -----------------------------------------------------------------------------
create or replace function public.guard_announcement_statuses_popup_self_update_026()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.popup_seen_at is distinct from new.popup_seen_at
    or old.popup_dismissed_at is distinct from new.popup_dismissed_at
    or old.popup_last_shown_at is distinct from new.popup_last_shown_at
  ) then
    if auth.uid() is null or auth.uid() <> new.profile_id then
      raise exception 'popup status fields can only be updated for own profile row';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_announcement_statuses_popup_self_update_026 on public.announcement_statuses;
create trigger trg_guard_announcement_statuses_popup_self_update_026
before update on public.announcement_statuses
for each row execute function public.guard_announcement_statuses_popup_self_update_026();

comment on function public.guard_announcement_statuses_popup_self_update_026() is
  '026 review hardening: popup_* fields on announcement_statuses are self-row update only to prevent cross-user dismissal writes.';

-- End of 026 manual/dev-first SQL draft.

-- 030_ai_parent_reports_foundation.sql
-- Manual/dev-first SQL draft only for AI parent report draft/review/release foundation.
-- Do NOT auto-apply. Review and run manually in Supabase dev SQL editor only.
-- No production apply assumption in this draft.
-- Use fake/dev data only (no real student/parent/teacher/school/curriculum/homework/photo/payment/announcement/attendance/report/communication data).
-- No destructive table drops, no data deletes, no global RLS disable.
--
-- AI/privacy boundary notes for this draft:
-- - AI drafts are staff-only.
-- - Parent access is released-only and linked-child scoped.
-- - Real provider integration is future; no provider wiring in this SQL draft.
-- - No provider keys in frontend, and no secrets/env logging.
-- - No auto-release behavior.
-- - No diagnosis-like unsupported claims in parent-visible content.
-- - Teacher approval remains required before release.
--
-- Deferred in this milestone:
-- - ai_parent_report_pdf_exports
-- - ai_parent_report_templates

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Core foundation tables (additive only)
-- -----------------------------------------------------------------------------
create table if not exists public.ai_parent_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  class_id uuid null references public.classes(id),
  branch_id uuid not null references public.branches(id),
  report_type text not null,
  report_period_start date not null,
  report_period_end date not null,
  status text not null default 'draft',
  current_version_id uuid null,
  created_by_profile_id uuid not null references public.profiles(id),
  assigned_teacher_profile_id uuid null references public.profiles(id),
  approved_by_profile_id uuid null references public.profiles(id),
  released_by_profile_id uuid null references public.profiles(id),
  released_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_parent_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.ai_parent_reports(id) on delete cascade,
  version_number integer not null,
  generation_source text not null default 'manual',
  structured_sections jsonb not null default '{}'::jsonb,
  teacher_edits jsonb null,
  final_text jsonb null,
  ai_model_label text null,
  ai_generated_at timestamptz null,
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint ai_parent_report_versions_report_version_uniq_030 unique (report_id, version_number)
);

create table if not exists public.ai_parent_report_evidence_links (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.ai_parent_reports(id) on delete cascade,
  evidence_type text not null,
  source_table text null,
  source_id uuid null,
  summary_snapshot jsonb null,
  include_in_parent_report boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_parent_report_release_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.ai_parent_reports(id) on delete cascade,
  version_id uuid null references public.ai_parent_report_versions(id),
  event_type text not null,
  actor_profile_id uuid not null references public.profiles(id),
  event_note text null,
  created_at timestamptz not null default now()
);

comment on table public.ai_parent_reports is
  '030 manual/dev-first draft. Parent report root table with draft/review/release lifecycle.';
comment on table public.ai_parent_report_versions is
  '030 manual/dev-first draft. Append-oriented versions for report generation/edit history.';
comment on table public.ai_parent_report_evidence_links is
  '030 manual/dev-first draft. Evidence linkage metadata; avoid storing raw private file paths.';
comment on table public.ai_parent_report_release_events is
  '030 manual/dev-first draft. Staff-facing status transition and release audit events.';

-- -----------------------------------------------------------------------------
-- 2) Constraints (additive / idempotent)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_reports_report_type_check_030'
      and conrelid = 'public.ai_parent_reports'::regclass
  ) then
    alter table public.ai_parent_reports
      add constraint ai_parent_reports_report_type_check_030
      check (report_type in (
        'weekly_brief',
        'monthly_progress',
        'parent_requested',
        'graduation',
        'end_of_term',
        'homework_feedback',
        'participation_note'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_reports_status_check_030'
      and conrelid = 'public.ai_parent_reports'::regclass
  ) then
    alter table public.ai_parent_reports
      add constraint ai_parent_reports_status_check_030
      check (status in (
        'draft',
        'teacher_review',
        'supervisor_review',
        'approved',
        'released',
        'archived'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_reports_period_window_check_030'
      and conrelid = 'public.ai_parent_reports'::regclass
  ) then
    alter table public.ai_parent_reports
      add constraint ai_parent_reports_period_window_check_030
      check (report_period_end >= report_period_start);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_reports_released_fields_check_030'
      and conrelid = 'public.ai_parent_reports'::regclass
  ) then
    alter table public.ai_parent_reports
      add constraint ai_parent_reports_released_fields_check_030
      check (
        status <> 'released'
        or (released_at is not null and released_by_profile_id is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_report_versions_generation_source_check_030'
      and conrelid = 'public.ai_parent_report_versions'::regclass
  ) then
    alter table public.ai_parent_report_versions
      add constraint ai_parent_report_versions_generation_source_check_030
      check (generation_source in ('manual', 'mock_ai', 'real_ai'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_report_versions_version_number_check_030'
      and conrelid = 'public.ai_parent_report_versions'::regclass
  ) then
    alter table public.ai_parent_report_versions
      add constraint ai_parent_report_versions_version_number_check_030
      check (version_number >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_report_evidence_links_type_check_030'
      and conrelid = 'public.ai_parent_report_evidence_links'::regclass
  ) then
    alter table public.ai_parent_report_evidence_links
      add constraint ai_parent_report_evidence_links_type_check_030
      check (evidence_type in (
        'attendance',
        'homework',
        'homework_feedback',
        'teacher_note',
        'weekly_report',
        'memory_media',
        'parent_announcement',
        'assessment',
        'manual'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_parent_report_release_events_type_check_030'
      and conrelid = 'public.ai_parent_report_release_events'::regclass
  ) then
    alter table public.ai_parent_report_release_events
      add constraint ai_parent_report_release_events_type_check_030
      check (event_type in (
        'generated',
        'edited',
        'submitted_for_review',
        'approved',
        'released',
        'archived',
        'reopened'
      ));
  end if;
end;
$$;

-- current_version_id FK is added after versions table creation to avoid circular creation order issues.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_parent_reports_current_version_fk_030'
      and conrelid = 'public.ai_parent_reports'::regclass
  ) then
    alter table public.ai_parent_reports
      add constraint ai_parent_reports_current_version_fk_030
      foreign key (current_version_id)
      references public.ai_parent_report_versions(id)
      on delete set null;
  end if;
end;
$$;

-- Pair-level FK safety: ensure current_version_id (when present) belongs to the same report row.
-- This prevents cross-report pointer mistakes.
create unique index if not exists ai_parent_report_versions_report_id_id_uniq_idx_030
  on public.ai_parent_report_versions(report_id, id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_parent_reports_current_version_same_report_fk_030'
      and conrelid = 'public.ai_parent_reports'::regclass
  ) then
    alter table public.ai_parent_reports
      add constraint ai_parent_reports_current_version_same_report_fk_030
      foreign key (id, current_version_id)
      references public.ai_parent_report_versions(report_id, id)
      on delete set null;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) Indexes
-- -----------------------------------------------------------------------------
create index if not exists ai_parent_reports_student_id_idx_030
  on public.ai_parent_reports(student_id);
create index if not exists ai_parent_reports_branch_id_idx_030
  on public.ai_parent_reports(branch_id);
create index if not exists ai_parent_reports_class_id_idx_030
  on public.ai_parent_reports(class_id);
create index if not exists ai_parent_reports_status_idx_030
  on public.ai_parent_reports(status);
create index if not exists ai_parent_reports_report_type_idx_030
  on public.ai_parent_reports(report_type);
create index if not exists ai_parent_reports_period_idx_030
  on public.ai_parent_reports(report_period_start, report_period_end);
create index if not exists ai_parent_reports_current_version_id_idx_030
  on public.ai_parent_reports(current_version_id);

create index if not exists ai_parent_report_versions_report_id_idx_030
  on public.ai_parent_report_versions(report_id);

create index if not exists ai_parent_report_evidence_links_report_evidence_idx_030
  on public.ai_parent_report_evidence_links(report_id, evidence_type);

create index if not exists ai_parent_report_release_events_report_event_idx_030
  on public.ai_parent_report_release_events(report_id, event_type);

-- -----------------------------------------------------------------------------
-- 4) updated_at trigger for ai_parent_reports
-- -----------------------------------------------------------------------------
create or replace function public.set_ai_parent_reports_updated_at_030()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_ai_parent_reports_updated_at_030 on public.ai_parent_reports;
create trigger trg_set_ai_parent_reports_updated_at_030
before update on public.ai_parent_reports
for each row execute function public.set_ai_parent_reports_updated_at_030();

-- -----------------------------------------------------------------------------
-- 5) Helper functions for RLS readability / recursion avoidance
-- -----------------------------------------------------------------------------
create or replace function public.ai_parent_report_branch_id(report_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select r.branch_id
  from public.ai_parent_reports r
  where r.id = report_uuid
  limit 1
$$;

create or replace function public.can_manage_ai_parent_report(report_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.ai_parent_reports r
      where r.id = report_uuid
        and (
          public.is_hq_admin()
          or (
            public.current_user_role() = 'branch_supervisor'
            and public.is_branch_supervisor_for_branch(r.branch_id)
          )
          or (
            public.current_user_role() = 'teacher'
            and public.current_user_branch_id() = r.branch_id
            and (
              r.assigned_teacher_profile_id = auth.uid()
              or public.is_teacher_for_student(r.student_id)
              or (r.class_id is not null and public.is_teacher_for_class(r.class_id))
            )
          )
        )
    ),
    false
  )
$$;

create or replace function public.can_access_ai_parent_report(report_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.ai_parent_reports r
      where r.id = report_uuid
        and (
          public.can_manage_ai_parent_report(r.id)
          or (
            public.current_user_role() = 'parent'
            and r.status = 'released'
            and public.is_guardian_for_student(r.student_id)
          )
        )
    ),
    false
  )
$$;

create or replace function public.can_insert_ai_parent_report_row_030(
  student_uuid uuid,
  class_uuid uuid,
  branch_uuid uuid,
  creator_uuid uuid,
  assigned_teacher_uuid uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    creator_uuid = auth.uid()
    and exists (
      select 1
      from public.students s
      where s.id = student_uuid
        and s.branch_id = branch_uuid
        and (
          class_uuid is null
          or s.class_id = class_uuid
        )
    )
    and (
      assigned_teacher_uuid is null
      or exists (
        select 1
        from public.profiles p
        join public.teachers t on t.profile_id = p.id
        where p.id = assigned_teacher_uuid
          and p.role = 'teacher'
          and t.branch_id = branch_uuid
          and (
            class_uuid is null
            or exists (
              select 1
              from public.teacher_class_assignments tca
              where tca.teacher_id = t.id
                and tca.class_id = class_uuid
                and tca.branch_id = branch_uuid
            )
          )
      )
    )
    and (
      public.is_hq_admin()
      or (
        public.current_user_role() = 'branch_supervisor'
        and public.is_branch_supervisor_for_branch(branch_uuid)
      )
      or (
        public.current_user_role() = 'teacher'
        and public.current_user_branch_id() = branch_uuid
        and (
          public.is_teacher_for_student(student_uuid)
          or (class_uuid is not null and public.is_teacher_for_class(class_uuid))
        )
        and (
          assigned_teacher_uuid is null
          or assigned_teacher_uuid = auth.uid()
        )
      )
    ),
    false
  )
$$;

create or replace function public.can_manage_ai_parent_report_version(report_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_ai_parent_report(report_uuid)
$$;

create or replace function public.can_access_ai_parent_report_version(report_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_ai_parent_report(report_uuid)
$$;

comment on function public.can_manage_ai_parent_report(uuid) is
  '030 draft helper. HQ global manage, supervisor own-branch manage, teacher assigned/class-scoped manage.';
comment on function public.can_access_ai_parent_report(uuid) is
  '030 draft helper. Parent access is released-only and linked-child scoped. Drafts remain staff-only.';
comment on function public.can_insert_ai_parent_report_row_030(uuid, uuid, uuid, uuid, uuid) is
  '030 draft helper. Insert is self-creator only with branch/student alignment; assigned teacher must be same-branch teacher (and class-assigned when class is set).';
comment on function public.can_access_ai_parent_report_version(uuid) is
  '030 draft helper. Parent version reads are further constrained by table policy to released current_version rows only.';

-- -----------------------------------------------------------------------------
-- 6) Enable RLS
-- -----------------------------------------------------------------------------
alter table public.ai_parent_reports enable row level security;
alter table public.ai_parent_report_versions enable row level security;
alter table public.ai_parent_report_evidence_links enable row level security;
alter table public.ai_parent_report_release_events enable row level security;

-- -----------------------------------------------------------------------------
-- 7) ai_parent_reports policies
-- -----------------------------------------------------------------------------
drop policy if exists ai_parent_reports_select_030 on public.ai_parent_reports;
create policy ai_parent_reports_select_030
on public.ai_parent_reports
for select
using (
  public.can_access_ai_parent_report(id)
);

drop policy if exists ai_parent_reports_insert_030 on public.ai_parent_reports;
create policy ai_parent_reports_insert_030
on public.ai_parent_reports
for insert
with check (
  public.can_insert_ai_parent_report_row_030(
    student_id,
    class_id,
    branch_id,
    created_by_profile_id,
    assigned_teacher_profile_id
  )
);

drop policy if exists ai_parent_reports_update_030 on public.ai_parent_reports;
create policy ai_parent_reports_update_030
on public.ai_parent_reports
for update
using (
  public.can_manage_ai_parent_report(id)
)
with check (
  public.can_manage_ai_parent_report(id)
);

drop policy if exists ai_parent_reports_delete_030 on public.ai_parent_reports;
create policy ai_parent_reports_delete_030
on public.ai_parent_reports
for delete
using (
  public.can_manage_ai_parent_report(id)
);

-- -----------------------------------------------------------------------------
-- 8) ai_parent_report_versions policies
-- -----------------------------------------------------------------------------
drop policy if exists ai_parent_report_versions_select_030 on public.ai_parent_report_versions;
create policy ai_parent_report_versions_select_030
on public.ai_parent_report_versions
for select
using (
  public.can_access_ai_parent_report_version(report_id)
  and (
    public.current_user_role() <> 'parent'
    or exists (
      select 1
      from public.ai_parent_reports r
      where r.id = ai_parent_report_versions.report_id
        and r.status = 'released'
        and r.current_version_id = ai_parent_report_versions.id
        and public.is_guardian_for_student(r.student_id)
    )
  )
);

drop policy if exists ai_parent_report_versions_insert_030 on public.ai_parent_report_versions;
create policy ai_parent_report_versions_insert_030
on public.ai_parent_report_versions
for insert
with check (
  created_by_profile_id = auth.uid()
  and public.can_manage_ai_parent_report_version(report_id)
);

drop policy if exists ai_parent_report_versions_update_030 on public.ai_parent_report_versions;
drop policy if exists ai_parent_report_versions_delete_030 on public.ai_parent_report_versions;

comment on table public.ai_parent_report_versions is
  '030 manual/dev-first draft. Append-oriented versions; insert-first history model (no update/delete policies in MVP).';

-- -----------------------------------------------------------------------------
-- 9) ai_parent_report_evidence_links policies (staff-only by default)
-- -----------------------------------------------------------------------------
drop policy if exists ai_parent_report_evidence_links_select_030 on public.ai_parent_report_evidence_links;
create policy ai_parent_report_evidence_links_select_030
on public.ai_parent_report_evidence_links
for select
using (
  public.can_manage_ai_parent_report(report_id)
);

drop policy if exists ai_parent_report_evidence_links_insert_030 on public.ai_parent_report_evidence_links;
create policy ai_parent_report_evidence_links_insert_030
on public.ai_parent_report_evidence_links
for insert
with check (
  public.can_manage_ai_parent_report(report_id)
);

drop policy if exists ai_parent_report_evidence_links_update_030 on public.ai_parent_report_evidence_links;
create policy ai_parent_report_evidence_links_update_030
on public.ai_parent_report_evidence_links
for update
using (
  public.can_manage_ai_parent_report(report_id)
)
with check (
  public.can_manage_ai_parent_report(report_id)
);

drop policy if exists ai_parent_report_evidence_links_delete_030 on public.ai_parent_report_evidence_links;
create policy ai_parent_report_evidence_links_delete_030
on public.ai_parent_report_evidence_links
for delete
using (
  public.can_manage_ai_parent_report(report_id)
);

-- -----------------------------------------------------------------------------
-- 10) ai_parent_report_release_events policies (staff-only by default)
-- -----------------------------------------------------------------------------
drop policy if exists ai_parent_report_release_events_select_030 on public.ai_parent_report_release_events;
create policy ai_parent_report_release_events_select_030
on public.ai_parent_report_release_events
for select
using (
  public.can_manage_ai_parent_report(report_id)
);

drop policy if exists ai_parent_report_release_events_insert_030 on public.ai_parent_report_release_events;
create policy ai_parent_report_release_events_insert_030
on public.ai_parent_report_release_events
for insert
with check (
  actor_profile_id = auth.uid()
  and public.can_manage_ai_parent_report(report_id)
);

drop policy if exists ai_parent_report_release_events_update_030 on public.ai_parent_report_release_events;
drop policy if exists ai_parent_report_release_events_delete_030 on public.ai_parent_report_release_events;

comment on table public.ai_parent_report_release_events is
  '030 manual/dev-first draft. Staff-facing append-only release/status audit events in MVP (no update/delete policies).';

-- End of 030 manual/dev-first SQL draft.

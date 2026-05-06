-- 045_student_learning_observations_foundation.sql
-- Backend foundation only: student-linked Monthly Learning Observation records (staff-only).
-- No parent/student raw access. No auto-release. No provider integration.
-- Manual execution only (dev/staging first). Do NOT auto-run in prod.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Table
-- -----------------------------------------------------------------------------

create table if not exists public.student_learning_observations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,

  teacher_profile_id uuid not null references public.profiles(id),
  assigned_by_profile_id uuid references public.profiles(id),
  review_profile_id uuid references public.profiles(id),

  -- Report period identity (month bucket + weekly rotation)
  observation_period_month date not null,
  observation_week integer not null,

  -- Lifecycle (draft → submitted → reviewed/returned → archived)
  status text not null default 'draft',

  -- Rubric dimensions (rating 1–5 + evidence + next action)
  engagement_rating integer,
  engagement_evidence text,
  engagement_next_action text,

  understanding_rating integer,
  understanding_evidence text,
  understanding_next_action text,

  homework_habit_rating integer,
  homework_habit_evidence text,
  homework_habit_next_action text,

  communication_confidence_rating integer,
  communication_confidence_evidence text,
  communication_confidence_next_action text,

  behaviour_focus_rating integer,
  behaviour_focus_evidence text,
  behaviour_focus_next_action text,

  -- Narrative blocks (teacher evidence input, later polished into parent-facing Teacher Feedback)
  strength_this_month text,
  area_to_improve text,
  recommended_next_step text,

  -- Internal-only (must never be sent to parents or providers by default)
  private_internal_note text,

  -- AI include policy gate (default conservative)
  ai_include_status text not null default 'needs_review',

  submitted_at timestamptz,
  reviewed_at timestamptz,
  returned_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_slo_observation_week_045 check (observation_week between 1 and 6),
  constraint chk_slo_status_045 check (status in ('draft','submitted','reviewed','returned','archived')),
  constraint chk_slo_ai_include_status_045 check (ai_include_status in ('eligible','excluded','needs_review')),
  constraint chk_slo_period_month_first_day_045 check (date_trunc('month', observation_period_month) = observation_period_month),

  constraint chk_slo_engagement_rating_045 check (engagement_rating is null or (engagement_rating between 1 and 5)),
  constraint chk_slo_understanding_rating_045 check (understanding_rating is null or (understanding_rating between 1 and 5)),
  constraint chk_slo_homework_habit_rating_045 check (homework_habit_rating is null or (homework_habit_rating between 1 and 5)),
  constraint chk_slo_communication_confidence_rating_045 check (communication_confidence_rating is null or (communication_confidence_rating between 1 and 5)),
  constraint chk_slo_behaviour_focus_rating_045 check (behaviour_focus_rating is null or (behaviour_focus_rating between 1 and 5))
);

comment on table public.student_learning_observations is
  '045 foundation: Monthly Learning Observation (staff evidence input). Parents/students have no raw access. AI use is staff-only and review-gated; Teacher Feedback appears only via approved/released reports.';

-- -----------------------------------------------------------------------------
-- 2) Identity / uniqueness (active observation per student/class/teacher/month/week)
-- -----------------------------------------------------------------------------

create unique index if not exists student_learning_observations_active_identity_idx_045
  on public.student_learning_observations(student_id, class_id, teacher_profile_id, observation_period_month, observation_week)
  where archived_at is null and status <> 'archived';

-- -----------------------------------------------------------------------------
-- 3) Indexes (query patterns: student/month, class/month, branch/month, teacher/month, status)
-- -----------------------------------------------------------------------------

create index if not exists student_learning_observations_student_month_idx_045
  on public.student_learning_observations(student_id, observation_period_month);

create index if not exists student_learning_observations_class_month_idx_045
  on public.student_learning_observations(class_id, observation_period_month);

create index if not exists student_learning_observations_branch_month_idx_045
  on public.student_learning_observations(branch_id, observation_period_month);

create index if not exists student_learning_observations_teacher_month_idx_045
  on public.student_learning_observations(teacher_profile_id, observation_period_month);

create index if not exists student_learning_observations_status_idx_045
  on public.student_learning_observations(status);

create index if not exists student_learning_observations_ai_include_status_idx_045
  on public.student_learning_observations(ai_include_status);

-- -----------------------------------------------------------------------------
-- 4) updated_at trigger (local to 045; consistent with other patches)
-- -----------------------------------------------------------------------------

create or replace function public.set_student_learning_observations_updated_at_045()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_student_learning_observations_updated_at_045 on public.student_learning_observations;
create trigger trg_set_student_learning_observations_updated_at_045
before update on public.student_learning_observations
for each row execute function public.set_student_learning_observations_updated_at_045();

-- -----------------------------------------------------------------------------
-- 5) Enable RLS
-- -----------------------------------------------------------------------------

alter table public.student_learning_observations enable row level security;

-- -----------------------------------------------------------------------------
-- 6) RLS policies (conservative)
-- -----------------------------------------------------------------------------

-- Staff select only: HQ + branch supervisor; teachers see their own rows and assigned student scope.
drop policy if exists student_learning_observations_select_045 on public.student_learning_observations;
create policy student_learning_observations_select_045
on public.student_learning_observations
for select
using (
  public.current_user_role() not in ('parent','student')
  and (
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(branch_id)
    or teacher_profile_id = auth.uid()
    or public.is_teacher_for_student(student_id)
  )
);

-- Insert: HQ/supervisor can insert for branch; teachers can insert only for their scoped students/classes and only as self.
drop policy if exists student_learning_observations_insert_045 on public.student_learning_observations;
create policy student_learning_observations_insert_045
on public.student_learning_observations
for insert
with check (
  public.current_user_role() not in ('parent','student')
  and (
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(branch_id)
    or (
      teacher_profile_id = auth.uid()
      and public.is_teacher_for_student(student_id)
      and public.is_teacher_for_class(class_id)
      and status = 'draft'
      and submitted_at is null
      and reviewed_at is null
      and returned_at is null
      and archived_at is null
    )
  )
);

-- Update (staff manage): HQ/supervisor can update any row in scope.
drop policy if exists student_learning_observations_update_staff_045 on public.student_learning_observations;
create policy student_learning_observations_update_staff_045
on public.student_learning_observations
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
)
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- Update (teacher draft/submit only): teacher may edit only own rows while old status is draft/returned.
-- New values are constrained so teachers cannot set reviewed/archived fields.
drop policy if exists student_learning_observations_update_teacher_045 on public.student_learning_observations;
create policy student_learning_observations_update_teacher_045
on public.student_learning_observations
for update
using (
  public.current_user_role() = 'teacher'
  and teacher_profile_id = auth.uid()
  and status in ('draft','returned')
)
with check (
  public.current_user_role() = 'teacher'
  and teacher_profile_id = auth.uid()
  and status in ('draft','submitted')
  and review_profile_id is null
  and reviewed_at is null
  and archived_at is null
  -- returned_at should be set only by supervisor/HQ
  and (
    status <> 'submitted'
    or (submitted_at is not null)
  )
);

-- No delete policy in v1.


---
title: Monthly Learning Observation — schema + RLS plan (draft)
date: 2026-05-06
stage: Internal Prototype RC / planning-only
constraints:
  - no migrations applied in this milestone
  - no service-role frontend
  - no parent raw observation access
  - no provider/OCR/email/PDF work
  - no auto-release
---

## Summary

This document specifies the **future** persistent data model for **Monthly Learning Observation** (staff evidence input) and the associated **RLS policies**, **task typing model**, and **audit events**.

Naming boundary:
- **Observation** = staff evidence input.
- **Teacher Feedback / Monthly Learning Feedback** = parent-facing output in released reports.

This is **planning-only**: do not apply SQL migrations from this doc without a dedicated review milestone.

---

## Part A — Current foundation diagnosis (what exists today)

### 1) MVP `public.observations` (teaching-quality)

`supabase/sql/001_mvp_schema.sql` creates `observations` with:
- `branch_id`, `class_id`
- `teacher_id` (observed teacher)
- `observer_profile_id`
- `observation_note`
- timestamps

**No `student_id`.** This is a classroom / teaching-quality observation flow, not a per-student monthly check-in.

### 2) `teacher_tasks` / `teacher_task_assignments`

Also in MVP schema:
- `teacher_tasks`: supports `class_id`, `student_id` (optional), `title`, `details`, `status`, `due_at`.
- `teacher_task_assignments`: links `task_id` to a `teacher_id` with status.

This is a good foundation for **due reminders**, but it does not yet model **rubric payloads** or per-student observation lifecycle.

### 3) My Tasks UI

`MyTasks.jsx` is already the staff surface for action reminders. It can later display:
- a weekly observation batch task
- per-student sub-statuses (Not started/Draft/Submitted/Reviewed/Returned/Overdue)

---

## Part B — Recommendation: create a new table (do not reuse MVP `observations`)

### Why a new `student_learning_observations` table?

Reusing/overloading MVP `observations` would mix **two different products**:
- classroom teaching-quality observation (HQ/supervisor → teacher)
- per-student monthly learning observation (teacher → internal evidence → parent-facing report prose)

Keeping them separate makes RLS and privacy boundaries clearer.

---

## Part C — Recommended schema (v1) for `student_learning_observations`

## Implementation note (045 foundation)

Backend foundation SQL is now defined in:

- `supabase/sql/045_student_learning_observations_foundation.sql`

Manual apply only (dev/staging first). This milestone does **not** auto-apply migrations.

### Column model (recommended for v1)

Prefer explicit columns over a large JSONB blob for the first version. Reasons:
- clearer validation and constraints (rating 1–5, max lengths)
- easier analytics (completion rates, average ratings, overdue counts)
- easier to keep `private_internal_note` isolated

#### Core keys / scope

- `id uuid primary key default gen_random_uuid()`
- `branch_id uuid not null references branches(id)`
- `class_id uuid not null references classes(id)`
- `student_id uuid not null references students(id)`
- `teacher_profile_id uuid not null references profiles(id)` (the completing teacher)
- `assigned_by_profile_id uuid references profiles(id)` (who scheduled/assigned the month/week; optional)
- `review_profile_id uuid references profiles(id)` (who reviewed/approved for AI use; optional)

#### Period identity / workload rotation

- `observation_period_month text not null` (e.g. `2026-05` — avoids timezone confusion)
- `observation_week integer not null` (1–5) (weekly batch rotation within the month)

#### Status lifecycle

`status text not null` with allowed values:
- `draft` (teacher editing)
- `submitted` (teacher says ready)
- `reviewed` (supervisor/HQ reviewed; safe default for AI evidence)
- `returned` (needs teacher revision)
- `archived` (no longer active)

Timestamps:
- `submitted_at timestamptz`
- `reviewed_at timestamptz`
- `returned_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### Rubric dimensions (repeat pattern)

For each rated dimension: **rating 1–5 + evidence + next action**.

1) Engagement / participation
- `engagement_rating smallint`
- `engagement_evidence text`
- `engagement_next_action text`

2) Understanding / lesson progress
- `understanding_rating smallint`
- `understanding_evidence text`
- `understanding_next_action text`

3) Homework habit / responsibility
- `homework_habit_rating smallint`
- `homework_habit_evidence text`
- `homework_habit_next_action text`

4) Communication / confidence
- `communication_confidence_rating smallint`
- `communication_confidence_evidence text`
- `communication_confidence_next_action text`

5) Behaviour / focus / routine
- `behaviour_focus_rating smallint`
- `behaviour_focus_evidence text`
- `behaviour_focus_next_action text`

#### Narrative blocks

- `strength_this_month text`
- `area_to_improve text`
- `recommended_next_step text`

#### Private internal note (never parent-visible by default)

- `private_internal_note text`

#### AI include policy

`ai_include_status text not null default 'eligible'` with values:
- `eligible` (may be used as staff-only AI evidence after review rules below)
- `excluded` (never include)
- `needs_review` (block evidence use until review)

---

## Part D — Columns vs JSONB recommendation

### Option A: columns (recommended v1)

Pros:
- straightforward validation + indexing
- easy reporting/dashboarding
- easier to keep certain fields (internal notes) isolated

Cons:
- wider table; migrations required for rubric changes

### Option B: JSONB `dimension_ratings`

Pros:
- flexible rubric changes
- easier iteration on dimensions

Cons:
- harder constraints
- harder analytics
- higher risk of leaking internal fields if payload shape grows unchecked

**Recommendation:** Use **columns** for v1. Consider JSONB in v2 only after lifecycle, RLS, and export controls are proven.

---

## Part E — RLS policy design (do not implement yet)

Defaults: parents/students have **no select** on this table.

### HQ
- read/manage all rows.

### Branch supervisor
- read/manage where `branch_id` is in their scope.

### Teacher (completion lane)

Teacher should be able to:
- `select` rows for students they teach (or assigned via the observation task)
- `insert` rows **only** for students they teach (or when task assignment exists)
- `update` **only** their own rows while `status in ('draft', 'returned')`
- transition `draft → submitted` on their own rows

Teacher must **not** be able to mark `reviewed` unless policy says teacher-self-review is allowed.

### AI evidence read rules (staff-only)

Safest default:
- aggregation uses only rows where:
  - `status = 'reviewed'`
  - `ai_include_status = 'eligible'`
  - and scoped to `student_id` + report period

Centre policy option (if no supervisor review process exists):
- allow `status = 'submitted'` for AI evidence, but only when `ai_include_status = 'eligible'`

### Internal note exclusion rules

`private_internal_note` must never be included in:
- parent-visible report content
- provider-bound payloads
- default evidence summaries

If any future policy allows internal note usage, it must be explicit and auditable (separate flag).

---

## Part F — Weekly task generation model (using `teacher_tasks`)

### Task typing

Add a `task_type` + metadata concept (planning):

- `task_type = 'monthly_learning_observation'`
- metadata (JSON) on the task row (or separate table) includes:
  - `observation_period_month` (e.g. `2026-05`)
  - `observation_week` (1–5)
  - `class_id`
  - `student_ids` due this week (array)
  - `due_at`

### Teacher UX target

One weekly task card:
- “Monthly Learning Observation — 5 students due this week”
- each student has a per-student observation status:
  - Not started / Draft / Submitted / Reviewed / Returned / Overdue

Supervisor/HQ sees completion progress by class/month.

---

## Part G — AI evidence integration rules (future)

When implemented, AI Parent Reports should ingest:
- only **reviewed/eligible** observation summaries (default)
- convert structured ratings into concise evidence statements (staff-only)
- generate parent-facing **Teacher Feedback** prose as a draft section

Hard boundaries:
- parents never see raw observation records
- no auto-release
- teacher/supervisor review remains mandatory

---

## Part H — Audit events (recommended)

Add `audit_events` entries for:
- `student_learning_observation.created`
- `student_learning_observation.updated`
- `student_learning_observation.submitted`
- `student_learning_observation.reviewed`
- `student_learning_observation.returned`
- `student_learning_observation.archived`
- `monthly_observation_task.generated`
- `monthly_observation_task.completed`

Each event should record:
- actor profile id
- student id (when applicable)
- class id
- month/week identifiers
- minimal metadata (no private internal note content)

---

## Part I — Deferred / out of scope (explicit)

- Implementing SQL migrations and applying RLS.
- Building the full Student Learning Observation form UI.
- Provider calls, OCR, email/SMS, PDF storage.
- Any parent visibility of raw observations.

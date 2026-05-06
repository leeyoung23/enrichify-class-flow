# Monthly Learning Observation (guided teacher observation tasks) — planning foundation

Date: 2026-05-06  
Scope: **product + technical planning** for structured **per-student monthly learning observations** that can later feed **AI Parent Reports** as **staff-only evidence**.  
**Not** a commitment to ship full schema/UI in this iteration.

---

## 1. Problem statement

Centres need a **repeatable, evidence-backed** way for teachers to record **Monthly Learning Observations** (not vague “good student” labels) so that:

- AI-assisted monthly reports have **structured, observable** inputs.
- **Raw observation rows** stay **internal** until narrative is **edited, reviewed, and released** in the parent report workflow.
- Ratings are **evidence-backed** and **tone-safe** for eventual parent-facing wording.

### 1.1 Naming model (critical)

- **Observation** = internal staff evidence input.
- **Feedback** = polished parent-facing output in the released report.

Use these names consistently:

- **Staff/teacher tab/module:** Observations
- **Teacher task name:** Monthly Learning Observation
- **Form title:** Student Learning Observation
- **AI evidence category:** Teacher observations / learning evidence
- **Parent-facing report wording:** Teacher Feedback / Monthly Learning Feedback

---

## 2. Current architecture (diagnosis)

### 2.1 MVP `public.observations` (existing)

From `supabase/sql/001_mvp_schema.sql`:

- Columns: `branch_id`, `class_id`, **`teacher_id`** (observed teacher), **`observer_profile_id`**, `observation_note`, timestamps.
- **No `student_id`.** This models **classroom / teaching-quality observation**, not per-student learning check-ins.
- **RLS** (see `supabase/sql/003_rls_policies_draft.sql`): staff-scoped read; create path aligned with **HQ / supervisor / observation workflow**, not student-linked monthly notes.

### 2.2 `Observations.jsx` (existing UI)

- Uses **`dataService`** demo reads; **Create Observation** is limited to **`hq_admin`** and **`branch_supervisor`** (`canCreate`).
- **Teachers** see copy oriented to **feedback about their teaching**, not student monthly rubrics.
- **No persistent Supabase student-observation form** in this route today.

### 2.3 `teacher_tasks` / `teacher_task_assignments` (existing)

- `teacher_tasks` supports **`student_id`** (optional), `class_id`, `title`, `details`, `due_at`, status — suitable **later** for **“Complete May observation for Student X”** style assignments.
- `MyTasks.jsx` combines **teacher task assignments** (Supabase) with **announcement tasks** — a reasonable **future home** for “monthly observation due” reminders once task types/metadata exist.

### 2.4 AI Parent Report evidence (today)

- **Rolling up**: `student_school_profiles`, **`learning_goals`**, report-period vs **snapshot** (`learningContextSnapshotSummary`) — see `aiParentReportSourceAggregationService.js`.
- **True per-student structured observation records** are **not** in aggregation yet; classroom `observations` table is **not student-scoped**.

---

## 3. Recommended v1 rubric (education-centre)

Design principle: **rating + evidence-based observation + next action** per dimension where rated; narrative fields for holistic strength/improvement/next step.

### 3.1 Rating scale (1–5)

| Score | Label | Meaning |
|-------|--------|---------|
| 1 | Needs significant support | Observable gaps; intervention-oriented |
| 2 | Developing | Inconsistent; emerging skills |
| 3 | Meeting expectation | Typical progress for context |
| 4 | Strong progress | Clear, repeated positive behaviours |
| 5 | Excellent / consistently strong | Sustained, independent demonstration |

**Rules:** Each rating must have a **short evidence-based observation** referencing **observable behaviour** (e.g. “volunteers answers in group oral practice”) — avoid labels like “good” without evidence.

### 3.2 Dimensions (rated: 1–5 rating + evidence-based observation + optional next action)

1. **Engagement / participation**  
2. **Understanding / lesson progress**  
3. **Homework habit / responsibility**  
4. **Communication / confidence**  
5. **Behaviour / focus / routine**

### 3.3 Narrative blocks (text; parent-safe professional tone when surfaced via report)

6. **Strength this month** — specific, observable.  
7. **Area to improve** — one or two focused areas with constructive framing.  
8. **Recommended next step** — actionable for home/class (aligned with centre policy).

### 3.4 Internal-only

9. **Optional private internal note** — **must not** flow into parent-facing text or default AI parent report payloads; **HQ/supervisor policy** may allow use in internal QA only.

---

## 4. Workload model (weekly rotation)

Goal: **1 structured observation per student per month**, spread across weeks to protect teacher workload.

- **Weekly rotation target** (approximate):
  - class of **20** students → **5** students per week
  - class of **16** students → **4** students per week
  - class of **12** students → **3** students per week
- **Missed observations:** roll forward to the next week or become **overdue** (centre policy).
- **Visibility:** supervisor/HQ can view completion progress by class/teacher/month.

This model later maps naturally to a weekly “batch” task (see My Tasks behavior).

---

## 4. Roles and workflow (target)

| Activity | Suggested role |
|----------|----------------|
| **Assign** “monthly observation due” (per class/student/month) | **Branch supervisor** or **HQ** (configurable per tenant) |
| **Complete** structured observation | **Assigned teacher** (class/student scope per RLS) |
| **Optional review** before AI/report use | **Branch supervisor** or **HQ** (flag per centre) |
| **Approve narrative for parents** | **Teacher / supervisor** per existing AI parent report lifecycle |

**AI usage boundary:** Raw structured **Monthly Learning Observation** rows feed **staff-only evidence** and **draft assist**. AI may then produce parent-facing **Teacher Feedback** in the report draft. Teacher/staff must **review/edit/release** — **no auto-release**, and **parents never see raw observation records**.

---

## 5. Future My Tasks UX (concept)

When implemented, teachers should see a single weekly card:

- **Task name:** Monthly Learning Observation
- **Status:** “5 students due this week” (for a class of 20)
- Student list per week with statuses:
  - Not started
  - Draft
  - Submitted
  - Reviewed
  - Overdue
- Clicking a student opens the **Student Learning Observation** form.
- Supervisor/HQ can view completion metrics and follow up.

---

## 5. Data model direction (later; not implemented in this planning milestone)

**Preferred:** New table (names illustrative) e.g. **`student_learning_observations`** or **`teacher_monthly_observations`**:

- `id`, `branch_id`, `class_id`, **`student_id`** (required), `observer_profile_id`, `period_label` or `period_start`/`period_end`
- JSONB **`dimension_ratings`** (scores + evidence + optional next_action per dimension) **or** normalized child table
- Narrative fields: strength, area_to_improve, recommended_next_step
- **`internal_note`** (never export to parent aggregation by default)
- **`status`**: `draft` | `submitted` | `reviewed` | `archived`
- Timestamps, optional **`approved_for_report_at`** / **`reviewed_by_profile_id`**

**RLS:** Teacher on assigned class/student; supervisor/HQ branch scope; **parents: no select**.

**Aggregation:** Extend `collectAiParentReportSourceEvidence` with **sanitised excerpts** only, **after** optional review flag — **no internal_note** in parent-bound payloads.

---

## 6. Why not reuse MVP `observations`?

The existing table is **teacher-centric** and **not student-linked**. Extending it with nullable `student_id` would blur two different products (classroom quality vs student monthly check-in). A **dedicated** student observation entity keeps policies and RLS clearer.

---

## 7. Milestone sequencing (recommended)

1. **Planning + rubric** (this document) + staff UI **guidance** copy.  
2. **SQL foundation** + RLS (045 backend) + minimal teacher completion UI (single student, one month).  
3. **Task assignment** integration (`teacher_tasks` or typed task metadata).  
4. **Aggregation hook** into AI Parent Report source evidence (staff preview + mock draft).  
5. **Review gate** (optional) before inclusion in AI draft context.

---

## 8. References

- `docs/ai-evidence-pipeline-readiness-plan.md`  
- `docs/monthly-learning-observation-schema-rLS-plan.md`  
- `docs/student-profile-learning-notes-foundation-plan.md`  
- `docs/production-readiness-audit.md`

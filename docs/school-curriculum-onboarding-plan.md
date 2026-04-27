# School and Curriculum Onboarding Plan

This document plans the school and curriculum data layer needed for future AI personalisation. No runtime implementation, SQL migration, or AI API work is implied by this plan alone.

## 1) Why school/curriculum data matters

AI-generated parent comments, weekly progress reports, homework marking hints, and learning recommendations all degrade to generic text without grounding in:

- the student’s school context (name, type, region expectations),
- grade/year and pathway (e.g. Cambridge vs local syllabus),
- subject and module/unit alignment,
- learning objectives and tags (strengths, weaknesses).

School and curriculum fields constrain prompts and outputs so drafts stay relevant, defensible, and easier for teachers to approve. They also support auditability: future AI outputs can be traced to explicit profile inputs rather than free-form guesses.

## 2) User flow

### Parent onboarding

- Parent enters child name (or selects linked child if already in system).
- Parent provides:
  - school name,
  - school type (e.g. primary, secondary, international),
  - grade/year,
  - curriculum pathway if known (optional or guided picklist later),
  - subjects enrolled (or derived from class enrolment where applicable).

Data should be validated for format and completeness; sensitive free text should be minimised where structured choices exist.

### Staff/admin flow

- **HQ Admin**: can review and edit school records and student school profiles across branches.
- **Branch Supervisor**: can review and edit profiles for students in own branch; may link or normalise school records.
- **Teacher**: can view assigned students’ learning/school profile context needed for class and communication (read-heavy; edits only where policy allows).
- **Parent**: can view own child’s profile; may update limited fields if policy allows (e.g. school change, grade advance) with optional staff re-approval.
- **Student** (later): simplified read-only view of own pathway and goals where age-appropriate.

## 3) Data model

### Tables to reference or refine

| Table | Role |
|-------|------|
| `schools` | Canonical school identity and type. |
| `student_school_profiles` | Per-student link to school + grade/pathway. |
| `curriculum_mappings` | **Planned** — pathway/subject/module to objectives and tags (not in current draft SQL). |
| `students` | Core student record; links to branch/class. |
| `classes` | Subject, level, schedule context. |
| `learning_objectives` | **Planned** — reusable objective library keyed by pathway/subject/grade. |
| `student_learning_profiles` | **Planned** — aggregated tags, summaries, teacher notes for AI and UI. |

### Suggested fields (target state; some exist today, see §4)

**Schools**

- `school_name` (maps to `schools.name` today)
- `school_type` (exists as `schools.school_type`)
- `country` / `state` or region (likely **future** — not in current `schools` draft)

**Student school profile**

- `student_id`, `school_id` (exist)
- `grade_year` (align naming with existing `year_grade` or migrate to clearer name)
- `curriculum_pathway` (exists on `student_school_profiles`)
- `subject` / subjects — may live on enrolment/class rows or a junction table later
- `textbook_module` — **future** optional
- `learning_objective_tags` — **future** (array or junction)
- `strength_tags`, `weakness_tags` — **future**
- `teacher_notes_summary` — **future** (or derived from approved notes)

**Curriculum mappings (planned)**

- pathway, subject, grade band, module/unit, linked objective IDs, optional textbook reference.

## 4) Supabase readiness (draft schema today)

From `supabase/sql/001_mvp_schema.sql`:

**Already present**

- `schools`: `id`, `name`, `school_type`, timestamps.
- `student_school_profiles`: `id`, `student_id`, `school_id`, `year_grade`, `curriculum_pathway`, timestamps, unique `(student_id)`.

**Likely gaps for full onboarding and AI (no SQL in this doc — gaps only)**

- No `curriculum_mappings` table in current draft SQL.
- No `learning_objectives` or `student_learning_profiles` tables.
- `schools` lacks region (`country`/`state`), external IDs, or deduplication keys.
- Subjects enrolled may need explicit modelling (junction vs class-only).
- RLS policies for `schools` / `student_school_profiles` must be verified or added when onboarding is implemented.

Seed data (`005_fake_seed_data.sql`) may or may not populate these tables; verify before assuming UI reads.

## 5) RLS / access model (target)

- **HQ Admin**: full read/write on schools and student school profiles (and future mapping tables) within product rules.
- **Branch Supervisor**: manage students and profiles in own branch; create/update school links where allowed.
- **Teacher**: read assigned students’ school/profile context; limited or no direct edit unless policy allows.
- **Parent**: read own child’s profile; update limited fields if allowed (with optional staff approval workflow).
- **Student** (later): read simplified self profile only.

RLS must enforce branch and guardian links; frontend filtering is never a substitute for policy.

## 6) AI connection later (no implementation now)

This layer feeds secure, server-side AI (e.g. Supabase Edge Functions) with minimal, authorised context:

- **Parent comment draft**: student profile + school/type/pathway + recent teacher notes + class context.
- **Weekly progress report**: attendance/homework signals + objective tags from profile/mappings.
- **Homework marking assistant**: submission metadata + pathway/subject + marking rubric hints from `curriculum_mappings` / objectives.
- **Learning gap detector**: trends vs `student_learning_profiles` and tagged objectives.
- **Next-week recommendation**: weaknesses + pathway-appropriate practice templates.

All flows remain draft → teacher/staff approval → parent visibility; no automatic parent send.

## 7) Implementation sequence

| Phase | Focus |
|-------|--------|
| **1** | Planning and schema gap review (this doc + diff vs `001_mvp_schema.sql` and RLS). |
| **2** | Read-only display of student school profile in app (service layer, fake data first, then Supabase read with fallback). |
| **3** | Parent onboarding form (writes behind RLS + validation; still fake-first in dev). |
| **4** | Staff review/edit workflows and audit trail. |
| **5** | AI consumes this context only through secure Edge Function with role checks and least-data prompts. |

## 8) Next implementation prompt (schema gap review only)

Use this prompt for the next coding/documentation step:

> Perform a **read-only schema gap review** for school and curriculum onboarding.  
> Compare `docs/school-curriculum-onboarding-plan.md` and `docs/ai-learning-engine-architecture-plan.md` against `supabase/sql/001_mvp_schema.sql`, `003_rls_policies_draft.sql`, and `005_fake_seed_data.sql`.  
> Deliver a short markdown or checklist: which columns/tables exist, which are missing, RLS gaps for `schools` and `student_school_profiles`, and recommended **additive** migration order (no implementation of AI, Edge Functions, or UI in this step).  
> Do not change app UI, do not add AI API calls, do not add writes to production paths yet.

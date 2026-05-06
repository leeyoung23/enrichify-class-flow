# School and Curriculum Schema Gap Review

Read-only review of whether the current Supabase draft schema (001–006), RLS policies, and seed data support school/curriculum onboarding and future AI personalisation. **No SQL or application code changes are implied by this document.**

Sources reviewed: `supabase/sql/001_mvp_schema.sql`, `003_rls_policies_draft.sql`, `005_fake_seed_data.sql`, `006_fix_teacher_tasks_rls.sql`, `docs/school-curriculum-onboarding-plan.md`, `docs/ai-learning-engine-architecture-plan.md`, `docs/service-layer-migration-plan.md`, `docs/rls-test-checklist.md`.

---

## 1) Current schema coverage

| Area | In `001_mvp_schema.sql`? | Notes |
|------|---------------------------|--------|
| **`schools`** | Yes | `id`, `name`, `school_type`, timestamps. |
| **`student_school_profiles`** | Yes | `student_id` → `students`, `school_id` → `schools`, `year_grade`, `curriculum_pathway`, unique `(student_id)`. |
| **`students`** | Yes | `branch_id`, optional `class_id`, `full_name`, `student_code`, timestamps. |
| **`classes`** | Yes | `branch_id`, `name`, `subject`, `level`, `schedule_note`, timestamps. |
| **`curriculum_mappings`** | **No** | Not defined in draft schema. |
| **`learning_objectives`** | **No** | Not defined. |
| **`student_learning_profiles`** | **No** | Not defined. |

**Seed (`005_fake_seed_data.sql`):** One demo `schools` row and one `student_school_profiles` row for the fake demo student. Frontend read paths today may not yet query these tables; data exists for manual/API verification.

**006:** Replaces `teacher_tasks` / `teacher_task_assignments` RLS only; no change to school/curriculum tables.

---

## 2) Current useful fields

These already support a **thin** school/curriculum and class context:

| Concept | Where it lives |
|---------|------------------|
| School name | `schools.name` |
| School type | `schools.school_type` (nullable text) |
| Grade/year | `student_school_profiles.year_grade` |
| Curriculum pathway | `student_school_profiles.curriculum_pathway` |
| Class subject | `classes.subject` |
| Class level | `classes.level` |
| Student ↔ school link | `student_school_profiles` (one row per student) |
| Branch / class relationship | `students.branch_id`, `students.class_id`; `classes.branch_id` |
| Guardian link | `guardians` + `guardian_student_links` (parent ↔ child) |
| Homework / attendance signals | `homework_records`, `attendance_records` (status, dates, text fields) |
| Parent-facing comms lifecycle | `parent_comments.status`, `weekly_progress_reports.status` (`communication_status` enum: draft → approved/released/shared) |

**Limits:** One primary `class_id` per student does not model multi-subject enrolment. `homework_records` has no structured rubric, objective IDs, or marking outcome columns beyond generic `details` and `status`.

---

## 3) Gaps for AI personalisation

| Gap | Why it matters |
|-----|----------------|
| **No `curriculum_mappings`** | Cannot align pathway/subject/module to standard objectives or rubrics for prompts or gap analysis. |
| **No `learning_objectives`** | No reusable objective library; AI would rely on free text only. |
| **No `student_learning_profiles`** | No durable place for strength/weakness tags, summaries, or teacher-curated learning narrative for models or UI. |
| **No textbook/module mapping** | `textbook_module` (or equivalent) absent; pathway text alone is weak for marking assistant. |
| **Weak subject enrolment model** | Single `students.class_id` conflates “home class” with “all subjects”; multi-class or explicit subject enrolment not modelled. |
| **No structured strength/weakness / gap tags** | Would need new columns or junction tables; otherwise everything is unstructured. |
| **No `homework_marking_results`** | `homework_records` does not store per-criterion scores, AI draft marks, or teacher-validated outcomes separately from assignment metadata. |
| **No AI request/output logs** | No audit trail linking who requested what, which context snapshot, model/version, or raw vs redacted payload policy. |
| **No dedicated `teacher_approval_logs`** | Workflow partially inferable from `communication_status` transitions on comments/reports, but not a unified approval audit for AI drafts or multi-step reviews. |
| **No explicit “parent visibility” beyond comms tables** | Parent/student visibility for comments/reports is encoded in `status` + RLS, not a separate visibility dimension for future AI artefacts. |
| **RLS not applied to `schools` / `student_school_profiles` in 003** | These tables are **not** listed in `alter table … enable row level security` and have **no** policies in `003_rls_policies_draft.sql`. Until addressed, any client with table access could read or write broadly depending on default grants—**critical** before exposing these tables to the app or Edge Functions using user JWTs. |

---

## 4) Recommended schema additions (conceptual only — no SQL)

Below: purpose, key fields (suggested), relationships, who should access (target), why AI needs it.

### `curriculum_mappings`

- **Purpose:** Map pathway + grade band + subject (+ optional module) to canonical curriculum constructs and rubric hints.
- **Key fields:** pathway code, grade_band, subject, module_or_unit, optional textbook ref, links to objective IDs.
- **Relationships:** References or logical ties to `learning_objectives`; optional FK to `schools` if school-specific overrides exist.
- **Access:** HQ full manage; branch supervisor read (and limited edit if branch-specific); teachers read; parents/students typically no direct read (surfaced via reports/UI).
- **AI:** Grounds marking assistant, gap detector, and recommendations in consistent taxonomy instead of prose.

### `learning_objectives`

- **Purpose:** Reusable objective definitions (code, description, tags, difficulty).
- **Key fields:** id, pathway, subject, grade_band, statement, tag set, sort order.
- **Relationships:** Referenced by `curriculum_mappings` and junction tables to students/homework.
- **Access:** HQ/curriculum admin write; staff read; parents optional high-level read only if product allows.
- **AI:** Structured targets for prompts, gap tagging, and template reports.

### `student_learning_profiles`

- **Purpose:** Aggregated learning view per student (tags, summaries, last updated).
- **Key fields:** `student_id`, strength_tags, weakness_tags, objective_tag_refs, teacher_notes_summary, updated_by, timestamps.
- **Relationships:** `student_id` → `students` (one row or versioned—product decision).
- **Access:** HQ/supervisor/teachers per branch and assignment; parent/student read of **approved or redacted** slices only if policy allows.
- **AI:** Compact context for drafts without re-scraping all history each time.

### `student_subject_enrolments` (or equivalent)

- **Purpose:** Many-to-many student ↔ class (or subject) for realistic multi-subject onboarding.
- **Key fields:** `student_id`, `class_id` or subject key, start/end dates, primary flag optional.
- **Relationships:** `students`, `classes`.
- **Access:** Same branch/staff rules as students; parents see linked child rows.
- **AI:** Correct subject scope for homework and recommendations when student is in multiple classes.

### `homework_marking_results`

- **Purpose:** Store draft and final marking separate from assignment row.
- **Key fields:** `homework_record_id`, rubric_version, scores JSON or columns, ai_draft_text, teacher_final_text, validated_at, validated_by.
- **Relationships:** `homework_records`, `profiles`.
- **Access:** Teachers/HQ/supervisor per branch; parent/student only after teacher release policy.
- **AI:** Persists model output for review, diffing, and parent-facing release without overloading `homework_records`.

### `ai_generation_requests`

- **Purpose:** Audit “who asked for what” with minimal retention of sensitive prompt text (policy-driven).
- **Key fields:** requester_profile_id, feature_key (e.g. `parent_comment_draft`), entity refs (student_id, homework_id), status, created_at, correlation id.
- **Relationships:** Optional FKs to domain rows; no LLM keys in DB.
- **Access:** Staff/HQ audit; not parent-facing.
- **AI:** Compliance, debugging, rate limits, replay analysis without trusting client logs.

### `ai_generation_outputs`

- **Purpose:** Store draft outputs linked to requests and approval state.
- **Key fields:** request_id, draft_text or structured payload, model metadata (non-secret), approval_status, approved_by, released_at.
- **Relationships:** `ai_generation_requests`, optional links to `parent_comments` / `weekly_progress_reports` / `homework_marking_results`.
- **Access:** Teachers edit drafts; parents see only released artefacts per RLS.
- **AI:** Traceability from draft → teacher edit → parent-visible record.

### `ai_feedback_tags`

- **Purpose:** Normalised tags proposed or confirmed by AI/teacher (e.g. “fractions—denominator error”).
- **Key fields:** tag_code, display_label, category (strength/gap/behaviour).
- **Relationships:** Junction to homework results, objectives, or profiles.
- **Access:** Staff full; controlled exposure to parents.
- **AI:** Consistent analytics and prompt conditioning across features.

### `teacher_approval_logs`

- **Purpose:** Append-only or event log for approval/reject/release actions across comms and AI drafts.
- **Key fields:** actor_profile_id, entity_type, entity_id, from_status, to_status, note, created_at.
- **Relationships:** Polymorphic or separate nullable FKs per entity type.
- **Access:** HQ/supervisor/auditor; aligns with checklist “teacher approval gate.”
- **AI:** Proves human gate; supports disputes and quality review.

**Optional column-level additions (no migration in this doc):** `schools.country`, `schools.state_or_region`, external dedupe key; `student_school_profiles` source (parent vs staff), `updated_by_profile_id`, optional `approval_status` for parent-submitted profile changes.

---

## 5) RLS considerations

Target model (aligned with onboarding + AI plans + `rls-test-checklist.md`):

| Role | School / profile / curriculum context |
|------|----------------------------------------|
| **HQ** | Manage all branches’ students, schools, profiles, mappings (read/write per product). |
| **Branch Supervisor** | Manage students and profiles in own branch; read global curriculum tables if shared. |
| **Teacher** | Read school/profile + assigned students’ learning context; write only where product allows (e.g. notes, not arbitrary school record). |
| **Parent** | Read linked child’s profile and released reports; optional limited update to profile fields with staff re-review. |
| **Student** | Later: read simplified own pathway and released content only. |
| **AI / Edge Function** | Must use **user JWT or dedicated server pattern** that still respects RLS—or a locked-down service role with explicit row filters **never** exposed to the browser. Frontend must not hold service role keys. Functions should fetch only rows the acting role could read. |

**Current draft gap:** `003_rls_policies_draft.sql` does not enable RLS or define policies for `schools` or `student_school_profiles`. That must be remediated **before** any app or Edge Function reads/writes these tables with real JWTs. Extend `rls-test-checklist.md` execution when policies exist: teacher cannot read another branch’s profiles; parent cannot read another child’s profile; student self-only.

---

## 6) Implementation priority

1. **Priority 1 — School/curriculum profile fields + RLS**  
   Harden `schools` and `student_school_profiles` (enable RLS, policies, optional region/dedupe columns), and define insert/update rules for parent vs staff. Unblocks safe read-only UI and seed-aligned tests.

2. **Priority 2 — Subject enrolment + learning objective mapping**  
   `student_subject_enrolments` (or multi-class model), `learning_objectives`, `curriculum_mappings`, junctions for objective evidence.

3. **Priority 3 — Homework marking results**  
   Separate marking table from `homework_records`; links to objectives/rubric.

4. **Priority 4 — AI request/output logs**  
   After draft generation exists server-side: `ai_generation_requests`, `ai_generation_outputs`, optional `ai_feedback_tags`.

5. **Priority 5 — Analytics / recommendation tables**  
   Aggregated gap signals, recommendation history—only after stable tagged data and approvals.

---

## 7) Recommended next action

**Recommendation: A — Create a SQL patch (additive) for school/curriculum schema and RLS** (still to be authored in a follow-up task; this review does not ship SQL).

**Why not B or C first:**

- **B (Real auth/login first):** Demo auth already supports RLS smoke tests; production auth hardening remains important but does not fix missing tables or **missing RLS on school tables**. Shipping reads of `schools` / `student_school_profiles` without RLS would be unsafe.
- **C (AI Edge Function contract first):** Contracts need stable entity IDs, field names, and RLS guarantees for context queries. Defining endpoints before schema + policy invites rework and unsafe “fetch everything” patterns.

**Why A first:** Establishes the minimum secure data plane (columns + `enable row level security` + policies) for onboarding and read-only service methods, then subject/objective layers can stack cleanly. Matches Priority 1 above and the service-layer plan’s emphasis on branch/student reads before advanced features.

---

## Summary

The MVP schema **partially** supports school/curriculum context via `schools`, `student_school_profiles`, `students`, and `classes`, with fake seed coverage. It is **not** sufficient for full AI personalisation: curriculum/objective/profile/marking/log tables are absent, subject enrolment is underspecified, and **RLS is not drafted for the two school-related tables** in `003`. Next step should be an additive SQL migration plan (and checklist updates) before relying on these tables from the app or Edge Functions.

## Update note (draft SQL prepared)

Follow-up draft files now prepared for manual review/application:

- `supabase/sql/007_school_curriculum_ai_foundation.sql`
- `supabase/sql/008_school_curriculum_ai_fake_seed.sql`

These drafts are additive and include conservative RLS for new foundation tables plus `schools` and `student_school_profiles`.

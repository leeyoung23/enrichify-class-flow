# Supabase 007 / 008 Application Checkpoint

This document records the state of the project **after** `007_school_curriculum_ai_foundation.sql` and `008_school_curriculum_ai_fake_seed.sql` have been **manually applied** in Supabase. It is a planning and checkpoint note only—no runtime behaviour is implied.

## 1) What was applied

- **`007_school_curriculum_ai_foundation.sql`**  
  Additive school/curriculum and AI-foundation schema: new tables, indexes, RLS on `schools` and `student_school_profiles`, helper `student_branch_id` / `class_branch_id`, and conservative policies for staff vs parent/student visibility.

- **`008_school_curriculum_ai_fake_seed.sql`**  
  Minimal fake/demo rows for the new foundation tables, tied to existing **005** deterministic demo IDs and fake auth users (e.g. demo student, class, homework).

## 2) What new backend foundation now exists

| Area | Purpose (short) |
|------|------------------|
| **Curriculum mappings** | `curriculum_mappings` — pathway/grade/subject/module-style anchors for objectives and future AI context. |
| **Learning objectives** | `learning_objectives` — structured objectives linked to a curriculum mapping. |
| **Student subject enrolments** | `student_subject_enrolments` — many-to-many style enrolment beyond a single `students.class_id`. |
| **Student learning profiles** | `student_learning_profiles` — aggregated tags, notes, summaries for staff (RLS: staff-oriented in foundation draft). |
| **Homework marking results** | `homework_marking_results` — outcomes separate from `homework_records`; parent/student read when teacher-approved. |
| **AI generation requests / outputs** | `ai_generation_requests`, `ai_generation_outputs` — audit and draft lifecycle (staff-heavy; limited parent/student visibility when approved/released). |
| **AI feedback tags** | `ai_feedback_tags` — normalised tags from AI or staff workflows (staff-first access in foundation draft). |
| **Teacher approval logs** | `teacher_approval_logs` — append-style audit (may be **empty** until approval actions are logged). |

## 3) Fake / demo data only

All rows introduced by **008** are **explicitly fake** and for demo/testing only. No real children, parents, teachers, schools, homework, fees, or payments should be loaded into this path. Production onboarding remains out of scope for this checkpoint.

## 4) Frontend not yet using new AI / school foundation tables

The React app continues to use existing read-only slices (e.g. Sales Kit, branches, classes, students, dashboard summary) and **demo/local fallback** via `demoRole` and the service layer. **No new UI or service reads** are required to have been wired to `curriculum_mappings`, `learning_objectives`, `student_subject_enrolments`, `student_learning_profiles`, homework marking, or AI tracking tables as of this checkpoint.

## 5) No AI API connected

There is **no** OpenAI or other LLM API integration in the frontend or as a required runtime path. Any future AI orchestration remains planned for **server-side** patterns (e.g. Edge Functions) with keys **never** exposed to the client.

## 6) Write / upload paths still intentionally demo-only

Many buttons and flows remain **disconnected** from Supabase writes and storage uploads until dedicated write phases. This includes (non-exhaustively) real homework uploads, fee receipts, sales kit management from the app, and new foundation tables—**no obligation** for the preview app to persist to these tables yet.

---

## 7) Future parent portal: class photo / media planning

Product direction for a later phase (schema and storage **not** implemented in this checkpoint):

- **Primary experience:** Parent portal shows the **latest teacher-uploaded class photo first** (hero / cover), so parents immediately see current class life.
- **Update cadence:** Gallery updates **only when a teacher uploads** new media for that class—not on a parent-triggered refresh of arbitrary external sources.
- **History:** Parents can open a **history** or archive view of past class photos/media for classes their child is linked to, subject to policy.
- **Likely storage:** Supabase Storage bucket name candidate: **`class-photos`** (or similarly scoped bucket per environment), with path conventions that include `branch_id` / `class_id` / object id to support RLS-aligned policies later.
- **Likely metadata table:** **`class_media`** or **`class_photos`** (naming TBD) with fields such as: `id`, `branch_id`, `class_id`, `uploaded_by_profile_id` (teacher), `storage_bucket`, `storage_path`, `file_name`, `mime_type`, `caption`, `sort_order` / `is_cover`, `status` (e.g. draft / pending_review / approved / archived), `reviewed_by_profile_id`, `reviewed_at`, `visible_to_parents_at`, timestamps.
- **Roles (target):**
  - **Teacher:** upload and manage drafts for **assigned** classes only.
  - **Branch supervisor / HQ:** review, approve, archive, or hide media as needed.
  - **Parent:** see only **approved / visible** media for **linked child’s** classes; no access to other branches’ or unlinked classes’ assets.
  - **Student (optional later):** simplified view consistent with age and policy.
- **RLS / storage alignment:** Policies must mirror branch and class assignment; frontend filtering is never a substitute for RLS and signed URL rules.

This section is **planning only**—no bucket, table, or UI work is required by this document.

---

## 8) Recommended next milestones

1. **Smoke tests:** Extend `scripts/supabase-readonly-smoke-test.mjs` (and/or SQL verification) to optionally assert **read** visibility for roles against **007** tables (e.g. curriculum row count for teacher, denied rows for parent where policy expects), without enabling writes from the script.
2. **Class photo / media:** Finalise `class_media` / `class_photos` schema sketch and Storage policy draft; implement in a **later** SQL migration after security review.
3. **Auth / writes:** Either deepen **real auth / login** hardening or plan the **first intentional Supabase write flow** (e.g. school profile or class photo draft) behind RLS—still fake-data-first in non-prod.

---

*Last updated: checkpoint after manual application of 007 and 008 in Supabase.*

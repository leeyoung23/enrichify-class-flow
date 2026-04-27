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

**Parent portal — Class Memories (demo UI only):** **`ParentView`** includes a **Latest Memory** / **Class Memories History** block with **gradient placeholders and fake captions** (parent-facing wording: “Class Memories”, not “Class Photo” as the product label). This is **not** backed by `class_media`, Storage, or Supabase reads; **real Memories** remain a future migration + write/upload phase.

## 5) No AI API connected

There is **no** OpenAI or other LLM API integration in the frontend or as a required runtime path. Any future AI orchestration remains planned for **server-side** patterns (e.g. Edge Functions) with keys **never** exposed to the client.

## 6) Write / upload paths still intentionally demo-only

Many buttons and flows remain **disconnected** from Supabase writes and storage uploads until dedicated write phases. This includes (non-exhaustively) real homework uploads, fee receipts, sales kit management from the app, and new foundation tables—**no obligation** for the preview app to persist to these tables yet.

### Read-only smoke test coverage (007 / 008)

`npm run test:supabase:read` runs `scripts/supabase-readonly-smoke-test.mjs`, which signs in each fake role and performs **count-only** `select` head requests (no writes, no service role) against the **007 / 008** foundation tables as well as the existing Sales Kit / branches / classes / students checks. Expect **CHECK** lines for optional empty tables (e.g. `ai_feedback_tags` not seeded in 008, `teacher_approval_logs` often zero).

---

## 7) Future parent portal: **Class Memories** (“Memories”) planning

**Product-facing language:** In the parent portal, this experience is **Memories** or **Class Memories**. **“Class photo” is not the parent-facing name**—it is too narrow for what we want families to feel when they open the app.

Product direction for a later phase (schema and storage **not** implemented in this checkpoint):

- **Latest Memory:** The parent portal should lead with **Latest Memory**—the most recent **teacher-uploaded** Memory for the child’s class—so families immediately see something current and welcoming from class life.
- **What a Memory can be:** Memories can include **photos**, **short videos**, **captions**, and **learning evidence** (e.g. highlights of work or moments worth sharing), not only still images.
- **Update cadence:** **Class Memories** update **only when a teacher uploads** a new Memory for that class—not from parent-triggered pulls of arbitrary external sources.
- **Class Memories History:** Parents should be able to open **Class Memories History** to review **past Memories** for classes linked to their child, subject to policy (archive/hide rules TBD).
- **Internal / engineering naming:** Storage buckets and tables may still use technical names such as **`class-photos`** (bucket candidate) and **`class_media`** or **`class_photos`** (metadata tables)—these refer to **media records** in the database, not the label shown to parents.
- **Likely metadata table (internal):** **`class_media`** or **`class_photos`** (naming TBD) with fields such as: `id`, `branch_id`, `class_id`, `uploaded_by_profile_id` (teacher), `storage_bucket`, `storage_path`, `file_name`, `mime_type`, `caption`, `sort_order` / `is_cover`, `status` (e.g. draft / pending_review / approved / archived), `reviewed_by_profile_id`, `reviewed_at`, `visible_to_parents_at`, timestamps.
- **Roles (target):**
  - **Teacher:** uploads **Memories** for **assigned** classes only (drafts until reviewed if required).
  - **Branch supervisor / HQ:** review, approve, archive, or hide Memories as needed.
  - **Parent:** sees only **approved / visible** Memories for **linked child / class** context; no access to other branches’ or unlinked classes’ assets.
  - **Student (optional later):** simplified view consistent with age and policy.
- **RLS / storage alignment:** Policies must mirror branch and class assignment; frontend filtering is never a substitute for RLS and signed URL rules.

This section is **planning only** for schema and storage — the **demo** Memories block in **`ParentView`** does not satisfy or replace this work.

---

## 8) Recommended next milestones

1. **Smoke tests:** Foundation table read counts are covered in `scripts/supabase-readonly-smoke-test.mjs`; tighten assertions or add SQL verification as policies evolve.
2. **Class Memories (internal `class_media` / `class_photos`):** Finalise metadata schema sketch and Storage policy draft for teacher-uploaded Memories; implement in a **later** SQL migration after security review — the current UI is **placeholder only** (no bucket, no writes).
3. **Auth / writes:** Either deepen **real auth / login** hardening or plan the **first intentional Supabase write flow** (e.g. school profile or teacher Memory draft) behind RLS—still fake-data-first in non-prod.

**Staff Time Clock (related prototype):** A separate **demo** page **`/staff-time-clock`** exists for staff roles with **no** backend persistence; see `docs/staff-time-clock-roadmap.md`.

---

*Last updated: checkpoint after manual application of 007 and 008 in Supabase.*

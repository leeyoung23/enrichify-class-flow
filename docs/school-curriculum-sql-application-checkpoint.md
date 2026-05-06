# School/Curriculum SQL application checkpoint

This checkpoint records manual dev application status for school/curriculum onboarding foundation.

Scope guardrails:

- Documentation/checkpoint only.
- No app UI changes.
- No runtime logic changes.
- No new runtime services.
- No new SQL in this step.
- No uploads or AI API usage in this step.
- Fake/dev-safe data only.

---

## 1) What was applied

Manual SQL patch applied in Supabase dev:

- `supabase/sql/012_school_curriculum_foundation.sql`

---

## 2) Manual Supabase verification

Manual verification confirms:

- `schools` table exists.
- `curriculum_profiles` table exists.
- `student_school_profiles` table exists.
- `class_curriculum_assignments` table exists.
- `learning_goals` table exists.
- RLS policies exist for the school/curriculum onboarding tables.
- Expected onboarding columns exist, including normalized school/profile fields and curriculum assignment/goal fields.

---

## 3) Product/security intent

School/curriculum onboarding foundation is intended to:

- establish curriculum-aware learning evidence context,
- support future AI modules (parent comments, weekly reports, homework feedback, learning gap detection, next-week recommendations),
- keep role scope strict and reviewable under RLS.

Role intent to preserve:

- HQ: manage/read all onboarding rows.
- Branch supervisor: manage/read own-branch scope.
- Teacher: read assigned class/student curriculum context.
- Parent: read simplified linked-child context only.
- Student: optional simplified own-context read only.

Security constraints to preserve:

- Parent/student cannot manage school/curriculum templates.
- No service role usage in frontend paths.

---

## 4) Current implementation boundary

Still not implemented:

- `Classes` curriculum assignment UI,
- `Students` school profile UI,
- `ParentView` learning focus summary,
- AI context integration for school/curriculum domain,
- production curriculum data import/onboarding pipeline.

Now implemented in this phase:

- school/curriculum read service methods in `src/services/supabaseReadService.js`,
- school/curriculum read smoke test script `scripts/supabase-school-curriculum-read-smoke-test.mjs`,
- npm script `test:supabase:school-curriculum:read`.

---

## 5) Recommended next milestone

Recommended next milestone:

- **Classes/Students/ParentView curriculum UI wiring (after read smoke stability)**

Why this next:

- SQL/RLS foundation is applied in dev and read service + smoke test are now present.
- Next value step is safely exposing role-scoped read context into staff/parent UI surfaces.
- AI context integration should still wait until UI/read behavior is stable and reviewed.

---

## 6) Status notes for related docs

Current status alignment:

- `012` is applied in dev (manual apply complete).
- `013` fake seed draft now exists at `supabase/sql/013_school_curriculum_fake_seed_data.sql`.
- `013` is manual/dev-only and not applied automatically.
- No school/curriculum UI exists yet.
- No school/curriculum runtime service exists yet.
- AI integration remains future.
- Continue using fake/dev-safe data only for verification and smoke preparation.

---

Checkpoint status: SQL/RLS onboarding foundation is manually applied in dev and ready for read-service + smoke-test milestone.

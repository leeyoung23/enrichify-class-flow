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

- school/curriculum read service,
- school/curriculum smoke test script,
- `Classes` curriculum assignment UI,
- `Students` school profile UI,
- `ParentView` learning focus summary,
- AI context integration for school/curriculum domain,
- production curriculum data import/onboarding pipeline.

---

## 5) Recommended next milestone

Recommended next milestone:

- **School/curriculum read service + smoke test**

Why this next:

- SQL/RLS foundation is now applied in dev.
- Highest immediate risk is proving role-scoped read correctness before any UI wiring.
- UI should follow only after read behavior is validated for HQ/supervisor/teacher/parent/student boundaries.

---

## 6) Status notes for related docs

Current status alignment:

- `012` is applied in dev (manual apply complete).
- No school/curriculum UI exists yet.
- No school/curriculum runtime service exists yet.
- AI integration remains future.
- Continue using fake/dev-safe data only for verification and smoke preparation.

---

Checkpoint status: SQL/RLS onboarding foundation is manually applied in dev and ready for read-service + smoke-test milestone.

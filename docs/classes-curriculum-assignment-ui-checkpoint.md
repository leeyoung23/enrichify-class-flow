# Classes Curriculum Assignment UI Checkpoint

Checkpoint scope: documentation only for the `Classes` curriculum assignment/edit UI milestone.

Scope guardrails preserved:

- No app UI changes in this step.
- No runtime logic changes in this step.
- No new services.
- No Supabase SQL or RLS policy changes.
- No AI API calls.
- No service role usage in frontend.
- Fake/dev-safe posture preserved.

---

## 1) What was implemented

The `Classes` page now includes curriculum assignment/edit controls (minimal, role-scoped) using existing school/curriculum write services.

Current status covered by this checkpoint:

- `Classes` read-only curriculum context preview remains in place.
- `assignCurriculumToClass(...)` and `updateClassCurriculumAssignment(...)` are already available and used.
- school/curriculum read + write smoke tests are passing.
- `Classes` curriculum assign/edit UI is now wired for HQ admin and branch supervisor only.
- teacher/parent/student remain without assign/edit controls.
- demo/local mode remains non-writing to Supabase.

---

## 2) Files changed for this UI milestone

- `src/pages/Classes.jsx`
- `docs/curriculum-assignment-edit-ui-plan.md`
- `docs/school-curriculum-onboarding-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

---

## 3) Assign/edit UI behavior

Within each class card's `Curriculum Context` section:

- compact assign/edit controls are available to allowed roles,
- curriculum profile select,
- learning focus input,
- term label input,
- optional start date,
- optional end date,
- `Save` / `Cancel`,
- mobile-first stacked layout to keep controls readable and touch-friendly on phone widths.

---

## 4) Role / demoRole behavior

- HQ admin can assign/edit.
- Branch supervisor can assign/edit within policy/RLS scope.
- Teacher/parent/student do not see assign/edit controls.
- demo/local mode shows safe local-only messaging and does not call Supabase write methods.

---

## 5) Write behavior

- `updateClassCurriculumAssignment(...)` is used when an existing assignment exists and curriculum profile is unchanged.
- `assignCurriculumToClass(...)` is used when profile is changed or when no assignment exists.
- Success path: success toast + curriculum context refresh.
- Failure path: safe error toast/message.

---

## 6) Validation and error handling

- `classId` UUID validation.
- `curriculumProfileId` UUID validation.
- Optional text fields are trimmed before write.
- Date rule: `endDate` cannot be before `startDate` when both are provided.
- No guessed IDs; write calls require explicit valid IDs.

---

## 7) Security / RLS notes

- Anon client + JWT only.
- No service role key in frontend.
- RLS policies remain source of truth for branch/HQ write scope.
- Parent/student cannot write class curriculum assignments.
- Teacher write remains blocked in current MVP policy shape.

---

## 8) What remains

- `Students` school profile edit UI.
- Curriculum profile/template creation UI.
- Parent-facing polish if needed.
- AI context integration.
- Production curriculum data import path.

---

## 9) Recommended next milestone

Recommendation: **A. Students school profile edit UI planning**.

Why this is the best next step:

- Class-level assignment edit is now wired, so the class layer of school/curriculum context is complete for MVP staff workflow.
- Student-level profile editing is the direct next layer needed to complete class-to-student curriculum context continuity.
- This keeps sequencing aligned with the existing phased plan and avoids jumping into AI/provider work before student profile UX and controls are defined.
- Homework pipeline and production audit remain important, but curriculum onboarding continuity is strongest when student profile edit planning follows immediately after class assignment UI completion.

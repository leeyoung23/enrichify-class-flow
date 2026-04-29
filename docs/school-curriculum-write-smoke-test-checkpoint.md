# School Curriculum Write Smoke Test Checkpoint

Checkpoint scope: documentation only for the class curriculum assignment write-service phase.

Constraints preserved:

- No app UI changes.
- No runtime logic changes in this checkpoint step.
- No Supabase SQL or RLS policy changes.
- No service role usage in frontend.
- Fake/dev data only.

---

## 1) What was implemented

The class curriculum assignment write path is now implemented and validated at service layer + smoke-test level:

- Added class assignment write methods in `supabaseWriteService`.
- Added focused write smoke script for role-aware RLS validation.
- Added npm script entry for repeatable smoke execution.
- Updated planning/checklist/handoff docs to reflect write-phase completion and remaining UI work.

---

## 2) Files changed in write-phase implementation

- `src/services/supabaseWriteService.js`
- `scripts/supabase-school-curriculum-write-smoke-test.mjs`
- `package.json`
- `docs/curriculum-assignment-edit-ui-plan.md`
- `docs/school-curriculum-onboarding-plan.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

---

## 3) Write methods added

- `assignCurriculumToClass({ classId, curriculumProfileId, learningFocus, termLabel, startDate, endDate })`
- `updateClassCurriculumAssignment({ assignmentId, learningFocus, termLabel, startDate, endDate })`

---

## 4) Assignment/upsert behavior

Implemented conservative write logic:

1. Select existing assignment by `class_id`.
2. Update existing assignment if found (avoid duplicate class assignment row for same class in normal flow).
3. Insert new assignment if no class assignment exists.
4. `updateClassCurriculumAssignment(...)` updates safe writable fields only:
   - `learning_focus`
   - `term_label`
   - `start_date`
   - `end_date`

Additional write-safety behavior:

- UUID validation for required IDs.
- Date format/range sanity checks.
- Stable service return shape: `{ data, error }`.

---

## 5) Smoke test proof

From the focused write smoke run:

- Branch supervisor own-branch write: PASS
- HQ write (optional check): PASS
- Parent write blocked: PASS
- Student write blocked: PASS
- Teacher write blocked (MVP policy): PASS
- Read-back verification via `getClassLearningContext(...)`: PASS
- Cleanup/revert to original fake assignment values: PASS

Script reference:

- `npm run test:supabase:school-curriculum:write`

---

## 6) Security / RLS notes

- Frontend/service usage remains Supabase anon client + JWT only.
- No service role key used in frontend.
- RLS policies remain the authority for read/write scope decisions.
- Validation uses fake/demo users and fake/dev data only.

---

## 7) What remains

- `Classes` curriculum assign/edit UI wiring.
- `Students` school profile edit wiring.
- Parent-facing copy/polish as needed.
- AI context integration for curriculum-aware generation workflows.

---

## 8) Recommended next milestone

Recommended next milestone: **Classes curriculum assign/edit UI**.

Why this is next:

- The write path is now proven with role-aware smoke validation.
- `Classes` curriculum context preview already exists as read-only.
- Wiring assign/edit controls on `Classes` completes the class-level curriculum management loop.

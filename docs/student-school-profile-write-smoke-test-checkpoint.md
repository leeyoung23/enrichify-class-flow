# Student School Profile Write Smoke Test Checkpoint

Checkpoint scope: documentation only for the student school profile write-service phase.

Constraints preserved:

- No app UI changes.
- No runtime logic changes in this checkpoint step.
- No Supabase SQL or RLS policy changes.
- No service role usage in frontend.
- Fake/dev data only.

---

## 1) What was implemented

Student school profile write path is now implemented and validated at service layer + smoke-test level:

- Added student school profile upsert write method in `supabaseWriteService`.
- Added focused write smoke script for role-aware RLS validation.
- Added npm script entry for repeatable smoke execution.
- Updated planning/checklist/handoff docs for this write-phase checkpoint and remaining UI/future phases.

---

## 2) Files changed in write-phase implementation

- `src/services/supabaseWriteService.js`
- `scripts/supabase-school-profile-write-smoke-test.mjs`
- `package.json`
- `docs/students-school-profile-edit-ui-plan.md`
- `docs/school-curriculum-onboarding-plan.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

---

## 3) Write method added

- `upsertStudentSchoolProfile({ studentId, schoolId, schoolName, gradeYear, curriculumProfileId, parentGoals, teacherNotes })`

---

## 4) Upsert behavior

Conservative upsert behavior implemented:

1. Select existing row by `student_id`.
2. Update safe fields if found.
3. Insert new row if not found.
4. Preserve one-profile-per-student MVP model.
5. Do not create `schools` or `curriculum_profiles` in this method.

Write safety in method:

- UUID validation for required/optional UUID fields.
- Nullable foreign-key handling for `schoolId` and `curriculumProfileId`.
- Trim/normalize text fields and write allowlisted keys only.
- Stable return shape `{ data, error }`.

---

## 5) Smoke test proof

From focused write smoke run:

- Branch supervisor own-branch write: PASS
- HQ write (optional check): PASS
- Parent write blocked: PASS
- Student write blocked: PASS
- Teacher write blocked (MVP policy): PASS
- Read-back verification via `getStudentLearningContext(...)`: PASS
- Cleanup/revert to original fake values: PASS

Script reference:

- `npm run test:supabase:school-profile:write`

---

## 6) Security / RLS notes

- Frontend/service usage remains anon client + JWT only.
- No service role key used in frontend.
- RLS policies remain source of truth for branch/HQ scope.
- Validation and smoke coverage use fake/dev data only.

---

## 7) What remains

- `Students` school profile edit UI.
- Homework upload/review pipeline.
- AI curriculum-context integration.
- Production curriculum data import path.

---

## 8) Recommended next milestone

Recommended next milestone: **Students school profile edit UI**.

Why this is next:

- Student school profile write path is now proven with role-aware smoke validation.
- `Students` school/learning context preview already exists in read-only form.
- Wiring profile edit controls on `Students` completes the student-level curriculum management loop before homework/AI expansion.

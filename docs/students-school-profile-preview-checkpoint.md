# Students School Profile Preview Checkpoint

This checkpoint documents the read-only School / Learning Context preview now wired on the `Students` page.

Scope guardrails:

- Documentation/checkpoint only.
- No app UI changes in this step.
- No runtime logic changes in this step.
- No new services.
- No Supabase SQL or RLS policy changes.
- Fake/dev-safe data posture preserved.

---

## 1) What was implemented

A read-only School / Learning Context preview was implemented inside student cards on `Students`.

Current implementation status:

- `Students` now surfaces school/curriculum context in read-only form,
- context reads use existing school/curriculum read services only,
- demo/local behavior remains explicit and safe,
- no write/edit controls were introduced.

---

## 2) Files changed

- `src/pages/Students.jsx`
- `docs/school-curriculum-onboarding-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

---

## 3) UI behavior

Each student card now includes a read-only `School / Learning Context` section.

When context exists, the section displays:

- school name,
- grade/year,
- curriculum profile name,
- subject,
- level/year/grade,
- skill focus,
- parent goals,
- teacher notes,
- active student-level learning goals.

When no student school profile exists:

- safe empty state is shown: `No school profile added yet.`

Not included (intentionally):

- no edit controls,
- no create controls,
- no update controls,
- no delete controls.

---

## 4) Data/read behavior

Read-only data path uses existing methods only:

- `getStudentLearningContext({ studentId })`
- `listCurriculumProfiles({})`

Safety and access constraints:

- UUID guard is applied for student IDs before Supabase curriculum reads,
- anon client + RLS only,
- no service-role usage,
- no direct SQL from UI.

---

## 5) Role and demo/local behavior

Role behavior:

- HQ / Branch Supervisor / Teacher visibility is enforced by existing RLS.
- Parent/Student route behavior is unchanged.

demoRole/local behavior:

- demo/local mode shows clearly labeled placeholder school/learning context,
- Supabase curriculum reads are not called in demo/local mode,
- existing demo/local fallback behavior remains intact.

---

## 6) What remains unwired

- `ParentView` learning focus summary,
- curriculum assignment/edit UI,
- school/curriculum write flows,
- AI curriculum-context integration.

---

## 7) Recommended next milestone

Recommended next milestone:

- `ParentView` learning focus summary.

Why this next:

- parent-facing learning focus is the next bridge from internal curriculum data to parent trust,
- it prepares cleaner and safer context for future AI weekly report and parent comment flows.

---

Checkpoint status: students read-only school profile preview is documented and ready for parent-facing learning context wiring.

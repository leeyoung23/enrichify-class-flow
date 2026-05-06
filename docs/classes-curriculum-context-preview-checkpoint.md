# Classes Curriculum Context Preview Checkpoint

This checkpoint documents the read-only curriculum context preview now wired on the `Classes` page.

Scope guardrails:

- Documentation/checkpoint only.
- No app UI changes in this step.
- No runtime logic changes in this step.
- No new services.
- No Supabase SQL or RLS policy changes.
- Fake/dev-safe data posture preserved.

---

## 1) What was implemented

A read-only curriculum context preview was implemented on class cards in `Classes`.

Current implementation status:

- school/curriculum foundation (`012`) is applied in dev,
- fake school/curriculum seed (`013`) is applied in dev,
- school/curriculum read methods are available,
- school/curriculum read smoke test passes,
- class-level curriculum context can now be previewed without any write controls.

---

## 2) Files changed

- `src/pages/Classes.jsx`
- `docs/school-curriculum-onboarding-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

---

## 3) UI behavior

Inside each class card, a read-only `Curriculum Context` section is shown.

When curriculum context exists, the section displays:

- curriculum profile name,
- subject,
- level/year/grade,
- skill focus,
- assessment style (if available),
- class learning focus (if available),
- active class-level learning goals (if available).

When no curriculum assignment/profile is available:

- safe empty state is shown: `No curriculum profile assigned yet.`

Not included (intentionally):

- no edit controls,
- no create/assign controls,
- no delete controls.

---

## 4) Data/read behavior

Read-only data path uses existing methods only:

- `getClassLearningContext({ classId })`
- `listCurriculumProfiles({})` (to resolve profile metadata from assignment profile IDs)

Safety and access constraints:

- class ID UUID guard is applied before Supabase curriculum context reads,
- anon client + RLS only,
- no service-role usage,
- no direct SQL from UI.

---

## 5) Role and demo/local behavior

Role behavior:

- HQ / Branch Supervisor / Teacher visibility is enforced by existing RLS.
- Parent/Student route behavior is unchanged (no special `Classes` handling added).

demoRole/local behavior:

- demo/local mode shows clearly labeled demo placeholder curriculum context,
- Supabase curriculum reads are not called in demo/local mode,
- existing demo/local fallback behavior remains intact.

---

## 6) What remains unwired

- `Students` page school profile preview,
- `ParentView` learning focus summary,
- curriculum assignment/edit UI,
- AI curriculum-context integration.

---

## 7) Recommended next milestone

Recommended next milestone:

- `Students` page school profile preview.

Why this next:

- student-level school/curriculum profile is the natural next layer after class-level context,
- it provides the linkage needed for `ParentView` learning focus summary,
- it prepares cleaner context inputs for future AI personalization milestones.

---

Checkpoint status: classes read-only curriculum context preview is documented and ready for the next student-level preview milestone.

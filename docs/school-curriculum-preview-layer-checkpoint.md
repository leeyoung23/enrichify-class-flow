# School/Curriculum Preview Layer Checkpoint

This checkpoint records the current school/curriculum **read-only preview layer** status across SQL foundation, fake seed, read services, smoke validation, and UI preview surfaces.

Scope guardrails:

- Documentation/checkpoint only.
- No app UI changes in this step.
- No runtime logic changes in this step.
- No new services.
- No Supabase SQL or RLS policy changes.
- Fake/dev-safe data posture preserved.

---

## 1) What was implemented

Completed preview-layer foundation and read-only rollout:

- SQL/RLS foundation applied (`012`).
- Fake school/curriculum seed data applied (`013`).
- School/curriculum read service methods added and in use.
- Role-based school/curriculum read smoke test added and passing.
- `Classes` page read-only curriculum context preview implemented.
- `Students` page read-only school/learning context preview implemented.
- `ParentView` parent-friendly Learning Focus summary implemented.

---

## 2) Files/areas involved

- `supabase/sql/012_school_curriculum_foundation.sql`
- `supabase/sql/013_school_curriculum_fake_seed_data.sql`
- `src/services/supabaseReadService.js`
- `src/pages/Classes.jsx`
- `src/pages/Students.jsx`
- `src/pages/ParentView.jsx`
- `scripts/supabase-school-curriculum-read-smoke-test.mjs`
- `docs/classes-curriculum-context-preview-checkpoint.md`
- `docs/students-school-profile-preview-checkpoint.md`

---

## 3) Classes page behavior

`Classes` now provides a read-only `Curriculum Context` section:

- shows curriculum profile name,
- subject,
- level/year/grade,
- skill focus,
- assessment style (if available),
- class learning focus,
- active class-level goals.

Control boundary:

- no edit/create/delete controls.

---

## 4) Students page behavior

`Students` now provides a read-only `School / Learning Context` section:

- shows school name,
- grade/year,
- curriculum profile and subject,
- skill focus,
- parent goals,
- teacher notes,
- active student-level goals.

Control boundary:

- no edit/create/update/delete controls.

---

## 5) ParentView behavior

`ParentView` now includes a parent-friendly `Learning Focus` card:

- school/year,
- profile,
- subject,
- skill focus,
- “This term’s focus”,
- current learning goals.

Parent-facing quality and safety:

- warm empty state is shown when context is not available,
- no internal IDs,
- no admin-heavy/technical labels.

---

## 6) Data/RLS/security

Current data/security posture:

- anon client + JWT only,
- no service role usage in frontend,
- RLS-scoped reads,
- `demoRole` remains local/demo only,
- parent reads simplified linked-child context only,
- teacher reads assigned class/student context,
- branch supervisor reads own-branch scope,
- HQ has broader visibility per policy intent.

---

## 7) AI significance

This preview layer is the first curriculum-aware context bridge in product UI.

Why it matters for future AI quality:

- prepares curriculum-grounded AI parent comments,
- prepares curriculum-aware AI weekly reports,
- prepares future homework feedback context,
- prepares learning gap detection context,
- reduces generic AI output by grounding prompts in school/profile/focus/goal context.

---

## 8) Known limitations

- no curriculum assignment/edit UI yet,
- no school profile edit UI yet,
- no parent-editable goals,
- no AI context injection wiring yet,
- fake seed data only (dev-safe),
- production curriculum data import/onboarding pipeline not done,
- no full iOS/Android QA pass completed yet.

---

## 9) Recommended next milestone

Recommended option: **A. Curriculum assignment/edit UI**

Why A is best now:

- read-only preview is complete across class, student, and parent surfaces,
- the next value step is controlled staff write capability for assignment/profile maintenance,
- without write flows, previews risk becoming stale and manually dependent,
- AI/weekly workflows benefit more from trustworthy maintained curriculum context than from adding new AI plumbing first.

---

## 10) Next implementation prompt

Copy-paste prompt for the recommended next milestone:

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
Curriculum assignment/edit UI planning + first safe write slice only.

Constraints:
- Do not change Supabase SQL or RLS in this step unless a blocker is confirmed.
- Do not use service role in frontend.
- Keep anon client + JWT + RLS only.
- Keep demoRole/local fallback behavior.
- Do not add AI APIs.
- Do not use real student/parent/teacher/school/curriculum/homework/photo/payment data.
- Do not commit .env.local.

Goals:
1) Add staff-only UI entry points for curriculum assignment/profile maintenance (HQ + branch supervisor scope only).
2) Keep teacher/parent/student write access blocked.
3) Preserve existing read-only preview cards in Classes/Students/ParentView.
4) Add explicit empty/success/error states for write actions.
5) Add/update focused docs/checkpoint notes for this write phase.

Validation:
- Before tests: git diff --name-only
- Run: npm run build
- Run: npm run lint
- Run: npm run typecheck
- Run: npm run test:supabase:school-curriculum:read
- Run only targeted extra validation if shared runtime/auth/service files change.
```

---

Checkpoint status: school/curriculum preview layer is complete for read-only visibility and ready for a controlled write-phase milestone.

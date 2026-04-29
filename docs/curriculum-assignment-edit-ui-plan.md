# Curriculum Assignment/Edit UI Plan

Planning-only document for curriculum assignment/edit write-phase preparation.

Scope constraints:

- No app UI changes in this step.
- No runtime write code in this step.
- No Supabase SQL or RLS changes in this step.
- No uploads and no AI API usage in this step.
- Fake/dev-safe data only.

---

## 1) Current state

Current baseline before write-phase work:

- Read-only previews exist on:
  - `Classes` (Curriculum Context),
  - `Students` (School / Learning Context),
  - `ParentView` (Learning Focus summary).
- `class_curriculum_assignments` and `student_school_profiles` tables exist under applied foundation.
- Read methods exist in `supabaseReadService`.
- No curriculum assignment/edit UI exists yet.
- No school profile edit UI exists yet.
- No school/curriculum write service/smoke path exists yet.

---

## 2) Product principle

Curriculum context editing must be careful because it affects:

- class/staff planning visibility,
- parent-facing learning focus language,
- future AI context quality.

Product language principle:

- Internal staff can see detailed operational fields.
- Parents should only see simplified, supportive learning focus summaries.
- Avoid parent-facing copy that feels judgmental, diagnostic, or labels children.

---

## 3) Role permissions (planned behavior)

### HQ

- Manage curriculum profiles/templates (global governance).
- Assign curriculum to any class/student scope under policy.

### Branch supervisor

- Manage own-branch class assignments.
- Manage own-branch student school profiles.

### Teacher

- MVP recommendation: read-only for direct curriculum assignment/profile writes.
- Later option: limited suggestion/request workflow for supervisor/HQ review.

### Parent

- No edit rights.

### Student

- No edit rights.

---

## 4) First write target recommendation

Recommended first write target: **A. Class curriculum assignment first**.

Why A first:

- It updates one shared class context and immediately improves multiple surfaces (`Classes`, `Students`, `ParentView`) without per-student editing overhead.
- It has clearer operational ownership (HQ/branch supervisor) and lower accidental parent-facing sensitivity than direct student profile note editing as first write slice.
- It aligns with existing branch/class RLS scope and is easier to validate in focused write smoke tests.

---

## 5) Service method plan

Future write methods (anon client + RLS only, no service role):

### Phase 2 target (implement first)

- `assignCurriculumToClass({ classId, curriculumProfileId, learningFocus, termLabel, startDate, endDate })`
- `updateClassCurriculumAssignment({ assignmentId, learningFocus, termLabel, startDate, endDate })`

### Next-phase methods (after class write path is stable)

- `updateStudentSchoolProfile({ studentId, schoolId, schoolName, gradeYear, curriculumProfileId, parentGoals, teacherNotes })`
- `createCurriculumProfile(...)` (later, after governance UX and approval boundaries are defined)

Service design rules:

- Return `{ data, error }` consistently.
- Validate UUID fields before write attempts.
- Validate safe writable fields (trim text, bounded lengths, date range checks, allowlisted keys only).
- Reject raw ID guessing/malformed IDs early.
- Keep payloads small and explicit per method.

---

## 6) Smoke test plan

Future script:

- `scripts/supabase-school-curriculum-write-smoke-test.mjs`

Planned flow (fake data only):

1. Sign in as branch supervisor fake user.
2. Assign fake curriculum profile to own-branch fake class.
3. Verify read-back through existing read methods and that `Classes` preview-relevant fields reflect changes.
4. Verify parent/student cannot write curriculum assignment data.
5. Verify teacher write blocked if MVP remains read-only.
6. Optionally verify HQ write allowed.
7. Revert changed assignment row(s) to original values at end of test.

Safety:

- Use deterministic fake IDs only.
- No real identities or production data.
- No SQL apply from script (client API only).

---

## 7) UI placement recommendation

Recommended sequence:

1. `Classes` page first: class curriculum assignment/edit controls for HQ/branch supervisor.
2. `Students` page later: student school profile edit controls.
3. Admin/settings later: curriculum profile/template creation/governance.

Reason:

- This matches lowest-risk highest-impact write rollout from shared class context to finer-grained student context.

---

## 8) UI design direction (Classes first)

For `Classes` write slice:

- Keep existing read-only Curriculum Context preview intact.
- Add compact `Edit/Assign Curriculum` action for HQ/branch supervisor only.
- In panel/modal:
  - select curriculum profile,
  - edit learning focus,
  - edit term label,
  - optional date range.
- Include save/cancel with clear success/error messaging.
- No parent-facing raw IDs.
- Maintain mobile/tablet readability with stacked controls and clear labels.

---

## 9) Parent impact

Expected impact:

- `ParentView` Learning Focus updates after approved assignment changes.
- Parent experience remains simplified and supportive.
- No internal IDs, branch mechanics, or template-management details exposed to parents.

---

## 10) AI impact

Write-phase assignment/edit improves AI readiness by increasing context reliability:

- AI parent comments can later reference maintained class/student curriculum context.
- AI weekly reports can align with current class focus/goals.
- Homework feedback and learning gap detection can use better-grounded context.
- No AI calls are added in this phase.

---

## 11) Risks / constraints

Key risks to mitigate:

- Overexposing global templates beyond role scope.
- Accidental cross-branch edits.
- Teacher direct edits to parent-visible context without intended approval path.
- Drift between read-only previews and actual managed records.
- Breaking `demoRole` local-only behavior.

Control constraints:

- Preserve anon client + JWT + RLS model.
- Preserve demo/local fallback.
- No service role in frontend.

---

## 12) Recommended implementation sequence

1. **Phase 1:** this plan (current document).
2. **Phase 2:** write service + write smoke test for class assignment only.
3. **Phase 3:** `Classes` page assign/edit UI.
4. **Phase 4:** `Students` page school profile edit plan/service.
5. **Phase 5:** `ParentView`/AI context polish.

---

## 13) Next implementation prompt (Phase 2 only)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
Phase 2 only — implement curriculum class-assignment write service + focused write smoke test.

Constraints:
- Do not change app UI in this step.
- Do not change Supabase SQL or RLS policies in this step.
- Do not add AI APIs.
- Do not use service role key in frontend.
- Use anon client + JWT + RLS only.
- Keep demoRole/local fallback unchanged.
- Use fake/dev data only.
- Do not commit .env.local.

Implement:
1) In `src/services/supabaseWriteService.js`, add:
   - assignCurriculumToClass({ classId, curriculumProfileId, learningFocus, termLabel, startDate, endDate })
   - updateClassCurriculumAssignment({ assignmentId, learningFocus, termLabel, startDate, endDate })
2) Enforce input validation:
   - UUID checks
   - safe field normalization (trim, null handling)
   - date range sanity (start <= end when both provided)
3) Return shape: { data, error }
4) Add write smoke script:
   - `scripts/supabase-school-curriculum-write-smoke-test.mjs`
   - branch supervisor write to own-branch fake class
   - verify read-back
   - verify parent/student write blocked
   - verify teacher write blocked (MVP read-only)
   - optional HQ write check
   - revert to original assignment values
5) Add npm script:
   - `test:supabase:school-curriculum:write`
6) Add/update one doc/checkpoint for this write-service phase.

Validation efficiency:
- Before tests: git diff --name-only
- Run: npm run build
- Run: npm run lint
- Run: npm run typecheck
- Run: npm run test:supabase:school-curriculum:read
- Run: npm run test:supabase:school-curriculum:write
- Do not run unrelated full suites.
```

---

Planning status: ready for Phase 2 class-assignment write service and smoke validation.

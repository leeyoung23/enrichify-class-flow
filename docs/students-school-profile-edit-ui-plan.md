# Students School Profile Edit UI Plan

Planning-only document for the next student-level school/curriculum milestone.

Scope constraints:

- No app UI changes in this step.
- No runtime write code in this step.
- No Supabase SQL or RLS policy changes in this step.
- No uploads and no AI API usage in this step.
- Fake/dev-safe data only.

---

## 1) Current state

Current baseline before student profile write-phase work:

- `Students` page has read-only `School / Learning Context` preview.
- `student_school_profiles` table exists and is RLS-enabled.
- `curriculum_profiles` table exists and is RLS-enabled.
- School/curriculum read methods already exist in `supabaseReadService`.
- No `Students` school profile edit UI exists yet.
- No student school profile write method/smoke test exists yet.

---

## 2) Product principle

Student school profile context should improve personalised learning evidence quality without turning the profile into a labeling tool.

Principles:

- Student school profile context helps teachers/HQ understand each child’s school/year/curriculum context.
- Parent-facing output should remain simple, supportive, and actionable.
- Language should avoid making the child feel labeled, judged, or pathologized.
- Internal notes (`teacher_notes`) should not automatically become parent-facing copy.

---

## 3) Role permissions (planned behavior)

### HQ

- Can manage student school profiles across branches.

### Branch supervisor

- Can manage own-branch student school profiles.

### Teacher

- MVP recommendation: remain read-only for direct profile writes.
- Future option: suggestion/request flow for supervisor/HQ approval.

### Parent

- No direct edit in this phase.
- Future option: parent goals input as a controlled request flow, not direct overwrite.

### Student

- No edit rights in this phase.

---

## 4) First write target recommendation

Recommended first target: **B. create + update student school profile** (upsert-first behavior).

Why B is safest:

- `student_school_profiles` is unique-per-student, so some students may have no row yet while others already do.
- Upsert-first behavior avoids UI confusion between "add profile" vs "edit profile" and prevents duplicate-row risk.
- It keeps one stable save path for HQ/branch supervisor with conservative safety checks.
- Parent/teacher write controls can remain unchanged and blocked by current policy shape.

---

## 5) Service method plan

Recommended service shape:

- `upsertStudentSchoolProfile({ studentId, schoolId, schoolName, gradeYear, curriculumProfileId, parentGoals, teacherNotes })`
- `updateStudentSchoolProfile({ studentId, schoolId, schoolName, gradeYear, curriculumProfileId, parentGoals, teacherNotes })` (optional wrapper/strict-update path)

Rules:

- Use anon client + current JWT only.
- Rely on RLS; no service role.
- Validate UUID fields (`studentId`, optional `schoolId`, optional `curriculumProfileId`).
- Validate safe writable fields only (trim text, null handling, bounded lengths, allowlisted payload keys).
- Return stable `{ data, error }`.
- No direct AI usage.

Suggested conservative behavior:

1. Read existing profile by `student_id`.
2. If found, update safe fields only.
3. If not found, insert one profile row for that student.
4. Never write fields outside explicit allowlist.

---

## 6) Smoke test plan

Future script:

- `scripts/supabase-school-profile-write-smoke-test.mjs`

Planned flow (fake data only):

1. Sign in as branch supervisor fake user.
2. Update/upsert fake student school profile.
3. Verify read-back through `getStudentLearningContext({ studentId })`.
4. Verify parent/student write blocked.
5. Verify teacher write blocked if MVP remains read-only.
6. Optionally verify HQ write allowed.
7. Revert original fake profile values at the end.

Safety:

- Fake IDs/users only.
- Anon key only.
- No service role.
- No SQL apply from script.

---

## 7) UI placement recommendation

Recommended location:

- `Students` page, inside each student card’s `School / Learning Context` section.
- Role-gated `Edit School Profile` action for HQ/branch supervisor only.
- Compact editor (inline card or small modal) with mobile-first stacking.

---

## 8) UI design direction

Fields for first edit slice:

- school name or school select (safe option based on available scoped rows),
- grade/year,
- curriculum profile select,
- parent goals,
- teacher notes,
- Save / Cancel.

Design constraints:

- mobile-first stacked form controls,
- clear "internal vs parent-facing" copy,
- no dense table layout,
- no raw IDs in normal UI.

---

## 9) Parent impact

Expected parent-facing impact:

- `ParentView` learning focus may improve as school/profile/goal context becomes better maintained.
- Parent-facing output should stay simplified and supportive.
- `teacher_notes` should remain internal unless there is an explicit approved transformation path.

---

## 10) AI impact

Student school profile maintenance improves future AI readiness:

- stronger context for AI parent comment drafting,
- better alignment for weekly reports and homework feedback,
- higher chance of curriculum-aware (less generic) output quality.

Constraint:

- No AI calls are added in this phase.

---

## 11) Risks / constraints

Key risks to manage:

- unintended visibility of `teacher_notes`,
- sensitive `parent_goals` language handling,
- cross-branch profile updates by wrong role/session,
- incorrect curriculum profile assignment,
- exposing school/profile details to unrelated users,
- breaking demo/local-only behavior.

Control constraints:

- Preserve anon + JWT + RLS model.
- Keep demoRole/local fallback unchanged.
- Keep write payloads explicit and minimal.

---

## 12) Recommended implementation sequence

1. **Phase 1:** this plan (current document).
2. **Phase 2:** student school profile write service + write smoke test.
3. **Phase 3:** `Students` page edit UI.
4. **Phase 4:** `ParentView` learning focus polish.
5. **Phase 5:** homework upload/review planning.
6. **Phase 6:** AI context integration later.

---

## 13) Next implementation prompt (Phase 2 only)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
Phase 2 only — implement student school profile write service + focused write smoke test.

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
   - `upsertStudentSchoolProfile({ studentId, schoolId, schoolName, gradeYear, curriculumProfileId, parentGoals, teacherNotes })`
   - optional strict-update wrapper `updateStudentSchoolProfile(...)` if useful
2) Enforce validation:
   - UUID checks for `studentId` and optional UUID fields
   - safe field normalization (trim, null handling, bounded lengths)
   - allowlisted writable keys only
3) Return shape: `{ data, error }`
4) Add smoke script:
   - `scripts/supabase-school-profile-write-smoke-test.mjs`
   - branch supervisor upsert/update fake student profile
   - verify read-back via `getStudentLearningContext({ studentId })`
   - verify parent/student write blocked
   - verify teacher write blocked (MVP read-only)
   - optional HQ write check
   - revert original fake values
5) Add npm script:
   - `test:supabase:school-profile:write`
6) Add/update one doc checkpoint for this write-service phase.

Validation efficiency:
- Before tests: git diff --name-only
- Run: npm run build
- Run: npm run lint
- Run: npm run typecheck
- Run: npm run test:supabase:school-curriculum:read
- Run: npm run test:supabase:school-profile:write
- Do not run unrelated full suites.
```

---

Planning status: ready for Phase 2 student school profile write service + smoke validation.

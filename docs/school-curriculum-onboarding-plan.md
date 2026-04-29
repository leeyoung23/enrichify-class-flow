# School/Curriculum Onboarding Foundation Plan

Planning-only document for the next foundation milestone.

Scope constraints:

- No app UI changes in this step.
- No runtime logic changes in this step.
- No new services in this step.
- No Supabase SQL changes in this step.
- No uploads in this step.
- No AI API usage in this step.
- No real student/parent/teacher/school/curriculum/homework/payment/media data.

---

## 1) Product purpose

School/curriculum onboarding is a core product layer, not a side feature.

Why it matters:

- It makes Enrichify Class Flow more than an operations portal.
- It enables personalised learning evidence tied to each learner's school context.
- It gives future AI features structured context so outputs are less generic.
- It supports school-specific expectations for subject scope, level progression, and assessment style.

Product impact:

- Better teacher-parent communication quality in Parent Updates and Weekly Reports.
- Better coherence between class activity, homework, and school outcomes.
- Better long-term readiness for curriculum-aware AI learning intelligence.

---

## 2) Core entities to model

Keep model size practical: define MVP entities first, then future extension entities.

### MVP entities (recommended)

1. `schools`
2. `curriculum_profiles`
3. `class_curriculum_assignments`
4. `student_school_profiles`
5. `learning_goals`

### Future extension entities (later)

1. `subject_skill_strands`
2. `assessment_expectations`
3. `curriculum_template_versions`
4. `student_goal_progress_snapshots`

MVP boundary rule:

- Start with enough structure to drive class/student context and parent-friendly focus.
- Avoid deep standards trees or heavy assessment engines in first release.

---

## 3) MVP data fields

Recommended minimum field set for first implementation slice.

### School

- `name`
- `branch_id`
- `school_type`
- `country`
- `state`
- `curriculum_system`
- `notes`

### Curriculum profile

- `name`
- `provider_system`
- `level_year_grade`
- `subject`
- `skill_focus`
- `assessment_style`
- `notes`

### Student school profile

- `student_id`
- `school_id` (preferred) with optional temporary `school_name` fallback during migration
- `grade_year`
- `curriculum_profile_id` (nullable)
- `parent_goals`
- `teacher_notes`

### Class curriculum assignment

- `class_id`
- `curriculum_profile_id`
- `term_label` or `date_from` / `date_to`
- `learning_focus`

### Learning goals (lightweight MVP)

- `student_id`
- `class_id` (nullable for cross-class goal)
- `goal_title`
- `goal_description`
- `status` (e.g. draft/active/completed/archived)
- `target_date` (nullable)

---

## 4) Role workflows

Align workflows to existing role model in `permissionService` and current navigation/routes.

### HQ

- Manage curriculum templates/profiles across branches.
- Define normalized curriculum naming and baseline quality.
- View cross-branch curriculum coverage and consistency.

### Branch supervisor

- Assign curriculum profiles to classes in own branch.
- Review class/student alignment quality and missing profile coverage.
- Coach teacher implementation consistency at branch level.

### Teacher

- View assigned class curriculum context.
- View/update student school profile notes within allowed scope.
- Use curriculum context for weekly reports, parent comments, and later homework feedback.

### Parent

- Read simple parent-friendly learning focus only.
- See learning direction and next focus without admin-heavy details.

### Student

- Optional later: read simplified own learning focus and goals.

---

## 5) AI connection

School/curriculum onboarding is a prerequisite context layer for useful AI.

How this supports later AI milestones:

- **AI parent comments:** draft can reference learner level, school expectations, and relevant subject focus.
- **AI weekly reports:** draft can align strengths/areas and next steps to curriculum profile.
- **Homework feedback:** future AI can evaluate against expected grade/subject/skill focus.
- **Learning gap detection:** compare observed progress vs target curriculum pathway.
- **Next-week recommendations:** generate less generic and more class-appropriate actions.
- **Curriculum-aware learning evidence:** tie classroom evidence and parent-facing language to school context.

Key quality principle:

- Better structured curriculum input produces safer, less generic, and more actionable AI output.

---

## 6) UI placement proposal

Recommended placement across existing pages:

- `Classes` page: class curriculum assignment section/card (read-only preview now implemented).
- `Students` page: student school profile section/card.
- `ParentView` page: parent-friendly learning focus summary.
- `ParentUpdates` and weekly report flow: curriculum context reference block for teacher drafting.
- HQ/Admin settings area (later): curriculum templates/profiles management.

UI behavior rules:

- Keep parent view simple and plain-language.
- Keep staff controls role-scoped and branch-safe.
- Keep mobile-first readability for parent/teacher while preserving desktop reporting for HQ/supervisor.

---

## 7) Data/RLS expectations

Target access model for schema/policy design:

- HQ: manage/read all schools/curriculum entities across branches.
- Branch supervisor: manage/read own-branch entities only.
- Teacher: read assigned class/student curriculum context; limited scoped note updates only if explicitly allowed.
- Parent: read simplified linked-child context only.
- Student: optional read own simplified context later.
- Parent/student: no edit rights.
- Frontend: no service role usage; anon client + JWT only.

RLS planning notes:

- Reuse existing branch/class/student scope patterns in current RLS draft style.
- Keep parent/student visibility constrained to linked child.
- Keep write policies staff-scoped and explicit per entity.
- Add role-by-role smoke checks before any UI wiring.

---

## 8) Implementation sequence

Recommended phase order:

1. **Phase 1:** planning doc (this file).
2. **Phase 2:** SQL/RLS draft for school/curriculum entities and role scope.
3. **Phase 3:** read service mapping + focused smoke tests.
4. **Phase 4:** `Classes` page curriculum assignment UI.
5. **Phase 5:** `Students` page school profile UI.
6. **Phase 6:** `ParentView` learning focus summary.
7. **Phase 7:** AI context integration (parent comments first, then weekly report, then homework feedback).

Execution rule:

- Keep read-first and policy-first ordering to reduce rework and role leakage risk.

---

## 9) Privacy and product risks

Primary risks to manage:

- Avoid exposing one family's school/curriculum details to other parents.
- Avoid parent-facing copy that feels judgmental or labels children.
- Ensure curriculum context supports learning guidance, not student profiling.
- Data quality is critical because poor curriculum mapping degrades future AI output.
- Avoid hardcoding one country/system path; keep model adaptable for multi-region/multi-curriculum usage.

Mitigation direction:

- Strict RLS scoping, simple parent summaries, and explicit data quality ownership by HQ/branch leads.

---

## 10) Recommended next step

Recommended option: **A. SQL/RLS draft for school/curriculum entities**.

Why A is best next:

- It defines the secure data boundary first, before UI or AI behaviors depend on it.
- Existing project architecture already relies on RLS-first patterns for safe expansion.
- UI mock-first risks building flows without policy-safe entity shape.
- AI prompt-design-first risks generic contracts without grounded curriculum schema.

---

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
SQL/RLS draft for school/curriculum entities only.

Constraints:
- Do not change app UI.
- Do not change runtime logic.
- Do not add runtime services.
- Do not wire frontend pages in this step.
- Do not upload files.
- Do not call AI APIs.
- Do not use real student, parent, teacher, school, curriculum, homework, photo, or payment data.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.

Tasks:
1) Draft SQL entity additions/normalization for:
   - schools (branch-aware)
   - curriculum_profiles
   - class_curriculum_assignments
   - student_school_profiles (with curriculum profile link)
   - learning_goals (lightweight MVP)
2) Draft RLS policies by role:
   - HQ full manage
   - branch supervisor own-branch manage
   - teacher scoped read (and limited note updates only if intentionally allowed)
   - parent/student read-only simplified linked scope
3) Add/update one planning/checkpoint doc with:
   - policy intent matrix
   - non-goals
   - smoke test checklist for role boundaries

Validation efficiency rule:
- SQL/planning change: run targeted validation only as needed for changed files.
- If docs-only changes occur in this step, run only:
  - git diff --name-only
```

---

Planning status: ready for Phase 2 SQL/RLS draft.

## 12) SQL draft status update

- Draft file created: `supabase/sql/012_school_curriculum_foundation.sql`.
- Scope: additive/manual draft for school/curriculum onboarding schema + RLS foundation.
- Status update: manually applied in Supabase dev.
- Current runtime state remains unchanged:
  - no app UI wiring yet
  - no runtime write service wiring yet
  - no AI integration wiring yet
- Continue using fake/dev-safe data only for any future validation of this draft.
- Application checkpoint doc: `docs/school-curriculum-sql-application-checkpoint.md`.

## 13) Read service + smoke status update

- School/curriculum read service methods added in `src/services/supabaseReadService.js`.
- School/curriculum read smoke test added at `scripts/supabase-school-curriculum-read-smoke-test.mjs`.
- Package script added: `npm run test:supabase:school-curriculum:read`.
- Scope remains read-only validation before any UI wiring.
- UI work remains future.
- AI integration remains future.
- Continue fake/dev-safe data only for role-scope verification.

## 14) Fake seed data status update

- Fake onboarding seed draft added: `supabase/sql/013_school_curriculum_fake_seed_data.sql`.
- Scope: manual/dev-only fake school/curriculum rows for smoke stability.
- Manual apply status: applied in Supabase dev (SQL Editor result: Success / No rows returned).
- Not applied automatically (manual apply only).
- Uses fake/demo entities only (no real school/student/curriculum data).
- UI remains not implemented.
- AI integration remains not implemented.
- Fake seed application checkpoint: `docs/school-curriculum-fake-seed-application-checkpoint.md`.
- Classes page read-only curriculum context preview is now implemented.
- Assignment/edit/create curriculum UI remains future.
- Students page school profile UI remains future.
- ParentView learning focus summary remains future.
- Next milestone: `Students` school profile UI, then `ParentView` learning focus summary.

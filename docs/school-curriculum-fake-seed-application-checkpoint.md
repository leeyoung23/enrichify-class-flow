# School/Curriculum Fake Seed Application Checkpoint

This checkpoint records manual dev application status for fake school/curriculum onboarding seed data.

Scope guardrails:

- Documentation/checkpoint only.
- No app UI changes.
- No runtime service additions.
- No SQL changes in this step.
- No uploads or AI API usage in this step.
- Fake/demo data only.

---

## 1) Manual seed application status

Manual SQL patch applied in Supabase dev:

- `supabase/sql/013_school_curriculum_fake_seed_data.sql`

Supabase SQL Editor result:

- **Success**
- **No rows returned**

This is expected for additive `insert ... on conflict` seed execution.

---

## 2) Fake seed data scope

Seed intent:

- dev-only smoke stability for school/curriculum onboarding reads,
- fake/demo entities only,
- no real school/student/teacher/curriculum/homework/payment/media identities.

Expected fake seeded records:

- `Demo Primary School`
- `Demo English Literacy Profile`
- `Demo Maths Numeracy Profile`
- one fake class curriculum assignment row
- one fake student school profile row
- one fake class-level learning goal
- one fake student-level learning goal

---

## 3) Read smoke verification result

Validation command run:

- `npm run test:supabase:school-curriculum:read`

Result:

- **PASS**
- Summary: `ran=5 failures=0 warnings=0 checks=0`

Observed role-scoped counts after fake seed:

- HQ Admin: `schools/profiles/student_profiles/assignments/goals = 2/2/1/1/2`
- Branch Supervisor: `1/2/1/1/2`
- Teacher: `1/1/1/1/2`
- Parent: `1/1/1/1/1`
- Student: `1/1/1/1/1`

Interpretation:

- No unsafe broad access signal was detected.
- No remaining CHECK noise in this run.
- Parent/student template insert denial remained enforced.

---

## 4) Product boundary status

Current boundary remains unchanged:

- no school/curriculum UI wiring yet,
- no school/curriculum AI integration yet,
- no production/real data onboarding in this phase.

Use fake/dev-safe data only for further role-scope validation.

---

## 5) Recommended next milestone

Recommended next milestone (after this checkpoint):

- `Classes` page curriculum assignment UI, **or**
- `Students` page school profile UI.

Checkpoint status: fake seed is manually applied in dev and read smoke verification is clean.

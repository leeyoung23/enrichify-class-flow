# AI Homework Stable Fixture Baseline Plan

Scope: planning only for a stable fake/dev AI homework fixture baseline to unlock deployed regression allowed-role and mismatch coverage.

## 1) Current problem

- Deployed `generate-homework-feedback-draft` function is reachable.
- Blocking checks already pass in live deployed regression:
  - missing auth -> `401`
  - invalid token -> `401`
  - parent blocked -> `403`
  - student blocked -> `403`
- Allowed-role checks currently `CHECK`-skip because no stable role-accessible fake submission baseline is available:
  - assigned teacher
  - branch supervisor own-branch
  - HQ
- Relationship mismatch checks currently `CHECK`-skip because no known-good allowed baseline payload exists.

## 2) Product/security purpose

- Real provider integration should wait until live allowed-role scope is proven.
- Stable fake fixtures allow access-boundary verification without exposing real child/student data.
- Both sides must be proven:
  - allowed staff roles can access only in-scope payloads
  - denied roles and mismatches remain blocked.

## 3) Required fake baseline

Stable fake/dev baseline should include:

- users/profiles:
  - HQ user
  - branch supervisor user
  - assigned teacher user
  - parent user
  - optional student user (for explicit blocked-role checks)
- organization entities:
  - branch
  - class
  - student
  - parent/guardian link to student
  - teacher-class assignment
- homework entities:
  - homework task
  - homework submission linked to that task/student/class
  - optional homework feedback/file only if needed for supplementary side-effect checks

## 4) Required IDs for regression

Deployed regression explicit fixture IDs:

- `AI_HOMEWORK_TEST_SUBMISSION_ID`
- `AI_HOMEWORK_TEST_TASK_ID`
- `AI_HOMEWORK_TEST_STUDENT_ID`
- `AI_HOMEWORK_TEST_CLASS_ID`

Rules:

- Values belong in `.env.local` only.
- `.env.example` placeholders already exist.
- `.env.local` must never be committed.

## 5) Fixture creation strategy options

### A) Manual fake baseline in Supabase dashboard/SQL editor
- Pros: quick one-off recovery path.
- Cons: drift-prone, hard to reproduce, easy to mis-link relationships.

### B) Dev-only SQL seed patch (additive)
- Pros: deterministic, reviewable, repeatable.
- Pros: easiest to keep role/entity links stable over time.
- Cons: requires careful manual dev-only application discipline.

### C) Dev-only setup script
- Pros: can be idempotent and guided from one command.
- Pros: can validate/print CHECK states for missing prerequisites.
- Cons: more moving parts; cleanup logic can be complicated under RLS.

### D) Reuse existing fake seed only
- Pros: lowest effort if complete.
- Cons: current evidence suggests incomplete baseline for homework task/submission visibility across all target roles.

Safest recommendation:

- **B first, with optional C helper later**.
- Use a clearly marked dev-only additive SQL fixture patch (manual apply only) that ensures baseline entities and relationships.
- Keep all data fake/dev-only.

## 6) Recommended baseline approach

Recommended approach:

- Create a **dev-only additive fixture baseline** (SQL patch or setup script) that *ensures*:
  - fake branch/class/student chain
  - fake guardian link
  - fake teacher-class assignment
  - fake homework task
  - fake homework submission
- Design for idempotency where practical (`insert ... on conflict`, deterministic fake IDs).
- Do not delete existing real/dev data outside fixture scope.
- Use obviously fake naming/emails (`*.example.test`).
- Never apply to production.

Implementation draft status:

- Dev-only additive SQL draft is now created at `supabase/sql/019_ai_homework_deployed_regression_fixture.sql`.
- `019` is manual/dev-only and is **not applied yet** in this checkpoint.
- `019` includes helper output query for:
  - `AI_HOMEWORK_TEST_SUBMISSION_ID`
  - `AI_HOMEWORK_TEST_TASK_ID`
  - `AI_HOMEWORK_TEST_STUDENT_ID`
  - `AI_HOMEWORK_TEST_CLASS_ID`
- After manual dev apply, copy output IDs into local `.env.local` only and rerun:
  - `npm run test:ai:homework-edge:deployed`

## 7) RLS/auth considerations

Baseline must satisfy:

- assigned teacher can read/access submission in class scope.
- branch supervisor can access own-branch submission only.
- HQ can access baseline submission by policy.
- parent/student remain blocked from AI function.
- mismatch payload mutations remain blocked.

## 8) Relationship consistency

Baseline validation checklist:

- `submission.homework_task_id = task.id`
- `submission.student_id = student.id`
- `submission.class_id = class.id`
- `task.class_id = class.id`
- `task.branch_id` aligns with class/student branch (when available)

These relationships must hold before writing `AI_HOMEWORK_TEST_*` values in local `.env.local`.

## 9) Regression expected outcomes

After stable baseline exists:

- missing auth `PASS` (`401`)
- invalid token `PASS` (`401`)
- parent blocked `PASS` (`403`)
- student blocked `PASS` (`403`)
- assigned teacher allowed `PASS` (`200`)
- branch supervisor own-branch allowed `PASS` (`200`)
- HQ allowed `PASS` (`200`)
- wrong task/student/class mismatch blocked `PASS`
- output shape stable `PASS`
- draft-only/no-auto-release safety note `PASS`

## 10) Safety boundaries

- fake/dev data only.
- no real child/student data.
- no provider key.
- no real provider call.
- no service role in frontend.
- no broad RLS weakening.
- no auto-save/release side effects.
- no public file URLs.
- no secret logging.

## 11) Implementation sequence

- Phase 1: this plan.
- Phase 2: inspect existing fake seed/profile/role records in dev.
- Phase 3: create dev-only fixture baseline SQL/setup script.
- Phase 4: fill local `.env.local` `AI_HOMEWORK_TEST_*` values.
- Phase 5: rerun `npm run test:ai:homework-edge:deployed`.
- Phase 6: checkpoint allowed-role/mismatch PASS outcomes.
- Phase 7: provider adapter stub with provider disabled.

## 12) Recommended next milestone

Choose:

- A. Draft dev-only AI homework fixture baseline SQL/setup
- B. Provider adapter stub with provider disabled
- C. Real provider adapter wiring
- D. AI audit/logging planning
- E. OCR/vision evidence extraction planning
- F. Announcements/Internal Communications planning

Recommendation: **A. Draft dev-only AI homework fixture baseline SQL/setup**.

Why A first:

- Deployed regression script is ready (explicit IDs + discovery fallback).
- Function is reachable.
- Blocking checks already pass.
- Allowed-role checks require stable fake baseline before provider work.
- This keeps AI boundary validation safe and evidence-driven.

## 13) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add AI homework stable fixture baseline plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Draft dev-only AI homework fixture baseline SQL/setup only.

Hard constraints:
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Edge Function code.
- Do not deploy functions.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not change Supabase SQL/RLS outside the dev-only fixture draft.
- Do not apply SQL automatically.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.

Deliverables:
1) Dev-only fixture SQL/setup draft for stable branch/class/student/task/submission baseline.
2) Mapping table of fake IDs to `AI_HOMEWORK_TEST_*` variables.
3) Idempotency + safety notes (additive/manual-dev only).
4) Regression rerun checklist and expected PASS outcomes.

Validation efficiency rule:
Docs/planning only.
Run:
- git diff --name-only
Do not run build/lint/smoke suite unless runtime files change.
```

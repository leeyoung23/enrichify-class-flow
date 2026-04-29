# AI Homework Edge Function Deployed Regression Plan

## 1) Purpose

Deployed auth/scope regression testing is required before any feature-flagged UI path or real provider work so we can verify security boundaries in a real deployed Edge Function environment (not only local resolver tests). This protects education/child data access boundaries and confirms role/scope enforcement is stable under deployed JWT and RLS behavior.

## 2) Current state

- `generate-homework-feedback-draft` Edge Function stub exists.
- Auth/scope checks are implemented in Edge Function flow.
- Frontend wrapper exists (`generateHomeworkFeedbackDraftViaEdgeFunction(...)`).
- Local mock remains default.
- Real provider is not wired.
- No real AI API calls are made.
- No auto-release behavior exists.

## 3) Testing environment assumptions

- Dev Supabase project only.
- Fake users and fake data only.
- No production data.
- No provider keys.
- No service role in frontend path.
- Edge Function deployed to dev environment only.

## 4) Required fake users/roles

Required fake users for deployed regression coverage:

- HQ admin
- Branch supervisor (own branch)
- Branch supervisor (other branch), if available
- Teacher assigned to class
- Teacher not assigned to class, if available
- Parent linked to child
- Student self account

Coverage rule:

- If a specific fake user fixture is missing, mark as `CHECK` and do not broaden access rules as a workaround.

## 5) Required fake homework data

- Fake homework task.
- Fake homework submission.
- Fake student/class/branch relationship alignment.
- Fake uploaded homework file metadata (optional but useful for realistic payload context).
- Fake feedback row optional (not required for function call path).
- Relationship mismatch fixtures if possible:
  - submission/task mismatch
  - submission/student mismatch
  - submission/class mismatch

## 6) Test cases

Minimum deployed auth/scope regression cases:

- Missing auth -> `401`
- Invalid token -> `401`
- Parent blocked -> `403`
- Student blocked -> `403`
- Assigned teacher allowed -> `200`
- Unrelated teacher blocked -> `403`
- Own-branch supervisor allowed -> `200`
- Other-branch supervisor blocked -> `403`
- HQ allowed -> `200`
- Mismatched `homeworkSubmissionId`/`homeworkTaskId` blocked (`400`/safe blocked error)
- Mismatched `studentId` blocked (`400`/safe blocked error)
- Mismatched `classId` blocked (`400`/safe blocked error)
- Output shape remains stable (`{ data, error }`)
- Draft-only safety note present
- No auto-save / no auto-release side effects

## 7) Manual deployed test commands

Planned command shapes (placeholders only; no real tokens):

```bash
curl -X POST "https://<PROJECT-REF>.supabase.co/functions/v1/generate-homework-feedback-draft" \
  -H "Authorization: Bearer <FAKE_DEV_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "homeworkSubmissionId": "fake-submission-id",
    "homeworkTaskId": "fake-task-id",
    "studentId": "fake-student-id",
    "classId": "fake-class-id",
    "teacherObservation": "fake/dev observation",
    "mode": "deployed_regression",
    "tone": "supportive",
    "length": "short"
  }'
```

```bash
node scripts/ai-homework-edge-function-deployed-regression-test.mjs
```

Notes:

- Use placeholders and fake/dev credentials only.
- Never paste real tokens into docs or logs.

## 8) Future automated script plan

Recommended script:

- `scripts/ai-homework-edge-function-deployed-regression-test.mjs`

Script behavior should:

- Load `.env.local` for dev-only credentials and endpoints.
- Sign in as fake users by role.
- Call deployed function via `supabase.functions.invoke`.
- Print `PASS` / `WARNING` / `CHECK`.
- Never use provider keys.
- Never use service role.
- Never call real AI provider.
- Fail only on unsafe access, regression in blocked cases, or broken expected allowed access.

## 9) Safety/secrets rules

- Never print JWT tokens.
- Never print env values.
- No service role usage.
- No provider key usage.
- No production data usage.
- Parent/student must not trigger AI homework draft generation.
- No auto-save and no auto-release behavior.

## 10) Acceptance criteria before UI wiring

Feature-flagged UI path to Edge Function may proceed only when:

- Staff allowed cases pass.
- Parent/student blocked cases pass.
- Relationship mismatch cases are blocked.
- Output shape is stable.
- No provider key is required.
- No auto-release risk is introduced.

## 11) What remains after this plan

- Implement deployed regression test script.
- Deploy Edge Function to dev (if not already deployed).
- Run deployed regression suite with fake/dev fixtures.
- Then add feature-flagged UI path to Edge Function stub.
- Real provider adapter later.
- AI audit/logging design later.

## 12) Recommended next milestone

Recommendation: **Implement deployed Edge Function regression test script**.

Why:

- Confirms real deployed auth/scope behavior with JWT + RLS paths.
- Safer than moving directly to UI feature-flag wiring.
- Keeps provider integration disabled.
- Protects education/child data boundaries before wider exposure.

## 13) Next implementation prompt

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
<fill-latest-commit>

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement deployed AI homework Edge Function auth/scope regression test script only.

Hard constraints:
- Do not change app UI.
- Do not change runtime logic for product flows.
- Do not change Edge Function code in this step.
- Do not call real AI providers.
- Do not add provider keys.
- Do not expose env values or JWT values in logs.
- Do not commit .env.local.
- Do not change Supabase SQL or RLS.
- Do not use service role in frontend paths.
- Use fake/dev users and data only.
- No auto-save and no auto-release behavior.

Create:
- scripts/ai-homework-edge-function-deployed-regression-test.mjs

Script requirements:
1) Load dev env from .env.local.
2) Authenticate fake users by role (HQ, supervisor, teacher, parent, student where available).
3) Invoke deployed function `generate-homework-feedback-draft`.
4) Validate expected status/behavior:
   - 401 missing/invalid auth
   - parent/student blocked
   - assigned teacher allowed
   - out-of-scope staff blocked
   - HQ allowed
   - relationship mismatch blocked
   - stable output shape and draft-only safety notes
5) Print PASS/WARNING/CHECK lines only (no secret/token output).
6) Do not require provider keys.

Validation efficiency:
- Run git diff --name-only first.
- Run only targeted script checks needed for this milestone.
- Do not run unrelated full suites.
```

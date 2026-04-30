# AI Homework Edge Function Deployed Fixture Improvement Checkpoint

Scope: documentation-only checkpoint for deployed regression fixture strategy improvements.

## 1) What was implemented

Deployed AI homework Edge Function regression fixture handling was improved for safer, more deterministic dev validation without changing runtime UI behavior or provider wiring.

Implemented behavior:

- Added optional explicit fixture-ID path for deployed regression.
- Added UUID validation for fixture IDs.
- Added relationship consistency validation against submission/task/student/class linkage.
- Kept fallback path to role-accessible fixture discovery when explicit IDs are missing.
- Added clearer `CHECK` skip outcomes when fixtures are unavailable.
- Preserved safe logging behavior (no token/password/env value logging).

## 2) Files changed

- `scripts/ai-homework-edge-function-deployed-regression-test.mjs`
- `.env.example`
- `docs/ai-homework-edge-function-dev-fixture-alignment-plan.md`
- `docs/ai-homework-edge-function-dev-deployment-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Fixture strategy implemented

- Optional explicit env fixture IDs added.
- UUID validation added for explicit IDs.
- Relationship consistency validation added before running allowed-role checks.
- Fallback to role-accessible discovery retained when explicit IDs are not configured.
- Clear `CHECK` skips emitted when no safe fixture payload is available.
- No token/password/env-value logging introduced.

## 4) Explicit fixture IDs

Supported optional IDs:

- `AI_HOMEWORK_TEST_SUBMISSION_ID`
- `AI_HOMEWORK_TEST_TASK_ID`
- `AI_HOMEWORK_TEST_STUDENT_ID`
- `AI_HOMEWORK_TEST_CLASS_ID`

Usage and safety:

- These are placeholders in `.env.example` only.
- Real dev values belong only in `.env.local`.
- `.env.local` must never be committed.

## 5) Deployed regression behavior

Observed behavior after fixture-improvement update:

- `PASS` missing auth -> `401`
- `PASS` invalid token -> `401`
- `PASS` parent blocked -> `403`
- `PASS` student blocked -> `403`
- `CHECK` assigned teacher skipped (no role-accessible submission candidate)
- `CHECK` branch supervisor skipped (no role-accessible submission candidate)
- `CHECK` HQ skipped (no role-accessible submission candidate)
- `CHECK` relationship mismatch skipped (no allowed-role fixture available)

## 6) Provider/secrets safety

- No real AI provider calls.
- No provider keys.
- No `.env.local` changes or commit.
- No token/password logging.
- No service role in frontend runtime.
- No auto-save side effect introduced.
- No auto-release behavior introduced.

## 7) Tests

Validated with:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:ai:homework-edge:stub`
- `npm run test:ai:homework-edge:wrapper`
- `npm run test:ai:homework-edge:deployed`

## 8) What remains

- Create/confirm stable fake/dev fixture baseline.
- Convert assigned teacher allowed case to `PASS`.
- Convert branch supervisor own-branch allowed case to `PASS`.
- Convert HQ allowed case to `PASS`.
- Convert relationship mismatch checks to `PASS` using allowed-role baseline.
- Provider adapter remains future.
- OCR/rubric remains future.

## 9) Recommended next milestone

Choose:

- A. Create/confirm stable fake AI homework fixture baseline
- B. Provider adapter stub with provider disabled
- C. Real provider adapter wiring
- D. AI audit/logging planning
- E. OCR/vision evidence extraction planning
- F. Announcements/Internal Communications planning

Recommendation: **A. Create/confirm stable fake AI homework fixture baseline**.

Why A first:

- Deployed script is now ready for explicit IDs + discovery fallback.
- Live function is reachable.
- Blocking checks already pass.
- Allowed-role + mismatch checks still need stable fake fixture data.
- Provider integration should wait until live staff-allowed and mismatch coverage passes.

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document AI homework deployed regression fixture improvements

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Create/confirm stable fake AI homework fixture baseline planning only.

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
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.

Deliverables:
1) Stable fake fixture baseline plan for teacher/supervisor/HQ allowed-role coverage.
2) Mapping of required fake fixture entities and role-access links.
3) Relationship mismatch fixture plan from a known-good allowed baseline.
4) Validation checklist for converting CHECK skips to PASS.

Validation efficiency rule:
Docs-only change.
Run:
- git diff --name-only
Do not run build/lint/smoke suite unless runtime files change.
```

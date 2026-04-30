# AI Homework Edge Function Dev Deployment Checkpoint

Scope: documentation-only checkpoint for successful dev deployment and live deployed regression reachability.

## 1) Deployment status

- Supabase CLI login completed manually.
- Supabase project linked to `fwturqeaagacoiepvpwb`.
- Edge Function `generate-homework-feedback-draft` deployed to Supabase dev.
- Deployed regression now reaches live deployed function (no longer unavailable-function skip).

## 2) Deployed regression result

From deployed regression run:

- `PASS` missing auth -> `401`
- `PASS` invalid token -> `401`
- `PASS` parent blocked -> `403`
- `PASS` student blocked -> `403`
- `CHECK` assigned teacher allowed case skipped due missing accessible fake homework submission fixture
- `CHECK` branch supervisor allowed case skipped due missing accessible fake homework submission fixture
- `CHECK` HQ allowed case skipped due missing accessible fake homework submission fixture
- `CHECK` relationship mismatch skipped due missing allowed-role fixture

## 3) Interpretation

- This is progress from the previous unavailable-function `CHECK` skip state.
- Live auth/blocking boundary is now partially verified.
- Staff allow-case and mismatch live verification still needs better dev fixtures before provider wiring.
- No unsafe access was observed in executed live checks.

## 4) Provider/secrets safety

- No real AI provider call was made.
- No provider key was added.
- No provider secret was configured.
- No `.env.local` was committed.
- No key/env value logging was introduced.
- Provider integration remains a future milestone.

## 5) Current AI architecture status

- Mock context builder exists.
- Mock feedback generator exists.
- Teacher mock AI button exists.
- Edge Function stub exists and is deployed.
- Auth/scope checks exist.
- Frontend wrapper exists.
- Deployed regression reaches live function.
- Real provider is not wired.
- OCR/rubric pipeline is not implemented.

## 6) Remaining gaps

- Create/confirm complete fake role fixtures for allowed staff cases.
- Assigned teacher allowed-case fixture coverage.
- Branch supervisor own-branch allowed-case fixture coverage.
- HQ allowed-case fixture coverage.
- Relationship mismatch live checks with an allowed-role fixture.
- Real provider adapter remains future.

## 6.1) Fixture discovery/setup implementation update

- Deployed regression script now supports optional explicit fixture env IDs:
  - `AI_HOMEWORK_TEST_SUBMISSION_ID`
  - `AI_HOMEWORK_TEST_TASK_ID`
  - `AI_HOMEWORK_TEST_STUDENT_ID`
  - `AI_HOMEWORK_TEST_CLASS_ID`
- Explicit fixture IDs are UUID-validated and relationship-validated before use.
- If explicit IDs are not configured, script uses role-accessible payload discovery fallback.
- If fixture data is still unavailable, script reports clear `CHECK` skip reasons.
- Auth blocking checks remain active and unchanged.
- No provider key and no real provider call were added.

## 7) Recommended next milestone

Choose:

- A. Dev fixture alignment for deployed AI Edge Function regression
- B. Provider adapter stub with provider disabled
- C. Real provider adapter wiring
- D. AI audit/logging planning
- E. OCR/vision evidence extraction planning
- F. Attendance parent notification planning
- G. Printable/exportable PDF report planning
- H. Announcements/Internal Communications planning

Recommendation: **A. Dev fixture alignment for deployed AI Edge Function regression**.

Why A first:

- Live function is reachable now.
- Blocking cases pass.
- Allowed staff cases are still skipped due fixture gaps.
- Before provider integration, live allowed/mismatch cases should be proven.
- This keeps child-data AI boundary safer.

## 8) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document AI homework Edge Function dev deployment

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Dev fixture alignment for deployed AI Edge Function regression planning only.

Hard constraints:
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Edge Function code.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.

Deliverables:
1) Fixture-alignment planning doc for deployed regression coverage.
2) Role-by-role fixture checklist for allowed staff cases and mismatch checks.
3) Minimal validation checklist and expected PASS/CHECK transitions.

Validation efficiency rule:
Docs-only change.
Run:
- git diff --name-only
Do not run build/lint/smoke suite unless runtime files change.
```

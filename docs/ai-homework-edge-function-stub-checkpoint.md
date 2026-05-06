# AI Homework Edge Function Stub Checkpoint

## 1) What was implemented

A Supabase Edge Function mock/stub for homework AI feedback draft generation is now implemented with deterministic, provider-free behavior. It validates request/response contract shape, requires Authorization header presence, and returns draft-only output without changing any release workflow behavior.

## 2) Files changed

- `supabase/functions/generate-homework-feedback-draft/index.ts`
- `supabase/functions/generate-homework-feedback-draft/handler.js`
- `scripts/ai-homework-edge-function-stub-test.mjs`
- `package.json`
- `docs/ai-homework-edge-function-contract-plan.md`
- `docs/project-master-context-handoff.md`

## 3) Edge Function stub behavior

- Function name: `generate-homework-feedback-draft`
- POST only
- Authorization Bearer header presence required
- JSON request parsing
- Required fields:
  - `homeworkSubmissionId`
  - `homeworkTaskId`
  - `studentId`
  - `classId`
- Optional fields:
  - `teacherObservation`
  - `mode`
  - `tone`
  - `length`
- Deterministic mock draft output
- Stable `{ data, error }` response shape

## 4) Response/error behavior

Success response includes:

- `markingSummary`
- `feedbackText`
- `nextStep`
- `learningGaps`
- `teacherNotes`
- `safetyNotes`
- `modelInfo`

Error behavior:

- `405` invalid method
- `401` missing auth
- `400` invalid JSON / missing required fields
- `500` unexpected internal error

## 5) Safety boundaries

- No real AI provider call
- No provider key usage
- No service role usage in frontend
- No SQL/RLS changes
- No auto-save
- No auto-release
- Draft-only / teacher approval required note included in response

## 6) Tests

Validated in the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:ai:homework-edge:stub`

## 7) What remains future

- Real provider adapter behind Supabase Edge Function secrets
- Frontend wiring from local mock path to Edge Function stub
- Audit/logging design
- OCR/rubric expansion

## 7.1) Auth/scope hardening update

Auth/scope helper logic is now added while keeping mock output:

- Handler uses resolver-based auth/scope gate with fail-closed default behavior.
- Edge Function runtime path now verifies Supabase user/token before generation.
- Role behavior now enforces staff-only generation:
  - teacher assigned class scope,
  - branch supervisor own branch scope,
  - HQ broader scope.
- Parent/student are denied.
- Relationship checks now enforce submission/task/student/class and branch/class alignment.
- Response remains stable `{ data, error }` with deterministic draft-only output.

Still future after this hardening:

- Real provider adapter behind Supabase Edge Function secrets
- Frontend wiring from local mock path to Edge Function stub
- Additional auth/scope regression coverage against deployed dev function environment.

## 8) Recommended next milestone

Recommendation: **A. Edge Function JWT/scope enforcement planning**

Why A first:

- Current stub only checks auth header presence.
- Before frontend wiring or provider integration, role/scope rules must be designed.
- Education/child data requires strict access boundaries.
- Teacher approval gate must remain mandatory.

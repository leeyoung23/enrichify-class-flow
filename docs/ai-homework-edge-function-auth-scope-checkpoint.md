# AI Homework Edge Function Auth/Scope Checkpoint

## 1) What was implemented

Auth/scope hardening is now implemented for the `generate-homework-feedback-draft` Edge Function stub while keeping the function provider-free and mock-only. The function now applies structured authentication, role/scope checks, and relationship alignment checks before returning draft output.

## 2) Files changed

- `supabase/functions/generate-homework-feedback-draft/handler.js`
- `supabase/functions/generate-homework-feedback-draft/index.ts`
- `scripts/ai-homework-edge-function-stub-test.mjs`
- `docs/ai-homework-edge-function-auth-scope-plan.md`
- `docs/ai-homework-edge-function-stub-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Auth/scope behavior

- Resolver-based auth/scope gate is now used in handler flow.
- Handler is fail-closed by default when no valid resolver outcome is provided.
- Supabase-backed resolver verifies JWT/user via `auth.getUser`.
- Resolver loads requester profile/role/branch context.
- Parent/student roles are denied.
- Unknown/non-staff roles are denied.
- Teacher path is scoped to assigned class access.
- Branch supervisor path is scoped to own-branch access.
- HQ path remains broader-allowed by policy.

## 4) Relationship checks

- Submission exists and is accessible.
- `homeworkTaskId` matches submission.
- `studentId` matches submission.
- `classId` matches submission/task linkage.
- Task exists and is accessible.
- Task/submission class + branch alignment is enforced.
- Relationship mismatch returns a safe blocked error response.

## 5) Error behavior

- Missing auth -> `401`
- Invalid token -> `401`
- Parent/student -> `403`
- Teacher not assigned class -> `403`
- Branch supervisor outside branch -> `403`
- Relationship mismatch -> safe blocked response (`400` path in current implementation)

## 6) Mock output safety

- Deterministic mock draft output is preserved.
- Stable `{ data, error }` response shape is preserved.
- No real provider/API call.
- No provider key read.
- No auto-save behavior.
- No auto-release behavior.
- Draft-only and teacher-approval-required note remains in output.

## 7) Tests

Validated in this milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:ai:homework-edge:stub`

## 8) What remains

- Frontend service wrapper to call Edge Function.
- Deployed-environment auth/scope regression tests.
- Real provider adapter behind Edge Function secrets.
- Audit/logging SQL and telemetry design.
- OCR/text extraction.
- Rubric-based marking.

## 9) Recommended next milestone

Recommendation: **A. Frontend service wrapper to call Edge Function stub**.

Caution for A:

- Wrapper should not replace current local mock UI path automatically unless feature-flagged.
- Wrapper can validate browser -> Edge Function request path safely.
- Real provider remains disabled.
- Teacher approval gate remains intact.

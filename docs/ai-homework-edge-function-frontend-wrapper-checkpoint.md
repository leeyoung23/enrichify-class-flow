# AI Homework Edge Function Frontend Wrapper Checkpoint

## 1) What was implemented

Frontend wrapper support is now added for the AI homework Edge Function stub while preserving the existing local mock default path in teacher UI. This milestone adds a callable service boundary from frontend to `generate-homework-feedback-draft` without enabling it by default in `Homework.jsx`.

## 2) Files changed

- `src/services/aiDraftService.js`
- `scripts/ai-homework-edge-function-wrapper-test.mjs`
- `package.json`
- `docs/ai-homework-edge-function-auth-scope-checkpoint.md`
- `docs/ai-homework-edge-function-contract-plan.md`
- `docs/project-master-context-handoff.md`

## 3) Wrapper behavior

- Added `generateHomeworkFeedbackDraftViaEdgeFunction(...)`.
- Validates required request IDs:
  - `homeworkSubmissionId`
  - `homeworkTaskId`
  - `studentId`
  - `classId`
- Calls Supabase Edge Function via `supabase.functions.invoke`.
- Uses current user session/JWT path only.
- Uses no service role.
- Uses no provider key.
- Returns stable `{ data, error }` shape.
- Validates Edge Function response data shape before success return.

## 4) Feature flag/default behavior

- Added default-path helpers:
  - `useEdgeFunctionAiHomeworkDraft`
  - `isHomeworkEdgeFunctionDraftEnabled()`
- Uses non-secret env flag: `VITE_ENABLE_AI_HOMEWORK_EDGE_DRAFT`.
- Default is `false`.
- Local mock remains default behavior.
- `Homework.jsx` was not changed in this milestone.
- No default UI behavior switch was introduced.

## 5) Tests

Validated in implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:ai:homework-edge:stub`
- `npm run test:ai:homework-edge:wrapper`

## 6) Safety boundaries

- No real AI API call.
- No provider key usage.
- No auto-save behavior.
- No auto-release behavior.
- No service role usage in frontend wrapper path.
- Teacher approval gate remains required.
- Frontend does not expose secrets.

## 7) What remains future

- Optional feature-flagged UI wiring from `Homework.jsx` to Edge Function stub path.
- Deployed browser-to-EdgeFunction auth/scope regression checks.
- Real provider adapter behind Supabase Edge Function secrets.
- AI audit/logging SQL design.
- OCR/text extraction.
- Rubric-based marking.
- Internal Communications / Announcements module (later milestone).

## 8) Recommended next milestone

Recommendation: **B. Deployed Edge Function auth/scope regression test plan**.

Why B first:

- Current wrapper path exists but production safety confidence depends on deployed auth/scope verification behavior.
- Education/child data boundaries should be validated in deployed-like conditions before wider UI exposure.
- Keeps local mock as default while hardening security confidence.

After B, proceed with **A**:

- Add feature-flagged UI path for prototype visibility while preserving local mock as default and avoiding any automatic rollout.

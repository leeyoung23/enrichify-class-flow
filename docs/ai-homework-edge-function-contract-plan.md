# AI Homework Edge Function Contract Plan

Planning scope:

- Docs/planning only.
- No app UI changes.
- No runtime logic changes.
- No provider wiring.
- No provider keys.
- No SQL/RLS changes.

## 1) Current state

- Mock AI homework workflow exists in current service/UI path.
- No real AI provider call is wired.
- No provider key exists in frontend runtime.
- Teacher approval gate exists and remains mandatory.
- Parent release remains human-controlled via existing flow.

## 2) Contract purpose

This contract defines the future server boundary for real AI homework marking/feedback draft generation.

- Supabase Edge Function is the server-side boundary for real provider calls.
- Provider keys stay in Supabase Edge Function secrets only.
- Frontend sends only safe request data.
- Edge Function returns draft output only.
- No auto-save and no auto-release are allowed in this contract.

## 3) Function name recommendation

Recommended function name: `generate-homework-feedback-draft`

Why this name:

- Matches existing action-oriented naming style (`generate-*`).
- Explicitly communicates output is a draft, not final/released feedback.
- Clearer for future expansion (homework draft vs other AI draft functions).

## 4) Request contract

Planned request shape:

```json
{
  "homeworkSubmissionId": "string",
  "homeworkTaskId": "string",
  "studentId": "string",
  "classId": "string",
  "teacherObservation": "string",
  "mode": "string",
  "tone": "string",
  "length": "string"
}
```

Request notes:

- IDs are used for scoped lookup and authorization checks, not raw prompt output.
- Server/function should fetch allowed context where possible instead of trusting broad frontend payload text.
- `teacherObservation` is optional but useful to improve contextual quality.

## 5) Response contract

Success shape:

```json
{
  "data": {
    "markingSummary": "string",
    "feedbackText": "string",
    "nextStep": "string",
    "learningGaps": "string",
    "teacherNotes": "string",
    "safetyNotes": "string",
    "modelInfo": {
      "provider": "string",
      "model": "string",
      "mode": "string",
      "tone": "string",
      "length": "string",
      "externalCall": false
    }
  },
  "error": null
}
```

Error shape:

```json
{
  "data": null,
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

## 6) Role/scope checks

Planned authorization and scope checks:

- Authenticated JWT is required.
- Only teacher assigned to class, branch supervisor in own branch, or HQ can request draft.
- Parent/student cannot trigger homework marking draft generation.
- Function validates submission/task/student/class relationship integrity.
- Function blocks cross-branch and cross-class access.
- No service role key is exposed to frontend.

## 7) Context assembly

Function/service should gather (authorized, minimum-needed):

- Homework task title/instructions/subject/due date.
- Submission note.
- Uploaded file metadata.
- Curriculum profile.
- Class learning focus.
- Active learning goals.
- Student school profile.
- Optional previous released feedback (only if policy-safe).
- Teacher observation.

Avoid in prompt/context:

- Payment data.
- Staff time clock data.
- `internal_note` unless teacher-only and justified.
- Unapproved Memories/media.
- Raw IDs in prompt text.
- Unnecessary sensitive data.

## 8) File/content handling phases

Phase 1:

- Metadata + teacher observation only.
- No file content parsing.

Phase 2:

- Text extraction/OCR planning.

Phase 3:

- Image/PDF vision analysis only if privacy and cost controls are acceptable.

Phase 4:

- Rubric-based marking support.

## 9) Prompt safety rules

- Evidence-based only.
- Do not invent achievement.
- Do not claim file content was read when content was not provided.
- Avoid diagnostic/medical labels.
- Use supportive, parent-friendly tone.
- Separate parent-facing feedback from teacher-facing notes.
- Output remains draft-only.

## 10) Frontend integration rule

Planned integration behavior:

- `Homework.jsx` calls a service wrapper in a later phase.
- Generated output populates editable draft fields only.
- No auto-save.
- No auto-release.
- Teacher edits before `Save draft`.
- Existing release flow remains unchanged.

## 11) Environment/secrets

- Provider API key stored in Supabase Edge Function secrets only.
- Never place provider secret in `VITE_*` frontend environment variables.
- Never commit real keys.
- `.env.local` must not be committed.
- Documentation can include safe placeholder keys/examples only.

## 12) Testing plan

Future tests to add:

- Edge Function mock invocation test.
- No real provider by default test.
- Auth required test.
- Parent/student blocked test.
- Teacher assigned-class allowed test.
- Branch supervisor own-branch allowed test.
- No env leak test.
- Output shape validation test.
- No auto-release regression test.

## 13) Logging/audit plan

Future audit fields to track:

- `generated_by_ai` boolean
- `ai_model`
- `ai_generated_at`
- `reviewed_by_profile_id`
- approved/released timestamp
- teacher-edited flag (if available later)

Note:

- This may require future SQL design and migration work.
- Do not implement SQL changes in this planning step.

## 14) Risks/safeguards

Key risks:

- Hallucination.
- Unfair marking.
- Privacy leakage.
- Prompt injection from uploaded work.
- Weak evidence quality.
- OCR/vision errors.
- Teacher over-reliance.
- Cost/rate limits.
- Parent misunderstanding.
- Provider downtime.

Safeguard direction:

- Preserve draft-only output.
- Preserve mandatory teacher approval gate.
- Enforce strict scope checks and data minimization.
- Keep conservative fallback behavior when evidence is weak.

## 15) Implementation sequence

Phase 1: this contract plan.  
Phase 2: Edge Function mock/stub with no provider.  
Phase 3: frontend service wrapper calls stub.  
Phase 4: role/scope tests.  
Phase 5: real provider behind Edge Function.  
Phase 6: audit/logging SQL design.  
Phase 7: OCR/rubric expansion.

## 16) Recommended next milestone

Recommendation: **Edge Function mock/stub with no real provider**.

Why this next:

- Proves server boundary and request/response shape.
- No provider key required yet.
- Safer than direct real provider integration.
- Keeps current mock UI flow stable.

## 17) Next implementation prompt

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement Supabase Edge Function mock/stub for homework AI draft contract only.

Hard constraints:
- Do not change app UI.
- Do not change existing release flow.
- Do not wire real AI provider.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not change Supabase SQL or RLS.
- Do not use service role key in frontend.
- Keep demo/local fallback behavior.
- No auto-save and no auto-release behavior.
- Use fake/dev data only.

Scope:
1) Add/prepare Edge Function stub (recommended name: generate-homework-feedback-draft).
2) Accept request contract fields:
   - homeworkSubmissionId
   - homeworkTaskId
   - studentId
   - classId
   - teacherObservation
   - mode
   - tone
   - length
3) Return deterministic mock `data/error` response shape:
   - markingSummary
   - feedbackText
   - nextStep
   - learningGaps
   - teacherNotes
   - safetyNotes
   - modelInfo
4) Enforce auth + role/scope gate (teacher assigned class, branch supervisor own branch, HQ).
5) Explicitly deny parent/student callers.
6) Add/update docs checkpoint for this milestone.

Validation efficiency:
- Run `git diff --name-only` first.
- Run build/lint/typecheck only if runtime files changed.
- Do not run unrelated suites.
```

## 18) Implementation checkpoint (Edge Function stub complete)

- Added Supabase Edge Function stub at `supabase/functions/generate-homework-feedback-draft/index.ts`.
- Added local handler module at `supabase/functions/generate-homework-feedback-draft/handler.js` for deterministic contract validation.
- Added local contract test script at `scripts/ai-homework-edge-function-stub-test.mjs`.
- Added package command: `npm run test:ai:homework-edge:stub`.

Stub behavior now:

- POST-only endpoint.
- Requires Authorization Bearer token presence (header check only in this phase).
- Validates required request fields:
  - `homeworkSubmissionId`
  - `homeworkTaskId`
  - `studentId`
  - `classId`
- Accepts optional:
  - `teacherObservation`
  - `mode`
  - `tone`
  - `length`
- Returns `data/error` response shape with draft-only mock output.
- Returns:
  - `405` for invalid method
  - `401` for missing auth
  - `400` for invalid request
  - `500` for unexpected error

Safety status:

- No real provider/API call.
- No provider key usage.
- No service role usage in frontend.
- No auto-save and no auto-release behavior.
- Safety notes and model metadata explicitly mark draft-only, teacher approval required.

Still future (not implemented in this phase):

- JWT verification against Supabase auth/session internals.
- Role/scope authorization checks (teacher assigned class / supervisor own branch / HQ).
- Submission/task/student/class relationship checks.
- Real provider adapter behind Supabase secrets.

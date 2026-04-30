# AI Homework Provider Adapter Plan

Planning scope:

- Docs/planning only.
- No app UI changes.
- No runtime logic changes.
- No new services in this step.
- No Edge Function code changes in this step.
- No function deployment in this step.
- No real provider/API calls.
- No SQL/RLS changes.

## 1) Current AI state

Current implementation baseline:

- Mock homework feedback context builder exists.
- Mock homework feedback generator exists.
- Teacher mock AI draft button exists in Homework review panel.
- Edge Function stub exists (`generate-homework-feedback-draft`).
- Edge Function auth/scope checks exist.
- Frontend wrapper exists for Edge Function invocation.
- Deployed regression script exists, with prior `CHECK` skip when function was unavailable in dev.
- Real AI provider is not wired.
- OCR/vision/rubric marking is not implemented.

## 2) Product purpose

Provider integration should support teacher marking and feedback drafting, not replace teacher judgment.

Non-negotiable product rules:

- AI output remains draft-only.
- Teacher review/edit/approval remains mandatory.
- Parent sees only human-released feedback.
- No auto-save and no auto-release to parent.

## 3) Provider adapter role

Provider adapter belongs server-side inside the Edge Function boundary.

Adapter responsibilities:

- Receive safe homework context payload.
- Call real provider later using server-side secrets.
- Normalize provider response into existing draft output shape.
- Return stable `{ data, error }` contract.
- Keep provider keys fully hidden from frontend.

## 4) Provider secrets boundary

Secret boundary requirements:

- Provider key lives only in Supabase Edge Function secrets.
- Never in `VITE_*` variables.
- Never in frontend code/runtime.
- Never committed to repo.
- Never logged (no key logging).
- Never print env values in logs/errors.

## 5) Request shape

MVP request should stay close to existing contract:

- `homeworkSubmissionId`
- `homeworkTaskId`
- `studentId`
- `classId`
- `teacherObservation`
- `mode`
- `tone`
- `length`

Optional future fields:

- `rubricId`
- `curriculumProfileId`
- `evidenceSummaryId`
- `extractedTextId`

## 6) Context inputs

Safe context plan:

- assignment title/instructions/subject/due date
- assignment scope (`class` / `selected_students` / `individual`)
- student school/curriculum profile
- class learning focus
- active student goals
- uploaded homework metadata
- marked-file metadata
- teacher observation
- previous released feedback summary when policy-safe

Context caution:

- Avoid unnecessary internal/sensitive fields.
- Do not include raw sensitive internals unless justified by policy and required for quality/safety.

## 7) Response shape

Keep response aligned to existing structure:

- `markingSummary`
- `feedbackText`
- `nextStep`
- `learningGaps`
- `teacherNotes`
- `safetyNotes`
- `modelInfo`

Future optional fields:

- `confidence`
- `evidenceUsed`
- `needsTeacherReview`
- `rubricBreakdown`

## 8) Safety rules for generated content

Generation safety requirements:

- No fabricated observations.
- No diagnostic/medical labels.
- No overconfident claims beyond evidence.
- No sensitive internal notes in parent-facing text.
- No punishment/shaming language.
- Parent-friendly wording only.
- Keep teacher-facing caution notes separate from parent-facing feedback.
- Use conservative fallback when evidence is weak.

## 9) Draft-only approval gate

Approval gate behavior remains:

- AI draft fills editable teacher fields only.
- No automatic save.
- No automatic release.
- Teacher must review/edit/approve before save/release actions.
- Existing release workflow remains final gate.
- Parent never sees unreleased AI output.

## 10) OCR/vision separation

Do not combine real provider text generation with OCR/vision in MVP adapter phase.

Plan OCR/vision as later phase:

1. Extract text/evidence from uploaded homework/marked files.
2. Summarize evidence safely.
3. Pass evidence summary to text-generation provider.

Reason:

- Prevents false implication that AI has read files when file-content extraction is not yet implemented.

## 11) Cost/rate-limit controls

MVP control plan:

- Limit generated output length.
- Require explicit staff action for each generation.
- No automatic batch generation in MVP.
- Timeout handling for provider calls.
- Safe retry behavior (bounded retries only).
- Add basic operational logging later without sensitive content.

## 12) Error/fallback behavior

Fallback plan:

- Provider unavailable -> safe error message.
- Weak context -> prompt teacher to add observation/context.
- Invalid provider response -> fallback to safe draft/no draft response.
- Never block manual teacher feedback workflow if AI path fails.

## 13) Audit/logging future

Future audit plan (later phase):

- Track who generated AI draft.
- Track when generated.
- Track submission/task IDs.
- Track model/provider used.
- Track whether teacher edited before release.
- Avoid full sensitive prompt logging by default unless explicitly designed and approved.
- Plan dedicated audit table later.

## 14) Testing plan

Future validation targets:

- Provider disabled still uses mock/stub path safely.
- Missing provider key fails safely.
- Invalid provider response fails safely.
- Parent/student blocked.
- Teacher/branch supervisor/HQ scoped access validated.
- No auto-save and no auto-release regressions.
- Response shape remains stable.
- No provider key printed/logged.

## 15) Implementation sequence

Recommended phased sequence:

- Phase 1: this provider adapter plan.
- Phase 2: deploy/check Edge Function in dev and rerun deployed regression.
- Phase 3: provider adapter stub with provider disabled.
- Phase 4: provider adapter with fake provider response.
- Phase 5: real provider behind Edge Function secret boundary.
- Phase 6: feature-flagged UI path.
- Phase 7: audit/logging.
- Phase 8: OCR/vision/rubric later.

## 16) Recommended next milestone

Choose:

- A. Deploy Edge Function to Supabase dev + rerun deployed regression
- B. Provider adapter stub with provider disabled
- C. Real provider adapter wiring
- D. AI audit/logging SQL planning
- E. OCR/vision evidence extraction planning
- F. Announcements/Internal Communications planning

Recommendation: **A. Deploy Edge Function to Supabase dev + rerun deployed regression**

Why A first:

- Deployed regression previously `CHECK`-skipped because function was unavailable.
- Live auth/scope boundary should be validated before provider integration work.
- Provider wiring should not begin until server boundary is proven in dev.

Current status note:

- Latest deploy attempt from this environment was blocked by missing Supabase CLI access token.
- Deployed regression still reports function unavailable (`CHECK` skip).
- Provider remains disabled/unwired.
- No provider keys were added.
- Teacher approval gate remains mandatory.

## 17) Next implementation prompt

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
Deploy `generate-homework-feedback-draft` Edge Function to Supabase dev and rerun deployed regression.

Hard constraints:
- Do not change app UI.
- Do not change runtime logic.
- Do not wire real provider in this step.
- Do not add provider keys to frontend.
- Do not expose env values/secrets.
- Do not commit .env.local.
- Do not change Supabase SQL/RLS.
- Do not use service role key in frontend.
- Keep draft-only + teacher approval + no auto-release behavior.

Steps:
1) Verify Supabase project linkage/CLI status for dev environment.
2) Deploy `generate-homework-feedback-draft` function to dev.
3) Run deployed regression:
   - `npm run test:ai:homework-edge:deployed`
4) Capture PASS/WARNING/CHECK outcomes and fixture availability notes.
5) Document deployment + regression checkpoint.

Validation rule:
- Runtime/deploy step; run only targeted commands above plus `git diff --name-only` for changed files.
```

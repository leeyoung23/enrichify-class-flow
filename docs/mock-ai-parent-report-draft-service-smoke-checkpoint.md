# Mock AI Parent Report Draft Service Smoke Checkpoint

Date: 2026-05-02  
Scope: service + smoke checkpoint for deterministic mock AI parent report draft generation (no UI wiring)

## 1) Milestone summary

- Added service helper:
  - `generateMockAiParentReportDraft({ reportId, input })`
  - file: `src/services/supabaseWriteService.js`
- Added focused smoke script:
  - `scripts/supabase-ai-parent-report-mock-draft-smoke-test.mjs`
- Added package command:
  - `npm run test:supabase:ai-parent-report:mock-draft`
- No app UI changes.
- No runtime page behavior changes.
- No SQL/RLS changes.
- No real provider integration.
- No PDF/export.

## 2) Helper behavior

- Uses existing anon client + JWT + RLS path only.
- No service-role usage.
- No external AI provider call.
- No Edge Function/provider-key path.
- Creates report version through existing `createAiParentReportVersion(...)`.
- Forces `generationSource='mock_ai'`.
- Returns stable `{ data, error }` plus optional warning passthrough.
- Uses safe generic error handling.

## 3) Input contract + validation

Input shape (all optional fields):

- `studentSummary`
- `attendanceSummary`
- `lessonProgression`
- `homeworkCompletion`
- `homeworkPerformance`
- `strengths`
- `improvementAreas`
- `learningGaps`
- `teacherObservations`
- `nextRecommendations`
- `parentSupportSuggestions`
- `teacherFinalComment`
- `evidenceSummaries`

Validation/safety:

- `input` must be object when provided.
- Rejects private path-like content.
- Rejects bucket/path/private URL/local file path patterns.
- Rejects provider/debug metadata patterns.
- Uses insufficient-data fallback wording for missing content.

## 4) Structured output behavior

Generated deterministic sections:

- `summary`
- `attendance_punctuality`
- `lesson_progression`
- `homework_completion`
- `homework_assessment_performance`
- `strengths`
- `areas_for_improvement`
- `learning_gaps`
- `next_recommendations`
- `parent_support_suggestions`
- `teacher_final_comment`

Quality guardrails:

- parent-friendly, deterministic wording,
- no diagnosis-like claims,
- no unsupported harsh labels,
- no overclaiming,
- insufficient-data fallback when needed.

## 5) Teacher approval boundary

- Helper creates a version only.
- No auto submit/approve/release.
- No report status promotion beyond normal explicit lifecycle actions.
- No parent visibility until explicit release.

## 6) Smoke coverage

Focused smoke target list:

- fake/dev draft report create,
- mock draft generation PASS,
- version source `mock_ai` PASS,
- required sections present PASS,
- fallback wording with missing input PASS,
- parent draft block PASS,
- `real_ai` blocked PASS,
- no real provider/PDF/notification/email side effects PASS,
- release-only parent visibility path PASS (fixture/RLS dependent),
- cleanup archive PASS (fixture/RLS dependent).

## 7) Safety boundaries preserved

- No SQL/RLS changes.
- No SQL apply.
- No service-role frontend usage.
- No provider keys.
- No real provider wiring.
- No auto-release behavior.
- Parent draft block preserved.
- PDF/export deferred.

## 8) Remaining future work

- Staff UI `Generate Mock Draft` button wiring (future milestone).
- Optional extraction of generation helper into a dedicated draft service module.
- Real provider planning and server-side adapter boundary.
- PDF/export planning and implementation.

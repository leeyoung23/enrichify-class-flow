# Mock AI Homework Feedback Button Checkpoint

## 1) What was implemented

Teacher Homework review UI now includes a mock-only AI draft action that helps staff generate draft feedback safely. The new action populates existing editable feedback fields only and keeps teacher-controlled save/release workflow unchanged.

## 2) Files changed

- `src/pages/Homework.jsx`
- `docs/ai-homework-marking-feedback-plan.md`
- `docs/mock-homework-ai-feedback-context-checkpoint.md`
- `docs/teacher-homework-review-ui-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) AI draft UI behavior

- Button label: `Draft feedback with AI`.
- Mock-only local generation path.
- Fills editable feedback text.
- Fills next step.
- Fills staff-only internal note / teacher note where safe.
- No auto-save.
- No auto-release.
- Teacher review/edit remains required before save/release actions.

## 4) Context used

- homework task title/instructions/subject/due date
- submission note
- uploaded file metadata only
- student/class learning context when safely available
- default tone/length/mode
- safe fallback when richer context is unavailable

## 5) Safety/approval boundaries

- no real AI API call
- no provider keys
- no Supabase Edge Function provider call
- no claim of reading file content
- no diagnostic claims
- no raw UUID leak
- internal note remains staff-only
- parent sees only released human-approved feedback

## 6) demoRole behavior

- demo/local path remains provider-free
- no Supabase/provider auto-actions
- no auto-save/release

## 7) Tests

Validated in the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:supabase:homework:feedback`

## 8) What remains

- real provider contract
- Supabase Edge Function integration
- OCR/text extraction
- rubric-based marking
- AI audit/telemetry
- teacher feedback loop
- stronger teacher observation input

## 9) Recommended next milestone

Recommendation: **A. Supabase Edge Function real AI provider contract planning**

Why A next:

- visible mock AI workflow is now proven in teacher UI
- next step should be contract planning, not direct provider wiring
- provider keys must stay server-side
- role/scope checks must be planned before any real AI calls
- teacher approval gate must remain mandatory

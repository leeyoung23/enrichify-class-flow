# AI Homework Marking/Feedback Plan

## 1) Current foundation

- Homework upload/review/release human workflow exists and is checkpointed.
- Curriculum/student context layer exists across class/student/parent read surfaces.
- Parent-visible release gate exists (`released_to_parent` path).
- Curriculum-aware AI parent comment mock exists (`aiDraftService` mock/context-aware flow).
- No real AI provider integration is wired yet.

## 2) Product vision

AI homework capability should be a teacher-approved intelligence layer that supports:

- homework/assignment marking drafts,
- feedback drafting,
- learning gap detection,
- next-step recommendations.

Guardrails:

- AI supports teachers; it does not replace teacher judgment.
- AI output must be reviewed/edited/approved by teacher/staff.
- Nothing AI-generated is auto-released to parents.

## 3) AI workflow

Planned flow:

1. Parent/student uploads homework evidence.
2. Teacher opens submission in Homework review panel.
3. AI analyzes homework evidence plus curriculum/student context.
4. AI drafts marking/feedback/gaps/next steps.
5. Teacher reviews/edits AI draft.
6. Teacher/supervisor uses existing approval/release controls.
7. Parent sees released, human-approved feedback only.

## 4) Context inputs

Safe inputs for AI draft generation:

- homework task title/instructions/subject,
- uploaded file metadata,
- extracted text later if OCR/document parsing is added,
- teacher observation,
- curriculum profile,
- class learning focus,
- student learning goals,
- student school profile,
- previous reviewed feedback where policy-safe.

Avoid inputs:

- payment/fee data,
- staff time clock data,
- private internal notes unless explicitly allowed by policy,
- unapproved Memories/media,
- medical/diagnostic labels,
- raw IDs,
- unnecessary personal data.

## 5) Output types

AI may draft:

- marking summary,
- strengths,
- areas to improve,
- learning gaps,
- next steps,
- parent-friendly feedback,
- teacher-facing internal suggestions,
- optional rubric/checklist alignment in a later phase.

## 6) Teacher approval gate

- AI output is draft-only.
- Teacher must review/edit/approve.
- Released parent feedback remains controlled by existing release flow.
- AI draft should be visibly labeled as AI-assisted draft.
- Audit trail should record AI involvement in a later telemetry phase.

## 7) Architecture recommendation

Recommended architecture:

- Use Supabase Edge Function for real provider integration later.
- Keep provider keys server-side only in Edge Function secrets.
- Frontend never receives provider secrets.
- Use anon JWT for caller identity.
- Run role/scope checks before AI generation.
- Reuse existing homework submission and curriculum context services.
- Keep service response contract stable as `{ data, error }`.

## 8) Service contract plan

Future method:

```js
generateHomeworkFeedbackDraft({
  homeworkSubmissionId,
  homeworkTaskId,
  studentId,
  classId,
  teacherObservation,
  mode,
  tone,
  length
})
```

Expected result:

```js
{
  markingSummary,
  feedbackText,
  nextStep,
  learningGaps,
  teacherNotes,
  safetyNotes,
  modelInfo
}
```

## 9) File/content handling

Planned phases:

- Phase 1: task/submission metadata + teacher observation only.
- Phase 2: text extraction support for PDFs/images if safe and controlled.
- Phase 3: AI vision/OCR for uploaded homework evidence.
- Phase 4: rubric-based marking expansion.

Privacy and cost controls:

- strict data minimization per request,
- limit payload size and extraction scope,
- cache/trace context safely,
- add rate/cost guardrails before real provider rollout.

## 10) Prompt design

Prompt requirements:

- System instruction: education assistant, supportive, evidence-based.
- Must not invent performance or evidence.
- Must explicitly say when evidence is insufficient.
- Must avoid diagnosis and judgmental language.
- Must output teacher-editable draft content.
- Must separate parent-facing feedback from internal teacher notes.

## 11) UI placement

Recommended placement: `Homework` page teacher review panel.

Suggested action labels:

- `Draft feedback with AI`
- or `Generate AI draft`

Behavior:

- Fill editable feedback fields in teacher review panel.
- Do not display AI output directly to parent.

## 12) Testing plan

Future tests:

- mock homework AI context assembly test,
- no-real-provider-by-default test,
- Edge Function mock invocation contract test,
- no-env/provider-secret leak check,
- parent cannot trigger AI marking for other students,
- AI output never auto-released test.

## 13) Risks/safeguards

Risks:

- hallucinated marking,
- unfair grading,
- bias,
- overconfident feedback,
- weak evidence from poor upload quality,
- privacy leakage,
- parent misunderstanding,
- teacher over-reliance,
- cost/rate-limit pressure,
- OCR/vision extraction errors.

Safeguards:

- draft-only gate and mandatory teacher approval,
- explicit evidence-grounding prompts,
- conservative fallback when evidence is weak,
- role/scope checks before generation,
- privacy minimization and redaction rules,
- staged rollout with quality review.

## 14) Implementation sequence

- Phase 1: this plan.
- Phase 2: mock homework AI context builder.
- Phase 3: teacher Homework UI AI draft button (mock only).
- Phase 4: Supabase Edge Function contract.
- Phase 5: real provider behind Edge Function.
- Phase 6: teacher feedback/audit telemetry.
- Phase 7: rubric/assignment marking expansion.

## 15) Recommended next milestone

Recommendation: **Mock homework AI context builder**

Why next:

- Proves context assembly quality before any real provider connection.
- Safer than immediate provider integration.
- Preserves teacher approval gate and release controls.
- Prepares stable context contract for later Edge Function/provider work.

## 16) Next implementation prompt

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
Mock homework AI context builder only.

Constraints:
- Do not change app UI in this step.
- Do not change runtime logic outside mock context assembly boundaries.
- Do not add real AI provider calls.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not add new backend services in this step.
- Do not change Supabase SQL or RLS policies.
- Do not upload files.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.
- Use fake/dev data only.

Deliverables:
1) Add a homework AI mock context builder in service layer (planning-safe naming and payload shape).
2) Assemble only safe inputs:
   - homework task metadata
   - submission metadata
   - teacher observation
   - curriculum/profile/goal context (role-scoped)
3) Return deterministic mock draft output for:
   - marking summary
   - feedback draft
   - next step
   - learning gap notes
4) Keep output draft-only and explicitly labeled as AI-assisted mock.
5) Do not connect to parent release path.
6) Add/update docs checkpoint for this phase.

Validation efficiency:
- Run git diff --name-only first.
- If runtime files changed, run targeted build/lint/typecheck only.
- Do not run unrelated suites.
```

## 17) Implementation checkpoint (mock context builder complete)

- Mock homework AI context builder is now added in `src/services/aiDraftService.js`.
- New helper methods:
  - `buildHomeworkFeedbackDraftContext(...)`
  - `generateMockHomeworkFeedbackDraft(context)`
- Context builder uses safe homework/curriculum fields and uploaded file metadata only (name/type/size).
- Mock output remains draft-only and includes explicit safety note (no auto-release).
- No real provider integration was added.
- No real AI/API call is made.
- Teacher approval gate remains mandatory before release path actions.
- Focused test added:
  - `scripts/ai-homework-feedback-mock-test.mjs`
  - run via `npm run test:ai:homework-feedback:mock`

## 18) Implementation checkpoint (teacher UI mock button complete)

- Teacher Homework review panel now includes mock-only action:
  - `Draft feedback with AI`
- Implemented in `src/pages/Homework.jsx` using local mock generator path only.
- Button behavior:
  - no real provider call,
  - no Edge Function/provider wiring,
  - populates editable draft fields (`feedbackText`, `nextStep`, and staff-only note),
  - does not auto-save,
  - does not auto-release.
- Output remains clearly draft-only with teacher review/edit required before save/release.

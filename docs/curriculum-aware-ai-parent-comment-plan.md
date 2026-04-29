# Curriculum-Aware AI Parent Comment Plan

## 1) Current AI state

- AI generation is currently mock/fallback and draft-only.
- Frontend does not call any real AI provider directly.
- Parent comment release remains teacher/staff approval-gated.
- No direct LLM secret exists in browser runtime.
- Existing pattern is `src/services/aiDraftService.js` -> Supabase Edge Function scaffold (or local fallback).

## 2) Why parent comments first

Parent comments are the best first curriculum-aware AI feature because they are useful, low-risk, and already workflow-aligned.

- Lowest-risk useful AI entry point in current product shape.
- Teacher already reviews parent comments before release.
- Directly aligns with `ParentUpdates` draft/release workflow.
- Can already leverage class/student curriculum context now.
- Does not depend on homework upload/review pipeline being complete.

## 3) Context inputs

Use safe, minimal context inputs for first curriculum-aware drafts:

- Student display label (name or safe label).
- Class name.
- Subject.
- Latest parent update context (if available and role-authorized).
- Student school profile summary.
- Curriculum profile summary.
- Class learning focus.
- Student learning goals.
- Teacher-provided observation.
- Optional tone preference (later controlled option).

Avoid in first implementation slice:

- Sensitive/private internal notes unless explicitly approved for AI context.
- Raw internal IDs in prompt context.
- Excessive personal data not needed for drafting.
- Medical/diagnostic labels.
- Unapproved Memories/media content.
- Payment/fee data.
- Staff time clock data.

## 4) Draft output requirements

AI draft output should be constrained to:

- One short parent-friendly comment.
- Supportive, clear tone.
- Specific enough to be useful, without overclaiming.
- No diagnosis.
- No judgmental or shaming wording.
- No fake achievements or fabricated evidence.
- Clearly teacher-editable draft only.

## 5) Human approval gate

- AI draft must never auto-send to parents.
- Teacher must review/edit before release.
- Draft label should be clearly visible in workflow.
- Add structured audit trail later when governance/logging phase is expanded.

## 6) Architecture rule

Recommended architecture boundary:

- Frontend calls Supabase Edge Function only.
- Edge Function holds provider key (future real-provider phase).
- Frontend never receives provider secret.
- Anon JWT identifies caller session.
- Function validates role/scope as required.
- Service layer returns stable `{ data, error }` shape.

## 7) Service/function contract

Planned method:

`generateParentCommentDraft({ studentId, classId, observation, tone, length })`

Expected result:

```json
{
  "draftText": "string",
  "modelInfo": "optional",
  "safetyNotes": "optional"
}
```

Notes:

- Current runtime already uses `generateParentCommentDraft(...)` naming in `aiDraftService`; align payload fields in a backward-compatible way during implementation.
- Keep contract normalized at service layer even if edge payload uses snake_case.

## 8) Prompt/context design

High-level strategy for the first curriculum-aware draft prompt:

- System instruction: education assistant; supportive, parent-friendly language.
- Context block: curriculum profile + class focus + student goals + teacher observation.
- Output instruction: one short paragraph; editable draft for teacher review.
- Safety rule: do not invent details or achievements not present in provided context.

## 9) UI placement

Recommended first placement:

- `ParentUpdates` page, inside Quick Comment / parent communication workflow.
- Primary action label: `Draft with AI` (or `Generate draft`).
- Teacher remains in control of all save/release actions.

## 10) Mock-to-real migration

- **Phase 1:** current mock/fallback state.
- **Phase 2:** curriculum-aware mock using local authorized context assembly.
- **Phase 3:** Supabase Edge Function contract stabilization for curriculum-aware payload.
- **Phase 4:** real provider integration behind Edge Function secret boundary.
- **Phase 5:** logging/evaluation + teacher feedback loop for quality/safety tuning.

## 11) Testing plan

Future-focused tests:

- Curriculum-aware mock AI draft test.
- Edge Function mock invocation contract test.
- No real provider test by default.
- Role/scope authorization test.
- No env/provider secret leak check.
- Teacher approval/release gate remains required test.

## 12) Risks and safeguards

Primary risks:

- Overconfident AI wording.
- Hallucinated student progress.
- Privacy leakage from excessive context.
- Biased or judgmental language.
- Parent misunderstanding from ambiguous phrasing.
- Teacher over-reliance on AI drafts.
- Curriculum mismatch in generated language.
- Poor data minimization practices.

Safeguards:

- Strict prompt policy and output constraints.
- Human review/edit/release gate remains mandatory.
- Least-data context assembly.
- Safety note hooks in response contract (optional `safetyNotes`).
- Iterative quality review via teacher feedback before wider rollout.

## 13) Recommended next milestone

Recommended: **A. Curriculum-aware AI mock context upgrade**.

Why A first:

- Proves safe context assembly quality before any real provider connection.
- Safer than immediate API/provider integration.
- Reduces generic output by grounding draft text in curriculum/student context.
- Preserves teacher approval gate while improving usefulness.

## 14) Next implementation prompt (A only)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
Curriculum-aware AI mock context upgrade (Phase A only).

Guardrails:
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not change Supabase SQL or RLS policies.
- Do not remove demoRole.
- Do not remove demo/local fallback.

Implementation scope:
1) Upgrade mock draft generation context assembly for parent comments using authorized local/Supabase-read context only:
   - student display label
   - class name
   - subject
   - latest parent update context (if available)
   - student school profile summary
   - curriculum profile summary
   - class learning focus
   - student learning goals
   - teacher observation
2) Keep output draft-only and teacher-editable.
3) Keep ParentUpdates teacher approval/release gate unchanged.
4) Add clear "mock/context-aware" source summary metadata in draft response.
5) Add/update docs checkpoint for this phase.

Validation efficiency:
- Run `git diff --name-only` first.
- If only docs changed, stop there.
- If runtime files changed, run targeted build/lint/typecheck and relevant AI mock tests only.
```

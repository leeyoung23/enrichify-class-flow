# Parent Homework Feedback Display Plan

## 1) Current state

- Parent can see homework status/list in `ParentView`.
- Parent can upload homework for assigned/open tasks in `ParentView`.
- Teacher/staff can review and release feedback in `Homework`.
- Parent-visible feedback service path exists via `listHomeworkFeedback({ parentVisibleOnly: true })`.
- Full parent-facing homework feedback display remains future and is the next planned output layer.

## 2) Product principle

Parent-facing homework feedback display is the output layer of the homework workflow.

- Parents should only see feedback that is explicitly released/approved for parent visibility.
- Parent copy should be supportive, clear, and actionable.
- Internal notes and draft feedback must never be shown in parent UI.
- No AI-generated feedback should be shown to parents without human teacher/staff review and release.

## 3) Parent workflow

Planned parent-visible workflow:

1. Parent submits homework.
2. Parent sees submitted/under review status.
3. Staff reviews submission in teacher/staff workflow.
4. Staff releases feedback to parent.
5. Parent sees `feedback_text` and `next_step` only after release.
6. Parent never sees `internal_note`.

## 4) UI placement

Recommendation:

- Keep feedback display inside `ParentView` Homework section.
- Render released feedback summary under each task status in the per-task card.
- Optionally add an expandable `View teacher feedback` control on the same card.
- Do not add a separate route in this milestone.

## 5) MVP UI sections

Recommended parent feedback display content:

- Status badge.
- Feedback text.
- Next step.
- Released date.
- Supportive empty/waiting copy when feedback is not yet released.
- Returned-for-revision parent copy where relevant.

## 6) Data/service usage

Use existing services only:

- `listHomeworkFeedback({ homeworkSubmissionId, parentVisibleOnly: true })`
- `listHomeworkTasks(...)`
- `listHomeworkSubmissions(...)`

No new service should be added unless an unavoidable read gap appears during implementation.

## 7) Parent safety rules

- `parentVisibleOnly` must always be `true` for parent feedback reads.
- Never expose `internal_note`.
- Never expose draft or approved-but-not-released feedback.
- Never expose teacher-only fields/actions.
- Never allow cross-student or cross-family visibility.
- Do not show raw IDs in parent-facing UI.

## 8) demoRole behavior

- demoRole remains local/demo placeholder only.
- In demo mode, no Supabase feedback/task/submission reads or writes run.
- In demo mode, no uploads and no signed URL usage run.

## 9) Mobile-first design

- Keep feedback card concise and scannable on small screens.
- Avoid long rubric-style teacher language in parent-facing blocks.
- Keep `next_step` explicit and easy to act on.
- Prevent overwhelming parent users with dense detail in one view.

## 10) AI future connection

- AI homework feedback may later help draft teacher feedback.
- Teacher/staff review and release remains mandatory before parent visibility.
- Parent display should not depend on whether draft origin was AI or human.
- Audit/evaluation of AI quality and safety is a later milestone.

## 11) Risks and safeguards

Risks:

- Internal note leakage.
- Draft feedback exposure.
- Harsh/judgmental wording reaching parent UI.
- Parent misunderstanding of feedback intent.
- Feedback shown before teacher release.
- Wrong child/assignment feedback shown.
- AI overclaiming risk in later phases.

Safeguards:

- Enforce `parentVisibleOnly: true` in parent feedback read path.
- Keep parent field mapping limited to parent-safe fields.
- Keep release-gated status checks for display.
- Keep supportive parent copy tone.
- Preserve linked-child/class scope and current RLS boundaries.

## 12) Recommended implementation sequence

- Phase 1: this plan.
- Phase 2: Parent released feedback display UI.
- Phase 3: returned-for-revision parent copy polish.
- Phase 4: notification/email later.
- Phase 5: AI homework feedback draft planning.

## 13) Recommended next milestone

Recommendation: **Parent released feedback display UI**.

Why next:

- Parent upload and teacher review/release paths already work.
- Parent now needs the final output layer to complete the workflow.
- This completes the human homework loop before introducing AI workflow complexity.

## 14) Next implementation prompt

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add parent homework feedback display plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent released homework feedback display UI only.

Scope rules:
- Do not change runtime logic outside ParentView parent feedback display rendering and wiring.
- Do not add services unless absolutely necessary.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not upload files.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Use fake/dev data only.

Implement:
1) In ParentView Homework task cards, show released feedback details only when available:
   - feedback_text
   - next_step
   - released date
2) Keep waiting/empty parent copy when feedback not yet released.
3) Keep returned-for-revision parent copy supportive and actionable.
4) Keep parent visibility path restricted to:
   - listHomeworkFeedback({ homeworkSubmissionId, parentVisibleOnly: true })
5) Never show:
   - internal_note
   - draft feedback
   - teacher-only fields/actions
   - raw IDs in parent UI
6) Preserve demoRole local-only behavior with no Supabase calls in demo mode.

Validation efficiency:
- Run git diff --name-only first.
- If only docs changed, do not run build/lint/typecheck.
- If runtime files changed, run build/lint/typecheck only.
```

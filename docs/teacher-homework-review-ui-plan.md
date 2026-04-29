# Teacher Homework Review UI Plan

This plan defines the next safe workflow layer: teacher-facing homework review UI, before parent-facing homework UI expansion.

## 1) Current backend state

- Homework backend entities exist and are already in dev use:
  - `homework_tasks`
  - `homework_submissions`
  - `homework_files`
  - `homework_feedback`
- Private storage bucket exists: `homework-submissions`.
- Metadata-first upload flow is proven with signed URL retrieval.
- Clean upload smoke now passes in dev after manual `014` + `015` + `016` patch chain.
- Parent linked-child submission path is proven.
- Parent draft/unreleased feedback remains hidden by policy.
- No dedicated teacher homework review UI is implemented yet.
- No dedicated parent homework status/feedback UI is implemented yet.

## 2) Product principle: input -> process -> output

Homework must follow a strict learning-evidence loop:

1. **Input:** parent/student submits homework evidence.
2. **Process:** teacher reviews submission and writes feedback.
3. **Output:** only approved/released feedback becomes parent-facing.

Core principle:

- Feedback is draft/internal first.
- Parent-visible feedback is release-gated.
- Internal coaching notes stay internal.
- Workflow clarity is more important than feature density.

## 3) Role behavior plan

### Teacher

- View homework tasks and submissions for assigned classes only.
- Open submitted files through scoped signed URL actions.
- Write and update draft feedback.
- Mark submission as reviewed/returned if permitted by role and service guard.

### Branch supervisor

- Monitor review completion and delays for own branch.
- Assist review where branch permissions allow.
- Focus on queue health/escalation, not daily teacher-level throughput.

### HQ

- Cross-branch overview of review progression and bottlenecks.
- No need for full teacher-level editing on every submission by default.

### Parent

- No teacher review UI access.

### Student

- No teacher review UI access.

## 4) UI placement recommendation

- Use `Homework` page as the main staff homework workflow surface.
- Teacher view should center on:
  - task list
  - submission queue
  - review panel
- Supervisor/HQ view should center on review monitoring summary plus drill-in.

## 5) MVP UI sections

Recommended MVP composition (workflow-first, mobile-friendly):

1. Task list / filter
2. Submission queue
3. Submission detail panel
4. View uploaded file button (signed URL open)
5. Feedback draft box
6. Next step field
7. Review status badge
8. Save draft feedback action
9. Mark reviewed action
10. Release later reminder/action stub (no immediate parent release coupling)

## 6) Feedback visibility rules

- `internal_note` must never be shown to parent surfaces.
- `feedback_text` and `next_step` become parent-visible only after release state.
- Release-to-parent flow can stay a separate phase from initial teacher draft UI.
- Avoid mixed-status confusion by showing explicit status chips in staff UI.

## 7) Data/service needs

Read side can use existing service methods:

- `listHomeworkTasks(...)`
- `listHomeworkSubmissions(...)`
- `listHomeworkFeedback(...)`
- `getHomeworkFileSignedUrl(...)`

Future write methods likely needed for full review lifecycle:

- `createOrUpdateHomeworkFeedback(...)`
- `markHomeworkSubmissionReviewed(...)`
- `returnHomeworkForRevision(...)`
- `releaseHomeworkFeedbackToParent(...)`

Guideline:

- Reuse existing service pattern (`supabase*Service` + anon JWT + strict validation) before adding UI state complexity.

## 8) Mobile/desktop design guidance

- Teacher workflow should be phone/tablet-friendly first.
- Supervisor/HQ monitoring should be tablet/desktop-friendly.
- Prefer cards, staged panels, and queues over dense data tables on phone widths.
- Keep primary review actions sticky/obvious on small screens.

## 9) AI future connection (draft-only)

Future AI feedback drafting can be grounded by:

- curriculum context
- student school profile context
- homework submission metadata
- teacher observation

AI guardrail:

- AI remains draft-only and teacher-approved.
- No direct provider calls in this phase.

## 10) Risks and safeguards

### Risks

- Wrong student file surfaced in review.
- Cross-family visibility leak.
- Accidental draft release to parent.
- Internal note leakage into parent-facing text.
- Teacher workload overload from queue design.
- Large file friction/latency.
- Unclear status transitions.
- Parent misunderstanding of draft vs released feedback.

### Safeguards

- Always resolve file access via scoped signed URL from metadata row.
- Keep release action separate from draft save action.
- Enforce parent-visible filtering by released status only.
- Display status transitions explicitly in staff UI.
- Keep upload/read limits and file constraints visible in UX copy.
- Add queue filters (class/status/date) to prevent overload.

## 11) Recommended implementation sequence

1. Phase 1: this plan
2. Phase 2: homework feedback write service + smoke test
3. Phase 3: teacher read-only submission queue UI
4. Phase 4: teacher feedback draft UI
5. Phase 5: release-to-parent flow
6. Phase 6: parent homework status/feedback UI
7. Phase 7: AI homework feedback draft

## 12) Recommended next milestone

Recommendation: **A. Homework feedback write service + smoke test**

Why A first:

- Feedback writing is the core of the review process.
- Service-level proof should land before UI wiring.
- This preserves loop integrity: input -> process -> output.
- It reduces UI rework by confirming lifecycle/status transitions first.

## 13) Next implementation prompt (A only)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add teacher homework review UI plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Homework feedback write service + smoke test only.

Scope constraints:
- Do not change app UI in this step.
- Do not change existing runtime logic outside homework feedback write path.
- Do not change Supabase SQL/RLS in this step.
- Do not upload real files.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.

Deliverables:
1) Add homework feedback write methods in service layer:
   - createOrUpdateHomeworkFeedback(...)
   - markHomeworkSubmissionReviewed(...)
   - returnHomeworkForRevision(...)
   - releaseHomeworkFeedbackToParent(...)
2) Add a fake/dev smoke test for homework feedback write lifecycle:
   - draft save
   - reviewed/returned transitions
   - release-to-parent visibility gate check
3) Keep teacher/parent homework UI unchanged in this step.
4) Update checkpoint docs for write-service milestone only.

Validation efficiency rule:
- If only docs/planning changed, run only:
  - git diff --name-only
- Do not run build/lint/typecheck/smoke suite unless runtime files changed.
```

---

Planning boundary for this milestone:

- Docs/planning only.
- No UI changes.
- No runtime logic changes.
- No SQL/RLS changes.

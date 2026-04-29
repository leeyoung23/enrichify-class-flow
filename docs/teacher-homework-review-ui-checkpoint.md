# Teacher Homework Review UI Checkpoint

This checkpoint records the teacher/staff homework review UI milestone and current boundaries.

## 1) What was implemented

- Teacher Homework review UI is now implemented in `src/pages/Homework.jsx`.
- Staff can review submissions in a queue-driven flow and open submitted files via signed URL actions.
- Staff feedback action flow is wired to existing homework services.
- Parent-facing homework upload/status and parent-facing homework feedback display are intentionally not implemented in this milestone.
- AI homework feedback remains future.

## 2) Files changed

- `src/pages/Homework.jsx`
- `src/services/supabaseUploadService.js`
- `docs/teacher-homework-review-ui-plan.md`
- `docs/homework-feedback-smoke-test-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Review UI placement

- Implemented on the existing `Homework` page.
- No new route was added.
- Page now provides a staff review workflow surface (queue -> detail -> actions).

## 4) Role/demoRole behavior

- Teacher / Branch Supervisor / HQ:
  - use Supabase-backed review flow when authenticated.
- Parent / Student:
  - do not get teacher review UI behavior.
- `demoRole`:
  - local placeholder only.
  - no Supabase reads/writes/signed URL calls in demo mode.

## 5) Submission/file viewing

- submission queue
- selected submission detail
- attachment cards
- View uploaded file via signed URL only
- `listHomeworkFiles(...)` helper is used for attachment listing

## 6) Feedback actions

- Save draft feedback using `createOrUpdateHomeworkFeedback(...)`
- Mark reviewed using `markHomeworkSubmissionReviewed(...)`
- Return for revision using `returnHomeworkForRevision(...)`
- Release to parent using `releaseHomeworkFeedbackToParent(...)` for Branch Supervisor/HQ only
- Teacher release is restricted in this milestone
- Mock-only `Draft feedback with AI` action now exists in `Homework` review panel:
  - fills teacher-editable draft fields only
  - no auto-save and no auto-release
  - no real provider/API call in this phase

## 7) Internal note protection

- `internal_note` is clearly labeled as staff-only.
- Parent-visible path remains protected.
- No parent preview/display is added on this page.

## 8) Tests

Validated in the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`

## 9) What remains

- Parent homework upload/status UI
- Parent-facing homework feedback display
- AI homework feedback draft
- broader production UX/mobile QA
- retention/deletion policy

## 10) Recommended next milestone

Recommendation: **A. Parent homework upload/status UI planning**

Why A first:

- Input path from parent should be visible next.
- Parent status UI completes the parent-side input loop.
- Feedback display can follow once parent can see submissions/status.
- AI should remain later after the full human workflow is visible.

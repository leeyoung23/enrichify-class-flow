# Teacher Marked Homework File UI Checkpoint

## 1) What was implemented

Teacher/staff marked homework file UI is now wired in `Homework` review detail panel for authenticated non-demo mode, using existing marked-file services while preserving demo/local behavior.

This checkpoint reflects runtime wiring only for teacher/staff `Marked work` actions in `Homework`. Parent marked-file display is intentionally out of scope.

## 2) Files changed

- `src/pages/Homework.jsx`
- `docs/teacher-marked-homework-file-ui-shell-checkpoint.md`
- `docs/manual-marked-homework-file-service-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Real marked-file UI behavior

- Authenticated non-demo `Marked work` section is wired.
- Section appears in Homework review detail panel.
- Loading state is shown while marked files load.
- Empty state is shown when no marked files exist.
- Upload controls are available for staff.
- Marked-file list/cards are shown for selected submission.
- `View` action is wired.
- `Release to parent` action is wired.
- Internal-until-release safety copy remains visible.
- Marked-work section remains separate from feedback action row.

## 4) Upload/list/view/release behavior

- List uses `listHomeworkFiles({ homeworkSubmissionId, fileRole: 'teacher_marked_homework' })`.
- Upload uses `uploadMarkedHomeworkFile({ homeworkSubmissionId, file, notes })`.
- Upload requires a valid selected submission UUID.
- Upload requires file selection.
- Service layer enforces file type/size validation.
- View uses `getHomeworkFileSignedUrl(...)`.
- Release uses `releaseHomeworkFileToParent({ fileId })`.
- Release updates marked-file release state only.
- No feedback auto-release behavior was added.
- No notification side effects were added.
- Release button respects supervisor/HQ role gate in UI; backend/RLS remains authoritative.

## 5) demoRole behavior

- Local-only fake flow remains unchanged.
- Fake upload simulation remains local.
- Fake release toggle remains local.
- Fake view action remains a local toast.
- No Supabase writes/uploads/signed URL calls for demo marked-file actions.
- No provider/API calls.

## 6) Workflow preservation

- `By Task` tracker unchanged.
- `By Student` tracker unchanged.
- `Create Homework` real save unchanged.
- Selected submission detail unchanged.
- Parent-uploaded file viewing unchanged.
- Feedback draft/review/release actions unchanged.
- Release role gate unchanged.
- Mock-only AI draft unchanged.
- No auto-save added.
- No auto-release added.

## 7) Tests

Executed in this wiring milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:marked-file`
- `npm run test:supabase:homework:feedback`
- `npm run test:ai:homework-feedback:mock`

Result: pass for the listed commands in this milestone run.

## 8) What remains

- Parent released marked-file display in `ParentView`
- AI OCR/provider integration for marked files
- Announcements/Internal Communications later

## 9) Recommended next milestone

Choose:

- A. Parent released marked-file display planning
- B. Wire Parent released marked-file display directly
- C. Resume AI provider integration
- D. Announcements/Internal Communications planning

Recommendation: **A. Parent released marked-file display planning**

Why A first:

- Staff upload/release UI is now real.
- Parent output is the next layer and must be planned carefully to avoid unreleased-file leakage.
- `ParentView` should only show released `teacher_marked_homework` files.
- Planning before wiring keeps child-data/privacy boundaries clear and reviewable.

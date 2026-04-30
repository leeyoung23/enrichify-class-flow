# Teacher Marked Homework File UI Shell Checkpoint

## 1) What was implemented

Teacher marked-file UI shell is now implemented in the `Homework` review detail panel.

This milestone is UI-shell only:

- marked-work section structure is added
- demo/local parity behavior is added
- authenticated real controls are intentionally visible but disabled
- no real marked-file upload/list/release service wiring is enabled yet

## 2) Files changed

- `src/pages/Homework.jsx`
- `docs/teacher-marked-homework-file-ui-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Marked work UI shell behavior

Added behavior in review detail panel:

- new `Marked work` section inside Homework review detail
- section is separate from feedback draft/release action row
- `Upload marked file` control
- optional staff note input
- marked-file list/card display
- status badge per file: `Internal` / `Released to parent`
- `View` action
- `Release to parent` action
- uploaded/released metadata placeholders (who/when)

## 4) demoRole behavior

`demoRole` remains local fake behavior only:

- fake upload simulation adds a local marked-file row
- fake release action toggles local release state
- fake view action shows a safe local toast only
- no Supabase writes
- no object uploads
- no signed URL calls for marked files
- no provider/API calls

## 5) Real authenticated behavior

For non-demo authenticated staff in this milestone:

- marked-work shell is visible to staff
- marked-file controls are currently disabled
- safe copy is shown: `Marked-file wiring coming next`
- no call to `uploadMarkedHomeworkFile(...)`
- no call to `releaseHomeworkFileToParent(...)`
- no call to `getHomeworkFileSignedUrl(...)` from marked-file section
- backend behavior remains unchanged

## 6) Workflow preservation

Existing workflow remains unchanged:

- `By Task` tracker behavior unchanged
- `By Student` tracker behavior unchanged
- `Create Homework` real save behavior unchanged
- selected submission detail behavior unchanged
- parent-uploaded file viewing behavior unchanged
- feedback draft/review/release actions unchanged
- release role gate unchanged
- mock-only AI draft flow unchanged
- no auto-save added
- no auto-release added

## 7) Tests

Executed during the UI-shell implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:marked-file`
- `npm run test:supabase:homework:feedback`
- `npm run test:ai:homework-feedback:mock`

Result: pass in the implementation checkpoint run, with no new regressions reported for this milestone.

## 8) What remains

- Real marked-file upload/list/release wiring in teacher UI
- Parent released marked-file display
- AI OCR/provider integration for marked files
- Announcements/Internal Communications later

## 9) Recommended next milestone

Choose:

- A. Wire real marked-file upload/list/release in teacher UI
- B. Parent released marked-file display planning
- C. Resume AI provider integration
- D. Announcements/Internal Communications planning

Recommendation: **A. Wire real marked-file upload/list/release in teacher UI**

Why A first:

- marked-file service methods already exist
- marked-file smoke coverage already exists
- marked-work UI shell now exists
- next missing step is connecting staff upload/list/release controls to the existing service safely
- parent display should follow only after staff controls are wired and validated end-to-end

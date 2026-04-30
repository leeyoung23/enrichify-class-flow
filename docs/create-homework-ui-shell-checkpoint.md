# Create Homework UI Shell Checkpoint

## 1) What was implemented

Create Homework UI shell is now implemented in `Homework` as a safe milestone before real write wiring.

- clear create entry point is available in the tracker workspace
- create shell is separate from submission review/release actions
- demo mode supports local fake create simulation
- authenticated mode remains preview-only for creation save
- existing By Task / By Student tracker and review/release flows remain preserved

## 2) Files changed

- `src/pages/Homework.jsx`
- `docs/teacher-homework-assignment-creation-ui-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Create Homework UI shell behavior

- clear `Create Homework` button near tracker mode controls
- shell/card remains separate from review detail panel
- fields included:
  - assignment type
  - class selector
  - conditional student selector
  - title
  - subject
  - instructions
  - due date
  - optional notes
- actions:
  - `Save`
  - `Cancel`
- optional `By Student` quick individual create entry point is available in demo mode

## 4) Assignment type behavior

Whole class:

- `assignment_scope = class`
- class required
- no student selection required

Selected students:

- `assignment_scope = selected_students`
- class required
- one or more students required
- selected count shown
- clear selection action available

Individual:

- `assignment_scope = individual`
- class required
- exactly one student required

## 5) demoRole behavior

- local-only fake data
- explicit demo safety copy in shell
- `Save` simulates local success only
- fake created task is appended to local state
- fake local assignee rows are created for selected/individual
- fake created task appears in demo tracker views
- no Supabase writes
- no file upload
- no provider/API calls
- no real AI

## 6) Real authenticated behavior

- create shell is preview-only in this milestone
- final save is intentionally blocked
- safe message indicates Create Homework wiring is coming next
- no call to `createHomeworkTaskWithAssignees(...)`
- real By Task tracker remains intact
- real By Student tracker remains intact
- review/release workflow remains intact

## 7) Review/release preservation

- submission queue unchanged
- selected submission detail unchanged
- file viewing/signed URL flow unchanged
- feedback text / next step / internal note unchanged
- `Save draft` unchanged
- `Mark reviewed` unchanged
- `Return for revision` unchanged
- `Release to parent` role gate unchanged
- mock AI draft button unchanged
- no auto-save introduced
- no auto-release introduced

## 8) Tests

Executed in the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:supabase:homework:tracker:read`
- `npm run test:supabase:homework:feedback`

Note:

- tracker-read smoke passed with safe non-fatal `CHECK` for unavailable parent linked-student fixture.

## 9) What remains

- wire real create save to `createHomeworkTaskWithAssignees(...)`
- post-create tracker refresh
- selected-student creation UX polish
- edit/archive assignment UI
- manual marked-file upload
- AI provider integration
- Announcements/Internal Communications later

## 10) Recommended next milestone

Recommendation: **A. Wire real Create Homework save**

Why A first:

- write service already exists
- UI shell already exists
- next missing step is connecting Save to `createHomeworkTaskWithAssignees(...)`
- this completes the teacher-side homework creation loop
- implementation can preserve demo/local safety and preserve the current review/release flow

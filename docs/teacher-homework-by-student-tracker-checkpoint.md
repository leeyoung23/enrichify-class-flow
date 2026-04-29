# Teacher Homework By Student Tracker Checkpoint

## 1) What was implemented

Real authenticated non-demo staff `By Student` tracker wiring is now implemented in `Homework`, complementing the existing real `By Task` tracker flow.

This checkpoint captures the student-tracker wiring milestone:

- authenticated non-demo `By Student` now reads tracker rows from `listHomeworkTrackerByStudent({ studentId })`
- student assigned-item cards now render tracker shape with safe status badges
- assigned-but-not-submitted rows are visible and safe
- existing review/release workflow remains preserved
- demo mode remains local-only and provider-free

## 2) Files changed in implementation milestone

- `src/pages/Homework.jsx`
- `docs/teacher-homework-by-task-tracker-checkpoint.md`
- `docs/teacher-homework-task-student-ui-shell-checkpoint.md`
- `docs/homework-tracker-read-service-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Real By Student tracker behavior

- authenticated non-demo staff mode uses `listHomeworkTrackerByStudent({ studentId })`
- assigned item cards render tracker shape:
  - `{ task, assignee, submission, status, hasReleasedFeedback }`
- status badges shown:
  - `Submitted`
  - `Not Submitted`
  - `Under Review`
  - `Returned`
  - `Feedback Released`
  - `Follow-up Needed` when overdue assigned/not-submitted state is derivable
- assigned-but-not-submitted items display safely
- selecting an item opens existing review flow when a submission exists
- no-submission items show a safe no-submission state

## 4) Student selection / empty state behavior

- real student selection uses visible loaded sources only
- source set includes:
  - visible submissions
  - `By Task` tracker assignees/submissions
  - selected submission context
- student IDs are UUID-gated
- tracker query runs only for valid UUID
- no guessed IDs are used
- safe empty state appears when no valid student exists
- first valid student/item auto-selects when available

## 5) Review detail preservation

- real `By Task` tracker remains preserved
- selected submission detail remains preserved
- file viewing/signed URL flow remains preserved
- feedback text remains preserved
- next step remains preserved
- internal note remains preserved
- `Save draft` remains preserved
- `Mark reviewed` remains preserved
- `Return for revision` remains preserved
- `Release to parent` role gate remains preserved
- mock-only `Draft feedback with AI` remains preserved
- no auto-save introduced
- no auto-release introduced

## 6) demoRole safety

- `By Task` / `By Student` demo remains local fake data only
- no Supabase reads/writes/uploads/signed URL calls in demo actions
- no real provider/API calls
- mock AI remains provider-free
- `demoRole`/local fallback remains preserved

## 7) Tests executed in implementation milestone

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:tracker:read`
- `npm run test:supabase:homework:feedback`
- `npm run test:ai:homework-feedback:mock`

Notes:

- tracker-read smoke passed with non-fatal `CHECK` for unavailable parent linked-student fixture
- assignees-read smoke was not rerun because shared read service code was not modified

## 8) What remains

- selected-student assignment write services
- manual marked-file upload flow
- AI provider integration
- Announcements/Internal Communications later

## 9) Recommended next milestone

Recommendation: **A. Selected-student assignment write services**

Why A first:

- teacher can now view both `By Task` and `By Student` tracker structures
- next missing workflow is creating/assigning selected-student or individual homework
- this directly completes the flexible enrichment homework assignment loop
- manual marked-file and AI provider work should follow once assignment creation is stable

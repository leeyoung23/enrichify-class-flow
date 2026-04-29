# Teacher Homework By Task Tracker Checkpoint

## 1) What was implemented

Real authenticated non-demo staff `By Task` tracker wiring is now implemented in `Homework`.

This checkpoint captures the tracker-wiring milestone:

- authenticated non-demo `By Task` now reads class tracker rows from `listHomeworkTrackerByClass({ classId })`
- tracker cards render task-centric tracker shape with stable counts
- selected task detail is visible without removing existing review panel/actions
- `By Student` real tracker wiring is intentionally deferred
- `demoRole` remains local-only and provider-free

## 2) Files changed in implementation milestone

- `src/pages/Homework.jsx`
- `docs/teacher-homework-task-student-ui-shell-checkpoint.md`
- `docs/homework-tracker-read-service-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Real By Task tracker behavior

- authenticated non-demo staff mode uses `listHomeworkTrackerByClass({ classId })`
- tracker card/list uses tracker shape:
  - `{ task, assignees, submissions, counts }`
- counts shown in UI:
  - `assigned`
  - `submitted`
  - `notSubmitted`
  - `underReview`
  - `returned`
  - `reviewed`
  - `feedbackReleased`
- selected task detail block is shown
- existing submission queue/review entry flow is preserved

## 4) Class selection / empty state behavior

- class selection source is derived from visible homework tasks
- class IDs are UUID-only for tracker query usage
- tracker query runs only when class ID is a valid UUID
- safe empty state is shown when no valid class UUID exists
- no guessed IDs are used
- first valid class/task is auto-selected when possible

## 5) Review detail preservation

The existing review/release workflow remains preserved:

- selected submission detail
- file viewing/signed URL behavior
- feedback text
- next step
- internal note
- `Save draft`
- `Mark reviewed`
- `Return for revision`
- `Release to parent` role gate for supervisor/HQ
- mock-only `Draft feedback with AI`
- no auto-save
- no auto-release

## 6) demoRole safety

- local fake data only
- no Supabase reads/writes/uploads/signed URL calls in demo actions
- no real provider/API calls
- mock AI remains provider-free
- demo/local fallback is preserved

## 7) Tests executed in implementation milestone

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:tracker:read`
- `npm run test:supabase:homework:feedback`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:supabase:homework:assignees:read`

Safe CHECK skip note:

- parent linked-student fixture unavailable in tracker/assignee smoke remains non-fatal (`CHECK` skip behavior is expected in optional fixture environments).

## 8) What remains

- real authenticated `By Student` wiring using `listHomeworkTrackerByStudent(...)`
- selected-student assignment write services
- manual marked-file upload flow
- AI provider integration
- Announcements/Internal Communications later

## 9) Recommended next milestone

Recommendation: **A. Real By Student tracker wiring into Homework UI**

Why A first:

- real `By Task` wiring is now stable
- `By Student` is the other half of the planned teacher tracker workflow
- selected-student write services should follow after teacher can view both task-level and student-level tracker structures
- this directly improves enrichment mixed-school/mixed-syllabus tracking visibility

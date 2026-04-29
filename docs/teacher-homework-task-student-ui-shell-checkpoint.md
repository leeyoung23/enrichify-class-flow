# Teacher Homework Task Student UI Shell Checkpoint

## 1) What was implemented

Teacher Homework UI shell is now implemented with explicit `By Task` / `By Student` structure in `src/pages/Homework.jsx`, with demo-first parity and safety preserved.

This checkpoint captures the UI-shell milestone only:

- demo-mode shell + local fake tracker-like cards/lists are implemented
- existing review detail/actions are preserved
- real authenticated flow remains on the existing safe path
- no real tracker read wiring in this milestone
- no SQL/RLS/service changes in this milestone

## 2) Files changed in implementation milestone

- `src/pages/Homework.jsx`
- `docs/teacher-homework-task-student-ui-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) By Task demo behavior

- top segmented shell tabs are present: `By Task` / `By Student`
- local fake task cards are used in demo mode
- each task card shows:
  - task title
  - due date
  - scope label
- scope examples included in demo:
  - `class`
  - `selected students`
  - `individual`
- per-task counts shown:
  - `assigned`
  - `submitted`
  - `not submitted`
  - `under review`
  - `feedback released`
- selected task demo detail block is shown
- submission list remains the review entry point

## 4) By Student demo behavior

- local fake student cards/lists are used in demo mode
- per-student homework items are shown
- status badges shown in demo:
  - `Submitted`
  - `Not Submitted`
  - `Under Review`
  - `Returned`
  - `Feedback Released`
  - `Follow-up Needed`
- assigned-but-not-submitted examples are included
- mixed-school / mixed-stream sample rows are included
- quick tracker feel is restored similar to old UI
- selecting an item-linked submission can jump into review detail

## 5) Review detail preservation

Preserved or safely adapted in `Homework`:

- selected submission detail
- fake attachment card path in demo
- feedback text
- next step
- staff-only internal note
- `Save draft`
- `Mark reviewed`
- `Return for revision`
- `Release to parent` role gate retained for supervisor/HQ
- `Draft feedback with AI` remains mock-only
- no auto-save
- no auto-release

## 6) demoRole safety

- demo/local fake data only
- no Supabase reads/writes/uploads/signed URL calls in demo actions
- no real provider/API calls
- local mock AI only
- `demoRole` and local fallback are preserved

## 7) Real flow preservation

- real authenticated mode is kept on existing safe workflow
- no real tracker wiring yet
- no SQL/RLS/service changes
- no `ParentView` changes
- fee proof, Memories, Staff Time Clock, curriculum flows, and AI Edge Function remain unchanged

## 8) Tests executed in implementation milestone

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:supabase:homework:feedback`

## 9) What remains

- real authenticated wiring to `listHomeworkTrackerByClass(...)`
- real authenticated wiring to `listHomeworkTrackerByStudent(...)`
- selected-student assignment write services
- manual marked-file upload flow
- AI provider integration
- Announcements/Internal Communications integration later

## 10) Recommended next milestone

Recommendation: **A. Real By Task tracker wiring into Homework UI**

Why A first:

- By Task is safer and closer to the existing class/submission review workflow
- it can wire directly to `listHomeworkTrackerByClass(...)`
- By Student wiring can follow once task-level wiring is stable
- selected-student write services should follow after read UI behavior is proven

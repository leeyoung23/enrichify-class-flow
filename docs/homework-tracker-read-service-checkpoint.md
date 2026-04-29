# Homework Tracker Read Service Checkpoint

## 1) What was implemented

Homework tracker-focused read support is now implemented at service + smoke-test level.  
Status update: authenticated Teacher Homework UI now consumes both tracker reads:

- `By Task` -> `listHomeworkTrackerByClass(...)`
- `By Student` -> `listHomeworkTrackerByStudent(...)`

- added tracker read methods in `src/services/supabaseReadService.js`
- added dedicated tracker-read smoke test in `scripts/supabase-homework-tracker-read-smoke-test.mjs`
- added npm command `test:supabase:homework:tracker:read` in `package.json`
- updated related homework/RLS/handoff docs for continuity

Initial milestone was read-service shaping only.  
Current status after later UI step:

- `By Task` tracker read is now wired in `src/pages/Homework.jsx` for authenticated non-demo staff flow
- wiring uses `listHomeworkTrackerByClass(...)` with UUID-safe class selection/empty-state behavior
- `By Student` tracker read is now wired in `src/pages/Homework.jsx` for authenticated non-demo staff flow
- student selection is UUID-safe and derived from currently visible homework/submission/tracker data
- assigned-but-not-submitted items now show safe no-submission UI state
- no SQL/RLS changes were introduced for this wiring step

## 2) Files changed in implementation milestone

- `src/services/supabaseReadService.js`
- `scripts/supabase-homework-tracker-read-smoke-test.mjs`
- `package.json`
- `docs/homework-assignee-read-service-checkpoint.md`
- `docs/homework-flexible-assignment-data-model-review.md`
- `docs/rls-test-checklist.md`
- `docs/project-master-context-handoff.md`

## 3) Tracker read methods added

- `listHomeworkTrackerByClass({ classId, status })`
- `listHomeworkTrackerByStudent({ studentId, status })`

## 4) Stable tracker data shape

By Task:

- `{ task, assignees, submissions, counts }`

Counts:

- `assigned`
- `submitted`
- `underReview`
- `returned`
- `reviewed`
- `feedbackReleased`
- `notSubmitted`

By Student:

- `{ studentId, assignedItems, counts }`

Each assigned item:

- `{ task, assignee, submission, status, hasReleasedFeedback }`

## 5) Behavior rules

- anon client + current JWT only
- no service role usage
- UUID validation for required ID inputs
- optional safe filters (`status`) supported
- no writes/mutations in tracker methods
- no `internal_note` exposure in tracker payload
- class-scope fallback is supported without requiring per-student assignee rows
- selected/individual assignment visibility uses explicit assignee rows

## 6) Smoke test coverage

`scripts/supabase-homework-tracker-read-smoke-test.mjs` covers:

- teacher class tracker when fixture exists
- branch supervisor class tracker
- parent student tracker when fixture exists
- assigned-but-not-submitted visibility checks
- selected assigned visibility checks
- unassigned selected blocking checks
- stable counts-shape verification
- `internal_note` non-exposure check
- optional unrelated-parent blocking check
- cleanup path for temporary fake/dev fixtures

## 7) CHECK/WARNING notes

- parent linked-student fixture unavailability produces a safe `CHECK` skip
- existing unrelated-user credential `CHECK` skips remain expected in optional fixture environments
- no policy broadening was introduced
- no SQL/RLS changes were introduced

## 8) Tests executed in implementation milestone

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:assignees:read`
- `npm run test:supabase:homework:tracker:read`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`

## 9) What remains future

- write-side assignment services for selected/individual homework
- parent assigned-but-not-submitted UI consumption
- manual marked-file upload path
- AI marking integration with flexible assignment context
- Announcements/Internal Communications integration later

## 10) Recommended next milestone

Recommendation: **A. Teacher Homework `By Task` / `By Student` UI planning**.

Why A first:

- tracker read shape is now stable for both task-centric and student-centric paths
- old-style quick student tracker can be reintroduced safely using the stabilized read contracts
- UI planning should define exact screens/states/interactions before runtime wiring
- selected-student write services should follow after UI/data-shape planning is clearly locked

# Parent Released Marked Homework File Display Plan

## 1) Current state

- Teacher marked-file UI is wired in `Homework` review detail panel.
- Staff can upload/release marked files with existing marked-file services.
- `ParentView` currently shows homework status, upload controls, and released teacher feedback.
- `ParentView` does not yet show released teacher-marked files.

## 2) Product purpose

Why this parent-facing step is needed:

- Parents may need to view teacher-marked work after staff release.
- Marked files are learning evidence that supports parent understanding.
- Parent should see only explicitly released marked files.
- Parent output must remain safe, clear, and simple.

## 3) UI placement

Recommended placement in `ParentView` Homework area:

- Place below released `Teacher feedback` content for each homework task/submission context.
- Use section title: `Marked work` or `Teacher-marked work`.
- Use compact file cards/list rows (mobile-first).
- Provide one `View marked file` action per released file.
- Do not add any upload controls in this parent area.

## 4) Parent visibility rules

Parent read model:

- Use `listHomeworkFiles({ homeworkSubmissionId, fileRole: 'teacher_marked_homework', parentVisibleOnly: true })`.
- Show only files that are released to parent.
- Do not show unreleased files.
- Do not render `staff_note`.
- Do not render `internal_note` (feedback note remains separate and already parent-safe).
- Do not show raw IDs.
- Do not expose teacher/staff controls in parent UI.

## 5) Signed URL behavior

Parent file open behavior:

- Use `getHomeworkFileSignedUrl(...)`.
- Signed URLs only (private storage path).
- No public URLs.
- Show safe, generic user-facing error if signed URL cannot be generated/opened.

## 6) demoRole behavior

Demo parent mode plan:

- Show fake released marked file example only.
- No Supabase calls in demo mode.
- `View` action may use local toast preview message.
- No real files in demo.

## 7) Empty/waiting states

Privacy-safe empty/waiting copy:

- If no released marked work exists, show gentle neutral copy.
- Do not reveal whether staff uploaded unreleased marked files.
- Suggested copy: `Marked work will appear here once your teacher releases it.`

## 8) Safety/privacy

Non-negotiable parent safety boundaries:

- Parent linked-child RLS scope only.
- Released marked files only.
- Staff notes hidden in parent path.
- No cross-family visibility.
- No auto-release behavior.
- No notification side effects in this milestone.

## 9) Data/service mapping

Reuse existing service methods:

- `listHomeworkFiles(...)`
- `getHomeworkFileSignedUrl(...)`

No new service method is required for this parent-display milestone unless a specific shape adapter becomes necessary.

## 10) Mobile-first design

Parent display should be lightweight:

- Small stacked cards/list rows.
- Show file name, type, and released date (if available).
- Single touch-friendly `View` button.
- Avoid dense tables.

## 11) What not to include yet

- Parent upload controls in marked-work area
- AI summary/explanation of marked work
- Automatic parent email/notification
- Print/export PDF
- Full report generation
- Announcements/events integration

## 12) Testing plan

Future validation targets:

- Parent cannot see unreleased marked file.
- Parent can see released marked file.
- Signed URL works for released parent-visible marked file.
- `staff_note` is not present in parent display.
- No teacher/staff controls render in parent area.

## 13) Implementation sequence

- Phase 1: this plan
- Phase 2: `ParentView` demo shell
- Phase 3: real `ParentView` released marked-file read wiring
- Phase 4: checkpoint documentation
- Phase 5: AI OCR/summary later if needed

## 14) Recommended next milestone

Choose:

- A. `ParentView` released marked-file display shell with demo parity
- B. Wire real `ParentView` marked-file display immediately
- C. Resume AI provider integration
- D. Announcements/Internal Communications planning

Recommendation: **A. ParentView released marked-file display shell with demo parity**

Why A first:

- Parent output needs careful copy and privacy-safe empty states.
- Demo parity allows safe UX preview before live parent reads.
- Real read wiring can follow once parent-facing layout/copy is reviewed.
- This reduces leakage/confusing parent UX risk before runtime wiring.

## 15) Next implementation prompt

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
<fill-latest-commit>

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
ParentView released marked-file display shell with demo parity only.

Scope rules:
- ParentView UI shell only for released marked-file display.
- Do not wire real parent marked-file read calls in this step.
- Do not change app behavior outside ParentView homework section.
- Do not change app UI beyond parent marked-work shell.
- Do not change runtime logic for teacher/staff flow.
- Do not add services.
- Do not change Supabase SQL or RLS.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.

Implement:
1) Add parent-facing `Marked work` section under released teacher feedback area in ParentView.
2) Demo-only local fake display:
   - show a fake released marked file row/card
   - local `View` action as toast/preview only
3) Non-demo authenticated mode:
   - shell + safe waiting copy only (`Marked work will appear here once your teacher releases it.`)
   - no real marked-file read/signed-url calls in this step
4) Keep existing parent homework status/upload/released feedback behavior unchanged.

Out of scope:
- Real `listHomeworkFiles(...)` parent wiring
- Real `getHomeworkFileSignedUrl(...)` parent wiring
- Teacher UI changes
- AI OCR/summary
- Notifications/emails

Validation efficiency rule:
- UI-only change.
- Run:
  - npm run build
  - npm run lint
  - npm run typecheck
```

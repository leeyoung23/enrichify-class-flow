# Teacher Marked Homework File UI Plan

## 1) Current state

- Teacher homework review panel exists in `Homework`.
- Marked-file service layer exists:
  - `uploadMarkedHomeworkFile(...)`
  - `listHomeworkFiles(...)` role/release-aware filtering
  - `releaseHomeworkFileToParent(...)`
- Release-to-parent backend path exists.
- Parent marked-file display does not exist yet.
- AI OCR/provider integration remains future.

## 2) Product purpose

Why this UI is needed:

- Teachers often mark work outside the app (paper, stylus, offline tools).
- Staff need a safe way to upload marked PDF/image/photo evidence into homework review.
- Marked artifacts must stay internal until explicit release.
- Parents should only see released marked work.
- AI remains optional support, not a requirement for manual marking operations.

## 3) UI placement

Recommend adding a **Marked work** section inside the Homework review detail panel.

Placement guidance:

- Keep it separate from the main feedback text/release action row to avoid clutter.
- Place it after current submission/file attachment area or directly adjacent to feedback area as a distinct card.
- Preserve current review actions (save draft / reviewed / return / release feedback) without visual regression.

## 4) Staff-visible controls

Plan controls for staff roles:

- Upload marked file action.
- Optional staff note input.
- Marked-file list showing role + release state.
- View action that opens signed URL.
- Release action (`Release marked file to parent`).
- Release status badge (draft vs released).
- Audit metadata display where available:
  - uploaded by
  - released by
  - release time

## 5) Role behavior

Teacher:

- Can upload marked files for assigned class/submission where RLS allows.
- Can view assigned-class marked files.
- Release button visibility/enablement can be gated by product decision (teacher vs supervisor/HQ release authority).

Branch supervisor / HQ:

- Can upload and release within policy scope.
- Can view release status and audit fields.

Parent/student:

- No access to teacher marked-file controls or staff-only UI section.

## 6) Release behavior

UI should align to current backend semantics:

- Upload creates `teacher_marked_homework` with `released_to_parent = false`.
- Release action calls `releaseHomeworkFileToParent(...)`.
- No feedback auto-release in this milestone.
- No parent notification side effect in this milestone.
- Parent marked-file display remains a later milestone.

## 7) Demo behavior

For `demoRole`/local mode:

- Show local fake marked-file list for preview parity.
- Simulate upload locally (no real object upload).
- Optional local release-state toggle for UX preview.
- No Supabase writes/reads/uploads/signed URL calls.
- No provider/API calls.

## 8) Real service mapping

Use existing service methods directly:

- `uploadMarkedHomeworkFile(...)`
- `listHomeworkFiles({ homeworkSubmissionId, fileRole: 'teacher_marked_homework' })`
- `getHomeworkFileSignedUrl(...)`
- `releaseHomeworkFileToParent(...)`

## 9) Validation/user messaging

UI validation/message plan:

- Require selected submission before marked-file actions.
- Require file selection before upload.
- Show clear file type/size validation errors (safe, user-facing).
- Success/failure toasts for upload and release actions.
- Optional release confirmation dialog for safety.
- Never expose raw IDs/SQL/env details in user-facing messages.

## 10) Mobile-first design

Design direction:

- Use compact cards/list rows for marked files.
- Provide touch-friendly `Upload`, `View`, `Release` actions.
- Avoid dense data tables in review panel.
- Include explicit copy: `Internal until released to parent`.

## 11) Parent safety/output integrity

Safety model to preserve:

- Teacher UI is the staff process layer.
- Parent output occurs only after explicit file release.
- Access remains signed URL only.
- Internal `staff_note` remains hidden from parent surfaces.
- No auto-release.
- No AI auto-output.

## 12) What not to include yet

- Parent marked-file display
- Automatic parent notification
- AI OCR/vision/provider wiring
- Bulk marked-file upload
- Advanced edit/delete file management (unless trivially safe)
- Reporting/export/PDF generation

## 13) Implementation sequence

- Phase 1: this plan
- Phase 2: UI shell with demo parity
- Phase 3: wire upload/list/signed URL
- Phase 4: wire release action
- Phase 5: parent display planning
- Phase 6: parent display wiring
- Phase 7: AI OCR/provider integration later

## 14) Recommended next milestone

Choose:

- A. Teacher marked-file UI shell with demo parity
- B. Wire real marked-file upload immediately
- C. Parent marked-file display planning
- D. Resume AI provider integration
- E. Announcements/Internal Communications planning

Recommendation: **A. Teacher marked-file UI shell with demo parity**

Why A first:

- Service layer exists and is validated, but UI shape should be reviewed safely before wiring real file actions.
- Demo parity enables quick UX validation of upload/release flow without backend risk.
- Parent display should wait until staff controls are clearly wired and reviewed.
- AI OCR/provider work should remain later, after human manual marked-file workflow is operational.

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
Teacher marked-file UI shell with demo parity only.

Scope rules:
- UI shell planning/wiring only for teacher/staff marked-file section.
- Do not wire real upload/release API calls in this step.
- Do not change parent runtime display in this step.
- Do not change app behavior outside Homework review panel shell.
- Do not change Supabase SQL or RLS.
- Do not apply SQL.
- Do not add services.
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
1) Add `Marked work` section in Homework review detail panel.
2) Demo-only local fake controls:
   - fake upload button/flow
   - fake marked-file list
   - fake release state indicator/toggle
3) Keep clear copy: internal until released.
4) Keep existing feedback/review actions stable.

Out of scope:
- Real upload/release service wiring
- Parent marked-file display
- AI OCR/provider integration

Validation efficiency rule:
- UI-only change.
- Run:
  - npm run build
  - npm run lint
  - npm run typecheck
- Do not run unrelated smoke suites unless shared runtime/services changed.
```

# ParentView AI Report Display Final Checkpoint

Date: 2026-05-02 (printable HTML preview **2026-05-03** — **`docs/parent-view-printable-report-preview-checkpoint.md`** · manual QA runbook **2026-05-03** — **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`**)  
Scope: ParentView released-report display UI; printable preview is **HTML iframe only** — **no** PDF download

## Final docs-only alignment update (after staff mock draft UI wiring)

- Staff-side mock draft generation milestone is complete:
  - `docs/mock-ai-parent-report-draft-ui-final-checkpoint.md`
- ParentView boundary remains unchanged after staff wiring:
  - released-only,
  - current-version-only,
  - no draft visibility,
  - no evidence-link exposure,
  - no provider/debug metadata.
- No parent auto-release behavior exists:
  - parent sees content only after explicit staff release lifecycle.

## 1) Key checkpoint notes

- ParentView `Progress Reports` section is implemented.
- ParentView displays released reports only.
- ParentView has no staff controls.
- ParentView does not show drafts or unreleased reports.
- ParentView does not show evidence links, raw AI/provider metadata, or raw debug data.
- Optional **Preview printable report** — HTML iframe only (**`docs/parent-view-printable-report-preview-checkpoint.md`**); **no** PDF file download yet.
- No notifications/emails.
- No real AI provider wiring.

## 2) ParentView placement and UI behavior

- Placement is near existing parent communication/learning surfaces.
- Learning Portal includes quick-action jump: `View Progress Reports`.
- UI includes:
  - latest released report card,
  - released report list/history,
  - selected report detail panel,
  - parent-safe section rendering,
  - optional **Preview printable report** (sandboxed iframe; released content only).
- Safe states are present:
  - loading,
  - empty,
  - safe generic error copy.

## 3) Demo behavior

- Demo parent mode uses local fake released reports only.
- Demo mode does not call Supabase report reads.
- Fake section set includes:
  - summary,
  - attendance,
  - lesson progression,
  - homework completion,
  - strengths,
  - areas for improvement,
  - next recommendations,
  - parent support suggestions,
  - teacher final comment.
- No real AI calls.
- Printable layout preview only when toggled — **no** file export.

## 4) Authenticated parent read behavior

- Parent list read:
  - `listAiParentReports({ status: 'released', includeArchived: false })`
- Parent detail read:
  - `getAiParentReportDetail({ reportId })`
- Parent current-version read:
  - `getAiParentReportCurrentVersion({ reportId })`
- Reads are JWT + RLS bounded.
- Rows are filtered to linked child context when `student.id` is available.
- Errors use safe generic parent copy.

## 5) Strict visibility boundary

ParentView does not show:

- draft/unreleased statuses,
- evidence links,
- release events,
- raw version history,
- `ai_model_label`,
- `generation_source`,
- provider/debug metadata,
- storage paths,
- PDF/export links,
- staff edit/release/archive actions.

## 6) Safety boundaries

- No SQL/RLS changes.
- No SQL apply in this docs checkpoint.
- No service-role frontend usage.
- No provider keys.
- No real AI provider integration.
- No notification/email/live-chat side effects.
- Demo/local fallback preserved.
- Parent surface remains released current-version only.

## 7) Validation result

- Validation efficiency rule applied for docs-only scope:
  - `git diff --name-only` executed before/after docs edits.
- Historical runtime validation snapshot for milestone (no rerun in this docs-only checkpoint):
  - `npm run build` PASS
  - `npm run lint` PASS
  - `npm run typecheck` PASS
  - `npm run test:supabase:ai-parent-reports` PASS (expected unrelated-parent CHECK)
  - `npm run test:supabase:parent-announcements` PASS (expected unrelated-parent CHECK)
  - `npm run test:supabase:announcements:phase1` PASS (expected optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` CHECK)
  - `npm run test:supabase:parent-announcements:media` PASS
  - npm `devdir` warning is non-blocking if observed.

## 8) What remains future

- parent-safe report label polish,
- richer released report history UX,
- mock AI draft-assist planning,
- real AI provider integration,
- PDF/export planning/implementation,
- notification/email flow,
- mobile manual QA.

Checkpoint note:

- Staff-side `Generate Mock Draft` UI is now added in `/ai-parent-reports`.
- ParentView boundary remains unchanged:
  - released-only/current-version-only,
  - no draft visibility,
  - no auto-release.

## 9) Recommended next milestone

Choose:

- A. Mock AI draft generator planning
- B. Mock AI draft service
- C. Real AI provider integration
- D. PDF/export planning
- E. Notification/email planning

Recommendation: **A first**.

Why:

- staff and parent report surfaces now exist,
- report release loop is visible end-to-end,
- mock AI should come before real provider wiring,
- planning should define mock draft inputs, section generation, teacher approval, and no auto-release.

## 10) Next implementation prompt (copy-paste)

```text
Latest expected commit:
692e7f4 Add ParentView AI report display UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Mock AI parent report draft generator planning only.

Do not change app UI.
Do not change runtime logic.
Do not add services.
Do not change Supabase SQL.
Do not change RLS policies.
Do not apply SQL.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values or passwords.
Do not commit .env.local.
Do not upload files.
Do not use real student/parent/teacher/school/curriculum/homework/photo/payment/announcement/attendance/report/communication data.
Use fake/dev data only.
Do not use service role key in frontend.
Do not remove demoRole.
Do not remove demo/local fallback.
Do not auto-send emails or notifications.
Do not start live chat.
Do not implement real AI provider wiring.
Do not implement PDF/export.
Do not auto-release AI-generated content to parents.
Do not add mock AI draft generator implementation in this milestone.

Goal:
Produce planning documentation for a mock AI draft generator milestone only.

Planning must define:
1) mock draft input contract
2) deterministic/safe section generation shape
3) teacher review/approval steps
4) explicit no-auto-release boundary
5) fake/dev-only validation approach

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

## 11) 2026-05-04 ParentView sidebar section navigation QA checkpoint

### Root cause confirmed

- Real parent/student sidebar links were dropping `?student=<uuid>` because non-demo `/parent-view#...` links did not preserve existing query params.
- ParentView did not react to hash changes, so URL hash updates did not reliably scroll to visible sections.
- Sidebar active-state logic used pathname-only matching (`/parent-view`), so multiple parent/student items looked active at once.
- Some parent/student hash targets were wrong or missing, so clicked items did not map cleanly to intended content sections.

### Fixed behavior

- Real parent URLs now preserve student context:
  - `/parent-view?student=<uuid>#section`
- Demo parent URLs remain:
  - `/parent-view?demoRole=parent&student=student-01#section`
- Demo student URLs remain:
  - `/parent-view?demoRole=student&student=student-01#section`
- Parent Reports now targets released AI progress reports:
  - `#parent-progress-reports`
- Hash navigation now performs smooth section scroll and quick section reveal.
- `prefers-reduced-motion` is respected:
  - reduced motion disables/minimizes the animated reveal path.

### Parent sidebar mapping

- Parent Dashboard -> `#parent-portal-overview`
- Child Attendance -> `#attendance-summary`
- Child Homework -> `#parent-homework-status`
- Parent Reports -> `#parent-progress-reports`
- Student Learning Portal -> `#student-learning-portal`

### Student sidebar mapping

- Student Learning Portal -> `#student-learning-portal`
- Homework Due -> `#homework-due`
- Recent Feedback -> `#recent-feedback`
- Learning Resources -> `#learning-resources`
- Simple Progress Summary -> `#simple-progress-summary`

### Safety boundaries reaffirmed

- No SQL/RLS changes.
- No service-role frontend usage.
- No parent draft visibility.
- No old/non-current report version visibility for parent.
- No evidence-link exposure to parent.
- No AI report release-rule changes.

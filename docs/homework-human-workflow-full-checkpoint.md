# Homework Human Workflow Full Checkpoint

## 1) Updated checkpoint status

Homework human workflow is now functionally complete at a strong internal prototype level.

The end-to-end human path now covers assignment, submission, review, feedback release, marked-file release, and parent-facing visibility with release-gated boundaries preserved.

## 2) Full human workflow now supported

The complete loop now supports:

1. Staff creates homework.
2. Assignment scope supports whole class, selected students, and individual assignment.
3. Homework appears in teacher `By Task` and `By Student` trackers.
4. Parent/student submits homework.
5. Teacher/staff reviews homework submissions.
6. Teacher/staff writes feedback (`feedback_text`), next step (`next_step`), and internal note (`internal_note` staff-only path).
7. Supervisor/HQ releases feedback to parent.
8. Teacher/staff uploads teacher-marked homework file.
9. Marked file remains private before release.
10. Supervisor/HQ releases marked file.
11. Parent sees released feedback.
12. Parent sees released marked file.

## 3) Key frontend areas implemented

- `src/pages/Homework.jsx` Create Homework form.
- `src/pages/Homework.jsx` `By Task` tracker.
- `src/pages/Homework.jsx` `By Student` tracker.
- `src/pages/Homework.jsx` review detail panel.
- `src/pages/Homework.jsx` teacher `Marked work` section in review panel.
- `src/pages/ParentView.jsx` homework status/upload section.
- `src/pages/ParentView.jsx` released feedback display.
- `src/pages/ParentView.jsx` released marked-file display.

## 4) Key backend/service areas implemented

Data model/service coverage now includes:

- `homework_tasks`
- `homework_submissions`
- `homework_files`
- `homework_feedback`
- `homework_task_assignees`
- `assignment_scope`
- `createHomeworkTaskWithAssignees(...)`
- `listHomeworkTrackerByClass(...)`
- `listHomeworkTrackerByStudent(...)`
- `uploadHomeworkFile(...)`
- `uploadMarkedHomeworkFile(...)`
- `listHomeworkFiles(...)`
- `releaseHomeworkFileToParent(...)`
- `getHomeworkFileSignedUrl(...)`
- feedback write/release methods
- relevant smoke tests for assignment, tracker reads, assignees reads, upload, feedback, and marked files

## 5) Flexible enrichment homework support

Current workflow now supports mixed delivery models needed in enrichment contexts:

- class-level homework
- selected-student homework
- individual homework
- assigned-but-not-submitted visibility path
- mixed school/form/syllabus operational reality
- `By Student` tracker improves enrichment teaching flow beyond class-only homework visibility

## 6) Manual marking support

Manual marking is now a first-class path:

- AI is not the only marking pathway.
- Teachers can mark externally.
- Teacher/staff can upload marked files.
- Marked files remain private until explicit release.
- Parents only see released marked files.
- Access uses signed URLs only.

## 7) Safety/privacy boundaries

- Parent visibility remains linked-child scoped.
- No cross-family visibility.
- Draft/internal feedback remains hidden from parent path.
- `internal_note` remains hidden from parent path.
- `staff_note` remains hidden from parent path.
- Marked files remain release-gated.
- No public object URLs in parent flow.
- Frontend uses anon client + JWT model; no service role key in frontend.
- No auto-release behavior was added.
- Automatic notification flow is not added yet.

## 8) demoRole behavior

- Demo/local preview remains fake/local.
- No Supabase writes/uploads/signed URL calls in demo actions.
- No provider/API calls in demo actions.
- Demo parity exists for teacher and parent homework/marked-file sections.

## 9) Tests/smoke coverage

Major relevant validation commands:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:homework:assignment:write`
- `npm run test:supabase:homework:tracker:read`
- `npm run test:supabase:homework:assignees:read`
- `npm run test:supabase:homework:upload`
- `npm run test:supabase:homework:feedback`
- `npm run test:supabase:homework:marked-file`
- `npm run test:ai:homework-feedback:mock`

Note:

- Prior `CHECK` skips in some historical runs were fixture/credential availability checks only, not policy broadening.

## 10) What remains future

- Real AI provider integration.
- OCR/vision/text extraction for uploaded/marked files.
- Rubric-based AI marking.
- AI audit/logging hardening.
- Parent notification/email flows.
- Printable/exportable PDF reports.
- Homework assignment edit/archive UI.
- Selected-student creation UX polish.
- Announcements/Internal Communications module.

## 11) Strategic significance

Homework is now operating as a real learning-evidence layer, not only a placeholder workflow.

This creates a stronger foundation where AI can build on real human process instead of replacing it. Future AI feedback can incorporate assignment scope, curriculum context, uploaded student work, marked files, teacher feedback history, and release gates.

Teacher approval remains mandatory for parent-facing output.

## 12) Recommended next milestone

Choose:

- A. Resume AI Edge Function/provider path
- B. AI audit/logging planning
- C. OCR/marked-file evidence extraction planning
- D. Attendance parent notification planning
- E. Printable/exportable PDF report planning
- F. Announcements/Internal Communications planning

Recommendation: **A. Resume AI Edge Function/provider path**

Why A first:

- Human homework workflow is now strong enough to support safe provider integration.
- AI/provider integration can now resume with lower operational risk.
- Guardrails remain mandatory: draft-only output, teacher-approved flow, and never auto-released.

## 13) Next implementation prompt

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
Resume AI Edge Function/provider path planning for homework feedback draft flow.

Scope rules:
- Planning/docs only in this step.
- Do not change app UI/runtime logic in this planning pass.
- Do not change Supabase SQL/RLS in this planning pass.
- Do not apply SQL.
- Do not expose env values or provider secrets.
- Do not commit .env.local.
- Keep draft-only + teacher-approved + no auto-release rule explicit.

Deliverables:
1) Provider adapter plan (draft-only path) with:
   - Edge Function boundary
   - input/output contract
   - timeout/retry/error handling
   - safe fallback behavior
2) Approval/release guardrail checklist for teacher/staff.
3) Validation and rollout sequence from mock -> provider-backed draft.
4) Risks/non-goals and monitoring/audit recommendations.

Validation efficiency rule:
- Docs-only change:
  - git diff --name-only
```

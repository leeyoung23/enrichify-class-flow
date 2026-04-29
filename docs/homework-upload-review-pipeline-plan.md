# Homework Upload/Review Pipeline Plan

## 1) Product purpose

Homework/student work is the next learning-evidence layer after curriculum context and AI comment mock groundwork.

- Connects curriculum context to actual student output (not just class metadata).
- Supports teacher review workflows and parent trust with visible progress evidence.
- Creates future-ready structure for AI feedback/marking and weekly evidence summaries.
- Must remain structured and workflow-driven, not become random file dumping.

## 2) User workflows

### Teacher workflow

- Create or assign homework request/material upload expectation for class/student scope.
- Review uploaded submissions in an inbox by class/student/status.
- Add draft feedback and revision guidance.
- Approve/release parent-facing summary after review.

### Parent workflow

- Upload homework/work evidence only when requested for linked child.
- View submission and review status timeline.
- See approved teacher feedback when released.

### Student workflow (later optional)

- Upload own work in student portal (future phase).
- View own submission status and approved feedback.

### Branch supervisor / HQ workflow

- Monitor review completion, delayed items, and quality signals.
- Spot operational gaps; not required to review each item directly.

## 3) Core entities to model

Lean MVP entity proposal:

- `homework_tasks` (or `homework_requests`): assignment request metadata and lifecycle.
- `homework_submissions`: per-student submission record linked to homework task.
- `homework_feedback`: draft/internal + approved/released feedback states.
- `homework_files` (or use submission metadata columns): storage bucket/path, file type, size, uploader.
- optional `homework_review_status` view/enum helper for reporting clarity.

MVP principle: keep the first schema minimal and additive, aligned with existing record + attachment patterns.

## 4) Storage approach

Use private bucket approach consistent with existing secure upload patterns.

- Bucket: `homework-submissions` (private).
- Path convention:
  - `{branch_id}/{class_id}/{student_id}/{homework_task_id}/{submission_id}-{safe_filename}`
- Rules:
  - private bucket only
  - signed URL access only
  - no public URLs
  - fake files only in tests
  - image + PDF first in MVP
  - video support later

## 5) Data/RLS expectations

Role scope model for MVP:

- HQ: all branches (policy-level visibility).
- Branch supervisor: own branch only.
- Teacher: assigned class/student tasks and submissions only.
- Parent: linked child submissions/approved feedback only.
- Student: own data only if/when student portal upload is enabled.

Hard rules:

- No cross-family visibility.
- No parent access to other students' work.
- No teacher access outside assigned classes.

## 6) Status lifecycle

Recommended status lifecycle:

- Homework task: `draft` -> `assigned` -> `closed` -> `archived`
- Submission: `submitted` -> `under_review` -> `reviewed` -> `returned_for_revision` -> `approved_for_parent`
- Feedback: `draft` -> `approved` -> `released_to_parent`

## 7) Teacher review model

- Teacher feedback must be draft-first.
- Parent-facing feedback must require explicit approval/release step.
- Supervisor/HQ visibility should focus on monitoring and escalation.
- Future AI should draft feedback only; never auto-release.

## 8) Parent-facing model

Parent-facing UX model:

- Show simple status stages and approved feedback only.
- Hide internal staff review notes.
- Avoid dense internal rubric language by default.
- Present supportive, actionable next-step guidance.

## 9) AI connection

Homework pipeline enables future AI features:

- AI homework feedback draft generation.
- AI learning gap detection from real evidence.
- AI weekly report evidence grounding.
- AI next-week recommendation support.
- Stronger curriculum-aware parent comments with real work context.

AI remains future:

- No real provider integration in this milestone.
- All AI output remains approval-gated.

## 10) UI placement

Recommended placement:

- `Homework` page for teacher/supervisor assignment + review workflows.
- `ParentView` (Child Homework area) for parent upload/status tracking.
- Student portal upload/view later.
- HQ dashboard summary widgets later.

## 11) MVP implementation sequence

- **Phase 1:** Planning doc (this file).
- **Phase 2:** SQL + storage + RLS draft.
- **Phase 3:** Service layer + fake file smoke test.
- **Phase 4:** Teacher Homework review UI wiring.
- **Phase 5:** Parent upload/status UI wiring.
- **Phase 6:** Feedback approval/release flow.
- **Phase 7:** AI draft feedback support (later).

## 12) Risks and safeguards

Key risks:

- Child data privacy leakage.
- Accidental cross-student or cross-family visibility.
- Large file upload/performance/storage pressure.
- Parents uploading wrong files/content type.
- Teacher workload overload in review queues.
- AI overclaiming in future phases.
- Internal vs parent-facing feedback confusion.
- Missing retention/deletion lifecycle governance.

Safeguards:

- Private bucket + signed URL + scoped RLS.
- Status-gated release model.
- File type/size validation and safe naming.
- Clear draft/internal vs released parent fields.
- Retention and deletion policy definition before production rollout.

## 13) Recommended next milestone

Recommendation: **A. SQL/storage/RLS draft**.

Why A first:

- Privacy and storage boundaries must be locked before UI expansion.
- Keeps sequence aligned with established safe pattern used for fee receipts, Staff Time Clock, Class Memories, and curriculum foundation work.
- Reduces rework risk by establishing secure data model first.

## 14) Next implementation prompt (A only)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
Homework upload/review SQL/storage/RLS draft only.

Constraints:
- Do not change app UI in this step.
- Do not change runtime logic in this step.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Use fake/dev data only.

Deliverables:
1) Draft SQL for lean MVP homework pipeline entities (tasks, submissions, feedback, file metadata).
2) Private storage bucket draft policy for homework submission objects.
3) RLS policy draft for HQ / branch supervisor / teacher / parent / student scope boundaries.
4) Checklist of role-based read/write tests for the new homework pipeline.
5) Documentation checkpoint summarising the draft and non-goals.

Validation efficiency:
- Before tests: git diff --name-only
- If SQL/docs-only, run only targeted SQL/RLS verification notes and avoid unrelated app build/lint/typecheck.
```

## Implementation status checkpoint (Phase 2 draft prepared)

- SQL/storage/RLS draft now exists at `supabase/sql/014_homework_upload_review_foundation.sql`.
- The draft is manual/dev-first and not auto-applied.
- The draft is additive only (no table drops, no destructive deletes, no global RLS disable).
- Runtime service wiring is still not implemented for this new homework foundation.
- Homework upload/review UI flow is still not implemented for this new homework foundation.
- AI homework feedback remains future and approval-gated.
- Future smoke validation should use fake files/dev data only.

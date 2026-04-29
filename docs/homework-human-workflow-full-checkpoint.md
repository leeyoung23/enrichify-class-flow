# Homework Human Workflow Full Checkpoint

## 1) What is now complete

- Parent homework status/list is implemented.
- Parent homework upload form is implemented.
- Teacher Homework review UI is implemented.
- Homework feedback write/release backend is implemented.
- Parent released feedback display is implemented.
- Clean upload and feedback smoke tests are implemented and passing in dev/fake-data workflow.

## 2) Key implementation files/areas

- `supabase/sql/014_homework_upload_review_foundation.sql`
- `supabase/sql/015_fix_homework_upload_rls_policies.sql`
- `supabase/sql/016_fix_homework_parent_submission_insert.sql`
- `src/services/supabaseUploadService.js`
- `src/services/supabaseWriteService.js`
- `src/pages/Homework.jsx`
- `src/pages/ParentView.jsx`
- `scripts/supabase-homework-upload-smoke-test.mjs`
- `scripts/supabase-homework-feedback-smoke-test.mjs`
- `docs/homework-upload-clean-flow-checkpoint.md`
- `docs/teacher-homework-review-ui-checkpoint.md`
- `docs/parent-homework-upload-form-checkpoint.md`
- `docs/parent-homework-feedback-display-checkpoint.md`

## 3) End-to-end workflow

Human homework loop now operates as:

1. Homework task exists and is assigned/open.
2. Parent sees assigned homework in `ParentView`.
3. Parent uploads work through parent upload form.
4. Homework file is stored in private storage path.
5. Teacher/staff views submission and file in `Homework`.
6. Teacher/staff saves draft feedback.
7. Staff marks reviewed, returns for revision, or releases feedback.
8. Parent sees released feedback only (not draft/internal).

## 4) Input -> process -> output integrity

- Parent input path exists (status/list + upload).
- Teacher/staff process path exists (review queue + feedback actions).
- Parent output path exists (released feedback display).
- Review/release gate exists before parent feedback visibility.
- `internal_note` remains protected from parent path.
- Draft feedback remains hidden from parent path.
- Private homework files are accessed by signed URL only.

## 5) Role boundaries

- **HQ:** all-branch visibility/review via RLS policy scope.
- **Branch supervisor:** own-branch review/release via RLS policy scope.
- **Teacher:** assigned-class review workflow.
- **Parent:** linked-child status/upload/released feedback only.
- **Student:** optional/future-only for expanded homework flow.
- **demoRole:** local/demo-only behavior with no Supabase writes.

## 6) Security/RLS/storage

- Supabase anon client + JWT only.
- No service role key in frontend.
- Private `homework-submissions` bucket for homework files.
- No public file URLs.
- Linked-child parent scope is enforced.
- Assigned-class teacher scope is enforced.
- Feedback release gate controls parent visibility.
- `internal_note` is never parent-visible.

## 7) Smoke tests

Documented smoke commands:

- `npm run test:supabase:homework:upload`
  - Proves parent submission + metadata-first private upload + signed URL access path + scoped visibility + cleanup flow.
- `npm run test:supabase:homework:feedback`
  - Proves draft/create-update, review/release lifecycle, parent draft-hidden check, parent released-visible check, `internal_note` protection, and cleanup flow.

## 8) Known limitations

- No AI homework marking/feedback yet.
- No notification/email for homework events yet.
- No production retention/deletion policy yet.
- Unrelated parent/student credential checks remain limited by available fake credentials.
- Broader iOS/Android mobile QA is still future.
- No advanced versioning/multiple submission history UX yet.

## 9) Strategic significance

- Homework is now a real learning-evidence layer in product workflow.
- This foundation prepares AI marking/feedback planning and safe integration.
- Future AI can use curriculum context + student profile + uploaded work + teacher review history.
- Human approval remains mandatory before any parent-visible release.

## 10) Recommended next milestone

Recommendation: **A. AI homework marking/feedback planning**

Why A next:

- Human homework workflow is now complete enough to plan AI support responsibly.
- AI should generate draft marking/feedback only.
- Teacher/staff must review and approve before parent release.
- No auto-release should be introduced.

## 11) Next implementation prompt

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
AI homework marking/feedback planning only.

Scope rules:
- Planning/docs only.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services in this step.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not upload files.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Use fake/dev data only.

Planning deliverables:
1) AI homework marking/feedback draft architecture (human-in-the-loop first).
2) Safety gates:
   - teacher/staff review required
   - no parent auto-release
   - no draft leakage
3) Parent visibility policy alignment with existing release gate.
4) Proposed evaluation rubric for AI draft quality/safety.
5) Phased rollout (mock -> internal pilot -> limited release).
6) Risks, non-goals, and validation scope.

Validation efficiency rule:
- Docs-only change.
- Run only:
  - git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files changed.
```

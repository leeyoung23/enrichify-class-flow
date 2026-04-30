# Homework File Role/Release SQL Application Checkpoint

## 1) What was applied

- Applied SQL draft: `supabase/sql/018_homework_file_roles_release_foundation.sql`.
- Application mode: manual Supabase SQL Editor apply in dev only.
- SQL Editor result: successful execution.
- No production apply.
- No runtime/UI/service changes in this checkpoint.

## 2) Manual verification confirmed

Manual verification screenshots confirmed:

- `homework_files.file_role` exists.
- `homework_files.released_to_parent` exists.
- `homework_files.released_at` exists.
- `homework_files.released_by_profile_id` exists.
- `homework_files.marked_by_profile_id` exists.
- `homework_files.staff_note` exists.
- `homework_files` RLS policies exist.
- homework storage policies for `homework-submissions` exist.
- helper functions exist:
  - `homework_file_submission_id`
  - `homework_file_branch_id`
  - `can_access_homework_file`

## 3) Schema additions

`018` adds additive file-role/release metadata on `homework_files`:

- `file_role text not null default 'parent_uploaded_homework'`
- `released_to_parent boolean not null default false`
- `released_at timestamptz null`
- `released_by_profile_id uuid null`
- `marked_by_profile_id uuid null`
- `staff_note text null`

Allowed `file_role` values:

- `parent_uploaded_homework`
- `teacher_marked_homework`
- `feedback_attachment`

## 4) Release-aware file behavior now supported at database level

Database policy/model now supports:

- Parent-uploaded homework compatibility by default.
- Teacher marked homework and feedback attachments remaining private by default.
- Parent visibility controlled through `released_to_parent`.
- Signed URL access continuing through private storage and policy checks (no public URL model).

## 5) RLS/privacy posture

- Staff in scope can access review files before release.
- Parent/student can only access `teacher_marked_homework` and `feedback_attachment` after `released_to_parent = true`.
- Parent/student insert paths are restricted to `parent_uploaded_homework`.
- Parent/student cannot set release metadata fields.
- No public URLs introduced.
- No service role usage in frontend/runtime model.

## 6) Storage policy posture

- `homework-submissions` bucket remains private.
- Storage read/insert access remains metadata-linked and now aligns with role/release access intent.
- No private-bucket loosening introduced by `018`.
- Metadata-first upload pattern remains expected.

## 7) Backward compatibility

- Existing `homework_files` rows default to `parent_uploaded_homework`.
- Existing parent upload flow should remain compatible.
- No destructive backfill required.
- No data deletion.

## 8) What remains unwired

- `uploadMarkedHomeworkFile(...)`
- `listHomeworkFiles(...)` role/release-aware service shape (if needed)
- `releaseHomeworkFileToParent(...)`
- Teacher marked-file UI
- Parent released marked-file display
- Smoke test proving parent cannot see before release and can see after release
- AI marked-file OCR/vision integration (later)

## 9) Recommended next milestone

Recommendation: **Manual marked-file upload service + smoke test**.

Why next:

- SQL/RLS/storage foundation is now manually applied in dev.
- Before UI wiring, upload/list/signed-url/release behavior should be proven with fake files.
- Parent release boundary should be validated by smoke first (hidden before release, visible after release).
- No real AI provider integration is required for this milestone.

## 10) Next implementation prompt

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
Manual marked-file upload service + smoke test only.

Scope rules:
- Service + smoke test only (no teacher/parent UI wiring in this step).
- Do not change app UI.
- Do not change runtime logic outside homework upload/read/release services.
- Do not add real AI provider calls.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload real files.
- Use fake/dev data only.
- Do not use service role key.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.

Context:
- `supabase/sql/018_homework_file_roles_release_foundation.sql` is manually applied in dev.
- `homework_files` now supports `file_role` + release metadata.

Deliverables:
1) Add service methods for marked-file flow:
   - `uploadMarkedHomeworkFile(...)`
   - role/release-aware `listHomeworkFiles(...)` support if needed
   - `releaseHomeworkFileToParent(...)`
2) Add fake/dev smoke script proving:
   - staff uploads marked file metadata/object in scope
   - parent cannot read marked file before release
   - parent can read marked file after release
   - signed URL path works only when authorized
3) Update related docs/checkpoints.
4) Keep private bucket and metadata-first behavior.

Validation efficiency rule:
- Runtime/service change expected.
- Run only relevant validation for changed files plus new smoke.
```

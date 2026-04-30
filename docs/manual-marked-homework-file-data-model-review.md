# Manual Marked Homework File Data Model Review

## 1) Current schema summary

Current homework file model is centered on `public.homework_files` from `supabase/sql/014_homework_upload_review_foundation.sql`:

- One metadata table for all homework file objects linked by `homework_submission_id`.
- Fixed private bucket model: `storage_bucket = 'homework-submissions'`.
- File metadata fields: `storage_path`, `file_name`, `content_type`, `file_size_bytes`, `uploaded_by_profile_id`, `created_at`.
- Metadata-first upload flow is required by storage RLS:
  1) insert `homework_files` row
  2) upload object into `storage.objects` at the exact `storage_path`
- Access uses signed URLs (`getHomeworkFileSignedUrl(...)`) and private bucket policies; no public URLs.
- Current `listHomeworkFiles(...)` read method is submission-scoped and does not classify file intent/role.

This aligns with existing parent upload + teacher review foundation and keeps storage private by default.

## 2) Current limitation

`homework_files` currently does not explicitly distinguish business intent of a file row.

Because there is no file-type intent field, the model cannot safely and clearly separate:

- parent uploaded homework evidence,
- teacher marked homework artifact,
- teacher feedback attachment.

Related risk:

- Existing `homework_files_select_014` allows parent/student read at submission scope.
- If staff later uploads marked artifacts into the same table without role/release controls, parent visibility rules can become ambiguous and leak draft teacher files.

## 3) Desired file roles

Add explicit role semantics for each file row:

- `parent_uploaded_homework`
- `teacher_marked_homework`
- `feedback_attachment`

Role metadata should be first-class so policies and service queries can enforce visibility rules safely and predictably.

## 4) Option comparison

### A) Add `file_role` + release fields to `homework_files`

Pros:

- Additive, low-blast-radius evolution of existing schema.
- Reuses current private bucket, path model, metadata-first flow, and signed URL method.
- Keeps query/service logic in one table for MVP.
- Faster to implement and easier to review in current branch context.

Cons:

- Requires careful RLS refinement so parent/student visibility depends on both role and release status.

### B) Separate `homework_marked_files` table

Pros:

- Strong semantic separation for marked artifacts.
- Can simplify long-term domain boundaries if marked workflow becomes complex.

Cons:

- More schema, policy, and service complexity immediately.
- Duplicates existing file metadata + storage patterns already operating in `homework_files`.
- Higher migration and rollout overhead for MVP.

### Recommendation

Recommend **Option A for MVP**.

Reason: it is the safest additive path with lowest complexity and strongest reuse of already-proven private storage + metadata-first + signed-URL architecture.

## 5) Proposed additive fields

For Option A, add the following columns to `homework_files`:

MVP-core:

- `file_role text not null default 'parent_uploaded_homework'`
  - check constraint limited to: `parent_uploaded_homework`, `teacher_marked_homework`, `feedback_attachment`
- `released_to_parent boolean not null default false`
- `released_at timestamptz null`
- `released_by_profile_id uuid null references public.profiles(id)`

MVP-optional (can defer):

- `marked_by_profile_id uuid null references public.profiles(id)` (useful for audit clarity)
- `staff_note text null` only if no equivalent internal note field exists in the same review workflow; otherwise avoid duplication.

Defaulting existing rows to `parent_uploaded_homework` preserves current behavior without destructive migration.

## 6) Release model

Recommended release semantics:

- Teacher/branch supervisor/HQ can upload `teacher_marked_homework` within branch/class scope.
- Parent must not access marked files until `released_to_parent = true`.
- Student self visibility should follow the same released-only gate if enabled.

Feedback/file coupling choice:

- MVP recommendation: **couple file release to feedback release** for simpler and safer rollout.
- Practical approach: when feedback is released, set corresponding marked-file `released_to_parent = true` in same release action/transaction boundary.
- Future phase can separate file release from feedback release if product needs independent controls.

## 7) Storage/path model

Bucket decision:

- Reuse existing private `homework-submissions` bucket for MVP.

Path convention when reused:

- Keep existing prefix pattern:
  - `{branch_id}/{class_id}/{student_id}/{homework_task_id}/`
- Use role-aware filename suffix/prefix:
  - parent upload: `{submission_id}-parent-{safe_filename}`
  - marked file: `{submission_id}-marked-{safe_filename}`
  - feedback attachment: `{submission_id}-feedback-{safe_filename}`

Rules:

- No public object access.
- Signed URL only.
- Storage insert must still require matching metadata row.

## 8) RLS implications

Target policy behavior (additive patch direction):

- Staff (teacher assigned-class, branch supervisor branch-scoped, HQ) can select/upload marked files in scope.
- Parent linked-child can select only:
  - `parent_uploaded_homework` they are already allowed to see by current model, and
  - `teacher_marked_homework` / `feedback_attachment` when `released_to_parent = true`.
- Student self can select released-only marked/feedback files if student visibility is enabled.
- Parent/student cannot insert `teacher_marked_homework` or `feedback_attachment`.
- Parent/student cannot set release fields.
- No cross-family visibility.

Implementation note:

- `homework_files_select_014` and `homework_files_insert_014` will need role-aware predicates (and likely role-aware update checks) to avoid draft leakage and write abuse.
- Storage object select should remain protected by metadata linkage; metadata RLS must enforce release gate.

## 9) Service implications

Future service additions (no implementation in this milestone):

- `uploadMarkedHomeworkFile(...)`
- `listHomeworkFiles({ homeworkSubmissionId, role, parentVisibleOnly })`
- `getHomeworkFileSignedUrl(...)` (reuse existing method, but enforce release-aware metadata visibility)
- `releaseHomeworkFileToParent(...)`
- Keep existing `uploadHomeworkFile(...)` focused on parent submission flow for MVP clarity.

## 10) UI implications

Teacher `Homework` review panel (future):

- Add a `Marked work` section.
- Upload marked file action for staff roles only.
- Staff-only draft/released status badge.
- Release indicator aligned with feedback release.

Parent view (future):

- Show released marked file under `Teacher feedback / Marked work`.
- Do not show draft/internal artifacts.

## 11) AI implications

- AI is not required for manual marking workflow.
- Manual marked-file upload remains valid even without provider integration.
- If OCR/vision is added later, marked files can become optional AI input.
- Teacher approval remains mandatory before parent-visible release.

## 12) Backward compatibility

Safe additive migration posture:

- Existing `homework_files` rows default to `parent_uploaded_homework`.
- Existing parent upload flow continues without destructive changes.
- No table replacement, no data deletion, no breaking path migration required for MVP.

## 13) Testing plan

Future smoke coverage (fake/dev data only):

1. Staff uploads fake marked file (`teacher_marked_homework`) for in-scope submission.
2. Parent cannot list/open marked file before release.
3. Parent can list/open marked file after release.
4. Signed URL retrieval works for authorized role/scope only.
5. Parent cannot upload `teacher_marked_homework`.
6. Cleanup removes fake metadata row + storage object.

## 14) Recommended next milestone

Recommendation: **A. Draft additive SQL/RLS patch for `homework_files` file-role/release fields**

Why A first:

- File visibility and release semantics must be encoded before service/UI wiring.
- Prevents accidental parent privacy leakage from role-agnostic file reads.
- Follows the same backend-first safety pattern already used in homework foundation milestones.

## 15) Next implementation prompt (A only)

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
Draft additive SQL/RLS patch for manual marked homework files (Option A only).

Scope rules:
- SQL/RLS patch + docs updates only.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services in this step.
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

Required changes:
1) Additive schema updates on `homework_files`:
   - `file_role` with allowed values:
     - `parent_uploaded_homework`
     - `teacher_marked_homework`
     - `feedback_attachment`
   - `released_to_parent` boolean default false
   - `released_at` timestamptz nullable
   - `released_by_profile_id` uuid nullable
   - optional audit fields only if justified (`marked_by_profile_id`, `staff_note`)
2) RLS updates:
   - staff scoped select/insert for marked roles
   - parent linked-child select only for released marked/feedback files
   - prevent parent/student insert/update for teacher-marked roles and release fields
3) Storage policy alignment to keep private signed-URL-only behavior.
4) Docs checkpoint updates for release semantics and risk controls.

Validation efficiency rule:
- SQL/docs review change only.
- Run:
  - git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files changed.
```

## 16) SQL draft status update

- Additive SQL/RLS draft is now prepared at `supabase/sql/018_homework_file_roles_release_foundation.sql`.
- Draft remains manual/dev-first only and is not auto-applied.
- Draft introduces `homework_files.file_role` and file-level release metadata for release-gated parent visibility.
- Teacher marked-file upload service/UI and parent marked-file display remain future milestones.
- Existing parent upload metadata-first flow is preserved by backward-compatible defaults (`file_role = 'parent_uploaded_homework'`).

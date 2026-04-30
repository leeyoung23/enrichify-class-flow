# Manual Marked Homework Upload Plan

## 1) Current state

- Parent homework upload exists (`ParentView` + upload services + private storage flow).
- Teacher/staff homework review UI exists (`Homework` queue/detail panel).
- Feedback release flow exists (draft/review/release with parent visibility gate).
- Create Homework real save exists for class / selected students / individual assignments.
- AI homework feedback mock exists (draft-only helper path).
- Manual marked-file upload is not yet planned in implementation detail and not implemented.

## 2) Product purpose

Manual marking must remain a first-class human pathway in parallel to AI support.

Why this matters:

- Teachers may mark work manually outside the app (paper annotation, tablet stylus, offline workflows).
- Teachers need a way to upload marked evidence (PDF/image/photo) back into the homework review flow.
- Parents should see marked files only after authorized release.
- AI remains optional support and must not become the only viable marking route.

## 3) Manual marking workflow

Planned workflow:

1. Parent/student uploads homework submission (or teacher creates review record if needed in future exception flow).
2. Teacher reviews submission and marks work manually offline or in external tools.
3. Teacher uploads marked file (PDF/image/photo) to the related homework submission.
4. Teacher writes/updates feedback and next step.
5. Supervisor/HQ or permitted staff releases feedback (and parent-visible marked evidence).
6. Parent sees released feedback + released marked file.

Guardrail:

- No draft marked file is parent-visible before release.

## 4) File role model

Need: distinguish homework file intent (parent original vs teacher-marked output vs optional feedback attachment).

Candidate roles:

- `parent_uploaded_homework`
- `teacher_marked_homework`
- `feedback_attachment`

### Option A: Add `file_role` to `homework_files` (recommended MVP)

Pros:

- Additive and minimal schema expansion to existing file pipeline.
- Reuses existing `homework_files` + storage + signed URL patterns.
- Lower implementation complexity for service/UI.
- Easier rollout with one table and role-gated filtering.

Cons:

- Requires careful RLS refinement to ensure parent-visible filtering by release state and role.

### Option B: Separate `homework_marked_files` table

Pros:

- Clear semantic separation of teacher-marked artifacts.
- Potentially simpler policy reasoning per table in long term.

Cons:

- More migration and service complexity immediately.
- Duplicates patterns already solved in `homework_files`.

### Safest MVP direction

Recommend **Option A** first: additive `file_role` on `homework_files` + explicit visibility constraints tied to release state.

Rationale: minimal blast radius, reuses tested metadata-first + signed URL architecture, and keeps the human-path feature deliverable small and reviewable.

## 5) Visibility/release rules

Plan:

- Marked files private by default.
- Teacher/supervisor/HQ can view marked files while in review scope.
- Parent can view marked files only when release condition is satisfied (feedback released and/or explicit file release flag per final data model).
- No public URLs.
- Signed URLs only.
- Internal notes remain hidden from parent path.

Release gating recommendation:

- For MVP, align parent file visibility with existing feedback release state (`released_to_parent`) unless a dedicated file-level release flag is required by policy review.

## 6) Storage/path rules

Recommendation:

- Reuse existing private bucket `homework-submissions` for MVP unless operational concerns later justify separation.

Proposed path convention (same family pattern):

- `branch/class/student/task/submission/marked-file`

Examples (conceptual only):

- parent upload: `.../{submission_id}-parent-{filename}`
- teacher marked upload: `.../{submission_id}-marked-{filename}`

No SQL changes in this planning milestone.

## 7) Future service methods

Planned service-layer additions (future milestone, no implementation now):

- `uploadMarkedHomeworkFile({ homeworkSubmissionId, file, notes })`
- `listMarkedHomeworkFiles({ homeworkSubmissionId, parentVisibleOnly })`
- `getMarkedHomeworkFileSignedUrl({ fileId })`
- `releaseMarkedHomeworkFileToParent({ fileId })` (only if file-level release is needed separately from feedback release)

Service constraints:

- anon client + JWT only
- stable `{ data, error }`
- strict role-scoped reads/writes
- no direct SQL from UI

## 8) UI placement

Recommended placement in `Homework` review detail panel:

- section title: `Marked work`
- `Upload marked file` action (staff only)
- list of marked files with preview/open action
- release status indicator (draft/released alignment)
- explicit parent-visible label when released

Keep separate from core feedback action row to avoid clutter/regression risk.

## 9) ParentView behavior

Plan for parent path:

- Parent sees marked file only after release.
- Display under teacher feedback area (`Teacher feedback / Marked work`).
- No draft/internal file visibility.
- No teacher internal notes exposed.
- Signed URL access only.

## 10) RLS/security implications

Required access model:

- Teacher: assigned-class scoped access.
- Branch supervisor: own-branch scoped access.
- HQ: all-branch access per policy.
- Parent: linked-child + released-only visibility.
- Student: optional released-only self visibility (future policy choice).
- No cross-family visibility.
- No frontend service role key.
- No broad bypasses.

Risk focus:

- prevent parent access to draft marked artifacts
- prevent non-assigned teacher access
- preserve current feedback/internal-note protections

## 11) Relationship with AI

Manual and AI marking should be parallel pathways:

- Manual marking works independently when AI is unavailable.
- AI can later draft feedback from marked file content if OCR/vision is introduced.
- Teacher approval remains mandatory for any parent-visible output.
- Human pathway guarantees operational continuity and trust.

## 12) Required SQL/data-model decision

Current `homework_files` likely cannot safely express marked-vs-parent distinction without schema extension.

Likely need before implementation:

- additive field (e.g. `file_role`) and possibly explicit visibility/release metadata.
- RLS/storage policy patch to enforce release-gated parent reads for marked files.

Recommendation:

- do **additive SQL/RLS review patch** first (manual/dev-first), then service/UI implementation.

## 13) Testing plan

Future smoke test coverage:

- Teacher/supervisor uploads fake marked file for a submission.
- Parent cannot view marked file before release.
- Parent can view marked file after release.
- Signed URL retrieval works for allowed role/scope.
- Internal notes remain hidden from parent.
- Cleanup removes fake storage objects + metadata rows.

Optional checks:

- unauthorized teacher blocked outside class scope
- parent blocked from draft marked file URL creation

## 14) Implementation sequence

- Phase 1: this plan
- Phase 2: SQL/data model review for file-role/release visibility
- Phase 3: upload service + smoke test
- Phase 4: teacher marked-file UI
- Phase 5: parent released marked-file display
- Phase 6: AI OCR/marked-file feedback later

## 15) Recommended next milestone

Choose:

- A. SQL/data model review for marked homework files
- B. Upload service directly
- C. Teacher UI directly
- D. Resume AI Edge Function deployment
- E. Announcements/Internal Communications planning

Recommendation: **A. SQL/data model review for marked homework files**

Why A first:

- Parent visibility/release rules need explicit data-model clarity.
- Current `homework_files` does not clearly distinguish parent upload vs teacher marked output.
- SQL/RLS review first reduces privacy leakage risk before upload UI/service rollout.

## 16) Next implementation prompt

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
SQL/data model review for manual marked homework files only.

Scope rules:
- SQL/RLS planning + draft patch only (no runtime UI wiring in this step).
- Do not change app UI.
- Do not change runtime logic.
- Do not add services yet.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.

Inspect:
- supabase/sql/014_homework_upload_review_foundation.sql
- src/services/supabaseUploadService.js
- src/services/supabaseReadService.js
- src/services/supabaseWriteService.js
- docs/manual-marked-homework-upload-plan.md
- docs/project-master-context-handoff.md

Deliverables:
1) Draft additive SQL/RLS patch proposal (new SQL file) for marked-file role modeling:
   - file_role on homework_files (or justified alternative)
   - role values for parent upload / teacher marked / feedback attachment
   - release-visibility policy alignment for parent reads
2) Explain whether feedback release gate is sufficient or separate file release flag is needed.
3) Update documentation checkpoints/handoff notes.
4) No SQL execution; manual apply remains future.

Validation efficiency rule:
- Planning/docs + SQL draft only.
- Run:
  - git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files changed.
```

## 17) SQL draft checkpoint (manual/dev-first)

- Additive SQL/RLS draft now exists at `supabase/sql/018_homework_file_roles_release_foundation.sql`.
- Draft scope: `homework_files` file-role/release fields and release-aware RLS/storage policy patching.
- Draft is manual/dev-first and fake-data validation only; it is not auto-applied.
- Parent upload flow compatibility is preserved through default `file_role = 'parent_uploaded_homework'`.
- Teacher marked-file upload runtime wiring remains future.
- Parent marked-file display runtime wiring remains future.

## 18) SQL application checkpoint (manual dev)

- `supabase/sql/018_homework_file_roles_release_foundation.sql` has now been manually applied in Supabase dev (SQL Editor success).
- Application checkpoint doc: `docs/homework-file-role-release-sql-application-checkpoint.md`.
- This milestone remains SQL-application documentation only:
  - no production apply
  - no UI/runtime/service changes
- Next recommended implementation step is service + smoke validation for marked-file upload/release boundaries before UI wiring.

## 19) Service + smoke checkpoint

- Manual marked-file upload/read/release service methods are now added in `src/services/supabaseUploadService.js`.
- New smoke script is now added at `scripts/supabase-homework-marked-file-smoke-test.mjs`.
- Package command is now available: `npm run test:supabase:homework:marked-file`.
- Teacher marked-file UI remains future.
- Parent marked-file display remains future.
- AI OCR/provider integration remains future.

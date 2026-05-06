# Class Memories backend/storage/RLS plan

Planning-only document for Class Memories foundation.

Scope guardrails for this step:

- No app UI changes.
- No runtime upload code changes.
- No SQL migrations created or altered in this step.
- No storage buckets created in this step.
- No real photos/videos/files.
- No real student/parent/teacher/school/payment/homework/media data.
- No AI API usage.
- No service role key in frontend.
- `demoRole` and demo/local fallback remain unchanged.

---

## 1) Product purpose

**Memories** (or **Class Memories**) should be treated as a warm, parent-facing learning evidence feature, not a generic image dump.

Core product intent:

- Build parent trust and emotional connection with class life.
- Show learning evidence from teacher-led class moments.
- Surface the **latest approved Memory first** in the parent portal.
- Provide a **history/archive** view for approved past Memories.
- Support teacher upload + staff review + controlled parent visibility.

Product naming guidance:

- Parent-facing label should be **Memories / Class Memories**.
- Avoid using **“class photo”** as the primary parent-facing feature name.
- Avoid framing it as a random gallery without educational context/caption.

---

## 2) User roles and flows

### Teacher

- Upload Memory media (photo first; video later) plus title/caption for class/session/student context where appropriate.
- Save as draft, then submit for review.
- Edit draft/submitted content before release if policy allows.

### Branch Supervisor / HQ

- Review pending Memories.
- Approve/reject/hide based on policy.
- View branch/class Memories in their permitted scope.
- Manage visibility state for parent-facing release.

### Parent

- See latest approved Memory for linked child/class context.
- Open Memories History for approved records.
- Cannot see draft/submitted/rejected/unapproved media.
- Cannot see other classes/branches beyond linked scope.

### Student

- Optional later: read-only visibility similar to linked parent-safe scope.

### Privacy baseline for all staff/parent flows

- No public bucket.
- No public raw URLs.
- Use signed URLs and/or controlled access reads only.

---

## 3) Data model proposal

Recommended table name: `class_memories` (preferred for product language) or `class_media` (acceptable technical alias).

Suggested fields:

- `id`
- `branch_id`
- `class_id`
- `student_id` (nullable)
- `session_id` (nullable)
- `uploaded_by_profile_id`
- `approved_by_profile_id` (nullable)
- `title`
- `caption`
- `media_type` (`image` / `video`)
- `storage_bucket`
- `storage_path`
- `thumbnail_path` (nullable)
- `visibility_status` (`draft` / `submitted` / `approved` / `rejected` / `hidden`)
- `visible_to_parents` (boolean)
- `approved_at`
- `rejected_reason`
- `created_at`
- `updated_at`

`student_id` nullable decision:

- Keep nullable for class-wide Memory records.
- Use populated `student_id` for student-specific Memory records.
- This supports mixed rollout: class-wide default now, student-specific where needed later.

---

## 4) Storage proposal

Recommended bucket: **`class-memories`** (private).

Why this name:

- Aligns with product language used in parent-facing UI.
- Clearer than overly generic naming for future governance.
- Consistent with private + signed URL model already used in fee/staff-time-clock evidence patterns.

Path convention:

- Class-wide: `{branch_id}/{class_id}/{date}/{memory_id}-{safe_filename}`
- Student-specific: `{branch_id}/{class_id}/{student_id}/{date}/{memory_id}-{safe_filename}`

Access expectations:

- Teacher uploads only for assigned class scope.
- Branch supervisor: own branch.
- HQ: all branches per policy.
- Parent: linked child/class approved-only.
- Student: linked own approved-only (if enabled later).
- Teacher blocked from unrelated branches/classes.
- Parent/student blocked from draft/submitted/unapproved content.

---

## 5) RLS/security expectations

- HQ can read/manage all branches (policy controlled).
- Branch supervisor limited to own branch.
- Teacher limited to assigned classes for create/read/update in allowed states.
- Parent limited to linked child/class + approved/visible rows only.
- Student limited to own approved rows only if student portal path is enabled.
- Parent/student cannot upload/edit/delete Memory rows.
- Service role key is never used in frontend.
- Storage bucket remains private.
- Signed URLs only for media access.

---

## 6) Approval lifecycle

Recommended lifecycle:

1. `draft`
2. `submitted`
3. `approved` + `visible_to_parents = true` (or equivalent release gate)

Other states:

- `rejected`: teacher revises/resubmits or archives.
- `hidden`: removed from parent view while retained for internal audit/compliance context as needed.

---

## 7) Parent portal display plan

`ParentView` should eventually include:

- **Latest Memory** card high on page (or first).
- Approved image/video preview.
- Caption text.
- Class and date context.
- **View Memories History** action.
- Empty state copy: **“No new Memories yet”** when none are visible.

---

## 8) Teacher upload placement

Primary upload entry point:

- **Class Session / class workflow** via `+ Add Memory`.

Secondary entry point:

- **Parent Updates** flow as attach/select Memory while drafting updates.

Why this split:

- Class Session is closest to real-time teaching context and class/session metadata.
- Parent Updates is a strong secondary narrative surface for linking communication to approved evidence.
- Keeps Memories educational and contextual, not random media posting.

---

## 9) Media validation / privacy

Planned validation guardrails:

- Allowed image types: `image/jpeg`, `image/png`, `image/webp`.
- Short videos: later phase (after initial image-safe rollout).
- Enforce file size limits (phase-specific thresholds).
- Thumbnail generation: later phase.
- Consent/photo policy wording required before production rollout.
- Avoid any public child media exposure.
- Include hide/remove capability for policy incidents.

---

## 10) Implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** SQL/storage/RLS draft.
- **Phase 3:** service upload method + fake image smoke test.
- **Phase 4:** teacher upload UI mock/local. (implemented in `ParentUpdates` as a minimal Add Memory card with image-only submit-for-review wiring)
- **Phase 5:** real teacher upload path.
- **Phase 6:** approval/release UI.
- **Phase 7:** parent Latest Memory + History.
- **Phase 8:** thumbnails/video polish.

---

## 11) Validation/test plan (future)

Future smoke tests should verify:

- Teacher can upload fake image for assigned class scope.
- Parent cannot see draft/submitted Memory.
- Supervisor/HQ can approve appropriately.
- Parent can read approved Memory.
- Teacher blocked from unrelated branch/class.
- Parent/student blocked from upload/write.
- Signed URL generation works for allowed readers.
- Fake test object/row cleanup completes.

---

## 12) Recommended next step

**Recommendation: A. SQL/storage/RLS draft for `class_memories`.**

Why A first:

- It defines the security and data contract before UI/runtime upload work.
- Existing product already has parent Memories placeholders and established private-bucket + signed URL precedents.
- Getting policy boundaries right first reduces rework and privacy risk in later teacher/parent UI phases.

---

## 13) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Task: Class Memories SQL/storage/RLS draft only.

Constraints:
- Do not change app UI.
- Do not add runtime upload code.
- Do not use real photos/videos/files.
- Do not use real student/parent/teacher/school/payment/homework/media data.
- Do not call AI APIs.
- Do not expose env values or secrets.
- Do not use service role key in frontend.
- Keep demoRole/demo-local fallback behavior unchanged.

Deliverables:
1) Draft SQL migration for Class Memories foundation:
   - table: class_memories (or class_media with clear product naming note)
   - fields for branch/class/student/session/uploader/approver/title/caption/media_type/storage paths/status/visibility/audit timestamps
   - supporting indexes for branch/class/status/date reads
2) Draft private bucket + storage policies for class-memories:
   - teacher assigned-class upload/read draft/submitted scope
   - branch supervisor own-branch review/read
   - HQ cross-branch review/read
   - parent linked child/class approved-only read
   - student linked approved-only read (if enabled)
3) Draft RLS policies for class_memories table matching storage rules.
4) Add/update one checkpoint doc summarizing the policy matrix and known risks.

Validation efficiency:
- If SQL/docs only, run:
  - git diff --name-only
- Do not run build/lint/smoke unless runtime files changed.
```

---

## Status checkpoint

- SQL draft added: `supabase/sql/011_class_memories_foundation.sql`.
- Draft includes `class_memories` table, private `class-memories` bucket insert, RLS policies, and storage policies.
- SQL was manually applied in the Supabase dev project (see `docs/class-memories-sql-application-checkpoint.md`).
- Upload service + fake image smoke test now added:
  - `uploadClassMemory(...)`
  - `getClassMemorySignedUrl(...)`
  - `listClassMemories(...)`
  - `getClassMemoryById(...)`
  - `scripts/supabase-class-memories-upload-smoke-test.mjs`
  - `npm run test:supabase:class-memories:upload`
- Teacher Add Memory UI: implemented as a minimal teacher-only Add Memory card in `ParentUpdates` using `uploadClassMemory(...)` with submit-for-review flow.
- No approval/release UI yet.
- Parent Latest Memory + Memories History real wiring: implemented in `ParentView` for authenticated non-demo parent path using approved+visible Memories only.
- Parent Memories History layout direction: gallery/card-grid style (mobile-first stack, multi-column where space allows), not a long one-by-one feed.
- Thumbnail/video polish pipeline: still future.
- Fake data only; no real photos/videos/files.
- Manual security review is required before any apply step.


# Class Memories SQL application checkpoint

Checkpoint for manual application status of Class Memories SQL foundation in the Supabase dev project.

Scope guardrails:

- Docs-only checkpoint.
- No app UI/runtime changes.
- No new services.
- No SQL edits in this step.
- Fake/dev-safe data only.

---

## 1) What was applied

Manual SQL applied in Supabase dev:

- `supabase/sql/011_class_memories_foundation.sql`

---

## 2) Manual Supabase verification

Verified in dev project after manual apply:

- `class_memories` table exists.
- `class-memories` storage bucket exists.
- `class-memories` bucket is private (`public = false`).
- RLS policies for `class_memories` exist.
- `storage.objects` policies for `class-memories` exist.
- Expected columns confirmed, including:
  - `storage_path`
  - `thumbnail_path`
  - `visibility_status`
  - `visible_to_parents`
  - `approved_at`
  - `rejected_reason`
  - `hidden_at`
  - `created_at`
  - `updated_at`

---

## 3) Product/security intent

- Parent-facing feature name is **Memories / Class Memories** (not generic “class photo”).
- Purpose is warm parent engagement plus learning evidence.
- Parent portal target is **Latest approved Memory first** plus **Memories History/archive**.
- Teacher target flow is draft/submitted Memories from teaching workflow context.
- Branch supervisor/HQ review/approve path gates parent visibility.
- Storage remains private-only.
- Media access is signed URL only.
- Parent/student can read only approved + visible linked Memories.
- Parent/student cannot upload/edit/delete.

---

## 4) Current implementation boundary

Still not implemented:

- Teacher `+ Add Memory` UI flow.
- Approval/release UI flow.
- Parent Latest Memory real card wiring.
- Parent Memories History real list wiring.
- Thumbnail/video generation and polish.

---

## 5) Recommended next milestone

Recommend: **Teacher-facing Add Memory UI mock/local flow** (after service proof).

Why this is next:

- SQL/RLS/storage foundation is now applied in dev.
- Upload service + fake image smoke test now cover metadata-first upload and private signed URL behavior.
- Next product value is giving teachers a safe UI entrypoint (still without parent release UI yet).

---

## 6) Related docs alignment

Docs now align with this checkpoint:

- `docs/class-memories-backend-storage-plan.md`
- `docs/storage-upload-foundation-plan.md`
- `docs/rls-test-checklist.md`

Alignment notes:

- `011` is applied in dev manually.
- Upload service + fake image smoke test are available (`npm run test:supabase:class-memories:upload`).
- Fake data only for validation.
- No real photos/videos/files should be used at this stage.

---

Checkpoint status: Class Memories SQL/storage/RLS foundation is applied in dev and ready for service-layer validation next.


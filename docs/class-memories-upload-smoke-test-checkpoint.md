# Class Memories upload smoke test checkpoint

Checkpoint for Class Memories service-layer upload validation using fake image data only.

Scope guardrails:

- Docs-only checkpoint.
- No app UI changes.
- No runtime logic changes in this step.
- No SQL/storage policy changes in this step.
- Fake/dev-safe data only.

---

## 1) What was implemented

Implemented and validated:

- `uploadClassMemory(...)` service method.
- `getClassMemorySignedUrl(...)` service method.
- `listClassMemories(...)` service method.
- `getClassMemoryById(...)` service method.
- Smoke test script for class memories upload lifecycle:
  - `scripts/supabase-class-memories-upload-smoke-test.mjs`
- NPM script:
  - `npm run test:supabase:class-memories:upload`

---

## 2) Files changed

- `src/services/supabaseUploadService.js`
- `scripts/supabase-class-memories-upload-smoke-test.mjs`
- `package.json`
- `docs/class-memories-backend-storage-plan.md`
- `docs/class-memories-sql-application-checkpoint.md`
- `docs/rls-test-checklist.md`

---

## 3) Upload lifecycle proven

The smoke test verifies:

1. Teacher creates metadata-first `class_memories` row.
2. Fake tiny image object uploads to private `class-memories` bucket.
3. Signed URL generation works for allowed role path.
4. Parent cannot read draft/submitted memory.
5. Student cannot read draft/submitted memory.
6. Branch supervisor can read scoped memory.
7. Cleanup path works for fake object + fake row.

---

## 4) Security notes

- Uses anon Supabase client + authenticated JWT only.
- No service role usage in frontend/service paths.
- Bucket remains private (`class-memories`).
- Access path is signed URL based.
- Smoke test uses fake tiny image payload only.
- No real photos/videos/files are used.

---

## 5) What remains

Still not implemented:

- Teacher Add Memory UI (minimal teacher card in `ParentUpdates`) now wired to `uploadClassMemory(...)` for submit-for-review.
- Approval/release UI (write methods + approval smoke test now exist; review UI not wired).
- Parent Latest Memory UI wiring.
- Parent Memories History/archive UI wiring.
- Thumbnail/video polish pipeline.
- Consent/photo policy finalization.

---

## 6) Next milestone (updated)

Recommend: **Class Memories approval/release UI wiring**.

Why:

- SQL/RLS/storage foundation is already applied in dev.
- Teacher submit-for-review flow is implemented.
- Approval write methods and approval smoke test are now available.
- Highest product value next is staff review UI (approve/reject/hide actions) before parent Latest/History rendering.

---

Checkpoint status: Upload service layer and fake image upload smoke path are validated; approval write-path and approval smoke now also exist, while approval/release UI and parent memories UI remain future.


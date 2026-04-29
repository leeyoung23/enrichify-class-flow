# Class Memories full vertical checkpoint

Checkpoint summary for the completed Class Memories vertical using fake/dev-safe data and role-scoped Supabase access.

Scope guardrails:

- Documentation-only checkpoint.
- No app UI changes in this step.
- No runtime logic changes in this step.
- No Supabase SQL or storage policy changes in this step.
- No real photos/videos/files.
- No real student/parent/teacher/school/payment/homework/media data.
- No AI API usage.

---

## 1) What is implemented

Implemented across schema, service, review workflow, and parent display:

- Class Memories SQL/storage/RLS foundation is applied in dev.
- `class_memories` table exists.
- `class-memories` private bucket exists.
- Upload/read service methods exist (`uploadClassMemory`, `getClassMemorySignedUrl`, `listClassMemories`, `getClassMemoryById`).
- Approval service methods exist (`approveClassMemory`, `rejectClassMemory`, `hideClassMemory` service path).
- Teacher Add Memory UI is wired in `ParentUpdates`.
- HQ/branch supervisor review UI is wired in `ParentUpdates`.
- Parent Latest Memory + Memories History are wired in `ParentView` for non-demo parent path.
- Demo role behavior remains local/demo-only and preserved.

---

## 2) End-to-end flow

Current end-to-end behavior:

1. Teacher submits a Memory for review.
2. Memory metadata and object are stored privately.
3. Parent cannot see submitted Memory.
4. HQ/branch supervisor reviews submitted Memories.
5. Reviewer approves/releases or rejects.
6. Parent sees approved+visible **Latest Memory**.
7. Parent sees approved+visible **Memories History** in gallery/card-grid form.

---

## 3) Files/areas involved

- `supabase/sql/011_class_memories_foundation.sql`
- `src/services/supabaseUploadService.js`
- `src/services/supabaseWriteService.js`
- `src/pages/ParentUpdates.jsx`
- `src/pages/ParentView.jsx`
- `scripts/supabase-class-memories-upload-smoke-test.mjs`
- `scripts/supabase-class-memories-approval-smoke-test.mjs`

---

## 4) Privacy and security

- Private bucket (`class-memories`) is used.
- Media access is signed URL only.
- Frontend/service paths use anon client + authenticated JWT only.
- No service role key is used in frontend.
- Parent/student access is approved+visible linked scope only.
- Draft/submitted/rejected records remain hidden from parent.
- Demo role remains local-only and does not perform real Supabase review/upload flows.

---

## 5) Mobile and product notes

- Latest Memory is presented as a warm, parent-friendly hero card.
- Memories History is presented as gallery/card-grid style, not a long stacked feed.
- Parent-facing naming remains **Memory / Memories / Class Memories**.
- Avoid parent-facing label **class photo**.

---

## 6) Known limitations

- Hide/archive UI is not wired yet (service path exists).
- Video support is not wired yet.
- Thumbnail generation is not wired yet.
- Consent/photo policy is not finalised.
- Production iOS/Android media QA is still required.
- A dedicated Memories Review page may be needed later as moderation volume grows.

---

## 7) Recommended next milestone

Recommended: **A. Project master context handoff doc**.

Why this is next:

- Class Memories now spans schema, storage policy assumptions, upload/review services, multiple UIs, and smoke tests.
- A single handoff/context doc reduces re-onboarding time and helps future contributors avoid regressions across role/RLS behavior.
- It creates a stable foundation before starting the next major vertical (curriculum, homework pipeline, or AI integration).

---

Checkpoint status: Class Memories vertical is functionally connected from teacher submit, through staff approval gate, to parent approved-memory display, with security guardrails and demo fallback preserved.

## 8) Demo Memories layout parity update

- Parent demo Class Memories History layout now uses gallery/grid style for preview parity:
  - `1` column on small screens,
  - `2` columns on tablet/desktop.
- Latest Memory demo hero card is preserved.
- Demo uses placeholder gradients/fake copy only; no real media or Supabase demo writes.
- Real approved-memory parent display path remains unchanged.

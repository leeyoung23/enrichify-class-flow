# Class Memories Teacher upload UI checkpoint

Checkpoint for the minimal teacher-facing Add Memory upload UI using fake/dev-safe data paths only.

Scope guardrails:

- Documentation-only checkpoint.
- No app UI changes in this step.
- No runtime logic changes in this step.
- No Supabase SQL changes in this step.
- No storage policy changes in this step.
- No real photos/videos/files.
- No real student/parent/teacher/school/payment/homework/media data.
- No AI API usage.

---

## 1) What was implemented

Implemented in the prior UI milestone:

- Teacher Add Memory entrypoint in `ParentUpdates`.
- Authenticated non-demo teacher upload path wired to `uploadClassMemory(...)`.
- Submission state is **submit for review** only.
- No approval/release behavior added in this milestone.
- No parent-facing latest/history Memories rendering added in this milestone.
- `demoRole` local/demo behavior remains in place.

---

## 2) Files changed in the implementation milestone

- `src/pages/ParentUpdates.jsx`
- `docs/class-memories-backend-storage-plan.md`
- `docs/class-memories-upload-smoke-test-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`

---

## 3) Teacher upload flow

Current teacher flow:

1. Teacher opens `ParentUpdates`.
2. Teacher selects class/student context.
3. Teacher enters optional Memory title and caption.
4. Teacher chooses an image file.
5. Teacher taps **Submit Memory for review**.
6. `uploadClassMemory(...)` creates a submitted `class_memories` row and uploads a private object to `class-memories`.

Outcome:

- Memory is submitted for internal review workflow.
- Parent visibility is not immediate.

---

## 4) Data and safety controls

- `branchId`, `classId`, and optional `studentId` are validated as UUIDs before real upload.
- No guessed production IDs are used.
- Image-only guardrails are enforced (`image/jpeg`, `image/png`, `image/webp`).
- Max file size is 5MB.
- Parent view remains approval-gated; parents should only see approved Memories in later milestones.

---

## 5) demoRole behavior

- In demoRole, the Add Memory action stays local/demo only.
- No Supabase upload call is made.
- UI shows safe local/demo success behavior only.

---

## 6) What remains unwired

- Approval/release UI in `ParentUpdates` is now minimally wired for HQ/branch supervisor review actions.
- Parent Latest Memory UI.
- Parent Memories History/archive UI.
- Video upload support and thumbnail pipeline.
- Consent/photo policy finalization.

---

## 7) Recommended next milestone

Recommended next step: **Class Memories approval/release UI**.

Why this is next:

- Teacher upload-to-review entrypoint now exists, so the next value step is controlled moderation.
- Approval/release is the key gate that protects parent-facing visibility and policy compliance.
- Parent Latest Memory and History should follow only after approval/release controls are in place.

---

Checkpoint status: Teacher Add Memory upload UI is wired for review submission, downstream staff review UI now exists for HQ/branch supervisor in `ParentUpdates`, and parent display phases remain future work.

# Homework AI marking / OCR — readiness plan

Date: 2026-05-06  
Type: foundation / planning (this milestone: documentation + copy clarity; no OCR provider in product path)

---

## Current homework architecture (prototype)

**Core tables** (see `supabase/sql/014_homework_upload_review_foundation.sql` and follow-ups):

| Table | Purpose |
|--------|---------|
| `homework_tasks` | Assignment metadata (branch, class, title, due date, status draft/assigned/…). |
| `homework_submissions` | Per-student submission rows; lifecycle `submitted` → `under_review` → … → `approved_for_parent`. |
| `homework_files` | Private `homework-submissions` bucket metadata + **file roles** (`018`). |
| `homework_feedback` | Draft-first feedback; **`internal_note`** is staff-only by design. |

**File roles** (`018_homework_file_roles_release_foundation.sql`):

- `parent_uploaded_homework` — family upload; parent can read own uploads under RLS helpers.
- `teacher_marked_homework` — staff upload; **released_to_parent** gates parent visibility.
- `feedback_attachment` — optional attachment aligned with feedback release rules.

**Staff UI:** `src/pages/Homework.jsx` — trackers, submissions, marked files, **mock-only** sparkle draft (`aiDraftService` context summaries, **no file bytes to a model** in this build).

**Parent UI:** `ParentView.jsx` → homework card — uploads, statuses, released feedback text, released marked-work list via signed URLs when allowed.

---

## Proposed safe AI marking / OCR flow (future)

1. Parent or teacher uploads homework (image/PDF) → stays in **private** storage + **staff-scoped** DB rows until policy allows parent read rules for their own uploads.  
2. Optional **offline or Edge** pipeline: OCR / vision proposes **structured draft marking** (`draft`/`internal` semantics only).  
3. Draft **never** auto-updates parent-visible fields.  
4. Teacher reviews, edits, and may discard AI output; **manual feedback** continues to work without AI.  
5. Supervisor/HQ/teachers (per branch policy): **explicit release** of `homework_feedback` and **`released_to_parent`** on marked files.  
6. Parent sees **only** released rows and released files — unchanged rule.  
7. **No auto-release** of AI output — same invariant as AI parent reports lane.

Optional AI is **support for drafting**, not a replacement for professional judgement.

---

## Data / privacy boundaries

- Child-identifying images and uploads are **high sensitivity** — future OCR/computer-vision requires DPIA-grade review, retention limits, regional consent, and **no retention of raw prompts/images** unless policy allows.  
- **internal_note**, **staff_note**, unsubmitted drafts, and unreleased marked files remain **never parent-visible** in architecture.  
- No **service-role** browser clients; JWT + RLS only.

---

## What exists today vs missing for scan→AI draft feedback

**Exists:**

- Submission + file ingestion to private bucket.  
- Feedback lifecycle + marked file release flags.  
- **Mock** feedback draft generator from **metadata/context** (`generateMockHomeworkFeedbackDraft`).  
- Edge-related **stub/adapter tests** under `scripts/ai-homework-*.mjs` and Supabase functions (disabled/mock modes typical).

**Missing for real scan→feedback:**

- Consent/policy for minors’ homework images entering an external vision model.  
- Budgeted Vertex/OpenAI/other adapter with strict redaction.  
- Server-side OCR pipeline (or embedded client flow, which is undesirable for secrecy).  
- DB columns or events for **`ai_feedback_draft`** identity if we need versioning/audit separation from teacher_final.  
- Load tests / error surfaces for oversized PDF/GPU timeouts.

---

## Validation before real parent rollout

- RLS regressions on `homework_files` for each `file_role` + release flag combination.  
- Parent never reads `internal_note`, draft feedback, unreleased marked files — automated smokes complement manual UAT.  
- Abuse cases: MIME spoofing, path traversal prevention (already policy-oriented in upload services).  
- Legal/compliance + incident response playbook for leaked child uploads.

---

## Related scripts (smoke / local)

- `npm run test:supabase:homework:upload`  
- `npm run test:supabase:homework:feedback`  
- `npm run test:supabase:homework:assignment:write`  
- Optional local-only: `test:ai:homework-feedback:mock`, `test:ai:homework-provider-adapter` (assert paths, **no paid provider** in default config).  
- **Avoid** `test:ai:homework-edge:deployed` in routine CI unless staging Edge is expected — can touch deployed infrastructure.

---

## SaaS discipline

- Parent UX: warm, no internal IDs in primary copy.  
- Teacher UX: guided lifecycle; **mock AI** clearly labelled.  
- HQ powerful where needed; not mirrored on ParentView.  
- Real rollout still needs **legal/compliance** sign-off on child media + external AI.

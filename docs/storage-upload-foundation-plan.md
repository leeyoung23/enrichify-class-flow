# Storage/upload foundation plan

This document plans the first safe Supabase Storage/upload foundation without implementing runtime upload features yet.

## 1) Current upload/storage status

- No real upload flow is wired end-to-end in production runtime.
- Several domains already anticipate storage metadata in schema/docs (for example `fee_records.receipt_file_path`, `homework_attachments.storage_path`, `sales_kit_resources.file_path`).
- UI placeholders/demo paths exist for fee receipts, homework attachments, memories, and sales kit resource patterns.
- No real files should be used in this phase.

## 2) Candidate upload verticals

### Fee receipt upload

- **Uploader:** parent (or office staff in controlled exceptions).
- **Reviewer/approver:** branch supervisor verifies branch records; HQ can audit all.
- **Parent/student visibility:** parent sees own child/payment state; student generally not uploader.
- **Likely bucket:** `fee-receipts` (private).
- **Metadata table needs:** `fee_records` already has receipt bucket/path, uploader, upload time, verifier, verification state.
- **Risks:** receipt privacy, wrong-branch access, forged status updates, exposing private files via public URLs.

### Homework upload

- **Uploader:** parent/student.
- **Reviewer/approver:** teacher first; branch/HQ oversight later.
- **Parent/student visibility:** parent/student see own submissions; teacher sees assigned class.
- **Likely bucket:** `homework-uploads` (private).
- **Metadata table needs:** `homework_attachments` exists but needs lifecycle/status parity with assignment/review flows.
- **Risks:** larger file volume, classroom scope complexity, future AI-marking coupling, stricter child-data handling.

### Memories upload

- **Uploader:** teacher.
- **Reviewer/approver:** branch supervisor/HQ moderation before parent visibility.
- **Parent/student visibility:** approved memories only.
- **Likely bucket:** `class-memories` (private by default; delivery via signed URLs).
- **Metadata table needs:** future `class_media` (or equivalent) with approval fields and audience controls.
- **Risks:** child image privacy and consent controls, moderation queue needs, accidental broad visibility.

### Sales Kit PDF upload

- **Uploader:** HQ (primary), possibly delegated staff.
- **Reviewer/approver:** HQ approval flow.
- **Parent/student visibility:** blocked; branch supervisor read-only to approved scoped/global resources.
- **Likely bucket:** `sales-kit-resources` (private or controlled public-with-metadata gate, prefer private first).
- **Metadata table needs:** `sales_kit_resources` already supports file path, status, scope, approver.
- **Risks:** lowest child-data risk but still needs role/scope enforcement and version/archive handling.

## 3) Recommended first upload vertical

Recommended first vertical: **Fee receipt upload**.

Why first:

- Schema support is already close (`fee_records` includes receipt path/bucket and verification fields).
- Clear reviewer chain (parent upload -> branch supervisor verify -> HQ audit).
- Lower complexity than homework (which intersects class/student/task/AI pipelines).
- Lower privacy/moderation complexity than memories media rollout.
- Strong business value with constrained workflow and simpler smoke-test surface.

## 4) Supabase Storage design pattern

Use a consistent secure pattern:

- Private buckets by default.
- Deterministic file path convention, e.g. `<branch_id>/<student_id>/<domain>/<record_id>/<timestamp>-<safe_filename>`.
- Metadata table row stores canonical `storage_bucket` + `storage_path`.
- RLS enforced on metadata table first; storage policies mirror table access constraints.
- Use signed URLs for controlled downloads/previews when needed.
- Never default child-related buckets to public.
- Frontend uses anon client + JWT; no service role key in frontend.

## 5) Fee receipt upload plan (recommended)

- Parent uploads receipt screenshot/photo (fake test files only in early validation).
- File stored in private `fee-receipts` bucket.
- Metadata linked to `fee_records` row:
  - `receipt_storage_bucket`
  - `receipt_file_path`
  - `uploaded_by_profile_id`
  - `uploaded_at`
  - `verification_status`
- Branch supervisor can verify records for own branch only.
- HQ can review all branches.
- Teacher role blocked from verification/write path.
- Parent sees only own linked child/payment status and own receipt reference flow.

## 6) Homework upload plan (next candidate)

- Parent/student uploads homework attachments to private `homework-uploads`.
- Metadata persists in `homework_attachments` linked to `homework_records`.
- Teacher reviews within assigned class scope.
- AI marking integration remains later and separate from initial upload foundation.
- Keep submission/upload path independent from AI availability.

## 7) Memories upload plan

- Teacher uploads class memories.
- Persist metadata in future `class_media` table with approval fields.
- Branch/HQ moderation before parent visibility.
- Parent view exposes approved memories only via signed URL delivery.

## 8) Sales Kit upload plan

- HQ uploads PDFs/resources.
- Store file path metadata in `sales_kit_resources` with `status` approval lifecycle.
- Branch supervisor sees approved scoped/global resources.
- Teacher/parent/student access remains blocked by policy unless explicitly expanded later.

## 9) Implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** choose one vertical and review schema + storage policy readiness. - completed for Fee Receipt Upload.
- **Phase 3:** add SQL/storage policy patch if needed. - draft added (`supabase/sql/009_fee_receipt_upload_policies.sql`).
- **Phase 4:** implement service upload method + smoke test.
- **Phase 5:** wire UI upload action.
- **Phase 6:** add review/approval flow and audit checks.

## Status note

- Fee receipt upload remains planning/draft only.
- SQL/storage draft exists and has been manually applied in dev.
- Fee receipt upload service + smoke test now exist (service-level only).
- Parent Fee Tracking upload UI wiring is now implemented (authenticated non-demo parent + fee record id required).
- Supervisor/HQ verification UI remains not implemented.
- Real files are still not used in this phase (fake tiny test blob only).

## 10) Next implementation prompt (readiness review for first vertical)

Copy-paste prompt:

---

Review storage readiness for **Fee Receipt Upload** only (no UI wiring yet, no real file uploads).

Constraints:

- Do not implement runtime uploads yet.
- Do not create buckets automatically in this phase.
- Do not use real data/files.
- Do not expose env values or commit `.env.local`.
- Do not use service role key in frontend.

Tasks:

1. Inspect schema and current write/read services for fee flow:
   - `supabase/sql/001_mvp_schema.sql`
   - current fee-related service files and RLS policies
2. Confirm whether `fee_records` metadata fields are sufficient for first upload:
   - `receipt_storage_bucket`, `receipt_file_path`, uploader/verifier timestamps and ids
3. Identify required storage policy additions for private `fee-receipts` bucket:
   - parent upload own-linked student only
   - branch supervisor verify own branch
   - HQ read/audit all
   - teacher blocked
4. Propose minimal SQL patch (plan or draft file) for:
   - metadata RLS adjustments (if needed)
   - storage object policies (if missing)
5. Define smoke test plan for upload authorization (still fake/non-production).

Run:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:read`
- `npm run test:supabase:auth`
- `npm run test:supabase:tasks:write`
- `npm run test:supabase:attendance:write`
- `npm run test:supabase:parent-updates:write`
- `npm run test:supabase:weekly-report:write`
- `npm run test:ai:edge:mock`

---

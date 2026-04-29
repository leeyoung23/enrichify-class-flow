# Fee Tracking receipt upload UI checkpoint

This checkpoint documents the **parent Fee Tracking receipt upload UI** wired to Supabase for authenticated **non-demo** parent users. It does not cover supervisor or HQ verification UI.

## 1) What was implemented

- **Read path:** `listFeeRecords` in `dataService.js` loads real `fee_records` from Supabase when demo role is off and Supabase is configured, mapping rows to the existing Fee Tracking card shape and exposing `fee_records.id` as the record `id` (with `data_source: 'supabase_fee_records'`).
- **Fee Tracking page:** Parents can access Fee Tracking; per-row file input, **Upload Receipt** (calls `uploadFeeReceipt`), loading and toast feedback, and query invalidation after success.
- **Optional view:** **View Uploaded Receipt** opens a **signed URL** from `getFeeReceiptSignedUrl` for rows that already have receipt metadata.
- **Guards:** Client-side MIME allowlist (PNG, JPEG, PDF; plain text allowed for testing) and **5MB** max size before upload.
- **No auto-verification:** Upload updates receipt metadata and verification state per service/RLS behavior; no UI action marks payment verified.

Supporting layers (already present from earlier milestones):

- `uploadFeeReceipt({ feeRecordId, file, fileName, contentType })` and `getFeeReceiptSignedUrl({ feeRecordId, expiresIn })` in `supabaseUploadService.js`.
- Smoke test `scripts/supabase-fee-receipt-upload-smoke-test.mjs` and npm script `test:supabase:fee-receipt:upload`.

## 2) Files changed (checkpoint scope)

| Area | File |
|------|------|
| Fee list read + id for upload | `src/services/dataService.js` |
| Parent upload UI + signed URL button | `src/pages/FeeTracking.jsx` |
| Upload + signed URL service | `src/services/supabaseUploadService.js` |
| Automated upload smoke test | `scripts/supabase-fee-receipt-upload-smoke-test.mjs` |
| Service/smoke checkpoint | `docs/fee-receipt-upload-smoke-test-checkpoint.md` |
| Storage foundation status | `docs/storage-upload-foundation-plan.md` |

This document: `docs/fee-tracking-receipt-upload-ui-checkpoint.md`.

## 3) Parent upload lifecycle

1. Parent selects a file on an eligible fee row (non-demo, Supabase session, real fee row id).
2. **File type/size guard** runs in the browser; invalid choices are rejected with a message (no upload).
3. **`uploadFeeReceipt`** uploads the file object to the private **`fee-receipts`** bucket (path convention enforced server-side via storage policies).
4. **`fee_records`** row is updated with receipt metadata (e.g. path, bucket, uploader, timestamps, submitted verification state) per existing service and RLS/trigger rules.
5. **Signed URL:** If a receipt path exists, parent can use **View Uploaded Receipt** to open a time-limited signed URL only (bucket stays private).
6. **No auto-verification:** Payment is not auto-marked paid; supervisor/HQ flows remain separate and unwired in UI.

## 4) How demoRole avoids uploads

- When a **demo role** is selected (`getSelectedDemoRole()`), the app stays on **demo/local** fee data and **does not** call `uploadFeeReceipt` or `getFeeReceiptSignedUrl` for real uploads/links.
- Upload attempts in that mode should surface a **demo/local-only** message and preserve existing demo behavior.

## 5) Security notes

- **Anon Supabase client + end-user JWT** only; no service role in the frontend.
- **Private** `fee-receipts` bucket; no reliance on public object URLs for receipts.
- **Signed URLs** for viewing uploaded objects where implemented.
- **Safe file guard** at UI (type + size); production-grade validation remains a future polish item.
- RLS and column-safe triggers (e.g. parent receipt fields) remain as defined in applied SQL; this checkpoint does not change policies.

## 6) Manual preview checklist

Use **fake or non-sensitive test files only** (e.g. tiny PNG/JPEG/PDF or test plain text if your policy allows it in dev).

- [ ] Log in as a **real parent** user (non-demo) against a dev Supabase project with fee receipt policies applied.
- [ ] Open **`/fee-tracking`**.
- [ ] Select a **small test file** within allowed types and under 5MB; upload; confirm success toast and list refresh.
- [ ] Confirm **`fee_records`** metadata and **`verification_status`** reflect **submitted / pending review** (not auto-verified paid).
- [ ] Use **View Uploaded Receipt** and confirm the file opens via **signed URL** only.
- [ ] Open **`/fee-tracking?demoRole=parent`** (or equivalent demo entry): confirm **no** Supabase upload runs and demo/local behavior only.

## 7) What remains

- **Supervisor** verification / rejection UI and actions.
- **HQ** verification / audit overview UI.
- **Production** file validation polish (stricter MIME sniffing, UX copy, server-aligned limits).
- **Storage cleanup / admin** tooling for orphaned objects or operational fixes.

## 8) Recommended next milestone

**Recommend: supervisor verification / rejection UI** as the next milestone.

**Why:** Parent upload and metadata submission are in place; the natural closure of the vertical is **staff review** on the same `fee_records` / storage objects (branch-scoped verify/reject, audit trail). Homework upload is a larger surface (class linkage, teacher review, future AI coupling) and is better sequenced after the fee receipt **review** loop is visible in-app.

**Alternative:** If product priority is **homework** first, treat **homework upload planning** as the next doc/scope milestone—but technically the fee receipt story is incomplete without supervisor UI.

---

_Last updated: Fee Tracking parent receipt upload UI checkpoint (documentation only)._

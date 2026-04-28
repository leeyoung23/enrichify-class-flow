# Fee receipt upload smoke test checkpoint

This checkpoint captures the service-level fee receipt upload milestone and smoke-test validation. It does not include Fee Tracking UI wiring.

## 1) What was implemented

- Added Supabase upload service methods for fee receipts:
  - `uploadFeeReceipt({ feeRecordId, file, fileName, contentType })`
  - `getFeeReceiptSignedUrl({ feeRecordId, expiresIn })`
- Added a dedicated smoke script for fee receipt upload lifecycle using fake tiny blob data only.
- Added npm script to run the smoke test.
- Updated planning/checkpoint docs to reflect service+smoke-test readiness and remaining UI work.

## 2) Files changed

- `src/services/supabaseUploadService.js`
- `scripts/supabase-fee-receipt-upload-smoke-test.mjs`
- `package.json`
- `docs/fee-receipt-upload-readiness-review.md`
- `docs/fee-receipt-upload-policy-application-checkpoint.md`
- `docs/storage-upload-foundation-plan.md`

## 3) Upload flow proven (smoke test)

- Parent uploads a **fake tiny blob** (`text/plain`) successfully.
- Object is stored in private `fee-receipts` bucket.
- `fee_records` metadata updates correctly (`receipt_file_path`, `receipt_storage_bucket`, `uploaded_by_profile_id`, `uploaded_at`, `verification_status=submitted`).
- Signed URL retrieval works for authorized access.
- Teacher upload path is blocked by RLS/policy scope.
- Branch supervisor cleanup and metadata revert path works in current test flow.

## 4) Chosen upload order

- Chosen order: **upload first, metadata second**.
- Why:
  - Applied `009` storage policy authorizes insertion using deterministic path + `fee_records` identity linkage.
  - This avoids requiring pre-populated `receipt_file_path` before object upload.
  - Service includes best-effort cleanup if metadata update fails after upload.

## 5) Security notes

- Uses Supabase anon client + authenticated JWT only.
- No service role key used in frontend/runtime service.
- `fee-receipts` bucket remains private.
- Access path uses signed URL generation (no public object exposure).
- Smoke test uses fake data and fake tiny blob only (no real receipts/files).

## 6) Manual preview/future checklist

- Future parent Fee Tracking upload UI action.
- Future branch supervisor verification/rejection UI action.
- Future HQ fee receipt overview/monitoring UI.

## 7) What remains

- Fee Tracking UI upload wiring.
- Verification/rejection UI workflow and status actions.
- Production-grade file validation.
- File size/type limits and stricter sanitization controls.
- Signed URL display/download handling in UI.

## 8) Recommended next milestone

Recommended next milestone: **Fee Tracking parent upload UI wiring**.

Why this next:

- Service and policy behavior are now validated by smoke tests.
- Parent upload is the first user-facing action that unlocks the rest of the review lifecycle.
- Supervisor/HQ verification UI should follow once parent upload interaction is stable in-app.

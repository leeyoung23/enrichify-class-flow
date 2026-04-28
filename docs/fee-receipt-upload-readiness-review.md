# Fee receipt upload readiness review

This review evaluates whether current schema, RLS drafts, and storage policy drafts are ready for the first fee-receipt upload vertical, without implementing runtime upload code.

## 1) Current `fee_records` receipt metadata coverage

`supabase/sql/001_mvp_schema.sql` currently includes all requested receipt metadata fields on `fee_records`:

- `receipt_file_path` - present
- `receipt_storage_bucket` - present (default `fee-receipts`)
- `uploaded_by_profile_id` - present
- `uploaded_at` - present
- `verified_by_profile_id` - present
- `verified_at` - present
- `verification_status` - present (text, default `not_uploaded`)
- `internal_note` - present

Assessment: **metadata coverage is sufficient for a first vertical using `fee_records` directly**.

## 2) Storage bucket readiness

From `supabase/sql/004_storage_buckets_and_policies.sql`:

- Bucket `fee-receipts` is planned/created in draft SQL.
- Bucket is private (`public = false`).
- Draft storage policies for `fee-receipts` exist for:
  - `select`
  - `insert`

Readiness note:

- Storage policy draft exists, but remains draft and unvalidated for full lifecycle.
- No explicit `update`/`delete` storage object policy for `fee-receipts` is currently defined in this draft.

## 3) RLS readiness (table + role expectations)

From `supabase/sql/003_rls_policies_draft.sql`:

- **HQ**: can read and modify all `fee_records` rows.
- **Branch Supervisor**: can read and modify own-branch `fee_records`.
- **Parent**: has a read-only summary policy (`fee_records_parent_linked_summary`) restricted to linked student and statuses `submitted`/`verified`.
- **Teacher**: blocked (no fee read/modify policy granting access).
- **Student**: conservative/blocked in current draft (no student fee access policy).

Readiness against requested upload expectations:

- Parent upload/write metadata: **not ready** (parent has no modify policy on `fee_records`).
- Parent view own linked status: **partially ready** (only specific statuses).
- Supervisor verify own branch: **ready at table RLS level**.
- HQ review all: **ready at table RLS level**.
- Teacher blocked: **ready**.

## 4) Gaps and risks

### Policy and workflow gaps

- Parent cannot currently update `fee_records` metadata fields (`receipt_file_path`, `uploaded_at`, etc.).
- Current storage `insert` policy for `fee-receipts` requires a matching `fee_records.receipt_file_path = storage.objects.name` row; without parent update rights this creates a practical upload flow blocker.
- No explicit storage `update/delete` policy for receipt replacement/cleanup lifecycle.

### Modeling and consistency gaps

- `verification_status` is plain text; should become enum later to avoid drift (`not_uploaded`, `submitted`, `verified`, `rejected`, etc.).
- Path naming convention is not standardized in SQL/docs yet.
- Signed URL flow is implied by private bucket design but not yet explicitly documented as the default retrieval mechanism.

### Design choice risk

- Parent writing directly to `fee_records` is simple, but may mix financial record lifecycle and receipt event history in one row.
- If audit/history depth is required later, a separate `payment_receipts` table may still be needed.

## 5) Recommended first implementation approach

Recommendation: **A. Use receipt fields directly on `fee_records` for first vertical**.

Why:

- Required metadata fields already exist.
- Fastest path to a safe first production vertical.
- Lower migration complexity than introducing a new table before first validated upload flow.
- Can be extended later: keep `fee_records` as latest-state pointer, add `payment_receipts` history table only when versioning/audit needs justify it.

## 6) Suggested file path convention

Suggested canonical key:

- `fee-receipts/{branch_id}/{student_id}/{fee_record_id}/{timestamp}-{safe_filename}`

Benefits:

- Natural tenant segmentation by branch/student.
- Easy object-to-row correlation.
- Improves policy testing and incident tracing.

## 7) Suggested service methods (later phase)

- `uploadFeeReceipt({ feeRecordId, file })`
  - uploads blob to `fee-receipts`
  - writes/updates receipt metadata on linked `fee_records` row
- `getFeeReceiptSignedUrl({ feeRecordId })`
  - returns short-lived signed URL for authorized viewer
- `verifyFeeReceipt({ feeRecordId, status, internalNote })`
  - supervisor/HQ verification action with audit timestamps/profile linkage

## 8) Smoke test plan (later phase)

Planned fake-data test lifecycle:

1. Parent uploads fake small file/blob to allowed receipt path.
2. Receipt metadata is updated on target `fee_records` row.
3. Parent can read own linked metadata/status.
4. Teacher read/write is blocked.
5. Branch supervisor (own branch) can verify status.
6. HQ can read/verify across branches.
7. Optional cleanup: delete test object + revert metadata.

## 9) Recommended next step

Recommended next step: **create SQL + storage policy patch first**.

Reason:

- Current blockers are policy-level (parent upload metadata write and storage flow alignment), not UI-level.
- Service/runtime code should only be added after RLS/storage behavior is explicitly secured and testable.
- This keeps the first upload implementation safe and avoids rework.

## 10) Draft patch status

- Added draft/manual patch: `supabase/sql/009_fee_receipt_upload_policies.sql`.
- Scope of the draft patch:
  - parent row-scope update policy for linked-student fee receipt metadata flow
  - parent-safe field DB trigger guard for fee_records updates
  - explicit staff verification update policy (HQ + own-branch supervisor)
  - path-based private storage policies for `fee-receipts`
  - helper function for path authorization checks
- Still not implemented:
  - service upload method
  - UI wiring
  - real file uploads

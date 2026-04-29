# Fee receipt supervisor / HQ verification UI plan

UI planning with Phase 2 backend verification status update and Phase 3 verify/view wiring. Use fake test data and dev projects only for implementation and smoke tests.

Business workflow clarification:

- Receipt upload is an **exception path** for unresolved payment confirmation.
- Normal payment confirmation is an internal supervisor/HQ process.
- Invoice/e-invoice automation after payment confirmation is a separate future stream.

## 1) Current Fee Tracking behavior

As of the Fee Tracking receipt upload checkpoint:

- **Parent (authenticated, non-demo):** Can use `/parent-view` Fee Status card to select a file (type/size guard), call `uploadFeeReceipt`, refresh status after success, and use **View Uploaded Receipt** via `getFeeReceiptSignedUrl` (private `fee-receipts` bucket, signed URL only).
- **HQ admin / branch supervisor:** Can access the same Fee Tracking page and see fee rows from `listFeeRecords` (Supabase path when not in demo mode maps `fee_records` including receipt and verification-related columns).
- **View proof + verify:** In authenticated non-demo staff mode, Fee Tracking now supports:
  - **View Uploaded Proof** (signed URL via `getFeeReceiptSignedUrl`)
  - **Verify Payment** (calls `verifyFeeReceipt`)
  - loading + toast feedback + fee records refetch after success
- **Demo mode behavior preserved:** demo role does not call Supabase signed URL or verification writes; demo Mark as Paid remains local/demo behavior.
- **Teacher:** Fee Tracking access is not granted in the current page (`canAccess` is HQ, branch supervisor only). No receipt verification UI exists.
- **Verification / rejection:** **Verify** is now wired for staff (non-demo Supabase rows). **Reject** is intentionally not wired yet.

References: `src/pages/FeeTracking.jsx`, `src/services/dataService.js` (`listFeeRecords`, `markFeeRecordPaid`), `docs/fee-tracking-receipt-upload-ui-checkpoint.md`.

## 2) Target verification behavior

### HQ admin (staff-side Fee Tracking requirements)

- See **all branches** fee rows that are in a **staff-reviewable** state (e.g. `verification_status = submitted` / `under_review`, product decision).
- Open receipt via **signed URL** only (reuse `getFeeReceiptSignedUrl` or a thin wrapper with role checks in UI).
- **Mark verified:** set verification fields and optionally align `fee_records.status` / payment narrative (separate product decision; do not auto-verify payment without explicit rules).
- **Reject** with **internal note** (staff-visible; decide separately whether parents see a redacted “rejection reason”).
- See **audit fields:** `verified_by_profile_id`, `verified_at`, `uploaded_by_profile_id`, `uploaded_at`, `verification_status`, `internal_note`.
- Staff Fee Tracking must include:
  - **View Uploaded Receipt** (signed URL)
  - **Verify Payment**
  - **Reject / Request Resubmission**
  - **Internal note**
  - **Status tracking**

### Branch supervisor

- See **own branch only** submitted (or in-queue) receipts; RLS should enforce branch scope (see §3).
- Open signed receipt URL under same rules as HQ.
- **Verify** or **reject** only for rows whose `branch_id` matches the supervisor’s branch.

### Parent

- **Upload payment proof if requested** (already implemented for non-demo Supabase).
- **See status:** submitted → verified / rejected (and any intermediate state you define).
- **Cannot** verify or reject; no writes to staff-only columns from parent (DB trigger already restricts parent updates to receipt metadata; see `009`).

### Teacher

- **Blocked** from fee receipt verification and from receipt storage access per `009` design notes (`can_access_fee_receipt_path` excludes teacher by design; no teacher `fee_records` update policy in `009`).

## 3) Database / RLS readiness

### `fee_records` fields (MVP schema)

From `supabase/sql/001_mvp_schema.sql`:

| Field | Use for verification |
|--------|----------------------|
| `verification_status` | Lifecycle: e.g. `not_uploaded`, `submitted`, `under_review`, `verified`, `rejected` (normalize in app + docs; **text**, not enum yet). |
| `verified_by_profile_id` | Staff actor for audit. |
| `verified_at` | Timestamp for audit. |
| `internal_note` | Supervisor/HQ notes; especially important on **reject**. |
| `receipt_file_path` / `receipt_storage_bucket` | Link to private object; signed URL for view. |
| `uploaded_by_profile_id` / `uploaded_at` | Parent upload audit (already set by `uploadFeeReceipt`). |
| `status` (`fee_status`) | Payment row state (enum); **decouple** “receipt verified” vs “invoice paid” in product rules to avoid accidental overwrites. |

### `009` policies and triggers (`supabase/sql/009_fee_receipt_upload_policies.sql`)

- **`fee_records_modify_parent_receipt_upload`:** Parent may update linked-student rows; **trigger** `enforce_parent_fee_receipt_safe_update` blocks non-receipt columns and forces `verification_status = 'submitted'` and `uploaded_by_profile_id = auth.uid()`.
- **`fee_records_verify_staff_only`:** **Update** allowed for `is_hq_admin()` OR `is_branch_supervisor_for_branch(branch_id)` — aligns with supervisor/HQ verification writes.
- **Teachers:** Comment in patch: no teacher fee_records update policy; keep verification off teacher UI.
- **Storage:** `can_access_fee_receipt_path` allows HQ, branch supervisor (own branch), guardian for student; **not** teacher/student for receipts.
- **Gap to track:** Draft `003` includes broad `fee_records_modify_staff_only` **FOR ALL** in some environments; combined with `009`, behavior depends on **which policies are applied**. Implementation should validate in dev: staff updates allowed only on intended columns (see §8).

### Parent **SELECT** and “see rejected”

Draft `003` parent policy `fee_records_parent_linked_summary` allows select only when `verification_status in ('submitted', 'verified')`. If that policy is unchanged, parents may **not see rejected rows** at all. **Before** promising “parent sees rejected” in UI, either:

- extend parent SELECT to include `'rejected'` (and optionally a parent-safe summary message column in future), or  
- document that rejected state is staff-only until policy is updated.

This is a **readiness / product** item for Phase 2 or a small SQL follow-up—not part of this planning doc’s code changes.

## 4) Recommended first verification action

**Recommend implementing “mark receipt verified” first** (before reject-with-note in the same release if you want smallest blast radius).

**Why verify first:**

- **Single clear transition:** `submitted` → `verified` with `verified_by_profile_id`, `verified_at`, and optionally `verification_status` only; minimal UX (confirm + optional short note).
- **Lower operational risk than reject:** Reject implies **re-upload** path, storage object retention vs clear, parent messaging, and possibly `internal_note` validation—more branches to test.
- **RLS alignment:** Staff update policy already exists in `009`; happy-path verify proves end-to-end staff write + parent read refresh before adding rejection edge cases.

**Reject second:** Add required `internal_note`, confirm parent visibility rules, and smoke-test “supervisor wrong branch” + teacher blocked together with verify.

## 5) Service layer plan

Add methods to **`src/services/supabaseWriteService.js`** (same patterns as `updateAttendanceRecord`, etc.): **anon client + RLS only**, **never** service role in the browser.

Proposed signatures (return `{ data, error }` everywhere; catch exceptions and return `{ data: null, error: { message } }`):

```js
// Future
verifyFeeReceipt({ feeRecordId, internalNote? })
rejectFeeReceipt({ feeRecordId, internalNote })
```

**Contract sketch:**

- **Guards:** `isSupabaseConfigured()`, valid UUID `feeRecordId`, authenticated session (optional explicit `getUser()` check for clearer errors).
- **verifyFeeReceipt:** `update` on `fee_records` with only safe fields, e.g. `verification_status: 'verified'`, `verified_by_profile_id: auth.uid()`, `verified_at: now`, `updated_at: now`, optional `internal_note` if product allows verify note.
- **rejectFeeReceipt:** require non-empty trimmed `internalNote`; set `verification_status: 'rejected'`, same verifier audit fields, `internal_note` (append vs replace—pick one and document).
- **Do not** send wide spread updates; mirror “minimal columns” style used elsewhere in `supabaseWriteService.js`.
- **Payment `status`:** Only touch `fee_records.status` if product explicitly defines mapping (e.g. verified receipt → `pending_verification` vs `paid`). Default recommendation: **verification_status only** in Phase 2; payment status changes in a later explicit milestone.

**Idempotency / double-submit:** UI disables button while pending; optional server-side check “only from submitted/under_review” can be a follow-up (trigger or strict update filter).

## 6) UI plan (`src/pages/FeeTracking.jsx` — future phases)

- **Roles:** Show **Verify** / **Reject** only for `hq_admin` and `branch_supervisor`, only when `data_source === 'supabase_fee_records'` and not `demoRole` (no Supabase staff writes in demo).
- **Preconditions:** Row has `receipt_file_path` (or `receipt_uploaded`) and `verification_status` in staff-actionable states (e.g. `submitted`).
- **View receipt:** Reuse existing signed URL flow (`getFeeReceiptSignedUrl`); HQ/supervisor same as parent for “open in new tab”.
- **Reject UX:** Modal or inline textarea for **internal note** (required); confirm dialog to prevent mis-clicks.
- **Verify UX:** Primary button + optional short note if product wants it.
- **States:** Loading on mutation, success/error toasts, `invalidateQueries(['fee-records'])` on success.
- **Parent:** Read-only status badges / copy for `verification_status` once SELECT policy allows rejected visibility (§3).
- **Teacher:** No entry to this surface on Fee Tracking (keep blocked); do not add teacher receipt links.

## 7) Smoke test plan

**Future script:** `scripts/supabase-fee-receipt-verification-smoke-test.mjs`

**Scenarios (fake tiny files / existing seed row only):**

1. **Parent** uploads fake receipt (or use row already in `submitted` from seed) — already covered by `test:supabase:fee-receipt:upload`; extend or compose.
2. **Branch supervisor** (branch A) calls verify on a fee row in branch A → row shows `verified`, `verified_by_profile_id` set, parent read path sees updated status if policy allows.
3. **Parent** session: refetch `fee_records` and assert `verification_status === 'verified'` (and visibility).
4. **Teacher:** attempt verify update → **0 rows** or policy error (blocked).
5. **Branch supervisor** branch B: attempt verify on branch A row → **blocked** (RLS).
6. **HQ:** verify a row in any branch (if seed data spans branches).
7. **Reject path:** supervisor rejects with `internal_note`; assert parent visibility per updated SELECT policy.
8. **Revert / cleanup:** If tests mutate seed rows, restore original `verification_status`, verifier fields, and notes like existing upload smoke test supervisor cleanup pattern—**only** if safe and idempotent in dev.

Add npm script e.g. `test:supabase:fee-receipt:verify` when Phase 2 lands.

## 8) Risks

| Risk | Mitigation |
|------|------------|
| **Wrong branch verified** | RLS + UI only listing branch-scoped rows for supervisor; smoke test cross-branch denial. |
| **Receipt URL exposed to teacher** | Do not add teacher UI; confirm `fee_records` SELECT and storage `can_access_fee_receipt_path` remain teacher-blocked for receipts. |
| **Parent edits verification fields** | Already mitigated by parent trigger in `009`; keep parent service upload limited to receipt fields. |
| **Staff UPDATE too broad** | Service sends minimal columns; consider DB trigger “staff verification columns only” if `fee_records_modify_staff_only` still exists and overlaps. |
| **File cleanup on reject** | Product choice: keep object for audit vs clear `receipt_file_path` and allow re-upload; storage delete permissions are supervisor/HQ in `009`—coordinate UI copy and smoke cleanup. |
| **`verification_status` free text** | Normalize allowed values in service + UI; optional future enum migration per `009` comments. |
| **Parent cannot see `rejected`** | Fix parent SELECT policy before marketing “rejected” to parents (§3). |
| **`verified_by` display** | UI currently maps `verified_by_profile_id` to a raw id in cards; plan human-readable name via join or profile lookup later. |

## 9) Implementation sequence

| Phase | Deliverable |
|-------|-------------|
| **Phase 1** | This planning doc (`docs/fee-receipt-verification-ui-plan.md`). |
| **Phase 2** | `verifyFeeReceipt` / `rejectFeeReceipt` in `supabaseWriteService.js` + `scripts/supabase-fee-receipt-verification-smoke-test.mjs` + npm script; align parent SELECT if needed for rejected visibility. **Status: implemented.** |
| **Phase 3** | Wire **Verify** for HQ + branch supervisor on Fee Tracking (non-demo, Supabase rows only). **Status: implemented.** |
| **Phase 4** | Wire **Reject** with required internal note + confirmations. |
| **Phase 5** | Parent status polish (badges, copy, optional parent-visible rejection summary), `verified_by` display names, production validation. |

## 11) Phase 2 implementation checkpoint (service + smoke test)

Implemented in this phase:

- Added `verifyFeeReceipt({ feeRecordId, internalNote })` in `src/services/supabaseWriteService.js`.
- Added `rejectFeeReceipt({ feeRecordId, internalNote })` in `src/services/supabaseWriteService.js`.
- Added smoke test script `scripts/supabase-fee-receipt-verification-smoke-test.mjs`.
- Added npm command `test:supabase:fee-receipt:verify`.

Scope boundaries preserved:

- Parent receipt upload remains from `ParentView` using existing `uploadFeeReceipt(...)`.
- No service role usage in frontend/runtime service paths.
- Demo/local fallback and `demoRole` behavior unchanged.

## 12) Phase 3 implementation checkpoint (View Proof + Verify UI)

Implemented in this phase:

- Staff-side `FeeTracking` now shows **View Uploaded Proof** for receipt-uploaded rows.
- Button uses `getFeeReceiptSignedUrl({ feeRecordId })` and opens signed URL.
- Staff-side `FeeTracking` now shows **Verify Payment** for reviewable states (`submitted`, `under_review`, or pending verification status).
- Button calls `verifyFeeReceipt({ feeRecordId, internalNote })` with loading state, toast feedback, and records refetch on success.
- Non-demo + authenticated Supabase session + `supabase_fee_records` source are required before signed URL/verify calls.

Still intentionally not wired:

- **Reject / Request Resubmission** UI.
- Invoice/e-invoice automation.
- Parent upload remains in `ParentView` (not staff Fee Tracking).

## 10) Next implementation prompt (Phase 2: service + smoke test only)

Copy-paste:

---

**Fee receipt verification — Phase 2 only: service methods + smoke test**

Implement `verifyFeeReceipt({ feeRecordId, internalNote })` and `rejectFeeReceipt({ feeRecordId, internalNote })` in `src/services/supabaseWriteService.js` using the **anon Supabase client + JWT** only. Return `{ data, error }` with safe try/catch. Do **not** use service role in the frontend.

Constraints:

- Do not change Fee Tracking UI yet.
- Do not upload real receipt files; smoke test uses **fake tiny** blob or existing dev seed rows only.
- Do not call AI APIs.
- Do not expose env values or commit `.env.local`.
- Preserve `demoRole` and demo/local fallback behavior (no Supabase verification writes when demo is active).

Tasks:

1. Inspect `supabase/sql/009_fee_receipt_upload_policies.sql` and existing `fee_records` RLS in applied drafts; document which columns staff may update.
2. Implement `verifyFeeReceipt` and `rejectFeeReceipt` with **minimal column** updates; reject requires non-empty `internalNote`.
3. Add `scripts/supabase-fee-receipt-verification-smoke-test.mjs`: parent submit (or use existing submitted row), branch supervisor verifies own branch, HQ verifies another branch if seed allows, teacher blocked, cross-branch supervisor blocked; revert seed row if safe.
4. Add `package.json` script `test:supabase:fee-receipt:verify`.
5. If parent must see `rejected` rows, add a **small SQL plan or patch** note in a doc comment—do not broaden scope beyond verification writes unless required for smoke assertions.

Run: `npm run build`, `npm run lint`, `npm run typecheck`, existing Supabase smoke tests including `npm run test:supabase:fee-receipt:upload`, and the new verification smoke test.

Commit message suggestion: `Add fee receipt verification write service and smoke test`

---

## References inspected

- `src/pages/FeeTracking.jsx`
- `src/services/dataService.js`
- `src/services/supabaseUploadService.js`
- `src/services/supabaseWriteService.js`
- `supabase/sql/009_fee_receipt_upload_policies.sql`
- `supabase/sql/001_mvp_schema.sql` (fee_records)
- `supabase/sql/003_rls_policies_draft.sql` (fee_records select/update policies)
- `docs/fee-tracking-receipt-upload-ui-checkpoint.md`
- `docs/storage-upload-foundation-plan.md`

# Fee Tracking receipt verification/rejection UI checkpoint

This checkpoint captures the implemented staff-side receipt verification and rejection workflow for Fee Tracking.

Scope note:

- Documentation checkpoint only in this step.
- No app UI/runtime/service/SQL changes are introduced by this document.

## 1) What was implemented

- Parent upload remains reachable from `ParentView`.
- `/fee-tracking` remains the staff/HQ/supervisor review route.
- **View Uploaded Proof** is wired.
- **Verify Payment** is wired.
- **Reject / Request Resubmission** is wired.
- `rejectFeeReceipt({ feeRecordId, internalNote })` exists and is used for rejection writes.
- `demoRole` remains local/demo only.
- Automated office request/email is not wired.
- Invoice/e-invoice automation is not wired.

## 2) Files changed

- `src/pages/FeeTracking.jsx`
- `docs/fee-receipt-verification-ui-plan.md`
- `src/services/supabaseWriteService.js`
- `src/services/supabaseUploadService.js`
- `scripts/supabase-fee-receipt-verification-smoke-test.mjs`

## 3) Completed staff-side lifecycle

1. Parent submits payment proof from `ParentView`.
2. Staff opens proof through a signed URL.
3. Staff verifies payment from `FeeTracking`.
4. Staff rejects/requests resubmission with an internal note when proof is invalid or incomplete.

## 4) How Reject / Request Resubmission works

- Action is available to staff review roles on reviewable uploaded rows.
- Staff must enter an internal note/reason before submit.
- UI calls `rejectFeeReceipt({ feeRecordId, internalNote })`.
- On success, status transitions to rejected/resubmission-requested state and fee records are refetched.
- Flow keeps note internal for staff operations (no automated parent message wiring yet).

## 5) How demoRole avoids Supabase writes

- Demo/local mode keeps fallback behavior and does not execute Supabase verification/rejection writes.
- `demoRole` paths remain local/demo only.
- This preserves safe preview behavior without touching live Supabase data.

## 6) Security notes

- Uses Supabase anon client + authenticated JWT only.
- No service role key in frontend/runtime paths.
- Receipt storage bucket is private.
- Receipt access is signed URL only.
- Branch supervisor actions are own-branch scoped by RLS.
- Teacher role is blocked from verification/rejection actions.

## 7) Manual preview checklist

Use fake/safe test data and files only.

1. Log in as parent.
2. Upload fake/safe payment proof from `/parent-view`.
3. Log in as branch supervisor or HQ.
4. Open `/fee-tracking`.
5. Click **View Uploaded Proof**.
6. Click **Verify Payment**.
7. Test another row with **Reject / Request Resubmission**.

## 8) What remains

- Automated email/request to parent after rejection.
- Invoice/e-invoice automation after internally confirmed payment.
- Parent rejected-status UX/copy polish.
- Mobile QA pass.

## 9) Recommended next milestone

Recommended next milestone: **mobile-first QA checkpoint**.

Reason:

- The full staff-side lifecycle is now wired (view proof, verify, reject/resubmission request), so the highest-value risk reduction is validating usability and correctness on mobile form factors where parents and some staff often operate.
- Mobile-first QA will quickly surface layout, action affordance, and status-copy issues before adding more backend scope, reducing rework and support churn.

---

Checkpoint status: receipt verification + rejection/request resubmission UI is wired for staff review flow; automation and polish items remain.

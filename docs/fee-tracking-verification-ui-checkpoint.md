# Fee Tracking verification UI checkpoint

This checkpoint records staff-side Fee Tracking verification UI wiring status for the receipt exception workflow.

Scope note:

- Documentation/checkpoint only in this step.
- No additional UI/runtime/service/SQL changes are introduced by this document.

## 1) What was implemented

- Parent payment proof submission remains reachable from `ParentView`.
- Staff-side `FeeTracking` now supports, for authenticated non-demo HQ/branch supervisor users:
  - **View Uploaded Proof** (signed URL open flow)
  - **Verify Payment** (verification write flow)
- Verification path refetches fee records and provides loading + toast feedback.
- Reject / Request Resubmission UI remains intentionally unwired.

## 2) Files changed

- `src/pages/FeeTracking.jsx`
- `docs/fee-receipt-verification-ui-plan.md`
- `src/services/supabaseUploadService.js`
- `src/services/supabaseWriteService.js`
- `scripts/supabase-fee-receipt-verification-smoke-test.mjs`

## 3) Staff verification lifecycle

Proven lifecycle (fake/dev data only):

1. Parent submits payment proof from `ParentView`.
2. HQ/branch supervisor opens uploaded proof using signed URL.
3. HQ/branch supervisor verifies payment in `FeeTracking`.
4. Parent can see verified status on re-check.

## 4) How demoRole avoids Supabase signed URL / verification writes

- In demo mode, `FeeTracking` does not call Supabase signed URL or verification write methods.
- Demo mode keeps local/demo behavior and displays local informational messages.
- Existing demo local action behavior (including demo Mark as Paid behavior) remains unchanged.

## 5) Security notes

- Uses anon Supabase client + authenticated JWT only.
- No service role key usage in frontend/runtime.
- Receipt objects remain in private bucket.
- Receipt viewing uses signed URLs only.
- Branch supervisor verification is constrained to own-branch scope by RLS.
- Teacher role remains blocked from fee verification actions.

## 6) Manual preview checklist

Use fake/safe test files only (for example tiny test PNG/JPEG/PDF/TXT in dev):

1. Log in as parent.
2. Upload fake/safe payment proof from `/parent-view`.
3. Log in as branch supervisor or HQ.
4. Open `/fee-tracking`.
5. Click **View Uploaded Proof**.
6. Click **Verify Payment**.
7. Log in as parent again.
8. Confirm status is `verified`.

## 7) What remains

- Reject / Request Resubmission UI.
- Automated office request/email flow to parent.
- Invoice/e-invoice automation after internally confirmed payment.
- Production file validation polish.
- Mobile QA pass.

## 8) Recommended next milestone

Recommended next: **Reject / Request Resubmission UI**.

Why:

- Verify flow is now wired and operational; reject is the most direct remaining gap to complete the exception lifecycle.
- It closes operational edge cases where uploaded proof is invalid or insufficient.
- Mobile QA remains important, but finishing lifecycle completeness first reduces workflow risk and rework.

---

Checkpoint status: staff View Proof + Verify is wired; reject UI and downstream automation remain pending.

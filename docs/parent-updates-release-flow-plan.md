# Parent Updates release/share flow plan

This document plans the Parent Updates **release/share** flow for **Quick Parent Comment only**, using Supabase anon client + RLS while preserving `demoRole` and demo/local fallback behavior.

Scope constraints for this plan:

- Planning only (no runtime/UI changes in this step).
- Do not wire Weekly Progress Report in this phase.
- Do not call AI APIs in this phase.
- Do not add uploads in this phase.
- Do not use service role key in frontend/runtime scripts.

---

## 1) Current state

- Quick Parent Comment draft save works for authenticated non-demo users via:
  - `updateParentCommentDraft({ commentId, message, status })`
- Parent/student cannot see draft comments under current RLS.
- Parent/student cannot write `parent_comments`.
- Release/share flow for Quick Parent Comment is still unwired.
- Weekly Progress Report write/release is still unwired.

---

## 2) Target release behavior

For authenticated non-demo teacher flow:

1. Teacher edits/saves a Quick Parent Comment draft.
2. Teacher clicks **Approve & Release to Parent**.
3. Status updates to the parent-visible status selected for this flow.
4. Parent can read the update under existing RLS when status is parent-visible.
5. No automatic email/WhatsApp sending is triggered.
6. No AI API call is involved.

---

## 3) Status decision

Current `communication_status` enum:

- `draft`
- `ready_for_review`
- `approved`
- `released`
- `shared`

Current `parent_comments` RLS select rule allows parent/student reads for:

- `approved`, `released`, `shared`

Recommended parent-visible status for Quick Parent Comment release:

- **`released`**

Why `released` is preferred:

1. It is semantically clear for parent visibility in this workflow.
2. It separates internal approval (`approved`) from external visibility (`released`).
3. It avoids overloading `shared` (which can remain optional for future channel-tracking semantics).
4. It remains fully compatible with current parent/student RLS predicates.

---

## 4) Service layer plan

Options:

- Reuse existing method:
  - `updateParentCommentDraft({ commentId, message, status: 'released' })`
- Add clearer wrapper:
  - `releaseParentComment({ commentId, message })`

Recommended strategy:

- **Add `releaseParentComment({ commentId, message })` as a wrapper** that internally uses the same safe update rules.

Why wrapper is better:

1. Improves intent clarity at callsites (release action vs draft action).
2. Reduces accidental wrong-status usage in UI handlers.
3. Keeps one place to enforce release-specific validations later (e.g., non-empty final teacher message).
4. Preserves existing `updateParentCommentDraft` for draft lifecycle actions.

Release wrapper should:

- use anon Supabase client + RLS only
- update only safe fields (`comment_text`, `status`, `updated_at`)
- force `status: 'released'` (or configurable only if required later)
- return predictable `{ data, error }`
- catch exceptions safely

---

## 5) Smoke test plan

Future script intent (can extend current parent updates write smoke test or add dedicated release script):

1. Sign in as teacher.
2. Set target comment to `draft` and verify teacher can read it.
3. Sign in as parent and verify parent cannot read draft.
4. Sign in as teacher and update status to `released` (or chosen parent-visible status).
5. Sign in as parent and verify parent can now read the released row.
6. Verify parent cannot write.
7. Optionally verify student cannot write.
8. Revert original text/status for repeatability.
9. Use anon key only; never service role key.

---

## 6) UI wiring plan (future phase)

- Keep `demoRole` first-priority local/demo only behavior.
- For authenticated non-demo teacher, wire Quick Comment **Approve & Release to Parent** button to Supabase release method.
- Add loading state for release action.
- Show success/error toast messages.
- Invalidate/refetch Parent Updates list after release action.
- Parent view/list refresh can be verified in later parent-flow step.

---

## 7) Risks

1. Draft exposure risk if wrong status is written too early.
2. Wrong-status risk (`approved` vs `released` vs `shared`) causing lifecycle confusion.
3. Approval gate bypass risk if release is allowed without final teacher validation.
4. Scope leakage risk if parent sees updates for non-linked students.
5. Demo isolation risk if `demoRole` accidentally executes Supabase release write.
6. Domain-mixing risk if Quick Comment and Weekly Report logic share handlers prematurely.

---

## 8) Recommended implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** service wrapper + smoke test for Quick Parent Comment release.
  - **Status:** Implemented.
  - `src/services/supabaseWriteService.js` -> `releaseParentComment({ commentId, message })`
  - `scripts/supabase-parent-updates-write-smoke-test.mjs` now verifies draft -> released parent visibility lifecycle.
- **Phase 3:** wire Quick Comment release button in Parent Updates UI.
  - **Status:** Implemented for Quick Parent Comment only.
  - Authenticated non-demo release action now uses `releaseParentComment({ commentId, message })` when the selected record is Supabase-backed.
  - `demoRole` remains local/demo only and does not call Supabase release writes.
- **Phase 4:** parent-view verification flow.
- **Phase 5:** Weekly Progress Report write/release later.

---

## 9) Next implementation prompt (Phase 2 only)

Copy-paste prompt:

---

Implement Parent Updates **Quick Parent Comment release** foundation only (service wrapper + smoke test), no UI wiring yet.

Constraints:

- Do not change Parent Updates UI behavior yet.
- Keep `demoRole` and demo/local fallback unchanged.
- Use Supabase anon client + RLS only.
- Never use service role key in frontend code/scripts.
- Use fake seed users only.
- Do not wire Weekly Progress Report in this phase.
- Do not add AI API calls.

Tasks:

1. Add method in `src/services/supabaseWriteService.js`:
   - `releaseParentComment({ commentId, message })`
   - Validate required inputs.
   - Update only safe fields in `parent_comments`:
     - `comment_text`
     - `status` (set to `released`)
     - `updated_at`
   - Return structured `{ data, error }` with safe exception handling.

2. Add release smoke test script (or extend current parent-updates write smoke test):
   - Teacher sets comment to draft and verifies.
   - Parent cannot read draft.
   - Teacher sets comment to released via release wrapper.
   - Parent can read released row.
   - Parent cannot write.
   - Student cannot write (optional but recommended).
   - Revert modified row to original text/status.

3. Add npm script:
   - `test:supabase:parent-updates:release`

4. Run:
   - `npm run build`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:supabase:read`
   - `npm run test:supabase:auth`
   - `npm run test:supabase:tasks:write`
   - `npm run test:supabase:attendance:write`
   - `npm run test:supabase:parent-updates:write`
   - `npm run test:supabase:parent-updates:release`

Do not wire runtime release button behavior in this phase.

---

*Document type: planning only; no runtime behavior changes are introduced by this file.*

## Implementation status snapshot

- Release service wrapper implemented:
  - `releaseParentComment({ commentId, message })`
  - uses anon Supabase client + RLS only
  - updates safe fields only (`comment_text`, `status='released'`, `updated_at`)
  - returns predictable `{ data, error }` with safe exception handling
- Smoke lifecycle coverage implemented:
  - teacher sets draft, parent cannot see draft
  - teacher releases, parent can see released row
  - parent/student cannot write
  - teacher revert step restores original row for repeatability
- UI wiring still intentionally not done:
  - release button runtime wiring is now implemented for Quick Parent Comment only
  - Weekly Progress Report runtime wiring remains pending
  - AI remains demo/local only

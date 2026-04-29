# Class Memories approval/release UI plan

Planning-only document for Class Memories approval/release workflow before implementation.

Scope guardrails for this step:

- No app UI changes.
- No runtime approval code changes.
- No Supabase SQL changes.
- No storage policy changes.
- No real photos/videos/files.
- No real student/parent/teacher/school/payment/homework/media data.
- No AI API usage.
- No service role key in frontend.
- `demoRole` and demo/local fallback remain unchanged.

---

## 1) Current state

Current implementation status:

- Teacher can submit a Memory for review from `ParentUpdates`.
- Upload path uses `uploadClassMemory(...)` with metadata-first + private object upload.
- Submitted Memory row is stored with `visibility_status = 'submitted'`.
- Submitted Memory row keeps `visible_to_parents = false`.
- Parent/student access to draft/submitted Memories remains blocked by RLS/storage policy.
- Approval/release behavior is not implemented yet.

---

## 2) Target approval/release behavior

### HQ

- View all submitted Memories across branches.
- Open/view Memory media via signed URL.
- Approve and release Memory to parent visibility.
- Reject Memory with reason.
- Hide previously approved Memory when needed (later step).

### Branch Supervisor

- View submitted Memories in own branch scope.
- Open Memory media via signed URL.
- Approve/reject Memories in own branch scope.

### Teacher

- See own submitted/rejected status later (if enabled in UI).
- Cannot approve/release directly unless policy changes later.

### Parent

- Can only see approved + parent-visible Memories in later parent UI phase.
- Cannot see draft/submitted/rejected/hidden records.

---

## 3) Service method plan (write path)

Add future write methods using anon client + RLS only (no service role):

- `approveClassMemory({ memoryId })`
- `rejectClassMemory({ memoryId, reason })`
- `hideClassMemory({ memoryId, reason })` (later phase)

All methods should:

- Validate required inputs (`memoryId` UUID, `reason` non-empty when required).
- Require authenticated user via anon client session.
- Update only safe lifecycle fields.
- Return `{ data, error }`.

### Approve field updates

- `visibility_status = 'approved'`
- `visible_to_parents = true`
- `approved_by_profile_id = auth.uid()`
- `approved_at = now()`
- `rejected_reason = null` (clear stale reject reason)
- `hidden_at = null`
- `updated_at = now()`

### Reject field updates

- `visibility_status = 'rejected'`
- `visible_to_parents = false`
- `rejected_reason = reason`
- `approved_by_profile_id = null` (for clean rejected state)
- `approved_at = null`
- `hidden_at = null`
- `updated_at = now()`

### Hide field updates (later)

- `visibility_status = 'hidden'`
- `visible_to_parents = false`
- `hidden_at = now()`
- optional `rejected_reason = reason` (or a dedicated hidden reason field in future schema revision)
- `updated_at = now()`

---

## 4) Read method plan

Use existing methods where possible and add one review-focused list method.

### Existing reusable methods

- `getClassMemoryById(memoryId)` (already exists)
- `getClassMemorySignedUrl({ memoryId })` (already exists)
- `listClassMemories(...)` (already exists)

### Future review read method

- `listClassMemoriesForReview({ branchId, status })`

Recommended behavior:

- Default `status = 'submitted'` for review queue.
- If `branchId` provided, require UUID and apply filter.
- For HQ, allow all branches.
- For branch supervisor, rely on RLS to enforce own-branch scope.
- Return newest first and include review-relevant fields (title, caption, uploader, timestamps, status, reason flags).

---

## 5) UI placement recommendation

First implementation path: **add a role-gated Memories Review section inside `ParentUpdates`** for HQ/branch supervisor.

Why this first:

- `ParentUpdates` already hosts related communication/review workflows.
- Lower route/navigation overhead for first release.
- Faster path to validate review lifecycle before introducing another page.
- Can evolve to a dedicated `Memories Review` page later if list volume grows.

Future step:

- Split to dedicated `Memories Review` page when moderation volume/filtering needs become large.

---

## 6) UI design (minimal first release)

Minimal mobile-readable card-based review UI:

- Submitted Memories list (cards, not table-only).
- Per-card status badge (`submitted`, `approved`, `rejected`, `hidden`).
- Preview button that fetches signed URL and opens media.
- Primary action: **Approve & Release**.
- Secondary action: **Reject** with required reason input.
- Loading, success, and error states for preview/approve/reject actions.
- Responsive stacking for phone/tablet; no dense desktop-only table layout.

Out of scope for first approval UI:

- Parent latest/history rendering.
- Thumbnail pipeline and video-specific controls.
- Bulk moderation actions.

---

## 7) RLS/security expectations

Approval implementation must match current policy intent:

- HQ can review/manage all branch Memories.
- Branch supervisor can review/manage own branch Memories.
- Parent/student are blocked until `approved` + `visible_to_parents = true`.
- Teacher cannot approve/release in current policy model.
- Bucket remains private.
- Media access remains signed URL based.
- No public object URLs.
- No service role key in frontend paths.

---

## 8) Smoke test plan (future)

Add future script:

- `scripts/supabase-class-memories-approval-smoke-test.mjs`

Planned flow:

1. Teacher uploads fake submitted Memory.
2. Parent cannot read submitted Memory.
3. Branch supervisor approves submitted Memory in own scope.
4. Parent can read approved+visible Memory when linked scope allows.
5. Teacher/parent/student cannot approve.
6. Branch supervisor/HQ can reject within allowed scope.
7. Cleanup fake storage object + fake row.

Security assertions:

- Review mutations fail for unauthorized roles.
- Signed URL read follows approved/visible + scope constraints.
- No real media payloads used.

---

## 9) Implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** write methods + approval smoke test.
- **Phase 3:** approval/release UI.
- **Phase 4:** parent Latest Memory + History.
- **Phase 5:** hide/archive polish.

---

## 10) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Latest expected commit:
Add Class Memories approval release plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -10
- git status --short

Task:
Phase 2 only — implement Class Memories approval/release write methods and approval smoke test.

Constraints:
- Do not change app UI.
- Do not add approval/release UI yet.
- Do not add parent Latest Memory or Memories History UI yet.
- Do not change Supabase SQL.
- Do not change storage policies.
- Do not upload real photos/videos/files.
- Do not use real student/parent/teacher/school/payment/homework/media data.
- Do not call AI APIs.
- Do not expose env values or secrets.
- Do not use service role key in frontend.
- Keep demoRole/demo-local fallback behavior unchanged.

Implement:
1) In src/services/supabaseWriteService.js add:
   - approveClassMemory({ memoryId })
   - rejectClassMemory({ memoryId, reason })
   - (optional scaffold only) hideClassMemory({ memoryId, reason }) with clear "later phase" note
2) Methods must:
   - use anon client + RLS only
   - validate inputs
   - require authenticated user
   - update lifecycle fields safely
   - return { data, error }
3) Add smoke test script:
   - scripts/supabase-class-memories-approval-smoke-test.mjs
   Flow:
   - teacher uploads fake submitted Memory
   - parent cannot read submitted
   - branch supervisor approves
   - parent can read approved+visible if linked scope allows
   - unauthorized roles cannot approve
   - cleanup fake object + row
4) Add npm script:
   - test:supabase:class-memories:approval
5) Add/update checkpoint doc for Phase 2 results.

Validation efficiency:
- Before tests run: git diff --name-only
- Run only:
  - npm run test:supabase:class-memories:approval
- Do not run full build/lint/typecheck unless unrelated runtime files require it.

If all pass:
commit with message:
Add Class Memories approval write methods and smoke test

Report:
1. files changed
2. method behavior summary
3. smoke test coverage
4. validation run
5. commit hash
```

---

Checkpoint status: upload-to-review is implemented; approval/release behavior is planned and ready for Phase 2 write-path implementation plus smoke validation.

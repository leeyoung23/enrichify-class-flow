# Full product direction checkpoint

This checkpoint verifies that current implementation momentum still aligns with the intended platform direction before starting the next milestone.

Constraints respected in this checkpoint:

- Documentation/checkpoint only.
- No app UI changes.
- No runtime logic changes.
- No new services, SQL, or uploads added in this step.

## 1) Current overall status

What is already real and verified in the current code/docs set:

- **Supabase auth/login foundation:** Supabase auth state and app-user profile path are active, with demo role fallback preserved.
- **Role landing:** role-based access/landing behavior is present across staff and parent/student views.
- **Read-only Supabase data:** selected domains read from Supabase when configured (with demo fallback).
- **MyTasks real write:** teacher task completion writes to Supabase via RLS-safe write service.
- **Attendance real write:** attendance status/note writes persist to Supabase for authenticated non-demo users.
- **Parent Updates Quick Comment draft/release:** save draft and release lifecycle is wired to Supabase.
- **Weekly Progress Report draft/release:** weekly report save/release lifecycle is wired to Supabase.
- **AI parent comment mock/fallback layer:** AI draft path is implemented as mock/fallback via service + Edge Function scaffold; no real provider call.
- **Fee receipt/payment proof upload service + parent reachability:** upload service, signed URL read path, smoke test, and parent-facing entrypoint in `ParentView` are present for exception submission.
- **Fee receipt exception workflow clarified:** docs consistently confirm upload is exception-only, not normal payment flow.

## 2) Correct product direction check

Overall conclusion: **direction is still correct and coherent** with the intended platform vision.

- **Education centre operations portal:** strong progress via MyTasks, Attendance, fee tracking surface, and staff workflows.
- **Parent trust/communication portal:** parent view + parent updates/release lifecycle are materially aligned.
- **Teacher workflow system:** teacher-centered operational writes and communication workflow are active.
- **HQ/supervisor reporting system:** role-based staff surfaces exist; verification and cross-branch review are partially complete.
- **AI learning intelligence layer:** architecture is directionally correct (draft-only, approval-gated, backend-first) but still mock/fallback at runtime.
- **School/curriculum personalisation foundation:** architecture/data plans are clear; frontend onboarding and domain use are not yet wired.
- **Mobile-first parent/teacher UX:** parent/student pages already use card-first patterns, but mobile QA/polish remains incomplete.
- **Desktop-capable HQ/supervisor reporting:** staff pages are desktop-capable; deeper reporting/verification tooling is still in progress.

## 3) Fee/payment workflow correction (locked business logic)

Corrected logic to keep fixed going forward:

1. Normal payments are internally tracked and confirmed by supervisor/HQ.
2. Invoice/e-invoice is sent after payment confirmation (future automation track).
3. Parent receipt/payment proof upload is **exception-only**.
4. Upload is triggered only when office cannot confirm payment internally.
5. HQ/supervisor must later review uploaded proof and verify/reject.
6. Parent should see submitted/verified/rejected status (with policy/UI alignment for rejected visibility).

## 4) Current milestone map

### A. Done / working

- **Auth:** Supabase auth foundation and role-aware app identity path in place.
- **Supabase data reads:** core reads wired with fallback patterns.
- **Operational writes:** MyTasks write + Attendance write are operational.
- **Parent Updates / Weekly Reports:** draft and release lifecycles are implemented with smoke coverage.
- **Fee/payment proof:** upload service + smoke + parent portal submission path are implemented.
- **AI:** parent-comment mock/fallback + Edge Function scaffold exists (provider-free).

### B. Partially implemented

- **Storage/uploads:** fee receipt path is real; homework/memories/sales-kit storage flows are not fully wired.
- **Fee/payment proof review:** parent submit exists, but HQ/supervisor verify/reject UI + service completion is pending.
- **Mobile responsiveness / UX polish:** major routes are responsive-ish, but full mobile-first QA pass is not complete.

### C. Planned but not wired

- **Staff Time Clock:** roadmap exists; production backend/write flow not wired.
- **Memories:** parent demo placeholders exist; real backend/storage + moderation flow not wired.
- **School/curriculum onboarding:** architecture/sql foundation planned, but product UI onboarding flow not wired.
- **Real AI provider integration:** secure plan exists; runtime remains mock/fallback.

### D. Future / later

- **Homework:** real upload/teacher review/AI-linked production pipeline still future.
- **Sales Kit:** read path exists; full HQ authoring/upload lifecycle still future.
- **AI (advanced modules):** learning gap detection, recommendations, richer intelligence layer are later phases.

## 5) Remaining critical milestones before a strong internal prototype

Recommended priority order:

1. **Fee receipt verification service + smoke test**
2. **HQ/supervisor View Uploaded Proof + Verify/Reject UI**
3. **Staff Time Clock backend**
4. **Memories backend/upload**
5. **School/curriculum onboarding UI**
6. **Real AI provider integration (after mock/deployment safety controls)**
7. **Mobile-first QA polish**

## 6) Scope drift check and corrections

Items to keep strict:

- Parent upload must **not** look like normal payment flow.
- `/fee-tracking` should remain staff/HQ/supervisor review route.
- Parent upload belongs in `ParentView` / parent-facing portal.
- AI must remain **draft-only** with teacher approval gate.
- `demoRole` must not write to Supabase.
- Service role key must never be used in frontend.
- Uploads must remain private-bucket + signed URL based.

Current drift risk notes:

- Parent “rejected status visibility” depends on policy alignment; if parent select policy excludes `rejected`, product copy must not overpromise until fixed.
- Fee staff verification is documented/planned but not fully wired in runtime service/UI yet; avoid describing it as complete.

## 7) Mobile-first reminder

This remains a product requirement for every major checkpoint:

- Parents and teachers mainly use phones.
- HQ/supervisor may use laptop/desktop.
- Future UI should avoid wide-only table layouts.
- Prefer responsive cards/stacked sections for mobile.
- Test both mobile and desktop layouts for every major UI checkpoint.

## 8) Recommended immediate next step

**Recommendation: A. Continue with fee receipt verification service + smoke test.**

Why this is the best immediate step:

- It closes the highest-risk gap in the already-started fee exception workflow.
- Parent submission is already live at service/portal level; verification is the missing control point.
- It unlocks the next UI milestone (HQ/supervisor verify/reject surface) with lower rework risk.
- It improves compliance/confidence before expanding to broader modules (time clock, memories, real AI provider).

## 9) Next implementation prompt (copy-paste, do not implement now)

```text
Implement checkpoint: Fee receipt verification service + smoke test only.

Constraints:
- Do not change app UI in this step.
- Do not add new SQL in this step.
- Do not add new services beyond extending existing write/smoke-test files.
- Do not add uploads or use real files/data.
- Do not call AI APIs.
- Do not expose env values or commit .env.local.
- Do not use service role key in frontend.
- Preserve demoRole behavior (demo should not write to Supabase).

Tasks:
1) Extend `src/services/supabaseWriteService.js` with:
   - `verifyFeeReceipt({ feeRecordId, internalNote })`
   - `rejectFeeReceipt({ feeRecordId, internalNote })`
   Use anon Supabase client + authenticated JWT only, safe minimal field updates, and `{ data, error }` return contract.
2) Add/complete smoke test script:
   - `scripts/supabase-fee-receipt-verification-smoke-test.mjs`
   Validate at least: branch supervisor own-branch verify success, teacher verify blocked, cross-branch supervisor blocked (if seed allows), optional HQ verify path, and safe cleanup/revert.
3) Add npm script:
   - `test:supabase:fee-receipt:verify`
4) Update one checkpoint doc summarizing verification smoke outcomes and known limits.

Run:
- npm run build
- npm run lint
- npm run typecheck
- npm run test:supabase:read
- npm run test:supabase:auth
- npm run test:supabase:tasks:write
- npm run test:supabase:attendance:write
- npm run test:supabase:parent-updates:write
- npm run test:supabase:weekly-report:write
- npm run test:ai:edge:mock
- npm run test:supabase:fee-receipt:upload
- npm run test:supabase:fee-receipt:verify
```

---

Direction verdict: **continue current direction with tighter execution sequencing around fee verification closure, then staff review UI, then backend breadth expansion (time clock/memories/school-curriculum), and only then real AI provider rollout behind existing safety gates.**

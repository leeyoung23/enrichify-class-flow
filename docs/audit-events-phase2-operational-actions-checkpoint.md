# Audit Events Phase 2 Operational Actions Checkpoint

Date: 2026-05-04

## Scope

- `src/services/supabaseWriteService.js`
- `src/services/staffTimeClockService.js`
- `docs/audit-events-foundation-checkpoint.md`
- `docs/project-master-context-handoff.md`

## Actions added

- `student_attendance.updated`
  - source write: `updateAttendanceRecord(...)`
  - entity: `attendance_record`
- `staff_time_clock.clocked_in`
  - source write: `clockInStaff(...)`
  - entity: `staff_time_entry`
- `staff_time_clock.clocked_out`
  - source write: `clockOutStaff(...)`
  - entity: `staff_time_entry`
- `class_memory.released`
  - source write: `approveClassMemory(...)`
  - entity: `class_memory`
- `fee_payment_proof.verified`
  - source write: `verifyFeeReceipt(...)`
  - entity: `fee_record`
- `fee_payment_proof.rejected`
  - source write: `rejectFeeReceipt(...)`
  - entity: `fee_record`

## Metadata safety decisions

- Attendance metadata is limited to:
  - `status`, `noteProvided`, `sessionDate`.
- Staff time clock metadata is limited to:
  - `verificationStatus`, `statusSource`, `selfieCaptured` (clock-out only).
- Class memory metadata is limited to:
  - `visibilityStatus`, `visibleToParents`.
- Fee verification metadata is limited to:
  - `verificationStatus`, `decision`, `hasInternalNote`.

Explicitly excluded from audit metadata in this phase:

- raw GPS coordinates,
- selfie or proof file URLs/paths,
- full parent/staff comments or internal note text,
- raw receipt/proof payloads,
- secrets/tokens/provider raw bodies.

## Skipped actions and rationale

- `student_attendance.marked`
  - skipped because current stable Supabase write operation is update-based (`updateAttendanceRecord`), so `student_attendance.updated` is the accurate stable action type.
- `class_memory.shared_with_family`
  - skipped because memory parent visibility currently transitions through approve/release behavior (`approveClassMemory`), so `class_memory.released` aligns with existing workflow semantics.

## Non-blocking behavior

- All new audit writes are best-effort:
  - business write succeeds/fails independently,
  - audit failure emits dev warning only,
  - no user-facing operation is blocked by audit failure.

## Validation commands run

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:staff-time-clock`
- `npm run test:supabase:attendance:write`
- `npm run test:supabase:parent-updates:write`
- `npm run test:supabase:class-memories:approval`
- `npm run test:supabase:fee-receipt:verify`
- `npm run test:supabase:audit-events`

Observed results:

- Build/lint/typecheck: PASS
- Staff time clock smoke: PASS
- Attendance write smoke: PASS
- Parent updates write smoke: PASS
- Class memories approval smoke: completed with branch-supervisor warning outputs in this environment
- Fee receipt verify smoke: PASS for business flow; audit insert warning observed for branch-supervisor path (`audit_events` RLS denial) while main verification write stayed successful/non-blocking
- Audit events smoke: PASS

Manual QA follow-up recommended:

- verify branch-supervisor audit insertion behavior for fee verification in linked environment and confirm expected `profiles.role` vs audit insert policy compatibility.

## Branch-supervisor compatibility diagnosis + fix (2026-05-04)

Root cause identified:

- The failing path was fee audit writes where `recordAuditEvent(...)` was called without `branch_id`.
- `audit_events` supervisor read policy is branch-scoped (`branch_id is not null` + supervisor branch match).
- `recordAuditEvent` uses insert with returning (`.insert(...).select(...).maybeSingle()`), so when `branch_id` is null the inserted row is not selectable by supervisor and returns an RLS denial.
- This presents as `new row violates row-level security policy for table "audit_events"` in the non-blocking dev warning path.

Why this is policy-compatible (not a policy bug):

- Insert policy itself is actor-based (`actor_profile_id = auth.uid()` and role match).
- Supervisor failure was specifically tied to returning visibility under select policy when branch scope was omitted in payload.

Minimal safe fix applied (no SQL/RLS changes):

- `verifyFeeReceipt(...)` now selects `branch_id` from `fee_records` update result and passes it into `recordAuditEvent`.
- `rejectFeeReceipt(...)` now selects `branch_id` from `fee_records` update result and passes it into `recordAuditEvent`.

Safety boundaries preserved:

- no SQL/RLS widening,
- no parent/student access widening,
- no service-role use,
- no blocking behavior introduced,
- metadata remains minimal and non-sensitive.

## Class memories supervisor-warning diagnosis (2026-05-04)

Root cause:

- The class-memories approval smoke selected teacher-visible latest class without enforcing supervisor branch alignment.
- In linked fixture data, teacher-visible latest class branch can differ from `supervisor.demo@example.test` branch.
- Supervisor update lifecycle operations (`approveClassMemory`, `rejectClassMemory`, `hideClassMemory`) are branch-scoped by `class_memories_update_scope`; cross-branch rows are not updatable, producing null-row/blocked outcomes.

Smallest safe fix applied:

- Updated `scripts/supabase-class-memories-approval-smoke-test.mjs` fixture discovery:
  - resolve supervisor profile branch scope first,
  - constrain teacher class selection to that branch,
  - fail fast when selected class branch mismatches supervisor branch.

Why this fix is safe:

- no SQL/RLS changes,
- no production UI/service behavior changes,
- no parent/student visibility widening,
- only test fixture targeting was tightened for deterministic branch-supervisor policy validation.

## Next recommended milestone

- Add compact read/report tooling for authorized staff over `audit_events`, then run a targeted review of action naming consistency before broader operational coverage.

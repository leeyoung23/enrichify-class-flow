# Audit Events Foundation Checkpoint

Date: 2026-05-04

## Scope

- `supabase/sql/033_audit_events_foundation.sql`
- `src/services/supabaseWriteService.js`
- `scripts/supabase-audit-events-smoke-test.mjs`
- `package.json`

## What was added

### 1) SQL foundation

Added migration file:

- `supabase/sql/033_audit_events_foundation.sql`

Table:

- `public.audit_events`
  - `id uuid primary key default gen_random_uuid()`
  - `actor_profile_id uuid nullable`
  - `actor_role text nullable`
  - `action_type text not null`
  - `entity_type text not null`
  - `entity_id uuid nullable`
  - `branch_id uuid nullable`
  - `class_id uuid nullable`
  - `student_id uuid nullable`
  - `metadata jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`

Indexes:

- `created_at`
- `actor_profile_id`
- `action_type`
- `(entity_type, entity_id)`
- `branch_id`
- `student_id`

### 2) RLS posture (phase-1 conservative)

RLS enabled on `audit_events`.

Policies:

- Insert:
  - authenticated only,
  - `actor_profile_id = auth.uid()`,
  - `actor_role` must be null or match current profile role text.
- Select:
  - HQ admin can read all.
  - Branch supervisor can read branch-scoped rows (`branch_id` + branch helper check).
  - Teacher can read own actor events only.
  - Parent/student read is not granted in this phase.
- Delete:
  - HQ admin only (for support/cleanup/smoke maintenance).

No broad cross-role read policy was added.

### 3) Service helper

Added in `src/services/supabaseWriteService.js`:

- `recordAuditEvent({ actionType, entityType, entityId, branchId, classId, studentId, metadata })`

Safety behavior:

- Uses current Supabase JWT session only (no service-role path).
- Loads current actor profile role from `profiles`.
- Sanitizes metadata:
  - drops sensitive-looking keys (`token`, `secret`, `password`, `api_key`, `authorization`, `cookie`, `provider`, `prompt`, etc.),
  - limits key count and string lengths,
  - excludes nested object blobs by default in phase 1.
- Returns structured `{ data, error }`.
- If audit write fails in action paths, main flow remains non-blocking; dev-only safe warning is emitted.

### 4) Initial high-value action logging wired

Audit events were added to a narrow set of release/share paths:

- AI Parent Report release:
  - action: `ai_parent_report.released`
  - entity: `ai_parent_report`
- Homework feedback release to parent:
  - action: `homework_feedback.released_to_parent`
  - entity: `homework_feedback`
- Parent comment release/share to family:
  - action: `parent_comment.released`
  - entity: `parent_comment`

No broad “log everything” behavior was introduced in this phase.

## What is intentionally not logged (phase 1)

- Secrets/tokens/env values/credentials
- Raw Edge/provider payloads
- Raw AI prompts/completions
- Full private child narrative content
- Signed URLs or storage private paths

## Smoke coverage added

Added script:

- `scripts/supabase-audit-events-smoke-test.mjs`
- npm command: `npm run test:supabase:audit-events`

Checks:

- teacher can insert via helper and read own event
- metadata sanitization removes forbidden keys
- parent cannot read event
- HQ can read event (and cleanup delete if policy is active)

## Migration apply + verification checkpoint

Migration file applied on linked Supabase project:

- `supabase/sql/033_audit_events_foundation.sql`

Applied command used:

- `supabase db query --linked --file supabase/sql/033_audit_events_foundation.sql`

Post-apply smoke verification:

- `npm run test:supabase:audit-events` -> PASS
  - teacher inserted audit event,
  - teacher read own event,
  - metadata sanitization worked,
  - parent audit read blocked,
  - HQ admin audit read worked,
  - HQ cleanup deleted smoke event.

Regression smokes:

- `npm run test:supabase:ai-parent-reports` -> PASS
- `npm run test:supabase:parent-updates:write` -> PASS

## Safety boundaries preserved

- No service-role path in frontend code
- No parent audit read access
- Audit write remains non-blocking for primary flows
- Metadata is sanitized before write
- No tokens/secrets/raw provider bodies are logged
- No notification/email implementation
- No auto sign-out/session tracking implementation yet
- No AI provider/Edge behavior changes
- No ParentView visibility-rule changes
- No RLS loosening

## Next recommended milestone

- Expand audit coverage to additional high-value write actions (attendance write, memory release, fee verification decisions), then add lightweight authorized staff review/report tooling before any notification/email/session-tracking rollout.

## Audit phase 2 implementation checkpoint (2026-05-04)

Expanded audit coverage was added only in existing write functions with clear ownership and small/safe metadata:

- `student_attendance.updated`
  - source: `updateAttendanceRecord(...)`
  - entity: `attendance_record`
  - scope fields: `branch_id`, `class_id`, `student_id` when available
  - metadata: `status`, `noteProvided`, `sessionDate`
- `staff_time_clock.clocked_in`
  - source: `clockInStaff(...)`
  - entity: `staff_time_entry`
  - scope fields: `branch_id`
  - metadata: `verificationStatus`, `statusSource`
- `staff_time_clock.clocked_out`
  - source: `clockOutStaff(...)`
  - entity: `staff_time_entry`
  - scope fields: `branch_id`
  - metadata: `verificationStatus`, `statusSource`, `selfieCaptured`
- `class_memory.released`
  - source: `approveClassMemory(...)`
  - entity: `class_memory`
  - scope fields: `branch_id`, `class_id`, `student_id` when present
  - metadata: `visibilityStatus`, `visibleToParents`
- `fee_payment_proof.verified`
  - source: `verifyFeeReceipt(...)`
  - entity: `fee_record`
  - metadata: `verificationStatus`, `decision`, `hasInternalNote`
- `fee_payment_proof.rejected`
  - source: `rejectFeeReceipt(...)`
  - entity: `fee_record`
  - metadata: `verificationStatus`, `decision`, `hasInternalNote`

Skipped in this phase:

- `student_attendance.marked` (not added)
  - reason: current stable Supabase write path is `updateAttendanceRecord(...)`; action uses `student_attendance.updated` to avoid duplicate semantics.
- `class_memory.shared_with_family` (not added)
  - reason: parent-visible memory flow uses `approveClassMemory(...)` release semantics today; `class_memory.released` matches current lifecycle naming.

Safety posture confirmed for phase 2 wiring:

- audit writes are non-blocking (failure logs dev warning only),
- no frontend service-role usage,
- no SQL/RLS changes,
- no notification/email/session-tracking implementation,
- no raw file URLs, no GPS coordinates, no full comments/internal notes, no receipt payload bodies in metadata.

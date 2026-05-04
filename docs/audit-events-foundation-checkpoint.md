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

## Migration apply note

This checkpoint creates the migration file but does not assume auto-apply.

To apply manually on linked Supabase project:

- `supabase db query --linked --file supabase/sql/033_audit_events_foundation.sql`

## Safety boundaries preserved

- No notification/email implementation
- No auto sign-out/session tracking implementation yet
- No AI provider/Edge behavior changes
- No ParentView visibility-rule changes
- No RLS loosening
- No frontend service-role usage

## Next recommended milestone

- Expand audit coverage to additional high-value write actions (attendance write, memory release, fee verification decisions), then add lightweight read/report tooling for authorized staff.

# Session Revocation + Multi-Device Governance Plan (Phase 1E)

Date: 2026-05-05  
Type: planning-only checkpoint (no code/SQL/RLS/auth-config changes)

## 2026-05-05 implementation checkpoint addendum (Phase 1E Step 2 tiny runtime wiring)

Runtime wiring added (small, conservative integration):

- On successful real login, app now creates an `auth_sessions` row via `createAuthSession`.
- Current auth session id is stored client-side as non-sensitive marker:
  - `localStorage` when `keep signed in` is enabled
  - `sessionStorage` when `keep signed in` is disabled
- Storage key:
  - `enrichify_current_auth_session_id`
- No password/token/raw telemetry is stored in this marker.

Heartbeat behavior:

- `AppLayout` now sends heartbeat updates via `updateAuthSessionHeartbeat`.
- Heartbeat throttle:
  - minimum 5 minutes between writes
  - periodic check loop every 60s with due-check guard
- Demo mode remains excluded.

Sign-out/timeout status behavior:

- `signOutSupabasePrimary` now reads the current auth session marker before sign-out.
- For manual/normal sign-out reasons:
  - marks current row as `signed_out`.
- For inactivity timeout reason:
  - marks current row as `timed_out`.
- Current auth session marker is cleared during sign-out cleanup.
- This avoids double status conflict (`timed_out` then `signed_out`) by reason-based single update path.

Failure posture:

- auth_sessions create/heartbeat/status updates are non-blocking.
- Login/sign-out/timeout continue even if auth_sessions mutation fails.
- Dev warning only for login session-create failure.

Still intentionally out of scope:

- revoke UI
- logout-all-devices
- HQ dashboard flows
- any raw IP/full user-agent/fingerprint telemetry

## 2026-05-05 checkpoint addendum (043 applied + verified)

- Migration applied: `supabase/sql/043_auth_sessions_foundation.sql`
- Apply method: Supabase SQL Editor (manual apply to linked project)
- Post-apply smoke verification:
  - `npm run test:supabase:auth-sessions`
  - `npm run test:supabase:audit-events`
  - `npm run test:supabase:auth-lifecycle-audit`
- RLS behavior verified:
  - parent can create/read/update own auth session
  - parent cannot create session for another profile
  - student/teacher cannot read parent session
  - HQ can read and revoke session rows
  - delete remains blocked (no delete policy)
- Privacy boundaries reaffirmed:
  - no raw IP
  - no exact location/GPS
  - no full user-agent
  - no fingerprinting
  - no token/session token storage
- Runtime status (unchanged in this checkpoint):
  - `auth_sessions` foundation exists but is not yet wired into `Login`/`AppLayout` runtime flows
  - `audit_events` remains immutable history
  - `auth_sessions` remains the future current-state/revocation inventory
- Next recommended milestone:
  - Phase 1E Step 2 (tiny runtime wiring): create session row on login and mark `signed_out`/`timed_out` on existing sign-out/timeout paths.

## Scope and hard constraints

- Planning only.
- No app/runtime code changes.
- No SQL or RLS changes.
- No Supabase dashboard auth-setting changes.
- No service-role frontend usage.
- No email/Gmail/SMS/push work.
- No IP/device fingerprint collection in this phase.
- No changes to existing timeout behavior (Phase 1C remains as-is).

## Current state (what exists now)

1. Supabase-primary sign-out is active in real mode (`signOutSupabasePrimary`).
2. Remember-me UI exists (`Keep me signed in on this device`) with non-sensitive local preference storage.
3. App-level enforcement exists via browser markers + role-based inactivity timeout.
4. Auth lifecycle audit events exist via `audit_events`:
   - `user.login`
   - `user.logout`
   - `user.session_timeout`
   - `user.remember_me_enabled`
   - `user.remember_me_disabled`
5. Runtime auth lifecycle writes use insert-only where appropriate (`includeResultRow: false`) to avoid noisy RLS return-row warnings.

## Planning answers (Part B)

1. **What session governance exists now?**
   - Supabase session authority, manual sign-out, app-level inactivity timeout, remember-me preference capture, and lifecycle audit events.

2. **What is still missing for multi-device/session revocation?**
   - Server-backed session inventory, per-session status/revoke controls, cross-device revoke orchestration, and admin review/revoke workflow.

3. **Can client-only markers revoke sessions across devices?**
   - No. `localStorage`/`sessionStorage` markers are browser-local and cannot invalidate other devices or tabs with active refresh tokens.

4. **What requires server-backed session records?**
   - Sign-out-all-devices, HQ/supervisor session review and revoke, account-disable fan-out invalidation, and deterministic session lifecycle tracking.

5. **What should “Sign out from all devices” mean in future?**
   - Mark all active sessions (except optional current session) as revoked, trigger token/session invalidation for each, and force re-auth on next refresh/use.

6. **How should HQ disable/revoke a staff account in future?**
   - Two-step governance:
     - mark account inactive/disabled in profile/access-control model
     - revoke all active sessions linked to that profile with reason `account_disabled`
   - Emit lifecycle/audit events for accountability.

7. **How should a parent account be revoked if no longer linked to a child?**
   - On guardian unlink/deactivation event:
     - revoke active sessions tied to parent profile (or force reduced access mode if policy allows)
     - emit `user.parent_child_link_removed` + `user.session_revoked` audit entries
     - require fresh sign-in and re-evaluation of active links.

8. **What privacy-safe session metadata is acceptable in v1?**
   - `profile_id`, role snapshot, started/last_seen/signed_out/timed_out/revoked timestamps, remember-me flag, status, revoke reason, and optional user-provided safe device label.

9. **What metadata should wait for legal/privacy review?**
   - Any raw IP, precise location, full user-agent, fingerprinting identifiers, or derived tracking signals that increase identifiability.

10. **Use `audit_events` only, or add dedicated `auth_sessions`/`user_sessions` later?**
   - Use both:
     - keep `audit_events` for immutable event trail
     - add dedicated `auth_sessions` (later) for current state and operational revocation controls.

## Future schema concept (Part C, not implemented)

Proposed table: `public.auth_sessions` (or `public.user_sessions`)

Concept fields:

- `id uuid primary key`
- `profile_id uuid not null`
- `role text not null`
- `started_at timestamptz not null`
- `last_seen_at timestamptz null`
- `signed_out_at timestamptz null`
- `timed_out_at timestamptz null`
- `revoked_at timestamptz null`
- `revoked_by_profile_id uuid null`
- `revoke_reason text null`
- `remember_me_enabled boolean not null default false`
- `session_status text not null` (`active`, `signed_out`, `timed_out`, `revoked`)
- `safe_device_label text null`
- `user_agent_hash text null` (future-only, legal-reviewed)
- `ip_hash text null` (future-only, legal-reviewed)
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

V1 privacy boundary:

- no raw IP
- no exact location
- no full user-agent
- no GPS/device fingerprinting

## Future action taxonomy (Part D)

Planned lifecycle/audit actions:

- `user.session_revoked`
- `user.logout_all_devices`
- `user.account_disabled`
- `user.role_changed`
- `user.parent_child_link_removed`

Role/action intent:

- **Parent self**: view/revoke own sessions, logout-all-devices for own account.
- **Teacher**: own-session logout/revoke only.
- **Branch supervisor**: potential later phase branch-scoped staff session visibility/revoke (strictly scoped).
- **HQ**: revoke staff sessions and disable staff accounts.
- **System**: automatic timeout and policy-driven revocation on account inactive/role/link changes.

## Recommended implementation sequence (Part E)

1. Add SQL/RLS foundation for `auth_sessions` (append-safe status transitions, strict role scopes).
2. Write session row on successful login.
3. Update `last_seen_at` with throttling to avoid write amplification.
4. Mark `signed_out_at` / `timed_out_at` on existing logout/timeout paths.
5. Add staff/HQ read-only session review surfaces (or API helpers) with strict scope.
6. Add self-service revoke for own sessions.
7. Add HQ revoke controls for staff sessions.
8. Implement logout-all-devices flow.
9. Only after legal/compliance review, evaluate hashed IP/device metadata additions.

## Legal/compliance boundaries

- Legal/compliance review required before production rollout of cross-device revocation controls.
- Malaysia PDPA/privacy wording must be updated before any IP/device telemetry fields are enabled.
- Data minimization and retention windows must be defined before launch.

---

Phase 1E planning checkpoint complete. No runtime behavior, SQL, RLS, or auth settings were changed.

## 2026-05-05 implementation checkpoint addendum (Phase 1E Step 1 auth_sessions foundation)

Implemented conservative SQL/RLS foundation for server-backed auth session inventory:

- Added migration: `supabase/sql/043_auth_sessions_foundation.sql`
- Added table: `public.auth_sessions`
- Included fields (v1):
  - `id`, `profile_id`, `role`, `branch_id`
  - `remember_me_enabled`, `session_status`
  - `started_at`, `last_seen_at`, `signed_out_at`, `timed_out_at`
  - `revoked_at`, `revoked_by_profile_id`, `revoke_reason`
  - `safe_device_label`
  - `created_at`, `updated_at`
- Excluded by design:
  - raw IP
  - exact location/GPS
  - full user-agent
  - fingerprint/device fingerprint
  - password/token/session token data

RLS posture in v1:

- Insert: authenticated users can insert only own session rows (`profile_id = auth.uid()`), role aligned with `current_user_role()`, branch constrained to own branch/null/HQ.
- Select: own sessions + HQ all sessions.
- Update:
  - self session updates for heartbeat/sign-out/timeout state.
  - HQ revocation updates for `revoked` status and revocation fields.
- Delete: no delete policy (append/history-safe posture).
- Branch supervisor read/update is deferred in this step for conservative scoping.

Service helper foundation added (not wired into Login/AppLayout yet):

- Write helpers:
  - `createAuthSession`
  - `updateAuthSessionHeartbeat`
  - `markAuthSessionSignedOut`
  - `markAuthSessionTimedOut`
  - `revokeAuthSession` (HQ-only helper guard)
- Read helpers:
  - `listMyAuthSessions`
  - `listAuthSessionsForAdmin` (HQ-only helper guard)

Smoke foundation:

- Added `scripts/supabase-auth-sessions-smoke-test.mjs`
- Added npm script: `test:supabase:auth-sessions`
- Coverage goals:
  - parent self create/read/update
  - cross-profile create blocked
  - student/teacher cannot read parent session
  - HQ read + revoke
  - delete blocked
  - telemetry columns absent

Migration apply status:

- CLI apply attempt failed due linked DB credential/login role restriction (`SUPABASE_DB_PASSWORD` / forbidden login-role init).
- Expected next step: manually apply `supabase/sql/043_auth_sessions_foundation.sql` in Supabase SQL Editor.
- Until applied, `test:supabase:auth-sessions` will fail with missing table as expected.

Safety posture unchanged:

- `audit_events` remains immutable event history.
- `auth_sessions` is the future current-state/revocation table.
- No RLS weakening, no service-role frontend, no timeout behavior changes, and no session revocation UI in this milestone.

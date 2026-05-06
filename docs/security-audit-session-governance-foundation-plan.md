# Security, Audit & Session Governance Foundation Plan

Date: 2026-05-04  
Type: planning-only checkpoint (no code/SQL/auth/UI changes in this milestone)

## 2026-05-05 docs checkpoint addendum: Security Governance Milestone

- Session governance/security lane now has a docs-only milestone checkpoint for Phase 1A-1E.
- Confirmed implemented foundation set:
  - Supabase-primary sign-out
  - remember-me + timeout governance
  - auth lifecycle audit writes
  - `auth_sessions` SQL/RLS + runtime session lifecycle wiring
  - parent self session controls
  - HQ read/revoke staff session controls
- Confirmed boundaries remain intact:
  - no service-role frontend
  - no raw IP/full user-agent/fingerprint/GPS data fields
  - no logout-all-devices
  - no RLS weakening
  - no email/SMS/push expansion
- Consolidated milestone artifact:
  - `docs/session-governance-security-milestone-checkpoint.md`
- Recommendation:
  - move next into UAT/production-readiness/legal-policy lanes before additional session feature expansion.

## 2026-05-05 implementation checkpoint addendum: Phase 1E Step 3A active sessions visibility v1

- Added privacy-safe read-only active session visibility for parent self account:
  - component: `src/components/account/ActiveSessionsCard.jsx`
  - placement: `src/pages/ParentView.jsx` account area (near communication settings)
- Uses existing policy boundaries:
  - existing helper `listMyAuthSessions` (RLS self-scope)
  - no SQL or RLS mutation in this step
- Safe display set:
  - status, remember-me flag, started/last-seen timestamps, safe device label
  - current browser badge using locally stored current auth session marker
- Explicitly excluded from UI:
  - raw IP/exact location/full user-agent/fingerprint/token/password
  - revoke controls and logout-all-devices controls
- Debug posture:
  - internal ids are hidden by default
  - only truncated internal reference shown when debug query mode is enabled (`?debug=1`)

## 2026-05-05 implementation checkpoint addendum: Phase 1E Step 3B self end-session action v1

- Added own-account session termination control in parent-facing Active Sessions UI.
- Scope in v1:
  - only non-current sessions with `active` status can be ended
  - current browser row has no action button
  - non-active rows remain read-only
- Data/behavior safety:
  - end-session uses existing self-safe `signed_out` update path
  - no cross-user revocation path exposed
  - no SQL/RLS change required
- Audit posture:
  - non-blocking audit event written on self end-session action:
    - `action_type=user.session_revoked`
    - `entity_type=auth_session`
    - metadata includes safe reason/source only
  - audit write failure does not block auth session update
- Privacy boundaries unchanged:
  - no IP/location/full user-agent/fingerprint/token exposure
  - no timeout behavior changes

## 2026-05-05 implementation checkpoint addendum: Phase 1E Step 3C HQ read-only session review v1

- Implemented an HQ-only read-only operational review surface for session inventory.
- New route/page:
  - `/session-review`
  - `src/pages/SessionReview.jsx`
- Access scope:
  - HQ admin only in v1
  - branch supervisor review deferred (no access expansion in this step)
- Data source:
  - existing `listAuthSessionsForAdmin` helper
  - no SQL/RLS changes required
- Controls:
  - safe filters by status and role
  - no mutation controls (no revoke, no logout-all-devices)
- Data minimization:
  - only privacy-safe auth session fields rendered
  - internal IDs hidden by default; debug-only truncated refs supported

## 2026-05-05 implementation checkpoint addendum: Phase 1E Step 3D HQ revoke staff sessions v1

- Added HQ-only staff session revoke control on the `SessionReview` page.
- Safety scope:
  - revoke button only on active staff sessions (`teacher`, `branch_supervisor`)
  - hidden for parent/student sessions and non-active statuses
  - hidden for current HQ browser session
  - branch supervisor users still cannot revoke sessions
- RLS/security posture:
  - uses existing HQ revoke path from `043` (no policy expansion)
  - no SQL migration in this step
- Audit posture:
  - non-blocking audit event for HQ revoke writes safe metadata only:
    - reason `hq_revoked`
    - source `session_review`
    - target role snapshot
  - no IP/user-agent/fingerprint/token fields added

## 2026-05-05 implementation checkpoint addendum: Phase 1E Step 2 runtime session-state wiring

- Runtime session-state wiring is now active (small scope, no SQL/RLS changes):
  - create auth session row on successful real login
  - maintain current session id marker on client using remember-me-aware storage
  - send throttled heartbeat updates from app shell
  - mark session status as `signed_out` on manual sign-out
  - mark session status as `timed_out` on inactivity timeout
- Double-status conflict prevention:
  - sign-out helper now selects status mutation by reason (`session_timeout` => `timed_out`, otherwise `signed_out`).
- Failure posture:
  - auth_sessions runtime writes are non-blocking and do not break auth/session UX.
- Data minimization unchanged:
  - no raw IP/location/full user-agent/fingerprint/password/token fields added.
- Scope still deferred:
  - revoke UI
  - logout-all-devices
  - HQ review/revoke dashboard workflows

## 2026-05-05 checkpoint addendum: 043 auth_sessions applied verification

- Applied migration: `supabase/sql/043_auth_sessions_foundation.sql`.
- Apply path: manual Supabase SQL Editor execution on linked project.
- Verification smokes passed post-apply:
  - `npm run test:supabase:auth-sessions`
  - `npm run test:supabase:audit-events`
  - `npm run test:supabase:auth-lifecycle-audit`
- Verified RLS posture:
  - parent self session create/read/update works
  - cross-profile parent create blocked
  - student/teacher cannot read parent session rows
  - HQ can read/revoke session rows
  - delete remains blocked (no delete policy)
- Privacy/compliance boundaries reaffirmed:
  - no raw IP, exact location/GPS, full user-agent, fingerprinting, or token/session-token fields
  - legal/compliance review remains required before any telemetry expansion
- Architecture posture unchanged:
  - `audit_events` remains immutable audit timeline
  - `auth_sessions` is current-state/revocation inventory foundation
  - runtime login/timeout flows are not wired to auth_sessions yet in this checkpoint

## 2026-05-05 implementation checkpoint addendum: Phase 1E Step 1 auth_sessions SQL/RLS foundation

- Added migration: `supabase/sql/043_auth_sessions_foundation.sql`.
- Added table: `public.auth_sessions` as current-state session inventory foundation for future multi-device governance.
- Relationship to audit:
  - `audit_events` remains immutable event history.
  - `auth_sessions` is intended for mutable current session state and revocation control.

RLS posture (conservative v1):

- Insert: self only (`profile_id = auth.uid()`) with role/branch alignment guards.
- Select: self + HQ all sessions.
- Update: self heartbeat/sign-out/timeout; HQ revocation update path.
- Delete: none.
- Branch supervisor read/update: deferred in this step.

Data-minimization posture:

- Included only privacy-safe metadata/timestamps/revocation fields.
- Explicitly excluded:
  - raw IP
  - exact location/GPS
  - full user-agent
  - fingerprinting fields
  - password/token/session token values

Helper/test foundation (not runtime-wired yet):

- Added read/write helpers for auth session rows.
- Added smoke script `test:supabase:auth-sessions`.
- Login/AppLayout timeout/sign-out runtime behavior intentionally unchanged.

Apply/validation note:

- Linked CLI apply failed due DB credential/login-role restriction.
- Manual Supabase SQL Editor apply is required before auth-session smoke can fully pass.

## 2026-05-05 planning checkpoint addendum: Phase 1E session revocation + multi-device governance

- Objective for next lane: plan server-backed session revocation and multi-device control without changing current runtime behavior.
- Diagnosis outcome:
  - current governance is app-local (browser markers + timeout) and cannot revoke sessions across devices.
  - immutable `audit_events` is suitable for event trail, but insufficient as the sole source of current session state.
- Recommended architecture (future implementation):
  - keep `audit_events` for event history
  - add dedicated `auth_sessions`/`user_sessions` table for active session state + revoke workflows
- Planned future actions:
  - `user.session_revoked`
  - `user.logout_all_devices`
  - `user.account_disabled`
  - `user.role_changed`
  - `user.parent_child_link_removed`
- Privacy boundaries:
  - v1 session metadata should be minimal and non-sensitive.
  - defer `ip_hash` / `user_agent_hash` activation and any device telemetry until legal/compliance + privacy wording review.
- Detailed Phase 1E plan doc added:
  - `docs/session-revocation-multidevice-governance-plan.md`

## 2026-05-05 stability checkpoint addendum: logout audit warning diagnosis

- Diagnosed warning source: `recordAuthLifecycleAudit.user.logout` in runtime sign-out flow.
- Root cause:
  - audit helper wrote via `insert(...).select(...)`, which requires select visibility on inserted rows.
  - parent role intentionally lacks broad `audit_events` select policy, so write-with-return could emit RLS warning in logout contexts.
- Resolution approach:
  - no SQL/RLS policy changes and no auth behavior changes.
  - introduced write-only mode for auth lifecycle audit writes (`includeResultRow: false`) for login/logout/timeout runtime paths.
  - retained selectable mode for focused smoke/helper validation paths.
- Outcome:
  - warning removed from auth/audit smoke flows.
  - no auth/RLS weakening and no service-role usage.

## 2026-05-05 checkpoint addendum: Remember me / keep me signed in planning

This addendum records diagnosis and policy direction for trusted-device session persistence.

Scope remains planning-only:

- No auth runtime behavior changes in this step
- No Supabase Auth settings change
- No SQL/RLS changes
- No password storage changes

Current diagnosis highlights:

- Auth/session implementation is mixed:
  - primary login UX uses Supabase Auth (`src/pages/Login.jsx`, `src/services/supabaseAuthService.js`)
  - legacy Base44 paths remain (`src/services/authService.js`, `src/components/layout/Sidebar.jsx`, `src/lib/AuthContext.jsx`)
- Supabase client currently uses default createClient options (`src/services/supabaseClient.js`), so default session persistence behavior applies.
- No explicit inactivity timeout or session revoke governance found in app runtime paths.
- No dedicated auth session/device tracking model is implemented yet.

Remember-me UX recommendation (future implementation):

- Checkbox: `Keep me signed in on this device`
- Helper copy: `Use this only on a private device. You can sign out anytime.`
- Keep this separate from legal consent and policy acknowledgement checkboxes.

Role policy direction (future implementation):

- Parent: remember-me supported on private devices with longer trusted persistence than default session.
- Student: allowed with shorter duration.
- Teacher: shorter inactivity timeout; remember-me only with caution and shorter persistence.
- Branch supervisor/HQ admin: strictest timeout; remember-me disabled in v1 or very short duration only; future step-up re-auth for sensitive actions.

Risk notes:

- Adding remember-me before timeout/revoke/audit governance increases unattended/shared-device exposure.
- Mixed logout paths can lead to incomplete sign-out semantics.
- Session/device metadata collection requires legal/privacy wording review (including Malaysia PDPA attention) before rollout.

## 2026-05-05 Phase 1A implementation note: sign-out authority alignment

- Runtime fix shipped to reduce split sign-out risk:
  - Supabase is now primary sign-out authority in sidebar flow.
  - Base44 logout remains best-effort cleanup only (non-authoritative).
- Scope intentionally limited:
  - no remember-me UI
  - no inactivity timeout enforcement
  - no SQL/RLS/session-table changes
  - no Supabase auth setting changes
- Demo preview safety preserved:
  - URL `demoRole` flows remain preview-only and do not force real-session mutation when exiting demo via sidebar sign-out.

## 2026-05-05 Phase 1B implementation note: remember-me UX (safe, limited)

- Added login checkbox + helper copy in `src/pages/Login.jsx` for explicit user intent:
  - `Keep me signed in on this device`
  - `Use this only on a private device. You can sign out anytime.`
- Added non-sensitive preference key only: `enrichify_keep_signed_in`.
- No password storage and no token logging introduced.
- Current technical limit (intentional for safety):
  - session persistence policy is not dynamically switched per login yet because current Supabase singleton client uses default storage/persistence behavior.
  - unchecked state is currently preference capture, not full session-duration enforcement.
- Next security-governance work remains required:
  - inactivity timeout/session policy enforcement
  - session/audit model and revocation controls

## 2026-05-05 Phase 1C implementation note: app-level session enforcement v1

- Added app-level enforcement layer (no SQL/RLS/auth-dashboard change):
  - browser-session marker enforcement for unchecked remember-me
  - role-aware inactivity timeout sign-out in app runtime
- Session markers:
  - `enrichify_keep_signed_in` (UI preference)
  - `enrichify_session_started_at`
  - `enrichify_last_active_at`
  - `enrichify_active_browser_session`
- Inactivity defaults now active in app:
  - parent/student: 12h (checked), 2h (unchecked)
  - teacher: 2h
  - branch_supervisor/hq_admin: 1h
  - unknown role fallback: 1h
- Timeout action:
  - Supabase-primary sign-out
  - redirect to login with safe expiration message
- Manual sign-out continues to clear active session markers while retaining remember-me preference.
- Demo preview mode remains bypassed to avoid mutating real auth state from URL preview flows.

## 2026-05-05 Phase 1C QA checkpoint + Phase 1D prep

QA checkpoint summary:

- Core Phase 1C controls are present in runtime:
  - active browser-session marker set on sign-in and allowed real-mode load
  - marker/timestamps cleared on Supabase-primary sign-out
  - inactivity timeout sign-out path active and role-aware
- No SQL/RLS/auth-dashboard changes introduced in this phase.
- No password/token persistence introduced.

Known runtime limitation (documented, expected in v1):

- Unchecked remember-me relies on per-tab `sessionStorage`; new-tab behavior can sign out restored sessions conservatively.

Test hygiene note:

- `test:supabase:auth` is still blocked by pre-existing alias/import issue in smoke runtime (`@/lib` resolution from Base44 client path), not a Phase 1C regression.

Phase 1D recommended implementation direction:

- Build auth lifecycle audit foundation next.
- Prefer extending existing audit pipeline if feasible; otherwise add minimal dedicated session-event table in a later reviewed migration.
- Target events:
  - `user.login`
  - `user.logout`
  - `user.session_timeout`
  - `user.remember_me_enabled`
  - `user.remember_me_disabled`
  - `user.session_revoked` (future)
- Metadata scope must remain privacy-safe (role + remember_me + reason + timestamps only).
- Any IP/fingerprint/device telemetry remains deferred until legal/compliance review and privacy notice wording are approved.

## 2026-05-05 Phase 1D implementation note: auth lifecycle audit foundation

- Reused existing `audit_events` foundation; no new auth session table or SQL migration required in this phase.
- Added runtime helper `recordAuthLifecycleAudit` (writes through existing `recordAuditEvent` + metadata sanitization).
- Implemented event writes:
  - `user.login`
  - `user.logout`
  - `user.session_timeout`
  - `user.remember_me_enabled`
  - `user.remember_me_disabled`
- Entity type used for lifecycle events: `user_session` (`entity_id` remains null in v1).
- Metadata policy remains privacy-safe:
  - included: `role`, `rememberMeEnabled`, `reason`, `source`
  - excluded: password/token/raw IP/full user-agent/device fingerprint/child data
- Behavior posture:
  - audit writes are non-blocking
  - auth/session flows do not fail when audit insert fails
  - demoRole preview does not produce auth lifecycle audit writes
- Added focused smoke: `test:supabase:auth-lifecycle-audit`.

## Scope and constraints

This document defines the next production-hardening foundation after internal prototype validation for:

- AI Parent Reports + ParentView
- Homework + Parent Communication + My Tasks

Hard constraints for this checkpoint:

- No app/runtime code changes
- No SQL/RLS changes
- No Supabase/Auth config changes
- No Edge/provider/PDF/OCR work
- No notification/email sending implementation
- No UI changes

## Current baseline (from code/docs inspection)

- Session/auth posture is mixed but improving:
  - `AppLayout` uses Supabase app user when available, with fallback identity logic.
  - `authService` still supports `demoRole` and Base44 fallback path.
  - Supabase auth planning/checkpoints exist, including login hardening and return-url safety.
- Permission and route rules are role-based and default-deny for missing role in key paths.
- Read/write services consistently rely on Supabase anon + JWT and avoid frontend service-role usage.
- Notification/email remains planning-only; trigger matrix and SQL/RLS planning docs already exist.
- Staff Time Clock planning exists and emphasizes role-scope, audit, and privacy.

## Security goals for this foundation milestone

1. Tighten session governance and reduce unauthorized session risk.
2. Add auditable accountability across sensitive actions before automation expands.
3. Preserve child/family data boundaries under all role paths.
4. Standardize access lifecycle (onboarding, assignment, review, offboarding).
5. Build notification/email safety prerequisites before any delivery feature.

## 1) Session governance plan

### 1.1 Recommended session model

- Keep Supabase JWT session as primary runtime auth state for non-demo modes.
- Keep `demoRole` as explicit non-production preview mode; never security authority.
- Require explicit profile role resolution before privileged app shell access.

### 1.2 Inactivity and session duration recommendations

Recommended defaults (to be finalized with ops/compliance):

- `hq_admin`: idle timeout 15-20 min, absolute max session 8h
- `branch_supervisor`: idle timeout 20 min, absolute max session 8h
- `teacher`: idle timeout 30 min, absolute max session 8-10h
- `parent`: idle timeout 30-60 min, absolute max session 7 days (refresh-token governed)
- `student`: idle timeout 20-30 min, absolute max session 1 day

Risk level: **High** (staff), **Medium** (parent/student)

### 1.3 Concurrent sessions and device policy

- Staff accounts (`hq_admin`, `branch_supervisor`, `teacher`):
  - Prefer limited concurrent sessions (e.g., 1-2 active devices).
  - Enforce re-auth for risky actions (release flows, finance verification, access changes).
- Parent accounts:
  - Allow multi-device convenience, but track sessions and suspicious patterns.
- Shared-account policy:
  - Disallow shared staff credentials.
  - Require named user identity for all operational actions.

Risk level: **High** for shared staff usage, **Medium** for parent concurrent use

### 1.4 Session tracking table concept (future SQL)

Proposed conceptual table: `auth_sessions` (or equivalent)

Fields (planned):

- `id`
- `profile_id`
- `role_snapshot`
- `device_fingerprint_hash` (not raw fingerprint)
- `ip_hash` or coarse network metadata
- `user_agent_summary`
- `created_at`, `last_seen_at`, `revoked_at`
- `termination_reason` (logout, timeout, admin_revoke, suspicious_activity)

Policy goals:

- Self read for current user sessions
- Staff admin revoke rights by scoped policy
- No parent cross-account visibility

Risk level: **High** if absent in production; **Low** implementation complexity later

## 2) Audit logging foundation plan

### 2.1 Audit event model

Plan a foundation table: `audit_events` (append-only)

Required fields:

- `id`
- `occurred_at`
- `actor_profile_id`
- `actor_role_snapshot`
- `branch_id` (nullable)
- `class_id` (nullable)
- `student_id` (nullable)
- `entity_type` (attendance/report/homework/memory/payment/staff_time/etc.)
- `entity_id`
- `action_type`
- `session_id` (nullable until session tracking ships)
- `request_id` / `correlation_id`
- `before_summary` (safe/minimal)
- `after_summary` (safe/minimal)
- `source_surface` (web, edge worker, script)

Strict exclusions:

- No secrets
- No raw provider payloads
- No signed URLs/private storage paths
- No full sensitive child narrative blobs where summary is sufficient

Risk level: **High**

### 2.2 Priority action coverage (Phase 1 audit coverage)

Must-capture actions:

- Attendance marked/edited
- AI parent report generated
- AI parent report released
- Homework feedback released
- Parent report view event (safe read audit)
- Class memory uploaded/released
- Payment proof verified/rejected
- Staff clock in/out and correction approvals

Risk level: **High**

### 2.3 Audit retention and access

- Define retention bands by event category (operational vs security-sensitive).
- Restrict raw audit read access to scoped compliance/admin roles.
- Provide summarized operational views for supervisors without exposing cross-branch sensitive context.

Risk level: **Medium-High**

## 3) Data protection and privacy plan

### 3.1 Role/data boundary posture

- Parent: child-linked data only (linked guardian relationship)
- Teacher: assigned class/student data only
- Branch supervisor: branch-scoped data only
- HQ admin: cross-branch by approved policy

Risk level: **High**

### 3.2 Storage/media privacy controls

- Review bucket-level access patterns for photos/homework/receipts.
- Ensure signed URL issuance is short-lived, scoped, and audited.
- Prevent private storage path leakage in logs, notifications, and AI payloads.

Risk level: **High**

### 3.3 AI evidence classification and provider boundaries

Classify evidence into:

- Allowed summary metadata
- Restricted child-personal content
- Prohibited data for provider transfer

Never send to AI provider:

- raw payment proof images/docs
- parent contact details beyond required operational minimum
- private storage URLs/paths
- internal staff notes not required for generation objective
- credentials/tokens/system identifiers

Risk level: **High**

### 3.4 Consent and child/media implications

- Define explicit policy gates for child media usage in parent-visible and AI-adjacent contexts.
- Add consent status checks before any future expanded media automation.
- Include withdrawal/revocation handling pathway.

Risk level: **High**

## 4) Role onboarding and access review plan

### 4.1 Onboarding flows (policy-first)

- Staff invite flow:
  - invitation, role assignment, branch/class assignment, activation audit
- Parent linking flow:
  - verified linkage to child, no broad parent directory visibility
- Teacher assignment flow:
  - explicit class assignment records
- Supervisor assignment flow:
  - explicit branch scope record

Risk level: **High**

### 4.2 Access review cadence

- Monthly: branch-level supervisor access recertification
- Quarterly: HQ-level full access recertification
- Immediate: offboarding deactivation + session revoke

Risk level: **High**

### 4.3 Shared-account prevention

- Prohibit generic shared staff logins.
- Require identifiable profile-per-person usage for release/verification actions.
- Add anomaly review for concurrent usage signatures.

Risk level: **High**

## 5) Notification/email safety prerequisites (before implementation)

### 5.1 Foundation-first requirements

Before any email/notification automation:

1. Notification SQL/RLS model finalized and reviewed.
2. Audit event foundation in place for trigger and delivery accountability.
3. Recipient resolution safeguards validated against role/child linkage.
4. Suppression and boundary rules defined:
   - never on draft/unreleased states
   - never cross-family
   - never leak private URLs or internal notes
5. Delivery attempt logs and retry/failure taxonomy defined.

Risk level: **High**

### 5.2 Trigger safety gate examples

- Attendance arrival notification: only after confirmed attendance event + anti-duplicate guard.
- Report released notification: only after released/current-version state and valid guardian linkage.
- Homework feedback ready notification: only after explicit release/share state.

Risk level: **High**

## 6) Production/staging readiness plan

### 6.1 Environment separation

- Separate Supabase projects for dev/staging/prod.
- Strict secret separation per environment.
- Explicit rule: no production data in dev/staging fixtures.

Risk level: **High**

### 6.2 Migration discipline

- Numbered, reviewed migrations with rollback strategy.
- Staging apply + smoke gate before production apply.
- Migration ownership and approval checklist.

Risk level: **High**

### 6.3 Backup/recovery and monitoring

- Backup schedule and restore drill expectations.
- Runtime monitoring:
  - auth failures
  - RLS denials trend
  - suspicious access attempts
  - storage access anomalies
- AI/cost/rate-limit monitoring for provider-related paths (without expanding provider scope yet).

Risk level: **Medium-High**

### 6.4 UAT and evidence capture

- Security/UAT checklist with evidence artifacts:
  - role-boundary pass/fail captures
  - release-boundary checks
  - session timeout behavior
  - audit event emission verification

Risk level: **Medium**

## Recommended implementation sequence (no implementation in this checkpoint)

### Phase A (must do first)

1. Session governance policy baseline (timeouts, concurrency, shared-account policy)
2. Audit event schema + event taxonomy design
3. Access lifecycle policy (invite/link/assignment/review/offboarding)

### Phase B (before notification/email automation)

4. Notification SQL/RLS foundation finalization (already planned, not yet implemented)
5. Recipient/delivery logging model design and safety gate rules
6. Environment/migration/backup operational guardrails

### Phase C (after above, can begin implementation lanes)

7. Implement session tracking + revocation controls
8. Implement `audit_events` writes on high-risk actions
9. Implement notification persistence and in-app read path (email still optional)

### Phase D (can wait until production beta)

10. Advanced anomaly detection and behavioral risk scoring
11. Expanded channel strategy (SMS/WhatsApp/push)
12. Fine-grained consent automation and self-service preference center UX

## What must be done before notification/email automation

- Session governance policy and revocation model approved
- Audit event model approved
- Recipient-scope and release-gate policy approved
- Notification SQL/RLS reviewed
- Delivery logs/retry model approved

## What can wait until production beta

- Multi-channel expansion (SMS/WhatsApp/push)
- Advanced threat analytics
- Rich user-facing preference UX
- Non-critical operational digests

## Risk register (summary)

| Area | Risk level | Why |
|------|------------|-----|
| Session governance | High | Unauthorized persistence and shared-account misuse risk |
| Audit coverage | High | Limited forensic accountability without append-only audit trail |
| Parent/child data scope protection | High | Direct privacy and compliance exposure |
| Staff assignment/access lifecycle | High | Orphaned or excessive access risk |
| Notification/email trigger safety | High | Wrong-send and cross-family leakage risk |
| Environment separation and migration discipline | High | Data/environment contamination and release risk |
| Backup/recovery drills | Medium-High | Operational continuity and incident response risk |
| UAT evidence process | Medium | Slower compliance/readiness confidence if absent |

## Recommended next implementation milestone

**Milestone:** Session + Audit Foundation (implementation phase, scoped)

Proposed build scope for next lane (after this planning checkpoint is approved):

1. Implement session governance primitives (timeout/revoke policy support).
2. Implement `audit_events` foundation with high-risk action hooks.
3. Add smoke/QA checks for audit emission and role-boundary session behavior.

Out of scope for that milestone:

- Notification/email sending
- SQL/RLS policy broadening
- AI/provider/PDF/OCR changes
- Product UI redesign

---

Planning-only checkpoint complete.

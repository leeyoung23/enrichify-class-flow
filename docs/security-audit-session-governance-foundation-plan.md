# Security, Audit & Session Governance Foundation Plan

Date: 2026-05-04  
Type: planning-only checkpoint (no code/SQL/auth/UI changes in this milestone)

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

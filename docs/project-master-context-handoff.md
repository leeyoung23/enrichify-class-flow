# Project Master Context Handoff

## Checkpoint update (manual walkthrough execution guide docs-only — 2026-05-05)

- **New docs-only execution guide added:**
  - `docs/manual-walkthrough-execution-guide.md`
- **Audience/intent:**
  - beginner operator manual walkthrough for current validation-ready internal prototype.
- **Guide includes required sections:**
  - before starting
  - accounts/roles needed
  - flow A: HQ/staff setup
  - flow B: AI parent report
  - flow C: ParentView
  - flow D: homework
  - flow E: attendance
  - flow F: parent communication
  - flow G: fee/payment proof
  - flow H: security/RLS spot checks
  - screenshot checklist
  - pass/fail record format
  - stop conditions
  - after walkthrough actions
- **Operational guardrails captured:**
  - real mode preferred unless demoRole explicitly requested
  - do not expose secrets from `.env.local`
  - stop immediately on critical privacy/RLS regressions
- **No implementation changes in this checkpoint:**
  - no code/SQL/RLS changes
  - no new features
  - no session-governance expansion

## Checkpoint update (validation/UAT readiness checklist docs-only — 2026-05-05)

- **New docs-only artifact added:**
  - `docs/validation-uat-readiness-checklist.md`
- **Purpose:**
  - full manual validation/UAT walkthrough checklist covering staff/HQ, parent, teacher, security/RLS, notifications, and session governance.
- **Checklist includes required sections:**
  - pre-validation setup
  - staff/HQ walkthrough
  - parent walkthrough
  - teacher walkthrough
  - security/RLS checks
  - notification checks
  - session governance checks
  - known limitations
  - evidence capture checklist
  - validation decision status gates
- **Readiness guidance captured:**
  - internal validation can proceed
  - real parent pilot requires legal/compliance review
  - production readiness requires staging/prod split + monitoring/backup/runbook + policy pack
- **Recommended next milestone captured:**
  - manual walkthrough + screenshot evidence pass, then production readiness audit
- **No implementation changes in this checkpoint:**
  - no code/SQL/RLS changes
  - no new features
  - no session-governance expansion
  - no email/SMS/push expansion

## Checkpoint update (session governance security milestone docs-only — 2026-05-05)

- **Docs-only milestone checkpoint added:**
  - `docs/session-governance-security-milestone-checkpoint.md`
- **Milestone scope captured as implemented (Phase 1A-1E):**
  - Supabase-primary sign-out
  - remember-me login option
  - app-level timeout governance
  - auth lifecycle audit events
  - `auth_sessions` SQL/RLS foundation
  - runtime session row create/heartbeat/status tracking
  - parent own session visibility + self end-session
  - HQ session review + HQ revoke staff sessions
- **Current role capability summary included in checkpoint doc:**
  - parent/teacher/branch-supervisor/hq/student current session-governance boundaries
- **Known limitations recorded:**
  - conservative unchecked remember-me new-tab behavior
  - no server-forced all-device token invalidation
  - no logout-all-devices
  - no branch supervisor session review
  - no telemetry expansion pending legal/privacy review
  - no legal/compliance signoff yet for real parent rollout
- **Recommended next lanes captured:**
  - Option A: UAT readiness checklist
  - Option B: production readiness audit
  - Option C: product polish lane
  - Option D: legal/compliance policy pack preparation
- **No implementation changes in this checkpoint:**
  - no code/SQL/RLS changes
  - no new session features
  - no timeout behavior changes
  - no notification/email channel expansion

## Checkpoint update (HQ revoke staff sessions, Phase 1E Step 3D — 2026-05-05)

- **HQ revoke control added on Session Review:**
  - `src/pages/SessionReview.jsx` now shows `Revoke session` for active staff rows only.
  - uses confirmation copy: `Revoke this staff session? The user may need to sign in again on that browser.`
- **Roles in scope for revoke button:**
  - `teacher`
  - `branch_supervisor`
- **Revoke button hidden for:**
  - `parent`, `student`
  - `signed_out`, `timed_out`, `revoked` rows
  - current HQ browser session
  - non-HQ viewers
- **Helper/audit changes:**
  - `revokeAuthSession(...)` remains HQ-only and now writes non-blocking revoke audit metadata:
    - `action_type=user.session_revoked`
    - `entity_type=auth_session`
    - metadata includes `reason=hq_revoked`, `source=session_review`, `targetRole`
  - audit failure does not block successful revoke
- **Smoke updates (`scripts/supabase-auth-sessions-smoke-test.mjs`):**
  - HQ can revoke teacher session
  - revoked staff row remains visible to HQ query
  - parent cannot revoke another user session
  - teacher cannot revoke another user session
  - delete blocked + telemetry columns absent checks preserved
- **Safety boundaries preserved:**
  - no SQL/RLS policy changes
  - no branch supervisor revoke controls
  - no logout-all-devices
  - no timeout behavior change
  - no telemetry expansion (IP/full UA/fingerprint/GPS/token)
- **Next recommended milestone:** extend HQ controls cautiously to broader policy-reviewed revoke scopes (if approved), or move to logout-all-devices orchestration planning as a separate milestone.

## Checkpoint update (HQ read-only session review, Phase 1E Step 3C — 2026-05-05)

- **HQ-only review surface added:**
  - new page: `src/pages/SessionReview.jsx`
  - new route: `/session-review`
  - HQ sidebar item: `Session Review`
- **Access and scope:**
  - v1 access limited to `hq_admin` only
  - branch supervisor read access not added in this step
- **Data source:**
  - existing `listAuthSessionsForAdmin({ profileId, status, limit })`
  - no SQL/RLS changes required
- **Filters added:**
  - status filter (`all`, `active`, `signed_out`, `timed_out`, `revoked`)
  - role filter (`all`, `hq_admin`, `branch_supervisor`, `teacher`, `parent`, `student`)
- **Read-only behavior:**
  - no revoke controls on Session Review page
  - no logout-all-devices controls
  - no cross-user update buttons
- **Safe fields shown:**
  - role, status, remember-me, safe device label
  - started/last-seen/signed-out/timed-out/revoked timestamps
- **Sensitive fields excluded:**
  - no raw IP, full user-agent, fingerprint, location/GPS, password/token/session-token display
  - profile/session/branch ids hidden in normal mode; debug-only truncated refs (`?debug=1`)
- **Next recommended milestone:** Phase 1E Step 3D HQ revoke staff sessions (with strict scope and explicit revoke UX), while keeping logout-all-devices deferred.

## Checkpoint update (self end-session action v1, Phase 1E Step 3B — 2026-05-05)

- **Parent Active Sessions action added:**
  - `src/components/account/ActiveSessionsCard.jsx` now shows `End session` for own non-current rows with `active` status only.
  - current browser row keeps `Current browser` badge and has no action button in v1.
- **Helper added:**
  - `endOwnAuthSession({ sessionId, source })` in `src/services/supabaseWriteService.js`.
  - Uses existing self-safe `signed_out` update path (no self `revoked` mutation in this step).
- **Why signed_out in Step 3B:**
  - `043` trigger currently blocks self setting `session_status=revoked` and revoke fields.
  - chose smallest safe implementation without SQL/RLS mutation.
- **Audit behavior:**
  - non-blocking `recordAuditEvent` call on end-session:
    - `action_type=user.session_revoked`
    - `entity_type=auth_session`
    - `entity_id=sessionId`
    - metadata `{ reason: "self_ended", source: "active_sessions_card" }`
  - revoke/end-session still succeeds if audit write fails.
- **Smoke coverage updated:**
  - `scripts/supabase-auth-sessions-smoke-test.mjs` now checks:
    - parent can end own non-current session
    - parent cannot end another profile session
    - HQ revoke path still works
    - delete still blocked
    - telemetry columns still absent
- **Safety boundaries preserved:**
  - no logout-all-devices
  - no HQ revoke UI/staff dashboard UI
  - no cross-user self-end path
  - no SQL/RLS weakening
  - no raw IP/location/fingerprint/full user-agent/token display
- **Next recommended milestone:** Phase 1E Step 3C HQ read-only session review surface, then Step 3D HQ revoke staff sessions.

## Checkpoint update (active sessions visibility v1, Phase 1E Step 3A — 2026-05-05)

- **Parent UI added (read-only):**
  - `src/components/account/ActiveSessionsCard.jsx` created.
  - Wired into `src/pages/ParentView.jsx` near communication settings as **Account security**.
- **Data source:** existing `listMyAuthSessions` helper + existing `auth_sessions` RLS self visibility.
- **Current-session indicator:** row `id` compared against `enrichify_current_auth_session_id`.
- **Displayed fields (safe):**
  - session status (`active`, `signed_out`, `timed_out`, `revoked`)
  - remember-me on/off
  - started and last-seen timestamps
  - safe device label (`Current browser` + fallback safe label)
- **Privacy boundaries preserved:**
  - no raw IP, no location/GPS, no full user-agent, no fingerprint, no password/token/session-token display.
  - internal id hidden in normal mode; truncated ref only in debug mode (`?debug=1`).
- **Scope intentionally deferred:**
  - no revoke buttons
  - no logout-all-devices
  - no HQ/staff revoke UI in this step
  - no SQL/RLS changes
- **Recommended next milestone:** Phase 1E Step 3B self-revoke old sessions (parent/staff self scope), then Step 3C HQ read-only session review, then Step 3D HQ revoke staff sessions.

## Checkpoint update (session governance Phase 1E Step 2 runtime wiring — 2026-05-05)

- **Runtime integration added (tiny scope):**
  - create `auth_sessions` row after successful real login
  - store current auth session id marker by remember-me mode
  - heartbeat updates from app shell with minimum 5-minute write interval
  - mark `signed_out` on manual sign-out path
  - mark `timed_out` on inactivity timeout path
- **Session id marker storage:**
  - key: `enrichify_current_auth_session_id`
  - remember-me checked: localStorage
  - remember-me unchecked: sessionStorage
- **Conflict handling:** reason-based sign-out status mutation prevents timeout rows being overwritten as signed_out.
- **Failure posture:** auth_sessions create/heartbeat/status writes are non-blocking; auth UX still proceeds on errors.
- **Safety boundaries preserved:** no SQL/RLS changes, no revoke UI, no logout-all-devices flow, no raw IP/full user-agent/fingerprint/password/token storage.
- **Demo posture:** demoRole preview remains excluded from this runtime auth_sessions wiring.
- **Next recommended milestone:** Phase 1E Step 3 self-session visibility/revoke UX and scoped HQ operational review path (no telemetry expansion yet).

## Checkpoint update (auth_sessions 043 applied + verified — 2026-05-05)

- **Migration applied:** `supabase/sql/043_auth_sessions_foundation.sql`.
- **Apply method:** manual run in Supabase SQL Editor (linked project).
- **Post-apply smokes verified:**
  - `npm run test:supabase:auth-sessions`
  - `npm run test:supabase:audit-events`
  - `npm run test:supabase:auth-lifecycle-audit`
- **RLS verification recorded:**
  - parent self create/read/update pass
  - parent cross-profile create blocked
  - student/teacher cannot read parent session
  - HQ can read/revoke
  - delete blocked
- **Privacy boundaries reaffirmed:**
  - no raw IP/exact location/GPS/full user-agent/fingerprinting/token/session-token storage
- **Runtime status:** auth_sessions foundation exists but remains unwired in Login/AppLayout runtime paths in this checkpoint.
- **Architecture split remains:** `audit_events` = immutable history, `auth_sessions` = future current-state/revocation inventory.
- **Next recommended milestone:** Phase 1E Step 2 (tiny runtime wiring for login create + sign-out/timeout status updates).

## Checkpoint update (session governance Phase 1E Step 1 auth_sessions foundation — 2026-05-05)

- **SQL migration added:** `supabase/sql/043_auth_sessions_foundation.sql`.
- **Table added:** `public.auth_sessions` (conservative session inventory/revocation foundation).
- **Field posture:** session identity/status/timestamps + revocation fields + `safe_device_label`; no raw IP/full user-agent/fingerprint/token data.
- **RLS posture:**
  - self insert/select/update
  - HQ select/update (revocation context)
  - no delete policy
  - branch supervisor session read/update deferred in v1 for conservative scope
- **Runtime behavior:** Login/AppLayout/sign-out/timeout behavior intentionally unchanged in this checkpoint.
- **Helpers added (foundation only):**
  - read: `listMyAuthSessions`, `listAuthSessionsForAdmin`
  - write: `createAuthSession`, `updateAuthSessionHeartbeat`, `markAuthSessionSignedOut`, `markAuthSessionTimedOut`, `revokeAuthSession`
- **Smoke added:** `scripts/supabase-auth-sessions-smoke-test.mjs` + npm script `test:supabase:auth-sessions`.
- **Apply status:** linked CLI migration apply failed due DB credential/login-role restriction; manual Supabase SQL Editor apply required.
- **Architecture note:** `audit_events` remains immutable history; `auth_sessions` is the future mutable current-state/revocation table.
- **Safety boundaries preserved:** no service-role frontend, no RLS weakening, no timeout policy changes, no logout-all-devices or HQ revoke UI in this milestone.

## Checkpoint update (session governance Phase 1E planning: revocation + multi-device — 2026-05-05)

- **Planning-only checkpoint:** no code, SQL, RLS, or Supabase dashboard auth-setting changes.
- **Current state acknowledged:** Phase 1D baseline stable (Supabase-primary sign-out, remember-me UI, app-level timeout enforcement, auth lifecycle audits, insert-only audit writes where needed).
- **Gap identified:** client-only markers cannot revoke sessions across devices; server-backed session state is required for true multi-device governance.
- **Future model direction:** keep `audit_events` for immutable lifecycle trail, and add dedicated `auth_sessions`/`user_sessions` table later for active status/revocation control.
- **Planned action taxonomy:** `user.session_revoked`, `user.logout_all_devices`, `user.account_disabled`, `user.role_changed`, `user.parent_child_link_removed`.
- **Role policy direction:** parent self own-session/logout-all; teacher own-session only; HQ staff revoke/disable; system policy-based revoke on account/role/link changes.
- **Privacy boundaries:** no raw IP, exact location, full user-agent, GPS, or fingerprinting metadata in v1; defer hashed telemetry fields until legal/compliance + privacy notice review.
- **New planning doc:** `docs/session-revocation-multidevice-governance-plan.md`.
- **Next recommended implementation milestone:** Phase 1E implementation step 1 — SQL/RLS foundation for `auth_sessions`, followed by login/write-last-seen/signout-status plumbing and scoped revoke flows.

## Checkpoint update (logout audit warning stabilization — 2026-05-05)

- **Diagnosis result:** warning `recordAuthLifecycleAudit.user.logout` came from audit write path using `insert(...).select(...)` under RLS contexts where write is allowed but row-return select is intentionally restricted (notably parent role).
- **Fix applied:** added optional write-only audit mode (`includeResultRow: false`) and used it in auth lifecycle runtime call sites (login/logout/session-timeout) to avoid requiring select visibility.
- **Security posture preserved:** no SQL/RLS changes, no auth behavior changes, no service-role usage, no policy widening.
- **Validation:** `build`, `lint`, `typecheck`, `test:supabase:audit-events`, `test:supabase:auth-lifecycle-audit`, `test:supabase:notifications`, and `test:supabase:parent-notification-preferences` passed.

## Checkpoint update (session governance Phase 1D auth lifecycle audit foundation — 2026-05-05)

- **No SQL/RLS change required:** Phase 1D reuses existing `audit_events` foundation for auth lifecycle events.
- **New helper:** `recordAuthLifecycleAudit` in `src/services/supabaseWriteService.js` (privacy-safe wrapper over `recordAuditEvent`).
- **Events now written:** `user.login`, `user.logout`, `user.session_timeout`, `user.remember_me_enabled`, `user.remember_me_disabled`.
- **Write points:** login success (`Login.jsx`), manual sign-out (`signOutSupabasePrimary` pre-signout), and timeout path (`AppLayout` pre-timeout signout).
- **Metadata policy:** `role`, `rememberMeEnabled`, `reason`, `source` only; no password/token/raw IP/full user-agent/device fingerprint/child data.
- **Runtime safety:** audit writes are non-blocking and do not block sign-in/sign-out/timeout flows.
- **Demo safety:** demoRole preview does not emit lifecycle audit events in timeout/sign-out paths.
- **Smoke coverage:** added `scripts/supabase-auth-lifecycle-audit-smoke-test.mjs` + npm script `test:supabase:auth-lifecycle-audit`.
- **Known separate hygiene item:** `test:supabase:auth` alias/import issue (`@/lib`) remains pre-existing and unrelated to this milestone.

## Checkpoint update (session governance Phase 1C app-level enforcement v1 — 2026-05-05)

- **Runtime enforcement added:** app-level session governance in real mode (`src/services/sessionGovernanceService.js` + `AppLayout` integration).
- **Remember-me behavior now meaningful in app runtime:** unchecked users without active browser-session marker are signed out on restore (`/login?session=expired`).
- **Inactivity timeout policy active:**
  - `parent`/`student`: 12h (keep signed in), 2h (unchecked)
  - `teacher`: 2h
  - `branch_supervisor`/`hq_admin`: 1h
  - role-unknown fallback: 1h
- **Session markers used:**
  - localStorage: `enrichify_keep_signed_in`, `enrichify_session_started_at`, `enrichify_last_active_at`
  - sessionStorage: `enrichify_active_browser_session`
- **Sign-out behavior:** Supabase-primary sign-out clears active markers; remember-me preference is retained as UI preference.
- **Demo safety:** `demoRole` preview bypasses enforcement/timers.
- **Still deferred:** SQL-backed session audit/revocation model, cross-device governance, and Supabase dashboard auth policy changes.

## Checkpoint update (session governance Phase 1C QA + Phase 1D plan — 2026-05-05)

- **QA checkpoint recorded:** active browser marker set/clear paths, inactivity timeout enforcement path, and demo bypass behavior were inspected and documented.
- **Manual QA checklist added:** parent/teacher/demo flows plus sign-out protection and timeout practicality notes.
- **Known limitation documented:** unchecked remember-me uses per-tab `sessionStorage` marker; new-tab restored sessions can be signed out conservatively.
- **Test hygiene note:** `test:supabase:auth` remains blocked by pre-existing Base44 alias/import resolution issue (`@/lib`) and is tracked as separate hygiene work.
- **Next implementation milestone (Phase 1D):** auth lifecycle audit foundation (`user.login`, `user.logout`, `user.session_timeout`, remember-me toggle events, future revoke) with privacy-safe metadata only; defer IP/fingerprint/device telemetry until legal/compliance + privacy notice review.

## Checkpoint update (session governance Phase 1B remember-me UX — 2026-05-05)

- **Login UX:** `src/pages/Login.jsx` now shows remember-me checkbox + helper copy:
  - `Keep me signed in on this device`
  - `Use this only on a private device. You can sign out anytime.`
- **Preference storage:** non-sensitive local preference key `enrichify_keep_signed_in` captured (`1` / `0`) for future session policy wiring.
- **Current behavior scope:** Supabase session persistence behavior is unchanged in this phase (singleton client default persistence still applies).
- **Security boundaries preserved:** no password storage, no SQL/RLS changes, no Supabase dashboard/auth-setting changes, no demoRole behavior break, no Base44 auth-authority regression.
- **Still deferred:** true unchecked session-only enforcement, inactivity timeout, session tracking/audit model.

## Checkpoint update (session governance Phase 1A sign-out alignment — 2026-05-05)

- **Runtime auth fix:** sidebar sign-out now uses Supabase-primary helper path (`signOutSupabasePrimary`) instead of Base44-as-primary.
- **Authority model:** Supabase sign-out first (source of truth); Base44 logout retained as best-effort cleanup only.
- **Safe local cleanup:** only transient session UI popup keys are cleared (`companyNewsPopupSessionShownIds`, `companyNewsPopupSessionHiddenIds`).
- **Demo behavior:** `demoRole` preview remains URL-based; exiting sign-out from demo mode routes to `/welcome` without mutating real Supabase session.
- **Not included in this phase:** no remember-me checkbox, no inactivity timeout, no SQL/RLS/session-table changes, no Supabase auth settings changes.
- **Governance status:** legal/compliance review still required before wider persistent-session rollout and production hardening milestones.

## Checkpoint update (session governance + remember me planning — 2026-05-05)

- **Planning-only docs checkpoint:** no app code, auth behavior, Supabase settings, SQL, or RLS changes.
- **New doc:** `docs/session-governance-remember-me-plan.md`.
- **Diagnosis summary:** current auth/session posture is mixed (Supabase login and auth-state provider in active flow, with legacy Base44 fallback/logout paths still present in parts of shell/navigation).
- **Remember-me UX recommendation:** checkbox text `Keep me signed in on this device`; helper copy `Use this only on a private device. You can sign out anytime.`
- **Role policy direction:**
  - parent/student: convenience allowed with bounded persistence
  - teacher: shorter inactivity + cautious/short remember-me
  - branch supervisor/HQ admin: strictest timeout, remember-me disabled in v1 or tightly limited, future re-auth for sensitive actions
- **Future session tracking concept (planning):** `auth_sessions`/`user_sessions` model + auth lifecycle audit events (`user.login`, `user.logout`, `user.session_timeout`, `user.session_revoked`, `user.remember_me_enabled`).
- **Primary risks documented:** mixed logout consistency risk, unattended shared-device exposure without timeout/revoke controls, and legal/privacy notice requirements before session/device telemetry rollout.
- **Next recommended implementation milestone:** Session governance implementation phase 1 (auth authority alignment + role timeout policy + remember-me UX wiring + session/audit foundation design gate).

## Checkpoint update (notification preference enforcement RPC hardening — 2026-05-05)

- **SQL migration added:** `supabase/sql/042_notification_preference_enforcement_rpc.sql`.
- **RPC added:** `should_send_parent_in_app_notification_042(parent_profile_id, student_id, category)` returning only `allowed` + `reason`.
- **Reason for RPC:** preserve conservative `parent_notification_preferences` table RLS (no teacher direct table-read widening) while supporting teacher-trigger notification preference checks.
- **Scope enforced in RPC:** HQ admin, branch supervisor (student branch), teacher (student/class), and parent self context only.
- **Additional guards:** parent profile role + guardian linkage to student are validated before preference decision.
- **Helper behavior:** `shouldSendParentInAppNotification` now uses RPC-first; if RPC is missing (migration not applied), falls back to previous table-read behavior with safe dev warning.
- **Runtime posture:** notification decision failures remain fail-safe (suppress notification) and do not roll back main business actions.
- **Safety boundaries unchanged:** no email/Gmail/SMS/push sending, no provider integration, no parent metadata exposure.
- **Applied status:** `supabase/sql/042_notification_preference_enforcement_rpc.sql` manually applied to linked project via Supabase SQL Editor.
- **Post-apply validation:** `test:supabase:notification-preference-enforcement`, `test:supabase:parent-notification-preferences`, `test:supabase:notifications`, `test:supabase:ai-parent-reports`, `test:supabase:homework:feedback`, `test:supabase:attendance:write`, `test:supabase:audit-events`.
- **Verified outcomes:** disabled/withdrawn block; re-enabled allow; service defaults allow; marketing/media defaults block; teacher path decision works via RPC without table RLS widening; student/unrelated cross-scope blocked.
- **Next recommended milestone:** Session governance and Remember me planning.

## Checkpoint update (notification preference enforcement v1 — 2026-05-05)

- **Implementation:** `src/services/supabaseWriteService.js` now applies parent notification preference gating for parent-facing in-app trigger paths before inserting notification rows.
- **Category mapping:** enforced for `ai_parent_report.released`, homework feedback/file release, attendance arrival, parent communication releases, and fee proof requested/verified/rejected.
- **Rules:** child-specific preference row overrides parent-level; explicit `enabled=false` or `consent_status=withdrawn` blocks; explicit allow states (`consented`, `required_service`, `not_set` with enabled) permit.
- **Default policy:** service-adjacent categories default allow when no row exists; `marketing_events` and `media_photo` default block unless future explicit consent-driven trigger usage.
- **Failure posture:** business action remains non-blocking; when preference check is unavailable, notification send is suppressed (fail-closed) with safe dev-only warning.
- **Smoke added:** `scripts/supabase-notification-preference-enforcement-smoke-test.mjs` + npm script `test:supabase:notification-preference-enforcement`.
- **Boundaries unchanged:** no SQL/RLS changes, no email/Gmail/SMS/push sending, no provider integration, no parent metadata exposure.

## Checkpoint update (ParentView first-login acknowledgement gate UI v1 — 2026-05-05)

- **UI implemented:** `src/pages/ParentView.jsx` now checks parent acknowledgement before full parent portal content in real parent mode.
- **Acknowledgement constants:** `policyKey = parent_portal_terms_privacy`, `policyVersion = v1`.
- **Helper path:** `hasMyPolicyAcknowledgement` (load/check) + `createMyPolicyAcknowledgement` (save on continue) with `acknowledgementSource = parent_portal_first_login`, `metadata.ui_version = v1`.
- **UX model:** one required checkbox only; optional communication preferences remain in Communication & Notification Settings.
- **Demo behavior:** demo parent mode bypasses the gate and does not call acknowledgement write helpers.
- **Safety boundaries unchanged:** no SQL/RLS changes, no email/Gmail/SMS/push sending, no provider integration, no trigger behavior changes, no student access expansion.
- **Governance:** legal/compliance review remains required before real parent rollout and production email/media launch.

## Checkpoint update (parent policy acknowledgement foundation — 2026-05-05)

- **SQL migration:** `supabase/sql/041_parent_policy_acknowledgements_foundation.sql`.
- **Table:** `public.parent_policy_acknowledgements` with `parent_profile_id`, `policy_key`, `policy_version`, `acknowledgement_source`, `acknowledged_at`, `metadata`.
- **RLS posture:** parent self read/insert only; HQ read/insert; branch supervisor read-only for branch-linked parent records; teacher/student denied; no update/delete policies.
- **Design:** append-only per policy version via unique `(parent_profile_id, policy_key, policy_version)`; new version/correction = new insert.
- **Required first-login strategy:** one required acknowledgement record for `policy_key = parent_portal_terms_privacy`; optional communication controls remain in ParentView Communication & Notification Settings.
- **App helpers added:** read (`listMyPolicyAcknowledgements`, `hasMyPolicyAcknowledgement`, `listParentPolicyAcknowledgementsForStudent`) and write (`createMyPolicyAcknowledgement`) using anon+JWT+RLS only.
- **Smoke added:** `scripts/supabase-parent-policy-acknowledgements-smoke-test.mjs` + npm script `test:supabase:parent-policy-acknowledgements`.
- **Apply status:** migration manually applied to linked project via Supabase SQL Editor.
- **Post-apply verification:** `test:supabase:parent-policy-acknowledgements`, `test:supabase:parent-notification-preferences`, `test:supabase:notifications`, `test:supabase:audit-events`.
- **RLS verification recorded:** parent self create/read pass; duplicate create handled safely; cross-profile parent create blocked; student blocked; HQ read pass; branch supervisor read-only behavior recorded.
- **Boundary unchanged:** no first-login UI implementation yet, no email/Gmail sending, no SMS/push provider integration, no notification-trigger behavior changes.
- **Release governance:** legal/compliance review required before real parent rollout and before production launch involving email/media policies.

## Checkpoint update (Parent Portal first-login consent gate plan — 2026-05-05)

- **Planning doc added:** `docs/parent-portal-first-login-consent-gate-plan.md`.
- **Purpose:** define a simpler first parent login gate with one required acknowledgement before full portal access; keep portal as source of truth.
- **Required acknowledgement model:** one required checkbox using approved wording (Terms + Privacy + essential portal service updates).
- **Optional categories (future-facing):** email notifications, SMS/push notifications, marketing/events/promotional messages, media/photo-related updates, optional e-invoice/email delivery where applicable.
- **Recommended UX:** first-login gate with concise summary + policy links + one required checkbox; optional controls are managed later in ParentView Communication & Notification Settings.
- **Metadata plan:** save `policy_version`, timestamp, and `consent_source = parent_portal_first_login`; later allow edits in ParentView Notification Settings.
- **Schema direction (planning):** dedicated `parent_policy_acknowledgements` table (preferred) or carefully-scoped extension path; no legal text blobs per row.
- **Boundaries unchanged:** no SQL/RLS changes, no email/Gmail/provider integration, no SMS/push sending, no ParentView settings behavior change in this checkpoint.
- **Release governance:** legal/compliance review required before real parent rollout and before production email/media policy launch.

## Checkpoint update (ParentView communication settings UI v1 — 2026-05-05)

- **UI:** `src/pages/ParentView.jsx` now renders **Communication & Notification Settings** for parent mode at `#parent-notification-settings`, placed beneath the in-app notifications card.
- **Navigation:** ParentView quick links now include **Communication Settings** button, preserving real/demo URL query params and hash navigation behavior.
- **Read/write helpers:** `listMyNotificationPreferences` loads parent rows; `upsertMyNotificationPreference` saves parent self-service updates (anon+JWT+RLS only).
- **V1 category coverage:** `operational_service`, `attendance_safety`, `learning_report_homework`, `parent_communication`, `billing_invoice`, `media_photo`, `marketing_events`.
- **Channel scope in v1:** `in_app` editable; email/SMS/push shown as future channels only.
- **Persistence strategy:** save parent-level defaults with `student_id = null` in v1; child-specific overrides deferred to future phase.
- **Demo mode behavior:** section is visible with local visual toggles and local save feedback only; no Supabase writes.
- **Trigger enforcement status:** preferences are now stored in UI, but notification trigger helpers do not yet enforce preference filtering in this milestone.
- **Safety boundaries unchanged:** no Gmail/email sending, no SMS/push sending, no provider integration, no service-role frontend, no RLS changes.

## Checkpoint update (parent notification preferences foundation — 2026-05-05)

- **SQL:** `supabase/sql/040_parent_notification_preferences_foundation.sql` adds `parent_notification_preferences` (channel/category consent model with optional student scope).
- **Apply status:** migration applied to linked Supabase project via SQL Editor (manual apply).
- **RLS:** parent self read/insert/update; HQ read/insert/update; branch supervisor read-only branch-linked view; teacher/student denied; no delete policy in v1.
- **Helpers:** `listMyNotificationPreferences`, `listNotificationPreferencesForStudent` (`supabaseReadService.js`) and `upsertMyNotificationPreference` (`supabaseWriteService.js`).
- **Smoke:** `scripts/supabase-parent-notification-preferences-smoke-test.mjs` + `npm run test:supabase:parent-notification-preferences`.
- **Post-apply verification:** `test:supabase:parent-notification-preferences`, `test:supabase:notifications`, `test:supabase:audit-events` run with expected PASS/check outcomes.
- **Email boundary:** still no email sending, no Gmail/provider integration, no attachment/PDF behavior change.
- **Next milestone:** ParentView Notification Settings UI v1.

## Checkpoint update (email consent/preferences readiness plan — 2026-05-05)

- **New planning doc:** `docs/email-notification-consent-preferences-readiness-plan.md`.
- **Scope:** planning only for email/Gmail readiness; no SQL migration, no provider integration, no live sending.
- **Covers:** consent categories, recommended parent/guardian consent model, safety copy boundaries, future preference schema concept, prerequisites before email enablement, and phased rollout order.
- **Core rule:** portal remains source of truth; email notifies parents to sign in rather than exposing sensitive student/payment/report content in email body.

## Checkpoint update (parent notification action routing v1 — 2026-05-05)

- **ParentView UX:** `src/pages/ParentView.jsx` notification inbox now includes per-row **View** action buttons that scroll to existing sections (same page only; keeps `?student=` query).
- **Mapping targets:** report -> `parent-progress-reports`; homework -> `parent-homework-status`; attendance -> `attendance-summary`; parent updates -> `parent-communication-updates`; payment proof -> `parent-payment-proof`; unknown -> `parent-in-app-notifications`.
- **Section anchors:** added/reused safe section ids (`parent-communication-updates`, `parent-payment-proof`, existing inbox/homework/report/attendance ids).
- **Read/mark behavior:** action click marks unread notification as read via existing `markNotificationRead`, then smooth-scrolls to target section.
- **Security boundary:** no SQL/RLS changes, no `action_url`, no metadata/event/entity identifiers shown in UI, no external routing, no email/PDF/attachment behavior.
- **Limitation:** parent notification rows currently expose `event_id` but not direct `event_type`; v1 routing uses safe title/body heuristics until a future reviewed field-expansion path.

## Checkpoint update (payment proof request notification v1 — 2026-05-05)

- **UI:** `src/pages/FeeTracking.jsx` adds staff action button **Request payment proof** in the per-row action area (HQ/branch supervisor page scope only; no parent/student surface).
- **Write helper:** `requestFeePaymentProof({ feeRecordId })` in `src/services/supabaseWriteService.js` reads scoped `fee_records` row and emits message-only in-app notification flow.
- **Event:** `fee_payment.proof_requested`, `entity_type` `fee_record`, safe metadata `{ requestKind: "payment_proof" }`.
- **Recipients:** guardian-linked parent profiles via existing RPC `list_parent_profile_ids_for_student_staff_scope_035`.
- **Safety:** no email/SMS/push, no PDF/e-invoice generation, no attachment links, no storage paths, no payment amount/bank details/internal note in notification copy or metadata.
- **Idempotency:** best-effort duplicate suppression by actor + entity + event type (same pattern as existing notification triggers).
- **Smoke:** added `scripts/supabase-fee-payment-proof-request-smoke-test.mjs` + npm script `test:supabase:fee-payment-proof-request`.

## Checkpoint update (notification templates admin UI v1 — 2026-05-05)

- **UI:** `src/pages/Announcements.jsx` now includes HQ-only **Message Templates** section (safe editor + parent-preview card).
- **Helpers:** `listNotificationTemplates` (`supabaseReadService.js`) + `updateNotificationTemplate` (`supabaseWriteService.js`) with anon+JWT+RLS only.
- **Editable fields:** `title_template`, `body_template`, `is_active`; allowed placeholders shown read-only.
- **Access:** HQ admin only in UI v1; supervisors/teachers keep announcement features but no template editor tab; parent/student blocked from staff Announcements.
- **No SQL change required** for this UI pass (038 HQ update policy already sufficient); no trigger or delivery behavior change.

## Checkpoint update (billing payment message-only notifications — 2026-05-05)

- **SQL:** `supabase/sql/039_billing_payment_notification_templates.sql` — seeds four billing-related `notification_templates` rows (proof requested / verified / rejected, invoice message-only). Apply via **SQL Editor** or `supabase db query --linked --file supabase/sql/039_billing_payment_notification_templates.sql`.
- **Triggers:** `verifyFeeReceipt` → **`fee_payment.proof_verified`**; `rejectFeeReceipt` → **`fee_payment.proof_rejected`** — `notifyLinkedParentsAfterFeeProofStaffDecision`; recipients via **`list_parent_profile_ids_for_student_staff_scope_035`**; **`entity_type`** `fee_record`. **Deferred:** staff “proof requested” helper and **`invoice.available_message_only`** event (templates only until invoice intent path exists).
- **Smoke:** `npm run test:supabase:fee-receipt:verify` (notification count bump); **`npm run test:supabase:notification-templates`** expects **≥10** global template rows (**038 + 039**).

## Checkpoint update (notification template attachments & e-invoice readiness — planning only, 2026-05-05)

- **Doc:** `docs/notification-template-attachments-einvoice-readiness-plan.md` — attachment taxonomy, rules, **non-implemented** schema options (`notification_template_attachments`, `notification_attachments`), future payment → invoice PDF → notification → secure download flow, **message-only payment prototype** guidance, email/attachment prerequisites, security checklist.
- **No code/SQL/trigger changes** in this milestone; aligns with `038` templates, `034` notification tables, fee-receipt/readiness docs, PDF contract docs, storage foundation plan.

## Checkpoint update (notification templates foundation — 2026-05-05)

- **SQL:** `supabase/sql/038_notification_templates_foundation.sql` — `notification_templates` + RLS + seeds (apply via **Supabase SQL Editor** or `supabase db query --linked --file ...` when credentials allow).
- **Read helpers:** `getActiveNotificationTemplate`, `renderNotificationTemplate` in `src/services/supabaseReadService.js` — safe placeholder substitution from explicit `allowed_variables` + caller `variables` map only; fall back to hardcoded copy on miss/error.
- **Minimal wiring:** `notifyLinkedParentsAfterParentCommunicationStaffRelease` in `src/services/supabaseWriteService.js` resolves title/body from templates for **parent comment** + **weekly progress report** releases; AI report, homework, attendance copy remain **hardcoded** for this phase.
- **Smoke:** `npm run test:supabase:notification-templates` (fails until **038** applied on the target DB).
- **Docs:** `docs/notification-templates-foundation-checkpoint.md`, `docs/notifications-foundation-checkpoint.md` (038 section).
- **Boundaries:** no email sending; no teacher/parent template UI; templates do not change when notifications fire.

## Checkpoint update (parent in-app notification inbox in ParentView — 2026-05-05)

- **`src/pages/ParentView.jsx`** — **Notifications** card for real parent sessions: `listMyInAppNotifications` + `markNotificationRead` (RLS recipient scope); title/body/time/unread + mark-as-read; empty state and demo sign-in hint; no metadata/ids in UI.
- **Doc:** `docs/notifications-foundation-checkpoint.md` (parent inbox section).

## Checkpoint update (AI parent report release → in-app notification — 2026-05-05)

- **SQL:** `supabase/sql/035_ai_parent_report_notification_guardian_lookup.sql` (RPC parent profile lookup); `supabase/sql/036_notifications_creator_select_and_teacher_insert_scope.sql` (staff creator **SELECT** on `notifications` for INSERT RETURNING; teacher insert scope aligned with AI report manage rules).
- **App:** `releaseAiParentReport` in `src/services/supabaseWriteService.js` invokes `notifyLinkedParentsAfterAiParentReportRelease` after successful release update (non-blocking; dev-only safe warnings on failure).
- **Smoke:** `scripts/supabase-ai-parent-reports-smoke-test.mjs` — baseline parent notification count before release, increment after teacher release, duplicate release idempotency path; unrelated-parent probe CHECK when credentials missing.
- **Post-change smokes (PASS):** `test:supabase:notifications`, `test:supabase:ai-parent-reports`, `test:supabase:audit-events`, `test:supabase:parent-updates:write`.
- **Doc:** `docs/notifications-foundation-checkpoint.md` (035/036 + trigger notes).

## Checkpoint update (notifications foundation applied verification — 2026-05-05)

- **Docs-only checkpoint:** `supabase/sql/034_notifications_foundation.sql` has been **applied to the linked Supabase project** via the **Supabase SQL Editor** (not CLI in this step).
- **Post-apply smokes (PASS):** `npm run test:supabase:notifications`, `npm run test:supabase:audit-events`, `npm run test:supabase:ai-parent-reports`, `npm run test:supabase:parent-updates:write`.
- **RLS posture confirmed by smoke:** recipient can read/update own `notifications` rows; unrelated authenticated users blocked from reading others’ rows; HQ path used for fixture creation and cleanup; `notification_delivery_logs` not broadly readable (HQ-only policy).
- **Safety boundaries unchanged:** no live sending; no email/SMS/push provider; no auto-trigger wiring from product flows yet; no service-role in frontend; no cross-family parent visibility expansion.
- **Next milestone:** first in-app trigger for **AI parent report released** (or equivalent) with strict release gating + idempotency, then expand channels only after review.
- **Doc:** `docs/notifications-foundation-checkpoint.md` (applied + verified section).

## Checkpoint update (notifications SQL/RLS foundation phase 1 — 2026-05-05)

- Added conservative notification persistence foundation via `supabase/sql/034_notifications_foundation.sql`:
  - `notification_events`, `notifications`, `notification_delivery_logs`
  - RLS is deny-by-default with explicit scoped policies:
    - recipient self-read for `notifications`
    - HQ broad access where required
    - branch supervisor branch-scoped event visibility
    - HQ-only delivery-log visibility
    - authenticated staff-only constrained inserts
- Added non-sending helper surface:
  - `src/services/supabaseWriteService.js`: `createNotificationEvent`, `createInAppNotification`, `markNotificationRead`
  - `src/services/supabaseReadService.js`: `listMyInAppNotifications`, `getMyUnreadInAppNotificationCount`
- Added focused smoke: `scripts/supabase-notifications-foundation-smoke-test.mjs` and npm script `test:supabase:notifications`.
- **Apply + verify:** see **Checkpoint update (notifications foundation applied verification — 2026-05-05)** above; migration applied via **SQL Editor**; post-apply smokes all pass.
- Boundaries preserved:
  - no email/SMS/push sender implementation
  - no automatic trigger wiring to attendance/homework/reports/announcements/fees
  - no frontend service-role usage
  - no cross-family parent visibility broadening
  - no sensitive payload logging in metadata
- Checkpoint doc: `docs/notifications-foundation-checkpoint.md`.

## Checkpoint update (ParentView real parent `?student=` UUID — 2026-05-03)

- **`src/pages/ParentView.jsx`** — Parents in **real** mode (no URL **`demoRole`**) use a **valid UUID** from **`?student=`** as the target child (then profile **`student_id`**, then demo-only **`student-01`**). **RLS** unchanged; AI report reads still **released** + **current version** only. **Doc:** **`docs/real-ai-staff-draft-generation-qa-pass-checkpoint.md`**.

## Checkpoint update (real AI staff draft generation manual QA PASS — 2026-05-03)

- **Doc:** **`docs/real-ai-staff-draft-generation-qa-pass-checkpoint.md`** — staff browser **PASS** on **`/ai-parent-reports`** (**OPTIONS** + **POST 200**, success toast + inline saved copy, draft staff-only); safety boundaries; **remaining** prototype QA (version history, parent unreleased, manual release, evidence links); **parked** lanes (PDF, notifications, OCR, audit, etc.). Baseline includes **`8628555`**. **Docs-only** checkpoint — **no** runtime edits.

## Checkpoint update (AI parent report Edge generation CORS — 2026-05-03)

- **Root cause:** Browser **`fetch`** to **`/functions/v1/generate-ai-parent-report-draft`** is cross-origin with **`Authorization`** + **`apikey`** + JSON **`Content-Type`** → **OPTIONS** preflight + **POST** responses must expose **`Access-Control-Allow-*`**. Without them, DevTools shows **CORS error** and the client maps the failure to **`client_network_error`**.
- **Fix:** **`supabase/functions/_shared/aiParentReportDraftEdgeCors.ts`** + **`generate-ai-parent-report-draft/index.ts`** — **204** **`OPTIONS`** before auth; CORS headers on **all** JSON responses. **Auth / `can_manage_ai_parent_report` / provider secrets** unchanged (keys server-side only; no Edge **`real_ai`** persistence).
- **Smoke / docs:** **`scripts/supabase-ai-parent-report-edge-generation-auth-smoke-test.mjs`** asserts **OPTIONS** + **POST 401** CORS headers; **`docs/real-ai-parent-report-edge-auth-checkpoint.md`**, **`docs/real-ai-staff-draft-generation-ui-checkpoint.md`**.

## Checkpoint update (AI parent report `real_ai` draft persistence — service only, 2026-05-03)

- **`src/services/supabaseWriteService.js`** — **`createAiParentReportVersion`** accepts **`generationSource: 'real_ai'`**; **`ai_generated_at`** set; optional **`ai_model_label`**. **Doc:** **`docs/real-ai-draft-persistence-unlock-checkpoint.md`**.

## Checkpoint update (AI parent report real AI staff UI — Phase 2C, 2026-05-03)

- **`src/pages/AiParentReports.jsx`** — explicit **Generate real AI draft** (Edge JWT + persist **`real_ai`**). **`src/services/aiParentReportEdgeGenerationService.js`** — **`fetch`** to **`generate-ai-parent-report-draft`**, no secrets in browser. **Doc:** **`docs/real-ai-staff-draft-generation-ui-checkpoint.md`**. ParentView unchanged; no auto-release.

## Checkpoint update (AI parent report create shell selector visibility — 2026-05-03)

- **Symptom:** Signed-in HQ still saw **raw UUID** inputs as the default **Create report shell** path.
- **Cause:** **`canUseSupabase`** / **`showStaffCreatePickers`** treated **`appUser`** as the only live identity; **`session.user`** could exist while **`appUser`** was unset → pickers hidden → legacy UUID grid.
- **Fix:** **`hasLiveSupabaseIdentity`** includes **`session?.user?.id`**; **`staffDirectoryAuthPending`** during auth load; non-demo without session → **report type + dates** + **Advanced UUID fallback** only; mode copy distinguishes **real staff** vs **`?demoRole=`** demo (Demo Role Preview banner alone does not enable demo mode).
- **No** SQL/RLS/storage/ParentView/release/notifications/OCR/PDF/Edge/persistence/`real_ai` logic changes. **Docs:** **`docs/real-ai-staff-draft-generation-manual-qa-unblock-checkpoint.md`**, **`docs/real-ai-staff-draft-generation-ui-checkpoint.md`**.

## Checkpoint update (AI parent report create shell real staff picker fallback — 2026-05-03)

- **`ff41cfc`** could still show UUID-first UX because **picker visibility** and **`loadPickerCatalog`** both keyed off **`canUseSupabase`**; any mismatch hid the whole selector branch and surfaced UUID fallback; **`<details>`** Advanced could read as primary.
- **Fix:** **`showStaffSelectorShell`** + **`loadPickerCatalog`** tied to **`canAccess && !inDemoMode && isSupabaseConfigured()`**; **`Collapsible`** (**closed by default**) for Advanced UUIDs; safe **`Mode:`** diagnostic line (no secrets).
- **No** SQL/RLS/storage/ParentView/release/notifications/OCR/PDF/Edge/`createAiParentReportVersion`/release/`real_ai` click logic changes.

## Checkpoint update (AI parent report demo preview mode conflict — 2026-05-03)

- **Cause:** **`DemoRoleSwitcher`** used **`useOutletContext()`** but renders **next to** `<Outlet />`, so context was **always empty** → badge defaulted to **Teacher** while **`Sidebar`** showed real **HQ Admin** — misleading “demo vs staff” state. **`getSelectedDemoRole`** remains **URL-only** (no localStorage); **`Sidebar.withDemoRole`** can append **`demoRole`** while navigating if the current URL already had **`demoRole`**.
- **Fix:** **`DemoRoleSwitcher layoutRole={role}`** from **`AppLayout`**; **`AiParentReports`** uses **`useSearchParams`** for **`inDemoMode`**, **Diagnostics** (`demo preview` / `real staff` / `no-session`), **Exit demo preview** strips **`demoRole`** from URL.
- **No** SQL/RLS/storage/ParentView/notifications/OCR/PDF/Edge/persistence/release/`real_ai` logic changes.

## Checkpoint update (AI parent report shell create polish — 2026-05-03)

- **`AiParentReports.jsx`:** post-create **`loadReports({ silent: true })`** then **`setSelectedReportId(createdId)`** fixes sync effect resetting selection; **required \*** labels, **period order** validation, clearer toasts, **scrollIntoView** on new list row. **Doc:** **`docs/real-ai-staff-draft-generation-manual-qa-unblock-checkpoint.md`**, **`docs/real-ai-staff-draft-generation-ui-checkpoint.md`**.

## Checkpoint update (AI parent report real AI draft failure diagnostics — 2026-05-03)

- **`aiParentReportEdgeGenerationService.js`:** **`error.code`** on all failure paths (Edge **`body.error.code`**, **`edge_response_invalid`**, **`persistence_failed`**, client-side gates); **`publicAiParentReportEdgeErrorCode`** sanitizes unknown codes.
- **`AiParentReports.jsx`:** inline **Generation failed:** card shows **code** + message; toast includes **`(code: …)`**; no tokens or raw provider payloads.
- **Smoke:** **`npm run test:ai-parent-report:edge-client-error-codes`**. **Doc:** **`docs/real-ai-staff-draft-generation-ui-checkpoint.md`**.

## Checkpoint update (AI parent report manual QA unblock — create shell pickers, 2026-05-03)

- **`AiParentReports.jsx`** — **branch/class/student** dropdowns for signed-in non-demo staff via **`getBranches` / `getClasses` / `getStudents`** (RLS). **Doc:** **`docs/real-ai-staff-draft-generation-manual-qa-unblock-checkpoint.md`**.

## Checkpoint update (Parent Communication teacher workflow polish — final seal, docs-only, 2026-05-03)

- **Doc:** **`docs/parent-communication-teacher-workflow-polish-final-checkpoint.md`** — seals teacher UX milestone (**`c313ee8`**, **`312c439`**): Step **1–5**, Announcements vs Parent Communication, draft-only + review before share, friendly statuses, **All updates** non-clickable hints; **no** backend/RLS/storage/provider/email/ParentView changes. **Manual browser QA (~390px)** still recommended (**A**). Parked: My Tasks, notifications, PDF storage, **real_ai**, OCR. **No** runtime edits in this doc milestone.

## Checkpoint update (Parent Communication step-label polish — 2026-05-03)

- **`src/pages/ParentUpdates.jsx`** (`/parent-updates`) — **Step 1–5** teacher workflow cards: class memory, update type, class/student, **Learning evidence preview**, write/review; friendly **All updates** statuses; **Announcements** called out for official notices. **No** SQL/RLS/storage/provider/email changes. **Doc:** **`docs/parent-communication-step-label-polish-checkpoint.md`**. Cross-refs: **`docs/teacher-upload-step-simplification-plan.md`** §5 §12, **`docs/manual-preview-product-direction-corrections.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (ParentView printable report preview — final seal, docs-only, 2026-05-03)

- **Doc:** **`docs/parent-view-printable-report-preview-final-checkpoint.md`** — seals **ParentView** printable **HTML** preview (commit **`8d4ef4b`**): released/current-version only, **no** Download PDF / storage / SQL / provider / email; records **PASS** smokes; **recommends next:** **Parent Communication** step-label simplification (copy-paste prompt in doc §7). Parked: Download PDF, **real_ai**, notifications, attendance alerts, worksheet/OCR. **No** runtime edits in this milestone.

## Checkpoint update (ParentView printable report preview visual polish — 2026-05-03)

- **`src/pages/ParentView.jsx`** — **Progress Reports** preview: framed chrome, **`min(88vh, 900px)`** iframe height floor, scroll-inside hint, **`listBranches(viewer)`** + **`cls.branch_id`** for centre name (else class·programme, else **Learning Centre**). **No** Download PDF, **no** print button, **no** storage/SQL. **`src/services/aiParentReportPdfTemplate.js`** — **`formatReleasedAtForParentPdfDisplay`** so parent HTML never shows raw ISO **releasedAt**; **`scripts/ai-parent-report-pdf-template-smoke-test.mjs`** — formatter assert + **no** `.000Z` in HTML. **Doc:** **`docs/parent-view-printable-report-preview-visual-polish-checkpoint.md`**. AI/email automation planning docs **unchanged** (parked). Cross-refs: **`docs/parent-view-printable-report-preview-checkpoint.md`**, **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (ParentView printable report preview — 2026-05-03)

- **`src/pages/ParentView.jsx`** — **`Progress Reports`**: **Preview printable report** toggles sandboxed iframe with **`buildReleasedReportPdfInputFromParentViewContext`** + **`renderReleasedReportPdfHtml`** (released/detail + current version already loaded; **no** extra reads). **No** Download PDF, **no** binary PDF, **no** storage/SQL/provider/email. **Doc:** **`docs/parent-view-printable-report-preview-checkpoint.md`**. **Manual visual QA (desktop + ~390px):** **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`**. Cross-refs: **`docs/parent-view-ai-report-display-final-checkpoint.md`**, **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (AI Parent Report PDF template visual polish — 2026-05-03)

- **`src/services/aiParentReportPdfTemplate.js`** — **`renderReleasedReportPdfHtml`**: **Student Progress Report** boxed A4 layout (student panel, **At a glance** cards, section blocks, teacher / supervisor signatures); validation unchanged; **`scripts/ai-parent-report-pdf-template-smoke-test.mjs`** layout landmarks. **Doc:** **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**. **No** ParentView download, **no** storage/SQL/provider/email. Cross-refs: **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**, **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (PDF internal preview navigation clarity — 2026-05-03)

- **`docs/pdf-preview-navigation-clarity-fix-checkpoint.md`** — **removed** sidebar **`PDF preview (internal)`** from **`ROLE_NAVIGATION`** (HQ/supervisor/teacher); route **`/ai-parent-report-pdf-preview`** unchanged; entry via **`AiParentReports`** optional dashed card + direct URL; preview page copy: **not a parent download**, **no file stored**, **fake/dev fixture only**, **no download/print/export**. **No** ParentView/export/SQL/storage/provider/email changes.

## Checkpoint update (manual QA — AI Parent Report PDF internal preview — 2026-05-03)

- **Doc:** **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`** — desktop + **~390px** screenshot runbook for **`/ai-parent-report-pdf-preview`**: surfaces §2, desktop/mobile/print/safety checklists §3–§6, risks §7, decision rule §8 (**A–E** options). **QA/checkpoint only** — **no** UI/runtime edits unless issues are filed separately. Cross-ref **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**, **`docs/released-ai-parent-report-export-strategy-plan.md`**, **`docs/notification-system-sql-rls-review-plan.md`** (parked). ParentView Download PDF **not** in scope until QA clean.

## Checkpoint update (notification system SQL/RLS review plan — planning only, 2026-05-03)

- **Doc:** **`docs/notification-system-sql-rls-review-plan.md`** — safety-critical output layer; conceptual tables (**notification_events**, **notifications**, **notification_recipients**, **notification_delivery_attempts**, **notification_preferences**, optional **notification_templates**); event/notification/recipient rules; delivery logging constraints; preferences; **RLS** by role; trigger-specific access implications; safety gates + **idempotency**; email vs in-app sequencing; **§17** prompts (**A** draft DDL foundation vs **B** park + PDF QA / Parent Communication polish). **No** `supabase/sql` changes in this milestone. Cross-ref **`docs/notification-email-automation-trigger-matrix-plan.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (notification & email automation trigger matrix — planning only, 2026-05-03)

- **Doc:** **`docs/notification-email-automation-trigger-matrix-plan.md`** — product purpose, current state, channel comparison (**in-app + email first**), **trigger matrix** (parent + staff rows), safety sections (attendance, reports, homework, announcements, fees, staff), conceptual data model (**no SQL**), email provider strategy (**secrets server-side only**), implementation sequence (**B** SQL/RLS review → **C** in-app prototype → **D/E** parent triggers → **F** email), **what not to do yet**, copy-paste prompt §16 for **notification SQL/RLS review**. **No** app UI, **no** runtime logic, **no** provider keys. Cross-refs: **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**, **`docs/announcements-parent-communication-final-qa-checkpoint.md`**, **`docs/ai-parent-report-mvp-final-qa-checkpoint.md`**.

## Checkpoint update (AI Parent Report PDF internal HTML preview — 2026-05-03)

- **Route:** **`/ai-parent-report-pdf-preview`** — **`src/pages/AiParentReportPdfPreview.jsx`** — staff/demo staff roles only; **fake/dev fixtures**; **`renderReleasedReportPdfHtml`** + sandboxed iframe; **no** ParentView, **no** storage/SQL, **no** download/export persistence. **Sidebar:** **`PDF preview (internal)`**. **Link** from **`AiParentReports.jsx`** intro. **Smoke:** **`npm run test:ai-parent-report:pdf-template`** (all four variants). **Doc:** **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**. Cross-refs: **`docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`**, **`docs/ai-parent-report-pdf-template-contract-plan.md`**, **`docs/released-ai-parent-report-export-strategy-plan.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **Next:** manual visual QA before parent download milestone.

## Checkpoint update (AI Parent Report PDF helper — docs sealed, 2026-05-02)

- **Docs-only:** **`docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`** — milestone **`2cfab48`**: API summary §2–§6, validation/smokes §7–§8, future §9, **recommended next A** (internal HTML preview), copy-paste prompt §11. Cross-updates: **`docs/ai-parent-report-pdf-helper-fixture-checkpoint.md`**, **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`**, **`docs/ai-parent-report-pdf-template-contract-plan.md`**, **`docs/released-ai-parent-report-export-strategy-plan.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** `src/` in this doc milestone.

## Checkpoint update (AI Parent Report PDF helper + fixtures — 2026-05-02)

- **`src/services/aiParentReportPdfTemplate.js`** — **`buildDemoReleasedReportPdfInput`**, **`normalizeReportSectionsForPdf`**, **`normalizeReportSectionsFromReleaseVersion`**, **`validateReleasedReportPdfInput`**, **`renderReleasedReportPdfHtml`**, **`buildReleasedReportPdfInputFromParentViewContext`** (no Supabase). **Smoke:** **`npm run test:ai-parent-report:pdf-template`**. **Doc:** **`docs/ai-parent-report-pdf-helper-fixture-checkpoint.md`**. **No** ParentView button, **no** SQL/storage/binary PDF, **no** `real_ai` unlock. Cross-refs: **`docs/ai-parent-report-pdf-template-contract-plan.md`**, **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`**.

## Checkpoint update (AI Parent Report PDF mock + render helper planning — 2026-05-02)

- **Docs-only:** **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`** — pure function contracts (**build**, **normalize**, **validate**, **renderHtml**), section normalization table, validation rules, fake fixtures outline §9, render strategy **HTML/React before** client PDF lib; recommended next **`src/`** module **without** ParentView button (**§12–§13**). Cross-ref **`docs/ai-parent-report-pdf-template-contract-plan.md`**. **No** SQL/buckets/UI/export button in this doc milestone.

## Checkpoint update (AI Parent Report PDF template contract — planning only, 2026-05-02)

- **Docs-only:** **`docs/ai-parent-report-pdf-template-contract-plan.md`** — official **released-only** PDF artefact; required/optional sections aligned with **`ParentView.jsx`** keys; explicit exclusions (drafts, evidence URLs, `generation_source`, paths); **`releasedReportPdfInput`** contract §7; A4 layout §8; variants §9; privacy §11; recommended next **B** (mock builder + render helper planning §14–§15). Cross-ref **`docs/released-ai-parent-report-export-strategy-plan.md`**. **No** `src/` changes.

## Checkpoint update (released AI Parent Report export strategy — planning only, 2026-05-02)

- **Docs-only:** **`docs/released-ai-parent-report-export-strategy-plan.md`** — PDF-first official export, PNG summary second; **released/current-version-only** parent access; staff approval before parent export visibility; private storage + signed URL when persisted; phased **A→B→C** (template contract → client prototype → server PDF); audit hooks §9; **`real_ai`** not required for export; **no** auto-email in export milestone. **No** `src/` changes.

## Checkpoint update (manual QA — Homework teacher upload/review, 2026-05-02)

- **Docs-only:** **`docs/manual-qa-homework-teacher-upload-review-checkpoint.md`** — human QA runbook for **`Homework.jsx`** staff upload/review flow (**`6fe18bc`**): surfaces §2, checklists §3–§7, safety §8, risks §9, decision rule §10 (clean QA → **Parent Communication** step-label polish per **`docs/teacher-upload-step-simplification-plan.md`** §12 **C**). Cross-ref **`docs/homework-teacher-upload-step-ui-polish-checkpoint.md`**. **No** runtime changes in this doc milestone.

## Checkpoint update (Homework teacher upload/review UI polish — 2026-05-02)

- **`src/pages/Homework.jsx`** — staff-oriented intro; **By Task / By Student** helper copy; **Create homework task** with Steps 1–3; plain submission statuses; **Student submission files** / **Open student submission**; **Teacher-marked work** + share wording; **Share feedback with family** + parent-visibility helper; technical IDs in collapsible **Staff reference**; mobile-friendly button widths. **Doc:** **`docs/homework-teacher-upload-step-ui-polish-checkpoint.md`**. **`docs/teacher-upload-step-simplification-plan.md`** — milestone **B** noted implemented. **No** SQL/RLS/ParentView/provider/email/PDF/`real_ai`.

## Checkpoint update (manual QA — navigation clarity pass, 2026-05-02)

- **Docs-only:** **`docs/manual-qa-navigation-clickability-simplicity-checkpoint.md`** — screenshot-oriented QA before next implementation: ParentView history UX, My Tasks grouping, setup card affordances; **§6** safety/privacy visual audit; **§8** decision rule (targeted UI fixes vs **Teacher upload-step simplification** before real provider smoke). UI baseline **`74a71bf`**; cross-ref **`docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`**. **No** runtime changes in this doc milestone.

## Checkpoint update (navigation clarity — docs sealed, 2026-05-02)

- **Docs-only:** **`docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`** — ParentView latest/history (**slice(1)**, **3** older cap, expand/collapse), My Tasks groups (**Upload / Reply / Other / Completed**), setup directory preview + reduced fake-click affordance, teacher simplicity §5, validation snapshot **`74a71bf`**, future work, **recommended next A → B**, copy-paste manual QA prompt §9. Cross-updates: **`docs/navigation-clickability-simplicity-fixes-checkpoint.md`**, **`docs/teacher-simplicity-navigation-clickability-audit.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** `src/` in this doc milestone.

## Checkpoint update (navigation clickability + My Tasks + ParentView — 2026-05-02)

- **`src/pages/ParentView.jsx`** — **Latest announcements and events**: latest card + **3** more by default, **View more history** / **Show less**; no change to published-only data. **`src/pages/MyTasks.jsx`** — announcement tasks grouped **Upload / Reply / Other / Completed**; intro copy. **`Branches` / `Classes` / `Teachers` / `Students`** — **directory preview** copy; static cards no longer use heavy hover-shadow. **No** SQL/RLS; **no** parent rule change. Doc: **`docs/navigation-clickability-simplicity-fixes-checkpoint.md`**.

## Checkpoint update (teacher simplicity + navigation clickability audit — 2026-05-02)

- **Docs-only:** **`docs/teacher-simplicity-navigation-clickability-audit.md`** — product principles for non-technical teachers; navigation map by role (**`ROLE_NAVIGATION`**); clickability / placeholder risks (e.g. branch cards **hover** without drill-down); teacher-flow priorities; upload/receiving step template; terminology suggestions; UX risk register; recommended sequence **B → C → D** before real AI smoke; copy-paste implementation prompt. **No** SQL/RLS; **no** runtime changes in this milestone.
- Cross-refs: **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (AI Parent Reports workflow UX polish — 2026-05-02)

- **`src/pages/AiParentReports.jsx`** — workflow-oriented copy: report shell, evidence preview emphasis, **Generate draft from source evidence** with optional overrides group, manual version reframed, lifecycle release boundary; **Report detail** moved **above** Source Evidence Preview. **`src/components/layout/AppLayout.jsx`** — Company News popup slightly less intrusive (layout/styling only). **Docs:** **`docs/ai-parent-report-workflow-ux-polish-checkpoint.md`**; cross-refs in **`docs/manual-preview-product-direction-corrections.md`**, **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`**, **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** SQL/RLS; **no** `real_ai`; ParentView unchanged.

## Checkpoint update (manual visual QA runbook — hybrid source preview, 2026-05-02)

- **Docs-only:** **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`** — human QA for **Source Evidence Preview** (hybrid + demo) on **desktop** and **~390px**; surfaces, checklists, safety/privacy, known risks, next-milestone decision rule. **No** `src/` changes. Use before **real provider** key/call smoke; **no** ParentView change; **no** `real_ai` unlock.
- Cross-refs: **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (Source Evidence Preview hybrid UI — docs finalization, 2026-05-02)

- **Docs-only:** canonical sealed reference **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** — mode selection, preview/mock-draft behavior, safety, validation snapshot (**`d235344`**), future work, **recommended next A** (manual visual QA), copy-paste prompt §11. Cross-updates: **`docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`**, **`docs/ai-parent-report-source-preview-hybrid-ui-plan.md`**, **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**, **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** `src/` changes in this doc milestone.

## Checkpoint update (Source Evidence Preview hybrid UI — 2026-05-02)

- **`src/pages/AiParentReports.jsx`** — **`demoRole` / local demo:** `collectAiParentReportSourceEvidence` **`mode: 'fake'`**; **authenticated staff:** **`mode: 'hybrid'`** (same **`fetchSourceEvidenceBundle`** used for preview + mock-draft re-collect). **`Generate Mock Draft`** prefers loaded **`sourceEvidencePreview`**; **manual/source notes** override non-empty evidence fields per merge helper. **No** SQL/RLS changes; **no** `real_ai`; ParentView unchanged.
- **Docs:** sealed reference **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**; index **`docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`**; plan **`docs/ai-parent-report-source-preview-hybrid-ui-plan.md`**; preview UI **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**; RLS aggregation checkpoint cross-ref updated.

## Checkpoint update (fake AI parent report source aggregation — 2026-05-02)

- **`src/services/aiParentReportSourceAggregationService.js`** — `collectAiParentReportSourceEvidence` (**`fake`** mode only); **`buildMockDraftInputFromSourceEvidence`** for mock draft bridge; **no** persistence; **no** parent visibility change.
- **Smoke:** `npm run test:supabase:ai-parent-report:source-aggregation` (no Supabase; no real data).
- **Docs:** `docs/ai-parent-report-source-aggregation-service-smoke-checkpoint.md` (detail), **`docs/ai-parent-report-source-aggregation-service-pass-checkpoint.md`**, UI **`docs/ai-parent-report-source-preview-ui-checkpoint.md`** (milestone **A** done: fake preview + mock-draft merge). **RLS aggregation:** **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**, plan **`docs/ai-parent-report-rls-source-aggregation-plan.md`** — **`mode: 'rls'`** / **`hybrid`** on service; **no** DDL; UI still **fake** preview. **real_ai** still blocked. Email/notification still deferred.

## Checkpoint update (manual mobile QA checklist — AI report + parent comms)

- **`docs/manual-mobile-qa-ai-report-parent-communication-checkpoint.md`** — human QA before real provider keys; surfaces: staff **`AiParentReports`**, **`ParentView`** Progress Reports, **`Announcements`**, **`Sidebar`** nav; safety/privacy visual checks; recommended next **A** (UX fixes) vs **B** (staging smoke).
- No runtime changes in checkpoint milestone.

## Checkpoint update (AI parent report MVP final QA — docs only)

- **`docs/ai-parent-report-mvp-final-qa-checkpoint.md`** — summarizes MVP scope (SQL/RLS, staff/parent flows, mock AI, adapters, Edge HTTP skeleton); validation snapshot; **CHECK** notes; gaps before production real AI; decision **B** (manual mobile QA) vs **A** (staging secret + real smoke) when budget allows.
- **`docs/real-ai-provider-secret-model-smoke-plan.md`** remains the pre-key planning reference.

## Checkpoint update (real AI Edge HTTP skeleton — docs finalization)

- **Docs-only:** `docs/real-ai-parent-report-edge-http-final-checkpoint.md` — seals milestone **`b89239c`** (real OpenAI-compatible HTTP in `_shared`; **no** persistence; **`real_ai`** blocked; optional smoke **CHECK** without secrets).
- **Recommended next:** planning milestone **A** — provisional provider/model + dev/staging secret procedure before **`real_ai`** unlock or UI wiring.

## Checkpoint update (real AI parent report Edge HTTP — no persistence)

- OpenAI-compatible **real** provider HTTP in `supabase/functions/_shared/aiParentReportRealProviderHttp.ts` + `src/services/aiParentReportRealProviderHttp.js`; **`provider_not_configured`** without `AI_PARENT_REPORT_PROVIDER_API_KEY` + `AI_PARENT_REPORT_PROVIDER_MODEL`.
- `generateAiParentReportDraft` is **async**; Edge handler returns **`external_provider_call`**; HTTP **503** / **502** / **400** per error code. **No** `real_ai` DB unlock; **no** UI change.
- Smokes: `npm run test:supabase:ai-parent-report:edge-real-provider` (+ existing edge-adapter, provider-adapter). Doc: **`docs/real-ai-parent-report-edge-http-checkpoint.md`**.

## Checkpoint update (real AI provider tooling re-verification — docs only)

- Doc: **`docs/real-ai-provider-tooling-verification-checkpoint.md`** — **Deno 2.7.14** + **Supabase CLI 2.95.4** on Homebrew PATH (`/opt/homebrew/bin`); **`deno check`** Edge entry **PASS**; **`supabase functions` / `serve --help`** **PASS**; edge + provider adapter smokes **PASS**; no secrets; no deploy; **`real_ai`** still blocked; **`.gitignore`** includes `supabase/.temp/` (CLI cache).
- Next milestone **B:** real provider **Edge HTTP** with **no persistence** and **no** `real_ai` unlock (`docs/real-ai-parent-report-provider-implementation-plan.md`). Optional **C:** staging-only Edge secret when policy allows.

## Checkpoint update (real AI provider tooling verification — docs only)

- Superseded by re-verification above; first run (`c54fdd2`) documented missing CLI on default PATH in automated environment.

## Checkpoint update (AI parent report Edge adapter bundling — fake/disabled only)

- Edge-compatible adapter copy under **`supabase/functions/_shared/`** (`aiParentReportMockDraftCore.ts`, `aiParentReportProviderAdapter.ts`); **`generate-ai-parent-report-draft`** imports `_shared` only (no `../../../src`).
- Smoke: `npm run test:supabase:ai-parent-report:edge-adapter` (parity vs canonical `src/services` fake output); optional **CHECK** if `deno` / `supabase` CLI absent for full runtime validation.
- No real provider HTTP; no provider keys; no `real_ai` unlock; no persistence/auto-release from Edge scaffold.
- Docs: `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`; updated skeleton final + boundary plan + RLS checklist entries.

## Checkpoint update (AI parent report provider adapter skeleton — docs finalization)

- Docs-only final checkpoint:
  - `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`
- Implementation milestone remains:
  - adapter + mock core + Edge scaffold + smoke (`9f8ca6b` baseline).
- Next optional step:
  - linked-project **`supabase functions serve` / deploy** smoke when CLI available (bundling path via `_shared` is already mitigated).

## Checkpoint update (AI parent report provider adapter skeleton)

- Added fake/disabled-only provider boundary:
  - `src/services/aiParentReportProviderAdapter.js`
  - `src/services/aiParentReportMockDraftCore.js` (shared with mock draft path)
  - `supabase/functions/generate-ai-parent-report-draft/index.ts` (scaffold)
  - smoke: `npm run test:supabase:ai-parent-report:provider-adapter`
- No real AI HTTP calls; no provider keys; no UI changes; ParentView unchanged.
- `createAiParentReportVersion` still blocks `generationSource='real_ai'`.
- Checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-checkpoint.md`
- Final docs checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`

## Checkpoint update (mock AI parent report draft UI docs finalization)

- Final docs-only milestone checkpoint added:
  - `docs/mock-ai-parent-report-draft-ui-final-checkpoint.md`
- Confirmed boundaries for this milestone:
  - staff-side `Generate Mock Draft` only,
  - demo generation remains local-only and does not call Supabase,
  - authenticated path calls `generateMockAiParentReportDraft({ reportId, input })`,
  - no real provider/API wiring, no provider keys; Edge scaffold is **non-production** until bundling is verified,
  - no PDF/export, no notification/email/live-chat side effects,
  - no auto submit/approve/release,
  - ParentView remains released/current-version-only.
- Roadmap alignment (current): provider-boundary plan + adapter skeleton are done; next **Edge deploy/bundling check (fake only)** — `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`.

## Checkpoint update (mock AI parent report draft service + smoke)

- Added mock draft helper in service layer:
  - `src/services/supabaseWriteService.js`
  - `generateMockAiParentReportDraft({ reportId, input })`
- Helper currently enforces:
  - deterministic fake/dev draft wording,
  - version creation with `generationSource='mock_ai'`,
  - no real provider/API path,
  - no provider key dependency,
  - no auto-release.
- Added focused smoke:
  - `scripts/supabase-ai-parent-report-mock-draft-smoke-test.mjs`
  - `npm run test:supabase:ai-parent-report:mock-draft`
- Parent-safe release boundary remains unchanged:
  - draft versions remain non-parent-visible until explicit release.
- No SQL/RLS changes, no PDF/export, and no notification/email side effects in this milestone.
- Checkpoint doc:
  - `docs/mock-ai-parent-report-draft-service-smoke-checkpoint.md`
- Final pass checkpoint:
  - `docs/mock-ai-parent-report-draft-service-pass-checkpoint.md`
- Recommended next milestone:
  - **A. Real AI provider-boundary planning** (planning only; no real provider implementation yet).

## Checkpoint update (mock AI parent report draft UI wiring)

- Staff AI Parent Reports page now includes:
  - `Generate Mock Draft` action (staff-side only).
- Runtime behavior:
  - demo mode: local mock version simulation only,
  - authenticated mode: calls `generateMockAiParentReportDraft({ reportId, input })`.
- Boundaries preserved:
  - no real provider wiring,
  - no provider keys,
  - no auto-submit/approve/release,
  - no parent auto-visibility,
  - no PDF/export,
  - no notification/email side effects.
- UI checkpoint doc:
  - `docs/mock-ai-parent-report-draft-ui-checkpoint.md`

## Checkpoint update (AI parent report UI shell milestone)

- Added staff-side AI parent report UI shell:
  - route: `/ai-parent-reports`
  - page: `src/pages/AiParentReports.jsx`
  - staff navigation wired for HQ/supervisor/teacher.
- Workflow visibility now present in UI shell:
  - report list + detail,
  - manual draft create form,
  - manual/mock version create panel,
  - submit/approve/release/archive controls (release requires selected version).
- Demo behavior:
  - local fake/dev-only report rows and local lifecycle simulation,
  - no Supabase report calls in demo mode.
- Authenticated behavior:
  - existing AI parent report services via anon+JWT+RLS only.
- Boundaries preserved:
  - no SQL/RLS changes,
  - no provider integration,
  - no PDF/export,
  - no notification/email side effects,
  - ParentView remains parent-facing only.
- Checkpoint doc:
  - `docs/ai-parent-report-ui-shell-checkpoint.md`
- Final checkpoint doc:
  - `docs/ai-parent-report-ui-shell-final-checkpoint.md`
- Next recommended milestone:
  - ParentView released-report display planning first (no implementation in this docs checkpoint).

## Checkpoint update (ParentView released-report display UI milestone)

- ParentView now includes a parent-facing `Progress Reports` section.
- Scope is parent-safe released display only:
  - released reports only,
  - current-version-only content display,
  - no staff controls.
- Demo behavior:
  - local fake/dev released reports only.
- Authenticated behavior:
  - existing AI parent report read services with JWT + RLS.
- Boundary confirmation:
  - no evidence links/release-events/raw version history/raw AI/provider metadata in parent UI,
  - no SQL/RLS changes,
  - no provider wiring,
  - no PDF/export,
  - no notification/email side effects.
- Checkpoint doc:
  - `docs/parent-view-ai-report-display-ui-checkpoint.md`
- Final docs-only checkpoint:
  - `docs/parent-view-ai-report-display-final-checkpoint.md`
- Roadmap update:
  - next recommended milestone is now **A. Mock AI draft generator planning**.

## Checkpoint update (AI parent reports 030 manual DEV apply completed)

- Manual apply target:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- DEV verification confirms:
  - tables exist: `ai_parent_reports`, `ai_parent_report_versions`, `ai_parent_report_evidence_links`, `ai_parent_report_release_events`,
  - RLS enabled and policies present on all 4 tables,
  - helper functions present for branch/manage/access/insert/version access checks,
  - `ai_parent_reports.current_version_id` FK exists,
  - same-report pair FK exists: `(id, current_version_id) -> ai_parent_report_versions(report_id, id)`,
  - versions/release-events are append-first in MVP policy posture.
- Boundary reminder:
  - parent visibility remains released-only linked-child scoped,
  - student remains blocked in MVP,
  - no provider wiring, no PDF/export, no notifications/emails, no parent-visible report UI yet.
- Recommended next milestone:
  - AI parent report service + smoke with manual/mock source (before UI/provider).

## Checkpoint update (AI parent report SQL/RLS foundation draft added)

- New manual/dev-first SQL draft now exists:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- `030` status:
  - draft-only,
  - not auto-applied,
  - no production apply assumption,
  - no runtime/UI/service changes in this checkpoint.
- `030` drafted entities:
  - `ai_parent_reports`
  - `ai_parent_report_versions`
  - `ai_parent_report_evidence_links`
  - `ai_parent_report_release_events`
- `030` drafted role/RLS intent:
  - HQ global manage/select,
  - branch supervisor own-branch manage/select,
  - teacher assigned/class-scoped draft/review manage,
  - parent released-only linked-child read,
  - student blocked in MVP.
- `030` drafted privacy boundaries:
  - AI drafts staff-only,
  - parent cannot read draft versions/raw AI notes,
  - no service-role frontend usage,
  - no auto-release behavior.
- Deferred remains explicit:
  - `ai_parent_report_pdf_exports`,
  - `ai_parent_report_templates`,
  - mock AI report draft service,
  - real provider integration,
  - report UI and PDF/export implementation.

## Checkpoint update (AI parent reports 030 pre-apply review fixes)

- `030` was reviewed before manual DEV apply and tightened in draft form.
- Fixes applied in `supabase/sql/030_ai_parent_reports_foundation.sql`:
  - same-report `current_version_id` FK hardening to prevent cross-report version pointer mistakes,
  - stricter assigned-teacher insert guard (same branch + class assignment alignment when class is set),
  - append-first history/audit posture by removing version/release-event update/delete policies.
- Boundaries preserved:
  - no SQL auto-apply,
  - no production apply assumption,
  - no UI/runtime/service/provider changes,
  - parent remains released-only linked-child scoped.
- Next manual step remains: DEV SQL editor review/apply only.

## Checkpoint update (final announcements/parent communication QA documented)

- Final communication-module QA checkpoint is now documented:
  - `docs/announcements-parent-communication-final-qa-checkpoint.md`
- Consolidated module status now includes:
  - staff internal Announcements (requests/reminders, read/done/undone/reply),
  - internal attachments,
  - MyTasks Announcement Requests visibility,
  - completion overview (HQ/supervisor),
  - Company News shell + runtime popup + HQ create/publish UI,
  - parent-facing announcements/events model + services + ParentView read-only UI,
  - staff Parent Notices creation + parent-facing media upload/release controls.
- Final boundary reminder:
  - no notifications/emails/live chat in this module milestone,
  - no SQL/RLS changes in this docs checkpoint,
  - no service-role frontend usage,
  - internal and parent-facing models remain separated.
- Recommended next major track after communication module consolidation:
  - **AI parent report blueprint / data-source planning first**,
  - do not jump straight to real AI provider wiring before blueprint/approval-flow definition.

## Checkpoint update (staff Parent Notices media UI wired)

- Staff `Announcements` now includes parent-facing media upload/list/preview/release/delete-confirmation controls inside Parent Notices detail.
- Existing media service methods are now wired in staff UI (no new backend services):
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)`.
- Role behavior in this milestone:
  - HQ/admin + branch supervisor: manager-scope media controls.
  - Teacher: view-only media section in Parent Notices detail.
  - Parent/student: no access to staff `Announcements` route.
- Demo behavior in this milestone:
  - HQ/supervisor demo media actions are local simulation only.
  - No Supabase media calls in demo mode.
- Boundaries preserved:
  - ParentView remains read-only and released-media-only.
  - Upload defaults unreleased; explicit release action required.
  - Signed URL preview only; no public URL and no `storage_path` display.
  - No SQL/RLS changes, no SQL apply, no notification/email side effects.

## Checkpoint update (parent-facing text-only creation UI wired)

- Staff-side parent-facing creation shell is now wired in `src/pages/Announcements.jsx` as `Parent Notices`.
- Existing parent-facing services are now used in UI wiring for this path:
  - `listParentAnnouncements(...)`
  - `createParentAnnouncement(...)`
  - `publishParentAnnouncement(...)`
  - `archiveParentAnnouncement(...)`
- Role behavior in this milestone:
  - HQ/admin and branch supervisor create/publish/archive where RLS allows,
  - teacher remains view-only,
  - parent/student remain blocked from staff route.
- Boundaries preserved:
  - ParentView remains read-only,
  - no parent media upload/release UI,
  - no SQL/RLS changes,
  - no notifications/emails/live chat.
- Canonical checkpoint:
  - `docs/parent-facing-creation-ui-checkpoint.md`

## Checkpoint update (creation documentation milestone complete)

- Parent-facing creation UI documentation milestone is complete (docs-only checkpoint).
- No runtime/UI/service/SQL/RLS changes were introduced in this documentation-only pass.
- Recommended next milestone:
  - **A. Parent-facing media upload/release UI planning** before any media UI wiring.

## Checkpoint update (ParentView announcements/events UI checkpoint documented)

- ParentView `Announcements & Events` UI shell milestone is now documented as complete.
- Key status:
  - read-only parent viewing surface is implemented,
  - no creation/publish/archive/delete/upload controls,
  - no SQL/RLS changes,
  - no notifications/emails,
  - no live chat.
- Behavior confirmation:
  - mobile-first featured/list/detail cards with type badges and event metadata,
  - demo mode uses local fake announcement/event data only,
  - authenticated mode uses existing parent-facing read/media/read-receipt services.
- Security/safety confirmation:
  - RLS-bound parent visibility only,
  - released-media signed URL path only,
  - no internal `internal_staff` announcement exposure,
  - no internal `announcement_attachments` exposure,
  - no `storage_path` display,
  - no service-role frontend usage.
- Validation snapshot retained:
  - `build/lint/typecheck` PASS,
  - parent-facing announcement/media smokes PASS,
  - phase1 regression PASS,
  - expected fixture CHECK notes remain non-blocking.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`
- Recommended next milestone now:
  - **A. Parent-facing creation UI planning** (planning only).


## Checkpoint update (ParentView announcements/events shell with demo parity)

- ParentView now includes a read-only `Announcements & Events` shell near parent communication surfaces.
- Scope is parent viewing only:
  - no parent-facing creation UI,
  - no staff creation/manage controls,
  - no upload controls in this shell milestone.
- Demo parity behavior:
  - uses local fake parent-facing announcements/events only,
  - no Supabase calls for demo announcements list/detail,
  - includes varied fake announcement/event types.
- Authenticated non-demo parent behavior:
  - list via `listParentAnnouncements({ status: 'published', includeArchived: false })`,
  - detail via `getParentAnnouncementDetail(...)`,
  - released media list via `listParentAnnouncementMedia(...)`,
  - released media open via `getParentAnnouncementMediaSignedUrl({ expiresIn: 300 })`,
  - non-blocking read-receipt call via `markParentAnnouncementRead(...)` on detail open.
- Media/read safety:
  - released-only media visibility remains RLS-gated,
  - signed URL only, no public URL model,
  - no `storage_path` display,
  - no internal `announcements-attachments` exposure/reuse.
- No SQL/RLS changes in this checkpoint.
- No notification/email/live chat behavior in this checkpoint.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`


## Checkpoint update (parent-facing media smoke pass documented)

- Parent-facing media service milestone is now documented as PASS and stable.
- Confirmed service methods:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)`
- Boundary confirmation:
  - anon client + JWT + RLS only,
  - private bucket `parent-announcements-media` only,
  - signed URL only (no public URL model),
  - no service-role frontend,
  - no internal `announcements-attachments` bucket reuse.
- Release boundary confirmation:
  - upload defaults `released_to_parent=false`,
  - parent unreleased access blocked,
  - manager release helper gates released visibility.
- Smoke summary confirmation:
  - HQ upload/list/signed URL/release PASS,
  - parent unreleased deny + released allow PASS,
  - parent other-branch blocked PASS,
  - teacher blocked PASS,
  - student blocked/empty PASS,
  - cleanup PASS,
  - expected unrelated-parent credential CHECK remains.
- Validation confirmation:
  - `git diff --name-only` pre-test ran,
  - `build/lint/typecheck` PASS,
  - `test:supabase:parent-announcements:media` PASS,
  - `test:supabase:parent-announcements` PASS,
  - `test:supabase:announcements:phase1` PASS,
  - optional `company-news:create` + `announcements:attachments` PASS,
  - npm `devdir` warning remains non-blocking.
- No SQL/RLS changes in this checkpoint.
- No app UI/runtime behavior changes in this checkpoint.
- No notifications/emails/live chat in this checkpoint.
- Canonical doc:
  - `docs/parent-facing-announcements-media-service-smoke-checkpoint.md`
- Recommended next milestone now:
  - **A. ParentView announcements/events UI shell with demo parity** first.


## Checkpoint update (parent-facing media service + smoke)

- Parent-facing media service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)` (cleanup helper)
- Focused smoke script/command now exists:
  - `scripts/supabase-parent-announcements-media-smoke-test.mjs`
  - `npm run test:supabase:parent-announcements:media`
- Service posture:
  - anon client + JWT + RLS only,
  - private bucket only (`parent-announcements-media`),
  - signed URL only (no public URL path),
  - no service-role frontend usage,
  - no reuse of internal `announcements-attachments` bucket.
- Upload flow uses metadata-first path with cleanup attempt on object-upload failure.
- Upload validation includes media-role allowlist, content-type allowlist, and size boundary (`<= 25MB`).
- Release boundary update:
  - upload defaults `released_to_parent=false`,
  - manager release helper `releaseParentAnnouncementMedia(...)` sets `released_to_parent=true`,
  - parent access remains release-gated by existing RLS helper path.
- Smoke outcome intent/result:
  - manager upload/list/signed URL proof,
  - parent unreleased deny + released allow proof where fixture allows,
  - teacher/student media-block proof,
  - cleanup proof with CHECK-only warnings when fixture/session constrained.
- No app UI implementation in this checkpoint.
- No SQL/RLS changes in this checkpoint.
- No notifications/emails in this checkpoint.
- Canonical media checkpoint doc:
  - `docs/parent-facing-announcements-media-service-smoke-checkpoint.md`

## Checkpoint update (029 insert RLS manual DEV application + smoke proof)

- `029` manual apply target:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- No parent-facing media service changes in this checkpoint.
- No media/email/notification behavior added.
- Root cause now documented as resolved:
  - before `029`, raw insert without `RETURNING` could succeed while `insert(...).select()` (`INSERT ... RETURNING`) failed with `42501`,
  - `RETURNING` path required `SELECT`-policy visibility for newly inserted draft rows,
  - `029` introduced `can_select_parent_announcement_row_029(...)` and `can_insert_parent_announcement_row_029(...)` policy-helper wiring to resolve this.
- SQL/RLS confirmation after manual apply:
  - `parent_announcements_insert_028` now uses `can_insert_parent_announcement_row_029(...)`,
  - `parent_announcements_select_028` now uses `can_select_parent_announcement_row_029(...)`,
  - helper functions exist: `can_insert_parent_announcement_row_029`, `can_select_parent_announcement_row_029`,
  - only parent-announcements insert/select policy wiring changed,
  - update/delete/target/media/read-receipt/storage policy surfaces remain unchanged,
  - parent read remains published + linked-child scoped,
  - teacher/student remain blocked,
  - supervisor own-branch safeguards remain preserved.
- Parent-facing smoke now strongly passes:
  - HQ context diagnostic + fixture discovery (`branch/class/student/other_branch`) resolved,
  - HQ create draft PASS,
  - HQ publish PASS,
  - HQ other-branch negative fixture PASS,
  - supervisor own-branch create PASS,
  - supervisor own-branch publish PASS,
  - supervisor mixed-target cross-branch create blocked PASS,
  - teacher create/manage blocked PASS,
  - parent create/manage blocked PASS,
  - parent linked published visible PASS,
  - parent detail read PASS,
  - parent mark own read receipt PASS,
  - parent unrelated other-branch blocked/empty PASS,
  - parent internal_staff blocked/empty PASS,
  - student blocked/empty PASS,
  - cleanup PASS.
- Remaining CHECK notes:
  - unrelated parent auth fixture credential-check remains skipped when credentials are missing/invalid,
  - parent negative branch coverage still exists via same parent blocked on unrelated other-branch fixture,
  - Phase1 optional cross-branch check remains env-fixture dependent when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing,
  - no unsafe access observed.
- Regression result note:
  - `npm run test:supabase:announcements:phase1` PASS,
  - request workflow unaffected,
  - parent/student remain blocked from internal_staff announcements,
  - optional cross-branch CHECK remains expected in fixture-missing contexts.
- Canonical checkpoint doc:
  - `docs/parent-facing-announcements-insert-rls-application-checkpoint.md`

This master handoff preserves product direction, implemented milestones, architecture constraints, and safe continuation priorities for future ChatGPT/Cursor sessions.

## Checkpoint update (028 parent-facing announcements SQL/RLS draft)

- New manual/dev-first SQL draft now exists:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- `028` status:
  - draft-only,
  - not auto-applied,
  - no production apply assumption.
- `028` uses separate parent-facing model (not mixed into internal `announcements` path):
  - `parent_announcements`
  - `parent_announcement_targets`
  - `parent_announcement_read_receipts`
  - `parent_announcement_media`
- `028` drafts private media bucket/policies:
  - `parent-announcements-media` (`public=false`, signed-URL model expected later).
- `028` keeps current boundaries:
  - no parent-facing UI/services in this milestone,
  - no internal `announcement_attachments` reuse,
  - no enabling of internal `parent_facing_media`,
  - no notification/email automation.
- `028` privacy-first role stance in draft:
  - HQ global manage,
  - branch supervisor own-branch manage,
  - teacher blocked from parent-facing management in MVP,
  - parent published targeted linked-child read path,
  - student blocked in MVP.
- `028` pre-apply security hardening now added:
  - helper `is_parent_announcement_supervisor_scope_safe_028(...)` enforces supervisor manage only when announcement row and all targets stay in one managed branch,
  - `can_manage_parent_announcement(...)` now uses this guard to block mixed-target cross-branch manage escalation.

## Checkpoint update (028 parent-facing announcements SQL manual DEV application)

- `028` is now manually applied in Supabase DEV:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- Application posture:
  - no production apply,
  - no runtime/UI/service changes,
  - no notification/email behavior.
- Verification checkpoint confirms:
  - parent-facing tables exist (`parent_announcements`, `parent_announcement_targets`, `parent_announcement_read_receipts`, `parent_announcement_media`),
  - RLS and parent-facing table policies exist,
  - helper functions exist including `is_parent_announcement_supervisor_scope_safe_028(...)`,
  - private storage bucket `parent-announcements-media` exists with storage policies.
- Safety boundaries preserved:
  - parent-facing model remains separate from internal announcements,
  - internal `announcement_attachments` are not reused in parent-facing model,
  - internal `parent_facing_media` remains disabled/reserved,
  - no parent-facing UI/services in this checkpoint.
- Canonical SQL application checkpoint doc:
  - `docs/parent-facing-announcements-sql-application-checkpoint.md`

## Checkpoint update (parent-facing announcements service + smoke)

- Parent-facing announcements service methods are now added:
  - read: `listParentAnnouncements(...)`, `getParentAnnouncementDetail(...)`
  - write: `createParentAnnouncement(...)`, `publishParentAnnouncement(...)`, `archiveParentAnnouncement(...)`, `markParentAnnouncementRead(...)`
- Focused smoke command now exists:
  - `npm run test:supabase:parent-announcements`
- This service checkpoint keeps boundaries:
  - no app UI wiring and no ParentView shell in this milestone,
  - no parent-facing media upload/service in this milestone,
  - no SQL/RLS changes,
  - no notifications/emails.
- Parent visibility remains RLS-bound with anon client + JWT only.
- Service checkpoint doc:
  - `docs/parent-facing-announcements-service-smoke-checkpoint.md`
- Smoke CHECK diagnostics are now improved:
  - includes actor role/is_active/branch and fixture found/missing states without secret logging.
- Current blocker note:
  - parent-announcements create-path CHECKs are currently RLS insert denials (`42501`) in DEV for HQ/supervisor create probes.
- Service payload note:
  - create payload shape is aligned to parent-announcements draft expectations (`draft` status, self creator, allowed announcement type).
- Follow-up draft patch note:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql` added as manual/dev-first review patch (not auto-applied).
- Fixture status note:
  - branch/class/student discovery now has env override + deterministic fake fallback,
  - unrelated-parent proof remains dependent on optional fake unrelated-parent auth credentials.

## Checkpoint update (authenticated HQ Company News create UI wired)

- `Announcements` now wires authenticated HQ-only Company News create/publish UI using existing services:
  - `createCompanyNews(...)`
  - `publishCompanyNews(...)`
- Flow behavior:
  - `Save Draft` -> `createCompanyNews(...)`
  - `Create & Publish` -> `createCompanyNews(...)` then `publishCompanyNews(...)`
- Publish requires at least one target and validates target presence before publish call.
- Supported target types remain `branch|role|profile`; class target is not added in this milestone.
- Branch supervisor and teacher remain view-only for Company News create in authenticated mode.
- Parent/student remain blocked from staff Announcements route.
- Demo behavior remains local-only and preserves `demoRole` fallback:
  - HQ demo create is local-only,
  - supervisor/teacher demo do not create Company News.
- Submit controls are disabled while pending.
- Success path refreshes announcements, switches to Company News context, and selects created item when available.
- Error copy remains safe and generic (no raw SQL/RLS/env leakage).
- Company News remains excluded from MyTasks by default.
- No notification/email/live chat side effects were added.
- Parent-facing announcements/events remain future.
- No SQL/RLS changes were introduced in this milestone.

## 0) Product language — Parent Communication vs Announcements (2026-05-02)

- **Parent Communication** (staff route **`/parent-updates`**, formerly “Parent Updates” in copy): teacher-created **class updates**—memories, quick comments, weekly progress—not **official** centre notices or events.
- **Announcements** module: **Requests** (internal tasks), **Company News** (internal), **Parent Notices** (official parent-facing). Do not conflate with Parent Communication.
- **AI Parent Reports:** long term, drafts should use **system evidence** and **teacher review**; manual fields in MVP are **source notes**; see `docs/manual-preview-product-direction-corrections.md`.
- **Email/notification automation:** still **deferred**.

## 1) Product identity and vision

**Young’s Learners / Enrichify Class Flow** is not just an admin dashboard.  
It is an AI-driven education operations + parent trust + learning evidence platform.

Direction to preserve:

- Mobile-first for parent and teacher daily workflows.
- Desktop/laptop-capable for HQ and supervisor reporting/review.
- Future school/curriculum personalisation foundation.
- Future AI learning intelligence layer.
- Build toward a stable, careful, "perfect portal" direction over rushed, unstable feature expansion.

## 2) Current project stage

Current stage should be treated as:

- Strong internal prototype / full-stack hardening stage.
- Not production-ready yet.
- Several real Supabase RLS-backed workflows are already implemented and validated with smoke tests.

## 3) Major completed verticals

Implemented milestones to preserve as "already done":

- Supabase auth/login/role landing foundation.
- Supabase read/write service patterns (anon client + JWT model).
- MyTasks write flow.
- Attendance write flow.
- Parent Communication (route `/parent-updates`) Quick Comment draft/release flow.
- Weekly Progress Report draft/release flow.
- Fee/payment proof exception workflow.
- Staff Time Clock full vertical.
- Class Memories full vertical.
- AI mock/fallback draft layer (provider-free runtime).

## 4) Fee/payment proof business rule (locked)

This business logic is locked and should remain explicit in future docs/features:

1. Normal payment is internally tracked and confirmed by supervisor/HQ.
2. Invoice/e-invoice is sent after confirmed payment (automation can come later).
3. Parent payment proof upload is exception-only.
4. Parent upload is used only when office cannot confirm payment internally.
5. HQ/supervisor verifies or rejects submitted proof.
6. Parent upload UX must not look like the normal/default payment flow.

## 5) Staff Time Clock product rule (locked)

Staff Time Clock is not button-only attendance.

Required product behavior:

- Active GPS/geofence verification at both clock-in and clock-out.
- Selfie proof at clock-in and clock-out.
- No continuous/background tracking by default.
- Staff punch flow is mobile-first.
- HQ/supervisor review/reporting is desktop-friendly.
- Selfie evidence is private storage with signed URL access only.

Planned future hardening:

- Review actions.
- Export/report tools.
- Adjustment request handling.
- Retention + consent policy finalization.

## 6) Class Memories product rule (locked)

Use the product language **Memory / Memories / Class Memories**, not "class photo".

Required behavior and UX direction:

- Class Memories is for warm parent engagement + learning evidence.
- Teacher upload originates from ParentUpdates/class workflow.
- Approval gate required before parent visibility.
- Parent-facing Latest Memory hero card.
- Memories History should be gallery/grid style, not long stacked list.
- Media remains private storage with signed URL access only.

Planned next enhancements:

- Hide/archive UI wiring.
- Video support.
- Thumbnail generation.
- Consent/photo policy finalization.

## 7) AI strategy (locked)

AI architecture and product guardrails:

- AI output is draft-only.
- Teacher/staff approval is required before parent visibility.
- No direct frontend LLM provider calls.
- Real AI must run through Supabase Edge Function/server-side secret boundary.
- First real AI use case should be parent comment draft generation.

Recommended later AI sequence:

1. Weekly report AI drafts.
2. Homework feedback/marking.
3. Learning gap detection.
4. Next-week recommendations.
5. Curriculum-aware AI personalization.

## 8) Security / RLS / storage rules (locked)

Non-negotiable implementation rules:

- Frontend uses Supabase anon client + JWT only.
- Service role key is never used in frontend.
- Private buckets by default.
- Signed URLs only for sensitive object access.
- `demoRole` must not write to Supabase.
- Parent/student can only see approved and linked content.
- Teacher access is branch/class scoped.
- Branch supervisor access is own-branch scoped.
- HQ can access all branches by policy.
- For risky workflow changes, run smoke tests before UI wiring.

## 9) Validation rule (efficiency policy)

Use the smallest validation scope that matches blast radius:

- **Docs-only:** run `git diff --name-only`.
- **UI-only changes:** run build/lint/typecheck.
- **Service/backend changes:** run build/lint/typecheck + relevant smoke test(s).
- **SQL/RLS/storage/auth/shared risky changes:** run broader/full validation.
- Avoid running full suite after tiny or docs-only changes.

## 10) Known limitations (not production-ready yet)

Current non-production gaps:

- Password reset and production auth polish.
- Real onboarding/admin user management.
- Production privacy/consent wording finalization.
- Data migration and seed cleanup plan.
- Full mobile QA on real iOS/Android devices.
- Exports/monthly reporting completeness.
- Invoice/e-invoice automation.
- Real AI provider integration.
- School/curriculum onboarding not implemented in product flow yet.
- Homework upload/review pipeline not implemented in production shape yet.
- Production monitoring/on-call/support process not finalized.

## 11) Recommended roadmap from here

Recommended order:

A. Project master handoff doc (this doc)  
B. School/curriculum onboarding foundation  
C. Homework upload/review pipeline  
D. Real AI provider integration for parent comments  
E. AI weekly report generation  
F. AI homework feedback/marking  
G. Production auth/privacy/mobile QA hardening  
H. Pilot deployment plan

Why school/curriculum before real AI:

AI needs structured learning context to be truly differentiated, accurate, and school-aligned. Without school/curriculum context, generated output is more generic and less operationally valuable.

Current status note:

- School/curriculum SQL/RLS draft now exists at `supabase/sql/012_school_curriculum_foundation.sql`.
- It is additive/manual draft and is now manually applied in Supabase dev.
- School/curriculum read service + read smoke test are now added for role-scoped read validation.
- School/curriculum fake seed draft exists at `supabase/sql/013_school_curriculum_fake_seed_data.sql` (manual/dev-only).
- School/curriculum fake seed is now manually applied in Supabase dev (Success / No rows returned).
- Fake seed application checkpoint is documented at `docs/school-curriculum-fake-seed-application-checkpoint.md`.
- Classes page read-only curriculum context preview is now started (RLS-scoped read only; no assignment/edit writes).
- Students page read-only school/learning context preview is now started (RLS-scoped read only; no profile write/edit controls).
- ParentView parent-friendly learning focus summary is now started (read-only bridge from curriculum context to parent-facing language).
- School/curriculum class assignment write service is now added in `src/services/supabaseWriteService.js` (service layer only; no UI wiring).
- School/curriculum class assignment write smoke test is now added at `scripts/supabase-school-curriculum-write-smoke-test.mjs`.
- `Classes` curriculum assignment/edit UI is now wired for HQ + branch supervisor using existing write services (teacher/parent/student remain without write controls).
- Student school profile write service is now added in `src/services/supabaseWriteService.js` (service layer only; `Students` edit UI still unwired).
- Student school profile write smoke test is now added at `scripts/supabase-school-profile-write-smoke-test.mjs`.
- `Students` school profile edit UI is now wired for HQ + branch supervisor using existing student profile upsert service (teacher/parent/student remain without edit controls).
- School/curriculum UI now has read/write coverage on `Classes` + `Students`; AI integration remains unwired.
- Parent comment AI mock path now includes curriculum-aware context assembly in `src/services/aiDraftService.js` (provider-free, draft-only, teacher approval still required).
- Homework upload/review foundation SQL/storage/RLS exists at `supabase/sql/014_homework_upload_review_foundation.sql` and is now manually applied in Supabase dev (runtime/UI wiring still pending). Draft includes path-convention validation helper and staff-only submission updates.
- Application checkpoint is documented at `docs/homework-sql-application-checkpoint.md`.
- Homework runtime service + fake file smoke test are now started (`src/services/supabaseUploadService.js`, `scripts/supabase-homework-upload-smoke-test.mjs`) with metadata-first upload and private signed URL checks using fake files only.
- `015` has been manually applied in dev to fix UUID path-prefix matching for metadata-first homework file insert.
- Parent direct submission insert investigation found policy recursion for first parent submission; patch draft exists at `supabase/sql/016_fix_homework_parent_submission_insert.sql` (manual apply only, not applied yet).
- Homework flexible assignment additive SQL/RLS (`017`) is now manually applied in Supabase dev:
  - `supabase/sql/017_homework_task_assignees_foundation.sql`
  - checkpoint doc: `docs/homework-task-assignees-sql-application-checkpoint.md`
- `017` introduces optional `homework_tasks.assignment_scope` and `homework_task_assignees` RLS model to support explicit student/small-group assignment rows.
- `017` includes an assignee alignment guard so task/branch/class/student mismatch rows are rejected at write time.
- Manual marked homework file role/release additive SQL/RLS patch `018` is now manually applied in Supabase dev:
  - `supabase/sql/018_homework_file_roles_release_foundation.sql`
  - checkpoint doc: `docs/homework-file-role-release-sql-application-checkpoint.md`
- `018` adds role/release metadata to `homework_files` and release-aware read restrictions so parent/student marked-file visibility is gated until release.
- `018` draft preserves current parent upload compatibility via backward-compatible default `file_role = 'parent_uploaded_homework'`.
- Manual marked-file service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadMarkedHomeworkFile(...)`
  - `listHomeworkFiles({ homeworkSubmissionId, fileRole, parentVisibleOnly })`
  - `releaseHomeworkFileToParent(...)`
- Marked-file smoke test is now added at `scripts/supabase-homework-marked-file-smoke-test.mjs` with package command `npm run test:supabase:homework:marked-file`.
- Teacher marked-file UI shell is now added in `src/pages/Homework.jsx` review detail panel:
  - demo mode uses local fake list/upload/release/view behavior only,
  - authenticated non-demo mode now wires real marked-file upload/list/view/release actions with existing marked-file services.
- Marked-file release action does not auto-release feedback and does not trigger notification side effects in this phase.
- Parent released marked-file display runtime wiring remains future.
- Parent `Teacher-marked work` display shell is now added in `src/pages/ParentView.jsx` under released feedback cards:
  - demo mode uses local fake released marked-file display and local preview toast only,
  - authenticated non-demo mode currently shows safe waiting copy shell only,
  - real parent marked-file list/signed URL wiring remains future.
- Parent `Teacher-marked work` real read/open wiring is now added in `src/pages/ParentView.jsx` for authenticated non-demo flow:
  - read uses `listHomeworkFiles({ homeworkSubmissionId, fileRole: 'teacher_marked_homework', parentVisibleOnly: true })` for visible submission UUIDs only,
  - open uses `getHomeworkFileSignedUrl(...)` signed URL only,
  - parent-safe empty state remains and does not hint unreleased file existence.
- Parent marked-file release boundary remains protected in this shell milestone:
  - no parent visibility for unreleased teacher-marked files,
  - no teacher controls/upload controls in parent area,
  - no internal notes/raw IDs in parent output.
- AI OCR/provider path for marked files remains future and is not wired in parent display flow.
- Assignee-aware homework read service baseline is now added in `src/services/supabaseReadService.js`:
  - `listHomeworkTaskAssignees(...)`
  - `listAssignedHomeworkForStudent(...)`
- Assignee-read smoke test is now added at `scripts/supabase-homework-assignees-read-smoke-test.mjs` with package command `npm run test:supabase:homework:assignees:read`.
- Homework tracker-focused read service methods are now added in `src/services/supabaseReadService.js`:
  - `listHomeworkTrackerByClass(...)`
  - `listHomeworkTrackerByStudent(...)`
- Tracker-read smoke test is now added at `scripts/supabase-homework-tracker-read-smoke-test.mjs` with package command `npm run test:supabase:homework:tracker:read`.
- Homework assignment write-service MVP is now added in `src/services/supabaseWriteService.js`:
  - `createHomeworkTaskWithAssignees(...)`
  - `assignHomeworkTaskToStudents(...)`
- Assignment write-service MVP supports class, selected-student, and individual homework creation paths via anon client + JWT + RLS only.
- Assignment-write smoke test is now added at `scripts/supabase-homework-assignment-write-smoke-test.mjs` with package command `npm run test:supabase:homework:assignment:write`.
- Teacher Homework UI shell now includes `By Task` / `By Student` segmented structure with demo parity in `src/pages/Homework.jsx`.
- Demo mode now shows local fake task/student tracker cards and quick status badges while preserving no-Supabase/no-provider behavior.
- Authenticated non-demo Homework now wires real `By Task` tracker read using `listHomeworkTrackerByClass(...)` with UUID-safe class handling.
- Authenticated non-demo Homework now wires real `By Student` tracker read using `listHomeworkTrackerByStudent(...)` with UUID-safe student selection from visible homework data.
- `By Task` tracker behavior remains preserved while adding `By Student`.
- `Homework` now includes `Create Homework` UI shell with demo parity:
  - local/demo mode uses fake local form + fake local create simulation only,
- authenticated non-demo mode now wires guarded save to existing `createHomeworkTaskWithAssignees(...)` with validation and query refresh behavior.
- Selected-student assignment write services are now used by the `Homework` create shell in authenticated non-demo mode.
- Manual marked-file upload remains future.
- Existing homework runtime/UI workflow remains unchanged until later service/UI migration; parent assigned-but-not-submitted visibility should later move to assignee-row based reads.
- Real assignment edit/archive wiring remains future.
- Manual marked-file upload remains future.
- AI provider integration remains future.
- Announcements/Internal Communications remains future.
- Homework feedback write service + smoke test are now started (`src/services/supabaseWriteService.js`, `scripts/supabase-homework-feedback-smoke-test.mjs`) for draft/create-update, review transition, release-to-parent, and parent draft-hidden checks.
- Parent-visible feedback read path now omits `internal_note` from service response when `parentVisibleOnly` is requested.
- Teacher homework review UI is now minimally wired on `src/pages/Homework.jsx` for staff-only queue/detail/draft workflow using existing homework read/write services.
- Parent read-only homework status/list UI is now wired on `src/pages/ParentView.jsx` for linked-child visibility using anon client + RLS reads only.
- Parent homework upload form is now minimally wired on `src/pages/ParentView.jsx` for assigned/open tasks using existing submission/upload services.
- Parent released homework feedback display is now wired on `src/pages/ParentView.jsx` using `listHomeworkFeedback({ parentVisibleOnly: true })` with parent-safe fields only (`feedback_text`, `next_step`, release date).
- `internal_note` remains protected from parent-visible service/UI path.
- Demo preview parity is now improved for Homework + Memories:
  - parent demo Homework shows local upload/submit workflow shape and released-feedback example,
  - teacher demo Homework shows local review queue/detail/feedback workflow shape (no Supabase calls),
  - demo Class Memories History now uses gallery/grid style instead of stacked cards.
- Mock homework AI feedback context builder is now added in `src/services/aiDraftService.js` (`buildHomeworkFeedbackDraftContext(...)`, `generateMockHomeworkFeedbackDraft(...)`) with safe context assembly and draft-only output.
- Homework AI mock test is now added at `scripts/ai-homework-feedback-mock-test.mjs` and package command `npm run test:ai:homework-feedback:mock`.
- `Homework` teacher review panel now includes mock-only `Draft feedback with AI` action that fills editable draft fields only (no auto-save/release, no real provider/API call).
- Supabase Edge Function homework AI stub is now added at `supabase/functions/generate-homework-feedback-draft/index.ts` with local handler `supabase/functions/generate-homework-feedback-draft/handler.js` and local contract test `scripts/ai-homework-edge-function-stub-test.mjs`.
- Homework Edge Function stub now includes auth/scope helper flow with Supabase JWT user verification path, role gating (teacher/branch supervisor/HQ only), and submission/task/student/class relationship checks while preserving deterministic draft-only mock output.
- Frontend wrapper is now added at `src/services/aiDraftService.js` (`generateHomeworkFeedbackDraftViaEdgeFunction(...)`) with stable `{ data, error }` handling and required-ID validation; local mock remains default unless explicitly feature-flagged.
- Deployed regression script is now added at `scripts/ai-homework-edge-function-deployed-regression-test.mjs` to validate Edge Function auth/scope behavior in dev deployment with fake/dev fixtures and graceful `CHECK` handling when fixtures are unavailable.
- Frontend `Homework` page remains on local mock draft button path in this phase; provider wiring and broader deployed-environment auth regression hardening remain future work.
- Supabase CLI login is now completed manually and project is linked to `fwturqeaagacoiepvpwb`.
- `generate-homework-feedback-draft` is now deployed to Supabase dev and reachable via deployed regression.
- Deployed regression now shows:
  - `PASS` missing auth -> `401`
  - `PASS` invalid token -> `401`
  - `PASS` parent blocked -> `403`
  - `PASS` student blocked -> `403`
  - `CHECK` teacher/branch supervisor/HQ allowed-role cases due missing accessible fake fixtures
  - `CHECK` relationship mismatch due missing allowed-role fixture
- Deployed regression fixture handling is now improved in `scripts/ai-homework-edge-function-deployed-regression-test.mjs`:
  - optional explicit fixture env IDs: `AI_HOMEWORK_TEST_SUBMISSION_ID`, `AI_HOMEWORK_TEST_TASK_ID`, `AI_HOMEWORK_TEST_STUDENT_ID`, `AI_HOMEWORK_TEST_CLASS_ID`,
  - UUID + relationship validation for explicit fixture IDs before allowed-role tests,
  - role-accessible fallback discovery when explicit IDs are not configured,
  - clearer `CHECK` reasons when fixtures are unavailable.
- Dev-only stable fixture baseline SQL draft is now added at `supabase/sql/019_ai_homework_deployed_regression_fixture.sql`:
  - additive/manual-dev only,
  - no destructive operations,
  - fake-only branch/class/student/task/submission baseline for deployed regression,
  - helper SELECT output for local `AI_HOMEWORK_TEST_*` values,
  - not applied automatically in this milestone.
- `019` fixture baseline is now manually applied in Supabase dev only (no production apply) using fake/dev data only.
- Live deployed AI homework Edge Function regression now has full PASS coverage:
  - `PASS` missing auth -> `401`
  - `PASS` invalid token -> `401`
  - `PASS` parent blocked -> `403`
  - `PASS` student blocked -> `403`
  - `PASS` assigned teacher/branch supervisor own-branch/HQ allowed-role cases
  - `PASS` mismatched task/student/class blocked cases
  - `PASS` draft-only safety note present and no auto-save side effect
- AI homework Edge Function provider adapter stub is now added in `supabase/functions/generate-homework-feedback-draft/providerAdapter.js`:
  - provider mode supports `mock`, `disabled`, and `future_real_provider_placeholder`,
  - default behavior is provider-disabled local stub output (`externalCall: false`),
  - no provider keys/secrets added in repo,
  - no real provider API wiring in this milestone.
- Provider integration remains unwired/disabled; no provider keys added; draft-only and teacher-approval gate remain unchanged.
- AI homework feedback remains a future milestone after full human workflow hardening.
- Announcements Phase 1 SQL/RLS foundation draft is now added at `supabase/sql/020_announcements_phase1_foundation.sql`:
  - manual/dev-first draft only,
  - additive and non-destructive,
  - fake/dev data only,
  - not applied automatically in this milestone,
  - drafted tables: `announcements`, `announcement_targets`, `announcement_statuses`, `announcement_replies`,
  - conservative internal staff RLS scope for HQ/supervisor/teacher; parent/student access remains blocked in Phase 1.
- `020` pre-apply review hardening is now completed before manual dev apply:
  - fixed supervisor target-write scope gap by adding helper `can_manage_announcement_target_write(...)`,
  - `announcement_targets` insert/update now enforce own-branch scope for branch supervisor target writes.
- `020` is now manually applied in Supabase dev SQL Editor (Success / No rows returned):
  - no production apply,
  - no runtime/UI/service changes in this checkpoint,
  - Phase 1 tables confirmed in dev:
    - `announcements`
    - `announcement_targets`
    - `announcement_statuses`
    - `announcement_replies`,
  - `pg_policies` verification showed policies for all four tables (16 rows visible),
  - helper verification confirmed:
    - `announcement_branch_id`
    - `can_access_announcement`
    - `can_manage_announcement`
    - `can_manage_announcement_target_write`
    - `is_announcement_targeted_to_profile`,
  - `information_schema` verification returned 42 column rows across the four Phase 1 tables.
- Announcements Phase 1 read/write service layer is now added:
  - `src/services/supabaseReadService.js`:
    - `listAnnouncements(...)`
    - `listAnnouncementTargets(...)`
    - `listAnnouncementStatuses(...)`
    - `listAnnouncementReplies(...)`
  - `src/services/supabaseWriteService.js`:
    - `createAnnouncementRequest(...)` (safe default `status = draft`)
    - `publishAnnouncement(...)`
    - `markAnnouncementRead(...)`
    - `updateAnnouncementDoneStatus(...)`
    - `createAnnouncementReply(...)`
- Announcements Phase 1 smoke test is now added:
  - `scripts/supabase-announcements-phase1-smoke-test.mjs`
  - package command: `npm run test:supabase:announcements:phase1`
- Service and smoke layer keep guardrails:
  - anon client + JWT + RLS only,
  - no service role in frontend,
  - no attachment upload/public URL behavior in this milestone,
  - no auto email/notification behavior in this milestone.
- Announcements service smoke checkpoint result (current):
  - build/lint/typecheck passed,
  - `test:supabase:announcements:phase1` exited successfully with safe CHECK skips in current fixture context,
  - HQ/supervisor create and teacher-targeted proof remains incomplete pending focused fixture/RLS investigation,
  - latest diagnosis shows HQ/supervisor fake profiles are currently inactive (`is_active=false`), which causes `current_user_role()` helper checks to fail staff-role authorization as designed,
  - recommendation: resolve create/RLS CHECK skips before Announcements UI wiring.
- Announcements fake fixture activation SQL draft `021` is now prepared:
  - `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql`,
  - manual/dev-only draft (not auto-applied),
  - fake `example.test` fixture activation/alignment only,
  - no RLS weakening, no real data, no secrets.
- Next required step for Announcements Phase 1 proof:
  - manual review/apply `021` in Supabase dev SQL Editor,
  - rerun `npm run test:supabase:announcements:phase1`,
  - keep Announcements UI wiring paused until create/status/reply path is proven.
- Announcements create-path RLS follow-up draft is now added:
  - `supabase/sql/022_fix_announcements_insert_rls.sql`,
  - manual/dev-only patch (not auto-applied),
  - fixes HQ/supervisor create-path CHECK after fixture activation by using direct row-predicate checks in `announcements` select/insert policies,
  - keeps teacher/parent/student create blocked and preserves cross-branch restrictions.
- Updated Announcements next required proof sequence:
  - manual review/apply `022` in Supabase dev SQL Editor,
  - rerun `npm run test:supabase:announcements:phase1`,
  - proceed to UI only after HQ/supervisor create and downstream targeted flow are proven.
- Announcements Phase 1 smoke PASS checkpoint is now reached in dev:
  - `021` manually applied,
  - `022` manually applied,
  - PASS: HQ create, supervisor own-branch create/publish, teacher targeted read/status/reply, parent/student internal_staff block, cleanup,
  - CHECK: optional cross-branch negative fixture still skipped without `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`.
- Recommended immediate next milestone is now:
  - Staff Announcements UI shell with demo parity first,
  - keep real UI wiring, attachments, MyTasks integration, Company News pop-up, and parent-facing rollout in later phases.
- Staff Announcements UI shell milestone is now implemented:
  - route/page: `/announcements` via `src/pages/Announcements.jsx`,
  - staff nav tab added after `Dashboard` for HQ/supervisor/teacher only,
  - demo mode uses local fake behavior (local create/status/reply only; no Supabase calls),
  - authenticated mode is intentionally preview-only with no real announcements service wiring in this milestone.
- Announcements next milestone priority is now:
  - real authenticated Announcements UI wiring first (read/status/reply/create using existing services),
  - then attachments, MyTasks integration, Company News pop-up behavior, and parent-facing rollout.
- Real authenticated Staff Announcements UI wiring is now implemented in `src/pages/Announcements.jsx`:
  - authenticated non-demo read list/detail wiring now uses existing Phase 1 services,
  - authenticated non-demo create request wiring is enabled for HQ/supervisor only,
  - authenticated non-demo status/reply wiring is enabled (mark read, done/undone, reply),
  - demo mode remains local-only fake data with no Supabase calls.
- Announcements attachments remain Phase 2+ and are intentionally not included in `020`.
- Announcements MyTasks integration remains Phase 2+ and is intentionally not included in `020`.
- Company News pop-up runtime behavior remains Phase 3.
- Parent-facing announcements/events runtime rollout remains Phase 4.
- Live chat remains Phase 5+ only if needed.
- Notification/email workflow remains a future milestone.
- Announcements attachments Phase 2 SQL/RLS draft now exists at `supabase/sql/023_announcements_attachments_foundation.sql`:
  - manual/dev-first draft only,
  - now manually applied in Supabase dev (successful),
  - pre-apply security/data-model review completed,
  - no production apply assumption,
  - drafts `announcement_attachments` metadata table + internal staff RLS + private storage policies,
  - includes review hardening: unique `storage_path` index and bounded `file_size` check (`<= 25MB`),
  - keeps parent/student blocked and keeps `parent_facing_media` blocked in this phase.
- `023` application verification checkpoint confirms:
  - `announcement_attachments` exists with 13 verified columns,
  - metadata RLS policies exist on `announcement_attachments`,
  - helper functions exist (`announcement_attachment_announcement_id`, `announcement_attachment_branch_id`, `can_access_announcement_attachment`, `can_manage_announcement_attachment`),
  - storage bucket `announcements-attachments` exists with `public=false`,
  - storage object policies exist for select/insert/update/delete paths.
- Announcements attachments service + smoke checkpoint is now added:
  - service methods in `src/services/supabaseUploadService.js`:
    - `uploadAnnouncementAttachment(...)`
    - `listAnnouncementAttachments(...)`
    - `getAnnouncementAttachmentSignedUrl(...)`
    - `deleteAnnouncementAttachment(...)` (cleanup helper path),
  - smoke script: `scripts/supabase-announcements-attachments-smoke-test.mjs`,
  - command: `npm run test:supabase:announcements:attachments`,
  - checkpoint doc: `docs/announcements-attachments-service-smoke-checkpoint.md`.
- Upload CHECK investigation update:
  - post-024 diagnostics show raw metadata insert (without RETURNING) succeeds,
  - current service CHECKs are isolated to SELECT policy behavior on `INSERT ... RETURNING`,
  - follow-up manual/dev SQL patch draft now exists:
    - `supabase/sql/024_fix_announcements_attachments_insert_rls.sql`,
    - `supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`,
  - `024` keeps parent/student blocked, keeps `parent_facing_media` blocked, and avoids storage public-access widening.
- Announcements attachments smoke PASS checkpoint is now reached after manual `025` apply:
  - PASS HQ create fixture + upload/list/signed URL + no public URL pattern,
  - PASS supervisor own-branch create/publish + upload/signed URL,
  - PASS teacher targeted visibility + `response_upload` upload/list,
  - PASS teacher blocked for `hq_attachment`,
  - PASS parent/student internal attachment list/read blocked-or-empty,
  - PASS cleanup for attachment rows and announcement fixtures.
- CHECK lines in attachment smoke output are now treated as diagnostic evidence only:
  - actor context and insert predicate behavior checks,
  - raw insert without RETURNING confirmation,
  - not failing skips.
- Interpretation now locked:
  - metadata insert-RLS issue addressed by `024` + follow-up,
  - `INSERT ... RETURNING` select-RLS issue addressed by `025`,
  - internal attachment boundary (service + RLS + storage) is proven for main paths.
- Attachments UI remains unwired in this checkpoint.
- Staff Announcements attachments UI wiring is now active in `src/pages/Announcements.jsx`:
  - authenticated non-demo detail panel now wires attachment list/upload/view with existing services only,
  - list uses `listAnnouncementAttachments({ announcementId })`,
  - upload uses `uploadAnnouncementAttachment({ announcementId, file, fileRole, staffNote })`,
  - view uses `getAnnouncementAttachmentSignedUrl({ attachmentId, expiresIn: 300 })` with signed URL open in new tab,
  - no raw `storage_path` shown in UI,
  - demo mode attachment behavior remains local-only fake list/upload/view simulation (no Supabase calls).
- Checkpoint doc:
  - `docs/announcements-attachments-sql-application-checkpoint.md`.
- PASS checkpoint doc:
  - `docs/announcements-attachments-service-smoke-pass-checkpoint.md`.
- Attachments UI checkpoint doc:
  - `docs/staff-announcements-attachments-ui-checkpoint.md`.
- Recommended next milestone now is:
  - **MyTasks integration planning** next,
  - then Company News warm pop-up planning and parent-facing announcement/event planning,
  - live chat feasibility remains later/optional.
- Announcements MyTasks derived-read service milestone is now started:
  - `src/services/supabaseReadService.js` now includes `listMyAnnouncementTasks({ includeDone, statusFilter })`,
  - derived read uses existing RLS-governed announcements/statuses/replies/attachments only,
  - no `storage_path` is exposed in derived task rows,
  - no MyTasks UI integration is included in this checkpoint.
- Announcements MyTasks read smoke script is now added:
  - `scripts/supabase-announcements-mytasks-smoke-test.mjs`,
  - package command: `npm run test:supabase:announcements:mytasks`,
  - fake/dev fixtures only,
  - parent/student internal task visibility remains blocked-or-empty.
- Boundaries unchanged in this checkpoint:
  - no SQL/RLS changes,
  - no notification/email automation,
  - no Company News pop-up behavior,
  - no parent-facing announcements/events.
- Announcements MyTasks read-service checkpoint is now documented in:
  - `docs/announcements-mytasks-read-service-checkpoint.md`
- Latest validation checkpoint:
  - `npm run build` PASS,
  - `npm run lint` PASS,
  - `npm run typecheck` PASS,
  - `npm run test:supabase:announcements:mytasks` PASS,
  - `npm run test:supabase:announcements:phase1` PASS with optional cross-branch CHECK when fixture var is missing,
  - `npm run test:supabase:announcements:attachments` PASS with expected diagnostic CHECK lines.
- Recommended immediate next milestone is now:
  - **Company News warm pop-up planning** (completion overview read + UI checkpoint is now documented).
- Completion overview read-service checkpoint is now added:
  - `src/services/supabaseReadService.js` includes `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted })`,
  - `scripts/supabase-announcements-completion-overview-smoke-test.mjs` now validates HQ/supervisor reads plus teacher/parent/student manager-overview block-or-empty behavior,
  - no SQL/RLS changes, and no notifications/emails in this slice.
- Completion overview UI checkpoint is now added:
  - `src/pages/Announcements.jsx` now renders read-only manager `Completion Overview` for HQ/supervisor only,
  - authenticated non-demo mode reads use existing `listAnnouncementCompletionOverview({ announcementId })`,
  - demo mode keeps local-only fake overview rows for HQ/supervisor and no Supabase reads for that block,
  - teacher manager overview remains hidden in demo and authenticated paths,
  - no SQL/RLS changes, no new services, no reminder/email manager actions, and no notification side effects in this slice.
- Company News UI shell checkpoint is now added:
  - `src/pages/Announcements.jsx` now renders Company News shell cards/detail inside the existing `Company News` filter,
  - demo mode includes local fake Company News rows and HQ demo-only local create shell,
  - warm pop-up panel is preview-only in Company News detail (no app-shell runtime pop-up),
  - authenticated mode does not add real Company News write wiring in this slice,
  - no SQL/RLS changes, no MyTasks side effects, no parent-facing announcements/events, and no notifications/emails.
- Company News UI shell checkpoint doc:
  - `docs/company-news-ui-shell-checkpoint.md`
- Recommended immediate next milestone:
  - runtime warm pop-up planning/data model review (docs-only) before any runtime trigger implementation.
- UI milestone validation note:
  - build/lint/typecheck PASS,
  - announcement smoke scripts completed with DNS `ENOTFOUND` CHECK skips in this environment,
  - rerun smoke scripts when Supabase DNS/network is stable.
- MyTasks UI integration checkpoint is **completed** for Announcements (see `docs/announcements-mytasks-ui-checkpoint.md`):
  - `src/pages/MyTasks.jsx` renders read-only `Announcement Requests` cards from `listMyAnnouncementTasks({ includeDone: true })` in authenticated staff mode,
  - demo mode remains local-only with fake announcement task cards and no Supabase calls for that block,
  - loading/empty/safe-error states for announcement request reads,
  - `Open Announcement` navigates to `/announcements` (or `task.actionUrl` when set) with route `state` carrying `announcementId` for future deep selection.
- Boundaries preserved in MyTasks UI checkpoint:
  - no SQL/RLS changes,
  - no new services,
  - no announcement write/upload actions from MyTasks,
  - no notification/email automation,
  - no Company News pop-up behavior,
  - no parent-facing announcements/events,
  - no live chat.
- Company News popup status SQL/RLS foundation draft is now added at `supabase/sql/026_company_news_popup_status_foundation.sql`:
  - manual/dev-first SQL draft only (not auto-applied),
  - additive-only `announcement_statuses` popup state fields:
    - `popup_seen_at`
    - `popup_dismissed_at`
    - `popup_last_shown_at`,
  - pre-apply review hardening added popup self-update guard function/trigger to block cross-user popup field writes,
  - popup-focused indexes added for future runtime lookup/update paths,
  - existing `read_at`/`last_seen_at`/`done_status` behavior is unchanged,
  - no RLS policy weakening and no parent/student access widening,
  - parent-facing announcements/events and `parent_facing_media` remain out of scope,
  - runtime popup service/UI behavior remains future,
  - notifications/emails remain future.
- Company News popup status SQL application checkpoint is now documented:
  - `docs/company-news-popup-status-sql-application-checkpoint.md`
- `026` is now manually applied in Supabase DEV SQL Editor (`Success. No rows returned.`):
  - no production apply in this checkpoint,
  - verified `announcement_statuses` popup columns exist (`popup_seen_at`, `popup_dismissed_at`, `popup_last_shown_at`),
  - verified popup indexes exist (`announcement_statuses_popup_seen_at_idx`, `announcement_statuses_popup_dismissed_at_idx`, `announcement_statuses_popup_last_shown_at_idx`, `announcement_statuses_profile_popup_idx`),
  - verified popup self-update guard exists:
    - trigger `trg_guard_announcement_statuses_popup_self_update_026`,
    - function `guard_announcement_statuses_popup_self_update_026`,
  - verified `announcement_statuses` policy shape remains unchanged at 4 policies from `020`,
  - no runtime/UI/service changes in this checkpoint.
- Company News popup service + smoke checkpoint is now added:
  - `docs/company-news-popup-service-smoke-checkpoint.md`
- New internal Company News popup service methods are now implemented:
  - `src/services/supabaseReadService.js`:
    - `listEligibleCompanyNewsPopups(...)`
  - `src/services/supabaseWriteService.js`:
    - `markCompanyNewsPopupSeen(...)`
    - `dismissCompanyNewsPopup(...)`
- Focused popup smoke script now exists:
  - `scripts/supabase-company-news-popup-smoke-test.mjs`
  - `npm run test:supabase:company-news:popup`
- Popup service/smoke scope remains constrained:
  - no runtime app-shell popup UI wiring in this milestone,
  - no SQL/RLS changes in this milestone,
  - no notifications/emails/live-chat behavior,
  - no parent-facing announcements/events and no `parent_facing_media`.
- Company News runtime warm popup UI shell is now implemented:
  - app-shell placement: `src/components/layout/AppLayout.jsx`,
  - staff-only popup read uses existing `listEligibleCompanyNewsPopups({ limit: 1 })`,
  - popup seen/dismiss use existing `markCompanyNewsPopupSeen(...)` and `dismissCompanyNewsPopup(...)`,
  - demo role uses local fake popup only (no Supabase popup calls in demo),
  - session guard prevents same-item repeat storms in one session,
  - popup `View` routes to `Announcements` with Company News context.
- Runtime popup wiring preserves boundaries:
  - no SQL/RLS changes,
  - no new services,
  - no notification/email/live chat behavior,
  - no parent-facing announcements/events and no `parent_facing_media`,
  - no real HQ Company News create path in this slice.
- Service checkpoint validation notes:
  - `build`/`lint`/`typecheck` PASS,
  - popup smoke PASS with expected CHECK for direct HQ `company_news` create block under request-first create-path policy,
  - phase1/mytasks/completion announcement smokes PASS (optional cross-branch CHECK still possible without fixture env),
  - npm `devdir` warning is non-blocking.
- Recommended next milestone after runtime popup:
  - **A. Real HQ Company News create path planning** first,
  - rationale: runtime popup display is ready, but safe production Company News creation/publish path is still constrained by request-first create-path behavior.
- Company News create-path SQL draft is now added:
  - `supabase/sql/027_company_news_create_foundation.sql`,
  - manual/dev-first and review-first only (not auto-applied),
  - preserves existing request insert behavior from `022`,
  - adds HQ-only internal staff `company_news` draft insert allowance for MVP,
  - keeps branch supervisor `company_news` create blocked for MVP,
  - keeps teacher/parent/student create blocked,
  - does not widen parent-facing announcements/events scope,
  - does not add notifications/emails or service/UI create wiring in this slice.
- Company News create-path SQL application checkpoint is now completed in DEV:
  - `027` manually applied in Supabase DEV SQL Editor (`Success. No rows returned.`),
  - verified `announcements_insert_020` now references `can_insert_announcement_row_027(...)`,
  - verified helper `can_insert_announcement_row_027(...)` exists,
  - verified scope remains insert-gate only (no select/update/delete policy changes),
  - popup smoke now reports HQ direct `company_news` create PASS,
  - phase1 smoke remains PASS for request workflow regression safety,
  - optional cross-branch negative CHECK remains when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured,
  - no production apply, and no runtime/UI/service changes in this checkpoint.
- Company News create service + smoke checkpoint is now added:
  - `src/services/supabaseWriteService.js` now includes:
    - `createCompanyNews(...)`
    - `publishCompanyNews(...)`
  - focused create smoke script:
    - `scripts/supabase-company-news-create-smoke-test.mjs`
    - `npm run test:supabase:company-news:create`
  - service guards enforce internal Company News draft/publish lifecycle and target requirement before publish,
  - no UI/runtime create wiring in this checkpoint,
  - no SQL/RLS changes in this checkpoint.
- Company News MyTasks side-effect fix is now applied:
  - `listMyAnnouncementTasks(...)` excludes `announcement_type='company_news'` by default,
  - request/reminder task behavior is preserved for MyTasks,
  - Company News remains Announcements + popup + read oriented by default.

## 12) Next immediate milestone prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News runtime warm pop-up planning/data model review only.

Hard constraints:
- Docs/planning only.
- Keep existing Company News UI shell and request workflow behavior unchanged.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not add services.
- Do not use service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs; do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add runtime warm pop-up behavior in this milestone.
- Do not add popup persistence/dismissal backend behavior.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only in demo paths and smoke fixtures.
- No storage_path, staff_note, or raw SQL/RLS/env strings in UI.

Deliverables:
1) Define runtime warm pop-up trigger/frequency/dismissal strategy.
2) Review current data model for popup readiness vs optional extension needs.
3) Keep strict non-goals: no runtime trigger implementation, no notifications/emails, no MyTasks side effects.
4) Update docs/checkpoints only for planning milestone.

Validation efficiency rule:
- Docs-only: run git diff --name-only only unless runtime files change.
```

---

Handoff status: complete for continuity. Use this file as the primary context anchor before starting the next milestone.

### AI parent report service + smoke checkpoint note

- Added AI parent report service methods (read/write) for draft/review/release lifecycle:
  - `src/services/supabaseReadService.js`
  - `src/services/supabaseWriteService.js`
- Added focused smoke:
  - `scripts/supabase-ai-parent-reports-smoke-test.mjs`
  - `npm run test:supabase:ai-parent-reports`
- Scope/safety for this checkpoint:
  - manual/mock source only (`manual`, `mock_ai`),
  - `real_ai` source blocked in service layer,
  - no UI/report page additions,
  - no SQL/RLS changes,
  - no PDF/export/provider wiring,
  - no service-role frontend usage.
- Boundary goals covered in smoke:
  - staff draft/review/release path,
  - parent draft block,
  - released linked-child read path,
  - unrelated parent blocked or CHECK when fixture credentials are unavailable,
  - release/version event insert PASS or CHECK without privilege widening.
- Checkpoint doc:
  - `docs/ai-parent-report-service-smoke-checkpoint.md`.

### AI parent report draft-create diagnostics note

- Diagnostic probes were added to `scripts/supabase-ai-parent-reports-smoke-test.mjs` with non-secret output:
  - actor role/is_active/branch marker,
  - selected fake fixture IDs (masked),
  - relationship validity check,
  - failure stage labeling (`fixture_discovery`, `service_create`, `raw_insert_without_returning`, `insert_with_returning`, `helper_predicate`, `constraint_or_fk`, `downstream_lifecycle`).
- Current root-cause classification:
  - helper predicate PASS,
  - raw insert PASS,
  - insert with RETURNING fails by RLS.
- Manual/dev-first SQL patch draft created (not applied):
  - `supabase/sql/031_fix_ai_parent_reports_insert_rls.sql`
- Next manual step if approved:
  - apply `031` in Supabase DEV SQL editor, then rerun `npm run test:supabase:ai-parent-reports`.

### AI parent report 031 apply + smoke pass note

- `supabase/sql/031_fix_ai_parent_reports_insert_rls.sql` is now manually applied in Supabase DEV.
- SQL Editor result: `Success. No rows returned.`
- Post-apply focused smoke now passes core path:
  - HQ draft create,
  - submit_for_review,
  - approve,
  - release selected version,
  - `current_version_id` assignment,
  - parent released linked-child/current-version visibility,
  - parent draft block,
  - student block.
- Remaining checks are expected and safe:
  - unsafe evidence snapshot blocked by guard,
  - unrelated parent fixture credentials unavailable.
- Regression safety remains green:
  - `test:supabase:parent-announcements` PASS,
  - `test:supabase:announcements:phase1` PASS (optional fixture CHECK only).
- Checkpoint doc:
  - `docs/ai-parent-report-031-application-service-pass-checkpoint.md`.

### AI parent report evidence-link smoke hardening note

- Focused smoke now includes both evidence-link directions:
  - safe evidence-link insert PASS with fake/dev-safe summary payload,
  - unsafe raw private-path style summary payload blocked by service guard.
- Evidence visibility checks now include:
  - staff read-back PASS when RLS permits,
  - parent direct evidence-link read blocked/empty.
- No SQL/RLS/UI/provider/PDF changes in this hardening step.
- Checkpoint doc:
  - `docs/ai-parent-report-evidence-smoke-hardening-checkpoint.md`.

### AI parent report next milestone recommendation note

- Recommended next milestone:
  - AI parent report UI shell with demo/manual data only.
- Sequence rationale:
  - service + RLS + evidence traceability behavior is already proven,
  - UI shape should be validated before mock AI draft service,
  - real provider integration and PDF/export remain later phases.

### ParentView sidebar section navigation QA note (2026-05-04)

- Root cause:
  - non-demo parent/student `/parent-view#...` nav dropped `?student=<uuid>`,
  - ParentView did not react to hash changes for section scroll,
  - sidebar active-state used pathname only,
  - several hash targets were missing/misaligned for parent/student sections.
- Fixed URL patterns:
  - real parent/student: `/parent-view?student=<uuid>#section`,
  - demo parent: `/parent-view?demoRole=parent&student=student-01#section`,
  - demo student: `/parent-view?demoRole=student&student=student-01#section`.
- Parent mapping:
  - dashboard `#parent-portal-overview`,
  - attendance `#attendance-summary`,
  - homework `#parent-homework-status`,
  - reports `#parent-progress-reports`,
  - learning portal `#student-learning-portal`.
- Student mapping:
  - learning portal `#student-learning-portal`,
  - homework due `#homework-due`,
  - recent feedback `#recent-feedback`,
  - learning resources `#learning-resources`,
  - simple progress `#simple-progress-summary`.
- UX behavior:
  - hash click triggers smooth scroll + quick section reveal,
  - reduced-motion users get minimized/no motion path.
- Safety boundaries unchanged:
  - no SQL/RLS/auth/release-policy/provider/Edge/function boundary widening,
  - no parent draft/old-version/evidence-link exposure.

### Validation Mode Cleanup Phase 1 note (2026-05-04)

- Scope:
  - `src/pages/AiParentReports.jsx`,
  - `src/pages/ParentView.jsx`,
  - `src/components/layout/AppLayout.jsx`,
  - `src/services/authService.js`.
- Display rule applied:
  - demo/debug helper UI shows only when URL has `?demoRole=...` or `?debug=1` (also accepts `true/yes/on`),
  - normal real staff/parent/student mode hides developer-facing demo/debug panels.
- Real-mode cleanup:
  - App shell hides `DemoRoleSwitcher` unless demo/debug URL mode is active,
  - AI Parent Reports hides Diagnostics and internal PDF HTML preview in normal real mode,
  - AI Parent Reports real-mode explanatory copy is now validator-facing (less demo/dev language),
  - ParentView real-mode privacy/footer copy now avoids fake/demo phrasing.
- Demo/debug behavior preserved:
  - existing demo role workflows still visible and functional with `?demoRole`,
  - diagnostics + internal preview helpers remain available in demo/debug URLs.
- Safety boundaries preserved:
  - no SQL/RLS/auth relaxation,
  - no service-role frontend usage,
  - no parent draft/old-version/evidence-link exposure,
  - no provider/Edge/email/notification/PDF-storage changes.
- Remaining cleanup items (future pass):
  - further reduce internal QA phrasing in non-debug staff helper text blocks,
  - optional toggle-based debug drawer instead of inline cards.

### AI Parent Reports validation-ready internal prototype note (2026-05-04)

- New checkpoint doc:
  - `docs/ai-parent-reports-validation-ready-internal-prototype-checkpoint.md`
- Internal validation-ready scope confirmed:
  - staff flow: create shell -> real AI draft -> version history -> submit/approve/release,
  - release assigns `current_version_id`,
  - ParentView reads released reports + current version only,
  - parent cannot read drafts/old versions/evidence links.
- Validation cleanup confirmed:
  - real mode hides demo role switcher and AI diagnostics/internal PDF helper panels,
  - demo/debug helpers remain available only when URL enables `demoRole`/`debug`.
- Safety boundaries unchanged:
  - no SQL/RLS weakening, no service-role frontend, no auth relaxation, no parent visibility widening.
- Recommended next lane:
  - Validation Mode Cleanup Phase 2 (final real-mode wording cleanup + debug drawer consolidation + validator UX pass).

### Validation Mode Cleanup Phase 2 note (2026-05-04)

- New checkpoint doc:
  - `docs/ai-parent-reports-validation-mode-cleanup-phase2-checkpoint.md`
- Real-mode polish completed for AI Parent Reports:
  - mode/diagnostic text hidden unless debug,
  - internal refs hidden unless debug,
  - raw current-draft JSON hidden unless debug,
  - advanced UUID fallback relabeled as debug/manual-only,
  - remaining fixture-style wording softened for validator-facing staff flow.
- Demo/debug availability preserved:
  - demo helper tools still require `?demoRole=...`,
  - debug-only internals require `?debug=1`.
- Safety boundaries unchanged:
  - no SQL/RLS/auth/provider/release/visibility boundary widening.
- Recommended next lane:
  - Validation Mode Cleanup Phase 3 (final cross-page wording pass + centralized debug drawer + final manual validator walkthrough).

### Validation Mode Cleanup Phase 3 note (2026-05-04)

- Scope remained bounded to AI Parent Reports + ParentView validator-facing polish.
- Real-mode staff polish completed:
  - further reduced internal/dev phrasing on report rows and fallback messaging,
  - advanced fallback relabeled to manual/debug wording,
  - internal refs stay hidden unless explicit `debug` mode.
- Real-mode parent posture unchanged and clean:
  - parent-facing progress/report surfaces remain released/current-only and non-technical.
- Debug/demo behavior unchanged:
  - helper tools remain opt-in via `?debug=1` or `?demoRole=...`.
- Validator walkthrough checklist added in:
  - `docs/ai-parent-reports-validation-mode-cleanup-phase2-checkpoint.md`.
- Safety boundaries unchanged:
  - no SQL/RLS/auth/provider/release/visibility changes.
- Recommended next lane:
  - final manual validator sign-off pass and production-hardening planning (outside this bounded cleanup lane).

### Final validator sign-off note (2026-05-04)

- New sign-off checkpoint:
  - `docs/ai-parent-reports-validator-signoff-checkpoint.md`
- Final manual status recorded:
  - real staff flow validated end-to-end (create -> real AI draft -> submit/approve/release),
  - ParentView real parent visibility validated as released/current-only.
- Demo/debug gating reaffirmed:
  - helper tools remain URL opt-in only via `demoRole` or `debug`.
- Safety boundaries reaffirmed:
  - no SQL/RLS/auth/provider/release/visibility boundary changes in this sign-off checkpoint.
- Recommended next lane:
  - production hardening planning and rollout readiness documentation.

### Teacher homework + parent communication validation cleanup note (2026-05-04)

- New checkpoint doc:
  - `docs/teacher-homework-parent-communication-validation-cleanup-checkpoint.md`
- Scope:
  - `src/pages/ParentUpdates.jsx`,
  - `src/pages/Homework.jsx`,
  - `src/pages/MyTasks.jsx`.
- Real-mode polish completed for teacher-facing clarity:
  - removed remaining demo-first wording from normal staff helper copy,
  - added clearer step sequencing for Parent Communication share flow,
  - replaced UUID-heavy staff wording in Homework empty states with teacher-facing context copy,
  - added quick teacher navigation actions in My Tasks to Homework and Parent Communication.
- Demo/debug posture preserved:
  - demo-oriented helper wording remains limited to demo/debug contexts.
- Safety boundaries unchanged:
  - no SQL/RLS/auth/provider/notification/auto-release changes,
  - no parent visibility widening.

### Homework smoke auth setup note (2026-05-04)

- Added missing env template:
  - `.env.example` now includes required smoke-test placeholders (no secrets).
- Added setup checkpoint:
  - `docs/homework-smoke-test-auth-setup-checkpoint.md`
- Clarified auth + fixture prerequisites for:
  - `test:supabase:homework:feedback`
  - `test:supabase:homework:assignment:write`
- Clarified failure interpretation:
  - `Auth session missing!` and `homework_tasks` RLS-insert-denied can be environment/fixture setup failures, not necessarily UI/service regressions.

### Homework assignment-write smoke stabilization note (2026-05-04)

- Updated `scripts/supabase-homework-assignment-write-smoke-test.mjs`:
  - removed parent-linked-student dependency for the allowed-write assertion,
  - now discovers a supervisor-visible student/class/branch fixture under active RLS before task creation assertions.
- Result:
  - deterministic branch-supervisor create path succeeds when legitimate fixture data is visible under policy.
- Boundaries preserved:
  - no SQL/RLS changes,
  - no auth bypass,
  - parent/student create checks remain blocked assertions.

### Homework + Parent Communication validator sign-off note (2026-05-04)

- New checkpoint doc:
  - `docs/homework-parent-communication-validator-signoff-checkpoint.md`
- Bounded manual walkthrough status recorded for:
  - Homework teacher flow,
  - Parent Communication teacher flow,
  - My Tasks quick actions.
- Walkthrough confirms:
  - required homework fields and staged create/review/share flows are clear,
  - parent-facing visibility remains release/share gated,
  - My Tasks quick actions route teachers to `/homework` and `/parent-updates`,
  - mobile-safe button layout remains intact for quick actions and core teacher actions.
- Safety boundaries reconfirmed:
  - no SQL/RLS changes,
  - no service-role frontend usage,
  - no auth relaxation,
  - no parent/student homework-task creation path,
  - no parent visibility into draft/internal staff notes,
  - no notification/email behavior changes,
  - no AI Parent Reports/ParentView behavior changes in this checkpoint.
- Environment note:
  - intermittent Supabase auth/rate-limit failures in smoke runs are tracked as environment instability unless deterministic reproduction appears.

### Security, audit, and session governance foundation planning note (2026-05-04)

- New planning checkpoint doc:
  - `docs/security-audit-session-governance-foundation-plan.md`
- Scope:
  - planning-only foundation for session governance, audit logging, data protection, role onboarding/access review, notification safety prerequisites, and production/staging readiness.
- Explicit guardrails preserved in this checkpoint:
  - no runtime code changes,
  - no SQL/RLS changes,
  - no auth config changes,
  - no notification/email implementation,
  - no Edge/provider/PDF/OCR work,
  - no product UI changes.
- Recommended implementation sequence captured:
  - session policy + audit model first,
  - notification/email safety prerequisites before automation,
  - advanced channel/analytics work deferred to production beta.
- Risk posture summary captured:
  - high-risk focus on session misuse, audit gaps, and cross-family data leakage boundaries.

### Audit events foundation note (2026-05-04)

- New checkpoint doc:
  - `docs/audit-events-foundation-checkpoint.md`
- Added migration file:
  - `supabase/sql/033_audit_events_foundation.sql`
- Added phase-1 audit table:
  - `public.audit_events` with actor/action/entity/scope ids + safe metadata + timestamp indexes.
- RLS posture (conservative):
  - insert authenticated with `actor_profile_id = auth.uid()`,
  - select: HQ all, supervisor branch-scoped, teacher own-actor events,
  - no parent/student read grants.
- Added safe helper:
  - `recordAuditEvent(...)` in `src/services/supabaseWriteService.js`,
  - JWT-only, metadata sanitization for sensitive keys/content, non-blocking failure behavior.
- Initial action logging wired (narrow scope):
  - `ai_parent_report.released`,
  - `homework_feedback.released_to_parent`,
  - `parent_comment.released`.
- Added focused smoke script:
  - `scripts/supabase-audit-events-smoke-test.mjs`
  - npm command `test:supabase:audit-events`.
- Boundary posture preserved:
  - no email/notification automation, no session auto-timeout/session-tracking rollout, no AI provider/Edge behavior changes, no ParentView visibility changes, no service-role frontend usage.

### Audit events apply verification note (2026-05-04)

- Migration applied to linked Supabase project:
  - `supabase/sql/033_audit_events_foundation.sql`
  - command used: `supabase db query --linked --file supabase/sql/033_audit_events_foundation.sql`
- Post-apply audit smoke status:
  - `npm run test:supabase:audit-events` passed:
  - teacher own-event insert/read allowed,
  - parent audit read blocked,
  - HQ admin read allowed,
  - metadata sanitization verified,
  - HQ cleanup delete succeeded.
- Regression smoke status:
  - `npm run test:supabase:ai-parent-reports` passed,
  - `npm run test:supabase:parent-updates:write` passed.
- Safety boundaries reaffirmed:
  - no service-role usage in frontend,
  - no parent audit-read grant,
  - audit writes remain non-blocking to primary user actions,
  - metadata sanitization retained,
  - no tokens/secrets/raw provider payload bodies logged.
- Recommended next milestone:
  - expand audit coverage to additional high-value write actions, then add lightweight authorized staff review/report tooling before notifications/email/session-tracking implementation.

### Audit events phase 2 operational actions note (2026-05-04)

- New checkpoint doc:
  - `docs/audit-events-phase2-operational-actions-checkpoint.md`
- Added operational audit actions in existing write services:
  - `student_attendance.updated` via `updateAttendanceRecord(...)`,
  - `staff_time_clock.clocked_in` via `clockInStaff(...)`,
  - `staff_time_clock.clocked_out` via `clockOutStaff(...)`,
  - `class_memory.released` via `approveClassMemory(...)`,
  - `fee_payment_proof.verified` via `verifyFeeReceipt(...)`,
  - `fee_payment_proof.rejected` via `rejectFeeReceipt(...)`.
- Metadata safety posture for phase 2:
  - no GPS coordinates, no selfie/proof URL paths, no full note/comment bodies, no raw receipt/provider payloads.
- Boundaries preserved:
  - no SQL/RLS change,
  - no frontend service-role usage,
  - no notification/email/session-tracking implementation,
  - audit writes remain non-blocking (dev warning only on audit failure).
- Intentional skips in phase 2:
  - `student_attendance.marked` skipped (existing stable write path is update),
  - `class_memory.shared_with_family` skipped (current lifecycle semantics are approve/release).

### Branch-supervisor audit compatibility fix note (2026-05-04)

- Focused diagnosis completed for branch-supervisor audit warnings in fee verification flow.
- Root cause:
  - fee audit events were written without `branch_id`, and supervisor branch-scoped select policy does not expose null-branch rows.
  - because `recordAuditEvent` inserts with returning select, missing branch scope surfaced as audit RLS denial in warning logs.
- Minimal fix applied in write service only:
  - `verifyFeeReceipt(...)` now includes `branch_id` in update return fields and passes it into `recordAuditEvent`,
  - `rejectFeeReceipt(...)` now includes `branch_id` in update return fields and passes it into `recordAuditEvent`.
- No SQL migration in this fix:
  - no RLS widening,
  - no parent/student access change,
  - no service-role usage,
  - audit writes remain non-blocking.

### Class memories supervisor approval smoke fixture fix note (2026-05-04)

- Remaining warning diagnosis completed for `test:supabase:class-memories:approval`.
- Root cause:
  - smoke script selected teacher-visible latest class without forcing supervisor-branch alignment,
  - selected class could be outside supervisor branch scope,
  - supervisor approve/reject/hide calls were then correctly blocked by branch-scoped class memories update policy.
- Fix applied (test-only, minimal):
  - `scripts/supabase-class-memories-approval-smoke-test.mjs` now resolves supervisor branch first and constrains teacher fixture class lookup to that branch.
  - script now fails fast if selected class branch mismatches supervisor branch.
- Boundaries preserved:
  - no SQL/RLS changes,
  - no runtime product UI/service behavior changes,
  - no parent/student visibility widening.

### ParentView UAT polish note (2026-05-06)

- Root-cause diagnosis completed for logout 404 (`/api/apps/auth/logout?...`) seen during manual walkthrough.
- Root cause:
  - legacy Base44 auth redirects were still reachable via `AuthContext` (`base44.auth.logout(window.location.href)` and `base44.auth.redirectToLogin(window.location.href)`), which can route to Base44 API paths not served in this local app shell.
- Safe routing fix applied:
  - sidebar real-mode sign out remains Supabase-primary (`signOutSupabasePrimary`) and redirects to `/login`,
  - demo mode sign out remains route-local to `/welcome`,
  - AuthContext login redirect now uses local `/login` route with safe returnUrl query,
  - Base44 cleanup is kept non-navigating/best-effort only.
- Parent UX polish applied:
  - parent sidebar now includes `Settings` (`/parent-view#parent-settings`),
  - ParentView now groups communication preferences + Active Sessions under a dedicated Settings section,
  - quick action label updated to `Settings`.
- Class Memories real-mode empty behavior updated:
  - when no released real memories exist, ParentView now shows a warm empty state message,
  - demo-only wording remains limited to demo mode.
- Notification label polish:
  - `Class memories and photo-related updates` shortened to `Class memories`,
  - added subtitle `Photo updates from your child's class.`
- Parent announcements status:
  - existing safe parent-facing source already exists (`listParentAnnouncements` with published filtering),
  - empty state copy updated to centre-updates placeholder text rather than adding new data path.
- Boundaries preserved:
  - no SQL/RLS change,
  - no service-role frontend,
  - no email/SMS/push,
  - no realtime chat,
  - no draft/internal/evidence visibility expansion.

### Parent/Teacher UX cleanup note (2026-05-06)

- Scope limited to small UI/UX polish and one safe teacher-page bug fix.
- Parent information architecture polish:
  - parent landing now prioritizes content flow (updates, memories, notifications, quick access),
  - settings remains a dedicated destination (`#parent-settings`) for communication + account security.
- Parent navigation polish:
  - parent sidebar now emphasizes `Updates` and keeps a lean sequence: home, updates, attendance, homework, reports, settings.
- Homework UX polish in parent view:
  - added status filters (`All`, `Assigned`, `Submitted`, `Under review`, `Feedback released`),
  - added cleaner open/hide detail behavior to reduce long-list scanning burden.
- Teacher "My Students" blank-page fix:
  - root cause in UI filtering: teacher card list depended on class-list intersection; when class metadata is temporarily empty, student cards collapsed to empty.
  - minimal fix: fallback to teacher-scoped student rows when class metadata list is empty.
  - no permission widening or RLS changes.
- Parent Communication wording cleanup:
  - replaced rigid `Step 1/2/3` labels in the teacher workspace with clearer task-oriented headings (`Class Memory`, `Choose update type`, `Choose class and student`).
- Memories targeting rule clarified:
  - parent-side Class Memories copy now states that only released memories for linked child/class appear.
  - no branch-wide visibility expansion.
- Parent enrollment / class-linking product rule checkpoint:
  - staff/HQ remains source-of-truth for branch/class assignment,
  - parent links to existing student record and does not self-assign class membership.
- Boundaries preserved:
  - no backend/provider lane expansion,
  - no SQL/RLS changes,
  - no email/SMS/push/chat implementation.

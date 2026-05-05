# Session Governance + Remember Me Plan

Date: 2026-05-05  
Type: planning + diagnosis checkpoint only (no code/SQL/RLS/auth-config changes)

## 2026-05-05 checkpoint addendum (043 applied + verified)

- Recorded manual apply of `supabase/sql/043_auth_sessions_foundation.sql` via Supabase SQL Editor.
- Verified post-apply smoke run:
  - `test:supabase:auth-sessions`
  - `test:supabase:audit-events`
  - `test:supabase:auth-lifecycle-audit`
- Verified auth_sessions RLS outcomes:
  - parent self create/read/update allowed
  - parent cross-profile create blocked
  - student/teacher cross-profile reads blocked
  - HQ read + revoke allowed
  - delete blocked
- Privacy-safe boundary remains unchanged:
  - no raw IP/exact location/full user-agent/fingerprinting/token storage fields.
- Runtime status remains unchanged:
  - auth session inventory exists in DB but is not yet wired into login/timeout runtime flows.
  - `audit_events` continues as immutable lifecycle history.
- Next implementation lane:
  - Phase 1E Step 2 tiny runtime wiring (login create + sign-out/timeout status updates).

## 2026-05-05 implementation checkpoint addendum (Phase 1E Step 1 auth_sessions foundation)

- Added conservative server-backed session foundation migration:
  - `supabase/sql/043_auth_sessions_foundation.sql`
- `auth_sessions` table now defined for future inventory/revocation state (not wired into login/runtime flow yet).
- Included v1 fields:
  - session identity/status/timestamps/revocation fields
  - `safe_device_label`
  - no raw IP/full user-agent/fingerprint/token fields
- RLS v1:
  - self insert/select/update
  - HQ select/update (revocation context)
  - branch supervisor session read/update deferred for safer initial scope
  - no delete policy
- Added minimal helper foundation (not yet runtime-wired):
  - read: `listMyAuthSessions`, `listAuthSessionsForAdmin`
  - write: `createAuthSession`, `updateAuthSessionHeartbeat`, `markAuthSessionSignedOut`, `markAuthSessionTimedOut`, `revokeAuthSession`
- Added smoke + script:
  - `scripts/supabase-auth-sessions-smoke-test.mjs`
  - `test:supabase:auth-sessions`
- Migration apply note:
  - CLI apply failed due linked DB credential/login role requirement.
  - manual SQL Editor apply required before auth-sessions smoke can fully pass.
- Current behavior unchanged:
  - Login/AppLayout/session timeout/sign-out runtime behavior is unchanged in this step.

## 2026-05-05 planning checkpoint addendum (Phase 1E session revocation + multi-device governance)

- Current baseline remains stable through Phase 1D:
  - Supabase-primary sign-out
  - remember-me UI preference
  - app-level timeout/browser marker enforcement
  - auth lifecycle audit events with write-only mode where appropriate
- Missing capabilities for true multi-device governance:
  - no server-backed session inventory
  - no cross-device revoke orchestration
  - no sign-out-all-devices flow
  - no admin/HQ session revoke workflow
- Key planning decision:
  - client-only markers cannot revoke other devices; future Phase 1E requires server-backed `auth_sessions`/`user_sessions` model.
- Future policy direction:
  - parent self: own-session revoke + logout-all-devices
  - teacher: own-session revoke only
  - HQ: staff session revoke + account disable handling
  - system: automatic revoke on policy triggers (account disabled, role/link changes)
- Privacy posture:
  - v1 metadata should remain timestamp/status/reason/role based only.
  - no raw IP, exact location, full user-agent, GPS, or fingerprinting until legal/privacy wording is approved.
- New detailed planning artifact:
  - `docs/session-revocation-multidevice-governance-plan.md`

## 2026-05-05 stability checkpoint addendum (logout audit warning)

- Root cause of warning `recordAuthLifecycleAudit.user.logout`:
  - `recordAuditEvent` used `insert(...).select(...).maybeSingle()` for all audit writes.
  - Parent role has insert permission on `audit_events` but no generic select policy.
  - During logout audit writes, the `RETURNING` read path could be denied by RLS, producing a warning despite non-blocking flow.
- Safety posture:
  - No auth/RLS policy weakening and no SQL migration were needed.
  - Auth/session behavior remains unchanged; audit writes stay best-effort and non-blocking.
- Applied minimal runtime fix:
  - Added optional write-only mode for auth lifecycle audit writes (`includeResultRow: false`) so logout/login/timeout audit events no longer require select visibility.
  - Kept row-return mode available for smoke/helper paths that intentionally validate inserted rows.
- Validation outcome:
  - `build`, `lint`, `typecheck`, `test:supabase:audit-events`, `test:supabase:auth-lifecycle-audit` passed.
  - Regression checks `test:supabase:notifications` and `test:supabase:parent-notification-preferences` passed.

## 2026-05-05 implementation checkpoint addendum (Phase 1A)

- Implemented runtime auth authority/sign-out alignment (small safe fix).
- `Sidebar` sign-out now uses Supabase-primary helper path, not Base44 as primary authority.
- New helper in `src/services/supabaseAuthService.js`: `signOutSupabasePrimary()`
  - Supabase sign-out runs first (source of truth).
  - Legacy Base44 logout is best-effort cleanup only.
  - Clears only safe session UI keys used for popup session state:
    - `companyNewsPopupSessionShownIds`
    - `companyNewsPopupSessionHiddenIds`
- `demoRole` preview safety:
  - sidebar sign-out in demo mode exits to `/welcome` without mutating real Supabase session.
  - demo preview remains URL-based and available.
- Still not implemented in this phase:
  - remember-me checkbox
  - inactivity timeout
  - session tracking table / SQL
  - Supabase auth settings changes

## 2026-05-05 implementation checkpoint addendum (Phase 1B)

- Added login UX for remember-me intent in `src/pages/Login.jsx`:
  - checkbox: `Keep me signed in on this device`
  - helper copy: `Use this only on a private device. You can sign out anytime.`
- Added non-sensitive UI preference persistence only:
  - localStorage key: `enrichify_keep_signed_in` (`1` / `0`)
  - stores user preference for future session policy wiring
  - does not store passwords or tokens
- Important behavior note:
  - Supabase client is still a singleton created with default options in `src/services/supabaseClient.js`.
  - This means effective session persistence remains Supabase default in this phase.
  - Unchecked state is currently a declared preference, not a fully enforced session-only mode.
- Sign-out behavior remains from Phase 1A:
  - `signOutSupabasePrimary()` always clears active Supabase session.
  - legacy Base44 cleanup remains best-effort only.
- Deferred to next phase:
  - enforce unchecked mode with shorter/session-only persistence strategy
  - inactivity timeout + audit/session governance controls

## 2026-05-05 implementation checkpoint addendum (Phase 1C)

- Added app-level session enforcement v1 without SQL/RLS/Supabase-dashboard changes.
- New helper: `src/services/sessionGovernanceService.js`.
- Storage keys used:
  - localStorage:
    - `enrichify_keep_signed_in` (`1`/`0`)
    - `enrichify_session_started_at` (ms timestamp)
    - `enrichify_last_active_at` (ms timestamp)
  - sessionStorage:
    - `enrichify_active_browser_session` (`1`)
- Login behavior:
  - On successful real sign-in, app initializes session markers (`session_started`, `last_active`, `active_browser_session`).
- App load behavior (real mode, no `demoRole`):
  - if Supabase session exists and `keep_signed_in !== 1` and browser-session marker is missing, app signs out Supabase-primary and redirects to `/login?session=expired`.
  - otherwise marker/activity are refreshed.
- Inactivity timeout policy implemented:
  - parent/student: keep signed in = 12h, unchecked = 2h
  - teacher: 2h
  - branch supervisor/hq admin: 1h
  - unknown role fallback: 1h
- Activity signals used: `click`, `keydown`, `touchstart`, `focus`, `mousemove` (mousemove throttled).
- Sign-out behavior:
  - manual and timeout sign-out clear active session markers (`active_browser_session`, `session_started_at`, `last_active_at`)
  - `enrichify_keep_signed_in` is retained as user UI preference
  - Supabase session remains the authority for actual logout.
- Demo safety:
  - `demoRole` bypasses enforcement and timers.
- Optional UX:
  - login now shows safe notice on timeout redirect: `Your session expired for security. Please sign in again.`

Limitations (still deferred):

- No server-backed session audit/revocation table yet.
- No cross-device revocation controls yet.
- No role-specific remember-me eligibility toggles yet.

## 2026-05-05 QA checkpoint (Phase 1C)

Inspection-confirmed behavior:

- Active browser-session marker is set:
  - on successful login via `initializeSessionGovernanceOnSignIn()`
  - on allowed real-mode app load in `AppLayout` (`setActiveBrowserSessionMarker()` path)
- Marker/session timestamps are cleared in `signOutSupabasePrimary()` via `clearSessionGovernanceMarkers()`.
- Inactivity timeout is enforced in `AppLayout` with role-aware durations from `getInactivityTimeoutMsForRole()`.

Manual browser QA checklist:

Parent:

- Sign in with **Keep me signed in** checked.
- Sign in with **Keep me signed in** unchecked.
- Refresh current tab.
- Open a new tab and verify unchecked behavior (new-tab marker limitation acknowledged).
- Sign out from sidebar.
- Confirm `ParentView` is not accessible without re-sign-in.

Teacher:

- Sign in and confirm staff pages load.
- Sign out from sidebar.
- Confirm staff pages are not accessible without re-sign-in.

Demo:

- Open parent/student demo URLs with `?demoRole=...`.
- Confirm demo preview remains functional.
- Confirm demo sign-out exits demo without corrupting real Supabase session.

Timeout:

- Real timeout windows are long by design (1h/2h/12h), so full wait-time manual QA is often impractical in routine checks.
- No temporary debug timeout override was added in this phase to avoid introducing extra runtime risk.

Known limitations captured in QA:

- Unchecked remember-me uses per-tab `sessionStorage` marker, so opening a new tab may sign out a restored session (conservative behavior).
- `test:supabase:auth` remains blocked by pre-existing Base44 alias/import hygiene issue (`@/lib` resolution in smoke runtime), unrelated to Phase 1C logic.

## Phase 1D implementation plan (next)

Goal: add auth lifecycle audit foundation while preserving privacy boundaries and current auth authority model.

Recommended direction:

- Prefer existing `audit_events` if event taxonomy expansion is sufficient and operationally clean.
- If needed, add minimal dedicated auth lifecycle table in a later migration (`auth_session_events` / `user_session_events`) with strict scope and no sensitive payloads.

Target events to capture:

- `user.login`
- `user.logout`
- `user.session_timeout`
- `user.remember_me_enabled`
- `user.remember_me_disabled`
- `user.session_revoked` (future)

Privacy-safe metadata only (v1):

- role
- remember_me_enabled boolean
- reason
- safe timestamp context
- no passwords, no tokens, no raw IP, no exact location, no full user-agent string

Deferred pending legal/compliance + privacy notice review:

- IP handling/fingerprinting/device fingerprinting
- expanded device telemetry and retention policy

## 2026-05-05 implementation checkpoint addendum (Phase 1D)

Implemented auth lifecycle audit foundation using existing `audit_events` (no new table/migration).

Event taxonomy now written by app runtime:

- `user.login`
- `user.logout`
- `user.session_timeout`
- `user.remember_me_enabled`
- `user.remember_me_disabled`

Entity type used:

- `user_session`

Write points:

- Login success path in `src/pages/Login.jsx`:
  - writes `user.login`
  - writes remember-me toggle event when login checkbox preference changes
- Manual sign-out path in `src/services/supabaseAuthService.js`:
  - writes `user.logout` before Supabase sign-out (best-effort, non-blocking)
- Inactivity timeout path in `src/components/layout/AppLayout.jsx`:
  - writes `user.session_timeout` before timeout sign-out (best-effort, non-blocking)

Helper:

- Added `recordAuthLifecycleAudit(...)` in `src/services/supabaseWriteService.js`.
- Uses existing `recordAuditEvent(...)` and metadata sanitizer; no secrets/tokens/password fields are written.

Privacy-safe metadata in auth lifecycle events:

- `role`
- `rememberMeEnabled`
- `reason`
- `source`

Excluded:

- passwords
- tokens
- raw IP
- full user agent
- exact device fingerprint
- child/student data

Failure behavior:

- Audit writes are non-blocking.
- Sign-in/sign-out/timeout flows proceed even if audit write fails.
- Dev-only warning pattern used through existing audit warning path.

Demo behavior:

- No auth lifecycle audit writes in demoRole timeout/sign-out paths.

Validation/smoke:

- Added `scripts/supabase-auth-lifecycle-audit-smoke-test.mjs`.
- Added npm script `test:supabase:auth-lifecycle-audit`.
- Existing `test:supabase:auth` alias/import issue remains a separate pre-existing hygiene item.

## Scope and hard constraints

- This checkpoint is planning-only.
- No runtime auth behavior changes.
- No Supabase Auth settings changes.
- No SQL or RLS changes.
- No password storage changes (passwords must never be stored).
- No email/Gmail/SMS/push implementation.

## Part A — Diagnosis (current state)

1. Which auth system is the real source of login now?
- Mixed.
- Real login form uses Supabase Auth (`signInWithEmailPassword` in `supabaseAuthService`).
- Legacy Base44 paths still exist (`authService.getCurrentUser`, `base44.auth.logout` in sidebar, legacy `AuthContext` file).
- Effective runtime identity in app shell prefers Supabase auth state and falls back to Base44/demo path.

2. Where is current login form implemented?
- `src/pages/Login.jsx` (primary sign-in UI).
- `src/pages/AuthPreview.jsx` is a dev/testing auth surface.

3. Does app currently use localStorage/sessionStorage/Supabase persistence?
- `sessionStorage` is used in `AppLayout` for per-tab company-news popup shown/hidden IDs.
- Local storage is used by legacy app params (`src/lib/app-params.js`) for Base44 token/app params persistence.
- Supabase session persistence uses Supabase client defaults (see below).

4. Does Supabase client currently persist sessions by default?
- Yes, likely yes by default.
- `src/services/supabaseClient.js` creates client with default options (`createClient(url, anonKey)`), so default `auth.persistSession = true` behavior applies unless overridden elsewhere.

5. Where is sign out handled?
- Supabase sign-out helper: `src/services/supabaseAuthService.js` via `supabase.auth.signOut()`.
- Login/Auth preview pages call Supabase `signOut`.
- Sidebar sign-out still calls Base44 logout (`base44.auth.logout()`), creating mixed logout behavior risk.

6. Does app currently have inactivity timeout?
- No explicit inactivity timeout enforcement found in inspected app code.

7. Does app currently track session/device/login audit?
- No dedicated session/device table or explicit login/session audit event model found for auth lifecycle in current implementation.

8. Risks if we just add a remember-me checkbox now?
- Inconsistent behavior because auth stack is mixed (Supabase + Base44/logout split).
- Persistent sessions could remain active longer than intended for staff/HQ.
- No inactivity timeout or central revoke model increases account takeover/shared-device risk.
- No clear session audit trail for login/logout/timeout/revocation.
- Legal/privacy risk if device/session tracking metadata is introduced without policy wording/review.

9. Which roles need stricter session rules?
- Strictest: `hq_admin`, `branch_supervisor`.
- Next: `teacher`.
- Moderate: `parent`.
- Moderate/shorter UX: `student` (short sessions appropriate for shared devices).

10. Safest implementation sequence?
- First unify auth/session authority and logout behavior (Supabase-primary in real mode).
- Then define/enforce role-based session timeout and remember-me duration policy.
- Then add remember-me UX checkbox and helper copy.
- Then add session/audit tracking model and revoke flow.
- Then add sensitive-action re-auth for staff/HQ paths.

## Part B — Recommended role-based session policy (future implementation)

### Global rules

- Manual **Sign Out** must clear active session state on this device.
- Never store passwords in local/session storage.
- No service-role key in frontend.
- No hidden tracking or bundled legal consent in login checkbox UX.

### Parents

- Show checkbox: `Keep me signed in on this device`.
- If unchecked: normal session persistence window.
- If checked: longer trusted-device session window.
- Preserve easy manual sign-out.

### Students

- Similar checkbox model, but shorter max duration than parent.
- Favor shorter inactivity timeout due to shared/home device patterns.

### Teachers

- Shorter inactivity timeout than parent/student.
- Remember-me allowed only with shorter persistence window and stronger timeout controls.
- Future sensitive actions can require recent auth.

### Branch supervisors + HQ admins

- Strictest inactivity timeout and tighter absolute session maximums.
- V1 recommendation: disable remember-me for these roles, or allow with very short trust window only.
- Future re-auth required for sensitive actions (finance verification, role/access changes, release governance actions).

## Part C — Future session tracking concept (planning only, no SQL yet)

Potential future table: `auth_sessions` (or `user_sessions`).

Suggested fields:

- `id`
- `profile_id`
- `role`
- `session_started_at`
- `last_seen_at`
- `signed_out_at`
- `remember_me_enabled`
- `device_label`
- `browser_summary`
- `user_agent_hash`
- `ip_hash` (or coarse network metadata, only after legal/privacy review)
- `revoked_at`
- `revoke_reason`
- `created_at`

Future audit event taxonomy:

- `user.login`
- `user.logout`
- `user.session_timeout`
- `user.session_revoked`
- `user.remember_me_enabled`

Note: This section is planning only; no schema or event write implementation in this checkpoint.

## Part D — Remember-me UX recommendation

Checkbox label:

- `Keep me signed in on this device`

Helper copy:

- `Use this only on a private device. You can sign out anytime.`

UX guidance:

- Keep one simple checkbox.
- Avoid scary legal/security wording.
- Do not combine with policy consent acknowledgements.
- Keep login reassuring while still clear about private-device usage.

## Part E — Security and legal notes

- Legal/compliance review required before real parent rollout of persistent login behavior.
- Malaysia PDPA/privacy requirements must be reviewed for session/device metadata collection and retention.
- Child data protection requires conservative defaults and staff/HQ strict controls.
- Staff/HQ session controls should be stricter than parent/student.
- Session/device tracking needs clear privacy notice wording before implementation.
- Do not ship persistent-login behavior without approved policy wording and retention/revocation approach.

## Part F — Recommended phased implementation sequence

1. Auth authority alignment:
- Make Supabase auth the single runtime authority for real-mode login/session/logout.
- Remove/contain legacy Base44 logout fallback in real-mode UI.

2. Policy configuration:
- Define role-based idle timeout + absolute session windows.
- Define role-based remember-me eligibility/duration policy.

3. UX:
- Add login checkbox + helper copy.
- Keep default behavior safe and explicit.

4. Session/audit foundation:
- Add session tracking schema and auth lifecycle audit events.
- Add revoke and timeout handling paths.

5. Sensitive action hardening:
- Add step-up/re-auth for selected staff/HQ sensitive operations.

6. Privacy/compliance closeout:
- Finalize privacy notice wording for session/device metadata.
- Validate retention/deletion policy and incident response runbook.

## Risks summary

- Mixed auth/logout paths can produce inconsistent sign-out and persistence behavior.
- Remember-me without timeout/revoke/audit controls expands unattended-device exposure risk.
- Staff/HQ roles have higher blast radius and need stricter defaults.
- Session/device telemetry without legal wording creates compliance and trust risk.

---

Planning checkpoint complete. No app code, auth behavior, SQL, RLS, or Supabase settings changed.

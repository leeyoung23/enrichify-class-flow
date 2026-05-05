# Session Governance + Remember Me Plan

Date: 2026-05-05  
Type: planning + diagnosis checkpoint only (no code/SQL/RLS/auth-config changes)

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

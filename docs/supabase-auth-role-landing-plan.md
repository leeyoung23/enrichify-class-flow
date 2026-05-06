# Supabase auth: role-based post-login landing

This document records the implemented **role-based post-login landing** behaviour for real Supabase login while keeping existing auth guard and preview contracts intact.

**Related:** `docs/product-feature-gap-audit.md` remains the master product checklist. Phase 3C context: `docs/supabase-auth-phase-3c-login-hardening-plan.md` (3C-3 = post-login routing).

**Repo checkpoint (confirmed):** Latest pushed commit at plan time: `09f8872` — protected auth redirect targets `/login`.

---

## 1. Current behavior

### Sign-in and navigation (`/login`)

- **`/login`** is a **public** route (outside `AuthProvider` / `AuthenticatedApp` in `src/App.jsx`).
- After successful **`signInWithEmailPassword`**, the page loads **`profiles`** via **`getCurrentProfile()`**, requires a row, calls **`refreshAuthState()`**, then navigates via **`goAfterSignIn()`** in `src/pages/Login.jsx`.
- **`goAfterSignIn`** uses **`parseReturnUrlQueryParam(searchParams.get("returnUrl"))`** from `src/lib/supabaseAuthReturnUrl.js`. If the value is **safe and internal**, navigation goes there; otherwise **`"/"`**.
- There is **no** role-based branch today: default landing when `returnUrl` is absent or invalid is always **`/`**.

### `AppLayout` and Supabase `appUser`

- When **`demoRole`** is **not** set, **`SupabaseAuthStateProvider`** resolves session + profile; **`mapProfileToAppUser`** builds **`appUser`** for layout/permissions (see `src/services/supabaseAuthService.js`, `src/hooks/useSupabaseAuthState.jsx`, `src/components/layout/AppLayout.jsx`).
- **`demoRole`** remains a **URL-only** preview override: **`getSelectedDemoRole()`** wins first; Supabase does not replace demo identity on that path.

### `demoRole` preview

- Unchanged contract: query param drives **`getDemoUser`**, demo datasets, and sidebar behaviour. This plan **must not** conflate DB role with demo preview or remove **`demoRole`**.

---

## 2. Final landing behaviour (implemented)

After **successful real Supabase login** (session + profile + mapped **`appUser`**):

1. **If a safe `returnUrl` exists** in the login query string, navigate there **first** (same rules as today: internal path only, no open redirect).
2. **Otherwise** navigate to the **role default** derived from **`profiles.role`** via **`mapProfileToAppUser`** → **`appUser.role`** (normalised through **`permissionService.getRole`**).

### Default landing by role

| `profiles.role` (normalised app role) | Default path | Notes |
|--------------------------------------|--------------|--------|
| `hq_admin` | `/` | Dashboard under `AppLayout`. |
| `branch_supervisor` | `/` | Same. |
| `teacher` | `/` | Same. |
| `parent` | `/parent-view` (or `/parent-view?student=<id>`) | Landing helper appends `student` query when `linked_student_id`/`student_id` is present on `appUser`. |
| `student` | `/parent-view` (or `/parent-view?student=<id>`) | **There is no `/student-portal` route** in `src/App.jsx`. Student currently lands on `ParentView` path. |

**Route inspection summary:** `src/App.jsx` defines **`/parent-view`** → **`ParentView`** only for family/student shell; no separate student path exists today.

---

## 3. Role mapping rules

- **Source of truth:** **`public.profiles.role`** loaded after sign-in, mapped with **`mapProfileToAppUser(profile)`** in `src/services/supabaseAuthService.js` (uses **`getRole({ role: profile.role })`**).
- **Do not** allow any client-only “role picker” or localStorage role to **override** **`profiles.role`** for **authorization** or **default landing** for real sessions.
- **`demoRole`** stays **separate**: URL-based preview only; evaluated **before** Supabase session gate in **`AuthenticatedApp`**; must remain **unaffected** by post-login role defaults.

---

## 4. `returnUrl` rule

| Rule | Detail |
|------|--------|
| Precedence | **Safe `returnUrl` wins** over role default when present on **`/login`** after sign-in. |
| Safety | Reuse **`parseReturnUrlQueryParam`** / **`isSafeInternalAppPath`**: same-origin relative path starting with **`/`**, not `//`; length cap; strip hash on validation as today. |
| Loop prevention | **Reject** **`/login`** and **`/auth-preview`** as `returnUrl` targets (already enforced in `src/lib/supabaseAuthReturnUrl.js`). |
| Fallback | If `returnUrl` is missing, malformed, or unsafe → navigate to **role default** (§2). |
| Coordination | **`sanitizeReturnUrlForRedirect`** on the session gate already avoids sending users back to **`/login`** as the stored return target; keep behaviour aligned when implementing role defaults in **`Login`** only. |

---

## 5. Risks

| Risk | Mitigation idea (implementation phase) |
|------|----------------------------------------|
| **Parent/student needs `linked_student_id`** | **`mapProfileToAppUser`** already exposes **`linked_student_id` / `student_id`**. If landing on **`/parent-view`** without **`?student=`** breaks UX, optionally append **`?student=<linked_student_id>`** when present; if missing, still land on **`/parent-view`** and let the page show empty-state / guidance (no new writes in this plan). |
| **Missing profile** | Already handled: no profile → sign-out + error on login; signed-in without profile → **`SupabaseProfileMissing`** / login “profile not ready”. Role default does not apply until **`appUser`** exists. |
| **Wrong route path** | No **`/student-portal`** in repo — do **not** invent that path without adding a route; use **`/parent-view`** for student default until product adds a dedicated route. |
| **Redirect loop** | Keep **`/login`** / **`/auth-preview`** excluded from `returnUrl`; do not set `returnUrl` to post-login destination that immediately bounces to login. |
| **`demoRole` accidentally affected** | Implement landing only in **real login success path** (e.g. **`Login.jsx`** `goAfterSignIn` or a small helper used **only** when **`demoRole`** is absent). Do not change **`getSelectedDemoRole()`** precedence in **`AppLayout`** / **`AuthenticatedApp`**. |
| **Stale session** | **`refreshAuthState()`** before navigate; if session refresh fails, surface error instead of guessing landing. |

---

## 6. Acceptance criteria status

Implemented without changing protected-route rules (`AuthenticatedApp` session gate remains as-is):

- **`/login`** remains **public**.
- **`/auth-preview`** remains **public** / dev-only.
- **`demoRole`** preview still works (all supported roles + **`/parent-view`** flows).
- Signed-in **HQ admin** lands on **`/`** when no safe `returnUrl` (and still respects `returnUrl` when provided).
- Signed-in **teacher** lands on **`/`** under the same rules.
- Signed-in **parent** lands on **`/parent-view`** (or `returnUrl` if safe).
- Signed-in **student** lands on **`/parent-view`** (or `returnUrl` if safe) — **not** a non-existent **`/student-portal`** unless a route is added first.
- **`returnUrl`** still works for valid internal destinations.
- **`npm run build`**, **`lint`**, **`typecheck`**, **`test:supabase:read`**, **`test:supabase:auth`** pass.

---

## 7. Implementation notes

Implemented in:

- `src/lib/roleLanding.js` (`getDefaultLandingPathForRole`)
- `src/pages/Login.jsx` (`goAfterSignIn` now prioritises safe `returnUrl`, then role default)

Behaviour details:

1. After successful sign-in + profile load + `refreshAuthState`, login computes destination:
   - Safe `returnUrl` (via `parseReturnUrlQueryParam`) first.
   - Else `getDefaultLandingPathForRole(mappedAppUser)`.
   - Else `/`.
2. Role remains sourced from `profiles.role` through `mapProfileToAppUser`.
3. `demoRole` preview override remains unchanged and separate.

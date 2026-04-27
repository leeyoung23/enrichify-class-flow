# Supabase Auth — Phase 3C login / redirect hardening plan

**Phase 3C-1** (session gate + safe **`returnUrl`**) and **3C-2** (signed-out protected redirect to **`/login`**) are implemented in **`src/App.jsx`** (`AuthenticatedApp`), **`src/pages/Login.jsx`**, **`src/pages/AuthPreview.jsx`**, and **`src/lib/supabaseAuthReturnUrl.js`**. **`AppLayout`** permission rules are unchanged. **`/auth-preview`** stays public and dev-only. **Future:** role-based landing (**3C-3**), password reset, production polish (**3C-4**).

**Related:** `docs/supabase-auth-route-guard-integration-plan.md`, `docs/supabase-auth-phase-3b-checkpoint.md`, `docs/product-feature-gap-audit.md`, `src/components/layout/AppLayout.jsx`, `src/hooks/useSupabaseAuthState.jsx`, `src/services/supabaseAuthService.js`.

---

## 1) Current auth state

| Item | Status |
|------|--------|
| **`demoRole`** | URL `?demoRole=` preview works; **`AppLayout`** resolves identity from **`getDemoUser`** first; Supabase does not override. |
| **`/auth-preview`** | Public route; dev/test Supabase email/password against **fake seed** users — **not** the default forced redirect (**3C-2**). |
| **`/welcome`** | Public marketing-style entry; outside authenticated shell. |
| **`useSupabaseAuthState`** | Provider wraps **`Router`**; exposes **`session`**, **`appUser`**, **`loading`**, etc. |
| **`AppLayout` (Phase 3B)** | When **no `demoRole`**, can use **`appUser`** for **`effectiveUser`** / route permissions; shows a **loading** shell while Supabase resolves; falls back to **`authService.getCurrentUser()`** (Base44-oriented) when no **`appUser`**. |
| **Forced redirects (3C-2)** | When **Supabase is configured**, **`demoRole`** is absent, and auth is **resolved** with **no session**, **`AuthenticatedApp`** redirects to **`/login?returnUrl=…`**. When Supabase is **not configured**, no Supabase-based redirect (legacy **`AppLayout`** fallback unchanged). |
| **Production login UI** | Public **`/login`** — polished portal sign-in (**Phase 1**); forced redirect targets **`/login`** (**3C-2**). |

---

## 2) Target Phase 3C behaviour

| Rule | Target |
|------|--------|
| **`/welcome`** | Remains **public** — never require Supabase session to view. |
| **`/auth-preview`** | Remains **public** and **dev-only**; direct URL for smoke tests — **not** the default gate target (**3C-2**). |
| **Protected app (`/*` under `AppLayout`)** | When **`getSelectedDemoRole()`** is **absent** **and** there is **no valid Supabase session**, **redirect** to **`/login?returnUrl=…`** (sanitised). |
| **Signed-in Supabase user** | With **`profiles`** row mapped to **`appUser`**, user reaches **role-appropriate** routes via existing **`permissionService`** + **`AppLayout`** (no “role picker” overriding **`profiles.role`**). |
| **`demoRole` present** | **No redirect** to login for lack of Supabase session; preview identity wins; do not clear demo user because session is null. |
| **Base44 / legacy** | When **`isSupabaseAuthAvailable`**, the **gate runs before `AppLayout`**; users **without** a Supabase session are sent to **`/login`**. When Supabase is **not** configured, **`AppLayout`** still uses **`getCurrentUser()`** fallback as in Phase **3B**. |

---

## 3) Login UX direction

| Option | Recommendation |
|--------|------------------|
| **Keep `/auth-preview` as dev-only** | **Yes** — direct route for smoke tests and local dev; **3C-2** does **not** remove it. |
| **Polished `/login` + redirect** | **Shipped** — **`/login`** is the customer sign-in surface; **3C-2** sends signed-out protected traffic there. Further **3C-4**: password reset links, deeper polish. |
| **Role selection vs DB role** | **Never** let a client-only “role picker” override **`profiles.role`** for authorization; **`demoRole`** remains the **only** intentional override for **preview**, and only via URL contract. |
| **After login** | Default landing: **`/`** (dashboard); **`permissionService`** + **`AppLayout`** already gate sidebar and routes by **`appUser.role`**; optional **3C-3** refinement: HQ vs teacher deep-links only if product requires (avoid over-engineering). |

---

## 4) Redirect rules (decision table)

| Condition | Action |
|-----------|--------|
| Path is **`/welcome`**, **`/auth-preview`**, or **`/login`** | **Never** hit the protected-shell gate in a way that loops; these routes are **outside** **`AuthenticatedApp`**. |
| **`demoRole`** present (normalised valid role) | **Do not** redirect to login for missing Supabase session; **`AppLayout`** demo branch only. |
| **No `demoRole`**, Supabase **configured**, **`loading`** true | **Do not** redirect yet — wait for resolution (coordinate with existing **`AppLayout`** loading to avoid double bounce). |
| **No `demoRole`**, resolved **no session** | **`Navigate`** to **`/login?returnUrl=…`** (sanitised; **`/login`** excluded from **`returnUrl`** to prevent loops). |
| **No `demoRole`**, **session** exists, **`appUser`** null (e.g. missing **`profiles`** row) | **Do not** send to generic login loop; show **safe in-app error** (“profile missing — contact admin”) or static help; optional single redirect to a **`/complete-profile`** stub later. |
| **Signed out** (`SIGNED_OUT` / explicit sign-out) | Clear client state; next protected navigation → login redirect per row above. |
| **Supabase not configured** | Redirect rules may **skip** Supabase branch and rely on legacy only, or treat as “auth not available” per env policy — **document in code** to avoid locking local dev without env. |

**Implementation locus (future):** Prefer a **single gate** in **`AuthenticatedApp`** (before **`AppLayout`**) or a **thin wrapper route** so **`/welcome`** and **`/auth-preview`** stay outside the gate — align with **`docs/supabase-auth-route-guard-integration-plan.md`** section 5.

---

## 5) Risks

| Risk | Mitigation |
|------|------------|
| **Redirect loops** | **`/login`** and **`/auth-preview`** are **outside** the gated tree; **`returnUrl`** must not target **`/login`** or **`/auth-preview`** (helpers enforce this). |
| **Blocking `/welcome`** | Keep welcome **outside** `AuthProvider` catch-all or ensure guard runs **only** inside authenticated tree. |
| **Blocking `/auth-preview` or `/login`** | Same — public route list must be explicit and tested. |
| **Breaking `demoRole`** | Evaluate **`getSelectedDemoRole()`** **before** any redirect; never redirect demo preview to login. |
| **Stale session** | Rely on **`onAuthStateChange`** + optional focus refresh; on 401 from Supabase, **`refreshAuthState`** / sign-out. |
| **Missing profile row** | Show non-looping error UI; do not treat as “just log in again” indefinitely. |
| **Role mismatch** | Single mapper **`mapProfileToAppUser`**; align enums with **`permissionService.getRole`**. |
| **Loading flicker** | Resolve loading in one place before redirect decision; avoid flashing “access restricted” then login. |

---

## 6) Acceptance criteria (Phase 3C when implemented)

- **`/welcome`** remains reachable **without** login.
- **`/auth-preview`** remains reachable **without** login.
- **`?demoRole=teacher`** and **`?demoRole=hq_admin`** (and other supported demo roles) behave as today for layout and data preview.
- **Signed-in fake teacher** (seed user) can use the app **without** `demoRole` and see **teacher** dashboard / allowed routes.
- **Signed-out** visit to a **protected** route (no `demoRole`, no session) **redirects** to **`/login?returnUrl=…`** **without** infinite loop.
- **`npm run build`**, **`lint`**, **`typecheck`**, **`test:supabase:read`**, **`test:supabase:auth`** pass after code changes.

---

## 7) Recommended implementation sequence

| Sub-phase | Scope |
|-----------|--------|
| **3C-1** | **Done** — session gate, **`returnUrl`** helpers, **`SupabaseProfileMissing`** (no loop), **`AuthPreview`** post-sign-in navigation. |
| **3C-2** | **Done** — forced redirect target is **`/login?returnUrl=…`**; **`/auth-preview`** unchanged as public dev page; **`demoRole`** unchanged. |
| **3C-3** | **Post-login routing** — optional default path by **`profiles.role`** (e.g. parent → **`/parent-view`**); keep **`returnUrl`** when safe. |
| **3C-4** | **Production polish** — branding, accessibility, reset password flow, rate-limit messaging, analytics hooks (product-dependent). |

Schema / RLS / writes remain **out of scope** for Phase 3C.

---

## 8) Historical prompt (3C-1)

**3C-1** originally redirected to **`/auth-preview`**. **3C-2** changed the target to **`/login`** only; public routes and **`returnUrl`** rules are documented in **`docs/supabase-auth-phase-3c-checkpoint.md`**.

---

## Phase 3C implementation notes (exact behaviour)

1. **Public:** **`/welcome`**, **`/auth-preview`**, and **`/login`** are defined **outside** the **`/*`** + **`AuthProvider`** tree — they never run **`AuthenticatedApp`**, so the session gate **cannot** bounce users in a loop off those paths.
2. **`demoRole`:** If **`getSelectedDemoRole()`** is non-null, the Supabase session gate in **`AuthenticatedApp`** is **skipped** entirely — preview behaviour unchanged (including no extra redirect for missing Supabase session).
3. **Supabase off:** If **`!isSupabaseAuthAvailable`**, the gate is **skipped** — same as pre–3C-1 for local dev without env.
4. **Loading:** If the gate applies and **`useSupabaseAuthState().loading`** is true, the **same** full-screen spinner as Base44 auth loading is shown.
5. **No session (gate applies, resolved):** **`Navigate`** to **`/login?returnUrl=<encoded safe path>`** where **`returnUrl`** defaults to **`/`** if the current path would be unsafe (e.g. **`/login`**, **`/auth-preview`**).
6. **Session but no `appUser`:** Renders **`SupabaseProfileMissing`** (copy + link to **`/auth-preview`**); **does not** redirect in a loop.
7. **Sign-in return:** **`Login`** and **`AuthPreview`** after successful profile load call **`navigate(safeReturn)`** when **`returnUrl`** parses to a safe internal path; otherwise **`/`** or stay on preview.

**Next phase:** **3C-3** — optional default landing by **`profiles.role`**; **3C-4** — password reset, production polish.

---

*Document type: planning + implementation notes. Phases **3C-1** and **3C-2** are in code; **3C-3+** are future.*

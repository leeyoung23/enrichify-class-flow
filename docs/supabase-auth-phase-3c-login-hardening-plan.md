# Supabase Auth — Phase 3C login / redirect hardening plan

**Planning only:** no `AppLayout`, `AuthenticatedApp`, `AuthProvider`, or route changes are implied by this file alone. Preserve **`demoRole`**, **`/auth-preview`**, **`/welcome`**, and **demo/local fallback** until product explicitly removes them.

**Related:** `docs/supabase-auth-route-guard-integration-plan.md`, `docs/supabase-auth-phase-3b-checkpoint.md`, `docs/product-feature-gap-audit.md`, `src/App.jsx`, `src/components/layout/AppLayout.jsx`, `src/hooks/useSupabaseAuthState.jsx`, `src/services/supabaseAuthService.js`, `src/pages/AuthPreview.jsx`.

---

## 1) Current auth state

| Item | Status |
|------|--------|
| **`demoRole`** | URL `?demoRole=` preview works; **`AppLayout`** resolves identity from **`getDemoUser`** first; Supabase does not override. |
| **`/auth-preview`** | Public route; Supabase email/password against **fake seed** users for local verification. |
| **`/welcome`** | Public marketing-style entry; outside authenticated shell. |
| **`useSupabaseAuthState`** | Provider wraps **`Router`**; exposes **`session`**, **`appUser`**, **`loading`**, etc. |
| **`AppLayout` (Phase 3B)** | When **no `demoRole`**, can use **`appUser`** for **`effectiveUser`** / route permissions; shows a **loading** shell while Supabase resolves; falls back to **`authService.getCurrentUser()`** (Base44-oriented) when no **`appUser`**. |
| **Forced redirects** | **None** today for “not signed in” on protected routes; unauthenticated users may see restricted/empty shell per existing behaviour. |
| **Production login UI** | Not shipped; **`/auth-preview`** is dev-oriented copy and layout. |

---

## 2) Target Phase 3C behaviour

| Rule | Target |
|------|--------|
| **`/welcome`** | Remains **public** — never require Supabase session to view. |
| **`/auth-preview`** | Remains **public** in **3C-1**; may later **alias** or **redirect** to **`/login`** when a polished page exists. |
| **Protected app (`/*` under `AppLayout`)** | When **`getSelectedDemoRole()`** is **absent** **and** there is **no valid Supabase session** (and optionally **no** acceptable legacy user if still enabled), **redirect** to **`/auth-preview`** (or future **`/login`**) with optional **`returnUrl`** / **`state.from`**. |
| **Signed-in Supabase user** | With **`profiles`** row mapped to **`appUser`**, user reaches **role-appropriate** routes via existing **`permissionService`** + **`AppLayout`** (no “role picker” overriding **`profiles.role`**). |
| **`demoRole` present** | **No redirect** to login for lack of Supabase session; preview identity wins; do not clear demo user because session is null. |
| **Base44 / legacy** | Until removed, define explicit precedence with Phase 3B: **Supabase `appUser`** when session valid; else legacy **`getCurrentUser()`**; Phase 3C redirect should fire only when **both** paths indicate unauthenticated (product decision to confirm in implementation). |

---

## 3) Login UX direction

| Option | Recommendation |
|--------|------------------|
| **Keep `/auth-preview` as dev-only** | **Yes** for **3C-1** — smallest change; reuse existing sign-in form and **`signOut`** for smoke tests and local dev. |
| **Polished `/login` later** | **Yes** — **3C-2 / 3C-4**: marketing-aligned layout, error copy, password reset links, branding; can live at **`/login`** with **`/auth-preview` → `/login`** redirect or deprecation banner. |
| **Role selection vs DB role** | **Never** let a client-only “role picker” override **`profiles.role`** for authorization; **`demoRole`** remains the **only** intentional override for **preview**, and only via URL contract. |
| **After login** | Default landing: **`/`** (dashboard); **`permissionService`** + **`AppLayout`** already gate sidebar and routes by **`appUser.role`**; optional **3C-3** refinement: HQ vs teacher deep-links only if product requires (avoid over-engineering). |

---

## 4) Redirect rules (decision table)

| Condition | Action |
|-----------|--------|
| Path is **`/welcome`** or **`/auth-preview`** | **Never** redirect to login for unauthenticated visitors. |
| **`demoRole`** present (normalised valid role) | **Do not** redirect to login for missing Supabase session; **`AppLayout`** demo branch only. |
| **No `demoRole`**, Supabase **configured**, **`loading`** true | **Do not** redirect yet — wait for resolution (coordinate with existing **`AppLayout`** loading to avoid double bounce). |
| **No `demoRole`**, resolved **no session** / **no `appUser`**, no acceptable **legacy** user | **`Navigate`** to **`/auth-preview?returnUrl=…`** (encode current path + query minus sensitive data). |
| **No `demoRole`**, **session** exists, **`appUser`** null (e.g. missing **`profiles`** row) | **Do not** send to generic login loop; show **safe in-app error** (“profile missing — contact admin”) or static help; optional single redirect to a **`/complete-profile`** stub later. |
| **Signed out** (`SIGNED_OUT` / explicit sign-out) | Clear client state; next protected navigation → login redirect per row above. |
| **Supabase not configured** | Redirect rules may **skip** Supabase branch and rely on legacy only, or treat as “auth not available” per env policy — **document in code** to avoid locking local dev without env. |

**Implementation locus (future):** Prefer a **single gate** in **`AuthenticatedApp`** (before **`AppLayout`**) or a **thin wrapper route** so **`/welcome`** and **`/auth-preview`** stay outside the gate — align with **`docs/supabase-auth-route-guard-integration-plan.md`** section 5.

---

## 5) Risks

| Risk | Mitigation |
|------|------------|
| **Redirect loops** | Login page must be **excluded** from “must be authenticated” guard; do not append **`returnUrl`** pointing to **`/auth-preview`** itself; cap or sanitize **`returnUrl`**. |
| **Blocking `/welcome`** | Keep welcome **outside** `AuthProvider` catch-all or ensure guard runs **only** inside authenticated tree. |
| **Blocking `/auth-preview`** | Same — public route list must be explicit and tested. |
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
- **Signed-out** visit to a **protected** route (no `demoRole`, no session, no legacy user per policy) **redirects** to **`/auth-preview`** (or agreed **`/login`**) **without** infinite loop.
- **`npm run build`**, **`lint`**, **`typecheck`**, **`test:supabase:read`**, **`test:supabase:auth`** pass after code changes.

---

## 7) Recommended implementation sequence

| Sub-phase | Scope |
|-----------|--------|
| **3C-1** | Add **redirect** for unauthenticated protected tree using **existing `/auth-preview`** + **`returnUrl`**; **`demoRole`** and public routes unchanged; minimal copy updates on **`/auth-preview`** if needed (“Sign in to continue”). |
| **3C-2** | Evolve **`/auth-preview`** UI into a **nicer `/login`** (or duplicate page + redirect); shared sign-in logic in a small module to avoid drift. |
| **3C-3** | **Post-login routing** — optional default path by **`profiles.role`** (e.g. parent → **`/parent-view`**); keep **`returnUrl`** when safe. |
| **3C-4** | **Production polish** — branding, accessibility, reset password flow, rate-limit messaging, analytics hooks (product-dependent). |

Schema / RLS / writes remain **out of scope** for Phase 3C.

---

## 8) Next implementation prompt (Phase 3C-1 only)

Copy-paste for a future coding task:

> **Phase 3C-1 — Redirect unauthenticated users to existing `/auth-preview`.**  
> In **`src/App.jsx`** / **`AuthenticatedApp`** (or a dedicated wrapper), after **`AuthProvider`** and **`SupabaseAuthStateProvider`** are available: if the route is **not** public (`/welcome`, `/auth-preview`) and **`getSelectedDemoRole()`** is **null** and **`useSupabaseAuthState()`** reports **not loading** with **no session** / **no `appUser`** (and per product: **no** acceptable **`getCurrentUser()`** legacy user), **`Navigate`** to **`/auth-preview`** with a safe **`returnUrl`** (encode pathname + search; exclude auth-preview self). If **`demoRole`** is set, **never** apply this redirect. If Supabase is **not configured**, do **not** strand users — fall back to legacy-only behaviour. **Do not** remove **`demoRole`** or demo data paths. **Do not** add writes, uploads, or AI calls. Run **`npm run build`**, **`lint`**, **`typecheck`**, **`test:supabase:read`**, **`test:supabase:auth`**.

---

*Document type: planning. Phase 3C is not implemented until the above prompts are executed in code.*

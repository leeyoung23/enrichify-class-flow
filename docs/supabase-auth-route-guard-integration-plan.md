# Supabase Auth Route Guard Integration Plan

Planning only: safest way to evolve **`AppLayout`**, **`AuthProvider`**, and **route access** so **real Supabase Auth** can coexist with **`demoRole`** and **demo/local fallbacks**. **No implementation is required** by this document alone.

Related: `docs/supabase-auth-transition-plan.md`, `src/services/supabaseAuthService.js`, `src/services/authService.js`, `src/services/permissionService.js`, `src/components/layout/AppLayout.jsx`, `src/lib/AuthContext.jsx`, `src/App.jsx`.

---

## 1) Current route guard behavior

- **`App.jsx`:** Public routes **`/auth-preview`** and **`/welcome`** sit **outside** `AuthProvider`. The catch-all **`/*`** wraps **`AuthenticatedApp`** in **`AuthProvider`** (Base44-oriented loading and `authError` handling).

- **`AuthenticatedApp`:** While `isLoadingPublicSettings` or `isLoadingAuth`, shows a full-screen spinner. On `auth_required`, calls `navigateToLogin()` (Base44 flow). Then renders **`AppLayout`**-wrapped routes.

- **`AppLayout`:** Reads **`demoRole`** from the URL (`getSelectedDemoRole()`). If set, **`effectiveUser`** comes from **`getDemoUser(demoRole)`** and **`role`** is that demo role. If not set, loads **`getCurrentUser()`** from **`authService`** (Base44 `base44.auth.me()`), normalises role, computes **`effectiveUser`**. **`showSidebar`** is true when **`role`** is truthy. **`permissionService.isRouteAllowed(role, pathname)`** gates the current path; if disallowed, shows “Access restricted” with sidebar + **`DemoRoleSwitcher`**.

- **Data reads:** **`dataService`** uses **`getSelectedDemoRole()`** to prefer demo datasets when demo is active; otherwise Supabase read paths when configured.

**Summary today:** Route and sidebar identity are **`demoRole`-first**, else **Base44 user**; **Supabase session** is not yet the source of truth for `AppLayout`.

---

## 2) How `demoRole` should continue to override everything for preview

- **Rule:** If **`getSelectedDemoRole()`** returns a normalised role, **skip** Supabase session resolution for layout identity (same as today): use **`getDemoUser(demoRole)`** and demo data rules.

- **Implementation guard:** Any new hook or effect must **short-circuit** when `demoRole` is present—**never** clear demo user because Supabase has no session, and **never** redirect demo users to login.

- **URL contract:** Keep **`?demoRole=`** as the explicit, intentional preview switch for local/staging demos.

---

## 3) How real Supabase session / profile should load when no `demoRole`

- **When:** `getSelectedDemoRole()` is **null** / absent.

- **Flow (target):**  
  1. Call **`supabaseAuthService.getCurrentSession()`** (or subscribe to `onAuthStateChange` in a dedicated provider—see Phase 3A).  
  2. If session exists, **`getCurrentProfile()`** then **`mapProfileToAppUser(profile)`** to produce the **same conceptual shape** `AppLayout` already expects (`id`, `role`, `branch_id`, `student_id` / `linked_student_id`, etc.).  
  3. Optionally merge **extra scope** later (e.g. `assigned_class_ids` from `teacher_class_assignments`) in a **separate** lazy load so Phase 3 does not block first paint forever.

- **Fallback chain (non-demo):** Supabase app user → if still migrating, **Base44 `getCurrentUser()`** until explicitly removed per `docs/service-layer-migration-plan.md`.

---

## 4) Loading state requirements

- **Distinct states:** (a) resolving `demoRole`, (b) resolving Supabase session, (c) fetching profile, (d) unauthenticated.

- **Avoid flicker:** Do not set **`role`** to a default that unlocks routes before profile is ready; show a **neutral loading shell** (reuse small spinner pattern) only for the **non-demo** path while Supabase auth is resolving.

- **Timeouts / errors:** Supabase misconfiguration → behave like today’s read paths: **degrade** without throwing; optional dev-only message.

- **AuthProvider interaction:** Today’s Base44 loading gate should **not** block **`/welcome`** / **`/auth-preview`** (already outside). For **`/*`**, decide whether Supabase-aware loading runs **inside** `AuthenticatedApp` only vs. a sibling provider—Phase 3A should pick the **least invasive** option.

---

## 5) Unauthenticated behavior

- **Public routes (must stay accessible without Base44 login):**  
  - **`/welcome`**  
  - **`/auth-preview`**  
  (Already outside `AppLayout` / `AuthProvider` catch-all.)

- **Protected routes (`AppLayout` tree):**  
  - Eventually: **no session and no `demoRole`** → redirect to **`/auth-preview`** or a future **`/login`** with `returnUrl`, **without** flashing restricted content.  
  - Until redirect exists: current behaviour may show empty user / restricted UI—document as interim only.

- **Do not** require Supabase sign-in for the whole app until product explicitly enables it; **`demoRole`** remains the primary preview story.

---

## 6) Role mapping

- **Canonical role:** **`public.profiles.role`** (`app_role`) → normalise with **`permissionService.getRole`** / same rules as **`mapProfileToAppUser`** today.

- **Scope fields:**  
  - **`branch_id`** — branch supervisor / teacher branch context.  
  - **`linked_student_id`** — student portal link; map to **`student_id`** on app user for **`canAccessStudentRecord`**-style checks where applicable.  
  - **Teacher class lists** — not on `profiles` alone; load from **`teacher_class_assignments`** in a later sub-step so guards stay correct for teachers.

- **RLS remains authoritative**; client role is for **UI routing** only.

---

## 7) Risks

| Risk | Note |
|------|------|
| **Route flicker** | Role flips from `null` → wrong → correct; mitigate with explicit loading and single source of truth. |
| **Missing profile** | Auth user exists but no `profiles` row → block privileged UI, show registration / contact message; do not assume role. |
| **Stale session** | Refresh / `getUser()` periodically or on focus; handle `signOut` everywhere. |
| **Wrong role mapping** | Enum drift vs `permissionService`; keep one mapper (`mapProfileToAppUser`). |
| **Accidentally blocking `demoRole`** | Any new redirect must **check `demoRole` first** and bail out. |
| **Double spinner** | `AuthProvider` + new Supabase loader—coordinate so users see one coherent load. |

---

## 8) Recommended implementation sequence

| Phase | Scope |
|-------|--------|
| **3A** | ✅ **`SupabaseAuthStateProvider`** + **`useSupabaseAuthState()`** in `src/hooks/useSupabaseAuthState.jsx` — `onAuthStateChange`, profile load via `getCurrentProfile` / `mapProfileToAppUser`, exposes `session`, `user`, `profile`, `appUser`, `loading`, `error`, `isSupabaseAuthAvailable`, `refreshAuthState`. Mounted in **`App.jsx`** around **`Router`** only; **no** `AppLayout` / route-guard changes. |
| **3B** | **`AppLayout`**: when **no `demoRole`**, read from Phase 3A state; if Supabase session + profile present, set **`effectiveUser`** from **`mapProfileToAppUser`**; else fall back to Base44 `getCurrentUser()` until removed. |
| **3C** | **Protected route fallback:** if non-demo, no session (and no Base44 user if still enabled), **`Navigate`** to **`/auth-preview`** (or `/login`) with optional `state.from`. Keep public routes unchanged. |
| **3D** | **Production hardening:** feature flags, remove Base44 path for non-demo, tighten `AuthProvider` / marketing split—**later** only. |

---

## 9) Next implementation prompt (Phase 3A only)

Use this for a future coding task:

> **Phase 3A — Non-invasive Supabase auth state only.**  
> Add `src/hooks/useSupabaseAuthState.js` (or `src/providers/SupabaseSessionProvider.jsx`) that uses **`supabase`** from `supabaseClient.js` and **`getCurrentProfile` / `mapProfileToAppUser`** from `supabaseAuthService.js`. Subscribe to **`supabase.auth.onAuthStateChange`**; on session change, refresh profile when signed in; expose `{ session, profile, appUser, loading, error }`. When **`!isSupabaseConfigured()`**, expose stable empty state without errors. **Do not** modify **`AppLayout`**, **`AuthContext`**, or **`App.jsx`** routing yet except optionally wrapping the tree in the new provider **without** any consumer changes. **Do not** remove **`demoRole`**. Run `npm run build`, `lint`, `typecheck`, `test:supabase:read`, `test:supabase:auth`.

---

## Phase 3A implementation status (done)

- **`src/hooks/useSupabaseAuthState.jsx`** — `SupabaseAuthStateProvider` + **`useSupabaseAuthState()`**; listens with **`supabase.auth.onAuthStateChange`**; uses **`supabaseAuthService`** only; safe empty state when Supabase is not configured; no redirects; no **`demoRole`** interaction.
- **`App.jsx`** — wraps **`Router`** (and thus **`/auth-preview`**, **`/welcome`**, and **`/*`**) inside **`SupabaseAuthStateProvider`** so session updates propagate without new consumers yet.
- **`AppLayout`** — **unchanged**; **`demoRole`** remains the primary preview path for the main shell.
- **Next:** Phase **3B** — `AppLayout` may consume **`useSupabaseAuthState().appUser`** only when **`demoRole`** is absent.

---

*Document type: planning. Phase 3A runtime hook/provider is implemented; route guard integration remains Phase 3B+.*

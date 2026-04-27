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

## Phase 3B implementation plan: AppLayout integration

Planning only for this phase: **`AppLayout`** may consume **`useSupabaseAuthState()`** when **`demoRole`** is absent. **No redirects** in 3B; **Phase 3C** owns forced navigation for unauthenticated protected routes. **Do not** change global page chrome or redesign loading UI beyond a **minimal** safe loading branch where needed.

### 1. Current state after Phase 3A

- **`SupabaseAuthStateProvider`** wraps the **`Router`** in **`App.jsx`**, so **`useSupabaseAuthState()`** is available anywhere under the router (including **`AppLayout`**).
- Auth state is **available** to consumers: **`session`**, **`user`**, **`profile`**, **`appUser`**, **`loading`**, **`error`**, **`isSupabaseAuthAvailable`**, **`refreshAuthState`** (exact surface per `src/hooks/useSupabaseAuthState.jsx`).
- **`AppLayout`** still **does not** call **`useSupabaseAuthState()`**; it only branches on **`demoRole`** vs **`authService.getCurrentUser()`** (Base44-oriented path) as documented in **section 1** above.
- **`demoRole`** remains the **primary** preview mode; **`/auth-preview`** and **`/welcome`** remain outside the **`AppLayout`** / **`AuthProvider`** catch-all pattern described in **section 1**.

### 2. Phase 3B target behavior

**When `demoRole` exists (URL `?demoRole=` normalised to a valid preview role):**

- Preserve **existing demo user behavior exactly** as today: **`effectiveUser`** from **`getDemoUser(demoRole)`**, **`role`** from demo, **`permissionService.isRouteAllowed`**, sidebar rules, and demo data selection via **`getSelectedDemoRole()`** — unchanged.
- Do **not** let Supabase loading, missing session, or missing profile **override** or **clear** demo identity.

**When no `demoRole` exists:**

- **`AppLayout`** **may** read **`useSupabaseAuthState()`**.
- If **`appUser`** exists (signed-in Supabase user with a mapped app user shape), use it as the **current user** for **route permissions** and **`effectiveUser`** / **`role`** derivation — aligned with **`mapProfileToAppUser`** / **`permissionService.getRole`** rules in **section 6**.
- If **`loading`** is true (Supabase auth or profile still resolving), show a **safe loading state** (reuse existing spinner / full-screen patterns from **`AuthenticatedApp`** where possible; avoid a second conflicting shell if one gate already covers the same moment — coordinate in implementation).
- If there is **no `appUser`** / **no session** after resolution completes, **keep current behavior** (e.g. fall back to **`getCurrentUser()`** from **`authService`** if still enabled) or show the **same unauthenticated / restricted UX** the app already uses for missing Base44 user — **do not** introduce mandatory Supabase sign-in or **forced redirect** in 3B (**redirect** is **Phase 3C** unless product explicitly folds it into 3B later).

### 3. Required code touchpoints (later implementation)

| Area | Notes |
|------|--------|
| **`AppLayout.jsx`** | Branch: **`demoRole`** → demo path; else Supabase **`appUser`** + **`loading`**; else existing **`getCurrentUser()`** fallback. |
| **`AuthProvider` / `AuthContext.jsx`** | May need alignment so Base44 loading and Supabase resolution do not **double-block** or **fight** for “who is current user”; keep changes minimal. |
| **Current user source** | Single conceptual pipeline per branch: demo → Supabase **`appUser`** → legacy fallback. |
| **`permissionService.isRouteAllowed`** | Continue to receive a **normalised `role`** string; ensure Supabase path supplies the same shape as today. |
| **Any component using “current user” or role from layout context** | Audit passively during 3B so nothing assumes **only** Base44 after non-demo path switches. |
| **Sign-out control (later)** | Not required in 3B; document for 3C+ so sign-out clears Supabase session and refreshes Phase 3A state without leaving stale layout identity. |

### 4. Risks

| Risk | Mitigation sketch |
|------|-------------------|
| **Route flicker** | Resolve **`role`** in one place per branch; avoid setting a permissive default before **`appUser`** or profile is ready; prefer explicit **`loading`** over transient **`null` role** that briefly allows or denies the wrong routes. |
| **Accidentally breaking `demoRole`** | **Always** evaluate **`getSelectedDemoRole()`** first; never clear demo **`effectiveUser`** because Supabase is empty; never redirect demo users to auth. |
| **Blocking `/welcome` or `/auth-preview`** | Those routes stay **outside** the **`AppLayout`** tree; do not move **`SupabaseAuthStateProvider`** or add gates that wrap public routes incorrectly. |
| **Profile missing** | Auth user without **`profiles`** row → no **`appUser`** or incomplete mapping; must not crash **`permissionService`**; show safe degraded / restricted UI consistent with existing patterns. |
| **Role mapping mismatch** | Use **one** mapper (**`mapProfileToAppUser`**) and **`permissionService.getRole`**; add tests or manual matrix if enums drift. |
| **Stale Base44 / demo auth path conflict** | When both Supabase session and Base44 user could exist, define precedence: after 3B, prefer **Supabase `appUser`** when no **`demoRole`** and session is valid; document before removing Base44 in a later phase. |

### 5. Recommended Phase 3B implementation strategy

1. **Minimal `AppLayout` change only** — avoid touching unrelated routes or page components.
2. **`demoRole` first branch** — short-circuit exactly as today; zero behavioral change for preview URLs.
3. **Supabase `appUser` second branch** — when not loading and **`appUser`** is non-null, drive **`effectiveUser`** / **`role`** from it.
4. **Existing fallback third branch** — **`getCurrentUser()`** / current restricted behavior when Supabase is absent, unsigned-out, or not configured.
5. **No redirect yet** — defer **`Navigate`** to login / **`/auth-preview`** to **Phase 3C**.
6. **No page UI redesign** — only reuse existing loading / restricted patterns; no marketing or layout chrome changes.

### 6. Phase 3B acceptance criteria

- **`?demoRole=teacher`** still works end-to-end for preview (layout, sidebar, route allow list).
- **`?demoRole=hq_admin`** (and other supported demo roles) still work the same way.
- **`/auth-preview`** still works (sign-in / sign-out preview, no regression from provider wrapping).
- A **signed-in fake user** (local Supabase / test account) can be **recognised as `appUser`** when **`demoRole`** is **not** present, and **`AppLayout`** uses that identity for permissions without crashes.
- **Protected routes** under **`AppLayout`** do **not** crash when Supabase is configured, unconfigured, signed in, or signed out (in combination with existing Base44 fallback where still present).
- **`npm run build`**, **`npm run lint`**, **`npm run typecheck`**, **`npm run test:supabase:read`**, **`npm run test:supabase:auth`** all pass after implementation.

### 7. Next implementation prompt (Phase 3B only)

Copy-paste for a future coding task:

> **Phase 3B — AppLayout consumes Supabase `appUser` only when no `demoRole`.**  
> In **`src/components/layout/AppLayout.jsx`**, if **`getSelectedDemoRole()`** returns a role, keep **identical** behavior to today (demo **`effectiveUser`**, demo **`role`**, no Supabase override). If **no `demoRole`**, call **`useSupabaseAuthState()`**: while **`loading`**, show a **safe** loading UI consistent with existing app patterns (avoid duplicate spinners vs **`AuthenticatedApp`** / **`AuthProvider`** — coordinate minimally). When not loading and **`appUser`** is present, set **`effectiveUser`** / **`role`** from **`appUser`** (same shape **`permissionService.isRouteAllowed`** expects). When not loading and there is **no** **`appUser`** / session, fall back to **`authService.getCurrentUser()`** and current restricted behavior as today. **Do not** add forced redirects (Phase 3C). **Do not** remove **`demoRole`**, demo/local fallback, or **`/auth-preview`**. **Do not** change unrelated page UI, add writes/uploads, or call AI APIs. Run **`npm run build`**, **`lint`**, **`typecheck`**, **`test:supabase:read`**, **`test:supabase:auth`**.

---

*Document type: planning. Phase 3A runtime hook/provider is implemented; Phase 3B is planned above; forced redirects and production hardening remain Phase 3C+.*

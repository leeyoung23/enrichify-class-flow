# Supabase Auth Transition Plan

Describes how to move from **demoRole-first preview** to **real Supabase Auth sessions** while keeping **demoRole** and **local/demo fallbacks**. **Phase 1** (auth service + CLI smoke) and **Phase 2** (`/auth-preview` page) are implemented; production login, `AppLayout` integration, and Base44 removal remain future work.

Related references: `docs/service-layer-migration-plan.md`, `docs/frontend-supabase-readonly-checkpoint.md`, `docs/frontend-branches-classes-students-readonly-checkpoint.md`, `docs/supabase-rls-smoke-test-results.md`, `docs/supabase-007-008-application-checkpoint.md`.

---

## 1) Current auth model

- **`demoRole` query param:** `authService.getSelectedDemoRole()` reads `?demoRole=` from the URL and normalises it to `permissionService.ROLES` values. When set, `getDemoUser(role)` returns a **static in-memory user** (`DEMO_USERS`) with fake `id`, `email`, `branch_id`, `assigned_class_ids`, `student_id`, etc.—these IDs are **not** Supabase UUIDs and are used for UI and **demo** `dataService` fallbacks.

- **`getCurrentUser()`:** If `demoRole` is set, returns the demo user immediately. Otherwise it calls **`base44.auth.me()`** (Base44), not Supabase Auth.

- **`AuthProvider` (`src/lib/AuthContext.jsx`):** Drives loading/error state for the **Base44** app shell (public settings + token). It sets `user` from `base44.auth.me()` when `appParams.token` exists. It does **not** today load `public.profiles` from Supabase.

- **`AppLayout`:** On each navigation, if `demoRole` is set, sets layout user from `getDemoUser`; else calls `getCurrentUser()` (Base44 path). **`permissionService.isRouteAllowed(role, pathname)`** uses the **effective role** (`demoRole` or normalised user role) to gate routes. Sidebar and outlet receive `effectiveUser` and `role`.

- **Read path:** `dataService` uses `getSelectedDemoRole()` to force **demo** data for branches/classes/students/dashboard when demo is active; otherwise Supabase read helpers when configured (`supabaseClient.isSupabaseConfigured()`).

**Summary:** Preview mode is **demoRole + static demo users + demo datasets**. Real Supabase JWT sessions are exercised today mainly via **CLI smoke tests** (`npm run test:supabase:read`), not via the main app auth flow.

---

## 2) Target auth model

Future end state (incremental):

1. User **signs in** with **Supabase Auth** (email/password or magic link—product decision later).
2. Frontend holds **`session.user`** (auth UID) from `supabase.auth.getSession()` / `onAuthStateChange`.
3. App loads **`public.profiles`** row where `profiles.id = auth.uid()` (single row per user).
4. **App role** comes from **`profiles.role`** (`app_role` enum in DB), normalised to the same string keys as `permissionService.ROLES`.
5. **Branch / teacher / guardian / student links** come from DB tables (`branches`, `teachers`, `guardians`, `guardian_student_links`, `profiles.linked_student_id`, etc.)—not from hard-coded demo objects. A thin **“app user”** shape can merge profile + resolved IDs for `canAccessStudentRecord`-style checks.
6. **Route guards** use the **real** role and resolved scope (with the same `isRouteAllowed` surface where possible, backed by real data).
7. **`demoRole`** remains available **only** for development/demo preview (e.g. local or staging with query param), never as a production security bypass.

RLS on Supabase already enforces data access; the app must still avoid trusting client-only checks for security.

---

## 3) Required service changes later

Introduce a dedicated module (name aligned with `docs/service-layer-migration-plan.md`):

| Artifact | Responsibility |
|----------|----------------|
| **`src/services/supabaseAuthService.js`** (new) | Wrap Supabase Auth + profile fetch; no UI. |
| **`getCurrentSession()`** | Return `{ session, user }` or null from `supabase.auth.getSession()`; handle `supabase === null` when env missing. |
| **`signInWithEmailPassword({ email, password })`** | Thin wrapper around `supabase.auth.signInWithPassword`. |
| **`signOut()`** | `supabase.auth.signOut()`. |
| **`getCurrentProfile()`** | After session exists, `from('profiles').select(...).eq('id', session.user.id).single()` (or equivalent). Respect RLS. |
| **`mapProfileToAppUser(profile, extras?)`** | Map DB row (+ optional joined `teacher_id`, guardian ids) to the **shape `AppLayout` / permission helpers expect** (`role`, `branch_id`, `assigned_class_ids`, `student_id`, …) so route and record checks can migrate without rewriting every page at once. |

**`authService.js` evolution (later):** Orchestrate priority: **demoRole → Supabase session/profile → Base44** (until Base44 is removed per migration plan), with clear single entry `getCurrentUser()` for the rest of the app.

---

## 4) Fallback behaviour

| Condition | Behaviour |
|-----------|-----------|
| **`demoRole` present** | Use **demo preview mode**: static demo user + demo `dataService` paths; **do not** require Supabase session for layout (current behaviour preserved). |
| **No session and no `demoRole`** | Eventually: **unauthenticated** state—show **login** (or public marketing route) when that UI exists; until then, document expected interim (e.g. welcome only) without changing behaviour in this plan. |
| **Supabase env missing / client null** | **Do not crash:** `getCurrentSession` / reads return null or empty; UI can show configuration hint in dev only—no secret logging. |
| **Session exists but profile missing** | Treat as **registration incomplete** (similar concept to existing `user_not_registered`); block privileged routes until profile row exists (product copy TBD). |

---

## 5) Route guard transition

**Today:** `AppLayout` chooses demo user when `getSelectedDemoRole()` is set; else `getCurrentUser()` from Base44. `permissionService.isRouteAllowed(role, pathname)` gates routes.

**Target priority (conceptual):**

1. If **`demoRole`** → use **demo user** and demo data rules (development only).
2. Else if **Supabase session + profile** → use **mapped app user** from `profiles` + DB links; `role` from profile.
3. Else if **legacy Base44** still enabled → existing Base44 user (migration bridge).
4. Else → **unauthenticated** / public.

`permissionService` can remain the **single source of route rules**; only the **source of `user` / `role`** changes. `canAccessStudentRecord` should eventually use **Supabase-backed** `branch_id`, `class_id`, guardian links, or defer entirely to RLS + minimal client checks.

---

## 6) What not to do yet

- Do **not** remove **`demoRole`** or demo/local fallback from `authService` / `dataService`.
- Do **not** connect **writes/uploads** in the same change as auth.
- Do **not** create **production** users or load **real child** data in shared environments.
- Do **not** put the **service role** key in the frontend or in client-bundled env.
- Do **not** commit **`.env.local`** or expose passwords in docs or logs.

---

## 7) Risks

| Risk | Mitigation idea |
|------|------------------|
| **Profile row missing** for a valid Auth user | Onboarding flow + clear error state; optional trigger to create profile on first sign-in (server-side or controlled RPC later). |
| **Role mismatch** between JWT claims and `profiles.role` | Single source of truth: **`profiles.role`**; avoid duplicating role in custom JWT unless kept in sync. |
| **Parent/student / teacher links not loaded** | Eager or lazy load related tables in `supabaseAuthService` / query layer; map into `mapProfileToAppUser`. |
| **Branch scope not loaded** | Always fetch `profiles.branch_id` and validate against RLS for supervisors. |
| **Route flicker** while session + profile load | Loading state in layout; avoid flashing wrong sidebar until `effectiveUser` resolved. |
| **Internal pages exposed** | Keep **`isRouteAllowed`**; default-deny unknown routes; unauthenticated users must not see app shell routes until login exists. |

---

## 8) Suggested implementation sequence

| Phase | Scope |
|-------|--------|
| **1** | ✅ **`src/services/supabaseAuthService.js`** + **`npm run test:supabase:auth`** (CLI profile smoke). |
| **2** | ✅ **Auth preview UI** — `src/pages/AuthPreview.jsx` at **`/auth-preview`** (outside `AppLayout`; not in sidebar). |
| **3** | Add **basic login page** behind a **feature flag** or **`/login`** route; still allow **`/welcome`** and **`demoRole`** preview. |
| **4** | **`AppLayout`**: when **no `demoRole`**, resolve user from **Supabase session + profile** (fallback Base44 if still required) — controlled integration. |
| **5** | Gradually **remove reliance on Base44** for non-demo mode; keep demo path for local/staging. |

---

## 9) Next implementation prompt (Phase 1)

Use this for a future coding task:

> **Phase 1 — Supabase auth service only (no UI changes).**  
> Create `src/services/supabaseAuthService.js` using the existing `supabase` export from `src/services/supabaseClient.js`. Implement read-only helpers: `getCurrentSession()`, `signInWithEmailPassword`, `signOut`, `getCurrentProfile()` (select from `public.profiles` by `auth.uid()`), and `mapProfileToAppUser(profile)` returning a minimal object compatible with `permissionService.getRole` / `AppLayout` expectations (`role`, `branch_id`, optional `linked_student_id`). Guard all calls when `supabase` is null. Do **not** modify `AppLayout`, `AuthContext`, or login UI yet. Do **not** remove `demoRole` or demo fallbacks. Add a **read-only** test path: either a new npm script or an optional block in `scripts/supabase-readonly-smoke-test.mjs` that after password sign-in asserts `profiles` row exists for each fake demo email (reuse existing env password vars). Run `npm run build`, `lint`, `typecheck`, `test:supabase:read`. No service role in frontend; no `.env.local` commit.

---

## Phase 1 implementation status (done)

- **`src/services/supabaseAuthService.js`** added: `getCurrentSession`, `getCurrentUser` (Auth user), `getCurrentProfile`, `signInWithEmailPassword`, `signOut`, `mapProfileToAppUser`. Uses **`supabase`** from `supabaseClient.js` only; safe no-ops when Supabase is unconfigured; no service role. `getCurrentProfile` resolves the user id via **`auth.getUser()`** first (then `getSession()` fallback) so profile reads work immediately after password sign-in in Node smoke tests.
- **`scripts/supabase-auth-smoke-test.mjs`** + **`npm run test:supabase:auth`**: read-only auth/profile check for fake demo emails (same password env vars as RLS read smoke test).
- **`src/services/supabaseClient.js`**: resolves `VITE_SUPABASE_*` from **`import.meta.env`** or **`process.env`** so Node scripts can load the client after `dotenv`.
- **Not done yet (by design):** production login route, `AppLayout` / route guard wiring, **`demoRole`** unchanged, **`authService.js`** unchanged.

---

## Phase 2 implementation status (preview UI)

- **`/auth-preview`** — `AuthPreview` page for browser testing: fake-user email quick-fill, password field (never displayed after entry), `signInWithEmailPassword` → `getCurrentProfile` → `mapProfileToAppUser`, safe read-only profile display, `signOut`. Routed in **`App.jsx`** next to **`/welcome`**, **outside** `AuthProvider` / **`AppLayout`** so the main app route guard and **`demoRole`**-first behaviour are unchanged.
- **Navigation:** not added to sidebar; open by URL only (optional welcome link was omitted by product preference).
- **Next:** Phase 3+ — feature-flag login or controlled **`AppLayout`** integration when ready.

---

*Document type: planning. Phase 1 (service + CLI smoke) and Phase 2 (auth preview page) are implemented; main shell integration remains future work.*

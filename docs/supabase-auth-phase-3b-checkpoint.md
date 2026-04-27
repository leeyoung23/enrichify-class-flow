# Supabase Auth — Phase 3B checkpoint

**Checkpoint date:** recorded at merge of Phase 3B AppLayout integration.  
**Scope:** layout identity and route permission inputs only. **No** Phase 3C redirects, **no** production login productisation.

Related: `docs/supabase-auth-route-guard-integration-plan.md`, `src/components/layout/AppLayout.jsx`, `src/hooks/useSupabaseAuthState.jsx`, `src/services/supabaseAuthService.js`, `src/services/authService.js`.

---

## 1. What changed in AppLayout

`AppLayout` (`src/components/layout/AppLayout.jsx`) now:

- Imports **`useSupabaseAuthState()`** from `src/hooks/useSupabaseAuthState.jsx`.
- Replaces the single **`user`** state used for the non-demo path with **`fallbackUser`**, filled by **`getCurrentUser()`** from `authService` only when demo is off, Supabase is not in a blocking load state, and there is **no** Supabase **`appUser`**.
- Resolves **`effectiveUser`** and **`role`** in a fixed order: **demo** → **Supabase `appUser`** (with **`normalizeRole`**) → **`fallbackUser`** from **`getCurrentUser()`**.
- When Supabase is **configured** and auth/profile resolution is **`loading`**, renders a **minimal** full-screen “Loading session…” state (spinner pattern aligned with elsewhere in the app). This branch runs **only** when **`demoRole` is not** active.

Route gating (**`permissionService.isRouteAllowed`**), sidebar visibility, and **`Outlet`** context still use **`effectiveUser`** / **`role`** as before; the **source** of that identity gained the Supabase branch.

---

## 2. Identity priority order

1. **`demoRole`** (`?demoRole=` via **`getSelectedDemoRole()`**) — If present, **`getDemoUser(demoRole)`** defines **`effectiveUser`** and **`role`**. Supabase state does **not** override demo; the Supabase loading UI is **not** shown on this path.
2. **Supabase `appUser`** — If there is **no** demo role, Supabase is available, auth is **not** loading, and **`appUser`** exists (mapped profile via Phase 3A provider), use it for **`effectiveUser`** / **`role`** (normalised role for permissions).
3. **Existing fallback user** — If there is **no** demo role and **no** usable **`appUser`** after the above, **`authService.getCurrentUser()`** (Base44-oriented **`base44.auth.me()`** path when no demo in URL) populates **`fallbackUser`**, same conceptual behaviour as pre–3B for that case.

---

## 3. What did not change

- **No redirects** — Unauthenticated users are not sent to `/auth-preview` or a future `/login` from `AppLayout` (Phase **3C**).
- **No production login UI** — `/auth-preview` remains the dev-oriented Supabase auth preview surface; no new marketed login flow.
- **No writes/uploads** — Phase 3B does not add storage uploads or new write paths.
- **`demoRole` still works** — URL-driven demo preview remains first priority and behaviour for supported roles is unchanged from the pre–3B demo contract.
- **Public routes** — `/welcome` and `/auth-preview` remain outside the `AppLayout` shell as before (routing unchanged in 3B).
- **`permissionService` rules** — Same allow lists; only the **user object / role** feeding **`isRouteAllowed`** can now come from Supabase when appropriate.

---

## 4. Manual preview checklist

Use a local build with valid anon Supabase env (see project env docs; do not commit `.env.local`).

| Check | Action | Expect |
|--------|--------|--------|
| Demo teacher | Open app with **`/?demoRole=teacher`** | Demo teacher identity, sidebar, routes as before; no “Loading session…” from Supabase. |
| Demo HQ admin | Open with **`/?demoRole=hq_admin`** (or equivalent normalised query value) | Demo HQ admin identity and navigation as before. |
| Auth preview | Visit **`/auth-preview`** | Sign-in / sign-out for fake seed users works; page not blocked by `AppLayout`. |
| Post sign-in shell | After sign-in on **`/auth-preview`**, navigate to **`/`** **without** `demoRole` | Brief loading if applicable, then layout reflects **Supabase `appUser`** (role from `profiles`); routes gated by that role. |

---

## 5. Known limitations

- **Unauthenticated redirect not implemented yet** — Non-demo, no session, no legacy user may still see restricted or empty shell behaviour instead of a clean redirect to `/auth-preview` or login (Phase **3C**).
- **Login UX still dev-only** — `/auth-preview` is for smoke testing and local verification, not a polished end-user login experience.
- **Role-specific polish still needed** — e.g. teacher **`assigned_class_ids`** / extra scope not loaded in `mapProfileToAppUser`; some deep checks may differ from fully hydrated app users until later phases.
- **Possible double loading** — `AuthenticatedApp` / `AuthProvider` may still show loading while Supabase resolves; acceptable for this checkpoint; tune in a later pass if UX requires it.
- **Precedence when both Supabase and Base44 could apply** — With no `demoRole`, **Supabase `appUser` wins** when present after load; legacy fallback applies when not.

---

## 6. Recommended next phase

- **Phase 3C — redirect / login hardening:** e.g. `Navigate` to `/auth-preview` (or future `/login`) with `returnUrl` when non-demo, no `appUser`, no legacy user; align sign-out so layout identity clears cleanly; optional coordination with `AuthProvider` to reduce flicker.
- **Or pause** before any broad **write-flow** or **upload** rollout until auth and RLS stories are explicitly signed off for each surface.

---

*This file is documentation only; it does not change runtime behaviour.*

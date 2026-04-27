# Supabase Auth — Phase 3C checkpoint (3C-1 + 3C-2)

**Checkpoint:** Phase **3C-1** (protected-route redirect + safe **`returnUrl`**) and **3C-2** (redirect target **`/login`** instead of **`/auth-preview`**) are **implemented** in code. This file is **documentation only** — it does not change runtime behaviour.

**Related:** `docs/supabase-auth-phase-3c-login-hardening-plan.md`, `docs/polished-login-page-plan.md`, `docs/supabase-auth-route-guard-integration-plan.md`, `docs/supabase-auth-phase-3b-checkpoint.md`, `src/App.jsx`, `src/pages/AuthPreview.jsx`, `src/pages/Login.jsx`, `src/lib/supabaseAuthReturnUrl.js`, `src/hooks/useSupabaseAuthState.jsx`, `src/components/layout/AppLayout.jsx`.

---

## 1) What changed

| Area | Change |
|------|--------|
| **`AuthenticatedApp`** (`src/App.jsx`) | After Base44 **`AuthProvider`** loading and error handling, a **Supabase session gate** runs when **`getSelectedDemoRole()`** is falsy and **`isSupabaseAuthAvailable`** is true: wait for **`useSupabaseAuthState().loading`**, then branch on **session / `appUser`**. |
| **`SupabaseProfileMissing`** | Inline UI when **`session?.user`** exists but **`appUser`** is missing (no redirect loop); link to **`/auth-preview`** for dev-oriented sign-out / retry. |
| **`Navigate` to `/login` (3C-2)** | When the gate applies and there is **no Supabase `session`**, user is sent to **`/login?returnUrl=<sanitized path>`** (was **`/auth-preview`** in 3C-1 only). |
| **`supabaseAuthReturnUrl.js`** | Helpers **`isSafeInternalAppPath`**, **`sanitizeReturnUrlForRedirect`**, **`parseReturnUrlQueryParam`** — block **`//`**, **`/auth-preview`**, **`/login`**, and other unsafe **`returnUrl`** values. |
| **`AuthPreview.jsx`** | Dev page unchanged in contract: after **successful** sign-in + profile load, **`navigate`** to a **safe** internal **`returnUrl`** when present (`replace: true`). |
| **`Login.jsx`** | Polished public sign-in; same **`returnUrl`** parsing after success → **`/`** or safe path. |

**Unchanged:** **`AppLayout`** permission matrix, sidebar labels, **`dataService`** writes, uploads, AI flows, **`demoRole`** semantics, **`/auth-preview`** remains **public** and **directly reachable** for developers.

---

## 2) Redirect behaviour

1. **Gate applies only when:** **`!getSelectedDemoRole()`** and **`isSupabaseAuthAvailable`** (Supabase env + client present).
2. **While Supabase auth is loading:** same full-screen **spinner** as the existing Base44 loading shell (no redirect yet).
3. **After loading, no `session`:** **`Navigate`** to **`/login`** with query **`returnUrl=`** set to **`sanitizeReturnUrlForRedirect(`${pathname}${search}`)`** (defaults to **`/`** if the path would be unsafe).
4. **Supabase not configured:** the gate is **skipped** — behaviour matches pre–3C-1 for local runs without Supabase (no redirect solely for missing anon session).

When Supabase **is** configured and the gate applies, users **without** a Supabase session **do not** reach **`AppLayout`** until they sign in (or add **`demoRole`** for preview).

---

## 3) Public routes

| Route | Behaviour |
|-------|-----------|
| **`/welcome`** | Declared **outside** the **`/*`** + **`AuthProvider`** tree — **never** runs **`AuthenticatedApp`** — **always public**. |
| **`/auth-preview`** | Same — **always public**; **dev/test** sign-in and smoke checks; **not** the default forced redirect for protected routes (**3C-2**). |
| **`/login`** | Same — **always public**; **default** destination when signed-out users hit a protected route (**3C-2**). |

---

## 4) `demoRole` behaviour

- If **`getSelectedDemoRole()`** returns a normalised role from **`?demoRole=`**, the **entire** Supabase session gate in **`AuthenticatedApp`** is **skipped**.
- Preview users **never** receive a forced redirect to **`/login`** solely because Supabase has no session.
- **`AppLayout`** (Phase **3B**) continues to resolve **demo** identity first; **`demoRole`** remains the primary preview mechanism.

---

## 5) `returnUrl` behaviour

- **`sanitizeReturnUrlForRedirect`** (on redirect to **`/login`**) and **`parseReturnUrlQueryParam`** (on **`/login`** and **`/auth-preview`** after sign-in) validate: **relative** app path starting with **`/`**, not **`//`**, not **`/auth-preview`**, not **`/login`** (prevents loops).
- After **successful** sign-in on **`/login`**, if a valid **`returnUrl`** exists, **`navigate(target, { replace: true })`**; otherwise **`/`**.
- **`/auth-preview`**: same **`returnUrl`** rules for developers testing from that page.

---

## 6) Missing profile behaviour

- Condition: **`session?.user`** is truthy, **`appUser`** is falsy after Supabase loading completes (missing **`profiles`** row, profile fetch error, etc.).
- **Action:** render **`SupabaseProfileMissing`** — short explanation, optional **`error.message`**, link to **`/auth-preview`**.
- **Not done:** automatic **`Navigate`** to **`/login`** in this state (avoids **infinite** redirect / sign-in loops).

---

## 7) Manual preview checklist

Use a local build with Supabase env for anon auth (see project env docs; **do not** commit **`.env.local`**).

| Step | Action | Expected |
|------|--------|----------|
| Welcome | Open **`/welcome`** | Page loads **without** sign-in. |
| Auth preview | Open **`/auth-preview`** | Page loads **without** sign-in; sign-in form available when configured. |
| Login | Open **`/login`** | Page loads **without** going through the protected shell redirect loop. |
| Root signed out | With Supabase configured, **signed out**, open **`/`** | Redirect to **`/login?returnUrl=%2F`** (or equivalent encoding). |
| Demo teacher | Open **`/?demoRole=teacher`** | **No** redirect to login; teacher demo shell and data preview work. |
| Demo HQ | Open **`/?demoRole=hq_admin`** | **No** redirect; HQ demo preview works. |
| Return flow | Open **`/login?returnUrl=%2F`**, sign in with a **fake seed** user | After success, land on **`/`** with teacher (or role) dashboard per **`profiles.role`**. |

---

## 8) Future auth work (not in 3C-2)

- **Role-based post-login landing** — e.g. default **`/parent-view`** for parent role (optional **3C-3**).
- **Password reset** — productised recovery flow (likely Supabase + email templates).
- **Production auth UX** — accessibility, errors, rate limits, support links.
- **Write / upload flows** — all persistence work is separate from this auth checkpoint.

---

## 9) Recommended next milestone

1. **Auth UX — 3C-3 / 3C-4:** Role-based landing, password reset, production polish — see **`docs/supabase-auth-phase-3c-login-hardening-plan.md`**.  
2. **Or pivot to product writes:** begin **first Supabase write vertical** planning — see **`docs/product-feature-gap-audit.md`** and **`docs/service-layer-migration-plan.md`**.

---

*Document type: checkpoint. Phase 3C-1 + 3C-2 redirect behaviour is in code; section 8 is future work.*

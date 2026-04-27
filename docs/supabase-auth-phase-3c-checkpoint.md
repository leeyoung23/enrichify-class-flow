# Supabase Auth — Phase 3C checkpoint (3C-1)

**Checkpoint:** Phase **3C-1** (protected-route redirect + safe **`returnUrl`**) is **implemented** in code. This file is **documentation only** — it does not change runtime behaviour.

**Related:** `docs/supabase-auth-phase-3c-login-hardening-plan.md`, `docs/supabase-auth-route-guard-integration-plan.md`, `docs/supabase-auth-phase-3b-checkpoint.md`, `src/App.jsx`, `src/pages/AuthPreview.jsx`, `src/lib/supabaseAuthReturnUrl.js`, `src/hooks/useSupabaseAuthState.jsx`, `src/components/layout/AppLayout.jsx`.

---

## 1) What changed

| Area | Change |
|------|--------|
| **`AuthenticatedApp`** (`src/App.jsx`) | After Base44 **`AuthProvider`** loading and error handling, a **Supabase session gate** runs when **`getSelectedDemoRole()`** is falsy and **`isSupabaseAuthAvailable`** is true: wait for **`useSupabaseAuthState().loading`**, then branch on **session / `appUser`**. |
| **`SupabaseProfileMissing`** | New inline UI when **`session?.user`** exists but **`appUser`** is missing (no redirect loop). |
| **`Navigate` to `/auth-preview`** | When the gate applies and there is **no Supabase `session`**, user is sent to **`/auth-preview?returnUrl=<sanitized path>`**. |
| **`supabaseAuthReturnUrl.js`** | Helpers **`isSafeInternalAppPath`**, **`sanitizeReturnUrlForRedirect`**, **`parseReturnUrlQueryParam`** — block **`//`**, **`/auth-preview`**, and other unsafe **`returnUrl`** values. |
| **`AuthPreview.jsx`** | After **successful** sign-in + profile load, **`navigate`** to a **safe** internal **`returnUrl`** when present (`replace: true`). Copy updated to mention **`returnUrl`** (no layout redesign). |

**Unchanged in this phase:** **`AppLayout`** permission matrix, sidebar labels, **`dataService`** writes, uploads, AI flows, **`demoRole`** semantics, public route list.

---

## 2) Redirect behaviour

1. **Gate applies only when:** **`!getSelectedDemoRole()`** and **`isSupabaseAuthAvailable`** (Supabase env + client present).
2. **While Supabase auth is loading:** same full-screen **spinner** as the existing Base44 loading shell (no redirect yet).
3. **After loading, no `session`:** **`Navigate`** to **`/auth-preview`** with query **`returnUrl=`** set to **`sanitizeReturnUrlForRedirect(`${pathname}${search}`)`** (defaults to **`/`** if the path would be unsafe).
4. **Supabase not configured:** the gate is **skipped** — behaviour matches pre–3C-1 for local runs without Supabase (no redirect solely for missing anon session).

When Supabase **is** configured and the gate applies, users **without** a Supabase session **do not** reach **`AppLayout`** until they sign in (or add **`demoRole`** for preview).

---

## 3) Public routes

| Route | Behaviour |
|-------|-----------|
| **`/welcome`** | Declared **outside** the **`/*`** + **`AuthProvider`** tree — **never** runs **`AuthenticatedApp`** — **always public**. |
| **`/auth-preview`** | Same — **always public**; destination for unauthenticated redirects from the protected app. |

---

## 4) `demoRole` behaviour

- If **`getSelectedDemoRole()`** returns a normalised role from **`?demoRole=`**, the **entire** Supabase session gate in **`AuthenticatedApp`** is **skipped**.
- Preview users **never** receive a forced redirect to **`/auth-preview`** solely because Supabase has no session.
- **`AppLayout`** (Phase **3B**) continues to resolve **demo** identity first; **`demoRole`** remains the primary preview mechanism.

---

## 5) `AuthPreview` `returnUrl` behaviour

- Reads **`returnUrl`** from the URL query (single value).
- **`parseReturnUrlQueryParam`** validates: must be a **relative** app path starting with **`/`**, not **`//`**, and not **`/auth-preview`** (prevents loops).
- After **successful** sign-in and profile mapping, if a valid target exists, **`navigate(target, { replace: true })`** so the user returns to the protected app (e.g. dashboard **`/`**).
- If **`returnUrl`** is absent or invalid, the user remains on **`/auth-preview`** with the profile summary card as before.

---

## 6) Missing profile behaviour

- Condition: **`session?.user`** is truthy, **`appUser`** is falsy after Supabase loading completes (missing **`profiles`** row, profile fetch error, etc.).
- **Action:** render **`SupabaseProfileMissing`** — short explanation, optional **`error.message`**, link to **`/auth-preview`**.
- **Not done:** automatic **`Navigate`** to **`/auth-preview`** in this state (avoids **infinite** redirect / sign-in loops).

---

## 7) Manual preview checklist

Use a local build with Supabase env for anon auth (see project env docs; **do not** commit **`.env.local`**).

| Step | Action | Expected |
|------|--------|----------|
| Welcome | Open **`/welcome`** | Page loads **without** sign-in. |
| Auth preview | Open **`/auth-preview`** | Page loads **without** sign-in; sign-in form available when configured. |
| Root signed out | With Supabase configured, **signed out**, open **`/`** | Redirect to **`/auth-preview?returnUrl=%2F`** (or equivalent encoding). |
| Demo teacher | Open **`/?demoRole=teacher`** | **No** redirect to auth; teacher demo shell and data preview work. |
| Demo HQ | Open **`/?demoRole=hq_admin`** | **No** redirect; HQ demo preview works. |
| Return flow | Open **`/auth-preview?returnUrl=%2F`**, sign in with a **fake seed** user | After success, land on **`/`** with teacher (or role) dashboard per **`profiles.role`**. |

---

## 8) What remains (not in 3C-1)

- **Polished `/login` page** — marketing-quality layout; may supersede or wrap **`/auth-preview`**.
- **Role-based post-login landing** — e.g. default **`/parent-view`** for parent role (optional **3C-3**).
- **Password reset** — productised recovery flow (likely Supabase + email templates).
- **Production auth UX** — accessibility, errors, rate limits, support links.
- **Write / upload flows** — all persistence work is separate from this auth checkpoint.

---

## 9) Recommended next milestone

1. **Auth UX — 3C-2 / 3C-4:** Ship a **polished `/login`** (or restyle **`/auth-preview`**) while keeping the same **redirect + `returnUrl` contract** and **`supabaseAuthReturnUrl`** validation.  
2. **Or pivot to product writes:** begin **first Supabase write vertical** planning (e.g. attendance or teacher task) with RLS — see **`docs/product-feature-gap-audit.md`** and **`docs/service-layer-migration-plan.md`**.

Pick one track as the primary sprint; auth polish and first writes can overlap only if resourcing allows.

---

*Document type: checkpoint. Phase 3C-1 code is complete; items in section 8 are future work.*

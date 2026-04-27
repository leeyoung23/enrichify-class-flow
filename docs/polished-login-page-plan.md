# Polished login page plan (`/login`)

**Phase 1 implemented:** public **`/login`** (`src/pages/Login.jsx`) — polished Young’s Learners portal sign-in using **`supabaseAuthService`** + **`returnUrl`** via **`supabaseAuthReturnUrl.js`** (**`/login`** excluded from valid **`returnUrl`** to prevent loops). **`/auth-preview`** remains dev-only; a **“Use polished login page”** link points to **`/login`**. **Phase 3C-2** switches the **protected-route** redirect from **`/auth-preview`** to **`/login?returnUrl=…`** (same sanitisation helpers).

**Related:** `docs/supabase-auth-phase-3c-login-hardening-plan.md`, `docs/supabase-auth-phase-3c-checkpoint.md`, `src/pages/AuthPreview.jsx`, `src/services/supabaseAuthService.js`, `src/lib/supabaseAuthReturnUrl.js`, `src/App.jsx`.

---

## 1) Why `/auth-preview` should stay dev-only

| Reason | Note |
|--------|------|
| **Purpose** | **`/auth-preview`** is explicitly for **local verification** of Supabase Auth + **`profiles`** mapping (fake seed users, smoke-test parity). |
| **Copy and layout** | Technical wording (e.g. references to npm scripts, RLS, seed accounts) is appropriate for **developers**, not end users. |
| **Risk of coupling** | Keeping preview separate avoids mixing **test affordances** (quick-fill emails, verbose errors) with **production** support flows. |
| **Stability** | Teams can change **`/auth-preview`** for debugging without breaking the **customer-facing** login contract. |
| **Requirement** | Product asked to **not remove** **`/auth-preview`** — it remains a **direct dev route** even after **`/login`** exists. |

---

## 2) Target `/login` page experience

**Brand:** **Young’s Learners** — use existing app visual language (typography, colours, card layout from `src/components/ui/*`) for consistency; add clear logo lockup and page title distinct from internal “Auth Preview”.

**Positioning:** Single page framing **Staff** and **Parent** (and guardian) **portal sign-in** — one Supabase-backed email/password flow; optional short subcopy that HQ/Branch/Teacher/Parent/Student all use organisation accounts (no separate “modes” that imply different auth backends).

**Form:**

- Email + password fields with labels, `autocomplete` attributes, and keyboard submit.
- Primary **Sign in**; secondary actions only if product adds them later (e.g. **Forgot password** stub linking to Phase 4).

**Clean error state:**

- Inline or alert region for failed sign-in (wrong password, network) — **no** stack traces, **no** env keys, **no** raw JWT in UI.
- Optional distinction between “invalid credentials” and “could not reach server” without leaking internals.

**Loading state:**

- Disable form and show spinner or button loading text during `signInWithPassword` and profile fetch — same pattern as **`AuthPreview`** but polished.

**Sign-out / session:**

- **`/login`** should assume **unauthenticated** entry for “I need to sign in”; if user already has a session, either show **“You’re signed in — Continue”** linking to **`/`** or **`returnUrl`**, or call **`signOut`** only from explicit user action (product choice in implementation).

**Safe `returnUrl`:**

- Reuse **`src/lib/supabaseAuthReturnUrl.js`** (`sanitizeReturnUrlForRedirect`, `parseReturnUrlQueryParam`) — **no** open redirects, **no** `//`, exclude **`/login`** (and **`/auth-preview`**) from valid targets to prevent loops, cap length.

---

## 3) Role behaviour

| Rule | Detail |
|------|--------|
| **Source of truth** | After login, **`profiles.role`** → **`mapProfileToAppUser`** → **`AppLayout`** / **`permissionService`** — same as today for Supabase users. |
| **No production role picker** | Do **not** offer a client-side role selector that overrides the database role for authorization. |
| **`demoRole`** | Stays a **URL-only preview** mechanism (`?demoRole=`) — **separate** from production **`/login`**; continues to bypass real Supabase session for preview (existing Phase 3B/3C contract). |

---

## 4) Redirect behaviour (target end state)

| Audience / state | Target |
|------------------|--------|
| **Signed-out protected access** | Eventually **`Navigate`** to **`/login?returnUrl=…`** (sanitised) instead of **`/auth-preview`**, so customers never see the dev page by default. |
| **`/auth-preview`** | Remains **reachable directly** for developers and CI-style manual checks; not removed. |
| **Public routes** | **`/welcome`** (and any future marketing pages) stay **outside** the authenticated gate — no login required. |
| **Current (post–3C-2)** | Protected redirect uses **`/login?returnUrl=…`**. **`/auth-preview`** stays public and dev-only (not the default gate target). |

---

## 5) Safety

- **No service role key** in the browser — login uses **anon** Supabase client only (`supabaseAuthService` patterns).
- **No real child/parent/financial data** on the login page — only form fields and generic errors.
- **No env values or secrets** in UI, console logs in production builds, or committed **`.env.local`**.
- **No writes/uploads** as part of login — profile read is **read-only** for session establishment; any “complete profile” flow is a later product slice.

---

## 6) Implementation sequence

| Phase | Scope |
|-------|--------|
| **Phase 1** | **Done** — **`src/pages/Login.jsx`**, public **`/login`** route in **`App.jsx`** (with **`/welcome`** / **`/auth-preview`**); **`refreshAuthState`** after sign-in; **`parseReturnUrlQueryParam`** for post-login **`navigate`**; “already signed in” / profile-gap states; footer links to **`/welcome`** and **`/auth-preview`**. |
| **Phase 2** | **Done** (Supabase Auth **3C-2**) — **`AuthenticatedApp`** redirects signed-out protected traffic to **`/login?returnUrl=…`**; **`/auth-preview`** unchanged as a direct dev route. |
| **Phase 3** | Optional **role-based landing** after login (e.g. parent → **`/parent-view`**) when **`returnUrl`** absent — still honour **`returnUrl`** when present and safe. |
| **Phase 4** | **Password reset**, email templates, accessibility audit, rate-limit messaging, analytics — production polish. |

---

## 7) Historical implementation prompts

**Phase 1** (polished **`/login`**) and **Phase 2** / **3C-2** (protected redirect → **`/login`**) are **delivered**. Use **`docs/supabase-auth-phase-3c-checkpoint.md`** for the current redirect contract. Further work: **Phase 3** (role landing), **Phase 4** (reset / polish) in the table above.

---

*Document type: planning + implementation notes. Phases **1** and **2** (3C-2 redirect) are in code; **Phase 3+** remain optional product work.*

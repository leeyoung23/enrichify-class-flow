# Polished login page plan (`/login`)

**Planning only:** no new routes, redirects, or UI are added by this document. **`/auth-preview`**, **`demoRole`**, demo/local fallbacks, and Phase **3C-1** behaviour remain as implemented until a future coding task executes the phases below.

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
| **Phase 3C-1 until Phase 2 below** | Redirect may still point at **`/auth-preview`** until implementation explicitly switches the destination constant / helper. |

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
| **Phase 1** | Add **`/login`** route and page component: reuse **`signInWithEmailPassword`**, **`getCurrentProfile`**, **`mapProfileToAppUser`** / **`signOut`** from **`supabaseAuthService`**; polished layout and errors; **`returnUrl`** post-login navigation using existing URL helpers; register route **outside** heavy dev-only copy (or thin wrapper over shared sign-in logic extracted from **`AuthPreview`**). **Do not** remove **`/auth-preview`**. |
| **Phase 2** | In **`AuthenticatedApp`** (or shared helper), change unauthenticated redirect target from **`/auth-preview`** to **`/login`** (same query contract). Keep **`/auth-preview`** valid for direct navigation. |
| **Phase 3** | Optional **role-based landing** after login (e.g. parent → **`/parent-view`**) when **`returnUrl`** absent — still honour **`returnUrl`** when present and safe. |
| **Phase 4** | **Password reset**, email templates, accessibility audit, rate-limit messaging, analytics — production polish. |

---

## 7) Next implementation prompt (Phase 1 only)

Copy-paste for a future coding task:

> **Phase 1 — Add polished `/login` page (keep `/auth-preview`).**  
> Create **`src/pages/Login.jsx`** (or similar) and register **`/login`** in **`src/App.jsx`** as a **public** route (same level as **`/welcome`** / **`/auth-preview`**, outside the **`/*`** + **`AuthProvider`** gate if that keeps routing simple). Use **`signInWithEmailPassword`**, **`getCurrentProfile`**, **`mapProfileToAppUser`**, and **`signOut`** from **`supabaseAuthService.js`**. Brand the page for **Young’s Learners** with staff/parent portal positioning; email/password form; clean errors and loading state; after successful sign-in, **`navigate`** to **`parseReturnUrlQueryParam(searchParams.get('returnUrl'))`** or **`/`**. Reuse **`parseReturnUrlQueryParam`** / **`sanitizeReturnUrlForRedirect`** from **`src/lib/supabaseAuthReturnUrl.js`**; extend helpers if **`/login`** must be excluded from **`returnUrl`** targets. **Do not** remove or break **`/auth-preview`**. **Do not** remove **`demoRole`** or demo fallbacks. **Do not** add writes, uploads, AI calls, or service role. **Do not** change Phase **3C-1** redirect destination yet (that is Phase 2). Run **`npm run build`**, **`lint`**, **`typecheck`**, **`test:supabase:read`**, **`test:supabase:auth`**.

---

*Document type: planning. No runtime behaviour is changed by this file alone.*

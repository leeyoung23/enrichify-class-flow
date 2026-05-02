# AI Parent Report Edge Adapter Bundling Checkpoint

Date: 2026-05-02  
Scope: **Edge-compatible fake/disabled adapter** under `supabase/functions/_shared/`; **no** real provider HTTP; **no** provider keys; **no** `real_ai` unlock

## Checkpoint update (tooling verification — docs only)

- See **`docs/real-ai-provider-tooling-verification-checkpoint.md`**: **re-verified** — **`deno check`** on `generate-ai-parent-report-draft/index.ts` **PASS**; **`supabase functions` / `serve --help`** **PASS**; adapter smokes **PASS**. Deno **2.7.14** / Supabase **2.95.4** at `/opt/homebrew/bin` when using Homebrew PATH. No production deploy; no real provider HTTP yet.

---

## 1) Bundling conclusion

- Importing **`../../../src/services/...`** from an Edge Function is **risky for Supabase deploy**: the CLI bundle typically expects dependencies **inside `supabase/functions/`** (or Deno/npm URL imports). Relying on repo `src/` is fragile and may fail in CI or remote deploy.
- **Mitigation applied:** a **function-local copy** of the mock core + provider adapter lives at:
  - `supabase/functions/_shared/aiParentReportMockDraftCore.ts`
  - `supabase/functions/_shared/aiParentReportProviderAdapter.ts`
- **`generate-ai-parent-report-draft/index.ts`** now imports **`../_shared/aiParentReportProviderAdapter.ts`** only — **deploy-aligned** with common Supabase Edge layouts.

Canonical app modules remain unchanged for Vite/Node:

- `src/services/aiParentReportMockDraftCore.js`
- `src/services/aiParentReportProviderAdapter.js`

---

## 2) Behavior parity (fake / disabled / real stub)

| Mode | Result |
|------|--------|
| **fake** | Deterministic `structuredSections`; `providerLabel` = `fake_adapter`; `modelLabel` = `fake_deterministic_v1`; **no external HTTP** |
| **disabled** | Error `provider_disabled` |
| **real** | Error `real_provider_not_implemented` (**no** real provider call) |
| Invalid `reportId` | `invalid_report_id` |
| Unsafe input (URL/path/bucket-style, forbidden keys) | `unsafe_input` |
| Non-plain-object `input` | `invalid_input` |

---

## 3) Security boundary

- **No** provider keys; **no** external AI HTTP in this milestone.
- **No** JWT/env secret logging in the adapter or Edge handler.
- **No** persistence, **no** auto-release, **no** PDF/export from this scaffold.
- **`createAiParentReportVersion`** still blocks **`generationSource='real_ai'`** at the app service layer (unchanged).

---

## 4) Edge Function HTTP handler

- File: `supabase/functions/generate-ai-parent-report-draft/index.ts`
- **POST only**; JSON object body; invalid JSON → 400; non-object body → 400.
- Maps `invalid_report_id` / `unsafe_input` / `invalid_input` → **400**; wraps unexpected adapter throws with a **generic** 500 JSON body (**no** stack traces).
- Response includes `external_provider_call: false`.
- **No CORS** added (matches other local scaffolds such as `generate-parent-comment-draft`; add only when product calls for browser cross-origin access with a reviewed policy).

---

## 5) Smoke tests

| Command | Role |
|---------|------|
| `npm run test:supabase:ai-parent-report:provider-adapter` | Canonical `src/services` adapter + optional `real_ai` guard |
| `npm run test:supabase:ai-parent-report:edge-adapter` | `_shared` adapter + parity vs canonical + optional tooling **CHECK**s |

---

## 6) CHECK / WARNING (local Edge runtime)

- **`deno check`** on the Edge entry: **CHECK** if `deno` is not installed — install Deno or use **`supabase functions serve`** when validating the full Deno graph.
- **`supabase functions serve` / deploy**: **CHECK** if Supabase CLI is not installed or project is not linked — the **shared adapter contract** is still validated by `test:supabase:ai-parent-report:edge-adapter` without deploying.

---

## 7) What remains future

- Real provider HTTP (server-side only; secrets in Supabase Edge env — **never** frontend).
- **`real_ai`** version creation unlock + dedicated smokes + RLS review as needed.
- Optional **CI** step: `supabase functions deploy` dry-run or linked-project deploy when ready.
- Parity automation: if mock core changes, update **`_shared`** and **`src/services`** in the same change (or add a single-source export later).

---

## 8) Related commits / refs

- Adapter skeleton: `9f8ca6b`
- Docs skeleton final: `dc2e698` baseline before this bundling milestone

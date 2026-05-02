# Real AI Parent Report — Edge HTTP Checkpoint

Date: 2026-05-02  
Scope: **OpenAI-compatible real provider HTTP** in **`supabase/functions/_shared/`** + canonical **`src/services/`** mirror; **no** DB persistence; **no** `real_ai` unlock; **no** UI changes; **no** production deploy in this milestone

---

## 1) What was implemented

| Area | Detail |
|------|--------|
| **Real HTTP path** | `supabase/functions/_shared/aiParentReportRealProviderHttp.ts` — `fetch` to OpenAI-compatible **`/v1/chat/completions`** with JSON mode; validates 11 string sections |
| **Env (Edge / Node only)** | `AI_PARENT_REPORT_PROVIDER_API_KEY`, `AI_PARENT_REPORT_PROVIDER_MODEL` (both required to call); optional `AI_PARENT_REPORT_PROVIDER_BASE_URL` (default `https://api.openai.com/v1`) |
| **If secret/model missing** | Error code **`provider_not_configured`** — **no** outbound HTTP |
| **Adapter** | `generateAiParentReportDraft` is **async**; returns **`externalProviderCall`** boolean |
| **Section keys** | `supabase/functions/_shared/aiParentReportSectionKeys.ts` + `src/services/aiParentReportSectionKeys.js` |
| **Canonical Node mirror** | `src/services/aiParentReportRealProviderHttp.js` + updated `aiParentReportProviderAdapter.js` |
| **Edge handler** | HTTP status: **400** validation; **503** `provider_disabled` / `provider_not_configured`; **502** provider errors; **200** success; JSON body includes **`external_provider_call`** |

---

## 2) Explicit non-goals (unchanged)

- **No** `ai_parent_report_versions` writes from this path  
- **`createAiParentReportVersion`** still blocks **`real_ai`**  
- **No** provider keys in repo, frontend, or logs  
- **No** auto-release, PDF/export, notifications  
- **No** production deploy requirement for this checkpoint  

---

## 3) Smoke tests

| Command | Role |
|---------|------|
| `npm run test:supabase:ai-parent-report:edge-real-provider` | **provider_not_configured** without key; optional real HTTP **CHECK** if both env vars set |
| `npm run test:supabase:ai-parent-report:edge-adapter` | fake/disabled/parity/deno check |
| `npm run test:supabase:ai-parent-report:provider-adapter` | canonical adapter + `real_ai` guard |

---

## 4) CHECK / WARNING

- Optional live provider call runs **only** when **`AI_PARENT_REPORT_PROVIDER_API_KEY`** and **`AI_PARENT_REPORT_PROVIDER_MODEL`** are set (e.g. dev/staging); otherwise **CHECK skip** — **not** a failure  
- Integration smokes may **CHECK** when Supabase host unreachable (sandbox/network)  

---

## 5) Recommended next milestones

1. **Staging secret** + manual **`supabase functions serve`** / deploy smoke (non-prod)  
2. **`real_ai` unlock** planning + dedicated persistence smokes (separate milestone)  
3. Staff UI wiring to call Edge (when product-ready) — **not** in this checkpoint  

---

## 6) Related files

- `supabase/functions/_shared/aiParentReportRealProviderHttp.ts`
- `supabase/functions/_shared/aiParentReportProviderAdapter.ts`
- `supabase/functions/generate-ai-parent-report-draft/index.ts`
- `src/services/aiParentReportRealProviderHttp.js`
- `src/services/aiParentReportProviderAdapter.js`
- `scripts/supabase-ai-parent-report-edge-real-provider-smoke-test.mjs`

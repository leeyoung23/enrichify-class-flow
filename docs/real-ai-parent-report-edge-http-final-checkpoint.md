# Real AI Parent Report — Edge HTTP Skeleton Final Checkpoint

Date: 2026-05-02  
Scope: **documentation-only** finalization for the **real AI Edge HTTP skeleton** milestone  
Related implementation commit: **`b89239c`** Add real AI parent report Edge HTTP skeleton  
Prior checkpoint: `docs/real-ai-parent-report-edge-http-checkpoint.md`

---

## 1) Key checkpoint notes

- **Real provider HTTP skeleton** is implemented **server-side / Edge only** (`supabase/functions/_shared/` + Node mirrors for smoke parity).
- **No provider API key or model values** are committed to the repository.
- **No frontend provider key**; **no service-role key** in the browser.
- **No DB persistence** from the Edge path; **`createAiParentReportVersion`** still **blocks** `generationSource='real_ai'`.
- **No auto-release** of AI content to parents; **no PDF/export**; **no** automated emails or notifications.
- **Missing key or model** → error **`provider_not_configured`** → **no outbound HTTP**.
- **Optional** live provider exercise in smoke runs **only** when **`AI_PARENT_REPORT_PROVIDER_API_KEY`** and **`AI_PARENT_REPORT_PROVIDER_MODEL`** are both set; otherwise **CHECK / SKIP** (not a failure).
- **ParentView** visibility rules unchanged: parents see **released** / **current version** content only (no UI work in this milestone).

---

## 2) Files / structure

| Artifact | Path | Role |
|----------|------|------|
| Section keys | `supabase/functions/_shared/aiParentReportSectionKeys.ts` | Stable 11 output keys (mirrored in JS for Node) |
| Real provider HTTP | `supabase/functions/_shared/aiParentReportRealProviderHttp.ts` | OpenAI-compatible `fetch`; env read; no secret logging |
| Edge adapter | `supabase/functions/_shared/aiParentReportProviderAdapter.ts` | Async `generateAiParentReportDraft`; fake / disabled / real |
| Edge endpoint | `supabase/functions/generate-ai-parent-report-draft/index.ts` | POST handler; HTTP status mapping; `external_provider_call` |
| Source mirrors | `src/services/aiParentReportSectionKeys.js`, `aiParentReportRealProviderHttp.js`, `aiParentReportProviderAdapter.js` | Same contract for Node smokes; **no** keys in frontend bundle usage |
| Smoke | `scripts/supabase-ai-parent-report-edge-real-provider-smoke-test.mjs` | Safe defaults + optional real call |
| npm | `package.json` → `test:supabase:ai-parent-report:edge-real-provider` | Runs edge-real-provider smoke |

---

## 3) Provider / model configuration

| Variable | Role |
|----------|------|
| `AI_PARENT_REPORT_PROVIDER_API_KEY` | **Required** for an actual provider HTTP call (Edge secret or local process env only). |
| `AI_PARENT_REPORT_PROVIDER_MODEL` | **Required** with the key for a call (server-side; not UI). |
| `AI_PARENT_REPORT_PROVIDER_BASE_URL` | **Optional**; defaults to **`https://api.openai.com/v1`** (OpenAI-compatible). |

**Rules:** no values in repo; **no** `.env.local` committed; missing key or model → **`provider_not_configured`**; model selection remains **configurable** via env, **not** hardcoded in the staff app UI.

---

## 4) Real provider HTTP behavior

- **Endpoint shape:** OpenAI-compatible **`POST /v1/chat/completions`**.
- **`response_format`:** `{ type: "json_object" }` so the model returns a single JSON object.
- **Timeout:** ~**60s** via **`AbortController`** (classify as **`provider_timeout`** on abort).
- **Non-2xx:** safe generic failure (**`provider_request_failed`** / **502** at HTTP layer); **no** echo of provider error bodies to logs in normal operation.
- **Malformed JSON / invalid schema:** **`provider_response_invalid`**.
- **No** full prompt/response logging; **no** env/JWT/key logging.
- **No** persistence of generated rows; **no** parent release from this function.

---

## 5) Prompt / schema validation

**Required structured section keys** (all non-empty strings in a successful parse):

- `summary`
- `attendance_punctuality`
- `lesson_progression`
- `homework_completion`
- `homework_assessment_performance`
- `strengths`
- `areas_for_improvement`
- `learning_gaps`
- `next_recommendations`
- `parent_support_suggestions`
- `teacher_final_comment`

**Content expectations (system prompt + validation):** evidence-grounded; parent-friendly tone; **no invented facts**; **no diagnosis-like** claims; **no unsupported negative labels**; neutral **insufficient-evidence** style when context is thin; **no** raw storage paths, private URLs, or unnecessary identifiers in section text.

---

## 6) Edge endpoint behavior

- **POST only**; body must be a **JSON object** (`reportId`, `providerMode`, `input`).
- Modes: **fake** (deterministic), **disabled** (`provider_disabled`), **real** (HTTP when configured).
- **Status mapping (representative):**
  - **405** — wrong HTTP method  
  - **400** — invalid JSON, non-object body, `invalid_report_id`, `unsafe_input`, `invalid_input`, `input_too_large`  
  - **503** — `provider_disabled`, `provider_not_configured`  
  - **502** — `provider_timeout`, `provider_request_failed`, `provider_response_invalid`  
  - **500** — unexpected internal failure  
  - **200** — success  
- Response JSON includes **`ok`**, **`data`**, **`error`**, **`external_provider_call`**.

---

## 7) Smoke coverage

| Expectation | Result |
|-------------|--------|
| `npm run test:supabase:ai-parent-report:edge-real-provider` | **PASS** (baseline without keys) |
| No-key **`provider_not_configured`** | **PASS** |
| **fake** / **disabled** | **PASS** |
| **Unsafe input** blocked before provider | **PASS** |
| Optional real HTTP | **CHECK/SKIP** when env vars absent |
| No persistence / no **`real_ai`** unlock | **PASS** (by design) |
| No PDF/export / no notification side effects | **PASS** (documented) |

---

## 8) Validation result (from milestone `b89239c`)

**Historical snapshot** — rerun if runtime files change:

- `npm run build` — **PASS**
- `npm run lint` — **PASS**
- `npm run typecheck` — **PASS**
- `npm run test:supabase:ai-parent-report:edge-real-provider` — **PASS**
- `npm run test:supabase:ai-parent-report:edge-adapter` — **PASS**
- `npm run test:supabase:ai-parent-report:provider-adapter` — **PASS**
- `npm run test:supabase:ai-parent-report:mock-draft` — **PASS** (integration **CHECK**s if Supabase host unreachable)
- `npm run test:supabase:ai-parent-reports` — **PASS** (same **CHECK** pattern if applicable)
- `deno check supabase/functions/generate-ai-parent-report-draft/index.ts` — **PASS**

---

## 9) CHECK / WARNING notes

- **Optional real HTTP** skipped when API key + model are unset — expected **CHECK**, not failure.
- **Supabase `ENOTFOUND` / sign-in skipped** in some integration smokes when network/sandbox blocks host — **CHECK**, non-blocking for adapter-focused milestones.
- npm **`devdir`** config warning — non-blocking if observed.
- **No** widening of parent visibility, **`real_ai`** inserts, or auto-release was introduced in this milestone.

---

## 10) What remains future

- Choose and configure **dev/staging** provider secret + provisional model name (ops-only).
- **Dev/staging smoke** with **fake/dev payloads only** once secrets exist (never production PII).
- **`real_ai`** DB unlock + persistence smokes (**separate** milestone).
- Staff **UI** calling Edge **real** path when product-ready.
- PDF/export and notification strategy (planning only).

---

## 11) Recommended next milestone

| Opt | Milestone |
|-----|-----------|
| **A** | **Real provider secret/model selection + dev/staging smoke planning** (document provisional model, secret naming, staging-only procedure — **no** keys in repo) |
| **B** | Set **dev/staging** Edge secret and run optional real provider smoke |
| **C** | **`real_ai` DB unlock** |
| **D** | Staff UI → Edge real provider |
| **E** | PDF/export planning |

**Recommendation: A first.** The HTTP skeleton is in place; before storing any key, align on **provisional model**, **secret procedure**, and **staging-only** smoke steps — still **no** persistence unlock until **`real_ai`** is explicitly planned.

---

## 12) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Goal: Real provider secret/model selection + dev/staging smoke planning only (docs + runbook). Do not commit keys; do not unlock real_ai; do not change UI.

Constraints:
- No .env.local committed; no provider secrets in repo
- Staging/dev only for any future live smoke
- Document provisional model IDs and rotation notes
- Reference docs/real-ai-parent-report-edge-http-final-checkpoint.md

Deliverable: short planning doc or appendix + updated checkpoint pointer.

Validation: docs-only unless runtime files change — git diff --name-only.
```

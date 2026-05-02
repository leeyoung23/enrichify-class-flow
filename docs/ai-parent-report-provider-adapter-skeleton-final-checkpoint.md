# AI Parent Report Provider Adapter Skeleton Final Checkpoint

Date: 2026-05-02  
Scope: **docs-only** finalization for the AI parent report provider adapter skeleton milestone

Related implementation milestone commit: `9f8ca6b Add AI parent report provider adapter skeleton`  
Prior checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-checkpoint.md`

---

## 1) Key checkpoint notes

- Provider adapter **skeleton** is implemented (`fake` / `disabled` / safe `real` stub).
- **Fake** mode returns deterministic `structuredSections` (local only).
- **Disabled** mode returns safe `provider_disabled` error.
- **Real** mode returns safe `real_provider_not_implemented` error — **no real provider HTTP**.
- **No provider keys** in repo, frontend, or adapter logs.
- **No frontend provider key** and **no service-role frontend**.
- **No app UI changes** in this milestone.
- **No PDF/export**, **no notifications/emails**, **no live chat**.
- **No auto-release** of AI content to parents.
- **`createAiParentReportVersion` still blocks `generationSource='real_ai'`** — unlock is a **future** milestone with dedicated smoke proofs.

---

## 2) Adapter / skeleton location

| Artifact | Path | Role |
|----------|------|------|
| Canonical adapter | `src/services/aiParentReportProviderAdapter.js` | `generateAiParentReportDraft({ reportId, providerMode, input })` |
| Shared deterministic mock core | `src/services/aiParentReportMockDraftCore.js` | Section text + unsafe-input guards; used by mock draft write path and adapter **fake** mode |
| Write service | `src/services/supabaseWriteService.js` | Imports shared mock core for `generateMockAiParentReportDraft` (`mock_ai`) |
| Edge Function scaffold | `supabase/functions/generate-ai-parent-report-draft/index.ts` | POST handler delegates to adapter; **no secrets** |

**Deploy note:** Edge bundling may **not** include repo `src/` on deploy. If `supabase functions deploy` fails to resolve `../../../src/services/aiParentReportProviderAdapter.js`, relocate or copy shared code under `supabase/functions/_shared/` in a **future** milestone (still fake-only until real provider work).

---

## 3) Fake / disabled / real behavior

- **Fake:** deterministic `structuredSections` via `buildMockAiParentReportStructuredSections`; `providerLabel` = `fake_adapter`; `modelLabel` = `fake_deterministic_v1`; **no external HTTP call**.
- **Disabled:** `{ data: null, error: { code: 'provider_disabled', ... } }`.
- **Real:** `{ data: null, error: { code: 'real_provider_not_implemented', ... } }` — not implemented in this milestone.
- **Invalid `reportId`:** `invalid_report_id`.
- **Unsafe input** (URL/path/bucket-style, provider/debug key names): `unsafe_input`.

---

## 4) Security boundary

- Adapter does **not** log JWTs, env values, or provider secrets.
- Adapter does **not** log full sensitive request/response bodies (no such external calls in this milestone).
- Unsafe URL/path/bucket-style **input is rejected** (shared guard with mock draft).
- **No** raw storage paths or private URLs in accepted input.
- **No** service-role key in frontend; **no** provider key in frontend.
- **No** parent-visible surface: adapter does **not** release or write parent-facing rows.
- **No** auto-release; staff lifecycle remains explicit.

---

## 5) Service / versioning behavior

- Adapter skeleton **does not** add a new DB persistence path; it returns in-memory / JSON contract only.
- **`generateMockAiParentReportDraft`** still creates versions with `generationSource='mock_ai'` through the existing safe path.
- **`createAiParentReportVersion` still blocks `real_ai`** at the service layer.
- **`real_ai` unlock** must be a **separate** future milestone: service change + RLS review as needed + smokes.

---

## 6) Edge Function scaffold

- File: `supabase/functions/generate-ai-parent-report-draft/index.ts`
- **Fake / disabled / safe real-stub only**; **no** real provider secret; **no** provider HTTP.
- **Do not** use for real provider traffic until a dedicated implementation milestone (keys, auth, scope, smokes).
- **Bundling:** confirm local `supabase functions serve` / deploy resolves `src/` imports; otherwise plan `_shared` relocation **before** real provider wiring.

---

## 7) Smoke test coverage

- **Script:** `scripts/supabase-ai-parent-report-provider-adapter-smoke-test.mjs`
- **Command:** `npm run test:supabase:ai-parent-report:provider-adapter`
- **Covers:** fake `structuredSections` PASS; disabled safe error PASS; real not-implemented PASS; invalid UUID PASS; unsafe input blocked PASS; required section keys PASS; no external provider call PASS; optional integration — **`real_ai` still blocked** in `createAiParentReportVersion` when Supabase env present PASS; no PDF/export / no notification side effects documented as PASS-by-design for adapter-only scope.

---

## 8) Validation result

**Docs-only checkpoint:** run `git diff --name-only` only unless runtime files change.

**Historical runtime validation snapshot** from implementation milestone `9f8ca6b` (no rerun required for this docs-only pass):

- `git diff --name-only` ran before tests
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:ai-parent-report:provider-adapter` PASS
- `npm run test:supabase:ai-parent-report:mock-draft` PASS
- `npm run test:supabase:ai-parent-reports` PASS
- `npm run test:supabase:parent-announcements` PASS
- `npm run test:supabase:announcements:phase1` PASS

**Expected non-blocking CHECK/WARNING notes:**

- Unrelated-parent credential **CHECK** when fixture/auth missing
- Optional **`ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`** missing **CHECK** in phase1
- npm **`devdir`** warning non-blocking

---

## 9) What remains future

- Real provider **model selection** and planning
- Real provider **secret** configuration (Supabase Edge secrets only; never frontend)
- **Edge Function deployment/bundling** verification or **`_shared`** adapter relocation
- Real provider **HTTP** implementation (server-side only)
- **`real_ai` version creation unlock** + dedicated smokes
- Real AI **fake/dev** smoke against staging project (when ready)
- PDF/export planning; notification/email planning

---

## 10) Recommended next milestone

Choose:

- **A.** Real AI provider implementation planning / model selection  
- **B.** Edge Function deployment/bundling check with **fake** provider only  
- **C.** Real provider key wiring  
- **D.** PDF/export planning  
- **E.** Final mock/manual AI report QA checkpoint  

**Recommendation: B first.**

Why:

- Adapter skeleton and Edge scaffold already exist; **confirm deploy/serve bundling** (or `_shared` path) **before** real keys and real HTTP.
- Still **no** real AI call and **no** provider secret in this step.
- Reduces risk that real provider work fails for **import/path** reasons unrelated to AI quality.

---

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document AI parent report provider adapter skeleton

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Edge Function deployment/bundling check with fake provider only.

Do not change app UI.
Do not change ParentView visibility rules.
Do not unlock real_ai version creation.
Do not add real provider keys.
Do not call OpenAI/Claude/Gemini or any external AI HTTP.
Do not implement PDF/export.
Do not auto-send emails or notifications.
Do not use service role key in frontend.
Do not remove demoRole or demo/local fallback.
Use fake/dev data only in tests.

Goal:
Verify supabase functions serve / deploy can bundle generate-ai-parent-report-draft with the adapter at ../../../src/services/aiParentReportProviderAdapter.js, OR relocate/copy a fake-only adapter under supabase/functions/_shared so deploy succeeds — still fake/disabled modes only.

Deliverables:
1) Document bundling outcome (PASS path or required _shared relocation plan).
2) Optional minimal script or docs for local serve smoke (no real secrets).
3) Update checkpoint docs only if behavior/path changes; otherwise docs note only.

Validation efficiency rule:
If only docs change after investigation: git diff --name-only only.
If runtime/Edge files move: run build/lint/typecheck + npm run test:supabase:ai-parent-report:provider-adapter.
```

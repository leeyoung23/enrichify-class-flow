# AI Parent Report Provider Adapter Skeleton Checkpoint

Date: 2026-05-02  
Scope: server-side provider adapter skeleton with **fake** and **disabled** modes only

## Final docs-only alignment

- Finalized documentation: `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`
- Next roadmap focus: **Edge Function deployment/bundling check (fake provider only)** before real keys or `real_ai` unlock.

## 1) Summary

- Added canonical adapter module:
  - `src/services/aiParentReportProviderAdapter.js`
  - entry: `generateAiParentReportDraft({ reportId, providerMode, input })`
  - modes: `disabled`, `fake`; `real` fails safely (`real_provider_not_implemented`)
- Extracted shared deterministic section builder:
  - `src/services/aiParentReportMockDraftCore.js`
  - imported by `supabaseWriteService.js` (existing mock draft path) and the adapter (fake mode)
- Edge Function scaffold (no secrets, no external AI HTTP):
  - `supabase/functions/generate-ai-parent-report-draft/index.ts`
  - delegates to the same adapter module (relative import; deployment bundling may require `_shared` relocation later)
- Smoke:
  - `scripts/supabase-ai-parent-report-provider-adapter-smoke-test.mjs`
  - `npm run test:supabase:ai-parent-report:provider-adapter`

## 2) Explicit non-goals (this milestone)

- No app UI changes (`AiParentReports.jsx` unchanged).
- No real AI provider HTTP calls.
- No provider API keys in repo, frontend, or logs.
- No unlocking `generationSource='real_ai'` in `createAiParentReportVersion` (guard unchanged).
- No auto-submit / approve / release.
- No ParentView visibility changes.
- No SQL/RLS changes.

## 3) Contract

- Success (fake): `{ structuredSections, providerLabel, modelLabel, warnings, usage }` — `usage` is fake/internal-only metadata.
- Disabled: `{ data: null, error: { code: 'provider_disabled', ... } }`
- Real mode requested: `{ data: null, error: { code: 'real_provider_not_implemented', ... } }`
- Unsafe input (URLs/paths/buckets): `{ data: null, error: { code: 'unsafe_input', ... } }`

## 4) Recommended next milestone

- **Edge Function deployment/bundling check** with **fake** provider only (confirm `src/` import resolves on serve/deploy or plan `supabase/functions/_shared` relocation).
- Later: real provider secrets + HTTP only after bundling is proven; **`real_ai`** persistence unlock remains a separate gated milestone + smoke proofs.

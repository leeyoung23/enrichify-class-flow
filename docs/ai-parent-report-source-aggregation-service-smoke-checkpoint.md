# AI parent report — fake source aggregation service + smoke checkpoint

Date: 2026-05-02  
Scope: **implementation checkpoint** — fake/dev aggregation module + **non-Supabase** smoke test only.

## What was added

- **`src/services/aiParentReportSourceAggregationService.js`**
  - `collectAiParentReportSourceEvidence({ studentId, classId, branchId, periodStart, periodEnd, mode = 'fake' })` — **`fake` mode only**; throws if mode is not `fake`.
  - Deterministic **demo strings** only — **no** Supabase reads, **no** persistence, **no** provider calls.
  - `buildMockDraftInputFromSourceEvidence(sourceEvidence)` — maps aggregation output to **`generateMockAiParentReportDraft`** / `buildMockAiParentReportStructuredSections` input shape (safe strings).
  - **`EVIDENCE_CLASSIFICATION`** — `safe_for_ai_summary`, `staff_only_requires_selection`, `sensitive_requires_confirmation`, `never_send_to_provider`.

- **`scripts/supabase-ai-parent-report-source-aggregation-smoke-test.mjs`**
  - **No** `.env.local` required; **no** database; **no** real AI.
  - npm: `npm run test:supabase:ai-parent-report:source-aggregation`

## Boundaries (unchanged)

- **No** app UI changes to `AiParentReports.jsx` in this milestone.
- **No** ParentView visibility changes.
- **No** SQL/RLS changes; **no** `real_ai` unlock.
- **No** service-role frontend; **no** provider keys.
- **No** auto-release, email, notification, or PDF.
- **Parent** draft/evidence access unchanged (smoke does not call write services).

## Future

- Replace `mode: 'fake'` with RLS-bound reads in a later milestone; keep **redaction** and **teacher confirmation** rules from `docs/ai-parent-report-source-aggregation-evidence-intake-plan.md`.
- Wire UI “Source Evidence Preview” to real aggregation when ready.
- Observations and worksheet scans remain **future** real evidence sources.

## Validation

- `npm run test:supabase:ai-parent-report:source-aggregation`
- Regression: `npm run test:supabase:ai-parent-report:mock-draft`, `npm run test:supabase:ai-parent-reports`

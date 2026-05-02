# AI parent report — Source Evidence Preview UI checkpoint

Date: 2026-05-02  
Scope: **staff UI + fake aggregation only** — no new Supabase source reads, no SQL/RLS, no `real_ai` unlock, no ParentView change.

## Summary

- **`src/pages/AiParentReports.jsx`** now calls **`collectAiParentReportSourceEvidence({ mode: 'fake' })`** when a report is selected (demo and authenticated UIs). **No** extra Supabase queries for aggregation.
- **Source Evidence Preview** card shows fake summaries, **warnings**, **missingEvidence**, and **evidenceItems** with **classification** (including **never_send_to_provider** as not for external providers).
- **Generate Mock Draft** merges **manual form fields** with **`buildMockDraftInputFromSourceEvidence`** output — non-empty manual fields win.
- Demo mock draft structured sections use **`buildMockAiParentReportStructuredSections`** for parity with the authenticated mock path.

## Boundaries

| Topic | Status |
|-------|--------|
| Supabase reads for aggregation | **None** |
| Persistence from aggregation | **None** |
| Real AI / provider calls | **None** |
| Provider keys | **None** |
| SQL / RLS | **Unchanged** |
| Parent visibility | **Unchanged** |
| Notifications / PDF | **None** |

## Validation (run after UI changes)

- `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run test:supabase:ai-parent-report:source-aggregation`
- `npm run test:supabase:ai-parent-report:mock-draft`
- `npm run test:supabase:ai-parent-reports`

## Future

- Replace fake aggregation with **RLS-bound** reads (same shape).
- Wire optional **worksheet/OCR** and **Observations** feeds when ready.

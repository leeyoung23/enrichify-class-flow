# AI parent report — Source Evidence Preview UI checkpoint

Date: 2026-05-02  
Scope: **staff UI** — **`demoRole` → fake** aggregation; **authenticated staff → hybrid** (RLS where available + fake fill); **no** SQL/RLS DDL, no `real_ai` unlock, no ParentView change.

## Summary

- **`src/pages/AiParentReports.jsx`** calls **`collectAiParentReportSourceEvidence`** with **`mode: 'fake'`** in **demo / `demoRole`** and **`mode: 'hybrid'`** for **authenticated** staff with a Supabase session (**fake** if session unavailable). Passes **`reportId`** when the selected id is a UUID. See **`docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`**.
- **Hybrid** uses existing **read helpers** + JWT — **no** new DDL; service detail in **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**.
- **Source Evidence Preview** shows summaries, **warnings** (informational), **missingEvidence** (**Fallback / missing evidence**), and **evidenceItems** with staff-safe classification labels (**Not sent to provider**, **Requires teacher confirmation**, etc.).
- **Generate Mock Draft** uses **loaded preview evidence** when valid, else **re-collects** with the **same mode**; merges via **`buildMockDraftInputFromSourceEvidence`** + **`mergeMockDraftFormWithEvidence`** — **non-empty manual fields win**.
- Demo mock draft structured sections use **`buildMockAiParentReportStructuredSections`** for parity with the authenticated mock path.

## Boundaries

| Topic | Status |
|-------|--------|
| Supabase reads for aggregation | **JWT-scoped reads in hybrid** for authenticated staff (existing service path) |
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

- Optional **`rls`-only** staff toggle for debugging.
- Wire optional **worksheet/OCR** and **Observations** feeds when ready.

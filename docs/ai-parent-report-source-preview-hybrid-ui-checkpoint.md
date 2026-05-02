# AI parent report — Source Evidence Preview hybrid UI checkpoint

Date: 2026-05-02  
Scope: **`src/pages/AiParentReports.jsx`** only — **no** Supabase SQL/RLS changes, **no** `real_ai` unlock, **no** ParentView change, **no** provider keys or real provider calls.

## Summary

- **Demo / `demoRole`:** `collectAiParentReportSourceEvidence` uses **`mode: 'fake'`** (predictable demo/fallback text).
- **Authenticated staff** (staff role, Supabase session, not demo): **`mode: 'hybrid'`** — RLS-backed reads where available, **fake** fill for empty string fields; **`reportId`** passed when `selectedReportId` is a UUID (evidence-link aggregation).
- **No manual mode toggle** and **no** `rls`-only UI path in this milestone.
- **Source Evidence Preview** labels: demo badge **“Demo/fallback evidence”**; authenticated **“System evidence preview”**; missing/fallback list **“Fallback / missing evidence”**; classification copy **“Not sent to provider”** / **“Requires teacher confirmation”** where applicable.
- **Generate Mock Draft** uses **current `sourceEvidencePreview`** when loaded and not in error; otherwise **re-collects** with the **same mode and params** as the preview. **`buildMockDraftInputFromSourceEvidence`** + **`mergeMockDraftFormWithEvidence`** — **non-empty manual fields override** evidence-derived strings.
- **Demo** mock draft remains **local-only**; **authenticated** path still calls **`generateMockAiParentReportDraft({ reportId, input })`** only.

## Metadata / gaps

- **`studentId`**, **`classId`**, **`branchId`**, **`periodStart`**, **`periodEnd`** passed from the selected report when present; missing values use **empty strings** to the service (supported). **Informational “Scope note”** when key report fields are missing — **no** raw errors, **no** crashes.

## Safety

| Topic | Status |
|-------|--------|
| SQL / RLS DDL | **None** |
| ParentView | **Unchanged** (released/current-version-only) |
| Service role in frontend | **None** |
| Raw storage paths / private URLs in preview | **Still sanitized at service**; UI avoids exposing rows |
| `real_ai` | **Still blocked** |
| Email / notification / PDF | **None** |

## Related docs

- Plan: **`docs/ai-parent-report-source-preview-hybrid-ui-plan.md`**
- Service: **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**
- Prior preview UI: **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**

## Validation (post-change)

- `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run test:supabase:ai-parent-report:source-aggregation`
- `npm run test:supabase:ai-parent-report:rls-source-aggregation`
- `npm run test:supabase:ai-parent-report:mock-draft`
- `npm run test:supabase:ai-parent-reports`

## Future

- Optional **manual mode toggle** (e.g. `rls` for debugging) if product needs it.
- Per-field **“demo vs system”** chips when the service exposes field-level provenance.
- Tighter **minimum evidence** policy for mock draft (if product requires).

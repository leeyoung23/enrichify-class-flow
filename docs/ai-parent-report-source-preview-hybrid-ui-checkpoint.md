# AI parent report — Source Evidence Preview hybrid UI checkpoint

Date: 2026-05-02  
Implements: commit **`d235344`** (*Wire AI report source preview hybrid mode*).  
**Full sealed documentation:** **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**.

## Summary (short)

- **Demo / `demoRole`:** `collectAiParentReportSourceEvidence` — **`mode: 'fake'`**.
- **Authenticated staff** with session: **`mode: 'hybrid'`** (RLS where available + fake fill); **`reportId`** when `selectedReportId` is UUID.
- **No** manual mode toggle; **no** `rls`-only UI.
- **Preview labels:** **Demo/fallback evidence** | **System evidence preview**; **Fallback / missing evidence**; **Heads-up** warnings; classification **Not sent to provider** / **Requires teacher confirmation** (see code).
- **Generate Mock Draft:** prefers **`sourceEvidencePreview`**; else **`fetchSourceEvidenceBundle()`**; **`buildMockDraftInputFromSourceEvidence`** + **`mergeMockDraftFormWithEvidence`** (manual non-empty wins).
- **Demo** mock draft **local-only**; **auth** calls **`generateMockAiParentReportDraft`** only.

## Metadata / gaps

Empty ids/dates passed as **empty strings** where needed; **Scope note** when report rows lack student/class/branch/period — **no** raw errors.

## Safety

| Topic | Status |
|-------|--------|
| SQL / RLS DDL | **None** |
| ParentView | **Unchanged** |
| Service role / provider keys (frontend) | **None** |
| `real_ai` | **Blocked** |
| Email / notification / PDF | **None** |

## Related docs

- **Final (canonical detail):** **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**
- **Manual visual QA (desktop + ~390px):** **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`**
- Plan: **`docs/ai-parent-report-source-preview-hybrid-ui-plan.md`**
- Service: **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**
- UI milestone: **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**

## Validation (recorded at `d235344`)

| Step | Result |
|------|--------|
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:supabase:ai-parent-report:source-aggregation` | PASS |
| `npm run test:supabase:ai-parent-report:rls-source-aggregation` | PASS (parent fixture **CHECK** possible) |
| `npm run test:supabase:ai-parent-report:mock-draft` | PASS |
| `npm run test:supabase:ai-parent-reports` | PASS (unrelated-parent **CHECK** possible) |

**Docs-only updates** after `d235344` do **not** require re-running these unless **`src/`** changes.

## Future

See §9 in **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**.

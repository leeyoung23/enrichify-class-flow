# AI parent report — source aggregation smoke **pass** checkpoint (final)

Date: 2026-05-02  
Scope: **documentation-only** — seals the fake/dev source aggregation + smoke milestone; **no** code changes in this doc.

**Implements / references:** commit **`9deef75`** (Add AI parent report source aggregation smoke test).

**Detail checkpoint:** `docs/ai-parent-report-source-aggregation-service-smoke-checkpoint.md`

---

## Seal summary

- **Fake/dev** `collectAiParentReportSourceEvidence` + **`buildMockDraftInputFromSourceEvidence`** are in repo and covered by smoke.
- **No** Supabase reads/writes inside the aggregation module; **no** persistence; **no** real AI; **no** provider keys.
- **No** SQL/RLS edits; **`real_ai`** still blocked at `createAiParentReportVersion`; **no** ParentView rule changes.
- **No** email/notification/PDF/auto-release in this milestone.

---

## Validation snapshot (frozen)

| Command | Expected |
|---------|----------|
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:supabase:ai-parent-report:source-aggregation` | PASS |
| `npm run test:supabase:ai-parent-report:mock-draft` | PASS |
| `npm run test:supabase:ai-parent-reports` | PASS |

Re-run when touching aggregation, mock draft, or AI report services.

---

## Milestone A — implemented (2026-05-02)

**Source Evidence Preview** is wired to **`collectAiParentReportSourceEvidence`** (`fake` only). See **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**.

**Generate Mock Draft** merges manual fields with **`buildMockDraftInputFromSourceEvidence`** (non-empty manual overrides win).

## Milestone B — RLS aggregation service (2026-05-02)

- **`mode: 'rls'`** / **`hybrid`** implemented in **`aiParentReportSourceAggregationService.js`** using existing read helpers only — see **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`** and **`docs/ai-parent-report-rls-source-aggregation-plan.md`**.
- Smoke: **`npm run test:supabase:ai-parent-report:rls-source-aggregation`**.
- UI still defaults to **fake** preview; wiring **`rls`** into **`AiParentReports.jsx`** is a follow-up.

| Option | Milestone |
|--------|-----------|
| ~~**A**~~ | ~~UI preview ↔ **fake** aggregation~~ **Done** |
| ~~**B**~~ | ~~RLS-bound source aggregation real reads~~ **Service + smoke done**; **UI use of `rls` deferred** |
| **C** | Worksheet/OCR evidence intake planning |
| **D** | Real provider smoke (staging/key-gated) |
| **E** | Email/notification automation planning |

---

## Next implementation prompt (copy-paste) — milestone B

```text
Add authenticated mode for collectAiParentReportSourceEvidence that performs RLS-bound reads via existing supabaseReadService helpers only—same output shape as fake mode; redact/minimise strings; no new tables/SQL in this milestone unless approved; real_ai stays blocked; ParentView unchanged.

Validation: extend or add smoke with existing RLS fixtures; full regression AI parent report smokes.
```

---

## What stays deferred

- RLS-bound aggregation mode; worksheet/OCR; structured Observations feed; **`real_ai`** unlock; parent notifications until release policy; PDF/export.

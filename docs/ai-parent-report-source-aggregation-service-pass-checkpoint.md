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

## Recommended next milestone

**A — Wire AI Parent Reports “Source Evidence Preview” UI to the fake aggregation service** (first).

**Why:** The service and smoke **prove the pipeline shape**. Staff UI already describes a **report source data preview** concept (`AiParentReports.jsx`); calling **`collectAiParentReportSourceEvidence`** (fake mode) when a report is selected validates **workflow and copy** before **RLS-bound reads** (B) or **real AI** (D/E).

| Option | Milestone |
|--------|-----------|
| **A** | UI preview ↔ **fake** aggregation (recommended next) |
| **B** | RLS-bound source aggregation real reads |
| **C** | Worksheet/OCR evidence intake planning |
| **D** | Real provider smoke (staging/key-gated) |
| **E** | Email/notification automation planning |

---

## Next implementation prompt (copy-paste)

```text
Wire AI Parent Reports Source Evidence Preview UI to the fake aggregation service only.

Constraints:
- Project: enrichify-class-flow. Branch: ask user.
- Call collectAiParentReportSourceEvidence from src/services/aiParentReportSourceAggregationService.js with mode 'fake' only.
- Use selected report's studentId, classId, branchId, reportPeriodStart/End when available; otherwise safe fake UUIDs/dates consistent with demo mode.
- Render summaries + evidenceItems in the existing "Report source data preview" / detail area (staff-only). No ParentView changes.
- Do not add Supabase reads in this milestone unless explicitly approved.
- Do not unlock real_ai. Do not add provider keys. No SQL/RLS changes.
- Optional: show buildMockDraftInputFromSourceEvidence output collapsed/debug-staff-only — must not leak storage paths or secrets.

Validation: npm run build, lint, typecheck; npm run test:supabase:ai-parent-report:source-aggregation; regression AI parent report smokes.
```

---

## What stays deferred

- RLS-bound aggregation mode; worksheet/OCR; structured Observations feed; **`real_ai`** unlock; parent notifications until release policy; PDF/export.

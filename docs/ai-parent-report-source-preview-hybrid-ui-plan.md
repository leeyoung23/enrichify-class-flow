# AI Parent Report — Source Evidence Preview: fake → hybrid / RLS UI plan

Date: 2026-05-02  
Scope: **planning only** — no `AiParentReports.jsx` changes, no new services, no SQL/RLS, no provider keys, no `real_ai` unlock, **no UI wiring in this document**.

**Related:** `docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`, `docs/ai-parent-report-rls-source-aggregation-plan.md`, `docs/ai-parent-report-source-preview-ui-checkpoint.md`, `docs/ai-parent-report-source-aggregation-service-pass-checkpoint.md`, `docs/ai-parent-report-source-aggregation-evidence-intake-plan.md`

---

## 1. Current state

| Topic | Status |
|-------|--------|
| **Source Evidence Preview (UI)** | Calls **`collectAiParentReportSourceEvidence({ mode: 'fake' })`** when a report is selected |
| **Service** | **`fake`**, **`rls`**, **`hybrid`** implemented in `aiParentReportSourceAggregationService.js` |
| **UI + rls/hybrid** | **Not wired** — preview remains **fake-only** on purpose until this plan is implemented |
| **Smokes** | `source-aggregation`, `rls-source-aggregation`, `mock-draft`, `ai-parent-reports` — expected to pass at last checkpoint |
| **SQL / RLS** | **Unchanged** in aggregation milestone |
| **Real provider** | **None** |
| **Parent visibility** | **Unchanged** (ParentView released-only) |

---

## 2. Product purpose

- **Staff** should see **real, RLS-backed evidence summaries** when authenticated and when data exists, so the preview matches operational reality.
- **Fake** content should become a **clearly labeled** fallback or **demo-only** layer—not indistinguishable from live data.
- **Teachers** must see **which lines are system-backed**, which are **placeholder / missing**, and which need **confirmation** before parent-facing use.
- **Generate Mock Draft** should consume the **best available safe bundle** (hybrid for auth, fake for demo)—manual fields continue to **override** non-empty source lines.

---

## 3. Mode selection strategy

| Option | Description |
|--------|-------------|
| **A** | Always **fake** — simple but hides real data forever |
| **B** | Always **rls** — empty sections when RLS returns nothing; harsh UX |
| **C** | **hybrid** for authenticated staff, **fake** for **demoRole** / local demo — **recommended first** |
| **D** | Manual toggle (fake / rls / hybrid) — power-user; add **after** C if needed |

**Recommendation: C**

- **`demoRole` or in-demo local shell:** `mode: 'fake'` (predictable, no Supabase dependency for preview).
- **Authenticated staff (JWT + RLS):** `mode: 'hybrid'` so RLS-filled fields show real summaries and empty fields get **visible fake fallback** with explicit labeling (not silent substitution).
- **`rls` only** as a **future** staff debug or admin readout (optional), not the default.

**Optional `reportId`:** pass **`selectedReportId`** when it is a real UUID so evidence-link aggregation can run in RLS/hybrid paths.

---

## 4. UI labels and trust language

| Context | Planned label / copy |
|---------|----------------------|
| Hybrid/RLS-backed section | **“System evidence preview”** (or “RLS-scoped evidence”) |
| Field filled from **fake** branch of hybrid | **“Demo / fallback”** chip next to that block or line |
| **missingEvidence** | **“Not available for this period or scope”** — not an error state |
| **warnings** | Short **checklist** (“RLS read checks”, “gap list”) — informational |
| Low confidence / **staff_only** / **sensitive** | **“Requires teacher confirmation”** (badge) |
| **never_send_to_provider** | **“Not for external providers”** / **“Staff metadata only”** (existing pattern can extend) |

---

## 5. Missing source behavior

- Show **`missingEvidence`** as a **neutral** list (icons optional)—not red error banners unless the whole aggregation failed.
- Show **`warnings`** as a **non-blocking** info panel.
- **Empty** top-level summaries: show **one-line fallback** (“No rows in scope…”) **or** hybrid-injected fake line **with** “Demo fallback” badge—pick one pattern and stay consistent.
- **Do not** block **Generate Mock Draft** solely because of gaps (unless a **future** policy requires minimum evidence—out of scope here).
- Teachers can still type **manual overrides** and generate.

---

## 6. Generate Mock Draft behavior (planned)

| Context | Source for merge (with `buildMockDraftInputFromSourceEvidence` + manual override) |
|---------|--------------------------------------------------|
| **Demo / `demoRole`** | **`fake`** aggregation only (current behaviour extended to same merge rules). |
| **Authenticated staff** | **`hybrid`** — same merge: non-empty **manual** textarea beats source line. |
| **Release / parents** | **Unchanged** — mock draft is **staff-only** until lifecycle release; **no** auto-release. |
| **Real AI provider** | **Not used** in this milestone series. |

---

## 7. Role behavior

- **HQ / supervisor / teacher:** preview respects **RLS** via JWT; less data → more **`missingEvidence`**, never escalated privileges.
- **Parent / student:** **no** staff route access to this page; **no** change to ParentView.
- **No service-role** client; **no** raw Supabase errors in UI copy—generic safe strings only.

---

## 8. Safety / privacy boundaries

- **No** raw `storage_path`, private URLs, or bulk row dumps in preview cards.
- **No** piping evidence straight to parents—preview is **staff-only**.
- **No** provider metadata, **`real_ai`** toggle, notification/email, or PDF/export promises in this flow.

---

## 9. Mobile-first UX (~390px)

- Keep **summary grid** stacked single-column on narrow screens.
- **Badges:** mode (**Demo** vs **System**), classification (**confirmation**, **never_send**).
- **Evidence items:** **collapsible** section if list exceeds ~6 rows or viewport height.
- **Copy:** “Fallback” / “demo” wording should sound **routine**, not alarming—e.g. “Placeholder until live data connects”, not “ERROR”.
- Avoid **horizontal scroll** on badges + chip rows (flex-wrap).

---

## 10. Implementation phasing

| Phase | Content |
|-------|---------|
| **A** | **This plan** (docs only) |
| **B** | Wire **authenticated** preview to **`hybrid`**; **`demoRole`** stays **`fake`** |
| **C** | Optional **manual mode toggle** (advanced) |
| **D** | Align **Generate Mock Draft** merge input with **same** aggregation call as preview (`hybrid` vs `fake`) |
| **E** | **SQL/RLS gap review** only after documented misses—not speculative DDL |

**Recommendation:** ship **B + D** in **one** small PR if risk stays low: single source of truth for “what evidence bundle we’re using” per selected report + auth/demo branch—**no new services**, **no SQL**.

---

## 11. Future QA / smoke

When UI is wired:

- `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run test:supabase:ai-parent-report:source-aggregation`
- `npm run test:supabase:ai-parent-report:rls-source-aggregation`
- `npm run test:supabase:ai-parent-report:mock-draft`
- `npm run test:supabase:ai-parent-reports`
- **Manual:** ~390px pass on Source Evidence Preview card (wrap, badges, collapsible region)

---

## 12. Recommended next milestone

| Option | Topic |
|--------|--------|
| **A** | **Wire Source Evidence Preview + mock-draft source input to hybrid for authenticated staff** — **recommended first** |
| **B** | Real provider smoke (staging/key-gated) |
| **C** | Worksheet/OCR planning |
| **D** | Email automation |
| **E** | PDF/export |

---

## 13. Next implementation prompt (copy-paste)

```text
Implement docs/ai-parent-report-source-preview-hybrid-ui-plan.md for AiParentReports.jsx only.

Rules:
- demoRole / local demo: collectAiParentReportSourceEvidence mode 'fake' (unchanged behavior).
- Authenticated staff with Supabase session: mode 'hybrid'; pass report UUID as reportId when selectedReportId is UUID for evidence links.
- UI: label System vs Demo/fallback per plan §4; show missingEvidence and warnings per §5.
- Generate Mock Draft: use the same mode + params as preview when merging buildMockDraftInputFromSourceEvidence + manual fields.
- No SQL/RLS DDL; no real_ai; no ParentView changes; no provider keys.

Validate: build, lint, typecheck, aggregation smokes, mock-draft, ai-parent-reports smokes.
```

---

## Validation (this document)

- **Docs-only:** `git diff --name-only` lists this file; **no** build/lint/typecheck/smoke unless code ships.

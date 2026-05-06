# Manual visual QA — AI Parent Report PDF internal preview

Date: 2026-05-03 (template visual polish **2026-05-03** — **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**)  
Type: **QA / checkpoint only** — human screenshot pass for **`/ai-parent-report-pdf-preview`** before any parent-facing **Download PDF**, storage, or export persistence. **No** code changes implied by this document unless product explicitly requests fixes later.

**Surfaces:** `src/pages/AiParentReportPdfPreview.jsx` · helper `src/services/aiParentReportPdfTemplate.js`  
**Related:** `docs/ai-parent-report-pdf-internal-preview-checkpoint.md`, `docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`, `docs/ai-parent-report-pdf-template-contract-plan.md`, `docs/released-ai-parent-report-export-strategy-plan.md`, `docs/mobile-first-qa-checkpoint.md`

Use **fake/dev data only** (demo fixtures). Do **not** use real student, parent, or centre data in screenshots shared externally.

---

## 1. QA purpose

This pass validates **visual layout**, **readability**, and **staff-facing safety cues** for the **internal/dev HTML preview** of the released-report PDF template. It exists to catch typography, iframe, and labelling problems **before** investing in parent-facing export controls or binary PDF pipelines.

Success means staff can confidently judge whether the template looks **official enough** for eventual parent download — without mistaking the preview for a finished parent product.

---

## 2. Surfaces to preview

Capture **desktop** (typical staff width, e.g. 1280px+) and **~390px** mobile:

| Area | What to capture |
|------|-----------------|
| **Staff sidebar** | **No** “PDF preview” item — confirm it does **not** appear as a routine workflow link (**post–navigation clarity fix**) |
| **AI Parent Reports** | Optional dashed **Internal PDF preview** card + link (layout QA only; fake/dev; parents do not see) |
| **Page header** | App chrome title **Internal PDF preview**; iframe document shows **Student Progress Report** + boxed layout |
| **Safety banner** | Amber-style strip: fake/dev, not visible to parents, no file stored |
| **Variant selector** | Label **Demo fixture variant** + **Select** for four variants |
| **Variants** | **`monthly_progress`**, **`weekly_brief`**, **`long_text`**, **`sparse_optional_fields`** — one screenshot each after switching |
| **Iframe / report** | Sandboxed preview of rendered HTML (progress report body, sections, footer) |

Optional: screenshot **AI Parent Reports** optional **Internal PDF preview** card for traceability (**`docs/pdf-preview-navigation-clarity-fix-checkpoint.md`**).

---

## 3. Desktop QA checklist

- [ ] **Internal/dev-only** intent is obvious from header + banner (not a generic report page).
- [ ] **Fake/dev data** messaging is obvious (no implication of live learner data).
- [ ] **Not visible to parents** / **no ParentView surface** copy is easy to see.
- [ ] **No download**, **no export**, **no storage** controls on the page.
- [ ] **Variant selector** switches all four variants without errors or stale iframe content.
- [ ] **Report title** (“Progress report”) and **meta** (student, period, released, variant) read clearly inside iframe.
- [ ] **Section headings** and **section bodies** are readable; spacing feels intentional.
- [ ] Layout feels **A4 / print-oriented** (serif stack, sensible margins in iframe — not cramped web article).
- [ ] **Footer** (contact line + disclaimer) fully visible without hunting.
- [ ] **`long_text`**: teacher final comment truncates sanely (helper truncates at max length); no broken layout or clipped mid-word disasters.
- [ ] **`sparse_optional_fields`**: minimal headers still look **intentional**, not “broken empty”.
- [ ] **No** raw URLs, storage paths, **`generation_source`**, **`ai_model_label`**, **`evidence_links`**, **`release_events`**, provider/debug blocks, or internal IDs in the iframe content.

---

## 4. Mobile QA checklist (~390px width)

- [ ] Page **does not horizontally overflow** (no sideways scroll on the app chrome).
- [ ] **Variant selector** remains tappable; dropdown usable on small viewport.
- [ ] **Iframe** content is **scrollable** vertically or clearly contained; user understands where the report lives.
- [ ] **Banner** remains readable — not an unreadable wall of text; key bullets still scannable.
- [ ] Report text inside iframe remains **readable** (if fonts feel tiny, note severity — may inform template/CSS later).
- [ ] **Internal-only** labelling still visible **above the fold** or after minimal scroll (not buried).
- [ ] **Back to AI Parent Reports** link still reachable.
- [ ] No critical staff workflow hidden behind awkward overflow (preview is informational — still note friction).

---

## 5. Print / PDF visual checklist

Validate **visual intent** for future print/PDF (browser print not required for this pass unless tester chooses **Print → Preview**):

- [ ] Overall impression: could this pass as an **official centre progress report** with branding placeholder?
- [ ] **Section headings** (`h2`) distinct from body; hierarchy clear.
- [ ] **Whitespace** between sections sufficient; not a single dense block.
- [ ] **Page-break risk**: note very long sections / long comments — may need print CSS tuning later (`@page` already in helper — judge appearance).
- [ ] **Long comments** remain readable (wrap, `pre-wrap` behaviour) — not a single unreadable line.
- [ ] **Footer** would survive **print** (visible at bottom of content flow; not clipped in iframe viewport alone).

---

## 6. Safety / privacy visual checklist

Confirm by inspection (aligned with helper validation rules):

- [ ] **No real** student, parent, teacher, or school names from production — only **Demo Student One**, **EduCentre**, etc.
- [ ] **No** `http://` / `https://` strings, storage paths, or signed URL patterns in iframe content.
- [ ] **No** service-role, SQL, RLS, `.env`, or **postgres** wording.
- [ ] **No** provider keys or API-like strings in UI.
- [ ] **No** `generation_source`, **`ai_model_label`**, **`evidence_links`**, **`release_events`** in rendered HTML.
- [ ] **No ParentView Download PDF** button anywhere on this flow.
- [ ] **No** notification or email subscription controls on this page.

---

## 7. Known risks to look for

| Risk | What to note |
|------|----------------|
| **Iframe height** | **`min-h-[70vh]`** may feel tight or excessive on short phones — document feel. |
| **A4 on phone** | Physical A4 metaphor may look **small** in iframe; decide if acceptable for staff sanity-check only. |
| **`long_text`** | Large comment block may stress **scroll** or **perceived density**. |
| **Subtle labelling** | If amber banner blends into theme, staff might miss **fake/dev** posture. |
| **“Looks done”** | Staff might assume parent download exists — **banner + header** must win. |
| **Weak footer** | Legal/disclaimer might feel too light for “official” — product feedback only. |
| **Plain design** | Placeholder branding strip is intentional — flag if **too** bare for stakeholder confidence. |

---

## 8. Recommended decision rule

**If QA finds material visual issues** (readability, broken sparse/long variants, misleading lack of internal labels):

→ **Fix PDF preview / template / page chrome** (`AiParentReportPdfPreview.jsx` and/or `aiParentReportPdfTemplate.js`) **before** parent-facing export work.

**If QA is clean**, choose next milestone:

| Option | Topic |
|--------|--------|
| **A** | PDF preview **visual polish** (typography, iframe UX, print preview tweaks) |
| **B** | **Parent Communication** step-label polish (`docs/teacher-upload-step-simplification-plan.md`) |
| **C** | ParentView **Download PDF** — **demo-only / policy-gated** button (only after preview acceptable) |
| **D** | **Notification** SQL/RLS foundation (`docs/notification-system-sql-rls-review-plan.md`) |
| **E** | Real **AI provider** smoke (policy + secrets) |

**Recommendation**

- **B** if teacher workflow clarity still dominates roadmap.
- **A** if preview is **too rough** for stakeholder sign-off.
- **C** only when preview is **visually and safely** acceptable for a parent-facing experiment.

---

## 9. Validation

- **Docs/checkpoint only** — no `src/` changes required for this milestone.
- **`git diff --name-only`** lists only `docs/` paths when committing this QA doc.
- Re-run **build/lint/typecheck** only when runtime files change.

---

## Screenshot log (fill during QA)

| # | Viewport | Surface | Variant | Pass/Fail | Notes |
|---|----------|---------|---------|-------------|-------|
| 1 | Desktop | Sidebar nav | — | | |
| 2 | Desktop | Full page | monthly_progress | | |
| … | ~390px | … | … | | |

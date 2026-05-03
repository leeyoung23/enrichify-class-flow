# Manual visual QA — ParentView printable report preview

Date: 2026-05-03  
Type: **QA / checkpoint only** — human screenshot pass for **ParentView → Progress Reports → Preview printable report** before any real **Download PDF**, storage, signed URLs, or export persistence. **No** code changes implied unless issues are filed separately.

**Implementation reference:** `docs/parent-view-printable-report-preview-checkpoint.md`  
**Related:** `docs/parent-view-ai-report-display-final-checkpoint.md`, `docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`, `docs/mobile-first-qa-checkpoint.md`

Use **fake/dev demo parent** or **staging fixtures only** — **no** real family or learner data in screenshots shared externally.

---

## 1. QA purpose

Validate that the parent-facing **printable HTML preview** is **clearly not a file download**, renders **released/current-version** content consistently with the section detail above, and remains **readable and trustworthy** on desktop and **~390px** width — **before** investing in binary PDF, buckets, or email/notifications.

---

## 2. Surfaces to check

Capture **desktop** (e.g. ~1280px) and **~390px** mobile:

| Surface | Notes |
|---------|--------|
| **Progress Reports** card | `#parent-progress-reports` |
| **Released report list** | Selected vs unselected report buttons |
| **Report detail** | Section `<details>` blocks above preview |
| **Preview printable report** | Primary CTA for preview |
| **Preview chrome** | Sky-tinted banner: **Printable report preview**, bullets, **Download PDF will come later** |
| **Sandboxed iframe** | Full **Student Progress Report** layout from **`renderReleasedReportPdfHtml`** |
| **Hide printable preview** | Collapses iframe |

---

## 3. ParentView QA checklist

- [ ] **Preview printable report** appears only when **detail + current version** loaded and preview pipeline succeeds (not during loading/error).
- [ ] Copy says **preview** / **printable** — **not** “Download PDF” or “Save PDF”.
- [ ] **No** real Download PDF button or file picker.
- [ ] Messaging that **no file is generated or stored** is easy to find.
- [ ] **Iframe** narrative matches the **same released** story as section detail (spot-check Summary / Teacher comment).
- [ ] Parent can still read **original** expandable sections **above** the preview without losing context.
- [ ] **No** evidence links, raw version history list, provider labels, or draft states in UI or iframe body.

---

## 4. Desktop visual checklist

- [ ] Preview area does **not** look broken or clipped oddly.
- [ ] **A4-style** document in iframe is **readable** (title, student panel, highlights, sections, signatures, footer).
- [ ] **Student information** panel legible.
- [ ] **At a glance** cards readable.
- [ ] **Report detail** sections legible; long text wraps sensibly.
- [ ] **Signature** block and **footer** visible without excessive iframe scroll for typical demo content.
- [ ] **Iframe height** feels reasonable (not zero-height flash; not absurdly tall empty space).

---

## 5. Mobile ~390px checklist

- [ ] **No horizontal overflow** on ParentView page chrome.
- [ ] **Preview printable report** is easy to tap; adequate tap target.
- [ ] **Iframe** scrolls vertically inside frame; parent understands content lives inside preview.
- [ ] Document may appear **small** — note severity if unreadable.
- [ ] Banner/helper copy is **scannable** (not a dense wall).
- [ ] **Hide printable preview** discoverable after opening preview.
- [ ] Rest of ParentView (nav, other cards) remains **usable**.

---

## 6. Safety / privacy checklist

By inspection (demo/staging only):

- [ ] **No real** names or centres beyond intentional demo copy (when using demo mode).
- [ ] **No** `http://` / storage paths / signed URL strings in iframe HTML.
- [ ] **No** service-role, SQL, RLS, `.env`, **postgres** wording.
- [ ] **No** provider keys or API-like strings.
- [ ] **No** `generation_source`, **`ai_model_label`**, **`evidence_links`**, **`release_events`** in rendered HTML.
- [ ] **No** email/notification subscription controls tied to preview.
- [ ] **No** download/export/storage UI.

---

## 7. Known risks

| Risk | Note |
|------|------|
| **Iframe size on phone** | A4 layout may feel **small** — acceptable only if text remains readable with scroll. |
| **Expectations** | Parents may assume a **file** will save — copy must stay explicit (**preview only**, **later**). |
| **Duplication** | Section details + full layout may feel long — watch fatigue. |
| **Polish** | Template may need another pass before marketing/stakeholder sign-off. |
| **Real Download PDF** | Should wait until **storage/export policy** and engineering design (**B** below). |

---

## 8. Recommended decision rule

**If QA finds visual or clarity issues** → adjust **ParentView preview chrome** and/or **`renderReleasedReportPdfHtml`** template **before** binary PDF work.

**If QA is clean**, next milestone options:

| Option | Topic |
|--------|--------|
| **A** | **Demo/browser print-only** action (policy-safe; no file artifact) |
| **B** | **Real Download PDF** + storage/signed URL (**after** policy decision) |
| **C** | **Parent Communication** step-label polish |
| **D** | Real **AI provider** smoke |
| **E** | **Notification** SQL/RLS foundation |

**Recommendation**

- **C** if teacher workflow clarity is still the top risk.
- **A** only if preview is **good enough** for a quick parent demo and product accepts print-dialog UX.
- **B** only after explicit **policy + storage** alignment.

---

## 9. Validation

- **Docs/checkpoint only** — **no** `src/` changes for this milestone.
- **`git diff --name-only`** should list only `docs/` paths when committing this QA doc.
- **Do not** re-run build/lint/typecheck/smokes unless **`src/`** changes.

---

## Screenshot log (fill during QA)

| # | Viewport | Scenario | Pass/Fail | Notes |
|---|----------|----------|-----------|-------|
| 1 | Desktop | Demo parent — open preview | | |
| 2 | ~390px | Demo parent — open preview | | |
| 3 | Desktop | Second report selected | | |
| … | | | | |

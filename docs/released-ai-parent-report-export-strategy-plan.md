# Released AI Parent Report — PDF + PNG export strategy (planning only)

Date: 2026-05-02  
Type: **planning only** — product, privacy, and phased implementation strategy. **No** UI, **no** SQL, **no** storage, **no** PDF/PNG implementation in this milestone.

**Related:** `docs/ai-parent-report-blueprint-plan.md`, `docs/parent-view-ai-report-display-final-checkpoint.md`, `docs/ai-parent-report-mvp-final-qa-checkpoint.md`, `docs/real-ai-parent-report-provider-implementation-plan.md`, `docs/homework-teacher-upload-step-ui-polish-checkpoint.md` (release boundary patterns).

**PDF template contract (sections, exclusions, data shape):** `docs/ai-parent-report-pdf-template-contract-plan.md`  
**Mock builders + render helper planning:** `docs/ai-parent-report-pdf-mock-render-helper-plan.md`  
**Helper + fixtures (no export UI):** `docs/ai-parent-report-pdf-helper-fixture-checkpoint.md`  
**Sealed milestone doc:** `docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`

**Code touchpoints (reference only):** `src/pages/ParentView.jsx`, `src/pages/AiParentReports.jsx`, `src/services/supabaseReadService.js`, `src/services/supabaseWriteService.js`.

---

## 1. Product purpose

Exports matter because:

- **Families** often want a **printable** or **file-storable** copy of monthly, term, or graduation-style reports—especially for records, portfolios, or offline reading.
- **Centres** may need an **official-looking document** for filing, handover, or parent conferences.
- **PDF** is the standard **archival and print** format (A4, consistent typography, embeddable branding).
- **PNG** (or similar image) is a **convenience** format for **phones**: save to gallery, share in chat apps (e.g. WhatsApp)—but it is **not** the primary official record and should carry **less content** than the PDF.

The **in-app portal view** remains the primary reading experience; exports extend reach without replacing on-screen review.

---

## 2. Current state

| Topic | Status |
|-------|--------|
| **ParentView** | **Progress Reports** section lists **released** reports and shows **current released version** detail only (`listAiParentReports` with `status: 'released'`, detail + current version reads). |
| **Staff workflow** | **`AiParentReports.jsx`** supports lifecycle (draft → review → approve → **manual release**); **`real_ai`** version creation remains policy-blocked per existing docs. |
| **Internal PDF HTML preview** | **Staff-only** **`/ai-parent-report-pdf-preview`** — polished box-based A4 HTML (**Student Progress Report**); demo fixtures, **no** download/storage; **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**. Use for layout QA **before** parent-facing download work. Staff manual runbook: **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`**. |
| **PDF export** | **Not implemented** for parents (no file download). **ParentView** optional **Preview printable report** (iframe, same released content) — **`docs/parent-view-printable-report-preview-checkpoint.md`**. **Manual visual QA before Download PDF / storage:** **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`**. |
| **PNG / image export** | **Not implemented**. |
| **Export storage / DB table** | **No** dedicated export artifact table in this plan’s implementation scope (future DDL optional). |
| **Parent visibility** | **Released / current-version-only**; drafts and evidence previews stay staff-side — unchanged by this strategy doc. |

---

## 3. Recommended export model

- **Portal** = default reading surface (responsive, accessible).
- **PDF** = **official** downloadable / printable artefact for a **released** report **version** parents are already allowed to see.
- **PNG summary** = **optional later**: single visual card, **not** a replacement for PDF or full HTML content.
- **Exports** are generated only from the **released current version** snapshot — never from draft-only state.
- **Staff drafts** must **never** be exportable by parents; any staff “preview export” must be **clearly internal** and optional.

---

## 4. PDF export plan (content contract)

Target: **A4-oriented**, centre-branded printable document.

**Recommended sections (contract-level):**

| Block | Content |
|-------|---------|
| Header | Centre **logo** (if allowed), **centre name**, document title (e.g. “Progress report”). |
| Student context | **Student** name (as released), **class**, **programme/stream** if applicable. |
| Period | **Report period** (start–end), **released date**. |
| Narrative body | **Summary**; **attendance / punctuality**; **lesson progression**; **homework completion** (aligned with ParentView safe sections). |
| Development | **Strengths**; **areas for improvement**; **next recommendations**; **parent support suggestions**. |
| Closing | **Teacher final comment**; optional **supervisor / HQ note** if product allows and parent-safe. |
| Footer | **Centre contact**, **disclaimer** (e.g. confidential, not medical/legal advice), **page numbers**. |

Exact field mapping should align with **structured sections** already surfaced on ParentView for released versions—exports are **renditions** of the same parent-safe payload, not new editorial surfaces. Canonical mapping, exclusions, and `releasedReportPdfInput` shape: **`docs/ai-parent-report-pdf-template-contract-plan.md`**.

---

## 5. PNG summary plan

- **Single-page** “card” layout: hero title, student + period, **short** highlights only.
- **Highlights only**, e.g.: student display name, period label, **attendance snapshot** (one line), **top strengths** (bullets capped), **one next step**, **short teacher comment excerpt** (truncated).
- **Explicitly shorter** than PDF; marketed as **“Save summary image”** or similar — future milestone.
- Use cases: phone wallpaper-style save, quick share; **not** compliance archive.

---

## 6. Data / privacy model

- Export material must be derived **only** from data the parent **already has rights to** via released report APIs — i.e. **released current version** content.
- **Linked-child rule**: parent export access scoped like ParentView (same RLS/product rules when implemented server-side).
- **No** embedding of draft-only fields, internal evidence URLs, aggregation debug, or provider diagnostics.
- **No raw storage paths** or **long-lived private URLs** in UI copy; if files are stored, use **short-lived signed URLs** or controlled download endpoints.
- **No service-role keys** in frontend; generation either **client-side from safe JSON** or **server-side** with JWT-scoped service.
- Prefer **regeneration from approved released version snapshots** so exports remain reproducible and audit-linked.

---

## 7. Storage / implementation options (comparison)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A** | **Client-side** print / save-as-PDF from ParentView render | No new storage; fastest prototype | Browser inconsistencies; branding harder to lock |
| **B** | **Server/Edge** PDF binary stored **privately** (bucket + RLS) | Consistent output; audit path | Infra + DDL + signing pipeline |
| **C** | **DB table** e.g. `ai_parent_report_exports` (metadata + storage path/version FK) | Auditable rows | Requires migration + policies |
| **D** | **PNG client-side** from a designed card (canvas/html-to-image) | No server image store for v1 | Quality/size variance on devices |
| **E** | **PNG server-side** stored like PDF | Uniform renders | Extra pipeline |

**Phased recommendation:**

| Phase | Focus |
|-------|--------|
| **Phase 1** | **Template contract** + **client-side** print / “Save as PDF” / lightweight prototype using **released-only** demo/real JSON — **no** new secrets. |
| **Phase 2** | **Server-generated PDF** snapshot, **private storage**, **signed URL** or authenticated download route; optional **export metadata table**. |
| **Phase 3** | **PNG summary** — likely **client-rendered card** first; server-stored PNG only if product needs consistency. |

---

## 8. Staff / parent UX

**Staff (`AiParentReports.jsx` and successors)**  
- No parent-facing export until **release**; optional **internal print preview** later must be **watermarked / labelled “Draft — not for parents.”**  
- Teachers should **not** pick PDF vs PNG during drafting — format choice is **post-release** or **parent-side** only for this strategy.

**Parent (`ParentView`)**  
- Primary: **View report** (existing).  
- Future: **Download PDF** (released version only).  
- Later: **Save summary image** — secondary action.  
- **No** controls that imply exporting drafts.

---

## 9. Safety and audit (future implementation)

When exports persist:

- Record **`released_report_version_id`** (or equivalent), **`created_at`**, **`created_by_role`** / service principal, **`format`** (`pdf` | `png_summary`).
- **Immutable blob** after write; **regenerate** = new row + new file (optional soft link to supersede).
- **Revoke/archive** policy later (e.g. centre closes account) — out of scope here but plan IDs so rows are not orphaned.

---

## 10. Implementation sequence

| Letter | Milestone |
|--------|-----------|
| **A** | **Plan only** (this document) |
| **B** | **PDF template / section contract** — typography, section order, legal/footer rules |
| **C** | **Client-side PDF prototype** for demo released JSON |
| **D** | **SQL + storage model** for persisted exports |
| **E** | **Server-side PDF generation** |
| **F** | **PNG summary** planning + prototype |

**Recommend next: B** — agree the **PDF template contract** (sections, branding slots, empty states) **before** storage or Edge work so parent-facing quality and centre branding are settled once.

---

## 11. Relationship to real AI

- **Export does not require** a live LLM provider — it renders **already-approved/released** structured content.
- Works for **manual**, **mock_ai**, or future **real_ai** versions **after** they pass the same **release** gate.
- **`real_ai`** unlock remains a **separate** milestone per existing provider plans — export is **downstream of release**, not of generation.

---

## 12. Relationship to email / notifications

- **No automatic email** as part of export delivery in early phases.
- Future “report released” email might deep-link to **portal** or attach PDF **only** after policy review — **after** export path and release semantics are stable.

---

## 13. Next implementation prompt (PDF template contract planning)

Copy-paste for a **docs + design-contract** milestone (no DDL, no UI unless explicitly scoped):

```text
AI Parent Report — PDF template contract planning only.

Deliverable: a section-by-section PDF contract aligned with ParentView released fields:
- Header/footer branding slots, student/class/programme, period, released date.
- Body: summary, attendance, lesson progression, homework, strengths, improvements, recommendations, parent support, teacher comment, optional supervisor note.
- Accessibility/readability rules (font sizes, max line length), page breaks, empty-section behaviour.
- Explicit exclusion list: drafts, evidence URLs, provider metadata, internal notes.

Outputs: update or add docs under docs/; optional single-page Figma/wireframe reference if team uses design tools.
Constraints: no SQL migrations, no new buckets, no real_ai unlock, no ParentView rule changes, no automatic email.

Cross-ref: docs/released-ai-parent-report-export-strategy-plan.md §4, §6, §10 phase B.
```

---

## Validation

This document is **planning only**.

- **`git diff --name-only`** should list only `docs/` paths for this milestone.
- **Do not** run `npm run build`, `lint`, or `typecheck` unless **`src/`** changes.

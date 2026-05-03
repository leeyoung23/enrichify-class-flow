# AI Parent Report — PDF template contract (planning only)

Date: 2026-05-02  
Type: **planning only** — defines PDF content, exclusions, layout rules, data shape, and phased implementation alignment. **No** PDF generation, **no** UI buttons, **no** SQL, **no** storage in this milestone.

**Parent strategy:** `docs/released-ai-parent-report-export-strategy-plan.md`  
**Mock/render helper planning:** `docs/ai-parent-report-pdf-mock-render-helper-plan.md`  
**Helper implementation:** `docs/ai-parent-report-pdf-helper-fixture-checkpoint.md` — `src/services/aiParentReportPdfTemplate.js`  
**Related:** `docs/ai-parent-report-blueprint-plan.md`, `docs/parent-view-ai-report-display-final-checkpoint.md`, `docs/ai-parent-report-ui-shell-final-checkpoint.md`, `docs/ai-parent-report-mvp-final-qa-checkpoint.md`

**UI reference (released sections):** `src/pages/ParentView.jsx` — `ParentProgressReportsSection` resolves text via `structuredSections` / `finalText` with the same key fallbacks as listed under §4.

---

## 1. Product purpose

The **PDF** is the **official printable and downloadable** artefact for an **AI Parent Report** that has been **released** to parents. It is **not** a second editorial workflow: it is a **frozen rendition** of parent-safe content already authorized by staff release.

- Parents/guardians may **print or archive** the PDF.
- Centres may **file** paper or electronic copies consistent with policy.
- **PNG summary** (later) remains **non-official** convenience — see strategy doc §5.

---

## 2. Current state

| Topic | Status |
|-------|--------|
| **ParentView** | **Progress Reports** lists **released** reports; detail shows **current released version** only (`structuredSections` / `finalText` resolution per section rows). |
| **Staff lifecycle** | **`AiParentReports.jsx`** — draft → review → approve → **manual release**; no auto-release. |
| **PDF generation** | **Not implemented.** |
| **PDF storage** | **None** — no export bucket/table in product yet. |
| **PNG summary** | Planned **after** PDF maturity (`released-ai-parent-report-export-strategy-plan.md`). |
| **real_ai** | **Not required** for PDF — export consumes **released version snapshots** regardless of `generation_source`. |
| **Downstream of release** | PDF input must be derivable only after **`status === 'released'`** and **current version** parent-safe payload — same boundary as ParentView. |

---

## 3. Template audience

| Audience | Use |
|----------|-----|
| **Parent / guardian** | Print at home, save to files, share with family **within household policy**. |
| **Centre staff / HQ** | Archive, parent conferences, handover **when policy permits**. |
| **Printed report** | **A4** primary use case — readability over phone-first layouts. |
| **Cadence** | **Monthly / term / graduation** depending on `reportType` — template variants (§9). |

---

## 4. Required template sections

Sections **must** mirror parent-visible semantics in ParentView — same keys where applicable (`resolveParentReportSection` pattern).

| Order | Block | Source keys (structured → finalText fallback) | Notes |
|-------|--------|-----------------------------------------------|--------|
| H1 | **Centre branding** | `branch.name`, `branch.logoUrl` (optional future) | Logo only if licensed/cl licensed asset rules satisfied. |
| H2 | **Report title** | Derived from `reportType` + product label (e.g. “Progress report”) | Localised string table later. |
| H3 | **Student** | `student.displayName` | As shown to parent — no internal IDs in body. |
| H4 | **Class / programme** | `class.label`, `programme.label` | Omit empty parts. |
| H5 | **Report period** | `reportPeriodStart`, `reportPeriodEnd` | ISO → formatted dates. |
| H6 | **Released date** | `releasedAt` | Parent-facing release timestamp. |
| H7 | **Teacher name** | optional `teacher.displayName` | Only if **parent-safe** and already exposed on released payload; else omit entirely. |
| B1 | **Summary** | `summary`, `student_summary` | Same resolution order as ParentView. |
| B2 | **Attendance & punctuality** | `attendance_punctuality`, `attendance_summary` | |
| B3 | **Lesson progression** | `lesson_progression`, `learning_focus` | |
| B4 | **Homework completion** | `homework_completion` | |
| B5 | **Strengths** | `strengths` | Render arrays/lists as bullets if JSON-shaped in source. |
| B6 | **Areas for improvement** | `areas_for_improvement` | |
| B7 | **Next recommendations** | `next_recommendations` | |
| B8 | **Parent support suggestions** | `parent_support_suggestions`, `suggested_home_practice` | |
| B9 | **Teacher final comment** | `teacher_final_comment` | |
| B10 | **Supervisor / HQ note** | optional parent-safe field only | Only if product adds explicit released-only supervisor note key — **exclude** until approved. |
| F1 | **Footer** | `footer.contactLine`, `footer.disclaimer` | Centre contact + confidentiality disclaimer. |

Empty sections: **omit heading** or print “Not applicable” — product decision; default **omit** for cleaner PDF.

---

## 5. Optional template sections (future)

| Section | Purpose |
|---------|---------|
| **Attendance %** | If numeric snapshot exists **and** teacher-approved for parents. |
| **Homework completion %** | Same. |
| **Lesson topics list** | Short bullet list if structured array exists. |
| **Evidence references (parent-safe)** | High-level labels only — **no** URLs or storage paths. |
| **Graduation / milestone badge** | Visual seal for `reportType` e.g. `graduation`. |
| **Teacher signature block** | Name + title line — only if policy allows. |
| **Centre stamp / branch address** | Footer enrichment. |

---

## 6. Explicit exclusions

The PDF **must not** contain:

| Category | Examples |
|----------|----------|
| **Non-released** | Draft versions, unreleased reports, superseded version bodies. |
| **Evidence / intake** | Evidence links table, source aggregation debug, raw homework file refs. |
| **AI/provider internals** | `generation_source`, `generationSource`, `ai_model_label`, provider IDs, token usage. |
| **Infrastructure** | Raw storage paths, bucket names, **private URLs**, signed URL query strings in **embedded** text. |
| **Staff-only** | Internal staff notes, coaching notes, draft teacher edits not in released `finalText`. |
| **Audit/security** | Release audit events, SQL/RLS/env errors, stack traces, **service-role** mentions. |
| **Unapproved claims** | Medical/legal diagnoses unless explicitly approved content — default **teacher-reviewed narrative only**. |

---

## 7. Data contract (future `releasedReportPdfInput`)

Proposed **immutable input** for PDF renderers (built only from **released current version** reads):

```javascript
/**
 * Planning-only shape — not exported from codebase yet.
 * `sections` are normalized text/markdown-ready strings for layout engine.
 */
const releasedReportPdfInput = {
  reportId: '',           // UUID
  versionId: '',          // released version UUID — must match parent-visible version
  templateVariant: 'monthly_progress', // monthly_progress | weekly_brief | graduation | homework_feedback

  student: {
    displayName: '',
  },
  class: {
    label: '',
  },
  programme: {
    label: '',
  },
  branch: {
    name: '',
    logoUrl: null,        // optional HTTPS URL to approved asset only
  },

  reportPeriod: {
    start: '',            // ISO date
    end: '',
  },
  releasedAt: '',         // ISO datetime
  releasedBy: {           // optional display-only if policy allows on released payload
    displayName: null,
  },
  teacher: {              // optional — omit if not parent-safe
    displayName: null,
  },

  sections: [
    // canonical order matching §4 — only include non-empty after normalization
    { id: 'summary', title: 'Summary', body: '' },
    { id: 'attendance_punctuality', title: 'Attendance & punctuality', body: '' },
    { id: 'lesson_progression', title: 'Lesson progression', body: '' },
    { id: 'homework_completion', title: 'Homework completion', body: '' },
    { id: 'strengths', title: 'Strengths', body: '' },
    { id: 'areas_for_improvement', title: 'Areas for improvement', body: '' },
    { id: 'next_recommendations', title: 'Next recommendations', body: '' },
    { id: 'parent_support_suggestions', title: 'Parent support suggestions', body: '' },
    { id: 'teacher_final_comment', title: 'Teacher final comment', body: '' },
    { id: 'supervisor_note', title: 'Centre note', body: '' }, // optional future
  ],

  footer: {
    contactLine: '',
    disclaimer: 'Confidential. For educational purposes only.',
  },
};
```

**Rule:** Populate `sections` only from **`structuredSections` / `finalText`** of the **released** version — same eligibility rules as ParentView (no extra synthesis).

---

## 8. Layout contract

| Rule | Detail |
|------|--------|
| **Page size** | **A4 portrait** first. |
| **Margins** | Print-safe: ≥ 15 mm outer margins; inner gutter if duplex ever added. |
| **Typography** | Minimum **11 pt** body for accessibility; **14–18 pt** headings hierarchy. |
| **Line length** | Max ~75 characters per line where possible; avoid wide unbroken paragraphs. |
| **Page breaks** | Keep section headings with **at least 2 lines** of following content (orphan control); allow break **between** sections. |
| **Long comments** | Allow **continuation page**; repeat short header band on page 2+ optional. |
| **Mobile** | Parents may **download** PDF on phone — file is still **print-optimized**; separate **PNG** handles mobile **sharing**. |

---

## 9. Template variants

| Variant | `templateVariant` | Focus |
|---------|-------------------|--------|
| **A** | `monthly_progress` | Full sections — **default first implementation.** |
| **B** | `weekly_brief` | Shorter sections; may hide optional blocks. |
| **C** | `graduation` | Ceremonial header/footer + optional milestone badge (§5). |
| **D** | `homework_feedback` | Emphasize homework + recommendations — narrower use case. |

**Recommendation:** ship contract + renderer for **`monthly_progress`** first; map `reportType` from DB to variant table in implementation phase.

---

## 10. Implementation options

| Option | Description |
|--------|-------------|
| **A** | Browser **print CSS** / print dialog from HTML snapshot |
| **B** | **Client-side** PDF (e.g. jsPDF, pdf-lib) from `releasedReportPdfInput` |
| **C** | **Server/Edge** PDF (Headless Chromium, PDFKit, etc.) |
| **D** | **Stored PDF** + private bucket + **signed URL** |

**Recommendation:**

1. **Template contract** (this doc) — **done as planning.**  
2. **Mock data builder + render helper plan** — deterministic fake `releasedReportPdfInput` for tests/dev (**next**, §14).  
3. **Browser/client PDF prototype** — no storage.  
4. **Server + private storage + RLS** — production scale.

---

## 11. Privacy / access rules

- **Parents:** only **linked-child** **released** reports — same as ParentView list/detail.  
- **Staff:** JWT-scoped reads consistent with existing report RLS; export preview **internal only** must be watermarked if ever shown pre-parent-release.  
- **No parent draft export.**  
- **Stored PDFs:** private bucket, **short-lived signed URLs**, **no public buckets**.  
- **No service-role keys** in browser — generation either purely client from JSON or server-side with service identity.

---

## 12. Relationship to PNG summary

- **PNG** = reduced **highlights card** — **not** a substitute for PDF (`released-ai-parent-report-export-strategy-plan.md`).  
- PDF holds **full** parent-safe narrative; PNG pulls **subset** fields only.

---

## 13. Relationship to email automation

- **No email** in PDF template milestone.  
- Future **“report released”** email may link to **portal** or **download PDF** — **never** attach drafts; align with release/export policy first.

---

## 14. Recommended next milestone

| Letter | Milestone |
|--------|-----------|
| **A** | Plan only (this doc + strategy doc) |
| **B** | **PDF mock data + render helper planning** — **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`** (complete) |
| **C** | **Pure helper + fixture module** in **`src/`** — no ParentView button, no SQL (`mock-render-helper-plan.md` §12 **B**) |
| **D** | Browser print CSS / HTML preview wired to helpers |
| **E** | SQL/storage + RLS review for persisted exports |
| **F** | PNG summary planning |

**Recommend next:** implement **`src/`** helpers + fixtures per **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`** §13 — **no** export button yet.

---

## 15. Next implementation prompt (mock data + render helper planning)

```text
AI Parent Report PDF — mock data builder + render helper planning only.

Goals:
1. Specify a pure function contract: buildReleasedReportPdfInput({ releasedReportRow, currentVersionRow }) → releasedReportPdfInput (see docs/ai-parent-report-pdf-template-contract-plan.md §7).
2. Define deterministic fake fixtures for demo/dev only (no real PII).
3. Outline a renderer interface: renderPdfHtml(input) or renderPdfBlob(input) — implementation language TBD; no Supabase DDL, no buckets, no export button in ParentView yet.
4. Map ParentView section keys 1:1 to sections[] (§4).
5. Document exclusion guards — reject build if report not released or version mismatch.

Deliverables: docs update + optional pseudocode file under docs/ only.

Constraints: no SQL migrations, no real_ai unlock, no ParentView rule changes, no automatic email.

Cross-ref: docs/ai-parent-report-pdf-template-contract-plan.md, docs/released-ai-parent-report-export-strategy-plan.md §10–§11.
```

---

## Validation

This document is **planning only**.

- **`git diff --name-only`** should list only `docs/` paths for this milestone.
- **Do not** run `npm run build`, `lint`, or `typecheck` unless **`src/`** changes.

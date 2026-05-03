# AI Parent Report PDF — mock data + render helper planning (no implementation)

Date: 2026-05-02  
Type: **planning only** — defines deterministic **fake/dev** PDF input construction and **pure render-helper contracts** before any **export button**, **storage**, **SQL**, or **server PDF**. **No** code changes in this milestone.

**Upstream contracts:**  
`docs/ai-parent-report-pdf-template-contract-plan.md` (`releasedReportPdfInput`, exclusions, section keys)  
`docs/released-ai-parent-report-export-strategy-plan.md` (phasing, privacy)

**UI reference:** `src/pages/ParentView.jsx` (`resolveParentReportSection`, section row titles); staff lifecycle `src/pages/AiParentReports.jsx`.

---

## 1. Product purpose

The next **safe** step toward PDF is **not** shipping downloads or buckets yet. It is:

1. A **deterministic mock/dev builder** that emits **`releasedReportPdfInput`**-shaped objects using **only fake data** or **sanitized fixtures**.
2. A **pure render-helper contract** (HTML string or structured AST) that consumes that input **without** side effects — suitable for later unit tests, Storybook-style previews, **browser print**, or **server PDF**.

This isolates **layout and validation** from **RLS, storage, and product chrome**.

---

## 2. Current state

| Topic | Status |
|-------|--------|
| **PDF template contract** | Exists — `docs/ai-parent-report-pdf-template-contract-plan.md`. |
| **ParentView sections** | Released report detail resolves **`structuredSections`** / **`finalText`** with defined key fallbacks. |
| **PDF button / export** | **Not implemented** — no Download control in ParentView for production. |
| **Storage / bucket / SQL** | **None** for PDF artefacts. |
| **Server PDF** | **Not implemented.** |
| **PNG summary** | **Later** — out of scope here beyond reuse note (§11). |
| **real_ai** | **Not required** for mock PDF pipeline — mock uses **`generation_source`-free** fixtures. |

---

## 3. Mock data builder purpose

| Reason | Detail |
|--------|--------|
| **Safe layout iteration** | Designers/engineers tune A4 typography without touching PHI/PII. |
| **Stable snapshots** | Same fixture → same normalized input → comparable renders across CI runs. |
| **Future client PDF** | Browser `print()` or `pdf-lib`-style pipeline needs repeatable input. |
| **Future server PDF** | Edge/service receives **already-validated** JSON — same shape as client mock. |
| **No real students** | Aligns with project rule: **fake/dev only** in fixtures directory when implemented. |

---

## 4. Proposed helper contracts (names only — do not implement here)

Pure functions (language-agnostic contract):

| Function | Responsibility |
|----------|----------------|
| **`buildReleasedReportPdfInputFromParentViewContext`** | Map `{ reportRow, detailRow, currentVersionRow, displayContext }` → **`releasedReportPdfInput`**. **Guard:** parent-visible released paths only; caller asserts `status === 'released'`. |
| **`buildDemoReleasedReportPdfInput`** | Returns a **fully populated** fake input for demos/tests — uses fictional names only. |
| **`normalizeReportSectionsForPdf`** | Merge **`structuredSections`** / **`finalText`** using **same key precedence as ParentView**; output ordered **`sections[]`** with stable **`id`** + PDF **`title`** + **normalized body string**. |
| **`validateReleasedReportPdfInput`** | Structural + safety validation (§7); returns `{ ok, errors[] }` — **no throws** preferred for testability. |
| **`renderReleasedReportPdfHtml`** | **`(input) → string`** — semantic HTML fragment or full document template with placeholders filled **only** from validated fields. |
| **`renderReleasedReportPdfTemplate`** *(alias)* | Same as HTML renderer if product chooses template literals vs JSX factory later. |

Optional future:

| Function | Use |
|----------|-----|
| **`stripForbiddenPdfPatterns`** | Regex/heuristic pass rejecting URLs, `generation_source`, bucket paths in **section bodies** (belt-and-suspenders after normalization). |

---

## 5. Input shape

Canonical object matches **`docs/ai-parent-report-pdf-template-contract-plan.md` §7**:

`releasedReportPdfInput = { reportId, versionId, templateVariant, student, class, programme, branch, reportPeriod, releasedAt, releasedBy?, teacher?, sections[], footer }`

- **`sections`**: array of `{ id, title, body }` where **`body`** is **plain text or minimal markdown** (implementation decision later).
- **`templateVariant`**: `monthly_progress` | `weekly_brief` | `graduation` | `homework_feedback` — derived from `reportType` mapping table when implemented.

---

## 6. Section normalization plan

Map **source keys** → canonical **`sections[].id`** and **display title** (aligned with ParentView row labels):

| Canonical `id` | Source keys (structured first, then finalText) | PDF heading |
|----------------|--------------------------------------------------|-------------|
| `summary` | `summary`, `student_summary` | Summary |
| `attendance_punctuality` | `attendance_punctuality`, `attendance_summary` | Attendance & punctuality |
| `lesson_progression` | `lesson_progression`, `learning_focus` | Lesson progression |
| `homework_completion` | `homework_completion` | Homework completion |
| `strengths` | `strengths` | Strengths |
| `areas_for_improvement` | `areas_for_improvement` | Areas for improvement |
| `next_recommendations` | `next_recommendations` | Next recommendations |
| `parent_support_suggestions` | `parent_support_suggestions`, `suggested_home_practice` | Parent support suggestions |
| `teacher_final_comment` | `teacher_final_comment` | Teacher final comment |

**Normalization rules:**

- Arrays/objects in source → bullet lines or newline-separated text — mirror ParentView **`mapSectionValueToText`** behaviour conceptually.
- **Drop** empty bodies after trim (default **omit section**).
- **Never** copy unknown keys into PDF body unless explicitly allow-listed later.

---

## 7. Validation rules (`validateReleasedReportPdfInput`)

| Rule | Detail |
|------|--------|
| **Identifiers** | `reportId`, `versionId`, `releasedAt` **required** non-empty strings (ISO datetime for `releasedAt`). |
| **Content** | At least **one** section with non-empty **`body`** after trim. |
| **Release posture** | Caller must not invoke builder for draft/unreleased rows — validator may accept **`releaseStatus: 'released'`** enum field on input **when wired from real API** (future). |
| **Forbidden substrings** | Reject or strip (policy TBD): `http://`, `https://`, `s3://`, `supabase.co/storage`, common bucket path patterns **inside section bodies** — **planning default: reject** bad inputs in strict mode for tests. |
| ** banned metadata** | Reject if **`generation_source`**, **`generationSource`**, **`ai_model`**, **`provider`** appear in any string field. |
| **Length** | Each **`sections[].body`** max length cap (e.g. **16 000** chars) — configurable constant to prevent runaway PDF/memory in prototype. |
| **Types** | **`sections[].body`** must be **string** — no raw objects in normalized output. |
| **No leakage vocabulary** | Fail if body matches `/service.?role|RLS policy|postgres/i` for demo hardening (optional strict test fixture). |

---

## 8. Render helper strategy

| Option | Description | When |
|--------|-------------|------|
| **A** | **HTML template string** + shared **print CSS** (`@media print`) | Fastest prototype; good for **Print → Save as PDF** |
| **B** | **React component** “PdfPreviewDocument” receiving **`releasedReportPdfInput`** | Matches existing stack; same DOM as **A** with JSX |
| **C** | **Client-side PDF library** (`pdf-lib`, etc.) | After HTML layout stabilizes |
| **D** | **Server-side** Chromium/Puppeteer or PDFKit | Phase 2+ with storage |

**Recommendation for planning trajectory:**

1. Specify **HTML/React template contract** now (sections order, heading levels, footer region).
2. Implement **A/B** before **C** — visual parity before pixel-perfect PDF binaries.
3. **Server render** only when storage + audit requirements demand identical pixels across clients.

---

## 9. Visual fixture plan (fake/dev only)

| Fixture ID | Purpose |
|------------|---------|
| **`FIXTURE_MONTHLY_STANDARD`** | Full **monthly_progress** — all sections populated with fictional content. |
| **`FIXTURE_WEEKLY_BRIEF`** | Fewer sections, shorter bodies (`weekly_brief`). |
| **`FIXTURE_GRADUATION`** | Optional badge/header placeholders — **later** when variant styling exists. |
| **`FIXTURE_LONG_TEXT`** | Stress: very long **teacher_final_comment** — pagination / page-break behaviour. |
| **`FIXTURE_SPARSE`** | Missing optional header fields (no teacher name, single section only). |
| **`FIXTURE_PARENT_SAFE_ONLY`** | Ensures no URLs or internal tokens — negative tests expect **validation failure** if polluted strings injected in tests only. |

All names, schools, and comments **fictional** — e.g. “Demo Student A”, “Demo Centre North”.

---

## 10. Safety / privacy boundary

| Rule | Detail |
|------|--------|
| **This planning milestone** | **Docs only** — no fixtures on disk yet unless a later PR adds **`src/`** module. |
| **Future real pipeline** | **`releasedReportPdfInput`** only from **released current version** reads — same as ParentView. |
| **No real student data** in fixtures when implemented. |
| **No storage paths / private URLs** in section bodies. |
| **No service-role** or admin keys in any client-side builder. |
| **No parent export** for drafts — builders refuse or validate out unreleased state. |
| **No export button** until product explicitly scopes UI milestone. |

---

## 11. Relationship to PNG summary

- **Normalized `sections[]`** is the **single source** for both PDF (full) and future PNG (subset).
- PNG pipeline should **`pickSections(['summary','strengths','teacher_final_comment', …])`** with truncation — **PDF remains authoritative full artefact** (`released-ai-parent-report-export-strategy-plan.md`).

---

## 12. Recommended implementation sequence

| Letter | Milestone |
|--------|-----------|
| **A** | Plan only (this doc + template contract) |
| **B** | **`src/`** module: **pure builders + fixtures + validation + HTML renderer** — **no** ParentView button, **no** SQL |
| **C** | Internal **dev-only route** or Storybook for preview (optional) |
| **D** | ParentView **Download PDF** (demo or gated) |
| **E** | Storage **SQL/RLS** + bucket |
| **F** | Server-side PDF generation |

**Recommend B next:** isolated module is **unit-testable**, **no UI exposure**, **no DDL** — matches **`docs/ai-parent-report-pdf-template-contract-plan.md`** §14 milestone B.

---

## 13. Next implementation prompt (helper + fixture module, no UI button)

```text
Implement AI Parent Report PDF helpers — pure functions + fake fixtures only.

Deliver:
1. Module(s) under src/ (paths TBD) exporting:
   - buildDemoReleasedReportPdfInput()
   - normalizeReportSectionsForPdf(structuredSections, finalText) → sections[]
   - validateReleasedReportPdfInput(input)
   - renderReleasedReportPdfHtml(input) → HTML string (semantic tags + minimal classes for print CSS)
2. Fake fixtures using fictional names only; align with docs/ai-parent-report-pdf-mock-render-helper-plan.md §9.
3. Unit tests for validation (reject URLs, reject banned metadata strings in strict mode).

Explicitly NOT in this PR:
- No ParentView or AiParentReports UI changes
- No PDF download button
- No Supabase SQL, buckets, or new tables
- No real_ai unlock
- No email/notifications

Cross-ref: docs/ai-parent-report-pdf-template-contract-plan.md §7, docs/ai-parent-report-pdf-mock-render-helper-plan.md.

Validate: npm run build, lint, typecheck; no new smoke unless touching services.
```

---

## Validation

This document is **planning only**.

- **`git diff --name-only`** should list only `docs/` paths for this milestone.
- **Do not** run `npm run build`, `lint`, or `typecheck` unless **`src/`** changes.

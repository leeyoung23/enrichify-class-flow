# AI Parent Report PDF helper + fixture — final documentation checkpoint

Date: 2026-05-02 (sealed **`2cfab48`**) · internal preview follow-up **2026-05-03** — see **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**  
Type: **documentation** — original seal was docs-only for **`2cfab48`**. **Update 2026-05-03:** internal staff preview route documents the helper in-app; **`src/`** touchpoints listed in internal preview checkpoint.

**Code:** `src/services/aiParentReportPdfTemplate.js`  
**Smoke:** `scripts/ai-parent-report-pdf-template-smoke-test.mjs` · **`npm run test:ai-parent-report:pdf-template`**  
**Shorter index:** `docs/ai-parent-report-pdf-helper-fixture-checkpoint.md`

---

## 1. Key checkpoint notes

- **Pure module** — **`aiParentReportPdfTemplate.js`**: no Supabase calls, no storage, no binary PDF.
- **Fake/dev only** — **`buildDemoReleasedReportPdfInput`** uses fictional student/centre strings.
- **Section normalization** — ParentView-aligned resolution order and **`PDF_SECTION_DEFINITIONS`** mapping.
- **Validation** — **`validateReleasedReportPdfInput`** with URL/metadata bans and release posture checks.
- **HTML render** — **`renderReleasedReportPdfHtml`** produces a full document + **A4 print CSS**; content escaped.
- **Adapter** — **`buildReleasedReportPdfInputFromParentViewContext`** maps in-memory released rows only.
- **No** ParentView Download button, **no** staff export/download/persist button — **internal** staff **`/ai-parent-report-pdf-preview`** uses demo HTML only (**`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**). **No** SQL/RLS DDL, **no** buckets.
- **No** `real_ai` unlock, **no** provider calls, **no** ParentView visibility rule changes.

---

## 2. Fake / dev fixture builder

| API | Detail |
|-----|--------|
| **`buildDemoReleasedReportPdfInput({ variant })`** | Deterministic fictional payloads. |

| `variant` | Purpose |
|-----------|---------|
| **`monthly_progress`** | Default — broad section coverage. |
| **`weekly_brief`** | Fewer sections, shorter bodies. |
| **`long_text`** | Stress **`teacher_final_comment`** length (truncated by **`PDF_SECTION_MAX_CHARS`**). |
| **`sparse_optional_fields`** | Minimal headers; still ≥1 section for validation. |

All names (**Demo Student One**, **EduCentre**, etc.) are **fake/dev only**.

---

## 3. Section normalization

| Export | Behavior |
|--------|----------|
| **`normalizeReportSectionsForPdf(sections)`** | Flat object → ordered **`[{ key, label, content }]`**; first matching **`sourceKeys`** wins per definition; empty skipped; truncated. |
| **`normalizeReportSectionsFromReleaseVersion(currentVersion)`** | Uses **`resolveSectionFromReleaseVersion`** — for each definition, **all `structuredSections` keys tried first**, then **all `finalText` keys** (ParentView **`resolveParentReportSection`** semantics). |
| **`resolveSectionFromReleaseVersion`** | Low-level structured→final order for one definition’s **`sourceKeys`**. |

Output order follows **`PDF_SECTION_DEFINITIONS`** — aligned with ParentView section titles where keys overlap.

---

## 4. Validation behavior (`validateReleasedReportPdfInput`)

**Required:** `reportId`, `versionId`, `releasedAt`, `templateVariant`, `student.displayName`, ≥1 section with non-empty **`body`**, section **`id`/`title`** strings.

**Rejected:**

- **`status`** present and not **`released`**.
- **`http://`**, **`https://`**, storage path hints, **`generation_source`**, **`ai_model_label`**, **`evidence_links`**, **`release_events`**, **`.env`**, **`SUPABASE_SERVICE_ROLE`**, **`service_role`**, **`postgres`**, **`RLS policy`**, internal note tokens — in scanned strings.
- Non-string section body; body longer than **`PDF_SECTION_MAX_CHARS`**.

Returns **`{ ok: true, data }`** or **`{ ok: false, error }`** with **generic** error strings (no env/SQL leaks).

---

## 5. HTML render helper (`renderReleasedReportPdfHtml`)

- Runs **validation first**; on failure returns **`{ ok: false, error }`**.
- Success: **`{ ok: true, html, input }`** — full **HTML5** document, **embedded print CSS** (**A4**), **no `<script>`**, **no external assets**, **no remote images**, placeholder branding strip only.
- User content passed through **`escapeHtml`**.

---

## 6. ParentView adapter (`buildReleasedReportPdfInputFromParentViewContext`)

- **Pure map** — caller passes **`report`**, **`currentVersion`**, optional **`context`** (display names, footer).
- **No Supabase**.
- If **`report.status`** exists and ≠ **`released`** → **`{ ok: false, error }`** — draft/unreleased must not become PDF input.
- Builds **`sections`** from **`normalizeReportSectionsFromReleaseVersion(currentVersion)`** only — no hidden draft merge paths.

---

## 7. Smoke test coverage (`test:ai-parent-report:pdf-template`)

Recorded at **`2cfab48`**:

- Monthly / weekly / sparse fixtures **validate**.
- Long-text **renders**; HTML **forbidden-token** scan (no `http://`, `generation_source`, etc.).
- Normalization keys including **`homework_assessment_performance`**.
- **Adapter** happy path + **unreleased** refusal.
- URL injected into section → **validation fails**.
- **`status: 'draft'`** on input → **validation fails**.
- **No** binary PDF, **no** storage I/O, **no** Supabase/provider in script.

---

## 8. Validation result (recorded at `2cfab48`)

**Docs-only edits after `2cfab48` do not require re-running** unless **`src/`** or **`scripts/`** change.

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run test:ai-parent-report:pdf-template` | **PASS** |
| `npm run test:supabase:ai-parent-reports` | **PASS** (expected **CHECK** lines for fixtures/credentials) |

---

## 9. What remains future

- **Done (internal):** staff-only **`/ai-parent-report-pdf-preview`** — **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**. Next: **manual visual QA** before parent export work.
- **ParentView Download PDF** button — product milestone.
- **Browser print** / client PDF library — after preview approval.
- **Private storage + signed URL** + optional DDL.
- **Server-side** PDF generation.
- **PNG** summary export.
- **Email** on report release — after export/release policy stable.
- **Teacher Parent Communication** step-label polish (`docs/teacher-upload-step-simplification-plan.md` §12 **C**).

---

## 10. Recommended next milestone

| Option | Topic |
|--------|--------|
| **A** | **Internal/dev PDF HTML preview** — **implemented** (`/ai-parent-report-pdf-preview`); proceed to **manual QA** |
| **B** | ParentView **Download PDF** |
| **C** | PDF storage **SQL/RLS** review |
| **D** | PNG summary planning |
| **E** | Parent Communication step-label polish |

**Recommendation: A first** — inspect **`renderReleasedReportPdfHtml`** output in-app **before** parent-facing download; still **no** storage/SQL; use **demo** or **released fixture** input only.

---

## 11. Next implementation prompt (internal preview, no ParentView button)

```text
Internal/dev AI Parent Report PDF HTML preview only — no ParentView Download PDF button.

Goals:
1. Add a staff-only or dev-gated surface (route or modal) that renders HTML from renderReleasedReportPdfHtml(buildDemoReleasedReportPdfInput()) or from adapter output using fake in-memory rows only.
2. Use iframe srcDoc or dangerouslySetInnerHTML only after validateReleasedReportPdfInput succeeds; never render raw unvalidated HTML from network.
3. No new SQL, buckets, or export persistence; no ParentView changes; no real_ai unlock.

Cross-ref: docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md §5–§6.

Validate: npm run build, lint, typecheck, test:ai-parent-report:pdf-template.
```

---

## Validation

This file is **documentation only**.

- **`git diff --name-only`** should list only `docs/` paths when committing this checkpoint.
- **Do not** re-run build/lint/typecheck/smokes unless **`src/`** or **`scripts/`** change.

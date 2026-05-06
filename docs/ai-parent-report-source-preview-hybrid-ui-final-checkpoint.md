# AI parent report — Source Evidence Preview hybrid UI (final documentation checkpoint)

Date: 2026-05-02  
Type: **documentation only** — seals milestone **`d235344`** (*Wire AI report source preview hybrid mode*). **No** app UI or runtime changes in this doc pass.

**Canonical code reference:** `src/pages/AiParentReports.jsx` (as of commit **`d235344`**).  
**Related:** `docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`, `docs/ai-parent-report-source-preview-hybrid-ui-plan.md`, `docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`, **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`** (desktop + ~390px visual QA runbook), **`docs/ai-parent-report-workflow-ux-polish-checkpoint.md`** (staff workflow copy + section order).

---

## 1. Key checkpoint notes

- **Demo / local / `demoRole`:** source aggregation uses **`mode: 'fake'`** (predictable demo and fallback text; no Supabase requirement for the preview path).
- **Authenticated staff (staff role, Supabase session, not demo):** **`mode: 'hybrid'`** — **RLS-backed reads** (JWT-scoped) where data exists, **safe fake fill** for empty string fields in the merged output.
- **Fake fallback / missing evidence** is shown with **informational** copy and lists — **not** as fatal errors for normal gaps.
- **Generate Mock Draft** prefers **`sourceEvidencePreview`** when it is loaded and valid; otherwise **`fetchSourceEvidenceBundle()`** re-collects with the **same mode and params** as the preview.
- **Manual / source note fields** override evidence-derived fields when **non-empty** (`mergeMockDraftFormWithEvidence` after `buildMockDraftInputFromSourceEvidence`).
- **No** Supabase SQL/RLS DDL in this milestone; **no** real external AI provider; **`real_ai`** version creation **still blocked**; **ParentView** visibility **unchanged** (released / current-version-only for parents); **no** email, notification, or PDF automation from this flow.

---

## 2. Mode selection behavior

| Condition | Aggregation `mode` |
|-----------|-------------------|
| `inDemoMode` / `demoRole` | **`fake`** |
| Staff + `canUseSupabase` (`canAccess` && `!inDemoMode` && Supabase configured && `appUser?.id`) | **`hybrid`** |
| Staff but **no** usable Supabase session (e.g. not signed in) | **`fake`** (safe fallback; matches page’s other guards) |

- **`reportId`** is passed to `collectAiParentReportSourceEvidence` **only** when `selectedReportId` matches a **UUID** (demo report ids are non-UUID — evidence-link RLS path skipped for those).
- **`rls`-only** mode exists on the **service** for future/debug; it is **not** exposed in the staff UI in this milestone.

---

## 3. Source Evidence Preview behavior

- **Badge — demo:** **“Demo/fallback evidence”**
- **Badge — authenticated (hybrid path):** **“System evidence preview”**
- **Intro copy — demo:** explains demo / fallback only (no live system reads in that mode).
- **Intro copy — system:** *System evidence is used where available. Missing sources use safe fallback wording until the evidence pipeline is complete.*
- **Loading — demo:** *Loading demo source evidence…*
- **Loading — system:** *Loading system source evidence…*
- **Scope note (informational):** when **student / class / branch / period start / period end** are missing on the selected report, a **“Scope note”** panel lists what is missing and states the preview still uses safe placeholders. **No** raw errors.
- **Aggregation** still receives **empty strings** for missing ids/dates where appropriate; the service supports that without throwing.

---

## 4. Missing source / warning behavior

- **`missingEvidence`** list heading: **“Fallback / missing evidence”** — neutral checklist style.
- **`warnings`** section title: **“Heads-up”** — shown as **outline badges** (informational, not blocking).
- Warnings are **informational**, not application errors.
- **Preview load failure:** safe, non-technical recovery message (*temporarily unavailable… try reselecting*) — **no** SQL, RLS policy text, env keys, or stack content.

---

## 5. Generate Mock Draft integration

- If **`!sourceEvidenceLoading && sourceEvidencePreview && !sourceEvidenceError`**, reuse **`sourceEvidencePreview`** as **`agg`**.
- Else **`agg = await fetchSourceEvidenceBundle()`** (same helper as preview).
- If **`!agg`**, a **toast message** notes incomplete preparation and **`fromEvidence`** is **{}**; merge still proceeds from manual fields only.
- **`fromEvidence = buildMockDraftInputFromSourceEvidence(agg)`** when `agg` is present.
- **`input = mergeMockDraftFormWithEvidence(buildMockDraftInput(), fromEvidence)`** — **non-empty manual** fields win over evidence strings.
- **Demo:** local-only mock version — **no** `generateMockAiParentReportDraft` call.
- **Authenticated:** **`generateMockAiParentReportDraft({ reportId, input })`** — **no** auto-submit, approve, or release.

---

## 6. Demo vs authenticated behavior

| | Demo / `demoRole` | Authenticated staff |
|--|-------------------|---------------------|
| Source preview | **fake** | **hybrid** (if `canUseSupabase`) else **fake** |
| Mock draft | **Local state only** | **`generateMockAiParentReportDraft`** |
| Real AI provider | **None** | **None** |
| Parent-facing evidence | **None** | **None** (staff route only; ParentView unchanged) |

---

## 7. Safety boundaries

- **No** SQL/RLS policy edits in this milestone.
- **No** ParentView changes — parents do not see staff evidence preview or raw evidence rows.
- **No** `real_ai` unlock or UI exposure.
- **No** provider keys in frontend; **no** service role in frontend.
- **No** raw row dumps; summaries are staff-scoped; **sanitizeAggregationText** in the service reduces URL/storage-like leakage.
- **Classification UI** uses staff-safe labels, including **“Not sent to provider”** and **“Requires teacher confirmation”** (mapped from `EVIDENCE_CLASSIFICATION` values).

---

## 8. Validation result (commit `d235344`)

Recorded at the **code** milestone; **not re-run** for this **docs-only** checkpoint unless `src/` changes.

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run test:supabase:ai-parent-report:source-aggregation` | **PASS** |
| `npm run test:supabase:ai-parent-report:rls-source-aggregation` | **PASS** (expected **CHECK**: parent credentials/fixtures missing — parent boundary skipped) |
| `npm run test:supabase:ai-parent-report:mock-draft` | **PASS** |
| `npm run test:supabase:ai-parent-reports` | **PASS** (expected **CHECK**: unrelated parent / sign-in where fixtures absent) |

---

## 9. What remains future

- Optional **`rls`-only** debug toggle for staff (service already supports `rls`).
- Per-field **system vs fallback** provenance chips (needs service metadata).
- Stricter **minimum evidence** rules for mock draft if product requires.
- **Worksheet/OCR** evidence intake; structured **Observations** upgrades.
- **Real provider** smoke (staging, key-gated); **`real_ai`** unlock (policy + DB/service guards).
- **Email/notification** after release policy; **PDF/export**.

---

## 10. Recommended next milestone

| Option | Topic |
|--------|--------|
| **A** | **Manual visual QA** for hybrid Source Evidence Preview (**recommended next**) |
| **B** | Real provider smoke |
| **C** | Worksheet/OCR evidence intake planning |
| **D** | Email automation planning |
| **E** | PDF/export planning |

**Recommendation: A first** — `d235344` changed the staff **AI Parent Reports** page; validate **desktop + ~390px**: badges, scope note, Heads-up vs Fallback sections, classification labels, and **Generate Mock Draft** flow readability **before** investing in real provider wiring.

**Runbook:** **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`** (checklists, safety/privacy, known risks, decision rule).

---

## 11. Next implementation prompt (manual visual QA)

Copy-paste for a future session:

```text
Manual visual QA only — AI Parent Reports Source Evidence Preview (hybrid mode).

Context: commit d235344 wired demo → fake aggregation; authenticated staff with session → hybrid.
Do not change runtime logic unless a blocking UX bug is found and scoped separately.

Verify:
- Demo role: badge “Demo/fallback evidence”, demo loading copy, fake summaries.
- Authenticated staff: badge “System evidence preview”, system loading copy, hybrid summaries + fallback lists when data is thin.
- Scope note appears when student/class/branch/period fields missing on selected report; copy is informational.
- “Heads-up” warnings and “Fallback / missing evidence” read as informational, not errors.
- Evidence items: “Not sent to provider”, “Requires teacher confirmation”, other classification labels readable.
- Generate Mock Draft: form stacks at ~390px; button reachable; no misleading auto-release messaging.

Screens: desktop + ~390px width. ParentView out of scope (unchanged).
Report: screenshots optional; list passes/failures and file any fixes as a separate small PR.
```

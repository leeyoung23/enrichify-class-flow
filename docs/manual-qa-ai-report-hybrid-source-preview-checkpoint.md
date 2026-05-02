# Manual visual QA — AI Parent Reports (hybrid Source Evidence Preview)

Date: 2026-05-02  
Type: **human QA / checkpoint only** — use **fake/dev** or non-production fixtures only. **No** real student, parent, school, or communication data. **No** app or SQL changes in this document.

**Code reference (no edits here):** `src/pages/AiParentReports.jsx` (hybrid preview in **`d235344`**, workflow copy polish in later commit — see **`docs/ai-parent-report-workflow-ux-polish-checkpoint.md`**). **Aggregation service:** `src/services/aiParentReportSourceAggregationService.js`.  
**Background:** `docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`.

---

## 1. QA purpose

This pass confirms the **Source Evidence Preview** and related staff surfaces are **readable, trustworthy, and safe-looking** on **desktop** and **~390px** before **real provider** API keys or **real provider smoke** in dev/staging.

- Validate **hybrid** mode UX (system summaries + safe fallback) for **authenticated** staff, and **fake** mode for **demo / `demoRole`**.
- Record **UI/product risks** (dense lists, confusing copy, error-like empty states) so they can be fixed **before** teachers conflate **mock** output with **live AI** or **parent release**.

**Out of scope for this runbook:** changing code, RLS, ParentView, or running provider calls.

---

## 2. Surfaces to preview

| Surface | What to open |
|---------|----------------|
| **Page** | Staff **AI Parent Reports** (route `/ai-parent-reports`) |
| **Report list** | At least one row selected (demo report or **UUID** report in non-demo) |
| **Report detail** | **Report Detail** — status, student/class/branch, period, current version, version history, **Evidence Links (staff-facing)** |
| **Source Evidence Preview** | Card with mode badge, intro copy, summary grid, **Heads-up** (warnings), **Fallback / missing evidence**, **Evidence items (staff-only classification)** |
| **Generate Mock Draft** | Card with source-note fields and **Generate Mock Draft** button; copy about staff-side / not to parents |
| **Lifecycle** | **Submit** / **Approve** / **Release** / **Archive** (or equivalent) — confirm **no** auto-release from mock or preview |
| **Viewports** | **Desktop** (e.g. 1280px) and **~390px** width (device toolbar or narrow window) |

Run **twice** when possible: once with **demo role** (fake preview), once **signed in** as staff with Supabase (hybrid preview, **UUID** report id to exercise evidence-link path if desired).

---

## 3. Desktop QA checklist

- [ ] **System evidence preview** badge shows for **authenticated** staff (not `demoRole`) when Supabase session is active.
- [ ] **Demo/fallback evidence** badge shows for **demo** / `demoRole` (or when session forces fake path).
- [ ] **Source summary** grid (attendance, homework, lesson progression, etc.) is **readable** (contrast, line length, no wall of unbroken text).
- [ ] **Evidence item** cards: label, `sourceType`, and **classification** badge are **scannable**; scroll region (`max-h-80` area) is acceptable.
- [ ] **Classification** is clear: e.g. **Not sent to provider**, **Requires teacher confirmation**, **Safe for summary**, **Staff selection required** (per `evidenceClassificationBadgeLabel` in code).
- [ ] Items classified as **not for provider** read as **internal-only** (not as “send to AI” or parent-facing).
- [ ] **Heads-up** (warnings) and **Fallback / missing evidence** feel **informational**, not like a **red error** or **failed save**.
- [ ] **Scope note** (if shown) explains missing student/class/branch/period without sounding broken.
- [ ] **Generate Mock Draft** description states **staff-side** / **not to parents**; **mock** is clearly **not** real provider output.
- [ ] **Lifecycle** copy or layout makes **release** a **deliberate** step (no accidental “done” feeling after mock only).
- [ ] **No** provider API keys, model pickers, or “connect OpenAI” style UI.
- [ ] **No** **`real_ai`** option in create version / generation source.
- [ ] **No** PDF export or “email parent” from this page for the mock path.

---

## 4. Mobile QA checklist (~390px)

- [ ] **No horizontal overflow** (page, cards, badge rows, evidence list).
- [ ] **Source summaries** wrap; no unreadable single-line overflow.
- [ ] **Evidence item** cards: padding and font size still usable; not illegibly dense if many items.
- [ ] **Badges** (`Badge` chips, classification) **wrap** and remain legible.
- [ ] **Heads-up** warning chips and **Fallback / missing evidence** list **readable** without zoom.
- [ ] **Generate Mock Draft** button **visible** without hunting; not trapped below fold in a broken way.
- [ ] **Manual override / source note** textareas **usable** (tap targets, not clipped).
- [ ] **Lifecycle** buttons **wrap** or stack; still tappable; not overlapping.
- [ ] **No** critical action only visible after awkward sideways scroll.

---

## 5. Safety / privacy visual checklist

Confirm by inspection (staff route + ParentView spot-check if available):

| Check | Pass criteria |
|-------|----------------|
| Errors / failures | **No** raw SQL, RLS policy names, stack traces, or `.env` hints in UI |
| Provider / infra | **No** provider keys, **no** service-role hints, **no** raw Supabase project URLs as copy |
| Storage | **No** raw `storage_path`, signed URLs, or bucket paths in Source Evidence Preview |
| Evidence rows | **No** dump of DB rows — **summaries and classification only** |
| Parent access | **Staff page only** — parents **do not** see this preview |
| ParentView | **Released / current-version-only** — **no** draft mock, **no** evidence links, **no** staff notes |
| AI to parents | **No** auto-send; mock draft **not** parent-visible until **explicit release** workflow |
| PDF / notify | **No** PDF export or parent email triggered from this QA session |

---

## 6. Known risks to look for

Document findings in a short log (date, viewport, role):

1. **Density:** Many **evidence items** → long scroll, teacher fatigue; may need collapse or pagination later.
2. **Wording:** **Hybrid** mixes system and fallback text — teachers might think **all** lines are “live data” unless copy stays clear (see intro line on system card).
3. **missingEvidence:** Could **look like failure** if styling reads as “error list”; should stay **neutral** (current design: informational heading).
4. **IDs:** Report/version **UUIDs** in detail/history may look **ugly** or alarming — note if teachers complain.
5. **Expectations:** Teachers might believe **mock draft** or preview implies **real worksheet OCR** or **full AI analysis** — flag if copy understates **stub/mock** nature.
6. **Release:** **Release** may need **stronger confirmation** later if mis-clicks are observed.
7. **Mobile:** **Long placeholder strings** or badges could still **crowd** small screens — note specific sections.

---

## 7. Recommended next milestone (decision rule)

| Outcome | Next step |
|---------|-----------|
| **Issues found** (copy, density, mobile overflow, misleading “error” feel) | **Fix UI/copy/mobile** in a **small follow-up PR** before real provider work. |
| **Clean pass** | Choose **(A)** real provider **dev/staging smoke** (keys gated, **no** `real_ai` unlock, **no** production), **or** **(B)** worksheet/OCR **evidence planning** — per product priority. |

**Rule of thumb:** If any issue **changes teacher understanding** of **mock vs live**, **safe vs parent-facing**, or **release boundary**, **fix first**. Otherwise **real provider smoke** can proceed with existing guards (**mock_ai** only, **real_ai** blocked).

---

## 8. Validation

This file is **documentation only**.

- **Do not** run `npm run build` / lint / typecheck **unless** `src/` or config changes in the same change set.
- After adding/updating docs: `git diff --name-only` should list **only** `docs/…` paths.

---

## 9. Related prompts

- Short copy-paste variant: **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** §11.
- Broader parent-comms mobile QA: **`docs/manual-mobile-qa-ai-report-parent-communication-checkpoint.md`**.

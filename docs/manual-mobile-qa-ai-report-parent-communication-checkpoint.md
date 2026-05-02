# Manual Mobile / Desktop QA — AI Parent Report + Parent Communication MVP

Date: 2026-05-02  
Scope: **QA checklist + checkpoint documentation only** — human preview pass **before** real provider keys, paid calls, PDF/export, or notification automation

**Related:** `docs/ai-parent-report-mvp-final-qa-checkpoint.md`, `docs/mobile-first-qa-checkpoint.md`, `docs/real-ai-provider-secret-model-smoke-plan.md`

**Reference routes/components (inspect only; no code changes in this milestone):**  
`src/pages/AiParentReports.jsx`, `src/pages/ParentView.jsx`, `src/pages/Announcements.jsx`, `src/components/layout/Sidebar.jsx`

---

## 1) QA purpose

- Validate **UX, layout, labels, and flow clarity** on **desktop** and **narrow/mobile** widths for staff and parent surfaces tied to **AI parent reports** and **parent communication**.
- Capture **risks and follow-ups** as findings — **do not** implement fixes in this milestone unless separately approved.
- Intended **before** enabling **real AI** provider keys/calls — current product remains **mock AI / manual** for drafts.

---

## 2) Surfaces to manually preview

Use **fake/dev personas** only — no real student/parent/school data.

### Staff

| Area | Route / entry (typical) |
|------|-------------------------|
| Dashboard / navigation / sidebar | Home layout + **`Sidebar.jsx`** |
| Announcements — internal requests | **`Announcements.jsx`** (staff flows) |
| Company News | Nav + company news surfaces |
| Parent Notices | Parent-notice flows per nav |
| Parent-facing media upload / release | Staff media workflows per product nav |
| MyTasks | MyTasks / announcements tasks integration |
| **AI Parent Reports** | **`/ai-parent-reports`** — **`AiParentReports.jsx`** |

### Parent

| Area | Notes |
|------|--------|
| ParentView dashboard | **`ParentView.jsx`** |
| Memories / communication areas | Within ParentView sections |
| Announcements & Events | Parent-facing announcements |
| **Progress Reports** | Released-report section — **current released version** only |

---

## 3) Staff — AI Parent Reports QA checklist

Preview **`AI Parent Reports`** at desktop and ~390px width.

| # | Check | Pass / Issue notes |
|---|--------|-------------------|
| ☐ | Page loads without console-breaking errors (desktop) | |
| ☐ | Page loads at mobile width | |
| ☐ | Report **list** readable (titles, status, period, spacing) | |
| ☐ | **Selected report detail** readable | |
| ☐ | **Draft create** form — fields not cramped; labels clear | |
| ☐ | **Version history** readable (ordering, labels) | |
| ☐ | **Evidence links** readable for staff | |
| ☐ | **Generate Mock Draft** affordance clear (not confused with real AI) | |
| ☐ | Lifecycle actions clear (**Submit**, **Approve**, **Release**, **Archive**) | |
| ☐ | **Release** implies explicit parent visibility change — copy not misleading | |
| ☐ | **No** `real_ai` option exposed to staff UI | |
| ☐ | **No** provider keys, model IDs, or debug metadata shown | |
| ☐ | **No** PDF/export buttons or promises | |

---

## 4) Parent — Progress Reports QA checklist

Preview **ParentView** → **Progress Reports** (linked child, released data only).

| # | Check | Pass / Issue notes |
|---|--------|-------------------|
| ☐ | **Progress Reports** section visible when applicable | |
| ☐ | Latest / primary report card readable | |
| ☐ | List / history readable if shown | |
| ☐ | Selected report **detail** readable | |
| ☐ | Section text renders clearly (spacing, long paragraphs) | |
| ☐ | **No** draft or internal workflow status exposed | |
| ☐ | **No** evidence links | |
| ☐ | **No** `ai_model_label`, `generation_source`, or provider metadata | |
| ☐ | **No** PDF/export links | |
| ☐ | **No** staff-only controls | |

---

## 5) Parent communication QA checklist

Cross-check announcements, memories, and media surfaces in **ParentView** / parent routes.

| # | Check | Pass / Issue notes |
|---|--------|-------------------|
| ☐ | **Announcements & Events** layout readable mobile/desktop | |
| ☐ | **Memories** placement and cards readable | |
| ☐ | Parent-facing **media** displays appropriately (no broken layout) | |
| ☐ | **No** staff controls in ParentView | |
| ☐ | **No** internal-only announcements leak into parent UI | |
| ☐ | **No** raw `storage_path`, bucket paths, or public URLs shown as primary content | |

---

## 6) Mobile-first checks (~390px primary)

Apply across staff AI reports + ParentView + key parent comms pages.

| # | Check | Pass / Issue notes |
|---|--------|-------------------|
| ☐ | No **horizontal overflow** on primary scroll | |
| ☐ | Primary buttons **thumb-friendly** (size, spacing) | |
| ☐ | Cards not **over-dense** (tap targets, padding) | |
| ☐ | Forms usable (inputs not clipped; keyboards don’t hide CTAs permanently) | |
| ☐ | Long titles/text **wrap** without truncation bugs | |
| ☐ | Status **badges** readable | |
| ☐ | Detail panels / accordions **not hidden** behind unclear affordances | |
| ☐ | **Navigation** reachable (sidebar collapse or bottom nav pattern works) | |

---

## 7) Safety / privacy visual checks

Confirm the UI does **not** accidentally expose:

| Risk | Look for |
|------|----------|
| Infra leaks | Raw SQL/RLS errors, stack traces, env keys in toasts |
| Secrets | Provider keys, JWT blobs, service-role hints |
| Paths | Evidence storage paths, signed URLs in staff UI where inappropriate |
| Staff-only data | Internal notes, unreleased versions, debug JSON |
| Parent leak | Draft AI text, unreleased reports, “pending release” parent-visible |

---

## 8) Known gaps to look for (likely follow-ups)

Document findings during QA — examples of issues teams often hit:

- Raw **UUIDs** where **friendly names** would help selectors.
- Report **form selectors** need polish (class/student/report type).
- **Long section text** may need typography/spacing tweaks.
- **Sidebar / nav** at mobile may need refinement for deep routes.
- **Release** confirmation copy could be stronger (“parents will see…”).
- **Media delete / governance** UX may need clearer warnings.

---

## 9) Validation commands (engineering sanity)

After doc-only changes:

```bash
git diff --name-only
npm run build
npm run lint
npm run typecheck
```

**Smoke suite:** optional if **no** runtime files changed — run targeted smokes only when app code changes.

---

## 10) Recommended next milestone (depends on QA outcome)

| Option | When |
|--------|------|
| **A** | **Fix** mobile/UX issues found in QA |
| **B** | QA clean enough → **dev/staging provider secret** + **real** provider smoke (**no** persistence) |
| **C** | PDF/export planning |
| **D** | Email/notification automation planning |
| **E** | Production seed/fixture cleanup |

**Guidance:**  
- If QA finds **blocking** UX issues → **A** before spend.  
- If QA is **acceptable** and ops approves budget → **B**.  
- Prefer **not** to prioritize **D** (email automation) until report/release/provider flows are **stable**.

---

## 11) Next implementation prompts (copy-paste)

### Option A — Fix QA issues found

```text
Continue this same project only.

Goal: Address manual QA findings from docs/manual-mobile-qa-ai-report-parent-communication-checkpoint.md (mobile/layout/copy). Scope only approved items.

Constraints: no real_ai unlock; no provider keys; no PDF/export; no notification automation unless scoped separately.
```

### Option B — Dev/staging secret + real provider smoke

```text
Continue this same project only.

Goal: Set DEV/STAGING Edge secrets outside repo; run real provider smoke with no persistence — per docs/real-ai-provider-secret-model-smoke-plan.md.

Constraints: no UI wiring unless explicitly requested; no real_ai DB unlock; fake/dev payloads only.
```

---

## Checkpoint completion

**Tester:** _________________ **Date:** _________________ **Devices/browsers:** _________________

**Summary:** (free text — top 3 findings)

**Recommendation:** ☐ A fixes ☐ B provider smoke ☐ defer ☐ other: _______

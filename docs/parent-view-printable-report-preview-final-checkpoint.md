# ParentView printable report preview — final checkpoint (sealed, docs-only)

Date: 2026-05-03  
Type: **documentation seal** for the **visual polish** milestone — **no** `src/` changes in this file.  
**Implementation record:** commit **`8d4ef4b`** (*Polish ParentView printable report preview*).  
**Feature checkpoints:** **`docs/parent-view-printable-report-preview-checkpoint.md`**, **`docs/parent-view-printable-report-preview-visual-polish-checkpoint.md`**.

---

## 1. Key checkpoint notes

- **ParentView** printable **HTML** preview is **implemented** and **visually polished** (framing, copy, iframe height, date display, branch/centre label).  
- **Released / current-version only** — same data path as the detail view; adapter rejects non-released reports.  
- **Preview only** — **not** a real **Download PDF**; **no** parent-facing file download.  
- **No** binary PDF generation, **no** object storage, **no** new SQL/RLS, **no** provider or email/notification wiring in this feature.

---

## 2. ParentView preview behavior

| Topic | Detail |
|-------|--------|
| **Entry** | **Preview printable report** / **Hide printable preview** on **Progress Reports** when released **detail** + **current version** are loaded and the PDF input + HTML render succeed |
| **Rendering** | **Sandboxed iframe** with **`srcDoc`** from **`renderReleasedReportPdfHtml`**; data from **`buildReleasedReportPdfInputFromParentViewContext`** using already-fetched rows (**no** extra report reads for preview) |
| **Copy** | **Printable report preview**; **no file** generated or **stored**; **Download PDF will come later** |
| **Code** | **`src/pages/ParentView.jsx`**, **`src/services/aiParentReportPdfTemplate.js`** (as of **`8d4ef4b`**) |

---

## 3. Visual polish behavior (8d4ef4b)

| Area | Behavior |
|------|----------|
| **Frame** | Rounded outer chrome, inset frame around iframe, **`max-w-full overflow-x-hidden`** to limit page-level horizontal overflow |
| **Helper copy** | Line explaining **scroll inside the white area**; clarifies **layout preview**, not a download |
| **Iframe** | Taller viewport: **`min(88vh, 900px)`** height with **`minHeight: 560px`**; **`key={selectedReportId}`** for clean remount when switching reports |
| **Loading** | **No** additional React spinner around the iframe — preview is **synchronous** client HTML |
| **Released date** | **`formatReleasedAtForParentPdfDisplay`** — parent-visible **DD Mon YYYY, HH:mm** (UTC), not raw ISO strings in HTML |
| **Branch / centre** | **`listBranches(viewer)`** + class **`branch_id`** when available; else **class · programme**; else **Learning Centre** |

---

## 4. Safety boundaries (unchanged by this doc)

- **No** drafts in parent preview; **no** evidence links; **no** raw version history in UI or HTML body  
- **No** `generation_source`, **`ai_model_label`**, provider/debug metadata, **no** `release_events`  
- **No** storage paths, **no** staff-only notes in parent output  
- **No** parent **Download PDF** or signed export yet — export/storage remains future work per **`docs/released-ai-parent-report-export-strategy-plan.md`**

---

## 5. Tests recorded at `8d4ef4b`

All **PASS** (Supabase smokes may emit expected **`[CHECK]`** lines only):

| Command | Result |
|---------|--------|
| **`npm run build`** | **PASS** |
| **`npm run lint`** | **PASS** |
| **`npm run typecheck`** | **PASS** |
| **`npm run test:ai-parent-report:pdf-template`** | **PASS** |
| **`npm run test:supabase:ai-parent-reports`** | **PASS** |
| **`npm run test:supabase:parent-announcements`** | **PASS** |
| **`npm run test:supabase:parent-announcements:media`** | **PASS** |

---

## 6. Recommended next milestone

**Recommend:** **A. Parent Communication step-label simplification** — **`ParentUpdates.jsx`** (`/parent-updates`): clearer numbered / titled steps for quick comment, class memory, and weekly progress so teachers see **where they are** in the pipeline (**Announcements** remains distinct). Highest practical **MVP clarity** win now that parent-side report preview is polished.

**Parked future lanes** (unchanged; no commitment order):

| Lane | Notes |
|------|--------|
| Real **Download PDF** / storage / **signed URL** | Policy + engineering design first |
| **real_ai** unlock / real AI provider smoke | Policy-gated |
| **Notification / email automation** | **`docs/notification-system-sql-rls-review-plan.md`**, trigger matrix |
| **Attendance arrival notification** | Product + notification foundation |
| **Worksheet / OCR AI analysis** | Future evidence path; privacy review |

---

## 7. Next implementation prompt (copy-paste)

Use for **Parent Communication** UI polish — **small PR**; **no** SQL/RLS; **no** ParentView rule changes; **no** `real_ai`; demo/demoRole/local fallback unchanged.

```text
Parent Communication step-label simplification (ParentUpdates.jsx, route /parent-updates) — UI/copy polish only.

Goals:
1. Add clear step framing at the top of each major workflow (Quick comment / Class memory / Weekly progress): short numbered strip or subtitles matching teacher mental model (draft → review → share/release), without changing backend contracts.
2. Align visible labels with docs/teacher-upload-step-simplification-plan.md §5 (page framing, Add Memory, Quick Parent Comment, Weekly Progress; human-readable draft/shared states).
3. Mobile-first: one primary action per card segment where possible; full-width primaries at ~390px per §10; do not introduce raw technical statuses in primary headings.
4. Keep Announcements vs Parent Communication distinction clear in section intros (see docs/project-master-context-handoff.md §0 product language if needed).
5. Do not change Supabase write shapes or RLS; no service role in frontend; no auto-send email/notifications.

Reference: docs/teacher-upload-step-simplification-plan.md §5, §9, §10, §11.

Validate when src/ changes: npm run build, npm run lint, npm run typecheck; use existing smokes that touch parent flows if any.
```

---

## Validation (this doc milestone)

- **Docs-only** — **`git diff --name-only`** should list only `docs/` paths.  
- **Do not** run build/lint/typecheck unless **`src/`** changes.

## Related

- **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`** — optional re-run for screenshots after any future ParentView copy tweak  
- **`docs/released-ai-parent-report-export-strategy-plan.md`** — export when policy allows  
- **`docs/project-master-context-handoff.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**

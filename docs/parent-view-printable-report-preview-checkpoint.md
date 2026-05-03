# ParentView — printable report preview (checkpoint)

Date: 2026-05-03 (visual polish **2026-05-03** — **`docs/parent-view-printable-report-preview-visual-polish-checkpoint.md`**)  
Scope: **`ParentView.jsx`** — **`Progress Reports`** adds optional **Preview printable report** (toggle) showing **`renderReleasedReportPdfHtml`** output in a **sandboxed iframe**. **Client-side preview only** — **no** binary PDF, **no** download button, **no** storage, **no** SQL/RLS changes, **no** provider/email/notifications.

## Behavior

| Topic | Detail |
|-------|--------|
| **Trigger** | Button **Preview printable report** / **Hide printable preview** — only when selected released report **detail** + **current version** load successfully and **`buildReleasedReportPdfInputFromParentViewContext`** + **`renderReleasedReportPdfHtml`** succeed |
| **Data** | Same rows already shown above — **`buildReleasedReportPdfInputFromParentViewContext({ report: detail, currentVersion, context })`** — no extra Supabase reads |
| **Demo parent** | **`DEMO_PARENT_RELEASED_REPORTS`** + **`DEMO_PARENT_RELEASED_REPORT_CURRENT_VERSION_BY_ID`** — fake/dev only; **no** writes |
| **Authenticated parent** | Existing **`getAiParentReportDetail`** + **`getAiParentReportCurrentVersion`** — JWT + RLS; **no** service role |
| **Unavailable** | Generic copy: **Printable preview is not available for this report yet.** |
| **Chrome** | Labels: **Printable report preview**, released content only, **no file stored**, **Download PDF will come later**; optional line to **scroll inside** the white preview on small screens |
| **Layout** | Taller iframe viewport (**`min(88vh, 900px)`** height floor), framed inset, **`key`** on iframe when switching reports; **released** line in HTML uses **formatted date** (not raw ISO) via **`formatReleasedAtForParentPdfDisplay`** |
| **Branch label** | Resolved from **`listBranches`** + class **`branch_id`** when available; else class/programme join; else **Learning Centre** |

## Safety (preserved)

- **Released-only** — adapter refuses **`status !== 'released'`**; ParentView list already released-only  
- **No** evidence links, **no** `generation_source` / **`ai_model_label`** in parent UI from this feature (HTML from validated helper only)  
- **No** raw version history list, **no** release_events in output  
- Parent-facing copy avoids technical schema names  

## Related

- **`docs/parent-view-printable-report-preview-visual-polish-checkpoint.md`** — container + iframe + date + branch polish (**2026-05-03**)
- **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`** — **canonical manual visual QA** (desktop + **~390px**)
- **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**
- **`docs/released-ai-parent-report-export-strategy-plan.md`**

## Recommended next

1. **Manual visual QA** per **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`** before **Download PDF** / storage planning.  
2. Re-run **`docs/mobile-first-qa-checkpoint.md`** entry for ParentView after QA.

## Validation

Touching **`ParentView.jsx`**: **`npm run build`**, **`npm run lint`**, **`npm run typecheck`**, **`npm run test:ai-parent-report:pdf-template`**, **`npm run test:supabase:ai-parent-reports`**, **`npm run test:supabase:parent-announcements`**, **`npm run test:supabase:parent-announcements:media`**

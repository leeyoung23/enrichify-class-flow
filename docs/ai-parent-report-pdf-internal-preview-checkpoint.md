# AI Parent Report PDF — internal HTML preview (checkpoint)

Date: 2026-05-03 (navigation clarity **2026-05-03** — **`docs/pdf-preview-navigation-clarity-fix-checkpoint.md`** · visual polish **2026-05-03** — **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**)  
Scope: **staff/dev-only** visual preview of **`renderReleasedReportPdfHtml`** (**Student Progress Report** boxed A4 layout) using **`buildDemoReleasedReportPdfInput`** — **no** binary PDF, **no** storage, **no** SQL/RLS, **no** ParentView download button, **no** parent-facing export controls.

## Delivered

| Item | Detail |
|------|--------|
| **Route** | **`/ai-parent-report-pdf-preview`** — **`src/pages/AiParentReportPdfPreview.jsx`** |
| **Access** | Teacher, branch supervisor, HQ (**same gate as** **`AiParentReports`**); parent/student see **Access restricted** if URL is opened manually |
| **Navigation** | **Not** a default sidebar item — **removed** from normal staff nav (**`ROLE_NAVIGATION`**) to avoid “everyday workflow” confusion. Entry from **`AiParentReports`** optional card + direct URL. **not** in parent/student nav |
| **Data** | **Fake/dev fixtures only** — variant selector: **`monthly_progress`**, **`weekly_brief`**, **`long_text`**, **`sparse_optional_fields`** |
| **Rendering** | **`renderReleasedReportPdfHtml`** — student panel, **At a glance** cards, boxed **Report detail** sections, signature block; iframe **`sandbox=""`**, **`referrerPolicy="no-referrer"`** |
| **Labelling** | Banner: internal preview, **not a parent download**, fake/dev only, no file stored, parents do not see this page |
| **Staff shortcut** | Optional dashed **card** on **`AiParentReports.jsx`** (“Internal PDF preview” — layout checking only) |

## Explicit non-goals (preserved)

- **ParentView** has optional **Preview printable report** (iframe, released content only; **no** file download) — **`docs/parent-view-printable-report-preview-checkpoint.md`**. **No** standalone parent **Download PDF** button  
- **No** Supabase calls, provider calls, or **real** report rows on this page  
- **No** storage upload, signed URLs, or PDF binary generation  
- **No** client/server PDF libraries  
- **No** SQL/RLS DDL  
- **No** `real_ai` unlock  

## Smoke / regression

- **`npm run test:ai-parent-report:pdf-template`** — includes **all four** demo variants render + forbidden-token scan  
- When touching **`App.jsx`**, **`permissionService.js`**, **`AiParentReports.jsx`**, or **`AiParentReportPdfPreview.jsx`**: also **`npm run test:supabase:ai-parent-reports`** (expected **CHECK** lines OK)

## Recommended next

1. **Manual visual QA** (screenshot runbook): **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`** — desktop + **~390px**; also indexed in **`docs/mobile-first-qa-checkpoint.md`**.  
2. After QA sign-off: ParentView **Download PDF** (policy-gated) only if preview is visually acceptable — **`docs/released-ai-parent-report-export-strategy-plan.md`**.

## Related

- **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`** — **canonical manual QA** for this route  
- **`docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`** — helper module reference  
- **`docs/ai-parent-report-pdf-template-contract-plan.md`** — content contract  
- **`docs/pdf-preview-navigation-clarity-fix-checkpoint.md`** — sidebar removal + optional card  
- **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`** — A4 visual template polish  

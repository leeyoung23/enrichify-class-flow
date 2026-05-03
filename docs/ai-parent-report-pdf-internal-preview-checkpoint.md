# AI Parent Report PDF — internal HTML preview (checkpoint)

Date: 2026-05-03  
Scope: **staff/dev-only** visual preview of **`renderReleasedReportPdfHtml`** output using **`buildDemoReleasedReportPdfInput`** — **no** binary PDF, **no** storage, **no** SQL/RLS, **no** ParentView download button, **no** parent-facing export controls.

## Delivered

| Item | Detail |
|------|--------|
| **Route** | **`/ai-parent-report-pdf-preview`** — **`src/pages/AiParentReportPdfPreview.jsx`** |
| **Access** | Teacher, branch supervisor, HQ (**same gate as** **`AiParentReports`**); parent/student see **Access restricted** if URL is opened manually |
| **Navigation** | Sidebar **`PDF preview (internal)`** for staff roles only (**`ROLE_NAVIGATION`**); **not** in parent/student nav |
| **Data** | **Fake/dev fixtures only** — variant selector: **`monthly_progress`**, **`weekly_brief`**, **`long_text`**, **`sparse_optional_fields`** |
| **Rendering** | **`renderReleasedReportPdfHtml(buildDemoReleasedReportPdfInput({ variant }))`** — iframe with **`sandbox=""`** (no scripts), **`referrerPolicy="no-referrer"`** |
| **Labelling** | Banner: internal preview, fake/dev only, not visible to parents, no file stored |
| **Staff shortcut** | Link from **`AiParentReports.jsx`** intro strip (“Internal PDF HTML preview (dev)”) |

## Explicit non-goals (preserved)

- **No** ParentView changes or parent download UI  
- **No** Supabase calls, provider calls, or **real** report rows on this page  
- **No** storage upload, signed URLs, or PDF binary generation  
- **No** client/server PDF libraries  
- **No** SQL/RLS DDL  
- **No** `real_ai` unlock  

## Smoke / regression

- **`npm run test:ai-parent-report:pdf-template`** — includes **all four** demo variants render + forbidden-token scan  
- When touching **`App.jsx`**, **`permissionService.js`**, **`AiParentReports.jsx`**, or **`AiParentReportPdfPreview.jsx`**: also **`npm run test:supabase:ai-parent-reports`** (expected **CHECK** lines OK)

## Recommended next

1. **Manual visual QA** of the preview (desktop + ~390px): typography, iframe scroll, variant switching — **`docs/mobile-first-qa-checkpoint.md`**.  
2. Later product milestones: ParentView **Download PDF** (policy-gated), optional browser print, then storage/signed URL if persisted exports are approved — **`docs/released-ai-parent-report-export-strategy-plan.md`**.

## Related

- **`docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`** — helper module reference  
- **`docs/ai-parent-report-pdf-template-contract-plan.md`** — content contract  

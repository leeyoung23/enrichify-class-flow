# PDF internal preview — navigation clarity fix (checkpoint)

Date: 2026-05-03  
Scope: **UI/navigation copy only** — remove **PDF preview** from **normal staff sidebar** so teachers do not treat it as a core workflow step. **Internal route** remains for QA; entry is **only** from **AI Parent Reports** via a clearly **optional** card. **No** ParentView download button, **no** storage/SQL/RLS, **no** provider/email, **no** binary PDF.

## What changed

| Area | Before | After |
|------|--------|--------|
| **Sidebar** | **PDF preview (internal)** listed for HQ, branch supervisor, teacher | **Removed** from **`ROLE_NAVIGATION`** — not a default nav item |
| **AI Parent Reports** | Small inline link in intro strip | **Optional** dashed **card**: “Internal PDF preview”, layout-only, fake/dev, parents do not see; link to **`/ai-parent-report-pdf-preview`** |
| **Preview page** | Banner + header | Stronger copy: **not a parent download**, **no file stored**, **fake/dev fixture only**, **no download/print/export** wording |

## Preserved

- **Route** **`/ai-parent-report-pdf-preview`** — still registered in **`App.jsx`**; direct URL works for **teacher / supervisor / HQ** (and demo staff roles); **not** in parent/student nav.
- **Helper** — still **`buildDemoReleasedReportPdfInput`** + **`renderReleasedReportPdfHtml`**; sandboxed iframe.
- **ParentView** — visibility and **no** parent PDF export controls unchanged.

## Manual QA

Re-run spot checks in **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`**: confirm **sidebar** has no PDF item; **card** is visible and reads as **optional**; preview page banner matches expectations.

## Related

- **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**
- **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`**

## Validation

When touching **`permissionService.js`**, **`AiParentReports.jsx`**, or **`AiParentReportPdfPreview.jsx`**: **`npm run build`**, **`npm run lint`**, **`npm run typecheck`**, **`npm run test:ai-parent-report:pdf-template`**, **`npm run test:supabase:ai-parent-reports`** (expected **CHECK** lines OK).

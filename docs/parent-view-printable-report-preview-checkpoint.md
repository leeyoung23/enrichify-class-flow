# ParentView — printable report preview (checkpoint)

Date: 2026-05-03  
Scope: **`ParentView.jsx`** — **`Progress Reports`** adds optional **Preview printable report** (toggle) showing **`renderReleasedReportPdfHtml`** output in a **sandboxed iframe**. **Client-side preview only** — **no** binary PDF, **no** download button, **no** storage, **no** SQL/RLS changes, **no** provider/email/notifications.

## Behavior

| Topic | Detail |
|-------|--------|
| **Trigger** | Button **Preview printable report** / **Hide printable preview** — only when selected released report **detail** + **current version** load successfully and **`buildReleasedReportPdfInputFromParentViewContext`** + **`renderReleasedReportPdfHtml`** succeed |
| **Data** | Same rows already shown above — **`buildReleasedReportPdfInputFromParentViewContext({ report: detail, currentVersion, context })`** — no extra Supabase reads |
| **Demo parent** | **`DEMO_PARENT_RELEASED_REPORTS`** + **`DEMO_PARENT_RELEASED_REPORT_CURRENT_VERSION_BY_ID`** — fake/dev only; **no** writes |
| **Authenticated parent** | Existing **`getAiParentReportDetail`** + **`getAiParentReportCurrentVersion`** — JWT + RLS; **no** service role |
| **Unavailable** | Generic copy: **Printable preview is not available for this report yet.** |
| **Chrome** | Labels: **Printable report preview**, released content only, **no file stored**, **Download PDF will come later** |

## Safety (preserved)

- **Released-only** — adapter refuses **`status !== 'released'`**; ParentView list already released-only  
- **No** evidence links, **no** `generation_source` / **`ai_model_label`** in parent UI from this feature (HTML from validated helper only)  
- **No** raw version history list, **no** release_events in output  
- Parent-facing copy avoids technical schema names  

## Related

- **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**
- **`docs/released-ai-parent-report-export-strategy-plan.md`**

## Validation

Touching **`ParentView.jsx`**: **`npm run build`**, **`npm run lint`**, **`npm run typecheck`**, **`npm run test:ai-parent-report:pdf-template`**, **`npm run test:supabase:ai-parent-reports`**, **`npm run test:supabase:parent-announcements`**, **`npm run test:supabase:parent-announcements:media`**

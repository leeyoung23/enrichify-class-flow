# ParentView printable report preview — visual polish (checkpoint)

Date: 2026-05-03  
**Sealed (docs):** **`docs/parent-view-printable-report-preview-final-checkpoint.md`** — milestone summary, tests from **`8d4ef4b`**, recommended next (**Parent Communication** step-label).  
Scope: **Parent-facing** printable **HTML preview** only — **no** Download PDF, **no** binary PDF, **no** storage, **no** SQL/RLS, **no** provider/email/notification wiring. Future AI automation and email lanes remain **unchanged** (parked per existing strategy docs).

## What changed

| Area | Detail |
|------|--------|
| **Preview container** | Stronger framed chrome (`rounded-xl`, inset frame), **`max-w-full overflow-x-hidden`** to reduce page-level horizontal scroll; helper line: scroll inside the white preview — layout preview only, not a download |
| **Iframe sizing** | **`height: min(88vh, 900px)`**, **`minHeight: 560px`**, **`key={selectedReportId}`** for clean remount when switching reports |
| **Released date** | **`formatReleasedAtForParentPdfDisplay`** in **`aiParentReportPdfTemplate.js`** — parent-facing HTML shows **`DD Mon YYYY, HH:mm`** (UTC) instead of raw ISO strings |
| **Centre / branch label** | **`listBranches(viewer)`** + **`cls.branch_id`** when available; else **`Class · Programme`** join; else **`Learning Centre`** — **no** remote images, **no** new Supabase fields |
| **Adapter default** | **`buildReleasedReportPdfInputFromParentViewContext`** branch fallback aligned to **Learning Centre** when caller omits branch |

## Safety (unchanged)

- Released / current-version only; adapter still rejects non-released reports  
- **`validateReleasedReportPdfInput`** unchanged; forbidden-token scan + smoke tests preserved  
- **No** `generation_source`, **`ai_model_label`**, **`evidence_links`**, **`release_events`**, storage paths, or staff-only notes in output  

## Related

- **`docs/parent-view-printable-report-preview-final-checkpoint.md`** — **final seal** (docs-only)
- **`docs/parent-view-printable-report-preview-checkpoint.md`**
- **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`** — re-run after this polish
- **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**

## Validation

Touching **`ParentView.jsx`** / **`aiParentReportPdfTemplate.js`**: **`npm run build`**, **`npm run lint`**, **`npm run typecheck`**, **`npm run test:ai-parent-report:pdf-template`**, **`npm run test:supabase:ai-parent-reports`**, **`npm run test:supabase:parent-announcements`**, **`npm run test:supabase:parent-announcements:media`**

## What remains future

- Real **Download PDF** + storage / signed URLs (**policy decision first**)  
- Optional demo **browser print** (internal-only / clearly not a file — only if product asks)  
- Notification SQL/RLS foundation and email automation — **separate** lanes per **`docs/notification-system-sql-rls-review-plan.md`** / trigger matrix — **not** part of this milestone  

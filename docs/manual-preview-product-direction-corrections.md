# Manual preview — product direction corrections (2026-05-02)

Scope: **UX/copy/documentation alignment only.** No SQL/RLS changes, no provider keys, no `real_ai` unlock, no notification/email automation, no new uploads backend.

## Summary

| Topic | Direction |
|-------|-----------|
| **Parent Updates → Parent Communication** | Sidebar and primary staff heading use **Parent Communication** (route unchanged: **`/parent-updates`**). Page clarifies this is **not** official announcements; official notices/events stay under **Announcements**. |
| **Announcements vs Parent Communication** | **Requests** = internal staff tasks/reminders. **Company News** = internal staff news. **Parent Notices** = official parent-facing centre notices/events. **Parent Communication** = teacher/class learning updates, memories, weekly progress—not a substitute for official notices. |
| **AI Parent Reports** | **Workflow copy (2026-05-02):** **Report shell → Source evidence → Generate draft from evidence → Optional overrides → Lifecycle.** Manual/mock fields are **optional overrides** once evidence exists — see **`docs/ai-parent-report-workflow-ux-polish-checkpoint.md`**. Long term, drafts use **system evidence** with **teacher review/edit**. **No parent release** without explicit staff release; **no** real provider/PDF in UI. |
| **Observations** | Treated as a **future evidence source** for AI reports; current tab is not the end state. |
| **Worksheet / photo / homework evidence** | **Future** teacher upload of physical or digital evidence for analysis; **no** new storage wiring in this patch. **Parent visibility** remains **review/release-gated**; no auto-release. |
| **Parent Notices media (teacher)** | **MVP view-only** for teachers. **Future:** teachers may **submit** event/class photos for **supervisor/HQ review** before parent release—no direct teacher release. |
| **Email / notifications** | **Deferred**; copy and docs state this where relevant. |

## Code / doc touchpoints

- `src/services/permissionService.js` — nav label **Parent Communication**
- `src/pages/ParentUpdates.jsx` — page title, safety copy, teacher card distinction from Announcements
- `src/pages/Dashboard.jsx`, `src/components/dashboard/HqAlertsPanel.jsx` — link and pending-approval labels
- `src/pages/Announcements.jsx` — header, “how this page fits” card, parent notice / media copy
- `src/pages/AiParentReports.jsx` — evidence-first workflow copy and section order; Source Evidence Preview emphasis; mock-draft optional overrides — **`docs/ai-parent-report-workflow-ux-polish-checkpoint.md`**

## Related runbooks

- `docs/manual-mobile-qa-ai-report-parent-communication-checkpoint.md`
- `docs/ai-parent-report-mvp-final-qa-checkpoint.md`
- `docs/ai-parent-report-blueprint-plan.md`
- `docs/project-master-context-handoff.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/rls-test-checklist.md`

## What remains future

- Wire AI drafts to real attendance, homework, observations, and media with RLS-safe queries.
- Teacher evidence upload pipeline (worksheets, photos) with staff approval and parent release rules.
- Email/notification automation.
- `real_ai` version creation and production provider configuration (key-gated, separate milestone).

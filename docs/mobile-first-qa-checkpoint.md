# Mobile-first QA checkpoint

## Checkpoint update (ParentView printable report preview — 2026-05-03)

- **Reference:** **`docs/parent-view-printable-report-preview-checkpoint.md`** — re-QA **~390px**: **Preview printable report** button, preview chrome, iframe scroll; **no** download control.
- **Visual polish ref:** **`docs/parent-view-printable-report-preview-visual-polish-checkpoint.md`** — taller iframe, scroll-inside copy, **no** page-level horizontal overflow from preview chrome.
- **Final seal (docs):** **`docs/parent-view-printable-report-preview-final-checkpoint.md`** — polish milestone closed; next product focus **Parent Communication** step-labels per §6.
- **Manual visual QA runbook:** **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`** — canonical desktop + **~390px** checklist for ParentView printable preview (**preview**, not download); safety §6; decision rule §8 (**A–E**).

## Checkpoint update (AI Parent Report PDF template visual polish — 2026-05-03)

- **Reference:** **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`** — re-QA **`/ai-parent-report-pdf-preview`** **~390px** after boxed layout: iframe scroll, highlight cards, signature block readability.

## Checkpoint update (PDF preview navigation clarity — 2026-05-03)

- **Reference:** **`docs/pdf-preview-navigation-clarity-fix-checkpoint.md`** — re-QA **~390px**: optional **AI Parent Reports** PDF preview card (readable, clearly optional); **sidebar** must not show PDF preview item.

## Checkpoint update (manual QA — AI Parent Report PDF internal preview — 2026-05-03)

- **Runbook:** **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`** — staff route **`/ai-parent-report-pdf-preview`**; **desktop + ~390px**; variants **monthly_progress**, **weekly_brief**, **long_text**, **sparse_optional_fields**; iframe readability; **no** parent export UI. **Checkpoint only** — **no** `src/` changes in this doc milestone.

## Checkpoint update (notification SQL/RLS review plan — planning only, 2026-05-03)

- **Reference:** **`docs/notification-system-sql-rls-review-plan.md`** — when notification inbox/UI ships, re-QA **~390px** for recipient-scoped lists (no cross-child leakage), read/dismiss, and preference surfaces; **no** runtime changes in this milestone.

## Checkpoint update (notification & email automation — planning only, 2026-05-03)

- **Reference:** **`docs/notification-email-automation-trigger-matrix-plan.md`** — when notification/in-app/email UI ships, re-QA **~390px** for parent/staff notification surfaces, preference toggles, and **short non-leaky** message previews; **no** runtime changes in this milestone.

## Checkpoint update (AI Parent Report PDF internal preview — 2026-05-03)

- **Route:** **`/ai-parent-report-pdf-preview`** (**staff-only**). Re-QA **desktop + ~390px**: banner legibility, variant **Select**, iframe height/scrolling, sandboxed preview (**no** parent nav). **Canonical:** **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**. **No** ParentView change.

## Checkpoint update (released AI Parent Report PDF/PNG export strategy — 2026-05-02)

- **Reference:** **`docs/released-ai-parent-report-export-strategy-plan.md`** — when PDF/summary exports ship, re-QA **ParentView** download actions at **desktop + ~390px** (tap targets, no draft leakage, signed URL flows); PNG summary as short card only.

## Checkpoint update (AI Parent Report PDF template contract — 2026-05-02)

- **`docs/ai-parent-report-pdf-template-contract-plan.md`** — print-first **A4** PDF contract; when export UI lands, verify **readable font sizes** and **tap targets** for download; content must match **released-only** rules §11.

## Checkpoint update (AI Parent Report PDF mock/render helper planning — 2026-05-02)

- **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`** — when **HTML preview** or **print** ships, re-QA **~390px** **preview** (if any) and **desktop print** margins; mock fixtures stay **fictional** only.

## Checkpoint update (AI Parent Report PDF helper module — 2026-05-02)

- **`docs/ai-parent-report-pdf-helper-fixture-checkpoint.md`** — **`renderReleasedReportPdfHtml`** output is **print-first A4**; any future preview UI should verify **readable font sizes** on narrow screens if embedded.

## Checkpoint update (AI Parent Report PDF helper — sealed doc, 2026-05-02)

- **Canonical:** **`docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`** — §10 **internal/dev preview** before parent download; **`2cfab48`** validation table §8.

## Checkpoint update (manual visual QA — Homework teacher upload/review, 2026-05-02)

- **Runbook:** **`docs/manual-qa-homework-teacher-upload-review-checkpoint.md`** — desktop + **~390px** for **`Homework.jsx`** after polish **`6fe18bc`**: intro, **Create homework task** steps, trackers, submission detail, **Teacher-marked work**, **Share feedback with family**; safety §8; decision rule §10 (fix Homework vs proceed to **Parent Communication** polish). **QA/checkpoint only** — **no** `src/` changes in this milestone.

## Checkpoint update (Homework staff review UI polish — 2026-05-02)

- **`docs/homework-teacher-upload-step-ui-polish-checkpoint.md`** — **`Homework.jsx`**: step-labelled **Create homework task**, **Submissions to review**, **Teacher-marked work**, **Share feedback with family** / **Share marked work with family**; IDs under **Staff reference**; full-width primary buttons on narrow widths. Re-QA **~390px**: toggle row, create flow, submission/marked/feedback cards.

## Checkpoint update (manual visual QA — navigation / ParentView / My Tasks / setup cards, 2026-05-02)

- **Runbook:** **`docs/manual-qa-navigation-clickability-simplicity-checkpoint.md`** — ParentView **Latest** + **More announcements** + **View more history** / **Show less**, **My Tasks** four groups, Branches/Classes/Teachers/Students **directory preview** cards; **desktop + ~390px**; safety/privacy §6; decision rule §8 (fix UI/copy vs proceed to **upload-step simplification**). **QA/checkpoint only** — **no** `src/` changes in this milestone.

## Checkpoint update (navigation clarity — sealed doc, 2026-05-02)

- **Canonical:** **`docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`** — §9 manual QA prompt (ParentView history + My Tasks + setup cards; desktop + **~390px**). **Docs-only** seal; UI baseline **`74a71bf`**.

## Checkpoint update (navigation clarity + ParentView history — 2026-05-02)

- **Reference:** **`docs/navigation-clickability-simplicity-fixes-checkpoint.md`** — ParentView **View more history**; My Tasks **grouped** blocks; setup pages less “fake clickable”. Re-QA ~390px: announcement toggle, task section headings, directory cards.

## Checkpoint update (teacher simplicity + clickability audit — 2026-05-02)

- **Reference:** **`docs/teacher-simplicity-navigation-clickability-audit.md`** — maps **Sidebar** nav by role, flags **non-clickable cards that look clickable** (e.g. **Branches**), teacher **Homework** / **Parent Communication** as highest simplification priority, **hash-based ParentView** section risks on small screens. Use for the next **~390px** pass and before **B/C** implementation (affordance fixes + upload step labels). **Docs-only** milestone.

## Checkpoint update (AI Parent Reports workflow UX polish — 2026-05-02)

- **`docs/ai-parent-report-workflow-ux-polish-checkpoint.md`** — shorter intro, evidence-first section order, optional overrides copy for mock draft, lifecycle release clarity; **AppLayout** Company News popup slightly compact (still bottom-right, **Dismiss** preserved). **No** SQL/RLS / ParentView / `real_ai`. Re-run ~390px pass on **AI Parent Reports** after this commit.

## Checkpoint update (manual visual QA — hybrid source preview, 2026-05-02)

- **Runbook:** **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`** — desktop + **~390px** checklists for **AI Parent Reports** Source Evidence Preview (**demo** vs **system** badge, summaries, Heads-up / Fallback, evidence items, **Generate Mock Draft**, lifecycle, safety/privacy). **Use fake/dev data only**; **no** real provider calls. **Decision rule:** fix UI/copy issues before real provider smoke if they affect teacher understanding; else proceed to staging provider smoke or evidence planning.
- Complements **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** §10–§11.

## Checkpoint update (Source Evidence Preview hybrid — 2026-05-02)

- **Source Evidence Preview** on **`AiParentReports.jsx`**: **demo** → **fake** mode; **authenticated** → **hybrid** (system evidence where available, safe fallback for gaps). Labels **Demo/fallback evidence** vs **System evidence preview**; missing sources **informational**, not fatal. **`Generate Mock Draft`** uses current preview bundle or re-collects with same mode. **Runbook + validation snapshot:** **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**. **Recommended next:** **manual visual QA** (desktop + ~390px) before real provider work — see final doc §10–§11.
- **Regression awareness:** aggregation + mock-draft smokes listed in **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** §8 (**`d235344`**).

## Checkpoint update (fake source aggregation service — 2026-05-02)

- **Supersedes UI slice:** hybrid wiring above; service still supports **`fake` / `rls` / `hybrid`** — **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**.
- **Regression awareness:** `npm run test:supabase:ai-parent-report:source-aggregation` — detail in `docs/ai-parent-report-source-aggregation-service-smoke-checkpoint.md`.

## Checkpoint update (product direction — parent communication + AI source copy, 2026-05-02)

- **Reference:** `docs/manual-preview-product-direction-corrections.md`
- Re-run spot checks on **~390px** for: **Parent Communication** page title/subtitle, **Announcements** “how this page fits” card, **AI Parent Reports** “Report source data preview” card + expanded manual/mock copy (readability, no cramped overflow).

## Checkpoint update (manual mobile QA — AI report + parent communication)

- **Runbook:** **`docs/manual-mobile-qa-ai-report-parent-communication-checkpoint.md`** — staff **`AI Parent Reports`**, **ParentView Progress Reports**, parent comms/announcements/memories; **~390px** + desktop; **no** code changes in this doc milestone.
- Complements **`docs/ai-parent-report-mvp-final-qa-checkpoint.md`**. Log findings; follow **A** (fix issues) or **B** (staging provider smoke) per doc §10.

## Checkpoint update (AI parent report MVP final QA)

- Cross-reference: **`docs/ai-parent-report-mvp-final-qa-checkpoint.md`** — MVP freeze before paid AI; recommends **manual mobile QA** (~390px / ~768px) on **`AI Parent Reports`** + **ParentView Progress Reports** when pausing before secrets.
- Preserve staff-only routes, parent released-only boundary, no PDF/export in parent UI.

## Checkpoint update (mock AI parent report draft UI finalization)

- Staff `Generate Mock Draft` milestone is finalized in docs:
  - `docs/mock-ai-parent-report-draft-ui-final-checkpoint.md`
- Mobile QA reminders for this flow remain:
  - selected-report detail context is clear before generation,
  - source-note inputs stack/read cleanly at ~390px/~768px,
  - `Generate Mock Draft` button remains visible and tap-friendly,
  - no misleading auto-release message/copy in mobile states.
- ParentView mobile boundary remains unchanged:
  - released/current-version-only, no draft surfaces.

## Checkpoint update (AI parent report staff UI shell)

- New staff page added: `AI Parent Reports` at `/ai-parent-reports`.
- Mobile QA additions for this page at ~390px and ~768px:
  - report list card wrapping (type/status/period/current-version labels),
  - draft form field stack and date input readability,
  - version editor textarea density and action-button spacing,
  - lifecycle actions row wrapping (`Submit`, `Approve`, `Release`, `Archive`),
  - detail sections (`Current Version`, `Version History`, `Evidence Links`) readable without clipping.
- Boundary checks to preserve during mobile QA:
  - page is staff-only (teacher/supervisor/HQ),
  - no ParentView staff controls,
  - no real AI/provider controls,
  - no PDF/export controls.
- Follow-up mobile QA target (after planning/implementation):
  - ParentView released-report display card/list readability for released-current-version-only scope.
- Status update:
  - ParentView `Progress Reports` released/current-version-only section is now wired; include manual QA at ~390px/~768px for card stacking, section expansion readability, and no admin-control bleed.
  - docs-only final checkpoint reference:
    - `docs/parent-view-ai-report-display-final-checkpoint.md`
  - preserve parent-safe visibility boundary in QA:
    - no drafts/unreleased rows,
    - no evidence links/raw metadata,
    - no PDF/export/staff controls in ParentView.
  - `Generate Mock Draft` staff action is now wired in `AI Parent Reports`; include mobile QA for:
    - source-note field stacking/readability,
    - generate button visibility and wrap behavior,
    - no accidental lifecycle auto-transition messaging,
    - clear no-auto-release copy.

## Checkpoint update (final communication-module QA baseline)

- Communication module scope is now broad enough to require a dedicated final phone-first pass across:
  - staff `Announcements` internal request/reminder flow,
  - attachments panel,
  - completion overview,
  - Company News create + runtime popup surfaces,
  - Parent Notices creation + parent-facing media controls,
  - ParentView read-only `Announcements & Events`.
- Final manual QA emphasis at ~390px:
  - thumb-friendly action spacing for `View / Preview`, `Release to Parents`, and `Delete media`,
  - no cramped admin control density in ParentView,
  - safe card wrapping for badges, counts, and state chips,
  - no overlap between runtime popup and core staff controls.
- Preserve final boundaries during mobile QA:
  - ParentView remains read-only (no staff controls),
  - no `storage_path` exposure,
  - signed URL preview only,
  - no notification/email/live chat side effects,
  - no SQL/RLS changes in this documentation milestone.
- Canonical final QA checkpoint:
  - `docs/announcements-parent-communication-final-qa-checkpoint.md`

## Checkpoint update (Parent Notices media controls in staff detail)

- `Announcements` Parent Notices detail now includes staff-side parent-facing media controls (upload/list/preview/release/delete confirmation).
- Add mobile QA checks for this section at ~390px and ~768px:
  - media role selector and file input stack cleanly,
  - allowed-type/size helper text remains readable,
  - unreleased/released badge readability,
  - action row wrapping for `View / Preview`, `Release to Parents`, and `Delete media`,
  - teacher view-only copy clarity.
- Boundaries to preserve during QA:
  - no ParentView staff controls,
  - no `storage_path` display,
  - signed URL preview only,
  - no notifications/emails/live chat side effects,
  - no SQL/RLS changes.

## Checkpoint update (Parent Notices creation shell)

- `Announcements` now includes a distinct staff-side `Parent Notices` mode for text-only parent-facing creation.
- Add mobile QA checks for this new shell at ~390px and ~768px:
  - create form field stacking and readability,
  - preview panel readability and badge wrapping,
  - save draft / create & publish / cancel button wrapping,
  - archive button visibility for HQ/supervisor only,
  - teacher view-only copy clarity.
- Parent notices boundaries in this milestone:
  - no parent media upload/release UI,
  - no notifications/emails/live chat,
  - no ParentView admin controls.
- Validation state for parent notices milestone is now documented in:
  - `docs/parent-facing-creation-ui-checkpoint.md`

## Checkpoint update (ParentView announcements/events UI checkpoint documented)

- ParentView `Announcements & Events` UI shell milestone is now documented as complete.
- Key status:
  - read-only parent viewing surface is implemented,
  - no creation/publish/archive/delete/upload controls,
  - no SQL/RLS changes,
  - no notifications/emails,
  - no live chat.
- Behavior confirmation:
  - mobile-first featured/list/detail cards with type badges and event metadata,
  - demo mode uses local fake announcement/event data only,
  - authenticated mode uses existing parent-facing read/media/read-receipt services.
- Security/safety confirmation:
  - RLS-bound parent visibility only,
  - released-media signed URL path only,
  - no internal `internal_staff` announcement exposure,
  - no internal `announcement_attachments` exposure,
  - no `storage_path` display,
  - no service-role frontend usage.
- Validation snapshot retained:
  - `build/lint/typecheck` PASS,
  - parent-facing announcement/media smokes PASS,
  - phase1 regression PASS,
  - expected fixture CHECK notes remain non-blocking.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`
- Recommended next milestone now:
  - **A. Parent-facing creation UI planning** (planning only).


## Checkpoint update (ParentView announcements/events shell with demo parity)

- ParentView now includes a read-only `Announcements & Events` shell near parent communication surfaces.
- Scope is parent viewing only:
  - no parent-facing creation UI,
  - no staff creation/manage controls,
  - no upload controls in this shell milestone.
- Demo parity behavior:
  - uses local fake parent-facing announcements/events only,
  - no Supabase calls for demo announcements list/detail,
  - includes varied fake announcement/event types.
- Authenticated non-demo parent behavior:
  - list via `listParentAnnouncements({ status: 'published', includeArchived: false })`,
  - detail via `getParentAnnouncementDetail(...)`,
  - released media list via `listParentAnnouncementMedia(...)`,
  - released media open via `getParentAnnouncementMediaSignedUrl({ expiresIn: 300 })`,
  - non-blocking read-receipt call via `markParentAnnouncementRead(...)` on detail open.
- Media/read safety:
  - released-only media visibility remains RLS-gated,
  - signed URL only, no public URL model,
  - no `storage_path` display,
  - no internal `announcements-attachments` exposure/reuse.
- No SQL/RLS changes in this checkpoint.
- No notification/email/live chat behavior in this checkpoint.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`


## Checkpoint update (parent-facing announcements/media milestone alignment)

- Parent-facing announcement and media service boundaries are now smoke-proven.
- Parent-facing media smoke confirms release-gated visibility and signed URL-only access.
- No ParentView announcements/events UI shell exists yet.
- Mobile-first roadmap alignment now recommends:
  - ParentView announcements/events UI shell with demo parity first,
  - then parent-facing creation UI after display safety is validated.
- No SQL/RLS changes are required for this next UI-shell milestone.


This checkpoint defines a practical mobile-first QA pass before starting another major backend vertical.

Scope note:

- Planning/documentation checkpoint; lists mobile-sensitive areas and QA order.
- **`StaffTimeClock`** mock UI is implemented (local demo only); include it in manual QA passes below.

## Checkpoint update (Announcements HQ Company News create UI)

- Authenticated HQ create/publish UI for Company News is now wired in `Announcements`.
- Mobile QA should include authenticated HQ create form checks:
  - Save Draft button loading/disabled state,
  - Create & Publish button loading/disabled state,
  - branch/role/profile target input clarity and wrapping on ~390px.
- Include publish target validation behavior check (safe message when target is missing).
- Include post-success behavior check:
  - list refresh,
  - Company News context active,
  - created item selected when available.
- Branch supervisor/teacher remain view-only for Company News create in authenticated mode.
- Parent/student remain blocked from staff Announcements route.
- Demo behavior remains local-only for HQ create; no Supabase create calls in demo.
- Company News remains excluded from MyTasks by default.
- No notifications/emails/live-chat behavior was added in this checkpoint.

## 1) Mobile-first principle

- Parents and teachers mainly use phones; phone usability is the primary acceptance bar.
- HQ and branch supervisor users may use desktop/laptop for reporting and operations.
- Future UI must work well on both mobile and desktop.
- Avoid wide-only table layouts that force horizontal scrolling as a default pattern.
- Prefer responsive cards, stacked sections, and action buttons that wrap cleanly.

## 2) Current likely mobile-sensitive areas

### `ParentView`

- Long, dense card sequence can create scrolling fatigue and action discoverability issues.
- Fee status + proof upload area uses native file input and multiple stacked actions; risk of unclear action hierarchy on small screens.
- “Learning Portal & Uploads” button block may become crowded with long labels.
- Latest Memory + Class Memories History now include real approved-memory display for non-demo parent flow; verify hero-card readability and history gallery card wrapping on ~390px and ~768px.
- ParentView Learning Focus card is now present; verify concise parent-friendly copy, stacked field readability, and empty-state clarity on ~390px.
- ParentView read-only Homework status list is now present; verify badge readability and card wrapping for multiple tasks on ~390px.
- ParentView Homework upload form is now present for upload-allowed statuses; verify stacked input + note + submit CTA at ~390px.
- ParentView released homework feedback display is now present; verify feedback summary readability, released date placement, and optional expand/collapse comfort on ~390px.
- ParentView `Teacher-marked work` shell is now present under released feedback; verify compact file card readability, metadata wrapping, and single `View marked work` action comfort on ~390px.

### `ParentUpdates`

- Multi-step draft/review flow includes many textareas and action buttons; high vertical density on phones.
- Teacher flow has many controls in one panel; risk of accidental taps and state confusion.
- “All updates” card rows include status badge + action button + metadata; can feel cramped on narrow widths.
- Teacher Add Memory upload card is now present; include image file-input usability and submit CTA tap-size checks at ~390px.
- HQ/Branch Supervisor Class Memories review card is now present; verify memory-card action wrapping (View Memory, Approve & Release, Reject) on narrow screens.

### `FeeTracking`

- Staff cards contain many fields plus 3-4 actions; likely high density on mobile.
- Action cluster (`View Uploaded Proof`, `Verify`, `Reject`, `Mark as Paid`) can crowd the lower card area.
- Rejection currently relies on `window.prompt`, which is functional but weak for mobile UX and validation clarity.

### `Attendance`

- Per-student status buttons (4 options) can become tight with icons + labels on small width.
- Date/class filters are compact but need touch-size verification.
- Save CTA sits at card-list end; easy to miss after long edits on phones.

### `MyTasks`

- Task cards are mostly mobile-friendly, but status/priority chips + action button can still compress at narrow widths.
- Filter chip row should be checked for wrap behavior and tap comfort.
- `Announcement Requests` cards are now wired in `MyTasks` using existing derived read service; full UI checkpoint (badges, demo vs auth, navigation, validation) is in `docs/announcements-mytasks-ui-checkpoint.md`.
- Verify on ~390px and ~768px:
  - source/priority/status/due badges wrap cleanly,
  - response/upload provided-missing badges remain readable,
  - reply/attachment count badges do not clip,
  - `Open Announcement` button remains thumb-friendly.
- Keep QA boundary:
  - Announcement Requests in MyTasks are read-only in this phase,
  - no reply/upload/write actions from MyTasks,
  - no Company News/parent-facing/live chat behavior added.

### `Announcements`

- Staff Announcements UI shell now exists at `src/pages/Announcements.jsx`.
- Verify mobile behavior for:
  - filter chips (`Requests`, `Company News`, `Done`, `Pending`) horizontal scroll/wrap usability,
  - request cards stacking and badge wrapping,
  - detail card action button wrapping (`Mark Read`, `Done`, `Undone`, `Add Reply`),
  - create-request shell fields and Save/Cancel actions in demo mode,
  - attachment list/upload/view panel readability and button wrapping,
  - HQ/supervisor read-only `Completion Overview` summary badges and per-person row card wrapping.
  - Company News shell cards (emoji/category/date/priority/popup badge) wrap cleanly.
  - Company News detail warm pop-up preview card remains readable and non-dense on ~390px.
  - Authenticated Company News create preview-disabled copy remains clear and non-confusing.
- Authenticated non-demo mode is now wired for live staff read/create/status/reply actions.
- Re-check on ~390px and ~768px:
  - card density with live rows,
  - action-button wrap for mark read/done/undone/reply,
  - create-request form wrapping including optional branch/target inputs,
  - completion overview loading/empty/error states remain clear and non-technical,
  - per-person status chips (`done/pending/undone/overdue`) stay readable.
  - Company News Create shell (HQ demo only) fields and buttons remain thumb-friendly and readable.
  - runtime warm popup card placement in app shell remains non-blocking on ~390px and does not hide core page controls.
  - popup `View` / `Dismiss` buttons remain thumb-friendly and keyboard-focusable.
- Keep safety messaging in QA notes:
  - attachments are internal staff-only,
  - completion overview is HQ/supervisor-only read visibility (teacher hidden),
  - no parent-facing media enabled,
  - runtime Company News warm popup is staff-only and app-shell scoped,
  - demo popup is local-only (no Supabase popup service calls),
  - parent/student roles do not receive internal staff Company News runtime popup,
  - no popup repeat storm in same session (session guard enabled),
  - no parent-facing announcements/events yet,
  - no live chat/notification behavior in this phase.
- Runtime Company News popup follow-up note:
  - current next planning focus is safe HQ Company News create-path planning (runtime popup display is already wired).
- Environment validation note:
  - build/lint/typecheck passed in the latest completion overview UI milestone,
  - announcement smoke scripts completed with DNS `ENOTFOUND` CHECK skips in this environment,
  - rerun announcement smoke scripts when Supabase DNS/network is stable.

### `Dashboard`

- Most stat cards already stack responsively, but top metadata bars can get dense with multiple counts.
- Teacher “Parent Comments & Weekly Reports” panel has multiple CTAs and summary blocks; needs touch/spacing validation.

### `Classes` / `Students`

- Card-based layout is mobile-leaning, but action button groups in student cards can wrap aggressively.
- Add dialogs include multiple fields/selects; need viewport-height and keyboard overlap checks on phones.
- Fee status mini-grid in student cards may feel dense with long values.
- Classes page now includes read-only curriculum context preview cards; verify profile/learning-focus/goals text wrapping and scanability on ~390px.
- Classes page now includes compact curriculum assign/edit controls for HQ/branch supervisor; verify stacked form controls, date inputs, and Save/Cancel touch targets on ~390px.
- Students page now includes read-only school/learning context preview; verify school/grade/profile/goals plus parent-goals/teacher-notes readability and wrapping on ~390px.
- Students page now includes school profile edit controls for HQ/branch supervisor; verify stacked inputs/textareas/select and Save/Cancel touch targets on ~390px.

### `Homework`

- Teacher/staff homework review UI is now wired with submission queue + review detail cards.
- Teacher Homework UI shell now includes `By Task` / `By Student` segmented tabs with demo parity cards.
- Authenticated non-demo `By Task` now reads real class tracker rows with compact counts cards and selected-task detail.
- Authenticated non-demo `By Student` now reads real student tracker items with status badges and safe no-submission handling.
- `Create Homework` shell is now added with stacked mobile form fields and card-style student selection.
- Verify queue and detail stack cleanly on ~390px (no dense table dependency).
- Verify segmented tab controls remain touch-friendly and clear at ~390px.
- Verify By Task cards (demo + real class tracker) wrap cleanly at ~390px.
- Verify By Student cards (demo + real student tracker) and status badges remain readable and tappable at ~390px.
- Verify `Create Homework` shell fields, selected-count, clear-selection action, and Save/Cancel buttons remain comfortable and readable at ~390px.
- Verify feedback textareas (feedback/next step/internal note) remain readable and editable on phone widths.
- Verify action buttons (`Save draft`, `Mark reviewed`, `Return for revision`, conditional `Release to parent`) wrap without clipping.
- Verify mock-only `Draft feedback with AI` action remains clear, tap-friendly, and does not crowd existing teacher actions on ~390px.
- Verify file-view action card remains tap-friendly and understandable on small screens.

### Sidebar / `AppLayout`

- Layout currently reserves fixed left margin (`ml-[260px]` / `ml-[72px]`) with sidebar always present for role pages.
- Mobile nav behavior and collapsed-state ergonomics require explicit QA to avoid content squeeze.

### `StaffTimeClock`

- **Teacher:** mobile-first mock shift + **optional real browser GPS** (explicit GPS check buttons) + **optional real camera selfie preview** (explicit Start camera / Capture selfie; `selfieCaptureService`); placeholder branch centre until Supabase branch data; **no** `clockInStaff`/`clockOutStaff`, **no** upload, **no** Supabase writes from this page.
- **Branch supervisor / HQ:** summary cards, reporting placeholder, demo lists; tables hidden on small breakpoints in favour of stacked cards — verify tap targets and readability at ~390px.

## 3) Role-based mobile priorities

- **Parent:** `ParentView`, fee status/proof upload clarity, report readability, attendance/homework summaries, and future Memories flow.
- **Teacher:** `Dashboard`, class session support routes, attendance marking, homework/feedback flow, `ParentUpdates`, and `MyTasks`. Future **Staff Time Clock** punch flows are **mobile-first** per `docs/staff-time-clock-mobile-ui-plan.md`.
- **Branch Supervisor / HQ:** `FeeTracking`, dashboard summary cards, branch reporting surfaces, and future staff time clock **reporting / review** (often desktop-friendly; staff punch remains phone-first).

## 4) Immediate QA checklist

Run manual checks at:

- mobile width around `390px`
- tablet width around `768px`
- desktop width around `1280px`

At each width, verify:

1. Sidebar and collapsed nav behavior does not block content.
2. Cards wrap/stack cleanly without clipping.
3. File upload controls remain understandable and tappable.
4. Buttons do not overflow or overlap.
5. Long text and status badges wrap without breaking layout.
6. Prompt/modal interactions are usable and understandable.
7. Touch targets are comfortable for repeated actions.

## 5) Known design risks

- Staff `FeeTracking` cards may become too dense on phones.
- Rejection currently uses `window.prompt`; acceptable short-term but not ideal mobile UX.
- Parent proof upload copy must stay clear that upload is exception-only.
- Lists should not rely on horizontal scrolling as the primary interaction.
- Dashboard summary cards and header metadata must wrap cleanly.

## 6) Recommended immediate mobile polish order

Status update:

- `ParentView` payment proof mobile polish: implemented.
- `ParentView` Latest Memory + Memories History real parent wiring: implemented (gallery/card-grid direction retained).
- `ParentView` read-only homework status/list section: implemented.
- `ParentView` homework upload form for assigned/open tasks: implemented (image/PDF, mobile-stacked controls).
- `ParentView` released homework feedback display: implemented (teacher feedback + next step + released date; waiting copy remains concise).
- `FeeTracking` staff action button wrap/stack polish: implemented.
- `AppLayout`/sidebar responsive behavior review: implemented with minimal fix to avoid content squeeze on small screens while preserving desktop sidebar behavior.
- `StaffTimeClock` mobile mock UI: implemented (see `docs/staff-time-clock-mobile-ui-plan.md` §0).
- `ParentUpdates` minimal Teacher Add Memory upload card: implemented; include in mobile QA pass.
- `ParentUpdates` minimal HQ/Branch Supervisor Class Memories review card: implemented; include in mobile QA pass.
- `Homework` staff review cards are implemented; include in mobile QA pass.
- `Homework` mock-only AI draft button is implemented; include in mobile QA pass.
- `Homework` `By Task` / `By Student` UI shell with demo parity is now implemented; include in mobile QA pass.
- `Homework` authenticated `By Task` tracker wiring is now added; include in mobile QA pass.
- `Homework` authenticated `By Student` tracker wiring is now added; include in mobile QA pass.
- `Homework` Create Homework shell now includes authenticated non-demo guarded save wiring to existing assignment write service; include in mobile QA pass.
- `Homework` review detail now includes `Marked work` UI shell with demo parity; include in mobile QA pass:
  - demo mode: local fake marked-file list/upload/release/view simulation only,
  - authenticated non-demo mode: real marked-file upload/list/view/release wiring now uses existing marked-file services with loading/empty/error handling.
- `ParentView` now includes parent `Teacher-marked work` display shell with demo parity only; include in mobile QA pass:
  - demo mode: local fake released marked-file card + local preview toast only,
  - authenticated non-demo mode: safe waiting copy shell only in this milestone (no real parent marked-file list/signed URL wiring yet).
- `ParentView` parent `Teacher-marked work` is now wired for authenticated non-demo read/open:
  - read uses `listHomeworkFiles({ fileRole: 'teacher_marked_homework', parentVisibleOnly: true })` per visible submission,
  - open uses `getHomeworkFileSignedUrl(...)` signed URL only,
  - unreleased files remain hidden, no teacher controls/internal notes exposed.
- Remaining mobile QA/polish items:
  - `ParentUpdates` mobile review flow density

1. `ParentUpdates` mobile review flow density polish.
2. Replace `window.prompt` rejection input later with inline reason field/modal.

## 7) What not to do yet

- Do not redesign the whole app.
- Do not start a new UI framework.
- Do not add animations before interaction stability.
- Do not break existing desktop staff workflow.

## 8) Recommended next implementation step

Recommendation: **D. ParentUpdates mobile review flow density polish**

Why next:

- ParentView, FeeTracking, and AppLayout/sidebar responsiveness are now covered.
- ParentUpdates still has the highest mobile interaction density (multi-step drafting, many textareas/actions).
- A focused UI-density polish can improve phone usability without changing report workflow logic.

## 9) Next implementation prompt

Copy-paste prompt:

```text
Mobile polish only for ParentUpdates review flow density.

Constraints:
- Do not change runtime logic or backend behavior.
- Do not add services or SQL.
- Keep demoRole/local fallback behavior unchanged.
- Keep existing parent update workflow logic and permissions unchanged.
- Do not modify unrelated pages.

Task:
Polish only layout density in src/pages/ParentUpdates.jsx for mobile-first readability:
1) Improve spacing/grouping for multi-step comment/report controls on ~390px width.
2) Ensure action rows wrap cleanly with no clipped labels.
3) Keep desktop behavior intact (>=1280px).
4) Preserve existing draft/approve/release behavior exactly.
5) Avoid redesign; apply minimal layout fixes only.

Validation:
- Manual check at ~390px, ~768px, ~1280px.
- Confirm no button overflow, no clipped text, and clear action order.
```

---

Checkpoint status: ready to run mobile-first QA pass before new backend vertical work.

## 10) Demo parity update (Homework + Memories)

- Demo preview parity is improved for `ParentView` and `Homework` using local-only fake data.
- Parent demo Homework now shows:
  - visible upload/submit control for a `Not submitted` task,
  - local simulated submit status behavior,
  - released-feedback example card with teacher feedback and next step.
- Teacher demo Homework now shows review workflow shape (queue/detail/attachment/feedback fields/actions) instead of placeholder-only card.
- Demo Class Memories History now uses gallery/grid style (`1` column small, `2` columns tablet/desktop) instead of stacked cards.
- `demoRole` remains local-only; no Supabase writes are executed in demo actions.

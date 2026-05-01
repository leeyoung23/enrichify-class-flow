# Mobile-first QA checkpoint

This checkpoint defines a practical mobile-first QA pass before starting another major backend vertical.

Scope note:

- Planning/documentation checkpoint; lists mobile-sensitive areas and QA order.
- **`StaffTimeClock`** mock UI is implemented (local demo only); include it in manual QA passes below.

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
  - attachment list/upload/view panel readability and button wrapping.
- Authenticated non-demo mode is now wired for live staff read/create/status/reply actions.
- Re-check on ~390px and ~768px:
  - card density with live rows,
  - action-button wrap for mark read/done/undone/reply,
  - create-request form wrapping including optional branch/target inputs,
  - loading/empty/error states remain clear and non-technical.
- Keep safety messaging in QA notes:
  - attachments are internal staff-only,
  - no parent-facing media enabled,
  - no Company News pop-up behavior yet,
  - no parent-facing announcements/events yet,
  - no live chat/notification behavior in this phase.
  - no MyTasks integration in this checkpoint.

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

# Mobile-first QA checkpoint

This checkpoint defines a practical mobile-first QA pass before starting another major backend vertical.

Scope note:

- Planning/documentation only.
- No app UI changes in this step.
- No runtime logic, service, or SQL changes in this step.

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

### `ParentUpdates`

- Multi-step draft/review flow includes many textareas and action buttons; high vertical density on phones.
- Teacher flow has many controls in one panel; risk of accidental taps and state confusion.
- “All updates” card rows include status badge + action button + metadata; can feel cramped on narrow widths.

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

### `Dashboard`

- Most stat cards already stack responsively, but top metadata bars can get dense with multiple counts.
- Teacher “Parent Comments & Weekly Reports” panel has multiple CTAs and summary blocks; needs touch/spacing validation.

### `Classes` / `Students`

- Card-based layout is mobile-leaning, but action button groups in student cards can wrap aggressively.
- Add dialogs include multiple fields/selects; need viewport-height and keyboard overlap checks on phones.
- Fee status mini-grid in student cards may feel dense with long values.

### Sidebar / `AppLayout`

- Layout currently reserves fixed left margin (`ml-[260px]` / `ml-[72px]`) with sidebar always present for role pages.
- Mobile nav behavior and collapsed-state ergonomics require explicit QA to avoid content squeeze.

## 3) Role-based mobile priorities

- **Parent:** `ParentView`, fee status/proof upload clarity, report readability, attendance/homework summaries, and future Memories flow.
- **Teacher:** `Dashboard`, class session support routes, attendance marking, homework/feedback flow, `ParentUpdates`, and `MyTasks`.
- **Branch Supervisor / HQ:** `FeeTracking`, dashboard summary cards, branch reporting surfaces, and future staff time clock reporting.

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

1. `ParentView` payment proof card mobile polish (clarity + action ordering).
2. `FeeTracking` staff action button wrap/stack polish.
3. `AppLayout`/sidebar mobile behavior polish.
4. `ParentUpdates` mobile review flow density polish.
5. Replace `window.prompt` rejection input later with inline reason field/modal.

## 7) What not to do yet

- Do not redesign the whole app.
- Do not start a new UI framework.
- Do not add animations before interaction stability.
- Do not break existing desktop staff workflow.

## 8) Recommended next implementation step

Recommendation: **A. ParentView payment proof mobile polish**

Why this first:

- Parent phone usability is the highest-frequency path and directly impacts payment-proof exception completion.
- This area combines file input, status reading, and proof actions, making it a high-value mobile clarity target.
- It is small enough for a focused polish checkpoint without destabilizing staff desktop review workflows.

## 9) Next implementation prompt

Copy-paste prompt:

```text
Mobile polish only for ParentView payment proof section.

Constraints:
- Do not change runtime logic or backend behavior.
- Do not add services or SQL.
- Keep demoRole/local fallback behavior unchanged.
- Keep existing receipt upload/view permissions and guards unchanged.
- Do not modify unrelated pages.

Task:
Polish only the payment proof area in src/pages/ParentView.jsx for mobile-first usability:
1) Improve spacing and grouping so status info, file input, and actions are clearer on ~390px width.
2) Ensure primary/secondary actions stack cleanly with no overflow.
3) Keep exception-only wording visible and concise.
4) Keep desktop behavior intact (>=1280px).
5) Preserve all existing validation and upload/view logic exactly.

Validation:
- Manual check at ~390px, ~768px, ~1280px.
- Confirm no button overflow, no clipped text, and clear action order.
```

---

Checkpoint status: ready to run mobile-first QA pass before new backend vertical work.

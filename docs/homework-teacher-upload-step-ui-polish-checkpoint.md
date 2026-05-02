# Homework teacher upload/review — UI polish checkpoint

Date: 2026-05-02  
Scope: **`src/pages/Homework.jsx`** — copy, labels, step framing, mobile-friendly button layout, and staff-reference collapsing. **No** SQL/RLS/schema changes; **no** new persistence; **no** ParentView changes; **no** email/PDF/`real_ai`; **no** provider keys.

**Planning reference:** `docs/teacher-upload-step-simplification-plan.md`

---

## Summary

- **Page intro** — Title **Homework review (staff)**; description explains staff workflow, release-gated parent visibility, separate parent UI.
- **View toggle** — Helper text for **By Task** / **By Student**; primary **Create homework task** CTA; full-width buttons on small screens where helpful.
- **Create homework task** — Three steps: **Choose who receives** → **Add details** → **Save homework task**; human-readable scope badge (**Whole class** / **Selected students** / **One student**); removed raw `assignment_scope = …` and RLS jargon from teacher copy; **Save homework task** button.
- **Trackers / submission list** — Short helper lines under tracker titles; **Submissions to review** with plain-language queue copy.
- **Submission rows** — Student **names** (demo) or shortened reference (live); **plain status** labels via `formatTeacherSubmissionStatus` (**Feedback released** etc.).
- **Review panel** — **Review this submission** + boundary copy; **Student submission files** + **Open student submission**; IDs moved under **Staff reference (optional)** `<details>`.
- **Teacher-marked work** — Renamed section/buttons; **Share marked work with family**; badges **Staff only** / **Shared with family**.
- **Feedback** — Badge uses friendly feedback status; **Share feedback with family**; helper: parents only see feedback after share; demo copy clarified.
- **Demo** — Explicit demo simulation wording; no new technical leaks.

---

## Validation

Run when touching `Homework.jsx`:

`npm run build` · `npm run lint` · `npm run typecheck`

Related Supabase smokes (environment-dependent):  
`npm run test:supabase:homework:tracker:read` · `npm run test:supabase:homework:feedback` · `npm run test:supabase:ai-parent-report:source-aggregation`

---

## Future

- Parent-facing homework timeline UI (product).
- Further shorten class picker labels when friendly names exist server-side.
- Optional second pass: **My Tasks** verb-led buttons (`docs/teacher-upload-step-simplification-plan.md` §6).

# Monthly Report UAT Sample Proof

Date: 2026-05-06  
Scope: one clean, parent-facing released monthly/progress report sample for screenshots and founder review.  
Safety posture: no OCR, no email/SMS, no PDF storage/download, no auto-release, no RLS weakening, no parent exposure of drafts/internal evidence.

---

## UAT goal

Prove the current AI Parent Reports flow can produce one credible released report that:

- traces back to staff-visible source evidence,
- follows the staff lifecycle (Create -> Draft -> Review -> Approve -> Release),
- is visible to linked parent only after release,
- shows printable browser layout preview without claiming PDF file delivery.

---

## Recommended roles and fixture

- Staff role: HQ admin or teacher with report create/release access.
- Parent role: linked parent for the same fixture student.
- Student fixture: use the same stable fixture used in `scripts/supabase-ai-parent-reports-smoke-test.mjs` where possible.

If fixture alignment is missing, record **CHECK** in the UAT evidence log instead of forcing risky data edits.

---

## Manual steps (safe, non-destructive pattern)

1. Sign in as staff and open `AiParentReports`.
2. Create a report shell for one fixture student with a clear weekly/monthly period.
3. Open **Source Evidence Preview** and capture:
   - attendance/homework/curriculum lines,
   - released homework feedback card (or warm empty state),
   - explicit placeholders (Observations/OCR not wired).
4. Generate **mock draft** from source evidence (real provider draft remains optional and quota-aware).
5. Review section quality; add minimal manual edits if needed for readability.
6. Run lifecycle: **Submit for review -> Approve -> Release selected draft to parents**.
7. Sign in as linked parent and open `ParentView`:
   - confirm report appears under **Progress Reports (Monthly Learning Reports)**,
   - confirm only released/current content is visible,
   - confirm **Open printable layout** works (browser preview only).
8. Verify hidden boundaries:
   - no draft/in-review report exposure,
   - no evidence-links/internal notes shown to parent,
   - no storage paths/URLs/internal identifiers in parent text.

---

## Screenshot checklist

- Staff: report shell created (status Draft).
- Staff: Source Evidence Preview with released-homework-feedback card.
- Staff: draft content + version history selection.
- Staff: lifecycle controls and released status.
- Parent: released report list/card.
- Parent: report detail sections.
- Parent: printable layout open (with browser-preview-only copy).

Use the naming convention in `docs/uat-evidence-log-template.md`.

---

## Expected evidence sources for this sample

- Attendance summary
- Homework completion snapshot
- Released homework feedback (release-gated rows only)
- Parent communication summary
- Curriculum/learning context
- Memories captions/metadata (where available)

Known placeholders: structured observations and worksheet OCR pipeline.

---

## Parent-visible result (expected)

- Parent can see only released report rows tied to linked child.
- Parent can view sectioned narrative and printable layout preview in browser.
- Parent cannot access draft statuses, internal evidence links, or staff-only notes.

---

## Must stay hidden

- `internal_note`
- unreleased homework feedback
- draft/in-review AI report versions
- storage paths, raw file URLs, provider/debug secrets

---

## UAT evidence log entry guidance

Record this run in `docs/uat-evidence-log-2026-05-06.md` with:

- environment/date/time,
- staff + parent roles used,
- report id/version id (masked if needed),
- screenshot file names,
- pass/check outcomes,
- any fixture limitations (for example, no released homework feedback rows in chosen period).

Do not paste secrets or full internal IDs into screenshots.

---

## Smoke-test cleanup note

`npm run test:supabase:ai-parent-reports` currently archives created report fixtures during cleanup (`archiveAiParentReport` over `createdReportIds`).  
This is good for non-destructive automated checks but means smoke-created reports are not a stable showcase sample.

---

## Recommended stable demo approach (later)

For a durable screenshot sample without dirtying production-like data:

1. Use a dedicated staging/demo tenant or clearly marked demo fixture student.
2. Create one manually curated released report and keep it under a documented demo tag/process.
3. Exclude that sample from smoke cleanup (only in a dedicated manual/demo script, not default smoke path).
4. Re-validate parent visibility boundaries after any lifecycle/evidence changes.


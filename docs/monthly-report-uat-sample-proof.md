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

## Manual-only helper script (optional)

Script: `scripts/supabase-ai-parent-report-uat-sample.mjs`  
Package command: `npm run uat:ai-parent-report:sample`

This script is intentionally **manual-only** and **not** part of normal test/build flow.

### Required safety flag

- `ALLOW_UAT_SAMPLE_WRITE=1` is mandatory, otherwise the script exits without writing.

### Optional fixture/env controls

- `UAT_SAMPLE_STUDENT_ID`
- `UAT_SAMPLE_CLASS_ID`
- `UAT_SAMPLE_BRANCH_ID`
- `ALLOW_UAT_SAMPLE_ARCHIVE_OLD=1` (optional; off by default)

If explicit `UAT_SAMPLE_*` vars are not provided, the script falls back to the same fixture style as AI report smoke.

### Safety behavior

- Uses anon+JWT sign-in (`signInWithEmailPassword`) only.
- Uses manual/mock sections only (no provider/real AI call path).
- Runs lifecycle explicitly: create -> version -> submit -> approve -> release.
- Reuse-first anti-duplicate behavior:
  - default: reuses existing active sample marker report for same fixture,
  - optional archive-old mode only when `ALLOW_UAT_SAMPLE_ARCHIVE_OLD=1`.
- Verifies parent release visibility when parent fixture credentials exist.
- Verifies parent evidence-link read stays blocked/empty.
- Does **not** archive the active sample by default.
- Prints ParentView URL for screenshot capture.

---

## Read-only finder helper (recommended first step)

Script: `scripts/supabase-ai-parent-report-uat-sample-finder.mjs`  
Package command: `npm run uat:ai-parent-report:find-sample`

This finder is **read-only** and does not create/update/release/archive/delete reports.

### Finder output

- Lists sample-marked reports (marker: `[UAT_SAMPLE]`), including:
  - report id
  - student id
  - class id
  - branch id
  - status
  - current version id
  - whether released/current
- Prints safe ParentView URL:
  - `/parent-view?student=<studentId>#parent-progress-reports`
  - Optional exact-target format for notification deep-link checks:
    `/parent-view?student=<studentId>&report=<reportId>#parent-progress-reports`
- Prints suggested screenshot filenames.

If parent fixture credentials are available, finder also performs read-only checks:

- parent can see released sample report detail,
- parent evidence-link rows remain blocked/empty.

If no sample is found, finder prints guidance to run the write-gated creator:

- `ALLOW_UAT_SAMPLE_WRITE=1 npm run uat:ai-parent-report:sample`

---

## A4 printable preview verification (ParentView)

Use the known released sample:

- Report ID: `fb7c9801-faf6-472c-a723-72bce2393260`
- Version ID: `ccc0107b-e5f2-4ae7-8229-d7b34a723f6a`
- URL: `/parent-view?student=55555555-5555-5555-5555-555555555555#parent-progress-reports`

Steps:

1. Open ParentView URL and expand the released report detail.
2. Click **Open printable layout**.
3. Confirm preview copy still states:
   - printable preview only,
   - no PDF file generated or stored,
   - official PDF download comes later.
4. In Chrome, press `Cmd+P` (or browser Print) while focused on the page.
5. In print dialog:
   - Destination: Save to PDF (preview only) or printer,
   - Paper size: **A4**,
   - Scale: **100%**,
   - Margins: Default.
6. Confirm content is readable and section cards/signature areas are not cut unexpectedly.

This browser print-preview flow is a temporary UAT workaround; product still has **no stored/downloadable official PDF file**.

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

Finder also prints suggested names:

- `uat-ai-report-staff-source-evidence-<student>-<report>.png`
- `uat-ai-report-staff-lifecycle-released-<student>-<report>.png`
- `uat-ai-report-parent-progress-list-<student>-<report>.png`
- `uat-ai-report-parent-report-detail-<student>-<report>.png`
- `uat-ai-report-parent-printable-layout-<student>-<report>.png`
- `uat-ai-report-parent-print-dialog-a4-<student>-<report>.png`

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
- Notification **View report** now supports exact released report targeting (when action target fields are present) and falls back safely if target is missing.
- Post-migration checkpoint: `get_my_in_app_notifications_with_action_targets_044` action-target fields are verified in smoke runs; exact report target is now available for release notifications.
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

By contrast, the manual-only UAT sample script is designed to keep one long-lived released sample (reuse-first), unless archive-old mode is explicitly enabled.

---

## Recommended stable demo approach (later)

For a durable screenshot sample without dirtying production-like data:

1. Use a dedicated staging/demo tenant or clearly marked demo fixture student.
2. Create one manually curated released report and keep it under a documented demo tag/process.
3. Exclude that sample from smoke cleanup (only in a dedicated manual/demo script, not default smoke path).
4. Re-validate parent visibility boundaries after any lifecycle/evidence changes.


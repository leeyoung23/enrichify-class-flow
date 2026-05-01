# ParentView AI Report Display UI Checkpoint

Date: 2026-05-02  
Scope: ParentView released-report display UI wiring only

## 1) Milestone summary

- ParentView now includes a parent-safe `Progress Reports` section.
- Display is release-bound:
  - released reports only,
  - current released version only.
- Demo parent mode uses local fake/dev released reports only.
- Authenticated mode uses existing AI parent report read services.
- No evidence links, raw AI/provider metadata, or PDF/export paths are exposed.

## 2) Placement and behavior

- Placement:
  - added in ParentView near communication/learning surfaces.
  - linked in the Learning Portal quick actions as `View Progress Reports`.
- UI behavior:
  - latest released report summary card,
  - released report list/history,
  - selected report detail with parent-safe sections,
  - loading/empty/error states with generic safe copy.

## 3) Data usage

- Demo mode:
  - local fake released report rows and local current-version section content.
  - no Supabase report calls.
- Authenticated non-demo:
  - `listAiParentReports({ status: 'released', includeArchived: false })`
  - `getAiParentReportDetail({ reportId })`
  - `getAiParentReportCurrentVersion({ reportId })`
- Parent-safe exclusions:
  - no evidence-links read,
  - no release-events read,
  - no raw version history display.

## 4) Parent-safe visible fields

Shown:

- report type,
- report period,
- released date (if present),
- status label (`Released`),
- parent-safe context (student/class/programme labels),
- current-version content sections:
  - summary,
  - attendance/punctuality,
  - lesson progression,
  - homework completion,
  - strengths,
  - areas for improvement,
  - next recommendations,
  - parent support suggestions,
  - teacher final comment.

Not shown:

- drafts or unreleased statuses,
- evidence links,
- release events,
- generation source,
- AI model/provider labels,
- raw debug/provider metadata,
- storage paths,
- PDF/export links.

## 5) Boundary confirmation

- No staff controls are added to ParentView.
- No edit/release/archive/report-management actions are exposed to parents.
- No SQL or RLS policy changes.
- No real AI provider wiring/calls.
- No service-role frontend usage.
- No notification/email/live-chat side effects.

## 6) Validation

- Pre-test diff check:
  - `git diff --name-only`
- Validation commands:
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:supabase:ai-parent-reports`
- Regression:
  - `npm run test:supabase:parent-announcements`
  - `npm run test:supabase:announcements:phase1`
  - `npm run test:supabase:parent-announcements:media` (included due ParentView shared behavior risk)

## 7) What remains next

- Parent report selector polish for richer parent-safe labels.
- Optional report history UX improvements (still released/current-version-safe).
- Mock AI draft-assist planning for staff flow (separate milestone).
- Real AI provider integration (deferred).
- PDF/export planning/implementation (deferred).

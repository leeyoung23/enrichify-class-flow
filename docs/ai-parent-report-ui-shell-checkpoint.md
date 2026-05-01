# AI Parent Report UI Shell Checkpoint

Date: 2026-05-02  
Scope: staff-side UI shell for AI parent reports using demo/manual data and existing services only

## 1) Milestone summary

- Added a new staff route and page: `src/pages/AiParentReports.jsx` at `/ai-parent-reports`.
- Added sidebar navigation for staff roles only (HQ, branch supervisor, teacher).
- Kept `ParentView` parent-facing only; no staff controls were added there.
- Used existing AI parent report read/write services for authenticated non-demo mode.
- Used local fake/dev-only report rows in demo mode (no Supabase report calls in demo).

## 2) Placement and role behavior

- Placement:
  - dedicated staff page (`/ai-parent-reports`) to keep parent and staff surfaces separated.
- Role access:
  - HQ/admin: access UI and lifecycle controls.
  - branch supervisor: access UI and lifecycle controls.
  - teacher: access UI and lifecycle controls where RLS permits.
  - parent/student: route is not in allowed navigation and remains access-restricted.
- Demo role behavior:
  - staff demo uses local fake report/version/evidence rows only.
  - no real provider calls, no Supabase report calls in demo mode.

## 3) Staff UI behavior

- Report list:
  - shows report type, student/class/branch ids, period, status badge, current version id, updated timestamp.
  - includes loading/empty/generic error states.
- Report detail:
  - shows metadata, current version sections JSON preview, version history, and staff-facing evidence list.
  - avoids raw private path output.
- Manual draft creation form:
  - fields: `studentId`, `classId`, `branchId`, `reportType`, `reportPeriodStart`, `reportPeriodEnd`, `assignedTeacherProfileId`.
- Manual/mock version creation panel:
  - generation source selector limited to `manual` and `mock_ai`.
  - fields for student summary, strengths, improvement areas, next recommendations, teacher final comment.
- Lifecycle actions:
  - submit for review, approve, release selected version, archive.
  - release requires explicit selected version id.
  - no auto-release behavior.

## 4) Safety boundaries preserved

- No Supabase SQL or RLS changes.
- No SQL apply actions.
- No real AI provider wiring or API calls.
- No provider key handling.
- No PDF/export implementation.
- No notification/email side effects.
- No service-role key use in frontend.
- Parent visibility model remains service/RLS-bound and unchanged in this milestone.

## 5) ParentView relationship

- Parent-side AI parent report display is intentionally deferred in this UI shell milestone.
- `ParentView` announcements/events/homework behaviors are unchanged.
- Parent-facing AI report rendering remains a follow-up milestone after staff UI shell validation.

## 6) Recommended next milestone

Choose:

- A. Parent-side released report display (limited current-version view only)
- B. Mock AI draft assist controls inside staff UI shell (still `mock_ai` only)
- C. Real AI provider integration
- D. PDF/export planning
- E. Notification/email planning

Recommendation: **B first**.

Why:

- staff workflow shape is now visible,
- service + RLS paths are already smoke-proven,
- next safe step is optional mock draft-assist UX wiring without real provider integration,
- parent display, real provider, and PDF/export can remain sequenced after staff workflow hardening.


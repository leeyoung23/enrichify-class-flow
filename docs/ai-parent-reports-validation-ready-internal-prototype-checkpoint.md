# AI Parent Reports Validation-Ready Internal Prototype Checkpoint

Date: 2026-05-04  
Branch: `cursor/safe-lint-typecheck-486d`  
Baseline: includes `24a349d` (Validation Mode Cleanup Phase 1)

## Milestone summary

The internal prototype is validation-ready for AI Parent Reports + ParentView at the workflow and boundary level:

- staff can run the end-to-end report lifecycle in real mode,
- parents can view only released/current report content in ParentView,
- parent/student sidebar section navigation works with preserved URL context,
- demo/debug helper UI is hidden in normal real mode and retained in demo/debug mode.

This is validation-ready for internal evaluators, not production-ready.

## Verified flow

Verified by code inspection plus current smoke coverage:

1. Staff can create report shell  
   - `createAiParentReportDraft(...)` (`src/services/supabaseWriteService.js`)
2. Staff can generate real AI draft  
   - `generateRealAiParentReportDraftViaEdge(...)` call path (`src/pages/AiParentReports.jsx`)
3. `real_ai` draft saves as staff-only version  
   - `createAiParentReportVersion(... generationSource: 'real_ai' ...)`
4. Teacher-facing version labels are present  
   - `Draft N · AI-generated` via `teacherFacingDraftTitle(...)` (`src/pages/AiParentReports.jsx`)
5. Staff submit for review / approve / release are wired  
   - `submitAiParentReportForReview(...)`, `approveAiParentReport(...)`, `releaseAiParentReport(...)`
6. Release sets `current_version_id`  
   - release update path + SQL constraint model (`src/services/supabaseWriteService.js`, `supabase/sql/030_ai_parent_reports_foundation.sql`)
7. ParentView reads released reports only  
   - `listAiParentReports({ status: 'released', includeArchived: false })` (`src/pages/ParentView.jsx`)
8. ParentView reads current version only  
   - `getAiParentReportCurrentVersion(...)` (`src/pages/ParentView.jsx`)
9. Parent cannot see drafts / old versions / evidence links  
   - ParentView does not fetch evidence links and reads released/current report surfaces only.

## Validation cleanup completed

Display rule now applied:

- show demo/debug helper UI only when URL has:
  - `?demoRole=...`, or
  - `?debug=1` (also accepts `true/yes/on`).

Real mode cleanup status:

- App layout hides `DemoRoleSwitcher` in normal real mode.
- AI Parent Reports hides Diagnostics and internal PDF HTML preview helper in normal real mode.
- ParentView real-mode copy avoids demo/fake/dev phrasing in core privacy/footer messaging.

Demo/debug mode preserved:

- demo role workflows continue to work with `?demoRole=...`,
- debug/demo helper tools remain available when demo/debug mode is explicitly enabled.

## Safety boundaries (preserved)

- no SQL/RLS weakening,
- no service role in frontend,
- no auth relaxation,
- no parent draft visibility,
- no parent old/non-current version visibility,
- no parent evidence-link exposure,
- no AI provider keys in client bundle,
- no notification/email/PDF storage side effects introduced by this milestone.

## What remains before production

- production-grade auth/session hardening and role onboarding UX,
- stronger audit/monitoring + operational observability for report lifecycle,
- complete validator pass on copy/polish across all parent/student/staff pages,
- formal QA matrix across browser/mobile profiles and failure paths,
- explicit production runbooks (incident handling, rollback, support procedures).

## Recommended next lane

Validation Mode Cleanup Phase 2:

- continue removing non-essential internal QA wording in real mode,
- consolidate helper internals into explicit debug-only panels/drawer,
- complete final validator UX pass on AI Parent Reports + ParentView.

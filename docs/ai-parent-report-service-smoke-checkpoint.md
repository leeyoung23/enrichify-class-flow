# AI Parent Report Service Smoke Checkpoint

## 0) UI shell follow-up status

- Staff UI shell is now added at `/ai-parent-reports` using existing service methods.
- Demo mode uses local fake/dev report rows only (no Supabase report calls in demo).
- Authenticated non-demo mode uses current read/write service methods with JWT + RLS.
- Parent-side report display remains deferred in this milestone.
- No SQL/RLS/provider/PDF/export changes were added as part of UI shell.
- Recommended next milestone is now parent-side released-report display planning before mock AI draft-assist UX.
- Parent-side released-report display follow-up is now wired:
  - see `docs/parent-view-ai-report-display-ui-checkpoint.md`.
- Parent-side final docs-only checkpoint:
  - `docs/parent-view-ai-report-display-final-checkpoint.md`.
- Current recommendation after parent display completion:
  - **A. Mock AI draft generator planning**.

## 1) Scope and status

- Milestone scope: service-layer read/write + focused smoke only (manual/mock source path).
- No app UI changes.
- No runtime page behavior changes.
- No Supabase SQL/RLS changes.
- No SQL apply in this checkpoint.
- No real AI provider wiring/calls.
- No PDF/export implementation.

## 2) Service methods added

Read service (`src/services/supabaseReadService.js`):
- `listAiParentReports(...)`
- `getAiParentReportDetail(...)`
- `listAiParentReportVersions(...)`
- `getAiParentReportCurrentVersion(...)`

Write service (`src/services/supabaseWriteService.js`):
- `createAiParentReportDraft(...)`
- `createAiParentReportVersion(...)`
- `addAiParentReportEvidenceLink(...)`
- `submitAiParentReportForReview(...)`
- `approveAiParentReport(...)`
- `releaseAiParentReport(...)`
- `archiveAiParentReport(...)`

## 3) Safety boundaries enforced in service layer

- Anon client + current JWT + RLS only (no service-role frontend usage).
- `generationSource` guard:
  - allowed: `manual`, `mock_ai`
  - blocked: `real_ai` (explicit service guard in this milestone)
- UUID/date/allowlist validation is enforced for key inputs.
- Evidence summary guard blocks raw path-like/private storage path patterns.
- Error messages are safe/generic (no SQL/RLS/env leakage).

## 4) Lifecycle/version behavior

- Draft creation writes `ai_parent_reports` in `draft` status only.
- Version creation computes `version_number` from latest visible report version:
  - first visible version defaults to `1`.
- Release requires explicit `versionId`.
- Release updates:
  - `status='released'`
  - `current_version_id=versionId`
  - `released_at`
  - `released_by_profile_id`
- Release/event audit insert is attempted for:
  - `generated` / `edited`
  - `submitted_for_review`
  - `approved`
  - `released`
  - `archived`
- If release-event insert is blocked by RLS, service returns a warning/check payload (no service-role fallback).

## 5) Smoke script and command

- New smoke script:
  - `scripts/supabase-ai-parent-reports-smoke-test.mjs`
- New command:
  - `npm run test:supabase:ai-parent-reports`

Coverage goals in smoke:
- staff draft/create/edit/review/release path,
- parent cannot read draft,
- parent linked child can read released/current version path,
- unrelated parent blocked (or CHECK when fixture missing),
- student blocked/empty,
- `real_ai` source blocked by service,
- release/version audit event insert PASS or CHECK with reason,
- no provider/PDF paths exercised,
- cleanup via archive on fake/dev rows only.

## 6) Current posture after this checkpoint

- AI report drafts remain staff-only.
- Parent visibility remains released-only and linked-child scoped by RLS + service flow.
- Append-first version/release event posture preserved.
- Service role is not used in frontend/service smoke path.

## 7) Remaining future work (out of scope)

- Parent report UI (not started in this milestone).
- Real provider integration/wiring.
- PDF/export snapshot/storage model implementation.
- Notification/email workflow.

## 8) Draft create CHECK diagnosis update

- Diagnostic outcome from `npm run test:supabase:ai-parent-reports`:
  - helper predicate `can_insert_ai_parent_report_row_030(...)` returns `true`,
  - raw insert without RETURNING succeeds,
  - insert with RETURNING fails with RLS violation.
- Conclusion:
  - not a service payload issue,
  - not a fixture student/class/branch mismatch in current fake fixture,
  - likely SELECT policy/RETURNING visibility mismatch on `ai_parent_reports`.
- Manual/dev-first patch drafted (not applied automatically):
  - `supabase/sql/031_fix_ai_parent_reports_insert_rls.sql`
  - introduces row-predicate select helper and recreates `ai_parent_reports_select_030` using row columns instead of self-lookup pattern.

## 9) Post-031 application + smoke pass update

- `031` has now been manually applied in Supabase DEV.
- SQL Editor result: **Success. No rows returned.**
- Post-apply smoke (`npm run test:supabase:ai-parent-reports`) now confirms:
  - HQ draft create PASS,
  - review/approve/release path PASS,
  - `current_version_id` assignment PASS,
  - parent released linked-child visibility PASS,
  - parent draft block PASS,
  - student blocked PASS.
- Remaining CHECKs are expected/safe:
  - unsafe evidence-link insert is intentionally blocked when raw private file-path style data is present (guard working),
  - unrelated parent credential fixture CHECK.
- Checkpoint reference:
  - `docs/ai-parent-report-031-application-service-pass-checkpoint.md`.

## 10) Evidence-link smoke hardening update

- Positive safe evidence-link insert path is now covered in smoke:
  - fake/dev-safe `summarySnapshot` payload inserts PASS.
- Staff evidence read-back is now checked:
  - inserted evidence row is visible to staff scope under RLS.
- Negative unsafe-path guard is preserved:
  - raw/private path-style snapshot values are blocked as expected.
- Parent evidence visibility safety is now checked directly:
  - parent direct evidence-link read remains blocked/empty.
- Milestone checkpoint reference:
  - `docs/ai-parent-report-evidence-smoke-hardening-checkpoint.md`.

## 11) Current recommended next milestone

- Next recommended milestone is now:
  - AI parent report UI shell with demo/manual data only.
- Rationale:
  - service lifecycle + evidence traceability behavior is now proven under current RLS boundaries,
  - UI shell can validate teacher workflow shape before mock AI service/UI wiring.

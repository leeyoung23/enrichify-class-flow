# AI Parent Report Service Smoke Checkpoint

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

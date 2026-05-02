# AI Parent Report Blueprint Plan

Date: 2026-05-02  
Scope: planning-only blueprint for AI-assisted parent progress reports before provider integration

## Checkpoint update (provider adapter skeleton — fake/disabled only)

- Server-side adapter module: `src/services/aiParentReportProviderAdapter.js`.
- Shared deterministic section builder: `src/services/aiParentReportMockDraftCore.js`.
- Edge scaffold: `supabase/functions/generate-ai-parent-report-draft/index.ts`.
- Smoke: `npm run test:supabase:ai-parent-report:provider-adapter`.
- No real provider wiring; `real_ai` persistence remains blocked in `createAiParentReportVersion`.
- Checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-checkpoint.md`.

## Checkpoint update (mock AI draft service + smoke path)

- Mock draft service helper is now implemented in write service:
  - `generateMockAiParentReportDraft({ reportId, input })`
- Current mock posture:
  - deterministic fake/dev generation only,
  - `generationSource='mock_ai'` via existing version path,
  - no real provider call,
  - no provider keys,
  - no Edge Function provider wiring.
- Focused smoke coverage now includes mock draft generation path:
  - `npm run test:supabase:ai-parent-report:mock-draft`
- Parent safety boundaries unchanged:
  - draft remains staff-only before explicit release,
  - no auto-release,
  - no PDF/export.
- Checkpoint reference:
  - `docs/mock-ai-parent-report-draft-service-smoke-checkpoint.md`
- Final pass checkpoint reference:
  - `docs/mock-ai-parent-report-draft-service-pass-checkpoint.md`
- Next recommended milestone update:
  - **A. Mock AI draft UI button wiring**.

## Checkpoint update (AI parent report staff UI shell added)

- Staff-side AI parent report page is now added at `/ai-parent-reports`:
  - `src/pages/AiParentReports.jsx`
- Scope is UI shell only:
  - demo/manual data in demo mode,
  - existing services in authenticated mode,
  - no real AI provider wiring,
  - no PDF/export.
- ParentView remains parent-facing only:
  - no staff report controls moved into ParentView.
- Workflow visibility now includes:
  - draft creation shell,
  - manual/mock version creation shell (`manual`/`mock_ai` only),
  - submit/approve/release/archive action controls.
- Boundaries preserved:
  - no SQL/RLS changes,
  - no auto-release,
  - no notification/email side effects.
- Recommended next milestone:
  - ParentView released-report display planning (parent-safe released/current-version-only boundary first).

## Checkpoint update (030 manually applied in Supabase DEV)

- `supabase/sql/030_ai_parent_reports_foundation.sql` is now manually applied in Supabase DEV.
- SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- Confirmed in DEV:
  - tables exist (`ai_parent_reports`, `ai_parent_report_versions`, `ai_parent_report_evidence_links`, `ai_parent_report_release_events`),
  - RLS enabled and policies present on all four tables,
  - helper functions present for manage/access/insert/version access paths,
  - `current_version_id` FK + same-report pair FK safety confirmed,
  - versions/release-events remain append-first in MVP policy shape (insert/select posture, no broad update/delete policies).
- Boundaries unchanged:
  - AI drafts staff-only,
  - parent visibility remains released-only + linked-child scoped by helper design,
  - no mock/real provider implementation,
  - no PDF/export implementation,
  - no parent-visible report UI/release flow yet.

## Checkpoint update (AI parent report SQL/RLS foundation drafted)

- Manual/dev-first SQL draft is now added:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- `030` status:
  - draft-only,
  - not auto-applied,
  - no production apply assumption.
- Drafted core entities:
  - `ai_parent_reports`
  - `ai_parent_report_versions`
  - `ai_parent_report_evidence_links`
  - `ai_parent_report_release_events`
- Drafted safety boundaries:
  - parent access is released-only + linked-child scoped,
  - AI drafts are staff-only,
  - no service-role frontend usage,
  - no auto-release behavior.
- Deferred in this milestone:
  - `ai_parent_report_pdf_exports`
  - `ai_parent_report_templates`
  - mock AI report draft service
  - real provider integration
  - report UI and PDF/export implementation.

## Checkpoint update (030 pre-apply SQL/RLS review completed)

- `supabase/sql/030_ai_parent_reports_foundation.sql` was reviewed before any manual Supabase apply.
- Focused fixes were applied in draft to reduce lifecycle/RLS risk:
  - strengthened `current_version_id` safety with same-report pair FK (`(id, current_version_id)` -> versions `(report_id, id)`),
  - tightened `assigned_teacher_profile_id` insert helper checks to same-branch teacher and class-assigned teacher when class is set,
  - made versions/release-events append-first in MVP by removing update/delete policies.
- Remaining assumptions:
  - versions are expected to be append-first (new row per meaningful edit/re-generation),
  - release audit remains insert-first (corrections should use follow-up events, not row mutation).
- No SQL was applied in this checkpoint.
- No runtime/UI/service/provider/PDF changes were introduced.

## 1) Current state

- Communication module is now a strong internal prototype with staff + parent-facing communication surfaces.
- Parent portal communication surface exists via read-only parent-safe `ParentView` announcements/events.
- Homework human workflow exists (task/submission/feedback/release patterns).
- AI homework/provider work exists only as planning + stub + smoke/regression boundary work.
- Real AI provider integration is not wired in runtime.
- PDF/export for parent reports is not implemented.
- Teacher approval remains required before any parent-visible release boundary.

## 2) Product purpose

The AI parent report feature should:

- produce parent-friendly student progress reports from trusted operational evidence,
- combine attendance/homework/learning context into one clear report structure,
- reduce repetitive teacher writing load while preserving quality,
- keep teacher professional judgement as the final authority,
- support multiple report scenarios:
  - monthly reports,
  - parent-requested reports,
  - graduation/end-of-term reports,
  - future PDF/export delivery.

## 3) Report types

Planned report types:

- monthly progress report,
- weekly brief report,
- parent-requested progress report,
- graduation/end-of-term report,
- homework feedback report,
- behaviour/participation note (when appropriate and policy-safe).

## 4) Core report sections

Core sections for blueprint v1:

- student/class/programme summary,
- report period,
- attendance and punctuality,
- lesson progression and topics covered,
- curriculum/school learning focus,
- homework completion,
- homework/assessment performance,
- strengths,
- areas for improvement,
- learning gaps,
- teacher observations,
- next-step recommendations,
- parent support suggestions,
- selected evidence/media references,
- teacher final comment,
- optional supervisor/HQ note for formal report modes.

## 5) Data-source mapping

Planned section-to-source mapping:

- `student/class/programme summary` -> student profile + class assignment + school/curriculum profile context.
- `report period` -> teacher-selected period metadata + report config dates.
- `attendance and punctuality` -> attendance records and summary counters.
- `lesson progression/topics covered` -> teacher class notes, weekly report inputs, curriculum progression markers.
- `curriculum/school learning focus` -> class curriculum assignment + student school profile + learning goals.
- `homework completion` -> homework tasks + submissions + completion statuses.
- `homework/assessment performance` -> released homework feedback + reviewed outcomes + future assessment records.
- `strengths` -> teacher observations + released feedback summaries + curriculum-aligned evidence tags.
- `areas for improvement` -> teacher observations + homework patterns + attendance/punctuality patterns.
- `learning gaps` -> teacher-confirmed gaps and evidence-backed indicators (not diagnosis claims).
- `teacher observations` -> manual teacher input field (primary source).
- `next-step recommendations` -> AI draft + teacher revision + curriculum context.
- `parent support suggestions` -> AI parent-friendly rewrite from approved evidence + teacher edit.
- `selected evidence/media references` -> approved/released parent-safe references only (no internal-only notes).
- `announcements/events context (optional)` -> relevant parent-facing announcement/event context when teacher opts in.
- `AI homework draft hints (optional)` -> only teacher-approved and policy-safe extracted summary usage.
- `manual teacher input` -> always available override and source-of-truth path.
- `future assessment records` -> reserved for future schema/service integration.

## 6) AI-generated vs teacher-written fields

### AI can draft

- summary wording from structured evidence,
- strengths and improvement wording from approved data,
- next-step recommendation drafts,
- parent-friendly language rewrite,
- consistency/clarity checks across sections.

### Teacher must supply or approve

- sensitive behaviour comments,
- final judgement,
- learning gap confirmation,
- parent-facing release decision,
- correction of AI mistakes and nuance adjustments.

### Never auto-generate or auto-release

- diagnosis-like claims,
- sensitive family/health/personal claims,
- unsupported negative labels,
- any parent-visible report without explicit teacher approval.

## 7) Approval workflow

Planned workflow:

1. Data aggregation preview (staff-only evidence snapshot).
2. AI draft generation (draft-only).
3. Teacher review/edit/approval.
4. Optional supervisor/HQ approval for formal report types.
5. Release to parent portal.
6. Optional PDF/export after release (future).
7. Audit trail records who generated/edited/approved/released and when.

## 8) Input -> process -> output integrity

For each parent-visible section:

- `staff input path` -> identify source records + manual teacher fields used.
- `AI draft path` -> generate from minimum structured evidence.
- `approval gate` -> teacher required; optional supervisor/HQ for formal modes.
- `RLS/privacy boundary` -> staff scope rules for draft access; parent not allowed before release.
- `parent release boundary` -> only released report rows become parent-visible.

Integrity rules:

- no parent-visible content without explicit human approval,
- each generated section should remain traceable to source evidence domains,
- insufficient evidence should produce explicit “insufficient data” markers instead of fabricated text.

## 9) AI prompt/data minimization

Planned minimization rules:

- send only necessary structured data to provider,
- never send raw storage paths,
- exclude private internal notes unless explicitly approved for inclusion,
- avoid unnecessary direct identifiers where possible,
- no secrets/env logging in request/response logs,
- provider calls must be server-side only (Edge/server boundary),
- no provider key in frontend.

## 10) Report tone and style

Style goals:

- warm, parent-friendly, specific, constructive,
- not robotic and not generic filler,
- no overclaiming beyond evidence,
- clear structure: what improved, what needs practice, how parents can help,
- English-first output with optional bilingual support later,
- always teacher-editable before release.

## 11) PDF/export contract (future)

Future printable/exportable contract:

- report header:
  - centre
  - class
  - student
  - report period
- section-card layout for core narrative blocks,
- attendance/homework summary table block,
- strengths + improvements block,
- next steps block,
- teacher final comment block,
- optional evidence thumbnails (parent-safe only),
- footer/disclaimer block,
- export PDF action added later,
- export availability gated by release boundary.

## 12) RLS/privacy model

Planned report visibility model:

- teacher: assigned students/classes only,
- branch supervisor: own-branch scope,
- HQ/admin: global scope where intended,
- parent: released reports for linked child only,
- no cross-family leakage,
- AI drafts are staff-only and never parent-visible,
- future PDF objects remain private with signed-URL access only.

## 13) Testing plan (future)

Future smoke/regression targets:

- generate report draft from fake/dev data only,
- teacher can view/edit draft,
- parent cannot view draft,
- release makes report visible only to linked parent,
- unrelated parent blocked,
- PDF export private/signed only if implemented,
- no provider secret logging,
- no auto-release behavior.

## 14) Risks and safeguards

Key risks:

- inaccurate AI summaries,
- unsupported claims,
- over-negative language,
- data leakage,
- missing-data distortion,
- teacher overreliance on AI drafts,
- privacy issues around evidence/media references,
- PDF sharing risk once export exists.

Safeguards:

- strict teacher approval gate,
- source-traceable section mapping,
- confidence/insufficient-data flags,
- explicit safe templates and forbidden-claim guardrails,
- audit logs for generate/edit/release actors and timestamps.

## 15) Recommended implementation sequence

Options:

- A. AI parent report data model / SQL review
- B. AI report draft service with mock provider
- C. Report UI shell with demo data
- D. Real provider integration
- E. PDF/export planning

Recommendation: **A first**.

Why A first:

- report workflow needs draft/release/audit/RLS table design before real provider use,
- AI must not generate parent-visible outputs without explicit storage + approval model,
- mock provider phase should come before real provider wiring,
- PDF/export should follow only after report data-flow and approval boundaries are stable.

## 16) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add AI parent report blueprint plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
AI parent report data model / SQL review only.

Hard constraints:
- Planning/docs only in this milestone.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Do not use real student/parent/teacher/school/curriculum/homework/payment/attendance/communication data.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat.
- Do not implement AI provider wiring yet.
- Do not implement PDF/export yet.
- Do not auto-release AI-generated content to parents.

Please deliver:
1) Proposed report entity model (draft/review/released/audit).
2) Role/RLS matrix for teacher/supervisor/HQ/parent access.
3) Release boundary and revision lifecycle rules.
4) Parent visibility and linked-child scoping safeguards.
5) Non-goals and migration notes for future provider and PDF/export phases.

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

## Checkpoint update (AI parent report service + smoke completed)

- Service-layer read/write foundation is now implemented for AI parent reports using anon+JWT+RLS only.
- Scope remains manual/mock source only:
  - `generation_source` service guard allows `manual` and `mock_ai`,
  - `real_ai` is explicitly blocked in this milestone.
- No UI/report page implementation in this checkpoint.
- No Supabase SQL/RLS changes in this checkpoint.
- No real provider wiring and no PDF/export implementation.
- Smoke checkpoint confirms expected boundary path:
  - staff draft/review/release flow is testable,
  - parent draft block remains in place,
  - released linked-child visibility path is covered,
  - append-first version/release-event posture remains intact.
- Checkpoint doc: `docs/ai-parent-report-service-smoke-checkpoint.md`.

## Checkpoint update (031 application + service smoke pass)

- `031` select-policy RETURNING fix is manually applied in Supabase DEV.
- SQL Editor result: **Success. No rows returned.**
- Post-031 AI parent report smoke confirms:
  - HQ draft create PASS,
  - review/approve/release/current-version path PASS,
  - parent draft block PASS,
  - parent released linked-child/current-version visibility PASS,
  - student blocked PASS.
- Safe CHECKs remain expected only for:
  - unsafe evidence snapshot guard case,
  - missing unrelated-parent credential fixture.
- No real AI provider wiring and no PDF/export implementation in this checkpoint.
- Detailed checkpoint:
  - `docs/ai-parent-report-031-application-service-pass-checkpoint.md`.

## Checkpoint update (evidence-link smoke hardening)

- AI parent report smoke now proves both evidence-link behaviors:
  - positive safe evidence-link insert PASS using fake/dev-safe snapshot payload,
  - unsafe raw private path-style snapshot blocked by service guard (expected).
- Staff evidence read-back is now verified under RLS where allowed.
- Parent direct evidence-link read remains blocked/empty in MVP scope.
- No UI changes, no SQL/RLS changes, no provider wiring, no PDF/export in this checkpoint.
- Detailed checkpoint:
  - `docs/ai-parent-report-evidence-smoke-hardening-checkpoint.md`.

## Checkpoint update (next milestone direction)

- Recommended next milestone:
  - AI parent report UI shell with demo/manual data only.
- Reasoning:
  - model/RLS/service/evidence-smoke boundaries are now proven,
  - UI shell is the safest next step before mock AI draft service and long before real provider wiring.

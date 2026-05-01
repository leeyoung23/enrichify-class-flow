# AI Parent Report SQL/RLS Review

Date: 2026-05-02  
Scope: planning/review only for safest SQL/RLS data model before implementation

## Checkpoint update (030 SQL/RLS foundation drafted)

- Manual/dev-first SQL draft is now added:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- `030` posture:
  - draft-only,
  - not auto-applied,
  - no production apply assumption,
  - fake/dev data posture only.
- Draft includes:
  - core report/version/evidence/release-event tables,
  - status lifecycle constraints,
  - updated_at trigger on `ai_parent_reports`,
  - SECURITY DEFINER helper functions,
  - RLS policy draft for HQ/supervisor/teacher/parent boundaries.
- Parent boundary in draft:
  - report select: released-only + linked child,
  - version select: released current-version only,
  - evidence links and release events remain staff-only in MVP draft.
- Deferred remains unchanged:
  - `ai_parent_report_pdf_exports`,
  - `ai_parent_report_templates`,
  - mock/real provider wiring,
  - report UI/PDF runtime implementation.

## 1) Current state

- AI parent report blueprint exists (`docs/ai-parent-report-blueprint-plan.md`).
- Communication/Announcements/ParentView module exists and is strong as an internal prototype with parent-safe release boundaries.
- Homework workflow exists, including draft/review/release patterns and parent-visible release boundaries.
- AI homework provider path exists as planned/stub/smoke path; real provider remains disabled/unwired in runtime.
- No AI parent report SQL/data model exists yet.
- No dedicated report draft/review/release workflow exists yet for parent reports.
- No parent report UI exists yet.
- No parent report PDF/export flow exists yet.
- No real AI provider integration exists for parent reports.

## 2) Product goal

The target model should safely support AI-assisted report generation without weakening parent privacy or release controls:

- store AI-assisted report drafts safely as staff-only artifacts,
- keep AI output staff-only until explicit human review and approval,
- support teacher editing with optional supervisor/HQ approval depending on report type/policy,
- release only approved reports to linked parents,
- preserve a full audit trail for generation, editing, approval, and release actions,
- support future PDF/export as a derived artifact from approved/released snapshots.

## 3) Data model options

### A) Single `reports` table with draft/released fields

Pros:
- simple initial implementation,
- fewer joins.

Cons:
- weak version history unless heavily expanded,
- easier to accidentally overwrite released content,
- harder to support regeneration/review cycles safely.

### B) Separate `report_drafts` and `released_reports` tables

Pros:
- clear visibility boundary between draft and released.

Cons:
- duplication and synchronization risk,
- awkward lifecycle when drafts evolve after release,
- harder long-term maintenance for multi-step approvals.

### C) Main `reports` table + `report_versions` table

Pros:
- safest lifecycle for iterative drafting and editing,
- strong audit/version history,
- supports regeneration without mutating released history,
- easier future PDF snapshot/export per approved version.

Cons:
- moderate schema complexity (manageable and justified).

### D) JSON-only in existing weekly/homework tables

Pros:
- fastest short-term path.

Cons:
- poor domain isolation,
- weak governance for release workflow,
- high risk of mixed concerns and access mistakes,
- difficult future scaling for templates/audit/export.

### Recommendation

Recommend **Option C** (`ai_parent_reports` + `ai_parent_report_versions`) as default.  
If a lower-complexity MVP is required, Option A is acceptable only with explicit audit/versioning add-ons, but C is preferred for safe edits, regeneration, release history, and future PDF/export.

## 4) Recommended core tables

Proposed core:

- `ai_parent_reports` (entity + current workflow status)
- `ai_parent_report_versions` (immutable/append-only content versions)
- `ai_parent_report_evidence_links` (traceability to source evidence)
- `ai_parent_report_release_events` (status transitions + release audit)

Optional later:

- `ai_parent_report_pdf_exports` (private storage export snapshots)
- `ai_parent_report_templates` (template/profile governance)

## 5) `ai_parent_reports` planned fields

- `id` (uuid pk)
- `student_id` (uuid, required)
- `class_id` (uuid, nullable)
- `branch_id` (uuid, required)
- `report_type` (text/enum, e.g. monthly, weekly_brief, parent_requested, graduation)
- `report_period_start` (date/timestamptz)
- `report_period_end` (date/timestamptz)
- `status` (enum-like constrained text):
  - `draft`
  - `teacher_review`
  - `supervisor_review`
  - `approved`
  - `released`
  - `archived`
- `current_version_id` (uuid nullable; references latest working/approved version)
- `created_by_profile_id` (uuid required)
- `assigned_teacher_profile_id` (uuid nullable)
- `approved_by_profile_id` (uuid nullable)
- `released_by_profile_id` (uuid nullable)
- `released_at` (timestamptz nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## 6) `ai_parent_report_versions` planned fields

- `id` (uuid pk)
- `report_id` (uuid fk -> `ai_parent_reports.id`)
- `version_number` (int, monotonic per report)
- `generation_source` (text/enum: `manual`, `mock_ai`, `real_ai`)
- `structured_sections` (jsonb, required)
- `teacher_edits` (jsonb nullable)
- `final_text` (jsonb or text nullable; jsonb recommended for section-level rendering)
- `ai_model_label` (text nullable; provider/model metadata only, no secrets)
- `ai_generated_at` (timestamptz nullable)
- `created_by_profile_id` (uuid required)
- `created_at` (timestamptz)

Versioning rule:
- do not destructively overwrite historical versions; append a new version for each meaningful generation/edit transition.

## 7) Evidence/source links model

Use `ai_parent_report_evidence_links` to keep explainability and safety:

- `id` (uuid pk)
- `report_id` (uuid fk)
- `report_version_id` (uuid fk nullable; optional linkage to specific version)
- `evidence_type` (text/enum):
  - `attendance`
  - `homework`
  - `homework_feedback`
  - `teacher_note`
  - `weekly_report`
  - `memory_media`
  - `parent_announcement`
  - `assessment`
  - `manual`
- `source_table` (text nullable)
- `source_id` (uuid/text nullable)
- `summary_snapshot` (jsonb nullable; minimal safe snapshot at generation/review time)
- `include_in_parent_report` (boolean default false)
- `created_at` (timestamptz)

## 8) Release/audit model

Use `ai_parent_report_release_events` for lifecycle traceability:

- `id` (uuid pk)
- `report_id` (uuid fk)
- `report_version_id` (uuid fk)
- `event_type` (text/enum: generated, edited, submitted_for_review, approved, released, archived, reverted_to_draft)
- `from_status` / `to_status` (text)
- `actor_profile_id` (uuid)
- `event_note` (text nullable)
- `created_at` (timestamptz)

Audit requirements:

- explicitly record who generated, edited, approved, and released,
- capture status transitions with timestamps,
- never silently overwrite released history,
- keep release events append-only (or tightly controlled updates only for correction metadata).

## 9) RLS model

Recommended role scope:

- **HQ/admin**: global manage/review/read across branches.
- **Branch supervisor**: own-branch manage/review/read only.
- **Teacher**: assigned class/student draft/review/edit/read only in scoped branch/class/student.
- **Parent**: read only `released` reports for linked child.
- **Parent blocked** from drafts, raw AI artifacts, and internal review notes.
- **Student blocked** for now (unless a future student portal explicitly introduces scoped visibility).
- **Frontend** remains anon client + JWT + RLS only (no service-role in frontend).

Recommended policy design:

- separate policy helpers per table for readability and least-privilege consistency,
- explicit status check in parent select policy (`status = 'released'`),
- explicit linked-child predicate for parent visibility,
- role/scope helpers should align with existing branch/class/student guard patterns used elsewhere.

## 10) AI/privacy boundary

- AI drafts remain staff-only by default.
- Minimize provider payload inputs to required structured evidence only.
- Do not include raw storage paths in prompt payloads or UI.
- Do not include internal notes unless explicitly selected as evidence and policy-safe.
- Do not log secrets/env values/request tokens/provider keys.
- Do not allow diagnosis-like unsupported claims in generated content.
- Teacher approval is mandatory before any parent release.

## 11) PDF/export model (future)

- Implement PDF/export only after draft/review/release model is stable.
- Store generated PDFs in private storage only.
- Use signed URLs only for controlled access.
- Parent can access only released report PDF for linked child.
- Export should snapshot the approved/released version (not mutable live draft).
- No public URLs.

## 12) Report template/section model

`structured_sections` should support at minimum:

- student summary
- attendance
- lesson progression
- homework completion
- homework/assessment performance
- strengths
- areas for improvement
- learning gaps
- next recommendations
- parent support suggestions
- teacher final comment
- optional supervisor/HQ note

### JSONB vs normalized section rows

**JSONB (`structured_sections`) recommended for v1**:

- easier to evolve section schema and copy style over time,
- aligns with AI-generated structured payload patterns,
- fewer migration cycles during prompt/template iteration.

**Normalized rows** can be considered later if:

- granular cross-report analytics by section become primary,
- strict relational constraints are required per section unit,
- template governance needs row-level joins and version references.

Practical approach: start with JSONB for content and keep high-value metadata (status, actor, timestamps, type, period) normalized.

## 13) Testing plan (future smoke coverage)

- teacher creates draft report for assigned student (PASS)
- parent cannot see draft (PASS)
- supervisor can see/manage own-branch review scope (PASS)
- HQ can see/manage global scope (PASS)
- teacher edits and saves new version (PASS)
- approved and released report visible only to linked parent (PASS)
- unrelated parent blocked (PASS)
- released report history preserved across further edits/regeneration (PASS)
- no real AI call in mock phase (PASS)
- no provider secret/env logging (PASS)

## 14) Risks and safeguards

Risks:

- AI hallucination or overclaiming,
- unsupported negative claims,
- cross-family data leakage,
- draft visibility to parent before approval,
- overwriting released history,
- PDF leakage through misconfigured storage/policies,
- teacher overreliance on AI wording,
- incomplete data causing misleading parent interpretation.

Safeguards:

- explicit approval gate before release,
- evidence traceability links per report/version,
- insufficient-data flags in sections when evidence is weak,
- append-only versioning and release events,
- strict RLS linked-child scope for parent reads,
- private storage + signed URLs for future exports.

## 15) Recommended next milestone

Choose:

- A. Draft AI parent report SQL/RLS foundation
- B. Mock AI report draft service
- C. Report UI shell with demo data
- D. Real AI provider integration
- E. PDF/export planning

Recommendation: **A first**.

Why A first:

- draft/review/release and RLS boundaries must exist before service/provider wiring,
- mock AI should come before real provider wiring,
- PDF/export should follow only after release model and audit/version flows are stable.

## 16) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
f53e8d4 Add AI parent report blueprint plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Draft AI parent report SQL/RLS foundation only.

Hard constraints:
- Implement SQL/RLS foundation only for AI parent reports.
- Do not change app UI.
- Do not change runtime logic.
- Do not add new frontend/runtime services.
- Do not apply SQL in this step (draft files only).
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole or demo/local fallback.
- Do not auto-send notifications/emails.
- Do not implement PDF/export.
- Do not auto-release AI-generated content.

Deliverables:
1) SQL draft for `ai_parent_reports` + `ai_parent_report_versions` + evidence/audit tables.
2) RLS helper functions + policy draft for HQ/supervisor/teacher/parent scopes.
3) Status lifecycle constraints (draft -> review -> approved -> released -> archived).
4) Parent visibility boundary (`released` + linked child only).
5) Migration notes/non-goals for provider integration and future PDF/export.

Validation efficiency rule:
Docs/review only if no runtime files change.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

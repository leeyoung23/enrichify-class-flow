# ParentView AI Report Display Plan

Date: 2026-05-02  
Scope: planning only for parent-side released AI parent report display

## Checkpoint update (UI wiring complete)

- ParentView released-report display is now wired.
- Parent-facing section added: `Progress Reports`.
- Display is release-bound and parent-safe:
  - released rows only,
  - current-version content only.
- Demo parent mode uses local fake/dev released rows only.
- Authenticated mode uses existing read services only.
- No evidence links/raw AI/provider metadata/PDF links are shown.
- No SQL/RLS/provider/notification side-effect changes were introduced.
- UI checkpoint reference:
  - `docs/parent-view-ai-report-display-ui-checkpoint.md`

## 1) Current state

- Staff AI Parent Reports UI exists at `/ai-parent-reports`.
- Report service + RLS + evidence traceability paths are smoke-proven.
- ParentView released-report display is not implemented yet.
- Real AI provider is not wired.
- PDF/export is not implemented.
- Notification/email side effects are not implemented.

## 2) Product purpose

Parents need a clear, trusted place in ParentView to read released progress reports for their linked child.

The released report display should:

- summarise learning progress clearly,
- present attendance/punctuality and homework context in parent-friendly language,
- highlight strengths, areas for improvement, and next steps,
- reinforce trust by showing only approved/released content.

This surface is the final parent output boundary after staff review/approval/release.

## 3) Parent visibility boundary

Planned parent boundary:

- parent sees only released reports for linked child,
- parent sees only current released version,
- parent cannot see drafts,
- parent cannot see `teacher_review`, `supervisor_review`, or approved-but-unreleased records,
- parent cannot directly read evidence links,
- parent cannot see raw AI draft notes or provider metadata,
- parent cannot see internal audit/release-event rows,
- unrelated parent remains blocked,
- student remains blocked in MVP (unless future student portal scope expands).

## 4) ParentView placement options

### A) Add `Progress Reports` section near Announcements & Events / Memories
- Pros: high discoverability in current parent information flow; mobile-friendly card placement.
- Cons: ParentView becomes denser and needs careful section ordering.

### B) Add separate tab/card inside ParentView dashboard
- Pros: keeps report content scoped and less noisy; clear mental model.
- Cons: requires lightweight in-page tab pattern and extra state handling.

### C) Add report display under Homework/Progress area
- Pros: quick delivery if reusing current progress context.
- Cons: blends distinct concepts and may reduce report discoverability.

### D) Dedicated parent route later
- Pros: strongest long-term separation and scalability.
- Cons: extra routing/nav work not needed for MVP output boundary.

Recommendation: **A first (mobile-first card section)** with an optional later evolution to B or D.

## 5) Display structure

Planned parent display shape:

- latest released report summary card,
- released report list/history (released-only rows),
- expandable detail view for a selected released report.

Each report card/detail should include:

- report type badge,
- report period,
- released date,
- teacher/class/programme context (parent-safe labels),
- status label fixed to `Released`.

Planned sections in detail:

- summary,
- attendance/punctuality,
- lesson progression,
- homework completion,
- strengths,
- areas for improvement,
- next recommendations,
- parent support suggestions,
- teacher final comment.

## 6) Data/service usage

Use existing read services only:

- `listAiParentReports({ status: 'released' })`
- `getAiParentReportDetail({ reportId })`
- `getAiParentReportCurrentVersion({ reportId })`

Do not use in ParentView:

- `listAiParentReportEvidenceLinks(...)`

Do not expose:

- evidence links,
- release events,
- raw version history,
- raw AI/provider metadata.

## 7) Demo behavior

Parent demo mode plan:

- use local fake released report rows only,
- no Supabase report calls in demo,
- include realistic structured sections for parent readability checks,
- use fake/dev-only names and content,
- no PDF/export actions,
- no AI/provider calls.

## 8) Mobile-first UX plan

- card-based layout (no dense tables),
- expandable sections for long report content,
- clear date and period labels,
- concise parent-friendly copy,
- no cramped admin/staff fields,
- no staff controls in ParentView,
- no edit/release buttons in parent surface.

## 9) Safety/privacy boundaries

- no staff controls in ParentView,
- no service-role frontend usage,
- no raw SQL/RLS/env leakage in UI errors,
- no evidence-link exposure,
- no raw AI/provider metadata exposure,
- no PDF/public URL path in this milestone,
- no notification/email side effects,
- no live chat behavior,
- no cross-family leakage.

## 10) Testing plan (future implementation milestone)

Planned checks:

- demo parent sees fake released report,
- authenticated linked parent sees released report,
- parent cannot see draft report,
- parent cannot see unreleased approved report,
- parent sees only current released version,
- parent cannot list evidence links,
- unrelated parent blocked,
- student blocked,
- no real AI call path exercised,
- no PDF/export path exercised.

## 11) Implementation phasing options

### A) ParentView display shell with demo + authenticated released read
- Best balance: closes output loop now; uses proven services/RLS.

### B) Demo-only shell first
- Low risk, but delays validation of authenticated parent released boundary.

### C) Authenticated-only released read first
- Security-focused, but weaker UX iteration speed.

### D) Wait until mock AI generator
- Not recommended; parent output boundary remains missing too long.

Recommendation: **A first**.

Rationale:

- service/RLS already prove released visibility boundary,
- ParentView display closes report output loop,
- mock AI generator can follow once parent output surface exists.

## 12) Recommended next milestone

Choose:

- A. ParentView released-report display UI wiring
- B. Mock AI draft generator planning
- C. Real AI provider integration
- D. PDF/export planning
- E. Notification/email planning

Recommendation: **A first**.

Why:

- staff release path now exists,
- parent output boundary is the primary gap,
- UI must stay released-only/current-version-only,
- no evidence links/raw AI/PDF exposure in parent surface.

## 13) Next implementation prompt (copy-paste)

```text
Latest expected commit:
b540c19 Document AI parent report UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

ParentView released-report display UI wiring only.

Do not change Supabase SQL/RLS.
Do not apply SQL.
Do not add services.
Do not call real AI APIs.
Do not add provider keys.
Do not expose env values/passwords.
Do not use service role key in frontend.
Do not remove demoRole.
Do not remove demo/local fallback.
Do not implement PDF/export.
Do not add notification/email/live-chat side effects.
Do not auto-release AI-generated content.
Use fake/dev data only.

Goal:
Add parent-side released report display in ParentView using released-only/current-version-only boundaries.

Required behavior:
1) ParentView-only display section (no staff controls).
2) Demo mode: local fake released reports only.
3) Authenticated mode: released-only read via:
   - listAiParentReports({ status: 'released' })
   - getAiParentReportDetail({ reportId })
   - getAiParentReportCurrentVersion({ reportId })
4) Do not show:
   - drafts/unreleased statuses
   - evidence links
   - release events
   - raw version history
   - raw AI/provider metadata
5) Keep parent linked-child boundary and student block behavior unchanged.

Validation efficiency rule:
If runtime files change, run relevant build/lint/typecheck + focused smokes.
If docs-only, run:
- git diff --name-only
```

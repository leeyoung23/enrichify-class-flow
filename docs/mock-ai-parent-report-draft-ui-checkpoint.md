# Mock AI Parent Report Draft UI Checkpoint

Date: 2026-05-02  
Scope: UI wiring checkpoint for staff-side `Generate Mock Draft` action only

## 1) Key checkpoint notes

- `Generate Mock Draft` UI action is added in `src/pages/AiParentReports.jsx`.
- Staff-side only (`/ai-parent-reports`).
- Uses existing mock draft helper:
  - `generateMockAiParentReportDraft({ reportId, input })`
- No real AI provider, no provider keys, no Edge Function provider wiring.
- No service-role frontend usage.
- No PDF/export.
- No notifications/emails.
- No auto-release.
- ParentView visibility rules remain released-only.

## 2) UI behavior

- Placement:
  - inside selected report workflow area, near version creation/lifecycle controls.
- Label:
  - `Generate Mock Draft`.
- Availability:
  - only when a report is selected.
- Input capture:
  - staff-side mock source note fields (safe text only).

## 3) Demo behavior

- Demo mode remains local-only.
- `Generate Mock Draft` creates local fake `mock_ai` version entries only.
- No Supabase report write in demo mode.
- Local success copy is shown.
- No auto-submit/approve/release.
- Parent demo visibility remains released-only.

## 4) Authenticated behavior

- Authenticated non-demo mode calls:
  - `generateMockAiParentReportDraft({ reportId, input })`
- On success:
  - refreshes report list/detail versions,
  - shows safe success message,
  - keeps report unreleased unless lifecycle action is explicitly run.
- On error:
  - shows generic safe error copy without raw SQL/RLS/env leakage.

## 5) Teacher approval/release boundary

- Mock generation creates a version only.
- No auto submit-for-review.
- No auto approve.
- No auto release.
- No parent notification/email side effects.
- Explicit submit/approve/release actions remain required.

## 6) Display and safety behavior

- New `mock_ai` versions appear in staff version history after generation.
- Parent-facing visibility remains unchanged until explicit release.
- No provider debug output/secret exposure.
- No PDF/export links added.
- No parent evidence-link widening.

## 7) Validation snapshot

- `git diff --name-only` ran before tests.
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:ai-parent-report:mock-draft` PASS
- `npm run test:supabase:ai-parent-reports` PASS
- `npm run test:supabase:parent-announcements` PASS
- `npm run test:supabase:announcements:phase1` PASS
- `npm run test:supabase:parent-announcements:media` PASS
- Expected non-blocking CHECK/WARNING notes remain:
  - npm `devdir` warning,
  - unrelated-parent credential CHECK,
  - optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` CHECK.

## 8) Recommended next milestone

Recommendation: **B. Real AI provider integration planning** (planning-only).

Why:

- mock service + smoke + UI trigger are now in place,
- next safe step is provider-boundary planning without implementing live provider calls,
- release boundary and parent visibility constraints must remain explicit before any provider wiring.

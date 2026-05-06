# Weekly Progress Report write checkpoint

This checkpoint captures end-to-end Weekly Progress Report lifecycle coverage for Supabase-backed Parent Updates: draft save, release, and parent visibility under RLS.

## What was implemented

- Weekly Progress Report **Save Draft** writes to `weekly_progress_reports` for authenticated non-demo users.
- Weekly Progress Report **Release to Parent** writes `status = released` to `weekly_progress_reports` for authenticated non-demo users.
- Parent Updates now supports the expected Weekly Progress Report release lifecycle under RLS:
  - teacher draft save
  - parent draft hidden
  - teacher release
  - parent released visibility
- Smoke suite `npm run test:supabase:weekly-report:write` validates full lifecycle and repeatable revert behavior.
- Existing Quick Parent Comment draft/release flow remains intact.
- `demoRole` behavior remains preserved as local/demo-only and non-writing.

## Files changed

- `src/pages/ParentUpdates.jsx`
- `src/services/dataService.js`
- `src/services/supabaseWriteService.js`
- `scripts/supabase-weekly-report-write-smoke-test.mjs`
- `package.json`
- `docs/weekly-progress-report-write-plan.md`

## End-to-end lifecycle

1. Teacher saves Weekly Progress Report draft.
2. Parent cannot see draft weekly report.
3. Teacher releases the same weekly report (`status = released`).
4. Parent can see released weekly report.

This lifecycle is validated by the current Supabase weekly write smoke test and aligns with current RLS parent/student visibility rules.

## How demoRole avoids writes

- `demoRole` remains first-priority preview mode and local/demo-only.
- In demo mode (`/parent-updates?demoRole=teacher`), Weekly Progress Report uses demo/local behavior.
- Supabase weekly write methods are gated and are not called in demo role flows.
- This prevents demo interactions from mutating backend rows.

## RLS safety

- Teacher write behavior: teacher can update assigned class/student weekly reports.
- Draft privacy: parent/student cannot read weekly report drafts.
- Released visibility: parent/student can read only parent-visible statuses (including `released`) under linked-student constraints.
- Parent/student writes: blocked by RLS.
- Service role usage: not used in frontend runtime or smoke scripts for this flow.
- Auth path: writes execute with Supabase anon client + authenticated JWT, enforced by RLS.

## Manual preview checklist

1. Log in as a teacher account.
2. Open `/parent-updates`.
3. Switch to **Weekly Progress Report**.
4. Save Draft.
5. Release to Parent.
6. Log in as a parent account.
7. Open `/parent-view`.
8. Confirm released weekly report is visible.

## What remains

- AI generation through secure Edge Function.
- Memories attachment.
- Storage/uploads implementation.
- Production polish (UX hardening, richer validation, broader operational checks).

## Recommended next milestone

Recommended: **AI Edge Function planning**.

Why this next:

- Weekly report and parent comment write/release lifecycles are now stable enough to define secure AI contracts against real approval-gated workflows.
- It preserves current no-direct-frontend-AI rule and keeps keys/server-side boundaries explicit before any model integration.
- It reduces risk versus starting storage/upload first, which introduces additional object storage and moderation complexity.

Storage/upload vertical remains a strong follow-up milestone after secure AI endpoint planning is finalized.

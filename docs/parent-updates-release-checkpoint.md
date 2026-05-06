# Parent Updates release checkpoint

This checkpoint captures end-to-end Quick Parent Comment lifecycle coverage for Supabase-backed Parent Updates: draft save, release, and parent visibility under RLS.

## What was implemented

- Quick Parent Comment **Save Draft** writes to `parent_comments` for authenticated non-demo users.
- Quick Parent Comment **Approve & Release to Parent** now writes `status = released` to `parent_comments` for authenticated non-demo users.
- Parent Updates now supports the expected end-to-end release lifecycle under RLS:
  - teacher draft save
  - parent draft hidden
  - teacher release
  - parent released visibility
- Existing smoke suite `npm run test:supabase:parent-updates:write` validates full lifecycle and repeatable revert behavior.
- `demoRole` behavior remains preserved as local/demo-only and non-writing.

## Files changed

- `src/pages/ParentUpdates.jsx`
- `src/services/dataService.js`
- `src/services/supabaseWriteService.js`
- `scripts/supabase-parent-updates-write-smoke-test.mjs`
- `docs/parent-updates-write-plan.md`
- `docs/parent-updates-write-checkpoint.md`
- `docs/parent-updates-release-flow-plan.md`

## End-to-end lifecycle

1. Teacher saves Quick Parent Comment draft.
2. Parent cannot see draft update.
3. Teacher releases the same Quick Parent Comment (`status = released`).
4. Parent can see released update.

This lifecycle is validated by the current Supabase smoke test and aligns with the current RLS policy model for parent/student visibility.

## How demoRole avoids writes

- `demoRole` remains first-priority preview mode and local/demo only.
- In demo mode (`/parent-updates?demoRole=teacher`), Parent Updates uses demo/local behavior.
- Supabase write methods are not called for demo role flows.
- This prevents demo interactions from mutating backend rows.

## RLS safety

- Teacher write behavior: teacher can update assigned class/student `parent_comments`.
- Draft privacy: parent/student cannot read draft comments.
- Released visibility: parent/student can read only parent-visible statuses (including `released`) under linked-student constraints.
- Parent/student writes: blocked by RLS.
- Service role usage: not used in frontend runtime or smoke scripts for this flow.
- Auth path: writes execute with Supabase anon client + authenticated JWT, enforced by RLS.

## Manual preview checklist

1. Log in as a teacher account.
2. Open `/parent-updates`.
3. Save Draft for Quick Parent Comment.
4. Approve & Release to Parent for Quick Parent Comment.
5. Log in as a parent account.
6. Open `/parent-view`.
7. Confirm released update is visible.

## What remains

- Weekly Progress Report real save/release wiring.
- AI draft generation through secure Edge Function.
- Memories attachment linkage.
- Storage/uploads implementation.

## Recommended next milestone

Recommended: **Weekly Progress Report real save/release**.

Why this next:

- It extends the same parent communication lifecycle already proven in Quick Parent Comment.
- It keeps momentum in one domain (Parent Updates) before branching into storage complexity.
- It allows shared validation patterns (status transitions, RLS visibility checks, revertable smoke coverage) with lower architecture overhead than introducing uploads first.

Storage/upload vertical should follow after Weekly Progress Report save/release is stable.

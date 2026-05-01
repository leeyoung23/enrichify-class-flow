# Parent-facing Creation UI Checkpoint

Date: 2026-05-02  
Scope: text-only parent-facing creation UI shell/wiring inside staff `Announcements`

## 1) Key checkpoint notes

- Parent-facing text-only creation UI is now wired in `src/pages/Announcements.jsx`.
- Placement is staff-side (`Announcements`), not `ParentView`.
- New staff mode/tab is added: `Parent Notices`.
- No parent-facing media upload/release UI is added in this milestone.
- No SQL/RLS changes were made in this milestone.
- No notifications/emails/live chat behavior was added.

## 2) Placement and UI behavior

- Parent notices are visually separated from:
  - internal request flow,
  - Company News flow.
- Parent-friendly preview panel is included before submit:
  - title/subtitle/body,
  - type badge,
  - event start/end/location,
  - audience summary.
- Preview is internal-only and does not embed/navigate to ParentView.

## 3) Role behavior

Authenticated non-demo:

- HQ/admin: create/publish/archive allowed (RLS-bound).
- Branch supervisor: create/publish/archive allowed where RLS permits own-branch scope.
- Teacher: view-only for parent notices in MVP.
- Parent/student: remain blocked from staff `Announcements` route.

Demo:

- HQ/supervisor: local fake parent notice draft/publish simulation only.
- Teacher: view-only.
- No Supabase calls for demo parent notice create/archive.

## 4) Draft/publish/archive flow

- `Save Draft`: creates parent-facing draft via existing service path.
- `Create & Publish`: creates draft first, then publishes second.
- Publish guard: requires at least one parent target (branch/class).
- `Archive`: available for HQ/supervisor when viewing parent notice rows.
- Safe generic errors are shown (no SQL/RLS/env leakage).

## 5) Target handling in this milestone

- Supported now:
  - branch target,
  - class target.
- Deferred in this milestone:
  - selected-student target (until safe selector data path is added),
  - parent/guardian direct target,
  - staff/internal role/profile targets for parent notices.

## 6) Boundaries preserved

- no ParentView admin controls,
- no parent media upload UI,
- no media release UI,
- no internal attachment reuse in parent notice creation form,
- no service-role frontend usage,
- no notification/email side effects,
- no live chat behavior.

## 7) What remains future

- selected-student target UI (safe selector path),
- parent-facing media upload/release UI,
- published edit governance policy details,
- optional notification/email rollout planning.

## 8) Validation result

- `npm run build` PASS.
- `npm run lint` PASS.
- `npm run typecheck` PASS.
- `npm run test:supabase:parent-announcements` PASS (safe CHECK: unrelated parent fixture credentials missing/invalid).
- `npm run test:supabase:parent-announcements:media` PASS (safe CHECK: unrelated parent fixture credentials missing/invalid).
- `npm run test:supabase:announcements:phase1` PASS (safe CHECK: optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` missing).
- `npm run test:supabase:company-news:create` PASS.
- `npm run test:supabase:announcements:mytasks` PASS.
- npm `devdir` warning remains non-blocking in this environment.

## 9) Safety boundaries reaffirmed

- no SQL/RLS changes,
- no SQL apply,
- no parent media upload/release UI,
- no notifications/emails,
- no live chat,
- no service-role frontend usage,
- no internal `parent_facing_media` enablement,
- demo/local fallback and `demoRole` preserved,
- Company News excluded from MyTasks remains preserved.

## 10) Recommended next milestone

Recommendation: **A. Parent-facing media upload/release UI planning** first.

Why:

- text-only creation UI now exists and is checkpointed,
- parent-facing media service boundaries are already smoke-proven,
- media upload/release UI introduces higher UX/governance risk and should be planned before wiring file controls,
- notifications/emails should wait until media workflow governance is finalized,
- real AI provider integration should resume after communications module checkpoints are stable.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document parent-facing creation UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Parent-facing media upload/release UI planning only.

Hard constraints:
- Planning/docs only in this milestone.
- Do not change app UI runtime behavior.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add services.
- Do not add media upload/release runtime implementation yet.
- Do not add notifications/emails.
- Do not add live chat.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not use service role key in frontend.
- Keep demoRole and local/demo fallback.
- Use fake/dev data only.

Please deliver:
1) Safe media upload/release UI flow proposal for parent-facing notices.
2) Governance rules for unreleased vs released media visibility.
3) Role matrix for HQ/supervisor/teacher/parent/student media actions.
4) Failure/recovery UX for upload errors and publish-without-media decisions.
5) Phased rollout recommendation (planning first, wiring later).

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

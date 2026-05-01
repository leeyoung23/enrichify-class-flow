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

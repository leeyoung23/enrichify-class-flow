# Announcements Completion Overview Read Service Checkpoint

Date: 2026-05-01  
Scope: read-service + smoke-test checkpoint for manager completion overview (no UI/SQL/RLS changes in this milestone)

## 1) What was added

- New read method in `src/services/supabaseReadService.js`:
  - `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted } = {})`
- New smoke script:
  - `scripts/supabase-announcements-completion-overview-smoke-test.mjs`
  - package command: `npm run test:supabase:announcements:completion`

## 2) Service behavior

- Uses Supabase anon client + current JWT + RLS only.
- Reads and derives from existing RLS-governed tables:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
  - `announcement_attachments`
- Returns stable `{ data, error }`.
- Uses safe generic service error for unexpected read failures.
- Does not expose `storage_path`, raw SQL errors, raw RLS internals, or env values.

## 3) Role scope behavior

- HQ (`hq_admin`): can derive overview across accessible internal announcements.
- Branch supervisor (`branch_supervisor`): scoped to own-branch announcements in derived overview reads.
- Teacher/parent/student: no manager overview rows (safe empty response path).
- Backend RLS remains authoritative.

## 4) Derived summary metrics (per announcement)

- `totalTargeted`
- `readCount` / `unreadCount`
- `doneCount` / `pendingCount` / `undoneCount`
- `responseRequiredCount`
- `responseProvidedCount`
- `responseMissingCount`
- `uploadRequiredCount`
- `uploadProvidedCount`
- `uploadMissingCount`
- `overdueCount`
- `latestReplyAt`
- `latestUploadAt`

## 5) Derived per-person row model

- `profileId`
- `staffName` (safe nullable; no risky joins required)
- `role`
- `branchId`
- `branchName` (if branch row is safely visible)
- `targetSource`
- `readAt`
- `doneStatus`
- `undoneReason`
- `replyCount`
- `responseProvided`
- `attachmentCount`
- `uploadProvided`
- `isOverdue`
- `lastActivityAt`

Never returned:

- `storage_path`
- attachment object URLs
- `staff_note`

## 6) Completion semantics preserved

- `done` is explicit lifecycle status.
- Reply/upload are evidence indicators only.
- Reply/upload do not auto-mark done.
- `overdue` is derived from `due_date` + unresolved obligations.
- `undone` remains visible as blocker state.

## 7) Smoke test coverage

- Creates + publishes fake/dev targeted internal request requiring response/upload.
- Teacher runs read/reply/upload/done transitions.
- HQ loads completion overview and verifies summary/row updates.
- Supervisor loads own-branch completion overview.
- Teacher manager-overview path returns blocked-or-empty.
- Parent/student manager-overview paths blocked-or-empty.
- Confirms no notification/email side effects.
- Cleans up fake/dev announcement + attachment fixture rows.

## 8) Validation result

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:announcements:completion` PASS
- `npm run test:supabase:announcements:mytasks` PASS
- `npm run test:supabase:announcements:phase1` PASS (optional CHECK if `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` missing)
- `npm run test:supabase:announcements:attachments` PASS (expected diagnostic CHECK lines)
- npm warning `Unknown env config "devdir"` observed and treated as non-blocking

## 9) Boundaries unchanged

- No UI integration for completion overview yet.
- No Supabase SQL/RLS changes.
- No new notification/email flows.
- No Company News pop-up behavior.
- No parent-facing announcements/events.
- `parent_facing_media` remains disabled.

## 10) What remains next

- Completion overview UI shell in `Announcements` (HQ/supervisor only), read-only first.
- Optional SQL view/RPC optimization only if service derivation complexity/performance warrants it.
- Notification/email automation remains later after completion-state reliability is proven.

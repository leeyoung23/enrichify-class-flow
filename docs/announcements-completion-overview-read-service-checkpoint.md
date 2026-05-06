# Announcements Completion Overview Read Service Checkpoint

Date: 2026-05-01  
Scope: **documentation checkpoint** for manager completion overview read service + smoke (runtime was implemented in commit `6798f6b`; this doc milestone does not change code)

## UI integration update (2026-05-01)

- HQ/supervisor read-only Completion Overview UI is now wired in `src/pages/Announcements.jsx`.
- Uses existing `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted })` only.
- Demo mode remains local-only with fake completion rows for HQ/supervisor demo and no Supabase calls.
- Teacher demo and teacher authenticated paths do not show manager overview UI.
- No SQL/RLS/service additions; no notifications/emails/actions were added.
- UI checkpoint doc: `docs/announcements-completion-overview-ui-checkpoint.md`.

## Documentation-only note

- This milestone **updates documentation only**.
- Validation for this doc checkpoint: `git diff --name-only` only (no build/lint/smoke unless runtime files change).

## 1) What was implemented (runtime milestone reference)

Implemented in **`6798f6b`** (not re-implemented in this doc-only pass):

- **`listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted } = {})`** in `src/services/supabaseReadService.js`.
- **Completion overview smoke script:** `scripts/supabase-announcements-completion-overview-smoke-test.mjs`.
- **Package command:** `npm run test:supabase:announcements:completion`.
- **Completion overview UI now exists** in `Announcements` for HQ/supervisor read-only (see UI update above).
- **No Supabase SQL/RLS** changes.
- **No notification/email** side effects from this read path.

## 2) Read service behavior

- Uses **anon client + current JWT + RLS-visible** data only (no service role in frontend).
- Derives overview from:
  - `announcements`
  - `announcement_targets`
  - `announcement_statuses`
  - `announcement_replies`
  - `announcement_attachments`
- Returns stable **`{ data, error }`**.
- On unexpected read failures, returns a **safe generic** message (e.g. completion overview temporarily unavailable) — **no raw SQL/RLS/env** strings.
- **No `storage_path` exposure** in the returned payload.
- **No `staff_note` exposure** in the returned payload.
- **No attachment signed URLs** or object content in the overview payload.

### Role scope (summary)

- **HQ (`hq_admin`):** can derive overview for accessible internal published announcements (optionally filtered by `announcementId` / `branchId`).
- **Branch supervisor (`branch_supervisor`):** overview reads are constrained to **own-branch** announcements; optional `branchId` must match supervisor branch when used.
- **Teacher / parent / student:** manager overview returns **empty `data`** (no rows) — not a separate “error UI” contract; aligns with conservative “no manager surface” posture.

## 3) Summary metrics (per announcement)

Each overview row includes:

- `totalTargeted`
- `readCount` / `unreadCount`
- `doneCount` / `pendingCount` / `undoneCount`
- `responseRequiredCount` / `responseProvidedCount` / `responseMissingCount`
- `uploadRequiredCount` / `uploadProvidedCount` / `uploadMissingCount`
- `overdueCount`
- `latestReplyAt`
- `latestUploadAt`

(Plus contextual fields on the parent object such as `announcementId`, title, priority, branch, due date, and requirement flags — see implementation in `src/services/supabaseReadService.js`.)

## 4) Per-person row semantics

Per targeted staff profile, rows include:

- `profileId`
- `staffName` (nullable; safe placeholder when display name is not joined)
- `role`
- `branchId`
- `branchName` (when a `branches` row is safely readable)
- `targetSource` (e.g. how the profile entered the targeted set: profile / branch / role expansion)
- `readAt`
- `doneStatus` (`pending` | `done` | `undone`)
- `undoneReason` (when present on status row)
- `replyCount`
- `responseProvided` (evidence: at least one reply by that profile)
- `attachmentCount` (all attachment rows attributed to that profile for the announcement in the derivation)
- `uploadProvided` (evidence: at least one `response_upload` by that profile)
- `isOverdue`
- `lastActivityAt` (derived max of relevant timestamps: read, status update, latest reply, latest upload)

## 5) Completion semantics

- **`done` is explicit lifecycle status** on `announcement_statuses` (`done_status`).
- **Reply** and **upload** are **evidence indicators only**; they **do not auto-mark** `done`.
- **`responseMissing` / `uploadMissing`** remain visible separately from `done` when requirements apply.
- **`overdue`** is derived from **`due_date` + unresolved obligations** (including missing required response/upload even if `done` were incorrectly marked done in data — derivation matches service logic in `listAnnouncementCompletionOverview`).
- **`undone`** remains a **visible blocker state** (explicit undone + optional `undoneReason`).

## 6) Smoke test coverage

Script: `scripts/supabase-announcements-completion-overview-smoke-test.mjs`  
Command: `npm run test:supabase:announcements:completion`

Covers (fake/dev fixtures only):

- Creates/publishes a **fake targeted** internal request requiring **response** and **upload**.
- **Teacher** performs **read / reply / upload / done** transitions via existing write/upload services.
- **HQ** loads completion overview and validates **summary + per-person row** structure and evidence counts.
- **Supervisor** loads **own-branch** scoped overview and expects the fixture row when branch scope matches.
- **Teacher** manager-overview call: **blocked/empty** (no manager rows).
- **Parent/student** manager-overview calls: **blocked/empty**.
- Asserts **no notification/email** side effects (smoke path is read/write fixture only; no notification hooks).
- **Cleanup** removes fake **announcement + attachment** rows where RLS allows.

## 7) Tests

- `npm run build` PASS  
- `npm run lint` PASS  
- `npm run typecheck` PASS  
- `npm run test:supabase:announcements:completion` completed with DNS `ENOTFOUND` CHECK skips in this environment  
- `npm run test:supabase:announcements:mytasks` completed with DNS `ENOTFOUND` CHECK skips in this environment  
- `npm run test:supabase:announcements:phase1` completed with DNS `ENOTFOUND` CHECK skips in this environment  
- `npm run test:supabase:announcements:attachments` completed with DNS `ENOTFOUND` CHECK skips in this environment  
- npm warning **`Unknown env config "devdir"`** is **non-blocking** if observed  
- DNS CHECK lines are connectivity/environment checks, not proof of backend failure
- Recommended follow-up: rerun announcement smoke scripts when Supabase DNS/network is stable

*This documentation-only checkpoint does not re-run the suite.*

## 8) Safety boundaries

- **No completion overview manager actions** (read-only UI only).
- **No SQL/RLS** changes for this capability.
- **No service-role** frontend usage.
- **No parent/student manager overview** rows.
- **No Company News** pop-up.
- **No parent-facing** announcements/events.
- **`parent_facing_media`** not enabled.
- **No notifications/emails** and **no live chat** introduced by this work.

## 9) What remains future

- **Rerun** announcement smoke scripts when DNS/network is stable to reconfirm environment-backed PASS behavior.
- **SQL view/RPC** only if service-layer aggregation becomes too heavy or inconsistent at scale.
- **Materialized** completion/task rows later for **reminders / SLA / escalation** durability.
- **Company News** warm pop-up.
- **Parent-facing** announcements/events.
- **Reports/PDF/AI OCR** later.
- **Attendance email notification** (and broader notification product) remains separate/out of scope here.

## 10) Recommended next milestone

Choose:

- **A.** Company News warm pop-up planning  
- **B.** Notification/email planning  
- **C.** Parent-facing announcements/events planning  
- **D.** Rerun smoke validation only  
- **E.** SQL view/RPC optimization review  

**Recommendation: A (Company News warm pop-up planning).**

Why **A** first:

- Internal request/document/task/overview loop is complete at a strong prototype level.
- **Company News** is the second major Announcements mode from the product vision.
- **Notifications/emails** should wait until communication states are mature and less noisy.
- **Parent-facing** flows should follow after staff-facing Company News patterns are shaped.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements completion overview UI

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News warm pop-up planning only.

Hard constraints:
- Docs/planning only.
- Do not change app UI or runtime logic in this milestone.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not add services in this milestone.
- Do not use service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs; do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add parent-facing announcements/events in this milestone.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only in demo paths and smoke fixtures.
- Preserve current completion overview UI boundaries (`storage_path`/`staff_note` still hidden).

Deliverables:
1) Company News warm pop-up product shape (timing, dismissal, role scope, non-goals).
2) Safety boundaries and phased rollout notes.
3) Validation scope for later implementation milestone.

Validation:
- Docs-only: run `git diff --name-only` only unless runtime files change.
```

## Files changed (UI milestone reference)

- `src/pages/Announcements.jsx`
- `docs/announcements-completion-overview-ui-checkpoint.md`
- `docs/announcements-completion-overview-read-service-checkpoint.md`
- `docs/announcements-completion-overview-plan.md`
- `docs/staff-announcements-ui-real-wiring-checkpoint.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

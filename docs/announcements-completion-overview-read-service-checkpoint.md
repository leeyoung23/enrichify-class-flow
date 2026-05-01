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

## 7) Tests (recorded from runtime milestone `6798f6b`)

- `npm run build` PASS  
- `npm run lint` PASS  
- `npm run typecheck` PASS  
- `npm run test:supabase:announcements:completion` PASS  
- `npm run test:supabase:announcements:mytasks` PASS  
- `npm run test:supabase:announcements:phase1` PASS with **optional CHECK** when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing  
- `npm run test:supabase:announcements:attachments` PASS with **expected diagnostic CHECK** lines  
- npm warning **`Unknown env config "devdir"`** is **non-blocking** if observed  

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

- **Completion overview UI** integration for HQ/supervisor (read-only first; `Announcements` detail panel).
- **SQL view/RPC** only if service-layer aggregation becomes too heavy or inconsistent at scale.
- **Materialized** completion/task rows later for **reminders / SLA / escalation** durability.
- **Company News** warm pop-up.
- **Parent-facing** announcements/events.
- **Reports/PDF/AI OCR** later.
- **Attendance email notification** (and broader notification product) remains separate/out of scope here.

## 10) Recommended next milestone

Choose:

- **A.** Completion overview UI integration for HQ/supervisor  
- **B.** SQL view/RPC optimization  
- **C.** Company News warm pop-up planning  
- **D.** Notification/email planning  
- **E.** Parent-facing announcements/events planning  

**Recommendation: A (Completion overview UI integration for HQ/supervisor).**

Why **A** first:

- Read service + smoke are **proven** under RLS.
- **Manager visibility** can now be surfaced safely **without** widening write surfaces.
- **Notifications/emails** should wait until overview state is **visible and trusted** in UI.
- **Company News** and **parent-facing** flows remain later phases.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements completion overview read service

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Announcements completion overview UI integration for HQ/supervisor only.

Hard constraints:
- UI wiring only for HQ/supervisor; no teacher/parent/student manager overview surfaces.
- Consume existing listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted }) from supabaseReadService.js only.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not add new backend services beyond existing read patterns unless explicitly approved.
- Do not use service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs; do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add Company News pop-up or parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only in demo paths and smoke fixtures.
- No storage_path, staff_note, or raw SQL/RLS/env strings in UI.

Deliverables:
1) HQ/supervisor-only "Completion" section or tab inside Announcements detail (mobile-friendly).
2) Summary cards for key metrics + per-person table/stacked rows.
3) Read-only first: no reminder/email actions.
4) Safe empty/loading/error copy.
5) Update relevant docs/checkpoints after UI wiring.

Validation:
- Runtime/UI changed: run npm run build, npm run lint, npm run typecheck, and npm run test:supabase:announcements:completion (plus related announcement smokes if touched).
```

## Files changed (this documentation milestone)

- `docs/announcements-completion-overview-read-service-checkpoint.md` (this file)
- `docs/announcements-completion-overview-plan.md`
- `docs/announcements-mytasks-ui-checkpoint.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/project-master-context-handoff.md`
- `docs/rls-test-checklist.md`

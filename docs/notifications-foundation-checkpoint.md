# Notifications Foundation Checkpoint

Date: 2026-05-05

## Linked project: migration applied and verified (2026-05-05)

- **Migration file applied:** `supabase/sql/034_notifications_foundation.sql`
- **Apply method:** Supabase **SQL Editor** (manual run against the linked project)
- **Alternative apply (not used for this verification):** `supabase db query --linked --file supabase/sql/034_notifications_foundation.sql`

## Linked project: AI parent report release + notification RLS follow-up (2026-05-05)

- **`supabase/sql/035_ai_parent_report_notification_guardian_lookup.sql`:** `list_parent_profile_ids_for_student_staff_scope_035` (guardian→parent profile ids; staff-scoped).
- **`supabase/sql/036_notifications_creator_select_and_teacher_insert_scope.sql`**
  - **Creator select:** staff (`hq_admin`, `branch_supervisor`, `teacher`) may **select** `notifications` rows they created — fixes `INSERT ... RETURNING` when the recipient is a parent (same failure mode as `031_fix_ai_parent_reports_insert_rls.sql`).
  - **Teacher insert scope:** `notification_events` + `notifications` teacher branch aligned with `can_manage_ai_parent_report` (class teacher **or** `is_teacher_for_student` **or** assigned teacher on an `ai_parent_reports` row for that student+branch).
- **`supabase/sql/037_notifications_teacher_branch_fallback.sql`**
  - **Teacher branch fallback:** when `current_user_branch_id() ≠` row `branch_id`, still allow insert if the teacher **teaches the class** (`is_teacher_for_class(class_id)`) and the **student** row exists for `student_id` + `branch_id`. Aligns with homework RLS (class-scoped teacher) so homework parent notifications can be recorded after release.

## Notification templates foundation (manual apply — 038)

- **Migration:** `supabase/sql/038_notification_templates_foundation.sql`
- **`notification_templates`:** HQ-managed default wording for automated paths; **`branch_id` null** = global HQ default; **`is_active`** + `allowed_variables` constrain placeholder substitution.
- **RLS:** HQ CRUD all rows; branch supervisors select **active** globals + supervised-branch rows; teachers select **active `in_app`** globals + **own-branch** overrides (needed when teacher JWT loads template before insert); parents/students/anon denied.
- **Seed:** Six global templates for existing event types (`ai_parent_report.released`, homework feedback/file, attendance arrived, parent comment / weekly progress report releases). Channel column allows **`email`** values for future HQ copy planning only — **still no outbound email sender**.
- **App helpers:** `getActiveNotificationTemplate` / `renderNotificationTemplate` in `supabaseReadService.js` — never derive variables from arbitrary metadata blobs; placeholders only substitute when listed in **`allowed_variables`** and passed explicitly by code.
- **Wired trigger (minimal):** **`notifyLinkedParentsAfterParentCommunicationStaffRelease`** uses DB template when present (per `event_type`, optional branch preference), else falls back to legacy constants. AI report, homework, attendance remain **hardcoded constants** until a separate wiring pass.
- **Smoke:** `npm run test:supabase:notification-templates` (requires migration applied on the target project).
- **Checkpoint doc:** `docs/notification-templates-foundation-checkpoint.md`

## Billing / payment proof templates (manual apply — 039)

- **Migration:** `supabase/sql/039_billing_payment_notification_templates.sql` — adds four HQ global **message-only** templates: `fee_payment.proof_requested`, `fee_payment.proof_verified`, `fee_payment.proof_rejected`, `invoice.available_message_only` (`on conflict do nothing`).
- **Wired triggers:** After successful **`requestFeePaymentProof`** → `fee_payment.proof_requested`; after **`verifyFeeReceipt`** → `fee_payment.proof_verified`; after **`rejectFeeReceipt`** → `fee_payment.proof_rejected`. **Entity:** `fee_record`. Recipients: **`list_parent_profile_ids_for_student_staff_scope_035`**. `invoice.available_message_only` remains template-only (invoice/e-invoice flow still planning).
- **Idempotency (best-effort):** same **actor** + **`fee_record`** + **`event_type`** as other flows; another supervisor could still insert a duplicate event row.
- **Smoke:** **`npm run test:supabase:fee-receipt:verify`** asserts parent inbox count increases after supervisor verify.

## Notification templates admin UI v1 (HQ)

- **Surface:** `src/pages/Announcements.jsx` adds **Message Templates** section for HQ admin under Announcements (no new route required).
- **Read helper:** `listNotificationTemplates({ channel, eventType, includeInactive })` in `supabaseReadService.js`.
- **Write helper:** `updateNotificationTemplate({ templateId, titleTemplate, bodyTemplate, isActive })` in `supabaseWriteService.js`.
- **Editable fields:** `title_template`, `body_template`, `is_active` only.
- **Read-only fields in UI:** `template_key`, `event_type`, `channel`, allowed placeholders.
- **Safety copy in UI:** warns against private student details, payment amounts, internal notes, file links, and AI report text.
- **Boundaries unchanged:** no sending, no attachment links, no service-role frontend usage, no notification trigger changes.

### Post-apply smoke tests (linked project)

| Command | Result |
|--------|--------|
| `npm run test:supabase:notifications` | PASS |
| `npm run test:supabase:audit-events` | PASS |
| `npm run test:supabase:ai-parent-reports` | PASS |
| `npm run test:supabase:parent-updates:write` | PASS |

### RLS verification (as exercised by notification smoke + policy design)

- **Recipient self-read:** parent (or any recipient) can read and update only **own** `notifications` rows (`recipient_profile_id = auth.uid()`).
- **Unrelated users blocked:** teacher (or other authenticated user) cannot read another profile’s notification row by id.
- **Staff creator read (036):** staff can read `notifications` rows they **created** (outbox / RETURNING); does not grant parents access to other families’ rows.
- **HQ/admin read path:** smoke uses HQ to create event/notification rows and delivery-log test row; HQ policies allow broad read where defined.
- **Delivery logs restricted:** `notification_delivery_logs` — parents do not have select; insert/read limited to **HQ** in this foundation (smoke confirms parent cannot read delivery logs for the test notification).

### In-app trigger (app code, not DB trigger)

- After a successful `releaseAiParentReport` (report row updated to `released` with `current_version_id` / `released_at` / `released_by_profile_id`), `src/services/supabaseWriteService.js` calls `notifyLinkedParentsAfterAiParentReportRelease` (non-blocking on failure; dev-only safe warnings). Recipients come only from `list_parent_profile_ids_for_student_staff_scope_035` (guardian links). **Idempotency (best-effort):** same **actor** + report + `releasedVersionId` via `notification_events.metadata` — not a global unique constraint; another staff re-release can still duplicate.

- **Homework (feedback + marked file):** After `releaseHomeworkFeedbackToParent` updates `homework_feedback` to `released_to_parent` (and audit), the same RPC resolves parent recipients. After `releaseHomeworkFileToParent` in `supabaseUploadService.js` when `file_role` is `teacher_marked_homework` or `feedback_attachment`, a second path notifies with `entity_type` = `homework_file`. **Event types:** `homework_feedback.released_to_parent`, `homework_file.released_to_parent`. **Body/title** are fixed generic strings (no task text, paths, or file names). **Idempotency (best-effort):** same **actor** + `entity_id` + `entity_type` + `event_type` in `notification_events` — no new DB unique constraint in this pass.

- **Attendance arrival:** On `updateAttendanceRecord`, after a successful row update, when status **transitions into** `present` or `late` from a status that was **not** already present/late (matches Attendance UI: arrived-type statuses). **`leave`** and **`absent`** do not trigger. **`present` ↔ `late`** does not re-notify (both count as already “arrived”). **Event type:** `student_attendance.arrived`, **entity** `attendance_record`. **Metadata:** `sessionDate` (calendar day), `arrivalKind` `present|late` — no notes. **Idempotency (best-effort):** same **actor** + same **attendance row** + same **`sessionDate`** in metadata prevents duplicate inbox rows for repeated transitions that day; correcting absent→present→absent→present same day may still be suppressed — documented limitation. Another staff actor could add a second event.

- **Parent Communication (teacher comment + weekly progress report):** After a successful `releaseParentComment` or `releaseWeeklyProgressReport` (row updated to **`released`** — parent-visible), `notifyLinkedParentsAfterParentCommunicationStaffRelease` runs (non-blocking on failure; dev-only safe warnings). Recipients come only from `list_parent_profile_ids_for_student_staff_scope_035`. **Title/body** load from **`notification_templates`** when migration **038** is applied and an active row exists for the matching `event_type`, else **legacy hardcoded** generic strings (no comment text, week labels, or internal notes). **Event types:** `parent_comment.released` (**entity** `parent_comment`), `weekly_progress_report.released` (**entity** `weekly_progress_report`). **Idempotency (best-effort):** same **actor** + **entity_id** + **entity_type** + **event_type** in `notification_events` as for homework — no DB unique constraint; another staff user releasing again could still insert a second event; repeated “release” by the same actor is skipped.

- **Fee payment proof (supervisor/HQ):** After successful **`requestFeePaymentProof`**, **`verifyFeeReceipt`**, or **`rejectFeeReceipt`** (`src/services/supabaseWriteService.js`), **`notifyLinkedParentsAfterFeeProofStaffDecision`** runs (non-blocking; dev-only warnings). **Event types:** `fee_payment.proof_requested` / `fee_payment.proof_verified` / `fee_payment.proof_rejected`. **Entity:** `fee_record`. **Templates:** migration **039**; generic copy only — no amounts, paths, receipt URLs, or internal notes in title/body. **`notification_events.metadata`** includes only safe keys (`requestKind` or `proofDecision`). **Idempotency:** same actor + `fee_record` id + `event_type`.

### Parent inbox UI (read-only surface)

- **`src/pages/ParentView.jsx`** — authenticated **parent** role: **Notifications** card loads `listMyInAppNotifications` / `markNotificationRead` (recipient-scoped RLS only). UI shows **title, body, time, read/unread**; no raw metadata, ids, or internal refs. Optional **child filter**: rows with `student_id` are shown when it matches the dashboard child or when `student_id` is null (RLS still gates rows to the signed-in parent).
- **Unread badge (parent header):** compact bell + count when there are unread rows **for the selected child** (derived from the same list as the inbox — not `getMyUnreadInAppNotificationCount`, which would count all unread across linked children and could disagree with the filtered inbox).

### Safety boundaries (unchanged after apply)

- No live sending, no email/SMS/push provider, no webhooks, no Edge sender
- In-app **notification records** only; product triggers: **AI parent report released**, **homework feedback / marked file released to parent**, **attendance marked present/late (arrival)**, **parent comment / weekly progress report released to family**, **fee payment proof verified/rejected** (see above) — all **message-only** for fees in this phase
- No service-role key in frontend; anon + JWT only
- No parent cross-family visibility; RLS remains recipient-scoped for inbox rows
- No changes to Edge, PDF, OCR, or provider integrations in this verification milestone

### Next recommended milestone

- **Email/SMS/push** only after review; optional DB **unique** partial index on `(entity_id, event_type, metadata->>'releasedVersionId', created_by_profile_id)` if hard idempotency is required across staff.

---

## Scope

- `supabase/sql/034_notifications_foundation.sql`
- `src/services/supabaseWriteService.js`
- `src/services/supabaseReadService.js`
- `scripts/supabase-notifications-foundation-smoke-test.mjs`
- `package.json`
- `docs/project-master-context-handoff.md`

## SQL foundation created

New migration:

- `supabase/sql/034_notifications_foundation.sql`

Tables added:

- `public.notification_events`
  - immutable event-level records for notification intent and scope
  - core fields: `event_type`, `entity_type`, `entity_id`, `branch_id`, `class_id`, `student_id`, `created_by_profile_id`, `status`, `metadata`, `created_at`
- `public.notifications`
  - recipient-facing in-app notification rows
  - core fields: `event_id`, `recipient_profile_id`, `recipient_role`, `branch_id`, `class_id`, `student_id`, `channel`, `title`, `body`, `status`, `read_at`, `created_by_profile_id`, `created_at`
- `public.notification_delivery_logs`
  - delivery-attempt audit rows (foundation only; no live provider integration)
  - core fields: `notification_id`, `channel`, `status`, `provider_message_id`, `error_code`, `attempt_number`, `created_at`

Indexes added for:

- event timeline/scope lookup (`created_at`, `event_type`, `branch_id`, `student_id`)
- recipient notification inbox lookup (`recipient_profile_id`, `status`, `created_at`)
- delivery log lookup (`notification_id`, `created_at`)

## RLS posture (conservative phase 1)

`notification_events`:

- Insert: authenticated staff only (`hq_admin`, `branch_supervisor`, `teacher`) with `created_by_profile_id = auth.uid()`
- Scope guard:
  - HQ can create cross-scope
  - branch supervisors require in-branch `branch_id`
  - teachers require `class_id` they are assigned to
- Read:
  - HQ can read all
  - branch supervisors can read branch-scoped rows
  - creators can read own rows

`notifications`:

- Insert: authenticated staff only with `created_by_profile_id = auth.uid()`
- Channel: constrained to `in_app` only in this phase
- Scope guard:
  - HQ broad
  - branch supervisors limited to own-branch rows
  - teachers limited to assigned classes
- Read:
  - recipients read only own rows
  - HQ can read all
- Update:
  - recipients can update only own rows (enables safe read-state updates)

`notification_delivery_logs`:

- Insert: HQ only
- Read: HQ only
- No parent/student/staff broad read policy

No public (`anon`) read policies were added.

## Non-sending boundary preserved

This phase adds data foundation only:

- no email provider integration
- no SMS/push delivery integration
- no automatic triggers from release/attendance/homework/payment flows
- no UI wiring to live-notify users
- no service-role usage in frontend/browser code

## Minimal helper/services added

`src/services/supabaseWriteService.js`:

- `createNotificationEvent(...)`
- `createInAppNotification(...)`
- `markNotificationRead(...)`

`src/services/supabaseReadService.js`:

- `listMyInAppNotifications(...)`
- `getMyUnreadInAppNotificationCount(...)`

Safety notes:

- metadata for notification events uses existing audit metadata sanitization helper
- no secrets/tokens/provider payloads are added to notification metadata
- write paths remain explicit helper calls only; nothing is auto-triggered

## Focused notification smoke

Added:

- `scripts/supabase-notifications-foundation-smoke-test.mjs`
- npm alias: `npm run test:supabase:notifications`

Coverage:

- HQ can create notification event
- HQ can create in-app notification row for recipient
- recipient can read own notification
- recipient can mark own notification as read
- unrelated authenticated user cannot read another recipient row
- delivery logs are not readable by parent (HQ-only)

## Future trigger candidates (not wired yet)

- attendance arrival
- report released
- homework feedback ready
- parent announcement published
- payment proof request

## Relationship with `audit_events`

- `audit_events` remains the action accountability trail.
- notifications foundation adds recipient-facing message persistence and delivery-attempt tracking.
- future production trigger implementations should write both:
  - action audit via `audit_events`
  - notification intent/outcome via `notification_events` and `notification_delivery_logs`

## Apply command (reference)

- **Used for linked verification:** Supabase SQL Editor (see **Linked project: migration applied and verified** above).
- **CLI option:** `supabase db query --linked --file supabase/sql/034_notifications_foundation.sql` (requires working linked CLI credentials, e.g. `SUPABASE_DB_PASSWORD` when needed)

## Build/lint snapshot (implementation branch; optional)

- `npm run build` / `npm run lint` / `npm run typecheck` were run on the implementation commit; this docs checkpoint does not re-run them.

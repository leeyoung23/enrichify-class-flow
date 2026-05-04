# Notifications Foundation Checkpoint

Date: 2026-05-05

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

## Apply command

- `supabase db query --linked --file supabase/sql/034_notifications_foundation.sql`

Apply status in this workspace run:

- Not applied from this run because CLI login role init failed with missing `SUPABASE_DB_PASSWORD` in environment.
- Linked-project apply remains required before notification table smokes can pass.

## Validation run snapshot

- `npm run build` -> PASS
- `npm run lint` -> PASS
- `npm run typecheck` -> PASS
- `npm run test:supabase:notifications` -> FAIL (expected until migration is applied; missing `public.notification_events`/`public.notifications`)
- `npm run test:supabase:audit-events` -> PASS
- `npm run test:supabase:ai-parent-reports` -> PASS
- `npm run test:supabase:parent-updates:write` -> PASS

## Next recommended milestone

- Notification Phase 2: wire one low-risk in-app trigger (`report released`) behind strict release-state gate + idempotency key strategy, then validate parent self-read and cross-family block behavior before any email channel work.

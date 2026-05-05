# Notification templates foundation (Phase 1)

Date: 2026-05-05

## Scope

Conservative HQ-owned wording store for automated parent-facing messages. Copy governance only: **templates do not control when notifications are created** — existing release/attendance/homework flows still gate that.

Explicitly **not** in this milestone:

- Email/SMS/push sending
- Template editing UI for teachers or parents
- Branch-specific override authoring or UI (reserved via nullable `branch_id`)
- Relaxing notification RLS or trigger safety

## SQL

Migration file:

- **`supabase/sql/038_notification_templates_foundation.sql`** — adds `notification_templates`, RLS, seed rows, indexes.

Apply to a project via **Supabase SQL Editor** (paste full file), or CLI when linked credentials allow, e.g.:

```bash
supabase db query --linked --file supabase/sql/038_notification_templates_foundation.sql
```

On this branch the linked project used for smoke runs had **038 applied** with the command above (`supabase` CLI v2.95.x). Other environments must run the same migration before `npm run test:supabase:notification-templates` passes.

## Table design (summary)

| Column | Role |
|--------|------|
| `template_key` | Stable unique slug (e.g. `default.ai_parent_report.released.in_app`) |
| `event_type` | Matches `notification_events.event_type` for the automated path |
| `channel` | `in_app` (and `email` allowed for future copy storage only; no sender) |
| `title_template` / `body_template` | Safe copy; optional `{{placeholders}}` |
| `allowed_variables` | JSON array of permitted placeholder names; renderer ignores all others |
| `branch_id` | `NULL` = global HQ default; non-null reserved for optional future overrides |
| `is_active` | Inactive templates hidden from non-HQ selectors where policies apply |

## RLS posture

- **`hq_admin`**: select / insert / update / delete all rows (management + QA).
- **`branch_supervisor`**: select **active** rows — global (`branch_id` null) or own supervised branch (`is_branch_supervisor_for_branch(branch_id)`).
- **`teacher`**: select **active**, `channel = 'in_app'`, global or **own branch** (`branch_id = current_user_branch_id()`) — required because teachers JWT-run notification creation paths load templates via the anon API.
- **Parent / student / anon**: no policies — deny.

## Seeds

Six global active rows aligned with existing hardcoded Phase 1 event types (`ai_parent_report.released`, `homework_feedback.released_to_parent`, `homework_file.released_to_parent`, `student_attendance.arrived`, `parent_comment.released`, `weekly_progress_report.released`). Seeds use generic safe wording **only** — no pupil names, IDs, evidence, homework text, attendance notes, AI output, paths, or staff-only fields.

Attendance seed body matches the historic **present** line; **`late`** is still handled by trigger hardcoded fallback until attendance is wired to templates plus an allowed variable phase.

## App services

Defined in **`src/services/supabaseReadService.js`**:

- **`getActiveNotificationTemplate({ eventType, channel, branchId })`** — prefers matching active branch-specific row then global fallback.
- **`renderNotificationTemplate({ template, variables, fallbackTitle, fallbackBody })`** — substitutes only placeholders listed on the row’s `allowed_variables` and only from the explicit `variables` object passed by app code — never parses metadata payloads or arbitrary row fields by template text alone.

Failures (missing table, RLS denial, malformed row): callers should ignore and fall back — **wired path:** `notifyLinkedParentsAfterParentCommunicationStaffRelease` in **`supabaseWriteService.js`** (parent comment + weekly progress report releases). Other triggers remain on **hardcoded** constants until a later wired phase.

## Smoke test

```bash
npm run test:supabase:notification-templates
```

Exercises HQ read/seeds (when migration applied), branch supervisor active-global read when credentials exist, parent/student **denied** template reads, renderer unit checks (allowed vs unknown placeholders, fallback).

## Next milestones (ideas)

Optional partial unique index hardening duplicates; richer allowed variables for attendance/arrival wording; guarded HQ UI; branch override inserts with supervisor policy updates; eventual email channel copying only behind a reviewed sender milestone.

## Future: attachments & e-invoice (planning only)

Automated notifications may later reference **secure attachments** (e-invoices, released PDFs, marked homework files, HQ static assets). **Phase 1 templates remain text-only.** See **`docs/notification-template-attachments-einvoice-readiness-plan.md`** for attachment types, rules, conceptual schema splits (template defaults vs per-notification instances), payment/e-invoice flow, and prerequisites before email or PDF storage — **no implementation in that doc**.

## Billing / payment message-only seeds (039)

Migration **`supabase/sql/039_billing_payment_notification_templates.sql`** adds template rows for `fee_payment.proof_requested`, `fee_payment.proof_verified`, `fee_payment.proof_rejected`, and `invoice.available_message_only`.

Runtime wiring (message-only):

- `requestFeePaymentProof` -> `fee_payment.proof_requested`
- `verifyFeeReceipt` -> `fee_payment.proof_verified`
- `rejectFeeReceipt` -> `fee_payment.proof_rejected`

All three use `notifyLinkedParentsAfterFeeProofStaffDecision` and the same guardian-linked recipient lookup; title/body come from `notification_templates` when active, otherwise safe fallback constants.

Still deferred: `invoice.available_message_only` runtime trigger (invoice/e-invoice flow is planning only).

## HQ admin UI v1 (Announcements)

- Added **Message Templates** section in `src/pages/Announcements.jsx` for **HQ Admin only**.
- Uses anon+JWT helpers:
  - `listNotificationTemplates()` in `src/services/supabaseReadService.js`
  - `updateNotificationTemplate()` in `src/services/supabaseWriteService.js`
- Editable fields (HQ only): `title_template`, `body_template`, `is_active`.
- Read-only display: `template_key`, `event_type`, `channel`, `allowed_variables`.
- Preview panel is local-only (no send action).
- Branch supervisors/teachers do not see this editor tab in v1; parent/student never access Announcements route.
- No SQL/RLS changes for this UI milestone (existing 038 policies already allow HQ update).

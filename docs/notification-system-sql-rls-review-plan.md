# Notification system — SQL/RLS review planning

Date: 2026-05-03  
Type: **planning only** — defines a future notification **data model**, **RLS boundaries**, recipient rules, delivery logging, preferences, and safety constraints **before** any DDL or sender implementation.

**Upstream:** `docs/notification-email-automation-trigger-matrix-plan.md`  
**Related:** `docs/project-master-context-handoff.md`, `docs/rls-test-checklist.md`, `docs/mobile-first-qa-checkpoint.md`, `docs/announcements-parent-communication-final-qa-checkpoint.md`, `docs/ai-parent-report-mvp-final-qa-checkpoint.md`

**Explicit non-goals for this document:** no new SQL files, no RLS policy edits, no app UI, no services, no email/notifications sent, no provider keys.

---

## 1. Product purpose

Notification infrastructure is a **safety-critical output layer**. It will eventually support **in-app** delivery and **email** (and optionally other channels), but the persistence layer must **never**:

- Leak **drafts**, **internal-only** content, or **AI/provider** metadata to parent-visible rows.
- Encode **uncertain** attendance or **unverified** payment states as if they were final parent communications.
- Expose **unrelated-child** or **cross-family** notification rows — same bar as ParentView and existing RLS posture.

The database should make **wrong sends harder**: narrow recipient rows, explicit statuses, auditable **events**, and **no** shortcut paths that bypass release/publish rules.

---

## 2. Current state

| Topic | Status |
|-------|--------|
| **Trigger matrix** | Exists — `docs/notification-email-automation-trigger-matrix-plan.md` |
| **SQL / persistence** | **No** notification tables in scope of this planning milestone; **no** new files added by this doc |
| **In-app notification centre** | **Not implemented** (unified inbox) |
| **Email provider** | **Not integrated** |
| **Sending** | **None** — no automation jobs |
| **Future source modules** (emitters, not yet wired to notifications) | Attendance, AI parent reports, homework share/release, parent announcements/events, class memories/media release, fee proof / fee tracking, My Tasks / internal requests, Staff Time Clock exceptions |

---

## 3. Recommended data model (conceptual)

Tables are **illustrative names** — final naming in DDL review.

### 3.1 `notification_events`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Append-only **audit** of *why* something was considered for notification; correlates to domain rows without duplicating sensitive bodies. |
| **Key fields (planned)** | `id`, `event_type`, `source_type`, `source_id`, `actor_profile_id`, `branch_id`, `class_id`, `student_id` (nullable), `created_at`, `metadata_summary` (short, non-sensitive), optional `idempotency_key` |
| **Must not store** | Full message body; raw **storage paths**; **signed URLs**; **provider secrets**; **payment card/bank** details; long AI outputs |
| **Visibility** | **Staff/HQ** operational read where scoped; **parents** typically **no direct read** of raw events (derive UX from `notifications` / `notification_recipients`) |

### 3.2 `notifications`

| Aspect | Detail |
|--------|--------|
| **Purpose** | User-facing **message object** (in-app and template source for email later). |
| **Key fields (planned)** | `id`, `title`, `body_preview`, `category`, `priority`, `target_audience` (enum: parent_global_in_scope / staff_branch / staff_hq / …), `status` (`draft` / `queued` / `sent` / `cancelled` / `failed`), `send_after` (timestamptz nullable), `created_by_profile_id`, `linked_event_id` → `notification_events`, `created_at`, `updated_at` |
| **Must not store** | Full attachment payloads; **private file URLs**; unreleased report text; evidence blobs |
| **Parent visibility** | Parents see **only** notifications they receive via **recipient** rows linked to their profile — **not** staff drafts or internal queue unless product explicitly allows a “preview” (default: **no**) |

### 3.3 `notification_recipients`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Per-user delivery row: who gets what, read state, channel plan. |
| **Key fields (planned)** | `id`, `notification_id`, `recipient_profile_id`, `recipient_role`, `student_id` (nullable, for parent-child scope), `delivery_channel` (`in_app` / `email` / future), `read_at`, `dismissed_at`, `delivery_status` (`pending` / `delivered` / `failed` / `suppressed`) |
| **Must not store** | OAuth tokens; email provider API keys |
| **Parent visibility** | **Only** rows where `recipient_profile_id` is the logged-in parent **and** `student_id` matches **linked-child** policy (same as ParentView) |

### 3.4 `notification_delivery_attempts`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Per-channel **attempt** log for retries and support — **not** a full mail archive by default. |
| **Key fields (planned)** | `id`, `recipient_id` → `notification_recipients`, `channel`, `provider` (string enum), `attempted_at`, `status`, `safe_error_code`, `external_message_id` (nullable), `retry_count` |
| **Must not store** | Full email HTML body if sensitive; **provider secret**; entire webhook payload with PII |
| **Visibility** | **Staff** support roles (HQ/supervisor as policy defines); **parents** usually **no access** |

### 3.5 `notification_preferences`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Per-profile channel/category toggles, quiet hours (future). |
| **Key fields (planned)** | `profile_id`, channel flags, category flags, `quiet_hours` JSON (future), `updated_at` |
| **Must not store** | Secrets |
| **Visibility** | **Owner profile only** for read/update; **required/legal/safety** categories may ignore opt-out per policy (document in product, not in this row alone) |

### 3.6 `notification_templates` (optional later)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Versioned subject/body templates per `event_type` / locale. |
| **Key fields (planned)** | `template_key`, `locale`, `subject_template`, `body_template`, `version`, `active` |
| **Must not store** | Live PHI in templates — placeholders only |
| **Visibility** | **Staff admin** manage; **not** parent-editable |

---

## 4. Event model (`notification_events`)

Treat as **internal audit trail**:

- **`event_type`**: controlled vocabulary aligned to trigger matrix (e.g. `report_released`, `homework_feedback_released`, `attendance_present_marked`).
- **`source_type` + `source_id`**: pointer to domain row (report, homework submission, attendance session, etc.).
- **`actor_profile_id`**: who caused the emission (teacher marking attendance, staff releasing report).
- **`branch_id` / `class_id` / `student_id`**: scope for RLS and parent linking; `student_id` nullable for pure staff events.

**Rules:**

- **Do not** store full private message body in `metadata_summary` — short labels only (e.g. `report_type=monthly_progress`).
- **No** raw storage paths or signed URLs.
- **No** provider secrets or env values.
- **No** detailed payment amounts — at most **safe summary** flags (`proof_requested`, `verification_pending`) if needed.

---

## 5. Notification model (`notifications`)

Message object for display and templating:

- **`title` / `body_preview`**: short, safe strings suitable for list UI and email teaser — **not** full report text.
- **`status`**: `draft` (staff-only authoring), `queued`, `sent`, `cancelled`, `failed`.
- **`send_after`**: supports delayed/review-first sends.
- **`linked_event_id`**: ties back to immutable **notification_events**.

**Rules:**

- **Parent-facing** notifications created only after **release / publish / confirmed** condition on the **source** domain (aligned with ParentView visibility).
- **`draft`** notifications remain **staff visibility only** via RLS — parents **never** see draft rows.
- Parents **only** see recipient-linked rows that are **`queued`/`sent`** (or equivalent “delivered to inbox” policy — exact enum tuned at DDL time).

---

## 6. Recipient model (`notification_recipients`)

**Rules:**

- **Parent** recipients must be **linked guardians** for `student_id` when the notification is child-scoped (same invariant as ParentView).
- **Staff** recipients must match **role + branch/class/task** scope (teacher sees assigned class/task; supervisor sees branch; HQ sees global as policy allows).
- **Student** recipients: **blocked for MVP** unless product explicitly opens a student inbox — default **no parent-facing mirror to student**.

**`delivery_channel`**: plan for `in_app` first; **`email`** when Edge sender exists.

---

## 7. Delivery attempts (`notification_delivery_attempts`)

**Rules:**

- Log **status**, **safe_error_code**, **external_message_id** for provider correlation — **not** full sensitive body.
- **No** provider secret in any column.
- **No** frontend direct provider calls — only **server/Edge** workers write these rows.

---

## 8. Preferences (`notification_preferences`)

- Channel and category opt-in/out per profile.
- **Quiet hours** later — server respects when **scheduling** sends.
- **Required/safety** messages (e.g. certain fee dispute workflows if legally mandated — TBD) may **not** be fully suppressible — product/legal defines list; schema leaves room for `forced_delivery` category flags later.

---

## 9. RLS boundaries (planned)

| Role | Intended access |
|------|-----------------|
| **HQ / admin** | Global manage/read of templates and org-wide notifications where policy allows |
| **Branch supervisor** | Own-branch notification rows and staff recipients in branch |
| **Teacher** | Assigned class/task-related staff notifications; **no** unrelated branch parent rows |
| **Parent** | **Read only** `notification_recipients` (and joined safe `notifications`) **for self** where linked child matches |
| **Parent** | **Cannot** read staff-internal notifications or drafts |
| **Student** | **Blocked** for MVP inbox |
| **Service role** | **Not** exposed to frontend — browser remains anon/JWT only |

Parents **must not** enumerate other families’ notifications via ID guessing — RLS + unguessable IDs.

---

## 10. Trigger-specific RLS implications

For each future trigger, **domain RLS** already constrains who can read the **source** row; notification rows must **inherit** that scope:

| Trigger | RLS implication (planning) |
|---------|----------------------------|
| **Attendance present / arrival** | Parent recipient row only if guardian linked to `student_id` for that attendance session’s branch/class; event references attendance record parent can already justify |
| **Absence / not-arrived** | Same child scope; may be **staff-only** until review policy marks parent-safe |
| **Report released** | Parent only if same **released** report visible on ParentView for linked child; staff recipients per report workflow roles |
| **Homework feedback released** | Parent only if homework release rules match ParentView homework visibility for that child |
| **Parent announcement published** | Parent only if announcement already visible in ParentView scoped list |
| **Payment proof request** | Parent recipient only for **their** proof request case; staff reviewer roles for branch/HQ |
| **Memory/photo released** | Parent only if media row already **released_to_parent** for linked child |
| **HQ task assigned** | Staff assignee + branch scope |
| **Staff time clock exception** | **Supervisor/HQ staff only** — **never** parent-readable notification rows |

---

## 11. Safety gates before creation

Before inserting a parent-visible notification:

1. **Source event** exists and passes domain validation.
2. **Source status** is safe (`released`, `published`, `confirmed`, etc. — per feature).
3. **Recipients** computed from scoped queries — no manual paste of profile IDs from UI without server checks.
4. **Duplicate / idempotency** check passes (§12).
5. **Template** selected — **no** ad-hoc long text from unreleased content.
6. **No raw private URLs** in title/body_preview.
7. **No draft** narrative from AI/report/homework in parent fields.
8. **Audit**: `notification_events` row created **before** or **with** transactional linkage to `notifications`.

---

## 12. Idempotency / duplicate prevention

- **`idempotency_key`** (unique partial index candidate): `hash(event_type, source_type, source_id, recipient_profile_id)` or explicit string from worker.
- **Report released**: one logical send per `(report_id, version_id, parent_profile_id)` unless product allows “resend” as explicit staff action.
- **Announcements**: notify on **publish** / **major revision** only — use `published_revision_id` in key to avoid spam on typo edits.
- **Attendance arrival**: one notification per `(session_id, student_id, arrival_event_kind)` unless teacher resets session (policy-defined).

---

## 13. Email provider relationship (planning only)

- **Sender**: server or **Edge** function only.
- **API key**: **Edge secret** / env — **never** frontend or repo.
- **Implementation**: **after** SQL/RLS model reviewed and parent/staff read paths proven safe.
- **Testing**: dev/staging **fake** recipients or mail trap — **no** real parent emails in CI.
- **Templates**: align with `notification_templates` or external provider template IDs — stored **without** secrets.

---

## 14. In-app notification relationship (planning only)

- **In-app** delivery can ship **before** email: same `notifications` + `notification_recipients` rows with `delivery_channel=in_app`.
- **Notification centre**, **dashboard badges**, ParentView **bell**, staff **alert counts** — **UI milestones later**; schema should support **read_at** / counts without rewrite.

---

## 15. Implementation sequence

| Step | Milestone |
|------|-----------|
| **A** | **Plan only** — this doc + trigger matrix |
| **B** | **Draft notification SQL/RLS foundation** — DDL + policies + smokes (when approved) |
| **C** | **In-app read service + smoke** — JWT-only reads |
| **D** | **Report release notification prototype** |
| **E** | **Attendance arrival prototype** |
| **F** | **Email provider integration** (Edge + secrets) |

**Recommendation**

- **B** is the **next build step** only if the team enters the **notification build lane**.
- Otherwise **park** notifications and continue **PDF internal preview manual QA** / **Parent Communication polish** — no schema churn until product commits.

---

## 16. What not to do yet

- Do **not** send email or in-app pushes from manual scripts.
- Do **not** notify parents on **draft** reports or **AI draft generation**.
- Do **not** notify on **unconfirmed** absence without review/delay policy.
- Do **not** put **private file URLs** or signed URLs in notification text fields.
- Do **not** store **raw fee amounts** or card data in notification tables.
- Do **not** build **WhatsApp/SMS** pipelines before email + policy review.
- Do **not** use **service role** in frontend — unchanged from global rule.

---

## 17. Next implementation prompts (copy-paste)

**Option A — Draft notification SQL/RLS foundation**

```text
Draft notification SQL/RLS foundation only — no UI, no Edge email sender yet.

Deliverables:
1. New numbered SQL migration draft (review only; apply only after human review): notification_events, notifications, notification_recipients, notification_delivery_attempts, notification_preferences; optional notification_templates.
2. RLS policies: parent reads only own recipient rows + linked child scope; staff scoped by branch/class/task; drafts staff-only; student blocked MVP.
3. Indexes: idempotency_key unique where not null; FKs to profiles/students/branches aligned with existing foundations.
4. Smoke-test plan row (docs only until scripts exist): JWT negative tests cross-family.

Constraints: no provider keys; no real parent data; ParentView visibility rules unchanged; demoRole preserved.
```

**Option B — Park notifications; focus QA / polish**

```text
Park notification DDL — no new SQL this sprint.

Proceed with: internal PDF preview manual QA (desktop + ~390px); Parent Communication / announcements copy polish per existing checkpoints.

Re-open Option A when product prioritizes notification build lane.
```

---

## Validation

- **Planning-only**: no `src/` or `supabase/sql/` changes required for this milestone.
- Re-run **build/lint/typecheck** only when runtime files change.

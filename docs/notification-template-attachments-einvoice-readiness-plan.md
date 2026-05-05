# Notification template attachments & e-invoice readiness (planning only)

Date: 2026-05-05  
Type: **planning only** — no SQL migrations, no runtime code, no trigger changes, no email sending, no PDF generation, no attachment storage in this milestone.

**Related foundations**

- `docs/notification-templates-foundation-checkpoint.md` — `notification_templates` (Phase 1 copy + RLS `038`).
- `docs/notifications-foundation-checkpoint.md` — `notification_events`, `notifications`, delivery logs (`034`+).
- `docs/security-audit-session-governance-foundation-plan.md` — session governance before expanding automation/delivery.
- Payments / fees (parent proof vs office workflow): `docs/fee-receipt-upload-readiness-review.md`, `docs/storage-upload-foundation-plan.md`, fee verification checkpoints.
- Export/PDF (released reports, **no product PDF storage yet**): `docs/ai-parent-report-pdf-template-contract-plan.md`, `docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`.
- Storage patterns: `docs/storage-upload-foundation-plan.md`, `docs/class-memories-backend-storage-plan.md`.

---

## 1. Product direction (summary)

Future automated parent messages should be **attachment-ready**: the same notification intent may eventually carry **one or more secure downloads** (e-invoice PDF, released report PDF, marked homework file, HQ-approved static assets, etc.). **For now**, payment-related automation should be prototyped as **message-only in-app** notifications using safe template copy, with **no paths, no public URLs, and no binary attachments** until storage, generation, and RLS are explicitly designed and implemented.

---

## 2. Area A — Attachment types (future catalog)

| Type | Description | Primary owner | Notes |
|------|-------------|---------------|--------|
| **Static HQ-approved** | Versioned PDF/image issued by HQ (e.g. fee policy explainer, payment methods one-pager) | HQ | Must be non-sensitive or parent-safe; change control and audit. |
| **Generated e-invoice PDF** | System-generated invoice for a **specific** `fee_record` / invoice entity | System job (service role / Edge) | Private bucket; row links child/parent scope; no path in body. |
| **AI parent report PDF** | Frozen rendition of **released** report version | System job after PDF pipeline + storage exist | Contract: `ai-parent-report-pdf-template-contract-plan.md`; parent-safe payload only. |
| **Released homework marked file** | Already-modelled `homework_files` / marked work after staff release | Homework domain | Reuse existing RLS + signed URL pattern; notification only **references** entitlement, not raw path. |
| **Announcement image/PDF** | Parent-facing announcement media | Announcements / parent announcements | Moderation + branch scope; align with existing announcement storage plans. |
| **Payment proof instruction** | Optional static “how to upload proof” doc | HQ | Distinct from parent-uploaded **receipt** evidence; still HQ-controlled static asset. |

This list is **not** a commitment to implement every type in one phase; it defines the **attachment taxonomy** templates and notification rows may reference later.

---

## 3. Area B — Attachment rules (non-negotiables)

1. **No raw storage paths in `notifications.title`, `notifications.body`, or template `title_template` / `body_template`.** Copy may say “View your invoice in the portal” — never `storage_path`, bucket names as clickable links, or internal object keys.
2. **No durable public URLs** for child- or payment-scoped artefacts. Prefer **private object + short-lived signed URL** generated at click time, or **in-app portal** route that performs an RLS-gated fetch after auth.
3. **Parent entitlement** — attachments are visible only when a **joined policy** proves the parent is entitled to **that document instance** (e.g. same `student_id`, `fee_record_id`, `report_id`, `homework_submission_id` as the notification scope). No cross-family reads.
4. **Teachers and arbitrary files** — automated system templates must **not** allow teachers to bolt arbitrary blobs onto HQ templates without review. If ever needed: **explicit approval queue** + HQ-approved attachment slot, or HQ-only attachment rows on the template definition.
5. **HQ owns default template attachment slots** (`branch_id` null); **supervisors** may gain **limited** branch override later (mirror copy override pattern — policy TBD).
6. **Internal-only evidence** — no staff notes, verifier-only comments, GPS/selfie proof, or AI raw output as notification attachments.

---

## 4. Area C — Future schema options (consider only — do not implement)

Two-layer model keeps **template design** separate from **per-send instances**:

### C.1 Template-level attachments (catalog / defaults)

**`notification_template_attachments`** (conceptual)

- `id` (uuid), `notification_template_id` (fk → `notification_templates`)
- `attachment_type` (`static_hq_asset` | `system_generated_placeholder` | …)
- `display_name` (parent-facing label only)
- **`document_ref`** — polymorphic discipline required; options:
  - `static_asset_id` (fk to HQ-managed `sales_kit_resources`–style catalog), or
  - `generation_kind` (`e_invoice_pdf` | `ai_report_pdf` | `homework_released_file`) with **no** path columns on template rows — only behaviour flags
- `is_required`, `sort_order`
- `branch_id` nullable (future branch override row)
- `created_by_profile_id`, `updated_by_profile_id`, timestamps

Purpose: HQ defines **which attachment slots exist** for a given `template_key` / `event_type` + `channel`, not the binary for one child.

### C.2 Instance-level attachments (per notification or per event)

**`notification_attachments`** (conceptual)

- `id`, `notification_id` (fk → `notifications`) *or* `event_id` (fk → `notification_events`) — choose one canonical parent; dual-link only if strictly needed for idempotency audits
- `attachment_type`
- `display_name`
- **Resolved reference** (one of, enforced by check constraint or app validation):
  - `storage_bucket` + `storage_path` (only if table RLS + storage policies align), or
  - `generated_document_id` (fk to future `generated_documents` / `invoices` table), or
  - `homework_file_id`, `fee_record_id`, `ai_parent_report_version_id`, etc.
- `is_required` / `delivered` / `suppressed`
- `created_by_profile_id` (system or staff)
- `branch_id` for scope checks (denormalized from parent notification where helpful)

**Relationship to storage**

- Metadata table is **source of truth** for entitlement; Storage policies **mirror** RLS.
- Signed URL generation: **server-side or Edge** with service credentials — **never** service-role in the browser (see project rules).

**Access policy requirements (future)**

- Parent: select only rows where notification recipient + document scope match linked child / payment / report.
- Staff: insert/update per existing notification insert scope; HQ audit read.
- No anon read on attachment metadata.

---

## 5. Area D — Payment / e-invoice future flow

### 5.1 Target end state (conceptual)

1. **Business event** — payment recorded or invoice **finalized** in back office (or confirmed through approved workflow — exact trigger TBD).
2. **Invoice / fee domain record** updated — authoritative row (existing or extended **`fee_records`** / future **`invoices`** table) marks **invoice available** without exposing internals to parents prematurely.
3. **E-invoice PDF generated** — async job writes **private** object; metadata row references bucket/path **only** on server-trusted tables.
4. **`notification_events` insert** — `event_type` e.g. `fee_invoice.available` / `payment.status_updated` (exact naming TBD), scope `student_id`, `branch_id`, optional `fee_record_id` in sanitized metadata (**no paths**).
5. **`notifications` rows** — in-app channel first; title/body from **`notification_templates`** (`channel = in_app`).
6. **Parent opens app** — inbox shows message; **“View invoice”** uses portal route or triggers **short-lived signed URL** after entitlement check.
7. **`notification_delivery_logs`** (and **`audit_events`**) record delivery attempts, failures, retries — mandatory before **email** channel.

Align with **`fee-receipt-upload-readiness-review.md`**: parent **receipt proof** upload remains an **exception** path; **outbound e-invoice** is the **inverse** artefact — both need strict scope and separate template event types.

### 5.2 Prototype now (explicitly allowed)

- **Message-only** in-app notifications when HQ/staff workflows are ready to **emit intent only**:
  - New `event_type` + template rows (HQ-seeded): e.g. “Your billing update is available” / “Sign in to the parent portal to view your invoice.”  
  - **No attachment rows**, **no PDF job**, **no new storage paths**.
- Deep link *within the app shell* may point to ParentView/fees routes **already governed by existing RLS** — still **no** storage path embedded in notification text.

### 5.3 Must wait

- Binding notifications to actual PDF blobs.
- Email channel and MIME attachments.
- Any change that widens `fee_records` parent read without a dedicated invoice visibility model.
- Teacher-facing “attach my file” on system templates.

---

## 6. Area E — Email readiness

- **In-app first** — same `template_key` can later have a second row with `channel = 'email'` (already allowed in `038` for **copy storage** only). Renderer and trigger code should **key off** `template_key` + `channel` once email exists.
- **Email attachments** need:
  - Stable **instance** attachment records (C.2)
  - **Retry + idempotency** (partially sketched in `notification_delivery_logs`)
  - **Bounce/suppression** rules (out of scope here)
  - **Stricter audit** than in-app (prove what was sent, to whom, with which document version)
- **Do not send live email** until: delivery logging, attachment entitlement, and audit alignment are implemented and reviewed (see `security-audit-session-governance-foundation-plan.md`).

---

## 7. Area F — Security boundaries (checklist)

- No parent **cross-family** attachment or notification scope leaks.
- No **raw receipt/evidence** paths in notification copy; parent proof upload remains its own vertical.
- No **internal notes** or verifier-only fields in parent-visible templates or attachment metadata exposed to parents.
- No **GPS/selfie** or non–parent-safe media in automated template attachments.
- No **AI provider raw output** in attachments or template bodies.
- No **file URLs** stored in notification **body**; use portal or signed URL flow.
- **No service-role key in frontend** — generation and signing run in trusted execution only.

---

## 8. Alignment with current SQL (034 / 038)

- **`034`**: `notifications.channel` is currently constrained to **`in_app`** for inserts — email delivery will require a **separate migration** when product approves email.
- **`038`**: `notification_templates.channel` allows `email` for **future copy**; attachment schema should **not** weaken template RLS or expose templates to parents.
- **Trigger safety** — templates and future attachments **do not replace** release/gating logic; they only shape **copy and optional artefact links** after authorized events.

---

## 9. Next recommended implementation milestones (ordered)

1. **Payment / billing “intent” notification** — new `event_type` + HQ template seeds + **one** staff/HQ-gated trigger path that fires only on approved state transitions; **message-only**; smoke + audit event.
2. **Generated document registry** — small `generated_documents` (or extend `fee_records`) with **RLS** and private bucket convention per `storage-upload-foundation-plan.md`.
3. **E-invoice PDF job** (Edge/service) + link **instance** attachment row to `notifications` / portal.
4. **Extend template catalog** with `notification_template_attachments` (HQ-managed static assets first).
5. **AI report PDF storage + notification link** after PDF export pipeline is production-ready per PDF contract docs.
6. **Email channel** — migration to widen `notifications.channel`, provider integration, delivery log hardening.

---

## 10. Out of scope for this document

- Concrete SQL migrations or policy text.
- Changes to existing AI report, homework, attendance, or parent communication triggers.
- UI implementation for attachment chips, download buttons, or email composer.

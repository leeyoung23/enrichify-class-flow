# Email notification consent & preferences readiness plan (planning only)

Date: 2026-05-05  
Type: Planning + Phase 1 foundation checkpoint.  
No Gmail/provider integration, no real email sending, and no email trigger wiring in this milestone.

## Phase 2 update: ParentView Notification Settings UI v1 (2026-05-05)

- Surface added in `src/pages/ParentView.jsx`: **Communication & Notification Settings** (`#parent-notification-settings`), shown for parent view mode.
- Placement: directly below the in-app notification inbox with a quick-jump button label **Communication Settings** in the ParentView portal links card.
- Active v1 channel: **`in_app` only**. Email/SMS/push are displayed as future channels and remain non-editable in this phase.
- V1 categories shown:
  - `operational_service` (required acknowledgement row)
  - `attendance_safety`
  - `learning_report_homework`
  - `parent_communication`
  - `billing_invoice`
  - `media_photo`
  - `marketing_events`
- Save path uses existing parent self-service helper `upsertMyNotificationPreference` and reads via `listMyNotificationPreferences`.
- V1 scope strategy: save as **parent-level defaults** (`student_id = null`) so future child-specific overrides can be added later without changing current behavior.
- Triggers are unchanged in this phase: preferences are stored, but notification trigger helpers do not yet enforce preference filtering. Preference enforcement remains a future phase.

## Planning checkpoint: Parent Portal first-login acknowledgement gate (2026-05-05)

- New planning doc: `docs/parent-portal-first-login-consent-gate-plan.md`.
- Scope: planning-only gate before full parent portal access using one required acknowledgement checkbox.
- Required first-login copy defined as one acknowledgement covering Terms + Privacy + essential portal service updates.
- Optional consent controls are deferred to ParentView Communication & Notification Settings.
- Marketing/events, media/photo, and future external email/SMS/push remain separate preference categories.
- Legal/compliance review is required before real parent rollout and any production launch path involving email/media consent flows.
- No SQL, no RLS, no ParentView behavior changes, and no email/Gmail/provider implementation in this checkpoint.

## Foundation update: parent policy acknowledgement SQL/RLS (2026-05-05)

- Added migration: `supabase/sql/041_parent_policy_acknowledgements_foundation.sql`.
- Added table: `parent_policy_acknowledgements` with policy key/version acknowledgement records.
- RLS posture (conservative): parent self read/insert, HQ read/insert, branch supervisor read-only (branch-linked parent records), no teacher/student access.
- Append-only design in v1: no update/delete policies; corrections and new versions are handled by inserting a new acknowledgement row.
- First-login required acknowledgement remains one checkbox (`parent_portal_terms_privacy`), while optional communication categories stay in ParentView Communication & Notification Settings.
- No first-login UI implementation yet; this phase is data foundation only.

## Scope and product direction

Current production-safe behavior remains **in-app notification first** via `notification_events` + `notifications` and HQ-governed template copy.  
Before enabling any external email channel, the product needs explicit consent modeling, parent preference controls, and safe category boundaries.

**Rule:** Email is an external channel. The portal remains the source of truth.  
Email should notify parents to sign in and view details in ParentView; email should not become a sensitive data transport layer.

---

## 1) Recommended consent categories

Use category-level consent/preference controls (channel-aware), with a clear distinction between essential service operations and optional communications:

1. **Portal in-app notifications** (baseline in-product channel)
2. **Operational/service email** (account/process notices needed for service operation)
3. **Billing/e-invoice email** (fee and invoice lifecycle notices)
4. **Learning/report/homework email** (learning updates, released feedback/report availability notices)
5. **Attendance/safety email** (absence/arrival/safety-related alerts)
6. **Marketing/events/promotional email** (non-essential campaigns, events, promotions)
7. **Media/photo-related notification** (media release/availability notices)

Recommended default interpretation:
- **Essential** categories (operational, billing, attendance/safety) are governed by service/legal basis rules.
- **Optional** categories (marketing/events/promotional) require explicit opt-in and easy opt-out.

---

## 2) Recommended parent consent model

Consent should be captured with auditable context and later surfaced in ParentView:

- Capture parent/guardian consent during enrolment/onboarding.
- Parent can manage preferences later in ParentView (self-service UI phase).
- HQ can view consent/preference status (read-only oversight view).
- Store consent context fields in future schema:
  - `consented_at` / `withdrawn_at`
  - `consent_source` (enrolment form, parent portal toggle, staff-assisted update)
  - `actor_profile_id` (who performed change)
  - `policy_version` / notice-version shown at consent time
- Keep **marketing consent separate** from essential service notices.
- Support child-specific preference scope where needed (family-level default + optional student-level override).

---

## 3) Email safety rules (pre-send policy)

For first email channel rollout, enforce conservative content rules:

- Default email copy remains generic and action-oriented.
- Do **not** include child report body text in email.
- Do **not** attach homework files directly in v1.
- Do **not** include receipt file paths, storage keys, or raw URLs.
- Do **not** include internal notes or staff-only review context.
- Do **not** include provider payloads or AI raw output.
- Do **not** include sensitive child data unless explicitly approved in a reviewed category design.
- Prefer: “Sign in to the parent portal to view details.”

---

## 4) Future schema concept (planning only)

No migration in this milestone. Proposed model:

### A. `communication_consents` (or `parent_notification_preferences`)

Suggested columns:
- `id` (uuid)
- `parent_profile_id` (required)
- `student_id` (nullable; allows per-child override if needed)
- `channel` (`in_app`, `email`, future channels)
- `category` (consent category enum/string)
- `enabled` (boolean preference toggle)
- `consent_status` (e.g. `granted`, `withdrawn`, `pending`, `not_set`)
- `consent_source` (enrolment, portal, staff-assisted)
- `consented_at` (timestamptz)
- `withdrawn_at` (timestamptz)
- `policy_version` (text)
- `created_at`, `updated_at`
- optional: `updated_by_profile_id` / `actor_profile_id`

### B. Audit + delivery linkage

- Consent/preference changes should be mirrored in `audit_events`.
- Email send attempts should use existing `notification_delivery_logs` foundation (with reviewed channel expansion in a future migration).

---

## 5) Email/Gmail automation prerequisites

Before enabling any email provider (including Gmail APIs), all of the following should be true:

1. Consent/preference schema exists with RLS and auditability.
2. Parent email verification flow is defined and enforced.
3. Unsubscribe/manage-preferences path exists for non-essential messages.
4. Delivery logging exists for email attempts, retries, outcomes, and suppression.
5. Template category/channel review workflow exists (HQ governance + safety checks).
6. Rate limiting and retry policy is defined.
7. Staff cannot send arbitrary free-text mass email from frontend.
8. Provider credentials are server-side only (Edge/backend), never in browser.
9. No service-role key exposure in frontend.

---

## 6) Suggested implementation order

1. **Phase 1:** consent/preferences SQL + RLS + audit model
2. **Phase 2:** ParentView notification settings UI (self-service controls)
3. **Phase 3:** HQ read-only consent overview (monitoring/compliance visibility)
4. **Phase 4:** server-side email provider integration for one low-risk trigger
5. **Phase 5:** e-invoice attachment/signed-link flow with strict entitlement checks
6. **Phase 6:** marketing/event email only after opt-in + unsubscribe path is proven

---

## 7) Relationship to current foundation

- `notification_templates.channel = 'email'` currently supports copy planning only; no sender is enabled.
- Current `notifications` insert policy is constrained to `channel = 'in_app'` in the foundation.
- Parent notification routing in ParentView stays internal and safe; no external email link behavior is added in this plan.

---

## 8) Out of scope for this document

- SQL DDL/RLS implementation text
- Gmail/provider SDK setup
- Outbound email job workers
- Live sending tests
- Attachment/PDF implementation details beyond readiness guidance

---

## 9) Phase 1 foundation status (applied + verified)

- Added migration file: `supabase/sql/040_parent_notification_preferences_foundation.sql`
- Added table: `parent_notification_preferences`
- Added conservative RLS:
  - parent self read/insert/update
  - HQ read/insert/update
  - branch supervisor read-only for branch-linked parent records
  - no teacher/student access
  - no delete policy (withdraw/disable model)
- Added service helpers:
  - `listMyNotificationPreferences`
  - `listNotificationPreferencesForStudent`
  - `upsertMyNotificationPreference`
- Added smoke: `scripts/supabase-parent-notification-preferences-smoke-test.mjs`
- Added npm script: `test:supabase:parent-notification-preferences`

Apply note:
- **Applied to linked project:** `supabase/sql/040_parent_notification_preferences_foundation.sql`
- **Apply method used:** Supabase SQL Editor (manual run)
- CLI apply may require `SUPABASE_DB_PASSWORD`.

Post-apply validation (linked project):
- `npm run test:supabase:parent-notification-preferences`
- `npm run test:supabase:notifications`
- `npm run test:supabase:audit-events`

RLS verification recorded:
- parent can self read/insert/update
- parent cannot create preference for another profile
- student read/write blocked
- HQ read path works
- branch supervisor read-only branch-linked behavior recorded (fixture-dependent pass/check)

Safety boundaries remain:
- no Gmail/email provider integration
- no email/SMS/push sending
- no service-role frontend usage
- no student access
- no marketing email automation without future opt-in/unsubscribe path
- portal remains source of truth

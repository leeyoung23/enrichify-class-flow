# Parent Portal first-login acknowledgement and consent gate plan (planning only)

Date: 2026-05-05  
Type: Planning checkpoint only (no SQL/RLS/app code changes in this document).

## Phase 2 foundation update (SQL/RLS only, no UI) — 2026-05-05

- Added migration: `supabase/sql/041_parent_policy_acknowledgements_foundation.sql`.
- Added table: `public.parent_policy_acknowledgements`.
- Purpose: record parent acknowledgement events by `policy_key` + `policy_version` in an append-only model.
- Required first-login strategy remains one required acknowledgement using `policy_key = 'parent_portal_terms_privacy'`.
- Optional consent controls remain in ParentView Communication & Notification Settings and are not required at first login.
- No first-login UI implementation in this phase.
- No email/SMS/push provider integration or sending behavior in this phase.
- Legal/compliance review remains required before real parent rollout or production launch with media/external channels.

## Scope and intent

This plan defines a **first-login parent acknowledgement and consent gate** before full Parent Portal use in real parent rollout.

- Parent must acknowledge key policy/legal notices before continuing.
- Parent Portal remains the source of truth for student-related updates.
- External channels (email/SMS/push) remain future-phase and are not enabled by this plan.
- This document does not introduce implementation, migrations, RLS edits, provider setup, or sending behavior.
- Legal/compliance review is required before real parent rollout and any production launch involving first-login gate, media consent expansion, or external channels.

---

## 1) First-login gate purpose

The gate should ensure that each parent account:

1. Confirms one clear required acknowledgement before entering full Parent Portal.
2. Understands communication boundaries (portal-first, message safety).
3. Defers optional consent controls to ParentView Communication & Notification Settings.
4. Produces auditable acknowledgement metadata (policy version + timestamp + source).

This protects rollout quality and reduces ambiguity before email/Gmail or broader external delivery phases.

---

## 2) Required acknowledgement (single checkbox)

First-login gate should use **one required checkbox** only.

Preferred required checkbox copy:

“I have read and agree to the Parent Portal Terms of Use and Privacy Notice. I understand the centre may use the portal to share essential service updates related to my child’s learning, attendance, homework, reports, billing, safety, and class operations.”

Guidance:
- Keep first-login acknowledgement simple and non-intimidating.
- Essential service communication is part of Parent Portal usage.
- Parent should still be able to open policy links (Terms/Privacy/Communication Policy) from the same screen.

---

## 3) Optional consent categories

Optional categories (not required for portal access) should be managed after first login in ParentView **Communication & Notification Settings**:

1. **Email notifications** (future activation)
2. **SMS/push future notifications** (future activation)
3. **Marketing/events/promotional messages** (must remain opt-in and withdrawable)
4. **Media/photo-related updates** (separate from marketing and required service)
5. **Optional e-invoice/email delivery where applicable** (future/conditional)

Guidance:
- Optional categories should default conservatively according to product/legal policy.
- Optional consents should remain editable later from ParentView Communication & Notification Settings.

---

## 4) Recommended UX (first-login flow)

Recommended first-login parent experience:

1. Trigger gate on first parent login after account creation or first portal access.
2. Present short summary text and links to full Terms/Privacy/Communication Policy.
3. Render one required acknowledgement checkbox before enabling **Continue**.
4. Do not overload login with multiple required consent boxes.
5. Do not require optional channel/marketing/media choices at this step.
6. Persist acknowledgement/consent metadata with:
   - `acknowledged_at` / consent timestamp
   - `policy_version`
   - `consent_source = parent_portal_first_login`
7. After completion, route parent to normal ParentView.
8. Allow later edits to optional communication preferences in existing ParentView Communication & Notification Settings.

UX safety notes:
- Avoid long legal text walls in the gate; provide readable summaries and deep links.
- Avoid dark-pattern bundling; required acknowledgement and optional preferences must remain semantically distinct.
- Keep media/photo consent clearly separated from general terms when used beyond normal class evidence flow.

---

## 5) Future schema concept (planning only)

`041` now establishes the first acknowledgement foundation table for parent policy acceptance records.
Future phases may still evolve schema details, but v1 design remains append-only by policy version.

### Option A: Dedicated acknowledgement table

`parent_policy_acknowledgements` (recommended for clarity)

Suggested fields:
- `id` (uuid)
- `parent_profile_id` (uuid, required)
- `policy_key` (text; e.g. privacy_notice, portal_terms, communication_policy, essential_service_notice)
- `policy_version` (text, required)
- `acknowledged_at` (timestamptz, required)
- `source` (text; e.g. `parent_portal_first_login`, `parent_portal_reconfirm`)
- `created_at` (timestamptz)
- optional future fields: `session_id`, `ip_address_hash`, `user_agent_fingerprint` (privacy-reviewed)

### Option B: Careful extension strategy

Extend current consent model only if separation stays clear and query semantics remain maintainable.

Important constraints:
- Do not store full legal text blobs in each row.
- Store policy key/version and resolve full text via controlled policy documents/URLs.
- Keep required acknowledgement records distinct from optional channel preferences.

### Audit linkage (future)

- Consent/acknowledgement changes should be mirrored to `audit_events` in later implementation phases.

---

## 6) Product and legal boundaries

1. Required service updates are not marketing.
2. Marketing/events must remain opt-in and withdrawable.
3. Media/photo consent must remain separate from broad marketing consent.
4. Email content should stay generic and link back to the portal.
5. Do not attach child reports/homework/photos/payment files directly to email in v1.
6. Required first-login acknowledgement should not silently absorb optional marketing/media choices.
7. Keep portal as source of truth for detailed and sensitive content.
8. Legal/compliance review is required before real parent rollout and before enabling production email/media policies.

---

## 7) Implementation sequence

1. **Phase 1:** planning doc only (this document).
2. **Phase 2:** policy acknowledgement SQL + RLS design and migration.
3. **Phase 3:** first-login gate UI implementation in parent flow.
4. **Phase 4:** connect optional consent toggles to `parent_notification_preferences`.
5. **Phase 5:** add `audit_events` coverage for consent/acknowledgement changes.
6. **Phase 6:** enable email/provider integration only after consent and preference enforcement are in place.

---

## Out of scope for this checkpoint

- App code implementation of gate behavior
- SQL migration text and RLS policy changes
- Gmail/email provider integration or sender jobs
- SMS/push provider integration
- Trigger enforcement implementation details
- Any production rollout decision (pending legal/compliance sign-off)

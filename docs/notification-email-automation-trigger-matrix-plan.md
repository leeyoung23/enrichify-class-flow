# Notification & email automation — trigger matrix and planning

Date: 2026-05-03  
Type: **planning only** — defines future parent/staff notification triggers, safety rules, review gates, message boundaries, and implementation order. **No** app UI changes, **no** runtime logic, **no** services, **no** SQL/RLS, **no** email or notification sending in this milestone.

**Related:** `docs/project-master-context-handoff.md`, `docs/ai-parent-report-mvp-final-qa-checkpoint.md`, `docs/released-ai-parent-report-export-strategy-plan.md`, `docs/announcements-parent-communication-final-qa-checkpoint.md`, `docs/rls-test-checklist.md`, `docs/mobile-first-qa-checkpoint.md`

---

## 1. Product purpose

Notifications and emails are a **trust layer** between the centre and families (and among staff). They must:

- Trigger only after **safe input, review, or release conditions** are satisfied — never on drafts, unapproved narrative, or uncertain operational states.
- **Never** broadcast AI-generated or teacher-draft content until it has passed the same **release** rules as the in-app parent experience.
- Avoid **noise**: parents should receive **actionable, timely** messages, not every internal state change.
- Reinforce that **the portal remains canonical** for full detail; messages point parents **to ParentView** (or secure flows), not into long body text in email.

Automation must **not** send:

- Draft reports, mock AI versions, or unreleased homework feedback.
- Absence or payment alerts that could **false-alarm** without human review where policy requires it.
- Internal staff-only announcements or task chatter to parents.

---

## 2. Current state (product — planning snapshot)

| Area | Current posture (no automation layer yet) |
|------|-------------------------------------------|
| **Email provider** | **Not integrated** — no transactional email pipeline in app code. |
| **Push / SMS / WhatsApp** | **Not implemented.** |
| **In-app notification centre** | **Not implemented** as a unified cross-feature inbox (features use on-screen status only). |
| **AI parent reports** | Parent sees **released** reports on ParentView; **no** release email. Staff workflow on `/ai-parent-reports`; **no** email on lifecycle. |
| **PDF preview** | Staff-only HTML preview; **no** parent email with PDF. |
| **Parent announcements / events** | Published, scoped parent-facing reads on ParentView; **no** publish notification/email automation. |
| **Homework** | Teacher review / share feedback flows exist; **no** parent email when feedback is ready (parents rely on portal checks). |
| **Attendance** | Staff capture exists; **no** automated “child arrived” or absence email to parents. |
| **Fee / payment proof** | Exception / proof paths exist in product surface; **no** automated “please upload proof” email unless/until product adds it with policy. |
| **My Tasks / internal requests** | Staff workflow exists; **no** external push/email automation for assignments. |
| **Staff Time Clock** | Capture/review surfaces exist; **no** supervisor alert automation for exceptions. |
| **Real AI provider** | Skeleton only — **no** key-driven automation or parent messaging tied to generation. |

---

## 3. Notification channels

| Channel | Role | Pros | Cons / constraints |
|---------|------|------|---------------------|
| **A. In-app notification** | Primary **internal** channel first | No external deliverability; ties to existing auth; good for staff tasks | Requires data model + UI; parents must open app |
| **B. Email** | Primary **official external** record | Universal; audit-friendly; works without app open | Deliverability, consent, template discipline; secrets server-side only |
| **C. WhatsApp / SMS** | **Later** optional | High open rates in some regions | Cost, policy, opt-in, template approval — **after** email + policy review |
| **D. Push (mobile)** | **Later** | Timely if app installed | Platform keys, permission UX, not replacement for email for compliance |

**Recommendation**

1. **In-app + email first** for official, auditable communication (reports released, proof requests, important announcements).
2. **WhatsApp/SMS** only after **policy**, **cost**, and **opt-in** review — never as the only channel for critical compliance statements unless legally required.

---

## 4. Trigger matrix

Legend: **Auto** = may fire when conditions met; **Review-first** = human or delayed gate before send; **Msg** = short summary style.

| Trigger area | Event | Recipient | Automatic or review-first | Message type | Required conditions | Should not send when | Status / log needed | Priority |
|--------------|-------|-----------|---------------------------|--------------|----------------------|------------------------|---------------------|----------|
| **Attendance** | Present / child arrived | Parent/guardian | **Review-first or delayed** (policy) | “Session attendance updated” + portal link | Teacher saved **present** for linked child; session date valid | Demo mode; ambiguous checkout; duplicate saves same session | Delivery attempt + outcome; correlation id | Medium |
| **Attendance** | Absent / not arrived | Parent/guardian | **Review-first** | Absence notice + portal | Staff confirmed absence rule met; child scoped | Unchecked assumptions; same-day duplicate | Log + optional staff acknowledgment | High |
| **AI / parent report** | Report released | Parent | **Auto after release** (with safeguards) | “New progress report” + ParentView link | `status === 'released'`; parent linked to child; version current | Draft; `teacher_review`; demo suppress flag | Immutable link to report id + sent timestamp | High |
| **Homework** | Feedback / marked work released | Parent | **Auto after release** | “Feedback ready” + portal homework link | Teacher action “share/release” to parent per product rules | Upload-only without release; draft comments | Log event id; no attachment URLs in email body | Medium |
| **Announcements** | Parent notice / event **published** | Parent | **Auto on publish** (configurable) | Summary + portal announcements link | Published + targeted + linked-child in scope | Staff-internal posts; every trivial edit | Publish version id; throttle duplicate publishes | Medium |
| **Fees / payments** | Proof requested | Parent | **Review-first** | “Action needed: upload proof” + secure path | HQ/supervisor initiated request; case id scoped | Broad blast; exposing ledger rows | Case reference (opaque token); audit trail | High |
| **Memories / media** | Photo/memory **released** to parent | Parent | **Auto on release** | “New memory shared” + portal link | `released_to_parent` / equivalent; linked child | Unreleased media; staff-only albums | Release event id | Low–medium |
| **Weekly / progress report** | Weekly summary **released** | Parent | **Auto when product ships release** | Short teaser + portal | Released artefact exists for child | Draft weekly content | Artefact version | Medium |
| **Internal HQ / tasks** | HQ request **assigned** | Staff (teacher) | **Auto or digest** | Task title + My Tasks link | Assignment persisted; recipient active | Wrong branch scope | Task id; read optional | Medium |
| **My Tasks** | Task **due soon** / **overdue** | Staff assignee | **Digest or auto** (policy) | Due reminder | Due date set; not completed | Completed; demo noise cap | Scheduled job id | Medium |
| **Announcements / tasks** | Teacher **uploaded requested file** | Staff (requester) | **Auto** | File received | Upload tied to request; virus scan pass if applicable | Partial upload | Upload event id | Medium |
| **Announcements / tasks** | **Supervisor reply needed** | Staff | **Auto** | Reply pending | Thread state requires role | Already resolved | Thread id | Medium |
| **Staff Time Clock** | **Exception** (geo/time) | Supervisor / HQ | **Auto to staff roles only** | Exception summary + review UI link | Exception rule fired per policy | Parents (**never**) | Exception id; resolution status | High |
| **Fees** | **Payment proof uploaded** | Staff reviewer | **Auto** | Proof awaiting verification | Upload completed to scoped bucket/path | Duplicate identical file spam | Proof request id | High |
| **Homework** | **Pending teacher review** | Teacher | **Digest** | Queue depth + link | Items in review queue | Empty queue | Batch counts | Low–medium |
| **AI parent reports** | Report **awaiting approval** | Supervisor / HQ | **Auto or digest** | Approval queue | Status in `supervisor_review` / `approved` gate per workflow | Draft noise | Report id | High |

---

## 5. Attendance notification safety

- **Present / arrived**: Send only after **authoritative staff action** (e.g. marked present for session). Consider **batching** or **short delay** to avoid duplicate pings if UI saves twice.
- **Absence / not arrived**: Prefer **review-first** or **delayed batch** so transient network or teacher correction does not panic parents.
- **False alarms**: No GPS-derived parent messaging; **staff Time Clock GPS is staff-only** — never mixed into parent “arrival” copy.
- **Logging**: Every send attempt should record **outcome** (queued, sent, bounced, suppressed) without storing unnecessary PII in logs.
- **Copy**: Short, reassuring, link to ParentView attendance summary — **no** continuous tracking language.

---

## 6. Report release notification safety

- Send only when **`status === 'released'`** and parent has **linked-child** access to that report’s scope.
- Message links to **ParentView progress report** section — **no** evidence links, **no** `generation_source`, **no** provider labels.
- **Optional** PDF link in email **only after** parent-facing PDF export exists and is policy-approved.
- **Never** email bodies that mirror unreleased AI drafts or teacher-review-only text.

---

## 7. Homework notification safety

- Notify **only after** teacher **releases** feedback / marked work to parent per product rules — **not** on teacher-only upload.
- Email says **feedback is ready** and links to **portal homework** — **no** signed URLs or storage paths in email body.
- Avoid attaching files; portal remains authority for downloads after auth.

---

## 8. Parent announcement / event notification safety

- Only **published**, **parent-facing**, **scoped** notices/events — **no** internal staff announcement leakage.
- Prefer **notify on publish**; **avoid** notifying on every minor edit unless marked **major update** or **important** flag (product decision).
- Category/priority rules can throttle frequency (e.g. max N per week unless urgent).

---

## 9. Payment proof request safety

- Trigger only when **HQ/supervisor** cannot verify internally and a **scoped proof request** is created.
- Copy asks parent to **upload proof** via **secure in-app path** — **no** full fee breakdown unless necessary.
- **Verification / rejection** replies are a **later** workflow — plan acknowledgement templates without exposing internal dispute notes.

---

## 10. Staff notification safety

- **Tasks**: assignment, due, overdue — staff-only; **never** CC parents.
- **Time clock exceptions**: supervisors/HQ only; **never** parents.
- **Payment proof uploaded**: finance reviewer roles only.
- **Report awaiting approval**: supervisor/HQ queue — avoid ping on every autosave; prefer **state transition** events.
- Reduce noise: **digests** vs **immediate** per channel settings (future **preferences**).

---

## 11. Data model concept (future — no SQL in this doc)

Conceptual tables (names illustrative):

| Concept | Purpose |
|---------|---------|
| **notifications** | Canonical notification record: type, payload refs (ids not bodies), created_at, priority. |
| **notification_recipients** | user_id / role / channel; read_at; dismissed_at. |
| **notification_events** | Immutable audit of **why** send fired (trigger id, correlation id, feature area). |
| **notification_preferences** | Per-user channel toggles, quiet hours (future). |
| **notification_delivery_attempts** | Channel (email/push), provider message id, status, error class — **no** raw secrets or full body in logs by default. |

RLS must enforce **tenant/branch/family** scoping — **planning follow-up**: dedicated SQL/RLS review milestone.

---

## 12. Email provider strategy (planning only)

- **Secrets**: Provider API keys **only** in server/Edge/env — **never** frontend or repo.
- **Templates**: Centralised, versioned templates; parameterised placeholders; preview in staging.
- **Environments**: **Dev/staging** first with fake recipients or mail traps — **no** real parent addresses in automated tests.
- **Logging**: Metadata only (message id, template id, status); **no** full body in production logs by default.
- **Compliance**: Unsubscribe / communication preference **before** broad marketing-style mail; transactional mail may be exempt by jurisdiction — legal review later.

---

## 13. Message template principles

- **Short**, parent-friendly subject lines; centre name visible.
- **Link to portal** for detail — avoid pasting sensitive narrative in email.
- **Clear single action** when needed (“Upload proof”, “View report”).
- **No raw UUIDs** in visible text — opaque tokens or deep links only.
- **No AI/provider wording** to parents for AI reports — product copy already hides internals.
- **Bilingual** support later: template variants per locale.

---

## 14. Implementation sequence

| Step | Milestone | Notes |
|------|-----------|------|
| **A** | **Plan only** | This document. |
| **B** | **Notification SQL/RLS review** | Schema + policies before any sender code. |
| **C** | **In-app notification prototype** | Staff-first inbox optional; proves RLS + reads. |
| **D** | **Report release notification** | High trust impact — pair with ParentView release rules. |
| **E** | **Attendance arrival** | Only after §5 rules — likely review-first. |
| **F** | **Email provider integration** | After event model + suppression rules proven. |
| **G** | **WhatsApp/SMS** | Last — policy + cost. |

**Recommendation**

1. **B** first: notification **SQL/RLS** design review (tables §11, tenant boundaries).
2. **C**: **In-app** prototype for **staff** (lower external blast radius).
3. **D** or **E**: choose **report release email** vs **attendance** based on centre urgency — both require strict guards.
4. **F**: email provider wiring **only after** immutable **notification_events** + suppression logic exists.

---

## 15. What not to do yet

- Do **not** send email from the **frontend** or browser keys.
- Do **not** send on **draft creation**, **AI draft generation**, or **teacher_review** states for parent-visible content.
- Do **not** send absence/absence-like alerts **without** review/delay policy.
- Do **not** embed **private file URLs** or signed URLs in email.
- Do **not** commit **provider keys** or paste secrets into logs/issues.
- Do **not** notify parents for **internal staff requests** or **staff-only** announcements.

---

## 16. Next implementation prompt (copy-paste)

Use when starting the **notification system SQL/RLS review** milestone:

```text
Notification system SQL/RLS review planning only — no UI, no Edge email sender yet.

Goals:
1. Propose tables: notifications, notification_recipients, notification_events, notification_preferences, notification_delivery_attempts (names adjustable) with tenant/branch/family scoping aligned to existing profiles and linked-child rules.
2. Define RLS per role: parent reads only own family-linked notifications; staff reads branch/HQ scope; no service role in frontend; no cross-family leakage.
3. Map trigger matrix rows (docs/notification-email-automation-trigger-matrix-plan.md §4) to event types and idempotent dedupe keys (e.g. prevent duplicate “report released” emails on retries).
4. Document suppression flags (demoRole, staging, user opted out) without implementing sends.
5. Output: a dedicated SQL/RLS planning doc + checklist updates — still no DDL apply until reviewed.

Constraints: no email provider keys; no real parent data in fixtures; ParentView visibility rules unchanged; no automation sends enabled.
```

---

## Validation

- **Planning-only**: no `src/` changes required for this milestone.
- Re-run **build/lint/typecheck** only when runtime files change.

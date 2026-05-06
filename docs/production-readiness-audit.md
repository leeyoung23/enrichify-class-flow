# Production readiness audit — Enrichify Class Flow (internal prototype)

Date: 2026-05-06  
Audience: engineering, product, operations, compliance stakeholders  
Scope: **planning / honest assessment** — synthesizes implemented behaviour, documentation checkpoints, and known deferrals. **Not** a legal opinion.

---

## Executive summary

The codebase is a **feature-rich internal prototype** with substantial Supabase-backed flows (auth lifecycle, notifications, homework, AI parent reports shell, session governance, parent portal surfaces). **Automated smokes** cover many foundations; **manual UAT** remains essential for routes without dedicated scripts (e.g. `/students` UI, ParentView end-to-end).

**Production-ready for fee-charging SaaS with real minor/parent data:** **No.** Gaps include **staging/production isolation**, **backup and incident runbooks**, **guardian link staff writes** (only planned), **parent communication compliance** (Malaysia **PDPA** and child-data posture), and **deferred channels** (email/SMS, PDF storage, OCR).

**Safe uses today:** internal demos, curriculum/staff training on synthetic or low-risk test tenants, and **staff-only** pilots **without** representing the product as legally compliant for families until policy review completes.

---

## Part A — Regression guard status (static)

The following files were reviewed against the **known UAT regression guard list** (students route stability, Parent Updates class memory selector, ParentView notifications/settings, sidebar ordering, session sign-out path, keep-signed-in behaviour, class-scoped memories, no parent draft/evidence exposure):

- `src/pages/Students.jsx`
- `src/pages/ParentUpdates.jsx`
- `src/pages/ParentView.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/services/sessionGovernanceService.js`
- `src/services/supabaseAuthService.js`
- `src/services/permissionService.js`

**Finding:** **No obvious new blocker** identified from documentation checkpoints and route responsibilities at this audit date. **Residue risks:** environment-specific configuration (Supabase project, fixtures), and **manual** verification still required for guards without automated route tests.

---

## Part B — Domain audit (implemented vs planned)

### 1. Auth / session governance

| Topic | Notes |
|-------|--------|
| Supabase-primary sign-out | Implemented pattern per session-governance milestone docs |
| Remember-me | Supported; conservative edge cases documented in handoff |
| Timeout / governance | App-level governance present |
| Audit lifecycle | `auth`-related audit patterns; see smokes |
| `auth_sessions` | SQL foundation + runtime tracking per checkpoint |
| Parent vs HQ session UI | Parents: communication/settings scope; HQ: `/session-review`; parents **not** given Account Security / Active Sessions in ParentView |

**Status category:** **UAT ready** (internal), **Needs legal/compliance before parent pilot** (session data retention messaging), **Not production ready** without backup/runbook for auth tables.

---

### 2. Parent portal

| Topic | Notes |
|-------|--------|
| ParentView | Student targeting, blocked states for no link / denied |
| Reports | Released-only emphasis; printable layout preview where implemented |
| Homework | Upload/review/release model; mock AI clearly labelled in places |
| Attendance | Flows exist in walkthrough scope |
| Notifications | Top-N preview + routing patterns |
| Settings | Communication & notification preferences; no internal session admin for parents |
| Announcements / memories | Class-targeted memories; parent-facing after approval paths |
| First-login acknowledgement | Gate where applicable |

**Status category:** **Internal prototype ready**; **Needs polish before staff pilot** (copy consistency across routes); **Needs legal/compliance before parent pilot** (real family data, photos, messaging).

---

### 3. AI Parent Reports

| Topic | Notes |
|-------|--------|
| Shell / create | Implemented |
| Mock vs real draft | Both paths; provider edge smokes optional/discretionary |
| Review / approve / release | Staff lifecycle labels |
| Parent sees released/current only | Intent + RLS posture; expanded smoke optional |
| Printable preview | Browser layout; not PDF binary download |
| Deferrals | PDF storage, email delivery — documented |

**Evidence pipeline:** **Partially implemented.** `collectAiParentReportSourceEvidence` (RLS mode) aggregates attendance, homework assignee snapshot, **released homework feedback** text (`feedback_text` / `next_step`, release-gated — **no** `internal_note`, paths, or URLs), parent_comments + weekly_progress_reports, curriculum/learning context, **report-period learning cues** (`observationSummary` / `teacher_observations`) plus **standing snapshot** (`learningContextSnapshotSummary` / `learning_context_snapshot`) from **`student_school_profiles`** + **`learning_goals`** when period-bound data is thin — sanitised, **not** the MVP classroom **`observations`** table, class memory **captions**, staff evidence-link snapshots; **worksheet OCR** remains a placeholder — see **`docs/ai-evidence-pipeline-readiness-plan.md`**.

**Monthly sample proof status:** A safe manual proof runbook exists at `docs/monthly-report-uat-sample-proof.md`. Current automated smoke validates lifecycle + parent-release visibility but archives created report rows during cleanup, so it is not a persistent showcase artefact.

**Guided teacher observation tasks:** Planned structured **per-student Monthly Learning Observation** rubric (rating + evidence-based observation + next action) and naming boundary (**Observation** internal vs **Teacher Feedback** parent-facing) — `docs/guided-teacher-observation-tasks-plan.md`. Proposed schema + RLS + task typing plan: `docs/monthly-learning-observation-schema-rLS-plan.md`. Not yet persisted in DB or wired to aggregation; MVP **`observations`** table remains teaching-quality, not student-scoped.

**Status category:** **UAT ready** (internal tenant); **Needs legal/compliance before parent pilot** (AI disclosures, retention); **Not production ready** for automated PDF/email distribution.

---

### 4. Homework

| Topic | Notes |
|-------|--------|
| Assignment / submission / upload | Smokes: upload, feedback, assignment write, etc. |
| Feedback release | Release-gated parent visibility |
| Teacher-marked files | Staff paths; parent after release |
| AI / OCR readiness | `docs/homework-ai-marking-readiness-plan.md` — OCR/provider deferred |

**Status category:** **UAT ready** (with fixture alignment notes for supervisor scope **CHECK** lines); **Not production ready** for OCR/real vision pipelines without DPIA/provider contracts.

---

### 5. Parent communication / memories / announcements

| Topic | Notes |
|-------|--------|
| Parent updates | Teacher flows |
| Class memories | **Class-targeted** — regression guard |
| Release / approval | Required before parent-visible narratives |
| Parent announcements / centre updates | Phase foundations per SQL/docs |

**Status category:** **Internal prototype ready** / **Needs polish before staff pilot** (operator clarity); **Needs legal/compliance before parent pilot** (media consent, publicity).

---

### 6. Payments / fee proof

| Topic | Notes |
|-------|--------|
| Request / verify / reject | Flows covered in readiness reviews |
| Notifications | In-app patterns; templates foundations |
| E-invoice / PDF | **Deferred** per multiple readiness docs |

**Status category:** **Needs polish before staff pilot**; **Not production ready** for statutory e-invoicing or automated billing without provider/policy work.

---

### 7. Notifications / templates / preferences

| Topic | Notes |
|-------|--------|
| In-app notifications | Foundation + smokes |
| Parent inbox / routing | ParentView patterns |
| Templates admin | HQ governance |
| Preferences / RPC enforcement | SQL foundations + enforcement scripts |
| Email / SMS | **Globally deferred** as product channels in v1 docs |

**Status category:** **UAT ready** (in-app); **Needs legal/compliance before parent pilot** for marketing vs operational messaging (`docs/email-notification-consent-preferences-readiness-plan.md` related themes).

---

### 8. Student / guardian linking

| Topic | Notes |
|-------|--------|
| Student profile foundation | `/students` shell, learning notes boundary |
| Guardian link visibility | Read-only strip for HQ/supervisor |
| Parent onboarding plan | Staff-mediated linking |
| Guardian management plan | **Write path planning only** — no RPC/write UI yet |

**Status category:** **Internal prototype ready** for visibility; **Not production ready** for operational guardian onboarding until **writes + audit** ship.

---

### 9. Security / RLS / audit

| Topic | Notes |
|-------|--------|
| `audit_events` | Append-only foundation |
| Notification delivery logs | Staff-only visibility expected |
| Parent boundaries | Draft/internal content blocked by product+RLS intent |
| Roles | HQ, supervisor, teacher, parent scoped |
| Service-role frontend | **Forbidden** by project rules — maintained |

**Status category:** **UAT ready** on test project **if** migrations match repo intent; **Not production ready** without **external security review** of deployed policies vs draft files.

---

### 10. DevOps / deployment readiness

| Topic | Notes |
|-------|--------|
| Staging vs prod split | Checklist explicitly notes gap |
| Monitoring / logging | Not fully specified for prod |
| Backups / restore | Runbook gap |
| Migration apply process | Developer-led today |
| CI / tests | Many `npm run test:supabase:*` scripts; not all routes covered |
| Fixture hygiene | Homework smoke CHECK for branch alignment documented |

**Status category:** **Not production ready.**

---

## Part C — Status categorisation by domain

| Domain | Internal prototype | UAT ready | Staff pilot polish | Legal/compliance (parent) | Production |
|--------|-------------------|-----------|---------------------|---------------------------|------------|
| Auth / session governance | Yes | Yes | Minor | Yes | No |
| Parent portal | Yes | Partial | Yes | Yes | No |
| AI Parent Reports | Yes | Yes | Yes | Yes | No |
| Homework | Yes | Yes* | Yes | Yes | No |
| Parent comm / memories | Yes | Partial | Yes | Yes | No |
| Payments / fee proof | Partial | Partial | Yes | Yes | No |
| Notifications stack | Yes | Yes (in-app) | Yes | Yes | No |
| Guardian linking | Partial (read) | Partial | Yes (ops clarity) | Yes | No |
| Security / RLS / audit | Yes (prototype) | Conditional | Yes | Yes | No |
| DevOps | Partial | No | Yes | N/A | No |

\*Fixture alignment for multi-role homework smoke may show **CHECK**, not failure.

---

## Part D — Production gap list

### Legal / compliance / Malaysia context

- **Policy pack** missing for production: privacy notice, retention, subprocessors, breach process.
- **Malaysia PDPA**: lawful basis documentation, data subject rights process, cross-border transfer assessment if using non-MY hosting/providers.
- **Child data**: parental authority, minimum necessary collection, school vs tuition-centre context clarity.
- **Media / photos**: consent for class memories and parent-visible assets.
- **Email / marketing vs operational**: consent logging aligned with preferences foundations.

### Environment / operations

- **Staging / production** project split and promotion discipline.
- **Backups**, **restore drills**, **RPO/RTO** targets.
- **Monitoring**, **alerting**, **incident runbook**, **on-call**.
- **Support/admin runbook** for guardian linking and account recovery **without** unsafe shortcuts.

### Product / engineering

- **Guardian link writes** (RLS or SECURITY DEFINER RPC) + **audit events** — see `docs/guardian-link-management-readiness-plan.md`.
- **Invite-code flow** — deferred; must be time-limited and auditable.
- **Email / e-invoice provider** integration — deferred.
- **PDF generation/storage/download** policy — deferred.
- **OCR / AI homework marking provider** — deferred (`docs/homework-ai-marking-readiness-plan.md`).
- **Automated smokes**: ParentView route assertions; guardian link lifecycle; expanded parent non-release RLS proofs.

### Data / QA hygiene

- **Fixture cleanup** discipline for shared Supabase test projects.
- **Branch alignment** for multi-role smokes (homework supervisor CHECK).

---

## Part E — Recommended next ten milestones (ordered)

Adjusted for current audit: **evidence and governance before risky channels.**

1. **Full UAT + screenshot evidence pass** — complete `docs/manual-walkthrough-execution-guide.md` with archived artefacts.
2. **Production readiness issue triage** — convert Part D gaps into tracked issues with owners (security, legal, ops).
3. **Staging / prod split plan** — Supabase projects, secrets, migration promotion, rollback.
4. **Legal / compliance policy pack** — PDPA-aligned privacy notice, child/media consent, DPIA-lite for AI features.
5. **Guardian link write / RPC design** — finalize RLS or definer RPC contract (`guardian-link-management-readiness-plan.md`).
6. **Staff guardian link management implementation** — HQ/supervisor UI + audit events only after policy sign-off for pilot tenant.
7. **Parent invite / linking journey** — optional token flow **after** staff-mediated baseline is stable.
8. **PDF / export policy + implementation** — AI reports and homework artefacts under retention rules.
9. **Email / e-invoice provider foundation** — transactional first; marketing gated on consent records.
10. **AI homework OCR / marking pipeline** — provider selection, DPIA, teacher-release gates.

---

## What must not be launched yet

- Real **parent/family production** marketing or enrolment claiming full compliance.
- **Automated email/SMS** as commitment-bearing channels without consent and provider readiness.
- **Guardian self-link** or **teacher guardian edits**.
- **Production billing/e-invoice** without statutory review.

---

## What can be shown in an internal demo

- End-to-end flows on **test tenants** with synthetic users.
- AI drafts, homework uploads, notifications — with clear **“not legal/production”** framing.

---

## What can be used for a staff-only pilot

- Teacher/HQ workflows on **controlled** centres with **written** pilot rules (no real parent promises).
- Parent portal **only** with **explicit** participant consent to prototype terms and **no** sensitive production child data without DPIA signoff.

---

## What requires legal review before real parent use

- Any production tenant holding **identifiable minors** and **family contact data**.
- **Photos/media** in memories or announcements.
- **AI-generated** content shown to parents.
- **Cross-border** AI or storage providers.

---

## References

- `docs/project-master-context-handoff.md`
- `docs/validation-uat-readiness-checklist.md`
- `docs/manual-walkthrough-execution-guide.md`
- `docs/ai-parent-reports-production-readiness-checkpoint.md`
- `docs/ai-evidence-pipeline-readiness-plan.md`
- `docs/homework-ai-marking-readiness-plan.md`
- `docs/parent-onboarding-student-linking-readiness-plan.md`
- `docs/guardian-link-management-readiness-plan.md`
- `docs/email-notification-consent-preferences-readiness-plan.md` (if present)
- Session governance milestone checkpoint (referenced in handoff)

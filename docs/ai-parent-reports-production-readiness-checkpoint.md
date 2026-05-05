# AI Parent Reports — production readiness checkpoint

Date: 2026-05-06  
Type: internal prototype / SaaS readiness notes (documentation + UX copy alignment)

**Evidence pipeline detail:** `docs/ai-evidence-pipeline-readiness-plan.md` — which sources feed `collectAiParentReportSourceEvidence`, placeholders, and monthly-report gaps.

---

## Current capability (internal prototype)

- **Staff shells:** HQ / supervisor / teacher can create and list AI parent report rows (Supabase + RLS) when authenticated.
- **Evidence preview:** Staff see a **Source Evidence Preview** built from aggregates (fake mode in demo URL; RLS-backed reads when configured). Text is sanitized to avoid leaking storage URLs or secrets into provider-bound payloads where enforced.
- **Drafts:**
  - **Mock / test draft:** deterministic staff-only draft for UI and persistence tests.
  - **Real AI draft:** Edge function `generate-ai-parent-report-draft` with user JWT — gated by Supabase/session and server flags (`provider_disabled`, `provider_not_configured`, etc.). No keys in browser.
- **Lifecycle:** Submit for review → Approve → **Release to parents** (explicit). Archive supported. Teacher approval / release semantics remain mandatory — **no auto-release**.
- **Parent visibility:** Parents load `listAiParentReports({ status: 'released' })` and filter by linked child — **draft and in-flight statuses are staff-only by product path + DB RLS**.
- **In-app notifications:** `releaseAiParentReport` calls `notifyLinkedParentsAfterAiParentReportRelease` — **guardian-facing in-app** notice after release (preference-aware). **Email/SMS/push are not wired in v1.**
- **Printable preview (parent):** On-screen HTML layout preview of **released** content only; **no PDF binary** generated or stored for families yet.
- **Internal staff PDF HTML:** Debug/staff preview route (`/ai-parent-report-pdf-preview`) remains separate from guardian portal.

---

## Evidence that currently feeds aggregates (today)

Handled in `collectAiParentReportSourceEvidence` / related reads (availability depends on RLS and seeded data):

- Attendance-oriented summary (aggregate text, not raw PII dumps)
- Homework assignments / submissions summary
- Lesson / curriculum assignments context where linked
- Class memories list (summaries — not raw asset URLs into provider payloads)
- Parent communication / weekly-style sources where present
- School / curriculum / learning context reads where configured
- Manual evidence links on the report (`ai_parent_report_evidence_links`) for staff-visible classification

Synthetic **fake** items still appear in demo/offline previews for pipeline testing.

---

## Evidence that should feed AI reports later (planning lane)

Not a commitment to automate all of these in one sprint — **teacher review remains mandatory**:

- Full **attendance summary** roll-ups by period/class policy
- **Homework feedback** lines after teacher release semantics
- **Observations / learning notes** — only when explicitly flagged safe and staff-approved for inclusion
- **Class memories** — captions/themes only unless media policy expands
- **Parent communication history** — released-thread summaries only  
- Structured **billing / medical** domains remain **explicitly out of scope** unless a future policy gate exists

Guardrails to keep:

- **Teacher/HQ approval** before any guardian-facing wording is fixed.
- **Explicit release** to parents — no silent or scheduled auto-publish in v1.
- **Sanitisation** of URLs, tokens, internal paths before any outbound provider call.

---

## Not production yet

- Formal **PDF artefact** for guardians (generation, storage signing, retention policy).
- **Email / Gmail / SMS** delivery of report links or attachments.
- **Full evidence parity** vs live centre data (many sources still placeholders or sparse).
- **Legal/compliance** sign-off and privacy DPIA-class review for minors’ data via LLM.

---

## UAT regression guard list (maintain across milestones)

Tracked in `docs/manual-walkthrough-execution-guide.md` and `docs/validation-uat-readiness-checklist.md`:

1. `/students` must not blank/crash.  
2. `/parent-updates` Class Memory: class populated or clear empty state.  
3. ParentView notifications: top **3** + View more / less.  
4. Parent Settings: **no** Account Security / Active Sessions.  
5. HQ `/session-review` remains routed.  
6. Parent sidebar active state follows scroll order.  
7. Sign out must not navigate to `/api/apps/auth/logout`.  
8. Keep-me-signed-in must not wrongly sign users out.  
9. Class memories remain class-targeted.  
10. No parent exposure of drafts/internal evidence.

---

## Next recommended milestone

1. Operational **staging** checklist (env separation, backups, observability touchpoints — docs-level if infra not ready).
2. **PDF** MVP design only: storage bucket policy sketch + legal retention note (no behavioural change until approved).
3. Expand **integration tests or smoke** for parent read path on `released`-only reports (beyond staff smokes).

---

## SaaS discipline (unchanged)

- Parent UX: warm, minimal jargon.  
- Teacher UX: guided lifecycle and obvious “staff-only draft” cues.  
- HQ tools powerful; **do not mirror** HQ session/security surfaces on ParentView.

# Manual Walkthrough Execution Guide

Date: 2026-05-05  
Type: docs-only operator guide (no code/SQL/RLS changes)

Audience: beginner operator / internal validator

Goal: execute a full manual walkthrough of the current validation-ready internal prototype and capture clear pass/fail evidence.

**Readiness context:** For **overall** internal vs UAT vs production posture, compliance gates, and recommended milestone order, see **`docs/production-readiness-audit.md`**.

---

## 1) Before starting

1. Open Terminal.
2. Run:
   - `cd ~/Desktop/enrichify-class-flow`
3. Confirm repository state:
   - `git status -sb`
4. Start local app:
   - `npm run dev`
5. Open the local app URL in browser (typically `http://localhost:5173` unless Vite prints a different port).
6. Use **Chrome** for consistency.
7. Open DevTools only when needed (network/debug checks), not by default.
8. Use **real mode** unless `demoRole` is explicitly requested for a specific check.

### UAT retest discipline (SaaS production quality)

Before asking a human validator to retest a changed area, the implementer should **specifically verify** each affected route or flow using:

- **Code-path diagnosis** — identify the failing render/hook/data shape and the minimal fix.
- **Build / lint / typecheck** — `npm run build`, `npm run lint`, `npm run typecheck`.
- **Relevant automated smokes** — when a script exists for the touched surface, run it before handoff.
- **Route-specific verification note** — short written record of what was checked (e.g. `/students` opened with teacher who has students with and without school profile rows).

**Product posture (v1):**

- Parent UX should stay warm and simple.
- Teacher UX should stay guided (clear empty states, scoped actions).
- Technical, security, or admin features should not surface to parents unless clearly needed for the parent job-to-be-done.
- Legal/compliance review remains required before any real parent rollout.

**UAT regression guard list (maintain across milestones)** — `/students`; Class Memory selector; notifications (3 + expand); Parent Settings scope; **`/session-review`**; sidebar active order; logout URL; keep-signed-in sanity; class-targeted memories; no parent drafts/evidence.

**AI Parent Reports note:** Capability and deferrals summarised in `docs/ai-parent-reports-production-readiness-checkpoint.md`.

**Homework upload smoke:** If automated `homework:upload` logs supervisor **CHECK** “fixture scope”, verify parent and supervisor test users target the **same branch** per `docs/homework-upload-smoke-fixture-stability-checkpoint.md` — do not treat as an app defect without confirming RLS intent.

---

## 2) Accounts / roles needed

Prepare these test accounts:

- HQ admin
- Teacher
- Parent linked to student `55555555-5555-5555-5555-555555555555`
- Optional student account (for additional RLS checks)

Credential note:

- Credentials are expected from `.env.local` / test fixture docs.
- Do **not** print or share secrets in notes/screenshots.

---

## 3) Walkthrough Flow A: HQ / Staff setup

1. Sign in as HQ admin.
2. Confirm sidebar shows correct role context.
3. Open **`/students`** and confirm each student card shows **Guardian link** read-only status (linked / not linked / unavailable per role and environment); confirm **no** parent self-link or edit controls; confirm policy footnote (**Linking parents to students is managed by HQ or Branch Supervisors.**). Planning reference for future staff writes: `docs/guardian-link-management-readiness-plan.md`.
4. Open **Session Review**.
5. Open **Message Templates** (Announcements > template section).
6. Open **AI Parent Reports** page.
7. Capture screenshots for:
   - HQ dashboard/sidebar role context
   - Session Review page
   - Message Templates section
   - AI Parent Reports landing/shell

---

## 4) Walkthrough Flow B: AI Parent Report

**Evidence pipeline reference:** `docs/ai-evidence-pipeline-readiness-plan.md` (what aggregates today vs placeholders).  
**Sample-proof runbook:** `docs/monthly-report-uat-sample-proof.md` (one clean released sample for screenshots).

Optional helper for persistent sample setup (manual-only): `ALLOW_UAT_SAMPLE_WRITE=1 npm run uat:ai-parent-report:sample`.  
Do not run this in CI/normal smoke loops.
Read-only finder (safe anytime): `npm run uat:ai-parent-report:find-sample` to locate existing `[UAT_SAMPLE]` report rows and print ParentView screenshot URL(s).

1. Create/open a report shell in AI Parent Reports.
2. Open **Source Evidence Preview** — confirm attendance/homework/parent-comms/curriculum/memories behave as expected for your tenant; confirm **Released homework feedback** reflects released-to-parent rows only (or warm empty state); confirm the **Learning context** card shows **(1) report-period** cues and **(2) learning context snapshot** when the reporting window is narrower than profile/goal timestamps (snapshot is **staff-only** drafting background — not “this month” proof for parents). Optional: `npm run test:supabase:ai-parent-report:observation-evidence`. Confirm **worksheet OCR** remains deferred (not silent automation).
3. Generate **mock** draft (always available). Optionally generate **real** Edge draft only when signed-in staff + environment allows provider — skip if quota or policy unclear.
4. Confirm draft appears only in staff flow (status labels readable: Draft → review → Approved → Released).
5. Run submit/approve/release flow according to current product path.
6. Confirm staff Lifecycle copy aligns with behaviour: **Release** controls parent visibility and may enqueue **in-app** guardian notice — **email/SMS and PDF binary are deferred** in v1.
7. Capture staff screenshots for source evidence, draft, and release steps.
8. Sign in as parent and confirm:
   - **Progress Reports** empty state (if none released) explains reports appear only after staff release.
   - released/current report is visible when a release exists.
   - draft/internal content is not visible.
   - **Open printable layout** works for released report (browser layout preview — not a downloadable PDF).
   - Chrome print preview check: Paper size **A4**, scale **100%**, margins default; verify page layout remains credible for screenshot evidence.
9. Archive **one** screenshot set for UAT evidence (`docs/uat-evidence-log-template.md` naming convention) and log outcomes in `docs/uat-evidence-log-2026-05-06.md`.

**Planning reference:** `docs/ai-evidence-pipeline-readiness-plan.md`

---

## 5) Walkthrough Flow C: ParentView

1. Sign in as parent.
2. Confirm first-login acknowledgement gate appears where applicable.
3. Open **`/parent-view`** **without** `?student=` — confirm warm **no child linked yet** copy (centre links profiles; contact centre if wrong; no technical IDs, no class picker, no create-student action).
4. (Optional negative check) Open **`/parent-view?student=`** with a UUID the parent is **not** linked to — confirm blocked message and **no** exposure of that student’s data.
5. Open ParentView for linked child (normal path: **`?student=`** matching **`guardian_student_links`** / centre-provided link).
6. Validate released report visibility.
7. Validate notification inbox and unread behavior.
8. Validate notification action routing.
   - For a report-release notification, tap **View report** and confirm it opens the exact released report when action target fields are available.
   - If the report target is unavailable, confirm the fallback message appears: report no longer available or not released for this child.
   - Confirm no internal metadata/evidence is shown in the notification row; only safe section/action behavior is exposed.
   - Optional pre-check: run `npm run test:supabase:notification-action-routing` to confirm exact-target URL/report assertions before manual UI pass.
9. Validate communication settings load/save.
10. Confirm **Settings** shows **Communication & Notification Settings** only (no Account Security / Active Sessions for parents).
11. Confirm the notification list shows **three** items by default when more exist, with **View more** / **View less**; repeat with `?debug=1` if you need to see suppressed smoke/fixture copy (still no internal metadata).

---

## 6) Walkthrough Flow D: Homework

1. As staff/teacher, open **`/homework`** and confirm page copy stresses **privacy until release**, **mock AI only** (no OCR), and **no auto-notification** from drafts.
2. Execute parent upload / teacher review / **share feedback** and (if used) **share marked work** when your role permits.
3. Confirm optional **Draft feedback with AI (mock)** only prefills text from context summaries—not from reading submitted files—in this build.
4. As parent, confirm uploads are described as staying with centre staff until review; teacher feedback/marked sheets appear **only after release**.
5. Confirm related **in-app** notification behaviour when feedback is released (email/SMS still deferred globally).

Planning reference: `docs/homework-ai-marking-readiness-plan.md`.

---

## 7) Walkthrough Flow E: Attendance

1. In staff flow, mark absent first if needed for test progression.
2. Mark present/late for target student.
3. As parent, confirm arrival-related notification behavior.

---

## 8) Walkthrough Flow F: Parent Communication

1. Create/review/release parent communication update in staff flow.
2. As parent, confirm notification appears for released update.

---

## 9) Walkthrough Flow G: Fee / payment proof

1. Trigger payment proof request.
2. Process proof verify/reject path.
3. As parent, confirm messages for:
   - proof requested
   - proof verified or rejected

---

## 10) Walkthrough Flow H: Security / RLS spot checks

Perform direct role checks:

- Parent cannot see drafts.
- Parent cannot see evidence/internal refs.
- Teacher cannot access HQ Session Review.
- Student cannot write staff fields.
- Delivery logs are not parent-readable.

If any of the above fails, treat as high-priority validation defect.

---

## 11) Screenshot checklist

Capture at least one clear screenshot for each:

- Staff create/release report
- Parent released report visibility
- Notification inbox
- Notification settings
- First-login acknowledgement gate
- HQ Session Review (staff)
- `/students` (teacher/HQ — list + expanded profile card; optional `?debug=1` on error boundary dev detail only)
- Payment proof request flow
- Homework feedback release flow
- Attendance arrival notification flow

For each screenshot, record:

- role/account used
- page/flow name
- timestamp
- short expected-vs-actual note

---

## 12) Pass/fail record format

Use the following per flow item:

- **Expected result:** what should happen
- **Actual result:** what happened
- **Screenshot captured?:** yes/no + filename
- **Bug/notes:** concise issue summary
- **Severity:** blocker / major / minor / polish

Simple template:

- Flow:
- Expected:
- Actual:
- Screenshot:
- Bug/notes:
- Severity:

---

## 13) Stop conditions

Stop walkthrough and report immediately if any occurs:

- Parent sees draft/internal report content.
- Parent sees another child’s data.
- Teacher can access HQ-only page.
- Session/sign-out behavior is broken.
- Notification sends sensitive content unexpectedly.
- Release action bypasses expected review flow unexpectedly.

---

## 14) After walkthrough

1. Collect all screenshots in one evidence folder.
2. List blockers first (separate from non-blockers).
3. Create fix prompts/tickets for blockers first.
4. Do not begin new feature lanes until walkthrough blockers are cleared.

---

## 15) UAT polish checks (2026-05-06)

Use this quick pass during ParentView checks:

1. Sign out from the sidebar in real mode.
2. Confirm logout returns to `/login` and does not open `/api/apps/auth/logout`.
3. Confirm parent sidebar includes **Settings**.
4. Open **Settings** and verify:
   - Communication & Notification Settings appear there.
   - Account Security / Active Sessions **do not** appear for parents in v1 (HQ **Session Review** remains the staff surface for operational session governance).
5. Open Class Memories in real parent mode with no released items:
   - confirm warm empty state appears,
   - confirm no demo/fake wording is shown.
6. Check Notification Settings category label:
   - **Class memories**
   - subtitle: **Photo updates from your child’s class.**
7. Check parent announcements empty state:
   - **Centre updates will appear here when your centre shares an announcement.**
8. Reconfirm safety boundaries:
   - no email/SMS/push behavior,
   - no chat/reply UI,
   - no draft/internal/evidence exposure.
9. Confirm parent information architecture:
   - landing feels content-first (updates, memories, notifications, quick access),
   - Settings is communication preferences only in v1 parent portal (no Active Sessions / account security card for parents),
   - HQ Session Review page remains available for operational session governance.
10. Confirm class-memory targeting guardrail text:
   - parent sees only released memories for linked child/class,
   - no branch-wide memory feed is exposed by default.
11. Confirm enrollment/class-linking product rule in walkthrough notes:
   - staff/HQ stays source-of-truth for class assignment,
   - parent links to existing student record rather than defining class membership.
12. Confirm `/students` route behavior:
   - page renders with loading/error/empty states (never blank white page),
   - teacher/HQ student cards still render when data is available,
   - **school profile absent** for a UUID student must not crash the School / Learning Context card (nullable `schoolProfile` guarded; empty state instead of dereferencing null),
   - TanStack Query arrays are normalised (avoid `null` data breaking `.map` / `.filter`),
   - a local error boundary catches unexpected render failures instead of a full white screen (`?debug=1` surfaces message/stack for internal UAT only),
   - parent-facing `ParentView` avatar does not assume `student.name[0]` exists (use `full_name` fallback).
13. Confirm notifications list behavior:
   - default shows **three** recent relevant items (`PARENT_NOTIFICATION_DEFAULT_VISIBLE`),
   - View more / View less expands/collapses the filtered list,
   - smoke/fixture-like copy stays hidden in normal mode; operational phrases (payments, homework/feedback, attendance, reports, class updates/communication, etc.) are **not** classified as smoke; use `?debug=1` to include smoke/fixture rows for QA.
14. Confirm keep-me-signed-in behavior:
   - checked preference survives refresh/new tab without browser-session marker dependency,
   - manual sign out still clears active session as expected.
15. Confirm warmth polish:
   - parent updates, memories, and notifications use subtle warm accent styling (not flat/cold).
16. Confirm student profile ownership boundaries:
   - `/students` shows student profile detail foundation when opening a card,
   - ownership copy reads: "Official profile, class, branch, and guardian links are managed by HQ or Branch Supervisors."
17. Confirm teacher learning-notes posture:
   - teacher can navigate to existing learning evidence modules from student detail,
   - learning-notes copy states internal staff evidence and parent visibility only through approved report/released communication.
18. Confirm class memory targeting UX:
   - class is selected in the Class Memory card before submit,
   - if `listClasses` is empty for the signed-in teacher but RLS still returns students, inferred class options appear from visible students’ `class_id`,
   - if no classes can be inferred, the empty-state message explains asking HQ/supervisor,
   - helper copy states memory is shared only with parents linked to that class after approval.
19. Confirm parent homework list control:
   - filter applies first, then list shows only recent default rows,
   - View more / View less toggles the filtered result set.
20. Confirm parent settings sectioning:
   - settings shows grouped headings (service updates, optional updates),
   - optional categories can be expanded without hiding required communication controls,
   - no parent “Active Sessions” / technical session history UI in v1 (deferred; HQ Session Review unchanged).
21. Confirm parent sidebar highlight behavior:
   - active item follows DOM order: Dashboard → Updates → Attendance → Homework → Reports → Settings (scroll intersection by section top offset; no random ratio tie-break),
   - hash-based anchors (including `latest-report` → reports) still behave.
22. Confirm ParentView vertical order matches sidebar intent:
   - main scrollable sections follow: overview, updates, attendance, homework, progress reports, then secondary blocks, then settings last.
23. Confirm parent linking boundary:
   - parent links to existing student record only,
   - class assignment remains staff-owned (no parent self-assignment).
24. Confirm homework AI marking readiness posture:
   - **`/homework`** explains mock AI drafting (no file OCR yet) and marked-work release rules,
   - parent homework section copy matches privacy-after-upload expectations,
   - see `docs/homework-ai-marking-readiness-plan.md` for architecture/future OCR notes.
25. Parent linked-child resolution sanity:
   - parent with one linked child can open `/parent-view` without manually adding `?student=`.
   - multi-child selector workflow remains deferred (centre-managed linkage still applies).

---

## Recommended operating sequence

Run flows in this order for consistency:

1. Flow A (HQ setup)
2. Flow B (AI report)
3. Flow C (ParentView)
4. Flow D (Homework)
5. Flow E (Attendance)
6. Flow F (Parent communication)
7. Flow G (Fee/proof)
8. Flow H (Security/RLS spot checks)


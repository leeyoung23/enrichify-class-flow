# Manual Walkthrough Execution Guide

Date: 2026-05-05  
Type: docs-only operator guide (no code/SQL/RLS changes)

Audience: beginner operator / internal validator

Goal: execute a full manual walkthrough of the current validation-ready internal prototype and capture clear pass/fail evidence.

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
3. Open **Session Review**.
4. Open **Message Templates** (Announcements > template section).
5. Open **AI Parent Reports** page.
6. Capture screenshots for:
   - HQ dashboard/sidebar role context
   - Session Review page
   - Message Templates section
   - AI Parent Reports landing/shell

---

## 4) Walkthrough Flow B: AI Parent Report

1. Create/open a report shell in AI Parent Reports.
2. Generate a real AI draft (if provider is configured in environment).
3. Confirm draft appears in staff flow.
4. Run submit/approve/release flow according to current product path.
5. Capture staff screenshots for draft and release steps.
6. Sign in as parent and confirm:
   - released/current report is visible
   - draft/internal content is not visible

---

## 5) Walkthrough Flow C: ParentView

1. Sign in as parent.
2. Confirm first-login acknowledgement gate appears where applicable.
3. Open ParentView for linked child.
4. Validate released report visibility.
5. Validate notification inbox and unread behavior.
6. Validate notification action routing.
7. Validate communication settings load/save.
8. Open Active Sessions card.
9. End old own session if available (non-current active row).

---

## 6) Walkthrough Flow D: Homework

1. As staff/teacher, create or open homework path.
2. Execute parent upload / teacher feedback / release flow.
3. As parent, confirm:
   - released feedback visibility
   - related notification appears

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
- Active Sessions card
- HQ Session Review
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
   - Account Security / Active Sessions appear there.
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
   - Settings remains a dedicated destination for communication + account security.
10. Confirm class-memory targeting guardrail text:
   - parent sees only released memories for linked child/class,
   - no branch-wide memory feed is exposed by default.
11. Confirm enrollment/class-linking product rule in walkthrough notes:
   - staff/HQ stays source-of-truth for class assignment,
   - parent links to existing student record rather than defining class membership.
12. Confirm `/students` route behavior:
   - page renders with loading/error/empty states (never blank white page),
   - teacher/HQ student cards still render when data is available.
13. Confirm notifications list behavior:
   - default shows limited recent items,
   - View more / View less toggle works,
   - smoke-test notification copy is hidden in normal mode and visible in debug mode.
14. Confirm keep-me-signed-in behavior:
   - checked preference survives refresh/new tab without browser-session marker dependency,
   - manual sign out still clears active session as expected.
15. Confirm warmth polish:
   - parent updates, memories, and notifications use subtle warm accent styling (not flat/cold).

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


# Validation / UAT Readiness Checklist

Date: 2026-05-05  
Type: docs-only validation checklist (no code/SQL/RLS/runtime changes)

Use this checklist for manual walkthrough validation by internal reviewers, staff pilot validators, and readiness stakeholders.

---

## 0) UAT retest discipline (implementer checklist)

Before asking someone to rerun manual UAT on a touched surface:

- [ ] Code-path diagnosis for each affected route (render path, data shape, empty states).
- [ ] `npm run build`, `npm run lint`, `npm run typecheck`.
- [ ] Any relevant automated smoke scripts in `package.json` for that area.
- [ ] Short route-specific verification note captured (what was exercised and expected outcome).

**Product posture:**

- Parent experience: warm and simple by default.
- Teacher experience: guided flows and clear scoped actions.
- Do not expose technical/security/admin UI to parents unless needed for their task.
- Legal/compliance approval still gates real parent rollout.

### UAT regression guard list (repeat every milestone)

Spot-check quickly before sign-off:

- [ ] **`/students`** loads for teacher/HQ — no Students error boundary in normal fixtures.
- [ ] **`/parent-updates`** Class Memory class selector populated when teacher has classes, or HQ copy when none.
- [ ] ParentView notifications — **three** rows default + View more / less; operational rows not hidden as smoke in normal mode.
- [ ] Parent Settings — Communication & Notification only (no Active Sessions).
- [ ] **`/session-review`** still reachable as HQ route.
- [ ] Parent sidebar highlight follows viewport section order.
- [ ] Sidebar sign-out does not open **`/api/apps/auth/logout`** (Supabase-first sign-out path).
- [ ] Keep-me-signed-in behaves (refresh/new tab sanity).
- [ ] Class memories remain class-scoped in teacher upload copy and parent visibility.
- [ ] Parents see no draft AI report / internal evidence (Progress Reports lists **`released`** only).

---

## 1) Pre-validation setup

- [ ] Confirm branch is `cursor/safe-lint-typecheck-486d`.
- [ ] Confirm expected checkpoint commit (or newer approved checkpoint) is checked out.
- [ ] Start local app (`npm run dev`) and confirm app loads without startup errors.
- [ ] Confirm linked Supabase project/environment is the intended test project.
- [ ] Confirm test accounts exist for:
  - HQ admin
  - branch supervisor
  - teacher
  - parent
  - student
- [ ] Confirm validator understands:
  - `demoRole` mode is preview-only
  - real-mode validation requires authenticated Supabase session
- [ ] Do not use real parent/family data unless explicitly approved.
- [ ] Legal/compliance review remains required before any real parent rollout.

---

## 2) Staff / HQ walkthrough

### Session and auth baseline

- [ ] Staff/HQ login works in real mode.
- [ ] Manual sign-out works and returns to login.
- [ ] Remember-me checked/unchecked behavior is observable.
- [ ] Timeout awareness is confirmed (including expiry redirect messaging).

### HQ governance checks

- [ ] HQ can open Session Review page.
- [ ] HQ can view session rows with role/status filters.
- [ ] HQ can revoke active teacher/branch-supervisor sessions.
- [ ] HQ cannot revoke current own browser session in current v1 UI.

### AI Parent Reports flow

- [ ] Open AI Parent Reports shell/page.
- [ ] Status badges read as **Draft / Teacher review / Supervisor review / Approved / Released / Archived** (not raw snake_case).
- [ ] Lifecycle copy matches behaviour: guardians may receive **in-app** notice **after Release** only; email/SMS/PDF deferred.
- [ ] Generate real AI draft.
- [ ] Submit / approve / release report flow works.
- [ ] Confirm parent sees only released/current report.
- [ ] Confirm parent does not see draft/internal references/evidence links.

### Notification admin and governance

- [ ] HQ can access notification template admin UI.
- [ ] Template edits save for HQ.
- [ ] Non-HQ cannot edit templates.

---

## 3) Parent walkthrough

- [ ] First-login acknowledgement gate appears where required.
- [ ] ParentView opens for linked child in real mode.
- [ ] Notification inbox renders with unread indicator behavior.
- [ ] Dashboard notification preview limits to **three** items by default; **View more** / **View less** toggles expanded list when more filtered rows exist.
- [ ] Operational notification phrases (payments, homework/feedback, attendance, reports/released, communications) are visible in normal mode; smoke/fixture wording stays hidden unless `?debug=1`.
- [ ] Notification action routing opens/scrolls to expected target sections.
- [ ] Communication & notification settings load/save correctly.
- [ ] Parent portal v1: no Active Sessions / technical session history UI (deferred); HQ Session Review unchanged for staff.
- [ ] Released progress reports are visible after release only.
- [ ] Printable **layout** preview (released content) opens for parents without demo/debug-only gating — still no PDF download.
- [ ] Homework feedback is visible after release only.
- [ ] Homework uploads and unreleased drafts are **not** exposed as final feedback to parents (copy + behaviour align with centre-private review model).
- [ ] Attendance arrival notification appears when triggered.
- [ ] Payment proof request / verified / rejected messages appear when triggered.

---

## 4) Teacher walkthrough

- [ ] `/students` renders for authenticated teacher/HQ — list, expanded profile shell, homework inbox strip — without hitting the Students error boundary in normal fixture conditions (students **without** a `student_school_profile` row must not crash the School / Learning Context card).
- [ ] Parent communication release flow works.
- [ ] Homework feedback release flow works.
- [ ] **`/homework`** PageHeader + feedback panel clarify **mock AI drafting** only (metadata/context)—no OCR/vision path in-app today; marked files remain staff-only until explicitly shared.
- [ ] Attendance marking flow works.
- [ ] Notifications are created only after parent-visible release events.
- [ ] Teacher cannot access HQ-only Session Review.
- [ ] Teacher-facing UX remains simple and role-appropriate.

---

## 5) Security / RLS checks

- [ ] Parent cannot see drafts.
- [ ] Parent cannot see old/non-current report versions.
- [ ] Parent cannot see evidence links/internal refs.
- [ ] Student cannot write staff-owned records.
- [ ] Teacher cannot access HQ session review surface.
- [ ] Parent cannot see other parents' notification/session data.
- [ ] Audit events are not parent-readable.
- [ ] Notification delivery logs are not parent-readable.
- [ ] No frontend service-role usage is introduced.

---

## 6) Notification checks

- [ ] AI report release notification triggers as expected.
- [ ] Homework feedback release notification triggers as expected.
- [ ] Attendance arrival notification triggers as expected.
- [ ] Parent communication notification triggers as expected.
- [ ] Payment proof request / verified / rejected notifications trigger as expected.
- [ ] Parent preferences suppress relevant categories where configured.
- [ ] Marketing/media categories default-block unless consented.
- [ ] Notification templates are editable by HQ only.
- [ ] No email/SMS/push sending is active yet.

---

## 7) Session governance checks

- [ ] Remember-me checked and unchecked paths validated.
- [ ] Manual sign-out behavior validated.
- [ ] Timeout redirect messaging validated.
- [ ] Auth lifecycle audit events observed in expected paths.
- [ ] `auth_sessions` row is created on login.
- [ ] Heartbeat updates `last_seen_at` over time.
- [ ] `signed_out` / `timed_out` status transitions behave as expected.
- [ ] Parent self-service session list / revoke UI is deferred in parent portal v1 (no regression to `auth_sessions` or HQ Session Review).
- [ ] HQ read-only session review works.
- [ ] HQ revoke teacher/branch-supervisor active session works.

---

## 8) Known limitations / not production yet

- [ ] No email/Gmail automation yet.
- [ ] No e-invoice PDF attachment flow yet.
- [ ] No logout-all-devices yet.
- [ ] No branch supervisor session review surface yet.
- [ ] No legal/compliance signoff yet for real parent rollout.
- [ ] No finalized staging/production environment split yet.
- [ ] No finalized monitoring/backup/runbook package yet.
- [ ] No raw IP/device fingerprint telemetry by design.
- [ ] No real parent rollout until policy/legal review is complete.
- [ ] No dedicated automated smoke for **`/students`** UI in `package.json` — regressions rely on code-path review plus manual teacher/HQ verification.

---

## 9) Evidence capture checklist (screenshots)

Capture and archive screenshots for each major flow:

- [ ] Staff create/release report flow
- [ ] Parent released report visibility
- [ ] Parent notification inbox
- [ ] Parent notification settings
- [ ] Parent first-login acknowledgement gate
- [ ] Teacher/HQ `/students` list + expanded card (student with no school profile row optional)
- [ ] HQ session review page
- [ ] Payment proof request flow
- [ ] Homework feedback release flow
- [ ] Attendance arrival notification flow

Add screenshot metadata for each item:

- [ ] role used
- [ ] environment/project
- [ ] timestamp
- [ ] expected behavior observed

---

## 10) Validation decision status

Use this section as signoff gates:

- [ ] Ready for internal validator walkthrough
- [ ] Ready for staff pilot
- [ ] Ready for real parent pilot *(requires legal/compliance review first)*
- [ ] Ready for production *(requires staging/prod split, monitoring, backup, policy pack)*

Decision note:

- Internal validation can proceed now.
- Real parent pilot must wait for legal/compliance review.
- Production readiness must include environment split, monitoring/backup/runbook, and policy pack readiness.

---

## 11) UAT polish addendum (2026-05-06)

- [ ] Sidebar sign-out in real mode redirects to `/login` (no `/api/apps/auth/logout` 404).
- [ ] Demo sign-out returns to `/welcome`.
- [ ] Parent sidebar contains `Settings` entry linked to `#parent-settings`.
- [ ] Parent Settings groups communication preferences only in v1 portal (no Active Sessions card).
- [ ] Parent landing order is content-first (updates/memories/notifications/quick access before settings-heavy content).
- [ ] Parent sidebar flow stays simple: Home, Updates, Attendance, Homework, Reports, Settings.
- [ ] Real-mode Class Memories with no released rows shows warm empty state (no demo wording).
- [ ] Real-mode Class Memories copy clearly states linked-class released visibility (not branch-wide feed).
- [ ] Notification preference label uses `Class memories` with subtitle `Photo updates from your child's class.`
- [ ] Parent announcements empty state uses centre-updates placeholder wording.
- [ ] Parent homework section supports status filtering and cleaner open-detail viewing.
- [ ] `/students` route has non-blank loading, error, and empty render paths.
- [ ] `/students` normalises query list data (`null`/`non-array` safe) and has a local error boundary for unexpected render faults.
- [ ] `/students` no longer route-crashes when opening student profile details.
- [ ] Parent notifications default to limited recent rows with View more / View less controls.
- [ ] Smoke-test notification copy is hidden in normal mode and visible in debug mode.
- [ ] Keep-me-signed-in checked path survives refresh/new tab without forced marker sign-out.
- [ ] Parent landing visual style remains warm (subtle rose/violet accents) while mobile-safe.
- [ ] `/students` student card can open profile detail section safely.
- [ ] Student profile detail ownership copy says official profile/class/branch/guardian links are HQ or Branch Supervisor managed.
- [ ] Teacher learning-notes copy says notes are internal staff evidence and parent visibility only occurs through approved report/released communication.
- [ ] Student detail quick links route to attendance/homework/observations/parent communication.
- [ ] Parent Communication Class Memory card requires class selection before submit and clearly states class-linked parent targeting after approval.
- [ ] Class Memory class options include classes inferred from teacher-visible students when `listClasses` is empty but student rows expose `class_id` (no branch-wide memories).
- [ ] Parent homework section applies filter before default limit and supports View more / View less.
- [ ] Parent Settings is grouped into service updates and optional updates without hiding required controls (no parent Active Sessions).
- [ ] Parent sidebar active item follows deterministic section order while scrolling (overview → updates → attendance → homework → reports → settings).
- [ ] ParentView main section scroll order matches sidebar intent (settings last).
- [ ] Parent linking rule remains existing-student-link only (no parent class self-assignment).
- [ ] Confirm no RLS/SQL widening and no email/SMS/push or chat features were introduced.

---

## Recommended next milestone

Manual walkthrough + screenshot evidence pass, then production readiness audit.


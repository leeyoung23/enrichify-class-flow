# UAT evidence log — template

Date template version: 2026-05-06  
Purpose: capture **one full manual walkthrough** end-to-end so fixes batch after completion — **avoid tiny retest loops** between individual screenshots.

Copy this file per run (e.g. `uat-evidence-log-2026-05-06-team-alpha.md`) or duplicate the sections into your tracker.

**Companion guides:** `docs/manual-walkthrough-execution-guide.md`, `docs/validation-uat-readiness-checklist.md`, `docs/production-readiness-audit.md`.

---

## 1. Test environment details

Fill before testing starts.

| Field | Value |
|-------|--------|
| **Commit hash** | `git rev-parse HEAD` |
| **Branch** | e.g. `cursor/safe-lint-typecheck-486d` |
| **Supabase project / environment** | project ref or label (staging / internal test — **do not paste secrets**) |
| **App URL** | e.g. `http://localhost:5173` or deployed preview URL |
| **Browser + version** | e.g. Chrome 124 |
| **OS / device** | e.g. macOS 14, 1920×1080 |
| **Tester name / initials** | |
| **Date (local)** | |
| **Start time** | |
| **End time** | |
| **Real mode vs demoRole** | default **real mode** unless a flow explicitly needs `demoRole` |

---

## 2. Roles tested

Check each role exercised this run (minimum set depends on scope — **full UAT** should tick all applicable).

| Role | Tested (Y/N) | Account notes (no passwords) |
|------|----------------|-------------------------------|
| HQ Admin | | |
| Branch Supervisor | | |
| Teacher | | |
| Parent | | |
| Student | | Optional |

---

## 3. Flow evidence table

Use one row per flow step. **Screenshot naming:** suggest `YYYYMMDD-role-flowid-step.png` or link to shared drive path.

| Flow ID | Flow name | Role | Expected result | Actual result | Screenshot filename / link | Status | Notes | Follow-up issue / prompt needed? |
|---------|-----------|------|-----------------|-----------------|----------------------------|--------|-------|----------------------------------|
| AUTH-01 | Login | | | | | | | |
| AUTH-02 | Logout | | | | | | | |
| AUTH-03 | Remember me (checked / unchecked sanity) | | | | | | | |
| SESS-01 | Session timeout / expiry messaging | | | | | | | |
| SESS-02 | Active session / heartbeat (if observable) | | | | | | | | |
| HQ-01 | HQ Session Review — open, filters | HQ | | | | | | |
| HQ-02 | HQ revoke staff session (non-self) | HQ | | | | | | | |
| ACK-01 | Parent first-login acknowledgement gate | Parent | | | | | | |
| PV-01 | Parent notifications — **three** visible + View more / View less | Parent | | | | | | |
| PV-02 | Parent settings — Communication & Notification only (no Account Security / Active Sessions) | Parent | | | | | | |
| PU-01 | Parent Updates / Class Memory — class selector populated or clear empty state | Teacher | | | | | | |
| PU-02 | Parent-visible communication after release (as applicable) | Parent | | | | | | |
| AIR-01 | AI Parent Reports — create / shell | Staff | | | | | | |
| AIR-02 | Generate draft (mock or real per env) | Staff | | | | | | |
| AIR-03 | Review / approve / release path | Staff | | | | | | |
| AIR-04 | Parent — released report only; printable layout preview | Parent | | | | | | |
| HW-01 | Homework upload / submission (role-appropriate) | | | | | | | |
| HW-02 | Teacher review / feedback release to parent | | | | | | | |
| ATT-01 | Attendance — arrival-related notification where triggered | Parent | | | | | | |
| PCOMM-01 | Parent communication — release to parent | Staff → Parent | | | | | | |
| FEE-01 | Fee proof — request / verify / reject + parent messaging | | | | | | | |
| STU-01 | `/students` — profile shell; School/Learning context no crash without school profile row | Teacher/HQ | | | | | | |
| STU-02 | Guardian link visibility strip (policy footer; HQ/supervisor detail vs teacher unavailable as expected) | | | | | | | |
| LINK-01 | Parent **no linked child** — warm blocked state; contact centre; no class picker | Parent | | | | | | |
| SEC-01 | Parent cannot see drafts / internal AI homework internals / evidence links | Parent | | | | | | |
| SEC-02 | Parent cannot see another family’s child data | Parent | | | | | | |
| SEC-03 | Teacher cannot access HQ Session Review | Teacher | | | | | | |
| SEC-04 | Notifications do not leak sensitive internal payloads to wrong role | | | | | | | |

**Status column — allowed values:** `Pass` | `Blocker` | `Major` | `Minor` | `Polish`

_Add rows if your walkthrough adds flows; keep Flow IDs stable within this log file._

---

## 4. Required flows (checklist)

Quick coverage check — align with Section 3 rows.

- [ ] Login / logout / remember me  
- [ ] Session timeout / active session behaviour (as visible in UI)  
- [ ] HQ Session Review / staff revoke  
- [ ] Parent first-login acknowledgement  
- [ ] Parent notifications + View more / less  
- [ ] Parent settings (communication scope only for parents)  
- [ ] Parent updates / memories (class selector + class-targeted behaviour)  
- [ ] AI Parent Reports — create / generate / release  
- [ ] Parent — released report view (+ layout preview)  
- [ ] Homework — upload / review / release  
- [ ] Attendance — arrival notification (when triggered)  
- [ ] Parent communication release  
- [ ] Fee proof — request / verify / reject  
- [ ] `/students` profile + guardian link visibility  
- [ ] Parent no-linked-child state  
- [ ] Security / RLS spot checks (drafts, cross-child, HQ-only surfaces, notifications)  

---

## 5. Severity definitions

Use consistently when marking Section 3.

| Severity | Meaning |
|----------|---------|
| **Blocker** | Violates privacy, security, or core workflow — **must stop** release / pilot for this environment; fix before any re-test sign-off. |
| **Major** | Incorrect behaviour for a primary user story; workaround painful or risky — fix before UAT sign-off unless explicitly waived. |
| **Minor** | Incorrect but workaround exists; limited user impact — batch-fix after Majors. |
| **Polish** | UX/copy/visual; no incorrect permission outcome — defer if timeboxed. |

---

## 6. Stop conditions (critical)

If any occurs during testing: **stop the run**, record **Blocker**, do not “explain away.”

- Parent sees **drafts** or **internal staff evidence** that should be gated.  
- Parent sees **another child’s** data or notifications.  
- Teacher sees **HQ-only** controls (e.g. Session Review) or inappropriate admin surfaces.  
- **Logout** broken (e.g. routes to wrong endpoint, session not cleared when expected).  
- **Session governance** broken (e.g. remember-me signs user out wrongly).  
- **Sensitive data** in notification body visible to wrong recipient.  

Escalate immediately; capture screenshot + steps + commit hash.

---

## 7. Batch-fix rule (after full walkthrough)

1. **Do not** fix issues one screenshot at a time or retest in micro-loops.  
2. Complete **Section 3** for the agreed scope first.  
3. Triage: fix **all Blockers** → then **Major** → schedule **Minor** → defer **Polish** if not blocking UAT exit.  
4. One regression pass after the batch (re-run **Section 4 checklist** or smoke subset per team agreement).  

---

## 8. Sign-off (optional)

| Role | Name | Date | Notes |
|------|------|------|-------|
| Tester | | | |
| Reviewer | | | |

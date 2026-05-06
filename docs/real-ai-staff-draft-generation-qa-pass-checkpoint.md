# Real AI staff draft generation — manual QA PASS (internal prototype checkpoint)

**Recorded:** 2026-05-03  
**Code baseline:** includes **`8628555`** (*Fix AI report Edge generation CORS handling*) and prior staff Edge + persistence work on branch **`cursor/safe-lint-typecheck-486d`**.

This document records a **successful real staff browser QA** session for **Generate real AI draft** on **`/ai-parent-reports`** **without** **`demoRole`**. It does **not** declare production readiness; see **Remaining QA** and **Parked lanes** below.

---

## 1. Manual QA — PASS (staff browser)

| Observation | Result |
|-------------|--------|
| Environment | Supabase Edge secrets configured for real provider path (names only in docs; values never logged here). |
| Route | **`/ai-parent-reports`**, **real staff mode** (not demo preview). |
| Network — preflight | **`OPTIONS`** to **`…/functions/v1/generate-ai-parent-report-draft`** completed successfully (CORS fix **`8628555`**); no blocked preflight in DevTools. |
| Network — generation | **`POST`** returned **HTTP 200**. |
| UI — toast | Success toast: *Real AI draft saved for review. Parents cannot see it until you release a version.* (**`AiParentReports.jsx`** **`handleGenerateRealAiDraft`** success path). |
| UI — inline confirmation | Card shows: *Real AI draft saved for review — still not visible to parents until release.* (**`realAiDraftPhase === 'saved'`**). |
| Release posture | Draft remained **staff-only**; **no** automatic submit, approve, or release from this action (consistent with staff copy and lifecycle rules). |

---

## 2. Safety boundaries preserved (documented architecture)

These boundaries follow from **`AiParentReports.jsx`**, **`aiParentReportEdgeGenerationService.js`**, **`supabaseWriteService.js`** (**`createAiParentReportVersion`**), and **`generate-ai-parent-report-draft/index.ts`**; no application changes were made when recording this checkpoint.

| Boundary | Status |
|----------|--------|
| Provider credentials | **Server-side only** (Edge secrets / runtime env); **not** exposed to the browser bundle or UI copy. |
| Frontend transport | Staff app calls **Supabase Edge** **`generate-ai-parent-report-draft`** via **`fetch`** (JWT + anon **`apikey`**); **no** direct vendor URLs or keys in the client. |
| Staff identity | **`Authorization: Bearer`** uses the **Supabase session** access token from **`supabase.auth.getSession()`** — staff JWT path only as designed. |
| No shortcut lifecycle | **No** auto-submit, approve, or release from **Generate real AI draft**; helper copy states explicit release is required. |
| Parent visibility | **ParentView** unchanged; parents **do not** see unreleased drafts — visibility follows existing release/current-version rules and RLS (see **`docs/real-ai-draft-persistence-unlock-checkpoint.md`** and **`docs/real-ai-parent-report-edge-auth-checkpoint.md`**). |
| No secret leakage in UI | Errors use **safe codes/messages**; no raw provider payloads, tokens, or headers in user-facing strings (failure diagnostics milestone **`872f9bd`**). |

---

## 3. Remaining QA before calling AI Parent Reports a successful internal prototype

Use this as an explicit checklist for the next validation round:

1. **Version history** — Confirm the new **`real_ai`** row appears in **Version History** for the report after **`loadDetail()`** refresh.
2. **Parent unreleased** — Sign in as a **linked parent** (fixture or test account): confirm the **unreleased** draft report / draft content is **not** visible per product rules.
3. **Lifecycle — manual** — **Submit for review → approve → release** (or your role-specific workflow): release the **selected** version deliberately.
4. **Parent released** — Confirm the parent sees **only** the **released / current** version content (not draft variants).
5. **Evidence links** — Confirm **evidence links** remain **staff-facing** / gated per existing rules (no unintended parent exposure of raw evidence paths).

Automated smokes (e.g. **`npm run test:supabase:ai-parent-reports`**) cover parts of RLS/parent boundaries in CI; **browser QA** still owns lifecycle UX and perception checks.

**ParentView real parent + URL student (app-layer, no RLS change):** In real mode (no **`demoRole`**), **`ROLES.PARENT`** now resolves the child from a **valid UUID** in **`?student=`** first, then **`currentUser.student_id`** if set; the legacy **`student-01`** fallback applies **only** when **URL `demoRole`** preview is active. **`getStudentById`** / **`getStudents()`** stay JWT + RLS. **`notFound`** copy distinguishes demo vs real. See **`src/pages/ParentView.jsx`** (`resolveParentViewTargetStudentIdForParent`).

---

## 4. Parked lanes (explicitly out of scope for this milestone)

These items are **not** solved by real AI draft generation and remain parked:

| Lane | Notes |
|------|------|
| Validation mode cleanup | UX/consistency pass on validation messaging or flows. |
| Real PDF download / storage / signed URL | No PDF pipeline in this milestone. |
| Notification / email automation | No outbound comms from draft generation. |
| Attendance arrival email | Separate product surface. |
| Homework feedback notification | Separate surface (see homework Edge stubs elsewhere). |
| Worksheet / OCR AI analysis | OCR/storage boundaries untouched. |
| Audit / session governance | Broader compliance and session reporting — future work. |

---

## Related docs

- **`docs/real-ai-staff-draft-generation-ui-checkpoint.md`** — Phase 2C UI + CORS + diagnostics summary.
- **`docs/real-ai-parent-report-edge-auth-checkpoint.md`** — JWT + **`can_manage_ai_parent_report`** gate.
- **`docs/real-ai-draft-persistence-unlock-checkpoint.md`** — **`real_ai`** **`createAiParentReportVersion`** persistence rules.

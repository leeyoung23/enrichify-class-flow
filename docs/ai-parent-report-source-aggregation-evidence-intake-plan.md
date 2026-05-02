# AI Parent Report — source aggregation and evidence intake plan

Date: 2026-05-02  
Scope: **planning only** — no app UI changes, no runtime logic, no new services, no SQL/RLS, no provider keys, no `real_ai` unlock.

**Related:** `docs/manual-preview-product-direction-corrections.md`, `docs/ai-parent-report-blueprint-plan.md`, `docs/ai-parent-report-mvp-final-qa-checkpoint.md`, `docs/project-master-context-handoff.md`

## Checkpoint (fake aggregation implemented — 2026-05-02)

- **`src/services/aiParentReportSourceAggregationService.js`** — `mode: 'fake'` only; deterministic summaries; **`buildMockDraftInputFromSourceEvidence`** bridges to mock draft input shape.
- **Smoke:** `npm run test:supabase:ai-parent-report:source-aggregation` — no Supabase; see **`docs/ai-parent-report-source-aggregation-service-smoke-checkpoint.md`**.
- **Final pass (docs):** **`docs/ai-parent-report-source-aggregation-service-pass-checkpoint.md`** — milestone **A** done; UI checkpoint **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**.
- **Next:** milestone **B** — RLS-bound aggregation reads (same JSON shape).
- **No** SQL/RLS/UI/ParentView changes in the implementation milestone; future work replaces fake summaries with RLS-bound reads.

---

## 1. Product purpose

AI parent reports should be **grounded in approved system evidence**, not produced from teacher **manual typing alone**. The staff workflow remains: **aggregate sources → draft (mock or future real provider) → teacher review/edit → explicit release**. Parents see **released** content only.

Manual fields in `AiParentReports.jsx` and mock draft inputs are **temporary scaffolding** until a reliable **source aggregation** layer exists.

---

## 2. Current source state (repository reality)

This section maps what exists today in product surfaces and services—**planning labels**, not an audit of every table.

| Area | Current state (high level) |
|------|----------------------------|
| **Attendance** | `Attendance.jsx` and read paths in `supabaseReadService.js` (e.g. attendance records) support staff workflows; data can in principle be summarised for a report period. |
| **Homework** | `Homework.jsx`; write/read coverage includes assignments, uploads, feedback smokes per `package.json` (`test:supabase:homework:*`). Summaries for “completion / performance” are feasible from stored task and feedback state. |
| **Parent Communication** | `ParentUpdates.jsx` — quick comments, weekly progress reports, class **Memories** (review/release gates). Rich narrative + structured weekly fields; eligible as **teacher-approved** communication evidence when released or explicitly selected for reporting. |
| **Announcements / Parent Notices** | `Announcements.jsx` — **Parent Notices** are **official** parent-facing centre messaging, not class learning performance. Use as **optional calendar/context** for the report (e.g. “centre event this week”)—**not** a substitute for attendance/homework evidence. |
| **ParentView** | `ParentView.jsx` — parent sees **released** AI report current version only; no draft or raw evidence. |
| **Observations** | `Observations.jsx` — **placeholder / light** in MVP; not yet a first-class evidence feed for AI reports. |
| **School / curriculum / class** | School profile and curriculum read smokes exist; context can be attached to drafts for **scope and tone**, not as a replacement for student-specific facts. |
| **AI report persistence** | Tables `ai_parent_reports`, `ai_parent_report_versions`, `ai_parent_report_evidence_links`, `ai_parent_report_release_events` (see blueprint); `supabaseReadService` / `supabaseWriteService` implement list/detail/versions/lifecycle; **`real_ai`** creation remains **blocked** at write layer. |
| **Manual / mock source notes** | Staff UI + `generateMockAiParentReportDraft` / `buildMockAiParentReportStructuredSections` — deterministic **fake/dev** sections; **no** live bulk ingestion from attendance/homework yet. |
| **Provider skeleton** | `aiParentReportProviderAdapter.js`, `aiParentReportMockDraftCore.js`, Edge scaffold — **fake/disabled** paths; production provider receives **nothing** until aggregation + policy are proven. |

---

## 3. Target evidence sources

Sources intended to feed **aggregated, minimised** payloads for drafting (final list subject to product/legal review):

| Source | Role in report |
|--------|----------------|
| **Attendance & punctuality** | Habits, consistency, lateness patterns (aggregated). |
| **Homework completion** | Rates, missing items, trends (not raw filenames alone). |
| **Homework / worksheet upload evidence** | Future: scanned worksheet or photo → validated extraction → summary lines. |
| **Teacher feedback & released homework feedback** | Qualitative signals already visible to parent policy may be summarised. |
| **Lesson progression / curriculum focus** | Week or period themes from class/school curriculum alignment. |
| **Teacher observations** | Structured notes (see §7); never diagnosis-like. |
| **Parent Communication — quick comments** | Short teacher-authored signals already in workflow. |
| **Memories / media** | Approved/released memory captions or metadata summaries—**not** raw files to provider by default. |
| **Assessment / quiz results** | **Future**—only if product stores them with clear RLS and parent policy. |
| **Behaviour / participation** | Summaries with **sensitive wording guard**; teacher confirmation required for sensitive phrasing. |
| **Parent-facing events (Parent Notices)** | **Optional context** only—“centre communication this period”—**not** core academic evidence. |

---

## 4. Input → process → output rule

For each source, trace five stages: **input path**, **aggregation**, **draft section mapping**, **teacher review**, **parent release**.

| Source | Input path | Processing / aggregation | AI draft section(s) (example keys) | Teacher review boundary | Parent release boundary |
|--------|------------|---------------------------|-----------------------------------|-------------------------|-------------------------|
| Attendance | RLS-scoped attendance reads for student/class/period | Roll-ups: present %, late count, streaks | `attendance_punctuality`, summary bullets | Teacher edits tone; may omit sensitive patterns | Parent sees **only** released report version text |
| Homework completion | Tasks + submission status + due/overdue | Completion rate, missing count | `homework_completion`, related narrative | Teacher confirms fairness vs exceptional circumstances | Same — released snapshot only |
| Homework feedback | Released teacher feedback rows | Short aggregated positives/gaps | `homework_performance`, `learning_gaps` hints | Teacher adjusts; no copy-paste of private staff notes | Released sections only |
| Worksheet / upload evidence (future) | Private storage + metadata | OCR/extraction → **teacher-validated** bullets | `worksheet_evidence` or embedded in strengths/gaps | Teacher must approve extracted text | Raw file **not** auto-visible; signed URL rules if ever shown |
| Lesson progression | Class/session or curriculum tags | Period focus lines | `lesson_progression` | Teacher aligns wording to what was taught | Released report |
| Observations (future) | Structured observation records | Filter **safe** obs; flag sensitive | `teacher_observations`, strengths | Teacher/supervisor confirmation for sensitive flags | No raw observation dump to parents without policy |
| Parent Communication | Quick comments / weekly report released text | Pull **approved** snippets only | Cross-links to narrative sections | Teacher chooses inclusion | Parent already saw comms under their rules; report is additive summary |
| Memories / media | Approved memory metadata | Captions, themes | `memories_evidence` or narrative glue | Teacher excludes irrelevant memories | Media visibility follows memory release rules |
| Parent Notices (context) | Parent-notice list for period | One-line “centre context” | Optional header context—not graded | Teacher can disable | Centre messaging already published separately |

**Example chain (attendance):**  
Attendance rows (input) → **attendance summary aggregator** (process) → **`attendance_punctuality` / summary paragraphs** (draft) → **teacher reviews** (boundary) → **parent sees released report only** (boundary).

---

## 5. Evidence safety classification

| Class | Meaning | Handling |
|-------|---------|----------|
| **Safe for AI summary** | Aggregated stats, general positives, published homework status | May flow to mock/real draft after aggregation. |
| **Staff-only unless selected** | Raw observation text, internal comments, unreleased homework notes | Never automatic in parent-facing sections; teacher toggle or exclusion list. |
| **Sensitive / requires teacher confirmation** | Lateness reasons, behaviour notes, family-related hints | Block auto-include; require explicit teacher checkmark. |
| **Never send to provider** | Identifiers beyond minimum, unrelated students’ data, full document blobs | Strip before any external call; **minimised summaries only**. |
| **Parent-visible only after release** | Everything in the parent PDF/HTML narrative | Gated by `current_version_id` + release lifecycle—already aligned with MVP RLS posture. |

---

## 6. Worksheet / homework upload evidence plan

1. Teacher uploads **photo/PDF** of worksheet or homework to **private** storage (existing homework/media patterns as precedent).
2. **Metadata + hash** stored; **no public URL**.
3. **OCR / AI analysis** — future milestone; output is **candidate text**, not authoritative grades.
4. **Teacher validates** extracted bullets; edits or rejects.
5. **Only approved summaries** enter structured sections or evidence links.
6. **Raw file** is **not** automatically shown to parents; if shown later, use **signed URL** + release policy aligned with homework/memory rules.

---

## 7. Observations module direction

Observations should become a **first-class evidence source**:

- Teacher records: **category**, **date**, **student/class scope**, **note**, **sensitivity flag**.
- **Sensitive** observations require **teacher or supervisor** confirmation before inclusion in any AI payload or parent narrative.
- AI may **summarise only approved, non-clinical** language—**no diagnosis-like claims** (medical/labels).
- Aggregation layer **filters** by flag + role before draft generation.

---

## 8. Source aggregation service concept (no implementation)

Future function (name illustrative):

```js
collectAiParentReportSourceEvidence({ studentId, classId, branchId, periodStart, periodEnd })
```

**Expected shape** (all fields **aggregated / redacted**; fake/dev in early smokes):

```json
{
  "attendanceSummary": "",
  "homeworkSummary": "",
  "worksheetEvidenceSummary": "",
  "lessonProgressionSummary": "",
  "observationSummary": "",
  "parentCommunicationSummary": "",
  "memoriesEvidenceSummary": "",
  "curriculumContext": "",
  "warnings": [],
  "missingEvidence": []
}
```

- **`warnings`**: e.g. “insufficient attendance rows”, “homework scope incomplete”.
- **`missingEvidence`**: explicit gaps for the UI (teacher may supply manual override notes).

**No implementation** in this plan-only milestone.

---

## 9. UI direction (future; not in this doc’s scope)

- **Source Evidence Preview** panel on `AiParentReports.jsx` evolves from static copy to **live preview** of aggregated JSON (staff-only).
- Teacher **selects / excludes** sources and **override notes** before **Generate Mock Draft** / future real draft.
- **Teacher review/edit** remains mandatory; **no auto-release**.
- Lifecycle buttons unchanged in principle: submit → approve → release.

---

## 10. RLS / privacy implications

- **Teacher:** assigned class/student scope only; cannot read unrelated learners’ evidence for aggregation.
- **Branch supervisor:** branch-scoped alignment with existing policies.
- **HQ:** broader read where policies allow—still **no service-role in frontend**.
- **Parent:** **no** draft report, **no** evidence links, **no** version history beyond released/current—per existing AI report MVP.
- **Evidence links** table remains **staff-facing** unless product explicitly models parent-safe evidence release (separate from report text).
- **No cross-student mixing** in one payload—aggregation keyed by **one student** (and class/branch as helpers).

---

## 11. Real AI provider relationship

- **Prove source aggregation** (shape, redaction, RLS compliance) **before** enabling **`real_ai`** persistence.
- Provider should receive **minimised aggregated summaries**, not **raw bulk tables** or **full uploads**.
- **Smoke tests** may continue to use **fake/dev payloads**; production provider wires to **aggregator output** later.
- Adapter + Edge remain useful as **transport**; **policy** lives in aggregation +write guards.

---

## 12. Email / notification relationship

- **No** parent email/push merely because a draft or mock draft was generated.
- Notifications (future) only after **explicit release** and a defined **notification policy** module.
- **Attendance arrival** or other operational alerts are **separate** channels—do not conflate with report publication.

---

## 13. Recommended implementation sequence

| ID | Milestone | Notes |
|----|-----------|--------|
| **A** | Source aggregation **plan** (this document) | Done as docs-only. |
| **B** | **Fake `collectAiParentReportSourceEvidence` + smoke** | Deterministic dev/fake output; **no** provider key; **no** real AI; proves pipeline shape and RLS-safe call sites. |
| **C** | Worksheet/homework upload evidence **design + storage** | Private object + validation UX; still no auto parent visibility. |
| **D** | Observations schema + UI upgrade for evidence | Sensitivity flags + confirmation path. |
| **E** | Real provider smoke / staged **`real_ai`** unlock | Only after A–B proven; governance sign-off. |

**Recommendation:** milestone **B** is implemented (fake service + smoke). **Next:** optional UI wiring to preview aggregation output, then RLS-bound aggregation behind a new mode (separate milestone).

---

## 14. Next implementation prompt (copy-paste)

Use when starting **RLS-bound aggregation** (future):

```text
Extend docs/ai-parent-report-source-aggregation-evidence-intake-plan.md collectAiParentReportSourceEvidence with a new mode (e.g. 'authenticated_read') that calls existing supabaseReadService helpers under JWT + RLS, returns the same output shape with redacted summaries, and adds smoke coverage using existing RLS test fixtures. Do not unlock real_ai. Do not change ParentView. No service-role frontend.
```

---

## Document control

- **Updates:** bump date and add a short “Checkpoint” subsection when aggregation is implemented.
- **Validation for this file:** `git diff --name-only` — docs-only change; **no** build/lint/typecheck required unless code ships.

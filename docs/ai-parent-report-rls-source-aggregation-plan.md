# AI Parent Report — RLS-bound source aggregation plan

Date: 2026-05-02  
Scope: **planning only** — no app UI changes, no new runtime implementation, no SQL/RLS edits, no provider keys, no `real_ai` unlock.

**Related:** `docs/ai-parent-report-source-aggregation-evidence-intake-plan.md`, `docs/ai-parent-report-source-preview-ui-checkpoint.md`, `docs/manual-preview-product-direction-corrections.md`

## Checkpoint (RLS mode implemented — 2026-05-02)

- Service + smoke: **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**
- **`mode: 'rls'`** and **`hybrid`** in `aiParentReportSourceAggregationService.js`; **no** DDL; **Source Evidence Preview UI** still uses **`fake`** only until a later UI milestone.

---

## 1. Current state

| Topic | Status |
|-------|--------|
| Fake source aggregation | **`collectAiParentReportSourceEvidence`** (`mode: 'fake'`) in `src/services/aiParentReportSourceAggregationService.js` |
| Source Evidence Preview UI | **`AiParentReports.jsx`** calls fake aggregation when a report is selected |
| Mock draft bridge | **`buildMockDraftInputFromSourceEvidence`**; **Generate Mock Draft** merges manual fields + evidence input |
| RLS-bound source reads for aggregation | **Not implemented** — aggregation uses deterministic fake output only |
| Real AI provider | **None** in aggregation path |
| Persistence from aggregation | **None** |
| Parent visibility | **Unchanged** — ParentView remains released/current-version-only for reports |

---

## 2. Product purpose

- Move from **deterministic fake** previews to **real, RLS-safe** source summaries where data exists, so AI-assisted drafts (mock today, provider later) are **grounded in actual operational evidence**.
- **Teachers** still review, edit, and drive lifecycle; **parents** see **only released** report content—aggregation preview remains **staff-only**.
- **No** widening of parent/student access for draft-time evidence.

---

## 3. Available source candidates (repository map)

High-level mapping—exact method names evolve; prefer **existing** read paths before inventing new ones.

| Domain | Candidate entry points / tables (examples) |
|--------|----------------------------------------------|
| **Attendance** | `dataService.listAttendanceRecords(user, filters)` → `attendance_records` (JWT + RLS); demo fallback in data layer |
| **Homework** | `supabaseReadService`: `listAssignedHomeworkForStudent`, `listHomeworkTrackerByStudent`, `listHomeworkTrackerByClass`, task assignee reads — aggregate completion/submission posture |
| **Homework feedback** | Tracker/feedback flows covered by homework smokes in `package.json`; summarise released/safe feedback text only |
| **Parent Communication** | `dataService.listParentUpdates` / student-scoped variants → `parent_comments`, `weekly_progress_reports` |
| **Memories / media** | Class memories flows (`supabaseUploadService` / approval patterns); **metadata/caption** summaries only—no raw file paths |
| **Parent announcements / events** | `listParentAnnouncements`, detail reads — **optional calendar/context**, not core grade evidence |
| **School / curriculum / class** | `listSchools`, `listCurriculumProfiles`, `listClassCurriculumAssignments`, `listStudentSchoolProfiles` — **scope and framing** text |
| **AI report evidence links** | `listAiParentReportEvidenceLinks` — staff-facing link rows; map to **`warnings` / item stubs**, not raw storage paths |
| **Observations** | UI placeholder; **future** structured store — until then **`missingEvidence`** + fake/hybrid line |
| **Worksheet / OCR** | **Future** — private object + validated extraction; **`missingEvidence`** until pipeline exists |

---

## 4. RLS-safe read strategy

- **Anon Supabase client + end-user JWT only** — same as rest of app; **no service-role** in browser.
- Prefer **`supabaseReadService`** and established **`dataService`** reads that already enforce role behaviour via RLS.
- **Parents** must **not** invoke draft aggregation APIs (route guards / role checks in UI + service entry).
- **Single-student / single-class / branch** filters on every query — **no cross-student mixing** in one payload.
- **Strip** storage paths, signed URLs, and opaque IDs from aggregation output; summaries only unless staff explicitly opts into controlled detail later.

---

## 5. Aggregation mode design

Planned `collectAiParentReportSourceEvidence` evolution:

| Mode | Behaviour |
|------|-----------|
| **`fake`** | Current behaviour — deterministic dev summaries; **default** until `rls` is proven |
| **`rls`** | Calls planned internal collectors using JWT-scoped reads; same top-level return shape as fake |
| **`hybrid`** *(optional)* | `rls` where reads succeed; fake placeholder strings where source missing — reduces empty UI while marking **`missingEvidence`** |

**Default stays `fake`** until smoke + QA sign off on `rls` / `hybrid`.

---

## 6. Source-by-source aggregation plan

For each source: **input filters** (studentId, classId, branchId, periodStart/End), **read candidate**, **summary field**, **classification default**, **missingEvidence**, **safety**.

| Source | Filters | Read candidate | Output field(s) | Classification default | Missing / safety |
|--------|---------|----------------|-----------------|------------------------|------------------|
| Attendance | student + date range + class | `listAttendanceRecords` with filters | `attendanceSummary` | `safe_for_ai_summary` when aggregated counts only | Insufficient rows → `missingEvidence`; redact note fields if sensitive |
| Homework | student/class + period | Homework tracker / assignee reads | `homeworkSummary`, performance hints | `safe_for_ai_summary` for stats | No tasks → missing |
| Homework feedback | same | Feedback columns via existing homework reads | Fold into homework + optional evidence item | `staff_only_requires_selection` if free text rich | Do not send raw teacher-only notes |
| Parent Communication | student + period | `parent_comments` / `weekly_progress_reports` via list paths | `parentCommunicationSummary` | `staff_only_requires_selection` until release policy confirmed | Empty → missing |
| Memories/media | student/class + approved filter | Class memories list — captions only | `memoriesEvidenceSummary` | `staff_only_requires_selection` | No approved memories → missing; **never** include `storage_path` |
| Curriculum / class | classId, branchId | Curriculum assignment / school profile reads | `curriculumContext`, `lessonProgressionSummary` | `safe_for_ai_summary` for generic themes | Missing curriculum → soft missing |
| Observations | future schema | TBD | `observationSummary` | `sensitive_requires_confirmation` | Until wired: placeholder + missing |
| Worksheet uploads | future | TBD | `worksheetEvidenceSummary` | `staff_only_requires_selection` | Until wired: placeholder + missing |
| Evidence links | reportId | `listAiParentReportEvidenceLinks` | Evidence items / warnings | `never_send_to_provider` if raw internal markers | Never expose paths |

---

## 7. Evidence classification rules

| Classification | Meaning | Default sources |
|----------------|---------|-----------------|
| **safe_for_ai_summary** | Aggregated stats / generic themes OK for downstream mock/provider payload | Attendance rates, homework completion counts, generic curriculum blurbs |
| **staff_only_requires_selection** | Needs teacher toggle before inclusion | Parent comms text, memories captions, worksheet candidates |
| **sensitive_requires_confirmation** | Teacher/supervisor confirmation before narrative use | Behaviour notes, observation text, lateness patterns |
| **never_send_to_provider** | Must not leave staff boundary / internal markers | Raw evidence link blobs, pipeline debug, internal IDs |

---

## 8. Data minimisation

- Emit **counts, rates, short bullet summaries** — not full row dumps.
- **No** raw files, **no** storage URLs, **no** `storage_path`, **no** payment/fee rows, **no** health/diagnosis wording.
- **Minimise UUID exposure** in UI-oriented JSON (optional hash or omit).
- **One student per aggregation call** for parent-report context.
- **Strip** unrelated classmates from any accidental join.

---

## 9. Teacher review boundary

- Aggregation output is **staff preview only** on **AI Parent Reports**.
- Teacher **includes/excludes/overrides** before generation (existing merge behaviour extends to RLS output).
- **Generate Mock Draft** / future AI: consume **approved summaries** only.
- **Parents**: unchanged — **released report** snapshot only.

---

## 10. Smoke test plan (future implementation)

When `rls` mode exists, add or extend smoke to assert:

- Shape matches fake mode (same keys + `evidenceItems` discipline).
- **Teacher / supervisor / HQ** fixtures receive **scoped** summaries; **parent** cannot obtain aggregation for drafts.
- **missingEvidence** populated instead of throw on partial data.
- Serialized output contains **no** `http`, `/storage/`, or path patterns (reuse **`containsUnsafeMockDraftValue`** ideas).
- **`buildMockDraftInputFromSourceEvidence`** accepts `rls` output.
- **No** real provider HTTP; **no** new persistence from aggregator; **no** ParentView change.

---

## 11. UI impact (future)

- **Source Evidence Preview** already exists — switch label from **Fake/dev** to **System evidence preview** when `rls`/`hybrid` active; keep fake badge when `fake` mode.
- Loading / error / empty states already partially present — extend for per-source gaps.
- **Do not** render raw row tables by default—summaries + expandable detail later if needed.

---

## 12. SQL / RLS implications

- **First implementation:** only **`supabaseReadService` / `dataService`** (and siblings) — **no new SQL** until a gap is documented (e.g. missing selective policy).
- **Do not** widen SELECT for parents/students on draft artifacts.
- **Do not** introduce service-role reads in the frontend aggregation path.
- If a source is unreadable under RLS for a role, record **`missingEvidence`**—do not elevate privileges.

---

## 13. Relationship to real AI provider

- Provider (when enabled) should receive **the same minimised object** as mock draft builder — **not** raw SQL rows.
- Prove **`rls`** aggregation + redaction **before** enabling **`real_ai`** persistence.
- Provider adapter smokes can remain **fake/dev** payloads while aggregator matures.

---

## 14. Relationship to email / notifications

- **Deferred** — no notification on aggregation completion; **no** notification on draft creation.
- Future notifications only after **explicit release** + policy module.

---

## 15. Recommended implementation sequence

| ID | Milestone |
|----|-----------|
| **A** | **RLS-bound aggregation service + smoke** using **existing read methods only** — **recommended first** |
| **B** | Add SQL/RLS **only if** documented gaps after A |
| **C** | Worksheet/OCR intake planning |
| **D** | Observations module upgrade |
| **E** | Real provider smoke (staging/key-gated) |

**Why A first:** validates shape and permissions without schema churn; fake mode remains fallback.

---

## 16. Next implementation prompt (copy-paste)

```text
Implement collectAiParentReportSourceEvidence mode 'rls' (and optional 'hybrid') per docs/ai-parent-report-rls-source-aggregation-plan.md.

Rules:
- Use only existing supabaseReadService / dataService read helpers with current JWT; no service-role frontend.
- Same return shape as mode 'fake'; populate missingEvidence when a source is empty or denied by RLS.
- Strip paths/URLs/IDs per plan §8; map rows to evidenceItems with classifications per §7.
- Wire AiParentReports Source Evidence Preview to pass mode 'rls' when authenticated (keep 'fake' for demoRole/local).
- Add smoke: scripts + npm script; use existing RLS test fixtures; parent must not access aggregation.
- Do not change SQL/RLS unless a gap is found and approved separately.
- Do not unlock real_ai. No provider keys.

Validation: build, lint, typecheck, new smoke, regression ai-parent-report smokes.
```

---

## Validation (this document)

- **Docs-only:** `git diff --name-only` — **no** build/lint/typecheck/smoke required unless code ships.

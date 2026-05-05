# AI evidence pipeline + monthly report readiness

Date: 2026-05-06  
Scope: **diagnosis + product planning** aligned with `collectAiParentReportSourceEvidence` (`src/services/aiParentReportSourceAggregationService.js`). **Not** a commitment to full automation; **teacher review** and **explicit release** remain mandatory.

---

## Vision (product)

Roll up **attendance**, **homework**, **observations / learning notes**, **parent communication**, **class memories**, and **progress-style evidence** → **AI-assisted draft** → **teacher/supervisor review** → **explicit release** → parent sees a **polished monthly/progress report**.  
**No auto-release.** **No raw internal notes** to parents. **No OCR** in current implementation.

---

## Current evidence sources (database / modules)

| Source | Typical tables / modules | In app UI |
|--------|---------------------------|-----------|
| Attendance | `attendance_records` | `Attendance.jsx`, class session flows |
| Homework | homework tasks, submissions, feedback release | `Homework.jsx`, ParentView |
| Teacher observations / notes | Observations module; learning notes on `/students` | `Observations.jsx`, `Students.jsx` |
| Parent communication | `parent_comments`, weekly-style reports | `ParentUpdates.jsx` |
| Class memories | Class memories (approval/release) | `ParentUpdates.jsx` |
| Learning goals / curriculum | `student_school_profile`, curriculum assignments, learning goals | `Students.jsx`, read services |
| AI report artefacts | `ai_parent_reports`, versions, `ai_parent_report_evidence_links` | `AiParentReports.jsx` |

---

## What feeds AI Parent Report drafts today

Implementation is centralized in **`collectAiParentReportSourceEvidence`** (modes: `fake`, `rls`, `hybrid`).

### RLS mode (live staff session — JWT scoped)

| Evidence | Aggregated into draft context? | Notes |
|----------|-------------------------------|--------|
| **Attendance** | **Yes** | Query `attendance_records` by `student_id`, optional period filters → **summary text** (`summarizeAttendanceRows`). |
| **Homework** | **Yes (assignee / completion snapshot)** | `listAssignedHomeworkForStudent` → summary string — **not** full OCR of attachments. |
| **Released homework feedback text** | **Partial / indirect** | Feedback lives in homework subsystem; aggregation uses assignee snapshot — **does not claim full released-feedback narrative** in one blob unless represented in assignee data. |
| **Teacher observations** | **No** | **Placeholder only:** “Structured observations feed not implemented”. |
| **Class memories** | **Yes (captions/metadata only)** | `listClassMemories` → **captions/titles**; **no media URLs** passed through sanitised summaries. |
| **Parent communication** | **Yes** | `parent_comments` + `weekly_progress_reports` → combined summary text. |
| **Curriculum / learning context** | **Yes** | `getStudentLearningContext`, `getClassLearningContext`, fallbacks (school profile, class curriculum assignment). |
| **Manual evidence links** | **Yes (staff)** | `listAiParentReportEvidenceLinks` when `reportId` provided — **staff metadata / snapshots**. |
| **Worksheet / scan / OCR** | **No** | Fixed placeholder: pipeline **not connected**. |

### Fake / demo mode

Synthetic rows for pipeline testing only — **do not** represent live centre data.

### Hybrid mode

Merges string fields preferring RLS when non-empty; evidence items list prefers RLS items when present.

---

## UI-only or not yet in aggregation

- **`Observations.jsx`** (and structured observation records): **not** wired into `collectRlsSourceEvidence` — remains **staff UI + DB** without automatic roll-up into AI report text (explicit placeholder in aggregation).
- **Internal learning notes** on `/students`: **not** automatically fed; policy is **staff-only** until released via approved channels (see student profile plan).

---

## Parent-facing released report (today)

In **`ParentView`**, parents load **released** AI parent reports only; sections rendered from **structured_sections** (or resolved keys) include summary, attendance/punctuality, lesson progression, homework completion, strengths, areas for improvement, recommendations, parent support, teacher final comment — **only after release**. Printable **browser HTML** preview when content builds; **no PDF download** for families.

---

## Monthly “full product” gaps

- **Observations → aggregation:** Need approved, sensitivity-flagged excerpt pipeline.
- **Homework feedback lines:** Stronger link from **released feedback** rows into aggregation text (today: assignee-focused snapshot).
- **Period-native rollups:** Monthly calendar boundaries, branch reporting policy, absence reasons.
- **Single “monthly report” template:** Section ordering and centre branding — partly in PDF HTML template; production PDF deferred.
- **Quality bar:** Centre-defined minimum evidence thresholds before draft generation allowed.

---

## AI homework marking from uploads (gap)

- **Today:** Mock / metadata flows per `docs/homework-ai-marking-readiness-plan.md`; **no vision/OCR** on file bytes in aggregation service.
- **Future:** Vision provider, DPIA, teacher-release gate, **no** auto-parent visibility.

---

## Recommended evidence sections (future monthly report)

Aligns with parent section keys already mapped in ParentView where applicable:

1. Attendance summary  
2. Homework completion / submission status  
3. Released homework feedback (high-level)  
4. Teacher observations / learning notes (**staff-approved snippets only**)  
5. Class memories / engagement moments (**captions/themes**)  
6. Parent communication history (**released / appropriate excerpts**)  
7. Learning goals  
8. Strengths  
9. Areas to improve  
10. Next recommendations  
11. Parent support suggestions  
12. Teacher final comment  

---

## Gates (non-negotiable)

- **Teacher approval gate:** Drafts editable by staff; lifecycle states enforced.  
- **Parent release gate:** Only **released** versions parent-readable.  
- **No auto-release** of AI output.  
- **Privacy:** Sanitise URLs, storage paths, secrets before provider calls (`sanitizeAggregationText`).  
- **No raw internal notes** to parent-facing HTML.  
- **Legal/compliance:** Child learning data, optional homework **images** — consent, retention, subprocessors, Malaysia **PDPA**-style accountability — see `docs/production-readiness-audit.md`.

---

## UAT: proving a clean released sample (no RLS change)

1. Staff (HQ/teacher as allowed): **`/ai-parent-reports`** → create/select shell → set period/student/class.  
2. Open **Source Evidence Preview** — confirm which rows are **RLS-backed** vs placeholder.  
3. **Generate mock draft** (always safe) and/or **real AI draft** only if environment allows (optional, quota-aware).  
4. Progress **Submit → Approve → Release** per org workflow.  
5. Parent: sign in → ParentView → **Progress Reports** — see released card; open **printable layout** preview.  
6. Automated: `npm run test:supabase:ai-parent-reports`, `test:supabase:ai-parent-report:mock-draft`, `test:supabase:ai-parent-report:source-aggregation` / `:rls-source-aggregation` as appropriate for environment.

---

## Related documents

- `docs/ai-parent-reports-production-readiness-checkpoint.md`  
- `docs/homework-ai-marking-readiness-plan.md`  
- `docs/production-readiness-audit.md`  
- `src/services/aiParentReportSourceAggregationService.js`

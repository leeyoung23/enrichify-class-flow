# AI parent report — RLS source aggregation service + smoke checkpoint

Date: 2026-05-02  
Scope: **`collectAiParentReportSourceEvidence`** — **`rls`** and **`hybrid`** modes using existing read helpers + scoped Supabase queries only — **no SQL/RLS DDL** in this track, **no** `real_ai` unlock. *(Original service milestone had **no** consumer UI; staff **`AiParentReports`** now calls **`hybrid`** / **`fake`** per **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**.)*

## Implementation

- **`src/services/aiParentReportSourceAggregationService.js`**
  - `SOURCE_AGGREGATION_MODES`: **`fake`**, **`rls`**, **`hybrid`**
  - **`rls`**: JWT-scoped reads — `attendance_records`, `parent_comments`, `weekly_progress_reports`, homework via **`listAssignedHomeworkForStudent`**, curriculum via **`getStudentLearningContext`** / **`getClassLearningContext`** / **`listStudentSchoolProfiles`** / **`listClassCurriculumAssignments`**, memories via **`listClassMemories`** (captions/titles only — **no** paths), optional **`listAiParentReportEvidenceLinks`** when **`reportId`** provided
  - **`sanitizeAggregationText`**: strips URL/storage-like content from narratives
  - **`hybrid`**: merges **`rls`** with **`fake`** fill-ins for empty summary strings
- **`sanitizeAggregationText`** exported for tests/checkers

## Smoke

- **`npm run test:supabase:ai-parent-report:rls-source-aggregation`**
  - Uses **dynamic import** after `dotenv` so `supabaseClient` picks up `process.env` (same pattern as mock-draft smoke).
  - Parent boundary **CHECK** when parent fixtures absent.

## Boundaries

| Topic | Status |
|-------|--------|
| SQL / RLS policy changes | **None** |
| Service-role frontend | **None** |
| ParentView | **Unchanged** |
| UI wiring | **Hybrid + fake** on **`AiParentReports`** — **`rls`-only** not exposed; see **`docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`** and **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** |
| `real_ai` | **Still blocked** |
| Provider HTTP | **None** |

## Gaps / CHECK

- **`report_id_not_provided_for_evidence_links`** when `reportId` omitted — expected for aggregation without report context.
- Worksheet OCR / structured observations: **`missingEvidence`** + placeholders.

## Validation

- `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run test:supabase:ai-parent-report:source-aggregation`
- `npm run test:supabase:ai-parent-report:rls-source-aggregation`
- `npm run test:supabase:ai-parent-report:mock-draft`
- `npm run test:supabase:ai-parent-reports`

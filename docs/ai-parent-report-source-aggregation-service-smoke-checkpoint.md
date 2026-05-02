# AI parent report — fake source aggregation service + smoke checkpoint

Date: 2026-05-02  
Scope: **implementation checkpoint** — fake/dev aggregation module + **non-Supabase** smoke test only.

**Final pass doc:** `docs/ai-parent-report-source-aggregation-service-pass-checkpoint.md`

---

## 1. Key checkpoint notes

| Topic | Status |
|-------|--------|
| Fake/dev source aggregation service | **Implemented** (`src/services/aiParentReportSourceAggregationService.js`) |
| Smoke test | **Passes** (`npm run test:supabase:ai-parent-report:source-aggregation`) |
| Real Supabase reads | **None** in aggregation module |
| Persistence | **None** |
| Real AI provider call | **None** |
| Provider keys | **None** |
| SQL / RLS changes | **None** |
| ParentView visibility | **Unchanged** |
| Notifications / emails | **None** (deferred) |
| PDF / export | **None** |
| `real_ai` version creation | **Still blocked** at write layer |

---

## 2. Source aggregation service behavior

### `collectAiParentReportSourceEvidence(...)`

- **Signature:** `collectAiParentReportSourceEvidence({ studentId, classId, branchId, periodStart, periodEnd, mode = 'fake' })` (async).
- **Mode:** **`fake` only** — other values throw (RLS-bound mode is future).
- **Returns:**
  - `attendanceSummary`, `homeworkSummary`, `worksheetEvidenceSummary`, `lessonProgressionSummary`, `observationSummary`, `parentCommunicationSummary`, `memoriesEvidenceSummary`, `curriculumContext` (strings)
  - `warnings` (array of strings)
  - `missingEvidence` (array of gap identifiers)
  - `evidenceItems` (array of classified evidence rows)
- **Does not:** call Supabase, persist rows, or invoke any AI/provider adapter.
- **Summaries:** deterministic **fake/dev-safe** text; small digest derived from input IDs for variation without real data.

---

## 3. Fake/dev evidence items (`evidenceItems`)

Each row includes `sourceType`, human-readable `label`, `summary`, plus classification and policy fields (§4).

| `sourceType` | Role |
|--------------|------|
| `attendance_summary` | Fake attendance roll-up |
| `homework_completion_summary` | Fake homework completion snapshot |
| `worksheet_upload_placeholder` | Worksheet pipeline not connected |
| `lesson_progression_summary` | Fake curriculum tie-in |
| `observation_placeholder` | Observations feed not connected |
| `parent_communication_summary` | Simulated communication threads |
| `memories_media_placeholder` | Memories aggregate not wired |
| `curriculum_context` | Fake school/curriculum framing |
| `internal_pipeline_marker` | **`never_send_to_provider`** — internal-only marker |

---

## 4. Evidence classification behavior

### `classification` (enum)

- `safe_for_ai_summary`
- `staff_only_requires_selection`
- `sensitive_requires_confirmation`
- `never_send_to_provider`

### Other fields on each item

- **`confidence`** — e.g. low / medium (demo only).
- **`visibility`** — e.g. staff vs draft_candidate (policy hint).
- **`requiresTeacherConfirmation`** — boolean.
- **`includedInDraftByDefault`** — boolean; used with classification for mock-draft bridging.

---

## 5. Mock draft input helper

### `buildMockDraftInputFromSourceEvidence(sourceEvidence)`

- Maps aggregation output into the **mock draft input object** consumed by `buildMockAiParentReportStructuredSections` / `generateMockAiParentReportDraft`.
- **`evidenceSummaries`** is built only from items where `classification === safe_for_ai_summary` **and** `includedInDraftByDefault === true`.
- Strings remain subject to existing **`containsUnsafeMockDraftValue`** guards in the write path (no private URLs, storage paths, provider/debug keys).

---

## 6. Smoke test coverage

Script: `scripts/supabase-ai-parent-report-source-aggregation-smoke-test.mjs`

| Check | Result |
|-------|--------|
| `npm run test:supabase:ai-parent-report:source-aggregation` | **PASS** |
| Expected top-level shape | **PASS** |
| Summary string fields | **PASS** |
| `evidenceItems` non-empty | **PASS** |
| All four classifications represented | **PASS** |
| `missingEvidence` includes placeholder / `not_connected` style gaps | **PASS** |
| No URL / storage-like strings in serialized output | **PASS** |
| `buildMockDraftInputFromSourceEvidence` safe vs `containsUnsafeMockDraftValue` | **PASS** |
| In-memory `buildMockAiParentReportStructuredSections` | **PASS** |
| No persistence / provider / parent / notification / PDF side effects | **PASS** (smoke imports aggregation + mock core only) |

---

## 7. Validation result (milestone run)

Recorded when the feature landed (**docs-only pass** may cite this table without re-running):

| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:supabase:ai-parent-report:source-aggregation` | PASS |
| `npm run test:supabase:ai-parent-report:mock-draft` | PASS |
| `npm run test:supabase:ai-parent-reports` | PASS |

---

## 8. What remains future

- RLS-bound **real** source aggregation mode (same output shape).
- **UI** source evidence preview wired to aggregation (recommended next: see pass doc).
- Worksheet / **OCR** evidence intake.
- Structured **Observations** as a live feed.
- Real provider smoke / staged **`real_ai`** unlock (policy + aggregation proven first).
- Email / notification **after explicit release** policy.
- PDF/export (later).

---

## 9. Related files

- Implementation: `src/services/aiParentReportSourceAggregationService.js`
- Smoke: `scripts/supabase-ai-parent-report-source-aggregation-smoke-test.mjs`
- npm: `package.json` → `test:supabase:ai-parent-report:source-aggregation`
- Plan: `docs/ai-parent-report-source-aggregation-evidence-intake-plan.md`

# Project Master Context Handoff

## Checkpoint update (ParentView printable report preview — 2026-05-03)

- **`src/pages/ParentView.jsx`** — **`Progress Reports`**: **Preview printable report** toggles sandboxed iframe with **`buildReleasedReportPdfInputFromParentViewContext`** + **`renderReleasedReportPdfHtml`** (released/detail + current version already loaded; **no** extra reads). **No** Download PDF, **no** binary PDF, **no** storage/SQL/provider/email. **Doc:** **`docs/parent-view-printable-report-preview-checkpoint.md`**. **Manual visual QA (desktop + ~390px):** **`docs/manual-qa-parent-view-printable-report-preview-checkpoint.md`**. Cross-refs: **`docs/parent-view-ai-report-display-final-checkpoint.md`**, **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (AI Parent Report PDF template visual polish — 2026-05-03)

- **`src/services/aiParentReportPdfTemplate.js`** — **`renderReleasedReportPdfHtml`**: **Student Progress Report** boxed A4 layout (student panel, **At a glance** cards, section blocks, teacher / supervisor signatures); validation unchanged; **`scripts/ai-parent-report-pdf-template-smoke-test.mjs`** layout landmarks. **Doc:** **`docs/ai-parent-report-pdf-template-visual-polish-checkpoint.md`**. **No** ParentView download, **no** storage/SQL/provider/email. Cross-refs: **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**, **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (PDF internal preview navigation clarity — 2026-05-03)

- **`docs/pdf-preview-navigation-clarity-fix-checkpoint.md`** — **removed** sidebar **`PDF preview (internal)`** from **`ROLE_NAVIGATION`** (HQ/supervisor/teacher); route **`/ai-parent-report-pdf-preview`** unchanged; entry via **`AiParentReports`** optional dashed card + direct URL; preview page copy: **not a parent download**, **no file stored**, **fake/dev fixture only**, **no download/print/export**. **No** ParentView/export/SQL/storage/provider/email changes.

## Checkpoint update (manual QA — AI Parent Report PDF internal preview — 2026-05-03)

- **Doc:** **`docs/manual-qa-ai-parent-report-pdf-internal-preview-checkpoint.md`** — desktop + **~390px** screenshot runbook for **`/ai-parent-report-pdf-preview`**: surfaces §2, desktop/mobile/print/safety checklists §3–§6, risks §7, decision rule §8 (**A–E** options). **QA/checkpoint only** — **no** UI/runtime edits unless issues are filed separately. Cross-ref **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**, **`docs/released-ai-parent-report-export-strategy-plan.md`**, **`docs/notification-system-sql-rls-review-plan.md`** (parked). ParentView Download PDF **not** in scope until QA clean.

## Checkpoint update (notification system SQL/RLS review plan — planning only, 2026-05-03)

- **Doc:** **`docs/notification-system-sql-rls-review-plan.md`** — safety-critical output layer; conceptual tables (**notification_events**, **notifications**, **notification_recipients**, **notification_delivery_attempts**, **notification_preferences**, optional **notification_templates**); event/notification/recipient rules; delivery logging constraints; preferences; **RLS** by role; trigger-specific access implications; safety gates + **idempotency**; email vs in-app sequencing; **§17** prompts (**A** draft DDL foundation vs **B** park + PDF QA / Parent Communication polish). **No** `supabase/sql` changes in this milestone. Cross-ref **`docs/notification-email-automation-trigger-matrix-plan.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (notification & email automation trigger matrix — planning only, 2026-05-03)

- **Doc:** **`docs/notification-email-automation-trigger-matrix-plan.md`** — product purpose, current state, channel comparison (**in-app + email first**), **trigger matrix** (parent + staff rows), safety sections (attendance, reports, homework, announcements, fees, staff), conceptual data model (**no SQL**), email provider strategy (**secrets server-side only**), implementation sequence (**B** SQL/RLS review → **C** in-app prototype → **D/E** parent triggers → **F** email), **what not to do yet**, copy-paste prompt §16 for **notification SQL/RLS review**. **No** app UI, **no** runtime logic, **no** provider keys. Cross-refs: **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**, **`docs/announcements-parent-communication-final-qa-checkpoint.md`**, **`docs/ai-parent-report-mvp-final-qa-checkpoint.md`**.

## Checkpoint update (AI Parent Report PDF internal HTML preview — 2026-05-03)

- **Route:** **`/ai-parent-report-pdf-preview`** — **`src/pages/AiParentReportPdfPreview.jsx`** — staff/demo staff roles only; **fake/dev fixtures**; **`renderReleasedReportPdfHtml`** + sandboxed iframe; **no** ParentView, **no** storage/SQL, **no** download/export persistence. **Sidebar:** **`PDF preview (internal)`**. **Link** from **`AiParentReports.jsx`** intro. **Smoke:** **`npm run test:ai-parent-report:pdf-template`** (all four variants). **Doc:** **`docs/ai-parent-report-pdf-internal-preview-checkpoint.md`**. Cross-refs: **`docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`**, **`docs/ai-parent-report-pdf-template-contract-plan.md`**, **`docs/released-ai-parent-report-export-strategy-plan.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **Next:** manual visual QA before parent download milestone.

## Checkpoint update (AI Parent Report PDF helper — docs sealed, 2026-05-02)

- **Docs-only:** **`docs/ai-parent-report-pdf-helper-fixture-final-checkpoint.md`** — milestone **`2cfab48`**: API summary §2–§6, validation/smokes §7–§8, future §9, **recommended next A** (internal HTML preview), copy-paste prompt §11. Cross-updates: **`docs/ai-parent-report-pdf-helper-fixture-checkpoint.md`**, **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`**, **`docs/ai-parent-report-pdf-template-contract-plan.md`**, **`docs/released-ai-parent-report-export-strategy-plan.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** `src/` in this doc milestone.

## Checkpoint update (AI Parent Report PDF helper + fixtures — 2026-05-02)

- **`src/services/aiParentReportPdfTemplate.js`** — **`buildDemoReleasedReportPdfInput`**, **`normalizeReportSectionsForPdf`**, **`normalizeReportSectionsFromReleaseVersion`**, **`validateReleasedReportPdfInput`**, **`renderReleasedReportPdfHtml`**, **`buildReleasedReportPdfInputFromParentViewContext`** (no Supabase). **Smoke:** **`npm run test:ai-parent-report:pdf-template`**. **Doc:** **`docs/ai-parent-report-pdf-helper-fixture-checkpoint.md`**. **No** ParentView button, **no** SQL/storage/binary PDF, **no** `real_ai` unlock. Cross-refs: **`docs/ai-parent-report-pdf-template-contract-plan.md`**, **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`**.

## Checkpoint update (AI Parent Report PDF mock + render helper planning — 2026-05-02)

- **Docs-only:** **`docs/ai-parent-report-pdf-mock-render-helper-plan.md`** — pure function contracts (**build**, **normalize**, **validate**, **renderHtml**), section normalization table, validation rules, fake fixtures outline §9, render strategy **HTML/React before** client PDF lib; recommended next **`src/`** module **without** ParentView button (**§12–§13**). Cross-ref **`docs/ai-parent-report-pdf-template-contract-plan.md`**. **No** SQL/buckets/UI/export button in this doc milestone.

## Checkpoint update (AI Parent Report PDF template contract — planning only, 2026-05-02)

- **Docs-only:** **`docs/ai-parent-report-pdf-template-contract-plan.md`** — official **released-only** PDF artefact; required/optional sections aligned with **`ParentView.jsx`** keys; explicit exclusions (drafts, evidence URLs, `generation_source`, paths); **`releasedReportPdfInput`** contract §7; A4 layout §8; variants §9; privacy §11; recommended next **B** (mock builder + render helper planning §14–§15). Cross-ref **`docs/released-ai-parent-report-export-strategy-plan.md`**. **No** `src/` changes.

## Checkpoint update (released AI Parent Report export strategy — planning only, 2026-05-02)

- **Docs-only:** **`docs/released-ai-parent-report-export-strategy-plan.md`** — PDF-first official export, PNG summary second; **released/current-version-only** parent access; staff approval before parent export visibility; private storage + signed URL when persisted; phased **A→B→C** (template contract → client prototype → server PDF); audit hooks §9; **`real_ai`** not required for export; **no** auto-email in export milestone. **No** `src/` changes.

## Checkpoint update (manual QA — Homework teacher upload/review, 2026-05-02)

- **Docs-only:** **`docs/manual-qa-homework-teacher-upload-review-checkpoint.md`** — human QA runbook for **`Homework.jsx`** staff upload/review flow (**`6fe18bc`**): surfaces §2, checklists §3–§7, safety §8, risks §9, decision rule §10 (clean QA → **Parent Communication** step-label polish per **`docs/teacher-upload-step-simplification-plan.md`** §12 **C**). Cross-ref **`docs/homework-teacher-upload-step-ui-polish-checkpoint.md`**. **No** runtime changes in this doc milestone.

## Checkpoint update (Homework teacher upload/review UI polish — 2026-05-02)

- **`src/pages/Homework.jsx`** — staff-oriented intro; **By Task / By Student** helper copy; **Create homework task** with Steps 1–3; plain submission statuses; **Student submission files** / **Open student submission**; **Teacher-marked work** + share wording; **Share feedback with family** + parent-visibility helper; technical IDs in collapsible **Staff reference**; mobile-friendly button widths. **Doc:** **`docs/homework-teacher-upload-step-ui-polish-checkpoint.md`**. **`docs/teacher-upload-step-simplification-plan.md`** — milestone **B** noted implemented. **No** SQL/RLS/ParentView/provider/email/PDF/`real_ai`.

## Checkpoint update (manual QA — navigation clarity pass, 2026-05-02)

- **Docs-only:** **`docs/manual-qa-navigation-clickability-simplicity-checkpoint.md`** — screenshot-oriented QA before next implementation: ParentView history UX, My Tasks grouping, setup card affordances; **§6** safety/privacy visual audit; **§8** decision rule (targeted UI fixes vs **Teacher upload-step simplification** before real provider smoke). UI baseline **`74a71bf`**; cross-ref **`docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`**. **No** runtime changes in this doc milestone.

## Checkpoint update (navigation clarity — docs sealed, 2026-05-02)

- **Docs-only:** **`docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`** — ParentView latest/history (**slice(1)**, **3** older cap, expand/collapse), My Tasks groups (**Upload / Reply / Other / Completed**), setup directory preview + reduced fake-click affordance, teacher simplicity §5, validation snapshot **`74a71bf`**, future work, **recommended next A → B**, copy-paste manual QA prompt §9. Cross-updates: **`docs/navigation-clickability-simplicity-fixes-checkpoint.md`**, **`docs/teacher-simplicity-navigation-clickability-audit.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** `src/` in this doc milestone.

## Checkpoint update (navigation clickability + My Tasks + ParentView — 2026-05-02)

- **`src/pages/ParentView.jsx`** — **Latest announcements and events**: latest card + **3** more by default, **View more history** / **Show less**; no change to published-only data. **`src/pages/MyTasks.jsx`** — announcement tasks grouped **Upload / Reply / Other / Completed**; intro copy. **`Branches` / `Classes` / `Teachers` / `Students`** — **directory preview** copy; static cards no longer use heavy hover-shadow. **No** SQL/RLS; **no** parent rule change. Doc: **`docs/navigation-clickability-simplicity-fixes-checkpoint.md`**.

## Checkpoint update (teacher simplicity + navigation clickability audit — 2026-05-02)

- **Docs-only:** **`docs/teacher-simplicity-navigation-clickability-audit.md`** — product principles for non-technical teachers; navigation map by role (**`ROLE_NAVIGATION`**); clickability / placeholder risks (e.g. branch cards **hover** without drill-down); teacher-flow priorities; upload/receiving step template; terminology suggestions; UX risk register; recommended sequence **B → C → D** before real AI smoke; copy-paste implementation prompt. **No** SQL/RLS; **no** runtime changes in this milestone.
- Cross-refs: **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (AI Parent Reports workflow UX polish — 2026-05-02)

- **`src/pages/AiParentReports.jsx`** — workflow-oriented copy: report shell, evidence preview emphasis, **Generate draft from source evidence** with optional overrides group, manual version reframed, lifecycle release boundary; **Report detail** moved **above** Source Evidence Preview. **`src/components/layout/AppLayout.jsx`** — Company News popup slightly less intrusive (layout/styling only). **Docs:** **`docs/ai-parent-report-workflow-ux-polish-checkpoint.md`**; cross-refs in **`docs/manual-preview-product-direction-corrections.md`**, **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`**, **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** SQL/RLS; **no** `real_ai`; ParentView unchanged.

## Checkpoint update (manual visual QA runbook — hybrid source preview, 2026-05-02)

- **Docs-only:** **`docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`** — human QA for **Source Evidence Preview** (hybrid + demo) on **desktop** and **~390px**; surfaces, checklists, safety/privacy, known risks, next-milestone decision rule. **No** `src/` changes. Use before **real provider** key/call smoke; **no** ParentView change; **no** `real_ai` unlock.
- Cross-refs: **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**.

## Checkpoint update (Source Evidence Preview hybrid UI — docs finalization, 2026-05-02)

- **Docs-only:** canonical sealed reference **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`** — mode selection, preview/mock-draft behavior, safety, validation snapshot (**`d235344`**), future work, **recommended next A** (manual visual QA), copy-paste prompt §11. Cross-updates: **`docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`**, **`docs/ai-parent-report-source-preview-hybrid-ui-plan.md`**, **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**, **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**. **No** `src/` changes in this doc milestone.

## Checkpoint update (Source Evidence Preview hybrid UI — 2026-05-02)

- **`src/pages/AiParentReports.jsx`** — **`demoRole` / local demo:** `collectAiParentReportSourceEvidence` **`mode: 'fake'`**; **authenticated staff:** **`mode: 'hybrid'`** (same **`fetchSourceEvidenceBundle`** used for preview + mock-draft re-collect). **`Generate Mock Draft`** prefers loaded **`sourceEvidencePreview`**; **manual/source notes** override non-empty evidence fields per merge helper. **No** SQL/RLS changes; **no** `real_ai`; ParentView unchanged.
- **Docs:** sealed reference **`docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`**; index **`docs/ai-parent-report-source-preview-hybrid-ui-checkpoint.md`**; plan **`docs/ai-parent-report-source-preview-hybrid-ui-plan.md`**; preview UI **`docs/ai-parent-report-source-preview-ui-checkpoint.md`**; RLS aggregation checkpoint cross-ref updated.

## Checkpoint update (fake AI parent report source aggregation — 2026-05-02)

- **`src/services/aiParentReportSourceAggregationService.js`** — `collectAiParentReportSourceEvidence` (**`fake`** mode only); **`buildMockDraftInputFromSourceEvidence`** for mock draft bridge; **no** persistence; **no** parent visibility change.
- **Smoke:** `npm run test:supabase:ai-parent-report:source-aggregation` (no Supabase; no real data).
- **Docs:** `docs/ai-parent-report-source-aggregation-service-smoke-checkpoint.md` (detail), **`docs/ai-parent-report-source-aggregation-service-pass-checkpoint.md`**, UI **`docs/ai-parent-report-source-preview-ui-checkpoint.md`** (milestone **A** done: fake preview + mock-draft merge). **RLS aggregation:** **`docs/ai-parent-report-rls-source-aggregation-service-smoke-checkpoint.md`**, plan **`docs/ai-parent-report-rls-source-aggregation-plan.md`** — **`mode: 'rls'`** / **`hybrid`** on service; **no** DDL; UI still **fake** preview. **real_ai** still blocked. Email/notification still deferred.

## Checkpoint update (manual mobile QA checklist — AI report + parent comms)

- **`docs/manual-mobile-qa-ai-report-parent-communication-checkpoint.md`** — human QA before real provider keys; surfaces: staff **`AiParentReports`**, **`ParentView`** Progress Reports, **`Announcements`**, **`Sidebar`** nav; safety/privacy visual checks; recommended next **A** (UX fixes) vs **B** (staging smoke).
- No runtime changes in checkpoint milestone.

## Checkpoint update (AI parent report MVP final QA — docs only)

- **`docs/ai-parent-report-mvp-final-qa-checkpoint.md`** — summarizes MVP scope (SQL/RLS, staff/parent flows, mock AI, adapters, Edge HTTP skeleton); validation snapshot; **CHECK** notes; gaps before production real AI; decision **B** (manual mobile QA) vs **A** (staging secret + real smoke) when budget allows.
- **`docs/real-ai-provider-secret-model-smoke-plan.md`** remains the pre-key planning reference.

## Checkpoint update (real AI Edge HTTP skeleton — docs finalization)

- **Docs-only:** `docs/real-ai-parent-report-edge-http-final-checkpoint.md` — seals milestone **`b89239c`** (real OpenAI-compatible HTTP in `_shared`; **no** persistence; **`real_ai`** blocked; optional smoke **CHECK** without secrets).
- **Recommended next:** planning milestone **A** — provisional provider/model + dev/staging secret procedure before **`real_ai`** unlock or UI wiring.

## Checkpoint update (real AI parent report Edge HTTP — no persistence)

- OpenAI-compatible **real** provider HTTP in `supabase/functions/_shared/aiParentReportRealProviderHttp.ts` + `src/services/aiParentReportRealProviderHttp.js`; **`provider_not_configured`** without `AI_PARENT_REPORT_PROVIDER_API_KEY` + `AI_PARENT_REPORT_PROVIDER_MODEL`.
- `generateAiParentReportDraft` is **async**; Edge handler returns **`external_provider_call`**; HTTP **503** / **502** / **400** per error code. **No** `real_ai` DB unlock; **no** UI change.
- Smokes: `npm run test:supabase:ai-parent-report:edge-real-provider` (+ existing edge-adapter, provider-adapter). Doc: **`docs/real-ai-parent-report-edge-http-checkpoint.md`**.

## Checkpoint update (real AI provider tooling re-verification — docs only)

- Doc: **`docs/real-ai-provider-tooling-verification-checkpoint.md`** — **Deno 2.7.14** + **Supabase CLI 2.95.4** on Homebrew PATH (`/opt/homebrew/bin`); **`deno check`** Edge entry **PASS**; **`supabase functions` / `serve --help`** **PASS**; edge + provider adapter smokes **PASS**; no secrets; no deploy; **`real_ai`** still blocked; **`.gitignore`** includes `supabase/.temp/` (CLI cache).
- Next milestone **B:** real provider **Edge HTTP** with **no persistence** and **no** `real_ai` unlock (`docs/real-ai-parent-report-provider-implementation-plan.md`). Optional **C:** staging-only Edge secret when policy allows.

## Checkpoint update (real AI provider tooling verification — docs only)

- Superseded by re-verification above; first run (`c54fdd2`) documented missing CLI on default PATH in automated environment.

## Checkpoint update (AI parent report Edge adapter bundling — fake/disabled only)

- Edge-compatible adapter copy under **`supabase/functions/_shared/`** (`aiParentReportMockDraftCore.ts`, `aiParentReportProviderAdapter.ts`); **`generate-ai-parent-report-draft`** imports `_shared` only (no `../../../src`).
- Smoke: `npm run test:supabase:ai-parent-report:edge-adapter` (parity vs canonical `src/services` fake output); optional **CHECK** if `deno` / `supabase` CLI absent for full runtime validation.
- No real provider HTTP; no provider keys; no `real_ai` unlock; no persistence/auto-release from Edge scaffold.
- Docs: `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`; updated skeleton final + boundary plan + RLS checklist entries.

## Checkpoint update (AI parent report provider adapter skeleton — docs finalization)

- Docs-only final checkpoint:
  - `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`
- Implementation milestone remains:
  - adapter + mock core + Edge scaffold + smoke (`9f8ca6b` baseline).
- Next optional step:
  - linked-project **`supabase functions serve` / deploy** smoke when CLI available (bundling path via `_shared` is already mitigated).

## Checkpoint update (AI parent report provider adapter skeleton)

- Added fake/disabled-only provider boundary:
  - `src/services/aiParentReportProviderAdapter.js`
  - `src/services/aiParentReportMockDraftCore.js` (shared with mock draft path)
  - `supabase/functions/generate-ai-parent-report-draft/index.ts` (scaffold)
  - smoke: `npm run test:supabase:ai-parent-report:provider-adapter`
- No real AI HTTP calls; no provider keys; no UI changes; ParentView unchanged.
- `createAiParentReportVersion` still blocks `generationSource='real_ai'`.
- Checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-checkpoint.md`
- Final docs checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`

## Checkpoint update (mock AI parent report draft UI docs finalization)

- Final docs-only milestone checkpoint added:
  - `docs/mock-ai-parent-report-draft-ui-final-checkpoint.md`
- Confirmed boundaries for this milestone:
  - staff-side `Generate Mock Draft` only,
  - demo generation remains local-only and does not call Supabase,
  - authenticated path calls `generateMockAiParentReportDraft({ reportId, input })`,
  - no real provider/API wiring, no provider keys; Edge scaffold is **non-production** until bundling is verified,
  - no PDF/export, no notification/email/live-chat side effects,
  - no auto submit/approve/release,
  - ParentView remains released/current-version-only.
- Roadmap alignment (current): provider-boundary plan + adapter skeleton are done; next **Edge deploy/bundling check (fake only)** — `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`.

## Checkpoint update (mock AI parent report draft service + smoke)

- Added mock draft helper in service layer:
  - `src/services/supabaseWriteService.js`
  - `generateMockAiParentReportDraft({ reportId, input })`
- Helper currently enforces:
  - deterministic fake/dev draft wording,
  - version creation with `generationSource='mock_ai'`,
  - no real provider/API path,
  - no provider key dependency,
  - no auto-release.
- Added focused smoke:
  - `scripts/supabase-ai-parent-report-mock-draft-smoke-test.mjs`
  - `npm run test:supabase:ai-parent-report:mock-draft`
- Parent-safe release boundary remains unchanged:
  - draft versions remain non-parent-visible until explicit release.
- No SQL/RLS changes, no PDF/export, and no notification/email side effects in this milestone.
- Checkpoint doc:
  - `docs/mock-ai-parent-report-draft-service-smoke-checkpoint.md`
- Final pass checkpoint:
  - `docs/mock-ai-parent-report-draft-service-pass-checkpoint.md`
- Recommended next milestone:
  - **A. Real AI provider-boundary planning** (planning only; no real provider implementation yet).

## Checkpoint update (mock AI parent report draft UI wiring)

- Staff AI Parent Reports page now includes:
  - `Generate Mock Draft` action (staff-side only).
- Runtime behavior:
  - demo mode: local mock version simulation only,
  - authenticated mode: calls `generateMockAiParentReportDraft({ reportId, input })`.
- Boundaries preserved:
  - no real provider wiring,
  - no provider keys,
  - no auto-submit/approve/release,
  - no parent auto-visibility,
  - no PDF/export,
  - no notification/email side effects.
- UI checkpoint doc:
  - `docs/mock-ai-parent-report-draft-ui-checkpoint.md`

## Checkpoint update (AI parent report UI shell milestone)

- Added staff-side AI parent report UI shell:
  - route: `/ai-parent-reports`
  - page: `src/pages/AiParentReports.jsx`
  - staff navigation wired for HQ/supervisor/teacher.
- Workflow visibility now present in UI shell:
  - report list + detail,
  - manual draft create form,
  - manual/mock version create panel,
  - submit/approve/release/archive controls (release requires selected version).
- Demo behavior:
  - local fake/dev-only report rows and local lifecycle simulation,
  - no Supabase report calls in demo mode.
- Authenticated behavior:
  - existing AI parent report services via anon+JWT+RLS only.
- Boundaries preserved:
  - no SQL/RLS changes,
  - no provider integration,
  - no PDF/export,
  - no notification/email side effects,
  - ParentView remains parent-facing only.
- Checkpoint doc:
  - `docs/ai-parent-report-ui-shell-checkpoint.md`
- Final checkpoint doc:
  - `docs/ai-parent-report-ui-shell-final-checkpoint.md`
- Next recommended milestone:
  - ParentView released-report display planning first (no implementation in this docs checkpoint).

## Checkpoint update (ParentView released-report display UI milestone)

- ParentView now includes a parent-facing `Progress Reports` section.
- Scope is parent-safe released display only:
  - released reports only,
  - current-version-only content display,
  - no staff controls.
- Demo behavior:
  - local fake/dev released reports only.
- Authenticated behavior:
  - existing AI parent report read services with JWT + RLS.
- Boundary confirmation:
  - no evidence links/release-events/raw version history/raw AI/provider metadata in parent UI,
  - no SQL/RLS changes,
  - no provider wiring,
  - no PDF/export,
  - no notification/email side effects.
- Checkpoint doc:
  - `docs/parent-view-ai-report-display-ui-checkpoint.md`
- Final docs-only checkpoint:
  - `docs/parent-view-ai-report-display-final-checkpoint.md`
- Roadmap update:
  - next recommended milestone is now **A. Mock AI draft generator planning**.

## Checkpoint update (AI parent reports 030 manual DEV apply completed)

- Manual apply target:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- DEV verification confirms:
  - tables exist: `ai_parent_reports`, `ai_parent_report_versions`, `ai_parent_report_evidence_links`, `ai_parent_report_release_events`,
  - RLS enabled and policies present on all 4 tables,
  - helper functions present for branch/manage/access/insert/version access checks,
  - `ai_parent_reports.current_version_id` FK exists,
  - same-report pair FK exists: `(id, current_version_id) -> ai_parent_report_versions(report_id, id)`,
  - versions/release-events are append-first in MVP policy posture.
- Boundary reminder:
  - parent visibility remains released-only linked-child scoped,
  - student remains blocked in MVP,
  - no provider wiring, no PDF/export, no notifications/emails, no parent-visible report UI yet.
- Recommended next milestone:
  - AI parent report service + smoke with manual/mock source (before UI/provider).

## Checkpoint update (AI parent report SQL/RLS foundation draft added)

- New manual/dev-first SQL draft now exists:
  - `supabase/sql/030_ai_parent_reports_foundation.sql`
- `030` status:
  - draft-only,
  - not auto-applied,
  - no production apply assumption,
  - no runtime/UI/service changes in this checkpoint.
- `030` drafted entities:
  - `ai_parent_reports`
  - `ai_parent_report_versions`
  - `ai_parent_report_evidence_links`
  - `ai_parent_report_release_events`
- `030` drafted role/RLS intent:
  - HQ global manage/select,
  - branch supervisor own-branch manage/select,
  - teacher assigned/class-scoped draft/review manage,
  - parent released-only linked-child read,
  - student blocked in MVP.
- `030` drafted privacy boundaries:
  - AI drafts staff-only,
  - parent cannot read draft versions/raw AI notes,
  - no service-role frontend usage,
  - no auto-release behavior.
- Deferred remains explicit:
  - `ai_parent_report_pdf_exports`,
  - `ai_parent_report_templates`,
  - mock AI report draft service,
  - real provider integration,
  - report UI and PDF/export implementation.

## Checkpoint update (AI parent reports 030 pre-apply review fixes)

- `030` was reviewed before manual DEV apply and tightened in draft form.
- Fixes applied in `supabase/sql/030_ai_parent_reports_foundation.sql`:
  - same-report `current_version_id` FK hardening to prevent cross-report version pointer mistakes,
  - stricter assigned-teacher insert guard (same branch + class assignment alignment when class is set),
  - append-first history/audit posture by removing version/release-event update/delete policies.
- Boundaries preserved:
  - no SQL auto-apply,
  - no production apply assumption,
  - no UI/runtime/service/provider changes,
  - parent remains released-only linked-child scoped.
- Next manual step remains: DEV SQL editor review/apply only.

## Checkpoint update (final announcements/parent communication QA documented)

- Final communication-module QA checkpoint is now documented:
  - `docs/announcements-parent-communication-final-qa-checkpoint.md`
- Consolidated module status now includes:
  - staff internal Announcements (requests/reminders, read/done/undone/reply),
  - internal attachments,
  - MyTasks Announcement Requests visibility,
  - completion overview (HQ/supervisor),
  - Company News shell + runtime popup + HQ create/publish UI,
  - parent-facing announcements/events model + services + ParentView read-only UI,
  - staff Parent Notices creation + parent-facing media upload/release controls.
- Final boundary reminder:
  - no notifications/emails/live chat in this module milestone,
  - no SQL/RLS changes in this docs checkpoint,
  - no service-role frontend usage,
  - internal and parent-facing models remain separated.
- Recommended next major track after communication module consolidation:
  - **AI parent report blueprint / data-source planning first**,
  - do not jump straight to real AI provider wiring before blueprint/approval-flow definition.

## Checkpoint update (staff Parent Notices media UI wired)

- Staff `Announcements` now includes parent-facing media upload/list/preview/release/delete-confirmation controls inside Parent Notices detail.
- Existing media service methods are now wired in staff UI (no new backend services):
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)`.
- Role behavior in this milestone:
  - HQ/admin + branch supervisor: manager-scope media controls.
  - Teacher: view-only media section in Parent Notices detail.
  - Parent/student: no access to staff `Announcements` route.
- Demo behavior in this milestone:
  - HQ/supervisor demo media actions are local simulation only.
  - No Supabase media calls in demo mode.
- Boundaries preserved:
  - ParentView remains read-only and released-media-only.
  - Upload defaults unreleased; explicit release action required.
  - Signed URL preview only; no public URL and no `storage_path` display.
  - No SQL/RLS changes, no SQL apply, no notification/email side effects.

## Checkpoint update (parent-facing text-only creation UI wired)

- Staff-side parent-facing creation shell is now wired in `src/pages/Announcements.jsx` as `Parent Notices`.
- Existing parent-facing services are now used in UI wiring for this path:
  - `listParentAnnouncements(...)`
  - `createParentAnnouncement(...)`
  - `publishParentAnnouncement(...)`
  - `archiveParentAnnouncement(...)`
- Role behavior in this milestone:
  - HQ/admin and branch supervisor create/publish/archive where RLS allows,
  - teacher remains view-only,
  - parent/student remain blocked from staff route.
- Boundaries preserved:
  - ParentView remains read-only,
  - no parent media upload/release UI,
  - no SQL/RLS changes,
  - no notifications/emails/live chat.
- Canonical checkpoint:
  - `docs/parent-facing-creation-ui-checkpoint.md`

## Checkpoint update (creation documentation milestone complete)

- Parent-facing creation UI documentation milestone is complete (docs-only checkpoint).
- No runtime/UI/service/SQL/RLS changes were introduced in this documentation-only pass.
- Recommended next milestone:
  - **A. Parent-facing media upload/release UI planning** before any media UI wiring.

## Checkpoint update (ParentView announcements/events UI checkpoint documented)

- ParentView `Announcements & Events` UI shell milestone is now documented as complete.
- Key status:
  - read-only parent viewing surface is implemented,
  - no creation/publish/archive/delete/upload controls,
  - no SQL/RLS changes,
  - no notifications/emails,
  - no live chat.
- Behavior confirmation:
  - mobile-first featured/list/detail cards with type badges and event metadata,
  - demo mode uses local fake announcement/event data only,
  - authenticated mode uses existing parent-facing read/media/read-receipt services.
- Security/safety confirmation:
  - RLS-bound parent visibility only,
  - released-media signed URL path only,
  - no internal `internal_staff` announcement exposure,
  - no internal `announcement_attachments` exposure,
  - no `storage_path` display,
  - no service-role frontend usage.
- Validation snapshot retained:
  - `build/lint/typecheck` PASS,
  - parent-facing announcement/media smokes PASS,
  - phase1 regression PASS,
  - expected fixture CHECK notes remain non-blocking.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`
- Recommended next milestone now:
  - **A. Parent-facing creation UI planning** (planning only).


## Checkpoint update (ParentView announcements/events shell with demo parity)

- ParentView now includes a read-only `Announcements & Events` shell near parent communication surfaces.
- Scope is parent viewing only:
  - no parent-facing creation UI,
  - no staff creation/manage controls,
  - no upload controls in this shell milestone.
- Demo parity behavior:
  - uses local fake parent-facing announcements/events only,
  - no Supabase calls for demo announcements list/detail,
  - includes varied fake announcement/event types.
- Authenticated non-demo parent behavior:
  - list via `listParentAnnouncements({ status: 'published', includeArchived: false })`,
  - detail via `getParentAnnouncementDetail(...)`,
  - released media list via `listParentAnnouncementMedia(...)`,
  - released media open via `getParentAnnouncementMediaSignedUrl({ expiresIn: 300 })`,
  - non-blocking read-receipt call via `markParentAnnouncementRead(...)` on detail open.
- Media/read safety:
  - released-only media visibility remains RLS-gated,
  - signed URL only, no public URL model,
  - no `storage_path` display,
  - no internal `announcements-attachments` exposure/reuse.
- No SQL/RLS changes in this checkpoint.
- No notification/email/live chat behavior in this checkpoint.
- Canonical UI checkpoint doc:
  - `docs/parent-view-announcements-events-ui-checkpoint.md`


## Checkpoint update (parent-facing media smoke pass documented)

- Parent-facing media service milestone is now documented as PASS and stable.
- Confirmed service methods:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)`
- Boundary confirmation:
  - anon client + JWT + RLS only,
  - private bucket `parent-announcements-media` only,
  - signed URL only (no public URL model),
  - no service-role frontend,
  - no internal `announcements-attachments` bucket reuse.
- Release boundary confirmation:
  - upload defaults `released_to_parent=false`,
  - parent unreleased access blocked,
  - manager release helper gates released visibility.
- Smoke summary confirmation:
  - HQ upload/list/signed URL/release PASS,
  - parent unreleased deny + released allow PASS,
  - parent other-branch blocked PASS,
  - teacher blocked PASS,
  - student blocked/empty PASS,
  - cleanup PASS,
  - expected unrelated-parent credential CHECK remains.
- Validation confirmation:
  - `git diff --name-only` pre-test ran,
  - `build/lint/typecheck` PASS,
  - `test:supabase:parent-announcements:media` PASS,
  - `test:supabase:parent-announcements` PASS,
  - `test:supabase:announcements:phase1` PASS,
  - optional `company-news:create` + `announcements:attachments` PASS,
  - npm `devdir` warning remains non-blocking.
- No SQL/RLS changes in this checkpoint.
- No app UI/runtime behavior changes in this checkpoint.
- No notifications/emails/live chat in this checkpoint.
- Canonical doc:
  - `docs/parent-facing-announcements-media-service-smoke-checkpoint.md`
- Recommended next milestone now:
  - **A. ParentView announcements/events UI shell with demo parity** first.


## Checkpoint update (parent-facing media service + smoke)

- Parent-facing media service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadParentAnnouncementMedia(...)`
  - `listParentAnnouncementMedia(...)`
  - `getParentAnnouncementMediaSignedUrl(...)`
  - `releaseParentAnnouncementMedia(...)`
  - `deleteParentAnnouncementMedia(...)` (cleanup helper)
- Focused smoke script/command now exists:
  - `scripts/supabase-parent-announcements-media-smoke-test.mjs`
  - `npm run test:supabase:parent-announcements:media`
- Service posture:
  - anon client + JWT + RLS only,
  - private bucket only (`parent-announcements-media`),
  - signed URL only (no public URL path),
  - no service-role frontend usage,
  - no reuse of internal `announcements-attachments` bucket.
- Upload flow uses metadata-first path with cleanup attempt on object-upload failure.
- Upload validation includes media-role allowlist, content-type allowlist, and size boundary (`<= 25MB`).
- Release boundary update:
  - upload defaults `released_to_parent=false`,
  - manager release helper `releaseParentAnnouncementMedia(...)` sets `released_to_parent=true`,
  - parent access remains release-gated by existing RLS helper path.
- Smoke outcome intent/result:
  - manager upload/list/signed URL proof,
  - parent unreleased deny + released allow proof where fixture allows,
  - teacher/student media-block proof,
  - cleanup proof with CHECK-only warnings when fixture/session constrained.
- No app UI implementation in this checkpoint.
- No SQL/RLS changes in this checkpoint.
- No notifications/emails in this checkpoint.
- Canonical media checkpoint doc:
  - `docs/parent-facing-announcements-media-service-smoke-checkpoint.md`

## Checkpoint update (029 insert RLS manual DEV application + smoke proof)

- `029` manual apply target:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql`
- Supabase DEV SQL Editor result:
  - Success. No rows returned.
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.
- No parent-facing media service changes in this checkpoint.
- No media/email/notification behavior added.
- Root cause now documented as resolved:
  - before `029`, raw insert without `RETURNING` could succeed while `insert(...).select()` (`INSERT ... RETURNING`) failed with `42501`,
  - `RETURNING` path required `SELECT`-policy visibility for newly inserted draft rows,
  - `029` introduced `can_select_parent_announcement_row_029(...)` and `can_insert_parent_announcement_row_029(...)` policy-helper wiring to resolve this.
- SQL/RLS confirmation after manual apply:
  - `parent_announcements_insert_028` now uses `can_insert_parent_announcement_row_029(...)`,
  - `parent_announcements_select_028` now uses `can_select_parent_announcement_row_029(...)`,
  - helper functions exist: `can_insert_parent_announcement_row_029`, `can_select_parent_announcement_row_029`,
  - only parent-announcements insert/select policy wiring changed,
  - update/delete/target/media/read-receipt/storage policy surfaces remain unchanged,
  - parent read remains published + linked-child scoped,
  - teacher/student remain blocked,
  - supervisor own-branch safeguards remain preserved.
- Parent-facing smoke now strongly passes:
  - HQ context diagnostic + fixture discovery (`branch/class/student/other_branch`) resolved,
  - HQ create draft PASS,
  - HQ publish PASS,
  - HQ other-branch negative fixture PASS,
  - supervisor own-branch create PASS,
  - supervisor own-branch publish PASS,
  - supervisor mixed-target cross-branch create blocked PASS,
  - teacher create/manage blocked PASS,
  - parent create/manage blocked PASS,
  - parent linked published visible PASS,
  - parent detail read PASS,
  - parent mark own read receipt PASS,
  - parent unrelated other-branch blocked/empty PASS,
  - parent internal_staff blocked/empty PASS,
  - student blocked/empty PASS,
  - cleanup PASS.
- Remaining CHECK notes:
  - unrelated parent auth fixture credential-check remains skipped when credentials are missing/invalid,
  - parent negative branch coverage still exists via same parent blocked on unrelated other-branch fixture,
  - Phase1 optional cross-branch check remains env-fixture dependent when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing,
  - no unsafe access observed.
- Regression result note:
  - `npm run test:supabase:announcements:phase1` PASS,
  - request workflow unaffected,
  - parent/student remain blocked from internal_staff announcements,
  - optional cross-branch CHECK remains expected in fixture-missing contexts.
- Canonical checkpoint doc:
  - `docs/parent-facing-announcements-insert-rls-application-checkpoint.md`

This master handoff preserves product direction, implemented milestones, architecture constraints, and safe continuation priorities for future ChatGPT/Cursor sessions.

## Checkpoint update (028 parent-facing announcements SQL/RLS draft)

- New manual/dev-first SQL draft now exists:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- `028` status:
  - draft-only,
  - not auto-applied,
  - no production apply assumption.
- `028` uses separate parent-facing model (not mixed into internal `announcements` path):
  - `parent_announcements`
  - `parent_announcement_targets`
  - `parent_announcement_read_receipts`
  - `parent_announcement_media`
- `028` drafts private media bucket/policies:
  - `parent-announcements-media` (`public=false`, signed-URL model expected later).
- `028` keeps current boundaries:
  - no parent-facing UI/services in this milestone,
  - no internal `announcement_attachments` reuse,
  - no enabling of internal `parent_facing_media`,
  - no notification/email automation.
- `028` privacy-first role stance in draft:
  - HQ global manage,
  - branch supervisor own-branch manage,
  - teacher blocked from parent-facing management in MVP,
  - parent published targeted linked-child read path,
  - student blocked in MVP.
- `028` pre-apply security hardening now added:
  - helper `is_parent_announcement_supervisor_scope_safe_028(...)` enforces supervisor manage only when announcement row and all targets stay in one managed branch,
  - `can_manage_parent_announcement(...)` now uses this guard to block mixed-target cross-branch manage escalation.

## Checkpoint update (028 parent-facing announcements SQL manual DEV application)

- `028` is now manually applied in Supabase DEV:
  - `supabase/sql/028_parent_announcements_foundation.sql`
- Application posture:
  - no production apply,
  - no runtime/UI/service changes,
  - no notification/email behavior.
- Verification checkpoint confirms:
  - parent-facing tables exist (`parent_announcements`, `parent_announcement_targets`, `parent_announcement_read_receipts`, `parent_announcement_media`),
  - RLS and parent-facing table policies exist,
  - helper functions exist including `is_parent_announcement_supervisor_scope_safe_028(...)`,
  - private storage bucket `parent-announcements-media` exists with storage policies.
- Safety boundaries preserved:
  - parent-facing model remains separate from internal announcements,
  - internal `announcement_attachments` are not reused in parent-facing model,
  - internal `parent_facing_media` remains disabled/reserved,
  - no parent-facing UI/services in this checkpoint.
- Canonical SQL application checkpoint doc:
  - `docs/parent-facing-announcements-sql-application-checkpoint.md`

## Checkpoint update (parent-facing announcements service + smoke)

- Parent-facing announcements service methods are now added:
  - read: `listParentAnnouncements(...)`, `getParentAnnouncementDetail(...)`
  - write: `createParentAnnouncement(...)`, `publishParentAnnouncement(...)`, `archiveParentAnnouncement(...)`, `markParentAnnouncementRead(...)`
- Focused smoke command now exists:
  - `npm run test:supabase:parent-announcements`
- This service checkpoint keeps boundaries:
  - no app UI wiring and no ParentView shell in this milestone,
  - no parent-facing media upload/service in this milestone,
  - no SQL/RLS changes,
  - no notifications/emails.
- Parent visibility remains RLS-bound with anon client + JWT only.
- Service checkpoint doc:
  - `docs/parent-facing-announcements-service-smoke-checkpoint.md`
- Smoke CHECK diagnostics are now improved:
  - includes actor role/is_active/branch and fixture found/missing states without secret logging.
- Current blocker note:
  - parent-announcements create-path CHECKs are currently RLS insert denials (`42501`) in DEV for HQ/supervisor create probes.
- Service payload note:
  - create payload shape is aligned to parent-announcements draft expectations (`draft` status, self creator, allowed announcement type).
- Follow-up draft patch note:
  - `supabase/sql/029_fix_parent_announcements_insert_rls.sql` added as manual/dev-first review patch (not auto-applied).
- Fixture status note:
  - branch/class/student discovery now has env override + deterministic fake fallback,
  - unrelated-parent proof remains dependent on optional fake unrelated-parent auth credentials.

## Checkpoint update (authenticated HQ Company News create UI wired)

- `Announcements` now wires authenticated HQ-only Company News create/publish UI using existing services:
  - `createCompanyNews(...)`
  - `publishCompanyNews(...)`
- Flow behavior:
  - `Save Draft` -> `createCompanyNews(...)`
  - `Create & Publish` -> `createCompanyNews(...)` then `publishCompanyNews(...)`
- Publish requires at least one target and validates target presence before publish call.
- Supported target types remain `branch|role|profile`; class target is not added in this milestone.
- Branch supervisor and teacher remain view-only for Company News create in authenticated mode.
- Parent/student remain blocked from staff Announcements route.
- Demo behavior remains local-only and preserves `demoRole` fallback:
  - HQ demo create is local-only,
  - supervisor/teacher demo do not create Company News.
- Submit controls are disabled while pending.
- Success path refreshes announcements, switches to Company News context, and selects created item when available.
- Error copy remains safe and generic (no raw SQL/RLS/env leakage).
- Company News remains excluded from MyTasks by default.
- No notification/email/live chat side effects were added.
- Parent-facing announcements/events remain future.
- No SQL/RLS changes were introduced in this milestone.

## 0) Product language — Parent Communication vs Announcements (2026-05-02)

- **Parent Communication** (staff route **`/parent-updates`**, formerly “Parent Updates” in copy): teacher-created **class updates**—memories, quick comments, weekly progress—not **official** centre notices or events.
- **Announcements** module: **Requests** (internal tasks), **Company News** (internal), **Parent Notices** (official parent-facing). Do not conflate with Parent Communication.
- **AI Parent Reports:** long term, drafts should use **system evidence** and **teacher review**; manual fields in MVP are **source notes**; see `docs/manual-preview-product-direction-corrections.md`.
- **Email/notification automation:** still **deferred**.

## 1) Product identity and vision

**Young’s Learners / Enrichify Class Flow** is not just an admin dashboard.  
It is an AI-driven education operations + parent trust + learning evidence platform.

Direction to preserve:

- Mobile-first for parent and teacher daily workflows.
- Desktop/laptop-capable for HQ and supervisor reporting/review.
- Future school/curriculum personalisation foundation.
- Future AI learning intelligence layer.
- Build toward a stable, careful, "perfect portal" direction over rushed, unstable feature expansion.

## 2) Current project stage

Current stage should be treated as:

- Strong internal prototype / full-stack hardening stage.
- Not production-ready yet.
- Several real Supabase RLS-backed workflows are already implemented and validated with smoke tests.

## 3) Major completed verticals

Implemented milestones to preserve as "already done":

- Supabase auth/login/role landing foundation.
- Supabase read/write service patterns (anon client + JWT model).
- MyTasks write flow.
- Attendance write flow.
- Parent Communication (route `/parent-updates`) Quick Comment draft/release flow.
- Weekly Progress Report draft/release flow.
- Fee/payment proof exception workflow.
- Staff Time Clock full vertical.
- Class Memories full vertical.
- AI mock/fallback draft layer (provider-free runtime).

## 4) Fee/payment proof business rule (locked)

This business logic is locked and should remain explicit in future docs/features:

1. Normal payment is internally tracked and confirmed by supervisor/HQ.
2. Invoice/e-invoice is sent after confirmed payment (automation can come later).
3. Parent payment proof upload is exception-only.
4. Parent upload is used only when office cannot confirm payment internally.
5. HQ/supervisor verifies or rejects submitted proof.
6. Parent upload UX must not look like the normal/default payment flow.

## 5) Staff Time Clock product rule (locked)

Staff Time Clock is not button-only attendance.

Required product behavior:

- Active GPS/geofence verification at both clock-in and clock-out.
- Selfie proof at clock-in and clock-out.
- No continuous/background tracking by default.
- Staff punch flow is mobile-first.
- HQ/supervisor review/reporting is desktop-friendly.
- Selfie evidence is private storage with signed URL access only.

Planned future hardening:

- Review actions.
- Export/report tools.
- Adjustment request handling.
- Retention + consent policy finalization.

## 6) Class Memories product rule (locked)

Use the product language **Memory / Memories / Class Memories**, not "class photo".

Required behavior and UX direction:

- Class Memories is for warm parent engagement + learning evidence.
- Teacher upload originates from ParentUpdates/class workflow.
- Approval gate required before parent visibility.
- Parent-facing Latest Memory hero card.
- Memories History should be gallery/grid style, not long stacked list.
- Media remains private storage with signed URL access only.

Planned next enhancements:

- Hide/archive UI wiring.
- Video support.
- Thumbnail generation.
- Consent/photo policy finalization.

## 7) AI strategy (locked)

AI architecture and product guardrails:

- AI output is draft-only.
- Teacher/staff approval is required before parent visibility.
- No direct frontend LLM provider calls.
- Real AI must run through Supabase Edge Function/server-side secret boundary.
- First real AI use case should be parent comment draft generation.

Recommended later AI sequence:

1. Weekly report AI drafts.
2. Homework feedback/marking.
3. Learning gap detection.
4. Next-week recommendations.
5. Curriculum-aware AI personalization.

## 8) Security / RLS / storage rules (locked)

Non-negotiable implementation rules:

- Frontend uses Supabase anon client + JWT only.
- Service role key is never used in frontend.
- Private buckets by default.
- Signed URLs only for sensitive object access.
- `demoRole` must not write to Supabase.
- Parent/student can only see approved and linked content.
- Teacher access is branch/class scoped.
- Branch supervisor access is own-branch scoped.
- HQ can access all branches by policy.
- For risky workflow changes, run smoke tests before UI wiring.

## 9) Validation rule (efficiency policy)

Use the smallest validation scope that matches blast radius:

- **Docs-only:** run `git diff --name-only`.
- **UI-only changes:** run build/lint/typecheck.
- **Service/backend changes:** run build/lint/typecheck + relevant smoke test(s).
- **SQL/RLS/storage/auth/shared risky changes:** run broader/full validation.
- Avoid running full suite after tiny or docs-only changes.

## 10) Known limitations (not production-ready yet)

Current non-production gaps:

- Password reset and production auth polish.
- Real onboarding/admin user management.
- Production privacy/consent wording finalization.
- Data migration and seed cleanup plan.
- Full mobile QA on real iOS/Android devices.
- Exports/monthly reporting completeness.
- Invoice/e-invoice automation.
- Real AI provider integration.
- School/curriculum onboarding not implemented in product flow yet.
- Homework upload/review pipeline not implemented in production shape yet.
- Production monitoring/on-call/support process not finalized.

## 11) Recommended roadmap from here

Recommended order:

A. Project master handoff doc (this doc)  
B. School/curriculum onboarding foundation  
C. Homework upload/review pipeline  
D. Real AI provider integration for parent comments  
E. AI weekly report generation  
F. AI homework feedback/marking  
G. Production auth/privacy/mobile QA hardening  
H. Pilot deployment plan

Why school/curriculum before real AI:

AI needs structured learning context to be truly differentiated, accurate, and school-aligned. Without school/curriculum context, generated output is more generic and less operationally valuable.

Current status note:

- School/curriculum SQL/RLS draft now exists at `supabase/sql/012_school_curriculum_foundation.sql`.
- It is additive/manual draft and is now manually applied in Supabase dev.
- School/curriculum read service + read smoke test are now added for role-scoped read validation.
- School/curriculum fake seed draft exists at `supabase/sql/013_school_curriculum_fake_seed_data.sql` (manual/dev-only).
- School/curriculum fake seed is now manually applied in Supabase dev (Success / No rows returned).
- Fake seed application checkpoint is documented at `docs/school-curriculum-fake-seed-application-checkpoint.md`.
- Classes page read-only curriculum context preview is now started (RLS-scoped read only; no assignment/edit writes).
- Students page read-only school/learning context preview is now started (RLS-scoped read only; no profile write/edit controls).
- ParentView parent-friendly learning focus summary is now started (read-only bridge from curriculum context to parent-facing language).
- School/curriculum class assignment write service is now added in `src/services/supabaseWriteService.js` (service layer only; no UI wiring).
- School/curriculum class assignment write smoke test is now added at `scripts/supabase-school-curriculum-write-smoke-test.mjs`.
- `Classes` curriculum assignment/edit UI is now wired for HQ + branch supervisor using existing write services (teacher/parent/student remain without write controls).
- Student school profile write service is now added in `src/services/supabaseWriteService.js` (service layer only; `Students` edit UI still unwired).
- Student school profile write smoke test is now added at `scripts/supabase-school-profile-write-smoke-test.mjs`.
- `Students` school profile edit UI is now wired for HQ + branch supervisor using existing student profile upsert service (teacher/parent/student remain without edit controls).
- School/curriculum UI now has read/write coverage on `Classes` + `Students`; AI integration remains unwired.
- Parent comment AI mock path now includes curriculum-aware context assembly in `src/services/aiDraftService.js` (provider-free, draft-only, teacher approval still required).
- Homework upload/review foundation SQL/storage/RLS exists at `supabase/sql/014_homework_upload_review_foundation.sql` and is now manually applied in Supabase dev (runtime/UI wiring still pending). Draft includes path-convention validation helper and staff-only submission updates.
- Application checkpoint is documented at `docs/homework-sql-application-checkpoint.md`.
- Homework runtime service + fake file smoke test are now started (`src/services/supabaseUploadService.js`, `scripts/supabase-homework-upload-smoke-test.mjs`) with metadata-first upload and private signed URL checks using fake files only.
- `015` has been manually applied in dev to fix UUID path-prefix matching for metadata-first homework file insert.
- Parent direct submission insert investigation found policy recursion for first parent submission; patch draft exists at `supabase/sql/016_fix_homework_parent_submission_insert.sql` (manual apply only, not applied yet).
- Homework flexible assignment additive SQL/RLS (`017`) is now manually applied in Supabase dev:
  - `supabase/sql/017_homework_task_assignees_foundation.sql`
  - checkpoint doc: `docs/homework-task-assignees-sql-application-checkpoint.md`
- `017` introduces optional `homework_tasks.assignment_scope` and `homework_task_assignees` RLS model to support explicit student/small-group assignment rows.
- `017` includes an assignee alignment guard so task/branch/class/student mismatch rows are rejected at write time.
- Manual marked homework file role/release additive SQL/RLS patch `018` is now manually applied in Supabase dev:
  - `supabase/sql/018_homework_file_roles_release_foundation.sql`
  - checkpoint doc: `docs/homework-file-role-release-sql-application-checkpoint.md`
- `018` adds role/release metadata to `homework_files` and release-aware read restrictions so parent/student marked-file visibility is gated until release.
- `018` draft preserves current parent upload compatibility via backward-compatible default `file_role = 'parent_uploaded_homework'`.
- Manual marked-file service methods are now added in `src/services/supabaseUploadService.js`:
  - `uploadMarkedHomeworkFile(...)`
  - `listHomeworkFiles({ homeworkSubmissionId, fileRole, parentVisibleOnly })`
  - `releaseHomeworkFileToParent(...)`
- Marked-file smoke test is now added at `scripts/supabase-homework-marked-file-smoke-test.mjs` with package command `npm run test:supabase:homework:marked-file`.
- Teacher marked-file UI shell is now added in `src/pages/Homework.jsx` review detail panel:
  - demo mode uses local fake list/upload/release/view behavior only,
  - authenticated non-demo mode now wires real marked-file upload/list/view/release actions with existing marked-file services.
- Marked-file release action does not auto-release feedback and does not trigger notification side effects in this phase.
- Parent released marked-file display runtime wiring remains future.
- Parent `Teacher-marked work` display shell is now added in `src/pages/ParentView.jsx` under released feedback cards:
  - demo mode uses local fake released marked-file display and local preview toast only,
  - authenticated non-demo mode currently shows safe waiting copy shell only,
  - real parent marked-file list/signed URL wiring remains future.
- Parent `Teacher-marked work` real read/open wiring is now added in `src/pages/ParentView.jsx` for authenticated non-demo flow:
  - read uses `listHomeworkFiles({ homeworkSubmissionId, fileRole: 'teacher_marked_homework', parentVisibleOnly: true })` for visible submission UUIDs only,
  - open uses `getHomeworkFileSignedUrl(...)` signed URL only,
  - parent-safe empty state remains and does not hint unreleased file existence.
- Parent marked-file release boundary remains protected in this shell milestone:
  - no parent visibility for unreleased teacher-marked files,
  - no teacher controls/upload controls in parent area,
  - no internal notes/raw IDs in parent output.
- AI OCR/provider path for marked files remains future and is not wired in parent display flow.
- Assignee-aware homework read service baseline is now added in `src/services/supabaseReadService.js`:
  - `listHomeworkTaskAssignees(...)`
  - `listAssignedHomeworkForStudent(...)`
- Assignee-read smoke test is now added at `scripts/supabase-homework-assignees-read-smoke-test.mjs` with package command `npm run test:supabase:homework:assignees:read`.
- Homework tracker-focused read service methods are now added in `src/services/supabaseReadService.js`:
  - `listHomeworkTrackerByClass(...)`
  - `listHomeworkTrackerByStudent(...)`
- Tracker-read smoke test is now added at `scripts/supabase-homework-tracker-read-smoke-test.mjs` with package command `npm run test:supabase:homework:tracker:read`.
- Homework assignment write-service MVP is now added in `src/services/supabaseWriteService.js`:
  - `createHomeworkTaskWithAssignees(...)`
  - `assignHomeworkTaskToStudents(...)`
- Assignment write-service MVP supports class, selected-student, and individual homework creation paths via anon client + JWT + RLS only.
- Assignment-write smoke test is now added at `scripts/supabase-homework-assignment-write-smoke-test.mjs` with package command `npm run test:supabase:homework:assignment:write`.
- Teacher Homework UI shell now includes `By Task` / `By Student` segmented structure with demo parity in `src/pages/Homework.jsx`.
- Demo mode now shows local fake task/student tracker cards and quick status badges while preserving no-Supabase/no-provider behavior.
- Authenticated non-demo Homework now wires real `By Task` tracker read using `listHomeworkTrackerByClass(...)` with UUID-safe class handling.
- Authenticated non-demo Homework now wires real `By Student` tracker read using `listHomeworkTrackerByStudent(...)` with UUID-safe student selection from visible homework data.
- `By Task` tracker behavior remains preserved while adding `By Student`.
- `Homework` now includes `Create Homework` UI shell with demo parity:
  - local/demo mode uses fake local form + fake local create simulation only,
- authenticated non-demo mode now wires guarded save to existing `createHomeworkTaskWithAssignees(...)` with validation and query refresh behavior.
- Selected-student assignment write services are now used by the `Homework` create shell in authenticated non-demo mode.
- Manual marked-file upload remains future.
- Existing homework runtime/UI workflow remains unchanged until later service/UI migration; parent assigned-but-not-submitted visibility should later move to assignee-row based reads.
- Real assignment edit/archive wiring remains future.
- Manual marked-file upload remains future.
- AI provider integration remains future.
- Announcements/Internal Communications remains future.
- Homework feedback write service + smoke test are now started (`src/services/supabaseWriteService.js`, `scripts/supabase-homework-feedback-smoke-test.mjs`) for draft/create-update, review transition, release-to-parent, and parent draft-hidden checks.
- Parent-visible feedback read path now omits `internal_note` from service response when `parentVisibleOnly` is requested.
- Teacher homework review UI is now minimally wired on `src/pages/Homework.jsx` for staff-only queue/detail/draft workflow using existing homework read/write services.
- Parent read-only homework status/list UI is now wired on `src/pages/ParentView.jsx` for linked-child visibility using anon client + RLS reads only.
- Parent homework upload form is now minimally wired on `src/pages/ParentView.jsx` for assigned/open tasks using existing submission/upload services.
- Parent released homework feedback display is now wired on `src/pages/ParentView.jsx` using `listHomeworkFeedback({ parentVisibleOnly: true })` with parent-safe fields only (`feedback_text`, `next_step`, release date).
- `internal_note` remains protected from parent-visible service/UI path.
- Demo preview parity is now improved for Homework + Memories:
  - parent demo Homework shows local upload/submit workflow shape and released-feedback example,
  - teacher demo Homework shows local review queue/detail/feedback workflow shape (no Supabase calls),
  - demo Class Memories History now uses gallery/grid style instead of stacked cards.
- Mock homework AI feedback context builder is now added in `src/services/aiDraftService.js` (`buildHomeworkFeedbackDraftContext(...)`, `generateMockHomeworkFeedbackDraft(...)`) with safe context assembly and draft-only output.
- Homework AI mock test is now added at `scripts/ai-homework-feedback-mock-test.mjs` and package command `npm run test:ai:homework-feedback:mock`.
- `Homework` teacher review panel now includes mock-only `Draft feedback with AI` action that fills editable draft fields only (no auto-save/release, no real provider/API call).
- Supabase Edge Function homework AI stub is now added at `supabase/functions/generate-homework-feedback-draft/index.ts` with local handler `supabase/functions/generate-homework-feedback-draft/handler.js` and local contract test `scripts/ai-homework-edge-function-stub-test.mjs`.
- Homework Edge Function stub now includes auth/scope helper flow with Supabase JWT user verification path, role gating (teacher/branch supervisor/HQ only), and submission/task/student/class relationship checks while preserving deterministic draft-only mock output.
- Frontend wrapper is now added at `src/services/aiDraftService.js` (`generateHomeworkFeedbackDraftViaEdgeFunction(...)`) with stable `{ data, error }` handling and required-ID validation; local mock remains default unless explicitly feature-flagged.
- Deployed regression script is now added at `scripts/ai-homework-edge-function-deployed-regression-test.mjs` to validate Edge Function auth/scope behavior in dev deployment with fake/dev fixtures and graceful `CHECK` handling when fixtures are unavailable.
- Frontend `Homework` page remains on local mock draft button path in this phase; provider wiring and broader deployed-environment auth regression hardening remain future work.
- Supabase CLI login is now completed manually and project is linked to `fwturqeaagacoiepvpwb`.
- `generate-homework-feedback-draft` is now deployed to Supabase dev and reachable via deployed regression.
- Deployed regression now shows:
  - `PASS` missing auth -> `401`
  - `PASS` invalid token -> `401`
  - `PASS` parent blocked -> `403`
  - `PASS` student blocked -> `403`
  - `CHECK` teacher/branch supervisor/HQ allowed-role cases due missing accessible fake fixtures
  - `CHECK` relationship mismatch due missing allowed-role fixture
- Deployed regression fixture handling is now improved in `scripts/ai-homework-edge-function-deployed-regression-test.mjs`:
  - optional explicit fixture env IDs: `AI_HOMEWORK_TEST_SUBMISSION_ID`, `AI_HOMEWORK_TEST_TASK_ID`, `AI_HOMEWORK_TEST_STUDENT_ID`, `AI_HOMEWORK_TEST_CLASS_ID`,
  - UUID + relationship validation for explicit fixture IDs before allowed-role tests,
  - role-accessible fallback discovery when explicit IDs are not configured,
  - clearer `CHECK` reasons when fixtures are unavailable.
- Dev-only stable fixture baseline SQL draft is now added at `supabase/sql/019_ai_homework_deployed_regression_fixture.sql`:
  - additive/manual-dev only,
  - no destructive operations,
  - fake-only branch/class/student/task/submission baseline for deployed regression,
  - helper SELECT output for local `AI_HOMEWORK_TEST_*` values,
  - not applied automatically in this milestone.
- `019` fixture baseline is now manually applied in Supabase dev only (no production apply) using fake/dev data only.
- Live deployed AI homework Edge Function regression now has full PASS coverage:
  - `PASS` missing auth -> `401`
  - `PASS` invalid token -> `401`
  - `PASS` parent blocked -> `403`
  - `PASS` student blocked -> `403`
  - `PASS` assigned teacher/branch supervisor own-branch/HQ allowed-role cases
  - `PASS` mismatched task/student/class blocked cases
  - `PASS` draft-only safety note present and no auto-save side effect
- AI homework Edge Function provider adapter stub is now added in `supabase/functions/generate-homework-feedback-draft/providerAdapter.js`:
  - provider mode supports `mock`, `disabled`, and `future_real_provider_placeholder`,
  - default behavior is provider-disabled local stub output (`externalCall: false`),
  - no provider keys/secrets added in repo,
  - no real provider API wiring in this milestone.
- Provider integration remains unwired/disabled; no provider keys added; draft-only and teacher-approval gate remain unchanged.
- AI homework feedback remains a future milestone after full human workflow hardening.
- Announcements Phase 1 SQL/RLS foundation draft is now added at `supabase/sql/020_announcements_phase1_foundation.sql`:
  - manual/dev-first draft only,
  - additive and non-destructive,
  - fake/dev data only,
  - not applied automatically in this milestone,
  - drafted tables: `announcements`, `announcement_targets`, `announcement_statuses`, `announcement_replies`,
  - conservative internal staff RLS scope for HQ/supervisor/teacher; parent/student access remains blocked in Phase 1.
- `020` pre-apply review hardening is now completed before manual dev apply:
  - fixed supervisor target-write scope gap by adding helper `can_manage_announcement_target_write(...)`,
  - `announcement_targets` insert/update now enforce own-branch scope for branch supervisor target writes.
- `020` is now manually applied in Supabase dev SQL Editor (Success / No rows returned):
  - no production apply,
  - no runtime/UI/service changes in this checkpoint,
  - Phase 1 tables confirmed in dev:
    - `announcements`
    - `announcement_targets`
    - `announcement_statuses`
    - `announcement_replies`,
  - `pg_policies` verification showed policies for all four tables (16 rows visible),
  - helper verification confirmed:
    - `announcement_branch_id`
    - `can_access_announcement`
    - `can_manage_announcement`
    - `can_manage_announcement_target_write`
    - `is_announcement_targeted_to_profile`,
  - `information_schema` verification returned 42 column rows across the four Phase 1 tables.
- Announcements Phase 1 read/write service layer is now added:
  - `src/services/supabaseReadService.js`:
    - `listAnnouncements(...)`
    - `listAnnouncementTargets(...)`
    - `listAnnouncementStatuses(...)`
    - `listAnnouncementReplies(...)`
  - `src/services/supabaseWriteService.js`:
    - `createAnnouncementRequest(...)` (safe default `status = draft`)
    - `publishAnnouncement(...)`
    - `markAnnouncementRead(...)`
    - `updateAnnouncementDoneStatus(...)`
    - `createAnnouncementReply(...)`
- Announcements Phase 1 smoke test is now added:
  - `scripts/supabase-announcements-phase1-smoke-test.mjs`
  - package command: `npm run test:supabase:announcements:phase1`
- Service and smoke layer keep guardrails:
  - anon client + JWT + RLS only,
  - no service role in frontend,
  - no attachment upload/public URL behavior in this milestone,
  - no auto email/notification behavior in this milestone.
- Announcements service smoke checkpoint result (current):
  - build/lint/typecheck passed,
  - `test:supabase:announcements:phase1` exited successfully with safe CHECK skips in current fixture context,
  - HQ/supervisor create and teacher-targeted proof remains incomplete pending focused fixture/RLS investigation,
  - latest diagnosis shows HQ/supervisor fake profiles are currently inactive (`is_active=false`), which causes `current_user_role()` helper checks to fail staff-role authorization as designed,
  - recommendation: resolve create/RLS CHECK skips before Announcements UI wiring.
- Announcements fake fixture activation SQL draft `021` is now prepared:
  - `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql`,
  - manual/dev-only draft (not auto-applied),
  - fake `example.test` fixture activation/alignment only,
  - no RLS weakening, no real data, no secrets.
- Next required step for Announcements Phase 1 proof:
  - manual review/apply `021` in Supabase dev SQL Editor,
  - rerun `npm run test:supabase:announcements:phase1`,
  - keep Announcements UI wiring paused until create/status/reply path is proven.
- Announcements create-path RLS follow-up draft is now added:
  - `supabase/sql/022_fix_announcements_insert_rls.sql`,
  - manual/dev-only patch (not auto-applied),
  - fixes HQ/supervisor create-path CHECK after fixture activation by using direct row-predicate checks in `announcements` select/insert policies,
  - keeps teacher/parent/student create blocked and preserves cross-branch restrictions.
- Updated Announcements next required proof sequence:
  - manual review/apply `022` in Supabase dev SQL Editor,
  - rerun `npm run test:supabase:announcements:phase1`,
  - proceed to UI only after HQ/supervisor create and downstream targeted flow are proven.
- Announcements Phase 1 smoke PASS checkpoint is now reached in dev:
  - `021` manually applied,
  - `022` manually applied,
  - PASS: HQ create, supervisor own-branch create/publish, teacher targeted read/status/reply, parent/student internal_staff block, cleanup,
  - CHECK: optional cross-branch negative fixture still skipped without `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`.
- Recommended immediate next milestone is now:
  - Staff Announcements UI shell with demo parity first,
  - keep real UI wiring, attachments, MyTasks integration, Company News pop-up, and parent-facing rollout in later phases.
- Staff Announcements UI shell milestone is now implemented:
  - route/page: `/announcements` via `src/pages/Announcements.jsx`,
  - staff nav tab added after `Dashboard` for HQ/supervisor/teacher only,
  - demo mode uses local fake behavior (local create/status/reply only; no Supabase calls),
  - authenticated mode is intentionally preview-only with no real announcements service wiring in this milestone.
- Announcements next milestone priority is now:
  - real authenticated Announcements UI wiring first (read/status/reply/create using existing services),
  - then attachments, MyTasks integration, Company News pop-up behavior, and parent-facing rollout.
- Real authenticated Staff Announcements UI wiring is now implemented in `src/pages/Announcements.jsx`:
  - authenticated non-demo read list/detail wiring now uses existing Phase 1 services,
  - authenticated non-demo create request wiring is enabled for HQ/supervisor only,
  - authenticated non-demo status/reply wiring is enabled (mark read, done/undone, reply),
  - demo mode remains local-only fake data with no Supabase calls.
- Announcements attachments remain Phase 2+ and are intentionally not included in `020`.
- Announcements MyTasks integration remains Phase 2+ and is intentionally not included in `020`.
- Company News pop-up runtime behavior remains Phase 3.
- Parent-facing announcements/events runtime rollout remains Phase 4.
- Live chat remains Phase 5+ only if needed.
- Notification/email workflow remains a future milestone.
- Announcements attachments Phase 2 SQL/RLS draft now exists at `supabase/sql/023_announcements_attachments_foundation.sql`:
  - manual/dev-first draft only,
  - now manually applied in Supabase dev (successful),
  - pre-apply security/data-model review completed,
  - no production apply assumption,
  - drafts `announcement_attachments` metadata table + internal staff RLS + private storage policies,
  - includes review hardening: unique `storage_path` index and bounded `file_size` check (`<= 25MB`),
  - keeps parent/student blocked and keeps `parent_facing_media` blocked in this phase.
- `023` application verification checkpoint confirms:
  - `announcement_attachments` exists with 13 verified columns,
  - metadata RLS policies exist on `announcement_attachments`,
  - helper functions exist (`announcement_attachment_announcement_id`, `announcement_attachment_branch_id`, `can_access_announcement_attachment`, `can_manage_announcement_attachment`),
  - storage bucket `announcements-attachments` exists with `public=false`,
  - storage object policies exist for select/insert/update/delete paths.
- Announcements attachments service + smoke checkpoint is now added:
  - service methods in `src/services/supabaseUploadService.js`:
    - `uploadAnnouncementAttachment(...)`
    - `listAnnouncementAttachments(...)`
    - `getAnnouncementAttachmentSignedUrl(...)`
    - `deleteAnnouncementAttachment(...)` (cleanup helper path),
  - smoke script: `scripts/supabase-announcements-attachments-smoke-test.mjs`,
  - command: `npm run test:supabase:announcements:attachments`,
  - checkpoint doc: `docs/announcements-attachments-service-smoke-checkpoint.md`.
- Upload CHECK investigation update:
  - post-024 diagnostics show raw metadata insert (without RETURNING) succeeds,
  - current service CHECKs are isolated to SELECT policy behavior on `INSERT ... RETURNING`,
  - follow-up manual/dev SQL patch draft now exists:
    - `supabase/sql/024_fix_announcements_attachments_insert_rls.sql`,
    - `supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`,
  - `024` keeps parent/student blocked, keeps `parent_facing_media` blocked, and avoids storage public-access widening.
- Announcements attachments smoke PASS checkpoint is now reached after manual `025` apply:
  - PASS HQ create fixture + upload/list/signed URL + no public URL pattern,
  - PASS supervisor own-branch create/publish + upload/signed URL,
  - PASS teacher targeted visibility + `response_upload` upload/list,
  - PASS teacher blocked for `hq_attachment`,
  - PASS parent/student internal attachment list/read blocked-or-empty,
  - PASS cleanup for attachment rows and announcement fixtures.
- CHECK lines in attachment smoke output are now treated as diagnostic evidence only:
  - actor context and insert predicate behavior checks,
  - raw insert without RETURNING confirmation,
  - not failing skips.
- Interpretation now locked:
  - metadata insert-RLS issue addressed by `024` + follow-up,
  - `INSERT ... RETURNING` select-RLS issue addressed by `025`,
  - internal attachment boundary (service + RLS + storage) is proven for main paths.
- Attachments UI remains unwired in this checkpoint.
- Staff Announcements attachments UI wiring is now active in `src/pages/Announcements.jsx`:
  - authenticated non-demo detail panel now wires attachment list/upload/view with existing services only,
  - list uses `listAnnouncementAttachments({ announcementId })`,
  - upload uses `uploadAnnouncementAttachment({ announcementId, file, fileRole, staffNote })`,
  - view uses `getAnnouncementAttachmentSignedUrl({ attachmentId, expiresIn: 300 })` with signed URL open in new tab,
  - no raw `storage_path` shown in UI,
  - demo mode attachment behavior remains local-only fake list/upload/view simulation (no Supabase calls).
- Checkpoint doc:
  - `docs/announcements-attachments-sql-application-checkpoint.md`.
- PASS checkpoint doc:
  - `docs/announcements-attachments-service-smoke-pass-checkpoint.md`.
- Attachments UI checkpoint doc:
  - `docs/staff-announcements-attachments-ui-checkpoint.md`.
- Recommended next milestone now is:
  - **MyTasks integration planning** next,
  - then Company News warm pop-up planning and parent-facing announcement/event planning,
  - live chat feasibility remains later/optional.
- Announcements MyTasks derived-read service milestone is now started:
  - `src/services/supabaseReadService.js` now includes `listMyAnnouncementTasks({ includeDone, statusFilter })`,
  - derived read uses existing RLS-governed announcements/statuses/replies/attachments only,
  - no `storage_path` is exposed in derived task rows,
  - no MyTasks UI integration is included in this checkpoint.
- Announcements MyTasks read smoke script is now added:
  - `scripts/supabase-announcements-mytasks-smoke-test.mjs`,
  - package command: `npm run test:supabase:announcements:mytasks`,
  - fake/dev fixtures only,
  - parent/student internal task visibility remains blocked-or-empty.
- Boundaries unchanged in this checkpoint:
  - no SQL/RLS changes,
  - no notification/email automation,
  - no Company News pop-up behavior,
  - no parent-facing announcements/events.
- Announcements MyTasks read-service checkpoint is now documented in:
  - `docs/announcements-mytasks-read-service-checkpoint.md`
- Latest validation checkpoint:
  - `npm run build` PASS,
  - `npm run lint` PASS,
  - `npm run typecheck` PASS,
  - `npm run test:supabase:announcements:mytasks` PASS,
  - `npm run test:supabase:announcements:phase1` PASS with optional cross-branch CHECK when fixture var is missing,
  - `npm run test:supabase:announcements:attachments` PASS with expected diagnostic CHECK lines.
- Recommended immediate next milestone is now:
  - **Company News warm pop-up planning** (completion overview read + UI checkpoint is now documented).
- Completion overview read-service checkpoint is now added:
  - `src/services/supabaseReadService.js` includes `listAnnouncementCompletionOverview({ announcementId, branchId, includeCompleted })`,
  - `scripts/supabase-announcements-completion-overview-smoke-test.mjs` now validates HQ/supervisor reads plus teacher/parent/student manager-overview block-or-empty behavior,
  - no SQL/RLS changes, and no notifications/emails in this slice.
- Completion overview UI checkpoint is now added:
  - `src/pages/Announcements.jsx` now renders read-only manager `Completion Overview` for HQ/supervisor only,
  - authenticated non-demo mode reads use existing `listAnnouncementCompletionOverview({ announcementId })`,
  - demo mode keeps local-only fake overview rows for HQ/supervisor and no Supabase reads for that block,
  - teacher manager overview remains hidden in demo and authenticated paths,
  - no SQL/RLS changes, no new services, no reminder/email manager actions, and no notification side effects in this slice.
- Company News UI shell checkpoint is now added:
  - `src/pages/Announcements.jsx` now renders Company News shell cards/detail inside the existing `Company News` filter,
  - demo mode includes local fake Company News rows and HQ demo-only local create shell,
  - warm pop-up panel is preview-only in Company News detail (no app-shell runtime pop-up),
  - authenticated mode does not add real Company News write wiring in this slice,
  - no SQL/RLS changes, no MyTasks side effects, no parent-facing announcements/events, and no notifications/emails.
- Company News UI shell checkpoint doc:
  - `docs/company-news-ui-shell-checkpoint.md`
- Recommended immediate next milestone:
  - runtime warm pop-up planning/data model review (docs-only) before any runtime trigger implementation.
- UI milestone validation note:
  - build/lint/typecheck PASS,
  - announcement smoke scripts completed with DNS `ENOTFOUND` CHECK skips in this environment,
  - rerun smoke scripts when Supabase DNS/network is stable.
- MyTasks UI integration checkpoint is **completed** for Announcements (see `docs/announcements-mytasks-ui-checkpoint.md`):
  - `src/pages/MyTasks.jsx` renders read-only `Announcement Requests` cards from `listMyAnnouncementTasks({ includeDone: true })` in authenticated staff mode,
  - demo mode remains local-only with fake announcement task cards and no Supabase calls for that block,
  - loading/empty/safe-error states for announcement request reads,
  - `Open Announcement` navigates to `/announcements` (or `task.actionUrl` when set) with route `state` carrying `announcementId` for future deep selection.
- Boundaries preserved in MyTasks UI checkpoint:
  - no SQL/RLS changes,
  - no new services,
  - no announcement write/upload actions from MyTasks,
  - no notification/email automation,
  - no Company News pop-up behavior,
  - no parent-facing announcements/events,
  - no live chat.
- Company News popup status SQL/RLS foundation draft is now added at `supabase/sql/026_company_news_popup_status_foundation.sql`:
  - manual/dev-first SQL draft only (not auto-applied),
  - additive-only `announcement_statuses` popup state fields:
    - `popup_seen_at`
    - `popup_dismissed_at`
    - `popup_last_shown_at`,
  - pre-apply review hardening added popup self-update guard function/trigger to block cross-user popup field writes,
  - popup-focused indexes added for future runtime lookup/update paths,
  - existing `read_at`/`last_seen_at`/`done_status` behavior is unchanged,
  - no RLS policy weakening and no parent/student access widening,
  - parent-facing announcements/events and `parent_facing_media` remain out of scope,
  - runtime popup service/UI behavior remains future,
  - notifications/emails remain future.
- Company News popup status SQL application checkpoint is now documented:
  - `docs/company-news-popup-status-sql-application-checkpoint.md`
- `026` is now manually applied in Supabase DEV SQL Editor (`Success. No rows returned.`):
  - no production apply in this checkpoint,
  - verified `announcement_statuses` popup columns exist (`popup_seen_at`, `popup_dismissed_at`, `popup_last_shown_at`),
  - verified popup indexes exist (`announcement_statuses_popup_seen_at_idx`, `announcement_statuses_popup_dismissed_at_idx`, `announcement_statuses_popup_last_shown_at_idx`, `announcement_statuses_profile_popup_idx`),
  - verified popup self-update guard exists:
    - trigger `trg_guard_announcement_statuses_popup_self_update_026`,
    - function `guard_announcement_statuses_popup_self_update_026`,
  - verified `announcement_statuses` policy shape remains unchanged at 4 policies from `020`,
  - no runtime/UI/service changes in this checkpoint.
- Company News popup service + smoke checkpoint is now added:
  - `docs/company-news-popup-service-smoke-checkpoint.md`
- New internal Company News popup service methods are now implemented:
  - `src/services/supabaseReadService.js`:
    - `listEligibleCompanyNewsPopups(...)`
  - `src/services/supabaseWriteService.js`:
    - `markCompanyNewsPopupSeen(...)`
    - `dismissCompanyNewsPopup(...)`
- Focused popup smoke script now exists:
  - `scripts/supabase-company-news-popup-smoke-test.mjs`
  - `npm run test:supabase:company-news:popup`
- Popup service/smoke scope remains constrained:
  - no runtime app-shell popup UI wiring in this milestone,
  - no SQL/RLS changes in this milestone,
  - no notifications/emails/live-chat behavior,
  - no parent-facing announcements/events and no `parent_facing_media`.
- Company News runtime warm popup UI shell is now implemented:
  - app-shell placement: `src/components/layout/AppLayout.jsx`,
  - staff-only popup read uses existing `listEligibleCompanyNewsPopups({ limit: 1 })`,
  - popup seen/dismiss use existing `markCompanyNewsPopupSeen(...)` and `dismissCompanyNewsPopup(...)`,
  - demo role uses local fake popup only (no Supabase popup calls in demo),
  - session guard prevents same-item repeat storms in one session,
  - popup `View` routes to `Announcements` with Company News context.
- Runtime popup wiring preserves boundaries:
  - no SQL/RLS changes,
  - no new services,
  - no notification/email/live chat behavior,
  - no parent-facing announcements/events and no `parent_facing_media`,
  - no real HQ Company News create path in this slice.
- Service checkpoint validation notes:
  - `build`/`lint`/`typecheck` PASS,
  - popup smoke PASS with expected CHECK for direct HQ `company_news` create block under request-first create-path policy,
  - phase1/mytasks/completion announcement smokes PASS (optional cross-branch CHECK still possible without fixture env),
  - npm `devdir` warning is non-blocking.
- Recommended next milestone after runtime popup:
  - **A. Real HQ Company News create path planning** first,
  - rationale: runtime popup display is ready, but safe production Company News creation/publish path is still constrained by request-first create-path behavior.
- Company News create-path SQL draft is now added:
  - `supabase/sql/027_company_news_create_foundation.sql`,
  - manual/dev-first and review-first only (not auto-applied),
  - preserves existing request insert behavior from `022`,
  - adds HQ-only internal staff `company_news` draft insert allowance for MVP,
  - keeps branch supervisor `company_news` create blocked for MVP,
  - keeps teacher/parent/student create blocked,
  - does not widen parent-facing announcements/events scope,
  - does not add notifications/emails or service/UI create wiring in this slice.
- Company News create-path SQL application checkpoint is now completed in DEV:
  - `027` manually applied in Supabase DEV SQL Editor (`Success. No rows returned.`),
  - verified `announcements_insert_020` now references `can_insert_announcement_row_027(...)`,
  - verified helper `can_insert_announcement_row_027(...)` exists,
  - verified scope remains insert-gate only (no select/update/delete policy changes),
  - popup smoke now reports HQ direct `company_news` create PASS,
  - phase1 smoke remains PASS for request workflow regression safety,
  - optional cross-branch negative CHECK remains when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured,
  - no production apply, and no runtime/UI/service changes in this checkpoint.
- Company News create service + smoke checkpoint is now added:
  - `src/services/supabaseWriteService.js` now includes:
    - `createCompanyNews(...)`
    - `publishCompanyNews(...)`
  - focused create smoke script:
    - `scripts/supabase-company-news-create-smoke-test.mjs`
    - `npm run test:supabase:company-news:create`
  - service guards enforce internal Company News draft/publish lifecycle and target requirement before publish,
  - no UI/runtime create wiring in this checkpoint,
  - no SQL/RLS changes in this checkpoint.
- Company News MyTasks side-effect fix is now applied:
  - `listMyAnnouncementTasks(...)` excludes `announcement_type='company_news'` by default,
  - request/reminder task behavior is preserved for MyTasks,
  - Company News remains Announcements + popup + read oriented by default.

## 12) Next immediate milestone prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News runtime warm pop-up planning/data model review only.

Hard constraints:
- Docs/planning only.
- Keep existing Company News UI shell and request workflow behavior unchanged.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not add services.
- Do not use service role in frontend.
- Do not expose env values or passwords.
- Do not call real AI APIs; do not add provider keys.
- Do not auto-send emails or notifications.
- Do not add runtime warm pop-up behavior in this milestone.
- Do not add popup persistence/dismissal backend behavior.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Preserve demoRole and local/demo fallback.
- Use fake/dev data only in demo paths and smoke fixtures.
- No storage_path, staff_note, or raw SQL/RLS/env strings in UI.

Deliverables:
1) Define runtime warm pop-up trigger/frequency/dismissal strategy.
2) Review current data model for popup readiness vs optional extension needs.
3) Keep strict non-goals: no runtime trigger implementation, no notifications/emails, no MyTasks side effects.
4) Update docs/checkpoints only for planning milestone.

Validation efficiency rule:
- Docs-only: run git diff --name-only only unless runtime files change.
```

---

Handoff status: complete for continuity. Use this file as the primary context anchor before starting the next milestone.

### AI parent report service + smoke checkpoint note

- Added AI parent report service methods (read/write) for draft/review/release lifecycle:
  - `src/services/supabaseReadService.js`
  - `src/services/supabaseWriteService.js`
- Added focused smoke:
  - `scripts/supabase-ai-parent-reports-smoke-test.mjs`
  - `npm run test:supabase:ai-parent-reports`
- Scope/safety for this checkpoint:
  - manual/mock source only (`manual`, `mock_ai`),
  - `real_ai` source blocked in service layer,
  - no UI/report page additions,
  - no SQL/RLS changes,
  - no PDF/export/provider wiring,
  - no service-role frontend usage.
- Boundary goals covered in smoke:
  - staff draft/review/release path,
  - parent draft block,
  - released linked-child read path,
  - unrelated parent blocked or CHECK when fixture credentials are unavailable,
  - release/version event insert PASS or CHECK without privilege widening.
- Checkpoint doc:
  - `docs/ai-parent-report-service-smoke-checkpoint.md`.

### AI parent report draft-create diagnostics note

- Diagnostic probes were added to `scripts/supabase-ai-parent-reports-smoke-test.mjs` with non-secret output:
  - actor role/is_active/branch marker,
  - selected fake fixture IDs (masked),
  - relationship validity check,
  - failure stage labeling (`fixture_discovery`, `service_create`, `raw_insert_without_returning`, `insert_with_returning`, `helper_predicate`, `constraint_or_fk`, `downstream_lifecycle`).
- Current root-cause classification:
  - helper predicate PASS,
  - raw insert PASS,
  - insert with RETURNING fails by RLS.
- Manual/dev-first SQL patch draft created (not applied):
  - `supabase/sql/031_fix_ai_parent_reports_insert_rls.sql`
- Next manual step if approved:
  - apply `031` in Supabase DEV SQL editor, then rerun `npm run test:supabase:ai-parent-reports`.

### AI parent report 031 apply + smoke pass note

- `supabase/sql/031_fix_ai_parent_reports_insert_rls.sql` is now manually applied in Supabase DEV.
- SQL Editor result: `Success. No rows returned.`
- Post-apply focused smoke now passes core path:
  - HQ draft create,
  - submit_for_review,
  - approve,
  - release selected version,
  - `current_version_id` assignment,
  - parent released linked-child/current-version visibility,
  - parent draft block,
  - student block.
- Remaining checks are expected and safe:
  - unsafe evidence snapshot blocked by guard,
  - unrelated parent fixture credentials unavailable.
- Regression safety remains green:
  - `test:supabase:parent-announcements` PASS,
  - `test:supabase:announcements:phase1` PASS (optional fixture CHECK only).
- Checkpoint doc:
  - `docs/ai-parent-report-031-application-service-pass-checkpoint.md`.

### AI parent report evidence-link smoke hardening note

- Focused smoke now includes both evidence-link directions:
  - safe evidence-link insert PASS with fake/dev-safe summary payload,
  - unsafe raw private-path style summary payload blocked by service guard.
- Evidence visibility checks now include:
  - staff read-back PASS when RLS permits,
  - parent direct evidence-link read blocked/empty.
- No SQL/RLS/UI/provider/PDF changes in this hardening step.
- Checkpoint doc:
  - `docs/ai-parent-report-evidence-smoke-hardening-checkpoint.md`.

### AI parent report next milestone recommendation note

- Recommended next milestone:
  - AI parent report UI shell with demo/manual data only.
- Sequence rationale:
  - service + RLS + evidence traceability behavior is already proven,
  - UI shape should be validated before mock AI draft service,
  - real provider integration and PDF/export remain later phases.

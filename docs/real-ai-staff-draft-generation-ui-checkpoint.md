# Real AI staff draft generation (Phase 2C) — UI checkpoint

## What shipped

- **`src/pages/AiParentReports.jsx`**
  - **Create report shell:** staff-visible **branch / class (optional) / student** dropdowns when **`showStaffSelectorShell`**: **`canAccess && !inDemoMode && isSupabaseConfigured()`** — independent of **`canUseSupabase`** so the selector grid is never swapped for a UUID-first layout while identity or catalog hooks settle. **`loadPickerCatalog`** follows **`showStaffSelectorShell`**. **`canUseSupabase`** (**includes `hasLiveSupabaseIdentity`**) remains for report list/detail and other live reads. **Advanced UUID fallback** is a **closed-by-default Collapsible**, not inline UUID labels — see **`docs/real-ai-staff-draft-generation-manual-qa-unblock-checkpoint.md`**.
  - **`inDemoMode`** = URL **`demoRole`** query only (**`useSearchParams`**). **`DemoRoleSwitcher`** receives **`layoutRole`** from **`AppLayout`** (not outlet context). **Diagnostics** + **Exit demo preview** on **`AiParentReports`** when URL demo is active.
  - **Create shell polish:** required-field **\*** on branch/student/report type/periods; **period end ≥ start** (inline + disabled submit); post-create **`loadReports({ silent: true })`** then **`setSelectedReportId`** so the new shell stays selected; toast **Report shell created successfully.**; list row **`id`** for scroll-into-view.
  - **Real AI draft failure diagnostics:** **`generateRealAiParentReportDraftViaEdge`** returns **`error.code`** (allowlisted / `provider_*` pattern) with safe messages; UI shows **Generation failed:** plus the **code** and message (toast includes **`(code: …)`**); **`persistence_failed`** when Edge succeeds but **`createAiParentReportVersion`** fails. Smoke: **`npm run test:ai-parent-report:edge-client-error-codes`**.
  - **Browser CORS:** Staff **`fetch`** uses **`Authorization`**, **`apikey`**, and **`Content-Type: application/json`** → **OPTIONS** preflight plus CORS headers on **POST** responses. Edge implements **`supabase/functions/_shared/aiParentReportDraftEdgeCors.ts`** and **`generate-ai-parent-report-draft/index.ts`** (**`OPTIONS`** **204** before auth; CORS on all JSON). DevTools **CORS error** + UI **`client_network_error`** → redeploy the function; verify **`npm run test:supabase:ai-parent-report:edge-generation-auth`**.
  - Explicit action **Generate real AI draft** (only on click; not on load or on report select).
  - Clear copy: real AI, **staff review required**, **parents do not see drafts** until **explicit release**.
  - **Disabled** in **demo role** and without authenticated Supabase session.
  - Reuses the same **optional field merge + Source Evidence Preview** path as the mock draft section (bounded, staff-authorized context only).
- **`src/services/aiParentReportEdgeGenerationService.js`**
  - Gets **`access_token`** via **`supabase.auth.getSession()`** (never logged or shown).
  - **`POST`** to **`/functions/v1/generate-ai-parent-report-draft`** with **`Authorization: Bearer`**, **`apikey`** (anon), **`providerMode: 'real'`**.
  - On success, **`createAiParentReportVersion`** with **`generationSource: 'real_ai'`**, **`aiModelLabel`** from Edge metadata when present (non-secret).
  - Safe client-side messages for common Edge error codes; no raw provider bodies or secrets.

## What did not change

- **ParentView** unchanged.
- **No** auto-release, **no** status flip from this action alone (same persistence rules as other versions).
- **No** notifications/email, OCR, PDF download/storage.
- **No** provider keys or service-role key in the frontend bundle.
- **Mock** and **manual** draft/version flows preserved.

## Parent visibility

- Draft reports remain **parent-invisible** until existing lifecycle **release** of a chosen version; **`real_ai`** versions follow the same RLS + product rules as other staff drafts.

## Validation (automated)

Run:

```bash
npm run build
npm run lint
npm run typecheck
npm run test:supabase:ai-parent-reports
npm run test:supabase:ai-parent-report:real-ai-persistence
npm run test:supabase:ai-parent-report:edge-generation-auth
npm run test:ai-parent-report:edge-client-error-codes
```

Optional broader suite (provider / Edge):

```bash
npm run test:ai-parent-report:real-provider-smoke
npm run test:supabase:ai-parent-report:provider-adapter
npm run test:supabase:ai-parent-report:edge-real-provider
```

These prove adapter/Edge/service persistence boundaries; they **do not** replace browser QA of the new button.

## Manual QA (recommended before production)

- After deploying **`generate-ai-parent-report-draft`**, in DevTools **Network**: confirm **OPTIONS** to the function returns **204** (or **200**) with **Access-Control-*** headers; **POST** should show a real HTTP status (**401** / **403** / **200**, etc.), not **(blocked:cors)**.
- Staff user **without** demo role: open **`/ai-parent-reports`**, select a draft report with complete metadata, click **Generate real AI draft**, confirm new **`real_ai`** version appears and **parents still cannot see** the draft until release.
- On failure, confirm the **Generation failed:** line shows a **code** (e.g. **`scope_denied`**, **`provider_not_configured`**, **`persistence_failed`**) plus a safe message — no tokens or raw provider JSON.
- Confirm **403/401** paths show friendly messages (wrong branch/report scope / expired session).
- Confirm **demo role** cannot invoke real AI (button disabled + helper copy).

## Teacher-facing display polish (version history & lifecycle copy)

- **`src/pages/AiParentReports.jsx` only** — maps stored **`generation_source`** values to teacher labels: **`real_ai`** → “AI-generated”, **`mock_ai`** → “Test draft”, **`manual`** → “Manual draft”; primary line uses **Draft {n} · {kind}** instead of **`v{n} · real_ai`**. Internal UUIDs use a short **Internal ref** line (full value on hover **`title`** where truncated). Lifecycle copy explains **Draft** (staff-only prep), **Submit / Approve** (internal), and **Release selected draft to parents** as the parent-visible step; release button label updated accordingly (same **`releaseAiParentReport`** API).
- **No** database fields, SQL/RLS, ParentView, release logic, provider calls, or authorization changes.

## Manual QA PASS — internal prototype (recorded)

- **Full report:** **`docs/real-ai-staff-draft-generation-qa-pass-checkpoint.md`** (2026-05-03; baseline includes **`8628555`**).
- **Observed in browser:** **OPTIONS** preflight OK; **`POST` 200**; toast *Real AI draft saved for review. Parents cannot see it until you release a version.*; inline *Real AI draft saved for review — still not visible to parents until release.*; **no** demo role; draft **not** auto-released.
- **Next:** confirm version history + parent unreleased + manual release workflow + evidence-link posture per that doc.

## Next milestones

- Deeper **evidence integration** (what gets summarized vs withheld) and teacher confirmation UX for sensitive aggregates per **`EVIDENCE_CLASSIFICATION`**.
- Optional: **`supabase.functions.invoke`** parity — current implementation uses **`fetch`** explicitly for headers parity with Edge auth smoke.

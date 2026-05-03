# Real AI staff draft generation (Phase 2C) — UI checkpoint

## What shipped

- **`src/pages/AiParentReports.jsx`**
  - **Create report shell:** staff-visible **branch / class (optional) / student** dropdowns (JWT + RLS reads) when not in demo mode — see **`docs/real-ai-staff-draft-generation-manual-qa-unblock-checkpoint.md`**.
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
npm run test:ai-parent-report:real-provider-smoke
npm run test:supabase:ai-parent-report:provider-adapter
npm run test:supabase:ai-parent-report:edge-real-provider
npm run test:supabase:ai-parent-report:edge-generation-auth
npm run test:supabase:ai-parent-reports
npm run test:supabase:ai-parent-report:real-ai-persistence
```

These prove adapter/Edge/service persistence boundaries; they **do not** replace browser QA of the new button.

## Manual QA (recommended before production)

- Staff user **without** demo role: open **`/ai-parent-reports`**, select a draft report with complete metadata, click **Generate real AI draft**, confirm new **`real_ai`** version appears and **parents still cannot see** the draft until release.
- Confirm **403/401** paths show friendly messages (wrong branch/report scope / expired session).
- Confirm **demo role** cannot invoke real AI (button disabled + helper copy).

## Next milestones

- Deeper **evidence integration** (what gets summarized vs withheld) and teacher confirmation UX for sensitive aggregates per **`EVIDENCE_CLASSIFICATION`**.
- Optional: **`supabase.functions.invoke`** parity — current implementation uses **`fetch`** explicitly for headers parity with Edge auth smoke.

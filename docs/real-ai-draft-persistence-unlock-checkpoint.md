# Real AI draft persistence unlock — Stage 2B (service layer only)

## Summary

- **`createAiParentReportVersion`** in **`src/services/supabaseWriteService.js`** now accepts **`generationSource === 'real_ai'`** alongside **`manual`** and **`mock_ai`**.
- **`real_ai`** versions are **staff-only drafts**: same insert path as other sources; **no** automatic release, **no** change to **`ai_parent_reports.status`**, **no** automatic **`current_version_id`** (insert logic unchanged except **`ai_generated_at`** / validation).
- **`ai_generated_at`** is set for **`mock_ai`** and **`real_ai`** (timestamp of insert). **`ai_model_label`** is optional, max 120 chars, **non-secret** display text only; if omitted, **null** is allowed.
- **No** provider calls in the write service: persistence is a separate step from **Edge** `generate-ai-parent-report-draft` (server-side provider only).

## Explicitly not in this stage

- **No** “Generate real AI” button or new menu in **`AiParentReports.jsx`**.
- **No** browser/provider calls; keys stay off the client.
- **No** ParentView or parent query changes; **no** RLS/SQL changes.
- **No** notifications, email, OCR, PDF download/storage.
- **No** `.env.local` in version control.

## Parent visibility (unchanged)

- Parents still see only **released** / **current version** rules enforced by existing RLS and read services. Unreleased **`real_ai`** rows are not parent-facing until staff run the normal release flow on a chosen version.

## Edge function

- **`generate-ai-parent-report-draft`** remains the **only** place for real provider HTTP from the app stack; it still requires staff JWT + **`can_manage_ai_parent_report`**. This milestone does not wire the staff UI to Edge + persistence.

## Tests

| Command | Role |
|--------|------|
| `npm run test:supabase:ai-parent-reports` | Includes **`real_ai`** persistence assertions after **`mock_ai`** v1. |
| `npm run test:supabase:ai-parent-report:mock-draft` | **`real_ai`** persistence probe when HQ session exists. |
| `npm run test:supabase:ai-parent-report:provider-adapter` | Confirms **`real_ai`** is not milestone-blocked; unauthenticated call does not persist. |
| `npm run test:supabase:ai-parent-report:real-ai-persistence` | Focused **`real_ai`** insert + parent draft blocked **CHECK-skip** if credentials missing. |

## Next milestone

- Staff UI: explicit **Generate real AI draft** action calling **secured Edge** (`Authorization: Bearer`), then **`createAiParentReportVersion`** with **`generationSource: 'real_ai'`** and safe structured sections / model label from Edge metadata **only**.

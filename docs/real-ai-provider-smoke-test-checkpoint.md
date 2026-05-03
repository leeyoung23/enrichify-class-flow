# Real AI provider smoke test — AI Parent Reports (checkpoint)

## Purpose

Proves, from **script context only** (Node importing the same **`supabase/functions/_shared`** adapter used by Edge):

> Can the provider layer perform **one** OpenAI-compatible HTTP call with a **fake/dev-only** payload and return **valid structured AI Parent Report content** (11 required string sections)?

This is **not** a product feature unlock and **not** a database integration test.

## What runs

| Item | Detail |
|------|--------|
| Script | `scripts/ai-parent-report-real-provider-smoke-test.mjs` |
| npm | `npm run test:ai-parent-report:real-provider-smoke` |
| Adapter | `supabase/functions/_shared/aiParentReportProviderAdapter.ts` → `callOpenAiCompatibleParentReport` |
| HTTP | Real outbound call **only if** both secrets below are set |

## Fake / dev payload only

The smoke sends a fixed synthetic object (demo student name, class label, summaries). **No production student IDs or live roster data.**

## Safety boundaries (unchanged)

- **No** SQL / RLS / storage changes from this smoke.
- **No** `ai_parent_report_versions` (or related) insert/update.
- **No** `real_ai` persistence unlock — service layer still blocks `real_ai` writes unless separately enabled later.
- **No** parent release, **no** ParentView changes.
- **No** frontend provider calls; **no** Vite env exposure for API keys.
- **No** notification/email sending.
- **No** OCR, PDF download, or storage paths.
- Logs: **no** env values, tokens, keys, raw auth headers, service-role keys, or full raw model responses.

## Env (documented names only)

| Variable | Role |
|----------|------|
| `AI_PARENT_REPORT_PROVIDER_API_KEY` | Required for PASS path (OpenAI-compatible bearer). |
| `AI_PARENT_REPORT_PROVIDER_MODEL` | Required for PASS path. |
| `AI_PARENT_REPORT_PROVIDER_BASE_URL` | Optional; defaults to OpenAI-compatible `/v1` base. |

If API key or model is missing, the script prints **which names** are missing and **does not** print values.

## Local setup

- Set variables in **project-root `.env.local`** (copy from **`.env.example`** if helpful). **`.env.local` is gitignored** (see `.gitignore`); never commit secrets.
- The smoke script loads **`.env.local`** via `dotenv` (`scripts/ai-parent-report-real-provider-smoke-test.mjs`).
- **Required** for a full PASS: `AI_PARENT_REPORT_PROVIDER_API_KEY` and `AI_PARENT_REPORT_PROVIDER_MODEL`.
- **Optional:** `AI_PARENT_REPORT_PROVIDER_BASE_URL`.
- **Do not** use a `VITE_` prefix — these variables are **server/script-only** and must not reach the frontend bundle.
- Never paste keys into docs, tickets, or logs; the smoke does not print env values.
- **CHECK-skip** means one or both required variables are missing — exit **0**, no outbound call.
- **PASS** means a **real outbound provider call** ran and **structured section validation** succeeded.

## Exit meanings

| Outcome | Condition | Exit code |
|---------|-----------|-----------|
| **CHECK-skip** | Missing `AI_PARENT_REPORT_PROVIDER_API_KEY` and/or `AI_PARENT_REPORT_PROVIDER_MODEL` | `0` |
| **PASS** | Both set, one successful call, `assertStructuredSectionsShapeForTests` passes, `externalProviderCall === true` | `0` |
| **FAIL** | Both set but HTTP/parse error, invalid shape, or missing sections | `1` |

## Structured output validation

Uses **`assertStructuredSectionsShapeForTests`** and **`REQUIRED_STRUCTURED_SECTION_KEYS`** from `_shared` (11 keys, non-empty strings). Truncated sample text may be printed for one section; not the full JSON body.

## Related scripts

- **`test:supabase:ai-parent-report:edge-real-provider`** — broader adapter checks (no-key behaviour, fake, unsafe input) plus optional real call.
- **`test:supabase:ai-parent-report:provider-adapter`** — fake/disabled + guardrails (optional Supabase `real_ai` block check).

## Next step after this smoke passes (product lane — not automatic)

- **`real_ai` draft persistence unlock**, staff-only, still **no** parent release until explicitly designed.

## Parked

- Parent-facing release of AI outputs  
- ParentView changes  
- Notification/email automation  
- Real PDF download / storage / signed URLs  
- Worksheet / OCR AI analysis  

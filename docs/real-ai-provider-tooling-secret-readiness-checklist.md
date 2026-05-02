# Real AI Provider — Tooling + Secret Readiness Checklist

Date: 2026-05-02  
Scope: **documentation / checklist only** — readiness **before** real provider keys, real HTTP implementation, or `real_ai` unlock

**Tooling verification (local/safe checks):** `docs/real-ai-provider-tooling-verification-checkpoint.md`

**Related documents:**

- `docs/real-ai-parent-report-provider-implementation-plan.md`
- `docs/real-ai-parent-report-provider-boundary-plan.md`
- `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`
- `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`
- `docs/project-master-context-handoff.md`
- `docs/rls-test-checklist.md`

**Code touchpoints (reference only; this milestone changes no code):**

- `supabase/functions/generate-ai-parent-report-draft/index.ts`
- `supabase/functions/_shared/aiParentReportProviderAdapter.ts`
- `supabase/functions/_shared/aiParentReportMockDraftCore.ts`
- `package.json` (smoke script names)

---

## 1) Current state

- **`docs/real-ai-parent-report-provider-implementation-plan.md`** exists and defines the implementation roadmap.
- **Fake / disabled** Edge adapter exists under **`supabase/functions/_shared/`**; **`generate-ai-parent-report-draft`** imports **`_shared`** only (bundling-safe).
- **No real provider HTTP** is implemented; **`real`** mode returns **`real_provider_not_implemented`** (safe stub).
- **No provider API key** is configured for this feature in repo, frontend, or committed env files.
- **`createAiParentReportVersion`** still **blocks** `generationSource='real_ai'` (`supabaseWriteService.js`).
- **PDF/export** remains deferred.
- **Verified checkpoint:** `docs/real-ai-provider-tooling-verification-checkpoint.md` — in that run, **Deno** and **Supabase CLI** were **not** on `PATH`; edge/provider adapter smokes **PASS**; `deno check` / Supabase serve **CHECK** until tools installed. Re-run verification after installing tooling (milestone **A** from checklist §11).

---

## 2) Purpose of this checklist

| Goal | Why it matters |
|------|----------------|
| **Avoid keys before tooling works** | Prevents storing secrets while deploy/serve still fails — reduces leak surface and wasted rotations |
| **Avoid frontend provider key leakage** | Keys must never ship in Vite bundle or browser env |
| **Ensure Edge can be served/deployed** | Validates `_shared` layout and CLI workflow **before** HTTP code lands |
| **Dev/staging-first validation** | Real calls and secrets belong in **non-production** projects first |
| **Preserve teacher approval / release boundary** | Tooling readiness does not change product rules — drafts stay staff-only until explicit release |

---

## 3) Tooling readiness checklist

Complete before treating “real provider implementation” as unblocked.

| # | Item | Owner notes |
|---|------|-------------|
| ☐ | **Deno** installed and on **`PATH`** (`deno --version`) | Needed for `deno check` on Edge TS and some CLI paths |
| ☐ | **Supabase CLI** installed and on **`PATH`** (`supabase --version`) | Secrets, link, serve, deploy |
| ☐ | **Supabase project linked** only to **DEV or STAGING** for first integration tests | Avoid accidental prod linkage |
| ☐ | Can run **`supabase functions serve`** for **`generate-ai-parent-report-draft`** (when project linked) | Local HTTP smoke against Edge entry |
| ☐ | Can run **`deno check`** on `supabase/functions/generate-ai-parent-report-draft/index.ts` (and `_shared` imports) | Catch type/import errors early |
| ☐ | Can **deploy** the function to **DEV/STAGING only** when explicitly planned | Document project ref in runbook — **not** in repo |
| ☐ | **No production deploy** of real-provider-capable bits until policy + smokes agree | Gate for later milestone |

---

## 4) Secret readiness checklist

| # | Item | Owner notes |
|---|------|-------------|
| ☐ | **Choose placeholder secret name(s)** for documentation — e.g. `AI_PARENT_REPORT_PROVIDER_API_KEY` or vendor-specific `OPENAI_API_KEY` — **do not commit values** | Single name reduces confusion; align with implementation plan |
| ☐ | Secrets stored only as **Supabase Edge Function secrets** (or project secrets scoped to the function) | Never client-side |
| ☐ | **Never** in `VITE_*` or any frontend-exposed env | Client bundle must not see keys |
| ☐ | **Never** commit `.env.local` or paste keys into docs/chat | Use password managers + Supabase dashboard/CLI |
| ☐ | **Never** log secret values, JWTs, or full env dumps | Redact in CI and local debugging |
| ☐ | **Local dev policy:** default **fake/disabled**; real secret only in **local Supabase-linked** or **staging** — documented for the team | Avoid “works on my machine” key sprawl |
| ☐ | **Rotation / revocation:** document who can rotate, how to invalidate old key at provider, how to update Supabase secret | Ops runbook |
| ☐ | Plan **separate** secrets for **dev / staging / prod** later | Same key across envs is a liability |

---

## 5) Model / provider selection readiness

**Do not hardcode a final production model** in repo until product/evaluation signs off.

| # | Item | Notes |
|---|------|------|
| ☐ | **Routine tier** (weekly/monthly): provisional **cost-focused** model family — document choice in **implementation plan appendix** when chosen | Server-side config only |
| ☐ | **Formal tier** (graduation / end-of-term): provisional **quality-focused** model family | Same |
| ☐ | **Model IDs / deployment names** configurable via **Edge secrets** or server-only env — **not** in frontend | e.g. `AI_PARENT_REPORT_MODEL_ROUTINE`, `AI_PARENT_REPORT_MODEL_FORMAL` as placeholders |
| ☐ | **Provider adapter switchability** maintained — one module maps request → provider → normalized `structuredSections` | Aligns with boundary + implementation plans |
| ☐ | **Update docs** (`real-ai-parent-report-provider-implementation-plan.md` or successor) **before** merging implementation that references specific models | Traceability |

---

## 6) Edge serve / deploy validation plan

**Conceptual only — do not execute deploy or real provider calls as part of this checklist milestone.**

When tooling is ready, the team should perform (in **DEV/STAGING**):

| Step | Command / check | Success criterion |
|------|-------------------|-------------------|
| 1 | `deno check` on Edge entry | No import/type errors |
| 2 | `supabase functions serve generate-ai-parent-report-draft` | Function starts; POST accepted |
| 3 | HTTP POST with **`providerMode: "fake"`** | `structuredSections` present; `external_provider_call: false` |
| 4 | HTTP POST with **`providerMode: "disabled"`** | Safe `provider_disabled` |
| 5 | HTTP POST with **`providerMode: "real"`** **without** secret configured | Still **`real_provider_not_implemented`** or equivalent safe failure — **no** crash, **no** key echo |
| 6 | Deploy function to **DEV/STAGING** only when above passes | Rollback plan documented |
| 7 | **Never** use real student/parent/school data in prompts — **fake/dev payloads only** | Privacy gate |

Existing repo smokes (no deploy required for adapter contract):

- `npm run test:supabase:ai-parent-report:edge-adapter`
- `npm run test:supabase:ai-parent-report:provider-adapter`

---

## 7) Provider HTTP implementation gates

Do **not** start coding real HTTP until:

| Gate | Requirement |
|------|----------------|
| ☐ | **Tooling** checklist §3 satisfied (or consciously waived with recorded risk) |
| ☐ | **Secret process** §4 documented and approved |
| ☐ | **`npm run test:supabase:ai-parent-report:provider-adapter`** still **PASS** |
| ☐ | **`npm run test:supabase:ai-parent-report:edge-adapter`** still **PASS** |
| ☐ | **Unsafe input** guard remains in adapter (`containsUnsafeMockDraftValue` path) |
| ☐ | **ParentView** remains **released-only** visibility (no implementation milestone widens parent draft access) |
| ☐ | **No auto-release** in generator or new code paths |
| ☐ | **No frontend key**; **no service-role** in browser |
| ☐ | **Rollback:** redeploy previous function version / disable secret — documented |

---

## 8) `real_ai` unlock gates

Separate from first HTTP milestone. Do **not** unlock DB writes until:

| Gate | Requirement |
|------|--------------|
| ☐ | Real provider output **schema** validated (11 section keys, string content rules) |
| ☐ | **Staging** smoke: real or stubbed provider path returns valid shape — **fake/dev data only** |
| ☐ | **`createAiParentReportVersion`** guard change **reviewed** (code + product) |
| ☐ | Parent **cannot** see draft versions — smoke / policy |
| ☐ | **Release** still required for parent-visible content |
| ☐ | **Linked parent** sees released content — smoke PASS |
| ☐ | **Unrelated parent** blocked or CHECK per fixtures |
| ☐ | **No auto-release** |

---

## 9) Logging / observability checklist

| # | Item |
|---|------|
| ☐ | No **full prompt or response body** in standard logs |
| ☐ | No **env**, **JWT**, or **API key** material in logs |
| ☐ | **Redacted** error codes / categories only for operators |
| ☐ | **`providerLabel` / `modelLabel`** allowed as **internal metadata** — not parent-facing |
| ☐ | No **raw evidence**, **storage paths**, or **private URLs** in logs |
| ☐ | **Cost/usage** metadata internal-only; optional aggregated metrics later |

---

## 10) Safety checklist before real provider

| # | Item |
|---|------|
| ☐ | Prompt rules forbid **diagnosis-like** claims |
| ☐ | No **unsupported negative labels** about learners |
| ☐ | **Insufficient-data** fallback copy (aligned with mock spirit) |
| ☐ | **Teacher review** remains mandatory in product flow |
| ☐ | **No parent-visible draft** |
| ☐ | **No PDF/export** path tied to provider output yet |
| ☐ | **No** automated emails/notifications from generator |
| ☐ | **Single-report scope** — no cross-student mixing in one request |
| ☐ | **Prompt injection:** teacher-supplied text treated as untrusted (delimiter / instruction discipline) |

---

## 11) Recommended next milestone

| Letter | Milestone |
|--------|-----------|
| **A** | **Install/check Deno + Supabase CLI**; record PASS/FAIL in team notes or checkpoint doc appendix |
| **B** | **Real provider Edge HTTP** — **no persistence**, **`real_ai` still blocked** |
| **C** | **Real provider key** provisioned to **staging** secrets only (operational; no repo change) |
| **D** | **`real_ai` DB unlock** + persistence smokes |
| **E** | PDF/export planning |

### Recommendation

- If **Deno / Supabase CLI** are **still missing** or unverified on developer machines → **A first** (manual install + PATH verification + optional “verified by” date in internal notes).
- If tooling is **already** verified → **B next** (Edge HTTP only; **no** `createAiParentReportVersion` change; **no** production deploy until staging proves safe).

**Do not** choose **C** before **A** is satisfied — keys without serve/deploy discipline increase leak and incident risk.

---

## 12) Next implementation prompt (copy-paste)

### Option 1 — Tooling verification results documentation only

Use when completing milestone **A**:

```text
Continue this same project only.

Docs-only milestone: record tooling verification for AI parent report Edge path.

Goal: Document whether Deno and Supabase CLI are installed, on PATH, and whether supabase functions serve / deno check were run successfully against generate-ai-parent-report-draft (DEV/STAGING link only). No secrets; no provider HTTP; no code changes unless fixing unrelated blockers.

Constraints:
- Do not add provider keys
- Do not implement real provider HTTP
- Do not unlock real_ai
- Do not change SQL/RLS

Deliverable: short appendix or checkpoint doc update with verified commands and PASS/FAIL — fake/dev only.

Validation: docs-only — git diff --name-only; no full smoke suite unless runtime files change.
```

### Option 2 — Real provider Edge HTTP with no persistence

Use when **A** is green and team chooses **B**:

```text
Continue this same project only.

Goal: Implement real provider HTTP in supabase/functions/_shared for AI parent reports — NO DB persistence, NO real_ai unlock.

Constraints:
- Provider secret only via Supabase Edge secrets; never frontend
- fake/disabled unchanged; real without secret fails safely
- Validate 11 structuredSections; extend unsafe-input guards as needed
- No SQL/RLS changes; no auto-release; no PDF/export

Validation: build, lint, typecheck, edge-adapter + provider-adapter smokes; staging-only manual HTTP check with fake payloads if secret present.
```

---

## Validation note (this checklist file)

**Documentation only.** Validate with `git diff --name-only` showing only this file before commit. Do **not** run build/lint/typecheck/smokes unless runtime files change.

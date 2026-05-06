# Real AI Provider — Secret, Model Selection & Dev/Staging Smoke Plan

Date: 2026-05-02  
Scope: **planning only** — provisional provider/model choice, secret naming, safe setup procedure, and smoke workflow **before** setting keys or calling providers

**MVP QA freeze reference:** `docs/ai-parent-report-mvp-final-qa-checkpoint.md` — decision **A vs B** before keys/paid AI.

**Related:**

- `docs/real-ai-parent-report-edge-http-final-checkpoint.md`
- `docs/real-ai-parent-report-edge-http-checkpoint.md`
- `docs/real-ai-parent-report-provider-implementation-plan.md`
- `docs/real-ai-provider-tooling-verification-checkpoint.md`
- `docs/real-ai-provider-tooling-secret-readiness-checklist.md`
- `docs/real-ai-parent-report-provider-boundary-plan.md`

**Code references (no changes in this milestone):**

- `supabase/functions/_shared/aiParentReportRealProviderHttp.ts`
- `supabase/functions/_shared/aiParentReportProviderAdapter.ts`
- `supabase/functions/generate-ai-parent-report-draft/index.ts`
- `scripts/supabase-ai-parent-report-edge-real-provider-smoke-test.mjs`
- `package.json` → `test:supabase:ai-parent-report:edge-real-provider`

---

## 1) Current state

- **Edge real HTTP skeleton** exists: OpenAI-compatible path in `_shared` + Node mirror; **`provider_not_configured`** when **`AI_PARENT_REPORT_PROVIDER_API_KEY`** or **`AI_PARENT_REPORT_PROVIDER_MODEL`** is unset — **no outbound HTTP**.
- **No** provider key or model value committed; **no** frontend provider key.
- **No** persistence from the generator; **`createAiParentReportVersion`** still **blocks** **`real_ai`**.
- **No** production deploy required for planning; **ParentView** remains **released / current-version only** for parents (no AI draft visibility).

---

## 2) Product purpose

| Goal | Notes |
|------|--------|
| **Pick provisional provider/model** | For **dev/staging** draft-quality checks only — not a permanent vendor lock |
| **Keep calls server-side** | Keys stay in Supabase Edge secrets (or server env); **never** in Vite/client |
| **Validate schema** | Use **fake/dev** payloads to confirm all **11** sections parse and read parent-appropriately |
| **Preserve workflow** | Teacher review + **explicit release** — AI remains staff-side until released |
| **Protect secrets** | No keys in repo, chat logs, or screenshots; rotate if exposed |

---

## 3) Provider / model options (provisional — not hardcoded in UI)

| Option | Intent | Notes |
|--------|--------|--------|
| **A — Routine / low-cost** | Weekly or monthly report drafts when evidence is structured | Prefer models with strong **JSON mode** / instruction-following at lower token cost |
| **B — Formal / stronger** | End-of-term, graduation, high-stakes narratives | Higher quality prose; higher cost/latency — select when product asks |
| **C — Fake/disabled only** | Delay spend until policy/sign-off | Keep **`fake`** / **`disabled`** modes for demos and CI |

**Do not** bake a long-term model ID into application code. Configure via server env:

| Variable | Purpose |
|----------|---------|
| **`AI_PARENT_REPORT_PROVIDER_API_KEY`** | Bearer token for OpenAI-compatible API (Edge secret) |
| **`AI_PARENT_REPORT_PROVIDER_MODEL`** | Model id string (e.g. vendor-specific deployment name) |
| **`AI_PARENT_REPORT_PROVIDER_BASE_URL`** | **Optional** — defaults to **`https://api.openai.com/v1`**; set for compatible gateways |

Exact model strings are an **ops/product** decision documented outside the repo (runbook), not in source.

---

## 4) Selection criteria

Use when comparing vendors/models (including OpenAI-compatible hosts):

- **Structured JSON reliability** — stable **json_object** / schema adherence for 11 string keys  
- **Education writing quality** — parent-facing, supportive tone  
- **Cost per report** — estimate tokens × frequency  
- **Latency** — staff “Generate” UX; timeouts already bounded in code (~60s)  
- **Privacy / data handling** — retention, region, enterprise terms  
- **Safety** — moderation layers + app-side rules (no diagnosis-like claims, etc.)  
- **Tone control** — system prompt alignment with school voice  
- **Locale** — English-first now; **future bilingual** output via prompt + evaluation (not UI hardcoding)  
- **Switchability** — change **`AI_PARENT_REPORT_PROVIDER_MODEL`** / base URL without app redeploy if secrets updated  

---

## 5) Secret setup process (planning only — do not run in this milestone)

Future **manual** steps (conceptual; **no execution** here):

```text
# Example shape only — replace <ref> and values via secure channel, never commit:
supabase secrets set --project-ref <DEV_OR_STAGING_REF> AI_PARENT_REPORT_PROVIDER_API_KEY=<from_password_manager>
supabase secrets set --project-ref <DEV_OR_STAGING_REF> AI_PARENT_REPORT_PROVIDER_MODEL=<provisional_model_id>
# Optional:
supabase secrets set --project-ref <DEV_OR_STAGING_REF> AI_PARENT_REPORT_PROVIDER_BASE_URL=https://api.openai.com/v1
```

**Rules:**

- **Dev/staging first** — never first-touch production keys for experiments  
- **Never** frontend, **never** committed **`.env.local`**, **never** paste keys into docs/issues  
- **Never** log secret values or full Authorization headers  
- **Rotate/revoke** at vendor if leaked  
- Plan **separate** secrets per **dev / staging / prod** later  

---

## 6) Dev/staging smoke plan (future — after secrets exist)

Planned sequence (non-production):

1. **Deploy or `supabase functions serve`** the function against a **linked dev/staging** project only.  
2. **POST** `generate-ai-parent-report-draft` with **`providerMode: "real"`** and the **fake/dev payload** (§7).  
3. Assert **HTTP 200**, **`ok: true`**, **`structuredSections`** with **11** non-empty strings.  
4. Confirm **`external_provider_call: true`** only when a real round-trip occurred.  
5. Confirm **no** new **`ai_parent_report_versions`** rows from this call (**no persistence** in generator).  
6. Confirm **`real_ai`** **still blocked** in **`createAiParentReportVersion`** (separate smoke or service guard).  
7. Confirm **parents** still cannot see drafts (**ParentView** unchanged).  
8. Optionally simulate failure modes (**timeout**, non-2xx, malformed JSON) in staging — expect **502** / safe errors, **no** stack traces or secrets in logs.  

Existing script **`npm run test:supabase:ai-parent-report:edge-real-provider`** already **PASS**s without keys; with secrets set locally it can exercise optional real HTTP (**CHECK** when unset).

---

## 7) Fake / dev payload plan

Use **synthetic** labels only — no real individuals or institutions:

| Field (conceptual) | Example content policy |
|--------------------|-------------------------|
| Report type / period | e.g. “Mid-term · Term 2 · 2026” (fictional) |
| Attendance summary | Aggregate-style phrase (“regular attendance in sample period”) |
| Homework / lesson progression | Short neutral summaries |
| Strengths / improvements | Generic education phrasing |
| Teacher notes | Crafted **fake** bullets — **no** PII, **no** health/family claims |

**Forbidden in payload:** real names, real emails, storage paths, signed URLs, fee/payment data, unrelated students, sensitive health, raw internal IDs.

---

## 8) Expected output validation

**Required keys** (each a **non-empty string** on success):

`summary`, `attendance_punctuality`, `lesson_progression`, `homework_completion`, `homework_assessment_performance`, `strengths`, `areas_for_improvement`, `learning_gaps`, `next_recommendations`, `parent_support_suggestions`, `teacher_final_comment`

**Quality bar:** parent-friendly; **no** invented “facts” beyond input; **no** diagnosis-like wording; **no** unsupported negative labels; neutral **insufficient-data** tone where input is thin; **no** raw paths/URLs/private identifiers in text.

---

## 9) Safety gates before first paid/dev smoke

| # | Gate |
|---|------|
| ☐ | **Deno** + **Supabase CLI** available where serve/deploy will run |
| ☐ | **`npm run test:supabase:ai-parent-report:edge-real-provider`** **PASS** without keys |
| ☐ | **No** provider key in repo or client bundle |
| ☐ | **ParentView** released-only posture unchanged |
| ☐ | **`real_ai`** creation **still blocked** at service layer |
| ☐ | Payload is **fake/dev only** |
| ☐ | Target project is **dev/staging**, **not** production |
| ☐ | **Rollback** understood (unset secrets / redeploy prior build) |

---

## 10) What not to do yet

- **Do not** unlock **`real_ai`** DB writes  
- **Do not** wire staff UI to **real** Edge calls until product approves  
- **Do not** persist generator output to **`ai_parent_report_versions`** from this path  
- **Do not** release AI text to parents automatically  
- **Do not** add PDF/export or notification/email automation  
- **Do not** run prompts against **real student** records  

---

## 11) Recommended next milestone

| Letter | Milestone |
|--------|-----------|
| **A** | **Manually set dev/staging Edge secrets** + run **real** provider smoke (**no persistence**) — only when budget/policy allows API spend |
| **B** | **`real_ai` DB unlock** |
| **C** | Staff UI **real provider** button |
| **D** | PDF/export planning |
| **E** | Notification/email planning |

**Recommendation:**

- If the team is **ready** to spend API credits on **staging** and keys are approved → **A**.  
- If **not** ready to add any key → pause vendor spend and run a **Final AI report MVP QA checkpoint** (fake/mock/manual flows, documentation, acceptance criteria) instead of **A**.

---

## 12) Next implementation prompts (copy-paste)

### Option A — Set dev/staging secrets + real smoke (when approved)

```text
Continue this same project only.

Goal: Manually set DEV/STAGING Supabase Edge secrets for AI parent report provider and run optional real provider smoke — NO persistence, NO real_ai unlock, NO UI changes, NO production.

Constraints:
- User sets secrets outside repo; do not commit .env.local or keys
- Dev/staging project only
- Fake/dev payload only
- Do not unlock createAiParentReportVersion real_ai
- Document PASS/CHECK in a short checkpoint

Validation: smoke scripts + deno check as applicable; no production deploy.
```

### Option B — Final AI report MVP QA checkpoint (pause before API spend)

```text
Continue this same project only.

Goal: Final AI parent report MVP QA checkpoint — mock/fake/manual flows, documentation, acceptance criteria. No new provider keys; no real provider HTTP calls; no real_ai unlock.

Constraints:
- Docs/checkpoint only unless tiny fixes are required
- No UI scope creep without explicit approval

Validation: git diff --name-only if docs-only.
```

---

## Validation note (this document)

**Planning-only.** Validate with `git diff --name-only` showing only this file before commit. **Do not** run build/lint/typecheck/smokes unless runtime files change.

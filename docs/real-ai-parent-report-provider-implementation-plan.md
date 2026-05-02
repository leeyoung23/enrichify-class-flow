# Real AI Parent Report Provider Implementation Plan

Date: 2026-05-02  
Scope: **planning only** — defines how to implement a **real** AI provider for parent-report drafts **before** code changes, secrets, SQL, or RLS work

**Tooling verification checkpoint:** `docs/real-ai-provider-tooling-verification-checkpoint.md` — **re-verified:** Deno **2.7.14** + Supabase CLI **2.95.4** on Homebrew PATH; **`deno check`** PASS; CLI **`functions` / `serve --help`** PASS; adapter smokes PASS; no deploy/secrets; **`real_ai`** still blocked.

**Edge HTTP checkpoint:** `docs/real-ai-parent-report-edge-http-checkpoint.md` — OpenAI-compatible **real** path in `_shared` + Node mirror; **`provider_not_configured`** without secrets; **no** persistence; **`real_ai`** still blocked.

**Edge HTTP final checkpoint (docs):** `docs/real-ai-parent-report-edge-http-final-checkpoint.md` — summarizes skeleton milestone **`b89239c`**; next recommended step **A** (secret/model planning + dev/staging smoke planning).

**Related documents (read first):**

- `docs/real-ai-parent-report-provider-boundary-plan.md` — architecture, data rules, contract sketch
- `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md` — `_shared` Edge adapter; fake/disabled/real-stub; no HTTP yet
- `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md` — canonical adapter + smokes
- `docs/mock-ai-parent-report-draft-ui-final-checkpoint.md` — staff mock draft UI boundaries
- `docs/ai-parent-report-blueprint-plan.md` — product blueprint
- `docs/project-master-context-handoff.md`, `docs/rls-test-checklist.md`

**Code references (current posture; do not change as part of this doc):**

- Edge handler: `supabase/functions/generate-ai-parent-report-draft/index.ts`
- Edge `_shared`: `supabase/functions/_shared/aiParentReportProviderAdapter.ts`, `.../aiParentReportMockDraftCore.ts`
- App adapter: `src/services/aiParentReportProviderAdapter.js`, `src/services/aiParentReportMockDraftCore.js`
- Versioning: `createAiParentReportVersion` in `src/services/supabaseWriteService.js` ( **`real_ai` blocked** )

---

## 1) Current state

- **Edge adapter:** `_shared` returns deterministic **fake** sections, safe **disabled** error, and for **real** mode either **`provider_not_configured`** (no API key/model) or OpenAI-compatible HTTP when env is set — **no provider key in repo**. **No** DB persistence from this path.
- **Canonical app adapter** mirrors the same contract for Node/smoke tests (`src/services/aiParentReportProviderAdapter.js`).
- **Bundling:** Edge imports **`../_shared/`** only (no `../../../src`), per `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`.
- **No real provider call** is implemented anywhere for parent reports.
- **`createAiParentReportVersion`** rejects `generationSource === 'real_ai'` with a milestone guard (`supabaseWriteService.js`).
- **Staff AI Parent Reports UI** exists (`/ai-parent-reports`); **Generate Mock Draft** uses `mock_ai` path only for authenticated generation.
- **ParentView** shows **released** reports and **current released version** content only (no drafts, no provider metadata).
- **Mock workflow** is checkpointed: deterministic draft → version row `generationSource='mock_ai'` → staff review → explicit release.
- **PDF/export** remains deferred across checkpoints.

---

## 2) Product purpose

- **Real AI** should draft **parent-friendly** section text from **sanitized, structured evidence** (attendance/homework/lesson summaries, teacher-selected notes, policy-safe curriculum context — see §7).
- **Teacher remains the final reviewer:** output is a **draft** for staff editing and workflow — **not** a publication.
- **No auto-release:** parents never receive AI output until existing **submit → approve → explicit release** rules say so.
- **Parents only see the released current version** (existing ParentView boundary).
- **Provider access must be server-side only** (Supabase Edge Function or equivalent backend); **never** ship API keys to the browser or embed them in the Vite bundle.

---

## 3) Provider / model selection strategy

**Do not hardcode a final vendor or model ID in implementation until evaluation completes.** Any provisional choice in code must be labeled **provisional** and configurable via Edge secrets / env (server-only).

### Tiering (conceptual)

| Tier | Use case | Model posture |
|------|-----------|----------------|
| **Routine** | Weekly/monthly drafts when evidence is already structured | **Lower-cost** model with strong JSON adherence |
| **Formal** | Graduation / end-of-term when narrative quality matters more | **Stronger** model; possibly higher max tokens |

Both tiers should sit behind a **single provider abstraction** (`providerAdapter` module in `_shared` or sibling module) so switching vendors or models does not force UI rewrites — aligns with `docs/real-ai-parent-report-provider-boundary-plan.md`.

### Selection criteria (weighted by product/legal ops)

| Criterion | Planning notes |
|-----------|----------------|
| **Structured JSON reliability** | Required: validate server-side; prefer APIs with JSON mode / schema bias |
| **Education-writing quality** | Parent-facing tone; AU/MY English variants via prompt + evaluation set |
| **Cost** | Estimate tokens per report × frequency; cap prompt size |
| **Latency** | Staff UX on Generate; async job only if timeouts recur |
| **Privacy / data handling** | Retention, region, enterprise terms (document decision; no PII in fixtures) |
| **Safety behavior** | Provider moderation + app-side forbidden-claim rules |
| **Tone control** | System prompts + section-level guardrails |
| **Future switching** | Adapter interface + versioned `providerLabel` / `modelLabel` (internal metadata only) |

---

## 4) Environment / secret plan

| Rule | Plan |
|------|------|
| **Where keys live** | Supabase **Edge Function secrets** (or project secrets scoped to the function) — **only** the Edge runtime reads them |
| **Never** | Frontend, committed `.env.local`, repo files, client bundles, public env vars |
| **Logging** | Never log secret values, full env dumps, or JWTs |
| **Local dev** | Default to **`fake`** or **`disabled`** for generation unless maintainers **explicitly** inject a dev secret in a **local-only** Supabase-linked environment (document in runbook; not committed) |
| **Documentation of CLI** | Record **non-executed** examples for later: e.g. `supabase secrets set --project-ref <ref> AI_PARENT_REPORT_PROVIDER_KEY=...` for the target function — **do not run** during planning milestone |

Optional separate secrets: provider base URL (if non-default), optional organization/project id, **model id strings** for Tier 1 vs Tier 2 (still server-only).

---

## 5) Edge Function implementation plan (future code)

**Targets:** `supabase/functions/generate-ai-parent-report-draft/index.ts` and extensions to `supabase/functions/_shared/` (new module for HTTP provider call + validation; keep mock core separate).

| Concern | Plan |
|---------|------|
| **`providerMode='real'`** | Only when secret present and auth/scoping validated (future); otherwise safe error (`real_provider_not_configured` or continue returning stub until wired) |
| **HTTP** | **POST only** (already); reject other methods |
| **Body** | Strict JSON object; reject arrays/primitives; size limit (see §10) |
| **Auth** | Future: verify JWT; resolve staff role; enforce report/class/branch scope **before** provider call (pattern: other Edge functions in repo using anon client + bearer) |
| **Input** | Reuse and extend **`containsUnsafeMockDraftValue`** / structural checks; reject URLs, paths, bucket hints, forbidden keys **before** any HTTP to provider |
| **Provider call** | **Only inside Edge** (fetch to vendor HTTPS); timeouts and generic errors to client |
| **Output** | Parse provider response → validate **exactly** the 11 string keys (§6); reject malformed or partial payloads |
| **Errors** | Safe generic messages to caller; **no** stack traces or secret echoes |
| **Persistence** | **None** in v1 real-provider milestone unless explicitly designed — prefer Edge returns JSON only (§8 option A) |
| **Auto-release** | **Never** from this function |

Refactor note: today **`external_provider_call: false`** is always set; future implementation should set **`true` only** when a real network call completes (and still avoid leaking response bodies to logs).

---

## 6) Prompt / schema contract

### Output keys (stable — align with mock + services)

All values are **non-empty strings** for a successful generation (or explicit insufficient-data phrasing per rules):

1. `summary`  
2. `attendance_punctuality`  
3. `lesson_progression`  
4. `homework_completion`  
5. `homework_assessment_performance`  
6. `strengths`  
7. `areas_for_improvement`  
8. `learning_gaps`  
9. `next_recommendations`  
10. `parent_support_suggestions`  
11. `teacher_final_comment`  

### Content rules

| Rule | Detail |
|------|--------|
| **Evidence-grounded** | Only restate what minimized input supports; **no invented facts** |
| **Parent-friendly tone** | Clear, supportive, appropriate for schools |
| **No diagnosis-like claims** | Avoid medical/psychological labels |
| **No unsupported negatives** | No harsh labels without evidence |
| **Insufficient data** | Use neutral fallback copy (same **spirit** as `MOCK_AI_PARENT_REPORT_INSUFFICIENT_DATA_COPY` in mock core where evidence is thin) |
| **Sensitive family/health** | Do not invent or expand; omit or use safe general language |
| **Identifiers** | Avoid raw internal IDs, full legal names in prompts unless strictly necessary and policy-approved |

### Prompt hygiene

- System + developer messages fix schema and tone; user payload is **only** minimized fields from §7.
- Treat teacher-entered text as **untrusted**: delimiter boundaries + instruction to ignore embedded “ignore previous instructions” style injection (exact wording left to implementation milestone).

---

## 7) Data minimisation

### Allowed (production-minimal)

- Report **type** and **period** (dates)
- **Sanitized** attendance summary (aggregates/labels, not raw rows)
- **Sanitized** homework summary
- **Sanitized** lesson progression summary
- **Teacher-selected** excerpts explicitly chosen for inclusion
- **Sanitized evidence summaries** (no storage paths)
- **Safe** curriculum/programme context (high level)

### Forbidden

- Raw **storage paths**, **bucket names**, **URLs**, **signed links**, **local paths**
- **Payment/fee** data
- **Unrelated students** or cross-class bulk context in one request
- **Unnecessary parent** identifiers or contact dumps
- **Full internal notes** by default
- **Provider keys**, **secrets**, **JWTs**, **env values**

---

## 8) Service / versioning integration plan

### Options compared

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Edge returns `structuredSections` only; app creates version** | Frontend calls Edge with JWT → receives draft → calls existing **`createAiParentReportVersion`** (after unlock) | Reuses **RLS/JWT** write path; staff permissions unchanged; **`real_ai` unlock** is one clear gate | Two round-trips; frontend must handle partial failures |
| **B. Edge generates and persists** | Function uses service role or elevated path to insert version | Single call | **Higher risk:** bypasses or duplicates app guards; service-role handling must be perfect |
| **C. Separate backend action** | Dedicated API orchestrates both | Flexible | More infra and auth bridging |

### Recommendation (safest first)

**Option A:** Edge Function **only** returns validated `structuredSections` + labels + warnings; **persistence** stays in **`createAiParentReportVersion`** once **`real_ai`** is allowed. This keeps one authoritative RLS-aligned write path and matches existing mock flow mentally (“generate → then save version”).

**Document explicitly:**

- **`createAiParentReportVersion` currently blocks `real_ai`** — intentional until unlock milestone.
- **`real_ai` unlock** should be a **small, separate** milestone: remove/adjust guard + add smokes + optional RLS review.
- **Provider smoke order:** (1) validate Edge **output contract** and failure modes **without** DB writes; (2) then unlock **`real_ai`** with dedicated persistence smokes.

---

## 9) `real_ai` unlock plan (future milestone)

**Goal:** Allow controlled creation of versions with `generationSource='real_ai'` **without** changing parent safety.

Planned checklist:

1. **Code:** Relax or replace the guard in `createAiParentReportVersion` only for paths that already enforce staff scope (same file today blocks at `normalizedSource === "real_ai"`).
2. **Control:** Only callable from staff-authenticated flows; no parent-facing API surface.
3. **Visibility:** **No** parent visibility until **explicit release** (unchanged RLS product intent).
4. **Smoke tests (conceptual):**
   - **`real_ai` version create** → PASS (staff fixture)
   - **Parent draft block** → draft not visible to parent PASS
   - **Release required** → parent sees content only after release PASS
   - **Linked parent** → released visibility PASS
   - **Unrelated parent** → blocked or CHECK (fixture-dependent)
   - **No auto-release** → PASS

Run **after** Edge real-generation contract is stable.

---

## 10) Cost / rate-limit plan

| Measure | Plan |
|---------|------|
| **Trigger** | Explicit staff click only (no batch cron for parent reports in MVP) |
| **UI** | Disable / loading state while pending; prevent double-submit |
| **Cooldown** | Optional per-report cooldown (e.g. N minutes) — product decision |
| **Caps** | Optional per-branch or per-user daily/monthly limits — enforce server-side in future service layer or Edge |
| **Input size** | Hard max characters/tokens for minimized payload; reject with `payload_too_large` |
| **Timeout** | Edge function timeout below provider hang; return **`provider_timeout`** generic error |
| **Failure fallback** | Offer **retry**, **switch to mock/manual**, or **save partial manual** — **no** silent auto-release |
| **AI unavailable** | Single safe user-facing code; staff can fall back to mock/manual |

---

## 11) Logging / observability plan

- **Do not** log full prompts or full model responses in production analytics.
- **Do not** log secrets, JWTs, raw env, or storage paths.
- **Allow** redacted **error codes**, duration buckets, and boolean **`external_provider_call`**.  
- **Allow** internal metadata already in contract: `providerLabel`, `modelLabel`, `warnings` (no raw evidence).
- Optional future: append-only **generation audit table** (staff-only) — **separate milestone**; not required for first real HTTP implementation.

---

## 12) Safety / QA plan (future automated + manual)

When implementation lands, target tests:

| Area | Expectation |
|------|-------------|
| **fake / disabled** | Behavior unchanged vs baseline smokes |
| **real without secret** | Fails safely (clear error code; no crash) |
| **real with dev secret** | Returns **schema-valid** 11 sections (staging only) |
| **Unsafe input** | Blocked **before** provider call |
| **Malformed provider JSON** | Rejected; generic error |
| **Provider timeout** | Safe error; no partial parent release |
| **Frontend** | No provider key in bundle (audit) |
| **Auto-release** | Still impossible from generator |
| **Parent** | Cannot read draft rows |
| **Released parent** | Still sees only released current version |

---

## 13) Tooling / deploy plan

From `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`:

- **`deno`** was not on PATH in a prior environment → teams should install or use **`supabase functions serve`** for local validation.
- **Supabase CLI** was not on PATH → install for **`secrets set`**, **`functions deploy`**, linked dev project.

Before merging real provider HTTP:

1. Confirm **`_shared`** layout still bundles (`edge-adapter` smoke + optional `deno check` / CLI serve).
2. Validate **staging** project only with **fake/dev** credentials — never production PII.
3. Keep **`providerMode=real`** gated on secret + auth so missing tooling does not imply unsafe defaults.

---

## 14) Risks and safeguards

| Risk | Mitigation |
|------|------------|
| **Hallucination** | Evidence-only instructions; insufficient-data fallback; teacher review gate |
| **Bad tone** | System prompts; locale; staff edit before release |
| **Overclaiming** | Schema + “no unsupported superlatives” rules; reject non-compliant JSON |
| **Sensitive leakage** | Data minimisation §7; no logging of prompts/responses |
| **Prompt injection** | Untrusted text handling; minimal payload; delimiter patterns |
| **Malformed JSON** | Strict parse + key validation; retry once if vendor supports |
| **Provider outage** | Timeout + safe error + manual/mock fallback |
| **Cost runaway** | Rate limits §10; caps; staff-only trigger |
| **Accidental parent release** | No release from Edge; workflow unchanged |
| **Cross-student mixing** | Single-report scope in prompt; validate `reportId` scope server-side |

---

## 15) Recommended next milestone

| Letter | Milestone |
|--------|-----------|
| **A** | **Real provider key + tooling readiness checklist** (Supabase CLI, Deno or serve, staging secret procedure documented, no code changes) |
| **B** | **Real provider Edge implementation — HTTP + validation, no DB persistence** |
| **C** | **`real_ai` version unlock** + persistence smokes |
| **D** | PDF/export planning |
| **E** | Final MVP QA |

### Recommendation

Prefer **A first**.

**Reason:** Prior checkpoint noted **Deno / Supabase CLI** gaps on some machines. Implementing **B** without verified serve/deploy and secret hygiene increases the chance of broken deploys or ad-hoc secrets. **B** without persistence is still **relatively safe** (no `real_ai` rows yet), but **A** unblocks reliable validation of **B** in staging.

**B first** is reasonable **only if** the team already has CLI + linked dev project + agreement on secret naming — then **B** can proceed with **`providerMode=real`** strictly gated (no call without secret; no persistence).

**User preference alignment:** **A first** when local tools/secrets are not ready; **B first** only when **real** mode remains safe without persistence (stub/errors until secret + auth exist).

---

## 16) Next implementation prompt (copy-paste)

Use after **A** is satisfied (tooling + secret process agreed):

```text
Continue this same project only.

Planning milestone complete: docs/real-ai-parent-report-provider-implementation-plan.md

Goal: Implement real provider HTTP in Supabase Edge for AI parent reports — NO persistence in this milestone, NO real_ai unlock yet.

Constraints:
- Do not change app UI except minimal thin caller if absolutely required (prefer none).
- Provider key only in Edge secrets; never frontend or committed env.
- Edge-only provider call; validate 11 structuredSections keys; reuse unsafe-input guards.
- fake/disabled modes must keep current behavior; real without secret fails safely.
- Do not unlock createAiParentReportVersion real_ai in this milestone.
- No SQL/RLS changes; no auto-release; no PDF/export.

Deliverables:
- _shared provider HTTP module + tests/smoke updates
- Updated Edge handler for real path when configured
- Docs checkpoint for real HTTP (no persistence)

Validation: build, lint, typecheck, provider-adapter + edge-adapter smokes + new smoke if added.
```

---

## Validation note (this document)

**Planning-only:** no application code was modified. Validate with `git diff --name-only` showing only this file before commit.

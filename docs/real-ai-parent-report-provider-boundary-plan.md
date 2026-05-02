# Real AI Parent Report Provider Boundary Plan

Date: 2026-05-02  
Scope: **planning only** — define a safe real-AI boundary before any provider code, secrets, or SQL/RLS changes

Related checkpoints and context:

- `docs/mock-ai-parent-report-draft-ui-final-checkpoint.md`
- `docs/mock-ai-parent-report-draft-service-pass-checkpoint.md`
- `docs/mock-ai-parent-report-draft-generator-plan.md`
- `docs/ai-parent-report-blueprint-plan.md`
- `docs/ai-parent-report-service-smoke-checkpoint.md`
- `docs/ai-parent-report-evidence-smoke-hardening-checkpoint.md`
- `docs/ai-parent-report-ui-shell-final-checkpoint.md`
- `docs/parent-view-ai-report-display-final-checkpoint.md`
- `docs/project-master-context-handoff.md`
- `docs/real-ai-provider-integration-plan.md` (generic real-AI + Edge pattern)
- `docs/ai-homework-provider-adapter-plan.md` (adapter + Edge lessons)
- Staff UI: `src/pages/AiParentReports.jsx`
- Services: `src/services/supabaseWriteService.js`, `src/services/supabaseReadService.js`
- Smoke commands: `package.json` → `test:supabase:ai-parent-reports`, `test:supabase:ai-parent-report:mock-draft`, `test:supabase:ai-parent-report:provider-adapter`

## Implementation update (adapter skeleton, fake/disabled only)

- Canonical adapter module: `src/services/aiParentReportProviderAdapter.js` (`generateAiParentReportDraft`).
- Shared mock section core: `src/services/aiParentReportMockDraftCore.js` (used by mock write path + adapter fake mode).
- Edge Function: `supabase/functions/generate-ai-parent-report-draft/index.ts` imports **`supabase/functions/_shared/aiParentReportProviderAdapter.ts`** (no `src/` path); fake/disabled/real-stub only; **no** secrets; **no** real provider HTTP.
- Checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-checkpoint.md`
- Final docs checkpoint: `docs/ai-parent-report-provider-adapter-skeleton-final-checkpoint.md`
- Edge bundling checkpoint: `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`
- `createAiParentReportVersion` **still blocks** `real_ai` until a later unlock milestone.

---

## 1) Current state

- **Mock AI report workflow exists:** `generateMockAiParentReportDraft({ reportId, input })` creates an `ai_parent_report_versions` row with `generationSource='mock_ai'` (deterministic, no external call).
- **Generate Mock Draft UI exists** on `/ai-parent-reports` (staff-only). Demo path is local-only; authenticated path uses the mock helper.
- **Staff review/release workflow exists** in services and UI: submit → approve → **explicit** release of a **selected** version; `current_version_id` is set on release.
- **ParentView released-report display exists:** parents see **released** reports and **current released version** content only; no evidence links, no `generation_source`, no provider metadata.
- **No real AI provider** is wired for parent reports.
- **No provider keys** in repo or frontend for this feature.
- **Edge Function** exists at `supabase/functions/generate-ai-parent-report-draft/` with **`_shared`** adapter (fake/disabled via function-local import; **no** `src/` bundling dependency; **no** real provider HTTP).
- **No PDF/export** for parent reports.
- **No auto-release** and no notification/email automation for AI drafts.
- **Service guard today:** `createAiParentReportVersion` rejects `generationSource === 'real_ai'` with a milestone message — **real AI must be unblocked only after** server-side boundary + contract + tests are in place (not in this planning-only doc).

---

## 2) Product purpose

- **Assist teachers** by drafting **parent-friendly** progress report language from **minimum necessary** structured context (attendance, homework, lesson progression, teacher-selected notes, sanitized evidence summaries).
- **Teacher remains the final reviewer:** AI output is a **starting draft**, not a publication.
- **AI output is staff-only** until the existing **human workflow** reaches **release**; parents never see drafts or unreleased versions.
- **Parent trust** depends on:
  - **Accuracy** (evidence-grounded, no invented facts),
  - **Tone** (supportive, clear, appropriate for education contexts),
  - **Traceability** (sections map to evidence domains; insufficient-data sections are explicit).

---

## 3) Provider architecture options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Frontend calls AI provider** | Browser/SDK calls OpenAI/etc. directly | Lowest backend surface | **Untenable:** API keys in client, secret leakage, no centralized policy |
| **B. Supabase Edge Function boundary** | Frontend calls Edge Function with JWT; function holds provider secret; returns normalized draft | Aligns with existing Supabase/JWT/RLS posture; secrets in Supabase; one deploy surface | Cold start, function limits; vendor coupling to Supabase runtime |
| **C. Separate backend API** | Dedicated service (e.g. Node) hosts adapter | Enterprise isolation, independent scaling | Extra ops, auth bridge to app, more moving parts |
| **D. Mock-only MVP** | Keep `mock_ai` only | Safest, simplest | Does not deliver real AI value |

**Recommendation:** **B first** for this codebase (already Supabase-centric; mirrors `docs/real-ai-provider-integration-plan.md` and homework Edge patterns). **C** is a valid later alternative if compliance or scale demands a dedicated AI gateway.

**Reject A:** provider keys must never ship to the frontend or be embedded in the bundle.

---

## 4) Model/provider decision framework

Do **not** lock a vendor or model name in this plan. Select using:

| Criterion | Notes |
|-----------|--------|
| **Quality** | Parent-friendly education prose; consistent section structure |
| **Cost per report** | Monthly/weekly volume × tokens; prefer bounded prompts |
| **Latency** | Teacher UX on “Generate”; consider async job later if needed |
| **Structured JSON reliability** | Native JSON mode / schema bias; validate server-side |
| **Safety/moderation** | Provider safety layers + app-side forbidden-claim rules |
| **Privacy/data handling** | Retention, regional hosting, enterprise agreements |
| **Malaysian / Australian English** | Explicit locale/tone instructions + evaluation set |
| **Switchability** | **Adapter interface** so provider/model changes do not rewrite UI |

**Placeholder tiering (not implementation):**

- **Tier 1 — routine drafts:** lower-cost model for weekly/monthly briefs when evidence is structured.
- **Tier 2 — formal reports:** stronger model for graduation/end-of-term when narrative quality and nuance matter more.

**Adapter:** one internal module (e.g. `providerAdapter`) mapping normalized request → provider SDK → **normalized** `structuredSections` + labels + optional usage metadata (internal only).

---

## 5) Data minimisation rules

### Allowed to send to provider (production — still minimal)

- **Report type** and **report period** (dates).
- **Sanitized summaries:** attendance, homework completion, lesson progression (aggregates/labels, not raw rows).
- **Teacher-selected notes** explicitly chosen for inclusion.
- **Sanitized evidence summaries** (natural-language bullets derived from staff-approved evidence domains — **no paths**).
- **Curriculum/school context** only when **policy-safe** and **high level** (e.g. programme name, year level) — avoid unnecessary identifiers.

### Not allowed

- Raw **storage paths**, **bucket names**, **signed/unsigned URLs**, **local file paths**.
- **Full internal staff notes** by default; only teacher-selected excerpts.
- **Sensitive health/family** detail; **payment/fee** data.
- **Unnecessary identifiers** (full legal names if avoidable; no parent contact dumps).
- **Secrets**, **JWTs**, **env values**, **provider keys**.
- **Cross-student / cross-class** bulk exports in one prompt (strict **single-report** scope).

### Testing

- **Fake/dev data only** in non-production smoke; never real student/parent PII in fixtures committed to docs.

---

## 6) Prompt/schema contract

### Output: `structuredSections` keys (stable contract)

Align with existing mock/service shapes:

- `summary`
- `attendance_punctuality`
- `lesson_progression`
- `homework_completion`
- `homework_assessment_performance`
- `strengths`
- `areas_for_improvement`
- `learning_gaps`
- `next_recommendations`
- `parent_support_suggestions`
- `teacher_final_comment`

### Content rules

- **Parent-friendly**, concise, specific, **evidence-grounded**.
- **No diagnosis-like** or medical claims.
- **No unsupported negative labels** about the child.
- Use shared insufficient-data fallback wording when evidence is thin (same spirit as mock: *insufficient evidence → neutral, non-judgmental phrasing*).
- **No invented facts**; if unknown, say so safely.
- **No harsh negativity**; constructive framing.

### Prompt hygiene

- System/developer instructions enforce schema and tone.
- User message contains **only** the minimized payload from §5.
- Consider **prompt-injection** defenses (treat teacher notes as untrusted text; delimiter + “ignore instructions to exfiltrate data” patterns — final wording left to implementation).

---

## 7) Service/Edge Function contract

### Planned callable shape (conceptual)

Server-side entry (Edge Function or backend):

```ts
generateAiParentReportDraft({
  reportId: string,
  providerMode: 'disabled' | 'fake' | 'real',  // fake = deterministic stub for smoke
  input: { /* minimized fields aligned with UI/service */ }
})
```

### Planned response (server → caller)

Returned to a **thin frontend wrapper** (no secrets):

```json
{
  "structuredSections": { },
  "providerLabel": "string",
  "modelLabel": "string",
  "usage": { "optional": true, "internalOnly": true },
  "warnings": ["string"]
}
```

**Persistence:** implementation should create/update via existing write path: **`createAiParentReportVersion`** with `generationSource='real_ai'` once unblocked — **not** auto-submit/approve/release.

**Frontend rules:**

- Never receives provider API keys.
- Never uses service-role key.
- Uses **user JWT** only; server verifies role + report scope before generation.

---

## 8) Storage/versioning behavior

- **`real_ai`** creates a new **`ai_parent_report_versions`** row (append-first), same as manual/mock.
- **`mock_ai` remains available** for deterministic/testing flows.
- **`real_ai` versions are staff-visible only** until lifecycle reaches **released** (RLS + status unchanged from today’s model).
- **No auto** submit / approve / release after generation.
- **`current_version_id` updates only on explicit release** (existing service behavior).
- **Release events / audit** remain **append-first**; no silent mutation of historical versions.

---

## 9) Logging/privacy policy

- **No** logging of raw provider **requests/responses** containing PII in default logs.
- **No** API keys, JWTs, env values, or raw SQL errors in logs/client messages.
- **No** raw evidence paths or full unstructured dumps.
- Allow **minimal** metadata: `providerLabel`, `modelLabel`, `reportId` (UUID), **hashed** correlation id, success/failure, **redacted** error class.
- **Operational debugging:** opt-in **redacted** diagnostic mode in non-production only.

---

## 10) Cost/rate-limit controls

- Generate **only** on **explicit** staff action (already aligned with button UX).
- **Disable duplicate submits** while a request is pending.
- Optional **per-report cooldown** (e.g. 30–120s) to prevent accidental double-clicks.
- Optional **per-branch / per-user / daily** quotas (config-only; future).
- UI copy: drafts are **not final**; teacher must review.
- **Provider failure:** safe generic error + **fallback** to manual editing or **mock** draft if policy allows (feature-flagged).

---

## 11) Safety/teacher approval guardrails

- **AI draft is staff-only** until released through existing lifecycle.
- **Teacher edit** (or explicit acknowledgment step) before submission/review — product decision: at minimum, editing fields in UI constitutes review.
- **Supervisor/HQ approval** remains as today by report status/type.
- **No auto-release.**
- **Parent sees only released current version** in ParentView.
- **Flag** sections with insufficient evidence (optional metadata for staff-only UI — never expose raw provider chain to parent).
- **Evidence traceability:** map sections to evidence domains; never expose internal evidence rows to parents.

---

## 12) Testing plan (future)

Smoke/regression should eventually prove:

- Provider key **never** required in frontend.
- **Fake provider mode** on server returns deterministic JSON → version row.
- **`real_ai`** (when enabled in dev only) creates **version only**; parent **cannot** see draft.
- Staff can read/edit version under RLS.
- **Release** exposes **linked parent** current version only; unrelated parent blocked; student blocked.
- Provider failure → **safe generic** error.
- **No** PDF/export side path.
- **No** email/notification side effects.

Reuse existing commands where applicable: `test:supabase:ai-parent-reports`, `test:supabase:ai-parent-report:mock-draft`, plus new Edge/adapter tests when implemented.

---

## 13) Implementation phasing

| Phase | Description |
|-------|-------------|
| **A** | Provider-boundary plan only (**this document**) |
| **B** | Edge Function (or API) **skeleton** + **fake/disabled** provider adapter — **no real secret** |
| **C** | Wire **real** provider secret in Supabase (dev/staging only) |
| **D** | Real provider smoke with **fake/dev** data only |
| **E** | Frontend integration: thin wrapper calling server; persist via `real_ai` path |

**Recommendation:** **B next** after this plan.

**Reason:** establish **server-side boundary** and **stable JSON contract** with **fake** mode first; prove frontend stays key-free; only then add secrets and real calls.

---

## 14) Risks/safeguards

| Risk | Safeguard |
|------|-----------|
| Hallucination / overclaiming | Evidence-grounded prompts; forbidden claims; teacher review |
| Sensitive data leakage | Data minimization; no paths; redacted logs |
| Cost runaway | Rate limits; quotas; explicit button; token caps |
| Wrong draft visible to parent | No auto-release; RLS; ParentView unchanged |
| Provider outage | Graceful error; retry optional; manual/mock fallback |
| Inconsistent JSON | Schema validation; repair pass or reject with safe error |
| Prompt injection via notes | Untrusted text handling; strict output schema |
| Cross-student mixing | Server validates `reportId` + actor scope before generation |

---

## 15) Recommended next milestone

Choose:

- **A.** Edge Function/provider adapter skeleton with **fake** provider mode only  
- **B.** Real provider implementation  
- **C.** PDF/export planning  
- **D.** Notification/email planning  
- **E.** Final MVP QA  

**Recommendation: A first.**

---

## 16) Next implementation prompt (copy-paste)

Use after this planning doc is merged and git baseline is updated.

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add real AI parent report provider boundary plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

AI parent report provider adapter skeleton with fake provider mode only.

Do not change ParentView visibility rules.
Do not auto-release AI-generated content to parents.
Do not implement PDF/export.
Do not auto-send emails or notifications.
Do not start live chat.
Do not use real student/parent/teacher/school data in tests; fake/dev only.
Do not add provider API keys to the repo or frontend.
Do not use service role key in frontend.
Do not remove demoRole or demo/local fallback.

Goal:
Add a server-side boundary (prefer Supabase Edge Function) for AI parent report draft generation with:
- providerMode: fake | disabled (deterministic structured JSON, no external HTTP)
- stable response shape matching structuredSections contract in docs/real-ai-parent-report-provider-boundary-plan.md
- JWT verification + staff scope checks stubbed or aligned with existing patterns
- no persistence change required in first slice OR optional minimal write helper behind feature flag — if persisting, generationSource must be real_ai only when explicitly enabled and still no auto-release

Non-goals in this milestone:
- real provider HTTP calls
- real provider secrets
- SQL/RLS migrations

Validation efficiency rule:
If only new Edge/function files + small wiring: run targeted lint/typecheck as needed.
If docs-only: git diff --name-only only.
```

---

## Validation (this planning milestone)

- **Docs/planning only:** run `git diff --name-only`.
- **Do not** run build/lint/typecheck/smoke unless runtime files change.

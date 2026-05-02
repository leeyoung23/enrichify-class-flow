# AI Parent Report — MVP Final QA Checkpoint

Date: 2026-05-02  
Scope: **documentation-only** — end-to-end **MVP** posture for AI parent reports **before** any real provider key, paid call, or **`real_ai`** unlock

**Related checklists and plans:**  
`docs/ai-parent-report-blueprint-plan.md`, `docs/real-ai-parent-report-provider-boundary-plan.md`, `docs/real-ai-parent-report-edge-http-final-checkpoint.md`, `docs/real-ai-provider-secret-model-smoke-plan.md`, `docs/project-master-context-handoff.md`, `docs/rls-test-checklist.md`, `docs/mobile-first-qa-checkpoint.md`

---

## 1) Final AI report MVP scope (implemented)

| Area | Status |
|------|--------|
| **SQL/RLS foundation** | `030` / `031` family — applied in dev per prior checkpoints; RLS for reports, versions, evidence, release events |
| **Domain model** | Report rows, version rows, evidence links, release events; append-first posture where documented |
| **Services** | Read/write services for list/detail, versions, evidence, lifecycle (`supabaseReadService` / `supabaseWriteService`) |
| **Evidence traceability** | Staff-facing evidence links; smoke hardened per evidence checkpoint |
| **Staff UI** | **`/ai-parent-reports`** — list, detail, manual/mock flows, lifecycle controls |
| **Parent UI** | **`ParentView`** — **released**, linked-child, **current version** display only |
| **Mock AI draft** | Service helper + **Generate Mock Draft** wired (authenticated path); **`mock_ai`** generation source |
| **Provider adapter** | **`fake` / `disabled` / `real`** path in **`src/services`** + **`_shared`** Edge |
| **Edge adapter** | Bundling-safe **`_shared`** fake/disabled + **real HTTP** when secrets exist |
| **Real Edge HTTP skeleton** | OpenAI-compatible call; **`provider_not_configured`** without key/model; **no** DB writes from generator |

---

## 2) Staff workflow summary

- Create **draft report** (manual flow).
- Create **manual** / **`mock_ai`** versions via existing panels.
- **Generate Mock Draft** — deterministic **`mock_ai`** version path (no real provider).
- View **version history**, **evidence links** (staff-only depth).
- **Submit** → **approve** → **release selected version** (explicit step).
- **Archive** where supported.
- **No auto-release** — parents do not see content until release rules say so.

---

## 3) Parent workflow summary

- **Progress Reports** (or equivalent) section on **ParentView**.
- Parent sees **released** reports for **linked child** only.
- Content reflects **current released version** — no draft rows.
- **No** evidence links, **no** raw **`generation_source`**, **no** provider labels in parent UI.
- **No PDF/export** links in MVP scope.

---

## 4) AI / provider workflow summary

| Mode | Behavior |
|------|----------|
| **`mock_ai`** | Writes versions via existing service path — **no** external AI |
| **Adapter `fake`** | Deterministic sections — local only |
| **`disabled`** | Safe error |
| **`real`** | HTTP only when Edge secrets + model set; else **`provider_not_configured`** |
| **Secrets** | **Not** in repo; **not** in frontend |
| **Persistence from Edge generator** | **None** — versions use **`createAiParentReportVersion`** separately; **`real_ai`** **still blocked** there |
| **Paid real smoke** | **Not** run in MVP freeze (no key / no call policy) |

---

## 5) RLS / privacy boundary

- **Staff** (HQ / supervisor / teacher): scoped management + read per foundation helpers.
- **Parent**: **released-only**, **linked-child** access — no sibling/other-class leakage in designed smoke posture.
- **Student**: blocked for parent-report MVP as documented in foundation.
- **Evidence**: staff-facing; not exposed in ParentView.
- **Service role**: **not** used in frontend.
- Smokes assert cross-family **CHECK** where fixtures omit unrelated parent — expected limitation, not an RLS widening.

---

## 6) Validation coverage (latest known snapshot)

**Snapshot from recent milestone chain** — re-run after any runtime change:

| Check | Typical result |
|-------|----------------|
| `npm run build` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:supabase:ai-parent-reports` | PASS (integration **CHECK** if host unreachable) |
| Evidence / traceability smokes (per project scripts) | PASS when env available |
| `npm run test:supabase:ai-parent-report:mock-draft` | PASS (**CHECK** if Supabase sign-in fails) |
| `npm run test:supabase:ai-parent-report:provider-adapter` | PASS |
| `npm run test:supabase:ai-parent-report:edge-adapter` | PASS |
| `npm run test:supabase:ai-parent-report:edge-real-provider` | PASS without key |
| `npm run test:supabase:parent-announcements` / **announcements:phase1** (regression) | PASS per project convention |
| `deno check supabase/functions/generate-ai-parent-report-draft/index.ts` | PASS when Deno on PATH |
| Tooling (Deno / Supabase CLI) | Verified in `docs/real-ai-provider-tooling-verification-checkpoint.md` |

---

## 7) Known CHECK / WARNING notes

- **Unrelated parent** credential **CHECK** — fixture limitation in some smokes.
- **`ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`** optional **CHECK** in phase1-style tests.
- **npm `devdir`** warning — non-blocking.
- **Edge real provider** optional HTTP — **CHECK/SKIP** without **`AI_PARENT_REPORT_PROVIDER_*`** env.
- **Supabase `ENOTFOUND`** in sandbox/offline — integration **CHECK**, not adapter failure.
- **No** observed unsafe widening of parent visibility or **`real_ai`** inserts in this MVP scope.

---

## 8) Remaining gaps before real-AI production use

- **Dev/staging** provider secret **not** set in repo (by design).
- **Real** provider smoke with live HTTP **not** executed in MVP freeze.
- **`real_ai`** **version creation** intentionally **blocked** at service guard.
- Staff UI **does not** call **real** Edge provider for end users yet.
- **PDF/export** — deferred.
- **Notifications/emails** — deferred.
- **Label polish** + **manual mobile QA** on staff/parent flows still recommended (`docs/mobile-first-qa-checkpoint.md`).
- **Production** fixture/seed strategy not finalized.

---

## 9) Recommended decision point

| Option | Milestone |
|--------|-----------|
| **A** | Set **dev/staging** secrets + **real** provider smoke (**no** persistence) — **only** when API budget and ops approval exist |
| **B** | **Manual mobile QA** pass for AI reports + parent comms MVP (**safest** before spend) |
| **C** | PDF/export planning |
| **D** | **`real_ai` DB unlock** |
| **E** | Notification/email planning |

**Recommendation:**  
- If **not** ready to spend on API keys → **B** (manual QA + fake/mock flows).  
- **A** only when the team accepts **cost** and **secret handling** per **`docs/real-ai-provider-secret-model-smoke-plan.md`**.

---

## 10) Next implementation prompts (copy-paste)

### Option A — Dev/staging secret + real smoke (when ready)

```text
Continue this same project only.

Goal: Set DEV/STAGING Edge secrets manually (outside repo) and run real provider smoke — no persistence, no real_ai unlock, no UI change, no production.

Constraints: fake/dev payload only; document PASS/CHECK; never commit keys.
```

### Option B — Manual mobile QA (pause before paid AI)

```text
Continue this same project only.

Goal: Manual mobile QA pass for AI Parent Reports + ParentView Progress Reports per docs/mobile-first-qa-checkpoint.md — no new keys, no real provider calls.

Constraints: docs/findings only unless tiny UI fixes are explicitly approved.
```

---

## 11) Final safety statement

- The codebase is **safe to exercise** with **fake/dev** data and existing mocks.
- It is **not** a **production real-AI** system until keys, governance, and **`real_ai`** unlock are deliberately added.
- **Parents must not** receive AI-generated text **without** explicit staff **release** of a selected version.
- **Provider keys** belong in **Supabase Edge secrets** (or approved server env) — **never** committed or embedded in the client.

---

## Validation note

**Docs-only checkpoint.** Use `git diff --name-only` before commit. **Do not** require full build/lint/smoke for this document-only milestone unless CI policy says otherwise.

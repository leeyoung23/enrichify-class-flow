# Real AI Provider — Tooling Verification Checkpoint

Date: 2026-05-02  
Scope: **documentation + safe local checks only** — no app changes, no real provider calls, no deploy, no secret values recorded

**Related:** `docs/real-ai-provider-tooling-secret-readiness-checklist.md`, `docs/real-ai-parent-report-provider-implementation-plan.md`, `docs/ai-parent-report-edge-adapter-bundling-checkpoint.md`

**Repository state at this verification (see §1):** branch `cursor/safe-lint-typecheck-486d` at doc-update time; Edge `_shared` adapter unchanged; **no** real provider HTTP; **`real_ai`** creation still blocked at service layer.

---

## 0) Verification history (summary)

| Run | Notes |
|-----|--------|
| **First** (documented in commit `c54fdd2`) | In the **automated verification environment**, `deno` and `supabase` were **not** on default `PATH`; `deno check` and Supabase help were **CHECK / deferred**; adapter smokes **PASS**. |
| **This run (re-verification)** | **Deno** and **Supabase CLI** are installed (Homebrew on Apple Silicon). Commands use `PATH` including **`/opt/homebrew/bin`**. `deno check` **PASS**; `supabase functions` / `serve` **--help** **PASS**; adapter smokes **PASS**. **No** deploy, **no** secrets, **no** real provider calls. |

**Homebrew / Xcode Command Line Tools:** occasional Homebrew warnings about Command Line Tools are **non-blocking** for these checks unless a future **compile** or **CLI subcommand** fails; fix by installing/updating CLT only if a command errors.

---

## 1) Git / project checks

| Check | Result |
|-------|--------|
| `git branch --show-current` | `cursor/safe-lint-typecheck-486d` |
| `git log --oneline -12` | HEAD `c54fdd2 Document real AI provider tooling verification` at start of re-verification; prior commits include `4133b88`, `a5ec63d`, … |
| `git status --short` | Clean except optional untracked **`supabase/.temp/`** (Supabase CLI cache) — added to **`.gitignore`** so it is not committed accidentally |

---

## 2) Tool availability checks

Commands run with **`PATH=/opt/homebrew/bin:…`** (Apple Silicon Homebrew layout). Align CI and developer shells with this `PATH` so `deno` / `supabase` resolve consistently.

| Tool | Command | Result |
|------|-----------|--------|
| Deno | `which deno` | `/opt/homebrew/bin/deno` |
| Deno | `deno --version` | **deno 2.7.14** (stable, aarch64-apple-darwin); TypeScript **5.9.2** |
| Supabase CLI | `which supabase` | `/opt/homebrew/bin/supabase` |
| Supabase CLI | `supabase --version` | **2.95.4** |

---

## 3) Static check — `deno check`

| Item | Result |
|------|--------|
| `deno check supabase/functions/generate-ai-parent-report-draft/index.ts` | **PASS** — `Check` completes with no errors (imports resolve via `_shared/*.ts`) |

---

## 4) Supabase CLI — help / serve readiness

| Item | Result |
|------|--------|
| `supabase functions --help` | **PASS** — subcommands listed (`serve`, `deploy`, `list`, …); no deploy executed |
| `supabase functions serve --help` | **PASS** — flags documented (`--env-file`, `--no-verify-jwt`, …); **no** `serve` runtime started |

**Guardrails observed:** no deploy, no `supabase link`, no secrets set, no provider HTTP.

---

## 5) Package smoke scripts (no real AI; no provider keys required)

| Script | Result |
|--------|--------|
| `npm run test:supabase:ai-parent-report:edge-adapter` | **PASS** — fake/disabled/real-stub, parity, guards; script runs **`deno check`** when `deno` is on `PATH` → **PASS**; optional note that **`supabase functions serve`** needs linked project when used |
| `npm run test:supabase:ai-parent-report:provider-adapter` | **PASS** — same contract; **`createAiParentReportVersion`** still blocks **`real_ai`** |

**Confirmation:** No real provider API call; no provider key required for these scripts; local-only adapter logic.

---

## 6) Secret / safety status (no values printed)

- **No provider API key** committed for this feature; smokes do not require one.
- **`.env.local`** must remain **uncommitted**; never paste keys into docs or issues.
- **Supabase Edge secrets** for a future real provider remain **manual**, **dev/staging first**, never in client env.
- This document **does not** record env values, project refs, or keys.

---

## 7) Summary table

| Area | Status |
|------|--------|
| Deno on PATH (Homebrew) | **Available** — 2.7.14 at `/opt/homebrew/bin/deno` |
| Supabase CLI on PATH | **Available** — 2.95.4 at `/opt/homebrew/bin/supabase` |
| `deno check` (Edge entry) | **PASS** |
| Supabase `functions` / `serve` **--help** | **PASS** |
| Edge adapter smoke | **PASS** |
| Provider adapter smoke | **PASS** |
| Real provider HTTP | **Not implemented** (unchanged) |
| `real_ai` unlock | **Not done** (unchanged) |
| Production deploy | **Not performed** |

---

## 8) Recommended next milestone

| Option | Milestone |
|--------|-----------|
| **A** | Fix **PATH** / install tooling if any machine still lacks `deno` or `supabase` |
| **B** | **Real provider Edge HTTP** — **no persistence**, **no** `real_ai` unlock, **no** prod deploy; optional staging secret later |
| **C** | **Provider key** in Edge secrets (**staging** only; operational) |
| **D** | **`real_ai` DB unlock** + smokes |
| **E** | PDF/export planning |

**Recommendation:** **B next** — Deno and Supabase CLI are **available**, **`deno check`** and help output **PASS**, adapter smokes **PASS**. Proceed to **real provider HTTP** in `_shared` / Edge only when ready, still **without** version persistence and **without** `real_ai` unlock. Use **C** only when staging secret policy is agreed (keys never in repo). Use **A** only if a teammate’s environment still cannot resolve `deno`/`supabase`.

---

## 9) Validation note

Re-verification used: git checks + `which` / `--version` + `deno check` + `supabase functions` help + npm adapter smokes only. **No** full app build/lint/typecheck required for this docs milestone unless CI policy requires it.

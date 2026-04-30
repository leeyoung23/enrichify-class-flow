# AI Homework Edge Function Deployed Regression Checkpoint

## 1) What was implemented

A deployed regression test script was added for `generate-homework-feedback-draft` to verify auth/scope behavior in a deployed dev environment using fake/dev fixtures only. The script is designed to fail on unsafe access regressions and to gracefully emit `CHECK` when deployment or fixtures are unavailable.

## 2) Files changed

- `scripts/ai-homework-edge-function-deployed-regression-test.mjs`
- `package.json`
- `docs/ai-homework-edge-function-deployed-regression-plan.md`
- `docs/ai-homework-edge-function-frontend-wrapper-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Deployed regression script behavior

- Loads `.env.local` quietly.
- Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Uses anon Supabase client only.
- Invokes `generate-homework-feedback-draft` through `supabase.functions.invoke`.
- Prints `PASS` / `WARNING` / `CHECK` only.
- Never logs tokens or env values.
- Gracefully `CHECK`-skips when deployed function is unavailable.
- Skips role-specific tests as `CHECK` when fixtures are missing.

## 4) Planned test coverage

- missing auth -> `401`
- invalid token -> `401`
- parent blocked -> `403`
- student blocked -> `403`
- assigned teacher allowed -> `200` + shape checks
- branch supervisor own branch allowed -> `200` + shape checks
- HQ allowed -> `200` + shape checks
- relationship mismatch `homeworkTaskId` blocked
- relationship mismatch `studentId` blocked
- relationship mismatch `classId` blocked
- output shape validation
- draft-only/no-auto-release safety note
- auto-save side-effect check when readable

## 5) Current run result

`npm run test:ai:homework-edge:deployed` now reaches the live deployed function in Supabase dev.

Current deployed regression outcome:

- `PASS` missing auth -> `401`
- `PASS` invalid token -> `401`
- `PASS` parent blocked -> `403`
- `PASS` student blocked -> `403`
- `CHECK` assigned teacher allowed case skipped (no accessible fake homework submission fixture)
- `CHECK` branch supervisor allowed case skipped (no accessible fake homework submission fixture)
- `CHECK` HQ allowed case skipped (no accessible fake homework submission fixture)
- `CHECK` relationship mismatch skipped (no allowed-role fixture available)

Interpretation:

- This is clear progress from the previous unavailable-function `CHECK` skip.
- Live auth/blocking boundary is now partially verified in deployed dev.
- No unsafe access was observed in the live checks executed.
- Staff allow-case and mismatch live verification still needs better dev fixtures before provider wiring.

## 6) Safety boundaries

- no UI changes
- no Edge Function behavior changes
- no provider key
- no real provider/API call
- no SQL/RLS changes
- no service role
- no token/env logging
- no auto-release

## 7) Tests

Validated in the implementation milestone:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:ai:homework-edge:stub`
- `npm run test:ai:homework-edge:wrapper`
- `npm run test:ai:homework-edge:deployed`

## 8) What remains

- confirm fake role fixtures
- ensure accessible fake fixture for assigned teacher allowed case
- ensure accessible fake fixture for branch supervisor own-branch allowed case
- ensure accessible fake fixture for HQ allowed case
- ensure allowed-role fixture for relationship mismatch live checks
- feature-flagged UI wiring after live regression
- real provider integration later
- audit/logging later

## 9) Recommended next milestone

Recommendation: **A. Deploy Edge Function to Supabase dev + rerun deployed regression**.

Why A first:

- Deployed regression currently skips because function is unavailable.
- Feature-flagged UI path should wait until live function is deployed and validated.
- No real provider is required for this step.
- This confirms production-like auth/scope boundary behavior before exposure.

## 10) Dev deployment status checkpoint

Deployment status in this milestone:

- Supabase CLI login was completed manually.
- Dev project is linked to project ref `fwturqeaagacoiepvpwb`.
- `generate-homework-feedback-draft` is deployed to Supabase dev.
- Deployed regression now confirms the function is reachable.

Provider/secrets safety confirmations:

- No real AI provider call was made.
- No provider key was added.
- No provider secret was configured.
- No `.env.local` file was committed.
- No key/env values were logged.

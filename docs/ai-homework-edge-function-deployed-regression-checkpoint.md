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

- `npm run test:ai:homework-edge:deployed` completed as graceful `CHECK` skip.
- Reason: deployed function unavailable in current dev project.
- This is not a code failure.
- Live auth/scope coverage remains pending actual deployment.

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

- deploy `generate-homework-feedback-draft` to Supabase dev
- rerun deployed regression against live function
- confirm fake role fixtures
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

## 10) Latest deploy attempt status

Latest verification run in this environment:

- Attempted deploy command:
  - `npx supabase functions deploy generate-homework-feedback-draft`
- Deploy result:
  - blocked before deploy due missing CLI auth token.
  - CLI message: access token not provided (`supabase login` or `SUPABASE_ACCESS_TOKEN` required).
- No function code changes were made.
- No provider key or secret was added.

Latest deployed regression result:

- `npm run test:ai:homework-edge:deployed`
- current outcome remains:
  - `[CHECK] Skipped: deployed function unavailable in current dev project`

Supporting validation run (targeted set) completed:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:ai:homework-feedback:mock`
- `npm run test:ai:homework-edge:stub`
- `npm run test:ai:homework-edge:wrapper`
- `npm run test:ai:homework-edge:deployed`

Result summary:

- local/runtime validation commands passed.
- deployed regression still unavailable-skip pending actual deploy from authenticated CLI context.

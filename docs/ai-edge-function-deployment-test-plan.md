# AI Edge Function deployment and mock invocation test plan

This document plans a safe validation path for deploying/serving and invoking the mock `generate-parent-comment-draft` Edge Function before any real AI provider integration.

## 1) Current state

- Edge Function scaffold exists at `supabase/functions/generate-parent-comment-draft/index.ts`.
- Function currently returns mock output only.
- Frontend service wrapper (`src/services/aiDraftService.js`) already has safe fallback behavior.
- No real AI provider/API call is implemented.

## 2) Deployment goal

Goal for this phase:

- Deploy or locally serve `generate-parent-comment-draft`.
- Invoke function using fake/demo payload only.
- Confirm mock response contract shape.
- Confirm no external AI/provider API is called.
- Confirm frontend fallback behavior remains safe if function is unavailable.

This phase is validation-only and provider-free.

## 3) Manual Supabase CLI/deployment considerations

Deployment and invocation testing may require:

- Supabase CLI installed.
- Supabase project linked (for cloud deploy testing).
- Local function serving (`supabase functions serve`) or cloud deploy path.
- Fake JWT/session setup if authenticated-path testing is added later.

Important for this planning task:

- Do not run deployment automatically here.
- Do not add secrets here.
- Do not add provider integration here.

## 4) Test payload (fake/demo only)

Use non-production test payload only:

- `student_id`
- `class_id`
- `teacher_note`
- `tone`
- `language`

No real student/parent/teacher/school data.

## 5) Expected response contract

Expected fields from mock function:

- `draft_comment`
- `suggested_strength_tags`
- `suggested_improvement_tags`
- `source_summary`
- `is_mock: true`

## 6) Safety checks

Validation checklist:

- No provider keys configured or required.
- No service role key in frontend runtime.
- No real child/personal data in payload.
- No automatic save/release behavior triggered by invocation.
- No parent sending behavior.
- No external provider API request performed by function.

## 7) Future test script plan

Planned optional script:

- `scripts/ai-edge-function-mock-invocation-test.mjs`

Script behavior target:

1. Load environment (without printing secrets).
2. Use Supabase anon client/session only where possible.
3. Invoke:
   - `supabase.functions.invoke("generate-parent-comment-draft", { body })`
4. Pass fake payload.
5. Verify:
   - `is_mock === true`
   - `draft_comment` exists and is non-empty
6. If function is not deployed/served:
   - print clear warning
   - avoid blocking local development workflows when configured as optional

## 8) Recommended implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** add optional mock invocation smoke script. - implemented.
- **Phase 3:** manually deploy or serve function.
- **Phase 4:** run smoke script against local/deployed function.
- **Phase 5:** only then plan real provider secret rollout.

## Phase 2 status update

- Added optional script: `scripts/ai-edge-function-mock-invocation-test.mjs`.
- Added npm command: `test:ai:edge:mock`.
- Script behavior:
  - loads `.env.local`
  - uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` only
  - optionally signs in as `teacher.demo@example.test` if test password env exists
  - invokes `generate-parent-comment-draft` with fake payload
  - validates mock response shape (`draft_comment`, tag arrays, `source_summary`, `is_mock: true`)
- Non-blocking behavior when function is not deployed/reachable:
  - prints clear `SKIP`/`WARNING`
  - exits `0` for optional local workflow continuity
- Real provider integration remains future and not part of this phase.

## 9) Next implementation prompt (Phase 2 only)

Copy-paste prompt:

---

Implement **Phase 2 only**: optional mock invocation test script for `generate-parent-comment-draft`.

Constraints:

- Do not add real AI provider calls.
- Do not add provider keys.
- Do not change app UI.
- Do not remove existing mock/fallback behavior.
- Do not commit `.env.local`.

Tasks:

1. Create `scripts/ai-edge-function-mock-invocation-test.mjs`.
2. Use Supabase anon client/session only where possible.
3. Call `supabase.functions.invoke("generate-parent-comment-draft")` with fake payload:
   - `student_id`, `class_id`, `teacher_note`, `tone`, `language`
4. Validate response:
   - `is_mock === true`
   - `draft_comment` is present
5. If function is not deployed/served, print clear warning and exit safely (optional-script behavior).
6. Optionally add npm script:
   - `test:ai:edge:mock`
7. Keep this phase provider-free and deployment-manual.

Run:

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:read`
- `npm run test:supabase:auth`
- `npm run test:supabase:tasks:write`
- `npm run test:supabase:attendance:write`
- `npm run test:supabase:parent-updates:write`
- `npm run test:supabase:weekly-report:write`

---

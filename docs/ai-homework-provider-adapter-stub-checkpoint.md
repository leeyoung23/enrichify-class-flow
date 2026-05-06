# AI Homework Provider Adapter Stub Checkpoint

Scope: runtime + docs checkpoint for adding a provider adapter stub in the deployed homework AI Edge Function layer while keeping provider integration disabled.

## 1) What was implemented

- Added provider adapter stub module at `supabase/functions/generate-homework-feedback-draft/providerAdapter.js`.
- Wired adapter usage in `supabase/functions/generate-homework-feedback-draft/handler.js`.
- Default provider mode is safe and disabled (`AI_HOMEWORK_PROVIDER_MODE=disabled` fallback).
- Added focused provider adapter test: `scripts/ai-homework-provider-adapter-test.mjs`.
- Updated stub contract test expectations for provider-disabled default behavior.

## 2) Provider adapter stub behavior

New adapter entrypoint:

- `generateProviderHomeworkFeedbackDraft({ context, providerMode, buildMockDraft })`

Supported provider modes:

- `mock`
- `disabled`
- `future_real_provider_placeholder`

Current behavior:

- No real provider API call is performed in any mode.
- No external fetch to AI vendors is performed.
- Output is normalized to the existing draft response shape.
- Adapter returns safe model metadata with `externalCall: false`.

## 3) Provider-disabled behavior

When mode is `disabled` (default):

- Returns deterministic local stub output via existing mock-draft builder.
- Sets `modelInfo.provider = "provider_stub_disabled"`.
- Sets `modelInfo.providerMode = "disabled"`.
- Keeps `modelInfo.externalCall = false`.
- Includes draft-only and teacher-approval safety notes.

## 4) Draft-only approval gate preserved

- No auto-save path was added.
- No auto-release path was added.
- No parent visibility path was changed.
- Teacher review/edit/approval remains required before release workflow.
- Existing release flow remains the final gate.

## 5) Provider/secrets safety

- No provider key added.
- No provider secret configured.
- No `.env.local` commit.
- No env/token/password logging added.
- Adapter comments preserve future boundary rule:
  - provider keys must remain Edge Function secrets only,
  - never `VITE_*`,
  - never frontend/runtime exposure.

## 6) Test updates

- Added: `npm run test:ai:homework-provider-adapter`
- Updated: `npm run test:ai:homework-edge:stub` expectations for default disabled provider mode.
- Existing deployed regression and scope/auth tests remain in place.

## 7) What remains future

- Real provider wiring behind Supabase Edge secret boundary.
- Provider response validation hardening and safe failure fallback tuning.
- AI audit/logging.
- OCR/vision evidence extraction.
- Rubric-based marking.
- Announcements/Internal Communications can begin after this checkpoint if desired.


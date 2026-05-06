# AI Edge Function scaffold checkpoint

This checkpoint captures Phase 2 scaffold status for AI draft generation through Supabase Edge Functions.

## Scaffold path

- `supabase/functions/generate-parent-comment-draft/index.ts`

## Mock response contract

Current scaffold accepts POST JSON:

- `student_id` (required)
- `class_id` (required)
- `teacher_note` (required)
- `tone` (optional)
- `language` (optional)

Returns mock-only response:

- `draft_comment`
- `suggested_strength_tags`
- `suggested_improvement_tags`
- `source_summary`
- `is_mock: true`

No external AI provider call is made.

## Security posture in scaffold

The function includes TODOs for:

- JWT verification
- profile loading
- teacher/branch/HQ scope validation
- authorised context fetch from Supabase
- later server-side AI provider call
- later `ai_generation_requests` / `ai_generation_outputs` persistence

It does not include:

- service role key in frontend
- provider API keys
- hardcoded secrets

## Frontend/runtime wiring status

- No frontend wiring added.
- Parent Updates button wiring to this function is intentionally not implemented.
- Existing demo/local AI behavior remains unchanged.

## Deployment/testing status

- Function scaffold is created in repo.
- Deployment and function invocation testing are manual follow-up steps.

## Next phase recommendation

Next: run local/deployed mock function tests, then add service-layer integration in a separate phase before any real AI provider integration.

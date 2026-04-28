# Real AI provider integration plan

This document defines the secure implementation plan for future real AI provider integration, while preserving current draft-only and teacher-approval safeguards.

## 1) Current AI state

- Current AI parent comment output is mock/fallback only.
- No real AI model/provider API is used in runtime.
- No provider API key is stored or used in frontend.
- Frontend is wired only to service wrapper (`src/services/aiDraftService.js`).
- Supabase Edge Function scaffold exists at `supabase/functions/generate-parent-comment-draft/index.ts`.

## 2) Recommended provider approach

Recommended architecture:

- Frontend calls Supabase Edge Function only.
- Supabase Edge Function performs provider API call server-side.
- Provider key is stored as Supabase Edge Function secret, not in repository.
- Frontend never receives or exposes provider key.
- Function returns draft output only (no automatic save/release/share).

Why this approach:

- Maintains existing auth boundary (JWT + RLS-aware context checks).
- Keeps provider credentials outside browser/runtime bundle.
- Preserves current teacher-controlled approval flow.

## 3) Provider options (high-level)

Potential first-wave provider options:

- OpenAI
- Anthropic Claude
- Google Gemini
- Others later as needed

Recommendation for first practical rollout:

- Start with **one provider** (OpenAI or Claude are practical first candidates), but implement with a provider adapter boundary so integration remains provider-swappable.

Provider-swappable guidance:

- Keep prompt-building and response-normalization inside internal abstraction.
- Keep output contract stable for frontend (`draft_comment`, tags, summary).
- Avoid provider-specific response shape leaking into UI/service layer.

## 4) First real AI use case

Recommended first production use case: **Parent Comment Draft**.

Why first:

- Already wired in UI via `Generate AI Comment Draft`.
- Teacher note input already exists.
- Teacher review/edit and manual release gate already exists.
- Lower complexity than homework marking.
- Lower structural complexity than full weekly report generation.

## 5) Edge Function changes needed later

For `generate-parent-comment-draft` real integration phase:

1. Verify JWT from request.
2. Load caller profile/role.
3. Validate teacher/branch/HQ scope against target student/class.
4. Fetch authorized context (student/class/school/curriculum summaries only).
5. Build safe prompt from approved context fields.
6. Call provider server-side.
7. Return draft-only payload to frontend.
8. Optionally persist generation metadata in:
   - `ai_generation_requests`
   - `ai_generation_outputs`

No service role key in frontend at any point.

## 6) Prompt/data design

Include only necessary inputs/context:

- Teacher note (primary input)
- Student first name only if needed
- Class subject/level
- School/curriculum profile summary
- Recent attendance summary
- Homework summary
- Learning objective tags

Avoid including:

- Unnecessary personal data
- Raw private notes not required for drafting
- Secrets/env values
- Full parent contact details

## 7) Safety and approval rules

- AI output must be explicitly treated as draft.
- Teacher/staff must review/edit before release.
- No auto-release workflow.
- No auto-send to parent workflow.
- Parent visibility remains restricted to released content only.
- Log generation metadata with data minimization (avoid storing excessive sensitive prompt/body text).

## 8) Environment and secrets plan

Future Supabase Edge Function secrets (examples):

- `AI_PROVIDER`
- `OPENAI_API_KEY` (or provider-equivalent key name)
- `AI_MODEL_NAME`
- `AI_MAX_TOKENS`

Rules:

- No real secret values in repo.
- `.env.local` is never committed.
- No frontend env var should contain provider secret.
- Provider keys must be configured in Supabase project secrets/dashboard only.

## 9) Testing plan

- Keep existing mock mode available.
- Add function-level mock invocation tests first.
- Run real provider call tests only in dev/staging Supabase project.
- Verify no frontend key exposure.
- Verify auth scope and role constraints.
- Verify fallback behavior when provider is unavailable/fails.

## 10) Implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** Edge Function deployment + mock invocation test (still no real provider).
- **Phase 3:** add provider secrets in Supabase dashboard.
- **Phase 4:** enable real provider call behind feature flag/env gate.
- **Phase 5:** keep service/UI behavior unchanged (draft-only + teacher approval).
- **Phase 6:** add logging/audit coverage for generation metadata.
- **Phase 7:** extend same pattern to weekly report AI later.

## 11) Next implementation prompt (Phase 2 only)

Copy-paste prompt:

---

Implement **Phase 2 only**: deploy and test mock Edge Function invocation for `generate-parent-comment-draft`.

Constraints:

- Do not add real AI provider calls.
- Do not add provider keys.
- Do not change Parent Updates UI wiring.
- Keep demoRole and mock/fallback behavior.
- Do not expose secrets or commit `.env.local`.

Tasks:

1. Confirm Supabase Edge Function project setup for `supabase/functions/generate-parent-comment-draft/index.ts`.
2. Deploy function to dev project (manual/dashboard/CLI as appropriate).
3. Invoke function with mock payload:
   - `student_id`
   - `class_id`
   - `teacher_note`
   - optional `tone`, `language`
4. Verify response contract:
   - `draft_comment`
   - `suggested_strength_tags`
   - `suggested_improvement_tags`
   - `source_summary`
   - `is_mock: true`
5. Document invocation result and any deployment notes in a checkpoint doc.
6. Keep runtime behavior draft-only and provider-free.

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

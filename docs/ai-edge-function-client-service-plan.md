# AI Edge Function client service plan

This document plans a frontend service-layer wrapper for AI draft generation via Supabase Edge Functions, without UI wiring in this phase.

Scope constraints:

- Planning only (no runtime UI wiring).
- No external AI/LLM provider calls from frontend.
- No deployment dependency in this phase.
- Keep `demoRole` and demo/local fallback behavior.
- No real data usage.

## 1) Current state

- Edge Function scaffold exists at `supabase/functions/generate-parent-comment-draft/index.ts`.
- Current Edge Function behavior is mock-only.
- Frontend is not wired to this Edge Function yet.
- Parent Updates still uses local/demo AI generation path.
- No real AI provider API call exists in runtime.

## 2) Target service layer

Plan a dedicated service file:

- `src/services/aiDraftService.js`

Planned method:

- `generateParentCommentDraft({ studentId, classId, teacherNote, tone, language })`

Service responsibility:

- Encapsulate all client-side decision logic for demo fallback vs Edge Function invocation.
- Keep UI components unaware of provider details.
- Return predictable output shape for Parent Updates use.

## 3) Behavior

Expected wrapper behavior:

1. If `demoRole` is active:
   - Return local/demo draft immediately.
2. If Supabase is not configured:
   - Return local/demo draft.
3. If Edge Function call fails/unavailable:
   - Return safe fallback (or structured error) without breaking page flow.
4. If authenticated real Supabase user + config available:
   - Call Supabase Edge Function using anon client + current session JWT.
5. Frontend must never call external AI provider directly.
6. Frontend must not expose provider keys/secrets.

Fallback design recommendation:

- Prefer deterministic demo fallback response for continuity.
- Include fallback metadata (`is_mock`, fallback reason) so UI can explain state if needed.

## 4) Output mapping

Map Edge Function response into UI draft shape:

- `draft_comment` -> editable draft message (AI draft textarea value)
- `suggested_strength_tags` -> optional helper tags
- `suggested_improvement_tags` -> optional helper tags
- `source_summary` -> provenance summary
- `is_mock` -> badge/diagnostic signal for non-production output

Recommended normalized return shape from service:

- `data: { draftComment, suggestedStrengthTags, suggestedImprovementTags, sourceSummary, isMock }`
- `error: null | { message }`

## 5) Safety

- AI output is draft-only.
- No automatic release/share to parent.
- Teacher must review/edit before any approval/release action.
- Do not auto-persist AI output unless a write flow is explicitly planned and implemented.
- Keep existing release lifecycle controls unchanged.

## 6) Implementation sequence

- **Phase 1:** planning doc (this file).
- **Phase 2:** add `aiDraftService` wrapper with demo/local fallback and Edge Function call path. - implemented.
- **Phase 3:** add service-level smoke test or manual mock-call verification (if function deployed).
- **Phase 4:** wire Parent Updates `Generate AI Comment Draft` action to wrapper.
- **Phase 5:** replace mock Edge Function internals with secure real AI provider integration (server-side only).

## 7) Next implementation prompt (Phase 2 wrapper only)

Copy-paste prompt:

---

Implement **Phase 2 only**: add frontend service wrapper for AI parent comment draft generation.

Constraints:

- Do not change app UI wiring in this phase.
- Do not call OpenAI or any external LLM API from frontend.
- Do not require Edge Function to be deployed for successful fallback behavior.
- Keep `demoRole` and demo/local fallback intact.
- No service role key in frontend.
- No real data usage.

Tasks:

1. Create `src/services/aiDraftService.js`.
2. Add method:
   - `generateParentCommentDraft({ studentId, classId, teacherNote, tone, language })`
3. Behavior:
   - If `demoRole` active -> return demo/local draft payload.
   - If Supabase not configured -> return demo/local draft payload.
   - If authenticated Supabase user -> call Edge Function `generate-parent-comment-draft` via anon client session.
   - If Edge Function fails/unavailable -> return safe fallback payload (or structured error policy as defined).
4. Normalize output to:
   - `draftComment`
   - `suggestedStrengthTags`
   - `suggestedImprovementTags`
   - `sourceSummary`
   - `isMock`
5. Keep this phase service-only:
   - no Parent Updates button wiring yet
   - no runtime provider key changes
   - no external AI provider integration

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

## Implementation status snapshot

- Phase 2 wrapper implemented:
  - `src/services/aiDraftService.js`
  - `generateParentCommentDraft({ studentId, classId, teacherNote, tone, language })`
- Wrapper behavior now:
  - returns demo/local mock draft when `demoRole` is active
  - returns demo/local mock draft when Supabase is not configured
  - attempts anon-session Edge Function invoke (`generate-parent-comment-draft`) when available
  - catches invocation failures and returns safe mock fallback
- Optional smoke test was deferred to Phase 3 to avoid requiring Node alias shims in this phase.
- Not implemented in this phase:
  - no Parent Updates UI wiring to wrapper
  - no real AI provider/API call
  - no dependency on deployed Edge Function for fallback behavior

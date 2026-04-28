# AI Parent Comment Mock Draft checkpoint

This checkpoint captures the current AI draft state for Quick Parent Comment generation: service-layer wiring is complete, but output remains mock/fallback only and teacher approval flow is unchanged.

## 1) What was implemented

- Added a dedicated AI draft client wrapper: `generateParentCommentDraft(...)` in `src/services/aiDraftService.js`.
- Wired Quick Parent Comment `Generate AI Comment Draft` in `src/pages/ParentUpdates.jsx` to call the wrapper.
- Kept existing teacher-controlled flow intact:
  - AI draft fills editable message fields.
  - Teacher still manually saves draft or releases to parent.
- Edge Function scaffold exists for `generate-parent-comment-draft`, but it currently returns mock output only.
- No real provider integration was added.

## 2) Files changed in this vertical

- `src/services/aiDraftService.js`
- `supabase/functions/generate-parent-comment-draft/index.ts`
- `src/pages/ParentUpdates.jsx`
- `docs/ai-edge-function-client-service-plan.md`

## 3) Current AI status (clear scope)

- No real AI model/provider is used in runtime.
- Current generated output is mock/fallback only.
- Supabase Edge Function scaffold exists, but does not call external AI providers.
- No OpenAI/Claude/Gemini/Groq (or other provider) API call is implemented.
- No provider keys were added to frontend/runtime flow.

## 4) Teacher approval safety

- Generated AI text is inserted as an editable draft, not as final parent output.
- Teacher/staff must review and edit before release.
- Teacher manually triggers:
  - `Save Draft`, and/or
  - `Approve & Release to Parent`.
- No automatic parent sending is implemented.
- No auto-save and no auto-release behavior was introduced.

## 5) Future real AI implementation rules

- Provider key must remain server-side only (never in frontend).
- Real provider call must run through Supabase Edge Function.
- Frontend must never call OpenAI/LLM APIs directly.
- AI output remains draft-only until teacher approval/release flow is explicitly completed.

## 6) Manual preview checklist

1. Log in as teacher.
2. Open `/parent-updates`.
3. Select class/student and enter teacher note.
4. Click `Generate AI Comment Draft`.
5. Confirm draft appears.
6. Edit the draft message.
7. Click `Save Draft` or `Approve & Release` manually.

## 7) Recommended next milestone

Recommended: **real AI provider integration planning** (not implementation yet).

Why this next:

- The mock/approval flow is now integrated end-to-end in UI and service layers.
- The highest-risk remaining area is security/privacy design for real model calls.
- Planning first keeps key decisions explicit: server-side key management, authorised context fetch, and audit logging boundaries.
- Storage/upload vertical can follow after real AI contract and governance are locked.

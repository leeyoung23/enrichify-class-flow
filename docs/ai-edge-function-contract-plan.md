# AI Edge Function contract plan

This document defines secure Supabase Edge Function contracts for future AI draft generation only.

Scope constraints for this plan:

- Planning only.
- No app UI changes.
- No Edge Function implementation in this step.
- No OpenAI/LLM API calls in this step.
- No runtime AI calls in frontend.
- No uploads in this step.
- Keep `demoRole` and demo/local fallback behavior.
- No real data usage.

## 1) Purpose

AI in this product is draft-assist only:

- AI generates draft content for teacher/staff review.
- AI must never auto-send content to parents.
- Teacher/staff approval remains mandatory before release.
- Parent/student visibility remains governed by existing release statuses and RLS.

## 2) Why Edge Function / secure backend

Supabase Edge Function is required for security and control:

- Frontend must not call OpenAI/LLM APIs directly.
- API keys must remain server-side only.
- Edge Function validates auth session and role before generation.
- Edge Function fetches only authorised context from Supabase (least-data retrieval).
- Edge Function returns draft output (or stores draft output) only; never auto-releases.

Contract principle:

- Frontend sends minimal request inputs.
- Backend resolves authoritative context under role constraints.
- Output is draft-state only and approval-gated.

## 3) First AI functions to plan

Recommended first three function contracts:

1. `generate_parent_comment_draft` (first implementation candidate)
2. `generate_weekly_progress_report_draft` (second implementation candidate)
3. `generate_homework_feedback_draft` (later phase; plan-only now)

Why this order:

- Parent comment and weekly report release workflows are already live and approval-gated.
- They provide stable write/release targets for draft-only AI outputs.
- Homework feedback introduces additional storage/marking complexity and should follow.

## 4) Function contract: `generate_parent_comment_draft`

### Input contract

- `student_id` (required)
- `class_id` (required)
- `teacher_note` (required)
- `source_data_ids` (optional object/list for constrained source references)
- `tone` / `language` (optional controlled values)

### Server-side context fetch (authorised only)

- Student profile and branch/class linkage
- Class info (subject/level/schedule context)
- School/curriculum profile (`schools`, `student_school_profiles`, pathway fields)
- Recent attendance summary
- Homework summary (status-level only for initial phase)
- Prior parent comments (limited recent window, role-scoped)

### Output contract

- `draft_comment_text`
- `suggested_strength_tags` (array)
- `suggested_improvement_tags` (array)
- `confidence_summary` (short confidence descriptor, not raw scoring internals)
- `source_summary` (safe, minimal provenance summary)

### Safety rules

- Teacher can generate only for assigned students/classes.
- Branch supervisor/HQ can generate only within authorised scope.
- Parent/student cannot call this function.
- Output remains draft-only (no auto status promotion to released/shared).
- Any optional persistence writes must remain in draft status and approval-gated.

## 5) Function contract: `generate_weekly_progress_report_draft`

### Input contract

- `student_id` (required)
- `class_id` (required)
- `week_start_date` (required)
- `teacher_notes` (optional)

### Server-side context fetch (authorised only)

- Attendance records for the requested week
- Homework completion summary for week scope
- Homework marking results (approved/internal scope as permitted)
- Learning objectives and curriculum mappings
- Student learning profile context
- School/curriculum pathway context

### Output contract (fixed template fields)

- `attendance_summary`
- `homework_completion`
- `strengths`
- `areas_to_improve`
- `suggested_home_practice`
- `next_week_focus`
- `teacher_comment`

### Safety rules

- Staff-only generation path (teacher/branch supervisor/HQ per policy).
- Teacher/supervisor review required before parent visibility.
- Parent view remains released-only via existing weekly report status model.
- No auto-send, no auto-release.

## 6) Function contract: `generate_homework_feedback_draft` (later)

Plan-only, not first implementation:

- Input will include homework record reference, student/class scope, and optional teacher guidance.
- Context will include curriculum mapping/objectives, homework metadata, and approved class context.
- Output will be teacher-review draft feedback plus optional suggested tags.
- Must remain draft-only and approval-gated.
- Should be scheduled after storage/upload and marking-result flows are operationally ready.

## 7) AI request/output logging

Use or extend existing foundation tables:

- `ai_generation_requests`
- `ai_generation_outputs`
- `ai_feedback_tags`
- `teacher_approval_logs`

### What should be logged

- Request metadata: requester role/profile, feature type, target entity IDs, timestamps, status.
- Output metadata: draft status, output type, approval status transitions, release timestamp if applicable.
- Tag artifacts: suggested tags with provenance and confidence bucket where needed.
- Approval audit: who approved/rejected/released and when.
- Correlation IDs for tracing request -> output -> approval.

### What should not be logged

- API keys or provider secrets.
- Full raw prompts containing unnecessary sensitive details.
- Excessive raw personally sensitive content when summarised alternatives suffice.
- Frontend-exposed internal model/provider credentials or prompt templates.

## 8) Data minimisation and privacy

- Send only necessary context to AI provider (least-data principle).
- Prefer summarised/structured context instead of raw long-form sensitive records.
- Keep no-real-data constraint until privacy, policy, and governance readiness are complete.
- Keep automatic parent sending disabled.
- Do not expose prompts, API keys, or provider internals in frontend runtime.
- Enforce role-based scope checks in Edge Function before any context fetch/generation.

## 9) Implementation sequence

- **Phase 1:** contract planning doc (this file).
- **Phase 2:** Supabase Edge Function scaffold only, no OpenAI/LLM provider call. - implemented.
- **Phase 3:** mock AI response through Edge Function (deterministic placeholder output).
- **Phase 4:** connect Parent Updates "Generate AI Draft" UI action to mock Edge Function.
- **Phase 5:** replace mock with real AI provider securely (server-side only).
- **Phase 6:** weekly report AI draft via secure Edge Function.
- **Phase 7:** homework feedback AI draft flow.

## 10) Next implementation prompt (Phase 2 scaffold only)

Copy-paste prompt:

---

Implement **Phase 2 only**: Supabase Edge Function scaffold for AI draft generation contracts, with mock output only.

Constraints:

- Do not change app UI in this phase.
- Do not call OpenAI or any external LLM API.
- Do not add runtime frontend AI calls yet.
- Keep `demoRole` and demo/local fallback unchanged.
- No uploads in this phase.
- No service role key in frontend.
- No real data usage.

Tasks:

1. Create Edge Function scaffold for:
   - `generate_parent_comment_draft`
   - (optional stub) `generate_weekly_progress_report_draft`
2. Function behavior for Phase 2:
   - Validate Supabase auth session exists.
   - Validate caller role is staff-authorised.
   - Validate required inputs (`student_id`, `class_id`, and required text/date fields).
   - Perform permission check against assigned/scope-valid student/class before returning output.
   - Return deterministic mock draft payload (no external AI provider call).
3. Logging behavior:
   - Insert minimal request row to `ai_generation_requests` (if table wiring is ready),
   - Insert mock output row to `ai_generation_outputs` in draft state (if ready),
   - Otherwise return payload-only with TODO comments for persistence wiring.
4. Security behavior:
   - Never expose provider keys or prompt internals.
   - Reject parent/student callers.
   - Keep output draft-only; no release transitions.
5. Add test script(s):
   - authorised teacher call succeeds with mock response,
   - parent/student call denied,
   - invalid input rejected.
6. Run:
   - `npm run build`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:supabase:read`
   - `npm run test:supabase:auth`
   - `npm run test:supabase:tasks:write`
   - `npm run test:supabase:attendance:write`
   - `npm run test:supabase:parent-updates:write`
   - `npm run test:supabase:weekly-report:write`

Do not implement real AI provider integration in this phase.

---

## Implementation status snapshot

- Phase 2 scaffold implemented at:
  - `supabase/functions/generate-parent-comment-draft/index.ts`
- Current scaffold behavior:
  - Accepts POST payload (`student_id`, `class_id`, `teacher_note`, optional `tone`, optional `language`).
  - Returns deterministic mock output only.
  - Includes explicit TODOs for JWT verification, profile/role load, scope checks, authorised context fetch, server-side provider call, and AI request/output persistence.
- Not implemented in this phase:
  - No external AI provider call.
  - No real key usage.
  - No frontend wiring.
  - No automatic deployment; function deployment/testing remains a manual next step.

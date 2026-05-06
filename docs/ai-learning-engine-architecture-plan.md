# AI Learning Engine Architecture Plan

This document defines the future AI learning engine direction for Young’s Learners.

Scope of this plan:

- Architecture and product planning only.
- No AI API integration yet.
- No UI implementation changes.
- No write/upload flow changes in this step.

## 1) Product vision

The AI USP is not a generic chatbot response. The goal is personalised, teacher-approved learning support grounded in real classroom context and curriculum expectations.

Future AI draft generation should be context-aware across:

- student profile
- school name
- school type
- curriculum pathway
- grade/year
- class level
- attendance
- homework submissions
- teacher notes
- AI/teacher marking results
- previous feedback
- parent-facing communication history

Core principle:

- AI produces draft support content; teachers/staff remain the final decision-makers before anything is shared externally.

## 2) School and curriculum data model

School/curriculum context is critical because learning support quality depends on the student’s actual learning pathway, year level, and target outcomes. Without this context, feedback becomes generic and less actionable.

Planned core tables to anchor this:

- `schools`
- `student_school_profiles`
- `curriculum_mappings`
- `students`
- `classes`
- `homework_records`
- `parent_comments`
- `weekly_progress_reports`

Key fields needed for future AI quality and traceability:

- `school_name`
- `school_type`
- `grade_year`
- `curriculum_pathway`
- `subject`
- `textbook_module` (or equivalent module/unit reference)
- `learning_objective_tags`
- `weakness_tags`
- `strength_tags`

## 3) AI feature modules

### A) AI parent comment draft

- Input: teacher session note + student/class context + recent communication history.
- Output: concise, parent-friendly draft comment for teacher review.

### B) AI weekly progress report draft

- Input: weekly attendance/homework/learning objective evidence.
- Output: fixed-template weekly report draft (non-freeform structure).

### C) AI homework marking assistant

- Input: homework artifact + curriculum objective mapping + marking guidance.
- Output: draft marking summary and suggested feedback tags for teacher validation.

### D) AI learning gap detector

- Input: trend data from homework/attendance/objective tags.
- Output: probable gap signals and confidence-ranked focus areas.

### E) AI next-week practice recommendation

- Input: validated weaknesses/strengths + curriculum stage.
- Output: short, actionable practice plan for teacher adaptation.

### F) AI teacher assistant for class notes

- Input: class session facts + outcome highlights.
- Output: structured teacher note draft/checklist to reduce admin load.

### G) AI parent-friendly translation/simplification (later)

- Input: approved teacher-facing summary.
- Output: readability-adjusted or translated parent-facing draft (still approval-gated).

## 4) Safe AI architecture

Security and system boundaries:

- React frontend must not call OpenAI or any LLM APIs directly.
- API keys must remain server-side only.
- Future AI orchestration should use Supabase Edge Functions or an equivalent secure backend endpoint.

Planned request flow:

1. Frontend sends only authorised request context (minimal payload).
2. Edge Function verifies authenticated role and permission scope.
3. Edge Function pulls allowed context from Supabase under RLS-backed constraints.
4. Edge Function calls AI provider and returns draft output.
5. Draft is stored/audited for teacher/staff review, not auto-shared.

Approval model:

- AI output is draft-only.
- Teacher/staff approval is mandatory before parent visibility.

## 5) Data flow examples

### Parent comment flow

Teacher note + class/session data + student profile
-> AI draft generation (secure backend)
-> teacher edit
-> approve/release
-> parent-visible message.

### Weekly report flow

Weekly attendance + homework completion + marking results + curriculum objective tags
-> AI fixed-template report draft
-> teacher/supervisor review
-> release to parent.

### Homework marking flow

Parent/student upload
-> storage
-> OCR/vision/AI marking later
-> teacher review
-> feedback saved
-> parent/student view.

## 6) Safety and privacy rules

- No real child data until privacy/RLS/storage/consent controls are complete.
- Teacher approval gate remains mandatory.
- No automatic sending to parents.
- Every AI-generated item is clearly labelled as draft.
- Logs and telemetry should avoid sensitive content leakage.
- Minimise data sent to AI providers (least-data principle).
- School/curriculum data must be used only for relevant learning support objectives.

## 7) Suggested future database additions/refinements

Potential future structures:

- `curriculum_mappings`
- `learning_objectives`
- `student_learning_profiles`
- `homework_marking_results`
- `ai_generation_requests`
- `ai_generation_outputs`
- `ai_feedback_tags`
- `teacher_approval_logs`

Notes:

- Keep strong linkage between generated drafts, source evidence, and approval decisions.
- Preserve auditability for compliance and quality review.

## 8) Implementation sequence

### Phase 1: School/curriculum read-only onboarding fields

- Add/validate school and curriculum context fields behind service layer.
- Ensure role-safe read visibility and data quality checks.

### Phase 2: Parent comment AI draft via secure Edge Function

- Build minimal secure draft endpoint with strict role checks and no auto-send.
- Keep teacher edit/approve gate mandatory.

### Phase 3: Weekly report fixed-template AI draft

- Introduce template-constrained generation to reduce hallucination variance.
- Add supervisor review checkpoint where needed.

### Phase 4: Homework upload + teacher-reviewed AI marking

- Add storage + OCR/vision/marking pipeline with draft outputs only.
- Require teacher confirmation before learner/parent visibility.

### Phase 5: Personalised recommendations and analytics

- Add learning-gap and next-week recommendation features.
- Expand insights only after reliable supervised data history exists.

## 9) Immediate next milestone recommendation

Recommended next step:

- **School/curriculum data onboarding planning first** (before real auth UI rollout and before AI Edge Function build).

Why this is the best next move:

- It establishes the context needed for meaningful personalised AI output.
- It is lower risk than introducing write flows or full AI inference immediately.
- It aligns with existing read-only migration momentum and service-layer approach.
- It enables safer, more deterministic prompts/templates when AI endpoint work begins.

Suggested order after that:

1. complete school/curriculum read model planning and field mapping,
2. then plan secure AI Edge Function contracts,
3. then revisit auth/login rollout details for production hardening.

## 10) Draft SQL foundation status

Draft schema foundation files were prepared for manual review/application:

- `supabase/sql/007_school_curriculum_ai_foundation.sql`
- `supabase/sql/008_school_curriculum_ai_fake_seed.sql`

These drafts introduce additive school/curriculum + AI foundation tables and conservative staff-first RLS defaults, without frontend AI API integration.

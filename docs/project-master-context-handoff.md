# Project Master Context Handoff

This master handoff preserves product direction, implemented milestones, architecture constraints, and safe continuation priorities for future ChatGPT/Cursor sessions.

## 1) Product identity and vision

**Young’s Learners / Enrichify Class Flow** is not just an admin dashboard.  
It is an AI-driven education operations + parent trust + learning evidence platform.

Direction to preserve:

- Mobile-first for parent and teacher daily workflows.
- Desktop/laptop-capable for HQ and supervisor reporting/review.
- Future school/curriculum personalisation foundation.
- Future AI learning intelligence layer.
- Build toward a stable, careful, "perfect portal" direction over rushed, unstable feature expansion.

## 2) Current project stage

Current stage should be treated as:

- Strong internal prototype / full-stack hardening stage.
- Not production-ready yet.
- Several real Supabase RLS-backed workflows are already implemented and validated with smoke tests.

## 3) Major completed verticals

Implemented milestones to preserve as "already done":

- Supabase auth/login/role landing foundation.
- Supabase read/write service patterns (anon client + JWT model).
- MyTasks write flow.
- Attendance write flow.
- Parent Updates Quick Comment draft/release flow.
- Weekly Progress Report draft/release flow.
- Fee/payment proof exception workflow.
- Staff Time Clock full vertical.
- Class Memories full vertical.
- AI mock/fallback draft layer (provider-free runtime).

## 4) Fee/payment proof business rule (locked)

This business logic is locked and should remain explicit in future docs/features:

1. Normal payment is internally tracked and confirmed by supervisor/HQ.
2. Invoice/e-invoice is sent after confirmed payment (automation can come later).
3. Parent payment proof upload is exception-only.
4. Parent upload is used only when office cannot confirm payment internally.
5. HQ/supervisor verifies or rejects submitted proof.
6. Parent upload UX must not look like the normal/default payment flow.

## 5) Staff Time Clock product rule (locked)

Staff Time Clock is not button-only attendance.

Required product behavior:

- Active GPS/geofence verification at both clock-in and clock-out.
- Selfie proof at clock-in and clock-out.
- No continuous/background tracking by default.
- Staff punch flow is mobile-first.
- HQ/supervisor review/reporting is desktop-friendly.
- Selfie evidence is private storage with signed URL access only.

Planned future hardening:

- Review actions.
- Export/report tools.
- Adjustment request handling.
- Retention + consent policy finalization.

## 6) Class Memories product rule (locked)

Use the product language **Memory / Memories / Class Memories**, not "class photo".

Required behavior and UX direction:

- Class Memories is for warm parent engagement + learning evidence.
- Teacher upload originates from ParentUpdates/class workflow.
- Approval gate required before parent visibility.
- Parent-facing Latest Memory hero card.
- Memories History should be gallery/grid style, not long stacked list.
- Media remains private storage with signed URL access only.

Planned next enhancements:

- Hide/archive UI wiring.
- Video support.
- Thumbnail generation.
- Consent/photo policy finalization.

## 7) AI strategy (locked)

AI architecture and product guardrails:

- AI output is draft-only.
- Teacher/staff approval is required before parent visibility.
- No direct frontend LLM provider calls.
- Real AI must run through Supabase Edge Function/server-side secret boundary.
- First real AI use case should be parent comment draft generation.

Recommended later AI sequence:

1. Weekly report AI drafts.
2. Homework feedback/marking.
3. Learning gap detection.
4. Next-week recommendations.
5. Curriculum-aware AI personalization.

## 8) Security / RLS / storage rules (locked)

Non-negotiable implementation rules:

- Frontend uses Supabase anon client + JWT only.
- Service role key is never used in frontend.
- Private buckets by default.
- Signed URLs only for sensitive object access.
- `demoRole` must not write to Supabase.
- Parent/student can only see approved and linked content.
- Teacher access is branch/class scoped.
- Branch supervisor access is own-branch scoped.
- HQ can access all branches by policy.
- For risky workflow changes, run smoke tests before UI wiring.

## 9) Validation rule (efficiency policy)

Use the smallest validation scope that matches blast radius:

- **Docs-only:** run `git diff --name-only`.
- **UI-only changes:** run build/lint/typecheck.
- **Service/backend changes:** run build/lint/typecheck + relevant smoke test(s).
- **SQL/RLS/storage/auth/shared risky changes:** run broader/full validation.
- Avoid running full suite after tiny or docs-only changes.

## 10) Known limitations (not production-ready yet)

Current non-production gaps:

- Password reset and production auth polish.
- Real onboarding/admin user management.
- Production privacy/consent wording finalization.
- Data migration and seed cleanup plan.
- Full mobile QA on real iOS/Android devices.
- Exports/monthly reporting completeness.
- Invoice/e-invoice automation.
- Real AI provider integration.
- School/curriculum onboarding not implemented in product flow yet.
- Homework upload/review pipeline not implemented in production shape yet.
- Production monitoring/on-call/support process not finalized.

## 11) Recommended roadmap from here

Recommended order:

A. Project master handoff doc (this doc)  
B. School/curriculum onboarding foundation  
C. Homework upload/review pipeline  
D. Real AI provider integration for parent comments  
E. AI weekly report generation  
F. AI homework feedback/marking  
G. Production auth/privacy/mobile QA hardening  
H. Pilot deployment plan

Why school/curriculum before real AI:

AI needs structured learning context to be truly differentiated, accurate, and school-aligned. Without school/curriculum context, generated output is more generic and less operationally valuable.

Current status note:

- School/curriculum SQL/RLS draft now exists at `supabase/sql/012_school_curriculum_foundation.sql`.
- It is additive/manual draft and is now manually applied in Supabase dev.
- School/curriculum read service + read smoke test are now added for role-scoped read validation.
- School/curriculum fake seed draft exists at `supabase/sql/013_school_curriculum_fake_seed_data.sql` (manual/dev-only).
- School/curriculum fake seed is now manually applied in Supabase dev (Success / No rows returned).
- Fake seed application checkpoint is documented at `docs/school-curriculum-fake-seed-application-checkpoint.md`.
- Classes page read-only curriculum context preview is now started (RLS-scoped read only; no assignment/edit writes).
- School/curriculum UI is now in early read-only preview stage on `Classes`; assignment/edit UI is still unwired and AI integration is still unwired.
- Application checkpoint is documented at `docs/school-curriculum-sql-application-checkpoint.md`.
- Recommended next milestone: `Students` school profile UI or `ParentView` learning focus summary.

## 12) Next immediate milestone prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Task:
School/curriculum onboarding foundation planning only.

Scope rules:
- Planning/docs only.
- Do not implement runtime code.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Supabase SQL in this step.
- Do not change storage policies.
- Do not upload files.
- Do not call AI APIs.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.

Deliverables:
1) A planning document for school/curriculum onboarding foundation:
   - target onboarding workflow (HQ + branch + teacher touchpoints)
   - required entities/relationships already present vs missing
   - role/RLS visibility matrix
   - minimal phased rollout plan (read-first, then write)
   - dependencies for homework and AI milestones
   - risks, non-goals, and validation scope
2) Clear recommendation of first implementation slice after planning.

Validation efficiency rule:
- Docs-only change.
- Run only:
  - git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files changed.
```

---

Handoff status: complete for continuity. Use this file as the primary context anchor before starting the next milestone.

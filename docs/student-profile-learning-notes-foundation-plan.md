# Student Profile / Learning Notes Foundation Plan

Date: 2026-05-06
Type: small safe UAT foundation (no SQL/RLS changes)

## Product ownership model

### 1) Core student profile (official record)

- name
- branch
- class
- programme
- enrolment status
- guardian/parent link

Owner:
- HQ / Branch Supervisor

Teacher access:
- view only

### 2) Learning profile / teacher notes (internal learning context)

- strengths
- areas for improvement
- behaviour and engagement notes
- learning goals
- support needs

Owner:
- teacher can add/update only through approved scoped internal paths
- supervisor/HQ can review

Parent visibility:
- internal by default
- only parent-visible when explicitly released via approved communication/report flows

### 3) Evidence history (existing modules)

- attendance
- homework
- observations
- parent communication
- class memories

### 4) Sensitive/admin profile fields

- medical notes
- pickup authorisation
- billing
- legal consent

Owner:
- HQ / Branch Supervisor only

Teacher access:
- limited view only if policy-approved in future

## Current foundation implemented

- `/students` now has a safe student profile detail foundation opened from each card.
- Student detail panel includes:
  - student identity summary,
  - class/programme/branch display,
  - attendance/homework summary counts,
  - links to existing modules (`/attendance`, `/homework`, `/observations`, `/parent-updates`).
- Learning notes section is internal-facing and includes clear placeholder copy for teacher workflow:
  - "Learning notes are internal staff evidence. Parents will not see these notes unless they are later included in an approved report or released parent communication."
- Official ownership boundary is explicitly stated in UI copy:
  - "Official profile, class, branch, and guardian links are managed by HQ or Branch Supervisors."
  - teacher read-only for those official profile fields.
- Quick-link guidance in student detail panel:
  - "Use the tools below to record evidence through the existing workflows."

## AI Parent Report evidence roll-up (2026-05-06)

- **`collectAiParentReportSourceEvidence` (RLS)** now includes a **`teacher_observations` / `observationSummary`** lane fed from `student_school_profiles` (`teacher_notes`, `subject_notes`, `learning_context_notes`, short `parent_goals` snippets) and student **`learning_goals`** (class + period filters when dates are present), all **sanitised** (no URLs/storage paths).
- **Parents never see** this staff evidence list; only **teacher-edited, approved, and released** report sections reach ParentView.
- **No auto-release** of AI output; MVP **`observations`** (classroom quality) table remains **out** of this path until explicitly designed.
- **Automated fixture proof:** After **`013`** (manual/dev), run **`npm run test:supabase:ai-parent-report:observation-evidence`** — wide + narrow period: **`observationSummary`** (report window) and **`learningContextSnapshotSummary`** (standing background) + mock-draft **`learningContextSnapshot`** / **`engagementNotes`**. Snapshot fills gaps when the monthly window is thin; **not** parent raw output.

## Test posture for this polish pass

- No existing lightweight UI smoke/unit pattern was found for route-level `/students` copy assertions.
- Validation remains build/lint/typecheck for this copy-only update.

## Stability follow-up

- `/students` full-page blank route symptom can occur from render-time initialization order bugs, not only card null handling.
- A route crash risk was removed by ensuring student learning-context state is declared before dependent memo access.
- This keeps teacher/HQ ownership/read-only boundaries unchanged while preventing white-screen failure.

## Additional resilience (2026-05-06)

- Normalize list query results (`null` / non-array safe) before any array operations on `/students`.
- Local `StudentsErrorBoundary` prevents a single subtree fault from blanking the whole staff view.
- **School / Learning Context:** when a Supabase-linked student has **no** `student_school_profile` row, the UI must guard `parent_goals` / `teacher_notes` (and related fields) with optional access so the card shows “No school profile yet” instead of throwing on `null.parent_goals`.

## Parent linking and class assignment boundary

- Parent links to an existing student record.
- HQ/Branch Supervisor remains source of truth for branch/class assignment.
- Parents do not self-assign class membership.
- `guardian_student_links` remains the relationship boundary.
- Expanded rollout posture (staff-mediated onboarding, invite-code deferrals, ParentView no-linked UX): `docs/parent-onboarding-student-linking-readiness-plan.md`.
- **`/students` guardian link strip:** HQ / Branch Supervisor see read-only link presence (+ minimal profile hints when RLS allows). Teachers see linked/not/unavailable per policy — Supabase teachers currently get **unavailable** for guardian rows until a scoped read policy or RPC exists (documented in parent onboarding plan).
- **Future staff link/unlink:** Policy, audit requirements, and implementation sequencing — `docs/guardian-link-management-readiness-plan.md` (planning-only; confirm deployed RLS before any write work).

## Deferred items

- Dedicated teacher-writeable learning-notes table/workflow with explicit release controls.
- Additional role-specific guardrails at DB layer for fine-grained teacher note writes.
- Parent-facing exposure controls for any future learning-notes release mechanism.

# Students School Profile Edit UI Checkpoint

## What was implemented

The Students page now includes a compact, in-card School Profile edit flow for authorized roles. This extends the prior read-only School / Learning Context preview into an editable checkpoint while keeping runtime boundaries intact (no new services, no SQL/RLS changes, and no AI/homework pipeline work in this step).

## Files changed

- `src/pages/Students.jsx`
- `docs/students-school-profile-edit-ui-plan.md`
- `docs/school-curriculum-onboarding-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## Edit UI behavior

- Edit controls are compact and placed inside each student card's School / Learning Context section.
- Editable fields include:
  - school name
  - grade/year
  - curriculum profile select
  - parent goals
  - teacher notes
- Supports `Save` and `Cancel` actions.
- Works for both existing school profile data and no-profile state.
- Uses a mobile-first stacked layout to keep form controls readable on small screens.

## Role and demoRole behavior

- HQ admin can edit school profile fields.
- Branch supervisor can edit within RLS-enforced branch scope.
- Teacher, parent, and student roles do not see edit controls.
- Demo/local mode preserves fallback behavior and does not call Supabase writes.

## Write behavior

- Save path uses `upsertStudentSchoolProfile(...)`.
- `schoolId` is explicitly set to `null` for now.
- On success: success toast, query refresh, and edit mode closes.
- On failure: safe error toast is shown.

## Validation and error handling

- `studentId` must pass UUID validation.
- `curriculumProfileId` must be blank/null or a valid UUID.
- Optional text fields are trimmed before submit.
- No guessed IDs are generated or submitted.
- Teacher notes are treated as internal-facing context.
- Parent goals are handled with supportive wording.

## Security and RLS

- Uses anon client + user JWT only.
- No service role key is used in frontend.
- RLS remains the authority for HQ/branch write scope decisions.
- Parent and student users cannot write this profile data.
- Teacher write remains blocked in MVP.

## What remains

- Homework upload/review pipeline.
- AI curriculum-context integration.
- Curriculum profile/template creation UI.
- Production curriculum import.
- Full mobile QA pass.

## Recommended next milestone

Plan the Homework upload/review pipeline next.

Rationale:

- Class and student curriculum context are now manageable through current UI and write paths.
- Homework/student work is the next learning-evidence layer needed for meaningful progress tracking.
- Later AI features should operate on curriculum context plus real student work, rather than generic prompt-only context.

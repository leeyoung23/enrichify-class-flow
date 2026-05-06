# Teacher Homework + Parent Communication Validation Cleanup Checkpoint

Date: 2026-05-04

## Scope

- `src/pages/ParentUpdates.jsx`
- `src/pages/Homework.jsx`
- `src/pages/MyTasks.jsx`
- docs-only handoff update

## Main UX issues found

- Real-mode copy still included demo/local wording in a few teacher-facing helper areas.
- Parent Communication review actions did not clearly read as a step-by-step flow in final review actions.
- Homework included technical phrasing (for example UUID-focused context wording) in normal staff view.
- My Tasks did not provide direct teacher quick navigation into Homework and Parent Communication.

## Small safe fixes applied

- Parent Communication (`/parent-updates`)
  - Real mode now uses cleaner helper copy without demo-first wording.
  - Demo/debug helper wording is shown only in demo/debug contexts.
  - Final review actions now read as explicit sequence:
    - Step 2: Mark ready to share
    - Step 3: Share with family
  - Empty states now tell teachers what to do next.
- Homework (`/homework`)
  - Header/title copy simplified to teacher-facing wording.
  - Sign-in helper text no longer advertises demo flow in normal real mode.
  - Required labels added only for truly required create fields (who/class/title).
  - Technical UUID-heavy empty-state wording replaced with teacher-friendly context wording.
- My Tasks (`/my-tasks`)
  - Non-teacher description copy simplified to neutral staff language.
  - Access-restricted message now distinguishes demo-role restriction vs real-role restriction.
  - Added direct teacher quick actions:
    - Open Homework (`/homework`)
    - Open Parent Communication (`/parent-updates`)

## Mobile-first checks for changed areas

- New quick-action buttons in My Tasks use stacked layout on mobile and tap-safe height.
- Parent Communication and Homework action buttons remain full-width on small screens where needed.
- Updated copy avoids long technical terms that can overflow on narrow cards.

## Safety boundaries preserved

- No SQL or RLS policy changes.
- No service-role frontend usage.
- No auth-permission relaxation.
- No parent visibility widening for drafts/old versions/internal notes/evidence.
- No auto-release, no notifications/emails, no AI Parent Reports behavior change.

## Recommended next lane

- Manual browser QA pass at desktop and ~390px width for:
  - Parent Communication step flow clarity
  - Homework create/review readability
  - My Tasks quick-action discoverability

# Parent-facing Creation UI Plan

## Checkpoint update (text-only creation UI wired)

- Parent-facing text-only creation UI is now wired in staff `Announcements` as `Parent Notices`.
- Placement remains staff-side only; ParentView remains read-only parent surface.
- Role behavior in MVP:
  - HQ/admin + branch supervisor can create/publish/archive where RLS allows,
  - teacher is view-only,
  - parent/student remain blocked from staff route.
- Flow now wired:
  - save draft,
  - create then publish,
  - archive action for manager roles.
- Parent-friendly preview panel is now present before submit.
- Boundaries preserved:
  - no parent media upload/release UI in this milestone,
  - no SQL/RLS changes,
  - no notifications/emails/live chat.
- Canonical implementation checkpoint:
  - `docs/parent-facing-creation-ui-checkpoint.md`

## Checkpoint update (creation UI documentation finalized)

- Parent-facing creation UI checkpoint docs are now finalized for this milestone.
- Validation summary captured:
  - build/lint/typecheck PASS,
  - parent-facing announcements + media smokes PASS with expected safe CHECK notes,
  - announcements phase1/company-news create/mytasks smokes PASS,
  - npm `devdir` warning remains non-blocking.
- Safety summary reaffirmed:
  - no SQL/RLS changes,
  - no media upload/release UI in this milestone,
  - no notifications/emails/live chat,
  - no service-role frontend usage.
- Recommended next milestone now:
  - **A. Parent-facing media upload/release UI planning** first.

Date: 2026-05-02  
Scope: planning-only checkpoint for safe staff/HQ/supervisor creation workflow before implementation

## 1) Current state

- ParentView read-only `Announcements & Events` UI exists and is checkpointed.
- Parent-facing announcement services are implemented and smoke-proven.
- Parent-facing media services are implemented and smoke-proven.
- Parent-facing creation UI is not implemented.
- Parent-facing media upload UI is not implemented.
- Notifications/emails do not exist in this flow.

## 2) Product purpose

The parent-facing creation workflow should provide staff/HQ a safe and deliberate way to publish official parent notices and events.  
Parent-visible content requires higher polish and clearer release intent than internal staff announcements because parent-facing communication has stricter governance and privacy impact.

Goals:

- reduce dependence on ad-hoc WhatsApp broadcast chains,
- standardize official parent communication quality and timing,
- keep content lifecycle controlled (draft -> review/preview -> publish),
- enforce role and audience boundaries before anything reaches parents.

## 3) Creator roles

MVP role plan:

- **HQ/admin:** can create/publish/archive globally.
- **Branch supervisor:** can create/publish/archive own-branch parent-facing posts only if product confirms and RLS allows.
- **Teacher:** blocked as direct creator in MVP.
- **Parent/student:** no creation capability.

Future teacher contribution (if needed later):

- draft/request-to-publish only,
- no direct publish to parent audience.

## 4) Creation placement options

### A) Staff `Announcements` page with new Parent-facing mode/tab

Pros:

- reuses existing staff-facing route and permission patterns,
- lower navigation complexity for HQ/supervisor,
- easier phased rollout from existing internal communications context.

Risks:

- needs clear visual split so internal and parent-facing flows are not confused.

### B) Separate staff page (`Parent Communications` / `Parent Updates`)

Pros:

- strongest product boundary from internal announcement workflow,
- clearer mental model for governance and release review.

Risks:

- adds route/menu surface area and duplicate list/filter shell work.

### C) ParentView admin controls hidden by role

Pros:

- fewer routes.

Risks:

- parent portal should remain parent-safe viewing surface,
- higher accidental control leakage risk in parent-facing UI context.

### D) Dashboard shortcut only

Pros:

- fast access.

Risks:

- insufficient as a complete creation home,
- discoverability and lifecycle management become weak.

### Recommendation

Recommend **A first** (new Parent-facing mode/tab inside staff `Announcements`), with optional migration to **B** if product later wants a stronger standalone IA boundary.  
Avoid **C** for MVP because ParentView should remain a parent-safe read surface, not an admin surface.

## 5) Creation fields

Planned create/edit fields:

- `title` (required)
- `subtitle` (optional)
- `body` (required)
- `announcementType` / `eventType` (required, from parent-facing type set)
- `branch` (required by role scope)
- `class` (optional)
- `targets` (required for publish): branch/class/student targeting
- `event_start_at` (optional)
- `event_end_at` (optional, must be >= start when present)
- `location` (optional)
- `publish_at` (optional scheduled publish)
- media attachments (optional)
- preview before publish (required workflow step)

## 6) Draft/publish/archive flow

Planned lifecycle:

1. **Save Draft** (allows incomplete content and zero targets).
2. **Preview Parent View** (internal preview surface of parent-safe rendering).
3. **Publish** (requires at least one valid target).
4. **Archive** (remove from active parent feed while retaining auditability).

MVP governance rules:

- draft edit is allowed,
- published edit policy deferred to later governance decision,
- no auto email/notification on publish in MVP,
- publish blocked if no target exists,
- publish blocked when media upload/release is incomplete unless user explicitly confirms text-only publish.

## 7) Media upload/release workflow

Planned behavior:

- media upload is optional and uses existing parent-facing media service,
- uploaded media defaults to unreleased (`released_to_parent=false`),
- internal preview of uploaded media is allowed for creators,
- only released media is visible to parents,
- signed URL only, no public URL model,
- no reuse of internal attachments path.

Phasing recommendation:

- safest path is **text-only creation first**, then media upload/release UI in follow-up,
- reason: service and RLS are proven, but upload/release UI introduces additional publish-state complexity and accidental-release risk.

## 8) Templates and tone

Template set for MVP creation:

- `event`
- `activity`
- `centre_notice`
- `holiday_closure`
- `reminder`
- `celebration`
- `programme_update`
- `parent_workshop`
- `graduation_concert`

Tone rules:

- parent-friendly and concise,
- clear date/time/location/action-needed,
- avoid internal operational language,
- no staff-only notes in parent-visible fields.

## 9) Targeting UX

MVP targeting UX plan:

- target by branch,
- target by class,
- target selected students (family linked through existing parent linkage),
- show clear audience summary before publish,
- avoid direct parent/guardian manual target in MVP,
- add guardrails to prevent accidental all-parent blast,
- enforce supervisor own-branch-only targeting.

## 10) Safety and privacy boundaries

Must-hold boundaries:

- no internal `internal_staff` announcement exposure in parent path,
- no internal `announcement_attachments` exposure/reuse,
- no `staff_note` exposure to parent surfaces,
- no service-role frontend usage,
- do not enable internal `parent_facing_media`,
- no notifications/emails by default,
- no live chat behavior,
- fake/dev data only for demos/tests and planning checkpoints.

## 11) Validation/testing plan (future implementation phase)

Required tests once creation UI is implemented:

- HQ create draft and publish PASS,
- supervisor own-branch create and publish PASS,
- supervisor cross-branch create blocked PASS,
- teacher create blocked PASS,
- parent/student create blocked PASS,
- publish target-required gate PASS,
- ParentView shows published targeted post PASS,
- unrelated parent blocked PASS,
- media release boundary preserved (released visible, unreleased hidden) PASS,
- no email/notification side effects PASS.

## 12) Implementation phasing options

### A) Text-only creation UI first

Pros:

- safest and fastest governance path,
- lower blast radius while proving role/target/publish UX.

### B) Creation UI + media upload/release together

Pros:

- feature-complete in one milestone.

Risks:

- bigger complexity and higher release-state risk.

### C) Creation UI shell with demo parity first

Pros:

- validates UX and role navigation before live wiring,
- low runtime risk.

Risks:

- slower path to real production value.

### D) Staff page planning only then service regression

Pros:

- maximum caution.

Risks:

- little product progress in UI readiness.

### Recommendation

Recommend **A first** (or **C if extra caution is needed**).  
Primary recommendation: **A** because text-only creation delivers meaningful progress with the safest scope; media UI can follow as a controlled milestone.

## 13) Recommended next milestone

Choose from options:

- A. Parent-facing text-only creation UI shell/wiring
- B. Parent-facing creation UI shell with demo parity only
- C. Parent-facing media upload UI planning
- D. Notification/email planning
- E. Reports/PDF/AI OCR plan

### Recommendation

Recommend **A. Parent-facing text-only creation UI shell/wiring**.

Why safest now:

- read-only parent UI and parent-facing services are already proven,
- text-only create/publish/target workflow is the smallest high-value step,
- avoids early media upload UI complexity and accidental release edges,
- keeps notifications/emails out of scope while governance is established.

## 14) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add parent-facing creation UI plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement parent-facing text-only creation UI shell/wiring for staff Announcements (planning recommendation A), without media upload UI in this milestone.

Hard constraints:
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add new backend services.
- Do not add parent-facing media upload UI in this milestone.
- Do not add notifications/emails.
- Do not add live chat.
- Do not use service role key in frontend.
- Do not remove demoRole or demo/local fallback.
- Use fake/dev data only in demo paths.
- Keep ParentView parent-safe read-only (no admin controls in ParentView).

Implement:
1) Add staff-only parent-facing creation mode in `src/pages/Announcements.jsx` (not ParentView).
2) Add text-only create fields + type + targeting (branch/class/student target model).
3) Add draft save + preview step + publish gate (target required) + archive action shell.
4) Keep teacher blocked for parent-facing create/publish in MVP.
5) Keep parent/student blocked from any creation path.
6) Ensure safe generic errors (no SQL/RLS/env leakage).
7) Add/update docs checkpoint for implementation outcome and boundaries.

Validation efficiency rule:
- If runtime files change, run targeted validation:
  - npm run build
  - npm run lint
  - npm run typecheck
- If docs-only changes, run:
  - git diff --name-only
```

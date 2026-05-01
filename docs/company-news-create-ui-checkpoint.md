# Company News Create UI Checkpoint

Date: 2026-05-01  
Scope: authenticated HQ Company News create wiring in `Announcements` using existing services

## 1) What was wired

- Authenticated HQ can now create Company News in `src/pages/Announcements.jsx`.
- Existing service methods are used:
  - `createCompanyNews(...)` for draft creation
  - `publishCompanyNews(...)` for publish
- Flow supports:
  - `Save Draft`
  - `Create & Publish` (create then publish sequentially)

## 2) Access behavior

- Authenticated:
  - HQ/admin: create enabled
  - branch supervisor: view-only for create
  - teacher: view-only for create
  - parent/student: still blocked from staff Announcements page
- Demo:
  - HQ demo create remains local-only
  - supervisor/teacher demo remain view-only
  - no Supabase Company News create call in demo

## 3) Form and targets

- Fields wired:
  - title (required)
  - subtitle (optional)
  - body (required when subtitle is empty)
  - category/template (local label shell)
  - emoji (`popupEmoji`)
  - popup enabled toggle
  - priority/tone shell
  - target type and target values
- Targeting supported in this milestone:
  - branch
  - role
  - profile
- `class` target is not added for Company News in this milestone.
- Parent/student targets are not added.

## 4) Safety and boundaries

- Company News remains excluded from MyTasks by default.
- No request-style obligations were added for Company News:
  - no `requires_response` requirement
  - no `requires_upload` requirement
  - no done/undone task obligation
- No notifications/emails/live chat side effects.
- No parent-facing announcements/events.
- No SQL/RLS changes in this checkpoint.

## 5) UX behavior

- Submit buttons are disabled while create/publish is pending.
- Success path:
  - refresh announcements list
  - move filter context to Company News
  - open/select created item when possible
- Error copy is safe and generic (no raw SQL/RLS/env leakage).

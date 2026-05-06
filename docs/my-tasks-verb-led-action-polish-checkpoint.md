# My Tasks — verb-led action polish (checkpoint)

## What was polished

- **Human-readable labels** for classroom task filters/badges and announcement task badges (display-only; underlying API/enums unchanged).
- **Verb-led primary actions** on announcement task cards (`Upload in Announcements`, `Reply in Announcements`, `View in Announcements`, `Open in Announcements`) — same `navigate` target and state as before.
- **Page introduction** explaining the two areas (classroom/task reminders vs HQ requests from Announcements) and that nothing on this page emails parents or sends notifications automatically.
- **Section headings** for announcement groups: Upload files, Reply to HQ, Other action needed, Done — grouping logic unchanged.
- **Less cluttered cards** where section context already implied upload vs reply (badge wording adjusted to avoid repeating the section title).
- **Mobile-friendly** layout preserved (`min-w-0`, stacked actions, `min-h-10` primary buttons).

## Teacher-friendly label mapping (display-only)

| Raw value | Shown as |
|-----------|-----------|
| **Classroom task status** | |
| `pending` | To do |
| `completed` | Done |
| `overdue` | Overdue |
| `in_progress` | In progress |
| **Classroom task priority** | |
| `high` | High priority |
| `medium` | Medium priority |
| `low` | Low priority |
| **Announcement task status** | |
| `pending` | To do |
| `unread` | New |
| `undone` | Action needed |
| `overdue` | Overdue |
| `done` / `completed` | Done |
| **Announcement priority** | |
| `urgent` | Urgent |
| `high` | High priority |
| `normal` | Normal |
| `low` | Low priority |

## Verb-led announcement primary labels

Logic uses task fields only for copy (no navigation/handler changes):

- Done → **View in Announcements**
- Upload still required → **Upload in Announcements**
- Reply still required → **Reply in Announcements**
- Otherwise → **Open in Announcements**

## Teacher-only route/nav (current product state)

- `MyTasks.jsx` still includes `canAccess` for `teacher` **or** `branch_supervisor` **or** `hq_admin` (legacy breadth).
- Expanding My Tasks to supervisor/HQ routes and aligning `canAccess` with route guards is a **future product decision** — not changed in this polish pass.

## Out of scope (unchanged)

- No backend, SQL, RLS, storage, provider, notification, or email changes.
- No ParentView, real AI, OCR, or PDF download/storage changes.
- No new writes beyond existing behaviour.
- `permissionService` was not modified.

## Future lanes (parked)

- Review-style grouping for announcement tasks only if product can define a stable signal without new business logic.
- Supervisor/HQ My Tasks route alignment with `canAccess`.

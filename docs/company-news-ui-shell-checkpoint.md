# Company News UI Shell Checkpoint

Date: 2026-05-01  
Scope: Company News UI shell inside `Announcements` with demo parity only

## 1) What was implemented

- `Announcements` now renders a Company News shell in the existing `Company News` tab/filter.
- News-style cards and detail shell are available for Company News rows.
- Added warm pop-up **preview panel** in Company News detail (preview-only, non-runtime).
- Added HQ demo-only local `Create Company News` shell form.
- Preserved existing request workflow (read/done/undone/reply, attachments, completion overview) without behavior changes.

## 2) Demo parity behavior

- Demo mode includes local fake Company News cards:
  - congratulations/recognition
  - important update
  - training reminder
  - holiday/closure
  - event reminder
- Cards include title, subtitle/body preview, category label, emoji, publish-style date, priority/tone, optional pop-up enabled badge, and detail action.
- HQ demo can create Company News locally (no Supabase call).
- Supervisor/teacher demo can view Company News but cannot create.

## 3) Authenticated behavior (current milestone)

- Company News tab can show rows where `announcement_type = company_news` if already returned by existing reads.
- No real Company News create/write call is wired in this milestone.
- Create button in authenticated mode is preview-disabled with safe copy.
- No new service methods were added.

## 4) Warm pop-up preview behavior

- Detail panel includes a warm pop-up preview card:
  - short 5-10 second style mock copy,
  - `View` and `Dismiss` preview buttons (non-functional).
- Not implemented:
  - app-shell runtime pop-up trigger,
  - persistence/dismissal backend state,
  - repeated display logic/frequency controls.

## 5) Safety boundaries preserved

- No Supabase SQL changes.
- No RLS changes.
- No SQL apply.
- No new services.
- No MyTasks side effects for Company News.
- No parent-facing announcements/events.
- No `parent_facing_media` enablement.
- No notifications/emails.
- No live chat.
- No service-role frontend usage.

## 6) Validation

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS

## 7) What remains future

- Runtime warm pop-up behavior in app shell (later milestone).
- Popup frequency/dismissal persistence strategy.
- Optional model review only if popup persistence requires additional fields.
- Parent-facing announcements/events remain future.
- Notifications/emails remain future.

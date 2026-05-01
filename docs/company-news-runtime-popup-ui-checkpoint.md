# Company News Runtime Popup UI Checkpoint

Date: 2026-05-01  
Scope: runtime app-shell warm popup UI shell/wiring using existing popup services only

## 1) What was implemented

- Runtime warm Company News popup shell is now wired.
- Placement chosen: `src/components/layout/AppLayout.jsx` (layout/app-shell adjacent).
- `Announcements` routing context support updated for popup view navigation:
  - `src/pages/Announcements.jsx` now accepts `state.preferredFilter`.

## 2) Placement decision

Chosen placement: **layout/app-shell adjacent (`AppLayout`)**.

Why:

- Auth/profile/demo role state is already resolved in `AppLayout`.
- Allows staff-wide behavior across routes without Dashboard-only duplication.
- Supports one-session guard centrally and avoids route-change popup spam.

## 3) Demo behavior (local-only)

- Staff demo roles (`hq_admin`, `branch_supervisor`, `teacher`) can see one local fake popup candidate.
- Parent/student demo roles do not see staff Company News runtime popup.
- Demo runtime popup does not call Supabase popup services.
- Dismiss is local/session-only in demo.
- View routes to `/announcements` with Company News context.

## 4) Authenticated behavior (staff-only)

- Runtime read path uses existing service:
  - `listEligibleCompanyNewsPopups({ limit: 1 })`
- Read is gated to authenticated non-demo staff only.
- Parent/student/non-staff skip popup query path.
- Popup fetch is attempted once per app-shell session to avoid repeated fetches on route changes.
- Fail-silent behavior: service errors do not block app load and do not show raw backend error text.

## 5) Seen/dismiss behavior

- On popup show, delayed seen mark is triggered once per session/item:
  - `markCompanyNewsPopupSeen({ announcementId })`
- Dismiss action:
  - local hide immediately,
  - `dismissCompanyNewsPopup({ announcementId })` called for authenticated popup.
- View action:
  - marks seen if needed,
  - navigates to `/announcements` with `announcementId` + `preferredFilter: 'Company News'`,
  - hides popup for current session.
- No `done_status` mutation added.
- No forced `read_at` mutation was introduced in runtime UI wiring.

## 6) Frequency/session guard

- Max one popup at a time in UI.
- Session shown/hidden ID guard prevents same-item repeat in current session.
- Route-change spam prevented by one fetch attempt per app-shell session.
- If seen/dismiss backend write fails, local session guard still suppresses repeat storm.
- Backend `popup_dismissed_at` remains cross-session suppression source.

## 7) UI behavior

- Small warm card (not full-screen, non-blocking).
- Optional emoji + short title/body preview.
- `View` and `Dismiss` buttons.
- Mobile-friendly fixed placement with compact width behavior.
- Keyboard-accessible action buttons via normal button focus/activation.
- No confetti in this MVP runtime shell.

## 8) Safety boundaries preserved

- No Supabase SQL changes.
- No RLS policy changes.
- No SQL apply.
- No new popup services.
- No service-role frontend usage.
- No notifications/emails.
- No live chat.
- No parent-facing announcements/events.
- No `parent_facing_media`.
- No real HQ Company News create path.

## 9) Validation run

Commands run:

- `git diff --name-only` (before tests)
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:supabase:company-news:popup`

## 10) What remains future

- Real HQ Company News create path planning/wiring.
- Parent-facing announcements/events track.
- Notification/email planning.
- Optional popup animation/template polish.
- Optional runtime behavior tuning (duration/priority strategy refinements) after QA feedback.

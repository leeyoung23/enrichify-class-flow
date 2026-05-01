# Company News Runtime Popup UI Plan

Date: 2026-05-01  
Scope: docs/planning only for safe runtime warm popup UI wiring (no runtime implementation in this milestone)

## 1) Current state

- Company News UI shell exists in `src/pages/Announcements.jsx` (cards/detail/demo create shell + non-runtime popup preview panel).
- Popup SQL/status foundation is already applied (`026` popup status fields + guard trigger) and documented.
- Popup service path and focused smoke are proven:
  - `listEligibleCompanyNewsPopups({ limit })`
  - `markCompanyNewsPopupSeen({ announcementId })`
  - `dismissCompanyNewsPopup({ announcementId })`
- Runtime app-shell popup UI is not implemented yet.
- Real HQ Company News create path is not implemented yet (current request-first create-path policy still blocks direct path).
- Notifications/emails are not implemented.
- Parent-facing announcements/events are not implemented.

## 2) Product purpose

The runtime popup should provide a warm internal Company News signal for eligible staff when they enter the portal, without disrupting normal work.

Purpose boundaries:

- Keep communication culture/news-focused rather than task-noise focused.
- Route staff to `Announcements` for full context and detail.
- Reduce WhatsApp-style broadcast scattering by centralizing internal news visibility.
- Avoid repetitive/annoying popup behavior through explicit guardrails.

## 3) Runtime placement options

### A. `App.jsx` level after auth/profile context loaded

Pros:

- Most correct for app-shell-wide behavior across routes.
- Consistent once-per-session guard can be centralized.
- Avoids route-specific duplicate implementations.

Risks:

- Must wait for safe auth/profile/demo readiness to avoid wrong audience display.

### B. Dashboard-only component

Pros:

- Narrower blast radius and simpler first rollout.
- Easier to reason about load sequence.

Risks:

- Not truly app-shell-wide; misses non-dashboard first-entry routes.

### C. Layout/`Sidebar`-adjacent component (inside app layout shell)

Pros:

- App-shell-wide behavior with cleaner separation from route pages.
- Natural place for one-session runtime guard.

Risks:

- Same auth/profile gating complexity as A; must avoid pre-auth render.

### D. Announcements-only popup

Pros:

- Lowest complexity.

Risks:

- Fails core goal of portal-entry warm notice; not suitable as runtime popup behavior.

### Recommendation

- Primary recommendation: **A or C**, with preference for **C (`AppLayout`-adjacent shell)** so behavior is app-shell-wide but not embedded in routing declarations.
- Safety fallback: if auth/profile sequencing remains uncertain in implementation, start with **B (Dashboard-only first slice)**, then promote to C after guard behavior is proven.

## 4) Eligibility/read flow

Planned flow:

1. Resolve runtime actor state first (auth/profile/demo).
2. Continue only for staff roles (`hq_admin`, `branch_supervisor`, `teacher`).
3. Skip parent/student entirely.
4. Demo mode:
   - do not call Supabase popup services,
   - use local fake popup candidate only for staff demo roles.
5. Authenticated non-demo staff:
   - call `listEligibleCompanyNewsPopups({ limit: 1 })` only after auth/profile is ready,
   - keep query disabled when no staff role is present,
   - prevent repeated fetches on every render.
6. Never use service-role key in frontend; keep anon client + JWT + RLS pattern only.

## 5) Seen/dismiss flow

Planned interaction semantics:

- When popup is displayed:
  - call `markCompanyNewsPopupSeen({ announcementId })` immediately on show or after short delay (implementation choice).
- `Dismiss` action:
  - call `dismissCompanyNewsPopup({ announcementId })`,
  - close popup locally regardless of backend response (session guard still applies).
- `View` action:
  - navigate to `/announcements` with `state.announcementId` (and optional query/state hint for `company_news` filter),
  - should mark seen (if not already done),
  - should not force dismiss unless user explicitly dismisses.

Explicit non-goals in this flow:

- No forced `read_at` mutation for popup interactions unless later product decision requires it.
- No `done_status` mutation from popup actions.
- No notification/email side effects.

## 6) Frequency/session guard

Anti-annoyance policy for runtime shell:

- Keep a local session guard so the same popup is not repeatedly shown in one session, even if backend write fails.
- Backend `popup_dismissed_at` remains the cross-session suppression source.
- Show at most one popup candidate at a time.
- Do not show again after dismiss.
- Do not trigger on every route change.
- Select only newest/highest-priority eligible candidate when multiple are available.

## 7) UI behavior

MVP runtime behavior target:

- Small warm surface (toast/card/modal-lite), not full-screen takeover.
- Display window around 5-10 seconds (with manual controls still present).
- `View` button.
- `Dismiss` button.
- Optional emoji when present.
- Short title + body preview only.
- Mobile-friendly pattern (bottom sheet or centered compact card).
- Accessibility: keyboard focus management, escape/dismiss behavior, and clear button labels.
- No confetti by default in MVP; only subtle visual treatment if added later.

## 8) Demo behavior

Demo plan:

- `demoRole` staff uses local fake popup candidate only.
- No Supabase popup service calls in demo.
- Dismiss is local/session-only in demo.
- View routes to `Announcements`.
- Parent/student demo roles do not see staff Company News popup.

## 9) Error/loading behavior

Failure posture:

- If popup service fails, fail silently (no blocking popup).
- Do not display raw backend errors to users.
- Do not block app load for popup fetch/write.
- Avoid retry storms (no aggressive repeated retries on route changes).
- No notification/email fallback.

## 10) Safety/privacy boundaries

Locked boundaries for runtime popup wiring:

- No parent/student access to internal staff Company News popup.
- No `parent_facing_media`.
- No internal content render before auth/profile/demo readiness is confirmed.
- No service role frontend usage.
- No notification/email automation.
- No live chat.
- No app-blocking overlay behavior.
- Fake/dev data only in tests/demo paths.

## 11) Implementation phases

- **Phase 1:** UI planning doc (this milestone).
- **Phase 2:** Runtime popup shell/wiring using existing popup services.
- **Phase 3:** Checkpoint doc update + focused validation pass.
- **Phase 4:** Real HQ Company News create-path planning.
- **Phase 5:** Optional animation/template polish.
- **Phase 6:** Parent-facing announcements/events later track.

## 12) Testing plan (future validation)

When runtime files are introduced:

- Run `build`, `lint`, `typecheck`.
- Run popup service smoke (`test:supabase:company-news:popup`).
- Manual demo validation:
  - staff demo sees one local popup,
  - parent/student demo do not see popup.
- Manual authenticated validation:
  - eligible staff sees popup,
  - parent/student do not see popup,
  - dismiss prevents repeat,
  - view routes to `Announcements` with target context.
- Confirm no notification/email side effects.
- Perform mobile behavior check.

## 13) Risks and safeguards

Risks:

- Repeated popup annoyance.
- Auth/profile race showing popup to wrong audience.
- Route-change spam.
- Backend seen/dismiss write failures.
- Seen vs dismiss semantic confusion.
- Mobile obstruction.
- Accessibility regressions.
- Internal content exposed to wrong role if guards are weak.

Safeguards:

- Strict staff-role + auth/profile readiness gate before any popup fetch.
- Session guard + backend dismiss suppression combined.
- Single-candidate display policy.
- Fail-safe silent error handling and non-blocking behavior.
- Explicit `View` vs `Dismiss` semantics in UX copy and service wiring.

## 14) Recommended next milestone

Options:

- A. Runtime app-shell warm popup UI shell/wiring
- B. Real HQ Company News create path planning
- C. Parent-facing announcements/events plan
- D. Notification/email planning
- E. Popup animation/template polish

Recommendation: **A first**.

Reason:

- Popup data/status service path is already proven.
- Runtime value now depends on safe placement and guardrails, which are now clarified.
- Real HQ create path and parent/notification tracks can remain separate follow-up milestones.

Implementation fallback note:

- If auth/profile placement uncertainty appears high during coding, start with Dashboard-only runtime shell first, then elevate to app-shell-wide placement after guard validation.

## 15) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Company News runtime popup UI plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement runtime app-shell warm Company News popup UI shell/wiring only using existing popup services.

Hard constraints:
- Do not change Supabase SQL/RLS and do not apply SQL.
- Do not add new popup services (reuse existing methods).
- Do not implement real HQ Company News create path.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not add notifications/emails/live chat.
- Do not use service role key in frontend.
- Preserve demoRole and demo/local fallback.
- Use fake/dev data only in demo paths/tests.

Implementation requirements:
1) Place runtime popup shell at app-shell level (or Dashboard-only fallback if auth/profile gating proves unsafe).
2) Gate by safe auth/profile/demo readiness + staff role only.
3) Use `listEligibleCompanyNewsPopups({ limit: 1 })` with no render-loop spam.
4) Use session guard to prevent repeated popup in same session.
5) `View` navigates to `/announcements` with `announcementId` context.
6) `Dismiss` calls `dismissCompanyNewsPopup`.
7) Mark seen via `markCompanyNewsPopupSeen` on show or view.
8) Keep non-blocking, fail-silent behavior on service errors.

Validation:
- If runtime files changed: run `npm run build`, `npm run lint`, `npm run typecheck`, and `npm run test:supabase:company-news:popup`.
- If docs-only follow-up: run `git diff --name-only` only.
```

# Company News Popup Status SQL Application Checkpoint

Date: 2026-05-01  
Scope: documentation-only checkpoint for manual Supabase DEV application of `026`

## Documentation-only note

- This checkpoint documents manual DEV SQL application only.
- No app UI/runtime logic/service changes are included in this checkpoint.
- No SQL/RLS edits are included in this checkpoint.
- Validation rule for this checkpoint: `git diff --name-only` only.

## 1) Application status

- SQL patch: `supabase/sql/026_company_news_popup_status_foundation.sql`
- Manual apply target: Supabase DEV SQL Editor
- SQL Editor result: **Success. No rows returned.**
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.

## 2) Columns confirmed

Verified on `public.announcement_statuses`:

- `popup_seen_at timestamptz null`
- `popup_dismissed_at timestamptz null`
- `popup_last_shown_at timestamptz null`

Compatibility note:

- Existing `read_at` behavior remains unchanged.
- Existing `last_seen_at` behavior remains unchanged.
- Existing `done_status` behavior remains unchanged.

## 3) Indexes confirmed

Verified indexes:

- `announcement_statuses_popup_seen_at_idx`
- `announcement_statuses_popup_dismissed_at_idx`
- `announcement_statuses_popup_last_shown_at_idx`
- `announcement_statuses_profile_popup_idx`

## 4) Trigger/function confirmed

Verified:

- Trigger `trg_guard_announcement_statuses_popup_self_update_026` exists on `announcement_statuses` (`before update`).
- Function `guard_announcement_statuses_popup_self_update_026` exists.

Purpose:

- popup status fields (`popup_*`) are self-row update only.
- This prevents cross-user popup dismissal/seen writes by manager-level broad status updates.

## 5) RLS/policy posture

Verified `announcement_statuses` policy shape remains unchanged at 4 policies:

- `announcement_statuses_delete_020`
- `announcement_statuses_insert_020`
- `announcement_statuses_select_020`
- `announcement_statuses_update_020`

Security posture remains unchanged:

- no parent/student access opening,
- no cross-branch widening,
- no service-role frontend assumption,
- no RLS weakening.

## 6) Safety boundaries (unchanged)

- Internal-staff Company News popup status only.
- Parent-facing announcements/events remain future.
- `parent_facing_media` remains out of scope.
- Notifications/emails remain future.
- Runtime app-shell pop-up behavior remains future.
- Live chat remains out of scope.
- Fake/dev data only (no real data usage).

## 7) What remains future

- popup read/write service methods,
- popup-focused smoke test,
- runtime app-shell warm pop-up component,
- frequency/session guard behavior,
- `View`/`Dismiss` runtime behavior wiring,
- optional `popup_style` / `popup_duration_seconds` / `display_until` fields (later if needed),
- parent-facing announcements/events.

## 8) Recommended next milestone

Choose:

- **A.** Company News popup service + smoke test
- **B.** Runtime warm pop-up UI shell
- **C.** Company News real write service
- **D.** Parent-facing announcements/events plan
- **E.** Notification/email planning

**Recommendation: A first.**

Why:

- SQL foundation is now manually applied in DEV.
- Service path should be proven before runtime UI behavior.
- seen/dismiss update path needs focused smoke validation first.
- runtime warm pop-up should wait until list/seen/dismiss service behavior is verified under current RLS boundaries.

## 9) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News popup status SQL application

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News popup service + smoke test only.

Hard constraints:
- Do not change app UI/runtime behavior in this milestone.
- Do not change Supabase SQL/RLS and do not apply SQL in this milestone.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not add notification/email/live chat behavior.
- Do not use service role key in frontend.
- Preserve demoRole and demo/local fallback.
- Use fake/dev data only.

Deliverables:
1) Popup read/write service methods for internal_staff Company News:
   - list eligible popup candidate
   - mark popup seen
   - dismiss popup
2) Focused smoke script for popup status update path:
   - self-row update allowed
   - cross-user popup update blocked
   - parent/student blocked-or-empty
3) Checkpoint documentation update.

Validation efficiency rule:
- Service changes: run build/lint/typecheck + focused popup smoke only.
- Docs-only follow-up: run `git diff --name-only`.
```

## Checkpoint update (popup service + smoke completed)

- Popup service methods are now added:
  - `listEligibleCompanyNewsPopups(...)`
  - `markCompanyNewsPopupSeen(...)`
  - `dismissCompanyNewsPopup(...)`
- Focused smoke test is now added:
  - `scripts/supabase-company-news-popup-smoke-test.mjs`
  - `npm run test:supabase:company-news:popup`
- Service + smoke checkpoint doc:
  - `docs/company-news-popup-service-smoke-checkpoint.md`
- This service checkpoint preserves boundaries:
  - no runtime app-shell popup UI wiring,
  - no SQL/RLS changes,
  - no notifications/emails,
  - no parent-facing announcements/events,
  - no `parent_facing_media`.
- Service smoke test quality notes:
  - PASS: popup service smoke, phase1 smoke, mytasks smoke, and completion smoke,
  - CHECK: direct HQ `company_news` insert blocked by request-first create-path policy (expected currently),
  - CHECK: optional phase1 cross-branch negative fixture still skipped when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured,
  - WARNING: npm `devdir` env config warning is non-blocking.

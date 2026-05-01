# Company News Create SQL Application Checkpoint

Date: 2026-05-01  
Scope: documentation-only checkpoint for manual Supabase DEV apply of `027` (no app/runtime/service changes in this milestone)

## 1) Application status

- Manual apply target: `supabase/sql/027_company_news_create_foundation.sql`.
- Supabase DEV SQL Editor result: **Success. No rows returned.**
- No production apply in this checkpoint.
- No runtime/UI/service changes in this checkpoint.

## 2) SQL/RLS confirmation

Verified in DEV:

- `announcements_insert_020` now uses `can_insert_announcement_row_027(...)`.
- `can_insert_announcement_row_027(...)` exists.
- Only announcement row insert gating changed in this patch.
- Announcements `select/update/delete` policies are unchanged by `027`.
- Existing request insert behavior is preserved.
- HQ/admin direct `company_news` draft insert is now allowed for `internal_staff` scope.

## 3) Company News create validation result

Validated via `npm run test:supabase:company-news:popup`:

- HQ Admin direct `company_news` create PASS.
- Popup-eligible `company_news` becomes visible to teacher list path PASS.
- Teacher `markCompanyNewsPopupSeen(...)` PASS.
- Teacher `dismissCompanyNewsPopup(...)` PASS.
- Dismissed item suppressed from eligible list PASS.
- Parent/student popup read blocked-or-empty PASS.
- Branch supervisor cross-user popup dismiss write blocked PASS.
- `read_at` / `done_status` unchanged by popup seen/dismiss PASS.
- Cleanup PASS.

## 4) Request workflow regression result

Validated via `npm run test:supabase:announcements:phase1`:

- HQ request create PASS.
- Branch supervisor own-branch request create PASS.
- Branch supervisor publish PASS.
- Teacher create blocked PASS.
- Teacher targeted published announcement visible PASS.
- Teacher read/done/undone/reply/list calls PASS.
- Parent/student internal_staff blocked-or-empty PASS.
- Cleanup PASS.
- Optional CHECK remains expected when missing fixture env:
  - `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` missing for cross-branch target negative fixture.

## 5) Safety boundaries preserved

- Teacher/parent/student remain blocked from creating announcements.
- Branch supervisor `company_news` create remains blocked for MVP.
- No parent-facing announcements/events opened.
- No `parent_facing_media` enabling.
- No service-role frontend usage.
- No notifications/emails.
- No live chat.
- Fake/dev data only in validation fixtures.

## 6) Current product state

- Runtime Company News popup display path exists.
- Popup seen/dismiss service path exists.
- HQ direct `company_news` create is now DB-allowed under `027`.
- Dedicated `createCompanyNews(...)` service wrapper is still not implemented.
- Authenticated Company News create UI remains preview-disabled.

## 7) What remains future

- `createCompanyNews(...)` service + focused smoke test.
- `publishCompanyNews(...)` wrapper if explicit type guard is desired.
- Authenticated HQ Company News create UI enablement.
- Optional edit/delete governance for Company News lifecycle.
- Parent-facing announcements/events track.
- Notification/email planning later.

## 8) Recommended next milestone

Choose:

- A. `createCompanyNews` service + smoke test
- B. Authenticated HQ Company News create UI
- C. Parent-facing announcements/events plan
- D. Notification/email planning
- E. Popup animation/template polish

Recommendation: **A first**.

Why:

- SQL/RLS now safely allows HQ `company_news` draft inserts.
- Service wrapper and smoke should prove safe create/publish behavior before UI enablement.
- Authenticated create UI should remain preview-disabled until service smoke is proven.
- Parent-facing and notification tracks remain later.

## 9) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News create SQL application

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
createCompanyNews service + smoke test only.

Hard constraints:
- Do not change app UI/runtime in this milestone.
- Do not change Supabase SQL/RLS in this milestone.
- Do not apply SQL in this milestone.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not add notifications/emails/live chat.
- Keep demoRole and demo/local fallback behavior unchanged.
- Use fake/dev fixture data only in smoke.
- Use anon client + JWT + RLS only (no service role in frontend).

Deliverables:
1) Add `createCompanyNews(...)` write service with strict validation for:
   - `announcement_type='company_news'`
   - `audience_type='internal_staff'`
   - `status='draft'`
   - `requires_response=false`
   - `requires_upload=false`
2) Keep `createAnnouncementRequest(...)` behavior unchanged.
3) Add focused smoke test covering HQ create PASS and blocked-role checks.
4) Update docs checkpoint for service + smoke outcome.

Validation rule:
- Run build/lint/typecheck + focused smoke only when service files change.
```

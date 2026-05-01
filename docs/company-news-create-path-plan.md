# Company News Create Path Plan

Date: 2026-05-01  
Scope: planning/review only for safe real HQ Company News create/publish path (no runtime/UI/service/SQL changes in this milestone)

## Checkpoint update (027 SQL draft for HQ Company News create path)

- Added manual/dev-first SQL draft: `supabase/sql/027_company_news_create_foundation.sql`.
- `027` is review-first only and is not auto-applied.
- `027` keeps existing request-first insert behavior intact.
- `027` adds a narrow insert allowance for HQ-only `company_news` rows when:
  - `audience_type = 'internal_staff'`
  - `announcement_type = 'company_news'`
  - `status = 'draft'`
  - `created_by_profile_id = auth.uid()`
  - `requires_response = false`
  - `requires_upload = false`
- Branch supervisor `company_news` create remains blocked for MVP.
- Teacher/parent/student create remains blocked.
- No select/update/delete policy broadening in this draft.
- Service/UI implementation remains future (`createCompanyNews(...)` and authenticated create form are not added in this milestone).
- No notifications/emails, no parent-facing announcements/events, and no `parent_facing_media` enabling in this patch.

## 1) Current state

- Company News UI shell exists in `src/pages/Announcements.jsx`.
- Runtime app-shell Company News popup display path exists in `src/components/layout/AppLayout.jsx`.
- Popup seen/dismiss services exist and are in use:
  - `listEligibleCompanyNewsPopups({ limit })`
  - `markCompanyNewsPopupSeen({ announcementId })`
  - `dismissCompanyNewsPopup({ announcementId })`
- Real create path for `company_news` is still blocked by request-first constraints.
- Authenticated `Create Company News` remains preview-disabled.
- Parent-facing announcements/events are not implemented.
- Notifications/emails are not implemented.

## 2) Product purpose

HQ needs a safe, explicit create/publish workflow for internal Company News so the runtime popup and Company News list can be fed by real authored content.

Company News intent:

- culture, recognition, celebration, and important updates,
- distinct from request/reminder task workflows,
- non-task default semantics (no done/undone obligation by default),
- optional popup metadata support (`popup_enabled`, `popup_emoji`) when appropriate.

## 3) Current blocker

- Existing write entry point `createAnnouncementRequest(...)` is request-first by design.
- Service hardcodes:
  - `announcement_type = 'request'`
  - `status = 'draft'`
  - `audience_type = 'internal_staff'`
  - request-style fields/intent.
- Current insert policy helper in SQL (`can_insert_announcement_row_022`) explicitly requires `row_announcement_type = 'request'` and request-draft constraints.
- Focused popup smoke still reports expected CHECK:
  - direct HQ `company_news` create is blocked under current request-first create path.
- This is safe for now but blocks production-grade Company News authoring.

## 4) Desired create behavior (MVP)

MVP ownership:

- HQ/admin only create path first.

MVP flow:

1. Create `company_news` as `draft`.
2. Update/edit draft (if added in same or follow-up slice).
3. Publish Company News.

MVP content defaults:

- `requires_upload = false` by default.
- `requires_response = false` by default.
- no done/undone obligation by default.
- no MyTasks side effect by default.
- no email/notification auto-send.
- optional `popup_enabled` and `popup_emoji`.

Targeting:

- support internal staff targeting through existing target model where safe.

## 5) Data/service options

### A) Add dedicated `createCompanyNews(...)` service (recommended)

Pros:

- clear separation from request-task semantics,
- lower risk of mixing task defaults into news behavior,
- clearer validation surface (`announcement_type='company_news'`, `audience_type='internal_staff'`).

Cons:

- needs focused SQL/RLS patch because current insert policy is request-only.

### B) Extend `createAnnouncementRequest(...)` with `announcementType` parameter

Pros:

- fewer service entry points.

Cons:

- higher coupling risk between request and news rules,
- easier to accidentally carry request obligations into news path.

### C) Create separate `company_news` table

Pros:

- strongest domain separation.

Cons:

- unnecessary migration complexity given current `announcements` model already supports type split.

### D) Admin seed/direct-only path

Pros:

- minimal engineering in short term.

Cons:

- not a real product workflow; not suitable for ongoing HQ operations.

Recommendation:

- **A first**: dedicated `createCompanyNews(...)` using existing `announcements` table plus focused SQL/RLS patch.

## 6) SQL/RLS implication review

Expected policy changes (future SQL patch, not in this milestone):

- allow HQ/admin insert of:
  - `audience_type = 'internal_staff'`
  - `announcement_type = 'company_news'`
  - `status = 'draft'`
  - `created_by_profile_id = auth.uid()`.
- keep request insert rules unchanged.
- keep teacher blocked for create.
- keep parent/student blocked.
- keep parent-facing creation out of scope.
- branch supervisor create likely blocked for MVP unless explicitly enabled later.
- no service-role frontend usage.

## 7) Publish/update behavior

Publish options:

- reuse `publishAnnouncement({ announcementId })` with added type validation guard, or
- add dedicated `publishCompanyNews({ announcementId })` if stricter type-specific checks are preferred.

MVP safety preference:

- dedicated publish wrapper (or strict validation layer) so only eligible `company_news` draft can be published via this path.

Publish outcome:

- set `status = 'published'`
- set `published_at`.

Non-goals:

- no notifications/emails side effects.
- popup eligibility remains read-side (`published + popup_enabled + visible target`).

## 8) Targeting behavior

MVP targeting guidance:

- HQ can target internal staff via existing target rows:
  - branch,
  - role,
  - profile.
- if explicit global "all staff" target is not represented, use conservative target row patterns (for example role/branch combinations) rather than widening policy shortcuts.
- avoid parent/student targets.
- avoid parent-facing scope in MVP.

## 9) UI implications (future implementation)

Authenticated HQ Company News create UI can be enabled after SQL/RLS and service readiness.

Expected fields:

- title, subtitle, body,
- category/template,
- emoji,
- `popup_enabled`, `popup_emoji`,
- priority/tone,
- targets.

Expected behavior:

- draft save then publish flow,
- preview before publish,
- supervisor/teacher view-only for MVP,
- no MyTasks side effects.

## 10) Smoke test plan (future)

Future focused smoke should validate:

- HQ create draft `company_news` PASS,
- HQ publish `company_news` PASS,
- targeted teacher read PASS,
- popup list eligibility PASS when `popup_enabled = true`,
- parent/student blocked PASS,
- teacher create blocked PASS,
- supervisor create blocked PASS for MVP (unless explicitly enabled),
- no MyTasks task creation by default,
- no notification/email side effects,
- fixture cleanup PASS.

## 11) Risks and safeguards

Risks:

- accidentally making news behave like task requests,
- popup visibility to wrong audience,
- parent/internal scope confusion,
- overuse or noisy HQ publishing,
- create policy widening too broadly,
- branch supervisor create ambiguity,
- weak edit/delete governance,
- popup enabled on rows with weak targeting/readability.

Safeguards:

- dedicated Company News create/publish service path,
- strict HQ-only create gate in MVP,
- explicit validation for `company_news + internal_staff + draft/published` lifecycle,
- preserve request-policy behavior unchanged,
- preserve parent/student block boundaries,
- focused smoke for create/publish/read/popup eligibility.

## 12) Recommended next milestone

Choose:

- A. Draft Company News create SQL/RLS patch
- B. Create Company News service + smoke first
- C. Company News create UI shell
- D. Parent-facing announcements/events plan
- E. Notification/email planning

Recommendation: **A first**.

Why:

- create path is currently blocked by policy,
- SQL/RLS must safely allow HQ-only `company_news` draft insert first,
- service smoke should follow SQL dev apply to prove correctness before UI enablement.

## 13) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add Company News create path plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Draft Company News create SQL/RLS patch only (review-first, no apply).

Hard constraints:
- SQL draft/review only; do not apply SQL in this milestone.
- Do not change app UI/runtime logic/services in this milestone.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not add notifications/emails/live chat.
- Do not use service role key in frontend.
- Preserve demoRole and demo/local fallback behavior.
- Use fake/dev data assumptions only.

Deliverables:
1) SQL/RLS draft to safely permit HQ-only internal_staff company_news draft inserts while keeping request rules unchanged.
2) Policy review notes for create/update/publish boundaries (teacher/parent/student blocked).
3) Rollout and smoke plan for create/publish path validation.
4) Documentation checkpoint update.

Validation efficiency rule:
Docs/review only.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

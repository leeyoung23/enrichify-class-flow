# Announcements + Parent Communication Final QA Checkpoint

Date: 2026-05-02  
Scope: final documentation-only QA checkpoint for the communication module vertical

## 1) Final module scope

Implemented scope now includes:

- staff internal `Announcements` request/reminder workflow
- staff internal attachments
- `MyTasks` Announcement Requests visibility
- HQ/supervisor completion overview
- Company News cards/detail shell
- runtime Company News warm popup
- authenticated HQ Company News create/publish UI
- parent-facing announcements/events separate SQL/RLS/storage model
- parent-facing announcement + media services
- ParentView read-only `Announcements & Events` UI
- staff `Parent Notices` text-only creation UI
- staff Parent Notices media upload/list/preview/release/delete-confirmation UI

## 2) Staff-facing behavior summary

- Request/reminder workflow is active in `Announcements` for internal staff audiences.
- Detail actions support read/done/undone/reply where role and RLS allow.
- Internal attachments support upload/list/signed-URL view with role-aware file-role limits.
- `MyTasks` shows read-only Announcement Requests cards using derived read service.
- Completion overview is read-only for HQ/supervisor manager visibility.
- Company News supports staff shell + runtime warm popup + HQ create/publish flow.
- Company News is excluded from MyTasks by default.

## 3) Parent-facing behavior summary

- ParentView `Announcements & Events` is read-only and parent-safe.
- Parent-facing announcement visibility remains published + targeted + linked-child scoped.
- Parent read receipt path is active and non-blocking.
- Parent media visibility is released-only and signed-URL based.
- Staff Parent Notices creation supports branch/class target paths in MVP.
- Staff Parent Notices media section supports upload/list/preview/release/delete-confirmation for manager scope.
- No parent media upload path exists in this milestone.

## 4) Role/RLS safety summary

- HQ/admin has global manage scope where intended by policy.
- Branch supervisor has own-branch manage scope where intended by policy.
- Teacher remains blocked from parent-facing create/manage in MVP; view-only in staff Parent Notices media section.
- Parent has linked-child-only parent-facing visibility.
- Unrelated branch/family visibility is blocked by model/RLS boundaries.
- Student is blocked from parent-facing management and remains blocked/empty for protected paths in MVP checks.
- Frontend remains anon client + JWT; no service-role frontend usage.
- Internal and parent-facing communication models are separated.

## 5) Media/privacy summary

- Internal attachments bucket and parent-facing media bucket are separate.
- Parent-facing media uses private `parent-announcements-media` bucket.
- Signed URLs are used for media open/preview; no public URL model.
- `released_to_parent` boundary is enforced (upload unreleased by default).
- `storage_path` is not displayed in UI flows.
- `staff_note` is not exposed in parent-facing media path.

## 6) Demo/local behavior summary

- `demoRole` behavior is preserved.
- Staff demo paths keep local fake behavior for create/status/reply/attachment/media simulation where scoped.
- Parent demo `Announcements & Events` uses local fake data only.
- Demo create/upload flows that are documented as local remain no-Supabase-call paths.
- Fake/dev data usage remains the only test/demo data posture.

## 7) Validation summary

Latest validated coverage from current and recorded checkpoints:

- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:supabase:parent-announcements` PASS
- `npm run test:supabase:parent-announcements:media` PASS
- `npm run test:supabase:announcements:phase1` PASS
- `npm run test:supabase:company-news:create` PASS
- `npm run test:supabase:company-news:popup` PASS (recorded and documented)
- `npm run test:supabase:announcements:mytasks` PASS
- `npm run test:supabase:announcements:attachments` PASS (recorded and documented)
- `npm run test:supabase:announcements:completion` PASS/recorded with environment CHECK caveats when DNS is unstable

## 8) Known CHECK/WARNING notes

- Unrelated parent credential fixture missing/invalid remains an expected CHECK skip in parent-facing smokes.
- Optional `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` missing remains expected CHECK for cross-branch negative coverage.
- npm `devdir` warning remains non-blocking in this environment.
- No unsafe access widening is observed in current smoke coverage.

## 9) Remaining communication-module gaps

- Stronger delete-governance UX for parent-facing media.
- Media replace/reorder/unrelease lifecycle workflows.
- Selected-student target selector UX for parent notices.
- Published-edit governance refinement.
- Notification/email automation remains future.
- Live chat remains optional/later.
- Production fixture/seed cleanup and hardening.
- Manual mobile QA pass is still recommended before production posture.

## 10) Mobile-first QA notes

- ParentView announcement/event cards still require focused phone-width manual checks.
- Staff Announcements detail complexity (actions, attachments, completion, company news, parent notices media) needs thumb-first review.
- Parent Notices media controls require explicit thumb-friendly validation for stacked actions and badges.
- ParentView must remain free of cramped admin controls or staff actions.
- Continue manual QA checklist at ~390px, ~768px, and ~1280px.

## 11) Recommended next major track

Recommendation: **A. AI parent report blueprint / data-source planning** first.

Why A first:

- Communication module vertical is now strong enough to pause and consolidate.
- Next risk-reducing step is defining report blueprint/data sources/approval flow before any provider wiring.
- Do not jump directly to real AI provider integration.
- Report blueprint should define:
  - attendance
  - homework completion
  - lesson progression
  - strengths
  - improvement areas
  - next recommendations
  - teacher approval boundary
  - PDF/export contract before provider decisions

## 12) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
AI parent report blueprint / data-source / approval-flow planning only.

Hard constraints:
- Docs/planning only in this milestone.
- Do not change app UI.
- Do not change runtime logic.
- Do not add services.
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Do not use real student/parent/teacher/school/curriculum/homework/payment/attendance/communication data.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat.
- Do not implement AI/report generation runtime in this milestone.

Please deliver:
1) Parent report blueprint sections and required field definitions.
2) Data-source mapping plan (attendance/homework/learning context/teacher comments).
3) Approval and release governance (draft -> teacher review -> release boundary).
4) Risk/non-goal list and phased rollout recommendation.
5) Validation/test strategy proposal for future implementation.

Validation efficiency rule:
Docs-only checkpoint.
Run:
- git diff --name-only
Do not run build/lint/typecheck/smoke suite unless runtime files change.
```

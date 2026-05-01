# Company News UI Shell Checkpoint

Date: 2026-05-01  
Scope: documentation checkpoint for Company News UI shell with demo parity only

## Checkpoint update (runtime popup shell/wiring follow-up)

- Runtime warm popup shell is now implemented in app layout shell:
  - file: `src/components/layout/AppLayout.jsx`
- Company News detail preview panel remains as in-page preview, while runtime popup now appears app-shell-wide for eligible staff.
- `Announcements` deep-link behavior now accepts popup routing context (`preferredFilter`) so popup `View` routes can land in Company News context.
- Runtime boundaries preserved in this follow-up:
  - no SQL/RLS changes,
  - no new popup services,
  - no parent-facing announcements/events,
  - no notifications/emails/live chat,
  - no real HQ Company News create path.
- Runtime validation in follow-up milestone:
  - `npm run build` PASS
  - `npm run lint` PASS
  - `npm run typecheck` PASS
  - `npm run test:supabase:company-news:popup` PASS (with expected CHECK for direct HQ create-path block)

## Checkpoint update (recommended next milestone after runtime popup)

- Recommended next milestone is now **A. Real HQ Company News create path planning**.
- Reason: runtime popup display path is working, but safe HQ creation/publish path remains constrained by current request-first create-path shape.

## Documentation-only note

- This milestone updates documentation only.
- Validation rule for this checkpoint: `git diff --name-only` only.

## 1) What was implemented

- Company News tab/shell inside Announcements is now active.
- News-style cards are rendered for Company News items.
- Company News detail shell is rendered.
- Demo fake Company News data is included.
- HQ demo local `Create Company News` shell is included.
- Warm pop-up preview panel exists in Company News detail only.
- Authenticated `Create Company News` remains disabled/preview-only.

## 2) Files changed

- `src/pages/Announcements.jsx`
- `docs/company-news-ui-shell-checkpoint.md`
- `docs/company-news-warm-popup-plan.md`
- `docs/announcements-internal-communications-plan.md`
- `docs/mobile-first-qa-checkpoint.md`
- `docs/project-master-context-handoff.md`

## 3) Company News shell behavior

- Company News filter renders real shell content (not placeholder-only).
- Cards include:
  - title
  - subtitle/body preview
  - category/template
  - emoji
  - publish-style date
  - priority/tone
  - pop-up enabled badge
  - `View detail` action
- Detail includes:
  - full content
  - category/template
  - audience label
  - emoji
  - warm pop-up preview panel
  - runtime-later note

## 4) demoRole behavior

- Fake cards include:
  - congratulations/recognition
  - important update
  - training reminder
  - holiday/closure
  - event reminder
- HQ demo can create Company News locally only.
- Supervisor/teacher demo can view but not create.
- No Supabase calls for demo Company News create.
- Existing demo request flow remains intact.

## 5) Authenticated mode behavior

- Company News tab can display real `company_news` rows if returned by existing `listAnnouncements(...)`.
- No real Company News write call was added.
- Authenticated `Create Company News` is preview-disabled with safe copy.
- Request workflow remains preserved.
- Company News detail does not run request-only detail/attachments/completion queries.

## 6) Warm pop-up preview behavior

- Preview panel exists inside Company News detail only.
- Short mock copy is shown.
- `View` and `Dismiss` preview buttons are shown.
- Not implemented:
  - app-shell pop-up trigger
  - persistence
  - frequency/repeat logic
  - backend dismissal state

## 7) Safety boundaries

- no SQL/RLS changes
- no SQL apply
- no runtime warm pop-up
- no popup persistence/dismissal backend
- no MyTasks side effects
- no parent-facing announcements/events
- no `parent_facing_media`
- no notifications/emails
- no live chat
- no service-role frontend

## 8) Validation result

- `git diff --name-only`
- `npm run build` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- announcement smoke scripts were not run because this milestone was UI shell-only with no service/SQL changes

## 9) What remains future

- runtime warm pop-up behavior in app shell
- popup frequency/dismissal persistence strategy
- optional popup-specific data-model extension review
- parent-facing announcements/events
- notification/email automation
- live chat later/optional
- reports/PDF/AI OCR later

## 10) Recommended next milestone

Choose:

- **A.** Runtime warm pop-up planning/data model review
- **B.** Runtime warm pop-up UI shell
- **C.** Parent-facing announcements/events plan
- **D.** Notification/email automation planning
- **E.** Reports/PDF/AI OCR plan

**Recommendation: A first.**

Why A first:

- Company News UI shell already exists.
- Runtime pop-up requires careful dismissal/frequency/persistence rules before implementation.
- This avoids annoying repeated pop-ups.
- Notification/email coupling should remain separate for now.
- Parent-facing announcements should follow after staff Company News runtime model is clear.

## 11) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Company News UI shell

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Company News runtime warm pop-up planning/data model review only.

Hard constraints:
- Docs/planning only.
- Do not change app UI or runtime logic in this milestone.
- Do not add services.
- Do not change Supabase SQL or RLS; do not apply SQL.
- Do not add runtime warm pop-up behavior.
- Do not add popup persistence/dismissal backend behavior.
- Do not add MyTasks side effects.
- Do not add parent-facing announcements/events.
- Do not enable parent_facing_media.
- Do not auto-send emails/notifications.
- Do not start live chat.
- Preserve demoRole/local fallback behavior.
- Use fake/dev data only.

Deliverables:
1) runtime warm pop-up trigger/frequency/dismissal strategy
2) whether existing fields are enough vs optional data-model extensions
3) non-goals and safety boundaries before runtime implementation
4) phased rollout recommendation

Validation efficiency rule:
- Docs-only checkpoint.
- Run: git diff --name-only
- Do not run build/lint/typecheck/smoke unless runtime files change.
```

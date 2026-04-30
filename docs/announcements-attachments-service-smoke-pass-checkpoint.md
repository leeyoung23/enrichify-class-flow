# Announcements Attachments Service Smoke PASS Checkpoint

Date: 2026-05-01  
Environment: Supabase dev only (fake/dev identities and fake/dev files only)

## 1) What was completed

- `025` (`supabase/sql/025_fix_announcements_attachments_select_returning_rls.sql`) was manually applied in Supabase dev.
- `npm run test:supabase:announcements:attachments` now passes attachment upload/list/signed URL main paths.
- `npm run test:supabase:announcements:phase1` still passes core Announcements Phase 1 workflow.
- Backend/service/RLS/storage boundary is now proven for Announcements attachments Phase 2 main paths.

## 2) Attachment smoke PASS result

- PASS HQ: created announcement fixture
- CHECK HQ context: role=hq_admin active=true branch=null
- CHECK HQ predicate can_insert_manage_announcement_attachment_row_024 => true
- CHECK HQ raw insert without RETURNING succeeded
- CHECK HQ diagnostic cleanup succeeded
- PASS HQ uploadAnnouncementAttachment succeeded
- PASS HQ listAnnouncementAttachments includes uploaded attachment
- PASS HQ signed URL generated
- PASS HQ no public URL path pattern detected
- PASS Supervisor created announcement fixture
- CHECK Supervisor context: role=branch_supervisor active=true branch=11111111-1111-1111-1111-111111111111
- CHECK Supervisor predicate can_insert_manage_announcement_attachment_row_024 => true
- CHECK Supervisor raw insert without RETURNING succeeded
- CHECK Supervisor diagnostic cleanup succeeded
- PASS Supervisor published announcement fixture
- PASS Supervisor uploadAnnouncementAttachment succeeded
- PASS Supervisor signed URL generated
- CHECK Teacher context: role=teacher active=true branch=11111111-1111-1111-1111-111111111111
- PASS Teacher targeted published announcement visible
- PASS Teacher response_upload succeeded
- PASS Teacher listAnnouncementAttachments succeeded
- CHECK Teacher predicate can_insert_teacher_announcement_attachment_row_024 => true
- CHECK Teacher raw insert without RETURNING succeeded
- CHECK Teacher diagnostic cleanup succeeded
- PASS Teacher hq_attachment blocked as expected
- PASS Parent list/read internal attachments blocked or empty as expected
- PASS Student list/read internal attachments blocked or empty as expected
- PASS Cleanup attachment rows removed
- PASS Cleanup announcement fixtures removed

## 3) CHECK note

- `CHECK` context/predicate/raw-insert lines are diagnostic evidence, not failing skips.
- These checks prove actor context and insert-predicate behavior under current JWT/RLS conditions.
- The only remaining optional `CHECK` is still the Phase 1 cross-branch negative fixture when `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is missing.
- No unsafe access behavior was observed.

## 4) Interpretation

- Metadata insert RLS issue is resolved by the `024` and `025` sequence.
- `INSERT ... RETURNING` SELECT-RLS issue is resolved by `025`.
- HQ can upload/list/open signed URL for internal attachment.
- Supervisor can upload/open signed URL for own-branch internal attachment.
- Teacher can upload/list `response_upload` for targeted announcement.
- Teacher cannot upload `hq_attachment`.
- Parent/student cannot read internal attachments.
- Private bucket + signed URL model works as intended.
- Cleanup path works for fake attachment rows and fixtures.

## 5) Safety boundaries (unchanged)

- No parent-facing media is enabled.
- `parent_facing_media` remains reserved only.
- No public URLs are introduced.
- No service role is used in frontend.
- No attachment UI wiring yet.
- No MyTasks integration.
- No Company News pop-up.
- No notifications/emails.
- No live chat.

## 6) What remains for future milestones

- Staff attachment UI wiring.
- MyTasks integration.
- Company News warm pop-up.
- Parent-facing announcements/events.
- Optional live chat later.
- Notification/email automation later.
- Report/PDF/AI OCR later.

## 7) Recommended next milestone

Options:

- A. Staff Announcements attachments UI wiring
- B. MyTasks integration plan
- C. Company News warm pop-up design
- D. Parent-facing announcements/events plan
- E. Report/PDF generation plan

Recommendation: **A. Staff Announcements attachments UI wiring**.

Why A first:

- SQL/RLS/storage/service path is now proven by PASS smoke evidence.
- Staff Announcements page already contains attachment placeholder direction.
- Next safe step is wiring upload/list/view for internal staff only.
- MyTasks can follow once attachment workflow is visible in staff flow.
- Company News/parent-facing/report-generation should stay in later milestones.

## 8) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements attachments smoke pass

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Staff Announcements attachments UI wiring only.

Hard constraints:
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload real files.
- Do not use real student, parent, teacher, school, curriculum, homework, photo, payment, announcement, or attendance data.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-send emails or notifications.
- Do not start live chat in this milestone.
- Do not add MyTasks integration.
- Do not add Company News pop-up.
- Do not add parent-facing announcements/events.

Validation efficiency rule:
- Run: git diff --name-only
- Do not run build/lint/smoke suite unless runtime files change.
```

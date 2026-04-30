# Announcements Phase 1 Smoke PASS Checkpoint

Checkpoint scope: documentation only for Announcements Phase 1 smoke PASS state.

## 1) What was completed

- `supabase/sql/021_announcements_phase1_fake_fixture_activation.sql` was manually applied in Supabase dev.
- `supabase/sql/022_fix_announcements_insert_rls.sql` was manually applied in Supabase dev.
- Core Announcements Phase 1 smoke now passes.
- Backend service/RLS boundary is now proven for main HQ/supervisor/teacher/parent/student paths.

## 2) Smoke PASS result

- PASS HQ Admin: create announcement request succeeded
- PASS Branch Supervisor: create own-branch announcement request succeeded
- PASS Branch Supervisor: publish announcement succeeded
- PASS Teacher: create announcement blocked as expected
- PASS Branch Supervisor: targeted teacher profile fixture created
- PASS Teacher: targeted published announcement is visible
- PASS Teacher: mark announcement read succeeded
- PASS Teacher: update done_status=done succeeded
- PASS Teacher: update done_status=undone succeeded
- PASS Teacher: structured reply insert as self succeeded
- PASS Teacher: list statuses call succeeded
- PASS Teacher: list replies call succeeded
- PASS Teacher: list targets call succeeded under current RLS
- PASS Parent: internal_staff announcement read blocked/empty as expected
- PASS Student: internal_staff announcement read blocked/empty as expected
- PASS No attachment/public URL behavior was exercised
- PASS Cleanup removed fake announcements

## 3) CHECK note

- Cross-branch target-write negative check remains CHECK-skipped because `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID` is not configured.
- This is optional fixture coverage only.
- Main create/read/status/reply flow is proven.
- No unsafe access behavior was observed in the proven paths.

## 4) Interpretation

- Inactive fake staff fixture issue is resolved by manual `021` apply.
- Create-path RLS insert/select issue is resolved by manual `022` apply.
- HQ can create request announcements.
- Branch supervisor can create/publish own-branch request announcements.
- Teacher cannot create announcements but can read targeted published announcements.
- Teacher can mark read/done/undone and can add structured replies as self.
- Parent/student cannot read `internal_staff` announcements.
- Cleanup path works for fake announcement rows created during smoke.

## 5) Safety boundaries

- No parent-facing announcements access in Phase 1.
- No attachments in this milestone.
- No public URL behavior in this milestone.
- No auto emails/notifications.
- No live chat.
- No frontend service-role usage.
- No app UI/runtime changes in this checkpoint.

## 6) What remains future

- Staff Announcements UI shell with demo parity.
- Real Announcements UI wiring.
- Attachments.
- MyTasks integration.
- Company News pop-up.
- Parent-facing announcements/events.
- Optional live chat much later.
- Optional cross-branch negative fixture coverage via `ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID`.

## 7) Recommended next milestone

Options:

- A. Staff Announcements UI shell with demo parity
- B. Real Announcements UI wiring
- C. Attachments SQL/RLS
- D. MyTasks integration plan
- E. Company News pop-up design

Recommendation: **A. Staff Announcements UI shell with demo parity**.

Why A first:

- Backend/service/RLS core path is now proven.
- UI shell can be shaped safely without real-write wiring first.
- Demo parity helps validate product flow before real UI wiring.
- Attachments/MyTasks/Company News should remain later milestones.

## 8) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Document Announcements Phase 1 smoke pass

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Staff Announcements UI shell with demo parity only.

Hard constraints:
- Do not change Supabase SQL.
- Do not change RLS policies.
- Do not apply SQL.
- Do not add attachments in this milestone.
- Do not add MyTasks integration in this milestone.
- Do not add Company News pop-up in this milestone.
- Do not add parent-facing announcements in this milestone.
- Do not start live chat.
- Do not auto-send emails/notifications.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not upload files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.

Deliverables:
1) Staff `Announcements` tab UI shell with demo parity only.
2) No real-write wiring yet; keep runtime behavior safe/minimal.
3) Preserve current backend boundaries proven by smoke.
4) Update docs checkpoint for UI-shell-only milestone.

Validation efficiency rule:
Run only what matches changed files.
If runtime/UI files change, run build/lint/typecheck only as needed.
```

## 9) Validation efficiency rule

Docs-only change.

Run:

- `git diff --name-only`

Do not run build/lint/smoke suite unless runtime files change.

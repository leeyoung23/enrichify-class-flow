# RLS Test Checklist

This checklist is for future Supabase role testing using fake/demo data only.

Reminder: **Frontend filtering is not security. RLS must enforce access at database level.**

---

## HQ Admin

- Dashboard access works.
- Direct restricted URL checks still allow HQ-only routes.
- Can view all branches.
- Can view all students.
- Attendance visibility is global; edit rights match policy.
- Homework visibility is global; edit rights match policy.
- Parent comments visibility includes all statuses by policy.
- Weekly report visibility includes all statuses by policy.
- Fee records visibility is global.
- Payment receipt screenshot metadata and files are visible for all branches under admin scope.
- Can verify receipts across all branches.
- Teacher tasks visibility is global.
- Sales Kit resources can be created/updated/approved/archived by HQ only.
- Storage access is restricted to allowed admin scope.
- Negative test: HQ token should still fail for deleted/disabled account state.

## Branch Supervisor

- Dashboard access works.
- Direct restricted URL checks pass only for allowed branch-supervisor routes.
- Branch visibility limited to own branch.
- Student visibility limited to own branch students.
- Attendance visibility/edit limited to own branch.
- Homework visibility/edit limited to own branch.
- Parent comments visibility/release rights match branch scope policy.
- Weekly report visibility/release rights match branch scope policy.
- Fee records visibility limited to own branch.
- Payment receipt screenshot metadata and files limited to own branch.
- Can verify receipts for own branch only.
- Teacher tasks visibility limited to own branch tasks.
- Sales Kit resources visibility limited to approved items by policy.
- Storage access limited to own branch files/prefixes.
- Negative test: branch supervisor must not read another branch data by direct SQL/API call.

## Teacher

- Dashboard access works.
- Direct restricted URL checks block admin/supervisor-only routes.
- Branch visibility limited to assigned branch context only.
- Student visibility limited to assigned class students.
- Attendance visibility/edit limited to assigned classes.
- Homework visibility/edit limited to assigned classes.
- Parent comments visibility for assigned students; release rights by policy only.
- Weekly report visibility for assigned students; release rights by policy only.
- Fee records visibility should be blocked unless explicitly allowed.
- Payment receipt metadata/file access must be blocked.
- Teacher tasks visibility limited to own assignments.
- Sales Kit visibility must be blocked.
- Storage access limited to assigned class/student files by policy.
- Negative test: teacher cannot query records for unassigned class/student.

## Parent

- Parent dashboard access works.
- Direct restricted URL checks block internal management pages.
- Branch visibility only through linked child context.
- Student visibility only linked child.
- Attendance visibility linked child only; no edit rights.
- Homework visibility linked child only; no edit rights.
- Parent comments visibility only approved/released linked-child items.
- Weekly report visibility only approved/released linked-child items.
- Fee records visibility limited to linked child records where policy allows.
- Payment receipt status visibility limited to linked child records where policy allows.
- Teacher tasks visibility blocked.
- Sales Kit visibility blocked.
- Storage access limited to linked child files where policy allows.
- Negative test: parent cannot query another child via modified URL/ID.

## Student

- Student portal access works.
- Direct restricted URL checks block internal management pages.
- Branch visibility only self context.
- Student visibility self only.
- Attendance visibility self only; no edit rights.
- Homework visibility self only; no edit rights.
- Parent comments visibility approved/released self-only items if policy allows.
- Weekly report visibility approved/released self-only items if policy allows.
- Fee records visibility blocked unless product explicitly allows.
- Payment receipt metadata/file access blocked.
- Teacher tasks visibility blocked.
- Sales Kit visibility blocked.
- Storage access limited to self files where policy allows.
- Negative test: student cannot read sibling/peer data by changing IDs in requests.

---

## Cross-role Blocking Tests

- Teacher must not read branch-supervisor-only sales/lead/fee admin datasets.
- Teacher must not access fee receipt uploads or receipt verification fields.
- Parent must not read teacher draft comments or unapproved weekly reports.
- Student must not read parent-only contact details.
- Branch supervisor must not read HQ-global rows outside own branch.
- Branch supervisor must not access unapproved Sales Kit resources.
- Branch supervisor must not access archived Sales Kit resources.
- Any role must fail reads/writes when JWT role is mismatched to row scope.

## Storage Policy Checks

- Test upload: allowed role + allowed path succeeds.
- Test upload: allowed role + disallowed path fails.
- Test read: linked/assigned file succeeds.
- Test read: unlinked/unassigned file fails.
- Test delete/update metadata: only authorized roles succeed.
- Test `fee-receipts` bucket: parent upload own linked-child receipt succeeds; teacher upload/read fails.
- Test `sales-kit-resources` bucket: HQ upload/manage/archive succeeds; branch supervisor read approved succeeds; draft/archived read fails.

### Fee receipt draft patch note

- Draft patch reference: `supabase/sql/009_fee_receipt_upload_policies.sql` (manual review/apply only).
- Parent receipt upload path is being prepared via policy draft.
- Service method and UI upload flow are still not implemented.
- Continue using fake test files/data only during policy validation.

## Execution Notes

- Run tests with fake users for each role.
- Validate both UI behavior and direct API/database query behavior.
- Record pass/fail evidence before enabling real data onboarding.

## School/Curriculum + AI Foundation (007) Checks

When `supabase/sql/007_school_curriculum_ai_foundation.sql` is manually applied, validate the following (manually and/or via `npm run test:supabase:read`, which performs **read-only count** checks per fake role for `schools`, `student_school_profiles`, and the other 007 foundation tables after **008** seed data exists):

- `schools` and `student_school_profiles` RLS (HQ full; branch supervisor own-branch scope via linked students; teacher assigned students only; parent/student linked self only).
- `curriculum_mappings` and `learning_objectives` staff visibility (teacher + branch supervisor read; **writes HQ-only** per `007` draft).
- `student_subject_enrolments` multi-subject visibility by linked/assigned student.
- `student_learning_profiles` internal staff-only fields (parent/student blocked unless later policy changes).
- `homework_marking_results` parent/student read only when `teacher_approved = true`.
- `ai_generation_requests` and `ai_feedback_tags` staff-only access.
- `ai_generation_outputs` parent/student access only for approved/released rows linked to own child/self.

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
- Parent safe-field update guard is enforced in draft via DB trigger for `fee_records`.
- Service method and UI upload flow are still not implemented.
- Continue using fake test files/data only during policy validation.

### Staff Time Clock draft patch note

- Draft patch reference: `supabase/sql/010_staff_time_clock_foundation.sql` (manual review/apply only).
- Draft includes branch geofence columns, `staff_time_entries`, optional adjustment requests, and private `staff-clock-selfies` policy draft.
- Manual dev-project application checkpoint recorded at `docs/staff-time-clock-sql-application-checkpoint.md`.
- Service + smoke references:
  - `src/services/staffTimeClockService.js`
  - `scripts/supabase-staff-time-clock-smoke-test.mjs`
  - `npm run test:supabase:staff-time-clock`
- Review-read service + smoke references:
  - `listStaffTimeEntries(...)`
  - `getStaffTimeEntryById(...)`
  - `getStaffTimeSummary(...)`
  - `scripts/supabase-staff-time-clock-review-smoke-test.mjs`
  - `npm run test:supabase:staff-time-clock:review`
- Dashboard UI and review action writes are still not implemented.
- Continue using fake users and fake selfie blobs only for future validation.

#### Staff Time Clock role checks (after manual apply in dev only)

- HQ can read/review all staff time entries and related selfie objects.
- Branch supervisor can read/review own-branch entries and selfies only.
- Staff can insert/select own entries only.
- Staff can close own open entry (clock-out update path) but cannot rewrite clock-in evidence.
- Staff can submit own adjustment request only for own entry.
- Parent/student must have zero access to staff time entries and staff-clock-selfies.

### Class Memories draft patch note

- Draft patch reference: `supabase/sql/011_class_memories_foundation.sql` (manual review/apply only).
- Adds draft `class_memories` table + private `class-memories` bucket policy set.
- Manual dev-project application checkpoint recorded at `docs/class-memories-sql-application-checkpoint.md`.
- Intended lifecycle in draft: `draft -> submitted -> approved + visible_to_parents=true`; plus `rejected` and `hidden`.
- Upload order in draft is metadata-first:
  1. create `class_memories` draft row with intended `storage_path`
  2. upload object to private bucket
  3. update submit/review status
- Service + smoke references:
  - `src/services/supabaseUploadService.js` (`uploadClassMemory`, `getClassMemorySignedUrl`, `listClassMemories`, `getClassMemoryById`)
  - `scripts/supabase-class-memories-upload-smoke-test.mjs`
  - `npm run test:supabase:class-memories:upload`
- Approval write + smoke references:
  - `src/services/supabaseWriteService.js` (`approveClassMemory`, `rejectClassMemory`, `hideClassMemory`)
  - `scripts/supabase-class-memories-approval-smoke-test.mjs`
  - `npm run test:supabase:class-memories:approval`
- Teacher/parent Memories UI surfaces are still not wired.
- Continue using fake users and fake media blobs only (no real photos/videos).

#### Class Memories role checks (after manual apply in dev only)

- HQ can read/manage all class memories and storage objects.
- Branch supervisor can read/manage own-branch memories and objects only.
- Teacher can create/read/update own assigned-class memories in allowed draft states only.
- Teacher cannot access unrelated branch/class memory rows.
- Parent can read approved + visible memories only for linked child/class scope.
- Student (optional) can read approved + visible own-linked scope only.
- Parent/student cannot insert/update/delete memory rows.
- Parent/student cannot upload/update/delete storage objects in `class-memories`.
- No public object access is allowed for `class-memories`.

### School/Curriculum onboarding draft patch note

- Draft patch reference: `supabase/sql/012_school_curriculum_foundation.sql` (manual review/apply only).
- Fake seed reference: `supabase/sql/013_school_curriculum_fake_seed_data.sql` (manual/dev-only; fake data only).
- Draft scope (lean MVP):
  - normalizes/extends `schools`
  - normalizes/extends `student_school_profiles`
  - adds `curriculum_profiles`
  - adds `class_curriculum_assignments`
  - adds `learning_goals`
- Draft enables RLS on onboarding tables with role intent:
  - HQ full read/manage
  - branch supervisor own-branch manage (with student/class branch inference where needed)
  - teacher read-only class/student scoped curriculum context
  - parent/student read-only linked child/self context
  - parent/student no template/manage writes
- Draft status:
  - manually applied in dev
  - read service + read smoke test now added
  - fake seed `013` is manually applied in dev (Success / No rows returned)
  - no UI wiring yet
  - no AI integration yet
  - continue fake-data-only role checks before any UI/runtime wiring
- Manual application checkpoint:
  - `docs/school-curriculum-sql-application-checkpoint.md`
- Fake seed application checkpoint:
  - `docs/school-curriculum-fake-seed-application-checkpoint.md`
- Read smoke references:
  - `src/services/supabaseReadService.js`
  - `scripts/supabase-school-curriculum-read-smoke-test.mjs`
  - `npm run test:supabase:school-curriculum:read`
- Write smoke references (class assignment only, no UI wiring):
  - `src/services/supabaseWriteService.js`
  - `scripts/supabase-school-curriculum-write-smoke-test.mjs`
  - `npm run test:supabase:school-curriculum:write`
- Write smoke references (student school profile service only, no UI wiring):
  - `src/services/supabaseWriteService.js`
  - `scripts/supabase-school-profile-write-smoke-test.mjs`
  - `npm run test:supabase:school-profile:write`
- Current write scope:
  - class curriculum assignment write service is implemented
  - student school profile write service is implemented
  - `Classes` assignment/edit UI is implemented
  - `Students` school profile edit UI remains future
  - AI context integration remains future
- Continue fake/dev-only role checks and fake data only.

#### School/Curriculum role checks (after manual apply in dev only)

- HQ can read/manage all onboarding tables across branches.
- Branch supervisor can read/manage own-branch school/curriculum rows and inferred own-branch student/class rows.
- Teacher can read assigned class/student curriculum context only.
- Parent can read linked-child school profile/goal context only.
- Student can read own linked profile/goal context only (if product surfaces it).
- Parent/student cannot insert/update/delete schools or curriculum template rows.
- Teacher cannot modify school/curriculum template rows in this MVP draft.
- Parent/student cannot write class curriculum assignments.
- Teacher class curriculum assignment writes are blocked in MVP policy shape.
- Branch supervisor class curriculum assignment write should succeed in own-branch scope.
- Parent/student cannot write student school profiles.
- Teacher student school profile writes are blocked in MVP policy shape.
- Branch supervisor student school profile write should succeed in own-branch scope.

### Homework upload/review foundation draft patch note

- Draft patch reference: `supabase/sql/014_homework_upload_review_foundation.sql` (manual review/apply only).
- Draft adds lean MVP tables:
  - `homework_tasks`
  - `homework_submissions`
  - `homework_files`
  - `homework_feedback`
- Draft adds private storage bucket and object policies for `homework-submissions`.
- Draft status:
  - manual/dev-first SQL draft prepared
  - manually applied in dev
  - runtime service + upload helpers now started in `src/services/supabaseUploadService.js`
  - fake upload smoke script now added: `scripts/supabase-homework-upload-smoke-test.mjs`
  - package command: `npm run test:supabase:homework:upload`
  - feedback write service methods now added in `src/services/supabaseWriteService.js`
  - feedback smoke script now added: `scripts/supabase-homework-feedback-smoke-test.mjs`
  - package command: `npm run test:supabase:homework:feedback`
  - smoke found `homework_files` insert RLS blocker in dev and `015` helper patch has been manually applied
  - parent direct submission insert recursion fix `016` has now been manually applied in dev
  - smoke auth/session order issue was fixed in script so parent upload runs with active parent JWT session
  - feedback smoke validates parent draft-hidden and released-visible behavior
  - parent-visible feedback response omits `internal_note` in service layer read path
  - no homework upload/review UI wiring yet
  - AI homework feedback remains future
- Parent/student feedback visibility rule in draft:
  - only `released_to_parent` feedback is readable to parent/student
  - draft/internal feedback must stay staff-only
- Submission update rule in draft:
  - parent/student can insert own/linked submissions in scope
  - submission updates are staff-only (prevents parent/student edits to review fields)
- Path convention rule in draft:
  - helper validation enforces `{branch_id}/{class_id}/{student_id}/{homework_task_id}/{submission_id}-{safe_filename}`
  - storage/object access requires metadata + path match
- Continue fake/dev-only role checks and fake file blobs only.

#### Homework upload/review role checks (after manual apply in dev only)

- HQ can read/manage all homework tasks, submissions, files, and feedback.
- Branch supervisor can read/manage own-branch homework records and objects only.
- Teacher can read assigned-class homework records only; no out-of-class visibility.
- Teacher feedback is draft-first and release-gated by status.
- Parent can read linked-child homework tasks/submissions/files only.
- Parent can create linked-child submissions/files only for assigned/open tasks.
- Parent cannot read draft/internal feedback; only released feedback.
- Student (if enabled) can read/create own submissions/files only; no peer visibility.
- No cross-family visibility and no cross-student visibility are allowed.

### Homework flexible assignment draft patch note

- Draft patch reference: `supabase/sql/017_homework_task_assignees_foundation.sql` (manual review/apply only).
- Draft status:
  - manually applied in Supabase dev (SQL Editor success)
  - application checkpoint: `docs/homework-task-assignees-sql-application-checkpoint.md`
  - fake/dev data validation only
  - write-service MVP now added in `src/services/supabaseWriteService.js`:
    - `createHomeworkTaskWithAssignees(...)`
    - `assignHomeworkTaskToStudents(...)`
  - write smoke test:
    - `scripts/supabase-homework-assignment-write-smoke-test.mjs`
    - `npm run test:supabase:homework:assignment:write`
  - runtime assignment-creation UI remains future
- Draft scope:
  - additive `homework_tasks.assignment_scope`
  - new `homework_task_assignees` with unique (`homework_task_id`, `student_id`)
  - helper functions for assignee/task-assignment access checks
  - assignee-aware read service methods:
    - `listHomeworkTaskAssignees(...)`
    - `listAssignedHomeworkForStudent(...)`
  - tracker read service methods:
    - `listHomeworkTrackerByClass(...)`
    - `listHomeworkTrackerByStudent(...)`
  - RLS for assignee rows: HQ full, branch supervisor own branch, teacher assigned class, parent linked child read-only, student self read-only
  - narrow `homework_submissions` insert gate patch to require assignment validity
  - smoke test:
    - `scripts/supabase-homework-assignees-read-smoke-test.mjs`
    - `npm run test:supabase:homework:assignees:read`
    - `scripts/supabase-homework-tracker-read-smoke-test.mjs`
    - `npm run test:supabase:homework:tracker:read`
- Manual review focus:
  - teacher manage policy conservatism for assignment creation/updates
  - parent/student cannot manage assignee rows
  - no cross-family assignee visibility
  - assignment-aware submission insert should not regress class-scope uploads
  - assignee row alignment guard should reject task/class/branch/student mismatch writes

### Homework marked-file role/release draft patch note

- Draft patch reference: `supabase/sql/018_homework_file_roles_release_foundation.sql` (manual review/apply only).
- Draft adds additive `homework_files` fields:
  - `file_role`
  - `released_to_parent`
  - `released_at`
  - `released_by_profile_id`
  - `marked_by_profile_id`
  - `staff_note`
- Draft role values:
  - `parent_uploaded_homework`
  - `teacher_marked_homework`
  - `feedback_attachment`
- Draft RLS intent:
  - staff can read review files in scope before release
  - parent/student can read marked/feedback files only when `released_to_parent = true`
  - parent/student cannot create `teacher_marked_homework` or `feedback_attachment`
  - parent/student cannot set release metadata
- Draft storage intent:
  - private `homework-submissions` bucket remains
  - object read gate mirrors metadata role/release gate
  - metadata-first upload flow remains required
- Draft status:
  - manually applied in Supabase dev (SQL Editor success)
  - application checkpoint: `docs/homework-file-role-release-sql-application-checkpoint.md`
  - fake/dev data validation only
  - teacher marked-file upload service/UI remains future
  - parent marked-file display remains future

#### Homework marked-file role checks (after manual apply in dev only)

- HQ can read/manage all homework files and release metadata.
- Branch supervisor can read/manage own-branch homework files and release metadata.
- Teacher can read/upload in assigned class scope; teacher release/edit authority remains intentionally conservative until product confirms release ownership.
- Parent can read linked-child `parent_uploaded_homework` rows and released marked/feedback rows only.
- Student can read self `parent_uploaded_homework` rows and released marked/feedback rows only.
- Parent/student cannot insert `teacher_marked_homework` or `feedback_attachment`.
- Parent/student cannot set `released_to_parent`, `released_at`, or `released_by_profile_id`.
- No cross-family visibility for metadata or storage object reads.

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

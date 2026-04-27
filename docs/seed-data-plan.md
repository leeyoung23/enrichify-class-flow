# Seed Data Plan

This is a fake/demo Supabase seed data plan for testing only.

Do not use real student, parent, teacher, school, phone, email, fee, payment, homework, or upload data.

Each group below includes:

- purpose
- minimum fake records
- relationships
- roles that should see it
- one negative test case

## 1) branches

- **Purpose:** branch-level scope control.
- **Minimum fake records:** 2 (`branch_north_demo`, `branch_south_demo`).
- **Relationships:** parent entity for classes, staff, students, tasks, leads, trials, fees, observations.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher indirect via assigned classes.
- **Negative test:** North supervisor must not read South branch records.

## 2) profiles/users

- **Purpose:** role identity and profile loading.
- **Minimum fake records:** 6 (HQ, 1 branch supervisor, 1 teacher, 1 parent, 1 student, 1 additional cross-branch staff).
- **Relationships:** links to role-specific tables (`teachers`, `guardians`, student-linked profile model).
- **Roles that should see it:** self profile for all; HQ broader read as policy allows.
- **Negative test:** Parent must not browse unrelated staff profiles.

## 3) teachers

- **Purpose:** teacher extension and branch identity.
- **Minimum fake records:** 2 (one per branch).
- **Relationships:** links to `profiles`, `teacher_class_assignments`, `teacher_tasks`.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher self.
- **Negative test:** Teacher in North cannot read South teacher staff record.

## 4) classes

- **Purpose:** class ownership and branch-class mapping.
- **Minimum fake records:** 3 (2 North, 1 South).
- **Relationships:** `students`, `teacher_class_assignments`, `attendance_records`, `homework_records`.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned classes; Parent/Student limited linked context.
- **Negative test:** Teacher assigned to class A cannot read class C from another branch.

## 5) students

- **Purpose:** learner visibility by assignment/link.
- **Minimum fake records:** 4.
- **Relationships:** `guardians`, `guardian_student_links`, attendance, homework, reports, fees, observations, school profiles.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned classes; Parent linked child; Student self.
- **Negative test:** Parent linked to Student 1 cannot read Student 2.

## 6) guardians

- **Purpose:** parent-side identity.
- **Minimum fake records:** 2.
- **Relationships:** `profiles`, `guardian_student_links`.
- **Roles that should see it:** parent self; HQ broad; branch scoped access where policy allows.
- **Negative test:** Teacher cannot browse full guardian table.

## 7) guardian_student_links

- **Purpose:** enforce parent-child access.
- **Minimum fake records:** 2 links.
- **Relationships:** join guardians to students.
- **Roles that should see it:** HQ all; Branch Supervisor branch-scoped; Parent own links.
- **Negative test:** Parent A must not read Parent B links.

## 8) teacher_class_assignments

- **Purpose:** enforce teacher class scope.
- **Minimum fake records:** 3 assignments.
- **Relationships:** links teachers to classes; drives attendance/homework/report visibility.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher own assignments.
- **Negative test:** Teacher without assignment cannot query target class assignment row.

## 9) attendance_records

- **Purpose:** session attendance and role-based read/edit checks.
- **Minimum fake records:** at least 6 (mixed statuses).
- **Relationships:** references student, class, branch, teacher.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned classes; Parent/Student linked/self.
- **Negative test:** Branch supervisor from other branch cannot read/edit record.

## 10) homework_records

- **Purpose:** homework completion tracking.
- **Minimum fake records:** 6 (completed/incomplete/not_submitted mix).
- **Relationships:** references student, class, branch, teacher, optional due info.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned classes; Parent/Student linked/self.
- **Negative test:** Teacher not assigned to class cannot update homework status.

## 11) homework_attachments

- **Purpose:** metadata for uploaded homework files.
- **Minimum fake records:** 4 metadata rows.
- **Relationships:** references student, class, branch, homework record, storage path.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned classes; Parent/Student linked/self where allowed.
- **Negative test:** Student cannot access another student's attachment metadata or file.

## 12) parent_comments

- **Purpose:** quick parent comment workflow after class.
- **Minimum fake records:** 4 (draft/edited/approved/released mix).
- **Relationships:** references student, class, branch, teacher, status fields.
- **Roles that should see it:** Teacher assigned students; Branch Supervisor/HQ review scope; Parent/Student approved-released only.
- **Negative test:** Parent must not read draft/unapproved comment rows.

## 13) weekly_progress_reports

- **Purpose:** fixed weekly report lifecycle.
- **Minimum fake records:** 3 (draft, ready-for-review, released).
- **Relationships:** references student, class, branch, teacher, week range, status.
- **Roles that should see it:** Teacher assigned students; Branch Supervisor/HQ review scope; Parent/Student approved-released only.
- **Negative test:** Teacher outside assignment cannot approve or release report.

## 14) teacher_tasks

- **Purpose:** branch/HQ task management.
- **Minimum fake records:** 5 tasks (open, in-progress, done).
- **Relationships:** references branch/class/student context; parent table for assignments/attachments.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned tasks only.
- **Negative test:** Teacher must not see unassigned task details.

## 15) teacher_task_assignments

- **Purpose:** assignee-level task status.
- **Minimum fake records:** 5 assignment rows.
- **Relationships:** joins `teacher_tasks` to teacher profile/user.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher own assignments.
- **Negative test:** Teacher A cannot update Teacher B assignment row.

## 16) task_attachments

- **Purpose:** file metadata for task evidence/resources.
- **Minimum fake records:** 3 metadata rows.
- **Relationships:** references task, assignment, branch, storage path.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; assigned teacher.
- **Negative test:** Unassigned teacher cannot read attachment row or file.

## 17) fee_records

- **Purpose:** internal fee tracking tests.
- **Minimum fake records:** 4 (paid/unpaid/pending/overdue).
- **Relationships:** references student, class, branch, plus fake receipt metadata (`receipt_file_path`, `uploaded_by`, `uploaded_at`, `verified_by`, `verified_at`, `verification_status`, `internal_note`).
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Parent limited linked-child view if product policy allows.
- **Negative test:** Teacher cannot read fee amount/payment method/internal note fields.

## 18) fee_receipt_storage_metadata (within `fee_records` or linked receipt rows)

- **Purpose:** test payment screenshot/receipt verification flow with storage-linked metadata.
- **Minimum fake records:** 3 (uploaded, verified, rejected/needs-review examples).
- **Relationships:** linked to `fee_records`, `students`, `branches`, and future `fee-receipts` storage bucket object paths.
- **Roles that should see it:** HQ all branches; Branch Supervisor own branch; Parent own linked-child status summary only.
- **Negative test:** Teacher must not read receipt metadata rows or file paths.
## 19) observations

- **Purpose:** teaching observation workflow.
- **Minimum fake records:** 3 (draft/follow-up/completed).
- **Relationships:** references branch, class, teacher, observer profile.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher only allowed completed/self-visible subset.
- **Negative test:** Teacher cannot read supervisor draft observation.

## 20) leads

- **Purpose:** sales/enrolment pipeline test data.
- **Minimum fake records:** 4 (new/contacted/trial/enrolled mix).
- **Relationships:** references branch, interested program, owner.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher limited context only if explicitly assigned.
- **Negative test:** South supervisor cannot read North lead notes.

## 21) trial_schedules

- **Purpose:** trial scheduling and conversion workflow.
- **Minimum fake records:** 4 (scheduled/attended/cancelled mix).
- **Relationships:** references lead, class, branch, assigned teacher.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned trials only.
- **Negative test:** Teacher cannot read full branch trial board outside assignment.

## 22) schools

- **Purpose:** school reference catalog for student context.
- **Minimum fake records:** 3 fake schools.
- **Relationships:** parent for `student_school_profiles`.
- **Roles that should see it:** HQ and branch staff catalog access; linked context for teacher/parent/student.
- **Negative test:** Parent cannot infer other students by school-level browsing.

## 23) student_school_profiles

- **Purpose:** student-specific school and curriculum mapping.
- **Minimum fake records:** 4 profiles.
- **Relationships:** references student and school; includes pathway/grade fields.
- **Roles that should see it:** HQ all; Branch Supervisor own branch; Teacher assigned students; Parent linked child; Student self.
- **Negative test:** Teacher cannot read school profile for unassigned student.

## 24) sales_kit_resources

- **Purpose:** test HQ-managed Sales Kit resource lifecycle (upload/approve/publish) and branch supervisor consumption.
- **Minimum fake records:** 4 (draft, approved-global, approved-branch, archived).
- **Relationships:** links to uploader/approver profiles, optional branch scope, and future `sales-kit-resources` storage object path.
- **Roles that should see it:** HQ full manage; Branch Supervisor read approved only; Teacher/Parent/Student blocked.
- **Negative test:** Branch Supervisor cannot read draft/unapproved resource; Teacher cannot read any Sales Kit record.

## Final seed rule

Seed data must stay fake, resettable, and privacy-safe. No real data should be entered until RLS role tests are complete and approved.

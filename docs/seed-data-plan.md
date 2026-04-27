# Seed Data Plan

This plan defines fake Supabase seed data for future Young's Learners backend testing. It is documentation only. Do not use real branch, student, parent, teacher, school, phone, email, fee, payment, homework, or upload data.

Seed data should prove that every role sees only the records it should see. Each group below includes a minimum dataset, relationships, expected visibility, and a negative test.

## 1. Branches

Purpose: test branch scoping and HQ-wide visibility.

Minimum fake records:

- `branch_north`: North Demo Learning Centre
- `branch_south`: South Demo Study Centre

Relationships:

- Classes, students, teachers, fees, observations, leads, and trials should reference one of these branches.

Expected visibility:

- HQ Admin sees both branches.
- North Branch Supervisor sees only `branch_north`.
- South Branch Supervisor sees only `branch_south`.
- Teachers see branch context for assigned classes only.

Negative test:

- North Branch Supervisor must not see South branch records.

## 2. Profiles/users

Purpose: test role-based login and profile loading.

Minimum fake records:

- 1 HQ Admin: `demo.hq@example.test`
- 2 Branch Supervisors: `demo.north.supervisor@example.test`, `demo.south.supervisor@example.test`
- 2 Teachers: `demo.teacher.one@example.test`, `demo.teacher.two@example.test`
- 2 Parents: `demo.parent.one@example.test`, `demo.parent.two@example.test`
- 2 Students: `demo.student.one@example.test`, `demo.student.two@example.test`

Relationships:

- Staff profiles reference branches where relevant.
- Parent profiles link through `guardians`.
- Student profiles link to one student record or a future student-auth linking model.

Expected visibility:

- Users can read their own profile.
- HQ Admin can read all.
- Branch Supervisor can read staff in own branch.

Negative test:

- Parent must not browse staff profiles.

## 3. Teachers

Purpose: test staff profile extension and teacher assignment.

Minimum fake records:

- Teacher One in North branch.
- Teacher Two in South branch.

Relationships:

- Each teacher links to a `profiles` row.
- Each teacher links to classes through `teacher_class_assignments`.

Expected visibility:

- HQ Admin sees all teachers.
- Branch Supervisor sees teachers in own branch.
- Teacher sees own teacher record.

Negative test:

- Teacher One must not see Teacher Two's private staff profile.

## 4. Classes

Purpose: test class access and assignment.

Minimum fake records:

- North English A
- North Maths B
- South Science C

Relationships:

- Each class references a branch.
- Teacher assignments reference classes.
- Students reference classes.

Expected visibility:

- HQ Admin sees all.
- Branch Supervisor sees own branch classes.
- Teacher sees assigned classes.
- Parent/student see limited class summary for linked/self student.

Negative test:

- Teacher assigned to North English A must not see South Science C.

## 5. Students

Purpose: test learner access by branch, class, parent link, and self access.

Minimum fake records:

- Demo Student One in North English A.
- Demo Student Two in North Maths B.
- Demo Student Three in South Science C.

Relationships:

- Each student references branch and class.
- Students link to guardians, attendance, homework, reports, fees, observations where applicable.

Expected visibility:

- HQ Admin sees all.
- Branch Supervisor sees own branch students.
- Teacher sees assigned class students.
- Parent sees linked children only.
- Student sees own record only.

Negative test:

- Parent One must not see Demo Student Two or Three unless explicitly linked.

## 6. Guardians

Purpose: test parent profile extension.

Minimum fake records:

- Guardian One linked to Parent One profile.
- Guardian Two linked to Parent Two profile.

Relationships:

- Each guardian links to a profile.
- Guardian links to students through `guardian_student_links`.

Expected visibility:

- Parent sees own guardian record.
- HQ Admin can manage all.
- Branch Supervisor sees guardians for own branch students if needed.

Negative test:

- Teacher should not browse guardian records unless a specific workflow exposes limited parent contact data.

## 7. Guardian student links

Purpose: enforce parent-child access.

Minimum fake records:

- Guardian One -> Demo Student One.
- Guardian Two -> Demo Student Three.

Relationships:

- Joins guardians to students.

Expected visibility:

- Parent sees only active links for their own guardian profile.
- HQ Admin sees all.
- Branch Supervisor sees links for own branch students.

Negative test:

- Guardian One must not read Demo Student Three reports or homework.

## 8. Teacher class assignments

Purpose: enforce teacher access.

Minimum fake records:

- Teacher One -> North English A.
- Teacher One -> North Maths B.
- Teacher Two -> South Science C.

Relationships:

- Joins teachers to classes.
- Drives access to students, attendance, homework, reports, and tasks.

Expected visibility:

- Teacher sees own assignments.
- Branch Supervisor sees branch assignments.
- HQ Admin sees all.

Negative test:

- Teacher Two must not see North class attendance.

## 9. Attendance records

Purpose: test session visibility and teacher/branch scope.

Minimum fake records:

- Present record for Demo Student One.
- Late record for Demo Student Two.
- Absent record for Demo Student Three.

Relationships:

- Each record references student, class, branch, and teacher where available.

Expected visibility:

- Staff visibility follows branch/class assignment.
- Parent/student visibility follows linked/self student.

Negative test:

- Parent One must not see Demo Student Three attendance.

## 10. Homework records

Purpose: test homework assignment and status workflow.

Minimum fake records:

- Assigned homework for Demo Student One.
- Incomplete homework for Demo Student Two.
- Completed homework for Demo Student Three.

Relationships:

- References student, class, branch, assigned teacher, and due date.

Expected visibility:

- Teacher sees assigned class homework.
- Parent/student sees linked/self homework.

Negative test:

- Teacher One must not see South Science C homework.

## 11. Homework attachments

Purpose: test metadata for private Storage objects.

Minimum fake records:

- One received PDF for Demo Student One.
- One teacher-reviewed image for Demo Student Two.
- One feedback-released PDF for Demo Student Three.

Relationships:

- References homework record, student, class, branch, uploader, and Storage path.

Expected visibility:

- Parent/student sees linked/self uploads where allowed.
- Teacher sees assigned class uploads.
- Branch Supervisor sees branch uploads.
- HQ Admin sees all.

Negative test:

- Student One must not access Student Three attachment metadata or file.

## 12. Parent reports

Purpose: test report status workflow and approved-only parent/student access.

Minimum fake records:

- Shared report for Demo Student One.
- Edited report for Demo Student Two.
- AI draft generated report for Demo Student Three.

Relationships:

- References student, class, branch, teacher, approver, and status.

Expected visibility:

- Teacher sees reports for assigned class students.
- Branch Supervisor/HQ sees review queues.
- Parent/student sees linked/self reports only when approved/shared.

Negative test:

- Parent must not see edited or draft reports.

## 13. Teacher tasks

Purpose: test supervisor-to-teacher task assignment.

Minimum fake records:

- Attendance follow-up task.
- Lesson plan preparation task.
- Parent report approval task.

Relationships:

- Task references branch, class, student, creator, due date, and task assignments.

Expected visibility:

- Assigned teacher sees own tasks.
- Branch Supervisor sees branch tasks.
- HQ Admin sees all.

Negative test:

- Teacher must not see another teacher's task unless assigned.

## 14. Teacher task assignments

Purpose: track assignee status separately from task definition.

Minimum fake records:

- Teacher One assigned open task.
- Teacher One assigned completed task.
- Teacher Two assigned overdue task.

Relationships:

- Joins teacher task to teacher profile.

Expected visibility:

- Teacher can read/update own assignment status.
- Supervisor can monitor branch assignments.
- HQ Admin sees all.

Negative test:

- Teacher One cannot mark Teacher Two assignment complete.

## 15. Task attachments

Purpose: test lesson plan/material file metadata.

Minimum fake records:

- Lesson plan PDF for North English A.
- Worksheet PDF for North Maths B.
- Observation follow-up note for South Science C.

Relationships:

- References teacher task, Storage path, uploader, and branch.

Expected visibility:

- Assigned teacher can read.
- Branch Supervisor/HQ can manage by scope.

Negative test:

- Teacher not assigned to the task cannot access attachment file.

## 16. Fee records

Purpose: test internal fee tracking without real payment data.

Minimum fake records:

- Paid fake fee record.
- Unpaid fake fee record.
- Pending verification fake fee record.

Relationships:

- References student, branch, class, optional receipt path, and verifier.

Expected visibility:

- HQ Admin all.
- Branch Supervisor own branch.
- Parent may see limited linked-child status if product policy allows.
- Teacher/student should not see internal financial details.

Negative test:

- Teacher must not access fee amount, payment method, receipt reference, or internal notes.

## 17. Observations

Purpose: test teaching quality observations and role visibility.

Minimum fake records:

- Completed observation for Teacher One.
- Draft observation for Teacher Two.

Relationships:

- References branch, class, teacher, observer profile, and optional files.

Expected visibility:

- HQ Admin sees all.
- Branch Supervisor sees own branch.
- Teacher sees completed/self-visible observations only if product policy allows.

Negative test:

- Teacher must not see draft supervisor-only observations.

## 18. Leads

Purpose: test enrolment pipeline by branch.

Minimum fake records:

- New lead for North branch.
- Contacted lead for South branch.
- Converted lead for North branch.

Relationships:

- References branch, source, interested subject/class, and owner profile.

Expected visibility:

- HQ Admin all.
- Branch Supervisor own branch.
- Teachers generally no access unless assigned to trial follow-up.

Negative test:

- South Branch Supervisor cannot see North lead notes.

## 19. Trial schedules

Purpose: test trial class workflow.

Minimum fake records:

- Scheduled trial in North English A.
- Completed trial in North Maths B.
- Cancelled trial in South Science C.

Relationships:

- References branch, class, lead, assigned teacher, and trial date/time.

Expected visibility:

- HQ Admin all.
- Branch Supervisor own branch.
- Teacher sees assigned trials as task/dashboard context, not full trial admin.

Negative test:

- Teacher must not see full Trial Scheduling admin records outside assigned trials.

## 20. Schools

Purpose: test school/curriculum context without real school data.

Minimum fake records:

- North Demo Primary School.
- South Demo International School.
- Demo Homeschool Programme.

Relationships:

- Student school profiles reference schools.

Expected visibility:

- Authenticated users may read non-sensitive catalog names.
- Student-specific links remain private.

Negative test:

- Parent cannot infer other students attending the same school.

## 21. Student school profiles

Purpose: test learner-specific school, grade, curriculum, and subject context.

Minimum fake records:

- Demo Student One with Cambridge-style pathway.
- Demo Student Two with local pathway.
- Demo Student Three with homeschool pathway.

Relationships:

- References student, school, curriculum pathway, year/grade, and subjects.

Expected visibility:

- Parent/student linked/self.
- Teacher assigned student.
- Branch Supervisor own branch.
- HQ Admin all.

Negative test:

- Teacher cannot view school profiles for unassigned students.

## Final seed data rule

All seed data must be fake, clearly marked as fake, and safe to reset. Seed data should prove both positive and negative RLS cases before any real data is considered.

# Auth Onboarding Architecture Blueprint

This blueprint defines the future authentication and onboarding architecture for Young's Learners. It is intentionally database-first and Supabase-ready, but it does not implement Supabase, real authentication, or real data collection yet.

The current `/welcome` page remains a UI-only prototype with demo links only.

## 1. Product-level auth model

Young's Learners should use one shared platform and one shared database. Users should sign in through a common authentication system, then be routed to the correct experience based on their database-backed role.

Supported roles:

- `parent`
- `student`
- `teacher`
- `branch_supervisor`
- `hq_admin`

Role is a database/security property, not a UI preference. The app can use the role to decide which dashboard to show, but Supabase Row Level Security must decide which records the user can access.

Future routing:

- Parents land on a parent dashboard with linked children.
- Students land on the student learning portal.
- Teachers land on teacher workflow pages.
- Branch supervisors land on branch operations pages.
- HQ admins land on platform-wide management and monitoring pages.

## 2. Recommended login flow

Recommended future login behavior:

- Parents can sign in with email or phone after Supabase Auth and parent-child linking are ready.
- Students can access their own portal, but younger learners may primarily enter through the parent dashboard.
- Staff sign in with normal credentials such as email and password, magic link, or another approved Supabase Auth method.
- Staff invite or activation codes are only for first-time onboarding.
- Staff invite or activation codes must not become the daily login method.

The `/welcome` page can keep presenting role-specific entry points, but the real role must come from the authenticated user's `profiles` row and related database records.

## 3. Parent onboarding flow

Future parent onboarding should be secure, short, and child-centered.

Recommended flow:

1. Parent creates or signs into an account.
2. Parent contact is verified through the chosen Supabase Auth method.
3. Parent adds or links a child.
4. Child school name is recorded.
5. Child year or grade is recorded.
6. School type is recorded.
7. Curriculum pathway is recorded if known.
8. Subjects enrolled are recorded.
9. Parent can open linked student portal views.

Parent onboarding should not expose internal centre tools. Parent access should be limited to linked children and approved parent/student-facing records.

## 4. Student school/curriculum personalisation

School and curriculum data matters because Phase 2 learning features depend on context.

Future use cases:

- School links to likely syllabus expectations.
- Syllabus links to textbook series and curriculum pathway.
- Curriculum pathway supports AI homework marking.
- Curriculum pathway supports relevant learning resources.
- Curriculum pathway supports gamified modules.
- Curriculum pathway supports weak-skill diagnosis.
- Curriculum pathway supports personalised revision.

School and curriculum data should be attached to the learner's profile through explicit relationships. It must not expose other students, other families, or other schools' private data.

## 5. Staff onboarding flow

Future staff onboarding should use invite/activation codes for setup only.

Recommended flow:

1. HQ admin or branch supervisor generates an invite/activation code.
2. Code records the intended role.
3. Code records the branch.
4. Code optionally records class assignment for teachers.
5. Code records expiry.
6. Code records used or unused status.
7. Code records who generated it.
8. Staff uses code once during setup.
9. Staff profile is created or linked.
10. After setup, staff logs in normally.

Daily role and branch access must come from database relationships, not from repeatedly entering a code.

## 6. Teacher task management architecture

Teacher task management should replace messy WhatsApp, Drive, spreadsheet, and manual tick workflows.

Future task system:

- Supervisor can assign a task to a teacher.
- Task can include notes.
- Task can include attachments such as lesson plans or materials.
- Task can link to a class.
- Task can link to a student.
- Task can link to a branch.
- Task can link to a date.
- Teacher marks task complete.
- Supervisor tracks completion.
- HQ sees cross-branch overview and overdue patterns.

This should become a database-backed workflow rather than chat-based instruction tracking. File attachments should use private Supabase Storage with metadata rows and RLS-controlled access.

## 7. Proposed database tables

### `profiles`

Purpose: app-level identity and role profile for each Supabase Auth user.

Key fields:

- `id uuid primary key references auth.users(id)`
- `email text`
- `phone text`
- `full_name text`
- `role text`
- `branch_id uuid null references branches(id)`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

Relationships:

- One profile can be a guardian.
- One profile can be staff.
- One profile can be linked to teacher class assignments.

Access rules:

- User can read own profile.
- HQ admin can manage all profiles.
- Branch supervisor can read staff profiles in own branch.

### `branches`

Purpose: centre branch records.

Key fields:

- `id uuid primary key`
- `name text`
- `code text`
- `address text`
- `phone text`
- `status text`
- `created_at timestamptz`

Relationships:

- Branch has many classes.
- Branch has many students.
- Branch has many staff profiles.

Access rules:

- HQ admin can read and manage all branches.
- Branch supervisor can read own branch.
- Teachers can read branches for assigned classes only.

### `classes`

Purpose: class records linked to branches and teachers.

Key fields:

- `id uuid primary key`
- `branch_id uuid references branches(id)`
- `name text`
- `subject text`
- `level text`
- `schedule text`
- `status text`
- `created_at timestamptz`

Relationships:

- Class belongs to branch.
- Class has many students.
- Class has many teacher assignments.

Access rules:

- HQ admin can access all classes.
- Branch supervisor can access own branch classes.
- Teacher can access assigned classes.
- Parent/student can access class summary for linked/self student only.

### `students`

Purpose: learner identity and centre enrolment record.

Key fields:

- `id uuid primary key`
- `branch_id uuid references branches(id)`
- `class_id uuid references classes(id)`
- `full_name text`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

Relationships:

- Student belongs to branch.
- Student belongs to current class.
- Student links to guardians.
- Student links to school profile.

Access rules:

- HQ admin can access all students.
- Branch supervisor can access own branch students.
- Teacher can access assigned class students.
- Parent can access linked children only.
- Student can access own record only.

### `schools`

Purpose: school directory for learner context.

Key fields:

- `id uuid primary key`
- `name text`
- `school_type text`
- `country text`
- `region text`
- `status text`

Relationships:

- School has many student school profiles.
- School can map to likely curriculum pathways.

Access rules:

- Public read can be considered for non-sensitive school names.
- Student-specific linkage remains private through student profiles.

### `curriculum_pathways`

Purpose: curriculum and syllabus pathway catalog.

Key fields:

- `id uuid primary key`
- `name text`
- `school_type text`
- `subject text`
- `level text`
- `description text`
- `status text`

Relationships:

- Linked from student school profiles.
- Later linked to resources, AI marking, and revision modules.

Access rules:

- General catalog may be readable by authenticated users.
- Student pathway assignment must remain scoped by student access.

### `student_school_profiles`

Purpose: learner-specific school and curriculum context.

Key fields:

- `id uuid primary key`
- `student_id uuid references students(id)`
- `school_id uuid references schools(id)`
- `year_grade text`
- `school_type text`
- `curriculum_pathway_id uuid references curriculum_pathways(id)`
- `subjects_enrolled text[]`
- `created_at timestamptz`
- `updated_at timestamptz`

Relationships:

- Belongs to student.
- References school.
- References curriculum pathway.

Access rules:

- Same as student access.
- Parents see linked children's profiles.
- Teachers see assigned students' learning context.

### `guardians`

Purpose: parent/guardian profile extension.

Key fields:

- `id uuid primary key`
- `profile_id uuid references profiles(id)`
- `contact_email text`
- `contact_phone text`
- `verification_status text`
- `created_at timestamptz`

Relationships:

- Guardian belongs to profile.
- Guardian links to students through `guardian_student_links`.

Access rules:

- Guardian can read own guardian record.
- HQ admin can manage all.
- Branch supervisor can access guardians for own branch students where needed.

### `guardian_student_links`

Purpose: secure parent-child access relationship.

Key fields:

- `id uuid primary key`
- `guardian_id uuid references guardians(id)`
- `student_id uuid references students(id)`
- `relationship text`
- `is_primary boolean`
- `status text`
- `created_at timestamptz`

Relationships:

- Links guardians to students.

Access rules:

- Parent can read active links involving their guardian record.
- Parent access to student records depends on this table.
- HQ/branch staff can manage links within scope.

### `staff_invites`

Purpose: first-time staff onboarding invite/activation codes.

Key fields:

- `id uuid primary key`
- `code_hash text`
- `email text`
- `role text`
- `branch_id uuid references branches(id)`
- `class_id uuid null references classes(id)`
- `expires_at timestamptz`
- `used_at timestamptz null`
- `generated_by uuid references profiles(id)`
- `status text`
- `created_at timestamptz`

Relationships:

- Generated by staff profile.
- Can create/link staff profile.
- Can create teacher assignment.

Access rules:

- Codes are validated server-side only.
- HQ admin can manage all staff invites.
- Branch supervisor can manage own branch invites within allowed roles.
- Staff user should never see raw code records broadly.

### `teacher_class_assignments`

Purpose: teacher-to-class access relationship.

Key fields:

- `id uuid primary key`
- `teacher_profile_id uuid references profiles(id)`
- `class_id uuid references classes(id)`
- `branch_id uuid references branches(id)`
- `assignment_role text`
- `status text`
- `created_at timestamptz`

Relationships:

- Links teacher profile to classes.

Access rules:

- Teacher can read own assignments.
- Teacher access to classes/students/tasks depends on this table.
- Branch supervisor can manage own branch assignments.
- HQ admin can manage all.

### `teacher_tasks`

Purpose: trackable operational and teaching tasks.

Key fields:

- `id uuid primary key`
- `title text`
- `description text`
- `branch_id uuid references branches(id)`
- `class_id uuid null references classes(id)`
- `student_id uuid null references students(id)`
- `task_date date null`
- `due_at timestamptz null`
- `priority text`
- `status text`
- `created_by uuid references profiles(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Relationships:

- Can link to branch, class, student, date, attachments, and assignees.

Access rules:

- HQ admin can access all tasks.
- Branch supervisor can access own branch tasks.
- Teacher can access tasks assigned to them or linked to assigned classes.

### `task_attachments`

Purpose: metadata for task files such as lesson plans or materials.

Key fields:

- `id uuid primary key`
- `task_id uuid references teacher_tasks(id)`
- `storage_bucket text`
- `storage_path text`
- `file_name text`
- `mime_type text`
- `file_size bigint`
- `uploaded_by uuid references profiles(id)`
- `created_at timestamptz`

Relationships:

- Belongs to teacher task.
- Storage object path points to private Supabase Storage.

Access rules:

- Same visibility as parent task.
- Storage policies must mirror task access.

### `teacher_task_assignments`

Purpose: task-to-teacher assignment records.

Key fields:

- `id uuid primary key`
- `task_id uuid references teacher_tasks(id)`
- `teacher_profile_id uuid references profiles(id)`
- `assigned_by uuid references profiles(id)`
- `assigned_at timestamptz`
- `completed_at timestamptz null`
- `completion_note text`
- `status text`

Relationships:

- Links task to one or more teachers.

Access rules:

- Teacher can read and update own assignment status.
- Supervisor/HQ can assign and monitor within scope.

### `parent_access_logs`

Purpose: audit parent/student portal access.

Key fields:

- `id uuid primary key`
- `guardian_id uuid null references guardians(id)`
- `student_id uuid references students(id)`
- `accessed_by uuid references profiles(id)`
- `access_type text`
- `created_at timestamptz`
- `ip_hash text null`

Relationships:

- Links access event to parent/student/profile.

Access rules:

- HQ admin can audit all.
- Branch supervisor can audit own branch.
- Parents should not browse raw audit logs unless a specific product need exists.

### `onboarding_sessions`

Purpose: track incomplete onboarding progress without committing unverified records.

Key fields:

- `id uuid primary key`
- `profile_id uuid null references profiles(id)`
- `session_type text`
- `status text`
- `current_step text`
- `metadata jsonb`
- `expires_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Relationships:

- Can later link to profile, guardian, student, or invite after verification.

Access rules:

- User can access own onboarding session.
- Server functions manage sensitive transitions.
- Expired sessions should not grant access.

## 8. RLS and access rules

Role-based access should be enforced by Supabase RLS:

- HQ Admin can access all branches and operational records.
- Branch Supervisor can access records for their own branch.
- Teacher can access assigned classes, assigned students, and assigned tasks.
- Parent can access linked children only.
- Student can access own learning records only.

Common RLS helper functions:

- `current_profile()`
- `current_role()`
- `current_branch_id()`
- `is_hq_admin()`
- `can_access_branch(branch_id)`
- `can_access_class(class_id)`
- `can_access_student(student_id)`

Frontend route guards are useful for experience, but RLS is the security boundary.

## 9. Security rules

Security principles:

- Never trust client-side role selection.
- `demoRole` is prototype only.
- Invite codes must be validated server-side later.
- Invite code hashes, not raw codes, should be stored.
- Parent-child links must be enforced by database relationships and RLS.
- School and curriculum data must not expose other students.
- Parents can only access linked children.
- Students can only access their own learning records.
- No real data should be used until Supabase Auth and RLS are ready.

Sensitive data restrictions:

- Do not collect real student data yet.
- Do not collect real parent data yet.
- Do not collect real teacher data yet.
- Do not collect school/curriculum data yet.
- Do not collect fee/payment/homework data yet.

## 10. Migration sequence

Recommended sequence:

1. Keep `/welcome` UI-only.
2. Build Supabase tables.
3. Add role, branch, class, student, and guardian relationships.
4. Add RLS policies and helper functions.
5. Seed fake data only.
6. Connect Supabase Auth in a controlled branch.
7. Implement parent onboarding.
8. Implement staff onboarding.
9. Implement staff invite code validation server-side.
10. Implement parent-child linking.
11. Implement student school profile.
12. Run role-by-role QA with test users.
13. Only then use real operational data.

## 11. What not to build yet

Do not build these yet:

- Real Supabase integration.
- Payment gateway.
- AI marking.
- Real parent/student data collection.
- Real school/curriculum collection.
- Real staff activation-code validation.
- Real homework uploads.
- Real fee/payment records.
- Replacement for `demoRole`.

Do not replace `demoRole` until authentication, profiles, RLS, and role-based QA are planned and tested.

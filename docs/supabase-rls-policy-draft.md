# Supabase RLS Policy Draft

This document drafts Row Level Security logic for the future Young's Learners Supabase backend. It is documentation only. Do not apply these policies to a live Supabase project until the schema, auth flow, test users, seed data, and backup plan are ready.

## 1. Security model

Frontend filtering is not security. Route guards, sidebars, and `demoRole` are useful for prototype experience only.

Production security must come from:

- Supabase Auth for identity.
- `profiles` for role, branch, and account status.
- Relationship tables such as `guardian_student_links` and `teacher_class_assignments`.
- Supabase RLS policies on every private table.
- Supabase Storage policies that check database metadata before allowing file access.

`demoRole` is prototype-only and must never be trusted for production authorization.

## 2. Recommended helper functions

These helpers keep policy logic readable. Names and SQL are draft examples.

```sql
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()
    and account_status = 'active'
  limit 1
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and account_status = 'active'
  limit 1
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id
  from public.profiles
  where id = auth.uid()
    and account_status = 'active'
  limit 1
$$;

create or replace function public.is_hq_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'hq_admin'
      and account_status = 'active'
  )
$$;
```

Additional helpers:

```sql
-- Draft helper shape.
can_access_branch(branch_id uuid) returns boolean
can_access_class(class_id uuid) returns boolean
can_access_student(student_id uuid) returns boolean
can_access_teacher_task(task_id uuid) returns boolean
is_parent_linked_to_student(student_id uuid) returns boolean
is_teacher_assigned_to_class(class_id uuid) returns boolean
```

## 3. Role access plan

### HQ Admin

Access intent:

- Can access all branches.
- Can access all operational records.
- Can manage staff, students, classes, reports, tasks, fees, observations, leads, trials, and storage metadata.

Pseudo-policy:

```sql
using (public.is_hq_admin())
with check (public.is_hq_admin())
```

### Branch Supervisor

Access intent:

- Can access records where `branch_id = current_branch_id()`.
- Can manage branch students, classes, teachers, tasks, fees, observations, leads, and trials for their own branch.
- Cannot access other branches.

Pseudo-policy:

```sql
using (
  public.current_role() = 'branch_supervisor'
  and branch_id = public.current_branch_id()
)
with check (
  public.current_role() = 'branch_supervisor'
  and branch_id = public.current_branch_id()
)
```

### Teacher

Access intent:

- Can access assigned classes through `teacher_class_assignments`.
- Can access students in assigned classes.
- Can access own assigned tasks.
- Can access related attendance, homework, parent reports, and task attachments for assigned classes/students.
- Cannot access finance details except non-sensitive task reminders if product rules allow.

Pseudo-policy:

```sql
using (
  public.current_role() = 'teacher'
  and exists (
    select 1
    from public.teacher_class_assignments tca
    join public.teachers t on t.id = tca.teacher_id
    where t.profile_id = auth.uid()
      and tca.class_id = target_table.class_id
      and tca.account_status = 'active'
  )
)
```

### Parent

Access intent:

- Can access linked children only through active `guardian_student_links`.
- Can see approved/shared parent reports only.
- Can upload homework only for linked children.
- Can see limited fee status for linked children if product policy allows, but not internal notes or staff-only verification details.

Pseudo-policy:

```sql
using (
  public.current_role() = 'parent'
  and exists (
    select 1
    from public.guardians g
    join public.guardian_student_links gsl on gsl.guardian_id = g.id
    where g.profile_id = auth.uid()
      and gsl.student_id = target_table.student_id
      and gsl.account_status = 'active'
  )
)
```

### Student

Access intent:

- Can access own learning records only.
- Can see own homework, attendance, approved/shared feedback, learning materials, and reminders.
- Cannot access internal operations, staff, finance, or other students.

Pseudo-policy:

```sql
using (
  public.current_role() = 'student'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.student_id = target_table.student_id
      and p.account_status = 'active'
  )
)
```

If `profiles.student_id` is not used, add a dedicated student-auth linking table before implementing student login.

## 4. Table policy groups

### Identity and branch tables

`profiles`

- User reads own profile.
- HQ Admin manages all.
- Branch Supervisor reads branch staff.
- Do not expose all profiles to parents/students.

`branches`

- HQ Admin all.
- Branch Supervisor own branch.
- Teacher branch for assigned classes.
- Parent/student only limited branch context through linked/self student records.

`staff_invites`

- HQ Admin creates and manages all.
- Branch Supervisor creates/manages own branch invites.
- Staff invite validation must happen server-side, using hashed codes.
- Do not allow public table reads by raw code.

`onboarding_sessions`

- User reads own session.
- Staff with admin scope reads sessions they supervise.
- Expire old sessions.
- Never store long-lived secrets in `draft_payload`.

### Student and family tables

`students`

- HQ Admin all.
- Branch Supervisor own branch.
- Teacher assigned class.
- Parent linked children only.
- Student own record only.

`guardians`

- Guardian own record.
- HQ Admin all.
- Branch Supervisor guardians linked to own branch students.
- Teachers generally do not need guardian records unless a specific report workflow requires limited contact display.

`guardian_student_links`

- Parent own active links.
- HQ Admin all.
- Branch Supervisor own branch student links.
- Teacher read only if needed for parent report context and only for assigned classes.

`schools`, `curriculum_pathways`

- Non-sensitive catalog rows may be readable by authenticated users.
- Student-specific school/curriculum assignment is private in `student_school_profiles`.
- Do not expose other students through school/curriculum joins.

`student_school_profiles`, `student_learning_profiles`

- Same access as the student.
- Teachers assigned to the student can read learning context.
- Parent/student can read linked/self context.
- Writes should be restricted to parent onboarding flows or staff roles with scope.

### Class and teacher tables

`classes`

- HQ Admin all.
- Branch Supervisor own branch.
- Teacher assigned classes.
- Parent/student limited class summary through linked/self student.

`teachers`

- HQ Admin all.
- Branch Supervisor own branch teachers.
- Teacher own teacher profile.
- Parent/student no direct teacher directory browsing.

`teacher_class_assignments`

- HQ Admin all.
- Branch Supervisor own branch.
- Teacher reads own assignments.
- Drives class and student access policies for teachers.

## 5. Special RLS considerations

### Homework uploads

Tables:

- `homework_records`
- `homework_attachments`
- Storage bucket: `homework`

Rules:

- Parent/student can create uploads only for linked/self student.
- Teacher can read/review uploads for assigned classes.
- Branch Supervisor can access own branch.
- HQ Admin can access all.
- Storage object paths must not be security boundaries by themselves.
- Storage policies should check `homework_attachments.storage_path` and linked metadata rows.

Pseudo-policy:

```sql
-- Metadata read example.
using (
  public.is_hq_admin()
  or branch_id = public.current_branch_id()
  or public.can_access_class(class_id)
  or public.can_access_student(student_id)
)
```

### Parent reports

Tables:

- `parent_reports`

Rules:

- Teacher can create drafts for assigned students.
- Branch Supervisor/HQ can review according to scope.
- Parent/student can read only linked/self reports with `status in ('approved', 'shared')`.
- Parent/student must not read teacher-only notes unless product policy explicitly releases them.

Pseudo-policy:

```sql
-- Parent/student report read example.
using (
  status in ('approved', 'shared')
  and public.can_access_student(student_id)
)
```

### Fee records

Tables:

- `fee_records`
- Storage bucket: `receipts`

Rules:

- HQ Admin all.
- Branch Supervisor own branch.
- Parent may read limited fee status for linked child if product policy allows.
- Teacher and student should not access financial details.
- Parent-facing policies should use views or column-safe APIs to avoid exposing internal notes, method details, and verification details.

Recommended pattern:

- Keep `fee_records` staff-only.
- Add a later `parent_fee_summary` view if parent-facing fee status is needed.

### Task attachments

Tables:

- `teacher_tasks`
- `teacher_task_assignments`
- `task_attachments`
- Storage bucket: `task_attachments`

Rules:

- Assigned teacher can read assigned task and attachments.
- Branch Supervisor can manage own branch tasks.
- HQ Admin can access all tasks.
- Teacher can mark own task assignment complete.
- Attachment storage access must check task assignment or branch/HQ scope.

### Staff invite codes

Tables:

- `staff_invites`

Rules:

- Store `code_hash`, never raw code.
- Validate code server-side through an Edge Function or secure RPC.
- Do not allow public direct reads by `code_hash`.
- Mark code used once profile setup completes.
- Enforce expiry before allowing setup.

### School/curriculum data

Tables:

- `schools`
- `curriculum_pathways`
- `student_school_profiles`
- `student_learning_profiles`

Rules:

- Catalog data may be broadly readable if non-sensitive.
- Student-specific assignments are private.
- Parent/student access only linked/self.
- Teacher access only assigned students.
- No cross-student exposure through school joins or analytics.

## 6. Pseudo-SQL policy examples

Enable RLS:

```sql
alter table public.students enable row level security;
alter table public.parent_reports enable row level security;
alter table public.homework_attachments enable row level security;
alter table public.fee_records enable row level security;
alter table public.teacher_tasks enable row level security;
```

Students read:

```sql
create policy "students_select_by_role"
on public.students
for select
using (
  public.is_hq_admin()
  or (
    public.current_role() = 'branch_supervisor'
    and branch_id = public.current_branch_id()
  )
  or exists (
    select 1
    from public.teacher_class_assignments tca
    join public.teachers t on t.id = tca.teacher_id
    where t.profile_id = auth.uid()
      and tca.class_id = students.class_id
      and tca.account_status = 'active'
  )
  or exists (
    select 1
    from public.guardians g
    join public.guardian_student_links gsl on gsl.guardian_id = g.id
    where g.profile_id = auth.uid()
      and gsl.student_id = students.id
      and gsl.account_status = 'active'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.student_id = students.id
      and p.role = 'student'
  )
);
```

Parent reports read:

```sql
create policy "parent_reports_select_by_role"
on public.parent_reports
for select
using (
  public.is_hq_admin()
  or (
    public.current_role() = 'branch_supervisor'
    and branch_id = public.current_branch_id()
  )
  or public.can_access_class(class_id)
  or (
    status in ('approved', 'shared')
    and public.can_access_student(student_id)
  )
);
```

Teacher task assignment update:

```sql
create policy "teacher_task_assignments_update_own"
on public.teacher_task_assignments
for update
using (
  exists (
    select 1
    from public.teachers t
    where t.id = teacher_task_assignments.teacher_id
      and t.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teachers t
    where t.id = teacher_task_assignments.teacher_id
      and t.profile_id = auth.uid()
  )
);
```

## 7. Storage policy notes

Supabase Storage policies should not trust file paths alone. Store every private file in a metadata table:

- `homework_attachments` for `homework`.
- `fee_records.receipt_storage_path` or a receipt metadata table for `receipts`.
- `task_attachments` for `task_attachments`.
- Observation metadata for `observation_files`.
- Learning material assignment metadata for `learning_materials`.

Storage read/write should join back to metadata and apply the same role rules.

## 8. Testing requirements before real data

Before real data is used:

1. Create test users for all roles.
2. Seed fake branches, classes, students, guardians, assignments, reports, tasks, fees, and uploads.
3. Test every table with each role.
4. Test direct API calls, not only UI navigation.
5. Test Storage reads and writes.
6. Confirm `demoRole` has no production authorization role.
7. Confirm backups and restore process.

No real student, parent, teacher, school, fee, payment, homework, or upload data should be used until these tests pass.

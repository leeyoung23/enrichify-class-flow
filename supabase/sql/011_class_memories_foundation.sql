-- 011_class_memories_foundation.sql
-- Manual/dev-first draft only. Review carefully before applying.
-- Do not auto-apply in production. Use fake/dev data only.
-- This migration is additive and does not drop existing tables/data.

-- ---------------------------------------------------------------------------
-- 1) Class Memories table (metadata only; no runtime upload wiring in this patch)
-- ---------------------------------------------------------------------------
create table if not exists public.class_memories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  class_id uuid not null references public.classes(id),
  student_id uuid null references public.students(id),
  -- Session model is not finalized in current schema. Keep nullable text for now.
  session_id text null,
  uploaded_by_profile_id uuid not null references public.profiles(id),
  approved_by_profile_id uuid null references public.profiles(id),
  title text null,
  caption text null,
  media_type text not null check (media_type in ('image', 'video')),
  storage_bucket text not null default 'class-memories',
  storage_path text not null,
  thumbnail_path text null,
  visibility_status text not null default 'draft'
    check (visibility_status in ('draft', 'submitted', 'approved', 'rejected', 'hidden')),
  visible_to_parents boolean not null default false,
  approved_at timestamptz null,
  rejected_reason text null,
  hidden_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Keep bucket fixed for this MVP draft to simplify storage policy checks.
  constraint class_memories_bucket_check check (storage_bucket = 'class-memories')
);

comment on table public.class_memories is
  'Draft Class Memories metadata table. Manual/dev-first migration; not auto-applied.';
comment on column public.class_memories.session_id is
  'Future session linkage placeholder (text for now until a session table is finalized).';

-- ---------------------------------------------------------------------------
-- 2) Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_class_memories_branch_id on public.class_memories(branch_id);
create index if not exists idx_class_memories_class_id on public.class_memories(class_id);
create index if not exists idx_class_memories_student_id on public.class_memories(student_id);
create index if not exists idx_class_memories_visibility_status on public.class_memories(visibility_status);
create index if not exists idx_class_memories_visible_to_parents on public.class_memories(visible_to_parents);
create index if not exists idx_class_memories_created_at on public.class_memories(created_at desc);
create index if not exists idx_class_memories_approved_at on public.class_memories(approved_at desc);

-- ---------------------------------------------------------------------------
-- 3) Trigger helper: keep updated_at current on updates
-- ---------------------------------------------------------------------------
create or replace function public.set_class_memories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_class_memories_updated_at on public.class_memories;
create trigger trg_set_class_memories_updated_at
before update on public.class_memories
for each row execute function public.set_class_memories_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Private bucket draft
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('class-memories', 'class-memories', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5) RLS policies for class_memories
-- ---------------------------------------------------------------------------
alter table public.class_memories enable row level security;

-- Read scope:
-- - HQ all
-- - Branch supervisor own branch
-- - Teacher assigned class
-- - Parent/student only approved + visible rows in linked class/student scope
drop policy if exists class_memories_select_scope on public.class_memories;
create policy class_memories_select_scope
on public.class_memories
for select
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or public.is_teacher_for_class(class_id)
  or (
    visibility_status = 'approved'
    and visible_to_parents = true
    and (
      -- Student-specific Memory
      (student_id is not null and (public.is_guardian_for_student(student_id) or public.is_student_self(student_id)))
      -- Class-wide Memory: parent/student must still be linked to a student in this class
      or (
        student_id is null
        and exists (
          select 1
          from public.students s
          where s.class_id = class_memories.class_id
            and (public.is_guardian_for_student(s.id) or public.is_student_self(s.id))
        )
      )
    )
  )
);

-- Teacher/HQ/branch insert scope.
-- Teacher must be assigned to class and can only create draft/submitted rows.
drop policy if exists class_memories_insert_scope on public.class_memories;
create policy class_memories_insert_scope
on public.class_memories
for insert
with check (
  (
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(branch_id)
    or (
      public.current_user_role() = 'teacher'
      and public.is_teacher_for_class(class_id)
      and uploaded_by_profile_id = auth.uid()
      and visibility_status in ('draft', 'submitted')
      and visible_to_parents = false
    )
  )
  and storage_bucket = 'class-memories'
);

-- Update scope:
-- - HQ and branch supervisor can manage review lifecycle in their scope.
-- - Teacher can update own class memories only while in draft/submitted/rejected.
drop policy if exists class_memories_update_scope on public.class_memories;
create policy class_memories_update_scope
on public.class_memories
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
  or (
    public.current_user_role() = 'teacher'
    and uploaded_by_profile_id = auth.uid()
    and public.is_teacher_for_class(class_id)
  )
)
with check (
  (
    public.is_hq_admin()
    or public.is_branch_supervisor_for_branch(branch_id)
    or (
      public.current_user_role() = 'teacher'
      and uploaded_by_profile_id = auth.uid()
      and public.is_teacher_for_class(class_id)
      and visibility_status in ('draft', 'submitted', 'rejected')
      and approved_by_profile_id is null
      and approved_at is null
      and hidden_at is null
      and visible_to_parents = false
    )
  )
  and storage_bucket = 'class-memories'
);

-- Delete scope: HQ and branch supervisor only (teacher delete intentionally blocked in draft).
drop policy if exists class_memories_delete_scope on public.class_memories;
create policy class_memories_delete_scope
on public.class_memories
for delete
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- ---------------------------------------------------------------------------
-- 6) Storage policies for class-memories objects
-- IMPORTANT upload order:
--   (1) create class_memories metadata row first with intended storage_path
--   (2) upload object to bucket
--   (3) update lifecycle status as needed
-- This policy model intentionally requires metadata-before-upload.
--
-- Intended object key conventions (bucket name excluded):
--   Class-wide:       {branch_id}/{class_id}/{date}/{memory_id}-{safe_filename}
--   Student-specific: {branch_id}/{class_id}/{student_id}/{date}/{memory_id}-{safe_filename}
-- ---------------------------------------------------------------------------
drop policy if exists class_memories_select_storage on storage.objects;
create policy class_memories_select_storage
on storage.objects
for select
using (
  bucket_id = 'class-memories'
  and exists (
    select 1
    from public.class_memories cm
    where cm.storage_bucket = 'class-memories'
      and cm.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(cm.branch_id)
        or public.is_teacher_for_class(cm.class_id)
        or (
          cm.visibility_status = 'approved'
          and cm.visible_to_parents = true
          and (
            (cm.student_id is not null and (public.is_guardian_for_student(cm.student_id) or public.is_student_self(cm.student_id)))
            or (
              cm.student_id is null
              and exists (
                select 1
                from public.students s
                where s.class_id = cm.class_id
                  and (public.is_guardian_for_student(s.id) or public.is_student_self(s.id))
              )
            )
          )
        )
      )
  )
);

drop policy if exists class_memories_insert_storage on storage.objects;
create policy class_memories_insert_storage
on storage.objects
for insert
with check (
  bucket_id = 'class-memories'
  and exists (
    select 1
    from public.class_memories cm
    where cm.storage_bucket = 'class-memories'
      and cm.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(cm.branch_id)
        or (
          public.current_user_role() = 'teacher'
          and cm.uploaded_by_profile_id = auth.uid()
          and public.is_teacher_for_class(cm.class_id)
          and cm.visibility_status in ('draft', 'submitted')
          and cm.visible_to_parents = false
        )
      )
  )
);

drop policy if exists class_memories_update_storage on storage.objects;
create policy class_memories_update_storage
on storage.objects
for update
using (
  bucket_id = 'class-memories'
  and exists (
    select 1
    from public.class_memories cm
    where cm.storage_bucket = 'class-memories'
      and cm.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(cm.branch_id)
      )
  )
)
with check (
  bucket_id = 'class-memories'
  and exists (
    select 1
    from public.class_memories cm
    where cm.storage_bucket = 'class-memories'
      and cm.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(cm.branch_id)
      )
  )
);

drop policy if exists class_memories_delete_storage on storage.objects;
create policy class_memories_delete_storage
on storage.objects
for delete
using (
  bucket_id = 'class-memories'
  and exists (
    select 1
    from public.class_memories cm
    where cm.storage_bucket = 'class-memories'
      and cm.storage_path = storage.objects.name
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(cm.branch_id)
      )
  )
);

-- ---------------------------------------------------------------------------
-- 7) Approval lifecycle notes (draft policy intent)
-- draft -> submitted -> approved + visible_to_parents=true
-- rejected -> teacher may revise and resubmit later
-- hidden -> removed from parent view but retained internally
-- ---------------------------------------------------------------------------


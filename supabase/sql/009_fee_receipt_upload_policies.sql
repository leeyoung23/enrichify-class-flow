-- 009_fee_receipt_upload_policies.sql
-- Draft/manual patch only. Review carefully before applying in any environment.
-- Do NOT auto-apply. Do NOT use real data.
-- This patch is additive and focuses on fee receipt upload readiness:
-- 1) fee_records row-scope policies for parent upload metadata and staff verification
-- 2) storage.objects policies for private fee-receipts bucket path access
-- 3) helper function for deterministic path-based authorization checks
--
-- IMPORTANT:
-- - This patch does not implement runtime upload/service/UI code.
-- - This patch does not create public bucket access.
-- - This patch does not use service role in frontend.

-- -----------------------------------------------------------------------------
-- 0) Optional enum hardening decision
-- -----------------------------------------------------------------------------
-- We intentionally keep fee_records.verification_status as text in this draft.
-- Reason:
-- - Existing environments may already contain values that are not enum-safe.
-- - A type migration requires coordinated data cleanup/backfill and downtime planning.
-- Suggested target values for future migration:
--   not_submitted, submitted, under_review, verified, rejected
-- Runtime/service code should normalize to this set even before enum migration.

-- -----------------------------------------------------------------------------
-- 1) Parent receipt metadata update policy (row scope only)
-- -----------------------------------------------------------------------------
-- RLS policy below restricts WHICH rows parent can update (linked student only).
-- A trigger (added below) enforces safe-field-only updates for parent role.
-- Safe parent-update fields (service-level contract):
--   receipt_file_path, receipt_storage_bucket, uploaded_by_profile_id, uploaded_at, verification_status
-- Parent should set verification_status to submitted only.
-- Parent must NOT update amount/status/verified_by/verified_at/internal_note/branch or student linkage.

drop policy if exists fee_records_modify_parent_receipt_upload on fee_records;
create policy fee_records_modify_parent_receipt_upload
on fee_records
for update
using (
  public.is_guardian_for_student(student_id)
)
with check (
  public.is_guardian_for_student(student_id)
  and coalesce(receipt_storage_bucket, 'fee-receipts') = 'fee-receipts'
  and verification_status in ('not_uploaded', 'not_submitted', 'submitted', 'under_review', 'verified', 'rejected')
);

-- Parent-safe field enforcement trigger:
-- - Applies only when current_user_role() = 'parent'
-- - Blocks parent from changing non-upload fields
-- - Restricts parent verification_status to submitted
create or replace function public.enforce_parent_fee_receipt_safe_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'parent'
     and public.is_guardian_for_student(old.student_id) then

    -- Immutable business fields for parent updates
    if new.branch_id is distinct from old.branch_id
      or new.student_id is distinct from old.student_id
      or new.class_id is distinct from old.class_id
      or new.fee_period is distinct from old.fee_period
      or new.amount is distinct from old.amount
      or new.status is distinct from old.status
      or new.verified_by_profile_id is distinct from old.verified_by_profile_id
      or new.verified_at is distinct from old.verified_at
      or new.internal_note is distinct from old.internal_note
    then
      raise exception 'Parent updates are restricted to receipt upload metadata fields only';
    end if;

    if coalesce(new.receipt_storage_bucket, 'fee-receipts') <> 'fee-receipts' then
      raise exception 'Parent must use fee-receipts bucket only';
    end if;

    if coalesce(new.verification_status, '') <> 'submitted' then
      raise exception 'Parent can only set verification_status to submitted';
    end if;

    if new.uploaded_by_profile_id is null or new.uploaded_by_profile_id <> auth.uid() then
      raise exception 'uploaded_by_profile_id must match current authenticated profile';
    end if;

    if new.uploaded_at is null then
      raise exception 'uploaded_at is required for parent receipt submission';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_parent_fee_receipt_safe_update on fee_records;
create trigger trg_parent_fee_receipt_safe_update
before update on fee_records
for each row
execute function public.enforce_parent_fee_receipt_safe_update();

-- -----------------------------------------------------------------------------
-- 2) Staff verification policy (HQ + own-branch supervisor)
-- -----------------------------------------------------------------------------
-- Existing staff-wide policy may already cover this, but this explicit update policy
-- keeps verification intent clear and isolated.
drop policy if exists fee_records_verify_staff_only on fee_records;
create policy fee_records_verify_staff_only
on fee_records
for update
using (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
)
with check (
  public.is_hq_admin()
  or public.is_branch_supervisor_for_branch(branch_id)
);

-- Teacher remains blocked (no teacher fee_records update policy).

-- -----------------------------------------------------------------------------
-- 3) Helper function for fee-receipts path authorization
-- -----------------------------------------------------------------------------
-- Path convention:
--   fee-receipts/{branch_id}/{student_id}/{fee_record_id}/{timestamp}-{safe_filename}
--
-- This function authorizes object access by parsing path segments and matching fee_records:
-- - HQ: all
-- - Branch supervisor: own branch only
-- - Parent/guardian: linked student only
-- - Teacher/student: blocked by design for receipt files
--
-- SECURITY DEFINER is used so policy evaluation can safely query fee_records
-- without recursion surprises in storage policy predicates.
create or replace function public.can_access_fee_receipt_path(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  branch_id_part text;
  student_id_part text;
  fee_record_id_part text;
  path_parts text[];
  branch_id_uuid uuid;
  student_id_uuid uuid;
  fee_record_id_uuid uuid;
begin
  if object_name is null or length(object_name) = 0 then
    return false;
  end if;

  path_parts := string_to_array(object_name, '/');
  if array_length(path_parts, 1) < 4 then
    return false;
  end if;

  branch_id_part := path_parts[1];
  student_id_part := path_parts[2];
  fee_record_id_part := path_parts[3];

  begin
    branch_id_uuid := branch_id_part::uuid;
    student_id_uuid := student_id_part::uuid;
    fee_record_id_uuid := fee_record_id_part::uuid;
  exception
    when others then
      return false;
  end;

  return exists (
    select 1
    from public.fee_records fr
    where fr.id = fee_record_id_uuid
      and fr.branch_id = branch_id_uuid
      and fr.student_id = student_id_uuid
      and (
        public.is_hq_admin()
        or public.is_branch_supervisor_for_branch(fr.branch_id)
        or public.is_guardian_for_student(fr.student_id)
      )
  );
end;
$$;

revoke all on function public.can_access_fee_receipt_path(text) from public;
grant execute on function public.can_access_fee_receipt_path(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 4) Storage policies for private fee-receipts bucket
-- -----------------------------------------------------------------------------
-- Chosen upload order for first implementation:
-- 1) Upload object to fee-receipts using deterministic path convention
-- 2) Update fee_records metadata fields (receipt_file_path/uploaded_at/uploader/status=submitted)
--
-- Reason:
-- - Insert policy can validate path-based access against fee_records identity row.
-- - Avoids requiring pre-written receipt_file_path before upload.

drop policy if exists fee_receipts_select_storage_v2 on storage.objects;
drop policy if exists fee_receipts_select_storage on storage.objects;
create policy fee_receipts_select_storage_v2
on storage.objects
for select
using (
  bucket_id = 'fee-receipts'
  and public.can_access_fee_receipt_path(name)
);

drop policy if exists fee_receipts_insert_storage_v2 on storage.objects;
drop policy if exists fee_receipts_insert_storage on storage.objects;
create policy fee_receipts_insert_storage_v2
on storage.objects
for insert
with check (
  bucket_id = 'fee-receipts'
  and public.can_access_fee_receipt_path(name)
);

drop policy if exists fee_receipts_update_storage_v2 on storage.objects;
create policy fee_receipts_update_storage_v2
on storage.objects
for update
using (
  bucket_id = 'fee-receipts'
  and (
    public.is_hq_admin()
    or exists (
      select 1
      from public.fee_records fr
      where fr.receipt_storage_bucket = 'fee-receipts'
        and fr.receipt_file_path = storage.objects.name
        and public.is_branch_supervisor_for_branch(fr.branch_id)
    )
  )
)
with check (
  bucket_id = 'fee-receipts'
  and (
    public.is_hq_admin()
    or exists (
      select 1
      from public.fee_records fr
      where fr.receipt_storage_bucket = 'fee-receipts'
        and fr.receipt_file_path = storage.objects.name
        and public.is_branch_supervisor_for_branch(fr.branch_id)
    )
  )
);

drop policy if exists fee_receipts_delete_storage_v2 on storage.objects;
create policy fee_receipts_delete_storage_v2
on storage.objects
for delete
using (
  bucket_id = 'fee-receipts'
  and (
    public.is_hq_admin()
    or exists (
      select 1
      from public.fee_records fr
      where fr.receipt_storage_bucket = 'fee-receipts'
        and fr.receipt_file_path = storage.objects.name
        and public.is_branch_supervisor_for_branch(fr.branch_id)
    )
  )
);

-- -----------------------------------------------------------------------------
-- 5) Operational notes (service responsibility)
-- -----------------------------------------------------------------------------
-- Frontend/service must:
-- - use anon client + authenticated JWT only
-- - never use service role key in browser
-- - update only safe parent fields for parent upload flow
-- - use signed URLs for private receipt retrieval
-- - keep teacher blocked from fee receipt object/metadata access

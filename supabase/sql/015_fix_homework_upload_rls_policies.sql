-- 015_fix_homework_upload_rls_policies.sql
-- Manual/dev-first additive patch only.
-- Purpose: patch homework upload RLS helper after smoke-test failure in 014.
-- Do NOT auto-apply. Review and run manually in dev Supabase SQL editor.
-- No table drops, no data deletes, no global RLS disable.

-- ---------------------------------------------------------------------------
-- Root-cause patch:
-- 014 helper used:
--   split_part(split_part(path, '/', 5), '-', 1) = hs.id::text
-- This fails for UUID submission IDs because UUIDs contain '-' characters.
-- The first split token captures only the first UUID segment, causing
-- homework_path_matches_submission(...) to return false and blocking:
-- - homework_files insert policy (metadata-first row creation)
-- - storage.objects insert policy (object upload after metadata)
-- ---------------------------------------------------------------------------
create or replace function public.homework_path_matches_submission(path text, submission_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.homework_submissions hs
      where hs.id = submission_uuid
        and array_length(string_to_array(path, '/'), 1) = 5
        and split_part(path, '/', 1) = hs.branch_id::text
        and split_part(path, '/', 2) = hs.class_id::text
        and split_part(path, '/', 3) = hs.student_id::text
        and split_part(path, '/', 4) = hs.homework_task_id::text
        and split_part(path, '/', 5) like hs.id::text || '-%'
    ),
    false
  )
$$;

comment on function public.homework_path_matches_submission(text, uuid) is
  'Patched in 015: supports UUID submission_id prefix in {submission_id}-{safe_filename} path format.';

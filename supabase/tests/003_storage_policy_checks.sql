-- 003_storage_policy_checks.sql
-- Read-only storage metadata checks + manual test guidance.
-- Review before running. Fake/demo data only.

-- -------------------------------------------------------------------
-- 1) Bucket existence/privacy checks
-- Expected: all listed buckets exist and public = false.
-- -------------------------------------------------------------------
select id, name, public, created_at
from storage.buckets
where id in (
  'homework-uploads',
  'fee-receipts',
  'task-attachments',
  'sales-kit-resources',
  'parent-report-samples'
)
order by id;

-- -------------------------------------------------------------------
-- 2) Object metadata overview (if any files were uploaded)
-- -------------------------------------------------------------------
select
  bucket_id,
  count(*) as object_count
from storage.objects
where bucket_id in (
  'homework-uploads',
  'fee-receipts',
  'task-attachments',
  'sales-kit-resources',
  'parent-report-samples'
)
group by bucket_id
order by bucket_id;

-- Optional: inspect file paths (limit to keep output small)
select
  bucket_id,
  name as object_path,
  owner,
  created_at
from storage.objects
where bucket_id in (
  'homework-uploads',
  'fee-receipts',
  'task-attachments',
  'sales-kit-resources',
  'parent-report-samples'
)
order by created_at desc
limit 100;

-- -------------------------------------------------------------------
-- 3) Manual future upload/read checks (run later via authenticated sessions)
-- -------------------------------------------------------------------
-- Parent homework upload:
-- - Parent uploads homework for linked child -> should succeed.
-- - Parent uploads for unlinked child -> should fail.
--
-- Parent fee receipt upload:
-- - Parent uploads receipt for linked child fee record -> should succeed.
-- - Parent uploads for unlinked child fee record -> should fail.
--
-- HQ sales kit upload:
-- - HQ upload/manage/archive in sales-kit-resources -> should succeed.
--
-- Supervisor sales kit read:
-- - Branch Supervisor reads approved in-scope resources -> should succeed.
-- - Branch Supervisor reads draft/archived or out-of-scope -> should fail.
--
-- Teacher blocked checks:
-- - Teacher read/upload in fee-receipts -> should fail.
-- - Teacher read in sales-kit-resources -> should fail.


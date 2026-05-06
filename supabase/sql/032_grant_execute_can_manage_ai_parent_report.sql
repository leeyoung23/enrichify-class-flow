-- 032_grant_execute_can_manage_ai_parent_report.sql
-- Manual/dev-first: allow authenticated role to call can_manage_ai_parent_report for Edge JWT checks.
-- Apply in Supabase SQL editor when RPC returns permission errors from Edge.
-- Idempotent: GRANT is safe to repeat.

grant execute on function public.can_manage_ai_parent_report(uuid) to authenticated;

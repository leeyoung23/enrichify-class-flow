import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

const TASK_ASSIGNMENT_STATUS_VALUES = new Set([
  "pending",
  "in_progress",
  "completed",
  "overdue",
]);
const ATTENDANCE_STATUS_VALUES = new Set([
  "present",
  "absent",
  "late",
  "leave",
]);
const COMMUNICATION_STATUS_VALUES = new Set([
  "draft",
  "ready_for_review",
  "approved",
  "released",
  "shared",
]);

/**
 * Update teacher task assignment status using Supabase anon client + RLS.
 * Only safe fields are writable here.
 */
export async function updateTeacherTaskAssignmentStatus({ assignmentId, status, completedAt } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!assignmentId || typeof assignmentId !== "string") {
    return { data: null, error: { message: "assignmentId is required" } };
  }

  if (!TASK_ASSIGNMENT_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "Invalid status value" } };
  }

  const payload = {
    status,
    completed_at:
      status === "completed"
        ? (completedAt ?? new Date().toISOString())
        : (completedAt ?? null),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("teacher_task_assignments")
      .update(payload)
      .eq("id", assignmentId)
      .select("id,task_id,teacher_id,status,completed_at,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Update attendance record fields using Supabase anon client + RLS.
 * Only safe attendance fields are writable here.
 */
export async function updateAttendanceRecord({ recordId, status, note } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!recordId || typeof recordId !== "string") {
    return { data: null, error: { message: "recordId is required" } };
  }

  if (!ATTENDANCE_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "Invalid attendance status value" } };
  }

  const payload = {
    status,
    note: typeof note === "string" ? note : (note ?? null),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("attendance_records")
      .update(payload)
      .eq("id", recordId)
      .select("id,branch_id,class_id,student_id,teacher_id,session_date,status,note,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Update parent comment draft fields using Supabase anon client + RLS.
 * Only safe parent comment fields are writable here.
 */
export async function updateParentCommentDraft({ commentId, message, status } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!commentId || typeof commentId !== "string") {
    return { data: null, error: { message: "commentId is required" } };
  }

  if (typeof message !== "string" || !message.trim()) {
    return { data: null, error: { message: "message is required" } };
  }

  if (!COMMUNICATION_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "Invalid parent comment status value" } };
  }

  const payload = {
    comment_text: message,
    status,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("parent_comments")
      .update(payload)
      .eq("id", commentId)
      .select("id,branch_id,class_id,student_id,teacher_id,comment_text,status,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Release a parent comment for parent-visible access using Supabase anon client + RLS.
 * Only safe parent comment fields are writable here.
 */
export async function releaseParentComment({ commentId, message } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!commentId || typeof commentId !== "string") {
    return { data: null, error: { message: "commentId is required" } };
  }

  if (typeof message !== "string" || !message.trim()) {
    return { data: null, error: { message: "message is required" } };
  }

  const payload = {
    comment_text: message,
    status: "released",
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("parent_comments")
      .update(payload)
      .eq("id", commentId)
      .select("id,branch_id,class_id,student_id,teacher_id,comment_text,status,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Update weekly progress report draft fields using Supabase anon client + RLS.
 * Only safe weekly report fields are writable here.
 */
export async function updateWeeklyProgressReportDraft({ reportId, reportText, status } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!reportId || typeof reportId !== "string") {
    return { data: null, error: { message: "reportId is required" } };
  }

  if (typeof reportText !== "string" || !reportText.trim()) {
    return { data: null, error: { message: "reportText is required" } };
  }

  if (!COMMUNICATION_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "Invalid weekly report status value" } };
  }

  const payload = {
    report_text: reportText,
    status,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("weekly_progress_reports")
      .update(payload)
      .eq("id", reportId)
      .select("id,branch_id,class_id,student_id,teacher_id,week_start_date,report_text,status,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Release weekly progress report for parent-visible access using Supabase anon client + RLS.
 * Only safe weekly report fields are writable here.
 */
export async function releaseWeeklyProgressReport({ reportId, reportText } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!reportId || typeof reportId !== "string") {
    return { data: null, error: { message: "reportId is required" } };
  }

  if (typeof reportText !== "string" || !reportText.trim()) {
    return { data: null, error: { message: "reportText is required" } };
  }

  const payload = {
    report_text: reportText,
    status: "released",
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("weekly_progress_reports")
      .update(payload)
      .eq("id", reportId)
      .select("id,branch_id,class_id,student_id,teacher_id,week_start_date,report_text,status,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Resolve authenticated profile id from current anon client session.
 */
async function getAuthenticatedProfileId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    return { profileId: null, error: { message: error?.message || "Authenticated user is required" } };
  }
  return { profileId: data.user.id, error: null };
}

/**
 * Verify fee receipt metadata using Supabase anon client + RLS.
 * Only safe verification fields are writable here.
 */
export async function verifyFeeReceipt({ feeRecordId, internalNote } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!feeRecordId || typeof feeRecordId !== "string") {
    return { data: null, error: { message: "feeRecordId is required" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      verification_status: "verified",
      verified_by_profile_id: profileId,
      verified_at: nowIso,
      updated_at: nowIso,
    };

    if (typeof internalNote === "string" && internalNote.trim()) {
      payload.internal_note = internalNote.trim();
    }

    const { data, error } = await supabase
      .from("fee_records")
      .update(payload)
      .eq("id", feeRecordId)
      .select("id,verification_status,verified_by_profile_id,verified_at,internal_note,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Reject fee receipt metadata using Supabase anon client + RLS.
 * Only safe verification fields are writable here.
 */
export async function rejectFeeReceipt({ feeRecordId, internalNote } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  if (!feeRecordId || typeof feeRecordId !== "string") {
    return { data: null, error: { message: "feeRecordId is required" } };
  }

  if (typeof internalNote !== "string" || !internalNote.trim()) {
    return { data: null, error: { message: "internalNote is required for rejection" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      verification_status: "rejected",
      verified_by_profile_id: profileId,
      verified_at: nowIso,
      internal_note: internalNote.trim(),
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from("fee_records")
      .update(payload)
      .eq("id", feeRecordId)
      .select("id,verification_status,verified_by_profile_id,verified_at,internal_note,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}


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
const HOMEWORK_SUBMISSION_STATUS_VALUES = new Set([
  "submitted",
  "under_review",
  "reviewed",
  "returned_for_revision",
  "approved_for_parent",
  "archived",
]);
const HOMEWORK_FEEDBACK_EDITABLE_STATUSES = new Set(["draft", "approved"]);
const HOMEWORK_FEEDBACK_STATUS_VALUES = new Set(["draft", "approved", "released_to_parent", "archived"]);

function isUuidLike(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function normalizeNullableText(value, { maxLength = 1000 } = {}) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableDate(value) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function buildClassCurriculumWritableFields({ learningFocus, termLabel, startDate, endDate } = {}) {
  const normalizedStartDate = normalizeNullableDate(startDate);
  const normalizedEndDate = normalizeNullableDate(endDate);
  if (startDate != null && normalizedStartDate == null) {
    return { payload: null, error: { message: "startDate must be YYYY-MM-DD or null" } };
  }
  if (endDate != null && normalizedEndDate == null) {
    return { payload: null, error: { message: "endDate must be YYYY-MM-DD or null" } };
  }
  if (normalizedStartDate && normalizedEndDate && normalizedStartDate > normalizedEndDate) {
    return { payload: null, error: { message: "startDate must be before or equal to endDate" } };
  }
  return {
    payload: {
      learning_focus: normalizeNullableText(learningFocus, { maxLength: 1200 }),
      term_label: normalizeNullableText(termLabel, { maxLength: 120 }),
      start_date: normalizedStartDate,
      end_date: normalizedEndDate,
      updated_at: new Date().toISOString(),
    },
    error: null,
  };
}

const CLASS_CURRICULUM_ASSIGNMENT_FIELDS =
  "id,class_id,curriculum_profile_id,term_label,start_date,end_date,learning_focus,created_at,updated_at";
const STUDENT_SCHOOL_PROFILE_FIELDS =
  "id,student_id,school_id,school_name,grade_year,curriculum_profile_id,parent_goals,teacher_notes,created_at,updated_at";

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
 * Create/update homework feedback using Supabase anon client + JWT/RLS only.
 * Creates draft when none exists; updates latest non-released feedback row when available.
 */
export async function createOrUpdateHomeworkFeedback({
  homeworkSubmissionId,
  feedbackText,
  nextStep,
  internalNote,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkSubmissionId)) {
    return { data: null, error: { message: "homeworkSubmissionId must be a UUID" } };
  }

  const safeFeedbackText = normalizeNullableText(feedbackText, { maxLength: 4000 });
  const safeNextStep = normalizeNullableText(nextStep, { maxLength: 2000 });
  const safeInternalNote = normalizeNullableText(internalNote, { maxLength: 2000 });
  if (!safeFeedbackText && !safeNextStep && !safeInternalNote) {
    return { data: null, error: { message: "At least one feedback field is required" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const submissionId = trimString(homeworkSubmissionId);
    const latestFeedbackRead = await supabase
      .from("homework_feedback")
      .select("id,status")
      .eq("homework_submission_id", submissionId)
      .in("status", ["draft", "approved"])
      .order("updated_at", { ascending: false })
      .limit(1);

    if (latestFeedbackRead.error) {
      return { data: null, error: latestFeedbackRead.error };
    }

    const latestRow = Array.isArray(latestFeedbackRead.data) ? latestFeedbackRead.data[0] : null;
    const nowIso = new Date().toISOString();
    const basePayload = {
      feedback_text: safeFeedbackText,
      next_step: safeNextStep,
      internal_note: safeInternalNote,
      updated_at: nowIso,
    };

    if (!latestRow?.id) {
      const insertPayload = {
        homework_submission_id: submissionId,
        teacher_profile_id: profileId,
        status: "draft",
        released_to_parent_at: null,
        created_at: nowIso,
        ...basePayload,
      };
      const { data, error } = await supabase
        .from("homework_feedback")
        .insert(insertPayload)
        .select("id,homework_submission_id,teacher_profile_id,feedback_text,next_step,status,released_to_parent_at,created_at,updated_at")
        .maybeSingle();
      return { data: data ?? null, error: error ?? null };
    }

    const nextStatus = HOMEWORK_FEEDBACK_EDITABLE_STATUSES.has(latestRow.status) ? latestRow.status : "draft";
    const updatePayload = {
      ...basePayload,
      status: nextStatus,
    };
    const { data, error } = await supabase
      .from("homework_feedback")
      .update(updatePayload)
      .eq("id", latestRow.id)
      .select("id,homework_submission_id,teacher_profile_id,feedback_text,next_step,status,released_to_parent_at,created_at,updated_at")
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Mark a homework submission as reviewed via staff-scoped RLS update policy.
 */
export async function markHomeworkSubmissionReviewed({ homeworkSubmissionId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkSubmissionId)) {
    return { data: null, error: { message: "homeworkSubmissionId must be a UUID" } };
  }
  if (!HOMEWORK_SUBMISSION_STATUS_VALUES.has("reviewed")) {
    return { data: null, error: { message: "Invalid reviewed status value" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("homework_submissions")
      .update({
        status: "reviewed",
        reviewed_at: nowIso,
        reviewed_by_profile_id: profileId,
        updated_at: nowIso,
      })
      .eq("id", trimString(homeworkSubmissionId))
      .select("id,homework_task_id,branch_id,class_id,student_id,status,reviewed_at,reviewed_by_profile_id,updated_at")
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Return a submission for revision and keep feedback in non-released state.
 */
export async function returnHomeworkForRevision({
  homeworkSubmissionId,
  feedbackText,
  nextStep,
  internalNote,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkSubmissionId)) {
    return { data: null, error: { message: "homeworkSubmissionId must be a UUID" } };
  }

  try {
    const feedbackResult = await createOrUpdateHomeworkFeedback({
      homeworkSubmissionId,
      feedbackText,
      nextStep,
      internalNote,
    });
    if (feedbackResult.error || !feedbackResult.data?.id) {
      return { data: null, error: feedbackResult.error || { message: "Unable to save feedback draft for revision" } };
    }

    const nowIso = new Date().toISOString();
    const feedbackDraftResult = await supabase
      .from("homework_feedback")
      .update({
        status: "draft",
        released_to_parent_at: null,
        updated_at: nowIso,
      })
      .eq("id", feedbackResult.data.id)
      .select("id,homework_submission_id,teacher_profile_id,feedback_text,next_step,status,released_to_parent_at,created_at,updated_at")
      .maybeSingle();
    if (feedbackDraftResult.error || !feedbackDraftResult.data) {
      return { data: null, error: feedbackDraftResult.error || { message: "Unable to keep feedback in draft state" } };
    }

    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const submissionUpdate = await supabase
      .from("homework_submissions")
      .update({
        status: "returned_for_revision",
        reviewed_at: nowIso,
        reviewed_by_profile_id: profileId,
        updated_at: nowIso,
      })
      .eq("id", trimString(homeworkSubmissionId))
      .select("id,homework_task_id,branch_id,class_id,student_id,status,reviewed_at,reviewed_by_profile_id,updated_at")
      .maybeSingle();
    if (submissionUpdate.error || !submissionUpdate.data) {
      return { data: null, error: submissionUpdate.error || { message: "Unable to mark submission returned_for_revision" } };
    }

    return {
      data: {
        feedback: feedbackDraftResult.data,
        submission: submissionUpdate.data,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Release homework feedback to parent visibility.
 */
export async function releaseHomeworkFeedbackToParent({ homeworkFeedbackId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkFeedbackId)) {
    return { data: null, error: { message: "homeworkFeedbackId must be a UUID" } };
  }
  if (!HOMEWORK_FEEDBACK_STATUS_VALUES.has("released_to_parent")) {
    return { data: null, error: { message: "Invalid release status value" } };
  }

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("homework_feedback")
      .update({
        status: "released_to_parent",
        released_to_parent_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", trimString(homeworkFeedbackId))
      .select("id,homework_submission_id,teacher_profile_id,feedback_text,next_step,status,released_to_parent_at,created_at,updated_at")
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

/**
 * Approve and release a class memory for parent visibility using Supabase anon client + RLS.
 * Only safe class memory lifecycle fields are writable here.
 */
export async function approveClassMemory({ memoryId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(memoryId)) {
    return { data: null, error: { message: "memoryId must be a UUID" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      visibility_status: "approved",
      visible_to_parents: true,
      approved_by_profile_id: profileId,
      approved_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from("class_memories")
      .update(payload)
      .eq("id", String(memoryId).trim())
      .select("id,branch_id,class_id,student_id,visibility_status,visible_to_parents,approved_by_profile_id,approved_at,rejected_reason,hidden_at,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Reject a class memory using Supabase anon client + RLS.
 * Only safe class memory lifecycle fields are writable here.
 */
export async function rejectClassMemory({ memoryId, reason } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(memoryId)) {
    return { data: null, error: { message: "memoryId must be a UUID" } };
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return { data: null, error: { message: "reason is required" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      visibility_status: "rejected",
      visible_to_parents: false,
      rejected_reason: reason.trim(),
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from("class_memories")
      .update(payload)
      .eq("id", String(memoryId).trim())
      .select("id,branch_id,class_id,student_id,visibility_status,visible_to_parents,approved_by_profile_id,approved_at,rejected_reason,hidden_at,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Hide a class memory from parent visibility using Supabase anon client + RLS.
 * Object and metadata row are retained for audit/history purposes.
 */
export async function hideClassMemory({ memoryId, reason } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(memoryId)) {
    return { data: null, error: { message: "memoryId must be a UUID" } };
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return { data: null, error: { message: "reason is required" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      visibility_status: "hidden",
      visible_to_parents: false,
      rejected_reason: reason.trim(),
      hidden_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await supabase
      .from("class_memories")
      .update(payload)
      .eq("id", String(memoryId).trim())
      .select("id,branch_id,class_id,student_id,visibility_status,visible_to_parents,approved_by_profile_id,approved_at,rejected_reason,hidden_at,updated_at")
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Assign curriculum profile + focus metadata to a class using Supabase anon client + RLS.
 * Conservative behavior: if any assignment already exists for class_id, update the latest row.
 */
export async function assignCurriculumToClass({
  classId,
  curriculumProfileId,
  learningFocus,
  termLabel,
  startDate,
  endDate,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(classId)) {
    return { data: null, error: { message: "classId must be a UUID" } };
  }
  if (!isUuidLike(curriculumProfileId)) {
    return { data: null, error: { message: "curriculumProfileId must be a UUID" } };
  }

  const { payload: safeFields, error: payloadError } = buildClassCurriculumWritableFields({
    learningFocus,
    termLabel,
    startDate,
    endDate,
  });
  if (payloadError) {
    return { data: null, error: payloadError };
  }

  try {
    const existingRead = await supabase
      .from("class_curriculum_assignments")
      .select("id")
      .eq("class_id", String(classId).trim())
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingRead.error) {
      return { data: null, error: existingRead.error };
    }

    const existingAssignmentId = Array.isArray(existingRead.data) ? existingRead.data[0]?.id : null;

    if (existingAssignmentId) {
      const updatePayload = {
        curriculum_profile_id: String(curriculumProfileId).trim(),
        ...safeFields,
      };
      const { data, error } = await supabase
        .from("class_curriculum_assignments")
        .update(updatePayload)
        .eq("id", existingAssignmentId)
        .select(CLASS_CURRICULUM_ASSIGNMENT_FIELDS)
        .maybeSingle();
      return { data: data ?? null, error: error ?? null };
    }

    const insertPayload = {
      class_id: String(classId).trim(),
      curriculum_profile_id: String(curriculumProfileId).trim(),
      ...safeFields,
    };
    const { data, error } = await supabase
      .from("class_curriculum_assignments")
      .insert(insertPayload)
      .select(CLASS_CURRICULUM_ASSIGNMENT_FIELDS)
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Update a class curriculum assignment using Supabase anon client + RLS.
 * Only safe context fields are writable here; class/curriculum foreign keys are unchanged.
 */
export async function updateClassCurriculumAssignment({
  assignmentId,
  learningFocus,
  termLabel,
  startDate,
  endDate,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(assignmentId)) {
    return { data: null, error: { message: "assignmentId must be a UUID" } };
  }

  const { payload, error: payloadError } = buildClassCurriculumWritableFields({
    learningFocus,
    termLabel,
    startDate,
    endDate,
  });
  if (payloadError) {
    return { data: null, error: payloadError };
  }

  try {
    const { data, error } = await supabase
      .from("class_curriculum_assignments")
      .update(payload)
      .eq("id", String(assignmentId).trim())
      .select(CLASS_CURRICULUM_ASSIGNMENT_FIELDS)
      .maybeSingle();

    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Upsert one student school profile row using Supabase anon client + RLS.
 * Conservative behavior: select by student_id, then update existing row or insert a new row.
 */
export async function upsertStudentSchoolProfile({
  studentId,
  schoolId,
  schoolName,
  gradeYear,
  curriculumProfileId,
  parentGoals,
  teacherNotes,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(studentId)) {
    return { data: null, error: { message: "studentId must be a UUID" } };
  }
  if (schoolId != null && !isUuidLike(schoolId)) {
    return { data: null, error: { message: "schoolId must be a UUID when provided" } };
  }
  if (curriculumProfileId != null && !isUuidLike(curriculumProfileId)) {
    return { data: null, error: { message: "curriculumProfileId must be a UUID when provided" } };
  }

  const safeFields = {
    school_id: schoolId ? String(schoolId).trim() : null,
    school_name: normalizeNullableText(schoolName, { maxLength: 240 }),
    grade_year: normalizeNullableText(gradeYear, { maxLength: 64 }),
    curriculum_profile_id: curriculumProfileId ? String(curriculumProfileId).trim() : null,
    parent_goals: normalizeNullableText(parentGoals, { maxLength: 1200 }),
    teacher_notes: normalizeNullableText(teacherNotes, { maxLength: 2000 }),
    updated_at: new Date().toISOString(),
  };

  try {
    const existingRead = await supabase
      .from("student_school_profiles")
      .select("id")
      .eq("student_id", String(studentId).trim())
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingRead.error) {
      return { data: null, error: existingRead.error };
    }

    const existingProfileId = Array.isArray(existingRead.data) ? existingRead.data[0]?.id : null;

    if (existingProfileId) {
      const { data, error } = await supabase
        .from("student_school_profiles")
        .update(safeFields)
        .eq("id", existingProfileId)
        .select(STUDENT_SCHOOL_PROFILE_FIELDS)
        .maybeSingle();
      return { data: data ?? null, error: error ?? null };
    }

    const insertPayload = {
      student_id: String(studentId).trim(),
      ...safeFields,
    };
    const { data, error } = await supabase
      .from("student_school_profiles")
      .insert(insertPayload)
      .select(STUDENT_SCHOOL_PROFILE_FIELDS)
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}


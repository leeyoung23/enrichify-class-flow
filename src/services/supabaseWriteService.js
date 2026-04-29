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


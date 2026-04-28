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


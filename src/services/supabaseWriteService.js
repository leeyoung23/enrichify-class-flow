import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { getActiveNotificationTemplate, renderNotificationTemplate } from "./supabaseReadService.js";
import {
  MOCK_AI_PARENT_REPORT_INSUFFICIENT_DATA_COPY,
  buildMockAiParentReportStructuredSections,
  containsUnsafeMockDraftValue,
  normalizeMockAiInputText,
  withMockFallback,
} from "./aiParentReportMockDraftCore.js";

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
const HOMEWORK_ASSIGNMENT_SCOPE_VALUES = new Set(["class", "selected_students", "individual"]);
const HOMEWORK_ASSIGNEE_STATUS_VALUES = new Set([
  "assigned",
  "submitted",
  "under_review",
  "returned_for_revision",
  "reviewed",
  "feedback_released",
  "archived",
]);
const HOMEWORK_FEEDBACK_EDITABLE_STATUSES = new Set(["draft", "approved"]);
const HOMEWORK_FEEDBACK_STATUS_VALUES = new Set(["draft", "approved", "released_to_parent", "archived"]);
const ANNOUNCEMENT_PRIORITY_VALUES = new Set(["low", "normal", "high", "urgent"]);
const ANNOUNCEMENT_DONE_STATUS_VALUES = new Set(["pending", "done", "undone"]);
const ANNOUNCEMENT_REPLY_TYPE_VALUES = new Set(["question", "update", "completion_note"]);
const ANNOUNCEMENT_TARGET_TYPE_VALUES = new Set(["branch", "role", "profile", "class"]);
const COMPANY_NEWS_TARGET_TYPE_VALUES = new Set(["branch", "role", "profile"]);
const COMPANY_NEWS_MAX_POPUP_EMOJI_LENGTH = 16;
const PARENT_ANNOUNCEMENT_TYPE_VALUES = new Set([
  "event",
  "activity",
  "centre_notice",
  "holiday_closure",
  "reminder",
  "celebration",
  "programme_update",
  "parent_workshop",
  "graduation_concert",
]);
const PARENT_ANNOUNCEMENT_TARGET_TYPE_VALUES = new Set(["branch", "class", "student"]);
const AI_PARENT_REPORT_TYPE_VALUES = new Set([
  "weekly_brief",
  "monthly_progress",
  "parent_requested",
  "graduation",
  "end_of_term",
  "homework_feedback",
  "participation_note",
]);
const AI_PARENT_REPORT_STATUS_VALUES = new Set([
  "draft",
  "teacher_review",
  "supervisor_review",
  "approved",
  "released",
  "archived",
]);
const AI_PARENT_REPORT_GENERATION_SOURCE_VALUES = new Set(["manual", "mock_ai", "real_ai"]);
const AI_PARENT_REPORT_EVIDENCE_TYPE_VALUES = new Set([
  "attendance",
  "homework",
  "homework_feedback",
  "teacher_note",
  "weekly_report",
  "memory_media",
  "parent_announcement",
  "assessment",
  "manual",
]);
const AUDIT_FORBIDDEN_METADATA_KEY_PATTERN =
  /(token|secret|password|apikey|api_key|authorization|cookie|session|provider|raw|prompt)/i;
const AUDIT_MAX_METADATA_KEYS = 12;
const AUDIT_MAX_STRING_LENGTH = 280;
const NOTIFICATION_EVENT_STATUS_VALUES = new Set(["draft", "pending", "processed", "cancelled"]);
const NOTIFICATION_STATUS_VALUES = new Set(["pending", "delivered", "read", "archived", "suppressed", "failed"]);
const PARENT_NOTIFICATION_PREFERENCE_CHANNEL_VALUES = new Set(["in_app", "email", "sms", "push"]);
const PARENT_NOTIFICATION_PREFERENCE_CATEGORY_VALUES = new Set([
  "operational_service",
  "billing_invoice",
  "learning_report_homework",
  "attendance_safety",
  "parent_communication",
  "marketing_events",
  "media_photo",
]);
const PARENT_NOTIFICATION_PREFERENCE_STATUS_VALUES = new Set([
  "not_set",
  "consented",
  "withdrawn",
  "required_service",
]);
const PARENT_POLICY_ACKNOWLEDGEMENT_KEY_VALUES = new Set([
  "parent_portal_terms_privacy",
  "parent_communication_policy",
  "media_photo_policy",
  "email_sms_policy",
  "marketing_events_policy",
]);
const PARENT_POLICY_ACKNOWLEDGEMENT_SOURCE_VALUES = new Set([
  "parent_portal_first_login",
  "parent_portal_settings",
  "hq_admin_recorded",
  "migration_seed",
  "parent_portal",
]);
const AI_PARENT_REPORT_NOTIFICATION_EVENT_TYPE = "ai_parent_report.released";
const AI_PARENT_REPORT_RELEASE_NOTIFY_TITLE = "New progress report available";
const AI_PARENT_REPORT_RELEASE_NOTIFY_BODY =
  "A new progress report has been released for your child.";
const HOMEWORK_FEEDBACK_PARENT_NOTIFICATION_EVENT_TYPE = "homework_feedback.released_to_parent";
const HOMEWORK_FILE_PARENT_NOTIFICATION_EVENT_TYPE = "homework_file.released_to_parent";
const HOMEWORK_PARENT_NOTIFY_TITLE = "Homework feedback is ready";
const HOMEWORK_PARENT_NOTIFY_BODY =
  "Your child's teacher has shared new homework feedback.";
const HOMEWORK_FILE_PARENT_NOTIFY_ROLES = new Set(["teacher_marked_homework", "feedback_attachment"]);
const STUDENT_ATTENDANCE_ARRIVED_EVENT_TYPE = "student_attendance.arrived";
/** Status values treated as "arrived at class" for parent messaging (see Attendance.jsx copy). */
const ARRIVAL_ATTENDANCE_STATUS_VALUES = new Set(["present", "late"]);
const ATTENDANCE_ARRIVAL_NOTIFY_TITLE = "Your child has arrived";
const ATTENDANCE_ARRIVAL_BODY_PRESENT = "Your child has been marked present for class.";
const ATTENDANCE_ARRIVAL_BODY_LATE = "Your child has been marked as arrived for class.";
const PARENT_COMMENT_RELEASED_NOTIFICATION_EVENT_TYPE = "parent_comment.released";
const WEEKLY_PROGRESS_REPORT_RELEASED_NOTIFICATION_EVENT_TYPE = "weekly_progress_report.released";
const PARENT_COMMUNICATION_CLASS_UPDATE_TITLE = "New update from your child's class";
const PARENT_COMMUNICATION_CLASS_UPDATE_BODY =
  "Your child's teacher has shared a new class update.";
const FEE_PAYMENT_PROOF_VERIFIED_EVENT_TYPE = "fee_payment.proof_verified";
const FEE_PAYMENT_PROOF_REJECTED_EVENT_TYPE = "fee_payment.proof_rejected";
const FEE_PAYMENT_PROOF_REQUESTED_EVENT_TYPE = "fee_payment.proof_requested";
const FEE_PAYMENT_PROOF_REQUESTED_NOTIFY_TITLE = "Payment proof requested";
const FEE_PAYMENT_PROOF_REQUESTED_NOTIFY_BODY =
  "Please upload your payment proof in the parent portal when convenient.";
const FEE_PAYMENT_PROOF_VERIFIED_NOTIFY_TITLE = "Payment proof verified";
const FEE_PAYMENT_PROOF_VERIFIED_NOTIFY_BODY =
  "Your uploaded payment proof has been reviewed.";
const FEE_PAYMENT_PROOF_REJECTED_NOTIFY_TITLE = "Payment proof needs review";
const FEE_PAYMENT_PROOF_REJECTED_NOTIFY_BODY =
  "Please check the payment proof request in the parent portal.";
const NOTIFICATION_TEMPLATE_CHANNEL_VALUES = new Set(["in_app", "email"]);
const PARENT_NOTIFICATION_EVENT_CATEGORY_BY_TYPE = {
  "ai_parent_report.released": "learning_report_homework",
  "homework_feedback.released_to_parent": "learning_report_homework",
  "homework_file.released_to_parent": "learning_report_homework",
  "student_attendance.arrived": "attendance_safety",
  "parent_comment.released": "parent_communication",
  "weekly_progress_report.released": "parent_communication",
  "fee_payment.proof_requested": "billing_invoice",
  "fee_payment.proof_verified": "billing_invoice",
  "fee_payment.proof_rejected": "billing_invoice",
};
const PARENT_NOTIFICATION_DEFAULT_ALLOW_BY_CATEGORY = {
  operational_service: true,
  attendance_safety: true,
  learning_report_homework: true,
  parent_communication: true,
  billing_invoice: true,
  media_photo: false,
  marketing_events: false,
};

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

/** Stable session-day key for attendance notification idempotency (YYYY-MM-DD when parseable). */
function normalizeAttendanceSessionDateKey(value) {
  if (value == null || value === "") return "";
  const s = trimString(String(value));
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  return s.slice(0, 32);
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

function normalizeJsonObject(value, { fieldName = "value", allowNull = true } = {}) {
  if (value == null) return allowNull ? null : {};
  if (typeof value !== "object" || Array.isArray(value)) {
    return { __error: `${fieldName} must be an object` };
  }
  return value;
}

function containsUnsafePathLikeValue(input) {
  if (input == null) return false;
  if (typeof input === "string") {
    const value = input.toLowerCase();
    return value.includes("/") || value.includes("\\") || value.includes("storage_path");
  }
  if (Array.isArray(input)) return input.some((item) => containsUnsafePathLikeValue(item));
  if (typeof input === "object") {
    return Object.entries(input).some(([key, value]) => {
      if (String(key).toLowerCase().includes("storage_path")) return true;
      return containsUnsafePathLikeValue(value);
    });
  }
  return false;
}

function sanitizeAiParentReportError(error, fallbackMessage) {
  return sanitizeServiceError(error, fallbackMessage);
}

function normalizeStudentIds(studentIds) {
  if (!Array.isArray(studentIds)) return [];
  const unique = new Set();
  for (const rawId of studentIds) {
    const normalized = trimString(rawId);
    if (!normalized) continue;
    unique.add(normalized);
  }
  return [...unique];
}

function normalizeAnnouncementTargets(targets) {
  if (!Array.isArray(targets)) return { rows: [], error: null };
  const rows = [];
  for (const target of targets) {
    const targetType = trimString(target?.targetType || target?.target_type);
    if (!ANNOUNCEMENT_TARGET_TYPE_VALUES.has(targetType)) {
      return { rows: [], error: { message: "Each targetType must be branch, role, profile, or class" } };
    }
    const branchId = trimString(target?.branchId || target?.branch_id);
    const targetProfileId = trimString(target?.targetProfileId || target?.target_profile_id);
    const targetRole = trimString(target?.targetRole || target?.target_role);
    if ((targetType === "branch" || targetType === "class") && !isUuidLike(branchId)) {
      return { rows: [], error: { message: `targetType ${targetType} requires branchId UUID` } };
    }
    if (targetType === "profile" && !isUuidLike(targetProfileId)) {
      return { rows: [], error: { message: "targetType profile requires targetProfileId UUID" } };
    }
    if (targetType === "role" && !targetRole) {
      return { rows: [], error: { message: "targetType role requires targetRole" } };
    }
    rows.push({
      target_type: targetType,
      branch_id: isUuidLike(branchId) ? branchId : null,
      target_profile_id: isUuidLike(targetProfileId) ? targetProfileId : null,
      target_role: targetRole || null,
    });
  }
  return { rows, error: null };
}

function normalizeCompanyNewsTargets(targets) {
  if (!Array.isArray(targets)) return { rows: [], error: null };
  const rows = [];
  for (const target of targets) {
    const targetType = trimString(target?.targetType || target?.target_type);
    if (!COMPANY_NEWS_TARGET_TYPE_VALUES.has(targetType)) {
      return { rows: [], error: { message: "Company News targets must be branch, role, or profile" } };
    }
    const branchId = trimString(target?.branchId || target?.branch_id);
    const targetProfileId = trimString(target?.targetProfileId || target?.target_profile_id);
    const targetRole = trimString(target?.targetRole || target?.target_role);
    if (targetType === "branch" && !isUuidLike(branchId)) {
      return { rows: [], error: { message: "targetType branch requires branchId UUID" } };
    }
    if (targetType === "profile" && !isUuidLike(targetProfileId)) {
      return { rows: [], error: { message: "targetType profile requires targetProfileId UUID" } };
    }
    if (targetType === "role" && !targetRole) {
      return { rows: [], error: { message: "targetType role requires targetRole" } };
    }
    rows.push({
      target_type: targetType,
      branch_id: isUuidLike(branchId) ? branchId : null,
      target_profile_id: isUuidLike(targetProfileId) ? targetProfileId : null,
      target_role: targetRole || null,
    });
  }
  return { rows, error: null };
}

function normalizeParentAnnouncementTargets(targets) {
  if (targets == null) return { rows: [], error: null };
  if (!Array.isArray(targets)) {
    return { rows: [], error: { message: "targets must be an array when provided" } };
  }

  const rows = [];
  for (const target of targets) {
    const targetType = trimString(target?.targetType || target?.target_type);
    if (!PARENT_ANNOUNCEMENT_TARGET_TYPE_VALUES.has(targetType)) {
      return { rows: [], error: { message: "Each targetType must be branch, class, or student" } };
    }

    const branchId = trimString(target?.branchId || target?.branch_id);
    const classId = trimString(target?.classId || target?.class_id);
    const studentId = trimString(target?.studentId || target?.student_id);

    if (targetType === "branch" && !isUuidLike(branchId)) {
      return { rows: [], error: { message: "targetType branch requires branchId UUID" } };
    }
    if (targetType === "class" && !isUuidLike(classId)) {
      return { rows: [], error: { message: "targetType class requires classId UUID" } };
    }
    if (targetType === "student" && !isUuidLike(studentId)) {
      return { rows: [], error: { message: "targetType student requires studentId UUID" } };
    }

    rows.push({
      target_type: targetType,
      branch_id: targetType === "branch" ? branchId : null,
      class_id: targetType === "class" ? classId : null,
      student_id: targetType === "student" ? studentId : null,
    });
  }

  return { rows, error: null };
}

function sanitizeServiceError(error, fallbackMessage) {
  if (!error) return { message: fallbackMessage };
  const message = trimString(error?.message);
  if (!message) return { message: fallbackMessage };
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return { message: fallbackMessage };
  }
  return { message };
}

function isDevRuntime() {
  try {
    if (typeof import.meta !== "undefined" && import.meta?.env) {
      return Boolean(import.meta.env.DEV);
    }
  } catch (_error) {
    // ignore import.meta access issues in non-browser contexts
  }
  return process?.env?.NODE_ENV !== "production";
}

function warnAuditFailureInDev(error, context = "") {
  if (!isDevRuntime()) return;
  const message = trimString(error?.message) || "unknown";
  // eslint-disable-next-line no-console
  console.warn(`[audit_events] ${context || "write failure"}: ${message}`);
}

export function warnNotificationFailureInDev(error, context = "") {
  if (!isDevRuntime()) return;
  const message = trimString(error?.message) || "unknown";
  // eslint-disable-next-line no-console
  console.warn(`[notifications] ${context || "write failure"}: ${message}`);
}

function sanitizeAuditValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    return value.trim().slice(0, AUDIT_MAX_STRING_LENGTH);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 6)
      .map((entry) => sanitizeAuditValue(entry))
      .filter((entry) => entry != null);
  }
  if (typeof value === "object") {
    return null;
  }
  return null;
}

function sanitizeAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  const entries = Object.entries(metadata).slice(0, AUDIT_MAX_METADATA_KEYS);
  const output = {};
  for (const [rawKey, rawValue] of entries) {
    const key = trimString(rawKey);
    if (!key || AUDIT_FORBIDDEN_METADATA_KEY_PATTERN.test(key)) {
      continue;
    }
    const safeValue = sanitizeAuditValue(rawValue);
    if (safeValue == null || safeValue === "") continue;
    output[key] = safeValue;
  }
  return output;
}

function resolveParentNotificationCategoryForEvent(eventType) {
  const key = trimString(eventType);
  return PARENT_NOTIFICATION_EVENT_CATEGORY_BY_TYPE[key] || null;
}

function defaultAllowForParentNotificationCategory(category) {
  const safeCategory = trimString(category);
  return Boolean(PARENT_NOTIFICATION_DEFAULT_ALLOW_BY_CATEGORY[safeCategory]);
}

async function getCurrentProfileRole() {
  const authRead = await supabase.auth.getUser();
  const profileId = authRead?.data?.user?.id || null;
  if (!isUuidLike(profileId)) {
    return { profileId: null, role: null, error: { message: "Authenticated user is required" } };
  }
  const roleRead = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", profileId)
    .maybeSingle();
  if (roleRead.error || !roleRead.data?.id) {
    return {
      profileId,
      role: null,
      error: roleRead.error || { message: "Profile role is unavailable" },
    };
  }
  return {
    profileId,
    role: trimString(roleRead.data.role) || null,
    error: null,
  };
}

export async function shouldSendParentInAppNotification({
  parentProfileId,
  studentId,
  category,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { allowed: false, reason: "supabase_not_configured" };
  }
  if (!isUuidLike(parentProfileId)) {
    return { allowed: false, reason: "invalid_parent_profile_id" };
  }
  if (!isUuidLike(studentId)) {
    return { allowed: false, reason: "invalid_student_id" };
  }
  const safeCategory = trimString(category);
  if (!PARENT_NOTIFICATION_PREFERENCE_CATEGORY_VALUES.has(safeCategory)) {
    return { allowed: false, reason: "invalid_category" };
  }

  try {
    const rpcResult = await supabase.rpc("should_send_parent_in_app_notification_042", {
      p_parent_profile_id: trimString(parentProfileId),
      p_student_id: trimString(studentId),
      p_category: safeCategory,
    });
    if (!rpcResult.error) {
      const rpcRows = Array.isArray(rpcResult.data) ? rpcResult.data : [];
      const first = rpcRows[0] || null;
      if (first && typeof first.allowed === "boolean") {
        return {
          allowed: first.allowed,
          reason: trimString(first.reason) || "rpc_decision",
        };
      }
      return { allowed: false, reason: "rpc_invalid_response" };
    }

    const rpcErrorCode = trimString(rpcResult.error?.code).toUpperCase();
    const rpcErrorMessage = trimString(rpcResult.error?.message).toLowerCase();
    const rpcMissing =
      rpcErrorCode === "PGRST202"
      || rpcErrorMessage.includes("could not find the function")
      || rpcErrorMessage.includes("does not exist");
    if (!rpcMissing) {
      return { allowed: false, reason: "rpc_error" };
    }
    warnNotificationFailureInDev(rpcResult.error, "shouldSendParentInAppNotification.rpc_missing_fallback");

    const preferenceRead = await supabase
      .from("parent_notification_preferences")
      .select("id,student_id,enabled,consent_status")
      .eq("parent_profile_id", trimString(parentProfileId))
      .eq("channel", "in_app")
      .eq("category", safeCategory)
      .or(`student_id.eq.${trimString(studentId)},student_id.is.null`);
    if (preferenceRead.error) {
      return { allowed: false, reason: "preference_read_error" };
    }

    const rows = Array.isArray(preferenceRead.data) ? preferenceRead.data : [];
    const childRow = rows.find((row) => trimString(row?.student_id) === trimString(studentId));
    const parentLevelRow = rows.find((row) => row?.student_id == null);
    const resolvedRow = childRow || parentLevelRow || null;
    if (!resolvedRow) {
      return {
        allowed: defaultAllowForParentNotificationCategory(safeCategory),
        reason: "default_no_row",
      };
    }

    const consentStatus = trimString(resolvedRow?.consent_status) || "not_set";
    if (resolvedRow?.enabled === false) return { allowed: false, reason: "explicit_disabled" };
    if (consentStatus === "withdrawn") return { allowed: false, reason: "explicit_withdrawn" };
    if (consentStatus === "consented" || consentStatus === "required_service" || consentStatus === "not_set") {
      return { allowed: true, reason: "explicit_allowed" };
    }
    return {
      allowed: defaultAllowForParentNotificationCategory(safeCategory),
      reason: "fallback_unknown_status",
    };
  } catch (_error) {
    return { allowed: false, reason: "preference_read_exception" };
  }
}

export async function recordAuditEvent({
  actionType,
  entityType,
  entityId,
  branchId,
  classId,
  studentId,
  metadata,
  includeResultRow = true,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  const safeActionType = trimString(actionType);
  const safeEntityType = trimString(entityType);
  if (!safeActionType) return { data: null, error: { message: "actionType is required" } };
  if (!safeEntityType) return { data: null, error: { message: "entityType is required" } };

  try {
    const { profileId, role, error: actorError } = await getCurrentProfileRole();
    if (actorError || !profileId) {
      return { data: null, error: actorError || { message: "Authenticated user is required" } };
    }

    const payload = {
      actor_profile_id: profileId,
      actor_role: role,
      action_type: safeActionType.slice(0, 120),
      entity_type: safeEntityType.slice(0, 80),
      entity_id: isUuidLike(entityId) ? trimString(entityId) : null,
      branch_id: isUuidLike(branchId) ? trimString(branchId) : null,
      class_id: isUuidLike(classId) ? trimString(classId) : null,
      student_id: isUuidLike(studentId) ? trimString(studentId) : null,
      metadata: sanitizeAuditMetadata(metadata),
      created_at: new Date().toISOString(),
    };

    if (!includeResultRow) {
      const writeOnlyResult = await supabase.from("audit_events").insert(payload);
      return { data: null, error: writeOnlyResult.error ?? null };
    }

    const insertResult = await supabase
      .from("audit_events")
      .insert(payload)
      .select("id,actor_profile_id,actor_role,action_type,entity_type,entity_id,branch_id,class_id,student_id,created_at")
      .maybeSingle();
    return { data: insertResult.data ?? null, error: insertResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

const AUTH_LIFECYCLE_ACTION_TYPES = new Set([
  "user.login",
  "user.logout",
  "user.session_timeout",
  "user.remember_me_enabled",
  "user.remember_me_disabled",
  "user.session_revoked",
]);

export async function recordAuthLifecycleAudit({
  actionType,
  role = null,
  rememberMeEnabled = null,
  reason = null,
  source = null,
  includeResultRow = true,
} = {}) {
  const safeActionType = trimString(actionType);
  if (!AUTH_LIFECYCLE_ACTION_TYPES.has(safeActionType)) {
    return { data: null, error: { message: "actionType is invalid" } };
  }
  const safeRole = trimString(role) || "unknown";
  const safeSource = trimString(source) || "unknown";
  const safeReason = trimString(reason) || "not_set";

  const result = await recordAuditEvent({
    actionType: safeActionType,
    entityType: "user_session",
    entityId: null,
    includeResultRow,
    metadata: {
      role: safeRole,
      rememberMeEnabled: typeof rememberMeEnabled === "boolean" ? rememberMeEnabled : null,
      reason: safeReason,
      source: safeSource,
    },
  });

  if (result.error) {
    warnAuditFailureInDev(result.error, `recordAuthLifecycleAudit.${safeActionType}`);
  }
  return result;
}

export async function createNotificationEvent({
  eventType,
  entityType,
  entityId,
  branchId,
  classId,
  studentId,
  status = "pending",
  metadata,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  const safeEventType = trimString(eventType);
  const safeEntityType = trimString(entityType);
  if (!safeEventType) return { data: null, error: { message: "eventType is required" } };
  if (!safeEntityType) return { data: null, error: { message: "entityType is required" } };
  if (!NOTIFICATION_EVENT_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "status is invalid" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const payload = {
      event_type: safeEventType.slice(0, 120),
      entity_type: safeEntityType.slice(0, 80),
      entity_id: isUuidLike(entityId) ? trimString(entityId) : null,
      branch_id: isUuidLike(branchId) ? trimString(branchId) : null,
      class_id: isUuidLike(classId) ? trimString(classId) : null,
      student_id: isUuidLike(studentId) ? trimString(studentId) : null,
      created_by_profile_id: profileId,
      status,
      metadata: sanitizeAuditMetadata(metadata),
      created_at: new Date().toISOString(),
    };

    const insertResult = await supabase
      .from("notification_events")
      .insert(payload)
      .select("id,event_type,entity_type,entity_id,branch_id,class_id,student_id,status,created_by_profile_id,created_at")
      .maybeSingle();
    return { data: insertResult.data ?? null, error: insertResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function createInAppNotification({
  eventId,
  recipientProfileId,
  recipientRole,
  branchId,
  classId,
  studentId,
  title,
  body,
  status = "pending",
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(recipientProfileId)) {
    return { data: null, error: { message: "recipientProfileId must be a UUID" } };
  }
  const safeTitle = trimString(title).slice(0, 240);
  if (!safeTitle) return { data: null, error: { message: "title is required" } };
  if (!NOTIFICATION_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "status is invalid" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const payload = {
      event_id: isUuidLike(eventId) ? trimString(eventId) : null,
      recipient_profile_id: trimString(recipientProfileId),
      recipient_role: normalizeNullableText(recipientRole, { maxLength: 40 }),
      branch_id: isUuidLike(branchId) ? trimString(branchId) : null,
      class_id: isUuidLike(classId) ? trimString(classId) : null,
      student_id: isUuidLike(studentId) ? trimString(studentId) : null,
      channel: "in_app",
      title: safeTitle,
      body: normalizeNullableText(body, { maxLength: 1200 }),
      status,
      created_by_profile_id: profileId,
      created_at: new Date().toISOString(),
    };

    const insertResult = await supabase
      .from("notifications")
      .insert(payload)
      .select("id,event_id,recipient_profile_id,recipient_role,branch_id,class_id,student_id,channel,title,body,status,read_at,created_by_profile_id,created_at")
      .maybeSingle();
    return { data: insertResult.data ?? null, error: insertResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function markNotificationRead({ notificationId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(notificationId)) {
    return { data: null, error: { message: "notificationId must be a UUID" } };
  }

  try {
    const nowIso = new Date().toISOString();
    const updateResult = await supabase
      .from("notifications")
      .update({
        read_at: nowIso,
        status: "read",
      })
      .eq("id", trimString(notificationId))
      .select("id,recipient_profile_id,status,read_at")
      .maybeSingle();
    return { data: updateResult.data ?? null, error: updateResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function upsertMyNotificationPreference({
  studentId = null,
  channel,
  category,
  enabled,
  consentStatus,
  consentSource,
  policyVersion,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  const safeChannel = trimString(channel);
  const safeCategory = trimString(category);
  if (!PARENT_NOTIFICATION_PREFERENCE_CHANNEL_VALUES.has(safeChannel)) {
    return { data: null, error: { message: "channel is invalid" } };
  }
  if (!PARENT_NOTIFICATION_PREFERENCE_CATEGORY_VALUES.has(safeCategory)) {
    return { data: null, error: { message: "category is invalid" } };
  }
  if (enabled != null && typeof enabled !== "boolean") {
    return { data: null, error: { message: "enabled must be a boolean when provided" } };
  }
  const safeConsentStatus = consentStatus == null || consentStatus === "" ? null : trimString(consentStatus);
  if (safeConsentStatus != null && !PARENT_NOTIFICATION_PREFERENCE_STATUS_VALUES.has(safeConsentStatus)) {
    return { data: null, error: { message: "consentStatus is invalid" } };
  }
  if (studentId != null && studentId !== "" && !isUuidLike(studentId)) {
    return { data: null, error: { message: "studentId must be a UUID when provided" } };
  }

  try {
    const { profileId, role, error: roleError } = await getCurrentProfileRole();
    if (roleError || !profileId) {
      return { data: null, error: roleError || { message: "Authenticated user is required" } };
    }
    if (role !== "parent") {
      return { data: null, error: { message: "Only parent profiles can update self notification preferences" } };
    }

    const normalizedStudentId = isUuidLike(studentId) ? trimString(studentId) : null;
    let existingQuery = supabase
      .from("parent_notification_preferences")
      .select("id,parent_profile_id,student_id,channel,category")
      .eq("parent_profile_id", profileId)
      .eq("channel", safeChannel)
      .eq("category", safeCategory)
      .limit(1);
    existingQuery = normalizedStudentId
      ? existingQuery.eq("student_id", normalizedStudentId)
      : existingQuery.is("student_id", null);

    const existingRead = await existingQuery.maybeSingle();
    if (existingRead.error) {
      return { data: null, error: existingRead.error };
    }

    const nowIso = new Date().toISOString();
    const payload = {
      enabled: typeof enabled === "boolean" ? enabled : true,
      consent_status: safeConsentStatus || "not_set",
      consent_source: normalizeNullableText(consentSource, { maxLength: 120 }),
      policy_version: normalizeNullableText(policyVersion, { maxLength: 80 }),
      updated_by_profile_id: profileId,
      updated_at: nowIso,
    };
    if (payload.consent_status === "withdrawn") {
      payload.withdrawn_at = nowIso;
    } else if (payload.consent_status === "consented") {
      payload.consented_at = nowIso;
      payload.withdrawn_at = null;
    }

    if (existingRead.data?.id) {
      const updateResult = await supabase
        .from("parent_notification_preferences")
        .update(payload)
        .eq("id", existingRead.data.id)
        .select(
          "id,parent_profile_id,student_id,channel,category,enabled,consent_status,consent_source,policy_version,consented_at,withdrawn_at,updated_by_profile_id,created_at,updated_at"
        )
        .maybeSingle();
      return { data: updateResult.data ?? null, error: updateResult.error ?? null };
    }

    const insertResult = await supabase
      .from("parent_notification_preferences")
      .insert({
        parent_profile_id: profileId,
        student_id: normalizedStudentId,
        channel: safeChannel,
        category: safeCategory,
        ...payload,
        created_at: nowIso,
      })
      .select(
        "id,parent_profile_id,student_id,channel,category,enabled,consent_status,consent_source,policy_version,consented_at,withdrawn_at,updated_by_profile_id,created_at,updated_at"
      )
      .maybeSingle();
    return { data: insertResult.data ?? null, error: insertResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function createMyPolicyAcknowledgement({
  policyKey,
  policyVersion,
  acknowledgementSource = "parent_portal_first_login",
  metadata = {},
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  const safePolicyKey = trimString(policyKey);
  const safePolicyVersion = trimString(policyVersion);
  const safeSource = trimString(acknowledgementSource) || "parent_portal_first_login";
  if (!PARENT_POLICY_ACKNOWLEDGEMENT_KEY_VALUES.has(safePolicyKey)) {
    return { data: null, error: { message: "policyKey is invalid" } };
  }
  if (!safePolicyVersion) {
    return { data: null, error: { message: "policyVersion is required" } };
  }
  if (!PARENT_POLICY_ACKNOWLEDGEMENT_SOURCE_VALUES.has(safeSource)) {
    return { data: null, error: { message: "acknowledgementSource is invalid" } };
  }
  if (metadata != null && (typeof metadata !== "object" || Array.isArray(metadata))) {
    return { data: null, error: { message: "metadata must be an object when provided" } };
  }

  try {
    const { profileId, role, error: roleError } = await getCurrentProfileRole();
    if (roleError || !profileId) {
      return { data: null, error: roleError || { message: "Authenticated user is required" } };
    }
    if (role !== "parent") {
      return { data: null, error: { message: "Only parent profiles can create self policy acknowledgement records" } };
    }

    const existingRead = await supabase
      .from("parent_policy_acknowledgements")
      .select("id,parent_profile_id,policy_key,policy_version,acknowledgement_source,acknowledged_at,created_at,metadata")
      .eq("parent_profile_id", profileId)
      .eq("policy_key", safePolicyKey)
      .eq("policy_version", safePolicyVersion)
      .limit(1)
      .maybeSingle();
    if (existingRead.error) {
      return { data: null, error: existingRead.error };
    }
    if (existingRead.data?.id) {
      return { data: existingRead.data, error: null };
    }

    const safeMetadata = sanitizeAuditMetadata(metadata);
    const nowIso = new Date().toISOString();
    const insertResult = await supabase
      .from("parent_policy_acknowledgements")
      .insert({
        parent_profile_id: profileId,
        policy_key: safePolicyKey,
        policy_version: safePolicyVersion.slice(0, 80),
        acknowledgement_source: safeSource,
        acknowledged_at: nowIso,
        created_at: nowIso,
        metadata: safeMetadata,
      })
      .select("id,parent_profile_id,policy_key,policy_version,acknowledgement_source,acknowledged_at,created_at,metadata")
      .maybeSingle();
    return { data: insertResult.data ?? null, error: insertResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function updateNotificationTemplate({
  templateId,
  titleTemplate,
  bodyTemplate,
  isActive,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(templateId)) {
    return { data: null, error: { message: "templateId must be a UUID" } };
  }
  if (typeof titleTemplate !== "string" || !trimString(titleTemplate)) {
    return { data: null, error: { message: "titleTemplate is required" } };
  }
  if (typeof bodyTemplate !== "string" || !trimString(bodyTemplate)) {
    return { data: null, error: { message: "bodyTemplate is required" } };
  }
  if (isActive != null && typeof isActive !== "boolean") {
    return { data: null, error: { message: "isActive must be a boolean when provided" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const payload = {
      title_template: trimString(titleTemplate).slice(0, 240),
      body_template: trimString(bodyTemplate).slice(0, 4000),
      updated_by_profile_id: profileId,
    };
    if (typeof isActive === "boolean") payload.is_active = isActive;

    const updateResult = await supabase
      .from("notification_templates")
      .update(payload)
      .eq("id", trimString(templateId))
      .select(
        "id,template_key,event_type,channel,title_template,body_template,allowed_variables,branch_id,is_active,created_by_profile_id,updated_by_profile_id,created_at,updated_at"
      )
      .maybeSingle();

    if (updateResult.error || !updateResult.data?.id) {
      return { data: null, error: updateResult.error || { message: "Unable to update notification template" } };
    }

    if (!NOTIFICATION_TEMPLATE_CHANNEL_VALUES.has(trimString(updateResult.data.channel))) {
      return { data: null, error: { message: "Template channel is invalid" } };
    }
    return { data: updateResult.data, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

function validateCompanyNewsInput({
  title,
  subtitle,
  body,
  priority,
  popupEnabled,
  popupEmoji,
  targets,
} = {}) {
  if (!trimString(title)) {
    return { ok: false, error: { message: "title is required" } };
  }

  const normalizedSubtitle = normalizeNullableText(subtitle, { maxLength: 240 });
  const normalizedBody = normalizeNullableText(body, { maxLength: 8000 });
  if (!normalizedSubtitle && !normalizedBody) {
    return { ok: false, error: { message: "body or subtitle is required" } };
  }

  const normalizedPriority = trimString(priority) || "normal";
  if (!ANNOUNCEMENT_PRIORITY_VALUES.has(normalizedPriority)) {
    return { ok: false, error: { message: "priority must be low, normal, high, or urgent" } };
  }

  if (popupEnabled != null && typeof popupEnabled !== "boolean") {
    return { ok: false, error: { message: "popupEnabled must be a boolean when provided" } };
  }

  const normalizedPopupEmoji = normalizeNullableText(popupEmoji, {
    maxLength: COMPANY_NEWS_MAX_POPUP_EMOJI_LENGTH,
  });
  if (
    popupEmoji != null &&
    typeof popupEmoji === "string" &&
    popupEmoji.trim() &&
    normalizedPopupEmoji !== popupEmoji.trim()
  ) {
    return {
      ok: false,
      error: { message: `popupEmoji must be at most ${COMPANY_NEWS_MAX_POPUP_EMOJI_LENGTH} characters` },
    };
  }
  if (popupEmoji != null && typeof popupEmoji !== "string") {
    return { ok: false, error: { message: "popupEmoji must be a string when provided" } };
  }

  const normalizedTargets = normalizeCompanyNewsTargets(targets);
  if (normalizedTargets.error) {
    return { ok: false, error: normalizedTargets.error };
  }

  return {
    ok: true,
    data: {
      normalizedTitle: trimString(title).slice(0, 240),
      normalizedSubtitle,
      normalizedBody,
      normalizedPriority,
      normalizedPopupEnabled: Boolean(popupEnabled),
      normalizedPopupEmoji,
      normalizedTargets: normalizedTargets.rows,
    },
  };
}

function validateParentAnnouncementInput({
  title,
  subtitle,
  body,
  announcementType,
  branchId,
  classId,
  eventStartAt,
  eventEndAt,
  location,
  targets,
} = {}) {
  const normalizedTitle = trimString(title).slice(0, 240);
  if (!normalizedTitle) {
    return { ok: false, error: { message: "title is required" } };
  }

  const normalizedBody = normalizeNullableText(body, { maxLength: 12000 });
  if (!normalizedBody) {
    return { ok: false, error: { message: "body is required" } };
  }

  const normalizedType = trimString(announcementType);
  if (!PARENT_ANNOUNCEMENT_TYPE_VALUES.has(normalizedType)) {
    return {
      ok: false,
      error: {
        message:
          "announcementType must be event, activity, centre_notice, holiday_closure, reminder, celebration, programme_update, parent_workshop, or graduation_concert",
      },
    };
  }

  if (branchId != null && branchId !== "" && !isUuidLike(branchId)) {
    return { ok: false, error: { message: "branchId must be a UUID when provided" } };
  }
  if (classId != null && classId !== "" && !isUuidLike(classId)) {
    return { ok: false, error: { message: "classId must be a UUID when provided" } };
  }

  const normalizedEventStartAt = normalizeNullableTimestamp(eventStartAt);
  if (eventStartAt != null && eventStartAt !== "" && !normalizedEventStartAt) {
    return { ok: false, error: { message: "eventStartAt must be a valid ISO datetime when provided" } };
  }
  const normalizedEventEndAt = normalizeNullableTimestamp(eventEndAt);
  if (eventEndAt != null && eventEndAt !== "" && !normalizedEventEndAt) {
    return { ok: false, error: { message: "eventEndAt must be a valid ISO datetime when provided" } };
  }
  if (
    normalizedEventStartAt &&
    normalizedEventEndAt &&
    Date.parse(normalizedEventEndAt) < Date.parse(normalizedEventStartAt)
  ) {
    return { ok: false, error: { message: "eventEndAt must be after or equal to eventStartAt" } };
  }

  const normalizedTargets = normalizeParentAnnouncementTargets(targets);
  if (normalizedTargets.error) {
    return { ok: false, error: normalizedTargets.error };
  }

  return {
    ok: true,
    data: {
      normalizedTitle,
      normalizedSubtitle: normalizeNullableText(subtitle, { maxLength: 240 }),
      normalizedBody,
      normalizedType,
      normalizedBranchId: isUuidLike(branchId) ? trimString(branchId) : null,
      normalizedClassId: isUuidLike(classId) ? trimString(classId) : null,
      normalizedEventStartAt,
      normalizedEventEndAt,
      normalizedLocation: normalizeNullableText(location, { maxLength: 240 }),
      normalizedTargets: normalizedTargets.rows,
    },
  };
}

function normalizeNullableTimestamp(value) {
  if (value == null) return null;
  const text = trimString(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
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

async function hasExistingAttendanceArrivalNotificationForSession({
  actorProfileId,
  recordId,
  sessionDateKey,
} = {}) {
  if (!isUuidLike(actorProfileId) || !isUuidLike(recordId) || !trimString(sessionDateKey)) {
    return false;
  }
  const read = await supabase
    .from("notification_events")
    .select("id,metadata")
    .eq("created_by_profile_id", trimString(actorProfileId))
    .eq("entity_type", "attendance_record")
    .eq("entity_id", trimString(recordId))
    .eq("event_type", STUDENT_ATTENDANCE_ARRIVED_EVENT_TYPE);
  if (read.error || !Array.isArray(read.data)) return false;
  const key = trimString(sessionDateKey);
  return read.data.some((row) => trimString(row?.metadata?.sessionDate) === key);
}

/**
 * Best-effort idempotency: same actor + attendance row + session calendar day (metadata.sessionDate).
 * Another staff member or deleted events may still duplicate — see docs.
 */
async function notifyLinkedParentsAfterAttendanceArrivalTransition({ attendanceRow } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: null, skipped: true };
  }
  if (!attendanceRow?.id || !isUuidLike(attendanceRow.student_id)) {
    return { error: null, skipped: true };
  }
  const newStatusRaw = trimString(String(attendanceRow.status));
  if (!ARRIVAL_ATTENDANCE_STATUS_VALUES.has(newStatusRaw)) {
    return { error: null, skipped: true };
  }

  const { profileId: actorProfileId, error: authError } = await getAuthenticatedProfileId();
  if (authError || !actorProfileId) {
    return { error: null, skipped: true };
  }

  const sessionDateKey = normalizeAttendanceSessionDateKey(attendanceRow.session_date);
  if (!sessionDateKey) {
    return { error: null, skipped: true };
  }

  const duplicate = await hasExistingAttendanceArrivalNotificationForSession({
    actorProfileId,
    recordId: attendanceRow.id,
    sessionDateKey,
  });
  if (duplicate) {
    return { error: null, skipped: true };
  }

  const recipientIds = await resolveParentProfileIdsForAiReportNotification(attendanceRow.student_id);
  if (recipientIds.length === 0) {
    return { error: null, skipped: true };
  }
  const allowedRecipientIds = [];
  for (const recipientProfileId of recipientIds) {
    const preferenceCheck = await shouldSendParentInAppNotification({
      parentProfileId: recipientProfileId,
      studentId: trimString(attendanceRow.student_id),
      category: "attendance_safety",
    });
    if (preferenceCheck.allowed) {
      allowedRecipientIds.push(recipientProfileId);
      continue;
    }
    warnNotificationFailureInDev(
      { message: `suppressed by parent preference (${preferenceCheck.reason})` },
      "notifyLinkedParentsAfterAttendanceArrivalTransition.preference",
    );
  }
  if (allowedRecipientIds.length === 0) {
    return { error: null, skipped: true };
  }

  const body =
    newStatusRaw === "present" ? ATTENDANCE_ARRIVAL_BODY_PRESENT : ATTENDANCE_ARRIVAL_BODY_LATE;

  const eventResult = await createNotificationEvent({
    eventType: STUDENT_ATTENDANCE_ARRIVED_EVENT_TYPE,
    entityType: "attendance_record",
    entityId: attendanceRow.id,
    branchId: isUuidLike(attendanceRow.branch_id) ? trimString(attendanceRow.branch_id) : null,
    classId: isUuidLike(attendanceRow.class_id) ? trimString(attendanceRow.class_id) : null,
    studentId: trimString(attendanceRow.student_id),
    status: "processed",
    metadata: {
      sessionDate: sessionDateKey,
      arrivalKind: newStatusRaw === "present" ? "present" : "late",
    },
  });
  if (eventResult.error || !eventResult.data?.id) {
    return { error: eventResult.error || { message: "Unable to record notification event." }, skipped: false };
  }

  const notificationEventId = eventResult.data.id;
  for (const recipientProfileId of allowedRecipientIds) {
    const rowResult = await createInAppNotification({
      eventId: notificationEventId,
      recipientProfileId,
      recipientRole: "parent",
      branchId: isUuidLike(attendanceRow.branch_id) ? trimString(attendanceRow.branch_id) : null,
      classId: isUuidLike(attendanceRow.class_id) ? trimString(attendanceRow.class_id) : null,
      studentId: trimString(attendanceRow.student_id),
      title: ATTENDANCE_ARRIVAL_NOTIFY_TITLE,
      body,
      status: "pending",
    });
    if (rowResult.error) {
      warnNotificationFailureInDev(rowResult.error, "notifyLinkedParentsAfterAttendanceArrivalTransition.row");
    }
  }

  return { error: null, skipped: false };
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
    const existingRead = await supabase
      .from("attendance_records")
      .select("id,status,student_id,branch_id,class_id,session_date")
      .eq("id", trimString(recordId))
      .maybeSingle();
    const previousStatusRaw =
      existingRead.data?.status != null ? trimString(String(existingRead.data.status)) : "";
    const previousWasArrival =
      Boolean(previousStatusRaw) && ARRIVAL_ATTENDANCE_STATUS_VALUES.has(previousStatusRaw);

    const { data, error } = await supabase
      .from("attendance_records")
      .update(payload)
      .eq("id", recordId)
      .select("id,branch_id,class_id,student_id,teacher_id,session_date,status,note,updated_at")
      .maybeSingle();
    if (!error && data?.id) {
      const auditResult = await recordAuditEvent({
        actionType: "student_attendance.updated",
        entityType: "attendance_record",
        entityId: data.id,
        branchId: data.branch_id,
        classId: data.class_id,
        studentId: data.student_id,
        metadata: {
          status: data.status,
          noteProvided: Boolean(data.note && String(data.note).trim()),
          sessionDate: data.session_date || null,
        },
      });
      if (auditResult.error) {
        warnAuditFailureInDev(auditResult.error, "updateAttendanceRecord");
      }

      const newStatusRaw = trimString(String(data.status));
      const newIsArrival = ARRIVAL_ATTENDANCE_STATUS_VALUES.has(newStatusRaw);
      const transitionedIntoArrival = newIsArrival && !previousWasArrival;
      if (transitionedIntoArrival) {
        const notifyResult = await notifyLinkedParentsAfterAttendanceArrivalTransition({
          attendanceRow: data,
        });
        if (notifyResult?.error) {
          warnNotificationFailureInDev(notifyResult.error, "updateAttendanceRecord");
        }
      }
    }
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

    if (!error && data?.id) {
      const auditResult = await recordAuditEvent({
        actionType: "parent_comment.released",
        entityType: "parent_comment",
        entityId: data.id,
        branchId: data.branch_id,
        classId: data.class_id,
        studentId: data.student_id,
        metadata: {
          status: data.status,
        },
      });
      if (auditResult.error) {
        warnAuditFailureInDev(auditResult.error, "releaseParentComment");
      }

      const notifyResult = await notifyLinkedParentsAfterParentCommunicationStaffRelease({
        entityType: "parent_comment",
        entityId: data.id,
        eventType: PARENT_COMMENT_RELEASED_NOTIFICATION_EVENT_TYPE,
        studentId: data.student_id,
        branchId: data.branch_id,
        classId: data.class_id,
        metadata: { communicationKind: "parent_comment" },
      });
      if (notifyResult?.error) {
        warnNotificationFailureInDev(notifyResult.error, "releaseParentComment");
      }
    }
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

    if (!error && data?.id) {
      const notifyResult = await notifyLinkedParentsAfterParentCommunicationStaffRelease({
        entityType: "weekly_progress_report",
        entityId: data.id,
        eventType: WEEKLY_PROGRESS_REPORT_RELEASED_NOTIFICATION_EVENT_TYPE,
        studentId: data.student_id,
        branchId: data.branch_id,
        classId: data.class_id,
        metadata: { communicationKind: "weekly_progress_report" },
      });
      if (notifyResult?.error) {
        warnNotificationFailureInDev(notifyResult.error, "releaseWeeklyProgressReport");
      }
    }

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
    if (!error && data?.id) {
      const submissionRead = await supabase
        .from("homework_submissions")
        .select("id,homework_task_id,branch_id,class_id,student_id")
        .eq("id", data.homework_submission_id)
        .maybeSingle();
      const submissionData = submissionRead.error ? null : submissionRead.data;
      const auditResult = await recordAuditEvent({
        actionType: "homework_feedback.released_to_parent",
        entityType: "homework_feedback",
        entityId: data.id,
        branchId: submissionData?.branch_id || null,
        classId: submissionData?.class_id || null,
        studentId: submissionData?.student_id || null,
        metadata: {
          submissionId: data.homework_submission_id,
          homeworkTaskId: submissionData?.homework_task_id || null,
          status: data.status,
        },
      });
      if (auditResult.error) {
        warnAuditFailureInDev(auditResult.error, "releaseHomeworkFeedbackToParent");
      }
      const notifyResult = await notifyLinkedParentsAfterHomeworkFeedbackStaffRelease({
        homeworkFeedbackId: data.id,
        submissionScope: submissionData,
      });
      if (notifyResult?.error) {
        warnNotificationFailureInDev(notifyResult.error, "releaseHomeworkFeedbackToParent");
      }
    }
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Create homework task with optional selected/individual assignee rows.
 * Uses anon client + current JWT only (no service role).
 */
export async function createHomeworkTaskWithAssignees({
  branchId,
  classId,
  title,
  instructions,
  subject,
  dueDate,
  assignmentScope = "class",
  studentIds,
  notes,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(branchId)) return { data: null, error: { message: "branchId must be a UUID" } };
  if (!isUuidLike(classId)) return { data: null, error: { message: "classId must be a UUID" } };
  if (!trimString(title)) return { data: null, error: { message: "title is required" } };

  const normalizedScope = trimString(assignmentScope) || "class";
  if (!HOMEWORK_ASSIGNMENT_SCOPE_VALUES.has(normalizedScope)) {
    return { data: null, error: { message: "assignmentScope must be class, selected_students, or individual" } };
  }

  const normalizedDueDate = normalizeNullableDate(dueDate);
  if (dueDate != null && normalizedDueDate == null) {
    return { data: null, error: { message: "dueDate must be YYYY-MM-DD when provided" } };
  }

  const dedupedStudentIds = normalizeStudentIds(studentIds);
  if (dedupedStudentIds.some((id) => !isUuidLike(id))) {
    return { data: null, error: { message: "studentIds must contain UUID values only" } };
  }
  if (normalizedScope === "selected_students" && dedupedStudentIds.length === 0) {
    return { data: null, error: { message: "selected_students assignmentScope requires at least one studentId" } };
  }
  if (normalizedScope === "individual" && dedupedStudentIds.length !== 1) {
    return { data: null, error: { message: "individual assignmentScope requires exactly one studentId" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const taskInsert = await supabase
      .from("homework_tasks")
      .insert({
        branch_id: trimString(branchId),
        class_id: trimString(classId),
        created_by_profile_id: profileId,
        title: trimString(title).slice(0, 240),
        instructions: normalizeNullableText(instructions, { maxLength: 4000 }),
        subject: normalizeNullableText(subject, { maxLength: 120 }),
        due_date: normalizedDueDate,
        status: "assigned",
        assignment_scope: normalizedScope,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id,branch_id,class_id,created_by_profile_id,title,instructions,subject,due_date,status,assignment_scope,created_at,updated_at")
      .maybeSingle();

    if (taskInsert.error || !taskInsert.data?.id) {
      return { data: null, error: taskInsert.error || { message: "Unable to create homework task" } };
    }

    const shouldInsertAssignees = normalizedScope === "selected_students" || normalizedScope === "individual";
    if (!shouldInsertAssignees) {
      return { data: { task: taskInsert.data, assignees: [] }, error: null };
    }

    const assigneeRows = dedupedStudentIds.map((studentId) => ({
      homework_task_id: taskInsert.data.id,
      branch_id: trimString(branchId),
      class_id: trimString(classId),
      student_id: trimString(studentId),
      assigned_by_profile_id: profileId,
      assignment_status: "assigned",
      due_date: normalizedDueDate,
      notes: normalizeNullableText(notes, { maxLength: 2000 }),
      created_at: nowIso,
      updated_at: nowIso,
    }));

    const assigneeInsert = await supabase
      .from("homework_task_assignees")
      .insert(assigneeRows)
      .select("id,homework_task_id,branch_id,class_id,student_id,assigned_by_profile_id,assignment_status,due_date,notes,created_at,updated_at");

    if (assigneeInsert.error) {
      return {
        data: { task: taskInsert.data, assignees: [] },
        error: {
          message: assigneeInsert.error.message || "Task created but assignee insert failed",
          rollback_note: "No service-role cleanup or rollback is performed in this flow.",
        },
      };
    }

    return {
      data: {
        task: taskInsert.data,
        assignees: Array.isArray(assigneeInsert.data) ? assigneeInsert.data : [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

/**
 * Add assignee rows to an existing homework task without destructive edits.
 * Uses anon client + current JWT only (no service role).
 */
export async function assignHomeworkTaskToStudents({
  homeworkTaskId,
  branchId,
  classId,
  studentIds,
  dueDate,
  notes,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkTaskId)) {
    return { data: null, error: { message: "homeworkTaskId must be a UUID" } };
  }
  if (!isUuidLike(branchId)) return { data: null, error: { message: "branchId must be a UUID" } };
  if (!isUuidLike(classId)) return { data: null, error: { message: "classId must be a UUID" } };

  const dedupedStudentIds = normalizeStudentIds(studentIds);
  if (dedupedStudentIds.length === 0) {
    return { data: null, error: { message: "studentIds must include at least one UUID" } };
  }
  if (dedupedStudentIds.some((id) => !isUuidLike(id))) {
    return { data: null, error: { message: "studentIds must contain UUID values only" } };
  }

  const normalizedDueDate = normalizeNullableDate(dueDate);
  if (dueDate != null && normalizedDueDate == null) {
    return { data: null, error: { message: "dueDate must be YYYY-MM-DD when provided" } };
  }
  if (!HOMEWORK_ASSIGNEE_STATUS_VALUES.has("assigned")) {
    return { data: null, error: { message: "Invalid default assignment status value" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const rows = dedupedStudentIds.map((studentId) => ({
      homework_task_id: trimString(homeworkTaskId),
      branch_id: trimString(branchId),
      class_id: trimString(classId),
      student_id: trimString(studentId),
      assigned_by_profile_id: profileId,
      assignment_status: "assigned",
      due_date: normalizedDueDate,
      notes: normalizeNullableText(notes, { maxLength: 2000 }),
      created_at: nowIso,
      updated_at: nowIso,
    }));

    const insertResult = await supabase
      .from("homework_task_assignees")
      .upsert(rows, {
        onConflict: "homework_task_id,student_id",
        ignoreDuplicates: true,
      })
      .select("id,homework_task_id,branch_id,class_id,student_id,assigned_by_profile_id,assignment_status,due_date,notes,created_at,updated_at");

    if (insertResult.error) {
      return { data: null, error: insertResult.error };
    }

    return {
      data: {
        homeworkTaskId: trimString(homeworkTaskId),
        assignees: Array.isArray(insertResult.data) ? insertResult.data : [],
      },
      error: null,
    };
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
 * Request parent payment proof upload (exception path) without changing fee status.
 * Message-only in-app notification; no email/pdf/attachments.
 */
export async function requestFeePaymentProof({ feeRecordId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!feeRecordId || typeof feeRecordId !== "string") {
    return { data: null, error: { message: "feeRecordId is required" } };
  }

  try {
    const feeRead = await supabase
      .from("fee_records")
      .select("id,branch_id,class_id,student_id,verification_status")
      .eq("id", trimString(feeRecordId))
      .maybeSingle();
    if (feeRead.error || !feeRead.data?.id) {
      return { data: null, error: feeRead.error || { message: "Fee record not visible for proof request" } };
    }

    const row = feeRead.data;
    const auditResult = await recordAuditEvent({
      actionType: "fee_payment_proof.requested",
      entityType: "fee_record",
      entityId: row.id,
      branchId: row.branch_id,
      classId: row.class_id,
      studentId: row.student_id,
      metadata: {
        requestKind: "payment_proof",
        verificationStatus: row.verification_status || null,
      },
    });
    if (auditResult.error) {
      warnAuditFailureInDev(auditResult.error, "requestFeePaymentProof");
    }

    const notifyResult = await notifyLinkedParentsAfterFeeProofStaffDecision({
      feeRecordRow: row,
      eventType: FEE_PAYMENT_PROOF_REQUESTED_EVENT_TYPE,
      metadata: { requestKind: "payment_proof" },
    });
    if (notifyResult?.error) {
      warnNotificationFailureInDev(notifyResult.error, "requestFeePaymentProof");
    }

    return { data: row, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
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
      .select(
        "id,branch_id,class_id,student_id,verification_status,verified_by_profile_id,verified_at,internal_note,updated_at"
      )
      .maybeSingle();
    if (!error && data?.id) {
      const auditResult = await recordAuditEvent({
        actionType: "fee_payment_proof.verified",
        entityType: "fee_record",
        entityId: data.id,
        branchId: data.branch_id,
        metadata: {
          verificationStatus: data.verification_status,
          decision: "verified",
          hasInternalNote: Boolean(data.internal_note && String(data.internal_note).trim()),
        },
      });
      if (auditResult.error) {
        warnAuditFailureInDev(auditResult.error, "verifyFeeReceipt");
      }
      const notifyResult = await notifyLinkedParentsAfterFeeProofStaffDecision({
        feeRecordRow: data,
        eventType: FEE_PAYMENT_PROOF_VERIFIED_EVENT_TYPE,
      });
      if (notifyResult?.error) {
        warnNotificationFailureInDev(notifyResult.error, "verifyFeeReceipt");
      }
    }
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
      .select(
        "id,branch_id,class_id,student_id,verification_status,verified_by_profile_id,verified_at,internal_note,updated_at"
      )
      .maybeSingle();
    if (!error && data?.id) {
      const auditResult = await recordAuditEvent({
        actionType: "fee_payment_proof.rejected",
        entityType: "fee_record",
        entityId: data.id,
        branchId: data.branch_id,
        metadata: {
          verificationStatus: data.verification_status,
          decision: "rejected",
          hasInternalNote: Boolean(data.internal_note && String(data.internal_note).trim()),
        },
      });
      if (auditResult.error) {
        warnAuditFailureInDev(auditResult.error, "rejectFeeReceipt");
      }
      const notifyResult = await notifyLinkedParentsAfterFeeProofStaffDecision({
        feeRecordRow: data,
        eventType: FEE_PAYMENT_PROOF_REJECTED_EVENT_TYPE,
      });
      if (notifyResult?.error) {
        warnNotificationFailureInDev(notifyResult.error, "rejectFeeReceipt");
      }
    }
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
    if (!error && data?.id) {
      const auditResult = await recordAuditEvent({
        actionType: "class_memory.released",
        entityType: "class_memory",
        entityId: data.id,
        branchId: data.branch_id,
        classId: data.class_id,
        studentId: data.student_id,
        metadata: {
          visibilityStatus: data.visibility_status,
          visibleToParents: Boolean(data.visible_to_parents),
        },
      });
      if (auditResult.error) {
        warnAuditFailureInDev(auditResult.error, "approveClassMemory");
      }
    }
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

export async function createAnnouncementRequest({
  branchId,
  title,
  subtitle,
  body,
  priority = "normal",
  dueDate,
  requiresResponse = false,
  requiresUpload = false,
  targets = [],
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (branchId != null && branchId !== "" && !isUuidLike(branchId)) {
    return { data: null, error: { message: "branchId must be a UUID when provided" } };
  }
  if (!trimString(title)) {
    return { data: null, error: { message: "title is required" } };
  }
  const normalizedPriority = trimString(priority) || "normal";
  if (!ANNOUNCEMENT_PRIORITY_VALUES.has(normalizedPriority)) {
    return { data: null, error: { message: "priority must be low, normal, high, or urgent" } };
  }
  const normalizedDueDate = normalizeNullableDate(dueDate);
  if (dueDate != null && normalizedDueDate == null) {
    return { data: null, error: { message: "dueDate must be YYYY-MM-DD when provided" } };
  }
  const normalizedTargets = normalizeAnnouncementTargets(targets);
  if (normalizedTargets.error) {
    return { data: null, error: normalizedTargets.error };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const insertPayload = {
      branch_id: isUuidLike(branchId) ? trimString(branchId) : null,
      created_by_profile_id: profileId,
      announcement_type: "request",
      title: trimString(title).slice(0, 240),
      subtitle: normalizeNullableText(subtitle, { maxLength: 240 }),
      body: normalizeNullableText(body, { maxLength: 8000 }),
      priority: normalizedPriority,
      status: "draft",
      audience_type: "internal_staff",
      due_date: normalizedDueDate,
      requires_response: Boolean(requiresResponse),
      requires_upload: Boolean(requiresUpload),
      popup_enabled: false,
      popup_emoji: null,
      created_at: nowIso,
      updated_at: nowIso,
      published_at: null,
    };
    const announcementInsert = await supabase
      .from("announcements")
      .insert(insertPayload)
      .select("id,branch_id,created_by_profile_id,announcement_type,title,priority,status,audience_type,due_date,requires_response,requires_upload,created_at,updated_at,published_at")
      .maybeSingle();

    if (announcementInsert.error || !announcementInsert.data?.id) {
      return { data: null, error: announcementInsert.error || { message: "Unable to create announcement request" } };
    }

    if (normalizedTargets.rows.length === 0) {
      return { data: { announcement: announcementInsert.data, targets: [] }, error: null };
    }

    const targetRows = normalizedTargets.rows.map((row) => ({
      announcement_id: announcementInsert.data.id,
      ...row,
      created_at: nowIso,
    }));
    const targetsInsert = await supabase
      .from("announcement_targets")
      .insert(targetRows)
      .select("id,announcement_id,target_type,branch_id,target_profile_id,target_role,created_at");
    if (targetsInsert.error) {
      return {
        data: { announcement: announcementInsert.data, targets: [] },
        error: { message: targetsInsert.error?.message || "Announcement created but targets insert failed" },
      };
    }
    return {
      data: {
        announcement: announcementInsert.data,
        targets: Array.isArray(targetsInsert.data) ? targetsInsert.data : [],
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function publishAnnouncement({ announcementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: null, error: { message: "announcementId must be a UUID" } };
  }

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("announcements")
      .update({
        status: "published",
        published_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", trimString(announcementId))
      .select("id,branch_id,created_by_profile_id,status,published_at,updated_at")
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function createCompanyNews({
  title,
  subtitle,
  body,
  priority = "normal",
  popupEnabled = false,
  popupEmoji,
  targets = [],
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  const validation = validateCompanyNewsInput({
    title,
    subtitle,
    body,
    priority,
    popupEnabled,
    popupEmoji,
    targets,
  });
  if (!validation.ok) return { data: null, error: validation.error };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const {
      normalizedTitle,
      normalizedSubtitle,
      normalizedBody,
      normalizedPriority,
      normalizedPopupEnabled,
      normalizedPopupEmoji,
      normalizedTargets,
    } = validation.data;

    const announcementInsert = await supabase
      .from("announcements")
      .insert({
        branch_id: null,
        created_by_profile_id: profileId,
        announcement_type: "company_news",
        title: normalizedTitle,
        subtitle: normalizedSubtitle,
        body: normalizedBody,
        priority: normalizedPriority,
        status: "draft",
        audience_type: "internal_staff",
        due_date: null,
        requires_response: false,
        requires_upload: false,
        popup_enabled: normalizedPopupEnabled,
        popup_emoji: normalizedPopupEmoji,
        created_at: nowIso,
        updated_at: nowIso,
        published_at: null,
      })
      .select(
        "id,branch_id,created_by_profile_id,announcement_type,title,subtitle,body,priority,status,audience_type,requires_response,requires_upload,popup_enabled,popup_emoji,created_at,updated_at,published_at"
      )
      .maybeSingle();

    if (announcementInsert.error || !announcementInsert.data?.id) {
      return {
        data: null,
        error: sanitizeServiceError(announcementInsert.error, "Unable to create Company News draft right now."),
      };
    }

    if (normalizedTargets.length === 0) {
      return {
        data: {
          announcement: announcementInsert.data,
          targets: [],
          requires_targeting_before_publish: true,
        },
        error: null,
      };
    }

    const targetRows = normalizedTargets.map((row) => ({
      announcement_id: announcementInsert.data.id,
      ...row,
      created_at: nowIso,
    }));
    const targetsInsert = await supabase
      .from("announcement_targets")
      .insert(targetRows)
      .select("id,announcement_id,target_type,branch_id,target_profile_id,target_role,created_at");

    if (targetsInsert.error) {
      const cleanupResult = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementInsert.data.id)
        .select("id")
        .maybeSingle();
      return {
        data: { announcement: announcementInsert.data, targets: [] },
        error: {
          message: "Company News draft was created but targets failed to save.",
          cleanup_warning: cleanupResult.error
            ? "Automatic cleanup was blocked by RLS; manual cleanup may be required."
            : null,
        },
      };
    }

    return {
      data: {
        announcement: announcementInsert.data,
        targets: Array.isArray(targetsInsert.data) ? targetsInsert.data : [],
        requires_targeting_before_publish: false,
      },
      error: null,
    };
  } catch (_err) {
    return { data: null, error: { message: "Unable to create Company News draft right now." } };
  }
}

export async function publishCompanyNews({ announcementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: null, error: { message: "announcementId must be a UUID" } };
  }

  try {
    const rowRead = await supabase
      .from("announcements")
      .select("id,announcement_type,audience_type,status")
      .eq("id", trimString(announcementId))
      .maybeSingle();
    if (rowRead.error || !rowRead.data?.id) {
      return { data: null, error: { message: "Unable to publish Company News right now." } };
    }
    if (rowRead.data.announcement_type !== "company_news" || rowRead.data.audience_type !== "internal_staff") {
      return { data: null, error: { message: "Only internal Company News can be published with this method." } };
    }
    if (rowRead.data.status !== "draft" && rowRead.data.status !== "published") {
      return { data: null, error: { message: "Company News must be draft or published to continue." } };
    }

    const targetRead = await supabase
      .from("announcement_targets")
      .select("id")
      .eq("announcement_id", trimString(announcementId))
      .limit(1);
    if (targetRead.error) {
      return { data: null, error: { message: "Unable to validate Company News targets right now." } };
    }
    if (!Array.isArray(targetRead.data) || targetRead.data.length === 0) {
      return { data: null, error: { message: "At least one internal target is required before publish." } };
    }

    const published = await publishAnnouncement({ announcementId });
    if (published.error) {
      return { data: null, error: sanitizeServiceError(published.error, "Unable to publish Company News right now.") };
    }
    return { data: published.data ?? null, error: null };
  } catch (_err) {
    return { data: null, error: { message: "Unable to publish Company News right now." } };
  }
}

export async function createParentAnnouncement({
  title,
  subtitle,
  body,
  announcementType,
  branchId,
  classId,
  eventStartAt,
  eventEndAt,
  location,
  targets,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  const validation = validateParentAnnouncementInput({
    title,
    subtitle,
    body,
    announcementType,
    branchId,
    classId,
    eventStartAt,
    eventEndAt,
    location,
    targets,
  });
  if (!validation.ok) return { data: null, error: validation.error };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const {
      normalizedTitle,
      normalizedSubtitle,
      normalizedBody,
      normalizedType,
      normalizedBranchId,
      normalizedClassId,
      normalizedEventStartAt,
      normalizedEventEndAt,
      normalizedLocation,
      normalizedTargets,
    } = validation.data;

    const announcementInsert = await supabase
      .from("parent_announcements")
      .insert({
        title: normalizedTitle,
        subtitle: normalizedSubtitle,
        body: normalizedBody,
        announcement_type: normalizedType,
        branch_id: normalizedBranchId,
        class_id: normalizedClassId,
        status: "draft",
        publish_at: null,
        published_at: null,
        event_start_at: normalizedEventStartAt,
        event_end_at: normalizedEventEndAt,
        location: normalizedLocation,
        created_by_profile_id: profileId,
        updated_by_profile_id: profileId,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(
        "id,title,subtitle,body,announcement_type,status,branch_id,class_id,publish_at,published_at,event_start_at,event_end_at,location,created_by_profile_id,updated_by_profile_id,created_at,updated_at"
      )
      .maybeSingle();

    if (announcementInsert.error || !announcementInsert.data?.id) {
      return {
        data: null,
        error: sanitizeServiceError(announcementInsert.error, "Unable to create parent announcement draft right now."),
      };
    }

    if (normalizedTargets.length === 0) {
      return {
        data: {
          announcement: announcementInsert.data,
          targets: [],
          requires_targeting_before_publish: true,
        },
        error: null,
      };
    }

    const targetRows = normalizedTargets.map((row) => ({
      parent_announcement_id: announcementInsert.data.id,
      ...row,
      created_at: nowIso,
    }));
    const targetsInsert = await supabase
      .from("parent_announcement_targets")
      .insert(targetRows)
      .select("id,parent_announcement_id,target_type,branch_id,class_id,student_id,created_at");

    if (targetsInsert.error) {
      const cleanupResult = await supabase
        .from("parent_announcements")
        .delete()
        .eq("id", announcementInsert.data.id)
        .select("id")
        .maybeSingle();

      return {
        data: { announcement: announcementInsert.data, targets: [] },
        error: {
          message: "Parent announcement draft was created but targets failed to save.",
          cleanup_warning: cleanupResult.error
            ? "Automatic cleanup was blocked by RLS; manual cleanup may be required."
            : null,
        },
      };
    }

    return {
      data: {
        announcement: announcementInsert.data,
        targets: Array.isArray(targetsInsert.data) ? targetsInsert.data : [],
        requires_targeting_before_publish: false,
      },
      error: null,
    };
  } catch (_err) {
    return { data: null, error: { message: "Unable to create parent announcement draft right now." } };
  }
}

export async function publishParentAnnouncement({ parentAnnouncementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(parentAnnouncementId)) {
    return { data: null, error: { message: "parentAnnouncementId must be a UUID" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const rowRead = await supabase
      .from("parent_announcements")
      .select("id,status")
      .eq("id", trimString(parentAnnouncementId))
      .maybeSingle();
    if (rowRead.error || !rowRead.data?.id) {
      return { data: null, error: { message: "Unable to publish parent announcement right now." } };
    }
    if (rowRead.data.status !== "draft" && rowRead.data.status !== "published") {
      return { data: null, error: { message: "Parent announcement must be draft or published to continue." } };
    }

    const targetRead = await supabase
      .from("parent_announcement_targets")
      .select("id")
      .eq("parent_announcement_id", trimString(parentAnnouncementId))
      .limit(1);
    if (targetRead.error) {
      return { data: null, error: { message: "Unable to validate parent announcement targets right now." } };
    }
    if (!Array.isArray(targetRead.data) || targetRead.data.length === 0) {
      return { data: null, error: { message: "At least one target is required before publish." } };
    }

    const nowIso = new Date().toISOString();
    const publishResult = await supabase
      .from("parent_announcements")
      .update({
        status: "published",
        published_at: nowIso,
        updated_at: nowIso,
        updated_by_profile_id: profileId,
      })
      .eq("id", trimString(parentAnnouncementId))
      .select(
        "id,title,announcement_type,status,branch_id,class_id,published_at,event_start_at,event_end_at,location,updated_by_profile_id,updated_at"
      )
      .maybeSingle();

    if (publishResult.error || !publishResult.data?.id) {
      return {
        data: null,
        error: sanitizeServiceError(publishResult.error, "Unable to publish parent announcement right now."),
      };
    }
    return { data: publishResult.data, error: null };
  } catch (_err) {
    return { data: null, error: { message: "Unable to publish parent announcement right now." } };
  }
}

export async function archiveParentAnnouncement({ parentAnnouncementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(parentAnnouncementId)) {
    return { data: null, error: { message: "parentAnnouncementId must be a UUID" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const archiveResult = await supabase
      .from("parent_announcements")
      .update({
        status: "archived",
        updated_at: nowIso,
        updated_by_profile_id: profileId,
      })
      .eq("id", trimString(parentAnnouncementId))
      .select("id,status,updated_by_profile_id,updated_at")
      .maybeSingle();

    if (archiveResult.error || !archiveResult.data?.id) {
      return {
        data: null,
        error: sanitizeServiceError(archiveResult.error, "Unable to archive parent announcement right now."),
      };
    }
    return { data: archiveResult.data, error: null };
  } catch (_err) {
    return { data: null, error: { message: "Unable to archive parent announcement right now." } };
  }
}

export async function markParentAnnouncementRead({ parentAnnouncementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(parentAnnouncementId)) {
    return { data: null, error: { message: "parentAnnouncementId must be a UUID" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    // Touch visibility path first; relies fully on RLS for published/targeted access.
    const accessRead = await supabase
      .from("parent_announcements")
      .select("id")
      .eq("id", trimString(parentAnnouncementId))
      .maybeSingle();
    if (accessRead.error || !accessRead.data?.id) {
      return { data: null, error: { message: "Unable to mark parent announcement read right now." } };
    }

    const nowIso = new Date().toISOString();
    const upsertResult = await supabase
      .from("parent_announcement_read_receipts")
      .upsert(
        {
          parent_announcement_id: trimString(parentAnnouncementId),
          guardian_profile_id: profileId,
          read_at: nowIso,
          last_seen_at: nowIso,
          updated_at: nowIso,
        },
        {
          onConflict: "parent_announcement_id,guardian_profile_id",
        }
      )
      .select(
        "id,parent_announcement_id,guardian_profile_id,read_at,last_seen_at,created_at,updated_at"
      )
      .maybeSingle();

    if (upsertResult.error || !upsertResult.data?.id) {
      return {
        data: null,
        error: sanitizeServiceError(upsertResult.error, "Unable to mark parent announcement read right now."),
      };
    }

    return { data: upsertResult.data, error: null };
  } catch (_err) {
    return { data: null, error: { message: "Unable to mark parent announcement read right now." } };
  }
}

async function validateCompanyNewsPopupAnnouncement(announcementId) {
  const readResult = await supabase
    .from("announcements")
    .select("id,announcement_type,audience_type,status,popup_enabled")
    .eq("id", trimString(announcementId))
    .maybeSingle();

  if (readResult.error || !readResult.data?.id) {
    return { data: null, error: { message: "Unable to update Company News popup status right now." } };
  }

  const row = readResult.data;
  if (
    row.announcement_type !== "company_news" ||
    row.audience_type !== "internal_staff" ||
    row.status !== "published" ||
    row.popup_enabled !== true
  ) {
    return { data: null, error: { message: "Announcement is not eligible for Company News popup updates." } };
  }

  return { data: row, error: null };
}

async function upsertOwnCompanyNewsPopupStatus({
  announcementId,
  profileId,
  popupSeenAt,
  popupDismissedAt,
  popupLastShownAt,
} = {}) {
  const existingRead = await supabase
    .from("announcement_statuses")
    .select(
      "id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,popup_seen_at,popup_dismissed_at,popup_last_shown_at,created_at,updated_at"
    )
    .eq("announcement_id", trimString(announcementId))
    .eq("profile_id", profileId)
    .maybeSingle();
  if (existingRead.error && existingRead.error.code !== "PGRST116") {
    return { data: null, error: { message: "Unable to update Company News popup status right now." } };
  }

  const nowIso = new Date().toISOString();
  if (existingRead.data?.id) {
    const updatePayload = {
      popup_seen_at: popupSeenAt ?? existingRead.data.popup_seen_at ?? null,
      popup_dismissed_at: popupDismissedAt ?? existingRead.data.popup_dismissed_at ?? null,
      popup_last_shown_at: popupLastShownAt ?? nowIso,
      updated_at: nowIso,
    };
    const updateResult = await supabase
      .from("announcement_statuses")
      .update(updatePayload)
      .eq("id", existingRead.data.id)
      .select(
        "id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,popup_seen_at,popup_dismissed_at,popup_last_shown_at,created_at,updated_at"
      )
      .maybeSingle();
    if (updateResult.error) {
      return { data: null, error: { message: "Unable to update Company News popup status right now." } };
    }
    return { data: updateResult.data ?? null, error: null };
  }

  const insertPayload = {
    announcement_id: trimString(announcementId),
    profile_id: profileId,
    done_status: "pending",
    popup_seen_at: popupSeenAt ?? null,
    popup_dismissed_at: popupDismissedAt ?? null,
    popup_last_shown_at: popupLastShownAt ?? nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
  const insertResult = await supabase
    .from("announcement_statuses")
    .insert(insertPayload)
    .select(
      "id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,popup_seen_at,popup_dismissed_at,popup_last_shown_at,created_at,updated_at"
    )
    .maybeSingle();
  if (insertResult.error) {
    return { data: null, error: { message: "Unable to update Company News popup status right now." } };
  }
  return { data: insertResult.data ?? null, error: null };
}

export async function markCompanyNewsPopupSeen({ announcementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: null, error: { message: "announcementId must be a UUID" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const validated = await validateCompanyNewsPopupAnnouncement(announcementId);
    if (validated.error) return { data: null, error: validated.error };

    const nowIso = new Date().toISOString();
    return await upsertOwnCompanyNewsPopupStatus({
      announcementId,
      profileId,
      popupSeenAt: nowIso,
      popupDismissedAt: null,
      popupLastShownAt: nowIso,
    });
  } catch (_err) {
    return { data: null, error: { message: "Unable to update Company News popup status right now." } };
  }
}

export async function dismissCompanyNewsPopup({ announcementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: null, error: { message: "announcementId must be a UUID" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const validated = await validateCompanyNewsPopupAnnouncement(announcementId);
    if (validated.error) return { data: null, error: validated.error };

    const nowIso = new Date().toISOString();
    return await upsertOwnCompanyNewsPopupStatus({
      announcementId,
      profileId,
      popupSeenAt: null,
      popupDismissedAt: nowIso,
      popupLastShownAt: nowIso,
    });
  } catch (_err) {
    return { data: null, error: { message: "Unable to update Company News popup status right now." } };
  }
}

export async function markAnnouncementRead({ announcementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: null, error: { message: "announcementId must be a UUID" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }
    const nowIso = new Date().toISOString();
    const existingRead = await supabase
      .from("announcement_statuses")
      .select("id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,created_at,updated_at")
      .eq("announcement_id", trimString(announcementId))
      .eq("profile_id", profileId)
      .maybeSingle();
    if (existingRead.error && existingRead.error.code !== "PGRST116") {
      return { data: null, error: existingRead.error };
    }
    if (existingRead.data?.id) {
      const updateResult = await supabase
        .from("announcement_statuses")
        .update({
          read_at: existingRead.data.read_at || nowIso,
          last_seen_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", existingRead.data.id)
        .select("id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,created_at,updated_at")
        .maybeSingle();
      return { data: updateResult.data ?? null, error: updateResult.error ?? null };
    }

    const insertResult = await supabase
      .from("announcement_statuses")
      .insert({
        announcement_id: trimString(announcementId),
        profile_id: profileId,
        read_at: nowIso,
        last_seen_at: nowIso,
        done_status: "pending",
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,created_at,updated_at")
      .maybeSingle();
    return { data: insertResult.data ?? null, error: insertResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function updateAnnouncementDoneStatus({ announcementId, doneStatus, undoneReason } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: null, error: { message: "announcementId must be a UUID" } };
  }
  const normalizedDoneStatus = trimString(doneStatus);
  if (!ANNOUNCEMENT_DONE_STATUS_VALUES.has(normalizedDoneStatus)) {
    return { data: null, error: { message: "doneStatus must be pending, done, or undone" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }
    const nowIso = new Date().toISOString();
    const normalizedUndoneReason = normalizeNullableText(undoneReason, { maxLength: 2000 });
    const doneAt = normalizedDoneStatus === "done" ? nowIso : null;
    const undoneReasonValue = normalizedDoneStatus === "undone" ? normalizedUndoneReason : null;
    const existingRead = await supabase
      .from("announcement_statuses")
      .select("id")
      .eq("announcement_id", trimString(announcementId))
      .eq("profile_id", profileId)
      .maybeSingle();
    if (existingRead.error && existingRead.error.code !== "PGRST116") {
      return { data: null, error: existingRead.error };
    }

    const payload = {
      done_status: normalizedDoneStatus,
      done_at: doneAt,
      undone_reason: undoneReasonValue,
      last_seen_at: nowIso,
      updated_at: nowIso,
    };
    if (normalizedDoneStatus !== "pending") {
      payload.read_at = nowIso;
    }

    if (existingRead.data?.id) {
      const updateResult = await supabase
        .from("announcement_statuses")
        .update(payload)
        .eq("id", existingRead.data.id)
        .select("id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,created_at,updated_at")
        .maybeSingle();
      return { data: updateResult.data ?? null, error: updateResult.error ?? null };
    }

    const insertResult = await supabase
      .from("announcement_statuses")
      .insert({
        announcement_id: trimString(announcementId),
        profile_id: profileId,
        read_at: payload.read_at || null,
        last_seen_at: nowIso,
        done_status: normalizedDoneStatus,
        done_at: doneAt,
        undone_reason: undoneReasonValue,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id,announcement_id,profile_id,read_at,last_seen_at,done_status,done_at,undone_reason,created_at,updated_at")
      .maybeSingle();
    return { data: insertResult.data ?? null, error: insertResult.error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function createAnnouncementReply({ announcementId, body, replyType = "update" } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: null, error: { message: "announcementId must be a UUID" } };
  }
  const normalizedBody = normalizeNullableText(body, { maxLength: 8000 });
  if (!normalizedBody) {
    return { data: null, error: { message: "body is required" } };
  }
  const normalizedReplyType = trimString(replyType) || "update";
  if (!ANNOUNCEMENT_REPLY_TYPE_VALUES.has(normalizedReplyType)) {
    return { data: null, error: { message: "replyType must be question, update, or completion_note" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("announcement_replies")
      .insert({
        announcement_id: trimString(announcementId),
        profile_id: profileId,
        body: normalizedBody,
        reply_type: normalizedReplyType,
        parent_reply_id: null,
        created_at: nowIso,
      })
      .select("id,announcement_id,profile_id,body,reply_type,parent_reply_id,created_at")
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

async function loadAiParentReportRow(reportId) {
  const read = await supabase
    .from("ai_parent_reports")
    .select(
      "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,current_version_id,created_by_profile_id,assigned_teacher_profile_id,approved_by_profile_id,released_by_profile_id,released_at,created_at,updated_at"
    )
    .eq("id", trimString(reportId))
    .maybeSingle();
  if (read.error || !read.data?.id) {
    return {
      data: null,
      error: sanitizeAiParentReportError(read.error, "Unable to load AI parent report right now."),
    };
  }
  return { data: read.data, error: null };
}

async function insertAiParentReportReleaseEvent({
  reportId,
  versionId,
  eventType,
  actorProfileId,
  eventNote,
} = {}) {
  const payload = {
    report_id: trimString(reportId),
    version_id: isUuidLike(versionId) ? trimString(versionId) : null,
    event_type: trimString(eventType),
    actor_profile_id: trimString(actorProfileId),
    event_note: normalizeNullableText(eventNote, { maxLength: 2000 }),
    created_at: new Date().toISOString(),
  };
  const insertResult = await supabase
    .from("ai_parent_report_release_events")
    .insert(payload)
    .select("id,report_id,version_id,event_type,actor_profile_id,event_note,created_at")
    .maybeSingle();
  if (insertResult.error || !insertResult.data?.id) {
    return {
      data: null,
      error: sanitizeAiParentReportError(
        insertResult.error,
        "Unable to record AI parent report lifecycle event right now."
      ),
    };
  }
  return { data: insertResult.data, error: null };
}

async function hasExistingAiParentReportReleaseNotificationEvent({
  actorProfileId,
  reportId,
  releasedVersionId,
} = {}) {
  if (!isUuidLike(actorProfileId) || !isUuidLike(reportId) || !isUuidLike(releasedVersionId)) {
    return false;
  }
  const versionKey = trimString(releasedVersionId);
  const read = await supabase
    .from("notification_events")
    .select("id,metadata")
    .eq("created_by_profile_id", trimString(actorProfileId))
    .eq("entity_type", "ai_parent_report")
    .eq("entity_id", trimString(reportId))
    .eq("event_type", AI_PARENT_REPORT_NOTIFICATION_EVENT_TYPE);
  if (read.error || !Array.isArray(read.data)) return false;
  return read.data.some((row) => trimString(row?.metadata?.releasedVersionId) === versionKey);
}

async function resolveParentProfileIdsForAiReportNotification(studentId) {
  if (!isUuidLike(studentId)) return [];
  const rpcResult = await supabase.rpc("list_parent_profile_ids_for_student_staff_scope_035", {
    p_student_id: trimString(studentId),
  });
  if (rpcResult.error) {
    warnNotificationFailureInDev(rpcResult.error, "resolveParentProfileIdsForAiReportNotification.rpc");
    return [];
  }
  if (!Array.isArray(rpcResult.data)) return [];
  const ids = rpcResult.data
    .map((entry) => {
      if (typeof entry === "string") return trimString(entry);
      if (entry && typeof entry === "object" && isUuidLike(entry.profile_id)) {
        return trimString(entry.profile_id);
      }
      return "";
    })
    .filter((id) => isUuidLike(id));
  return [...new Set(ids)];
}

/**
 * Best-effort idempotency: skips when this actor already recorded a matching notification_event
 * (same report, same releasedVersionId in metadata). Does not prevent duplicate parent rows if
 * another staff member releases the same version, or if the event row was deleted — see docs.
 */
async function notifyLinkedParentsAfterAiParentReportRelease({ actorProfileId, report, releasedVersionId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: null, skipped: true };
  }
  if (!isUuidLike(actorProfileId) || !report?.id || !isUuidLike(releasedVersionId)) {
    return { error: null, skipped: true };
  }
  const studentId = report.student_id;
  if (!isUuidLike(studentId)) {
    return { error: null, skipped: true };
  }

  const alreadySent = await hasExistingAiParentReportReleaseNotificationEvent({
    actorProfileId,
    reportId: report.id,
    releasedVersionId,
  });
  if (alreadySent) {
    return { error: null, skipped: true };
  }

  const recipientIds = await resolveParentProfileIdsForAiReportNotification(studentId);
  if (recipientIds.length === 0) {
    return { error: null, skipped: true };
  }
  const allowedRecipientIds = [];
  for (const recipientProfileId of recipientIds) {
    const preferenceCheck = await shouldSendParentInAppNotification({
      parentProfileId: recipientProfileId,
      studentId: trimString(studentId),
      category: "learning_report_homework",
    });
    if (preferenceCheck.allowed) {
      allowedRecipientIds.push(recipientProfileId);
      continue;
    }
    warnNotificationFailureInDev(
      { message: `suppressed by parent preference (${preferenceCheck.reason})` },
      "notifyLinkedParentsAfterAiParentReportRelease.preference",
    );
  }
  if (allowedRecipientIds.length === 0) {
    return { error: null, skipped: true };
  }

  const eventResult = await createNotificationEvent({
    eventType: AI_PARENT_REPORT_NOTIFICATION_EVENT_TYPE,
    entityType: "ai_parent_report",
    entityId: report.id,
    branchId: report.branch_id,
    classId: report.class_id,
    studentId,
    status: "processed",
    metadata: {
      reportType: trimString(report.report_type),
      versionReleased: true,
      releasedVersionId: trimString(releasedVersionId),
    },
  });
  if (eventResult.error || !eventResult.data?.id) {
    return { error: eventResult.error || { message: "Unable to record notification event." }, skipped: false };
  }

  const notificationEventId = eventResult.data.id;
  for (const recipientProfileId of allowedRecipientIds) {
    const rowResult = await createInAppNotification({
      eventId: notificationEventId,
      recipientProfileId,
      recipientRole: "parent",
      branchId: report.branch_id,
      classId: report.class_id,
      studentId,
      title: AI_PARENT_REPORT_RELEASE_NOTIFY_TITLE,
      body: AI_PARENT_REPORT_RELEASE_NOTIFY_BODY,
      status: "pending",
    });
    if (rowResult.error) {
      warnNotificationFailureInDev(rowResult.error, "notifyLinkedParentsAfterAiParentReportRelease.row");
    }
  }

  return { error: null, skipped: false };
}

async function hasExistingHomeworkParentReleaseNotificationEvent({
  actorProfileId,
  entityType,
  entityId,
  eventType,
} = {}) {
  if (!isUuidLike(actorProfileId) || !isUuidLike(entityId)) return false;
  const safeEntityType = trimString(entityType);
  const safeEventType = trimString(eventType);
  if (!safeEntityType || !safeEventType) return false;
  const read = await supabase
    .from("notification_events")
    .select("id")
    .eq("created_by_profile_id", trimString(actorProfileId))
    .eq("entity_type", safeEntityType)
    .eq("entity_id", trimString(entityId))
    .eq("event_type", safeEventType)
    .limit(1);
  if (read.error || !Array.isArray(read.data)) return false;
  return read.data.length > 0;
}

async function notifyLinkedParentsAfterParentCommunicationStaffRelease({
  entityType,
  entityId,
  eventType,
  studentId,
  branchId,
  classId,
  metadata,
  variables,
} = {}) {
  const { profileId: actorProfileId, error: authError } = await getAuthenticatedProfileId();
  if (authError || !actorProfileId) {
    return { error: null, skipped: true };
  }

  const templateLookup = await getActiveNotificationTemplate({
    eventType,
    channel: "in_app",
    branchId: isUuidLike(branchId) ? trimString(branchId) : null,
  });
  if (templateLookup.error) {
    warnNotificationFailureInDev(
      templateLookup.error,
      "notifyLinkedParentsAfterParentCommunicationStaffRelease.templateLookup",
    );
  }
  const rendered = renderNotificationTemplate({
    template: templateLookup.data || null,
    variables:
      variables != null && typeof variables === "object" && !Array.isArray(variables) ? variables : {},
    fallbackTitle: PARENT_COMMUNICATION_CLASS_UPDATE_TITLE,
    fallbackBody: PARENT_COMMUNICATION_CLASS_UPDATE_BODY,
  });

  return notifyLinkedParentsHomeworkParentReleaseCore({
    actorProfileId,
    entityType,
    entityId,
    eventType,
    studentId,
    branchId,
    classId,
    metadata,
    title: rendered.title,
    body: rendered.body,
  });
}

/**
 * After supervisor/HQ verifies or rejects uploaded fee payment proof — message-only in-app notify.
 * Recipients: guardian-linked parents (RPC). Non-blocking on failure. Best-effort idempotency: same
 * actor + fee_record + event_type. Another staff user may still create a second event — see docs.
 */
async function notifyLinkedParentsAfterFeeProofStaffDecision({
  feeRecordRow,
  eventType,
  metadata = null,
} = {}) {
  const { profileId: actorProfileId, error: authError } = await getAuthenticatedProfileId();
  if (authError || !actorProfileId) {
    return { error: null, skipped: true };
  }
  if (!feeRecordRow?.id || !isUuidLike(feeRecordRow.student_id)) {
    return { error: null, skipped: true };
  }

  let fallbackTitle;
  let fallbackBody;
  if (trimString(eventType) === FEE_PAYMENT_PROOF_REQUESTED_EVENT_TYPE) {
    fallbackTitle = FEE_PAYMENT_PROOF_REQUESTED_NOTIFY_TITLE;
    fallbackBody = FEE_PAYMENT_PROOF_REQUESTED_NOTIFY_BODY;
  } else if (trimString(eventType) === FEE_PAYMENT_PROOF_VERIFIED_EVENT_TYPE) {
    fallbackTitle = FEE_PAYMENT_PROOF_VERIFIED_NOTIFY_TITLE;
    fallbackBody = FEE_PAYMENT_PROOF_VERIFIED_NOTIFY_BODY;
  } else if (trimString(eventType) === FEE_PAYMENT_PROOF_REJECTED_EVENT_TYPE) {
    fallbackTitle = FEE_PAYMENT_PROOF_REJECTED_NOTIFY_TITLE;
    fallbackBody = FEE_PAYMENT_PROOF_REJECTED_NOTIFY_BODY;
  } else {
    return { error: null, skipped: true };
  }

  const templateLookup = await getActiveNotificationTemplate({
    eventType,
    channel: "in_app",
    branchId: isUuidLike(feeRecordRow.branch_id) ? trimString(feeRecordRow.branch_id) : null,
  });
  if (templateLookup.error) {
    warnNotificationFailureInDev(
      templateLookup.error,
      "notifyLinkedParentsAfterFeeProofStaffDecision.templateLookup",
    );
  }
  const rendered = renderNotificationTemplate({
    template: templateLookup.data || null,
    variables: {},
    fallbackTitle,
    fallbackBody,
  });

  let defaultMetadata = {};
  if (trimString(eventType) === FEE_PAYMENT_PROOF_REQUESTED_EVENT_TYPE) {
    defaultMetadata = { requestKind: "payment_proof" };
  } else if (trimString(eventType) === FEE_PAYMENT_PROOF_VERIFIED_EVENT_TYPE) {
    defaultMetadata = { proofDecision: "verified" };
  } else if (trimString(eventType) === FEE_PAYMENT_PROOF_REJECTED_EVENT_TYPE) {
    defaultMetadata = { proofDecision: "rejected" };
  }

  return notifyLinkedParentsHomeworkParentReleaseCore({
    actorProfileId,
    entityType: "fee_record",
    entityId: feeRecordRow.id,
    eventType,
    studentId: feeRecordRow.student_id,
    branchId: feeRecordRow.branch_id,
    classId: feeRecordRow.class_id,
    metadata: {
      ...defaultMetadata,
      ...(metadata && typeof metadata === "object" ? metadata : {}),
    },
    title: rendered.title,
    body: rendered.body,
  });
}

/**
 * Best-effort idempotency: same actor + entity_id + entity_type + event_type (homework, parent
 * communication, etc.). Another staff member releasing the same row could still duplicate rows if no
 * matching event — see docs.
 */
async function notifyLinkedParentsHomeworkParentReleaseCore({
  actorProfileId,
  entityType,
  entityId,
  eventType,
  studentId,
  branchId,
  classId,
  metadata,
  title = HOMEWORK_PARENT_NOTIFY_TITLE,
  body = HOMEWORK_PARENT_NOTIFY_BODY,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: null, skipped: true };
  }
  if (!isUuidLike(actorProfileId) || !isUuidLike(entityId) || !isUuidLike(studentId)) {
    return { error: null, skipped: true };
  }
  const duplicate = await hasExistingHomeworkParentReleaseNotificationEvent({
    actorProfileId,
    entityType,
    entityId,
    eventType,
  });
  if (duplicate) {
    return { error: null, skipped: true };
  }

  const recipientIds = await resolveParentProfileIdsForAiReportNotification(studentId);
  if (recipientIds.length === 0) {
    return { error: null, skipped: true };
  }
  const preferenceCategory = resolveParentNotificationCategoryForEvent(eventType);
  if (!preferenceCategory) {
    return { error: null, skipped: true };
  }
  const allowedRecipientIds = [];
  for (const recipientProfileId of recipientIds) {
    const preferenceCheck = await shouldSendParentInAppNotification({
      parentProfileId: recipientProfileId,
      studentId: trimString(studentId),
      category: preferenceCategory,
    });
    if (preferenceCheck.allowed) {
      allowedRecipientIds.push(recipientProfileId);
      continue;
    }
    warnNotificationFailureInDev(
      { message: `suppressed by parent preference (${preferenceCheck.reason})` },
      "notifyLinkedParentsHomeworkParentReleaseCore.preference",
    );
  }
  if (allowedRecipientIds.length === 0) {
    return { error: null, skipped: true };
  }

  const eventResult = await createNotificationEvent({
    eventType,
    entityType,
    entityId,
    branchId: isUuidLike(branchId) ? trimString(branchId) : null,
    classId: isUuidLike(classId) ? trimString(classId) : null,
    studentId: trimString(studentId),
    status: "processed",
    metadata,
  });
  if (eventResult.error || !eventResult.data?.id) {
    return { error: eventResult.error || { message: "Unable to record notification event." }, skipped: false };
  }

  const notificationEventId = eventResult.data.id;
  for (const recipientProfileId of allowedRecipientIds) {
    const rowResult = await createInAppNotification({
      eventId: notificationEventId,
      recipientProfileId,
      recipientRole: "parent",
      branchId: isUuidLike(branchId) ? trimString(branchId) : null,
      classId: isUuidLike(classId) ? trimString(classId) : null,
      studentId: trimString(studentId),
      title,
      body,
      status: "pending",
    });
    if (rowResult.error) {
      warnNotificationFailureInDev(rowResult.error, "notifyLinkedParentsHomeworkParentReleaseCore.row");
    }
  }

  return { error: null, skipped: false };
}

async function notifyLinkedParentsAfterHomeworkFeedbackStaffRelease({ homeworkFeedbackId, submissionScope } = {}) {
  const { profileId: actorProfileId, error: authError } = await getAuthenticatedProfileId();
  if (authError || !actorProfileId) {
    return { error: null, skipped: true };
  }
  if (!isUuidLike(homeworkFeedbackId) || !submissionScope || !isUuidLike(submissionScope.student_id)) {
    return { error: null, skipped: true };
  }
  return notifyLinkedParentsHomeworkParentReleaseCore({
    actorProfileId,
    entityType: "homework_feedback",
    entityId: homeworkFeedbackId,
    eventType: HOMEWORK_FEEDBACK_PARENT_NOTIFICATION_EVENT_TYPE,
    studentId: submissionScope.student_id,
    branchId: submissionScope.branch_id,
    classId: submissionScope.class_id,
    metadata: {
      releaseKind: "feedback",
      parentNotified: true,
    },
  });
}

/**
 * Staff-only: invoked from supabaseUploadService after `homework_files` is released to parent.
 * Skips parent_uploaded_homework (not “marked work” / attachment release in product sense).
 */
export async function notifyLinkedParentsAfterHomeworkFileStaffRelease({ homeworkFileRow, submissionScope } = {}) {
  const { profileId: actorProfileId, error: authError } = await getAuthenticatedProfileId();
  if (authError || !actorProfileId) {
    return { error: null, skipped: true };
  }
  if (!homeworkFileRow?.id || !isUuidLike(homeworkFileRow.id)) {
    return { error: null, skipped: true };
  }
  const role = trimString(homeworkFileRow.file_role);
  if (!HOMEWORK_FILE_PARENT_NOTIFY_ROLES.has(role)) {
    return { error: null, skipped: true };
  }
  if (!submissionScope || !isUuidLike(submissionScope.student_id)) {
    return { error: null, skipped: true };
  }
  return notifyLinkedParentsHomeworkParentReleaseCore({
    actorProfileId,
    entityType: "homework_file",
    entityId: homeworkFileRow.id,
    eventType: HOMEWORK_FILE_PARENT_NOTIFICATION_EVENT_TYPE,
    studentId: submissionScope.student_id,
    branchId: submissionScope.branch_id,
    classId: submissionScope.class_id,
    metadata: {
      releaseKind: "marked_file",
      parentNotified: true,
    },
  });
}

export async function createAiParentReportDraft({
  studentId,
  classId,
  branchId,
  reportType,
  reportPeriodStart,
  reportPeriodEnd,
  assignedTeacherProfileId,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(studentId)) return { data: null, error: { message: "studentId must be a UUID" } };
  if (classId != null && classId !== "" && !isUuidLike(classId)) {
    return { data: null, error: { message: "classId must be a UUID when provided" } };
  }
  if (!isUuidLike(branchId)) return { data: null, error: { message: "branchId must be a UUID" } };
  const normalizedType = trimString(reportType);
  if (!AI_PARENT_REPORT_TYPE_VALUES.has(normalizedType)) {
    return { data: null, error: { message: "reportType is invalid" } };
  }
  const normalizedStart = normalizeNullableDate(reportPeriodStart);
  const normalizedEnd = normalizeNullableDate(reportPeriodEnd);
  if (!normalizedStart || !normalizedEnd) {
    return { data: null, error: { message: "reportPeriodStart/reportPeriodEnd must be YYYY-MM-DD" } };
  }
  if (normalizedEnd < normalizedStart) {
    return { data: null, error: { message: "reportPeriodEnd must be on or after reportPeriodStart" } };
  }
  if (
    assignedTeacherProfileId != null &&
    assignedTeacherProfileId !== "" &&
    !isUuidLike(assignedTeacherProfileId)
  ) {
    return { data: null, error: { message: "assignedTeacherProfileId must be a UUID when provided" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }
    const nowIso = new Date().toISOString();
    const insertResult = await supabase
      .from("ai_parent_reports")
      .insert({
        student_id: trimString(studentId),
        class_id: isUuidLike(classId) ? trimString(classId) : null,
        branch_id: trimString(branchId),
        report_type: normalizedType,
        report_period_start: normalizedStart,
        report_period_end: normalizedEnd,
        status: "draft",
        current_version_id: null,
        created_by_profile_id: profileId,
        assigned_teacher_profile_id: isUuidLike(assignedTeacherProfileId)
          ? trimString(assignedTeacherProfileId)
          : null,
        approved_by_profile_id: null,
        released_by_profile_id: null,
        released_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(
        "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,current_version_id,created_by_profile_id,assigned_teacher_profile_id,approved_by_profile_id,released_by_profile_id,released_at,created_at,updated_at"
      )
      .maybeSingle();
    if (insertResult.error || !insertResult.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(insertResult.error, "Unable to create AI parent report draft right now."),
      };
    }
    return { data: insertResult.data, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function createAiParentReportVersion({
  reportId,
  generationSource = "manual",
  structuredSections,
  teacherEdits,
  finalText,
  aiModelLabel,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) return { data: null, error: { message: "reportId must be a UUID" } };
  const normalizedSource = trimString(generationSource) || "manual";
  if (!AI_PARENT_REPORT_GENERATION_SOURCE_VALUES.has(normalizedSource)) {
    return { data: null, error: { message: "generationSource is invalid" } };
  }

  const normalizedStructured = normalizeJsonObject(structuredSections, {
    fieldName: "structuredSections",
    allowNull: false,
  });
  if (normalizedStructured?.__error) {
    return { data: null, error: { message: normalizedStructured.__error } };
  }
  const normalizedTeacherEdits = normalizeJsonObject(teacherEdits, {
    fieldName: "teacherEdits",
    allowNull: true,
  });
  if (normalizedTeacherEdits?.__error) {
    return { data: null, error: { message: normalizedTeacherEdits.__error } };
  }
  const normalizedFinalText = normalizeJsonObject(finalText, {
    fieldName: "finalText",
    allowNull: true,
  });
  if (normalizedFinalText?.__error) {
    return { data: null, error: { message: normalizedFinalText.__error } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const reportRead = await loadAiParentReportRow(reportId);
    if (reportRead.error || !reportRead.data?.id) return { data: null, error: reportRead.error };

    const countRead = await supabase
      .from("ai_parent_report_versions")
      .select("id,version_number")
      .eq("report_id", trimString(reportId))
      .order("version_number", { ascending: false })
      .limit(1);
    if (countRead.error) {
      return {
        data: null,
        error: sanitizeAiParentReportError(countRead.error, "Unable to prepare AI parent report version right now."),
      };
    }
    const latestVersion = Array.isArray(countRead.data) && countRead.data.length > 0 ? countRead.data[0] : null;
    const versionNumber = Number.isInteger(latestVersion?.version_number)
      ? latestVersion.version_number + 1
      : 1;

    const nowIso = new Date().toISOString();
    const aiGeneratedAt =
      normalizedSource === "mock_ai" || normalizedSource === "real_ai" ? nowIso : null;
    const insertResult = await supabase
      .from("ai_parent_report_versions")
      .insert({
        report_id: trimString(reportId),
        version_number: versionNumber,
        generation_source: normalizedSource,
        structured_sections: normalizedStructured,
        teacher_edits: normalizedTeacherEdits,
        final_text: normalizedFinalText,
        // Non-secret display label only (e.g. model id from Edge response metadata). Omit if unknown.
        ai_model_label: normalizeNullableText(aiModelLabel, { maxLength: 120 }),
        ai_generated_at: aiGeneratedAt,
        created_by_profile_id: profileId,
        created_at: nowIso,
      })
      .select(
        "id,report_id,version_number,generation_source,structured_sections,teacher_edits,final_text,ai_model_label,ai_generated_at,created_by_profile_id,created_at"
      )
      .maybeSingle();
    if (insertResult.error || !insertResult.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(insertResult.error, "Unable to create AI parent report version right now."),
      };
    }

    const eventType = versionNumber === 1 ? "generated" : "edited";
    const eventResult = await insertAiParentReportReleaseEvent({
      reportId: trimString(reportId),
      versionId: insertResult.data.id,
      eventType,
      actorProfileId: profileId,
      eventNote: `${eventType} via ${normalizedSource}`,
    });

    return {
      data: {
        version: insertResult.data,
        lifecycleEvent: eventResult.data || null,
      },
      error: null,
      warning: eventResult.error
        ? {
            check: true,
            stage: "release_event_insert",
            message: eventResult.error.message,
          }
        : null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function generateMockAiParentReportDraft({ reportId, input } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) return { data: null, error: { message: "reportId must be a UUID" } };
  if (input != null && (typeof input !== "object" || Array.isArray(input))) {
    return { data: null, error: { message: "input must be an object" } };
  }

  const safeInput = input && typeof input === "object" ? input : {};
  if (containsUnsafeMockDraftValue(safeInput)) {
    return {
      data: null,
      error: {
        message: "input must not include private paths, provider/debug metadata, or secret-like values",
      },
    };
  }

  const structuredSections = buildMockAiParentReportStructuredSections(safeInput);
  const evidenceSummaries = withMockFallback(
    normalizeMockAiInputText(
      Array.isArray(safeInput.evidenceSummaries)
        ? safeInput.evidenceSummaries
            .map((item) => normalizeMockAiInputText(typeof item === "string" ? item : ""))
            .filter(Boolean)
            .join("; ")
        : normalizeMockAiInputText(
            typeof safeInput.evidenceSummaries === "string" ? safeInput.evidenceSummaries : ""
          ),
      { maxLength: 1500 }
    )
  );

  const finalComment = structuredSections.teacher_final_comment || MOCK_AI_PARENT_REPORT_INSUFFICIENT_DATA_COPY;

  try {
    const versionResult = await createAiParentReportVersion({
      reportId: trimString(reportId),
      generationSource: "mock_ai",
      structuredSections,
      teacherEdits: {
        mock_generation_note: "deterministic fake/dev draft output",
        selected_evidence_summary: evidenceSummaries,
      },
      finalText: { teacher_final_comment: finalComment },
      aiModelLabel: "mock_ai_parent_report_v1",
    });
    if (versionResult.error || !versionResult.data?.version?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(
          versionResult.error,
          "Unable to generate mock AI parent report draft right now."
        ),
      };
    }
    return {
      data: {
        version: versionResult.data.version,
        structuredSections,
      },
      error: null,
      warning: versionResult.warning || null,
    };
  } catch (err) {
    return {
      data: null,
      error: sanitizeAiParentReportError(err, "Unable to generate mock AI parent report draft right now."),
    };
  }
}

export async function addAiParentReportEvidenceLink({
  reportId,
  evidenceType,
  sourceTable,
  sourceId,
  summarySnapshot,
  includeInParentReport = false,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) return { data: null, error: { message: "reportId must be a UUID" } };
  const normalizedEvidenceType = trimString(evidenceType);
  if (!AI_PARENT_REPORT_EVIDENCE_TYPE_VALUES.has(normalizedEvidenceType)) {
    return { data: null, error: { message: "evidenceType is invalid" } };
  }
  if (sourceId != null && sourceId !== "" && !isUuidLike(sourceId)) {
    return { data: null, error: { message: "sourceId must be a UUID when provided" } };
  }
  const normalizedSnapshot = normalizeJsonObject(summarySnapshot, {
    fieldName: "summarySnapshot",
    allowNull: true,
  });
  if (normalizedSnapshot?.__error) {
    return { data: null, error: { message: normalizedSnapshot.__error } };
  }
  if (containsUnsafePathLikeValue(normalizedSnapshot)) {
    return { data: null, error: { message: "summarySnapshot must not include raw private file paths" } };
  }
  if (includeInParentReport != null && typeof includeInParentReport !== "boolean") {
    return { data: null, error: { message: "includeInParentReport must be a boolean when provided" } };
  }

  try {
    const nowIso = new Date().toISOString();
    const insertResult = await supabase
      .from("ai_parent_report_evidence_links")
      .insert({
        report_id: trimString(reportId),
        evidence_type: normalizedEvidenceType,
        source_table: normalizeNullableText(sourceTable, { maxLength: 120 }),
        source_id: isUuidLike(sourceId) ? trimString(sourceId) : null,
        summary_snapshot: normalizedSnapshot,
        include_in_parent_report: Boolean(includeInParentReport),
        created_at: nowIso,
      })
      .select(
        "id,report_id,evidence_type,source_table,source_id,summary_snapshot,include_in_parent_report,created_at"
      )
      .maybeSingle();
    if (insertResult.error || !insertResult.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(
          insertResult.error,
          "Unable to add AI parent report evidence link right now."
        ),
      };
    }
    return { data: insertResult.data, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function submitAiParentReportForReview({ reportId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) return { data: null, error: { message: "reportId must be a UUID" } };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }
    const reportRead = await loadAiParentReportRow(reportId);
    if (reportRead.error || !reportRead.data?.id) return { data: null, error: reportRead.error };
    const currentStatus = trimString(reportRead.data.status);
    if (!AI_PARENT_REPORT_STATUS_VALUES.has(currentStatus)) {
      return { data: null, error: { message: "Current report status is invalid" } };
    }
    if (!(currentStatus === "draft" || currentStatus === "teacher_review")) {
      return { data: null, error: { message: "Only draft/teacher_review reports can be submitted for review" } };
    }

    const nowIso = new Date().toISOString();
    const updateResult = await supabase
      .from("ai_parent_reports")
      .update({
        status: "supervisor_review",
        updated_at: nowIso,
      })
      .eq("id", trimString(reportId))
      .select(
        "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,current_version_id,created_by_profile_id,assigned_teacher_profile_id,approved_by_profile_id,released_by_profile_id,released_at,created_at,updated_at"
      )
      .maybeSingle();
    if (updateResult.error || !updateResult.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(
          updateResult.error,
          "Unable to submit AI parent report for review right now."
        ),
      };
    }

    const eventResult = await insertAiParentReportReleaseEvent({
      reportId: trimString(reportId),
      versionId: isUuidLike(updateResult.data.current_version_id) ? updateResult.data.current_version_id : null,
      eventType: "submitted_for_review",
      actorProfileId: profileId,
      eventNote: "submitted_for_review",
    });
    return {
      data: {
        report: updateResult.data,
        lifecycleEvent: eventResult.data || null,
      },
      error: null,
      warning: eventResult.error
        ? { check: true, stage: "release_event_insert", message: eventResult.error.message }
        : null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function approveAiParentReport({ reportId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) return { data: null, error: { message: "reportId must be a UUID" } };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }
    const reportRead = await loadAiParentReportRow(reportId);
    if (reportRead.error || !reportRead.data?.id) return { data: null, error: reportRead.error };
    const currentStatus = trimString(reportRead.data.status);
    if (!(currentStatus === "teacher_review" || currentStatus === "supervisor_review")) {
      return { data: null, error: { message: "Only review-state reports can be approved" } };
    }

    const nowIso = new Date().toISOString();
    const updateResult = await supabase
      .from("ai_parent_reports")
      .update({
        status: "approved",
        approved_by_profile_id: profileId,
        updated_at: nowIso,
      })
      .eq("id", trimString(reportId))
      .select(
        "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,current_version_id,created_by_profile_id,assigned_teacher_profile_id,approved_by_profile_id,released_by_profile_id,released_at,created_at,updated_at"
      )
      .maybeSingle();
    if (updateResult.error || !updateResult.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(updateResult.error, "Unable to approve AI parent report right now."),
      };
    }

    const eventResult = await insertAiParentReportReleaseEvent({
      reportId: trimString(reportId),
      versionId: isUuidLike(updateResult.data.current_version_id) ? updateResult.data.current_version_id : null,
      eventType: "approved",
      actorProfileId: profileId,
      eventNote: "approved",
    });
    return {
      data: {
        report: updateResult.data,
        lifecycleEvent: eventResult.data || null,
      },
      error: null,
      warning: eventResult.error
        ? { check: true, stage: "release_event_insert", message: eventResult.error.message }
        : null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function releaseAiParentReport({ reportId, versionId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) return { data: null, error: { message: "reportId must be a UUID" } };
  if (!isUuidLike(versionId)) return { data: null, error: { message: "versionId is required and must be a UUID" } };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const reportRead = await loadAiParentReportRow(reportId);
    if (reportRead.error || !reportRead.data?.id) return { data: null, error: reportRead.error };

    const versionRead = await supabase
      .from("ai_parent_report_versions")
      .select("id,report_id,version_number")
      .eq("id", trimString(versionId))
      .eq("report_id", trimString(reportId))
      .maybeSingle();
    if (versionRead.error || !versionRead.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(
          versionRead.error,
          "versionId must belong to the provided reportId and be visible under current scope"
        ),
      };
    }

    const currentStatus = trimString(reportRead.data.status);
    if (!(currentStatus === "approved" || currentStatus === "released")) {
      return { data: null, error: { message: "Only approved/released reports can be released" } };
    }

    const nowIso = new Date().toISOString();
    const updateResult = await supabase
      .from("ai_parent_reports")
      .update({
        status: "released",
        current_version_id: trimString(versionId),
        released_at: nowIso,
        released_by_profile_id: profileId,
        updated_at: nowIso,
      })
      .eq("id", trimString(reportId))
      .select(
        "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,current_version_id,created_by_profile_id,assigned_teacher_profile_id,approved_by_profile_id,released_by_profile_id,released_at,created_at,updated_at"
      )
      .maybeSingle();
    if (updateResult.error || !updateResult.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(updateResult.error, "Unable to release AI parent report right now."),
      };
    }

    const eventResult = await insertAiParentReportReleaseEvent({
      reportId: trimString(reportId),
      versionId: trimString(versionId),
      eventType: "released",
      actorProfileId: profileId,
      eventNote: "released",
    });

    const auditResult = await recordAuditEvent({
      actionType: "ai_parent_report.released",
      entityType: "ai_parent_report",
      entityId: updateResult.data.id,
      branchId: updateResult.data.branch_id,
      classId: updateResult.data.class_id,
      studentId: updateResult.data.student_id,
      metadata: {
        reportType: updateResult.data.report_type,
        status: updateResult.data.status,
        currentVersionId: updateResult.data.current_version_id,
      },
    });
    if (auditResult.error) {
      warnAuditFailureInDev(auditResult.error, "releaseAiParentReport");
    }

    const notifyResult = await notifyLinkedParentsAfterAiParentReportRelease({
      actorProfileId: profileId,
      report: updateResult.data,
      releasedVersionId: trimString(versionId),
    });
    if (notifyResult?.error) {
      warnNotificationFailureInDev(notifyResult.error, "releaseAiParentReport");
    }

    return {
      data: {
        report: updateResult.data,
        lifecycleEvent: eventResult.data || null,
      },
      error: null,
      warning: eventResult.error
        ? { check: true, stage: "release_event_insert", message: eventResult.error.message }
        : null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function archiveAiParentReport({ reportId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) return { data: null, error: { message: "reportId must be a UUID" } };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }
    const reportRead = await loadAiParentReportRow(reportId);
    if (reportRead.error || !reportRead.data?.id) return { data: null, error: reportRead.error };
    const currentStatus = trimString(reportRead.data.status);
    if (currentStatus === "archived") {
      return { data: reportRead.data, error: null };
    }

    const nowIso = new Date().toISOString();
    const updateResult = await supabase
      .from("ai_parent_reports")
      .update({
        status: "archived",
        updated_at: nowIso,
      })
      .eq("id", trimString(reportId))
      .select(
        "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,current_version_id,created_by_profile_id,assigned_teacher_profile_id,approved_by_profile_id,released_by_profile_id,released_at,created_at,updated_at"
      )
      .maybeSingle();
    if (updateResult.error || !updateResult.data?.id) {
      return {
        data: null,
        error: sanitizeAiParentReportError(updateResult.error, "Unable to archive AI parent report right now."),
      };
    }

    const eventResult = await insertAiParentReportReleaseEvent({
      reportId: trimString(reportId),
      versionId: isUuidLike(updateResult.data.current_version_id) ? updateResult.data.current_version_id : null,
      eventType: "archived",
      actorProfileId: profileId,
      eventNote: "archived",
    });
    return {
      data: {
        report: updateResult.data,
        lifecycleEvent: eventResult.data || null,
      },
      error: null,
      warning: eventResult.error
        ? { check: true, stage: "release_event_insert", message: eventResult.error.message }
        : null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}


import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { ROLES } from "./permissionService.js";

const SALES_KIT_FIELDS =
  "id,title,resource_type,description,file_path,external_url,status,is_global,branch_scope,created_at,updated_at";
const BRANCH_FIELDS = "id,name,created_at,updated_at";
/** Minimal columns for Staff Time Clock GPS distance (RLS-scoped single-row read). */
const BRANCH_GEOFENCE_FIELDS = "id,name,latitude,longitude,geofence_radius_meters";
const CLASS_FIELDS = "id,name,branch_id,subject,level,schedule_note,created_at,updated_at";
const STUDENT_FIELDS = "id,full_name,branch_id,class_id,created_at,updated_at";
const SCHOOL_FIELDS =
  "id,branch_id,name,school_type,country,state,curriculum_system,notes,created_at,updated_at";
const CURRICULUM_PROFILE_FIELDS =
  "id,branch_id,name,provider,curriculum_system,level_year_grade,subject,skill_focus,assessment_style,notes,created_at,updated_at";
const STUDENT_SCHOOL_PROFILE_FIELDS =
  "id,student_id,school_id,school_name,grade_year,curriculum_profile_id,parent_goals,teacher_notes,subject_notes,learning_context_notes,updated_at,created_at";
const CLASS_CURRICULUM_ASSIGNMENT_FIELDS =
  "id,class_id,curriculum_profile_id,term_label,start_date,end_date,learning_focus,created_at,updated_at";
const LEARNING_GOAL_FIELDS =
  "id,branch_id,student_id,class_id,curriculum_profile_id,goal_title,goal_description,status,priority,created_by_profile_id,created_at,updated_at";
const HOMEWORK_TASK_ASSIGNEE_FIELDS =
  "id,homework_task_id,branch_id,class_id,student_id,assigned_by_profile_id,assignment_status,due_date,notes,created_at,updated_at,homework_task:homework_tasks(id,branch_id,class_id,title,instructions,subject,due_date,status,assignment_scope,created_at,updated_at)";
const HOMEWORK_TASK_FIELDS =
  "id,branch_id,class_id,created_by_profile_id,title,instructions,subject,due_date,status,assignment_scope,created_at,updated_at";
const HOMEWORK_SUBMISSION_FIELDS =
  "id,homework_task_id,branch_id,class_id,student_id,submitted_by_profile_id,submission_note,status,submitted_at,reviewed_at,reviewed_by_profile_id,created_at,updated_at";
const HOMEWORK_FEEDBACK_RELEASE_FIELDS =
  "id,homework_submission_id,status,released_to_parent_at,created_at,updated_at";
const ANNOUNCEMENT_FIELDS =
  "id,branch_id,created_by_profile_id,announcement_type,title,subtitle,body,priority,status,audience_type,due_date,requires_response,requires_upload,popup_enabled,popup_emoji,created_at,updated_at,published_at";
const ANNOUNCEMENT_TARGET_FIELDS =
  "id,announcement_id,target_type,branch_id,target_profile_id,target_role,created_at";
const ANNOUNCEMENT_STATUS_FIELDS =
  "id,announcement_id,profile_id,read_at,done_status,done_at,undone_reason,last_seen_at,popup_seen_at,popup_dismissed_at,popup_last_shown_at,created_at,updated_at";
const ANNOUNCEMENT_REPLY_FIELDS =
  "id,announcement_id,profile_id,body,reply_type,parent_reply_id,created_at";
const ANNOUNCEMENT_STATUS_VALUES = new Set(["draft", "published", "closed", "archived"]);
const ANNOUNCEMENT_AUDIENCE_VALUES = new Set(["internal_staff", "parent_facing"]);
const ANNOUNCEMENT_TYPE_VALUES = new Set(["request", "company_news", "parent_event"]);
const ANNOUNCEMENT_DONE_STATUS_VALUES = new Set(["pending", "done", "undone"]);
const ANNOUNCEMENT_TASK_STATUS_VALUES = new Set(["unread", "pending", "undone", "overdue", "done"]);
const NOTIFICATION_TEMPLATE_CHANNEL_VALUES = new Set(["in_app", "email"]);
const PARENT_ANNOUNCEMENT_FIELDS =
  "id,title,subtitle,body,announcement_type,status,branch_id,class_id,published_at,event_start_at,event_end_at,location,created_at,updated_at";
const PARENT_ANNOUNCEMENT_STATUS_VALUES = new Set(["draft", "published", "archived"]);
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
const AI_PARENT_REPORT_FIELDS =
  "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,current_version_id,created_by_profile_id,assigned_teacher_profile_id,approved_by_profile_id,released_by_profile_id,released_at,created_at,updated_at";
const AI_PARENT_REPORT_VERSION_FIELDS =
  "id,report_id,version_number,generation_source,structured_sections,teacher_edits,final_text,ai_model_label,ai_generated_at,created_by_profile_id,created_at";
const AI_PARENT_REPORT_EVIDENCE_FIELDS =
  "id,report_id,evidence_type,source_table,source_id,summary_snapshot,include_in_parent_report,created_at";
const AI_PARENT_REPORT_STATUS_VALUES = new Set([
  "draft",
  "teacher_review",
  "supervisor_review",
  "approved",
  "released",
  "archived",
]);
const AI_PARENT_REPORT_TYPE_VALUES = new Set([
  "weekly_brief",
  "monthly_progress",
  "parent_requested",
  "graduation",
  "end_of_term",
  "homework_feedback",
  "participation_note",
]);
const NOTIFICATION_STATUS_VALUES = new Set(["pending", "delivered", "read", "archived", "suppressed", "failed"]);
const NOTIFICATION_FIELDS =
  "id,event_id,recipient_profile_id,recipient_role,branch_id,class_id,student_id,channel,title,body,status,read_at,created_by_profile_id,created_at";
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
const PARENT_NOTIFICATION_PREFERENCE_FIELDS =
  "id,parent_profile_id,student_id,channel,category,enabled,consent_status,consent_source,policy_version,consented_at,withdrawn_at,updated_by_profile_id,created_at,updated_at";
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
const PARENT_POLICY_ACKNOWLEDGEMENT_FIELDS =
  "id,parent_profile_id,policy_key,policy_version,acknowledgement_source,acknowledged_at,created_at,metadata";
const AUTH_SESSION_STATUS_VALUES = new Set(["active", "signed_out", "timed_out", "revoked"]);
const AUTH_SESSION_FIELDS =
  "id,profile_id,role,branch_id,remember_me_enabled,session_status,started_at,last_seen_at,signed_out_at,timed_out_at,revoked_at,revoked_by_profile_id,revoke_reason,safe_device_label,created_at,updated_at";
const NOTIFICATION_TEMPLATE_FIELDS =
  "id,template_key,event_type,channel,title_template,body_template,allowed_variables,branch_id,is_active,created_by_profile_id,updated_by_profile_id,created_at,updated_at";

const NOTIFICATION_TEMPLATE_PLACEHOLDER_RE =
  /\{\{\s*([a-zA-Z][a-zA-Z0-9_]{0,48})\s*\}\}/g;
const NOTIFICATION_TEMPLATE_OUTPUT_TITLE_MAX = 240;
const NOTIFICATION_TEMPLATE_OUTPUT_BODY_MAX = 4000;
const NOTIFICATION_TEMPLATE_PLACEHOLDER_VALUE_MAX = 280;

function isUuidLike(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function priorityRank(priority) {
  const normalized = trimString(priority).toLowerCase();
  if (normalized === "urgent") return 0;
  if (normalized === "high") return 1;
  if (normalized === "normal") return 2;
  if (normalized === "low") return 3;
  return 4;
}

function toTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildAnnouncementBodyPreview(subtitle, body) {
  const subtitleText = trimString(subtitle);
  const bodyText = trimString(body);
  if (subtitleText) return subtitleText.slice(0, 200);
  if (bodyText) return bodyText.slice(0, 200);
  return "";
}

function sanitizeReadError(error, fallbackMessage) {
  const message = trimString(error?.message);
  if (!message) return { message: fallbackMessage };
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return { message: fallbackMessage };
  }
  return { message };
}

function mapParentAnnouncementRow(row, { includeBodyDetail = false } = {}) {
  const bodyText = trimString(row?.body);
  const subtitleText = trimString(row?.subtitle);
  const preview = subtitleText || bodyText.slice(0, 200);
  return {
    id: trimString(row?.id),
    title: trimString(row?.title) || "Untitled announcement",
    subtitle: subtitleText || null,
    bodyPreview: preview || "",
    body: includeBodyDetail ? (bodyText || null) : undefined,
    announcementType: trimString(row?.announcement_type) || "",
    status: trimString(row?.status) || "",
    branchId: isUuidLike(row?.branch_id) ? trimString(row?.branch_id) : null,
    classId: isUuidLike(row?.class_id) ? trimString(row?.class_id) : null,
    publishedAt: row?.published_at || null,
    eventStartAt: row?.event_start_at || null,
    eventEndAt: row?.event_end_at || null,
    location: trimString(row?.location) || null,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function mapAiParentReportRow(row) {
  return {
    id: isUuidLike(row?.id) ? trimString(row.id) : null,
    studentId: isUuidLike(row?.student_id) ? trimString(row.student_id) : null,
    classId: isUuidLike(row?.class_id) ? trimString(row.class_id) : null,
    branchId: isUuidLike(row?.branch_id) ? trimString(row.branch_id) : null,
    reportType: trimString(row?.report_type) || "",
    reportPeriodStart: row?.report_period_start || null,
    reportPeriodEnd: row?.report_period_end || null,
    status: trimString(row?.status) || "",
    currentVersionId: isUuidLike(row?.current_version_id) ? trimString(row.current_version_id) : null,
    createdByProfileId: isUuidLike(row?.created_by_profile_id) ? trimString(row.created_by_profile_id) : null,
    assignedTeacherProfileId: isUuidLike(row?.assigned_teacher_profile_id)
      ? trimString(row.assigned_teacher_profile_id)
      : null,
    approvedByProfileId: isUuidLike(row?.approved_by_profile_id) ? trimString(row.approved_by_profile_id) : null,
    releasedByProfileId: isUuidLike(row?.released_by_profile_id) ? trimString(row.released_by_profile_id) : null,
    releasedAt: row?.released_at || null,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function mapAiParentReportVersionRow(row) {
  return {
    id: isUuidLike(row?.id) ? trimString(row.id) : null,
    reportId: isUuidLike(row?.report_id) ? trimString(row.report_id) : null,
    versionNumber: Number.isInteger(row?.version_number) ? row.version_number : null,
    generationSource: trimString(row?.generation_source) || "",
    structuredSections:
      row?.structured_sections && typeof row.structured_sections === "object"
        ? row.structured_sections
        : {},
    teacherEdits:
      row?.teacher_edits && typeof row.teacher_edits === "object" ? row.teacher_edits : null,
    finalText: row?.final_text && typeof row.final_text === "object" ? row.final_text : null,
    aiModelLabel: trimString(row?.ai_model_label) || null,
    aiGeneratedAt: row?.ai_generated_at || null,
    createdByProfileId: isUuidLike(row?.created_by_profile_id) ? trimString(row.created_by_profile_id) : null,
    createdAt: row?.created_at || null,
  };
}

async function getAuthenticatedProfileId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    return { profileId: null, error: { message: error?.message || "Authenticated user is required" } };
  }
  return { profileId: data.user.id, error: null };
}

async function getCurrentProfileRole() {
  const { profileId, error } = await getAuthenticatedProfileId();
  if (error || !profileId) {
    return { profileId: null, role: null, error: error || { message: "Authenticated user is required" } };
  }
  const roleRead = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", profileId)
    .maybeSingle();
  if (roleRead.error || !roleRead.data?.id) {
    return { profileId, role: null, error: roleRead.error || { message: "Profile role is unavailable" } };
  }
  return { profileId, role: trimString(roleRead.data.role) || null, error: null };
}

function mapSubmissionStatusToTrackerStatus(submissionStatus = "") {
  const normalized = trimString(submissionStatus);
  if (normalized === "submitted") return "submitted";
  if (normalized === "under_review") return "underReview";
  if (normalized === "returned_for_revision") return "returned";
  if (normalized === "reviewed") return "reviewed";
  if (normalized === "approved_for_parent") return "feedbackReleased";
  return "";
}

function mapAssignmentStatusToTrackerStatus(assignmentStatus = "") {
  const normalized = trimString(assignmentStatus);
  if (normalized === "submitted") return "submitted";
  if (normalized === "under_review") return "underReview";
  if (normalized === "returned_for_revision") return "returned";
  if (normalized === "reviewed") return "reviewed";
  if (normalized === "feedback_released") return "feedbackReleased";
  if (normalized === "assigned") return "assigned";
  return "";
}

function createTrackerCounts() {
  return {
    assigned: 0,
    submitted: 0,
    underReview: 0,
    returned: 0,
    reviewed: 0,
    feedbackReleased: 0,
    notSubmitted: 0,
  };
}

function incrementTrackerCount(counts, key) {
  if (Object.prototype.hasOwnProperty.call(counts, key)) {
    counts[key] += 1;
  }
}

export async function getApprovedSalesKitResources() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from("sales_kit_resources")
      .select(SALES_KIT_FIELDS)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error };
    }

    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getBranches() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from("branches")
      .select(BRANCH_FIELDS)
      .order("name", { ascending: true });

    if (error) {
      return { data: [], error };
    }

    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Load one branch row for geofence math (Staff Time Clock). Anon client + RLS; no service role.
 * Returns only id, name, latitude, longitude, geofence_radius_meters.
 */
export async function getBranchGeofenceById(branchId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  const id = typeof branchId === "string" ? branchId.trim() : "";
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { data: null, error: { message: "branchId must be a UUID" } };
  }

  try {
    const { data, error } = await supabase
      .from("branches")
      .select(BRANCH_GEOFENCE_FIELDS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return { data: data ?? null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getClasses() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from("classes")
      .select(CLASS_FIELDS)
      .order("name", { ascending: true });

    if (error) {
      return { data: [], error };
    }

    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getStudents() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_FIELDS)
      .order("full_name", { ascending: true });

    if (error) {
      return { data: [], error };
    }

    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Read-only guardian ↔ student link summaries for staff routes.
 * Teachers: returns `unavailable` on Supabase — draft RLS does not grant `guardian_student_links` select
 * to class teachers (avoid false “not linked” when rows exist).
 * HQ / Branch Supervisor: counts + optional parent profile display fields allowed by existing `profiles` RLS.
 */
export async function getGuardianLinkSummaryByStudentIds({ studentIds, viewerRole } = {}) {
  const ids = Array.isArray(studentIds)
    ? [...new Set(studentIds.map((id) => (typeof id === "string" ? id.trim() : "")).filter(isUuidLike))]
    : [];

  const unavailable = () =>
    Object.fromEntries(
      ids.map((id) => [
        id,
        {
          status: "unavailable",
          linkedCount: null,
          guardians: [],
        },
      ]),
    );

  if (!isSupabaseConfigured() || !supabase || ids.length === 0) {
    return { data: unavailable(), error: null };
  }

  if (viewerRole === ROLES.TEACHER) {
    return { data: unavailable(), error: null };
  }

  if (viewerRole !== ROLES.HQ_ADMIN && viewerRole !== ROLES.BRANCH_SUPERVISOR) {
    return { data: unavailable(), error: null };
  }

  try {
    const { data: linkRows, error: linksError } = await supabase
      .from("guardian_student_links")
      .select("id,guardian_id,student_id")
      .in("student_id", ids);

    if (linksError) {
      return { data: unavailable(), error: linksError };
    }

    const rows = Array.isArray(linkRows) ? linkRows : [];
    const byStudent = new Map();
    for (const id of ids) {
      byStudent.set(id, []);
    }
    for (const row of rows) {
      const sid = row?.student_id;
      if (!sid || !byStudent.has(sid)) continue;
      byStudent.get(sid).push(row);
    }

    const guardianIds = [...new Set(rows.map((r) => r?.guardian_id).filter((g) => isUuidLike(g)))];
    const guardianToProfile = new Map();

    if (guardianIds.length > 0) {
      const { data: guardiansRows, error: guardiansError } = await supabase
        .from("guardians")
        .select("id,profile_id")
        .in("id", guardianIds);

      if (guardiansError) {
        return { data: unavailable(), error: guardiansError };
      }

      const profileIds = [
        ...new Set(
          (Array.isArray(guardiansRows) ? guardiansRows : [])
            .map((g) => g?.profile_id)
            .filter((p) => isUuidLike(p)),
        ),
      ];

      let profileById = new Map();
      if (profileIds.length > 0) {
        const { data: profilesRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", profileIds);

        if (profilesError) {
          return { data: unavailable(), error: profilesError };
        }
        profileById = new Map((Array.isArray(profilesRows) ? profilesRows : []).map((p) => [p.id, p]));
      }

      for (const g of Array.isArray(guardiansRows) ? guardiansRows : []) {
        if (!isUuidLike(g?.id)) continue;
        guardianToProfile.set(g.id, profileById.get(g.profile_id) || null);
      }
    }

    const result = {};
    for (const sid of ids) {
      const linkList = byStudent.get(sid) || [];
      const count = linkList.length;
      if (count === 0) {
        result[sid] = {
          status: "not_linked",
          linkedCount: 0,
          guardians: [],
        };
        continue;
      }

      const guardians = [];
      for (const lr of linkList) {
        const prof = guardianToProfile.get(lr.guardian_id);
        guardians.push({
          displayName: (prof?.full_name && String(prof.full_name).trim()) || "Linked parent account",
          email: prof?.email ?? null,
        });
      }

      result[sid] = {
        status: "linked",
        linkedCount: count,
        guardians: guardians.slice(0, 8),
      };
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: unavailable(), error };
  }
}

export async function listSchools({ branchId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    let query = supabase
      .from("schools")
      .select(SCHOOL_FIELDS)
      .order("name", { ascending: true });

    if (typeof branchId === "string" && branchId.trim()) {
      query = query.eq("branch_id", branchId.trim());
    }

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listCurriculumProfiles({ branchId, subject } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    let query = supabase
      .from("curriculum_profiles")
      .select(CURRICULUM_PROFILE_FIELDS)
      .order("name", { ascending: true });

    if (typeof branchId === "string" && branchId.trim()) {
      query = query.eq("branch_id", branchId.trim());
    }
    if (typeof subject === "string" && subject.trim()) {
      query = query.eq("subject", subject.trim());
    }

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listStudentSchoolProfiles({ studentId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    let query = supabase
      .from("student_school_profiles")
      .select(STUDENT_SCHOOL_PROFILE_FIELDS)
      .order("created_at", { ascending: false });

    if (typeof studentId === "string" && studentId.trim()) {
      query = query.eq("student_id", studentId.trim());
    }

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listClassCurriculumAssignments({ classId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    let query = supabase
      .from("class_curriculum_assignments")
      .select(CLASS_CURRICULUM_ASSIGNMENT_FIELDS)
      .order("created_at", { ascending: false });

    if (typeof classId === "string" && classId.trim()) {
      query = query.eq("class_id", classId.trim());
    }

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listLearningGoals({ studentId, classId, status } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null };
  }

  try {
    let query = supabase
      .from("learning_goals")
      .select(LEARNING_GOAL_FIELDS)
      .order("created_at", { ascending: false });

    if (typeof studentId === "string" && studentId.trim()) {
      query = query.eq("student_id", studentId.trim());
    }
    if (typeof classId === "string" && classId.trim()) {
      query = query.eq("class_id", classId.trim());
    }
    if (typeof status === "string" && status.trim()) {
      query = query.eq("status", status.trim());
    }

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getStudentLearningContext({ studentId }) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: null };
  }
  const id = typeof studentId === "string" ? studentId.trim() : "";
  if (!id) {
    return { data: null, error: { message: "studentId is required" } };
  }

  try {
    const [profileResult, goalResult, assignmentResult] = await Promise.all([
      supabase
        .from("student_school_profiles")
        .select(STUDENT_SCHOOL_PROFILE_FIELDS)
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("learning_goals")
        .select(LEARNING_GOAL_FIELDS)
        .eq("student_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("students")
        .select("class_id")
        .eq("id", id)
        .maybeSingle(),
    ]);

    if (profileResult.error) return { data: null, error: profileResult.error };
    if (goalResult.error) return { data: null, error: goalResult.error };
    if (assignmentResult.error) return { data: null, error: assignmentResult.error };

    let assignments = [];
    if (assignmentResult.data?.class_id) {
      const assignmentRead = await listClassCurriculumAssignments({ classId: assignmentResult.data.class_id });
      if (assignmentRead.error) return { data: null, error: assignmentRead.error };
      assignments = assignmentRead.data;
    }

    return {
      data: {
        student_id: id,
        student_school_profile: profileResult.data ?? null,
        class_curriculum_assignments: assignments,
        learning_goals: Array.isArray(goalResult.data) ? goalResult.data : [],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getClassLearningContext({ classId }) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: null };
  }
  const id = typeof classId === "string" ? classId.trim() : "";
  if (!id) {
    return { data: null, error: { message: "classId is required" } };
  }

  try {
    const [assignmentResult, goalsResult] = await Promise.all([
      listClassCurriculumAssignments({ classId: id }),
      listLearningGoals({ classId: id }),
    ]);

    if (assignmentResult.error) return { data: null, error: assignmentResult.error };
    if (goalsResult.error) return { data: null, error: goalsResult.error };

    return {
      data: {
        class_id: id,
        class_curriculum_assignments: assignmentResult.data,
        learning_goals: goalsResult.data,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

export async function listHomeworkTaskAssignees({
  homeworkTaskId,
  studentId,
  classId,
  status,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (homeworkTaskId != null && homeworkTaskId !== "" && !isUuidLike(homeworkTaskId)) {
    return { data: [], error: { message: "homeworkTaskId must be a UUID when provided" } };
  }
  if (studentId != null && studentId !== "" && !isUuidLike(studentId)) {
    return { data: [], error: { message: "studentId must be a UUID when provided" } };
  }
  if (classId != null && classId !== "" && !isUuidLike(classId)) {
    return { data: [], error: { message: "classId must be a UUID when provided" } };
  }

  try {
    let query = supabase
      .from("homework_task_assignees")
      .select(HOMEWORK_TASK_ASSIGNEE_FIELDS)
      .order("created_at", { ascending: false });

    if (isUuidLike(homeworkTaskId)) query = query.eq("homework_task_id", trimString(homeworkTaskId));
    if (isUuidLike(studentId)) query = query.eq("student_id", trimString(studentId));
    if (isUuidLike(classId)) query = query.eq("class_id", trimString(classId));
    if (typeof status === "string" && trimString(status)) query = query.eq("assignment_status", trimString(status));

    const { data, error } = await query;
    return { data: Array.isArray(data) ? data : [], error: error ?? null };
  } catch (error) {
    return { data: [], error };
  }
}

/**
 * Released homework feedback rows for AI parent report source aggregation (staff-only path).
 * Only status=released_to_parent. Never selects internal_note or file paths.
 * Optionally filters by released_to_parent_at within [periodStart, periodEnd] when both provided as ISO date strings.
 */
export async function listReleasedHomeworkFeedbackForAiEvidence({
  studentId,
  periodStart,
  periodEnd,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(studentId)) {
    return { data: [], error: { message: "studentId must be a UUID" } };
  }

  const sid = trimString(studentId);
  const ps = typeof periodStart === "string" ? periodStart.trim() : "";
  const pe = typeof periodEnd === "string" ? periodEnd.trim() : "";

  try {
    const subRead = await supabase
      .from("homework_submissions")
      .select("id,homework_task_id,submitted_at")
      .eq("student_id", sid)
      .order("submitted_at", { ascending: false })
      .limit(120);

    if (subRead.error) return { data: [], error: subRead.error };
    const subs = Array.isArray(subRead.data) ? subRead.data : [];
    if (subs.length === 0) return { data: [], error: null };

    const subIds = subs.map((row) => row.id).filter(Boolean);
    if (subIds.length === 0) return { data: [], error: null };

    let fbQuery = supabase
      .from("homework_feedback")
      .select("id,feedback_text,next_step,released_to_parent_at,homework_submission_id,status")
      .in("homework_submission_id", subIds)
      .eq("status", "released_to_parent")
      .not("released_to_parent_at", "is", null)
      .order("released_to_parent_at", { ascending: false })
      .limit(25);

    if (ps) fbQuery = fbQuery.gte("released_to_parent_at", ps);
    if (pe) {
      const endInclusive = pe.length === 10 ? `${pe}T23:59:59.999Z` : pe;
      fbQuery = fbQuery.lte("released_to_parent_at", endInclusive);
    }

    const fbRead = await fbQuery;
    if (fbRead.error) return { data: [], error: fbRead.error };

    const feedbackRows = Array.isArray(fbRead.data) ? fbRead.data : [];
    const subById = new Map(subs.map((row) => [row.id, row]));
    const taskIds = [...new Set(subs.map((row) => row.homework_task_id).filter(Boolean))];

    let taskById = new Map();
    if (taskIds.length > 0) {
      const taskRead = await supabase.from("homework_tasks").select("id,title,due_date").in("id", taskIds);
      if (!taskRead.error && Array.isArray(taskRead.data)) {
        taskById = new Map(taskRead.data.map((t) => [t.id, t]));
      }
    }

    const enriched = feedbackRows.map((fb) => {
      const sub = subById.get(fb.homework_submission_id);
      const task = sub?.homework_task_id ? taskById.get(sub.homework_task_id) : null;
      return {
        ...fb,
        task_title: task?.title ?? null,
        task_due_date: task?.due_date ?? null,
        submission_submitted_at: sub?.submitted_at ?? null,
      };
    });

    return { data: enriched, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listAssignedHomeworkForStudent({
  studentId,
  classId,
  status,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(studentId)) {
    return { data: [], error: { message: "studentId must be a UUID" } };
  }
  if (classId != null && classId !== "" && !isUuidLike(classId)) {
    return { data: [], error: { message: "classId must be a UUID when provided" } };
  }

  try {
    const normalizedStatus = typeof status === "string" ? trimString(status) : "";
    let resolvedClassId = isUuidLike(classId) ? trimString(classId) : null;

    if (!resolvedClassId) {
      const studentRead = await supabase
        .from("students")
        .select("id,class_id")
        .eq("id", trimString(studentId))
        .maybeSingle();
      if (studentRead.error) return { data: [], error: studentRead.error };
      resolvedClassId = studentRead.data?.class_id || null;
    }

    let assigneeQuery = supabase
      .from("homework_task_assignees")
      .select(HOMEWORK_TASK_ASSIGNEE_FIELDS)
      .eq("student_id", trimString(studentId))
      .order("created_at", { ascending: false });
    if (resolvedClassId) assigneeQuery = assigneeQuery.eq("class_id", resolvedClassId);
    if (normalizedStatus) assigneeQuery = assigneeQuery.eq("assignment_status", normalizedStatus);

    const assigneeRead = await assigneeQuery;
    if (assigneeRead.error) return { data: [], error: assigneeRead.error };
    const assigneeRows = Array.isArray(assigneeRead.data) ? assigneeRead.data : [];

    const classScopeRows = [];
    const assigneeTaskIds = new Set(assigneeRows.map((row) => row?.homework_task_id).filter(Boolean));
    const shouldIncludeClassScope =
      resolvedClassId && (!normalizedStatus || normalizedStatus === "assigned");

    if (shouldIncludeClassScope) {
      let classScopeQuery = supabase
        .from("homework_tasks")
        .select(HOMEWORK_TASK_FIELDS)
        .eq("class_id", resolvedClassId)
        .eq("assignment_scope", "class")
        .eq("status", "assigned")
        .order("created_at", { ascending: false });
      const classScopeRead = await classScopeQuery;
      if (classScopeRead.error) return { data: [], error: classScopeRead.error };
      const classScopeTasks = Array.isArray(classScopeRead.data) ? classScopeRead.data : [];

      for (const task of classScopeTasks) {
        if (!task?.id || assigneeTaskIds.has(task.id)) continue;
        classScopeRows.push({
          id: null,
          homework_task_id: task.id,
          branch_id: task.branch_id || null,
          class_id: task.class_id || resolvedClassId,
          student_id: trimString(studentId),
          assigned_by_profile_id: task.created_by_profile_id || null,
          assignment_status: "assigned",
          due_date: task.due_date || null,
          notes: null,
          created_at: task.created_at || null,
          updated_at: task.updated_at || null,
          homework_task: task,
          assignment_source: "class_scope_fallback",
        });
      }
    }

    return {
      data: [...assigneeRows, ...classScopeRows],
      error: null,
    };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listHomeworkTrackerByClass({ classId, status } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(classId)) {
    return { data: [], error: { message: "classId must be a UUID" } };
  }

  try {
    const normalizedStatus = typeof status === "string" ? trimString(status) : "";
    const [taskRead, assigneeRead, submissionRead, classStudentRead] = await Promise.all([
      supabase
        .from("homework_tasks")
        .select(HOMEWORK_TASK_FIELDS)
        .eq("class_id", trimString(classId))
        .order("created_at", { ascending: false }),
      supabase
        .from("homework_task_assignees")
        .select(HOMEWORK_TASK_ASSIGNEE_FIELDS)
        .eq("class_id", trimString(classId))
        .order("created_at", { ascending: false }),
      supabase
        .from("homework_submissions")
        .select(HOMEWORK_SUBMISSION_FIELDS)
        .eq("class_id", trimString(classId))
        .order("created_at", { ascending: false }),
      supabase
        .from("students")
        .select("id,class_id")
        .eq("class_id", trimString(classId)),
    ]);

    if (taskRead.error) return { data: [], error: taskRead.error };
    if (assigneeRead.error) return { data: [], error: assigneeRead.error };
    if (submissionRead.error) return { data: [], error: submissionRead.error };
    if (classStudentRead.error) return { data: [], error: classStudentRead.error };

    const tasks = Array.isArray(taskRead.data) ? taskRead.data : [];
    const assignees = Array.isArray(assigneeRead.data) ? assigneeRead.data : [];
    const submissions = Array.isArray(submissionRead.data) ? submissionRead.data : [];
    const classStudentIds = new Set(
      (Array.isArray(classStudentRead.data) ? classStudentRead.data : [])
        .map((row) => row?.id)
        .filter(Boolean)
    );

    const taskById = new Map();
    for (const task of tasks) {
      if (task?.id) taskById.set(task.id, task);
    }
    for (const row of assignees) {
      const task = row?.homework_task;
      if (task?.id && !taskById.has(task.id)) taskById.set(task.id, task);
    }

    const assigneesByTaskId = new Map();
    for (const row of assignees) {
      if (!row?.homework_task_id) continue;
      if (!assigneesByTaskId.has(row.homework_task_id)) assigneesByTaskId.set(row.homework_task_id, []);
      assigneesByTaskId.get(row.homework_task_id).push(row);
    }

    const submissionsByTaskId = new Map();
    for (const row of submissions) {
      if (!row?.homework_task_id) continue;
      if (!submissionsByTaskId.has(row.homework_task_id)) submissionsByTaskId.set(row.homework_task_id, []);
      submissionsByTaskId.get(row.homework_task_id).push(row);
    }

    const trackerRows = [];
    for (const [taskId, task] of taskById.entries()) {
      const taskAssignees = assigneesByTaskId.get(taskId) || [];
      const taskSubmissions = submissionsByTaskId.get(taskId) || [];
      const studentState = new Map();

      // Explicit assignee rows are source-of-truth for selected/individual tasks.
      for (const assignee of taskAssignees) {
        if (!assignee?.student_id) continue;
        studentState.set(assignee.student_id, {
          studentId: assignee.student_id,
          assignee,
          submission: null,
        });
      }

      // Class-scope fallback: include class students even without explicit assignee rows.
      if ((task?.assignment_scope || "class") === "class") {
        for (const studentId of classStudentIds) {
          if (!studentState.has(studentId)) {
            studentState.set(studentId, {
              studentId,
              assignee: {
                id: null,
                homework_task_id: taskId,
                branch_id: task?.branch_id || null,
                class_id: task?.class_id || trimString(classId),
                student_id: studentId,
                assigned_by_profile_id: task?.created_by_profile_id || null,
                assignment_status: "assigned",
                due_date: task?.due_date || null,
                notes: null,
                created_at: task?.created_at || null,
                updated_at: task?.updated_at || null,
                assignment_source: "class_scope_fallback",
              },
              submission: null,
            });
          }
        }
      }

      for (const submission of taskSubmissions) {
        if (!submission?.student_id) continue;
        const current = studentState.get(submission.student_id) || {
          studentId: submission.student_id,
          assignee: null,
          submission: null,
        };
        current.submission = submission;
        studentState.set(submission.student_id, current);
      }

      const counts = createTrackerCounts();
      const statusFilterEnabled = !!normalizedStatus;
      const normalizedEntries = [];

      for (const row of studentState.values()) {
        const derivedStatus =
          mapSubmissionStatusToTrackerStatus(row?.submission?.status) ||
          mapAssignmentStatusToTrackerStatus(row?.assignee?.assignment_status) ||
          "assigned";
        if (statusFilterEnabled && normalizedStatus !== derivedStatus) continue;
        if (derivedStatus === "assigned") incrementTrackerCount(counts, "assigned");
        if (derivedStatus === "submitted") incrementTrackerCount(counts, "submitted");
        if (derivedStatus === "underReview") incrementTrackerCount(counts, "underReview");
        if (derivedStatus === "returned") incrementTrackerCount(counts, "returned");
        if (derivedStatus === "reviewed") incrementTrackerCount(counts, "reviewed");
        if (derivedStatus === "feedbackReleased") incrementTrackerCount(counts, "feedbackReleased");
        normalizedEntries.push({
          studentId: row.studentId,
          assignee: row.assignee,
          submission: row.submission,
          status: derivedStatus,
        });
      }

      counts.notSubmitted = Math.max(0, normalizedEntries.length - (
        counts.submitted + counts.underReview + counts.returned + counts.reviewed + counts.feedbackReleased
      ));

      trackerRows.push({
        task,
        assignees: normalizedEntries.map((item) => item.assignee).filter(Boolean),
        submissions: normalizedEntries.map((item) => item.submission).filter(Boolean),
        counts,
      });
    }

    return { data: trackerRows, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listHomeworkTrackerByStudent({ studentId, status } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(studentId)) {
    return { data: null, error: { message: "studentId must be a UUID" } };
  }

  try {
    const normalizedStatus = typeof status === "string" ? trimString(status) : "";
    const assignedRead = await listAssignedHomeworkForStudent({ studentId: trimString(studentId) });
    if (assignedRead.error) return { data: null, error: assignedRead.error };
    const assignedRows = Array.isArray(assignedRead.data) ? assignedRead.data : [];
    const taskIds = [...new Set(assignedRows.map((row) => row?.homework_task_id).filter(Boolean))];

    let submissions = [];
    if (taskIds.length > 0) {
      const submissionRead = await supabase
        .from("homework_submissions")
        .select(HOMEWORK_SUBMISSION_FIELDS)
        .eq("student_id", trimString(studentId))
        .in("homework_task_id", taskIds)
        .order("created_at", { ascending: false });
      if (submissionRead.error) return { data: null, error: submissionRead.error };
      submissions = Array.isArray(submissionRead.data) ? submissionRead.data : [];
    }

    const submissionByTaskId = new Map();
    for (const submission of submissions) {
      if (!submission?.homework_task_id) continue;
      const current = submissionByTaskId.get(submission.homework_task_id);
      if (!current) {
        submissionByTaskId.set(submission.homework_task_id, submission);
        continue;
      }
      const currentCreated = new Date(current.created_at || 0).getTime();
      const nextCreated = new Date(submission.created_at || 0).getTime();
      if (nextCreated > currentCreated) submissionByTaskId.set(submission.homework_task_id, submission);
    }

    const submissionIds = [...new Set([...submissionByTaskId.values()].map((row) => row?.id).filter(Boolean))];
    let feedbackRows = [];
    if (submissionIds.length > 0) {
      const feedbackRead = await supabase
        .from("homework_feedback")
        .select(HOMEWORK_FEEDBACK_RELEASE_FIELDS)
        .in("homework_submission_id", submissionIds)
        .eq("status", "released_to_parent")
        .order("created_at", { ascending: false });
      if (feedbackRead.error) return { data: null, error: feedbackRead.error };
      feedbackRows = Array.isArray(feedbackRead.data) ? feedbackRead.data : [];
    }

    const releasedFeedbackSubmissionIds = new Set(
      feedbackRows.map((row) => row?.homework_submission_id).filter(Boolean)
    );

    const counts = createTrackerCounts();
    const assignedItems = [];

    for (const row of assignedRows) {
      const taskId = row?.homework_task_id;
      if (!taskId) continue;
      const submission = submissionByTaskId.get(taskId) || null;
      const hasReleasedFeedback = !!(submission?.id && releasedFeedbackSubmissionIds.has(submission.id));
      let derivedStatus =
        mapSubmissionStatusToTrackerStatus(submission?.status) ||
        mapAssignmentStatusToTrackerStatus(row?.assignment_status) ||
        "assigned";
      if (hasReleasedFeedback) derivedStatus = "feedbackReleased";
      if (normalizedStatus && normalizedStatus !== derivedStatus) continue;

      if (derivedStatus === "assigned") incrementTrackerCount(counts, "assigned");
      if (derivedStatus === "submitted") incrementTrackerCount(counts, "submitted");
      if (derivedStatus === "underReview") incrementTrackerCount(counts, "underReview");
      if (derivedStatus === "returned") incrementTrackerCount(counts, "returned");
      if (derivedStatus === "reviewed") incrementTrackerCount(counts, "reviewed");
      if (derivedStatus === "feedbackReleased") incrementTrackerCount(counts, "feedbackReleased");

      assignedItems.push({
        task: row?.homework_task || null,
        assignee: row,
        submission,
        status: derivedStatus,
        hasReleasedFeedback,
      });
    }

    counts.notSubmitted = Math.max(
      0,
      assignedItems.length - (
        counts.submitted + counts.underReview + counts.returned + counts.reviewed + counts.feedbackReleased
      )
    );

    return {
      data: {
        studentId: trimString(studentId),
        assignedItems,
        counts,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

function toIsoDateString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function isPastDate(isoDate) {
  if (typeof isoDate !== "string" || !isoDate) return false;
  const todayIso = new Date().toISOString().slice(0, 10);
  return isoDate < todayIso;
}

function toIsoTimestamp(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function maxIsoTimestamp(...values) {
  const normalized = values
    .map((value) => toIsoTimestamp(value))
    .filter(Boolean);
  if (normalized.length === 0) return null;
  normalized.sort();
  return normalized[normalized.length - 1];
}

function isStaffRole(roleValue) {
  const role = trimString(roleValue);
  return role === "hq_admin" || role === "branch_supervisor" || role === "teacher";
}

export async function listAnnouncementCompletionOverview({
  announcementId,
  branchId,
  includeCompleted = true,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (announcementId != null && announcementId !== "" && !isUuidLike(announcementId)) {
    return { data: [], error: { message: "announcementId must be a UUID when provided" } };
  }
  if (branchId != null && branchId !== "" && !isUuidLike(branchId)) {
    return { data: [], error: { message: "branchId must be a UUID when provided" } };
  }

  try {
    const authRead = await supabase.auth.getUser();
    const profileId = authRead?.data?.user?.id || null;
    if (!isUuidLike(profileId)) {
      return { data: [], error: { message: "Authenticated user is required" } };
    }

    const actorProfileRead = await supabase
      .from("profiles")
      .select("id,role,branch_id,is_active")
      .eq("id", profileId)
      .maybeSingle();
    if (actorProfileRead.error || !actorProfileRead.data) {
      return { data: [], error: { message: "Completion overview is temporarily unavailable." } };
    }
    const actorRole = trimString(actorProfileRead.data.role);
    const actorBranchId = isUuidLike(actorProfileRead.data.branch_id)
      ? trimString(actorProfileRead.data.branch_id)
      : null;
    const isHq = actorRole === "hq_admin";
    const isSupervisor = actorRole === "branch_supervisor";
    if (!isHq && !isSupervisor) {
      return { data: [], error: null };
    }

    let announcementsQuery = supabase
      .from("announcements")
      .select(ANNOUNCEMENT_FIELDS)
      .eq("audience_type", "internal_staff")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (isUuidLike(announcementId)) {
      announcementsQuery = announcementsQuery.eq("id", trimString(announcementId));
    }
    const normalizedBranchId = isUuidLike(branchId) ? trimString(branchId) : null;
    if (normalizedBranchId) {
      announcementsQuery = announcementsQuery.eq("branch_id", normalizedBranchId);
    }
    if (isSupervisor && actorBranchId) {
      announcementsQuery = announcementsQuery.eq("branch_id", actorBranchId);
    }

    const announcementsRead = await announcementsQuery;
    if (announcementsRead.error) {
      return { data: [], error: { message: "Completion overview is temporarily unavailable." } };
    }
    const announcements = Array.isArray(announcementsRead.data) ? announcementsRead.data : [];
    const announcementIds = announcements
      .map((row) => row?.id)
      .filter((id) => isUuidLike(id));
    if (announcementIds.length === 0) {
      return { data: [], error: null };
    }

    const [targetsRead, statusesRead, repliesRead, attachmentsRead] = await Promise.all([
      supabase
        .from("announcement_targets")
        .select("announcement_id,target_type,branch_id,target_profile_id,target_role")
        .in("announcement_id", announcementIds),
      supabase
        .from("announcement_statuses")
        .select("announcement_id,profile_id,read_at,done_status,done_at,undone_reason,updated_at")
        .in("announcement_id", announcementIds),
      supabase
        .from("announcement_replies")
        .select("announcement_id,profile_id,created_at")
        .in("announcement_id", announcementIds),
      supabase
        .from("announcement_attachments")
        .select("announcement_id,uploaded_by_profile_id,file_role,created_at")
        .in("announcement_id", announcementIds),
    ]);

    if (targetsRead.error || statusesRead.error || repliesRead.error || attachmentsRead.error) {
      return { data: [], error: { message: "Completion overview is temporarily unavailable." } };
    }

    const targetRows = Array.isArray(targetsRead.data) ? targetsRead.data : [];
    const statusRows = Array.isArray(statusesRead.data) ? statusesRead.data : [];
    const replyRows = Array.isArray(repliesRead.data) ? repliesRead.data : [];
    const attachmentRows = Array.isArray(attachmentsRead.data) ? attachmentsRead.data : [];

    const candidateProfileIds = new Set();
    const targetBranchIds = new Set();
    const targetRoles = new Set();

    for (const row of statusRows) {
      if (isUuidLike(row?.profile_id)) candidateProfileIds.add(trimString(row.profile_id));
    }
    for (const row of replyRows) {
      if (isUuidLike(row?.profile_id)) candidateProfileIds.add(trimString(row.profile_id));
    }
    for (const row of attachmentRows) {
      if (isUuidLike(row?.uploaded_by_profile_id)) {
        candidateProfileIds.add(trimString(row.uploaded_by_profile_id));
      }
    }
    for (const row of targetRows) {
      const targetType = trimString(row?.target_type);
      if (targetType === "profile" && isUuidLike(row?.target_profile_id)) {
        candidateProfileIds.add(trimString(row.target_profile_id));
      }
      if ((targetType === "branch" || targetType === "class") && isUuidLike(row?.branch_id)) {
        targetBranchIds.add(trimString(row.branch_id));
      }
      if (targetType === "role" && trimString(row?.target_role)) {
        targetRoles.add(trimString(row.target_role));
      }
    }

    let profileRows = [];
    if (candidateProfileIds.size > 0 || targetBranchIds.size > 0 || targetRoles.size > 0) {
      let profileQuery = supabase
        .from("profiles")
        .select("id,role,branch_id,is_active")
        .eq("is_active", true);
      if (candidateProfileIds.size > 0) {
        profileQuery = profileQuery.in("id", [...candidateProfileIds]);
      } else {
        profileQuery = profileQuery.limit(0);
      }
      const profileRead = await profileQuery;
      profileRows = profileRead.error || !Array.isArray(profileRead.data) ? [] : profileRead.data;

      // Pull additional active branch/role scoped profiles when targets need expansion.
      if (targetBranchIds.size > 0 || targetRoles.size > 0) {
        let scopedProfileQuery = supabase
          .from("profiles")
          .select("id,role,branch_id,is_active")
          .eq("is_active", true);
        if (targetBranchIds.size > 0) {
          scopedProfileQuery = scopedProfileQuery.in("branch_id", [...targetBranchIds]);
        }
        if (targetRoles.size > 0) {
          scopedProfileQuery = scopedProfileQuery.in("role", [...targetRoles]);
        }
        const scopedProfileRead = await scopedProfileQuery;
        if (!scopedProfileRead.error && Array.isArray(scopedProfileRead.data)) {
          const seen = new Set(profileRows.map((row) => row?.id).filter(Boolean));
          for (const row of scopedProfileRead.data) {
            if (!row?.id || seen.has(row.id)) continue;
            profileRows.push(row);
            seen.add(row.id);
          }
        }
      }
    }

    const profileMap = new Map();
    for (const row of profileRows) {
      if (!isUuidLike(row?.id)) continue;
      const normalizedRole = trimString(row?.role);
      if (!isStaffRole(normalizedRole)) continue;
      profileMap.set(trimString(row.id), {
        profileId: trimString(row.id),
        role: normalizedRole,
        branchId: isUuidLike(row?.branch_id) ? trimString(row.branch_id) : null,
      });
    }

    const branchIds = [...new Set(
      [
        ...announcements.map((row) => (isUuidLike(row?.branch_id) ? trimString(row.branch_id) : null)),
        ...profileRows.map((row) => (isUuidLike(row?.branch_id) ? trimString(row.branch_id) : null)),
      ].filter(Boolean)
    )];
    const branchNameMap = new Map();
    if (branchIds.length > 0) {
      const branchRead = await supabase
        .from("branches")
        .select("id,name")
        .in("id", branchIds);
      if (!branchRead.error && Array.isArray(branchRead.data)) {
        for (const row of branchRead.data) {
          if (!isUuidLike(row?.id)) continue;
          branchNameMap.set(trimString(row.id), trimString(row?.name) || null);
        }
      }
    }

    const targetsByAnnouncementId = new Map();
    for (const row of targetRows) {
      if (!isUuidLike(row?.announcement_id)) continue;
      const key = trimString(row.announcement_id);
      if (!targetsByAnnouncementId.has(key)) targetsByAnnouncementId.set(key, []);
      targetsByAnnouncementId.get(key).push(row);
    }

    const statusesByAnnouncementId = new Map();
    for (const row of statusRows) {
      if (!isUuidLike(row?.announcement_id) || !isUuidLike(row?.profile_id)) continue;
      const key = `${trimString(row.announcement_id)}:${trimString(row.profile_id)}`;
      statusesByAnnouncementId.set(key, row);
    }

    const repliesByAnnouncementAndProfile = new Map();
    const latestReplyByAnnouncementId = new Map();
    for (const row of replyRows) {
      if (!isUuidLike(row?.announcement_id) || !isUuidLike(row?.profile_id)) continue;
      const announcementKey = trimString(row.announcement_id);
      const profileKey = trimString(row.profile_id);
      const key = `${announcementKey}:${profileKey}`;
      const current = repliesByAnnouncementAndProfile.get(key) || { replyCount: 0, latestReplyAt: null };
      current.replyCount += 1;
      current.latestReplyAt = maxIsoTimestamp(current.latestReplyAt, row?.created_at);
      repliesByAnnouncementAndProfile.set(key, current);
      latestReplyByAnnouncementId.set(
        announcementKey,
        maxIsoTimestamp(latestReplyByAnnouncementId.get(announcementKey), row?.created_at)
      );
    }

    const attachmentsByAnnouncementAndProfile = new Map();
    const latestUploadByAnnouncementId = new Map();
    for (const row of attachmentRows) {
      if (!isUuidLike(row?.announcement_id) || !isUuidLike(row?.uploaded_by_profile_id)) continue;
      const announcementKey = trimString(row.announcement_id);
      const profileKey = trimString(row.uploaded_by_profile_id);
      const key = `${announcementKey}:${profileKey}`;
      const current = attachmentsByAnnouncementAndProfile.get(key) || {
        attachmentCount: 0,
        responseUploadCount: 0,
        latestUploadAt: null,
      };
      current.attachmentCount += 1;
      if (trimString(row?.file_role) === "response_upload") current.responseUploadCount += 1;
      current.latestUploadAt = maxIsoTimestamp(current.latestUploadAt, row?.created_at);
      attachmentsByAnnouncementAndProfile.set(key, current);
      latestUploadByAnnouncementId.set(
        announcementKey,
        maxIsoTimestamp(latestUploadByAnnouncementId.get(announcementKey), row?.created_at)
      );
    }

    const results = [];
    for (const announcement of announcements) {
      const annId = trimString(announcement?.id);
      if (!isUuidLike(annId)) continue;

      const requiresResponse = Boolean(announcement?.requires_response);
      const requiresUpload = Boolean(announcement?.requires_upload);
      const dueDate = toIsoDateString(announcement?.due_date);
      const targetRowsForAnnouncement = targetsByAnnouncementId.get(annId) || [];
      const targetedProfiles = new Map();

      for (const target of targetRowsForAnnouncement) {
        const targetType = trimString(target?.target_type);
        if (targetType === "profile" && isUuidLike(target?.target_profile_id)) {
          const pid = trimString(target.target_profile_id);
          const profile = profileMap.get(pid);
          if (profile) targetedProfiles.set(pid, { profile, targetSource: "profile" });
        } else if (targetType === "branch" || targetType === "class") {
          const tid = isUuidLike(target?.branch_id) ? trimString(target.branch_id) : null;
          for (const profile of profileMap.values()) {
            if (!tid || profile.branchId !== tid) continue;
            if (!targetedProfiles.has(profile.profileId)) {
              targetedProfiles.set(profile.profileId, { profile, targetSource: "branch" });
            }
          }
        } else if (targetType === "role") {
          const targetRole = trimString(target?.target_role);
          const targetBranch = isUuidLike(target?.branch_id) ? trimString(target.branch_id) : null;
          for (const profile of profileMap.values()) {
            if (profile.role !== targetRole) continue;
            if (targetBranch && profile.branchId !== targetBranch) continue;
            if (!targetedProfiles.has(profile.profileId)) {
              targetedProfiles.set(profile.profileId, { profile, targetSource: "role" });
            }
          }
        }
      }

      const perPersonRows = [];
      for (const { profile, targetSource } of targetedProfiles.values()) {
        const statusKey = `${annId}:${profile.profileId}`;
        const status = statusesByAnnouncementId.get(statusKey) || null;
        const doneStatus = ANNOUNCEMENT_DONE_STATUS_VALUES.has(trimString(status?.done_status))
          ? trimString(status.done_status)
          : "pending";
        const readAt = toIsoTimestamp(status?.read_at);
        const replyState = repliesByAnnouncementAndProfile.get(statusKey) || {
          replyCount: 0,
          latestReplyAt: null,
        };
        const attachmentState = attachmentsByAnnouncementAndProfile.get(statusKey) || {
          attachmentCount: 0,
          responseUploadCount: 0,
          latestUploadAt: null,
        };
        const responseProvided = replyState.replyCount > 0;
        const uploadProvided = attachmentState.responseUploadCount > 0;
        const isOverdue = Boolean(dueDate)
          && isPastDate(dueDate)
          && (doneStatus !== "done" || (requiresResponse && !responseProvided) || (requiresUpload && !uploadProvided));
        const lastActivityAt = maxIsoTimestamp(
          readAt,
          status?.updated_at,
          replyState.latestReplyAt,
          attachmentState.latestUploadAt
        );

        if (
          !includeCompleted
          && doneStatus === "done"
          && !isOverdue
          && (!requiresResponse || responseProvided)
          && (!requiresUpload || uploadProvided)
        ) {
          continue;
        }

        perPersonRows.push({
          profileId: profile.profileId,
          staffName: null,
          role: profile.role,
          branchId: profile.branchId || null,
          branchName: profile.branchId ? (branchNameMap.get(profile.branchId) || null) : null,
          targetSource,
          readAt,
          doneStatus,
          undoneReason: trimString(status?.undone_reason) || null,
          replyCount: replyState.replyCount,
          responseProvided,
          attachmentCount: attachmentState.attachmentCount,
          uploadProvided,
          isOverdue,
          lastActivityAt,
        });
      }

      const totalTargeted = perPersonRows.length;
      const readCount = perPersonRows.filter((row) => Boolean(row.readAt)).length;
      const unreadCount = totalTargeted - readCount;
      const doneCount = perPersonRows.filter((row) => row.doneStatus === "done").length;
      const pendingCount = perPersonRows.filter((row) => row.doneStatus === "pending").length;
      const undoneCount = perPersonRows.filter((row) => row.doneStatus === "undone").length;
      const responseRequiredCount = requiresResponse ? totalTargeted : 0;
      const responseProvidedCount = requiresResponse
        ? perPersonRows.filter((row) => row.responseProvided).length
        : 0;
      const responseMissingCount = requiresResponse
        ? perPersonRows.filter((row) => !row.responseProvided).length
        : 0;
      const uploadRequiredCount = requiresUpload ? totalTargeted : 0;
      const uploadProvidedCount = requiresUpload
        ? perPersonRows.filter((row) => row.uploadProvided).length
        : 0;
      const uploadMissingCount = requiresUpload
        ? perPersonRows.filter((row) => !row.uploadProvided).length
        : 0;
      const overdueCount = perPersonRows.filter((row) => row.isOverdue).length;

      results.push({
        announcementId: annId,
        title: trimString(announcement?.title) || "Untitled announcement",
        priority: trimString(announcement?.priority) || "normal",
        branchId: isUuidLike(announcement?.branch_id) ? trimString(announcement.branch_id) : null,
        branchName: isUuidLike(announcement?.branch_id)
          ? (branchNameMap.get(trimString(announcement.branch_id)) || null)
          : null,
        dueDate,
        requiresResponse,
        requiresUpload,
        totalTargeted,
        readCount,
        unreadCount,
        doneCount,
        pendingCount,
        undoneCount,
        responseRequiredCount,
        responseProvidedCount,
        responseMissingCount,
        uploadRequiredCount,
        uploadProvidedCount,
        uploadMissingCount,
        overdueCount,
        latestReplyAt: latestReplyByAnnouncementId.get(annId) || null,
        latestUploadAt: latestUploadByAnnouncementId.get(annId) || null,
        rows: perPersonRows,
      });
    }

    return { data: results, error: null };
  } catch (_error) {
    return { data: [], error: { message: "Completion overview is temporarily unavailable." } };
  }
}

export async function listMyAnnouncementTasks({ includeDone = false, statusFilter } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }

  if (
    statusFilter != null
    && statusFilter !== ""
    && !ANNOUNCEMENT_TASK_STATUS_VALUES.has(trimString(statusFilter))
  ) {
    return {
      data: [],
      error: { message: "statusFilter must be unread, pending, undone, overdue, or done" },
    };
  }

  try {
    const authRead = await supabase.auth.getUser();
    const profileId = authRead?.data?.user?.id || null;
    if (!isUuidLike(profileId)) {
      return { data: [], error: { message: "Authenticated user is required" } };
    }

    const announcementsRead = await supabase
      .from("announcements")
      .select(ANNOUNCEMENT_FIELDS)
      .eq("audience_type", "internal_staff")
      .eq("announcement_type", "request")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (announcementsRead.error) {
      return { data: [], error: { message: "Unable to load announcement tasks right now." } };
    }

    const announcements = Array.isArray(announcementsRead.data) ? announcementsRead.data : [];
    const announcementIds = announcements
      .map((row) => row?.id)
      .filter((id) => isUuidLike(id));

    if (announcementIds.length === 0) return { data: [], error: null };

    const [statusRead, repliesRead, attachmentsRead] = await Promise.all([
      supabase
        .from("announcement_statuses")
        .select("announcement_id,profile_id,read_at,done_status,updated_at")
        .eq("profile_id", profileId)
        .in("announcement_id", announcementIds),
      supabase
        .from("announcement_replies")
        .select("id,announcement_id,profile_id")
        .in("announcement_id", announcementIds),
      supabase
        .from("announcement_attachments")
        .select("id,announcement_id,uploaded_by_profile_id,file_role")
        .in("announcement_id", announcementIds),
    ]);

    if (statusRead.error || repliesRead.error || attachmentsRead.error) {
      return { data: [], error: { message: "Unable to load announcement tasks right now." } };
    }

    const statusByAnnouncementId = new Map();
    for (const row of (Array.isArray(statusRead.data) ? statusRead.data : [])) {
      if (!isUuidLike(row?.announcement_id)) continue;
      statusByAnnouncementId.set(row.announcement_id, row);
    }

    const replyCountByAnnouncementId = new Map();
    const actorReplyCountByAnnouncementId = new Map();
    for (const row of (Array.isArray(repliesRead.data) ? repliesRead.data : [])) {
      if (!isUuidLike(row?.announcement_id)) continue;
      const key = row.announcement_id;
      replyCountByAnnouncementId.set(key, (replyCountByAnnouncementId.get(key) || 0) + 1);
      if (row?.profile_id === profileId) {
        actorReplyCountByAnnouncementId.set(key, (actorReplyCountByAnnouncementId.get(key) || 0) + 1);
      }
    }

    const attachmentCountByAnnouncementId = new Map();
    const actorResponseUploadCountByAnnouncementId = new Map();
    for (const row of (Array.isArray(attachmentsRead.data) ? attachmentsRead.data : [])) {
      if (!isUuidLike(row?.announcement_id)) continue;
      const key = row.announcement_id;
      attachmentCountByAnnouncementId.set(key, (attachmentCountByAnnouncementId.get(key) || 0) + 1);
      if (row?.uploaded_by_profile_id === profileId && row?.file_role === "response_upload") {
        actorResponseUploadCountByAnnouncementId.set(
          key,
          (actorResponseUploadCountByAnnouncementId.get(key) || 0) + 1
        );
      }
    }

    const normalizedStatusFilter = trimString(statusFilter);
    const rows = [];

    for (const announcement of announcements) {
      const announcementId = announcement?.id;
      if (!isUuidLike(announcementId)) continue;

      const ownStatus = statusByAnnouncementId.get(announcementId) || null;
      const doneStatus = ANNOUNCEMENT_DONE_STATUS_VALUES.has(trimString(ownStatus?.done_status))
        ? trimString(ownStatus?.done_status)
        : "pending";
      const isUnread = !ownStatus?.read_at;
      const requiresResponse = Boolean(announcement?.requires_response);
      const requiresUpload = Boolean(announcement?.requires_upload);
      const responseProvided = (actorReplyCountByAnnouncementId.get(announcementId) || 0) > 0;
      const uploadProvided = (actorResponseUploadCountByAnnouncementId.get(announcementId) || 0) > 0;
      const missingResponse = requiresResponse && !responseProvided;
      const missingUpload = requiresUpload && !uploadProvided;
      const dueDate = toIsoDateString(announcement?.due_date);
      const isOverdue = Boolean(dueDate) && isPastDate(dueDate) && (doneStatus !== "done" || missingResponse || missingUpload);

      const candidate =
        isUnread
        || doneStatus === "pending"
        || doneStatus === "undone"
        || missingResponse
        || missingUpload
        || isOverdue
        || (Boolean(includeDone) && doneStatus === "done");

      if (!candidate) continue;
      if (!includeDone && doneStatus === "done" && !missingResponse && !missingUpload && !isOverdue) continue;

      let status = "pending";
      if (isOverdue) status = "overdue";
      else if (doneStatus === "undone") status = "undone";
      else if (doneStatus === "done") status = "done";
      else if (isUnread) status = "unread";

      if (normalizedStatusFilter && status !== normalizedStatusFilter) continue;

      const bodyPreview = trimString(announcement?.body).slice(0, 200);
      rows.push({
        taskId: `announcement:${announcementId}`,
        announcementId,
        source: "announcement",
        title: trimString(announcement?.title) || "Untitled announcement",
        bodyPreview,
        priority: trimString(announcement?.priority) || "normal",
        dueDate,
        status,
        isOverdue,
        requiresResponse,
        responseProvided,
        requiresUpload,
        uploadProvided,
        replyCount: replyCountByAnnouncementId.get(announcementId) || 0,
        attachmentCount: attachmentCountByAnnouncementId.get(announcementId) || 0,
        actionUrl: `/announcements?announcementId=${announcementId}`,
        createdAt: announcement?.created_at || null,
        updatedAt: ownStatus?.updated_at || announcement?.updated_at || announcement?.created_at || null,
      });
    }

    return { data: rows, error: null };
  } catch (_error) {
    return { data: [], error: { message: "Unable to load announcement tasks right now." } };
  }
}

export async function listAnnouncements({
  status,
  audienceType = "internal_staff",
  announcementType,
  doneStatus,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (status != null && status !== "" && !ANNOUNCEMENT_STATUS_VALUES.has(trimString(status))) {
    return { data: [], error: { message: "status must be draft, published, closed, or archived" } };
  }
  if (audienceType != null && audienceType !== "" && !ANNOUNCEMENT_AUDIENCE_VALUES.has(trimString(audienceType))) {
    return { data: [], error: { message: "audienceType must be internal_staff or parent_facing" } };
  }
  if (announcementType != null && announcementType !== "" && !ANNOUNCEMENT_TYPE_VALUES.has(trimString(announcementType))) {
    return { data: [], error: { message: "announcementType must be request, company_news, or parent_event" } };
  }
  if (doneStatus != null && doneStatus !== "" && !ANNOUNCEMENT_DONE_STATUS_VALUES.has(trimString(doneStatus))) {
    return { data: [], error: { message: "doneStatus must be pending, done, or undone" } };
  }

  try {
    let query = supabase
      .from("announcements")
      .select(`${ANNOUNCEMENT_FIELDS},announcement_statuses(${ANNOUNCEMENT_STATUS_FIELDS})`)
      .order("created_at", { ascending: false });

    const normalizedAudience = trimString(audienceType);
    if (normalizedAudience) query = query.eq("audience_type", normalizedAudience);
    if (status != null && status !== "") query = query.eq("status", trimString(status));
    if (announcementType != null && announcementType !== "") query = query.eq("announcement_type", trimString(announcementType));
    if (doneStatus != null && doneStatus !== "") query = query.eq("announcement_statuses.done_status", trimString(doneStatus));

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listParentAnnouncements({
  status,
  announcementType,
  branchId,
  classId,
  includeArchived = false,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (status != null && status !== "" && !PARENT_ANNOUNCEMENT_STATUS_VALUES.has(trimString(status))) {
    return { data: [], error: { message: "status must be draft, published, or archived" } };
  }
  if (
    announcementType != null &&
    announcementType !== "" &&
    !PARENT_ANNOUNCEMENT_TYPE_VALUES.has(trimString(announcementType))
  ) {
    return {
      data: [],
      error: {
        message:
          "announcementType must be event, activity, centre_notice, holiday_closure, reminder, celebration, programme_update, parent_workshop, or graduation_concert",
      },
    };
  }
  if (branchId != null && branchId !== "" && !isUuidLike(branchId)) {
    return { data: [], error: { message: "branchId must be a UUID when provided" } };
  }
  if (classId != null && classId !== "" && !isUuidLike(classId)) {
    return { data: [], error: { message: "classId must be a UUID when provided" } };
  }
  if (includeArchived != null && typeof includeArchived !== "boolean") {
    return { data: [], error: { message: "includeArchived must be a boolean when provided" } };
  }

  try {
    let query = supabase
      .from("parent_announcements")
      .select(PARENT_ANNOUNCEMENT_FIELDS)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (status != null && status !== "") {
      query = query.eq("status", trimString(status));
    } else if (!includeArchived) {
      query = query.neq("status", "archived");
    }
    if (announcementType != null && announcementType !== "") {
      query = query.eq("announcement_type", trimString(announcementType));
    }
    if (isUuidLike(branchId)) query = query.eq("branch_id", trimString(branchId));
    if (isUuidLike(classId)) query = query.eq("class_id", trimString(classId));

    const { data, error } = await query;
    if (error) {
      return { data: [], error: sanitizeReadError(error, "Unable to load parent announcements right now.") };
    }
    const rows = Array.isArray(data) ? data : [];
    return { data: rows.map((row) => mapParentAnnouncementRow(row)), error: null };
  } catch (_error) {
    return { data: [], error: { message: "Unable to load parent announcements right now." } };
  }
}

export async function getParentAnnouncementDetail({ parentAnnouncementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(parentAnnouncementId)) {
    return { data: null, error: { message: "parentAnnouncementId must be a UUID" } };
  }

  try {
    const { data, error } = await supabase
      .from("parent_announcements")
      .select(PARENT_ANNOUNCEMENT_FIELDS)
      .eq("id", trimString(parentAnnouncementId))
      .maybeSingle();

    if (error || !data?.id) {
      return {
        data: null,
        error: sanitizeReadError(error, "Unable to load parent announcement detail right now."),
      };
    }

    return {
      data: mapParentAnnouncementRow(data, { includeBodyDetail: true }),
      error: null,
    };
  } catch (_error) {
    return { data: null, error: { message: "Unable to load parent announcement detail right now." } };
  }
}

export async function listAiParentReports({
  studentId,
  classId,
  branchId,
  status,
  reportType,
  includeArchived = false,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (studentId != null && studentId !== "" && !isUuidLike(studentId)) {
    return { data: [], error: { message: "studentId must be a UUID when provided" } };
  }
  if (classId != null && classId !== "" && !isUuidLike(classId)) {
    return { data: [], error: { message: "classId must be a UUID when provided" } };
  }
  if (branchId != null && branchId !== "" && !isUuidLike(branchId)) {
    return { data: [], error: { message: "branchId must be a UUID when provided" } };
  }
  if (status != null && status !== "" && !AI_PARENT_REPORT_STATUS_VALUES.has(trimString(status))) {
    return { data: [], error: { message: "status is invalid" } };
  }
  if (reportType != null && reportType !== "" && !AI_PARENT_REPORT_TYPE_VALUES.has(trimString(reportType))) {
    return { data: [], error: { message: "reportType is invalid" } };
  }
  if (includeArchived != null && typeof includeArchived !== "boolean") {
    return { data: [], error: { message: "includeArchived must be a boolean when provided" } };
  }

  try {
    let query = supabase
      .from("ai_parent_reports")
      .select(AI_PARENT_REPORT_FIELDS)
      .order("report_period_start", { ascending: false })
      .order("created_at", { ascending: false });

    if (isUuidLike(studentId)) query = query.eq("student_id", trimString(studentId));
    if (isUuidLike(classId)) query = query.eq("class_id", trimString(classId));
    if (isUuidLike(branchId)) query = query.eq("branch_id", trimString(branchId));
    if (status != null && status !== "") query = query.eq("status", trimString(status));
    else if (!includeArchived) query = query.neq("status", "archived");
    if (reportType != null && reportType !== "") query = query.eq("report_type", trimString(reportType));

    const { data, error } = await query;
    if (error) {
      return {
        data: [],
        error: sanitizeReadError(error, "Unable to load AI parent reports right now."),
      };
    }
    return {
      data: (Array.isArray(data) ? data : []).map((row) => mapAiParentReportRow(row)),
      error: null,
    };
  } catch (_error) {
    return { data: [], error: { message: "Unable to load AI parent reports right now." } };
  }
}

export async function getAiParentReportDetail({ reportId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) {
    return { data: null, error: { message: "reportId must be a UUID" } };
  }

  try {
    const { data, error } = await supabase
      .from("ai_parent_reports")
      .select(AI_PARENT_REPORT_FIELDS)
      .eq("id", trimString(reportId))
      .maybeSingle();
    if (error || !data?.id) {
      return {
        data: null,
        error: sanitizeReadError(error, "Unable to load AI parent report detail right now."),
      };
    }
    return { data: mapAiParentReportRow(data), error: null };
  } catch (_error) {
    return { data: null, error: { message: "Unable to load AI parent report detail right now." } };
  }
}

export async function listAiParentReportVersions({ reportId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) {
    return { data: [], error: { message: "reportId must be a UUID" } };
  }

  try {
    const { data, error } = await supabase
      .from("ai_parent_report_versions")
      .select(AI_PARENT_REPORT_VERSION_FIELDS)
      .eq("report_id", trimString(reportId))
      .order("version_number", { ascending: false });
    if (error) {
      return {
        data: [],
        error: sanitizeReadError(error, "Unable to load AI parent report versions right now."),
      };
    }
    return {
      data: (Array.isArray(data) ? data : []).map((row) => mapAiParentReportVersionRow(row)),
      error: null,
    };
  } catch (_error) {
    return { data: [], error: { message: "Unable to load AI parent report versions right now." } };
  }
}

export async function getAiParentReportCurrentVersion({ reportId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) {
    return { data: null, error: { message: "reportId must be a UUID" } };
  }

  try {
    const reportRead = await supabase
      .from("ai_parent_reports")
      .select("id,current_version_id,status")
      .eq("id", trimString(reportId))
      .maybeSingle();
    if (reportRead.error || !reportRead.data?.id) {
      return {
        data: null,
        error: sanitizeReadError(reportRead.error, "Unable to load AI parent report current version right now."),
      };
    }

    if (!isUuidLike(reportRead.data.current_version_id)) {
      return { data: null, error: null };
    }

    const versionRead = await supabase
      .from("ai_parent_report_versions")
      .select(AI_PARENT_REPORT_VERSION_FIELDS)
      .eq("id", trimString(reportRead.data.current_version_id))
      .eq("report_id", trimString(reportId))
      .maybeSingle();
    if (versionRead.error || !versionRead.data?.id) {
      return {
        data: null,
        error: sanitizeReadError(versionRead.error, "Unable to load AI parent report current version right now."),
      };
    }

    return { data: mapAiParentReportVersionRow(versionRead.data), error: null };
  } catch (_error) {
    return { data: null, error: { message: "Unable to load AI parent report current version right now." } };
  }
}

export async function listAiParentReportEvidenceLinks({ reportId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(reportId)) {
    return { data: [], error: { message: "reportId must be a UUID" } };
  }

  try {
    const { data, error } = await supabase
      .from("ai_parent_report_evidence_links")
      .select(AI_PARENT_REPORT_EVIDENCE_FIELDS)
      .eq("report_id", trimString(reportId))
      .order("created_at", { ascending: false });
    if (error) {
      return {
        data: [],
        error: sanitizeReadError(error, "Unable to load AI parent report evidence links right now."),
      };
    }
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (_error) {
    return { data: [], error: { message: "Unable to load AI parent report evidence links right now." } };
  }
}

/**
 * Return popup-eligible internal Company News rows visible to current user.
 * Uses anon client + JWT + RLS only.
 */
export async function listEligibleCompanyNewsPopups({ limit } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  const resolvedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 1;

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: [], error: authError || { message: "Authenticated user is required" } };
    }

    const announcementRead = await supabase
      .from("announcements")
      .select("id,title,subtitle,body,priority,popup_emoji,published_at,created_at")
      .eq("audience_type", "internal_staff")
      .eq("announcement_type", "company_news")
      .eq("status", "published")
      .eq("popup_enabled", true)
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (announcementRead.error) {
      return { data: [], error: { message: "Unable to load eligible Company News popups right now." } };
    }

    const announcementRows = Array.isArray(announcementRead.data) ? announcementRead.data : [];
    if (announcementRows.length === 0) return { data: [], error: null };

    const announcementIds = announcementRows
      .map((row) => trimString(row?.id))
      .filter((id) => isUuidLike(id));
    if (announcementIds.length === 0) return { data: [], error: null };

    const statusRead = await supabase
      .from("announcement_statuses")
      .select("announcement_id,profile_id,read_at,popup_seen_at,popup_dismissed_at,popup_last_shown_at")
      .eq("profile_id", profileId)
      .in("announcement_id", announcementIds);
    if (statusRead.error) {
      return { data: [], error: { message: "Unable to load eligible Company News popups right now." } };
    }

    const statusByAnnouncementId = new Map();
    for (const row of Array.isArray(statusRead.data) ? statusRead.data : []) {
      const announcementId = trimString(row?.announcement_id);
      if (!isUuidLike(announcementId)) continue;
      statusByAnnouncementId.set(announcementId, row);
    }

    const eligible = [];
    for (const row of announcementRows) {
      const announcementId = trimString(row?.id);
      if (!isUuidLike(announcementId)) continue;

      const ownStatus = statusByAnnouncementId.get(announcementId) || null;
      if (ownStatus?.popup_dismissed_at) continue;

      const bodyPreview = buildAnnouncementBodyPreview(row?.subtitle, row?.body);
      eligible.push({
        announcementId,
        title: trimString(row?.title) || "Untitled Company News",
        subtitle: trimString(row?.subtitle) || "",
        bodyPreview,
        popupEmoji: trimString(row?.popup_emoji) || "",
        priority: trimString(row?.priority) || "normal",
        publishedAt: row?.published_at || null,
        popupSeenAt: ownStatus?.popup_seen_at || null,
        popupDismissedAt: ownStatus?.popup_dismissed_at || null,
        popupLastShownAt: ownStatus?.popup_last_shown_at || null,
        actionUrl: `/announcements?announcementId=${announcementId}`,
        _unseenRank: ownStatus?.popup_seen_at || ownStatus?.read_at ? 1 : 0,
      });
    }

    eligible.sort((a, b) => {
      if (a._unseenRank !== b._unseenRank) return a._unseenRank - b._unseenRank;
      const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt);
    });

    return {
      data: eligible.slice(0, resolvedLimit).map(({ _unseenRank, ...row }) => row),
      error: null,
    };
  } catch (_error) {
    return { data: [], error: { message: "Unable to load eligible Company News popups right now." } };
  }
}

export async function listAnnouncementTargets({ announcementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: [], error: { message: "announcementId must be a UUID" } };
  }

  try {
    const { data, error } = await supabase
      .from("announcement_targets")
      .select(ANNOUNCEMENT_TARGET_FIELDS)
      .eq("announcement_id", trimString(announcementId))
      .order("created_at", { ascending: true });
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listAnnouncementStatuses({ announcementId, profileId, doneStatus } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (announcementId != null && announcementId !== "" && !isUuidLike(announcementId)) {
    return { data: [], error: { message: "announcementId must be a UUID when provided" } };
  }
  if (profileId != null && profileId !== "" && !isUuidLike(profileId)) {
    return { data: [], error: { message: "profileId must be a UUID when provided" } };
  }
  if (doneStatus != null && doneStatus !== "" && !ANNOUNCEMENT_DONE_STATUS_VALUES.has(trimString(doneStatus))) {
    return { data: [], error: { message: "doneStatus must be pending, done, or undone" } };
  }

  try {
    let query = supabase
      .from("announcement_statuses")
      .select(ANNOUNCEMENT_STATUS_FIELDS)
      .order("updated_at", { ascending: false });

    if (isUuidLike(announcementId)) query = query.eq("announcement_id", trimString(announcementId));
    if (isUuidLike(profileId)) query = query.eq("profile_id", trimString(profileId));
    if (doneStatus != null && doneStatus !== "") query = query.eq("done_status", trimString(doneStatus));

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listAnnouncementReplies({ announcementId } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(announcementId)) {
    return { data: [], error: { message: "announcementId must be a UUID" } };
  }

  try {
    const { data, error } = await supabase
      .from("announcement_replies")
      .select(ANNOUNCEMENT_REPLY_FIELDS)
      .eq("announcement_id", trimString(announcementId))
      .order("created_at", { ascending: true });
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listMyInAppNotifications({ status, unreadOnly = false, limit = 50 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (status != null && status !== "" && !NOTIFICATION_STATUS_VALUES.has(trimString(status))) {
    return { data: [], error: { message: "status is invalid" } };
  }
  if (unreadOnly != null && typeof unreadOnly !== "boolean") {
    return { data: [], error: { message: "unreadOnly must be a boolean when provided" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50;

  try {
    // Preferred path: RPC returns notification rows plus safe action-target fields for own rows only.
    const rpcStatus = status != null && status !== "" ? trimString(status) : null;
    const rpcRead = await supabase.rpc("get_my_in_app_notifications_with_action_targets_044", {
      p_status: rpcStatus,
      p_unread_only: Boolean(unreadOnly),
      p_limit: safeLimit,
    });
    if (!rpcRead.error && Array.isArray(rpcRead.data)) {
      return { data: rpcRead.data, error: null };
    }

    const rpcMissing =
      trimString(rpcRead.error?.code) === "PGRST202"
      || /get_my_in_app_notifications_with_action_targets_044/i.test(
        trimString(rpcRead.error?.message)
      );
    // Fallback preserves behavior when migration 044 has not been applied yet.
    if (rpcRead.error && !rpcMissing) {
      return { data: [], error: rpcRead.error };
    }

    let query = supabase
      .from("notifications")
      .select(NOTIFICATION_FIELDS)
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (status != null && status !== "") {
      query = query.eq("status", trimString(status));
    }
    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getMyUnreadInAppNotificationCount() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: { count: 0 }, error: { message: "Supabase is not configured" } };
  }

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { head: true, count: "exact" })
      .eq("channel", "in_app")
      .is("read_at", null);
    if (error) return { data: { count: 0 }, error };
    return { data: { count: Number.isInteger(count) ? count : 0 }, error: null };
  } catch (error) {
    return { data: { count: 0 }, error };
  }
}

export async function listMyNotificationPreferences({ includeDisabled = true, limit = 200 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (includeDisabled != null && typeof includeDisabled !== "boolean") {
    return { data: [], error: { message: "includeDisabled must be a boolean when provided" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200;

  try {
    let query = supabase
      .from("parent_notification_preferences")
      .select(PARENT_NOTIFICATION_PREFERENCE_FIELDS)
      .order("student_id", { ascending: true, nullsFirst: true })
      .order("channel", { ascending: true })
      .order("category", { ascending: true })
      .limit(safeLimit);

    if (!includeDisabled) query = query.eq("enabled", true);
    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listNotificationPreferencesForStudent({
  studentId,
  channel,
  category,
  includeDisabled = true,
  limit = 200,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(studentId)) {
    return { data: [], error: { message: "studentId must be a UUID" } };
  }
  if (
    channel != null
    && channel !== ""
    && !PARENT_NOTIFICATION_PREFERENCE_CHANNEL_VALUES.has(trimString(channel))
  ) {
    return { data: [], error: { message: "channel is invalid" } };
  }
  if (
    category != null
    && category !== ""
    && !PARENT_NOTIFICATION_PREFERENCE_CATEGORY_VALUES.has(trimString(category))
  ) {
    return { data: [], error: { message: "category is invalid" } };
  }
  if (includeDisabled != null && typeof includeDisabled !== "boolean") {
    return { data: [], error: { message: "includeDisabled must be a boolean when provided" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200;

  try {
    let query = supabase
      .from("parent_notification_preferences")
      .select(PARENT_NOTIFICATION_PREFERENCE_FIELDS)
      .eq("student_id", trimString(studentId))
      .order("channel", { ascending: true })
      .order("category", { ascending: true })
      .limit(safeLimit);

    if (channel != null && channel !== "") query = query.eq("channel", trimString(channel));
    if (category != null && category !== "") query = query.eq("category", trimString(category));
    if (!includeDisabled) query = query.eq("enabled", true);

    const { data, error } = await query;
    if (error) return { data: [], error };

    const normalized = (Array.isArray(data) ? data : []).filter((row) =>
      PARENT_NOTIFICATION_PREFERENCE_CHANNEL_VALUES.has(trimString(row?.channel))
      && PARENT_NOTIFICATION_PREFERENCE_CATEGORY_VALUES.has(trimString(row?.category))
      && PARENT_NOTIFICATION_PREFERENCE_STATUS_VALUES.has(trimString(row?.consent_status))
    );
    return { data: normalized, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listMyPolicyAcknowledgements({ policyKey, policyVersion, limit = 200 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (
    policyKey != null
    && policyKey !== ""
    && !PARENT_POLICY_ACKNOWLEDGEMENT_KEY_VALUES.has(trimString(policyKey))
  ) {
    return { data: [], error: { message: "policyKey is invalid" } };
  }
  if (policyVersion != null && policyVersion !== "" && !trimString(policyVersion)) {
    return { data: [], error: { message: "policyVersion is invalid" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200;

  try {
    let query = supabase
      .from("parent_policy_acknowledgements")
      .select(PARENT_POLICY_ACKNOWLEDGEMENT_FIELDS)
      .order("acknowledged_at", { ascending: false })
      .limit(safeLimit);
    if (policyKey != null && policyKey !== "") query = query.eq("policy_key", trimString(policyKey));
    if (policyVersion != null && policyVersion !== "") query = query.eq("policy_version", trimString(policyVersion));

    const { data, error } = await query;
    if (error) return { data: [], error };

    const normalized = (Array.isArray(data) ? data : []).filter((row) =>
      PARENT_POLICY_ACKNOWLEDGEMENT_KEY_VALUES.has(trimString(row?.policy_key))
      && PARENT_POLICY_ACKNOWLEDGEMENT_SOURCE_VALUES.has(trimString(row?.acknowledgement_source))
      && trimString(row?.policy_version)
    );
    return { data: normalized, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function hasMyPolicyAcknowledgement({ policyKey, policyVersion } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: { hasAcknowledged: false, acknowledgement: null }, error: { message: "Supabase is not configured" } };
  }
  const safePolicyKey = trimString(policyKey);
  const safePolicyVersion = trimString(policyVersion);
  if (!PARENT_POLICY_ACKNOWLEDGEMENT_KEY_VALUES.has(safePolicyKey)) {
    return { data: { hasAcknowledged: false, acknowledgement: null }, error: { message: "policyKey is invalid" } };
  }
  if (!safePolicyVersion) {
    return { data: { hasAcknowledged: false, acknowledgement: null }, error: { message: "policyVersion is required" } };
  }

  try {
    const { data, error } = await supabase
      .from("parent_policy_acknowledgements")
      .select(PARENT_POLICY_ACKNOWLEDGEMENT_FIELDS)
      .eq("policy_key", safePolicyKey)
      .eq("policy_version", safePolicyVersion)
      .order("acknowledged_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return { data: { hasAcknowledged: false, acknowledgement: null }, error };
    }
    return {
      data: {
        hasAcknowledged: Boolean(data?.id),
        acknowledgement: data || null,
      },
      error: null,
    };
  } catch (error) {
    return { data: { hasAcknowledged: false, acknowledgement: null }, error };
  }
}

export async function listParentPolicyAcknowledgementsForStudent({
  studentId,
  policyKey,
  policyVersion,
  limit = 200,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(studentId)) {
    return { data: [], error: { message: "studentId must be a UUID" } };
  }
  if (
    policyKey != null
    && policyKey !== ""
    && !PARENT_POLICY_ACKNOWLEDGEMENT_KEY_VALUES.has(trimString(policyKey))
  ) {
    return { data: [], error: { message: "policyKey is invalid" } };
  }
  if (policyVersion != null && policyVersion !== "" && !trimString(policyVersion)) {
    return { data: [], error: { message: "policyVersion is invalid" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200;

  try {
    const guardianRead = await supabase
      .from("guardian_student_links")
      .select("guardian_id")
      .eq("student_id", trimString(studentId))
      .limit(500);
    if (guardianRead.error) return { data: [], error: guardianRead.error };
    const guardianIds = [...new Set(
      (Array.isArray(guardianRead.data) ? guardianRead.data : [])
        .map((row) => row?.guardian_id)
        .filter(Boolean)
    )];
    if (guardianIds.length === 0) return { data: [], error: null };

    const parentRead = await supabase
      .from("guardians")
      .select("profile_id")
      .in("id", guardianIds)
      .limit(500);
    if (parentRead.error) return { data: [], error: parentRead.error };
    const parentProfileIds = [...new Set(
      (Array.isArray(parentRead.data) ? parentRead.data : [])
        .map((row) => row?.profile_id)
        .filter((id) => isUuidLike(id))
    )];
    if (parentProfileIds.length === 0) return { data: [], error: null };

    let query = supabase
      .from("parent_policy_acknowledgements")
      .select(PARENT_POLICY_ACKNOWLEDGEMENT_FIELDS)
      .in("parent_profile_id", parentProfileIds)
      .order("acknowledged_at", { ascending: false })
      .limit(safeLimit);
    if (policyKey != null && policyKey !== "") query = query.eq("policy_key", trimString(policyKey));
    if (policyVersion != null && policyVersion !== "") query = query.eq("policy_version", trimString(policyVersion));

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listMyAuthSessions({ status, limit = 100 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (status != null && status !== "" && !AUTH_SESSION_STATUS_VALUES.has(trimString(status))) {
    return { data: [], error: { message: "status is invalid" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;

  try {
    let query = supabase
      .from("auth_sessions")
      .select(AUTH_SESSION_FIELDS)
      .order("started_at", { ascending: false })
      .limit(safeLimit);
    if (status != null && status !== "") query = query.eq("session_status", trimString(status));

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listAuthSessionsForAdmin({ profileId, status, limit = 100 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (profileId != null && profileId !== "" && !isUuidLike(profileId)) {
    return { data: [], error: { message: "profileId must be a UUID when provided" } };
  }
  if (status != null && status !== "" && !AUTH_SESSION_STATUS_VALUES.has(trimString(status))) {
    return { data: [], error: { message: "status is invalid" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;

  try {
    const { role, error: roleError } = await getCurrentProfileRole();
    if (roleError) return { data: [], error: roleError };
    if (role !== "hq_admin") {
      return { data: [], error: { message: "Only HQ admin can list auth sessions for admin view" } };
    }

    let query = supabase
      .from("auth_sessions")
      .select(AUTH_SESSION_FIELDS)
      .order("started_at", { ascending: false })
      .limit(safeLimit);
    if (profileId != null && profileId !== "") query = query.eq("profile_id", trimString(profileId));
    if (status != null && status !== "") query = query.eq("session_status", trimString(status));

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function listNotificationTemplates({
  channel,
  eventType,
  includeInactive = true,
  limit = 200,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (channel != null && channel !== "" && !NOTIFICATION_TEMPLATE_CHANNEL_VALUES.has(trimString(channel))) {
    return { data: [], error: { message: "channel is invalid" } };
  }
  if (includeInactive != null && typeof includeInactive !== "boolean") {
    return { data: [], error: { message: "includeInactive must be a boolean when provided" } };
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 200;

  try {
    let query = supabase
      .from("notification_templates")
      .select(NOTIFICATION_TEMPLATE_FIELDS)
      .order("event_type", { ascending: true })
      .order("channel", { ascending: true })
      .order("template_key", { ascending: true })
      .limit(safeLimit);
    if (channel != null && channel !== "") query = query.eq("channel", trimString(channel));
    if (eventType != null && eventType !== "") query = query.eq("event_type", trimString(eventType));
    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return { data: [], error };
    return { data: Array.isArray(data) ? data : [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

function normalizeAllowedVariablesForTemplate(raw) {
  const out = new Set();
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    const name = trimString(typeof item === "string" ? item : "");
    if (/^[a-zA-Z][a-zA-Z0-9_]{0,48}$/.test(name)) out.add(name);
  }
  return out;
}

function normalizeVariablesObject(variables, allowedSet) {
  const normalized = {};
  if (!allowedSet?.size || !variables || typeof variables !== "object" || Array.isArray(variables)) {
    return normalized;
  }
  for (const key of allowedSet) {
    if (!Object.prototype.hasOwnProperty.call(variables, key)) continue;
    const v = variables[key];
    if (typeof v !== "string") continue;
    const t = trimString(v).replace(/\s+/g, " ");
    if (!t) continue;
    normalized[key] = t.slice(0, NOTIFICATION_TEMPLATE_PLACEHOLDER_VALUE_MAX);
  }
  return normalized;
}

export function renderNotificationTemplate({
  template,
  variables = {},
  fallbackTitle,
  fallbackBody,
} = {}) {
  const safeFallbackTitle = trimString(fallbackTitle);
  const safeFallbackBody = fallbackBody != null ? String(fallbackBody) : "";

  const rowTitle = trimString(template?.title_template ?? "");
  const rowBodyRaw = template?.body_template != null ? String(template.body_template) : "";
  if (!rowTitle && !trimString(rowBodyRaw)) {
    return { title: safeFallbackTitle, body: safeFallbackBody, usedFallback: true };
  }

  const allowedSet = normalizeAllowedVariablesForTemplate(template?.allowed_variables);
  const normalizedVars = normalizeVariablesObject(variables, allowedSet);

  const applySubstitutions = (segment) => {
    if (typeof segment !== "string" || !segment) return "";
    return segment.replace(NOTIFICATION_TEMPLATE_PLACEHOLDER_RE, (_, name) => {
      const key = trimString(name);
      if (!allowedSet.has(key)) return "";
      return normalizedVars[key] ?? "";
    });
  };

  let titleOut = trimString(applySubstitutions(rowTitle)).slice(0, NOTIFICATION_TEMPLATE_OUTPUT_TITLE_MAX);
  let bodyOut = applySubstitutions(rowBodyRaw).slice(0, NOTIFICATION_TEMPLATE_OUTPUT_BODY_MAX);

  if (!titleOut) {
    return { title: safeFallbackTitle, body: trimString(bodyOut) || safeFallbackBody, usedFallback: true };
  }
  bodyOut = bodyOut.trimEnd();
  return {
    title: titleOut,
    body: bodyOut || safeFallbackBody,
    usedFallback: false,
  };
}

export async function getActiveNotificationTemplate({ eventType, channel = "in_app", branchId = null } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: null };
  }
  const safeEventType = trimString(eventType);
  const safeChannel = trimString(channel) || "in_app";
  if (!safeEventType) {
    return { data: null, error: { message: "eventType is required" } };
  }

  const branchUuid = branchId != null && isUuidLike(branchId) ? trimString(branchId) : null;

  try {
    let query = supabase
      .from("notification_templates")
      .select(NOTIFICATION_TEMPLATE_FIELDS)
      .eq("event_type", safeEventType)
      .eq("channel", safeChannel)
      .eq("is_active", true);

    query = branchUuid
      ? query.or(`branch_id.eq.${branchUuid},branch_id.is.null`)
      : query.is("branch_id", null);

    const { data, error } = await query;
    if (error) return { data: null, error };
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return { data: null, error: null };

    if (branchUuid) {
      const branchRow = rows.find((r) => r?.branch_id && trimString(String(r.branch_id)) === branchUuid);
      const globalRow = rows.find((r) => r?.branch_id == null);
      const picked = branchRow || globalRow || rows[0];
      return { data: picked, error: null };
    }

    return { data: rows[0], error: null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

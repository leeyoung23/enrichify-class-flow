import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

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
  "id,student_id,school_id,school_name,grade_year,curriculum_profile_id,parent_goals,teacher_notes,created_at,updated_at";
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
  "id,announcement_id,profile_id,read_at,done_status,done_at,undone_reason,last_seen_at,created_at,updated_at";
const ANNOUNCEMENT_REPLY_FIELDS =
  "id,announcement_id,profile_id,body,reply_type,parent_reply_id,created_at";
const ANNOUNCEMENT_STATUS_VALUES = new Set(["draft", "published", "closed", "archived"]);
const ANNOUNCEMENT_AUDIENCE_VALUES = new Set(["internal_staff", "parent_facing"]);
const ANNOUNCEMENT_TYPE_VALUES = new Set(["request", "company_news", "parent_event"]);
const ANNOUNCEMENT_DONE_STATUS_VALUES = new Set(["pending", "done", "undone"]);
const ANNOUNCEMENT_TASK_STATUS_VALUES = new Set(["unread", "pending", "undone", "overdue", "done"]);

function isUuidLike(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
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

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

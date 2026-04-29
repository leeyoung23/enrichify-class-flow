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

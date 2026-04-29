import { supabase, isSupabaseConfigured } from "./supabaseClient";

const SALES_KIT_FIELDS =
  "id,title,resource_type,description,file_path,external_url,status,is_global,branch_scope,created_at,updated_at";
const BRANCH_FIELDS = "id,name,created_at,updated_at";
/** Minimal columns for Staff Time Clock GPS distance (RLS-scoped single-row read). */
const BRANCH_GEOFENCE_FIELDS = "id,name,latitude,longitude,geofence_radius_meters";
const CLASS_FIELDS = "id,name,branch_id,subject,level,schedule_note,created_at,updated_at";
const STUDENT_FIELDS = "id,full_name,branch_id,class_id,created_at,updated_at";

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

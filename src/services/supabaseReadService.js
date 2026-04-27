import { supabase, isSupabaseConfigured } from "./supabaseClient";

const SALES_KIT_FIELDS =
  "id,title,resource_type,description,file_path,external_url,status,is_global,branch_scope,created_at,updated_at";

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

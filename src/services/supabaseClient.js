import { createClient } from "@supabase/supabase-js";

/** Supports Vite (import.meta.env) and Node smoke tests (process.env after dotenv). */
const supabaseUrl =
  (import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : "") ||
  "";
const supabaseAnonKey =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== "undefined" ? process.env.VITE_SUPABASE_ANON_KEY : "") ||
  "";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

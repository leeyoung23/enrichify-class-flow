import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const columns =
  "id,title,resource_type,description,file_path,external_url,status,is_global,branch_scope,created_at,updated_at";

async function run() {
  try {
    const { data, error } = await supabase
      .from("sales_kit_resources")
      .select(columns)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`ERROR: ${error.message}`);
      process.exit(1);
    }

    console.log(`PASS: approved sales kit resources count = ${Array.isArray(data) ? data.length : 0}`);
  } catch (error) {
    console.error(`ERROR: ${error?.message || "unknown error"}`);
    process.exit(1);
  }
}

run();

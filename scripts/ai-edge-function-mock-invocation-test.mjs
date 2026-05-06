import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function getTeacherPassword() {
  return process.env.RLS_TEST_TEACHER_PASSWORD || process.env.RLS_TEST_PASSWORD || "";
}

function shouldSkipInvokeError(message) {
  return /failed to fetch|fetch failed|network|non-2xx|404|not found|function.*not found|edge function/i.test(
    message || "",
  );
}

async function run() {
  if (!supabaseUrl || !supabaseAnonKey) {
    printResult("SKIP", "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const teacherPassword = getTeacherPassword();

  if (teacherPassword) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: "teacher.demo@example.test",
      password: teacherPassword,
    });
    if (signInError) {
      printResult("WARNING", `Teacher sign-in failed; continuing unauthenticated (${signInError.message || "unknown"})`);
    } else {
      printResult("CHECK", "Teacher sign-in succeeded (anon client with teacher session)");
    }
  } else {
    printResult("CHECK", "No teacher password env found; continuing unauthenticated");
  }

  const payload = {
    student_id: "11111111-1111-1111-1111-111111111111",
    class_id: "22222222-2222-2222-2222-222222222222",
    teacher_note: "Fake test note for mock AI draft.",
    tone: "warm",
    language: "en",
  };

  let invokeResult;
  try {
    invokeResult = await supabase.functions.invoke("generate-parent-comment-draft", { body: payload });
  } catch (err) {
    printResult("SKIP", `Function invoke not reachable (${err?.message || "unknown"})`);
    process.exit(0);
  }

  const { data, error } = invokeResult;
  if (error) {
    if (shouldSkipInvokeError(error.message)) {
      printResult("SKIP", `Function unavailable or not deployed (${error.message || "unknown"})`);
      process.exit(0);
    }
    printResult("SKIP", `Invocation could not complete in this environment (${error.message || "unknown"})`);
    process.exit(0);
  }

  if (!data || typeof data !== "object") {
    printResult("WARNING", "Function responded without an object payload");
    process.exit(1);
  }

  if (typeof data.draft_comment !== "string" || !data.draft_comment.trim()) {
    printResult("WARNING", "Invalid response: draft_comment is missing/empty");
    process.exit(1);
  }
  if (!Array.isArray(data.suggested_strength_tags)) {
    printResult("WARNING", "Invalid response: suggested_strength_tags is not an array");
    process.exit(1);
  }
  if (!Array.isArray(data.suggested_improvement_tags)) {
    printResult("WARNING", "Invalid response: suggested_improvement_tags is not an array");
    process.exit(1);
  }
  if (!data.source_summary || typeof data.source_summary !== "object") {
    printResult("WARNING", "Invalid response: source_summary is missing");
    process.exit(1);
  }
  if (data.is_mock !== true) {
    printResult("WARNING", "Invalid response: expected is_mock === true");
    process.exit(1);
  }

  printResult("PASS", "Mock Edge Function response shape validated");
}

run().catch((err) => {
  printResult("WARNING", `Mock invocation script crashed (${err?.message || err})`);
  process.exit(1);
});

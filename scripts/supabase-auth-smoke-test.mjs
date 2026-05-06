/**
 * Supabase Auth smoke test: anon key only, fake demo users, read profiles after sign-in.
 * Load dotenv before importing services so process.env is visible to supabaseClient.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

const users = [
  { label: "HQ Admin", email: "hq.demo@example.test", passwordVar: "RLS_TEST_HQ_PASSWORD" },
  { label: "Branch Supervisor", email: "supervisor.demo@example.test", passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD" },
  { label: "Teacher", email: "teacher.demo@example.test", passwordVar: "RLS_TEST_TEACHER_PASSWORD" },
  { label: "Parent", email: "parent.demo@example.test", passwordVar: "RLS_TEST_PARENT_PASSWORD" },
  { label: "Student", email: "student.demo@example.test", passwordVar: "RLS_TEST_STUDENT_PASSWORD" },
];

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

async function main() {
  const {
    signInWithEmailPassword,
    signOut,
    getCurrentProfile,
    mapProfileToAppUser,
  } = await import("../src/services/supabaseAuthService.js");

  let ran = 0;
  for (const u of users) {
    const password = resolvePassword(u.passwordVar);
    if (!password) {
      printResult("WARNING", `${u.label}: missing password (${u.passwordVar} or RLS_TEST_PASSWORD)`);
      continue;
    }

    const { data: signData, error: signError } = await signInWithEmailPassword(u.email, password);
    if (signError) {
      printResult(
        "WARNING",
        `${u.label}: sign-in failed (${signError.message || signError.status || "unknown"})`
      );
      await signOut();
      continue;
    }

    ran += 1;
    const { profile, error: profileError } = await getCurrentProfile();
    if (profileError) {
      printResult(
        "WARNING",
        `${u.label}: profile read failed (${profileError.message || profileError.code || "unknown"})`
      );
    } else if (!profile) {
      printResult("CHECK", `${u.label}: no profile row for auth user (check seed)`);
    } else {
      const appUser = mapProfileToAppUser(profile);
      const branch = appUser?.branch_id ?? profile.branch_id ?? "null";
      printResult(
        "PASS",
        `${u.label}: profile role=${profile.role} email=${profile.email ?? "null"} branch_id=${branch} appRole=${appUser?.role ?? "null"}`
      );
    }

    const { error: signOutError } = await signOut();
    if (signOutError) {
      printResult("WARNING", `${u.label}: sign-out (${signOutError.message || "unknown"})`);
    }
  }

  if (ran === 0) {
    printResult("CHECK", "No auth smoke checks completed. Verify passwords in .env.local.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[WARNING] Auth smoke test crashed:", e?.message || e);
  process.exit(1);
});

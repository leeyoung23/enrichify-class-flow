import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("[SKIP] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

const readService = await import("../src/services/supabaseReadService.js");
const clientModule = await import("../src/services/supabaseClient.js");

const { supabase, isSupabaseConfigured } = clientModule;

if (!isSupabaseConfigured() || !supabase) {
  console.log("[SKIP] Supabase client is not configured");
  process.exit(0);
}

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

function looksUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const users = [
  {
    label: "HQ Admin",
    email: "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
    role: "hq_admin",
  },
  {
    label: "Branch Supervisor",
    email: "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
    role: "branch_supervisor",
  },
  {
    label: "Teacher",
    email: "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
    role: "teacher",
  },
  {
    label: "Parent",
    email: "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
    role: "parent",
  },
  {
    label: "Student",
    email: "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
    role: "student",
  },
];

async function safeRead(label, readCall) {
  try {
    const result = await readCall();
    if (result?.error) {
      printResult("WARNING", `${label}: read returned error (${result.error.message || result.error.code || "unknown"})`);
      return { data: [], error: result.error };
    }
    return { data: Array.isArray(result?.data) ? result.data : result?.data, error: null };
  } catch (error) {
    printResult("WARNING", `${label}: read threw (${error?.message || "unknown"})`);
    return { data: [], error };
  }
}

async function runUserCheck(userConfig) {
  const password = resolvePassword(userConfig.passwordVar);
  if (!password) {
    printResult("WARNING", `${userConfig.label}: missing password (${userConfig.passwordVar} or RLS_TEST_PASSWORD)`);
    return { ran: false, failures: 0, warnings: 1, checks: 0 };
  }

  let failures = 0;
  let warnings = 0;
  let checks = 0;

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userConfig.email,
    password,
  });
  if (signInError) {
    printResult("WARNING", `${userConfig.label}: sign-in failed (${signInError.message})`);
    return { ran: false, failures: 0, warnings: 1, checks: 0 };
  }

  const schools = await safeRead(`${userConfig.label} listSchools`, () => readService.listSchools({}));
  const profiles = await safeRead(`${userConfig.label} listCurriculumProfiles`, () => readService.listCurriculumProfiles({}));
  const studentProfiles = await safeRead(`${userConfig.label} listStudentSchoolProfiles`, () => readService.listStudentSchoolProfiles({}));
  const assignments = await safeRead(`${userConfig.label} listClassCurriculumAssignments`, () => readService.listClassCurriculumAssignments({}));
  const goals = await safeRead(`${userConfig.label} listLearningGoals`, () => readService.listLearningGoals({}));

  const schoolCount = Array.isArray(schools.data) ? schools.data.length : 0;
  const profileCount = Array.isArray(profiles.data) ? profiles.data.length : 0;
  const studentProfileCount = Array.isArray(studentProfiles.data) ? studentProfiles.data.length : 0;
  const assignmentCount = Array.isArray(assignments.data) ? assignments.data.length : 0;
  const goalCount = Array.isArray(goals.data) ? goals.data.length : 0;

  printResult(
    "PASS",
    `${userConfig.label}: schools/profiles/student_profiles/assignments/goals = ${schoolCount}/${profileCount}/${studentProfileCount}/${assignmentCount}/${goalCount}`
  );

  // General table readiness signals.
  if (schoolCount === 0 || profileCount === 0 || studentProfileCount === 0 || assignmentCount === 0 || goalCount === 0) {
    printResult(
      "CHECK",
      `${userConfig.label}: one or more onboarding tables returned 0 rows; verify fake seed completeness before UI wiring`
    );
    checks += 1;
  }

  // Role-specific expectations.
  if (userConfig.role === "hq_admin") {
    if (schools.error || profiles.error || studentProfiles.error || assignments.error || goals.error) {
      printResult("WARNING", `${userConfig.label}: expected broad reads, but some table reads errored`);
      warnings += 1;
    } else {
      printResult("PASS", `${userConfig.label}: broad onboarding reads available`);
    }
  }

  if (userConfig.role === "branch_supervisor") {
    if (!schools.error && schoolCount > 0) {
      const scopedRows = schools.data.filter((row) => !row?.branch_id || looksUuid(row.branch_id));
      if (scopedRows.length !== schoolCount) {
        printResult("WARNING", `${userConfig.label}: schools returned malformed branch_id values`);
        warnings += 1;
      } else {
        printResult("PASS", `${userConfig.label}: branch-scoped schools read shape is valid`);
      }
    } else {
      printResult("CHECK", `${userConfig.label}: no schools visible; verify seeded branch-linked school rows`);
      checks += 1;
    }
  }

  if (userConfig.role === "teacher") {
    const sampleStudentId = studentProfiles.data?.[0]?.student_id;
    const sampleClassId = assignments.data?.[0]?.class_id;

    if (sampleStudentId) {
      const context = await readService.getStudentLearningContext({ studentId: sampleStudentId });
      if (context.error) {
        printResult("WARNING", `${userConfig.label}: getStudentLearningContext failed (${context.error.message || "unknown"})`);
        warnings += 1;
      } else {
        printResult("PASS", `${userConfig.label}: getStudentLearningContext returned scoped data`);
      }
    } else {
      printResult("CHECK", `${userConfig.label}: no visible student_school_profiles for context check`);
      checks += 1;
    }

    if (sampleClassId) {
      const classContext = await readService.getClassLearningContext({ classId: sampleClassId });
      if (classContext.error) {
        printResult("WARNING", `${userConfig.label}: getClassLearningContext failed (${classContext.error.message || "unknown"})`);
        warnings += 1;
      } else {
        printResult("PASS", `${userConfig.label}: getClassLearningContext returned scoped data`);
      }
    } else {
      printResult("CHECK", `${userConfig.label}: no visible class_curriculum_assignments for class context check`);
      checks += 1;
    }
  }

  if (userConfig.role === "parent" || userConfig.role === "student") {
    // Parent/student should not see broad template sets unrelated to linked scope.
    if (studentProfileCount === 0 && schoolCount > 0) {
      printResult("WARNING", `${userConfig.label}: sees schools without any linked student_school_profiles`);
      warnings += 1;
      failures += 1;
    }

    if (studentProfileCount === 0 && profileCount > 0) {
      printResult("WARNING", `${userConfig.label}: sees curriculum profiles without linked student context`);
      warnings += 1;
      failures += 1;
    }

    if (profileCount > 10) {
      printResult("CHECK", `${userConfig.label}: sees many curriculum profiles (${profileCount}); verify not broad template exposure`);
      checks += 1;
    } else {
      printResult("PASS", `${userConfig.label}: no obvious broad template exposure`);
    }
  }

  // Parent/student should not manage templates: insert should fail.
  if (userConfig.role === "parent" || userConfig.role === "student") {
    const { error: insertError } = await supabase.from("curriculum_profiles").insert({
      name: `ShouldFail-${Date.now()}`,
      notes: "smoke test deny write",
    });
    if (!insertError) {
      printResult("WARNING", `${userConfig.label}: unexpected template insert success (unsafe)`);
      failures += 1;
      warnings += 1;
    } else {
      printResult("PASS", `${userConfig.label}: template insert blocked as expected`);
    }
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    printResult("WARNING", `${userConfig.label}: sign-out warning (${signOutError.message})`);
    warnings += 1;
  }

  return { ran: true, failures, warnings, checks };
}

async function run() {
  let ranCount = 0;
  let totalFailures = 0;
  let totalWarnings = 0;
  let totalChecks = 0;

  for (const user of users) {
    const outcome = await runUserCheck(user);
    if (outcome.ran) ranCount += 1;
    totalFailures += outcome.failures;
    totalWarnings += outcome.warnings;
    totalChecks += outcome.checks;
  }

  if (ranCount === 0) {
    printResult("CHECK", "No role checks ran. Verify .env.local credentials for fake users.");
    process.exit(1);
  }

  printResult(
    "PASS",
    `Summary: ran=${ranCount} failures=${totalFailures} warnings=${totalWarnings} checks=${totalChecks}`
  );

  if (totalFailures > 0) {
    process.exit(1);
  }
}

run();

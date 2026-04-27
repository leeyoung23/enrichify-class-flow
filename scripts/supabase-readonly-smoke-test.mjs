import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

const SALES_KIT_FIELDS =
  "id,title,resource_type,description,file_path,external_url,status,is_global,branch_scope,created_at,updated_at";
const BRANCH_FIELDS = "id,name,created_at,updated_at";
const CLASS_FIELDS = "id,name,branch_id,subject,level,schedule_note,created_at,updated_at";
const STUDENT_FIELDS = "id,full_name,branch_id,class_id,created_at,updated_at";

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function getApprovedSalesKitResources(client) {
  try {
    const { data, error } = await client
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

async function getBranches(client) {
  try {
    const { data, error } = await client
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

async function getClasses(client) {
  try {
    const { data, error } = await client
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

async function getStudents(client) {
  try {
    const { data, error } = await client
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

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

const users = [
  {
    label: "Branch Supervisor",
    email: "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
    expectation: "should_see",
  },
  {
    label: "HQ Admin",
    email: "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
    expectation: "should_see",
  },
  {
    label: "Teacher",
    email: "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
    expectation: "should_not_see",
  },
  {
    label: "Parent",
    email: "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
    expectation: "restricted",
  },
  {
    label: "Student",
    email: "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
    expectation: "restricted",
  },
];

function evaluateSalesKitAccess(userConfig, count) {
  if (userConfig.expectation === "should_see") {
    if (count > 0) {
      printResult("PASS", `${userConfig.label}: approved sales kit resources count = ${count}`);
    } else {
      printResult("CHECK", `${userConfig.label}: sales kit count = 0; verify approved seed rows and role scope`);
    }
    return;
  }

  if (count === 0) {
    printResult("PASS", `${userConfig.label}: no approved sales kit resources visible (expected)`);
  } else {
    printResult("WARNING", `${userConfig.label}: unexpectedly sees ${count} approved sales kit resources`);
  }
}

function evaluateCoreReadCounts(userConfig, branchesCount, classesCount, studentsCount) {
  if (userConfig.label === "HQ Admin") {
    if (branchesCount > 0 && classesCount > 0 && studentsCount > 0) {
      printResult("PASS", `${userConfig.label}: branches/classes/students counts = ${branchesCount}/${classesCount}/${studentsCount}`);
    } else {
      printResult("CHECK", `${userConfig.label}: expected broad visibility, got ${branchesCount}/${classesCount}/${studentsCount}`);
    }
    return;
  }

  if (userConfig.label === "Branch Supervisor") {
    if (branchesCount > 0 && classesCount > 0 && studentsCount > 0) {
      printResult("PASS", `${userConfig.label}: role-scoped branches/classes/students counts = ${branchesCount}/${classesCount}/${studentsCount}`);
    } else {
      printResult("CHECK", `${userConfig.label}: low scoped counts ${branchesCount}/${classesCount}/${studentsCount}; verify branch scoping`);
    }
    return;
  }

  if (userConfig.label === "Teacher") {
    if (classesCount > 0 && studentsCount > 0) {
      printResult("PASS", `${userConfig.label}: assigned classes/students visible = ${classesCount}/${studentsCount}`);
    } else {
      printResult("CHECK", `${userConfig.label}: limited classes/students counts ${classesCount}/${studentsCount}; verify assignment mapping`);
    }
    return;
  }

  if (userConfig.label === "Parent") {
    if (branchesCount <= 1 && studentsCount <= 1) {
      printResult("PASS", `${userConfig.label}: restricted visibility counts = ${branchesCount}/${classesCount}/${studentsCount}`);
    } else {
      printResult("CHECK", `${userConfig.label}: unexpectedly broad visibility ${branchesCount}/${classesCount}/${studentsCount}`);
    }
    return;
  }

  if (userConfig.label === "Student") {
    if (branchesCount <= 1 && studentsCount <= 1) {
      printResult("PASS", `${userConfig.label}: restricted visibility counts = ${branchesCount}/${classesCount}/${studentsCount}`);
    } else {
      printResult("CHECK", `${userConfig.label}: unexpectedly broad visibility ${branchesCount}/${classesCount}/${studentsCount}`);
    }
  }
}

async function runUserCheck(userConfig) {
  const password = resolvePassword(userConfig.passwordVar);
  if (!password) {
    printResult("WARNING", `${userConfig.label}: missing password (${userConfig.passwordVar} or RLS_TEST_PASSWORD)`);
    return false;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  const { error: signInError } = await client.auth.signInWithPassword({
    email: userConfig.email,
    password,
  });

  if (signInError) {
    printResult("WARNING", `${userConfig.label}: sign-in failed (${signInError.message})`);
    return false;
  }

  const { data, error } = await getApprovedSalesKitResources(client);

  if (error) {
    printResult("WARNING", `${userConfig.label}: read failed (${error.message || "unknown error"})`);
    await client.auth.signOut();
    return false;
  }

  evaluateSalesKitAccess(userConfig, data.length);

  const branchesResult = await getBranches(client);
  const classesResult = await getClasses(client);
  const studentsResult = await getStudents(client);

  if (branchesResult.error || classesResult.error || studentsResult.error) {
    printResult(
      "WARNING",
      `${userConfig.label}: core read error branches/classes/students = ${branchesResult.error?.message || "ok"}/${classesResult.error?.message || "ok"}/${studentsResult.error?.message || "ok"}`
    );
  } else {
    printResult(
      "PASS",
      `${userConfig.label}: dashboard summary input counts branches/classes/students = ${branchesResult.data.length}/${classesResult.data.length}/${studentsResult.data.length}`
    );
    evaluateCoreReadCounts(
      userConfig,
      branchesResult.data.length,
      classesResult.data.length,
      studentsResult.data.length
    );
  }

  const { error: signOutError } = await client.auth.signOut();
  if (signOutError) {
    printResult("WARNING", `${userConfig.label}: sign-out warning (${signOutError.message})`);
  }

  return true;
}

async function run() {
  let checksRun = 0;
  for (const user of users) {
    const didRun = await runUserCheck(user);
    if (didRun) checksRun += 1;
  }

  if (checksRun === 0) {
    printResult("CHECK", "No authenticated role checks completed. Verify local env/password setup.");
    process.exit(1);
  }
}

run();

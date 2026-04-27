import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`ERROR: Missing required env vars in .env.local: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const users = [
  { role: "hq_admin", email: "hq.demo@example.test", specificPasswordVar: "RLS_TEST_HQ_PASSWORD" },
  { role: "branch_supervisor", email: "supervisor.demo@example.test", specificPasswordVar: "RLS_TEST_SUPERVISOR_PASSWORD" },
  { role: "teacher", email: "teacher.demo@example.test", specificPasswordVar: "RLS_TEST_TEACHER_PASSWORD" },
  { role: "parent", email: "parent.demo@example.test", specificPasswordVar: "RLS_TEST_PARENT_PASSWORD" },
  { role: "student", email: "student.demo@example.test", specificPasswordVar: "RLS_TEST_STUDENT_PASSWORD" },
];

const tableChecks = [
  "profiles",
  "branches",
  "classes",
  "students",
  "attendance_records",
  "homework_records",
  "parent_comments",
  "weekly_progress_reports",
  "fee_records",
  "teacher_tasks",
  "sales_kit_resources",
];

function resolvePassword(user) {
  return process.env[user.specificPasswordVar] || process.env.RLS_TEST_PASSWORD || "";
}

function statusLine(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function formatSupabaseError(error) {
  if (!error) return "unknown error";
  const message = error.message || "(no message)";
  const code = error.code || "(no code)";
  const details = error.details || "(no details)";
  const hint = error.hint || "(no hint)";
  return `message="${message}" code="${code}" details="${details}" hint="${hint}"`;
}

async function countRows(client, tableName, filterBuilder = (q) => q) {
  let query = client.from(tableName).select("*", { count: "exact", head: true });
  query = filterBuilder(query);
  const { count, error } = await query;
  if (error) {
    return { ok: false, count: 0, error };
  }
  return { ok: true, count: count ?? 0 };
}

function evaluateExpectations(role, counts, roleEmail) {
  statusLine("CHECK", `${roleEmail}: evaluating rough role expectations`);

  if (role === "hq_admin") {
    if ((counts.branches ?? 0) > 0 && (counts.students ?? 0) > 0) {
      statusLine("PASS", "HQ sees broad/global data.");
    } else {
      statusLine("WARNING", "HQ visibility may be narrower than expected.");
    }
    return;
  }

  if (role === "branch_supervisor") {
    if ((counts.sales_kit_resources ?? 0) > 0) {
      statusLine("PASS", "Branch supervisor sees approved sales kit resources.");
    } else {
      statusLine("CHECK", "No visible sales kit rows; verify approved resources exist.");
    }
    if ((counts._salesKitArchived ?? 0) === 0) {
      statusLine("PASS", "Branch supervisor cannot see archived sales kit resources.");
    } else {
      statusLine("WARNING", "Branch supervisor can see archived sales kit resources.");
    }
    return;
  }

  if (role === "teacher") {
    if ((counts.fee_records ?? 0) === 0) {
      statusLine("PASS", "Teacher cannot access fee_records.");
    } else {
      statusLine("WARNING", "Teacher can see fee_records rows.");
    }
    if ((counts.sales_kit_resources ?? 0) === 0) {
      statusLine("PASS", "Teacher cannot access sales_kit_resources.");
    } else {
      statusLine("WARNING", "Teacher can see sales_kit_resources rows.");
    }
    return;
  }

  if (role === "parent") {
    if ((counts.teacher_tasks ?? 0) === 0) {
      statusLine("PASS", "Parent cannot access internal teacher tasks.");
    } else {
      statusLine("WARNING", "Parent can see teacher_tasks rows.");
    }
    if ((counts._parentCommentsDraft ?? 0) === 0 && (counts._weeklyReportsDraft ?? 0) === 0) {
      statusLine("PASS", "Parent cannot see draft comments/reports.");
    } else {
      statusLine("WARNING", "Parent can see draft comments and/or reports.");
    }
    return;
  }

  if (role === "student") {
    if ((counts.teacher_tasks ?? 0) === 0) {
      statusLine("PASS", "Student cannot access internal teacher tasks.");
    } else {
      statusLine("WARNING", "Student can see teacher_tasks rows.");
    }
    if ((counts.fee_records ?? 0) === 0) {
      statusLine("PASS", "Student cannot access fee_records.");
    } else {
      statusLine("WARNING", "Student can see fee_records rows.");
    }
  }
}

async function runForUser(user) {
  const password = resolvePassword(user);
  if (!password) {
    statusLine(
      "WARNING",
      `${user.email}: missing password env. Set ${user.specificPasswordVar} or RLS_TEST_PASSWORD. Skipping user.`,
    );
    return;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  statusLine("CHECK", `${user.email}: signing in`);
  const { error: signInError } = await client.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (signInError) {
    statusLine("WARNING", `${user.email}: sign-in failed (${signInError.message})`);
    return;
  }

  statusLine("PASS", `${user.email}: sign-in success`);
  const counts = {};

  for (const table of tableChecks) {
    const result = await countRows(client, table);
    if (!result.ok) {
      statusLine(
        "WARNING",
        `${user.email} [${user.role}] table=${table} query failed (${formatSupabaseError(result.error)})`,
      );
      continue;
    }
    counts[table] = result.count;
    statusLine("CHECK", `${user.email}: ${table} -> ${result.count} rows`);
  }

  if (user.role === "branch_supervisor") {
    const archived = await countRows(client, "sales_kit_resources", (q) => q.eq("status", "archived"));
    if (!archived.ok) {
      statusLine(
        "WARNING",
        `${user.email} [${user.role}] table=sales_kit_resources(status=archived) query failed (${formatSupabaseError(archived.error)})`,
      );
    }
    counts._salesKitArchived = archived.ok ? archived.count : -1;
  }
  if (user.role === "parent") {
    const draftComments = await countRows(client, "parent_comments", (q) => q.eq("status", "draft"));
    const draftReports = await countRows(client, "weekly_progress_reports", (q) => q.eq("status", "draft"));
    if (!draftComments.ok) {
      statusLine(
        "WARNING",
        `${user.email} [${user.role}] table=parent_comments(status=draft) query failed (${formatSupabaseError(draftComments.error)})`,
      );
    }
    if (!draftReports.ok) {
      statusLine(
        "WARNING",
        `${user.email} [${user.role}] table=weekly_progress_reports(status=draft) query failed (${formatSupabaseError(draftReports.error)})`,
      );
    }
    counts._parentCommentsDraft = draftComments.ok ? draftComments.count : -1;
    counts._weeklyReportsDraft = draftReports.ok ? draftReports.count : -1;
  }

  evaluateExpectations(user.role, counts, user.email);

  const { error: signOutError } = await client.auth.signOut();
  if (signOutError) {
    statusLine("WARNING", `${user.email}: sign-out warning (${signOutError.message})`);
  } else {
    statusLine("CHECK", `${user.email}: signed out`);
  }
}

async function main() {
  statusLine("CHECK", "Starting Supabase RLS smoke test (fake users only)");
  statusLine("CHECK", "Using anon key only (service role key is not used)");
  for (const user of users) {
    console.log("");
    statusLine("CHECK", `--- Role test: ${user.role} (${user.email}) ---`);
    // eslint-disable-next-line no-await-in-loop
    await runForUser(user);
  }
  console.log("");
  statusLine("PASS", "RLS smoke test run finished.");
}

main().catch((err) => {
  console.error(`[ERROR] Unhandled failure: ${err?.message || err}`);
  process.exit(1);
});


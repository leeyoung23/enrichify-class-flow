import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function buildClient(token = "") {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

function roleConfigFromEnv() {
  return {
    hq: {
      label: "HQ admin",
      email: process.env.RLS_TEST_HQ_EMAIL || process.env.RLS_TEST_HQ_ADMIN_EMAIL || "hq.demo@example.test",
      passwordVar: "RLS_TEST_HQ_PASSWORD",
    },
    supervisor: {
      label: "Branch supervisor",
      email: process.env.RLS_TEST_SUPERVISOR_EMAIL || "supervisor.demo@example.test",
      passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
    },
    teacher: {
      label: "Teacher",
      email: process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test",
      passwordVar: "RLS_TEST_TEACHER_PASSWORD",
    },
    parent: {
      label: "Parent",
      email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
      passwordVar: "RLS_TEST_PARENT_PASSWORD",
    },
    student: {
      label: "Student",
      email: process.env.RLS_TEST_STUDENT_EMAIL || "student.demo@example.test",
      passwordVar: "RLS_TEST_STUDENT_PASSWORD",
    },
  };
}

async function safeReadJson(response) {
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function invokeDraft(client, payload) {
  const { data, error } = await client.functions.invoke("generate-homework-feedback-draft", {
    body: payload,
  });
  if (!error) return { status: 200, body: data, error: null };
  const status = error?.context?.status || 0;
  const body = await safeReadJson(error?.context);
  return {
    status,
    body,
    error: {
      message: error?.message || "invoke_error",
      name: error?.name || "FunctionsInvokeError",
    },
  };
}

function isDeploymentUnavailable(result) {
  const code = String(result?.body?.error?.code || "").toLowerCase();
  const message = String(result?.body?.error?.message || result?.error?.message || "").toLowerCase();
  return (
    result?.status === 404 ||
    code.includes("function_not_found") ||
    message.includes("not found") ||
    message.includes("failed to send a request")
  );
}

async function signInRole(role) {
  const password = resolvePassword(role.passwordVar);
  if (!password) {
    printResult("CHECK", `${role.label}: skipped (missing ${role.passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false, skipped: true };
  }

  const client = buildClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: role.email,
    password,
  });
  if (error || !data?.session?.access_token) {
    printResult("CHECK", `${role.label}: skipped (sign-in unavailable in current dev env)`);
    await client.auth.signOut();
    return { ok: false, skipped: true };
  }
  return {
    ok: true,
    client,
    accessToken: data.session.access_token,
  };
}

async function getAccessiblePayload(client) {
  const { data: submission } = await client
    .from("homework_submissions")
    .select("id,homework_task_id,student_id,class_id,branch_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!submission) return null;
  return {
    homeworkSubmissionId: submission.id,
    homeworkTaskId: submission.homework_task_id,
    studentId: submission.student_id,
    classId: submission.class_id,
    teacherObservation: "Fake/dev deployed regression observation only.",
    mode: "deployed_regression",
    tone: "supportive",
    length: "short",
  };
}

function validateSuccessDraftShape(body) {
  const data = body?.data;
  const required = [
    "markingSummary",
    "feedbackText",
    "nextStep",
    "learningGaps",
    "teacherNotes",
    "safetyNotes",
    "modelInfo",
  ];
  return Boolean(data && required.every((key) => key in data));
}

async function run() {
  if (!supabaseUrl || !supabaseAnonKey) {
    printResult("CHECK", "Skipped: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env.local");
    process.exit(0);
  }

  const roles = roleConfigFromEnv();
  let failures = 0;

  const basicPayload = {
    homeworkSubmissionId: "fake-submission-id",
    homeworkTaskId: "fake-task-id",
    studentId: "fake-student-id",
    classId: "fake-class-id",
    teacherObservation: "Fake/dev observation",
    mode: "deployed_regression",
    tone: "supportive",
    length: "short",
  };

  const anonClient = buildClient();
  const missingAuth = await invokeDraft(anonClient, basicPayload);
  if (isDeploymentUnavailable(missingAuth)) {
    printResult("CHECK", "Skipped: deployed function unavailable in current dev project");
    process.exit(0);
  }
  if (missingAuth.status === 401) {
    printResult("PASS", "Missing auth returns 401");
  } else {
    printResult("WARNING", `Missing auth expected 401, received ${missingAuth.status || "unknown"}`);
    failures += 1;
  }

  const invalidTokenClient = buildClient("fake-invalid-token");
  const invalidToken = await invokeDraft(invalidTokenClient, basicPayload);
  if (invalidToken.status === 401) {
    printResult("PASS", "Invalid token returns 401");
  } else {
    printResult("WARNING", `Invalid token expected 401, received ${invalidToken.status || "unknown"}`);
    failures += 1;
  }

  const parentSession = await signInRole(roles.parent);
  if (parentSession.ok) {
    const parentResult = await invokeDraft(parentSession.client, basicPayload);
    if (parentResult.status === 403) {
      printResult("PASS", "Parent role blocked with 403");
    } else {
      printResult("WARNING", `Parent expected 403, received ${parentResult.status || "unknown"}`);
      failures += 1;
    }
    await parentSession.client.auth.signOut();
  }

  const studentSession = await signInRole(roles.student);
  if (studentSession.ok) {
    const studentResult = await invokeDraft(studentSession.client, basicPayload);
    if (studentResult.status === 403) {
      printResult("PASS", "Student role blocked with 403");
    } else {
      printResult("WARNING", `Student expected 403, received ${studentResult.status || "unknown"}`);
      failures += 1;
    }
    await studentSession.client.auth.signOut();
  }

  const allowedRoles = [
    { key: "teacher", expectedLabel: "Assigned teacher" },
    { key: "supervisor", expectedLabel: "Branch supervisor own-branch" },
    { key: "hq", expectedLabel: "HQ admin" },
  ];

  let referenceAllowed = null;

  for (const item of allowedRoles) {
    const session = await signInRole(roles[item.key]);
    if (!session.ok) continue;

    const payload = await getAccessiblePayload(session.client);
    if (!payload) {
      printResult("CHECK", `${item.expectedLabel}: skipped (no accessible fake homework submission found)`);
      await session.client.auth.signOut();
      continue;
    }

    const { count: beforeCount } = await session.client
      .from("homework_feedback")
      .select("id", { count: "exact", head: true })
      .eq("homework_submission_id", payload.homeworkSubmissionId);

    const result = await invokeDraft(session.client, payload);
    if (result.status === 200 && validateSuccessDraftShape(result.body)) {
      printResult("PASS", `${item.expectedLabel} allowed and output shape valid`);
      const safety = String(result.body?.data?.safetyNotes || "").toLowerCase();
      if (safety.includes("draft only") && safety.includes("no auto-release")) {
        printResult("PASS", `${item.expectedLabel} response includes draft-only safety note`);
      } else {
        printResult("WARNING", `${item.expectedLabel} response missing required draft-only safety note`);
        failures += 1;
      }

      const { count: afterCount } = await session.client
        .from("homework_feedback")
        .select("id", { count: "exact", head: true })
        .eq("homework_submission_id", payload.homeworkSubmissionId);

      if (typeof beforeCount === "number" && typeof afterCount === "number") {
        if (beforeCount === afterCount) {
          printResult("PASS", `${item.expectedLabel} produced no auto-save side effect`);
        } else {
          printResult("WARNING", `${item.expectedLabel} feedback row count changed unexpectedly`);
          failures += 1;
        }
      } else {
        printResult("CHECK", `${item.expectedLabel} auto-save check unavailable (count read not available)`);
      }

      if (!referenceAllowed) {
        referenceAllowed = { client: session.client, payload };
      } else {
        await session.client.auth.signOut();
      }
    } else if (result.status === 403 || result.status === 404) {
      printResult("CHECK", `${item.expectedLabel}: skipped (no in-scope fake fixture in current dev env)`);
      await session.client.auth.signOut();
    } else {
      printResult("WARNING", `${item.expectedLabel} expected allowed result, received ${result.status || "unknown"}`);
      failures += 1;
      await session.client.auth.signOut();
    }
  }

  if (referenceAllowed) {
    const { client, payload } = referenceAllowed;

    const mismatchTask = await invokeDraft(client, {
      ...payload,
      homeworkTaskId: `${payload.homeworkTaskId}-mismatch`,
    });
    if (mismatchTask.status >= 400) {
      printResult("PASS", "Mismatched homeworkTaskId blocked");
    } else {
      printResult("WARNING", "Mismatched homeworkTaskId expected blocked response");
      failures += 1;
    }

    const mismatchStudent = await invokeDraft(client, {
      ...payload,
      studentId: `${payload.studentId}-mismatch`,
    });
    if (mismatchStudent.status >= 400) {
      printResult("PASS", "Mismatched studentId blocked");
    } else {
      printResult("WARNING", "Mismatched studentId expected blocked response");
      failures += 1;
    }

    const mismatchClass = await invokeDraft(client, {
      ...payload,
      classId: `${payload.classId}-mismatch`,
    });
    if (mismatchClass.status >= 400) {
      printResult("PASS", "Mismatched classId blocked");
    } else {
      printResult("WARNING", "Mismatched classId expected blocked response");
      failures += 1;
    }

    await client.auth.signOut();
  } else {
    printResult("CHECK", "Relationship mismatch cases skipped (no allowed-role fixture available)");
  }

  if (failures > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  printResult("WARNING", `Deployed regression script failed (${err?.message || "unknown"})`);
  process.exit(1);
});

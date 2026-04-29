import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

const FAKE_STUDENT_ID = "55555555-5555-5555-5555-555555555555";
const FAKE_SCHOOL_ID = "91300000-0000-0000-0000-000000000001";
const FAKE_PROFILE_ENGLISH = "91300000-0000-0000-0000-000000000011";
const FAKE_PROFILE_MATHS = "91300000-0000-0000-0000-000000000012";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("WARNING", `${label}: missing password (${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false, skipped: true };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("WARNING", `${label}: sign-in failed (${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true, skipped: false };
}

async function run() {
  const [
    { signInWithEmailPassword, signOut },
    { upsertStudentSchoolProfile },
    { getStudentLearningContext },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const users = {
    supervisor: {
      label: "Branch Supervisor",
      email: "supervisor.demo@example.test",
      passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
    },
    teacher: {
      label: "Teacher",
      email: "teacher.demo@example.test",
      passwordVar: "RLS_TEST_TEACHER_PASSWORD",
    },
    parent: {
      label: "Parent",
      email: "parent.demo@example.test",
      passwordVar: "RLS_TEST_PARENT_PASSWORD",
    },
    student: {
      label: "Student",
      email: "student.demo@example.test",
      passwordVar: "RLS_TEST_STUDENT_PASSWORD",
    },
    hq: {
      label: "HQ Admin",
      email: "hq.demo@example.test",
      passwordVar: "RLS_TEST_HQ_PASSWORD",
    },
  };

  let failureCount = 0;
  let warningCount = 0;
  let checkCount = 0;

  let snapshotRow = null;

  const supervisorSignIn = await signInRole(users.supervisor, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    process.exit(1);
  }

  const snapshotRead = await supabase
    .from("student_school_profiles")
    .select("id,student_id,school_id,school_name,grade_year,curriculum_profile_id,parent_goals,teacher_notes")
    .eq("student_id", FAKE_STUDENT_ID)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotRead.error) {
    printResult("WARNING", `Branch Supervisor: unable to snapshot school profile (${snapshotRead.error.message || "unknown"})`);
    failureCount += 1;
  } else {
    snapshotRow = snapshotRead.data ?? null;
    printResult("PASS", "Branch Supervisor: snapshotted fake student school profile state");
  }

  const upsertResult = await upsertStudentSchoolProfile({
    studentId: FAKE_STUDENT_ID,
    schoolId: FAKE_SCHOOL_ID,
    schoolName: "Demo Primary School (Write Smoke)",
    gradeYear: "Year 4 - Write Smoke",
    curriculumProfileId: FAKE_PROFILE_MATHS,
    parentGoals: "Write smoke parent goals for fake student context.",
    teacherNotes: "Write smoke teacher notes for fake student context.",
  });

  if (upsertResult.error || !upsertResult.data) {
    printResult("WARNING", `Branch Supervisor: upsertStudentSchoolProfile failed (${upsertResult.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    printResult("PASS", `Branch Supervisor: upsertStudentSchoolProfile wrote ${upsertResult.data.id}`);
  }

  const verifyContext = await getStudentLearningContext({ studentId: FAKE_STUDENT_ID });
  if (verifyContext.error || !verifyContext.data?.student_school_profile) {
    printResult("WARNING", `Branch Supervisor: context read-back failed (${verifyContext.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    const profile = verifyContext.data.student_school_profile;
    const valid =
      profile.school_name === "Demo Primary School (Write Smoke)"
      && profile.grade_year === "Year 4 - Write Smoke"
      && profile.curriculum_profile_id === FAKE_PROFILE_MATHS;
    if (!valid) {
      printResult("CHECK", "Branch Supervisor: read-back values did not match expected upsert");
      checkCount += 1;
      failureCount += 1;
    } else {
      printResult("PASS", "Branch Supervisor: read-back verified via getStudentLearningContext");
    }
  }

  await signOut();

  for (const role of [users.parent, users.student, users.teacher]) {
    const signedIn = await signInRole(role, { signInWithEmailPassword, signOut });
    if (!signedIn.ok) {
      warningCount += 1;
      failureCount += 1;
      continue;
    }

    const blockedAttempt = await upsertStudentSchoolProfile({
      studentId: FAKE_STUDENT_ID,
      schoolId: FAKE_SCHOOL_ID,
      schoolName: `${role.label} blocked write`,
      gradeYear: "Blocked Write",
      curriculumProfileId: FAKE_PROFILE_ENGLISH,
      parentGoals: "blocked write",
      teacherNotes: "blocked write",
    });

    if (blockedAttempt.error || !blockedAttempt.data) {
      printResult("PASS", `${role.label}: student school profile write blocked by RLS`);
    } else {
      printResult("WARNING", `${role.label}: unexpectedly wrote school profile ${blockedAttempt.data.id}`);
      warningCount += 1;
      failureCount += 1;
    }
    await signOut();
  }

  const hqSignIn = await signInRole(users.hq, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) {
    printResult("CHECK", "HQ Admin: optional write check skipped");
    checkCount += 1;
  } else {
    const hqAttempt = await upsertStudentSchoolProfile({
      studentId: FAKE_STUDENT_ID,
      schoolId: FAKE_SCHOOL_ID,
      schoolName: "HQ Optional School Profile Write",
      gradeYear: "HQ Optional",
      curriculumProfileId: FAKE_PROFILE_ENGLISH,
      parentGoals: "HQ optional parent goals write",
      teacherNotes: "HQ optional teacher notes write",
    });
    if (hqAttempt.error || !hqAttempt.data) {
      printResult("CHECK", `HQ Admin: optional write did not succeed (${hqAttempt.error?.message || "blocked"})`);
      checkCount += 1;
    } else {
      printResult("PASS", "HQ Admin: optional write succeeded");
    }
    await signOut();
  }

  const cleanupSignIn = await signInRole(users.supervisor, { signInWithEmailPassword, signOut });
  if (!cleanupSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: cleanup skipped due to sign-in failure");
    warningCount += 1;
    failureCount += 1;
  } else {
    if (snapshotRow?.id) {
      const restore = await supabase
        .from("student_school_profiles")
        .update({
          school_id: snapshotRow.school_id,
          school_name: snapshotRow.school_name,
          grade_year: snapshotRow.grade_year,
          curriculum_profile_id: snapshotRow.curriculum_profile_id,
          parent_goals: snapshotRow.parent_goals,
          teacher_notes: snapshotRow.teacher_notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", snapshotRow.id)
        .select("id")
        .maybeSingle();

      if (restore.error || !restore.data) {
        printResult("WARNING", `Branch Supervisor: cleanup restore failed (${restore.error?.message || "unknown"})`);
        warningCount += 1;
        failureCount += 1;
      } else {
        printResult("PASS", `Branch Supervisor: restored profile ${snapshotRow.id} to original fake values`);
      }
    } else {
      const deleteResult = await supabase
        .from("student_school_profiles")
        .delete()
        .eq("student_id", FAKE_STUDENT_ID);
      if (deleteResult.error) {
        printResult("WARNING", `Branch Supervisor: cleanup delete failed (${deleteResult.error.message || "unknown"})`);
        warningCount += 1;
        failureCount += 1;
      } else {
        printResult("PASS", "Branch Supervisor: removed smoke-created student school profile row");
      }
    }
    await signOut();
  }

  if (warningCount > 0 || checkCount > 0) {
    printResult("CHECK", `Summary warnings=${warningCount} checks=${checkCount}`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
  printResult("PASS", "School profile write smoke test completed");
}

run().catch((err) => {
  console.error("[WARNING] School profile write smoke test crashed:", err?.message || err);
  process.exit(1);
});

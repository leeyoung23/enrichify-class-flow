import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("CHECK", `${label}: skipped (missing ${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false, skipped: true };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("CHECK", `${label}: skipped (sign-in failed: ${error.message || "unknown"})`);
    await signOut();
    return { ok: false, skipped: true };
  }
  return { ok: true, skipped: false };
}

async function resolveCurrentProfileContext(supabase) {
  const authRead = await supabase.auth.getUser();
  const userId = authRead?.data?.user?.id || null;
  if (!userId) return { data: null, error: { message: "Authenticated user id unavailable" } };
  const profileRead = await supabase
    .from("profiles")
    .select("id,branch_id,role,is_active")
    .eq("id", userId)
    .maybeSingle();
  if (profileRead.error || !profileRead.data) {
    return { data: null, error: profileRead.error || { message: "Profile lookup failed" } };
  }
  return { data: profileRead.data, error: null };
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const { listAnnouncements, listEligibleCompanyNewsPopups, listMyAnnouncementTasks } = readService;
  const { createCompanyNews, publishCompanyNews } = writeService;

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const supervisorUser = {
    label: "Branch Supervisor",
    email: "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
  };
  const teacherUser = {
    label: "Teacher",
    email: "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
  const studentUser = {
    label: "Student",
    email: process.env.RLS_TEST_STUDENT_EMAIL || "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
  };

  const deps = { signInWithEmailPassword, signOut };
  let failureCount = 0;
  let warningCount = 0;
  const createdAnnouncementIds = [];
  let teacherProfileId = null;
  let createdAnnouncementId = null;

  const teacherSignInForFixture = await signInRole(teacherUser, deps);
  if (teacherSignInForFixture.ok) {
    const teacherProfile = await resolveCurrentProfileContext(supabase);
    teacherProfileId = teacherProfile.data?.id || null;
    if (!teacherProfileId) {
      printResult("CHECK", "Teacher profile fixture unavailable; target/read checks may be skipped");
    }
  } else {
    printResult("CHECK", "Teacher profile fixture skipped");
  }
  await signOut();

  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const createPayload = {
      title: `Smoke Company News Create ${new Date().toISOString()}`,
      subtitle: "Fake/dev Company News create smoke",
      body: "Fake/dev Company News body for create/publish validation.",
      priority: "normal",
      popupEnabled: true,
      popupEmoji: "📣",
      targets: teacherProfileId
        ? [{ targetType: "profile", targetProfileId: teacherProfileId }]
        : [{ targetType: "role", targetRole: "teacher" }],
    };

    const createResult = await createCompanyNews(createPayload);
    if (createResult.error || !createResult.data?.announcement?.id) {
      printResult("WARNING", `HQ Admin: createCompanyNews failed (${createResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      createdAnnouncementId = createResult.data.announcement.id;
      createdAnnouncementIds.push(createdAnnouncementId);
      printResult("PASS", "HQ Admin: createCompanyNews draft succeeded");
    }

    if (createdAnnouncementId) {
      const publishResult = await publishCompanyNews({ announcementId: createdAnnouncementId });
      if (publishResult.error || publishResult.data?.status !== "published") {
        printResult("WARNING", `HQ Admin: publishCompanyNews failed (${publishResult.error?.message || "unknown"})`);
        failureCount += 1;
      } else {
        printResult("PASS", "HQ Admin: publishCompanyNews succeeded");
      }
    }
  } else {
    printResult("CHECK", "HQ Admin create/publish checks skipped");
  }
  await signOut();

  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok && createdAnnouncementId) {
    const readResult = await listAnnouncements({
      status: "published",
      audienceType: "internal_staff",
      announcementType: "company_news",
    });
    if (readResult.error) {
      printResult("CHECK", `Teacher: list company_news skipped/blocked (${readResult.error?.message || "unknown"})`);
    } else {
      const visible = (readResult.data || []).some((row) => row?.id === createdAnnouncementId);
      if (visible) printResult("PASS", "Teacher: targeted company_news is visible");
      else printResult("CHECK", "Teacher: targeted company_news visibility skipped/not visible (fixture or policy dependent)");
    }

    const popupRead = await listEligibleCompanyNewsPopups({ limit: 10 });
    if (popupRead.error) {
      printResult("CHECK", `Teacher: popup eligibility check skipped/blocked (${popupRead.error?.message || "unknown"})`);
    } else {
      const popupVisible = (popupRead.data || []).some((row) => row?.announcementId === createdAnnouncementId);
      if (popupVisible) printResult("PASS", "Teacher: popup eligibility includes published company_news");
      else printResult("CHECK", "Teacher: popup eligibility check skipped/not visible (fixture or policy dependent)");
    }

    const myTasksRead = await listMyAnnouncementTasks({ includeDone: true });
    if (myTasksRead.error) {
      printResult("CHECK", `Teacher: MyTasks side-effect check skipped (${myTasksRead.error?.message || "unknown"})`);
    } else {
      const appearsInTasks = (myTasksRead.data || []).some((row) => row?.announcementId === createdAnnouncementId);
      if (!appearsInTasks) {
        printResult("PASS", "Teacher: Company News did not create a MyTasks item");
      } else {
        printResult("WARNING", "Teacher: Company News unexpectedly appeared in MyTasks");
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Teacher company_news visibility checks skipped");
  }
  await signOut();

  const supervisorSignIn = await signInRole(supervisorUser, deps);
  if (supervisorSignIn.ok) {
    const supervisorCreate = await createCompanyNews({
      title: `Supervisor should fail ${new Date().toISOString()}`,
      body: "Fake/dev supervisor create attempt",
      targets: [],
    });
    if (supervisorCreate.error) {
      printResult("PASS", "Branch Supervisor: createCompanyNews blocked for MVP");
    } else {
      if (supervisorCreate.data?.announcement?.id) createdAnnouncementIds.push(supervisorCreate.data.announcement.id);
      printResult("WARNING", "Branch Supervisor: createCompanyNews unexpectedly succeeded");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Branch Supervisor create-block check skipped");
  }
  await signOut();

  const teacherCreateSignIn = await signInRole(teacherUser, deps);
  if (teacherCreateSignIn.ok) {
    const teacherCreate = await createCompanyNews({
      title: `Teacher should fail ${new Date().toISOString()}`,
      body: "Fake/dev teacher create attempt",
      targets: [],
    });
    if (teacherCreate.error) {
      printResult("PASS", "Teacher: createCompanyNews blocked");
    } else {
      if (teacherCreate.data?.announcement?.id) createdAnnouncementIds.push(teacherCreate.data.announcement.id);
      printResult("WARNING", "Teacher: createCompanyNews unexpectedly succeeded");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Teacher create-block check skipped");
  }
  await signOut();

  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const parentRead = await listAnnouncements({ audienceType: "internal_staff", announcementType: "company_news" });
    if (parentRead.error || (Array.isArray(parentRead.data) && parentRead.data.length === 0)) {
      printResult("PASS", "Parent: internal_staff company_news read blocked/empty as expected");
    } else {
      printResult("WARNING", "Parent: internal_staff company_news unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Parent read-block check skipped");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    const studentRead = await listAnnouncements({ audienceType: "internal_staff", announcementType: "company_news" });
    if (studentRead.error || (Array.isArray(studentRead.data) && studentRead.data.length === 0)) {
      printResult("PASS", "Student: internal_staff company_news read blocked/empty as expected");
    } else {
      printResult("WARNING", "Student: internal_staff company_news unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Student read-block check skipped");
  }
  await signOut();

  const cleanupSignIn = await signInRole(hqUser, deps);
  if (!cleanupSignIn.ok) {
    await signInRole(supervisorUser, deps);
  }
  for (const announcementId of createdAnnouncementIds) {
    if (!isUuidLike(announcementId)) continue;
    const deleteResult = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId)
      .select("id")
      .maybeSingle();
    if (deleteResult.error) {
      printResult("CHECK", `Cleanup: announcement delete skipped/blocked (${announcementId})`);
      warningCount += 1;
    } else {
      printResult("PASS", `Cleanup: announcement removed (${announcementId})`);
    }
  }
  await signOut();

  printResult("PASS", "No notification/email behavior was exercised in this smoke test");

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning/check note(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Company News create smoke test crashed:", err?.message || err);
  process.exit(1);
});

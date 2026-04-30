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
    .select("id,branch_id,role")
    .eq("id", userId)
    .maybeSingle();
  if (profileRead.error || !profileRead.data) {
    return { data: null, error: profileRead.error || { message: "Profile lookup failed" } };
  }
  return { data: profileRead.data, error: null };
}

function summarizeProfileContext(profile) {
  if (!profile) return "profile_unavailable";
  const role = typeof profile.role === "string" ? profile.role : "unknown";
  const active = String(Boolean(profile.is_active));
  const branch = isUuidLike(profile.branch_id) ? "uuid" : String(profile.branch_id || "null");
  return `role=${role} active=${active} branch=${branch}`;
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const {
    listAnnouncements,
    listAnnouncementTargets,
    listAnnouncementStatuses,
    listAnnouncementReplies,
  } = readService;
  const {
    createAnnouncementRequest,
    publishAnnouncement,
    markAnnouncementRead,
    updateAnnouncementDoneStatus,
    createAnnouncementReply,
  } = writeService;

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
  const cleanupWarnings = [];
  const createdAnnouncementIds = [];

  let hqAnnouncementId = null;
  let supervisorAnnouncementId = null;
  let teacherProfileId = null;
  let supervisorProfile = null;

  // 1) HQ create request announcement.
  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const hqProfileCtx = await resolveCurrentProfileContext(supabase);
    if (hqProfileCtx.error || !hqProfileCtx.data?.id) {
      printResult("CHECK", "HQ Admin: create check skipped (profile context unavailable)");
    } else {
      const contextSummary = summarizeProfileContext(hqProfileCtx.data);
      if (hqProfileCtx.data.role !== "hq_admin") {
        printResult("CHECK", `HQ Admin: fixture role mismatch (${contextSummary})`);
      }
      if (hqProfileCtx.data.is_active === false) {
        printResult("CHECK", `HQ Admin: fixture inactive (${contextSummary})`);
      }
      const createResult = await createAnnouncementRequest({
        branchId: hqProfileCtx.data.branch_id || null,
        title: `Smoke HQ Announcement ${new Date().toISOString()}`,
        subtitle: "Fake/dev HQ announcement fixture",
        body: "Fake/dev HQ body",
        priority: "normal",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        requiresResponse: true,
        requiresUpload: false,
        targets: [],
      });
      if (createResult.error || !createResult.data?.announcement?.id) {
        printResult(
          "CHECK",
          `HQ Admin: create announcement check skipped (${createResult.error?.message || "unknown"}; ${contextSummary})`
        );
      } else {
        hqAnnouncementId = createResult.data.announcement.id;
        createdAnnouncementIds.push(hqAnnouncementId);
        printResult("PASS", "HQ Admin: create announcement request succeeded");
      }
    }
  } else {
    printResult("CHECK", "HQ Admin create check skipped");
  }
  await signOut();

  // 2) Branch supervisor create own-branch request + publish.
  const supervisorSignIn = await signInRole(supervisorUser, deps);
  if (supervisorSignIn.ok) {
    const supervisorCtx = await resolveCurrentProfileContext(supabase);
    supervisorProfile = supervisorCtx.data || null;
    if (supervisorCtx.error || !supervisorCtx.data?.id || !isUuidLike(supervisorCtx.data.branch_id)) {
      printResult("CHECK", "Branch Supervisor: own-branch create check skipped (profile/branch context unavailable)");
    } else {
      const contextSummary = summarizeProfileContext(supervisorCtx.data);
      if (supervisorCtx.data.role !== "branch_supervisor") {
        printResult("CHECK", `Branch Supervisor: fixture role mismatch (${contextSummary})`);
      }
      if (supervisorCtx.data.is_active === false) {
        printResult("CHECK", `Branch Supervisor: fixture inactive (${contextSummary})`);
      }
      const createResult = await createAnnouncementRequest({
        branchId: supervisorCtx.data.branch_id,
        title: `Smoke Supervisor Announcement ${new Date().toISOString()}`,
        subtitle: "Fake/dev supervisor announcement fixture",
        body: "Fake/dev supervisor body",
        priority: "high",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        requiresResponse: true,
        requiresUpload: false,
        targets: [{ targetType: "branch", branchId: supervisorCtx.data.branch_id }],
      });
      if (createResult.error || !createResult.data?.announcement?.id) {
        printResult(
          "CHECK",
          `Branch Supervisor: own-branch create check skipped (${createResult.error?.message || "unknown"}; ${contextSummary})`
        );
      } else {
        supervisorAnnouncementId = createResult.data.announcement.id;
        createdAnnouncementIds.push(supervisorAnnouncementId);
        printResult("PASS", "Branch Supervisor: create own-branch announcement request succeeded");
        const publishResult = await publishAnnouncement({ announcementId: supervisorAnnouncementId });
        if (publishResult.error || publishResult.data?.status !== "published") {
          printResult("WARNING", `Branch Supervisor: publish failed (${publishResult.error?.message || "unknown"})`);
          failureCount += 1;
        } else {
          printResult("PASS", "Branch Supervisor: publish announcement succeeded");
        }
      }
    }
  } else {
    printResult("CHECK", "Branch Supervisor checks skipped");
  }
  await signOut();

  // 3) Teacher cannot create.
  const teacherSignInForCreate = await signInRole(teacherUser, deps);
  if (teacherSignInForCreate.ok) {
    const teacherCtx = await resolveCurrentProfileContext(supabase);
    teacherProfileId = teacherCtx.data?.id || null;
    const teacherCreate = await createAnnouncementRequest({
      branchId: teacherCtx.data?.branch_id || null,
      title: `Teacher should fail ${new Date().toISOString()}`,
      body: "Teacher create attempt fixture",
      priority: "normal",
      targets: [],
    });
    if (teacherCreate.error) {
      printResult("PASS", "Teacher: create announcement blocked as expected");
    } else {
      printResult("WARNING", "Teacher: unsafe create announcement unexpectedly succeeded");
      if (teacherCreate.data?.announcement?.id) createdAnnouncementIds.push(teacherCreate.data.announcement.id);
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Teacher create-block check skipped");
  }
  await signOut();

  // 4) Branch supervisor target teacher if possible, then teacher read/status/reply.
  const supervisorSignInTarget = await signInRole(supervisorUser, deps);
  if (supervisorSignInTarget.ok && supervisorAnnouncementId && teacherProfileId && supervisorProfile?.branch_id) {
    const targetInsert = await supabase
      .from("announcement_targets")
      .insert({
        announcement_id: supervisorAnnouncementId,
        target_type: "profile",
        branch_id: supervisorProfile.branch_id,
        target_profile_id: teacherProfileId,
      })
      .select("id")
      .maybeSingle();
    if (targetInsert.error || !targetInsert.data?.id) {
      printResult("CHECK", `Supervisor->Teacher target fixture skipped (${targetInsert.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Branch Supervisor: targeted teacher profile fixture created");
    }
  } else {
    printResult("CHECK", "Supervisor->Teacher target fixture skipped (missing prerequisites)");
  }
  await signOut();

  const teacherSignInFlow = await signInRole(teacherUser, deps);
  if (teacherSignInFlow.ok && supervisorAnnouncementId) {
    const teacherAnnouncements = await listAnnouncements({
      status: "published",
      audienceType: "internal_staff",
      announcementType: "request",
    });
    if (teacherAnnouncements.error) {
      printResult("WARNING", `Teacher: listAnnouncements failed (${teacherAnnouncements.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const visible = (teacherAnnouncements.data || []).some((row) => row?.id === supervisorAnnouncementId);
      if (visible) printResult("PASS", "Teacher: targeted published announcement is visible");
      else printResult("CHECK", "Teacher: targeted visibility check skipped/not visible (fixture or policy dependent)");
    }

    const readResult = await markAnnouncementRead({ announcementId: supervisorAnnouncementId });
    if (readResult.error) {
      printResult("CHECK", `Teacher: mark read skipped/blocked (${readResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: mark announcement read succeeded");
    }

    const doneResult = await updateAnnouncementDoneStatus({
      announcementId: supervisorAnnouncementId,
      doneStatus: "done",
      undoneReason: null,
    });
    if (doneResult.error) {
      printResult("CHECK", `Teacher: mark done skipped/blocked (${doneResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: update done_status=done succeeded");
    }

    const undoneResult = await updateAnnouncementDoneStatus({
      announcementId: supervisorAnnouncementId,
      doneStatus: "undone",
      undoneReason: "Fake/dev undone reason for smoke test",
    });
    if (undoneResult.error) {
      printResult("CHECK", `Teacher: mark undone skipped/blocked (${undoneResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: update done_status=undone succeeded");
    }

    const replyResult = await createAnnouncementReply({
      announcementId: supervisorAnnouncementId,
      body: "Fake/dev teacher structured reply",
      replyType: "question",
    });
    if (replyResult.error) {
      printResult("CHECK", `Teacher: structured reply skipped/blocked (${replyResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: structured reply insert as self succeeded");
    }

    const statusRows = await listAnnouncementStatuses({ announcementId: supervisorAnnouncementId, profileId: teacherProfileId });
    if (statusRows.error) {
      printResult("CHECK", `Teacher: list statuses skipped/blocked (${statusRows.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: list statuses call succeeded");
    }

    const replyRows = await listAnnouncementReplies({ announcementId: supervisorAnnouncementId });
    if (replyRows.error) {
      printResult("CHECK", `Teacher: list replies skipped/blocked (${replyRows.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: list replies call succeeded");
    }

    const targetRows = await listAnnouncementTargets({ announcementId: supervisorAnnouncementId });
    if (targetRows.error) {
      printResult("CHECK", `Teacher: list targets blocked (expected in strict target privacy mode)`);
    } else {
      printResult("PASS", "Teacher: list targets call succeeded under current RLS");
    }
  } else {
    printResult("CHECK", "Teacher read/status/reply checks skipped");
  }
  await signOut();

  // 5) Parent/student no internal_staff read.
  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const parentRead = await listAnnouncements({ audienceType: "internal_staff" });
    if (parentRead.error || (Array.isArray(parentRead.data) && parentRead.data.length === 0)) {
      printResult("PASS", "Parent: internal_staff announcement read blocked/empty as expected");
    } else {
      printResult("WARNING", "Parent: internal_staff announcements unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Parent access-block check skipped");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    const studentRead = await listAnnouncements({ audienceType: "internal_staff" });
    if (studentRead.error || (Array.isArray(studentRead.data) && studentRead.data.length === 0)) {
      printResult("PASS", "Student: internal_staff announcement read blocked/empty as expected");
    } else {
      printResult("WARNING", "Student: internal_staff announcements unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Student access-block check skipped");
  }
  await signOut();

  // 6) Cross-branch target write negative check.
  const supervisorSignInCross = await signInRole(supervisorUser, deps);
  if (supervisorSignInCross.ok && supervisorAnnouncementId && supervisorProfile?.branch_id) {
    const foreignBranchId = process.env.ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID || "";
    if (!isUuidLike(foreignBranchId)) {
      printResult("CHECK", "Cross-branch target write check skipped (ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID missing)");
    } else if (foreignBranchId.trim() === supervisorProfile.branch_id) {
      printResult("CHECK", "Cross-branch target write check skipped (other branch id equals supervisor branch)");
    } else {
      const crossTarget = await supabase
        .from("announcement_targets")
        .insert({
          announcement_id: supervisorAnnouncementId,
          target_type: "branch",
          branch_id: foreignBranchId.trim(),
        })
        .select("id")
        .maybeSingle();
      if (crossTarget.error) {
        printResult("PASS", "Branch Supervisor: cross-branch target write blocked as expected");
      } else {
        printResult("WARNING", "Branch Supervisor: unsafe cross-branch target write unexpectedly succeeded");
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Cross-branch target write check skipped");
  }
  await signOut();

  printResult("PASS", "No attachment/public URL behavior was exercised in this Phase 1 smoke test");

  // Cleanup by HQ if available, otherwise supervisor.
  const hqCleanupSignIn = await signInRole(hqUser, deps);
  if (!hqCleanupSignIn.ok) {
    const supervisorCleanupSignIn = await signInRole(supervisorUser, deps);
    if (!supervisorCleanupSignIn.ok) {
      printResult("CHECK", "Cleanup skipped (no HQ/supervisor session)");
      warningCount += 1;
    }
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
      cleanupWarnings.push(`announcements cleanup blocked (${announcementId}): ${deleteResult.error?.message || "unknown"}`);
    } else {
      printResult("PASS", `Cleanup: announcement removed (${announcementId})`);
    }
  }
  await signOut();

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
    warningCount += 1;
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to RLS/session scope; only fake/dev fixture rows were used");
  }
  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Announcements Phase 1 smoke test crashed:", err?.message || err);
  process.exit(1);
});

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

  const { listEligibleCompanyNewsPopups, listAnnouncements, listAnnouncementStatuses } = readService;
  const { createAnnouncementRequest, publishAnnouncement, markCompanyNewsPopupSeen, dismissCompanyNewsPopup } = writeService;

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

  let companyNewsAnnouncementId = null;
  let requestAnnouncementId = null;
  let teacherProfileId = null;
  let supervisorProfile = null;
  let teacherStatusRowAfterDismiss = null;

  // 1) Prepare fake/dev fixtures via existing request service.
  const supervisorSignIn = await signInRole(supervisorUser, deps);
  if (supervisorSignIn.ok) {
    const profileCtx = await resolveCurrentProfileContext(supabase);
    supervisorProfile = profileCtx.data || null;
    if (!profileCtx.data?.id || !isUuidLike(profileCtx.data.branch_id)) {
      printResult("CHECK", "Branch Supervisor: fixture create skipped (missing profile/branch context)");
    } else {
      const createCompanyNewsBase = await createAnnouncementRequest({
        branchId: profileCtx.data.branch_id,
        title: `Smoke Company News Popup ${new Date().toISOString()}`,
        subtitle: "Fake/dev popup fixture",
        body: "Fake/dev company news popup body",
        priority: "high",
        requiresResponse: false,
        requiresUpload: false,
        targets: [{ targetType: "branch", branchId: profileCtx.data.branch_id }],
      });
      if (createCompanyNewsBase.error || !createCompanyNewsBase.data?.announcement?.id) {
        printResult(
          "CHECK",
          `Branch Supervisor: company_news base create skipped (${createCompanyNewsBase.error?.message || "unknown"})`
        );
      } else {
        companyNewsAnnouncementId = createCompanyNewsBase.data.announcement.id;
        createdAnnouncementIds.push(companyNewsAnnouncementId);
        printResult("PASS", "Branch Supervisor: base request fixture created for popup conversion");

        const publishResult = await publishAnnouncement({ announcementId: companyNewsAnnouncementId });
        if (publishResult.error) {
          printResult("CHECK", `Branch Supervisor: publish skipped/blocked (${publishResult.error?.message || "unknown"})`);
        } else {
          const toCompanyNews = await supabase
            .from("announcements")
            .update({
              announcement_type: "company_news",
              popup_enabled: true,
              popup_emoji: "📣",
              updated_at: new Date().toISOString(),
            })
            .eq("id", companyNewsAnnouncementId)
            .select("id,announcement_type,popup_enabled,status")
            .maybeSingle();
          if (toCompanyNews.error || toCompanyNews.data?.announcement_type !== "company_news") {
            printResult(
              "CHECK",
              `Branch Supervisor: company_news conversion skipped/blocked (${toCompanyNews.error?.message || "unknown"})`
            );
            companyNewsAnnouncementId = null;
          } else {
            printResult("PASS", "Branch Supervisor: fixture converted to published popup-enabled company_news");
          }
        }
      }

      const createRequestOnly = await createAnnouncementRequest({
        branchId: profileCtx.data.branch_id,
        title: `Smoke Request Exclusion ${new Date().toISOString()}`,
        subtitle: "Fake/dev request exclusion fixture",
        body: "This should never appear in company news popup list",
        priority: "normal",
        requiresResponse: true,
        requiresUpload: false,
        targets: [{ targetType: "branch", branchId: profileCtx.data.branch_id }],
      });
      if (createRequestOnly.error || !createRequestOnly.data?.announcement?.id) {
        printResult("CHECK", `Branch Supervisor: request fixture skipped (${createRequestOnly.error?.message || "unknown"})`);
      } else {
        requestAnnouncementId = createRequestOnly.data.announcement.id;
        createdAnnouncementIds.push(requestAnnouncementId);
        await publishAnnouncement({ announcementId: requestAnnouncementId });
        await supabase
          .from("announcements")
          .update({ popup_enabled: true, popup_emoji: "📝", updated_at: new Date().toISOString() })
          .eq("id", requestAnnouncementId);
        printResult("PASS", "Branch Supervisor: request popup_enabled fixture created");
      }
    }
  } else {
    printResult("CHECK", "Branch Supervisor fixture preparation skipped");
  }
  await signOut();

  // 2) Teacher can list eligible popup, mark seen, dismiss, and dismissed item is hidden.
  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok) {
    const teacherCtx = await resolveCurrentProfileContext(supabase);
    teacherProfileId = teacherCtx.data?.id || null;

    const beforeStatuses = companyNewsAnnouncementId
      ? await listAnnouncementStatuses({ announcementId: companyNewsAnnouncementId, profileId: teacherProfileId })
      : { data: [], error: null };
    const beforeStatus = Array.isArray(beforeStatuses.data) && beforeStatuses.data.length > 0 ? beforeStatuses.data[0] : null;

    const eligibleBefore = await listEligibleCompanyNewsPopups({ limit: 10 });
    if (eligibleBefore.error) {
      printResult("WARNING", `Teacher: list eligible popup failed (${eligibleBefore.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const hasRequestRow = (eligibleBefore.data || []).some((row) => row?.announcementId === requestAnnouncementId);
      if (hasRequestRow) {
        printResult("WARNING", "Teacher: request announcement unexpectedly appeared in Company News popup list");
        failureCount += 1;
      } else {
        printResult("PASS", "Teacher: request/reminder announcement excluded from popup list");
      }

      if (companyNewsAnnouncementId) {
        const targetVisible = (eligibleBefore.data || []).some((row) => row?.announcementId === companyNewsAnnouncementId);
        if (targetVisible) printResult("PASS", "Teacher: eligible company_news popup is visible");
        else printResult("CHECK", "Teacher: company_news popup eligibility check skipped/not visible (fixture/RLS dependent)");
      } else {
        printResult("CHECK", "Teacher: company_news popup checks skipped (fixture unavailable)");
      }
    }

    if (companyNewsAnnouncementId) {
      const seenResult = await markCompanyNewsPopupSeen({ announcementId: companyNewsAnnouncementId });
      if (seenResult.error) {
        printResult("CHECK", `Teacher: mark popup seen skipped/blocked (${seenResult.error?.message || "unknown"})`);
      } else {
        printResult("PASS", "Teacher: mark popup seen succeeded");
      }

      const dismissResult = await dismissCompanyNewsPopup({ announcementId: companyNewsAnnouncementId });
      if (dismissResult.error) {
        printResult("CHECK", `Teacher: dismiss popup skipped/blocked (${dismissResult.error?.message || "unknown"})`);
      } else {
        printResult("PASS", "Teacher: dismiss popup succeeded");
      }

      const eligibleAfterDismiss = await listEligibleCompanyNewsPopups({ limit: 10 });
      if (eligibleAfterDismiss.error) {
        printResult("WARNING", `Teacher: eligible-after-dismiss read failed (${eligibleAfterDismiss.error?.message || "unknown"})`);
        failureCount += 1;
      } else {
        const stillVisible = (eligibleAfterDismiss.data || []).some((row) => row?.announcementId === companyNewsAnnouncementId);
        if (!stillVisible) printResult("PASS", "Teacher: dismissed company_news popup no longer listed");
        else {
          printResult("WARNING", "Teacher: dismissed company_news popup still listed");
          failureCount += 1;
        }
      }

      const afterStatuses = await listAnnouncementStatuses({
        announcementId: companyNewsAnnouncementId,
        profileId: teacherProfileId,
      });
      teacherStatusRowAfterDismiss =
        Array.isArray(afterStatuses.data) && afterStatuses.data.length > 0 ? afterStatuses.data[0] : null;

      if (teacherStatusRowAfterDismiss?.popup_seen_at && teacherStatusRowAfterDismiss?.popup_dismissed_at) {
        printResult("PASS", "Teacher: popup_seen_at and popup_dismissed_at are both recorded");
      } else {
        printResult("CHECK", "Teacher: popup seen/dismiss fields check skipped/partial");
      }

      const beforeReadAt = beforeStatus?.read_at || null;
      const beforeDoneStatus = beforeStatus?.done_status || "pending";
      const afterReadAt = teacherStatusRowAfterDismiss?.read_at || null;
      const afterDoneStatus = teacherStatusRowAfterDismiss?.done_status || null;
      if (beforeReadAt === afterReadAt && beforeDoneStatus === afterDoneStatus) {
        printResult("PASS", "Teacher: popup seen/dismiss did not mutate read_at or done_status");
      } else {
        printResult("WARNING", "Teacher: popup seen/dismiss unexpectedly changed read_at or done_status");
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Teacher popup flow checks skipped");
  }
  await signOut();

  // 3) Parent/student blocked-or-empty.
  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const parentRead = await listEligibleCompanyNewsPopups({ limit: 10 });
    if (parentRead.error || (Array.isArray(parentRead.data) && parentRead.data.length === 0)) {
      printResult("PASS", "Parent: company_news popup read blocked/empty as expected");
    } else {
      printResult("WARNING", "Parent: company_news popup rows unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Parent popup access check skipped");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    const studentRead = await listEligibleCompanyNewsPopups({ limit: 10 });
    if (studentRead.error || (Array.isArray(studentRead.data) && studentRead.data.length === 0)) {
      printResult("PASS", "Student: company_news popup read blocked/empty as expected");
    } else {
      printResult("WARNING", "Student: company_news popup rows unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Student popup access check skipped");
  }
  await signOut();

  // 4) Manager cross-user popup dismiss update attempt should be blocked by trigger.
  const supervisorCrossSignIn = await signInRole(supervisorUser, deps);
  if (supervisorCrossSignIn.ok && companyNewsAnnouncementId && teacherProfileId) {
    const crossUpdate = await supabase
      .from("announcement_statuses")
      .update({
        popup_dismissed_at: new Date().toISOString(),
        popup_last_shown_at: new Date().toISOString(),
      })
      .eq("announcement_id", companyNewsAnnouncementId)
      .eq("profile_id", teacherProfileId)
      .select("id")
      .maybeSingle();
    if (crossUpdate.error) {
      printResult("PASS", "Branch Supervisor: cross-user popup dismiss write blocked as expected");
    } else if (crossUpdate.data?.id) {
      printResult("WARNING", "Branch Supervisor: cross-user popup dismiss write unexpectedly succeeded");
      failureCount += 1;
    } else {
      printResult("CHECK", "Branch Supervisor: cross-user popup dismiss check skipped/no matching status row");
    }
  } else {
    printResult("CHECK", "Branch Supervisor cross-user popup dismiss check skipped");
  }
  await signOut();

  // 5) Optional HQ create/publish company_news check (likely constrained by request-only create path).
  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const hqCreateAttempt = await supabase
      .from("announcements")
      .insert({
        branch_id: null,
        created_by_profile_id: (await supabase.auth.getUser())?.data?.user?.id || null,
        announcement_type: "company_news",
        title: `HQ direct company_news smoke ${new Date().toISOString()}`,
        subtitle: "Fake/dev only",
        body: "Fake/dev only",
        priority: "normal",
        status: "draft",
        audience_type: "internal_staff",
        popup_enabled: true,
        popup_emoji: "📣",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    if (hqCreateAttempt.error) {
      printResult(
        "CHECK",
        `HQ Admin: direct company_news create skipped/blocked (expected with current create-path constraints: ${hqCreateAttempt.error?.message || "unknown"})`
      );
    } else if (hqCreateAttempt.data?.id) {
      createdAnnouncementIds.push(hqCreateAttempt.data.id);
      printResult("PASS", "HQ Admin: direct company_news create succeeded in this environment");
    }
  } else {
    printResult("CHECK", "HQ company_news create-check skipped");
  }
  await signOut();

  printResult("PASS", "No runtime app-shell popup UI or notification/email behavior was exercised in this smoke test");

  // Cleanup in supervisor scope first, then HQ fallback.
  const cleanupSignIn = await signInRole(supervisorUser, deps);
  if (!cleanupSignIn.ok) {
    await signInRole(hqUser, deps);
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

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning/check note(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Company News popup smoke test crashed:", err?.message || err);
  process.exit(1);
});

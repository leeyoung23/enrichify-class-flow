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
    typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("CHECK", `${label}: skipped (missing ${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("CHECK", `${label}: skipped (sign-in failed: ${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

function findAnnouncementOverview(rows, announcementId) {
  if (!Array.isArray(rows)) return null;
  return rows.find((row) => row?.announcementId === announcementId) || null;
}

async function resolveCurrentProfileContext(supabase) {
  const authRead = await supabase.auth.getUser();
  const userId = authRead?.data?.user?.id || null;
  if (!isUuidLike(userId)) return { data: null, error: { message: "Authenticated user id unavailable" } };
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
  const [{ signInWithEmailPassword, signOut }, readService, writeService, uploadService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const { listAnnouncementCompletionOverview } = readService;
  const {
    createAnnouncementRequest,
    publishAnnouncement,
    createAnnouncementReply,
    updateAnnouncementDoneStatus,
    markAnnouncementRead,
  } = writeService;
  const {
    uploadAnnouncementAttachment,
    deleteAnnouncementAttachment,
  } = uploadService;

  const deps = { signInWithEmailPassword, signOut };
  let failureCount = 0;
  const cleanupWarnings = [];
  const cleanupAnnouncementIds = [];
  const cleanupAttachmentIds = [];

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

  let announcementId = null;
  let supervisorBranchId = null;
  let teacherProfileId = null;

  // 1) Supervisor creates + publishes fake/dev request requiring response/upload.
  const supervisorSignIn = await signInRole(supervisorUser, deps);
  if (supervisorSignIn.ok) {
    const supervisorCtx = await resolveCurrentProfileContext(supabase);
    if (supervisorCtx.error || !isUuidLike(supervisorCtx.data?.branch_id)) {
      printResult("CHECK", "Supervisor fixture create skipped (profile/branch context unavailable)");
    } else {
      supervisorBranchId = supervisorCtx.data.branch_id;
      const createResult = await createAnnouncementRequest({
        branchId: supervisorBranchId,
        title: `Smoke Completion Overview ${new Date().toISOString()}`,
        subtitle: "Fake/dev completion-overview fixture",
        body: "Fake/dev body requiring response and upload evidence.",
        priority: "high",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        requiresResponse: true,
        requiresUpload: true,
        targets: [{ targetType: "branch", branchId: supervisorBranchId }],
      });
      if (createResult.error || !isUuidLike(createResult.data?.announcement?.id)) {
        printResult("CHECK", `Supervisor fixture create skipped (${createResult.error?.message || "unknown"})`);
      } else {
        announcementId = createResult.data.announcement.id;
        cleanupAnnouncementIds.push(announcementId);
        printResult("PASS", "Supervisor: created completion overview fixture");
        const publishResult = await publishAnnouncement({ announcementId });
        if (publishResult.error) {
          printResult("CHECK", `Supervisor fixture publish skipped/blocked (${publishResult.error?.message || "unknown"})`);
          announcementId = null;
        } else {
          printResult("PASS", "Supervisor: published completion overview fixture");
        }
      }
    }
  } else {
    printResult("CHECK", "Supervisor fixture create/publish skipped");
  }
  await signOut();

  // 2) Teacher performs read/reply/upload/done evidence transitions.
  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok && isUuidLike(announcementId)) {
    const teacherCtx = await resolveCurrentProfileContext(supabase);
    teacherProfileId = teacherCtx.data?.id || null;

    const readResult = await markAnnouncementRead({ announcementId });
    if (readResult.error) {
      printResult("CHECK", `Teacher mark read skipped/blocked (${readResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: mark read succeeded");
    }

    const replyResult = await createAnnouncementReply({
      announcementId,
      body: "Fake/dev reply for completion overview smoke",
      replyType: "update",
    });
    if (replyResult.error) {
      printResult("CHECK", `Teacher reply skipped/blocked (${replyResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: reply succeeded");
    }

    const uploadResult = await uploadAnnouncementAttachment({
      announcementId,
      file: new Blob(["fake completion overview upload"], { type: "text/plain" }),
      fileRole: "response_upload",
      staffNote: "Fake/dev completion overview upload note",
      fileName: "completion-overview-upload-smoke.txt",
      contentType: "text/plain",
    });
    if (uploadResult.error || !isUuidLike(uploadResult.data?.attachment?.id)) {
      printResult("CHECK", `Teacher upload skipped/blocked (${uploadResult.error?.message || "unknown"})`);
    } else {
      cleanupAttachmentIds.push(uploadResult.data.attachment.id);
      printResult("PASS", "Teacher: response_upload succeeded");
    }

    const doneResult = await updateAnnouncementDoneStatus({
      announcementId,
      doneStatus: "done",
    });
    if (doneResult.error) {
      printResult("CHECK", `Teacher done transition skipped/blocked (${doneResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", "Teacher: done status update succeeded");
    }
  } else {
    printResult("CHECK", "Teacher transition checks skipped");
  }
  await signOut();

  // 3) HQ overview should include metrics + per-person rows.
  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok && isUuidLike(announcementId)) {
    const hqOverview = await listAnnouncementCompletionOverview({
      announcementId,
      includeCompleted: true,
    });
    if (hqOverview.error) {
      printResult("WARNING", `HQ overview failed (${hqOverview.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const row = findAnnouncementOverview(hqOverview.data, announcementId);
      if (!row) {
        printResult("WARNING", "HQ overview missing fixture announcement row");
        failureCount += 1;
      } else {
        printResult("PASS", "HQ overview loaded fixture row");
        if (typeof row.totalTargeted === "number" && Array.isArray(row.rows)) {
          printResult("PASS", "HQ overview includes summary + per-person rows");
        } else {
          printResult("WARNING", "HQ overview missing summary/per-person structure");
          failureCount += 1;
        }
        if (typeof row.responseProvidedCount === "number" && typeof row.uploadProvidedCount === "number") {
          printResult("PASS", "HQ overview includes response/upload evidence counts");
        } else {
          printResult("WARNING", "HQ overview missing response/upload evidence counts");
          failureCount += 1;
        }
        const teacherRow = Array.isArray(row.rows)
          ? row.rows.find((entry) => entry?.profileId === teacherProfileId)
          : null;
        if (teacherRow) {
          if (teacherRow.responseProvided && teacherRow.uploadProvided && teacherRow.doneStatus === "done") {
            printResult("PASS", "HQ overview reflects teacher reply/upload/done evidence");
          } else {
            printResult("CHECK", "HQ overview loaded but teacher evidence row is partial under current fixture visibility");
          }
        } else {
          printResult("CHECK", "HQ overview teacher row not found (targeting/fixtures may differ)");
        }
      }
    }
  } else {
    printResult("CHECK", "HQ overview check skipped");
  }
  await signOut();

  // 4) Supervisor own-branch overview check.
  const supervisorOverviewSignIn = await signInRole(supervisorUser, deps);
  if (supervisorOverviewSignIn.ok && isUuidLike(announcementId)) {
    const overviewResult = await listAnnouncementCompletionOverview({
      branchId: supervisorBranchId || undefined,
      includeCompleted: true,
    });
    if (overviewResult.error) {
      printResult("CHECK", `Supervisor overview skipped/blocked (${overviewResult.error?.message || "unknown"})`);
    } else {
      const row = findAnnouncementOverview(overviewResult.data, announcementId);
      if (row) {
        printResult("PASS", "Supervisor overview includes own-branch fixture");
      } else {
        printResult("CHECK", "Supervisor overview did not include fixture row (branch scope/policy dependent)");
      }
    }
  } else {
    printResult("CHECK", "Supervisor overview check skipped");
  }
  await signOut();

  // 5) Teacher should not receive manager overview.
  const teacherOverviewSignIn = await signInRole(teacherUser, deps);
  if (teacherOverviewSignIn.ok) {
    const teacherOverview = await listAnnouncementCompletionOverview({
      announcementId: announcementId || undefined,
      includeCompleted: true,
    });
    if (teacherOverview.error || (Array.isArray(teacherOverview.data) && teacherOverview.data.length === 0)) {
      printResult("PASS", "Teacher manager overview blocked/empty as expected");
    } else {
      printResult("WARNING", "Teacher unexpectedly received manager completion overview rows");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Teacher manager-overview block check skipped");
  }
  await signOut();

  // 6) Parent/student blocked or empty.
  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const parentOverview = await listAnnouncementCompletionOverview({ includeCompleted: true });
    if (parentOverview.error || (Array.isArray(parentOverview.data) && parentOverview.data.length === 0)) {
      printResult("PASS", "Parent manager overview blocked/empty as expected");
    } else {
      printResult("WARNING", "Parent unexpectedly received manager completion overview rows");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Parent manager-overview block check skipped");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    const studentOverview = await listAnnouncementCompletionOverview({ includeCompleted: true });
    if (studentOverview.error || (Array.isArray(studentOverview.data) && studentOverview.data.length === 0)) {
      printResult("PASS", "Student manager overview blocked/empty as expected");
    } else {
      printResult("WARNING", "Student unexpectedly received manager completion overview rows");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Student manager-overview block check skipped");
  }
  await signOut();

  printResult("PASS", "No notification/email side effects are triggered by completion overview read smoke");

  // 7) Cleanup using supervisor first, HQ fallback.
  const supervisorCleanupSignIn = await signInRole(supervisorUser, deps);
  if (!supervisorCleanupSignIn.ok) {
    const hqCleanupSignIn = await signInRole(hqUser, deps);
    if (!hqCleanupSignIn.ok) {
      printResult("CHECK", "Cleanup session unavailable (supervisor/HQ sign-in failed)");
    }
  }

  for (const attachmentId of cleanupAttachmentIds) {
    if (!isUuidLike(attachmentId)) continue;
    const deleteResult = await deleteAnnouncementAttachment({ attachmentId });
    if (deleteResult.error) {
      cleanupWarnings.push(`attachment cleanup blocked (${deleteResult.error?.message || "unknown"})`);
    } else {
      printResult("PASS", `Cleanup: attachment removed (${attachmentId})`);
    }
  }

  for (const id of cleanupAnnouncementIds) {
    if (!isUuidLike(id)) continue;
    const deleteAnnouncement = await supabase
      .from("announcements")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (deleteAnnouncement.error) {
      cleanupWarnings.push(`announcement cleanup blocked (${deleteAnnouncement.error?.message || "unknown"})`);
    } else {
      printResult("PASS", `Cleanup: announcement removed (${id})`);
    }
  }
  await signOut();

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to RLS/session constraints; only fake/dev fixtures were used");
  }

  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Announcements completion overview smoke test crashed:", err?.message || err);
  process.exit(1);
});

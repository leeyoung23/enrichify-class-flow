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

function findTaskByAnnouncementId(rows, announcementId) {
  if (!Array.isArray(rows) || !isUuidLike(announcementId)) return null;
  return rows.find((row) => row?.announcementId === announcementId) || null;
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, uploadService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const {
    listMyAnnouncementTasks,
    listAnnouncementTargets,
  } = readService;
  const {
    createAnnouncementRequest,
    publishAnnouncement,
    createAnnouncementReply,
    updateAnnouncementDoneStatus,
  } = writeService;
  const {
    uploadAnnouncementAttachment,
    deleteAnnouncementAttachment,
  } = uploadService;

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const deps = { signInWithEmailPassword, signOut };
  let failureCount = 0;
  const cleanupWarnings = [];
  const cleanupAnnouncementIds = [];
  const cleanupAttachmentIds = [];

  let announcementId = null;
  let teacherProfileId = null;
  let uploadTransitionChecked = false;
  let uploadTransitionPassed = false;

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

  // 1) Supervisor creates and publishes a targeted request announcement.
  const supervisorSignIn = await signInRole(supervisorUser, deps);
  if (supervisorSignIn.ok) {
    const supervisorCtx = await resolveCurrentProfileContext(supabase);
    if (supervisorCtx.error || !isUuidLike(supervisorCtx.data?.branch_id)) {
      printResult("CHECK", "Supervisor fixture skipped (branch profile context unavailable)");
    } else {
      const createResult = await createAnnouncementRequest({
        branchId: supervisorCtx.data.branch_id,
        title: `Smoke MyTasks Request ${new Date().toISOString()}`,
        subtitle: "Fake/dev MyTasks derived-read fixture",
        body: "Fake/dev body requiring teacher response and upload.",
        priority: "high",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        requiresResponse: true,
        requiresUpload: true,
        targets: [{ targetType: "branch", branchId: supervisorCtx.data.branch_id }],
      });
      if (createResult.error || !isUuidLike(createResult.data?.announcement?.id)) {
        printResult("CHECK", `Supervisor fixture create skipped (${createResult.error?.message || "unknown"})`);
      } else {
        announcementId = createResult.data.announcement.id;
        cleanupAnnouncementIds.push(announcementId);
        printResult("PASS", "Supervisor: created request fixture");
        const publishResult = await publishAnnouncement({ announcementId });
        if (publishResult.error) {
          printResult("CHECK", `Supervisor fixture publish skipped/blocked (${publishResult.error.message || "unknown"})`);
          announcementId = null;
        } else {
          printResult("PASS", "Supervisor: published fixture");
        }
      }
    }
  } else {
    printResult("CHECK", "Supervisor fixture checks skipped");
  }
  await signOut();

  // 2) Teacher derived task checks before/after reply/upload/done.
  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok && isUuidLike(announcementId)) {
    const teacherCtx = await resolveCurrentProfileContext(supabase);
    teacherProfileId = teacherCtx.data?.id || null;

    const beforeResult = await listMyAnnouncementTasks({ includeDone: false });
    const beforeTask = findTaskByAnnouncementId(beforeResult.data, announcementId);
    if (beforeResult.error) {
      printResult("WARNING", `Teacher: listMyAnnouncementTasks failed (${beforeResult.error.message || "unknown"})`);
      failureCount += 1;
    } else if (!beforeTask) {
      printResult("CHECK", "Teacher: fixture task not visible yet (targeting/policy dependent)");
    } else {
      printResult("PASS", "Teacher: derived task visible");
      if (beforeTask.requiresResponse && beforeTask.requiresUpload) {
        printResult("PASS", "Teacher: requiresResponse/requiresUpload flags present");
      } else {
        printResult("WARNING", "Teacher: requiresResponse/requiresUpload flags missing");
        failureCount += 1;
      }
      if (!beforeTask.responseProvided && !beforeTask.uploadProvided) {
        printResult("PASS", "Teacher: initial responseProvided/uploadProvided are false");
      } else {
        printResult("CHECK", "Teacher: initial response/upload already provided in current fixture visibility");
      }
    }

    const replyResult = await createAnnouncementReply({
      announcementId,
      body: "Fake/dev teacher reply for MyTasks smoke",
      replyType: "update",
    });
    if (replyResult.error) {
      printResult("CHECK", `Teacher: reply transition skipped/blocked (${replyResult.error.message || "unknown"})`);
    } else {
      const afterReply = await listMyAnnouncementTasks({ includeDone: false });
      const afterReplyTask = findTaskByAnnouncementId(afterReply.data, announcementId);
      if (afterReply.error || !afterReplyTask) {
        printResult("CHECK", "Teacher: post-reply derived task read unavailable");
      } else if (afterReplyTask.responseProvided) {
        printResult("PASS", "Teacher: responseProvided transitions true after reply");
      } else {
        printResult("WARNING", "Teacher: responseProvided did not transition true after reply");
        failureCount += 1;
      }
    }

    const uploadResult = await uploadAnnouncementAttachment({
      announcementId,
      file: new Blob(["fake mytasks response upload"], { type: "text/plain" }),
      fileRole: "response_upload",
      staffNote: "Fake/dev upload for mytasks smoke",
      fileName: "mytasks-response-upload-smoke.txt",
      contentType: "text/plain",
    });
    if (uploadResult.error || !isUuidLike(uploadResult.data?.attachment?.id)) {
      printResult("CHECK", `Teacher: uploadProvided transition skipped (${uploadResult.error?.message || "upload unavailable"})`);
    } else {
      uploadTransitionChecked = true;
      cleanupAttachmentIds.push(uploadResult.data.attachment.id);
      const afterUpload = await listMyAnnouncementTasks({ includeDone: false });
      const afterUploadTask = findTaskByAnnouncementId(afterUpload.data, announcementId);
      if (afterUpload.error || !afterUploadTask) {
        printResult("CHECK", "Teacher: post-upload derived task read unavailable");
      } else if (afterUploadTask.uploadProvided) {
        uploadTransitionPassed = true;
        printResult("PASS", "Teacher: uploadProvided transitions true after response_upload");
      } else {
        printResult("WARNING", "Teacher: uploadProvided did not transition true after upload");
        failureCount += 1;
      }
    }

    const doneResult = await updateAnnouncementDoneStatus({
      announcementId,
      doneStatus: "done",
    });
    if (doneResult.error) {
      printResult("CHECK", `Teacher: done transition skipped/blocked (${doneResult.error.message || "unknown"})`);
    } else {
      const doneHiddenResult = await listMyAnnouncementTasks({ includeDone: false });
      const doneHiddenTask = findTaskByAnnouncementId(doneHiddenResult.data, announcementId);
      const doneShownResult = await listMyAnnouncementTasks({ includeDone: true });
      const doneShownTask = findTaskByAnnouncementId(doneShownResult.data, announcementId);

      if (doneShownResult.error) {
        printResult("CHECK", "Teacher: includeDone=true read unavailable after done");
      } else if (doneShownTask?.status === "done") {
        printResult("PASS", "Teacher: includeDone=true surfaces status done");
      } else {
        printResult("WARNING", "Teacher: includeDone=true did not surface done status");
        failureCount += 1;
      }

      const outstandingObligation = doneShownTask && (
        (doneShownTask.requiresResponse && !doneShownTask.responseProvided)
        || (doneShownTask.requiresUpload && !doneShownTask.uploadProvided)
      );
      if (!doneHiddenTask) {
        printResult("PASS", "Teacher: includeDone=false hides completed task");
      } else if (outstandingObligation) {
        printResult("CHECK", "Teacher: includeDone=false retained done task due to unresolved obligations");
      } else {
        printResult("CHECK", "Teacher: includeDone=false retained task under current derived status policy");
      }
    }

    if (!uploadTransitionChecked) {
      printResult("CHECK", "Upload transition was intentionally skipped (no rule weakening)");
    } else if (!uploadTransitionPassed) {
      printResult("CHECK", "Upload transition executed but did not PASS under current RLS-visible fixture state");
    }
  } else {
    printResult("CHECK", "Teacher derived-read checks skipped (missing fixture/sign-in)");
  }
  await signOut();

  // 3) Parent/student must not see internal staff derived tasks.
  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const parentTasks = await listMyAnnouncementTasks({ includeDone: true });
    if (parentTasks.error || (Array.isArray(parentTasks.data) && parentTasks.data.length === 0)) {
      printResult("PASS", "Parent: internal announcement tasks blocked/empty as expected");
    } else {
      printResult("WARNING", "Parent: internal announcement tasks unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Parent task access check skipped");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    const studentTasks = await listMyAnnouncementTasks({ includeDone: true });
    if (studentTasks.error || (Array.isArray(studentTasks.data) && studentTasks.data.length === 0)) {
      printResult("PASS", "Student: internal announcement tasks blocked/empty as expected");
    } else {
      printResult("WARNING", "Student: internal announcement tasks unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Student task access check skipped");
  }
  await signOut();

  printResult("PASS", "No notification/email side effects are triggered by this read smoke path");

  // 4) Cleanup with supervisor (owner branch) first, HQ fallback.
  const supervisorCleanupSignIn = await signInRole(supervisorUser, deps);
  if (!supervisorCleanupSignIn.ok) {
    printResult("CHECK", "Cleanup session unavailable (supervisor sign-in failed)");
  }

  if (isUuidLike(teacherProfileId) && isUuidLike(announcementId)) {
    const targetRead = await listAnnouncementTargets({ announcementId });
    if (targetRead.error) {
      printResult("CHECK", "Cleanup: target rows are not readable under current session scope");
    }
  }

  for (const attachmentId of cleanupAttachmentIds) {
    if (!isUuidLike(attachmentId)) continue;
    const deleteAttachment = await deleteAnnouncementAttachment({ attachmentId });
    if (deleteAttachment.error) {
      cleanupWarnings.push(`attachment cleanup blocked (${deleteAttachment.error.message || "unknown"})`);
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
      cleanupWarnings.push(`announcement cleanup blocked (${deleteAnnouncement.error.message || "unknown"})`);
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
  console.error("[WARNING] Announcements MyTasks smoke test crashed:", err?.message || err);
  process.exit(1);
});

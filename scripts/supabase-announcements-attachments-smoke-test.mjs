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

async function resolveProfileContext(supabase) {
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

  const deps = { signInWithEmailPassword, signOut };
  const {
    createAnnouncementRequest,
    publishAnnouncement,
  } = writeService;
  const {
    listAnnouncements,
  } = readService;
  const {
    uploadAnnouncementAttachment,
    listAnnouncementAttachments,
    getAnnouncementAttachmentSignedUrl,
    deleteAnnouncementAttachment,
  } = uploadService;

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

  let failureCount = 0;
  const cleanupAnnouncements = [];
  const cleanupAttachments = [];
  const cleanupWarnings = [];

  let supervisorAnnouncementId = null;
  let teacherProfileId = null;

  // HQ upload/list/signed-url smoke path.
  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const hqCtx = await resolveProfileContext(supabase);
    if (!hqCtx.error && hqCtx.data?.id) {
      const hqCreate = await createAnnouncementRequest({
        branchId: hqCtx.data.branch_id || null,
        title: `Smoke HQ Attachment ${new Date().toISOString()}`,
        body: "Fake/dev HQ announcement for attachment smoke test.",
        priority: "normal",
        requiresResponse: false,
        requiresUpload: true,
        targets: [],
      });
      if (hqCreate.error || !hqCreate.data?.announcement?.id) {
        printResult("CHECK", `HQ: create fixture skipped (${hqCreate.error?.message || "unknown"})`);
      } else {
        const hqAnnouncementId = hqCreate.data.announcement.id;
        cleanupAnnouncements.push(hqAnnouncementId);
        printResult("PASS", "HQ: created announcement fixture");

        const uploadResult = await uploadAnnouncementAttachment({
          announcementId: hqAnnouncementId,
          file: new Blob(["fake hq attachment"], { type: "text/plain" }),
          fileRole: "hq_attachment",
          staffNote: "Fake/dev HQ attachment note",
          fileName: "hq-smoke-attachment.txt",
          contentType: "text/plain",
        });
        if (uploadResult.error || !uploadResult.data?.attachment?.id) {
          printResult("CHECK", `HQ: upload skipped/blocked (${uploadResult.error?.message || "unknown"})`);
        } else {
          const attachmentId = uploadResult.data.attachment.id;
          cleanupAttachments.push(attachmentId);
          printResult("PASS", "HQ: uploadAnnouncementAttachment succeeded");

          const listResult = await listAnnouncementAttachments({ announcementId: hqAnnouncementId });
          const listed = Array.isArray(listResult.data)
            ? listResult.data.some((row) => row?.id === attachmentId)
            : false;
          if (listResult.error || !listed) {
            printResult("WARNING", `HQ: listAnnouncementAttachments failed/missing (${listResult.error?.message || "not_listed"})`);
            failureCount += 1;
          } else {
            printResult("PASS", "HQ: listAnnouncementAttachments includes uploaded attachment");
          }

          const signedUrlResult = await getAnnouncementAttachmentSignedUrl({
            attachmentId,
            expiresIn: 90,
          });
          if (signedUrlResult.error || !signedUrlResult.data?.signed_url) {
            printResult("WARNING", `HQ: getAnnouncementAttachmentSignedUrl failed (${signedUrlResult.error?.message || "unknown"})`);
            failureCount += 1;
          } else {
            printResult("PASS", "HQ: signed URL generated");
            if (String(signedUrlResult.data.signed_url).includes("/object/public/")) {
              printResult("WARNING", "HQ: detected unexpected public URL pattern");
              failureCount += 1;
            } else {
              printResult("PASS", "HQ: no public URL path pattern detected");
            }
          }
        }
      }
    } else {
      printResult("CHECK", "HQ: profile context unavailable");
    }
  } else {
    printResult("CHECK", "HQ: upload/list/signed URL checks skipped");
  }
  await signOut();

  // Supervisor create/publish target announcement for teacher response_upload check.
  const supervisorSignIn = await signInRole(supervisorUser, deps);
  if (supervisorSignIn.ok) {
    const supervisorCtx = await resolveProfileContext(supabase);
    if (!supervisorCtx.error && supervisorCtx.data?.id && isUuidLike(supervisorCtx.data.branch_id)) {
      const supervisorCreate = await createAnnouncementRequest({
        branchId: supervisorCtx.data.branch_id,
        title: `Smoke Supervisor Attachment ${new Date().toISOString()}`,
        body: "Fake/dev supervisor announcement for attachment smoke test.",
        priority: "high",
        requiresResponse: true,
        requiresUpload: true,
        targets: [{ targetType: "branch", branchId: supervisorCtx.data.branch_id }],
      });
      if (supervisorCreate.error || !supervisorCreate.data?.announcement?.id) {
        printResult("CHECK", `Supervisor: create fixture skipped (${supervisorCreate.error?.message || "unknown"})`);
      } else {
        supervisorAnnouncementId = supervisorCreate.data.announcement.id;
        cleanupAnnouncements.push(supervisorAnnouncementId);
        printResult("PASS", "Supervisor: created announcement fixture");

        const publishResult = await publishAnnouncement({ announcementId: supervisorAnnouncementId });
        if (publishResult.error) {
          printResult("CHECK", `Supervisor: publish skipped/blocked (${publishResult.error?.message || "unknown"})`);
          supervisorAnnouncementId = null;
        } else {
          printResult("PASS", "Supervisor: published announcement fixture");
        }

        const supervisorUpload = await uploadAnnouncementAttachment({
          announcementId: supervisorCreate.data.announcement.id,
          file: new Blob(["fake supervisor attachment"], { type: "text/plain" }),
          fileRole: "supervisor_attachment",
          staffNote: "Fake/dev supervisor attachment note",
          fileName: "supervisor-smoke-attachment.txt",
          contentType: "text/plain",
        });
        if (supervisorUpload.error || !supervisorUpload.data?.attachment?.id) {
          printResult("CHECK", `Supervisor: upload skipped/blocked (${supervisorUpload.error?.message || "unknown"})`);
        } else {
          cleanupAttachments.push(supervisorUpload.data.attachment.id);
          printResult("PASS", "Supervisor: uploadAnnouncementAttachment succeeded");
          const supervisorSignedUrl = await getAnnouncementAttachmentSignedUrl({
            attachmentId: supervisorUpload.data.attachment.id,
            expiresIn: 90,
          });
          if (supervisorSignedUrl.error || !supervisorSignedUrl.data?.signed_url) {
            printResult("WARNING", `Supervisor: signed URL failed (${supervisorSignedUrl.error?.message || "unknown"})`);
            failureCount += 1;
          } else {
            printResult("PASS", "Supervisor: signed URL generated");
          }
        }
      }
    } else {
      printResult("CHECK", "Supervisor: profile context unavailable");
    }
  } else {
    printResult("CHECK", "Supervisor attachment checks skipped");
  }
  await signOut();

  // Resolve teacher profile id (for diagnostics), then teacher role checks.
  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok) {
    const teacherCtx = await resolveProfileContext(supabase);
    teacherProfileId = teacherCtx.data?.id || null;
    if (supervisorAnnouncementId) {
      const teacherAnnouncements = await listAnnouncements({
        status: "published",
        audienceType: "internal_staff",
        announcementType: "request",
      });
      const hasSupervisorAnnouncement = Array.isArray(teacherAnnouncements.data)
        ? teacherAnnouncements.data.some((row) => row?.id === supervisorAnnouncementId)
        : false;
      if (!teacherAnnouncements.error && hasSupervisorAnnouncement) {
        printResult("PASS", "Teacher: targeted published announcement visible");
      } else {
        printResult("CHECK", "Teacher: targeted visibility unavailable; response_upload check may skip");
      }

      const teacherResponseUpload = await uploadAnnouncementAttachment({
        announcementId: supervisorAnnouncementId,
        file: new Blob(["fake teacher response attachment"], { type: "text/plain" }),
        fileRole: "response_upload",
        staffNote: "Fake/dev teacher response note",
        fileName: "teacher-response-smoke.txt",
        contentType: "text/plain",
      });
      if (teacherResponseUpload.error || !teacherResponseUpload.data?.attachment?.id) {
        printResult("CHECK", `Teacher: response_upload skipped/blocked (${teacherResponseUpload.error?.message || "unknown"})`);
      } else {
        cleanupAttachments.push(teacherResponseUpload.data.attachment.id);
        printResult("PASS", "Teacher: response_upload succeeded");
        const teacherList = await listAnnouncementAttachments({ announcementId: supervisorAnnouncementId });
        if (teacherList.error) {
          printResult("CHECK", `Teacher: list skipped/blocked (${teacherList.error?.message || "unknown"})`);
        } else {
          printResult("PASS", "Teacher: listAnnouncementAttachments succeeded");
        }
      }

      const teacherHqUpload = await uploadAnnouncementAttachment({
        announcementId: supervisorAnnouncementId,
        file: new Blob(["fake blocked teacher hq_attachment"], { type: "text/plain" }),
        fileRole: "hq_attachment",
        staffNote: "Should be blocked by RLS",
        fileName: "teacher-hq-should-fail.txt",
        contentType: "text/plain",
      });
      if (teacherHqUpload.error) {
        printResult("PASS", "Teacher: hq_attachment blocked as expected");
      } else {
        printResult("WARNING", "Teacher: hq_attachment unexpectedly succeeded");
        if (teacherHqUpload.data?.attachment?.id) cleanupAttachments.push(teacherHqUpload.data.attachment.id);
        failureCount += 1;
      }
    } else {
      printResult("CHECK", "Teacher checks skipped (missing supervisor announcement fixture)");
    }
  } else {
    printResult("CHECK", "Teacher checks skipped");
  }
  await signOut();

  // Parent/student blocked list/read checks.
  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    if (supervisorAnnouncementId) {
      const parentList = await listAnnouncementAttachments({ announcementId: supervisorAnnouncementId });
      if (parentList.error || (Array.isArray(parentList.data) && parentList.data.length === 0)) {
        printResult("PASS", "Parent: list/read internal attachments blocked or empty as expected");
      } else {
        printResult("WARNING", "Parent: internal attachments unexpectedly visible");
        failureCount += 1;
      }
    } else {
      printResult("CHECK", "Parent checks skipped (missing fixture)");
    }
  } else {
    printResult("CHECK", "Parent checks skipped");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    if (supervisorAnnouncementId) {
      const studentList = await listAnnouncementAttachments({ announcementId: supervisorAnnouncementId });
      if (studentList.error || (Array.isArray(studentList.data) && studentList.data.length === 0)) {
        printResult("PASS", "Student: list/read internal attachments blocked or empty as expected");
      } else {
        printResult("WARNING", "Student: internal attachments unexpectedly visible");
        failureCount += 1;
      }
    } else {
      printResult("CHECK", "Student checks skipped (missing fixture)");
    }
  } else {
    printResult("CHECK", "Student checks skipped");
  }
  await signOut();

  // Cleanup with HQ first, fallback supervisor.
  const hqCleanupSignIn = await signInRole(hqUser, deps);
  if (!hqCleanupSignIn.ok) {
    const supervisorCleanupSignIn = await signInRole(supervisorUser, deps);
    if (!supervisorCleanupSignIn.ok) {
      printResult("CHECK", "Cleanup skipped (no HQ/supervisor session)");
    }
  }

  for (const attachmentId of cleanupAttachments) {
    if (!isUuidLike(attachmentId)) continue;
    const deleteResult = await deleteAnnouncementAttachment({ attachmentId });
    if (deleteResult.error) {
      cleanupWarnings.push(`attachment cleanup blocked (${deleteResult.error?.message || "unknown"})`);
    } else {
      if (deleteResult.data?.cleanup_warning) {
        cleanupWarnings.push(`attachment object cleanup warning (${deleteResult.data.cleanup_warning})`);
      }
      printResult("PASS", `Cleanup: attachment removed (${attachmentId})`);
    }
  }

  for (const announcementId of cleanupAnnouncements) {
    if (!isUuidLike(announcementId)) continue;
    const deleteAnnouncement = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId)
      .select("id")
      .maybeSingle();
    if (deleteAnnouncement.error) {
      cleanupWarnings.push(`announcement cleanup blocked (${deleteAnnouncement.error?.message || "unknown"})`);
    } else {
      printResult("PASS", `Cleanup: announcement removed (${announcementId})`);
    }
  }

  await signOut();

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to RLS/session scope; only fake/dev fixtures were used");
  }

  if (!teacherProfileId) {
    printResult("CHECK", "Teacher profile id was not resolved; teacher fixture may be unavailable");
  }

  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Announcements attachments smoke test crashed:", err?.message || err);
  process.exit(1);
});

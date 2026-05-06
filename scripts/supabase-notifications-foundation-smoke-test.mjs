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

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("WARNING", `${label}: missing password (${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("WARNING", `${label}: sign-in failed (${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);
  const { listMyInAppNotifications } = readService;
  const { createNotificationEvent, createInAppNotification, markNotificationRead } = writeService;

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const teacherUser = {
    label: "Teacher",
    email: process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };

  let failureCount = 0;
  let warningCount = 0;
  let createdEventId = null;
  let parentNotificationId = null;
  let teacherNotificationId = null;
  let createdDeliveryLogId = null;
  let parentProfileId = null;
  let parentRole = "parent";
  let parentStudentId = null;
  let parentBranchId = null;
  let parentClassId = null;

  const hqSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) process.exit(1);

  const parentProfileLookup = await supabase
    .from("profiles")
    .select("id,role,linked_student_id,branch_id")
    .eq("email", parentUser.email)
    .maybeSingle();
  if (parentProfileLookup.error || !parentProfileLookup.data?.id) {
    printResult("WARNING", `HQ Admin: unable to resolve parent profile (${parentProfileLookup.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    parentProfileId = parentProfileLookup.data.id;
    parentRole = parentProfileLookup.data.role || "parent";
    parentStudentId = parentProfileLookup.data.linked_student_id || null;
  }

  if (parentStudentId) {
    const studentLookup = await supabase
      .from("students")
      .select("id,branch_id,class_id")
      .eq("id", parentStudentId)
      .maybeSingle();
    if (!studentLookup.error && studentLookup.data?.id) {
      parentBranchId = studentLookup.data.branch_id || null;
      parentClassId = studentLookup.data.class_id || null;
    }
  }

  const hqAuthRead = await supabase.auth.getUser();
  const hqProfileId = hqAuthRead?.data?.user?.id || null;
  if (!hqProfileId) {
    printResult("WARNING", "HQ Admin: unable to resolve authenticated profile id");
    failureCount += 1;
  }

  if (hqProfileId) {
    const teacherSelfNotification = await createInAppNotification({
      recipientProfileId: hqProfileId,
      recipientRole: "hq_admin",
      title: "Smoke self notification",
      body: "notification foundation self-read check",
      status: "pending",
    });
    if (teacherSelfNotification.error || !teacherSelfNotification.data?.id) {
      printResult("WARNING", `HQ Admin: failed to create self notification (${teacherSelfNotification.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      teacherNotificationId = teacherSelfNotification.data.id;
      printResult("PASS", "HQ Admin: created in-app notification row");
    }
  }

  if (parentProfileId) {
    const createEvent = await createNotificationEvent({
      eventType: "smoke.notification.parent_ready",
      entityType: "smoke_check",
      entityId: null,
      branchId: parentBranchId,
      classId: parentClassId,
      studentId: parentStudentId,
      status: "pending",
      metadata: {
        source: "supabase-notifications-foundation-smoke-test",
        kind: "parent-read-check",
      },
    });
    if (createEvent.error || !createEvent.data?.id) {
      printResult("WARNING", `HQ Admin: event create failed (${createEvent.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      createdEventId = createEvent.data.id;
      printResult("PASS", `HQ Admin: created notification event ${createdEventId}`);
    }
  }

  if (parentProfileId && createdEventId) {
    const createParentNotification = await createInAppNotification({
      eventId: createdEventId,
      recipientProfileId: parentProfileId,
      recipientRole: parentRole,
      branchId: parentBranchId,
      classId: parentClassId,
      studentId: parentStudentId,
      title: "Smoke notification for parent",
      body: "Safe in-app notification body for read access check.",
      status: "pending",
    });
    if (createParentNotification.error || !createParentNotification.data?.id) {
      printResult(
        "WARNING",
        `HQ Admin: failed to create parent notification (${createParentNotification.error?.message || "unknown"})`
      );
      failureCount += 1;
    } else {
      parentNotificationId = createParentNotification.data.id;
      printResult("PASS", `HQ Admin: created parent in-app notification ${parentNotificationId}`);
    }
  }

  if (parentNotificationId) {
    const deliveryLogCreate = await supabase
      .from("notification_delivery_logs")
      .insert({
        notification_id: parentNotificationId,
        channel: "in_app",
        status: "queued",
        attempt_number: 1,
      })
      .select("id")
      .maybeSingle();
    if (deliveryLogCreate.error || !deliveryLogCreate.data?.id) {
      printResult("WARNING", `HQ Admin: failed to insert delivery log (${deliveryLogCreate.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      createdDeliveryLogId = deliveryLogCreate.data.id;
      printResult("PASS", "HQ Admin: inserted delivery log row");
    }
  }

  await signOut();

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    failureCount += 1;
  } else if (!parentNotificationId) {
    printResult("CHECK", "Parent: skipped own-read check (missing parent notification fixture)");
    failureCount += 1;
  } else {
    const parentRead = await supabase
      .from("notifications")
      .select("id,recipient_profile_id,status,read_at")
      .eq("id", parentNotificationId)
      .maybeSingle();
    if (parentRead.error || !parentRead.data?.id) {
      printResult("WARNING", `Parent: unable to read own notification (${parentRead.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: can read own in-app notification");
    }

    const markReadResult = await markNotificationRead({ notificationId: parentNotificationId });
    if (markReadResult.error || !markReadResult.data?.id || !markReadResult.data?.read_at) {
      printResult("WARNING", `Parent: mark read failed (${markReadResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: markNotificationRead succeeded");
    }

    const parentDeliveryLogRead = await supabase
      .from("notification_delivery_logs")
      .select("id")
      .eq("notification_id", parentNotificationId)
      .limit(1);
    if (parentDeliveryLogRead.error || (Array.isArray(parentDeliveryLogRead.data) && parentDeliveryLogRead.data.length === 0)) {
      printResult("PASS", "Parent: delivery logs not readable");
    } else {
      printResult("WARNING", "Parent: delivery logs unexpectedly readable");
      failureCount += 1;
    }

    const parentInboxResult = await listMyInAppNotifications({ limit: 20 });
    if (parentInboxResult.error) {
      printResult("CHECK", `Parent: action-target helper CHECK (${parentInboxResult.error.message || "unknown"})`);
    } else {
      const rows = Array.isArray(parentInboxResult.data) ? parentInboxResult.data : [];
      const ownRow = rows.find((row) => row?.id === parentNotificationId);
      if (ownRow && ownRow?.event_type === "smoke.notification.parent_ready" && ownRow?.entity_type === "smoke_check") {
        printResult("PASS", "Parent: own notification action-target fields available");
      } else {
        printResult("CHECK", "Parent: own action-target fields unavailable (migration 044 optional)");
      }
    }
  }
  await signOut();

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "Teacher: unavailable, cross-recipient check skipped");
  } else if (!parentNotificationId) {
    warningCount += 1;
    printResult("CHECK", "Teacher: skipped cross-recipient check (missing parent notification fixture)");
  } else {
    const teacherReadParentNotification = await supabase
      .from("notifications")
      .select("id")
      .eq("id", parentNotificationId)
      .maybeSingle();
    if (teacherReadParentNotification.error || !teacherReadParentNotification.data?.id) {
      printResult("PASS", "Teacher: unrelated notification hidden");
    } else {
      printResult("WARNING", "Teacher: unexpectedly read parent notification");
      failureCount += 1;
    }
  }
  await signOut();

  const hqCleanupSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqCleanupSignIn.ok) {
    warningCount += 1;
    printResult("CHECK", "HQ Admin: cleanup sign-in failed");
  } else {
    if (createdDeliveryLogId) {
      await supabase.from("notification_delivery_logs").delete().eq("id", createdDeliveryLogId);
    }
    if (teacherNotificationId) {
      await supabase.from("notifications").delete().eq("id", teacherNotificationId);
    }
    if (parentNotificationId) {
      await supabase.from("notifications").delete().eq("id", parentNotificationId);
    }
    if (createdEventId) {
      await supabase.from("notification_events").delete().eq("id", createdEventId);
    }
  }
  await signOut();

  if (failureCount > 0) {
    printResult("WARNING", `Notifications foundation smoke finished with ${failureCount} failing checks`);
    process.exit(1);
  }
  if (warningCount > 0) {
    printResult("CHECK", `Notifications foundation smoke finished with ${warningCount} warning/check items`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

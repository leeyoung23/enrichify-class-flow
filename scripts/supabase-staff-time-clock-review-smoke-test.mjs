import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

function print(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    print("WARNING", `${label}: missing password (${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false, skipped: true };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    print("WARNING", `${label}: sign-in failed (${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

async function run() {
  const [
    { signInWithEmailPassword, signOut },
    { supabase },
    {
      clockInStaff,
      clockOutStaff,
      listStaffTimeEntries,
      getStaffTimeEntryById,
      getStaffTimeSummary,
      getStaffTimeSelfieSignedUrl,
    },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseClient.js"),
    import("../src/services/staffTimeClockService.js"),
  ]);

  if (!supabase) {
    print("WARNING", "Supabase client is unavailable after env load");
    process.exit(1);
  }

  const teacherUser = {
    label: "Teacher",
    email: "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const supervisorUser = {
    label: "Branch Supervisor",
    email: "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
  };
  const hqUser = {
    label: "HQ Admin",
    email: "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
  const studentUser = {
    label: "Student",
    email: "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
  };

  let warningCount = 0;
  let failureCount = 0;
  let createdEntryId = null;
  let branchId = null;
  let branchName = null;
  let branchRadiusMeters = null;
  let inSelfiePath = null;
  let outSelfiePath = null;

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    process.exit(1);
  }

  const visibleBranch = await supabase
    .from("branches")
    .select("id,name,geofence_radius_meters")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (visibleBranch.error || !visibleBranch.data?.id) {
    print("WARNING", `Teacher: no visible branch (${visibleBranch.error?.message || "no row"})`);
    failureCount += 1;
  } else {
    branchId = visibleBranch.data.id;
    branchName = visibleBranch.data.name || visibleBranch.data.id;
    branchRadiusMeters = Number(visibleBranch.data.geofence_radius_meters) || 150;
    print("PASS", `Teacher: using branch ${branchName}`);
  }

  if (branchId) {
    const fakeInBlob = new Blob(["fake review smoke clock-in selfie"], { type: "image/jpeg" });
    const clockInResult = await clockInStaff({
      branchId,
      latitude: -33.865,
      longitude: 151.209,
      accuracyMeters: 8,
      distanceMeters: 120,
      radiusMeters: branchRadiusMeters,
      geofenceStatus: "valid",
      selfieFile: fakeInBlob,
      fileName: "fake-review-clock-in-selfie.jpg",
      contentType: "image/jpeg",
    });

    if (clockInResult.error || !clockInResult.data?.entry?.id) {
      print("WARNING", `Teacher: clock in create failed (${clockInResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      createdEntryId = clockInResult.data.entry.id;
      inSelfiePath = clockInResult.data.selfie_path || null;
      print("PASS", `Teacher: created review sample entry ${createdEntryId}`);
    }

    if (createdEntryId) {
      const fakeOutBlob = new Blob(["fake review smoke clock-out selfie"], { type: "image/jpeg" });
      const clockOutResult = await clockOutStaff({
        entryId: createdEntryId,
        latitude: -33.8651,
        longitude: 151.2091,
        accuracyMeters: 9,
        distanceMeters: 110,
        radiusMeters: branchRadiusMeters,
        geofenceStatus: "valid",
        selfieFile: fakeOutBlob,
        fileName: "fake-review-clock-out-selfie.jpg",
        contentType: "image/jpeg",
      });
      if (clockOutResult.error || !clockOutResult.data?.entry?.clock_out_at) {
        print("WARNING", `Teacher: clock out for review sample failed (${clockOutResult.error?.message || "unknown"})`);
        failureCount += 1;
      } else {
        outSelfiePath = clockOutResult.data.selfie_path || null;
        print("PASS", "Teacher: review sample entry closed");
      }
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) warningCount += 1;

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (supervisorSignIn.ok) {
    const supervisorList = await listStaffTimeEntries({ branchId, page: 1, pageSize: 20 });
    if (supervisorList.error) {
      print("WARNING", `Branch Supervisor: listStaffTimeEntries failed (${supervisorList.error.message || "unknown"})`);
      failureCount += 1;
    } else {
      const visible = (supervisorList.data || []).some((row) => row.id === createdEntryId);
      if (createdEntryId && visible) {
        print("PASS", "Branch Supervisor: list shows created entry for own branch");
      } else if (createdEntryId) {
        print("CHECK", "Branch Supervisor: list does not include created entry (possible branch mismatch)");
      }
    }

    if (createdEntryId) {
      const supervisorDetail = await getStaffTimeEntryById(createdEntryId);
      if (supervisorDetail.error) {
        print("CHECK", `Branch Supervisor: getStaffTimeEntryById blocked (${supervisorDetail.error.message || "unknown"})`);
      } else if (!supervisorDetail.data) {
        print("CHECK", "Branch Supervisor: detail not visible (possible branch mismatch)");
      } else {
        print("PASS", "Branch Supervisor: detail visible for created entry");
      }

      const inSigned = await getStaffTimeSelfieSignedUrl({ entryId: createdEntryId, clockType: "clock_in" });
      if (inSigned.error || !inSigned.data?.signed_url) {
        print("CHECK", `Branch Supervisor: clock-in selfie signed URL unavailable (${inSigned.error?.message || "unknown"})`);
      } else {
        print("PASS", "Branch Supervisor: clock-in selfie signed URL created");
      }
    }

    const supervisorSummary = await getStaffTimeSummary({
      branchId,
      dateRange: { startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) },
    });
    if (supervisorSummary.error || !supervisorSummary.data) {
      print("CHECK", `Branch Supervisor: summary unavailable (${supervisorSummary.error?.message || "unknown"})`);
    } else {
      print("PASS", "Branch Supervisor: summary read available");
    }

    const supervisorSignOut = await signOut();
    if (supervisorSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "Branch Supervisor: review visibility checks skipped (sign-in unavailable)");
    warningCount += 1;
  }

  const hqSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (hqSignIn.ok) {
    const hqList = await listStaffTimeEntries({ page: 1, pageSize: 20 });
    if (hqList.error) {
      print("WARNING", `HQ Admin: listStaffTimeEntries failed (${hqList.error.message || "unknown"})`);
      failureCount += 1;
    } else {
      print("PASS", `HQ Admin: listStaffTimeEntries returned ${hqList.data.length} row(s)`);
    }
    const hqSignOut = await signOut();
    if (hqSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "HQ Admin: skipped (sign-in unavailable)");
    warningCount += 1;
  }

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (parentSignIn.ok) {
    const parentList = await listStaffTimeEntries({ page: 1, pageSize: 10 });
    const parentDetail = createdEntryId ? await getStaffTimeEntryById(createdEntryId) : { data: null, error: null };
    if (parentList.error || (parentList.data || []).length === 0) {
      print("PASS", "Parent: blocked from review list");
    } else {
      print("WARNING", "Parent: unexpectedly has review list visibility");
      failureCount += 1;
    }
    if (parentDetail.error || !parentDetail.data) {
      print("PASS", "Parent: blocked from review detail");
    } else {
      print("WARNING", "Parent: unexpectedly has review detail visibility");
      failureCount += 1;
    }
    const parentSignOut = await signOut();
    if (parentSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "Parent: blocked checks skipped (sign-in unavailable)");
    warningCount += 1;
  }

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (studentSignIn.ok) {
    const studentList = await listStaffTimeEntries({ page: 1, pageSize: 10 });
    const studentDetail = createdEntryId ? await getStaffTimeEntryById(createdEntryId) : { data: null, error: null };
    if (studentList.error || (studentList.data || []).length === 0) {
      print("PASS", "Student: blocked from review list");
    } else {
      print("WARNING", "Student: unexpectedly has review list visibility");
      failureCount += 1;
    }
    if (studentDetail.error || !studentDetail.data) {
      print("PASS", "Student: blocked from review detail");
    } else {
      print("WARNING", "Student: unexpectedly has review detail visibility");
      failureCount += 1;
    }
    const studentSignOut = await signOut();
    if (studentSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "Student: blocked checks skipped (sign-in unavailable)");
    warningCount += 1;
  }

  const cleanupTeacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (cleanupTeacherSignIn.ok) {
    if (inSelfiePath || outSelfiePath) {
      const paths = [inSelfiePath, outSelfiePath].filter(Boolean);
      const removeResult = await supabase.storage.from("staff-clock-selfies").remove(paths);
      if (removeResult.error) {
        print("WARNING", `Cleanup: selfie object removal blocked or failed (${removeResult.error.message || "unknown"})`);
        warningCount += 1;
      } else {
        print("PASS", "Cleanup: fake selfie objects removed");
      }
    }
    if (createdEntryId) {
      const deleteResult = await supabase.from("staff_time_entries").delete().eq("id", createdEntryId);
      if (deleteResult.error) {
        print("WARNING", `Cleanup: fake entry delete blocked or failed (${deleteResult.error.message || "unknown"})`);
        warningCount += 1;
      } else {
        print("PASS", "Cleanup: fake review sample entry removed");
      }
    }
    const cleanupTeacherSignOut = await signOut();
    if (cleanupTeacherSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "Cleanup skipped (teacher sign-in unavailable)");
    warningCount += 1;
  }

  if (warningCount > 0) {
    print("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Staff time clock review smoke test crashed:", err?.message || err);
  process.exit(1);
});

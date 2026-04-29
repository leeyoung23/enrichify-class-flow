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
    { clockInStaff, clockOutStaff, getStaffTimeSelfieSignedUrl },
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
  const supervisorUser = {
    label: "Branch Supervisor",
    email: "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
  };

  let warningCount = 0;
  let failureCount = 0;
  let createdEntryId = null;
  let branchId = null;
  let inSelfiePath = null;
  let outSelfiePath = null;

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    process.exit(1);
  }

  // Best-effort pre-clean: close any lingering open entries from prior failed tests.
  const authUser = await supabase.auth.getUser();
  const teacherProfileId = authUser?.data?.user?.id || null;
  if (teacherProfileId) {
    const openEntries = await supabase
      .from("staff_time_entries")
      .select("id")
      .eq("profile_id", teacherProfileId)
      .is("clock_out_at", null)
      .limit(5);
    if (!openEntries.error && Array.isArray(openEntries.data) && openEntries.data.length > 0) {
      for (const row of openEntries.data) {
        const closeOld = await clockOutStaff({
          entryId: row.id,
          latitude: -33.8652,
          longitude: 151.2092,
          accuracyMeters: 12,
          distanceMeters: 100,
        });
        if (closeOld.error) {
          print("WARNING", `Teacher: unable to close prior open entry ${row.id} (${closeOld.error.message || "unknown"})`);
          warningCount += 1;
        } else {
          print("CHECK", `Teacher: closed prior open entry ${row.id} before test`);
        }
      }
    }
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
    print("PASS", `Teacher: using branch ${visibleBranch.data.name || branchId}`);
  }

  if (branchId) {
    const fakeInBlob = new Blob(["fake staff clock in selfie"], { type: "image/jpeg" });
    const clockInResult = await clockInStaff({
      branchId,
      latitude: -33.865,
      longitude: 151.209,
      accuracyMeters: 8,
      distanceMeters: 120,
      selfieFile: fakeInBlob,
      fileName: "fake-clock-in-selfie.jpg",
      contentType: "image/jpeg",
    });

    if (clockInResult.error || !clockInResult.data?.entry?.id) {
      print("WARNING", `Teacher: clock in failed (${clockInResult.error?.message || "unknown"})`);
      if (clockInResult.error?.cleanup_warning) {
        print("WARNING", `Teacher: clock in cleanup warning (${clockInResult.error.cleanup_warning})`);
      }
      failureCount += 1;
    } else {
      createdEntryId = clockInResult.data.entry.id;
      inSelfiePath = clockInResult.data.selfie_path || clockInResult.data.entry.clock_in_selfie_path || null;
      print("PASS", `Teacher: clock in created entry ${createdEntryId}`);
    }
  }

  if (createdEntryId) {
    const verifyEntry = await supabase
      .from("staff_time_entries")
      .select("id,profile_id,branch_id,clock_in_at,clock_in_latitude,clock_in_longitude,clock_in_accuracy_meters,clock_in_distance_meters,clock_in_selfie_path,status")
      .eq("id", createdEntryId)
      .maybeSingle();

    if (verifyEntry.error || !verifyEntry.data) {
      print("WARNING", `Teacher: clock-in entry verify failed (${verifyEntry.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      print("PASS", "Teacher: clock-in row fields visible");
      if (!verifyEntry.data.clock_in_selfie_path) {
        print("WARNING", "Teacher: clock-in selfie path missing");
        failureCount += 1;
      }
    }

    const inSignedUrl = await getStaffTimeSelfieSignedUrl({
      entryId: createdEntryId,
      clockType: "clock_in",
    });
    if (inSignedUrl.error || !inSignedUrl.data?.signed_url) {
      print("WARNING", `Teacher: clock-in selfie signed URL failed (${inSignedUrl.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      print("PASS", "Teacher: clock-in selfie signed URL created");
    }

    const fakeOutBlob = new Blob(["fake staff clock out selfie"], { type: "image/jpeg" });
    const clockOutResult = await clockOutStaff({
      entryId: createdEntryId,
      latitude: -33.8651,
      longitude: 151.2091,
      accuracyMeters: 9,
      distanceMeters: 110,
      selfieFile: fakeOutBlob,
      fileName: "fake-clock-out-selfie.jpg",
      contentType: "image/jpeg",
    });

    if (clockOutResult.error || !clockOutResult.data?.entry?.clock_out_at) {
      print("WARNING", `Teacher: clock out failed (${clockOutResult.error?.message || "unknown"})`);
      if (clockOutResult.error?.cleanup_warning) {
        print("WARNING", `Teacher: clock out cleanup warning (${clockOutResult.error.cleanup_warning})`);
      }
      failureCount += 1;
    } else {
      outSelfiePath = clockOutResult.data.selfie_path || clockOutResult.data.entry.clock_out_selfie_path || null;
      print("PASS", "Teacher: clock out fields set");
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    print("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (parentSignIn.ok) {
    const parentRead = await supabase.from("staff_time_entries").select("id").limit(1);
    if (parentRead.error) {
      print("PASS", `Parent: read blocked (${parentRead.error.message || "error"})`);
    } else if ((parentRead.data || []).length === 0) {
      print("PASS", "Parent: read blocked (0 rows)");
    } else {
      print("WARNING", "Parent: unexpectedly read staff_time_entries rows");
      failureCount += 1;
    }
    const parentSignOut = await signOut();
    if (parentSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "Parent: blocked-read check skipped (sign-in unavailable)");
    warningCount += 1;
  }

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (studentSignIn.ok) {
    const studentRead = await supabase.from("staff_time_entries").select("id").limit(1);
    if (studentRead.error) {
      print("PASS", `Student: read blocked (${studentRead.error.message || "error"})`);
    } else if ((studentRead.data || []).length === 0) {
      print("PASS", "Student: read blocked (0 rows)");
    } else {
      print("WARNING", "Student: unexpectedly read staff_time_entries rows");
      failureCount += 1;
    }
    const studentSignOut = await signOut();
    if (studentSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "Student: blocked-read check skipped (sign-in unavailable)");
    warningCount += 1;
  }

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (supervisorSignIn.ok) {
    if (createdEntryId) {
      const supervisorView = await supabase
        .from("staff_time_entries")
        .select("id,branch_id")
        .eq("id", createdEntryId)
        .maybeSingle();
      if (supervisorView.error) {
        print("CHECK", `Branch Supervisor: visibility blocked (${supervisorView.error.message || "unknown"})`);
      } else if (!supervisorView.data) {
        print("CHECK", "Branch Supervisor: no visibility for this entry (branch mismatch or policy scope)");
      } else {
        print("PASS", "Branch Supervisor: can view entry (branch scope matched)");
      }
    } else {
      print("CHECK", "Branch Supervisor: visibility check skipped (no created entry)");
    }
    const supervisorSignOut = await signOut();
    if (supervisorSignOut.error) warningCount += 1;
  } else {
    print("WARNING", "Branch Supervisor: visibility check skipped (sign-in unavailable)");
    warningCount += 1;
  }

  // Cleanup best effort as teacher (anon client + RLS only).
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
      const deleteResult = await supabase
        .from("staff_time_entries")
        .delete()
        .eq("id", createdEntryId);
      if (deleteResult.error) {
        print("WARNING", `Cleanup: staff_time_entries delete blocked or failed (${deleteResult.error.message || "unknown"})`);
        warningCount += 1;
      } else {
        print("PASS", "Cleanup: fake staff time entry removed");
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
  console.error("[WARNING] Staff time clock smoke test crashed:", err?.message || err);
  process.exit(1);
});


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
  const [
    { signInWithEmailPassword, signOut },
    { uploadClassMemory, getClassMemorySignedUrl, getClassMemoryById },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
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

  let failureCount = 0;
  let warningCount = 0;
  let createdMemoryId = null;
  let createdObjectPath = null;
  let targetClass = null;

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) process.exit(1);

  const { data: teacherAuthData } = await supabase.auth.getUser();
  const teacherAuthId = teacherAuthData?.user?.id || null;
  if (!teacherAuthId) {
    printResult("WARNING", "Teacher: unable to resolve auth user id");
    failureCount += 1;
  }

  const classLookup = await supabase
    .from("classes")
    .select("id,branch_id,name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (classLookup.error || !classLookup.data) {
    printResult("WARNING", `Teacher: could not resolve visible class (${classLookup.error?.message || "none"})`);
    failureCount += 1;
  } else {
    targetClass = classLookup.data;
    printResult("PASS", `Teacher: using class ${targetClass.name || targetClass.id}`);
  }

  if (targetClass) {
    const fakeImage = new Blob(
      [
        // tiny 1x1 png bytes (test-only blob payload)
        Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,2,0,0,0,144,119,83,222,0,0,0,12,73,68,65,84,8,153,99,248,15,4,0,9,251,3,253,160,219,106,202,0,0,0,0,73,69,78,68,174,66,96,130]),
      ],
      { type: "image/png" }
    );
    const uploadResult = await uploadClassMemory({
      branchId: targetClass.branch_id,
      classId: targetClass.id,
      title: "Smoke test memory",
      caption: "Fake class memory upload smoke test",
      file: fakeImage,
      fileName: "fake-class-memory.png",
      contentType: "image/png",
      submitForReview: true,
    });

    if (uploadResult.error || !uploadResult.data?.class_memory?.id) {
      printResult("WARNING", `Teacher: uploadClassMemory failed (${uploadResult.error?.message || "unknown"})`);
      if (uploadResult.error?.cleanup_warning) {
        printResult("WARNING", `Teacher: cleanup warning (${uploadResult.error.cleanup_warning})`);
      }
      failureCount += 1;
    } else {
      createdMemoryId = uploadResult.data.class_memory.id;
      createdObjectPath = uploadResult.data.storage_path;
      printResult("PASS", `Teacher: class memory created ${createdMemoryId}`);
    }
  }

  if (createdMemoryId) {
    const byIdResult = await getClassMemoryById(createdMemoryId);
    if (byIdResult.error || !byIdResult.data) {
      printResult("WARNING", `Teacher: getClassMemoryById failed (${byIdResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const row = byIdResult.data;
      const statusOk = row.visibility_status === "submitted";
      const bucketOk = row.storage_bucket === "class-memories";
      const visibleOk = row.visible_to_parents === false;
      const pathOk = Boolean(row.storage_path);
      const uploaderOk = !teacherAuthId || row.uploaded_by_profile_id === teacherAuthId;
      if (statusOk && bucketOk && visibleOk && pathOk && uploaderOk) {
        printResult("PASS", "Teacher: metadata row matches expected submitted + private values");
      } else {
        printResult("WARNING", "Teacher: metadata row does not match expected values");
        failureCount += 1;
      }
    }

    const signedUrlResult = await getClassMemorySignedUrl({ memoryId: createdMemoryId });
    if (signedUrlResult.error || !signedUrlResult.data?.signed_url) {
      printResult("WARNING", `Teacher: class memory signed URL failed (${signedUrlResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: class memory signed URL created");
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    warningCount += 1;
  } else if (!createdMemoryId) {
    printResult("CHECK", "Parent: skipped hidden check (no created memory id)");
  } else {
    const parentRead = await getClassMemoryById(createdMemoryId);
    if (!parentRead.error && parentRead.data) {
      printResult("WARNING", "Parent: draft/submitted class memory unexpectedly visible");
      failureCount += 1;
    } else {
      printResult("PASS", "Parent: draft/submitted class memory hidden");
    }
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentSignIn.ok) {
    warningCount += 1;
  } else if (!createdMemoryId) {
    printResult("CHECK", "Student: skipped hidden check (no created memory id)");
  } else {
    const studentRead = await getClassMemoryById(createdMemoryId);
    if (!studentRead.error && studentRead.data) {
      printResult("WARNING", "Student: draft/submitted class memory unexpectedly visible");
      failureCount += 1;
    } else {
      printResult("PASS", "Student: draft/submitted class memory hidden");
    }
  }
  await signOut();

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    warningCount += 1;
  } else if (!createdMemoryId) {
    printResult("CHECK", "Branch Supervisor: skipped visibility/cleanup checks (no created memory)");
  } else {
    const supervisorRead = await getClassMemoryById(createdMemoryId);
    if (supervisorRead.error || !supervisorRead.data) {
      printResult("WARNING", `Branch Supervisor: could not read class memory (${supervisorRead.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "Branch Supervisor: class memory visible by policy scope");
    }

    if (createdObjectPath) {
      const removeObj = await supabase.storage.from("class-memories").remove([createdObjectPath]);
      if (removeObj.error) {
        printResult("WARNING", `Branch Supervisor: object cleanup blocked (${removeObj.error.message || "unknown"})`);
        warningCount += 1;
      } else {
        printResult("PASS", "Branch Supervisor: fake image object cleaned up");
      }
    }

    const removeRow = await supabase
      .from("class_memories")
      .delete()
      .eq("id", createdMemoryId)
      .select("id")
      .maybeSingle();
    if (removeRow.error) {
      printResult("WARNING", `Branch Supervisor: row cleanup blocked (${removeRow.error.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "Branch Supervisor: fake class memory row cleaned up");
    }
  }
  await signOut();

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Class Memories upload smoke test crashed:", err?.message || err);
  process.exit(1);
});


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

function isBlocked(result) {
  return Boolean(result?.error) || !result?.data;
}

async function run() {
  const [
    { signInWithEmailPassword, signOut },
    { uploadClassMemory, getClassMemoryById, listClassMemories },
    { approveClassMemory, rejectClassMemory, hideClassMemory },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const teacherUser = { label: "Teacher", email: "teacher.demo@example.test", passwordVar: "RLS_TEST_TEACHER_PASSWORD" };
  const parentUser = { label: "Parent", email: "parent.demo@example.test", passwordVar: "RLS_TEST_PARENT_PASSWORD" };
  const studentUser = { label: "Student", email: "student.demo@example.test", passwordVar: "RLS_TEST_STUDENT_PASSWORD" };
  const supervisorUser = { label: "Branch Supervisor", email: "supervisor.demo@example.test", passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD" };

  let failureCount = 0;
  let warningCount = 0;
  let memoryOne = { id: null, path: null, classId: null, studentId: null };
  let memoryTwo = { id: null, path: null, classId: null, studentId: null };
  let targetClass = null;
  let targetStudent = null;

  const fakeImage = new Blob(
    [Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,2,0,0,0,144,119,83,222,0,0,0,12,73,68,65,84,8,153,99,248,15,4,0,9,251,3,253,160,219,106,202,0,0,0,0,73,69,78,68,174,66,96,130])],
    { type: "image/png" }
  );

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) process.exit(1);

  const classLookup = await supabase
    .from("classes")
    .select("id,branch_id,name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (classLookup.error || !classLookup.data) {
    printResult("WARNING", `Teacher: unable to resolve visible class (${classLookup.error?.message || "unknown"})`);
    failureCount += 1;
  } else {
    targetClass = classLookup.data;
    printResult("PASS", `Teacher: using class ${targetClass.name || targetClass.id}`);
  }

  if (targetClass) {
    const studentLookup = await supabase
      .from("students")
      .select("id,class_id,full_name")
      .eq("class_id", targetClass.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (studentLookup.error || !studentLookup.data) {
      printResult("CHECK", "Teacher: no linked student found for selected class; using class-wide memory scope");
    } else {
      targetStudent = studentLookup.data;
      printResult("PASS", `Teacher: using linked student ${targetStudent.full_name || targetStudent.id}`);
    }
  }

  if (targetClass) {
    const uploadOne = await uploadClassMemory({
      branchId: targetClass.branch_id,
      classId: targetClass.id,
      studentId: targetStudent?.id || null,
      title: "Approval smoke memory one",
      caption: "Fake submitted memory for approval flow",
      file: fakeImage,
      fileName: "approval-smoke-one.png",
      contentType: "image/png",
      submitForReview: true,
    });
    if (uploadOne.error || !uploadOne.data?.class_memory?.id) {
      printResult("WARNING", `Teacher: first upload failed (${uploadOne.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      memoryOne = {
        id: uploadOne.data.class_memory.id,
        path: uploadOne.data.storage_path,
        classId: uploadOne.data.class_memory.class_id,
        studentId: uploadOne.data.class_memory.student_id,
      };
      printResult("PASS", `Teacher: first submitted memory created ${memoryOne.id}`);
    }

    const uploadTwo = await uploadClassMemory({
      branchId: targetClass.branch_id,
      classId: targetClass.id,
      studentId: targetStudent?.id || null,
      title: "Approval smoke memory two",
      caption: "Fake submitted memory for reject flow",
      file: fakeImage,
      fileName: "approval-smoke-two.png",
      contentType: "image/png",
      submitForReview: true,
    });
    if (uploadTwo.error || !uploadTwo.data?.class_memory?.id) {
      printResult("WARNING", `Teacher: second upload failed (${uploadTwo.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      memoryTwo = {
        id: uploadTwo.data.class_memory.id,
        path: uploadTwo.data.storage_path,
        classId: uploadTwo.data.class_memory.class_id,
        studentId: uploadTwo.data.class_memory.student_id,
      };
      printResult("PASS", `Teacher: second submitted memory created ${memoryTwo.id}`);
    }
  }

  if (memoryOne.id) {
    const teacherRead = await getClassMemoryById(memoryOne.id);
    const row = teacherRead.data;
    if (
      teacherRead.error
      || !row
      || row.visibility_status !== "submitted"
      || row.visible_to_parents !== false
    ) {
      printResult("WARNING", "Teacher: submitted memory state check failed");
      failureCount += 1;
    } else {
      printResult("PASS", "Teacher: submitted memory exists and is not parent-visible");
    }
  } else {
    printResult("CHECK", "Teacher: skipping submitted state check (no created memory)");
  }

  if (memoryOne.id) {
    const teacherApprove = await approveClassMemory({ memoryId: memoryOne.id });
    if (isBlocked(teacherApprove)) {
      printResult("PASS", "Teacher: approve attempt blocked by policy");
    } else {
      printResult("WARNING", "Teacher: approve attempt unexpectedly succeeded");
      failureCount += 1;
    }
  }
  await signOut();

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    warningCount += 1;
  } else if (!memoryOne.id) {
    printResult("CHECK", "Parent: skipped submitted visibility + approve checks (no memory)");
  } else {
    const parentReadSubmitted = await getClassMemoryById(memoryOne.id);
    if (parentReadSubmitted.error || !parentReadSubmitted.data) {
      printResult("PASS", "Parent: submitted memory hidden");
    } else {
      printResult("WARNING", "Parent: submitted memory unexpectedly visible");
      failureCount += 1;
    }

    const parentApprove = await approveClassMemory({ memoryId: memoryOne.id });
    if (isBlocked(parentApprove)) {
      printResult("PASS", "Parent: approve attempt blocked by policy");
    } else {
      printResult("WARNING", "Parent: approve attempt unexpectedly succeeded");
      failureCount += 1;
    }
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentSignIn.ok) {
    warningCount += 1;
  } else if (!memoryOne.id) {
    printResult("CHECK", "Student: skipped submitted visibility + approve checks (no memory)");
  } else {
    const studentReadSubmitted = await getClassMemoryById(memoryOne.id);
    if (studentReadSubmitted.error || !studentReadSubmitted.data) {
      printResult("PASS", "Student: submitted memory hidden");
    } else {
      printResult("WARNING", "Student: submitted memory unexpectedly visible");
      failureCount += 1;
    }

    const studentApprove = await approveClassMemory({ memoryId: memoryOne.id });
    if (isBlocked(studentApprove)) {
      printResult("PASS", "Student: approve attempt blocked by policy");
    } else {
      printResult("WARNING", "Student: approve attempt unexpectedly succeeded");
      failureCount += 1;
    }
  }
  await signOut();

  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    warningCount += 1;
  } else if (!memoryOne.id) {
    printResult("CHECK", "Branch Supervisor: skipped approval/reject/hide checks (no memory)");
  } else {
    const approveResult = await approveClassMemory({ memoryId: memoryOne.id });
    if (approveResult.error || !approveResult.data) {
      printResult("WARNING", `Branch Supervisor: approve failed (${approveResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else {
      const approvedRow = approveResult.data;
      const approvedOk = (
        approvedRow.visibility_status === "approved"
        && approvedRow.visible_to_parents === true
        && Boolean(approvedRow.approved_by_profile_id)
        && Boolean(approvedRow.approved_at)
      );
      if (approvedOk) {
        printResult("PASS", "Branch Supervisor: approve updated expected fields");
      } else {
        printResult("WARNING", "Branch Supervisor: approve result missing expected fields");
        failureCount += 1;
      }
    }

    if (memoryTwo.id) {
      const rejectResult = await rejectClassMemory({ memoryId: memoryTwo.id, reason: "Smoke reject reason" });
      if (rejectResult.error || !rejectResult.data) {
        printResult("WARNING", `Branch Supervisor: reject failed (${rejectResult.error?.message || "unknown"})`);
        warningCount += 1;
      } else if (
        rejectResult.data.visibility_status === "rejected"
        && rejectResult.data.visible_to_parents === false
        && rejectResult.data.rejected_reason === "Smoke reject reason"
      ) {
        printResult("PASS", "Branch Supervisor: reject updated expected fields");
      } else {
        printResult("WARNING", "Branch Supervisor: reject result missing expected fields");
        warningCount += 1;
      }
    } else {
      printResult("CHECK", "Branch Supervisor: skipped reject flow (second memory not created)");
    }

    const hideResult = await hideClassMemory({ memoryId: memoryOne.id, reason: "Smoke hide reason" });
    if (hideResult.error || !hideResult.data) {
      printResult("WARNING", `Branch Supervisor: hide failed (${hideResult.error?.message || "unknown"})`);
      warningCount += 1;
    } else if (
      hideResult.data.visibility_status === "hidden"
      && hideResult.data.visible_to_parents === false
      && Boolean(hideResult.data.hidden_at)
    ) {
      printResult("PASS", "Branch Supervisor: hide updated expected fields");
    } else {
      printResult("WARNING", "Branch Supervisor: hide result missing expected fields");
      warningCount += 1;
    }
  }
  await signOut();

  const parentAfterSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentAfterSignIn.ok) {
    warningCount += 1;
  } else if (!memoryOne.id) {
    printResult("CHECK", "Parent: skipped approved/hidden visibility checks (no memory)");
  } else {
    const parentVisibleApproved = await listClassMemories({
      classId: memoryOne.classId,
      studentId: memoryOne.studentId || undefined,
      parentVisibleOnly: true,
    });
    if (parentVisibleApproved.error) {
      printResult("WARNING", `Parent: approved visibility query failed (${parentVisibleApproved.error.message || "unknown"})`);
      warningCount += 1;
    } else {
      const hasMemoryOne = (parentVisibleApproved.data || []).some((item) => item.id === memoryOne.id);
      if (hasMemoryOne) {
        printResult("WARNING", "Parent: hidden memory still appears as parent-visible");
        failureCount += 1;
      } else {
        printResult("PASS", "Parent: hidden memory is not parent-visible");
      }
    }
  }
  await signOut();

  const studentAfterSignIn = await signInRole(studentUser, { signInWithEmailPassword, signOut });
  if (!studentAfterSignIn.ok) {
    warningCount += 1;
  } else if (!memoryOne.id) {
    printResult("CHECK", "Student: skipped approved/hidden visibility checks (no memory)");
  } else {
    const studentVisibleApproved = await listClassMemories({
      classId: memoryOne.classId,
      studentId: memoryOne.studentId || undefined,
      parentVisibleOnly: true,
    });
    if (studentVisibleApproved.error) {
      printResult("WARNING", `Student: approved visibility query failed (${studentVisibleApproved.error.message || "unknown"})`);
      warningCount += 1;
    } else {
      const hasMemoryOne = (studentVisibleApproved.data || []).some((item) => item.id === memoryOne.id);
      if (hasMemoryOne) {
        printResult("WARNING", "Student: hidden memory still appears as parent-visible");
        failureCount += 1;
      } else {
        printResult("PASS", "Student: hidden memory is not student-visible after hide");
      }
    }
  }
  await signOut();

  const cleanupSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!cleanupSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: cleanup skipped due to sign-in failure");
    warningCount += 1;
  } else {
    for (const entry of [memoryOne, memoryTwo]) {
      if (!entry.id) continue;
      if (entry.path) {
        const removeObj = await supabase.storage.from("class-memories").remove([entry.path]);
        if (removeObj.error) {
          printResult("WARNING", `Branch Supervisor: object cleanup blocked for ${entry.id} (${removeObj.error.message || "unknown"})`);
          warningCount += 1;
        } else {
          printResult("PASS", `Branch Supervisor: object cleanup ok for ${entry.id}`);
        }
      }

      const removeRow = await supabase
        .from("class_memories")
        .delete()
        .eq("id", entry.id)
        .select("id")
        .maybeSingle();
      if (removeRow.error) {
        printResult("WARNING", `Branch Supervisor: row cleanup blocked for ${entry.id} (${removeRow.error.message || "unknown"})`);
        warningCount += 1;
      } else {
        printResult("PASS", `Branch Supervisor: row cleanup ok for ${entry.id}`);
      }
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
  console.error("[WARNING] Class Memories approval smoke test crashed:", err?.message || err);
  process.exit(1);
});

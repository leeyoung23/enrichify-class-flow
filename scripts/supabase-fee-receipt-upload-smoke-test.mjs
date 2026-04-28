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
    return { ok: false, skipped: true };
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
    { uploadFeeReceipt, getFeeReceiptSignedUrl },
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

  const parentUser = {
    label: "Parent",
    email: "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
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

  let failureCount = 0;
  let warningCount = 0;
  let targetFeeRecord = null;
  let uploadedPath = null;
  let originalMeta = null;

  const parentSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentSignIn.ok) {
    process.exit(1);
  }

  const { data: parentUserData } = await supabase.auth.getUser();
  const parentAuthId = parentUserData?.user?.id || null;
  if (!parentAuthId) {
    printResult("WARNING", "Parent: unable to resolve auth user id");
    failureCount += 1;
  }

  const feeQuery = await supabase
    .from("fee_records")
    .select("id,branch_id,student_id,receipt_file_path,receipt_storage_bucket,uploaded_by_profile_id,uploaded_at,verification_status")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (feeQuery.error || !feeQuery.data) {
    printResult("WARNING", `Parent: failed to find fee record (${feeQuery.error?.message || "no visible rows"})`);
    failureCount += 1;
  } else {
    targetFeeRecord = feeQuery.data;
    originalMeta = { ...feeQuery.data };
    printResult("PASS", `Parent: found fee record ${targetFeeRecord.id}`);
  }

  if (targetFeeRecord) {
    const blob = new Blob(["fake fee receipt upload smoke test"], { type: "text/plain" });
    const uploadResult = await uploadFeeReceipt({
      feeRecordId: targetFeeRecord.id,
      file: blob,
      fileName: "fake-receipt-smoke-test.txt",
      contentType: "text/plain",
    });

    if (uploadResult.error || !uploadResult.data) {
      printResult("WARNING", `Parent: upload failed (${uploadResult.error?.message || "unknown"})`);
      if (uploadResult.error?.cleanup_warning) {
        printResult("WARNING", `Parent: cleanup warning (${uploadResult.error.cleanup_warning})`);
      }
      failureCount += 1;
    } else {
      uploadedPath = uploadResult.data.storage_path;
      printResult("PASS", `Parent: uploaded fake receipt object ${uploadedPath}`);

      const updated = uploadResult.data.fee_record;
      if (updated.receipt_storage_bucket !== "fee-receipts" || updated.verification_status !== "submitted") {
        printResult("WARNING", "Parent: metadata did not match expected submitted fee-receipts values");
        failureCount += 1;
      } else {
        printResult("PASS", "Parent: fee metadata updated to fee-receipts + submitted");
      }

      if (parentAuthId && updated.uploaded_by_profile_id !== parentAuthId) {
        printResult("WARNING", "Parent: uploaded_by_profile_id did not match current parent auth id");
        failureCount += 1;
      } else {
        printResult("PASS", "Parent: uploaded_by_profile_id matched current parent auth id");
      }
    }
  }

  if (targetFeeRecord) {
    const signedUrlResult = await getFeeReceiptSignedUrl({ feeRecordId: targetFeeRecord.id });
    if (signedUrlResult.error || !signedUrlResult.data?.signed_url) {
      printResult("WARNING", `Parent: signed URL retrieval failed (${signedUrlResult.error?.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "Parent: signed URL retrieval succeeded");
    }
  }

  const parentSignOut = await signOut();
  if (parentSignOut.error) {
    printResult("WARNING", `Parent: sign-out warning (${parentSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    failureCount += 1;
  } else if (!targetFeeRecord) {
    printResult("CHECK", "Teacher: skipped block check (no target fee record)");
  } else {
    const teacherBlob = new Blob(["fake teacher upload should fail"], { type: "text/plain" });
    const teacherAttempt = await uploadFeeReceipt({
      feeRecordId: targetFeeRecord.id,
      file: teacherBlob,
      fileName: "teacher-should-fail.txt",
      contentType: "text/plain",
    });

    if (teacherAttempt.error || !teacherAttempt.data) {
      printResult("PASS", `Teacher: upload blocked (${teacherAttempt.error?.message || "no visible row/update"})`);
    } else {
      printResult("WARNING", "Teacher: upload unexpectedly succeeded");
      failureCount += 1;
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  // Cleanup/revert attempt via supervisor because parent trigger can block metadata revert.
  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: cleanup skipped (unable to sign in)");
    warningCount += 1;
  } else if (!targetFeeRecord || !originalMeta) {
    printResult("CHECK", "Branch Supervisor: cleanup skipped (missing target/original metadata)");
  } else {
    const revertPayload = {
      receipt_file_path: originalMeta.receipt_file_path,
      receipt_storage_bucket: originalMeta.receipt_storage_bucket || "fee-receipts",
      uploaded_by_profile_id: originalMeta.uploaded_by_profile_id,
      uploaded_at: originalMeta.uploaded_at,
      verification_status: originalMeta.verification_status,
      updated_at: new Date().toISOString(),
    };

    const revertResult = await supabase
      .from("fee_records")
      .update(revertPayload)
      .eq("id", targetFeeRecord.id)
      .select("id")
      .maybeSingle();

    if (revertResult.error) {
      printResult("WARNING", `Branch Supervisor: metadata revert failed (${revertResult.error.message || "unknown"})`);
      warningCount += 1;
    } else {
      printResult("PASS", "Branch Supervisor: fee record metadata reverted to original values");
    }

    if (uploadedPath) {
      const removeResult = await supabase.storage.from("fee-receipts").remove([uploadedPath]);
      if (removeResult.error) {
        printResult("WARNING", `Branch Supervisor: uploaded object cleanup failed (${removeResult.error.message || "unknown"})`);
        warningCount += 1;
      } else {
        printResult("PASS", "Branch Supervisor: uploaded fake object cleaned up");
      }
    }
  }

  const supervisorSignOut = await signOut();
  if (supervisorSignOut.error) {
    printResult("WARNING", `Branch Supervisor: sign-out warning (${supervisorSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Fee receipt upload smoke test crashed:", err?.message || err);
  process.exit(1);
});

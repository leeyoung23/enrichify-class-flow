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
    { uploadFeeReceipt },
    { verifyFeeReceipt, rejectFeeReceipt },
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
  const hqUser = {
    label: "HQ Admin",
    email: "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
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

  const feeQuery = await supabase
    .from("fee_records")
    .select("id,branch_id,student_id,receipt_file_path,receipt_storage_bucket,uploaded_by_profile_id,uploaded_at,verification_status,verified_by_profile_id,verified_at,internal_note")
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
    const blob = new Blob(["fake fee receipt verification smoke test"], { type: "text/plain" });
    const uploadResult = await uploadFeeReceipt({
      feeRecordId: targetFeeRecord.id,
      file: blob,
      fileName: "fake-receipt-verification-smoke-test.txt",
      contentType: "text/plain",
    });

    if (uploadResult.error || !uploadResult.data) {
      printResult("WARNING", `Parent: fake receipt upload failed (${uploadResult.error?.message || "unknown"})`);
      if (uploadResult.error?.cleanup_warning) {
        printResult("WARNING", `Parent: upload cleanup warning (${uploadResult.error.cleanup_warning})`);
      }
      failureCount += 1;
    } else {
      uploadedPath = uploadResult.data.storage_path;
      printResult("PASS", `Parent: uploaded fake receipt object ${uploadedPath}`);
    }
  }

  const parentSignOut = await signOut();
  if (parentSignOut.error) {
    printResult("WARNING", `Parent: sign-out warning (${parentSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  let supervisorVerified = false;
  const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
  if (!supervisorSignIn.ok) {
    printResult("WARNING", "Branch Supervisor: verify step skipped (unable to sign in)");
    failureCount += 1;
  } else if (!targetFeeRecord) {
    printResult("CHECK", "Branch Supervisor: verify step skipped (no target fee record)");
  } else {
    const verifyResult = await verifyFeeReceipt({
      feeRecordId: targetFeeRecord.id,
      internalNote: "Smoke test verify by branch supervisor",
    });

    if (verifyResult.error || !verifyResult.data) {
      printResult("WARNING", `Branch Supervisor: verify failed (${verifyResult.error?.message || "unknown"})`);
      failureCount += 1;
    } else if (
      verifyResult.data.verification_status !== "verified"
      || !verifyResult.data.verified_by_profile_id
      || !verifyResult.data.verified_at
    ) {
      printResult("WARNING", "Branch Supervisor: verify response missing expected verified fields");
      failureCount += 1;
    } else {
      supervisorVerified = true;
      printResult("PASS", "Branch Supervisor: verification_status set to verified with verifier/timestamp");
    }
  }

  const supervisorSignOut = await signOut();
  if (supervisorSignOut.error) {
    printResult("WARNING", `Branch Supervisor: sign-out warning (${supervisorSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const parentRecheckSignIn = await signInRole(parentUser, { signInWithEmailPassword, signOut });
  if (!parentRecheckSignIn.ok) {
    printResult("WARNING", "Parent: verified visibility check skipped (unable to sign in)");
    warningCount += 1;
  } else if (!targetFeeRecord) {
    printResult("CHECK", "Parent: verified visibility check skipped (no target fee record)");
  } else {
    const parentView = await supabase
      .from("fee_records")
      .select("id,verification_status,verified_by_profile_id,verified_at")
      .eq("id", targetFeeRecord.id)
      .maybeSingle();

    if (parentView.error) {
      printResult("WARNING", `Parent: verify visibility query failed (${parentView.error.message || "unknown"})`);
      warningCount += 1;
    } else if (!parentView.data) {
      printResult("CHECK", "Parent: verified row not visible under current RLS policy");
    } else if (parentView.data.verification_status === "verified") {
      printResult("PASS", "Parent: verified status visible");
    } else {
      printResult("WARNING", `Parent: visible row status was ${parentView.data.verification_status || "unknown"}`);
      warningCount += 1;
    }
  }

  const parentRecheckSignOut = await signOut();
  if (parentRecheckSignOut.error) {
    printResult("WARNING", `Parent: sign-out warning (${parentRecheckSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  const teacherSignIn = await signInRole(teacherUser, { signInWithEmailPassword, signOut });
  if (!teacherSignIn.ok) {
    printResult("WARNING", "Teacher: blocked checks skipped (unable to sign in)");
    warningCount += 1;
  } else if (!targetFeeRecord) {
    printResult("CHECK", "Teacher: blocked checks skipped (no target fee record)");
  } else {
    const teacherVerify = await verifyFeeReceipt({
      feeRecordId: targetFeeRecord.id,
      internalNote: "Teacher should not verify",
    });
    if (teacherVerify.error || !teacherVerify.data) {
      printResult("PASS", `Teacher: verify blocked (${teacherVerify.error?.message || "no visible updated row"})`);
    } else {
      printResult("WARNING", "Teacher: verify unexpectedly succeeded");
      failureCount += 1;
    }

    const teacherReject = await rejectFeeReceipt({
      feeRecordId: targetFeeRecord.id,
      internalNote: "Teacher should not reject",
    });
    if (teacherReject.error || !teacherReject.data) {
      printResult("PASS", `Teacher: reject blocked (${teacherReject.error?.message || "no visible updated row"})`);
    } else {
      printResult("WARNING", "Teacher: reject unexpectedly succeeded");
      failureCount += 1;
    }
  }

  const teacherSignOut = await signOut();
  if (teacherSignOut.error) {
    printResult("WARNING", `Teacher: sign-out warning (${teacherSignOut.error.message || "unknown"})`);
    warningCount += 1;
  }

  // Cleanup (prefer branch supervisor, fallback to HQ if supervisor cleanup fails).
  let cleanupDone = false;
  const cleanupWithRole = async (roleUser, roleLabel) => {
    const roleSignIn = await signInRole(roleUser, { signInWithEmailPassword, signOut });
    if (!roleSignIn.ok) {
      printResult("WARNING", `${roleLabel}: cleanup sign-in failed`);
      warningCount += 1;
      return false;
    }

    if (!targetFeeRecord || !originalMeta) {
      printResult("CHECK", `${roleLabel}: cleanup skipped (missing target/original metadata)`);
      await signOut();
      return false;
    }

    const revertPayload = {
      receipt_file_path: originalMeta.receipt_file_path,
      receipt_storage_bucket: originalMeta.receipt_storage_bucket || "fee-receipts",
      uploaded_by_profile_id: originalMeta.uploaded_by_profile_id,
      uploaded_at: originalMeta.uploaded_at,
      verification_status: originalMeta.verification_status,
      verified_by_profile_id: originalMeta.verified_by_profile_id,
      verified_at: originalMeta.verified_at,
      internal_note: originalMeta.internal_note,
      updated_at: new Date().toISOString(),
    };

    const revertResult = await supabase
      .from("fee_records")
      .update(revertPayload)
      .eq("id", targetFeeRecord.id)
      .select("id")
      .maybeSingle();

    if (revertResult.error) {
      printResult("WARNING", `${roleLabel}: metadata revert failed (${revertResult.error.message || "unknown"})`);
      warningCount += 1;
      await signOut();
      return false;
    }
    printResult("PASS", `${roleLabel}: fee record metadata reverted`);

    if (uploadedPath) {
      const removeResult = await supabase.storage.from("fee-receipts").remove([uploadedPath]);
      if (removeResult.error) {
        printResult("WARNING", `${roleLabel}: uploaded object cleanup failed (${removeResult.error.message || "unknown"})`);
        warningCount += 1;
      } else {
        printResult("PASS", `${roleLabel}: fake uploaded object cleaned up`);
      }
    }

    const roleSignOut = await signOut();
    if (roleSignOut.error) {
      printResult("WARNING", `${roleLabel}: sign-out warning (${roleSignOut.error.message || "unknown"})`);
      warningCount += 1;
    }
    return true;
  };

  cleanupDone = await cleanupWithRole(supervisorUser, "Branch Supervisor");
  if (!cleanupDone) {
    cleanupDone = await cleanupWithRole(hqUser, "HQ Admin");
  }
  if (!cleanupDone) {
    printResult("WARNING", "Cleanup not completed safely without elevated key. Fake path left as unique test artifact.");
    warningCount += 1;
  }

  if (!supervisorVerified) {
    failureCount += 1;
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Fee receipt verification smoke test crashed:", err?.message || err);
  process.exit(1);
});

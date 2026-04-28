import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const FEE_RECEIPTS_BUCKET = "fee-receipts";

function sanitizeFileName(fileName = "") {
  const fallback = "receipt.txt";
  const value = String(fileName || "").trim() || fallback;
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildObjectPath({ branchId, studentId, feeRecordId, fileName }) {
  const safeName = sanitizeFileName(fileName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${branchId}/${studentId}/${feeRecordId}/${timestamp}-${safeName}`;
}

export async function uploadFeeReceipt({ feeRecordId, file, fileName, contentType } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!feeRecordId || typeof feeRecordId !== "string") {
    return { data: null, error: { message: "feeRecordId is required" } };
  }
  if (!file) {
    return { data: null, error: { message: "file is required" } };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      return { data: null, error: { message: authError?.message || "Authenticated user is required" } };
    }
    const authUserId = authData.user.id;

    const { data: feeRecord, error: feeRecordError } = await supabase
      .from("fee_records")
      .select("id,branch_id,student_id,receipt_file_path,receipt_storage_bucket,verification_status")
      .eq("id", feeRecordId)
      .maybeSingle();

    if (feeRecordError || !feeRecord) {
      return { data: null, error: { message: feeRecordError?.message || "Fee record not visible for upload" } };
    }

    const objectPath = buildObjectPath({
      branchId: feeRecord.branch_id,
      studentId: feeRecord.student_id,
      feeRecordId: feeRecord.id,
      fileName: fileName || "receipt.txt",
    });

    // Upload first, metadata second: 009 storage policy authorizes by path mapping
    // against fee_records branch/student/id without requiring receipt_file_path pre-write.
    const uploadOptions = {
      upsert: false,
      contentType: contentType || "application/octet-stream",
    };

    const { error: uploadError } = await supabase.storage
      .from(FEE_RECEIPTS_BUCKET)
      .upload(objectPath, file, uploadOptions);

    if (uploadError) {
      return { data: null, error: { message: uploadError.message || "Failed to upload receipt object" } };
    }

    const nowIso = new Date().toISOString();
    const metadataPayload = {
      receipt_file_path: objectPath,
      receipt_storage_bucket: FEE_RECEIPTS_BUCKET,
      uploaded_by_profile_id: authUserId,
      uploaded_at: nowIso,
      verification_status: "submitted",
      updated_at: nowIso,
    };

    const { data: updatedRecord, error: updateError } = await supabase
      .from("fee_records")
      .update(metadataPayload)
      .eq("id", feeRecordId)
      .select("id,branch_id,student_id,receipt_file_path,receipt_storage_bucket,uploaded_by_profile_id,uploaded_at,verification_status,updated_at")
      .maybeSingle();

    if (updateError || !updatedRecord) {
      // Try cleanup best effort; parent may be blocked by delete policy and that's acceptable.
      const cleanup = await supabase.storage.from(FEE_RECEIPTS_BUCKET).remove([objectPath]);
      return {
        data: null,
        error: {
          message: updateError?.message || "Failed to update fee receipt metadata after upload",
          cleanup_warning: cleanup?.error?.message || null,
        },
      };
    }

    return {
      data: {
        fee_record: updatedRecord,
        storage_bucket: FEE_RECEIPTS_BUCKET,
        storage_path: objectPath,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function getFeeReceiptSignedUrl({ feeRecordId, expiresIn = 60 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!feeRecordId || typeof feeRecordId !== "string") {
    return { data: null, error: { message: "feeRecordId is required" } };
  }

  try {
    const { data: feeRecord, error: feeRecordError } = await supabase
      .from("fee_records")
      .select("id,receipt_storage_bucket,receipt_file_path")
      .eq("id", feeRecordId)
      .maybeSingle();

    if (feeRecordError || !feeRecord) {
      return { data: null, error: { message: feeRecordError?.message || "Fee record not visible" } };
    }
    if (!feeRecord.receipt_file_path) {
      return { data: null, error: { message: "No receipt file path available for this fee record" } };
    }

    const bucket = feeRecord.receipt_storage_bucket || FEE_RECEIPTS_BUCKET;
    if (bucket !== FEE_RECEIPTS_BUCKET) {
      return { data: null, error: { message: "Unexpected receipt storage bucket" } };
    }

    const { data, error } = await supabase.storage
      .from(FEE_RECEIPTS_BUCKET)
      .createSignedUrl(feeRecord.receipt_file_path, expiresIn);

    if (error || !data?.signedUrl) {
      return { data: null, error: { message: error?.message || "Failed to create signed URL" } };
    }

    return {
      data: {
        signed_url: data.signedUrl,
        path: feeRecord.receipt_file_path,
        bucket: FEE_RECEIPTS_BUCKET,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

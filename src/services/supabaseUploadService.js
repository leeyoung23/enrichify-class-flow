import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const FEE_RECEIPTS_BUCKET = "fee-receipts";
const CLASS_MEMORIES_BUCKET = "class-memories";

function sanitizeFileName(fileName = "") {
  const fallback = "receipt.txt";
  const value = String(fileName || "").trim() || fallback;
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isUuidLike(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function toIsoDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function deriveClassMemoryMediaType(contentType = "") {
  const ct = String(contentType || "").toLowerCase();
  if (ct.startsWith("video/")) return "video";
  return "image";
}

function buildClassMemoryObjectPath({ branchId, classId, studentId, memoryId, fileName }) {
  const safeName = sanitizeFileName(fileName || "class-memory.jpg");
  const datePart = toIsoDate();
  const safeStudentId = isUuidLike(studentId) ? String(studentId).trim() : null;
  if (safeStudentId) {
    return `${branchId}/${classId}/${safeStudentId}/${datePart}/${memoryId}-${safeName}`;
  }
  return `${branchId}/${classId}/${datePart}/${memoryId}-${safeName}`;
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

export async function uploadClassMemory({
  branchId,
  classId,
  studentId,
  title,
  caption,
  file,
  fileName,
  contentType,
  submitForReview = false,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(branchId)) {
    return { data: null, error: { message: "branchId must be a UUID" } };
  }
  if (!isUuidLike(classId)) {
    return { data: null, error: { message: "classId must be a UUID" } };
  }
  if (studentId != null && studentId !== "" && !isUuidLike(studentId)) {
    return { data: null, error: { message: "studentId must be a UUID when provided" } };
  }
  if (!file) {
    return { data: null, error: { message: "file is required" } };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      return { data: null, error: { message: authError?.message || "Authenticated user is required" } };
    }

    const uploaderId = authData.user.id;
    const memoryId = crypto.randomUUID();
    const objectPath = buildClassMemoryObjectPath({
      branchId: String(branchId).trim(),
      classId: String(classId).trim(),
      studentId: studentId ? String(studentId).trim() : null,
      memoryId,
      fileName: fileName || "class-memory.jpg",
    });
    const nowIso = new Date().toISOString();
    const visibilityStatus = submitForReview ? "submitted" : "draft";
    const mediaType = deriveClassMemoryMediaType(contentType || file?.type || "");

    // Metadata-first flow required by Class Memories storage policy.
    const createResult = await supabase
      .from("class_memories")
      .insert({
        id: memoryId,
        branch_id: String(branchId).trim(),
        class_id: String(classId).trim(),
        student_id: studentId ? String(studentId).trim() : null,
        uploaded_by_profile_id: uploaderId,
        title: typeof title === "string" ? title.trim() || null : null,
        caption: typeof caption === "string" ? caption.trim() || null : null,
        media_type: mediaType,
        storage_bucket: CLASS_MEMORIES_BUCKET,
        storage_path: objectPath,
        visibility_status: visibilityStatus,
        visible_to_parents: false,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id,branch_id,class_id,student_id,uploaded_by_profile_id,storage_bucket,storage_path,visibility_status,visible_to_parents,created_at,updated_at")
      .maybeSingle();

    if (createResult.error || !createResult.data) {
      return {
        data: null,
        error: { message: createResult.error?.message || "Unable to create class memory metadata row" },
      };
    }

    const uploadResult = await supabase.storage
      .from(CLASS_MEMORIES_BUCKET)
      .upload(objectPath, file, {
        upsert: false,
        contentType: contentType || file?.type || "application/octet-stream",
      });

    if (uploadResult.error) {
      const cleanup = await supabase
        .from("class_memories")
        .delete()
        .eq("id", memoryId)
        .select("id")
        .maybeSingle();
      return {
        data: null,
        error: {
          message: uploadResult.error.message || "Failed to upload class memory object",
          cleanup_warning: cleanup.error?.message || null,
        },
      };
    }

    return {
      data: {
        class_memory: createResult.data,
        storage_bucket: CLASS_MEMORIES_BUCKET,
        storage_path: objectPath,
        metadata_first: true,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function getClassMemorySignedUrl({ memoryId, expiresIn = 60 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(memoryId)) {
    return { data: null, error: { message: "memoryId must be a UUID" } };
  }

  try {
    const { data: memoryRow, error: memoryError } = await supabase
      .from("class_memories")
      .select("id,storage_bucket,storage_path")
      .eq("id", String(memoryId).trim())
      .maybeSingle();

    if (memoryError || !memoryRow) {
      return { data: null, error: { message: memoryError?.message || "Class memory row not visible" } };
    }
    if (memoryRow.storage_bucket !== CLASS_MEMORIES_BUCKET) {
      return { data: null, error: { message: "Unexpected class memory storage bucket" } };
    }
    if (!memoryRow.storage_path) {
      return { data: null, error: { message: "Class memory storage path is missing" } };
    }

    const { data, error } = await supabase.storage
      .from(CLASS_MEMORIES_BUCKET)
      .createSignedUrl(memoryRow.storage_path, expiresIn);

    if (error || !data?.signedUrl) {
      return { data: null, error: { message: error?.message || "Unable to create class memory signed URL" } };
    }

    return {
      data: {
        memory_id: memoryRow.id,
        signed_url: data.signedUrl,
        bucket: CLASS_MEMORIES_BUCKET,
        path: memoryRow.storage_path,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function listClassMemories({ classId, studentId, status, parentVisibleOnly = false } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  try {
    let query = supabase
      .from("class_memories")
      .select("id,branch_id,class_id,student_id,uploaded_by_profile_id,title,caption,media_type,storage_bucket,storage_path,thumbnail_path,visibility_status,visible_to_parents,approved_at,rejected_reason,hidden_at,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (isUuidLike(classId)) query = query.eq("class_id", String(classId).trim());
    if (isUuidLike(studentId)) query = query.eq("student_id", String(studentId).trim());
    if (typeof status === "string" && status.trim() !== "") query = query.eq("visibility_status", status.trim());
    if (parentVisibleOnly) query = query.eq("visibility_status", "approved").eq("visible_to_parents", true);

    const { data, error } = await query;
    return { data: Array.isArray(data) ? data : [], error: error ?? null };
  } catch (err) {
    return { data: [], error: { message: err?.message || String(err) } };
  }
}

export async function getClassMemoryById(memoryId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(memoryId)) {
    return { data: null, error: { message: "memoryId must be a UUID" } };
  }
  try {
    const { data, error } = await supabase
      .from("class_memories")
      .select("id,branch_id,class_id,student_id,uploaded_by_profile_id,approved_by_profile_id,title,caption,media_type,storage_bucket,storage_path,thumbnail_path,visibility_status,visible_to_parents,approved_at,rejected_reason,hidden_at,created_at,updated_at")
      .eq("id", String(memoryId).trim())
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

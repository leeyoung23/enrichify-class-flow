import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const FEE_RECEIPTS_BUCKET = "fee-receipts";
const CLASS_MEMORIES_BUCKET = "class-memories";
const HOMEWORK_SUBMISSIONS_BUCKET = "homework-submissions";
const MAX_HOMEWORK_FILE_BYTES = 2 * 1024 * 1024;
const HOMEWORK_TASK_STATUS_VALUES = new Set(["draft", "assigned", "closed", "archived"]);
const HOMEWORK_SUBMISSION_STATUS_VALUES = new Set([
  "submitted",
  "under_review",
  "reviewed",
  "returned_for_revision",
  "approved_for_parent",
  "archived",
]);
const SAFE_HOMEWORK_CONTENT_TYPES = new Set([
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

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

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalText(value, maxLength = 1200) {
  if (value == null) return null;
  const trimmed = trimString(value);
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

async function getAuthenticatedProfileIdOrError() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    return { profileId: null, error: { message: error?.message || "Authenticated user is required" } };
  }
  return { profileId: data.user.id, error: null };
}

function buildHomeworkObjectPath({
  branchId,
  classId,
  studentId,
  homeworkTaskId,
  homeworkSubmissionId,
  fileName,
}) {
  const safeName = sanitizeFileName(fileName || "homework-file.txt");
  return `${branchId}/${classId}/${studentId}/${homeworkTaskId}/${homeworkSubmissionId}-${safeName}`;
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

export async function createHomeworkTask({
  branchId,
  classId,
  title,
  instructions,
  subject,
  dueDate,
  status = "draft",
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(branchId)) return { data: null, error: { message: "branchId must be a UUID" } };
  if (!isUuidLike(classId)) return { data: null, error: { message: "classId must be a UUID" } };
  if (!trimString(title)) return { data: null, error: { message: "title is required" } };
  if (!HOMEWORK_TASK_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "Invalid homework task status value" } };
  }
  if (dueDate != null && !/^\d{4}-\d{2}-\d{2}$/.test(trimString(dueDate))) {
    return { data: null, error: { message: "dueDate must be YYYY-MM-DD when provided" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileIdOrError();
    if (authError || !profileId) return { data: null, error: authError };
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("homework_tasks")
      .insert({
        branch_id: trimString(branchId),
        class_id: trimString(classId),
        created_by_profile_id: profileId,
        title: trimString(title).slice(0, 240),
        instructions: getOptionalText(instructions, 4000),
        subject: getOptionalText(subject, 120),
        due_date: dueDate ? trimString(dueDate) : null,
        status,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id,branch_id,class_id,created_by_profile_id,title,instructions,subject,due_date,status,created_at,updated_at")
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function createHomeworkSubmission({
  homeworkTaskId,
  branchId,
  classId,
  studentId,
  submissionNote,
  status = "submitted",
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkTaskId)) return { data: null, error: { message: "homeworkTaskId must be a UUID" } };
  if (!isUuidLike(branchId)) return { data: null, error: { message: "branchId must be a UUID" } };
  if (!isUuidLike(classId)) return { data: null, error: { message: "classId must be a UUID" } };
  if (!isUuidLike(studentId)) return { data: null, error: { message: "studentId must be a UUID" } };
  if (!HOMEWORK_SUBMISSION_STATUS_VALUES.has(status)) {
    return { data: null, error: { message: "Invalid homework submission status value" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileIdOrError();
    if (authError || !profileId) return { data: null, error: authError };
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("homework_submissions")
      .insert({
        homework_task_id: trimString(homeworkTaskId),
        branch_id: trimString(branchId),
        class_id: trimString(classId),
        student_id: trimString(studentId),
        submitted_by_profile_id: profileId,
        submission_note: getOptionalText(submissionNote, 2000),
        status,
        submitted_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id,homework_task_id,branch_id,class_id,student_id,submitted_by_profile_id,submission_note,status,submitted_at,reviewed_at,reviewed_by_profile_id,created_at,updated_at")
      .maybeSingle();
    return { data: data ?? null, error: error ?? null };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function uploadHomeworkFile({
  homeworkSubmissionId,
  branchId,
  classId,
  studentId,
  homeworkTaskId,
  file,
  fileName,
  contentType,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkSubmissionId)) {
    return { data: null, error: { message: "homeworkSubmissionId must be a UUID" } };
  }
  if (branchId != null && branchId !== "" && !isUuidLike(branchId)) {
    return { data: null, error: { message: "branchId must be a UUID when provided" } };
  }
  if (classId != null && classId !== "" && !isUuidLike(classId)) {
    return { data: null, error: { message: "classId must be a UUID when provided" } };
  }
  if (studentId != null && studentId !== "" && !isUuidLike(studentId)) {
    return { data: null, error: { message: "studentId must be a UUID when provided" } };
  }
  if (homeworkTaskId != null && homeworkTaskId !== "" && !isUuidLike(homeworkTaskId)) {
    return { data: null, error: { message: "homeworkTaskId must be a UUID when provided" } };
  }
  if (!file) return { data: null, error: { message: "file is required" } };

  const resolvedContentType = trimString(contentType || file?.type || "application/octet-stream");
  if (!SAFE_HOMEWORK_CONTENT_TYPES.has(resolvedContentType)) {
    return { data: null, error: { message: "Unsupported homework file content type" } };
  }
  const fileSizeBytes = Number(file?.size || 0);
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > MAX_HOMEWORK_FILE_BYTES) {
    return { data: null, error: { message: "Homework file size must be > 0 and <= 2MB" } };
  }

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileIdOrError();
    if (authError || !profileId) return { data: null, error: authError };

    const submissionId = trimString(homeworkSubmissionId);
    const submissionRead = await supabase
      .from("homework_submissions")
      .select("id,homework_task_id,branch_id,class_id,student_id")
      .eq("id", submissionId)
      .maybeSingle();
    if (submissionRead.error || !submissionRead.data) {
      return { data: null, error: { message: submissionRead.error?.message || "Homework submission not visible" } };
    }
    const submission = submissionRead.data;

    if (branchId && trimString(branchId) !== submission.branch_id) {
      return { data: null, error: { message: "branchId does not match homework submission branch_id" } };
    }
    if (classId && trimString(classId) !== submission.class_id) {
      return { data: null, error: { message: "classId does not match homework submission class_id" } };
    }
    if (studentId && trimString(studentId) !== submission.student_id) {
      return { data: null, error: { message: "studentId does not match homework submission student_id" } };
    }
    if (homeworkTaskId && trimString(homeworkTaskId) !== submission.homework_task_id) {
      return { data: null, error: { message: "homeworkTaskId does not match homework submission homework_task_id" } };
    }

    const objectPath = buildHomeworkObjectPath({
      branchId: submission.branch_id,
      classId: submission.class_id,
      studentId: submission.student_id,
      homeworkTaskId: submission.homework_task_id,
      homeworkSubmissionId: submissionId,
      fileName: fileName || "homework-file.txt",
    });
    const nowIso = new Date().toISOString();

    // Metadata-first upload: required by homework storage policy.
    const createRow = await supabase
      .from("homework_files")
      .insert({
        homework_submission_id: submissionId,
        storage_bucket: HOMEWORK_SUBMISSIONS_BUCKET,
        storage_path: objectPath,
        file_name: sanitizeFileName(fileName || "homework-file.txt"),
        content_type: resolvedContentType,
        file_size_bytes: Math.round(fileSizeBytes),
        uploaded_by_profile_id: profileId,
        created_at: nowIso,
      })
      .select("id,homework_submission_id,storage_bucket,storage_path,file_name,content_type,file_size_bytes,uploaded_by_profile_id,created_at")
      .maybeSingle();

    if (createRow.error || !createRow.data?.id) {
      return {
        data: null,
        error: { message: createRow.error?.message || "Failed to create homework file metadata row" },
      };
    }

    const uploadResult = await supabase.storage
      .from(HOMEWORK_SUBMISSIONS_BUCKET)
      .upload(objectPath, file, {
        upsert: false,
        contentType: resolvedContentType,
      });

    if (uploadResult.error) {
      const cleanup = await supabase
        .from("homework_files")
        .delete()
        .eq("id", createRow.data.id)
        .select("id")
        .maybeSingle();
      return {
        data: null,
        error: {
          message: uploadResult.error.message || "Failed to upload homework object",
          cleanup_warning: cleanup.error?.message || null,
        },
      };
    }

    return {
      data: {
        homework_file: createRow.data,
        storage_bucket: HOMEWORK_SUBMISSIONS_BUCKET,
        storage_path: objectPath,
        metadata_first: true,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function getHomeworkFileSignedUrl({ homeworkFileId, expiresIn = 60 } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!isUuidLike(homeworkFileId)) {
    return { data: null, error: { message: "homeworkFileId must be a UUID" } };
  }
  const ttl = Number.isFinite(Number(expiresIn)) ? Math.max(30, Math.min(3600, Number(expiresIn))) : 60;

  try {
    const { data: fileRow, error: fileError } = await supabase
      .from("homework_files")
      .select("id,storage_bucket,storage_path")
      .eq("id", trimString(homeworkFileId))
      .maybeSingle();

    if (fileError || !fileRow) {
      return { data: null, error: { message: fileError?.message || "Homework file metadata not visible" } };
    }
    if (fileRow.storage_bucket !== HOMEWORK_SUBMISSIONS_BUCKET) {
      return { data: null, error: { message: "Unexpected homework storage bucket" } };
    }
    if (!trimString(fileRow.storage_path)) {
      return { data: null, error: { message: "Homework file storage path is missing" } };
    }

    const { data, error } = await supabase.storage
      .from(HOMEWORK_SUBMISSIONS_BUCKET)
      .createSignedUrl(fileRow.storage_path, ttl);
    if (error || !data?.signedUrl) {
      return { data: null, error: { message: error?.message || "Failed to create homework file signed URL" } };
    }
    return {
      data: {
        homework_file_id: fileRow.id,
        signed_url: data.signedUrl,
        bucket: HOMEWORK_SUBMISSIONS_BUCKET,
        path: fileRow.storage_path,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function listHomeworkTasks({ classId, studentId, status } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  try {
    let taskIdsByStudent = null;
    if (isUuidLike(studentId)) {
      const studentTaskRead = await supabase
        .from("homework_submissions")
        .select("homework_task_id")
        .eq("student_id", trimString(studentId));
      if (studentTaskRead.error) {
        return { data: [], error: studentTaskRead.error };
      }
      taskIdsByStudent = Array.isArray(studentTaskRead.data)
        ? [...new Set(studentTaskRead.data.map((row) => row?.homework_task_id).filter(Boolean))]
        : [];
      if (taskIdsByStudent.length === 0) {
        return { data: [], error: null };
      }
    }

    let query = supabase
      .from("homework_tasks")
      .select("id,branch_id,class_id,created_by_profile_id,title,instructions,subject,due_date,status,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (isUuidLike(classId)) query = query.eq("class_id", trimString(classId));
    if (typeof status === "string" && trimString(status)) query = query.eq("status", trimString(status));
    if (Array.isArray(taskIdsByStudent)) query = query.in("id", taskIdsByStudent);

    const { data, error } = await query;
    return { data: Array.isArray(data) ? data : [], error: error ?? null };
  } catch (err) {
    return { data: [], error: { message: err?.message || String(err) } };
  }
}

export async function listHomeworkSubmissions({ homeworkTaskId, studentId, classId, status } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  try {
    let query = supabase
      .from("homework_submissions")
      .select("id,homework_task_id,branch_id,class_id,student_id,submitted_by_profile_id,submission_note,status,submitted_at,reviewed_at,reviewed_by_profile_id,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (isUuidLike(homeworkTaskId)) query = query.eq("homework_task_id", trimString(homeworkTaskId));
    if (isUuidLike(studentId)) query = query.eq("student_id", trimString(studentId));
    if (isUuidLike(classId)) query = query.eq("class_id", trimString(classId));
    if (typeof status === "string" && trimString(status)) query = query.eq("status", trimString(status));

    const { data, error } = await query;
    return { data: Array.isArray(data) ? data : [], error: error ?? null };
  } catch (err) {
    return { data: [], error: { message: err?.message || String(err) } };
  }
}

export async function listHomeworkFeedback({ homeworkSubmissionId, parentVisibleOnly = false } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }
  if (homeworkSubmissionId != null && homeworkSubmissionId !== "" && !isUuidLike(homeworkSubmissionId)) {
    return { data: [], error: { message: "homeworkSubmissionId must be a UUID when provided" } };
  }

  try {
    const selectFields = parentVisibleOnly
      ? "id,homework_submission_id,teacher_profile_id,feedback_text,next_step,status,released_to_parent_at,created_at,updated_at"
      : "id,homework_submission_id,teacher_profile_id,feedback_text,next_step,internal_note,status,released_to_parent_at,created_at,updated_at";
    let query = supabase
      .from("homework_feedback")
      .select(selectFields)
      .order("created_at", { ascending: false });

    if (isUuidLike(homeworkSubmissionId)) query = query.eq("homework_submission_id", trimString(homeworkSubmissionId));
    if (parentVisibleOnly) query = query.eq("status", "released_to_parent");

    const { data, error } = await query;
    return { data: Array.isArray(data) ? data : [], error: error ?? null };
  } catch (err) {
    return { data: [], error: { message: err?.message || String(err) } };
  }
}

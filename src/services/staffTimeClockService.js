import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { evaluateGeofence, DEFAULT_GEOFENCE_RADIUS_METERS } from "./locationVerificationService.js";

const STAFF_CLOCK_SELFIES_BUCKET = "staff-clock-selfies";
const ALLOWED_GEOFENCE_STATUSES = new Set(["valid", "outside_geofence", "pending_review"]);
const STAFF_TIME_ENTRY_LIST_FIELDS =
  "id,profile_id,branch_id,clock_in_at,clock_out_at,clock_in_latitude,clock_in_longitude,clock_in_accuracy_meters,clock_in_distance_meters,clock_out_latitude,clock_out_longitude,clock_out_accuracy_meters,clock_out_distance_meters,status,exception_reason,reviewed_by_profile_id,reviewed_at,created_at,updated_at";
const STAFF_TIME_ENTRY_DETAIL_FIELDS =
  "id,profile_id,branch_id,clock_in_at,clock_out_at,clock_in_latitude,clock_in_longitude,clock_in_accuracy_meters,clock_in_distance_meters,clock_in_selfie_path,clock_out_latitude,clock_out_longitude,clock_out_accuracy_meters,clock_out_distance_meters,clock_out_selfie_path,status,exception_reason,reviewed_by_profile_id,reviewed_at,created_at,updated_at";

function toIsoDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

function sanitizeFileName(fileName = "") {
  const fallback = "clock-selfie.jpg";
  const value = String(fileName || "").trim() || fallback;
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeNumber(value, fieldName) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return { value: null, error: { message: `${fieldName} must be a finite number` } };
  }
  return { value: numeric, error: null };
}

function normalizeGeofenceStatus(status) {
  if (typeof status !== "string") return null;
  const value = status.trim();
  return ALLOWED_GEOFENCE_STATUSES.has(value) ? value : null;
}

function resolveStatusFromGeofence({ geofenceStatus, distanceMeters, accuracyMeters, radiusMeters }) {
  const provided = normalizeGeofenceStatus(geofenceStatus);
  if (provided) return { status: provided, source: "provided" };

  const evaluated = evaluateGeofence({
    distanceMeters,
    accuracyMeters,
    radiusMeters,
  });
  if (!evaluated.error && evaluated.data?.status && ALLOWED_GEOFENCE_STATUSES.has(evaluated.data.status)) {
    return { status: evaluated.data.status, source: "evaluated" };
  }

  return { status: "pending_review", source: "fallback" };
}

function normalizePositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function isUuidLike(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function normalizeDateOnly(dateValue) {
  if (typeof dateValue !== "string") return null;
  const trimmed = dateValue.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const dt = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return trimmed;
}

function addOneDay(dateOnly) {
  const dt = new Date(`${dateOnly}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function applyStaffTimeFilters(query, { branchId, status, date, dateRange } = {}) {
  let next = query;
  const safeBranchId = isUuidLike(branchId) ? String(branchId).trim() : null;
  if (safeBranchId) {
    next = next.eq("branch_id", safeBranchId);
  }

  const safeStatus = normalizeGeofenceStatus(status);
  if (safeStatus) {
    next = next.eq("status", safeStatus);
  }

  const safeDate = normalizeDateOnly(date);
  if (safeDate) {
    const endDate = addOneDay(safeDate);
    next = next.gte("clock_in_at", `${safeDate}T00:00:00.000Z`).lt("clock_in_at", `${endDate}T00:00:00.000Z`);
    return next;
  }

  const startDate = normalizeDateOnly(dateRange?.startDate);
  const endDate = normalizeDateOnly(dateRange?.endDate);
  if (startDate) {
    next = next.gte("clock_in_at", `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    const endExclusive = addOneDay(endDate);
    next = next.lt("clock_in_at", `${endExclusive}T00:00:00.000Z`);
  }

  return next;
}

function buildSelfiePath({ branchId, profileId, entryId, clockType, fileName }) {
  const safeName = sanitizeFileName(fileName);
  const datePart = toIsoDate();
  const extension = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
  const normalizedType = clockType === "clock_out" ? "clock_out" : "clock_in";
  return `${branchId}/${profileId}/${datePart}/${entryId}-${normalizedType}.${extension}`;
}

async function getAuthenticatedProfileId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    return { profileId: null, error: { message: error?.message || "Authenticated user is required" } };
  }
  return { profileId: data.user.id, error: null };
}

export async function clockInStaff({
  branchId,
  latitude,
  longitude,
  accuracyMeters,
  distanceMeters,
  radiusMeters,
  geofenceStatus,
  selfieFile,
  fileName,
  contentType,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!branchId || typeof branchId !== "string") {
    return { data: null, error: { message: "branchId is required" } };
  }
  if (!selfieFile) {
    return { data: null, error: { message: "selfieFile is required for clock in" } };
  }

  const lat = normalizeNumber(latitude, "latitude");
  if (lat.error) return { data: null, error: lat.error };
  const lng = normalizeNumber(longitude, "longitude");
  if (lng.error) return { data: null, error: lng.error };
  const acc = normalizeNumber(accuracyMeters, "accuracyMeters");
  if (acc.error) return { data: null, error: acc.error };
  const dist = normalizeNumber(distanceMeters, "distanceMeters");
  if (dist.error) return { data: null, error: dist.error };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const nowIso = new Date().toISOString();
    const statusResolution = resolveStatusFromGeofence({
      geofenceStatus,
      distanceMeters: dist.value,
      accuracyMeters: acc.value,
      radiusMeters,
    });
    const status = statusResolution.status;
    const entryId = crypto.randomUUID();
    const selfiePath = buildSelfiePath({
      branchId,
      profileId,
      entryId,
      clockType: "clock_in",
      fileName,
    });

    const createResult = await supabase
      .from("staff_time_entries")
      .insert({
        id: entryId,
        profile_id: profileId,
        branch_id: branchId,
        clock_in_at: nowIso,
        clock_in_latitude: lat.value,
        clock_in_longitude: lng.value,
        clock_in_accuracy_meters: acc.value,
        clock_in_distance_meters: dist.value,
        clock_in_selfie_path: selfiePath,
        status,
        updated_at: nowIso,
      })
      .select("*")
      .maybeSingle();

    if (createResult.error || !createResult.data) {
      return { data: null, error: { message: createResult.error?.message || "Unable to create staff time entry" } };
    }

    const uploadResult = await supabase.storage
      .from(STAFF_CLOCK_SELFIES_BUCKET)
      .upload(selfiePath, selfieFile, {
        upsert: false,
        contentType: contentType || "image/jpeg",
      });

    if (uploadResult.error) {
      return {
        data: null,
        error: {
          message: uploadResult.error.message || "Clock-in selfie upload failed",
          cleanup_warning: "Entry remains with reserved selfie path due immutable clock-in evidence policy",
        },
      };
    }

    return {
      data: {
        entry: createResult.data,
        storage_bucket: STAFF_CLOCK_SELFIES_BUCKET,
        selfie_path: selfiePath,
        status_rule: `provided(valid/outside_geofence/pending_review) or evaluateGeofence(radius default ${DEFAULT_GEOFENCE_RADIUS_METERS}m)`,
        status_source: statusResolution.source,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function clockOutStaff({
  entryId,
  latitude,
  longitude,
  accuracyMeters,
  distanceMeters,
  radiusMeters,
  geofenceStatus,
  selfieFile,
  fileName,
  contentType,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!entryId || typeof entryId !== "string") {
    return { data: null, error: { message: "entryId is required" } };
  }

  const lat = normalizeNumber(latitude, "latitude");
  if (lat.error) return { data: null, error: lat.error };
  const lng = normalizeNumber(longitude, "longitude");
  if (lng.error) return { data: null, error: lng.error };
  const acc = normalizeNumber(accuracyMeters, "accuracyMeters");
  if (acc.error) return { data: null, error: acc.error };
  const dist = normalizeNumber(distanceMeters, "distanceMeters");
  if (dist.error) return { data: null, error: dist.error };

  try {
    const { profileId, error: authError } = await getAuthenticatedProfileId();
    if (authError || !profileId) {
      return { data: null, error: authError || { message: "Authenticated user is required" } };
    }

    const lookup = await supabase
      .from("staff_time_entries")
      .select("id,profile_id,branch_id,clock_out_at,clock_out_selfie_path,status")
      .eq("id", entryId)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (lookup.error || !lookup.data) {
      return { data: null, error: { message: lookup.error?.message || "Entry not visible for current staff profile" } };
    }
    if (lookup.data.clock_out_at) {
      return { data: null, error: { message: "Entry is already clocked out" } };
    }

    const nowIso = new Date().toISOString();
    const statusResolution = resolveStatusFromGeofence({
      geofenceStatus,
      distanceMeters: dist.value,
      accuracyMeters: acc.value,
      radiusMeters,
    });
    const derivedStatus = statusResolution.status;

    let selfiePath = null;
    if (selfieFile) {
      selfiePath = buildSelfiePath({
        branchId: lookup.data.branch_id,
        profileId,
        entryId,
        clockType: "clock_out",
        fileName: fileName || "clock-out-selfie.jpg",
      });

      const stageResult = await supabase
        .from("staff_time_entries")
        .update({
          clock_out_latitude: lat.value,
          clock_out_longitude: lng.value,
          clock_out_accuracy_meters: acc.value,
          clock_out_distance_meters: dist.value,
          clock_out_selfie_path: selfiePath,
          status: derivedStatus,
          updated_at: nowIso,
        })
        .eq("id", entryId)
        .eq("profile_id", profileId)
        .is("clock_out_at", null)
        .select("id")
        .maybeSingle();

      if (stageResult.error || !stageResult.data) {
        return { data: null, error: { message: stageResult.error?.message || "Unable to stage clock-out selfie path" } };
      }

      const uploadResult = await supabase.storage
        .from(STAFF_CLOCK_SELFIES_BUCKET)
        .upload(selfiePath, selfieFile, {
          upsert: false,
          contentType: contentType || "image/jpeg",
        });

      if (uploadResult.error) {
        const revert = await supabase
          .from("staff_time_entries")
          .update({
            clock_out_latitude: null,
            clock_out_longitude: null,
            clock_out_accuracy_meters: null,
            clock_out_distance_meters: null,
            clock_out_selfie_path: null,
            status: "pending_review",
            exception_reason: "clock_out_selfie_upload_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", entryId)
          .eq("profile_id", profileId)
          .is("clock_out_at", null);

        return {
          data: null,
          error: {
            message: uploadResult.error.message || "Clock-out selfie upload failed",
            cleanup_warning: revert.error?.message || null,
          },
        };
      }
    }

    const closeResult = await supabase
      .from("staff_time_entries")
      .update({
        clock_out_at: nowIso,
        clock_out_latitude: lat.value,
        clock_out_longitude: lng.value,
        clock_out_accuracy_meters: acc.value,
        clock_out_distance_meters: dist.value,
        status: derivedStatus,
        ...(selfiePath ? { clock_out_selfie_path: selfiePath } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .eq("profile_id", profileId)
      .is("clock_out_at", null)
      .select("*")
      .maybeSingle();

    if (closeResult.error || !closeResult.data) {
      return { data: null, error: { message: closeResult.error?.message || "Unable to finalize clock-out entry" } };
    }

    return {
      data: {
        entry: closeResult.data,
        storage_bucket: selfiePath ? STAFF_CLOCK_SELFIES_BUCKET : null,
        selfie_path: selfiePath,
        status_rule: `provided(valid/outside_geofence/pending_review) or evaluateGeofence(radius default ${DEFAULT_GEOFENCE_RADIUS_METERS}m)`,
        status_source: statusResolution.source,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function getStaffTimeSelfieSignedUrl({ entryId, clockType } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!entryId || typeof entryId !== "string") {
    return { data: null, error: { message: "entryId is required" } };
  }
  if (clockType !== "clock_in" && clockType !== "clock_out") {
    return { data: null, error: { message: "clockType must be clock_in or clock_out" } };
  }

  try {
    const selectField = clockType === "clock_in" ? "clock_in_selfie_path" : "clock_out_selfie_path";
    const { data: entry, error: entryError } = await supabase
      .from("staff_time_entries")
      .select(`id,${selectField}`)
      .eq("id", entryId)
      .maybeSingle();

    if (entryError || !entry) {
      return { data: null, error: { message: entryError?.message || "Entry not visible for selfie URL request" } };
    }

    const selfiePath = entry[selectField];
    if (!selfiePath) {
      return { data: null, error: { message: `${clockType} selfie path not available for this entry` } };
    }

    const { data, error } = await supabase.storage
      .from(STAFF_CLOCK_SELFIES_BUCKET)
      .createSignedUrl(selfiePath, 60);

    if (error || !data?.signedUrl) {
      return { data: null, error: { message: error?.message || "Unable to create signed URL for selfie" } };
    }

    return {
      data: {
        entry_id: entryId,
        clock_type: clockType,
        bucket: STAFF_CLOCK_SELFIES_BUCKET,
        path: selfiePath,
        signed_url: data.signedUrl,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: err?.message || String(err) } };
  }
}

export async function listStaffTimeEntries({
  branchId,
  date,
  status,
  page = 1,
  pageSize = 20,
  dateRange,
} = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: { message: "Supabase is not configured" } };
  }

  const safePage = normalizePositiveInt(page, 1);
  const safePageSize = Math.min(normalizePositiveInt(pageSize, 20), 100);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  try {
    let query = supabase
      .from("staff_time_entries")
      .select(STAFF_TIME_ENTRY_LIST_FIELDS, { count: "exact" })
      .order("clock_in_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    query = applyStaffTimeFilters(query, { branchId, status, date, dateRange });
    const { data, error, count } = await query;
    if (error) {
      return { data: [], error };
    }

    return {
      data: Array.isArray(data) ? data : [],
      error: null,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total: typeof count === "number" ? count : null,
      },
    };
  } catch (error) {
    return { data: [], error };
  }
}

export async function getStaffTimeEntryById(entryId) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }
  if (!entryId || typeof entryId !== "string") {
    return { data: null, error: { message: "entryId is required" } };
  }

  try {
    const { data, error } = await supabase
      .from("staff_time_entries")
      .select(STAFF_TIME_ENTRY_DETAIL_FIELDS)
      .eq("id", entryId)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }
    return { data: data ?? null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getStaffTimeSummary({ branchId, dateRange } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: { message: "Supabase is not configured" } };
  }

  try {
    let query = supabase
      .from("staff_time_entries")
      .select("id,status,clock_out_at")
      .order("created_at", { ascending: false });

    query = applyStaffTimeFilters(query, { branchId, dateRange });
    const { data, error } = await query;
    if (error) {
      return { data: null, error };
    }

    const rows = Array.isArray(data) ? data : [];
    const summary = {
      totalEntries: rows.length,
      onShiftCount: rows.filter((row) => !row.clock_out_at).length,
      completedCount: rows.filter((row) => Boolean(row.clock_out_at)).length,
      validCount: rows.filter((row) => row.status === "valid").length,
      outsideGeofenceCount: rows.filter((row) => row.status === "outside_geofence").length,
      pendingReviewCount: rows.filter((row) => row.status === "pending_review").length,
      missedClockOutCount: rows.filter((row) => row.status === "missed_clock_out").length,
    };
    return { data: summary, error: null };
  } catch (error) {
    return { data: null, error };
  }
}


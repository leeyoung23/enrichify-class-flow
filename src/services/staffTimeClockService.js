import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const STAFF_CLOCK_SELFIES_BUCKET = "staff-clock-selfies";
const DISTANCE_VALID_THRESHOLD_METERS = 150;

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

function deriveStatusFromDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return "pending_review";
  }
  return distanceMeters <= DISTANCE_VALID_THRESHOLD_METERS ? "valid" : "outside_geofence";
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
    const status = deriveStatusFromDistance(dist.value);
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
        status_rule: `distance<=${DISTANCE_VALID_THRESHOLD_METERS}:valid else outside_geofence`,
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
    const derivedStatus = deriveStatusFromDistance(dist.value);

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
        status_rule: `distance<=${DISTANCE_VALID_THRESHOLD_METERS}:valid else outside_geofence`,
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


/**
 * Browser location + geofence helpers for Staff Time Clock.
 * Call getCurrentPositionForClockEvent only from explicit user gestures (e.g. button onClick).
 * No background tracking, no watchPosition loops, no Supabase.
 */

const EARTH_RADIUS_METERS = 6_371_000;
/** When branch row has no radius yet (align with staffTimeClockService draft default). */
export const DEFAULT_GEOFENCE_RADIUS_METERS = 150;
/** Above this accuracy (meters), distance is not trusted for valid/outside — pending_review. */
export const DEFAULT_MAX_ACCURACY_METERS_FOR_TRUSTED_GEOFENCE = 80;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function mapGeolocationErrorCode(code) {
  if (code === 1) return "PERMISSION_DENIED";
  if (code === 2) return "POSITION_UNAVAILABLE";
  if (code === 3) return "TIMEOUT";
  return "UNKNOWN";
}

/**
 * Haversine distance in meters between two WGS84 points.
 * Pure function — safe to run in Node tests.
 */
export function calculateDistanceMeters({ branchLat, branchLng, currentLat, currentLng } = {}) {
  const nums = [
    ["branchLat", branchLat],
    ["branchLng", branchLng],
    ["currentLat", currentLat],
    ["currentLng", currentLng],
  ];
  for (const [name, v] of nums) {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      return { data: null, error: { code: "INVALID_INPUT", message: `${name} must be a finite number` } };
    }
  }

  const φ1 = toRadians(Number(branchLat));
  const φ2 = toRadians(Number(currentLat));
  const Δφ = toRadians(Number(currentLat) - Number(branchLat));
  const Δλ = toRadians(Number(currentLng) - Number(branchLng));

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = EARTH_RADIUS_METERS * c;

  return { data: { distanceMeters }, error: null };
}

/**
 * Decide staff_time_entries-style status from distance, GPS accuracy, and branch radius.
 * Pure function — safe to run in Node tests.
 *
 * Rules:
 * - Missing or non-finite accuracy → pending_review (cannot trust fix).
 * - Accuracy worse than maxAccuracyMeters → pending_review.
 * - Else if distanceMeters <= radiusMeters → valid.
 * - Else → outside_geofence.
 *
 * @param {object} params
 * @param {number} params.distanceMeters
 * @param {number} [params.accuracyMeters]
 * @param {number} [params.radiusMeters] — falls back to DEFAULT_GEOFENCE_RADIUS_METERS if null/undefined/NaN
 * @param {number} [params.maxAccuracyMetersForTrustedGeofence] — override accuracy ceiling
 */
export function evaluateGeofence({
  distanceMeters,
  accuracyMeters,
  radiusMeters,
  maxAccuracyMetersForTrustedGeofence = DEFAULT_MAX_ACCURACY_METERS_FOR_TRUSTED_GEOFENCE,
} = {}) {
  const dist = Number(distanceMeters);
  if (!Number.isFinite(dist)) {
    return { data: null, error: { code: "INVALID_INPUT", message: "distanceMeters must be a finite number" } };
  }

  let radius = Number(radiusMeters);
  if (!Number.isFinite(radius) || radius <= 0) {
    radius = DEFAULT_GEOFENCE_RADIUS_METERS;
  }

  const acc = accuracyMeters == null ? NaN : Number(accuracyMeters);
  const reasons = [];

  if (!Number.isFinite(acc)) {
    reasons.push("accuracy_unavailable");
    return {
      data: {
        status: "pending_review",
        distanceMeters: dist,
        accuracyMeters: accuracyMeters ?? null,
        radiusMeters: radius,
        reasons,
      },
      error: null,
    };
  }

  if (acc > maxAccuracyMetersForTrustedGeofence) {
    reasons.push("accuracy_too_poor");
    return {
      data: {
        status: "pending_review",
        distanceMeters: dist,
        accuracyMeters: acc,
        radiusMeters: radius,
        reasons,
      },
      error: null,
    };
  }

  if (dist <= radius) {
    return {
      data: {
        status: "valid",
        distanceMeters: dist,
        accuracyMeters: acc,
        radiusMeters: radius,
        reasons: [],
      },
      error: null,
    };
  }

  reasons.push("outside_radius");
  return {
    data: {
      status: "outside_geofence",
      distanceMeters: dist,
      accuracyMeters: acc,
      radiusMeters: radius,
      reasons,
    },
    error: null,
  };
}

/**
 * One-shot current position for a clock-in/out action. Does not start any watcher.
 * Must be called from a user gesture in browsers that enforce that for permissions.
 *
 * @param {object} [options]
 * @param {number} [options.timeout] — ms, default 20000
 * @param {number} [options.maximumAge] — ms, default 0 (fresh fix)
 * @param {boolean} [options.enableHighAccuracy] — default true
 */
export async function getCurrentPositionForClockEvent(options = {}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      data: null,
      error: {
        code: "UNSUPPORTED",
        message: "Geolocation is not available in this environment",
      },
    };
  }

  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return {
      data: null,
      error: {
        code: "INSECURE_CONTEXT",
        message: "Geolocation requires a secure context (HTTPS)",
      },
    };
  }

  const {
    timeout = 20_000,
    maximumAge = 0,
    enableHighAccuracy = true,
  } = options;

  return await new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const lat = Number(latitude);
          const lng = Number(longitude);
          const acc = accuracy == null || Number.isNaN(Number(accuracy)) ? null : Number(accuracy);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            resolve({
              data: null,
              error: {
                code: "POSITION_UNAVAILABLE",
                message: "Invalid coordinates from geolocation",
              },
            });
            return;
          }

          const ts = position.timestamp;
          const capturedAt =
            typeof ts === "number" && Number.isFinite(ts) && ts > 0
              ? new Date(ts).toISOString()
              : new Date().toISOString();

          resolve({
            data: {
              latitude: lat,
              longitude: lng,
              accuracyMeters: acc,
              capturedAt,
            },
            error: null,
          });
        },
        (err) => {
          const code = mapGeolocationErrorCode(err?.code);
          resolve({
            data: null,
            error: {
              code,
              message: err?.message || "Geolocation request failed",
            },
          });
        },
        { enableHighAccuracy, maximumAge, timeout },
      );
    } catch (err) {
      resolve({
        data: null,
        error: {
          code: "UNKNOWN",
          message: err?.message || String(err),
        },
      });
    }
  });
}

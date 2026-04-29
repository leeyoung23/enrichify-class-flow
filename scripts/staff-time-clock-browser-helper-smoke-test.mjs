/**
 * Node smoke test for pure Staff Time Clock location helpers only.
 * Does not call navigator.geolocation or getUserMedia.
 */

import {
  calculateDistanceMeters,
  evaluateGeofence,
  DEFAULT_GEOFENCE_RADIUS_METERS,
} from "../src/services/locationVerificationService.js";

function print(kind, msg) {
  console.log(`[${kind}] ${msg}`);
}

function assert(cond, msg) {
  if (!cond) {
    print("FAIL", msg);
    process.exit(1);
  }
  print("PASS", msg);
}

function run() {
  const same = calculateDistanceMeters({
    branchLat: -33.8688,
    branchLng: 151.2093,
    currentLat: -33.8688,
    currentLng: 151.2093,
  });
  assert(same.error == null && Math.abs(same.data.distanceMeters) < 1, "Same point ~0 m");

  const short = calculateDistanceMeters({
    branchLat: -33.8688,
    branchLng: 151.2093,
    currentLat: -33.8698,
    currentLng: 151.2093,
  });
  assert(
    short.error == null && short.data.distanceMeters > 100 && short.data.distanceMeters < 200,
    "Short offset ~111 m (approx)",
  );

  const bad = calculateDistanceMeters({ branchLat: "x", branchLng: 0, currentLat: 0, currentLng: 0 });
  assert(bad.error && bad.error.code === "INVALID_INPUT", "Invalid branchLat returns error");

  const inside = evaluateGeofence({
    distanceMeters: 50,
    accuracyMeters: 10,
    radiusMeters: 150,
  });
  assert(inside.data?.status === "valid", "Inside radius + good accuracy => valid");

  const outside = evaluateGeofence({
    distanceMeters: 200,
    accuracyMeters: 10,
    radiusMeters: 150,
  });
  assert(outside.data?.status === "outside_geofence", "Outside radius => outside_geofence");

  const poor = evaluateGeofence({
    distanceMeters: 10,
    accuracyMeters: 200,
    radiusMeters: 150,
  });
  assert(poor.data?.status === "pending_review", "Poor accuracy => pending_review");

  const noAcc = evaluateGeofence({
    distanceMeters: 10,
    accuracyMeters: null,
    radiusMeters: 150,
  });
  assert(noAcc.data?.status === "pending_review", "Missing accuracy => pending_review");

  const defaultRadius = evaluateGeofence({
    distanceMeters: 100,
    accuracyMeters: 10,
    radiusMeters: undefined,
  });
  assert(
    defaultRadius.data?.status === "valid" && defaultRadius.data.radiusMeters === DEFAULT_GEOFENCE_RADIUS_METERS,
    "Missing radius falls back to default 150m and valid when inside",
  );

  print("CHECK", "getCurrentPositionForClockEvent not executed in Node (browser-only)");
}

run();

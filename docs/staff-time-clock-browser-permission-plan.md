# Staff Time Clock — browser permission & client helper plan

Planning only: defines **future** browser-side wrappers for **active GPS/geofence verification** and **selfie capture**, plus permission UX, **without** changing `StaffTimeClock.jsx` or wiring `navigator.geolocation` / `getUserMedia` in this step.

Related docs:

- `docs/staff-time-clock-mobile-ui-plan.md` — mobile mock UI (no real sensors yet).
- `docs/staff-time-clock-advanced-plan.md` — product model (active checks at clock-in/out; no continuous background tracking by default).
- `src/services/staffTimeClockService.js` — future consumer of coordinates + blobs (`clockInStaff`, `clockOutStaff`, `getStaffTimeSelfieSignedUrl`).

---

## 1) Purpose

Plan **safe**, **explicit** browser APIs for:

- **Current GPS / geofence verification** at the moment the staff member taps Clock In or Clock Out (foreground, user-gesture scoped).
- **Camera / selfie capture** for attendance proof, with explicit start/stop lifecycle.
- **Permission states** and recovery (denied, timeout, retry, route to pending review).
- **Predictable `{ data, error }`** shapes aligned with existing Supabase service style.

**Non-goals for this document:** UI edits, real wiring in `StaffTimeClock.jsx`, SQL/storage changes, service role usage, or calling `clockInStaff` / `clockOutStaff` from the page yet.

---

## 2) Location helper plan

**Future file:** `src/services/locationVerificationService.js`

**Future methods (proposed):**

| Method | Responsibility |
|--------|----------------|
| `getCurrentPositionForClockEvent()` | Invoke **only** from a **direct user action** (e.g. button `onClick`). Wraps `navigator.geolocation.getCurrentPosition` (or `watchPosition` with immediate clear—prefer `getCurrentPosition` for a single fix). Returns `{ data, error }` with latitude, longitude, accuracy (meters), timestamp, and optional `coords` metadata. **No** background polling. |
| `calculateDistanceMeters({ branchLat, branchLng, currentLat, currentLng })` | Pure Haversine (or equivalent) distance in meters between branch centre and current fix. Used for UI preview and for passing `distanceMeters` into `clockInStaff` / `clockOutStaff` (server may revalidate later). |
| `evaluateGeofence({ distanceMeters, accuracyMeters, radiusMeters })` | Returns a structured result: e.g. `{ inside: boolean, statusHint: 'valid' \| 'outside_geofence' \| 'pending_review', reasons: string[] }`. Encodes rules from section 5 (accuracy floor, radius). |

**Rules:**

- Call **`navigator.geolocation` only inside an explicit user action** (tap handler), not on mount, not on interval.
- **No background tracking** — one-shot read per punch intent.
- **Capture current location at clock-in/out event time** — matches product: active verification at each punch.
- Return **`{ data, error }`**; `error` should carry stable `code` / `message` for UI (e.g. `PERMISSION_DENIED`, `TIMEOUT`, `POSITION_UNAVAILABLE`).
- **Always surface `accuracy`** in `data` when available.
- Handle **permission denied**, **timeout**, **unavailable**, and insecure context (no HTTPS) with clear errors.

---

## 3) Camera helper plan

**Future file:** `src/services/selfieCaptureService.js`

**Future methods (proposed):**

| Method | Responsibility |
|--------|----------------|
| `requestCameraStream(constraints?)` | Call **`navigator.mediaDevices.getUserMedia`** only after user taps e.g. “Allow camera” / “Take selfie”. Returns `{ data: { stream }, error }`. |
| `captureSelfieBlob(videoElement)` | Draw frame from live `<video>` to canvas; export **Blob** (e.g. `image/jpeg`) suitable for `clockInStaff` / `clockOutStaff`. Returns `{ data: { blob, suggestedFileName, contentType }, error }`. |
| `stopCameraStream(stream)` | **Always** stop all tracks on cancel, success, or unmount to release camera and avoid battery drain. |

**Rules:**

- **`getUserMedia` only after user action** — never auto-open camera on page load.
- **Stop tracks** after capture, cancel, or navigation away.
- Output **Blob** (or `File`) compatible with `staffTimeClockService` upload parameters.
- Handle **permission denied**, **no camera**, **NotAllowedError**, **OverconstrainedError**, and **iOS / Safari** front-camera constraints conservatively (fallback constraints).

---

## 4) Permission UX states (planned copy / flags)

Map each state to UI later (copy is draft; legal review may refine).

| State | User-facing intent |
|-------|---------------------|
| **Location permission needed** | “To verify you are at your branch when you clock in or out, we need access to your location for this action only. We do not track you in the background.” |
| **Location denied** | “Location is off or denied. Turn on location for this site in browser or system settings, then try again.” |
| **GPS accuracy too low** | “Your location accuracy is low (±Xm). Move outdoors or wait for a better signal, retry, or submit for **pending supervisor review** if your organisation allows it.” |
| **Outside geofence** | “You appear outside your branch geofence. Your punch may be recorded as outside the branch and sent for **pending supervisor review**.” |
| **Camera permission needed** | “We need camera access to take a quick selfie for attendance proof. The camera opens only when you choose to capture.” |
| **Selfie required** | “Clock-in requires a selfie. Capture a photo to continue.” |
| **Selfie capture failed** | “Could not capture image. Retry or cancel and try again.” |
| **Submit as pending review / exception** | “Submit this punch for supervisor review” when GPS or accuracy fails policy but submission is still allowed. |

---

## 5) Geofence rules (client + future server)

- **Branch source:** Read assigned branch **latitude**, **longitude**, and **`geofence_radius_meters`** from app config / profile / branch API when available (see `010` schema intent).
- **Default radius:** Use **150 m** only as a **fallback** when branch radius is missing (matches current `staffTimeClockService` temporary threshold until DB-backed radius is always loaded).
- **Accuracy gate:** If `accuracyMeters` is worse than a configurable threshold (e.g. &gt; 50–100 m, product-tuned), prefer **`pending_review`** rather than **`valid`**, even if raw distance is inside radius.
- **Active check** at **both** clock-in and clock-out — never assume clock-in position applies to clock-out.
- **Do not trust client-only values** for payroll/legal truth: plan for **server-side validation** or derived fields later (edge function / DB); client supplies evidence; RLS already scopes writes.

---

## 6) Integration plan (future `StaffTimeClock` flow)

**Clock In (future):**

1. User taps **Clock In** (gesture).
2. **Location helper** → `getCurrentPositionForClockEvent()` → `calculateDistanceMeters` + `evaluateGeofence`.
3. **Camera helper** → stream → `captureSelfieBlob` → `stopCameraStream`.
4. UI passes `latitude`, `longitude`, `accuracyMeters`, `distanceMeters`, `selfieFile`, `fileName`, `contentType`, `branchId` to **`clockInStaff(...)`** (not called until wiring milestone).

**Clock Out (future):**

1. User taps **Clock Out**.
2. **Location helper** again (new fix) → distance + evaluation.
3. Optional or required second selfie per policy → same camera helper pattern.
4. UI passes payload to **`clockOutStaff(...)`** including `entryId` from open shift discovery (future query or context).

**Signed URLs:** `getStaffTimeSelfieSignedUrl` for review/history previews — supervisor/HQ UI later, not staff mock.

---

## 7) Edge cases

| Topic | Mitigation / note |
|-------|-------------------|
| **iOS Safari** | User gesture required; `getUserMedia` may need `playsinline`, facingMode `user`; test PWA vs Safari tab; watch for frozen `video` until `loadedmetadata`. |
| **HTTPS** | Geolocation and camera require **secure context**; surface a clear error on `http://` localhost exceptions vs production. |
| **Permission denied** | Branch to states in section 4; no retry loop without user going to settings. |
| **Low accuracy** | `pending_review` per section 5. |
| **Wrong branch** | Large distance + product rule; may block or allow exception path. |
| **Clock-out from home** | Second GPS check should show outside geofence — intended fraud reduction. |
| **Poor network** | Queue UX: disable submit until upload completes; retry; align with service cleanup behaviour. |
| **Upload OK, DB fail** (or inverse) | Documented in service layer; UI shows failure and support copy; possible orphan object — ops follow-up. |
| **Duplicate clock-in** | Unique open-entry constraint; UI loads open shift and shows “already on shift”. |
| **Missed clock-out** | Reminder notifications (future); `missed_clock_out` style status. |
| **Remote / approved exception** | Pre-approved flag or supervisor path to `approved_exception` — product workflow. |

---

## 8) Privacy / consent copy (draft)

Short blocks for first-run or pre-punch modal:

1. **Location:** “We check your **location only when you tap Clock In or Clock Out** to confirm you are at your assigned branch. We **do not** run continuous background location tracking by default.”

2. **Selfie:** “A **selfie** is used as **attendance proof** that you are present at the time of the punch. Images are stored securely and only shown to authorised staff for verification.”

3. **Review:** “**HQ or your branch supervisor** may review punches that are outside the geofence, low accuracy, or flagged for review.”

4. **Optional link:** Link to full privacy / retention policy when available.

---

## 9) Recommended next implementation step

**Recommend: C — Implement both `locationVerificationService.js` and `selfieCaptureService.js` with no `StaffTimeClock` UI wiring.**

**Why C over A or B alone:** Clock-in contract needs **both** position and selfie; building one helper in isolation defers integration risks (blob size, timing, permission order) and duplicates test harness work. **Why not D yet:** Wiring the mock UI to real sensors crosses the “permission + device variance” boundary; shipping **helpers first** allows manual QA on real devices (console or minimal dev-only page) without destabilising the polished mock UI. **After C:** small controlled **D** (optional feature flag) or incremental wiring of Clock In only.

---

## 10) Next implementation prompt (copy-paste — Option C only)

```text
Implement Staff Time Clock client helpers only (Option C): locationVerificationService + selfieCaptureService. No StaffTimeClock.jsx UI changes yet.

Constraints:
- Add src/services/locationVerificationService.js and src/services/selfieCaptureService.js only (plus minimal exports if your barrel pattern requires).
- navigator.geolocation and getUserMedia must not be called on module load; only inside functions invoked from future user gestures.
- Return { data, error } consistently; align error shapes with staffTimeClockService style.
- Do not import or call clockInStaff, clockOutStaff, or getStaffTimeSelfieSignedUrl from these helpers.
- Do not change Supabase SQL, storage policies, or staffTimeClockService behaviour in this task unless a tiny shared constant export is unavoidable (prefer duplicate literal with comment).
- Preserve demoRole and all existing demo/local fallback; do not wire helpers into routes yet.

Tasks:
1) locationVerificationService: getCurrentPositionForClockEvent (getCurrentPosition + timeout), calculateDistanceMeters (Haversine), evaluateGeofence (radius from args, accuracy gate -> pending_review).
2) selfieCaptureService: requestCameraStream, captureSelfieBlob from video element, stopCameraStream; handle missing mediaDevices.
3) Document in-file JSDoc: HTTPS requirement, iOS notes, stop tracks always.

Validation:
- npm run build && npm run lint && npm run typecheck
- No npm run test:supabase:* unless Supabase client/schema files change.
```

---

*Document type: planning only. No runtime or UI changes in this file.*

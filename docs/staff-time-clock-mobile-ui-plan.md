# Staff Time Clock — mobile UI plan

Planning and terminology reference for the **staff** clock experience. HQ/supervisor review surfaces are called out separately (desktop-friendly).

## 0) Implementation status

**Implemented (teacher `StaffTimeClock.jsx`):**

- Mobile-first **teacher** flow: large Clock In / Clock Out (**demo:** mock shift, local state only; **signed-in non-demo:** Clock In → `clockInStaff`, Clock Out still local-only until wired), current shift status card, branch + punch preview (mock or post–Supabase clock-in summary), exception / **pending supervisor review** demo messaging, recent clock history.
- **Browser GPS (real, explicit tap only):** “Check clock-in location (GPS)” and “Check clock-out location (GPS)” call `getCurrentPositionForClockEvent` → `calculateDistanceMeters` → `evaluateGeofence` using **labelled placeholder branch coordinates** in the page until Supabase branch geofence fields are wired. **No** `watchPosition`, **no** background tracking, **no** Supabase writes from these buttons.
- **Browser selfie (real, explicit tap only):** “Start camera” → live `<video>` preview → “Capture selfie” uses `requestCameraStream` / `captureSelfieBlob` / `stopCameraStream` from `selfieCaptureService.js`. **No** automatic camera open. Parent holds a **Blob** for non-demo **Clock In** submit. Preview via `URL.createObjectURL`; tracks stopped on Stop / Clear / unmount / full demo reset.
- **Supabase Clock In (non-demo only):** When **not** using `demoRole`, Supabase is configured, profile (or `VITE_STAFF_TIME_CLOCK_DEV_BRANCH_ID`) supplies a **branch UUID**, and staff has run **Check clock-in location (GPS)** plus captured a **selfie**, **Clock In** calls `clockInStaff(...)` (upload + row insert per `staffTimeClockService`). **Clock Out** to `clockOutStaff` is **not** wired from UI yet.
- **HQ** and **branch supervisor** views: **reporting placeholder** card; stacked cards on small screens for demo lists.

**Browser helpers (services):**

- **`src/services/locationVerificationService.js`** — as above; invoked from `StaffTimeClock` only on GPS check button clicks.
- **`src/services/selfieCaptureService.js`** — invoked from `StaffTimeClock` only on **Start camera** / **Capture selfie** (user gestures); `getUserMedia` never on page load.
- **Smoke (pure math only):** `npm run test:staff-time-clock:helpers`

**Still future:**

- **`clockOutStaff`** from UI after a Supabase clock-in; **`getStaffTimeSelfieSignedUrl`** in review/history UI.
- **Real branch** latitude/longitude/radius from Supabase for GPS distance math (UI still uses labelled placeholder centre for checks until wired).
- Supervisor / HQ **review dashboard** with live exception queues, signed-url selfie viewer, and exports.

Related checkpoints:

- `docs/staff-time-clock-advanced-plan.md`
- `docs/staff-time-clock-sql-application-checkpoint.md`
- `docs/staff-time-clock-smoke-test-checkpoint.md`
- `docs/staff-time-clock-roadmap.md`

---

## 1) Correct product model

- **Evidence-based staff attendance** — each clock action binds identity (session), timestamps, branch context, **GPS attendance proof**, and selfie proof where required.
- **Active GPS / geofence verification at clock-in** — when the staff member taps **Clock In**, the app **actively** obtains current device position, compares distance to the **assigned branch** centre using configured radius, and records coordinates, accuracy, computed distance, and status for that event.
- **Active GPS / geofence verification at clock-out** — when they tap **Clock Out**, the app **actively** checks position **again** against the same branch geofence and records clock-out evidence. This reduces the risk of someone clocking out later from home while claiming they were still on site.
- **Selfie proof** — required at clock-in (identity-at-event); clock-out selfie **optional or policy-based** (product toggle later).
- **No continuous background tracking by default** — verification runs in the foreground around the user-initiated clock actions, not as an always-on trail.
- **HQ / branch supervisor** — review exceptions (outside geofence, low accuracy, missing proof, adjustment requests) with auditable outcomes.

**Wording:** Prefer **location verification**, **geofence check**, **GPS attendance proof**, and **evidence recorded at clock-in/out**. Avoid describing the product as merely a passive “location snapshot” system—that understates the intentional **active check at each punch**.

---

## 2) Mobile staff flow

### Clock In

1. Open **Staff Time Clock** on phone (authenticated staff).
2. Tap **Clock In**.
3. Show **assigned branch** name/context.
4. **Request location permission** if needed; obtain a **current** fix for verification.
5. Show **distance to branch**, **accuracy (meters)**, and **geofence result** (inside / outside / uncertain → pending review).
6. **Request camera / selfie** proof (required for clock-in in default policy).
7. **Submit** — call `clockInStaff(...)` with coordinates, accuracy, distance (client-computed vs server-validated is a future hardening note), selfie blob, filename, content type.
8. Show **result**: `valid` / `outside_geofence` / `pending_review` (and short copy for “submitted for review” if applicable).

### Clock Out

1. Tap **Clock Out** (only when an open entry exists).
2. **Request / refresh GPS** again; **re-run geofence check** against branch.
3. **Optional** second selfie or proof per policy.
4. **Submit** — `clockOutStaff(...)`.
5. Show **result** and a compact **hours / shift summary** (e.g. duration since `clock_in_at`).

---

## 3) Permission UX (planned copy / states)

Plan screens or inline messages for:

| Situation | UX intent |
|-----------|-----------|
| **Location permission not granted** | Explain that clock-in/out cannot verify presence at branch without location; offer **Open settings** deep link where possible; **Retry** after grant. |
| **Camera permission not granted** | Explain selfie is required for identity proof at clock-in; same pattern as location. |
| **GPS inaccurate** | Show accuracy value; warn if above threshold; offer **Retry** or **Submit for pending review** if product allows. |
| **Outside geofence** | Clear message: outside branch radius; status `outside_geofence` or review path; no fake “valid”. |
| **Poor network** | Disable submit until retry; show upload progress; preserve captured blob in memory cautiously (memory limits on mobile). |
| **Retry** | Always offer after transient failures (GPS, network, upload). |
| **Submit as exception / pending review** | When policy allows submission despite soft failures (e.g. accuracy borderline), label honestly as pending supervisor/HQ review. |

---

## 4) Mobile-first layout plan

- **Large primary actions** — full-width **Clock In** / **Clock Out** (single dominant CTA per state).
- **Status card** — current shift state (not clocked in / on shift / submitting / error).
- **Branch + distance + accuracy card** — readable typography; no tiny table cells.
- **Selfie preview card** — thumbnail after capture; **Retake** + **Use photo**.
- **Exception warning card** — outside geofence, low accuracy, review queue notice.
- **Recent clock history** — short vertical list or cards; **avoid dense data tables** on phone.
- **Touch targets** — minimum comfortable tap areas; stack actions vertically on narrow widths.

---

## 5) Desktop / HQ distinction

| Surface | Primary device | Notes |
|---------|----------------|--------|
| **Staff clock in / out** | **Phone (mobile-first)** | Permissions, camera, one-hand use. |
| **HQ / supervisor review, reports, exports** | **Desktop / laptop** acceptable | Branch filters, queues, comparison tables, bulk actions. |
| **Branch-categorised reports** | Future | Align with roadmap reporting sections. |
| **Supervisor review UI** | Future | Exception queue, selfie viewer via signed URLs, approve/reject. |

Staff should not depend on desktop to punch; supervisors should not be blocked from reviewing on tablet if needed, but **information density** can assume more width for review tools.

---

## 6) Service integration plan (future wiring — not implemented here)

Map UI actions to existing services (anon client + JWT; RLS enforced):

| UI action | Service |
|-----------|---------|
| After successful clock-in capture | `clockInStaff({ branchId, latitude, longitude, accuracyMeters, distanceMeters, selfieFile, fileName, contentType })` |
| After successful clock-out capture | `clockOutStaff({ entryId, latitude, longitude, accuracyMeters, distanceMeters, selfieFile?, fileName?, contentType? })` |
| View own (or supervisor) selfie in secure viewer | `getStaffTimeSelfieSignedUrl({ entryId, clockType: 'clock_in' \| 'clock_out' })` |

**Open items for implementation phase:** where distance is computed (client vs server), branch assignment source, open-entry discovery before clock-out, and strict file size/type validation before upload.

---

## 7) Edge cases (planning backlog)

- Staff at **wrong branch** (distance large or branch mismatch).
- **Forgot clock out** — open entry reminders; `missed_clock_out` style status (schema already allows related statuses).
- **Duplicate clock in** while shift open — unique open-entry constraint; UI shows “already on shift”.
- **Location denied** — block or exception-only path per policy.
- **Camera denied** — cannot complete default clock-in; explain policy.
- **Low GPS accuracy** — threshold + pending review.
- **Network fails after selfie capture** — retry upload; idempotency / orphan object risks (align with service cleanup behaviour).
- **Selfie upload succeeds but DB write fails** (or inverse) — user messaging + operational cleanup (documented in service layer).
- **Clock-out from home / outside branch** — expected to show outside geofence or fail policy; prevents “pretend still on site”.
- **Approved remote / exception work** — pre-approved exception or supervisor-approved `approved_exception` path.

---

## 8) Wording correction (cross-doc)

Related docs should **not** imply the product is only “passive snapshot attendance.” The intended model is **active GPS/geofence verification at clock-in and clock-out**, with **location evidence stored per event**, and **no default continuous background tracking**. Historical copy in this repo may be updated in the same spirit.

---

## 9) Recommended next implementation step

**Recommend: A — Mobile Staff Time Clock UI mock only** (screens, states, copy, layout per sections 2–4), **still using fake coordinates and fake blobs** or entirely **demo/local** state — **no** `navigator.geolocation` and **no** live `getUserMedia` until a deliberate follow-up.

**Why A first:** Validates information architecture, permission copy placeholders, and service call sequencing **before** browser API edge cases complicate debugging. Option B (real geolocation/camera wrappers) is high-variance across devices and permissions; Option C (supervisor dashboard) matters after staff can produce real exception volume—or can proceed in parallel on a separate branch if resourced.

**Defer B until:** Mobile mock flow is agreed and components know which props/handlers will receive “real” fixes and blobs.

**Defer C until:** Staff submission path is stable enough to seed review queues—or build C against smoke/demo data if needed earlier.

---

## 10) Next implementation prompt (copy-paste — Option A only)

```text
Implement Staff Time Clock mobile UI MOCK only (Option A).

Constraints:
- Do not enable real browser geolocation (no navigator.geolocation in production path yet) unless behind an explicit future flag.
- Do not enable real camera/microphone (no getUserMedia) unless behind an explicit future flag.
- Preserve demoRole and demo/local fallback; placeholder page may stay dual-mode (demo fake tables + future wiring stubs).
- Use existing staffTimeClockService methods only if wiring behind a clear “dev test” or fake-data path; prefer mock handlers returning resolved shapes matching { data, error }.
- No new SQL; no service role key; anon + JWT only when any real call is made.
- Mobile-first layout per docs/staff-time-clock-mobile-ui-plan.md (large CTAs, cards, no dense tables).

Tasks:
1) Update or add staff-facing route UI (e.g. src/pages/StaffTimeClock.jsx) with mobile-first layout: Clock In / Clock Out, branch card, fake distance/accuracy/geofence result display, selfie placeholder card, status/exception cards, recent history list (mock data OK).
2) Add planned permission UX as static/disabled explanatory panels or tooltips (copy only).
3) Cross-link from docs/staff-time-clock-roadmap.md or mobile-first-qa-checkpoint.md if helpful.

Validation:
- npm run build && npm run lint && npm run typecheck
- No npm smoke suite required unless Supabase service files change.
```

---

*Document type: planning + implementation status for the mock UI phase. Mock page does not persist punches to Supabase.*

# Staff Time Clock — mobile clock-in/out flow checkpoint

Checkpoint for the **teacher (staff) mobile-first** punch path: browser GPS/geofence checks, selfie capture, and Supabase **`clockInStaff`** / **`clockOutStaff`** from `StaffTimeClock.jsx`. **`demoRole`** remains **local/mock only** (no Supabase writes).

Related docs:

- `docs/staff-time-clock-mobile-ui-plan.md` — UI plan and implementation status.
- `docs/staff-time-clock-browser-permission-plan.md` — permission model; gesture-scoped GPS and camera.
- `docs/staff-time-clock-smoke-test-checkpoint.md` — Node smoke + service-layer validation (fake blobs only).
- `docs/staff-time-clock-sql-application-checkpoint.md` — SQL foundation (RLS, bucket); not modified by this checkpoint.

---

## 1) What was implemented

- **Teacher `StaffTimeClock` page** (`src/pages/StaffTimeClock.jsx`): mobile-first Clock In / Clock Out, branch + GPS cards, selfie card, mock history and supervisor/HQ placeholders on other roles.
- **Explicit GPS checks** per punch type: **Check clock-in location (GPS)** and **Check clock-out location (GPS)** call `getCurrentPositionForClockEvent` → distance vs a **labelled placeholder** branch centre → `evaluateGeofence` (no `watchPosition`, no background tracking).
- **Explicit selfie flow**: **Start camera** / **Capture selfie** via `selfieCaptureService` (no auto-open camera); blob held in React state until submit.
- **Signed-in, non-demo, Supabase configured**:
  - **Clock In** requires latest **clock-in** GPS result + selfie + resolvable **branch UUID** (`profiles.branch_id` or dev-only `VITE_STAFF_TIME_CLOCK_DEV_BRANCH_ID`); calls **`clockInStaff`**; stores **`supabaseOpenEntryId`** on success; optional confirm when geofence status is `outside_geofence` or `pending_review`.
  - **Clock Out** requires **`supabaseOpenEntryId`**, latest **clock-out** GPS result + new selfie; calls **`clockOutStaff`**; clears open entry and selfie on success; same confirm pattern for marginal geofence results; errors leave the open entry in place for retry.
- **`demoRole`**: mock shift only; no `clockInStaff` / `clockOutStaff`, no uploads.

---

## 2) Files changed across the mobile flow (reference)

These paths form the end-to-end mobile staff clock story (implementation landed across several commits; this table is the **canonical map** for reviewers).

| Role | Path |
|------|------|
| Teacher UI | `src/pages/StaffTimeClock.jsx` |
| Supabase clock + storage | `src/services/staffTimeClockService.js` |
| GPS / Haversine / geofence helpers | `src/services/locationVerificationService.js` |
| Camera stream + capture blob | `src/services/selfieCaptureService.js` |
| Automated regression (fake GPS/blobs) | `scripts/supabase-staff-time-clock-smoke-test.mjs` |
| Mobile UI plan + status | `docs/staff-time-clock-mobile-ui-plan.md` |
| Browser permission + helper contract | `docs/staff-time-clock-browser-permission-plan.md` |
| Smoke test checkpoint | `docs/staff-time-clock-smoke-test-checkpoint.md` |

Supporting pieces (not repeated in every checklist but relevant): `src/services/supabaseClient.js` (anon client), `package.json` script `test:supabase:staff-time-clock`, SQL in `supabase/sql/010_staff_time_clock_foundation.sql` (applied separately per SQL checkpoint).

---

## 3) Staff mobile clock-in lifecycle

1. **Explicit clock-in GPS/geofence check** — User taps **Check clock-in location (GPS)**; one `getCurrentPosition` read; distance and `evaluateGeofence` status shown in UI.
2. **Selfie capture** — User taps **Start camera**, then **Capture selfie**; preview is local until submit.
3. **`clockInStaff` backend submit** — User taps **Clock In** (non-demo only when gates pass); service validates session, inserts `staff_time_entries` with clock-in coordinates, accuracy, distance, status rule, reserved selfie path.
4. **Private selfie storage** — Selfie uploaded to private bucket **`staff-clock-selfies`** (path convention owned by service; anon JWT + RLS-aligned policies — see SQL checkpoint).
5. **Open entry state** — UI keeps **`supabaseOpenEntryId`** (entry `id`) after success so clock-out targets the same row; Clock In disabled while on an open Supabase shift.

---

## 4) Staff mobile clock-out lifecycle

1. **Explicit clock-out GPS/geofence check again** — User taps **Check clock-out location (GPS)**; fresh fix and evaluation (same placeholder centre for distance math until real branch load).
2. **Selfie capture again** — New blob for clock-out proof (clock-in clears prior blob after success).
3. **`clockOutStaff` backend submit** — User taps **Clock Out**; service verifies entry belongs to caller, is still open, stages/finalizes clock-out fields and optional selfie upload per implementation.
4. **Open entry cleared after success** — **`supabaseOpenEntryId`** set to `null`; local shift shows end time; user may start a new cycle with a new clock-in GPS check + selfie.

---

## 5) Safety / privacy

- **No background tracking** — No `watchPosition`; location reads only from explicit check buttons (and only what the browser returns for that call).
- **Active check only on user action** — GPS and camera are not started on page load for this flow.
- **No service role in frontend** — App and smoke scripts use the **anon** client with end-user JWT; no service role key in browser codepaths for this feature.
- **Private `staff-clock-selfies` bucket** — Staff evidence objects are not public URLs from capture; access for review is intended to go through controlled paths (e.g. signed URLs).
- **Parent/student blocked by RLS** — Smoke checkpoint verifies parent/student cannot read `staff_time_entries`; policies live in applied SQL (see SQL checkpoint).
- **`demoRole` stays local/mock** — No Supabase clock writes or selfie uploads when demo role is selected.

---

## 6) Known limitations

- **Real assigned branch geofence coordinates** are **not** loaded from Supabase yet; UI distance math uses a **labelled placeholder** centre and fixed radius for browser checks, while **`branch_id`** for inserts comes from profile/env UUID. Client and server distance rules may need alignment when branch geometry is authoritative.
- **HQ/supervisor** live **review dashboard** is not wired; teacher page still includes **mock** reporting cards for those roles.
- **`getStaffTimeSelfieSignedUrl`** exists in the service but is **not** surfaced in teacher review/history UI.
- **Exception approval workflow** (supervisor decisions on `outside_geofence` / `pending_review` rows) is **not** wired in product UI.
- **Adjustment / correction requests** are **not** wired.
- **Production consent copy and policy** (exact permission strings, regional employment nuances) still need **legal/product final review** beyond engineering placeholders.

---

## 7) Manual preview checklist (non-production)

Use **demo accounts** or a **dedicated dev project** only. Do **not** use real production PII or payment data. Do **not** commit `.env.local`.

- [ ] Log in as **teacher/staff** (not `demoRole`) with Supabase configured and a **valid `branch_id`** (or dev branch env) on the profile.
- [ ] Open **Staff Time Clock**.
- [ ] Tap **Check clock-in location (GPS)**; confirm a result appears (allow location if prompted).
- [ ] **Start camera** → **Capture selfie** (allow camera if prompted).
- [ ] Tap **Clock In**; confirm success toast and **on shift** / open entry behaviour.
- [ ] Tap **Check clock-out location (GPS)**; confirm clock-out result card updates.
- [ ] Capture a **new** selfie for clock-out.
- [ ] Tap **Clock Out**; confirm success toast, shift ended, open entry cleared.
- [ ] Switch to **`demoRole`** (or demo role selector per app): repeat flow and confirm **no** Supabase rows/uploads (local mock only).

---

## 8) Recommended next milestone

**Recommend: load real assigned-branch geofence (latitude, longitude, radius) for the teacher GPS checks** before investing heavily in the HQ/supervisor review dashboard.

**Why:** The mobile product promise is **evidence at the assigned branch**. Until the UI and client-side `distanceMeters` / status use the **same** centre and radius the organisation configures for that branch, staff see misleading “distance to branch” copy, and supervisor review would queue exceptions that may not match operational reality. Shipping **branch-scoped geometry** first makes both **staff trust** and **supervisor triage** meaningful; the review dashboard can then consume consistent coordinates and statuses.

**Alternative:** If the organisation must **audit punches in bulk first** (operations/legal), prioritise **HQ/supervisor Staff Time Clock review dashboard planning** — but plan it **assuming** geofence data will be wired next so filters and maps do not bake in placeholder assumptions.

---

## Validation (this doc change)

- **Docs-only:** `git diff --name-only` should list this file (and no runtime sources).
- **Do not** require `npm run build` / lint / smoke for this checkpoint file alone unless runtime files change in the same commit.

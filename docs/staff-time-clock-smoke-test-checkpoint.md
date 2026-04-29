# Staff Time Clock smoke test checkpoint

This checkpoint records what was validated for Staff Time Clock **after** SQL foundation application in dev, using **service-layer methods**, a **Node smoke script**, and **fake GPS plus fake tiny selfie blobs only**. No app UI wiring, no live browser location, and no camera access are part of this phase.

Scope note:

- Documentation only for this checkpoint file (unless other docs are cross-linked elsewhere in a future change).
- Anon Supabase client + end-user JWT only; no service role key in app or smoke path.

---

## 1) What was implemented

- **`src/services/staffTimeClockService.js`**
  - `clockInStaff(...)` — creates a `staff_time_entries` row for the authenticated staff profile, applies a temporary distance rule for `status`, reserves `clock_in_selfie_path` per key convention, uploads to `staff-clock-selfies`, returns `{ data, error }`.
  - `clockOutStaff(...)` — closes the staff member’s own open entry with clock-out location fields and optional clock-out selfie upload; returns `{ data, error }`.
  - `getStaffTimeSelfieSignedUrl(...)` — reads the entry’s clock-in or clock-out selfie path (when visible under RLS) and creates a short-lived signed URL for the private bucket.
- **`scripts/supabase-staff-time-clock-smoke-test.mjs`**
  - Loads `.env.local` for URL/anon key and demo passwords (never printed).
  - Signs in as teacher demo user, optionally closes any lingering open entries from prior failed runs, picks a visible branch, runs clock-in then clock-out with fake coordinates and fake blobs.
  - Verifies parent/student cannot read `staff_time_entries`, branch supervisor can see the entry when branch scope matches, cleanup of storage objects and row when policy allows.
- **`package.json`**
  - Script: `npm run test:supabase:staff-time-clock`.
- **Docs cross-references** (see section 2) updated to mention service + smoke and fake-data-only constraints.

Temporary geofence rule in service (until branch-specific radius is read from DB):

- `distanceMeters <= 150` → `valid`
- `distanceMeters > 150` → `outside_geofence`

---

## 2) Files changed (checkpoint scope)

| Area | Path |
|------|------|
| Service | `src/services/staffTimeClockService.js` |
| Smoke test | `scripts/supabase-staff-time-clock-smoke-test.mjs` |
| npm script | `package.json` |
| Plan | `docs/staff-time-clock-advanced-plan.md` |
| SQL application checkpoint | `docs/staff-time-clock-sql-application-checkpoint.md` |
| RLS checklist | `docs/rls-test-checklist.md` |

Optional related roadmap note (if present in repo): `docs/staff-time-clock-roadmap.md`.

---

## 3) Clock-in lifecycle proven (smoke)

- Staff signs in with demo teacher credentials (anon auth; passwords from env only, never logged).
- **Fake GPS** values are passed into `clockInStaff` (no `navigator.geolocation`).
- **Fake tiny selfie** `Blob` is uploaded to private bucket `staff-clock-selfies` under the agreed key shape: `{branch_id}/{profile_id}/{date}/{entry_id}-{clock_type}.jpg` (extension may follow sanitized filename).
- A **`staff_time_entries`** row is created with `profile_id` matching the signed-in user, clock-in timestamps/location fields populated, and selfie path aligned with storage policy expectations.
- **`getStaffTimeSelfieSignedUrl`** for `clock_in` succeeds when RLS and storage policies allow the owning staff to read the object path.

---

## 4) Clock-out lifecycle proven (smoke)

- Staff calls **`clockOutStaff`** against **their own** open entry (`entryId` + ownership implied by session and queries).
- **Fake clock-out GPS** and optional **fake clock-out selfie** blob are supplied the same way as clock-in (still no real camera).
- **`clock_out_at`** and clock-out location/selfie fields are set as expected after a successful path; smoke asserts the closed entry shape.
- Trigger/RLS constraints (e.g. immutability of clock-in evidence for staff) are respected by the service flow used in smoke.

---

## 5) Role / RLS proof (smoke expectations)

| Role | Expected |
|------|----------|
| **Teacher (staff)** | Can create and complete own entry; can obtain signed URL for own selfie path when implemented. |
| **Parent** | **Blocked** from reading `staff_time_entries` (e.g. zero rows or policy error as exercised by script). |
| **Student** | **Blocked** from reading `staff_time_entries`. |
| **Branch supervisor** | **Own-branch visibility** for the test entry when the entry’s `branch_id` matches supervisor scope. |
| **HQ** | All-branch review is the **intended** product path; the dedicated smoke script does not require an HQ sign-in block for PASS. Add an explicit HQ read/review assertion in a future smoke iteration if desired. |

---

## 6) Security and privacy notes

- **Anon client + JWT only** — smoke and service use the public anon key with a real user session; no service role in frontend or in this smoke path.
- **No service role key** — do not introduce it for convenience; RLS and storage policies must remain the enforcement layer.
- **Private bucket** — `staff-clock-selfies` is private; access for viewing is via signed URLs (or policy-scoped server paths), not public URLs.
- **Fake data only** in this checkpoint — synthetic coordinates and tiny in-memory blobs; no production PII or real payment/school payloads in the test narrative.
- **No real location or camera** — no `navigator.geolocation`, no `<input type="file">` from real devices in this phase.
- **Snapshot model** — clock-in/out record point-in-time evidence; this design does **not** imply continuous GPS tracking.

---

## 7) What remains (product / engineering)

- **Mobile staff clock-in UI** — tap flow, branch context, error states.
- **Real browser geolocation** — permission UX, accuracy handling, failure modes.
- **Camera / selfie capture UI** — capture, preview, retake, size/type limits.
- **Supervisor / HQ review dashboard** — queues, filters, signed URL viewing in-app.
- **Exception / adjustment workflow** — `staff_time_adjustment_requests` and review outcomes.
- **Privacy / consent wording** — in-product copy and settings aligned to snapshot + selfie retention policy.

---

## 8) Recommended next milestone

**Recommend: Staff mobile clock-in UI planning** (and a thin implementation plan doc: screens, states, offline/failure, and which service methods to call — still without turning on real geolocation/camera until a deliberate follow-up).

**Why this over a generic “master context handoff” doc:** SQL, RLS, storage, service, and smoke are already aligned; the next bottleneck is **user-facing flow and permission UX**. A handoff doc is useful when pausing the project or onboarding a new owner; it does not unblock the next vertical slice (staff actually clocking in from a phone). Planning the mobile UI next keeps the roadmap sequential: define the contract the UI must satisfy (already largely defined), then wire UI to existing `clockInStaff` / `clockOutStaff` with **staged** enablement of real sensors.

Alternative: add a **project master context** doc when you need a single entry point for another developer or a pause in feature work.

---

## Validation (this checkpoint doc)

- Change type: **docs only** (this file).
- Run: `git diff --name-only` — expect only `docs/staff-time-clock-smoke-test-checkpoint.md` (and any intentional doc cross-links if edited in the same commit; prefer keeping this commit to this file only).

Do **not** run the full smoke suite for docs-only edits unless shared auth/RLS/runtime files are intentionally changed in the same change.

---

Checkpoint status: Staff Time Clock **service + smoke test** validated with **fake GPS and fake selfie blobs**; **no UI**, **no live location/camera**, **no new SQL** in this checkpoint.

# Staff Time Clock Roadmap

Planning for staff **punch in / punch out** and related reporting. **Student attendance** remains a separate product area (`attendance_records` and related flows).

**Demo UI (current):** A **placeholder** page exists at **`/staff-time-clock`** (`src/pages/StaffTimeClock.jsx`) for **HQ Admin**, **Branch Supervisor**, and **Teacher** roles only — **local state and fake tables**; **no Supabase writes**, no schema, no clock persistence. **Parents and students** have **no** nav link; the route is not in their allow lists.

**Still future:** authenticated runtime writes, mobile capture flow, and production clock operations.
SQL/storage/RLS foundation at `supabase/sql/010_staff_time_clock_foundation.sql` has now been manually applied in dev checkpoint context.
Reference checkpoint: `docs/staff-time-clock-sql-application-checkpoint.md`.

---

## 1) Product purpose

- **Staff work time:** Record when staff (teachers, supervisors, HQ-linked operational roles, etc.) **start and end** work shifts via the app—distinct from **student attendance** (learner present/absent in class).
- **Clock in / clock out:** Staff tap **Clock In** to record `clock_in_at`; later **Clock Out** records `clock_out_at`. Duration and status are derived for reporting.
- **Oversight:** **HQ** can review organisation-wide staff time patterns and exports (later). **Branch supervisors** review and act on **their branch** only.
- **Trust and payroll alignment:** Designed to support audit trails, corrections with approval, and future export—without claiming payroll/legal compliance until reviewed by the business.

---

## 2) User roles

| Role | Access |
|------|--------|
| **HQ Admin** | View all branches; reports, corrections queue, exports (later); policy-wide settings when introduced. |
| **Branch Supervisor** | View/manage **own branch** staff time records; approve corrections for that branch where policy allows. |
| **Teacher / staff** | **Clock in/out for self only**; view own history; request corrections for own entries (workflow TBD). |
| **Parent / Student** | **No access** to staff time data (RLS and product navigation). |

Role labels should align with `profiles.role` / `app_role`; “staff” may map to `teacher`, `branch_supervisor`, and future staff enums as product defines.

---

## 3) Core workflow

1. Staff member is **authenticated** with a real **profile** (post–Supabase Auth integration for production clock events).
2. Staff opens the time clock experience and taps **Clock In** → persist **`clock_in_at`** (and branch context from profile/assignment).
3. Later, **Clock Out** → persist **`clock_out_at`**; compute **`total_minutes`** (server-side or trusted client rule with server validation).
4. **Status** examples: `normal`, `late`, `missed_clock_out`, `corrected`, `approved`—exact enum to be defined in schema phase.
5. Optional **notes** on clock in/out for context (short text, not essays).
6. **Corrections:** wrong clock time → **staff_time_correction_requests** (or equivalent) → supervisor/HQ **approval** → audited update to the entry.

---

## 4) Future data model (no SQL yet)

### `staff_time_entries`

| Field | Purpose |
|-------|---------|
| `id` | Primary key. |
| `profile_id` | Who clocked; FK to `profiles.id`. |
| `branch_id` | Branch scope for RLS and reports. |
| `role` | Recorded copy of `profiles.role` at clock-in (optional audit field if roles change). |
| `clock_in_at` | Timestamptz. |
| `clock_out_at` | Timestamptz; nullable until clock out. |
| `total_minutes` | Derived duration; nullable until closed. |
| `status` | e.g. normal / late / missed_clock_out / corrected / approved. |
| `clock_in_note`, `clock_out_note` | Short optional text. |
| `created_at`, `updated_at` | Audit. |

**Optional later columns:** `device_info` (sanitised), `ip_hash` (hashed, not raw IP), `location_label` (coarse, e.g. “North branch” not GPS), `approved_by_profile_id`, `approved_at`, `correction_reason`.

### `staff_time_correction_requests`

- Links to `staff_time_entries`; fields such as `requested_by_profile_id`, `reason`, `proposed_clock_in_at` / `proposed_clock_out_at`, `status` (pending/approved/rejected), `reviewed_by_profile_id`, `reviewed_at`.

### `staff_shift_schedules` (optional, later)

- Expected start/end per profile or role per branch/day—powers “late” detection and roster vs actual views.

---

## 5) RLS / access model

- **HQ:** Select/insert/update (or approve-only updates) across all branches per product rules.
- **Branch supervisor:** Select/approve/update for rows where `branch_id` matches their branch; no cross-branch reads.
- **Staff (teacher etc.):** Insert own rows; select own rows; **no** direct update of **approved** rows—corrections via request flow.
- **Parent / student:** **No policies** granting access (default deny).

All enforcement at **Postgres RLS**; UI checks are never sufficient.

---

## 6) Privacy and safety

- **Clock-in/out GPS attendance proof:** product intent is **active verification** at each punch against branch geofence (see `docs/staff-time-clock-mobile-ui-plan.md`), **not** continuous background tracking by default. Store only what policy requires for audit and review.
- **Avoid unnecessary extra precision** in UI copy and retention (e.g. do not expose raw traces); prefer **branch** context and coarse labels where full coordinates are not needed on screen.
- **Do not store or expose raw** device fingerprints or exact IPs in client-visible fields; if logged, use **hashes** or aggregated metadata with retention policy.
- **Correction + approval** for edits to sensitive times; append-only or event log optional later.
- **RLS** on every table above; **no service role** in the browser; clock writes go through **authenticated user JWT** only.

---

## 7) Reporting (future)

### HQ reporting (branch-categorised)

- **All branches overview** — organisation-wide summary cards first.
- **Branch filter** — narrow all report widgets/tables by selected branch.
- **Branch-grouped staff time table** — grouped sections per branch with staff rows under each branch.
- **Branch-level summaries** — totals, late arrivals, missed clock-outs, and open corrections by branch.
- **Monthly branch comparison (later)** — compare total hours / late patterns across branches.

### Branch Supervisor reporting (own branch only)

- **Branch daily staff attendance** — who clocked in/out for today in that branch.
- **Late arrivals queue** — actionable list for follow-up.
- **Missed clock-outs queue** — open punch rows needing closure/correction.
- **Pending correction requests** — review list scoped to supervisor’s branch only.

### Teacher / staff reporting (self only)

- **Own clock in/out actions** — staff can punch for themselves only.
- **Own daily status** — on-time/late/open punch status.
- **Own recent history** — personal recent entries list.
- **Correction request flow (later)** — request changes for own entries only.

### Future HQ report structure

- **Overall summary cards**
- **Branch-grouped report sections**
- **Staff rows nested under each branch**
- **Filters:** branch / date / month / status
- **Export later** (after storage/RLS review)

---

## 8) Relationship to existing app

- **Separate from student attendance:** Student records stay in **`attendance_records`** (or successor); staff time lives in **`staff_time_entries`** (or renamed table)—no mixing in one row type.
- **Teacher KPI:** Staff hours and punctuality can **feed** KPI dashboards later as an aggregated signal—design joins carefully to avoid leaking raw clock data into parent-facing surfaces.
- **Depends on real auth:** Clock in/out must bind to **`profiles.id`** and RLS; **implement after** reliable **Supabase Auth + `AppLayout` integration** (see `docs/supabase-auth-route-guard-integration-plan.md`) so punches are not anonymous or demo-only in production. **`demoRole`** can still drive **fake** clock demos in non-prod if ever needed.

### Data model implication for branch categorisation

- `staff_time_entries` should include both:
  - `branch_id` (for branch categorisation and report filtering)
  - `profile_id` (for identity binding and self-scope checks)
- Reporting queries should use `branch_id` as a first-class scope/filter dimension.
- RLS target model:
  - **HQ:** all branches
  - **Branch Supervisor:** own branch only
  - **Staff:** own records only
  - **Parent / student:** blocked

**Current note:** `/staff-time-clock` remains a demo placeholder only. Real branch-categorised reporting comes after `staff_time_entries` SQL + RLS implementation.

---

## 9) Recommended implementation order

| Phase | Focus |
|-------|--------|
| **1** | This roadmap + **schema gap review** vs `001_mvp_schema.sql` (confirm no overlap with existing tables). |
| **2** | **SQL patch:** `staff_time_entries` (+ enums), RLS, indexes; optional `staff_time_correction_requests`. |
| **3** | **Service layer:** write/read methods behind `supabase*Service`; no page wiring until RLS tested. |
| **4** | **Minimal UI:** staff clock in/out only; loading/error states; fake users first. |
| **5** | **HQ / supervisor** report views (read-heavy); export stub later. |
| **6** | **Correction / approval** workflow + notifications (product-dependent). |

---

## 10) Next recommended action

**Run manual review + role-based validation for `supabase/sql/010_staff_time_clock_foundation.sql`, then align Phase 3C auth hardening before runtime clock services.**

**Why:** Punch events must attach to the **real logged-in `profile_id`** with enforceable RLS. Until non-demo sessions reliably reflect Supabase `profiles` with RLS-tested inserts, clock data would be ambiguous. Schema design (Phase 1–2) can proceed in parallel on paper; **replace the demo placeholder** with real services only after auth/write phases.

## 11) 010 draft checkpoint note

- Added draft file: `supabase/sql/010_staff_time_clock_foundation.sql`.
- Draft includes:
  - additive branch geofence columns
  - `staff_time_entries` table (evidence fields)
  - optional `staff_time_adjustment_requests`
  - RLS draft policies (HQ/branch supervisor/staff scope)
  - private `staff-clock-selfies` bucket + draft storage policies
- Not included in this patch:
  - runtime UI/service clock implementation
  - live location/camera integration
  - automatic SQL apply
- Current application status:
  - manually applied in dev project
  - runtime/service/UI still pending by design

## 12) Service + smoke checkpoint note

- Added service file: `src/services/staffTimeClockService.js`
  - `clockInStaff(...)`
  - `clockOutStaff(...)`
  - `getStaffTimeSelfieSignedUrl(...)`
- Added smoke script: `scripts/supabase-staff-time-clock-smoke-test.mjs`
- Added package command: `npm run test:supabase:staff-time-clock`
- Test scope remains fake GPS inputs and fake tiny selfie blobs only.
- No app UI clock-in wiring and no real location/camera runtime integration in this phase.

## 13) Mobile UI plan reference

- Staff punch UX and terminology: **`docs/staff-time-clock-mobile-ui-plan.md`**
- Next implementation step recommended there: **mobile UI mock** (fake GPS/selfie path) before live browser sensors.

---

*Document type: planning + checkpoint notes. Demo **Staff Time Clock** UI is a non-persistent prototype; migrations and real clock persistence are not implied by the placeholder alone.*

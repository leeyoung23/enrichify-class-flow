# Parent onboarding / student linking — readiness plan

Date: 2026-05-06  
Type: product + architecture documentation (no SQL/RLS changes in this pass)

## Purpose

Prepare SaaS production rollout where **HQ / Branch Supervisor remain the source of truth** for official student identity, branch/class/programme, enrolment, and **guardian↔student linkage**. Parents authenticate and see **only** children linked via approved data (`guardian_student_links`). This document captures **current architecture**, **recommended v1 behaviour**, **privacy boundaries**, and **deferred work** (invite codes, compliance).

---

## Current architecture (as implemented in codebase + schema)

### Identity

| Concept | Tables / mechanism |
|--------|---------------------|
| Authenticated user | `profiles` (`id` ↔ Supabase `auth.uid()`, `role`, `branch_id`, etc.) |
| Parent persona | `profiles.role = 'parent'` plus optional **`guardians`** row (`guardians.profile_id` → `profiles.id`) |
| Student record | `students` (branch, class, official fields) |
| Guardian ↔ student access boundary | **`guardian_student_links`** (`guardian_id`, `student_id`, relationship metadata) |

### RLS / helper proving parent–child access

- **`public.is_guardian_for_student(student_id uuid)`** (`supabase/sql/002_rls_helper_functions.sql`): exists path `guardians` → `guardian_student_links` where `g.profile_id = auth.uid()` and link matches `student_id`.
- **`students_select`** allows read when `public.is_guardian_for_student(id)` among other roles (`003_rls_policies_draft.sql`).
- App-layer duplicate check: **`canAccessStudentRecord`** in `src/services/permissionService.js` — for parents, requires demo/production **links** array matching `guardian_parent_id` and `student_id`.

### How ParentView chooses a child today

- URL query **`?student=<uuid>`** is primary; resolver **`resolveParentViewTargetStudentIdForParent`** (`ParentView.jsx`) may fall back to demo/synthetic context when `demoRole`/fixtures apply.
- Student payload is loaded via **`getStudentById`** → **`listStudents`** / Supabase **`getStudents()`** under RLS; access is enforced with **`canAccessStudentRecord`** and guardian link rows.

### Who can create or change official records (intent vs implementation)

- **Product rule:** HQ / Branch Supervisor own official student profile, branch/class/programme, enrolment posture, and guardian links.
- **Schema:** `students`, `guardians`, `guardian_student_links` exist; **draft RLS file** in repo focuses heavily on **SELECT** policies — **any INSERT/UPDATE policies for production must be verified in the deployed Supabase project**, not assumed from this repo alone.
- **Frontend:** Staff-facing flows (e.g. `Students.jsx`) can create students where wired to write services; **parents have no “create student” or “pick class for my child” flow** in product intent; ParentView blocked states reinforce **centre-managed linking**.

### Can a parent self-link or self-create a student today?

- **Self-create official student:** Not supported as a parent-facing product path; staff flows own student creation where implemented.
- **Self-assign class / enrolment:** Not exposed as a parent action; class remains on `students` under staff control.
- **Self-link guardian row:** No dedicated parent-facing “link my account to this student code” UI in this pass; linkage remains **operational / staff-side** or seed/fixture data unless a future invite workflow is added.

### Behaviour when a parent has no linked student

- Navigating **`/parent-view`** without **`?student=`** shows a **warm blocked state** (no technical IDs): explains that the **centre links** the parent account to the child’s profile; **contact the centre** if something looks wrong.
- With **`?student=`** but **no guardian link** or **RLS denial**: blocked state distinguishes **access not granted** from **missing query**; still **no** class picker or student creation.

---

## Product rules (enforced in UX copy + architecture intent)

1. **HQ / Branch Supervisor** is source of truth for: student profile, branch, class, programme, enrolment status, guardian/parent link.
2. **Parent may:** sign in; view **only** linked child/children; manage **communication preferences** where implemented; upload homework/payment proof **only** where module policy allows.
3. **Parent may not:** create official student records; assign or change class membership; see unrelated children; edit branch/class/programme/guardian ownership; bypass staff approval/release gates.
4. **Teacher may:** view assigned/scoped students; record learning evidence in approved modules; **not** edit official guardian/class/billing identity fields.

---

## Recommended v1 operational flow (no full invite engine required)

1. **Staff creates / maintains** the canonical `students` row (branch, class, programme, enrolment as applicable).
2. **Staff creates** parent auth account (or existing parent signs in after provisioning) and **staff creates** `guardians` + **`guardian_student_links`** for the correct student(s).
3. Parent receives **out-of-band** instruction (centre policy — **not** implemented as email/SMS in app): e.g. sign-in link + “open Parent Dashboard with the link we sent you” if product uses deep links with `?student=`.
4. **RLS + app checks** ensure only linked students appear actionable.

---

## Future: invite code / magic link (deferred)

- **Concept:** One-time or staff-issued token ties `profiles` ↔ `students` without exposing other families’ data.
- **Requires before build:** threat model, rate limits, audit events, revocation, **legal/compliance** sign-off, and **RLS-safe** server implementation (not service-role in browser).
- **Not implemented** in this readiness pass unless an existing safe foundation is extended deliberately.

### Class assignment ownership

- Only **staff roles** with branch/student write policy may set `students.class_id` / enrolment; parents never choose class in ParentView.

---

## Legal / compliance (before real parent rollout)

- DPIA / child-data processing agreements for production regions.
- Parent communication consent and notification preference policy (see notification preference SQL foundations).
- Evidence retention and media handling — **out of scope** for this doc’s implementation pass.
- **No** marketing email/SMS from this milestone; centre-operational comms policy remains separate.

---

## What is required before real rollout

- [ ] Deployed Supabase **write policies** reviewed for `students`, `guardians`, `guardian_student_links` (parents must not insert/update links).
- [ ] Operational runbook: how staff creates guardian links and how parents are onboarded **without** self-service abuse.
- [ ] **Legal/compliance** sign-off.
- [ ] Optional: dedicated smoke script for guardian/parent RLS (none in `package.json` at this checkpoint — rely on manual UAT + existing read smokes).

---

## Related files

- `src/pages/ParentView.jsx` — target student resolution + no-linked / denied UX.
- `src/services/permissionService.js` — `canAccessStudentRecord`.
- `supabase/sql/001_mvp_schema.sql` — `guardians`, `guardian_student_links`, `students`.
- `supabase/sql/002_rls_helper_functions.sql` — `is_guardian_for_student`.
- `docs/project-master-context-handoff.md` — checkpoint summary.

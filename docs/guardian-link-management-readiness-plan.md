# Guardian link management — readiness plan (staff write path)

Date: 2026-05-06  
Type: planning-first (no SQL/RLS or write implementation in this pass unless explicitly approved later)

## Purpose

Define **safe product policy**, **technical prerequisites**, and an **implementation sequence** for HQ / Branch Supervisor–managed **`guardians`** and **`guardian_student_links`** — without parent self-linking, without teacher editing, without invite-code/email flows in v1, and with **auditability** and **immediate access revocation** on unlink.

---

## Current state (repository snapshot)

### Read path (implemented)

- **`/students`** shows read-only **Guardian link** status via `getStaffGuardianLinkSummaries` / `getGuardianLinkSummaryByStudentIds` (`dataService`, `supabaseReadService`, `Students.jsx`).
- **HQ / Branch Supervisor:** counts + minimal `profiles` fields when RLS allows.
- **Teachers:** Supabase sessions typically **Unavailable** for guardian row reads under draft `guardian_links_select` in `003_rls_policies_draft.sql` (teachers excluded); demo fixtures still show linked/not linked.

### Write path (not implemented in app)

- **`supabaseWriteService.js`:** **No** helpers to insert/update/delete **`guardians`** or **`guardian_student_links`** (only unrelated `guardian_profile_id` usage elsewhere).
- **`003_rls_policies_draft.sql`:** Defines **`guardians_select`** and **`guardian_links_select`** only — **no INSERT/UPDATE/DELETE policies** for these tables in this draft file.
- **Deployed Supabase:** Must be verified independently — production may have stricter or additional policies than the repo draft.

---

## Diagnosis — write capability (answers)

1. **Write helper today?** **No** application helper exists for creating/updating guardian rows or guardian–student links.

2. **Which roles can mutate links under repo draft SQL?** With **RLS enabled** and **only SELECT policies** defined for `guardians` / `guardian_student_links` in `003_rls_policies_draft.sql`, **authenticated inserts/updates would be denied by default** unless service role or bypass is used, or **other migrations** add policies. **Must confirm deployed project.**

3. **Does deployed schema “likely” support staff-created links?** **Unknown without migration audit.** Schema tables exist (`001_mvp_schema.sql`); seed/fixture scripts insert links (`005_fake_seed_data.sql`, `019_ai_homework_deployed_regression_fixture.sql`). **Operational writes require explicit HQ/supervisor INSERT policies or SECURITY DEFINER RPC** scoped by branch — **not proven** in repo draft alone.

4. **Fields to link a parent profile to a student:** Minimum viable path: **`guardians`** row (`profile_id` → existing parent **`profiles.id`**) + **`guardian_student_links`** row (`guardian_id`, `student_id`, optional `relationship`, `is_primary`). **`profiles.role`** should be **`parent`** for product consistency.

5. **Identify parent by email today?** **`profiles.email`** exists and can support **staff-only search** if SELECT policy allows HQ/supervisor to query profiles by branch/global scope. **UX:** staff paste/select email → resolve profile → link. **Privacy:** search must be **scoped** (no cross-branch fishing for supervisors); rate-limit and audit reads in a future implementation.

6. **Parent profile does not exist yet:** **Out of band:** create Supabase Auth user + **`profiles`** row with role `parent` (existing internal process — **not** automated in this plan). **App cannot “link” until `profiles.id` exists.** Optional future: staff-only “request account creation” checklist without sending email from app.

7. **Unlink semantics:** **Recommended v1:** **`DELETE`** from **`guardian_student_links`** (or unlink single `(guardian_id, student_id)` row). **Immediate effect:** `is_guardian_for_student` becomes false → ParentView / RLS lose access to that student. **Soft-delete / inactive flag:** only if schema adds `revoked_at` — **prefer hard delete of link row** for clarity unless compliance requires retention (then **inactive + audited**, still blocking SELECT via policy).

8. **Audit events (recommended types):** Use append-only **`audit_events`** (`033_audit_events_foundation.sql`) with **`action_type`** / **`entity_type`** conventions, e.g.:

   - `guardian_link.created` — entity_id = `guardian_student_links.id` or composite surrogate in metadata
   - `guardian_link.removed`
   - `guardian_link.updated` (e.g. relationship / primary flag only)

   Payloads: **no secrets**; include `student_id`, `branch_id`, `actor_profile_id`, optional hashed/target profile id references per existing audit hygiene.

9. **Safest HQ / Branch Supervisor UI:** Read-only directory **already done** → next: **modal or side panel** on `/students` with **Confirm + audit preview**: “Link [profile display] to [student]?” **Branch supervisor:** only students where `students.branch_id = user.branch_id`. **No** bulk link across branches for supervisors. **No** teacher-facing edit controls.

10. **Deferred to invite-code phase:** Time-limited tokens, redemption audit trail, optional magic-link URL, anti-enumeration, rate limits — **after** baseline staff-managed linking and audit smoke coverage.

---

## Product policy (design)

| Actor | Guardian link management |
|-------|---------------------------|
| **HQ Admin** | May **create / remove / adjust** guardian links for students **globally** (subject to deployed RLS write policies). |
| **Branch Supervisor** | May **create / remove / adjust** links **only** for students in **`students.branch_id`** matching supervisor branch. |
| **Teacher** | **View** limited status only (today: often **Unavailable** on Supabase); **never** edit links. |
| **Parent** | **Cannot** self-link; **no** `/students`; **no** link APIs from parent session. |
| **Parent (no linked child)** | ParentView **contact centre** copy remains (existing behaviour). |

### Non-functional requirements

- **Audit:** Every link create/remove/update recorded **before or atomically with** data change (best-effort insert via existing write patterns).
- **Revocation:** Removing a **`guardian_student_links`** row **immediately** removes portal access to that child (RLS + `is_guardian_for_student`).
- **Future invite-code:** **Time-limited**, **single-use or scoped reuse**, **auditable**, **no** widening of parent self-service without legal review.

### Legal / compliance

- Parent/child data minimisation; purpose limitation for profile search.
- Document retention for audit rows per jurisdiction.
- Real parent rollout still requires **policy/legal signoff** (see parent onboarding plan).

---

## Recommended implementation sequence

1. **Confirm deployed RLS** for `guardians`, `guardian_student_links`: INSERT/UPDATE/DELETE for `hq_admin` and branch-scoped `branch_supervisor`; **deny** parent/teacher writes.
2. **Staff read-only parent profile lookup** by email (scoped RPC or filtered query) — **search only**, no write.
3. **Link:** Insert or reuse **`guardians`** for `profile_id`, then insert **`guardian_student_links`** — preferably via **single SECURITY DEFINER RPC** with branch checks.
4. **Unlink:** Delete link row (or approved soft-delete) inside same policy constraints.
5. **Audit:** Emit **`guardian_link.*`** events via `insertAuditEvent` / existing patterns in `supabaseWriteService.js`.
6. **Smokes:** HQ link/unlink; supervisor branch-scoped + cross-branch negative; teacher/parent blocked; ParentView access gained/lost (read-only assertions).
7. **Later:** Invite-code flow on top of audited staff baseline.

---

## Explicit deferrals (this planning pass)

- No invite-code system.
- No outbound email/SMS invitations from app.
- No teacher edit UI.
- No service-role frontend.
- No RLS weakening.
- No implementation of write APIs until deployed policies/RPC are confirmed.

---

## Related documents

- `docs/parent-onboarding-student-linking-readiness-plan.md`
- `docs/student-profile-learning-notes-foundation-plan.md`
- `supabase/sql/001_mvp_schema.sql`, `003_rls_policies_draft.sql`, `033_audit_events_foundation.sql`

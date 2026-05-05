# Homework upload smoke — fixture stability checkpoint

Date: 2026-05-06  
Type: smoke test + documentation (no RLS/SQL change)

---

## Root cause

`scripts/supabase-homework-upload-smoke-test.mjs` is **parent-first**: it resolves the parent’s `linked_student_id` (or a fallback student) and creates tasks/submissions in that student’s `branch_id` / `class_id`.

The **Branch Supervisor** visibility assertion then signs in as `supervisor.demo@example.test` and calls `listHomeworkSubmissions` expecting to see the new submission. RLS only returns homework rows the supervisor is allowed to see for their **supervised branch**. If the parent-linked student lives in a **different** branch than the supervisor account supervises, the row is **correctly hidden** — this is **fixture/scope drift (B)**, not an application regression (A) and not a broken RLS policy when policy is branch-scoped.

The **direct `homework_feedback` insert** as supervisor was also **RLS-blocked** in that environment: product policy may restrict feedback draft creation to teacher/HQ only; the script already treated that as **CHECK**, not failure.

**Unrelated parent/student** checks skipped on invalid login are **(E) missing/optional credentials** in `.env.local` — pre-existing, not hidden.

---

## Chosen fix (Preferred #1 + #2 combined)

1. **Early scope probe (alignment with assignment-write intent):** After the parent-linked student is known, sign in as Branch Supervisor and run `select("id").eq("id", parentLinkedStudent.id).maybeSingle()`. If RLS returns no row, the parent fixture is **outside** the supervisor’s visible scope.  
2. **Skip supervisor-only assertions** when the probe fails — log **CHECK** with explicit “fixture scope” explanation. **Do not** increment `failureCount` for that path.  
3. **Preserve hard failures** for: parent/teacher upload path, unrelated parent/student isolation when credentials exist, and supervisor visibility when the probe **passed** but the list is still empty (true regression signal).

**No SQL/RLS change.** **No** broadening of supervisor policies.

---

## Product policy (homework access model)

| Role | Scope |
|------|--------|
| **Parent** | Own child’s tasks/submissions (guardian link), **released** feedback, **released** marked files; **not** staff drafts, internal notes, or unreleased marked work. |
| **Teacher** | Class/student assignments per existing RLS. |
| **Branch supervisor** | **Branch-scoped** review where policy allows; must not see other branches’ rows. |
| **HQ** | Broader read where policy allows. |
| **AI/OCR (future)** | Draft-only, teacher-approved, **no** auto-release. |

---

## What protects SaaS readiness

- CI no longer **false-fails** on cross-branch demo fixtures while still enforcing **core upload** and **isolation** checks.  
- When the fixture **aligns**, supervisor **PASS** still proves branch-scoped visibility.  
- RLS remains the source of truth; the smoke **adapts** to multi-branch test data.

---

## Remaining CHECK lines (expected)

- **Unrelated** parent/student: skipped if env credentials invalid — document in `.env.example` / internal runbook.  
- **Supervisor** path skipped when parent-linked student is not in supervised branch — fix by linking `parent.demo@example.test` to a student in the **same** branch as `supervisor.demo@example.test`, or add env-driven student override (future hardening).

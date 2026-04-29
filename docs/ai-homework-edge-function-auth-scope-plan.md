# AI Homework Edge Function Auth/Scope Plan

Planning scope:

- Docs/planning only.
- No UI/runtime/function implementation changes in this step.
- No SQL/RLS changes in this step.

## 1) Current limitation

- Stub only checks Authorization header presence.
- No JWT claim verification yet.
- No role/scope checks yet.
- No submission/task/student/class relationship checks yet.

## 2) Security goal

Goal: only authorised staff can generate AI homework draft feedback.

- Parent/student must not trigger homework marking draft generation.
- Teacher should only generate drafts for assigned-class submissions.
- Branch supervisor should only operate within own branch.
- HQ can operate across branches by policy.
- Generated output remains draft-only and approval-gated.

## 3) Auth approach options

### A) Verify Supabase JWT inside Edge Function (`auth.getUser` / token validation)

- Validate bearer token authenticity and active user identity server-side.
- Resolve user profile/role/branch context from Supabase.
- Best for explicit authentication boundary and clean auth errors.
- Requires additional role/scope lookup query flow after token validation.

### B) Use Supabase client with user JWT and rely on RLS-protected reads

- Pass caller JWT through Supabase client in Edge Function.
- Perform relationship/context queries through existing RLS policies and helper functions.
- Strong least-privilege pattern when RLS coverage is sufficient.
- Keeps authorization logic closer to data model constraints.

### C) Service-role backend lookup with explicit checks

- Server-side service role can bypass RLS, then apply custom logic manually.
- High flexibility, but higher misuse risk if checks are incomplete.
- Should not be default MVP path for this function.

### Recommended MVP approach

Recommend **A + B combined**:

1. Verify JWT/user identity first in Edge Function (A).
2. Run relationship/context reads using caller JWT and RLS constraints (B).

Why:

- Establishes explicit auth validation plus data-layer scope protection.
- Avoids default dependence on service role.
- Aligns with current project rule: frontend never receives service-role key.

Important note:

- If service role is ever used later (e.g., specific internal-only audit utility), it must remain server-only, narrowly scoped, and heavily guarded with explicit allowlists and audit coverage.

## 4) Required relationship checks

Planned checks before draft generation:

1. `homeworkSubmissionId` exists and is accessible to requester.
2. `homeworkTaskId` matches the submission’s `homework_task_id`.
3. `studentId` matches the submission’s `student_id`.
4. `classId` matches submission/task class linkage.
5. Branch alignment is consistent (`submission.branch_id` and task/class branch path).
6. Requester role is resolved from authenticated profile.
7. Teacher is assigned to class.
8. Branch supervisor belongs to same branch.
9. HQ role is allowed across branches.

Failure behavior:

- Return `404` when target record is missing/inaccessible.
- Return `403` when role/scope is known but denied.

## 5) Role behavior

Teacher:

- Allowed only for assigned-class submission scope.

Branch supervisor:

- Allowed only for own-branch scope.

HQ:

- Allowed across branches.

Parent:

- Blocked (`403`).

Student:

- Blocked (`403`).

demoRole:

- Not relevant to Edge Function authorization.
- Frontend demo/local mode should continue avoiding Edge Function calls.

## 6) Context retrieval strategy

After auth/scope passes, fetch minimum-needed context only:

- Homework task metadata (title/instructions/subject/due date).
- Homework submission metadata (submission note/status/timestamps where needed).
- Class/student linkage metadata.
- Curriculum/student profile context if safely available by scope.
- Uploaded file metadata only in first phase.

Initial exclusion:

- No file content parsing/OCR in this phase.

## 7) Error behavior

Planned error codes:

- `401` missing/invalid auth.
- `403` role/scope denied.
- `404` submission/task not found or not accessible.
- `400` invalid request payload.
- `500` unexpected internal error.

## 8) Data minimisation

For prompt/context assembly:

- No payment data.
- No staff time clock data.
- No unapproved Memories/media.
- No `internal_note` unless teacher-only and justified for safety.
- No raw IDs in prompt text.
- No unnecessary student personal data.

## 9) Teacher approval gate

Must remain unchanged:

- Function returns draft only.
- UI populates editable fields only.
- Function does not save/release feedback.
- Release path remains existing human workflow.

## 10) Testing plan

Future authorization/scope tests:

- Missing auth -> `401`.
- Invalid token -> `401`.
- Parent/student blocked -> `403`.
- Teacher assigned class allowed.
- Teacher unrelated class blocked.
- Branch supervisor own branch allowed.
- Branch supervisor other branch blocked.
- HQ allowed.
- Relationship mismatch blocked.
- Output shape unchanged (`{ data, error }`, draft-only payload fields).

## 11) Implementation sequence

Phase 1: this plan.  
Phase 2: Edge Function auth/scope helper implementation with mock output.  
Phase 3: local/stub tests for role/scope scenarios.  
Phase 4: frontend service wrapper to call Edge Function stub.  
Phase 5: real provider adapter later.

## 12) Recommended next milestone

Recommendation: **Edge Function auth/scope helper implementation with mock output**.

Why this next:

- Strengthens security boundary before frontend wiring.
- Keeps provider integration disabled.
- Keeps output mock/draft-only.
- Prepares safe path for future real provider integration.

## 13) Next implementation prompt

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement Edge Function auth/scope helper logic for generate-homework-feedback-draft (mock output only).

Hard constraints:
- Do not change app UI.
- Do not change Supabase SQL or RLS.
- Do not call real AI provider APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not auto-save or auto-release feedback.
- Keep demo/local frontend fallback behavior.
- Use fake/dev data only.

Implementation scope:
1) In the existing Edge Function handler, add JWT verification (missing/invalid -> 401).
2) Resolve requester profile role/branch context with safe server flow.
3) Enforce role gates:
   - teacher assigned class only
   - branch supervisor own branch only
   - HQ allowed
   - parent/student denied
4) Enforce relationship checks:
   - submission/task/student/class consistency
   - branch alignment
5) Keep deterministic mock draft response and existing output shape.
6) Keep provider integration disabled.
7) Add/update local test coverage for role/scope outcomes.
8) Add/update checkpoint docs for this phase.

Validation efficiency:
- Run `git diff --name-only` first.
- If runtime files changed, run build/lint/typecheck + targeted AI stub tests only.
- Do not run unrelated suites.
```

## 14) Implementation checkpoint (auth/scope helper added)

- Edge Function handler now supports injected auth/scope resolver flow and fail-closed behavior.
- `index.ts` now wires a Supabase JWT + RLS-safe resolver path for:
  - token/user verification,
  - role gating,
  - submission/task/student/class relationship checks,
  - branch/class alignment checks.
- Role enforcement now blocks parent/student and non-staff roles for AI homework draft generation.
- Function output remains deterministic mock-only draft response; no provider call is introduced.

Current implementation boundaries:

- Still no real provider integration.
- Still no provider key usage.
- Frontend `Homework` page remains on local mock path in this phase.
- Teacher approval gate remains mandatory before any save/release workflow actions.

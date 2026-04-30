# AI Homework Edge Function Dev Fixture Alignment Plan

Scope: planning/documentation only for fake/dev fixture alignment to unlock live deployed auth/scope regression coverage.

## 1) Current deployed regression status

- Live function is reachable in Supabase dev (`generate-homework-feedback-draft` deployed).
- Blocking auth/role cases pass in deployed regression:
  - missing auth -> `401`
  - invalid token -> `401`
  - parent blocked -> `403`
  - student blocked -> `403`
- Allowed staff cases currently `CHECK`-skip due missing accessible fake homework submission fixture:
  - assigned teacher
  - branch supervisor own-branch
  - HQ
- Relationship mismatch cases currently `CHECK`-skip due missing allowed-role fixture.

## 2) Product/security purpose

Before real provider integration, live staff allowed paths must be proven in deployed regression.

Why this matters:

- Child/student data boundary must show both sides:
  - allowed staff roles can access in-scope fixture payloads
  - disallowed roles remain blocked
- Relationship mismatch defenses must be verified against live function behavior, not only local assumptions.
- Fake/dev fixtures provide proof of scope correctness without using real student/parent/staff/school data.

## 3) Required fake fixtures

Prepare fake/dev-only fixtures with stable linkage and branch/class ownership:

- Users/profiles:
  - HQ admin user
  - branch supervisor user
  - assigned teacher user
  - parent user
  - student user (if role login is used in blocked checks)
- Org/learning entities:
  - branch
  - class in that branch
  - student in that class/branch
  - guardian/parent-to-student link
  - teacher-class assignment row for the assigned teacher
- Homework entities:
  - homework task linked to branch/class
  - homework submission linked to task/student/class/branch
  - optional homework file/feedback rows only if needed for side-effect checks

Fixture principles:

- Use explicit fake naming conventions and deterministic tags.
- Keep fixtures isolated to dev and non-production contexts.
- Avoid broad fixtures that could cross branch/class scope boundaries unintentionally.

## 4) Minimum allowed-case payload

Deployed regression allowed-role calls require this payload:

- `homeworkSubmissionId`
- `homeworkTaskId`
- `studentId`
- `classId`

Expected role outcomes with the same in-scope payload:

- assigned teacher: allowed (`200`) when teacher is assigned to class
- branch supervisor own branch: allowed (`200`) when profile branch matches submission branch
- HQ admin: allowed (`200`) by policy

All successful allowed-role responses should preserve stable output shape and draft-only safety text.

## 5) Relationship mismatch cases

Use one known-good allowed-role payload (prefer teacher or supervisor) and mutate single IDs:

- wrong `homeworkTaskId`
- wrong `studentId`
- wrong `classId`
- optional wrong-branch mismatch via task/class-branch misalignment if fixture model supports safe simulation

Expected behavior:

- blocked response (`403`) or safe relationship mismatch error (`400` family), never `200`.
- No unsafe data exposure in mismatch response bodies.

## 6) Fixture creation options

### A) Reuse existing fake seed data if complete
- Pros: fastest path if all links already exist and are RLS-accessible per role.
- Risks: often incomplete or stale relationship links for deployed regression payload needs.

### B) Add/update dev-only seed script
- Pros: repeatable, versioned, auditable fixture setup.
- Pros: can standardize fake users + relationship graph for teacher/supervisor/HQ coverage.
- Risks: still requires careful non-destructive behavior and idempotency.

### C) Add smoke-test setup helper with setup/teardown
- Pros: highest test reliability; fixture creation and cleanup can be scoped to regression run.
- Pros: minimizes long-lived fixture drift.
- Risks: setup complexity and policy-scope cleanup limitations can create partial leftovers.

### D) Manual insert in Supabase SQL editor
- Pros: quick for one-off unblock.
- Risks: low repeatability, error-prone drift, hard to audit/maintain across contributors.

Recommended strategy:

- **Primary recommendation: B (dev-only seed script) plus targeted discovery in regression script.**
- **Secondary acceptable option: C** if B cannot establish stable cross-role access reliably.
- Keep any elevated/setup-only access strictly in dev scripts/tooling context, never frontend runtime.
- Avoid destructive cleanup patterns; prefer idempotent upsert-style setup where feasible.

## 7) Credentials/env handling

- Local scripts may read fake credentials from `.env.local`.
- `.env.local` must never be committed.
- Never print raw passwords/tokens/env secret values.
- If credentials or fixture IDs are missing, regression should `CHECK`-skip specific cases, not weaken auth/scope rules.
- Keep service-role-like credentials out of frontend; if needed for setup-only script context, confine to local/dev tooling.

## 8) Regression script update needs

Potential improvements for `scripts/ai-homework-edge-function-deployed-regression-test.mjs`:

- Better fixture discovery:
  - prefer explicit tagged fake fixture candidates before fallback `latest submission` query
  - avoid ambiguous fixture selection across unrelated dev rows
- Optional explicit env fixture IDs:
  - support `RLS_TEST_HOMEWORK_SUBMISSION_ID`, `RLS_TEST_HOMEWORK_TASK_ID`, `RLS_TEST_STUDENT_ID`, `RLS_TEST_CLASS_ID`
  - keep graceful fallback to discovery when env IDs are absent
- Optional setup/teardown helper integration:
  - only if chosen strategy is C or hybrid B+C
- Clearer PASS/CHECK output:
  - distinguish "missing credentials" vs "no in-scope fixture" vs "policy-blocked"
- Continue no-token/no-env-value logging behavior.

## 9) Acceptance criteria

- Deployed regression reaches live function.
- Assigned teacher allowed case -> `PASS`.
- Branch supervisor own-branch allowed case -> `PASS`.
- HQ allowed case -> `PASS`.
- Parent blocked and student blocked remain `PASS`.
- Relationship mismatch blocked cases -> `PASS`.
- Output shape remains stable for allowed responses.
- No auto-save/release side effects observed.
- No provider key required.

## 10) Safety boundaries

- Fake/dev data only.
- No real student/parent/staff/school data.
- No service role key in frontend runtime.
- No provider key.
- No real provider call.
- No auto-release to parent.
- No public file exposure.
- No broad RLS weakening.

## 11) Implementation sequence

- Phase 1: this plan.
- Phase 2: inspect existing fake seed and env fixture availability.
- Phase 3: implement/update fixture setup or discovery helper (dev-only).
- Phase 4: update deployed regression script for deterministic fixture resolution (if needed).
- Phase 5: rerun deployed regression.
- Phase 6: document checkpoint result.
- Phase 7: provider adapter stub/provider-disabled phase.

## 12) Recommended next milestone

Choose:

- A. Implement dev fixture discovery/setup for AI deployed regression
- B. Provider adapter stub with provider disabled
- C. Real provider adapter wiring
- D. AI audit/logging planning
- E. OCR/vision evidence extraction planning

Recommendation: **A. Implement dev fixture discovery/setup for AI deployed regression**.

Why A first:

- Live function is reachable.
- Blocking checks already pass.
- Allowed-role checks still need fixture proof.
- Provider integration should wait until live staff scope boundaries are proven.

## 13) Next implementation prompt (copy-paste)

```text
Continue this same project only.

Project folder:
~/Desktop/enrichify-class-flow

Branch:
cursor/safe-lint-typecheck-486d

Latest expected commit:
Add AI homework Edge Function fixture alignment plan

Before doing anything, verify:
- git branch --show-current
- git log --oneline -12
- git status --short

Task:
Implement dev fixture discovery/setup for AI deployed regression only.

Hard constraints:
- Do not change app UI.
- Do not change runtime logic outside regression/fixture scripts.
- Do not add frontend services.
- Do not change Edge Function auth/scope logic in this step.
- Do not deploy functions.
- Do not call real AI APIs.
- Do not add provider keys.
- Do not expose env values or passwords.
- Do not commit .env.local.
- Do not change Supabase SQL or RLS policies in this step.
- Do not apply SQL.
- Do not upload real files.
- Use fake/dev data only.
- Do not use service role key in frontend.
- Do not remove demoRole.
- Do not remove demo/local fallback.
- Do not auto-release AI output to parents.

Implementation goals:
1) Add deterministic fake fixture discovery and/or setup helper for deployed regression.
2) Ensure regression can attempt:
   - assigned teacher allowed case
   - branch supervisor own-branch allowed case
   - HQ allowed case
   - relationship mismatch checks from known-good allowed fixture
3) Keep PASS/CHECK output clear for missing credentials vs missing fixtures vs policy blocks.
4) Preserve no token/env logging.

Validation efficiency rule:
- If scripts/runtime files changed, run only the targeted regression command(s) needed.
- If docs-only changes, run only:
  - git diff --name-only
```

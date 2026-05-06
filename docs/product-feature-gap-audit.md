# Product feature gap audit

**Purpose:** Map what exists in the **UI**, what is **wired to Supabase (read-only)**, what is **demo / placeholder only**, and what is **documented but not built** — without changing product code.  
**Related:** `docs/service-layer-migration-plan.md`, `docs/supabase-auth-route-guard-integration-plan.md`, `docs/supabase-007-008-application-checkpoint.md`, `docs/staff-time-clock-roadmap.md`, `docs/supabase-auth-phase-3b-checkpoint.md`.

---

## 1) Features already visible in UI

These routes/pages render in the authenticated shell (or public routes) with real navigation and interactive chrome; most **data** still comes from **in-memory demo** in `dataService.js` unless noted in section 2.

| Area | Where / notes |
|------|----------------|
| **Dashboard** | Role-specific cards, lists, metrics (`Dashboard.jsx`). |
| **Org structure** | Branches, Classes, Teachers, Students list pages. |
| **Attendance** | Attendance views (demo-backed lists / filters). |
| **Homework** | Homework views and status summaries. |
| **Parent Updates** | Quick parent comments and weekly progress reports workflow UI (`ParentUpdates.jsx`, route **`/parent-updates`**) including draft/review patterns. |
| **Class Session** | Session-oriented teacher UI (`ClassSession.jsx`). |
| **My Tasks** | Teacher task queue style UI. |
| **Leads & enrolment** | Leads page. |
| **Trial scheduling** | Trial scheduling page. |
| **Teacher KPI** | KPI-style dashboard sections. |
| **Fee tracking** | Fee lists and status (demo data). |
| **Sales Kit** | Approved resources browsing (can use Supabase reads when configured — see section 2). |
| **Observations** | List + detail routes. |
| **Branch performance** | Branch performance page. |
| **Future AI Learning Engine** | Roadmap / concept style page (not a live LLM product). |
| **Migration ownership audit** | Audit-style prototype page. |
| **Prototype summary** | Summary page. |
| **Parent / student portal** | `ParentView.jsx` — attendance, homework, fees, uploads, learning portal sections. |
| **Staff Time Clock** | `/staff-time-clock` — **demo placeholder** (local state + fake tables). |
| **Parent Memories** | **Latest Memory** / **Class Memories History** block on parent dashboard — **demo placeholder** (gradients + fake captions). |
| **Auth preview** | `/auth-preview` — Supabase email/password against **fake seed users** (dev verification). |
| **Welcome** | `/welcome` — public marketing-style entry. |

---

## 2) Features partially connected to Supabase (read-only)

When **`demoRole` is not** forcing demo datasets, and Supabase env is configured, the app can source **some** reads via `supabaseReadService.js` through `dataService.js`:

| Capability | Mechanism | Caveat |
|------------|-----------|--------|
| **Branches** | `getBranches()` → `branches` table | Falls back to demo if errors / empty / demoRole. |
| **Classes** | `getClasses()` → `classes` table | Same. |
| **Students** | `getStudents()` → `students` table | Same; field shaping (e.g. `full_name` → `name`) in service layer. |
| **Approved Sales Kit resources** | `getApprovedSalesKitResources()` → `sales_kit_resources` | Role visibility still enforced in app + RLS on server. |
| **Dashboard input counts** | `getDashboardReadSummary()` composes branch/class/student/sales-kit counts | Summary only; not full domain replacement. |
| **Auth session → layout identity** | `useSupabaseAuthState` + Phase **3B** `AppLayout` | **Read** profile → `appUser` for routing/sidebar when no `demoRole`; **no** mandatory production login redirect yet (Phase **3C**). |

**Smoke tests (not full UI wiring):** `npm run test:supabase:read` validates **count-only** reads per role against **007 / 008** foundation tables (`curriculum_mappings`, `learning_objectives`, etc.). The **React app does not** generally bind pages to those tables yet (see `docs/supabase-007-008-application-checkpoint.md`).

---

## 3) Features documented but only demo / placeholder in the product UI

| Feature | Evidence / doc |
|---------|----------------|
| **Staff Time Clock** | UI at `/staff-time-clock`; local state only — `docs/staff-time-clock-roadmap.md`. |
| **Class Memories (parent)** | Gradient placeholders + static copy in `ParentView.jsx`; no `class_media` / Storage — `docs/supabase-007-008-application-checkpoint.md`. |
| **Most domain lists** | `dataService.js` demo arrays: parent updates, teacher sessions/tasks, fees, homework attachments, trials, leads, observations, class session payloads, etc. |
| **“AI” actions in UI** | Buttons/flows that **simulate** drafts, marking, or release — **no** Edge Function or external LLM required for current preview. |
| **Homework “upload” in parent view** | `uploadHomeworkAttachment` returns **demo** row metadata; not durable Supabase storage. |
| **Stripe / payments** | Dependencies may exist; **fee** UX is demo narrative unless explicitly wired later. |

---

## 4) Features planned but not visible (or not productised) yet

| Feature | Notes |
|---------|--------|
| **Staff time schema + RLS** | Tables like `staff_time_entries` — roadmap only. |
| **Class Memories backend** | `class_media` (or equivalent), approval workflow, signed URLs — planning in 007/008 checkpoint. |
| **School / curriculum CRUD UI** | Foundation tables exist in DB; **no** first-class onboarding UI for schools/curriculum mappings in app. |
| **Homework marking results / AI outputs in UI** | Tables seeded in **008**; **no** dedicated parent/teacher surfaces reading `homework_marking_results` / `ai_generation_outputs` in production UI paths yet. |
| **Dedicated student portal route / gamification journey** | Not implemented yet; current student post-login landing uses `/parent-view` (same shell as parent) until a separate student journey is productised. |
| **Production login / marketing auth** | `/auth-preview` is dev-oriented; no shipped `/login` product. |
| **HQ Sales Kit authoring** | Read path for **approved** resources exists; **management** (draft/upload/approve) not a completed staff workflow in app. |

---

## 5) Features needing real Supabase writes

These require **RLS-tested inserts/updates**, usually **after** stable auth identity (JWT `profile_id`) and schema parity.

| Feature | Why |
|---------|-----|
| **Attendance writes** | Learner present/absent/late — must not remain demo-only for production. |
| **Teacher task completion** | Persist session checklist completion against real class/session rows. |
| **Parent comment / weekly report lifecycle** | Draft → review → approve → share/release to parent. |
| **Fee records & verification** | Office workflow: status changes, verification fields, not just static demo rows. |
| **Sales Kit HQ / branch management** | Create/edit/archive resources; approval status transitions. |
| **Memories metadata** | Insert/update `class_media`-style rows; link to class, teacher, visibility. |
| **Staff Time Clock punch** | `clock_in_at` / `clock_out_at` (and correction requests) — `docs/staff-time-clock-roadmap.md`. |
| **Homework submissions (real)** | Student/parent submission rows tied to homework assignments + storage path. |
| **Observations / leads / trials** | If productised beyond demo JSON — persist to tables with RLS. |
| **Teacher approval logs** | Append-only audit when actions occur (table may exist empty until writes). |

---

## 6) Features needing Supabase Storage

| Feature | Typical asset |
|---------|----------------|
| **Memories upload / history** | Photos or short clips; **signed URLs**; bucket policies by branch/class — planning in 007/008 doc. |
| **Fee receipt upload** | Private parent/finance objects; virus scan / size policy TBD. |
| **Sales Kit files** | `file_path` / approved assets; HQ upload + branch scope. |
| **Homework attachments** | Parent/student uploads; teacher downloads — replace demo filename-only flow. |
| **Optional: observation attachments** | If product adds evidence files. |

**Rule:** No production-sensitive upload should rely on **frontend-only** or service-role-in-browser patterns (`docs/service-layer-migration-plan.md`).

---

## 7) Features needing AI Edge Functions

| Feature | Why Edge (or server) |
|---------|---------------------|
| **AI-assisted parent comments** | LLM keys off the client; server orchestration, audit, and rate limits. |
| **AI weekly progress reports** | Same; align with `ai_generation_requests` / `ai_generation_outputs` lifecycle. |
| **AI homework marking** | OCR / vision / marking models; **`homework_marking_results`** persistence after review. |
| **Optional: Future AI Learning Engine** | Any “live” tutor or generation product — not the current static page. |

Frontend may keep **request** UX and show **loading/error**; **execution** belongs server-side.

---

## 8) Features needing real auth / login first

| Feature | Dependency |
|---------|------------|
| **Staff Time Clock (production)** | Punches must bind to **`profiles.id`** with RLS — `docs/staff-time-clock-roadmap.md`. |
| **Any write listed in section 5** | JWT subject must match policy expectations; **`demoRole`** cannot be the only identity in prod. |
| **Parent/student portal against real children** | Linked `profiles` / guardianship / enrolment; not demo IDs only. |
| **Phase 3C-style route guard** | Optional **`Navigate`** to `/auth-preview` or `/login` when non-demo and unauthenticated — `docs/supabase-auth-route-guard-integration-plan.md`. |
| **Multi-branch HQ impersonation guardrails** | Product rules for who can act on which branch after real login. |

**Current state:** Supabase Auth + profile read path exists; **forced redirect** and production login UX are **not** finished.

---

## 9) Recommended build order from now

Ordered for **risk reduction** and **dependency clarity** (high-level; parallelise where teams allow).

1. **Real auth / login hardening (Phase 3C+)** — Redirect or clear unauthenticated experience; sign-out coherence; reduce double-loading; keep `demoRole` until Supabase parity proven.
2. **Schema + RLS for first write domain** — Pick one vertical (e.g. **attendance** or **teacher_tasks**) with small blast radius; ship **server-validated** writes from authenticated users only.
3. **Storage foundation** — One private bucket pattern + signed URL flow; apply first to **fee receipts** or **homework uploads** (product priority).
4. **Parent Updates write/read parity** — Parent comments + weekly reports: persist drafts, teacher review, parent release; align with existing UI states.
5. **AI Edge Functions** — Behind feature flags: **homework marking** OR **weekly report** draft generation first; persist to **`ai_generation_*`** / **`homework_marking_results`** as designed in 007/008.
6. **Sales Kit HQ management** — Writes + storage for resources; keep approval gate.
7. **School / curriculum onboarding (staff)** — CRUD or import flows for mappings/objectives once parent/staff reads need them in UI.
8. **Memories** — `class_media` + Storage + supervisor/HQ review UI; replace parent placeholder section with real reads.
9. **Staff Time Clock backend + reporting** — Replace placeholder page with inserts to `staff_time_entries`, supervisor/HQ views, corrections workflow.

**Pause / parallel track:** Expand **read-only** UI against **007 / 008** tables where it unblocks curriculum or AI transparency **without** writes.

---

*Document type: audit / planning. Does not modify application behaviour.*

# Memories — teacher upload workflow plan

**Planning only:** no UI changes, no Supabase Storage wiring, no runtime writes, and no new tables are implied by this document. Parent-facing terminology stays **Memories** / **Class Memories** (not “Class Photo” as the primary product label). **`demoRole`** and existing **Parent View** placeholders remain until later phases.

**Related:** `docs/supabase-007-008-application-checkpoint.md` (Class Memories / `class_media` planning), `src/pages/ParentView.jsx` (Latest Memory / Class Memories History demo), `src/pages/ClassSession.jsx`, `src/pages/ParentUpdates.jsx` (**Parent Updates** module at **`/parent-updates`**).

---

## 1) Product purpose

**Memories** are **parent-facing learning evidence** from class life—not only still photos. A Memory can include:

- **Photos** and **short videos**
- **Captions** and short narrative context
- **Activity moments** (e.g. group work, presentation, outdoor learning)
- **Learning evidence** where appropriate (e.g. snapshot of board work, showcase of student output—always with safeguarding and consent policy in mind)

Teachers create Memories so families feel connected to **what happened in class**, aligned with centre brand (e.g. Young’s Learners / Enrichify tone). Internal engineering names may still use **`class_media`** or bucket names like **`class-memories`**; the **parent UI** should say **Memory** / **Class Memories**.

---

## 2) Recommended upload entry points

| Priority | Surface | Rationale |
|----------|---------|-----------|
| **Primary** | **Class Session** page — control such as **“+ Add Memory”** | Teachers are **in context** of a live or wrap-up session; capture is **timely** and naturally tied to **`class_id`** / **session** metadata. |
| **Secondary** | **Parent Updates** (`ParentUpdates.jsx`, **`/parent-updates`**) — **“Attach Memory”** or select existing Memory when composing parent comments or **weekly reports** | Links narrative updates to **concrete class moments** without forcing a second navigation; reuses **approved** Memories where policy requires. |
| **Parent portal** | **View only** | Parents consume **Latest Memory** and **Class Memories History**; **no upload** in parent UI. |

**Out of scope for teacher upload:** HQ-only bulk import may be a **later** admin tool; not required for MVP teacher flow.

---

## 3) Teacher workflow (target)

1. **Context:** Teacher selects **class** (and optionally **session** / date) — already implied by Class Session or **Parent Updates** flows.
2. **Entry:** Tap **“+ Add Memory”** (Class Session) or attach from **Parent Updates**.
3. **Media:** Upload **photo/video** (future Storage) or, in **demo phase**, placeholder / local-only preview until Storage exists.
4. **Metadata:** **Caption** (required or strongly encouraged); optional **title**; optional link to **session_id** / lesson note.
5. **Visibility / lifecycle:** Choose **draft**, **submit for review**, or (if policy allows) **visible to parents** — product default should bias toward **review** for safeguarding.
6. **Edit before release:** Teacher can **edit caption** and **replace media** while in **draft** or **pending review** (not after parent-visible lock without supervisor/HQ override per policy).

---

## 4) Supervisor / HQ workflow (target)

| Role | Capability |
|------|------------|
| **Branch Supervisor** | **Review** Memories for **own branch** classes: approve, request changes, reject, or hide; optional notification to teacher. |
| **HQ** | **View / manage** across branches if product requires central moderation; policy flags (e.g. force review for all centres). |

**Approval gate:** **Recommended** for quality and child-safety consistency; can be **optional** per branch or environment (e.g. relaxed in pure demo). RLS must enforce the same rules as UI.

---

## 5) Parent workflow (target)

1. **Latest Memory** — lead with the most recent **parent-visible** Memory for the child’s class (already sketched in Parent View demo).
2. **Class Memories History** — chronological or curated list of **approved / visible** Memories only.
3. **Scope** — only Memories for **classes linked to the child** (and branch scope); no cross-class leakage.

**Student (optional later):** Simplified read-only feed of **approved** Memories if product and policy allow.

---

## 6) Future data / storage model (suggested)

**Storage bucket (suggested name):** `class-memories` or `class-media` — private; **signed URLs** for read; uploads via **authenticated teacher JWT** only (never service role in browser).

**Table (suggested):** `class_media` (or `class_memories` if renaming aligns better with product)

| Field | Purpose |
|-------|---------|
| `id` | PK UUID |
| `branch_id` | RLS scope |
| `class_id` | Required for class Memories |
| `student_id` | Nullable — class-wide vs child-specific Memory |
| `session_id` | Nullable — link to class session / lesson instance when model exists |
| `uploaded_by_profile_id` | Teacher (`profiles.id`) |
| `title` | Short optional headline |
| `caption` | Parent-facing text |
| `media_type` | e.g. `image`, `video`, `mixed`, `text_only` (demo placeholder) |
| `file_path` | Storage object path (nullable until upload) |
| `thumbnail_path` | Optional derived thumb for video/grid |
| `visibility_status` | e.g. `draft`, `pending_review`, `approved`, `rejected`, `archived`, `parent_visible` |
| `approved_by_profile_id` | Nullable |
| `approved_at` | Timestamptz nullable |
| `visible_to_parents` | Boolean or timestamptz `visible_at` for staged release |
| `created_at`, `updated_at` | Audit |

Indexes: `(class_id, created_at desc)`, `(branch_id, visibility_status)`, `(uploaded_by_profile_id)`.

---

## 7) RLS / access model (principles)

| Actor | Access |
|-------|--------|
| **Teacher** | **Insert/update** Memories for **assigned** classes only (same branch as profile or assignment rules); **no** delete of parent-visible rows without escalation (soft delete / archive). |
| **Branch Supervisor** | **Select + update** review fields for Memories where **`branch_id`** matches; no cross-branch. |
| **HQ** | **Select + update** per product policy (all branches or flagged only). |
| **Parent** | **Select** rows where **`visible_to_parents`** (or equivalent) and child/class linkage via `student_school_profiles` / enrolment helpers already in RLS patterns. |
| **Student** | **Select** subset if enabled — same visibility predicates, possibly fewer columns. |

**RLS is authoritative**; the app only reflects policy. **No service role** in the frontend.

---

## 8) Demo UI recommendation (later implementation)

| Location | Element |
|----------|---------|
| **Class Session** | **“+ Add Memory”** button → modal or side panel; **Phase 3** can use **local state only** (no Storage). |
| **Parent Updates** | Small **“Attach Memory”** strip: pick from **draft** Memories for this class or “create new” deep-link to Class Session. |
| **Parent View** | **Already** has **Latest Memory** + **Class Memories History** placeholders — replace with **read** queries when backend exists. |

Do **not** add real uploads until Storage + RLS are ready.

---

## 9) Implementation order

| Phase | Scope |
|-------|--------|
| **Phase 1** | **This document** — product/UX/RLS/storage sketch alignment with `007`/`008` checkpoint. |
| **Phase 2** | **SQL + Storage draft** — `class_media` table, bucket, RLS policies, indexes; review with security. |
| **Phase 3** | **Demo upload UI** — modal/sheet with **local component state** (or fake `dataService` row) — **no** Supabase writes. |
| **Phase 4** | **Real Storage upload** — resumable/chunking TBD; metadata row insert; MIME/size limits; virus scan policy TBD. |
| **Phase 5** | **Approval / release** — supervisor queue, parent visibility flip, audit log append. |

---

## 10) Recommended next step (vs auth & writes)

- **After stable real auth / login (Phase 3C-2+ and polished `/login` redirect):** teacher actions must bind to **`profiles.id`** for RLS; Memories uploads are a strong candidate for **first or second intentional write vertical** because scope is **class-bound** and **parent-visible** risk is manageable with a **mandatory review** gate.
- **Before Memories Storage:** schema-only and **read** APIs can land earlier if product wants **parent read** of **seed** Memories without uploads.
- **Practical ordering:** **Auth + redirect to `/login`** → **SQL/RLS for `class_media` + bucket** → **Phase 3 demo UI** → **Phase 4 upload** → **Phase 5 approval**.

If the team prioritises **attendance** or **homework** writes first, **defer Phase 2–4** for Memories but keep **Parent View** demo placeholders until read APIs exist.

---

*Document type: planning. No migrations, buckets, or UI are required by this file alone.*

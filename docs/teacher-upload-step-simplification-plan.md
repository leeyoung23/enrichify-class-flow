# Teacher upload-step simplification — planning document

Date: 2026-05-02  
Type: **planning only** — defines principles, maps current flows, proposes step models and copy; **no** UI implementation in this milestone.

**Foundation:** `docs/teacher-simplicity-navigation-clickability-audit.md`, `docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`, `docs/manual-qa-navigation-clickability-simplicity-checkpoint.md`.

**Milestone B (Homework UI polish) implemented:** `docs/homework-teacher-upload-step-ui-polish-checkpoint.md` — **`src/pages/Homework.jsx`** copy/layout only; **no** SQL/backend changes.

**Manual QA (Homework flow):** `docs/manual-qa-homework-teacher-upload-review-checkpoint.md` — desktop + **~390px** before milestone **C** (Parent Communication polish).

**Code references (read-only for this plan):** `src/pages/Homework.jsx`, `src/pages/ParentUpdates.jsx`, `src/pages/Announcements.jsx`, `src/pages/MyTasks.jsx`, `src/pages/AiParentReports.jsx`, `src/pages/Attendance.jsx`, `src/pages/Observations.jsx`.

---

## 1. Product principle

Teacher-facing **upload / review / receive** flows must feel **oversimplified** for kindergarten and primary staff who are not highly technical:

- **Clear next action** — one obvious primary step per screen segment where possible.
- **Step-by-step labels** — numbered or titled phases (e.g. “1 · Choose”, “2 · Upload”, “3 · Preview”, “4 · Send”) instead of dense dashboards.
- **Minimal technical terms** — avoid raw enums (`mock_ai`, `manual`, internal roles) on primary surfaces; use verbs teachers use daily.
- **Obvious submit / review / release boundary** — teachers always know whether work is **saved for staff only**, **waiting for approval**, or **visible to parents**.
- **Mobile-friendly** — primary actions and status visible without horizontal scrolling on narrow widths (~390px).
- **Explicit demo/local states** — preview or demo rows must read as **Preview** / **Demo**, not as live parent-visible truth.

Parent-facing visibility rules stay unchanged until product explicitly expands release paths; this plan does **not** alter ParentView rules.

---

## 2. Current teacher upload/receiving flows (map)

| Flow | Where in app | What happens today (high level) |
|------|----------------|----------------------------------|
| **Homework — assign & track** | `Homework.jsx` | **By Task** / **By Student** trackers; **Create Homework** flow; class/student/task selection; submission list with statuses (submitted → under review → reviewed → returned → approved for parent). |
| **Homework — teacher-marked file** | `Homework.jsx` | Upload **marked** file per submission; internal until release; **Release** path for marked file / feedback (role-gated where applicable). |
| **Homework — feedback text** | `Homework.jsx` | Draft/save feedback; release feedback to parent after review path. |
| **Parent Communication — memory / photo** | `ParentUpdates.jsx` | Class/student selection; **Add Memory** with image types; submit for review queue (HQ/supervisor approve path when Supabase enabled). |
| **Parent Communication — quick comment** | `ParentUpdates.jsx` | Notes → AI draft optional → edit → approve → **share** pipeline (`step` state machine; statuses like teacher note / AI draft / edited / approved / shared). |
| **Parent Communication — weekly progress** | `ParentUpdates.jsx` | Structured weekly fields; draft generation flag; release **shared report** when approved. |
| **My Tasks — announcement requests** | `MyTasks.jsx` | Loads `listMyAnnouncementTasks`; groups **Upload / Reply / Other / Completed**; **Open Announcement** to hub. |
| **Announcements — HQ requests & replies** | `Announcements.jsx` | Tabs (Requests, Parent Notices, Company News, etc.); attachments (`uploadAnnouncementAttachment`); replies; parent notice media upload/release (`uploadParentAnnouncementMedia`, `releaseParentAnnouncementMedia`). |
| **AI Parent Reports** | `AiParentReports.jsx` | List reports; **Source Evidence Preview** (demo vs hybrid); **Generate draft from source evidence**; lifecycle draft → review → approve → **manual release**; `generation_source` internal (`manual` / `mock_ai`) — should stay internal or relabeled. |
| **Future — worksheet / OCR** | Not implemented | Planned intake of worksheet scans for evidence; **privacy plan before any AI analysis**. |
| **Future — observations as learning notes** | `Observations.jsx` today | Currently **classroom teaching observation** (scores, strengths, follow-up) for HQ/supervisor; **not** the same as per-student “learning notes” — rename/structure is a **future** product decision (see §8). |
| **Attendance** | `Attendance.jsx` | Class + date + per-student status/notes; **quick capture**, less “upload” — optional later alignment with “step strip” for consistency. |

---

## 3. Flow-by-flow simplification plan (ideal teacher steps)

Use a **shared mental model** where possible:

| Step | Meaning |
|------|---------|
| **1 · Choose** | Class, student, task, or announcement request — scope is explicit. |
| **2 · Add** | Upload file or write a short note — minimal fields per screen. |
| **3 · Preview** | See what parents or reviewers will see (or staff-only preview before release). |
| **4 · Submit** | Save draft **or** submit for supervisor review — label matches actual backend state. |
| **5 · Status** | **Pending / In review / Released to parent / Done** — badge near title on mobile. |

Apply per flow:

- **Homework** — 1 Choose task or student submission → 2 Review uploaded student file → 3 Add teacher-marked file + note → 4 Mark reviewed / return for revision → 5 Release feedback or marked file to parent when allowed.
- **Parent Communication (memory)** — 1 Choose class → 2 Upload photo + caption → 3 Preview → 4 Submit for review → 5 Approved / visible per policy.
- **Quick comment / weekly** — 1 Choose student/class → 2 Enter notes or weekly fields → 3 Preview draft → 4 Submit for approval or share when policy allows → 5 Shared / parent-visible only after release step.
- **My Tasks / Announcements** — 1 Open grouped task → 2 Action (**Upload file** / **Reply** / **Mark done**) → 3 Confirm completion on hub if needed.
- **AI reports** — 1 Choose report → 2 View **source evidence** → 3 Generate draft → 4 Edit → 5 Submit for review → 6 Release manually when ready.
- **Future worksheet/OCR** — Same 1–5 with explicit **“processing”** state and no parent auto-send.
- **Future student learning notes** — 1 Choose student → 2 Category + short note + sensitivity → 3 Save as staff evidence (not parent-visible by default).

---

## 4. Homework upload/review simplification (labels & boundaries)

**Current surface cues** (from `Homework.jsx`): **Create Homework**, **By Task** / **By Student**, tracker rows, submission detail, **Marked work**, upload marked file, release marked file, feedback release messaging (“Marked work remains internal until released…”).

**Planned clearer labels (teacher-facing):**

| Current / internal | Planned friendly label |
|--------------------|-------------------------|
| Create Homework | **Create homework task** (subtitle: who it is assigned to) |
| By Task / By Student | **View by homework** / **View by student** (short helper: “pick one view”) |
| Submission detail | **Student submission** |
| Uploaded files (parent) | **Files from family** |
| Marked work | **Teacher-marked work** (section header) |
| Upload marked file | **Upload teacher-marked work** |
| View / open file | **Open student submission** / **Open teacher-marked file** |
| Release feedback / marked file | **Send feedback to family** / **Share marked work with family** (only when policy allows) |
| Status: approved_for_parent | **Sent to family** or **Visible to family** (paired with icon/badge) |

**Parent visibility boundary (copy):**

- One line under **Teacher-marked work**: “Families only see this after you release it.”
- Distinguish **Staff only** vs **Shared with family** in badges consistently across homework and parent comm.

---

## 5. Parent Communication simplification (`ParentUpdates.jsx`)

**Tracks:** Quick comment pipeline (notes → draft → edit → approve → share); **Add Memory** (photo); **Weekly Progress Report** (structured fields + release).

**Planned labels:**

| Area | Planned emphasis |
|------|-------------------|
| Page framing | Keep **Parent Communication** as nav label; sections: **Quick message**, **Class memory**, **Weekly progress**. |
| Add Memory | **Add a class memory** — photo + short caption; **Submit for review** before parent visibility. |
| Quick Parent Comment | **Quick note to family** — steps: Write → Preview → **Submit for approval** → **Send when approved**. |
| Weekly Progress Report | **Weekly summary for families** — same preview / approve / **Share with family** pattern. |
| Draft states | Replace or subtitle technical statuses (**ai_draft_generated**) with **Draft ready — review before sending**. |
| Shared / released | **Shared with family** only after explicit release; never imply auto-send. |

---

## 6. My Tasks / Announcements request simplification

**Already done:** grouping **Upload needed / Reply needed / Other requests / Completed** (`MyTasks.jsx`).

**Planned polish:**

- Primary buttons should read as **actions**, not destinations: **Upload file**, **Reply**, **Mark done**, **Open request** (instead of only “Open Announcement” where the mental model is “complete HQ request”).
- Keep **Announcements** as the **official** hub for full threads and published notices; My Tasks is the **inbox** for “what I must do.”
- Avoid saying **Announcement** when the teacher just needs to **upload a file** or **reply** — use task title + verb button.
- **Future:** optional unified “Requests inbox” that merges non-announcement tasks — product decision; do not break existing My Tasks / Announcements separation without spec.

---

## 7. AI Parent Reports workflow simplification (`AiParentReports.jsx`)

**Intent order for teachers:**

1. **Source evidence first** — “What we’re basing this on” (already emphasized in recent UX).
2. **Generate draft from source evidence** — keep; hide **`mock_ai` / `manual`** from primary labels; use **Draft source: Staff-written** vs **Draft source: Preview generator** if needed.
3. **Optional teacher notes / overrides** — grouped as “Your edits” not internal merge keys.
4. **Submit for review** — clear handoff to supervisor if applicable.
5. **Release to family** — explicit manual step; no auto-release.

Avoid showing **`GENERATION_SOURCE_OPTIONS`** strings raw in teacher UI; map to human phrases.

---

## 8. Observations — future direction

**Today:** `Observations.jsx` is **classroom teaching observation** (rubric scores, strengths, follow-up) — primarily **HQ / branch supervisor** create; teachers may view feedback.

**Future product option:** separate **“Student learning notes”** / **Observation notes** for short, per-student evidence:

- Choose **class** → **student** → **category** (literacy, wellbeing, etc.).
- Short note + **sensitivity** flag.
- Save as **staff evidence** — **not** automatically parent-visible.
- Distinct route or renamed nav item to avoid confusion with **Observations** (teacher performance).

This plan does **not** implement routing or rename — only records direction for a later milestone.

---

## 9. Copy/label recommendations (summary)

| Topic | Recommendation |
|-------|----------------|
| Upload marked file | **Upload teacher-marked work** |
| View uploaded file | **Open student submission** |
| Marked work | **Teacher-marked work** |
| Parent Updates nav | Already **Parent Communication** in product — keep consistent in sidebar |
| My Tasks | Keep for now; optional future **Tasks** or **My requests** if research supports |
| Observations | Future alias **Student learning notes** only if product splits teacher-performance vs student notes |
| Generate Mock Draft | Prefer **Generate draft from source evidence** (already in motion) |
| Open Announcement | **Open request** on task rows where task-oriented |

---

## 10. Mobile-first design rules

- **One main action per card** block where possible; secondary actions as outline buttons below.
- **Full-width primary buttons** on small screens for upload/submit/release.
- **Step labels** visible at top of section (text or compact stepper), not only in desktop side margins.
- **Avoid two-column dense forms** below ~640px — stack fields vertically.
- **Status badges** adjacent to section titles (homework submission status, release state).
- **Popovers/dialogs** must not cover file pickers — test upload flows at ~390px after any UI change.

---

## 11. Safety/privacy rules (teacher upload flows)

- **Uploaded files** remain **private to staff** until an explicit **release/approve/share** step succeeds.
- **Parents** see content only after **release for parent** / **shared** policy — consistent with existing ParentView boundaries; **no** change to parent visibility rules from this plan alone.
- **No raw storage paths** or bucket names in teacher-facing copy.
- **No service role** or admin keys in browser — unchanged architecture rule.
- **No real AI provider** for upload analysis until product + privacy review; **OCR/worksheet AI** is **future** only.
- **No auto-email** or push on upload — teachers and reviewers control release.

---

## 12. Recommended implementation sequence

| Option | Scope |
|--------|--------|
| **A** | **Plan only** (this document) |
| **B** | **Homework** step-label + section hierarchy polish (no API contract change) |
| **C** | **Parent Communication** step-label polish |
| **D** | **My Tasks** action button wording (**Open request**, verb-led buttons) |
| **E** | **Observations** rename / split planning vs **Student learning notes** |
| **F** | **Real provider smoke** (after UX stable and policy-gated) |

**Recommendation: start with B.**

- Homework is the **core evidence path** feeding downstream AI parent reports and parent trust.
- Step labels and release boundaries are the fastest win for non-technical teachers.
- Clarifying homework makes future **worksheet/OCR** and **AI analysis** easier to explain safely.

Then **C → D**; **E** when product defines student-notes scope; **F** last.

**Update (2026-05-03):** **C** — **Parent Communication** step-label / teacher workflow polish — **`docs/parent-communication-step-label-polish-checkpoint.md`** ( **`src/pages/ParentUpdates.jsx`** only; no SQL/RLS). **Final seal:** **`docs/parent-communication-teacher-workflow-polish-final-checkpoint.md`** (commits **`c313ee8`**, **`312c439`**).

---

## 13. Next implementation prompt (copy-paste)

Use when starting **Homework** UI polish — **small PR**, **no** SQL/RLS, **no** `real_ai`, **no** ParentView rule changes.

```text
Homework teacher upload/review — step-label UI polish only.

Goals:
1. Add a clear step framing at top of the main homework workflow (numbered lines or short subtitles): choose task/submission → review student file → add teacher-marked work → release to family when allowed.
2. Rename teacher-visible labels per docs/teacher-upload-step-simplicity-plan.md §4: e.g. “Teacher-marked work”, “Upload teacher-marked work”, “Open student submission”, badges for staff-only vs shared with family.
3. Keep one primary action per mobile card segment; full-width primary buttons at ~390px where helpful.
4. Do not change Supabase write contracts or RLS; demo/local/demoRole unchanged; no service role in frontend.

Reference: docs/teacher-upload-step-simplification-plan.md §4, §10, §11.

Validate when src/ changes: npm run build, lint, typecheck; homework-related smokes if any exist.
```

---

## Validation

This document is **planning only**.

- **`git diff --name-only`** should show only `docs/` paths for this milestone.
- **Do not** run `npm run build`, `lint`, or `typecheck` unless **`src/`** changes.

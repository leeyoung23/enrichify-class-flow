# Manual visual QA — Homework teacher upload/review flow

Date: 2026-05-02  
Type: **QA / checkpoint documentation only** — **no** `src/` changes in this milestone. Use **fake/dev or demo mode**; **no** real student or family data in screenshots or walkthroughs.

**UI baseline:** commit **`6fe18bc`** (*Polish homework teacher upload review flow*).  
**Implementation record:** `docs/homework-teacher-upload-step-ui-polish-checkpoint.md`  
**Planning context:** `docs/teacher-upload-step-simplification-plan.md`

**Route:** `/homework` (staff roles: teacher, branch supervisor, HQ admin). ParentView unchanged.

---

## 1. QA purpose

Human **screenshot-friendly** pass to confirm the **Homework** staff page is **simple enough for kindergarten/primary teachers** after step-label and release-boundary polish:

- Staff-only framing and **release-gated** parent visibility are obvious.
- **Create homework task**, trackers, submission review, **teacher-marked work**, and **feedback** read as a coherent sequence—not a wall of technical panels.

Use **desktop** and **~390px** before deeper upload-flow or Parent Communication polish.

---

## 2. Surfaces to preview

Preview both viewports:

| Area | What to look at |
|------|------------------|
| **Page top** | Title **Homework review (staff)** and intro paragraph (staff workflow, families see work only after release, parent UI separate). |
| **Create homework task** | Open **Create homework task**; Steps **1 / 2 / 3**, scope badge, **Save homework task**. |
| **By Task** | Toggle **By Task**; tracker list + counts; filters if present. |
| **By Student** | Toggle **By Student**; student list / task rows. |
| **Submission queue** | **Submissions to review** list; pick a row. |
| **Review panel** | **Review this submission** + boundary copy; status badge. |
| **Student submission files** | File list + **Open student submission**; optional **Staff reference** disclosure. |
| **Teacher-marked work** | Upload / open / share controls; **Staff only** vs **Shared with family**. |
| **Feedback** | Draft fields; **Share feedback with family**; helper line about parents only seeing after share. |

---

## 3. Create Homework — QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| C1 | **Step 1 / 2 / 3** | Headings **Step 1 · Choose who receives**, **Step 2 · Add homework details**, **Step 3 · Save homework task** are visible and in order. |
| C2 | **Who receives it** | **Whole class / Selected students / One student** is understandable; student chips appear when needed. |
| C3 | **Save action** | Primary button reads **Save homework task** (not ambiguous “Save”). |
| C4 | **Demo/local** | Demo copy clearly states local simulation / no real server upload where applicable. |
| C5 | **No parent-send confusion** | Copy does **not** imply homework creation emails parents or releases feedback. |
| C6 | **Mobile density** | At ~390px, fields stack; primary actions remain tappable without horizontal scroll. |

---

## 4. Tracker — QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| T1 | **By Task / By Student** | Helper text explains each mode; teacher knows which view to use. |
| T2 | **Plain statuses** | Labels such as submitted, not submitted, under review, feedback released are readable (not raw enums in primary UI). |
| T3 | **Actionability** | Teacher can tell which submissions need review vs already released. |
| T4 | **Badges** | Status badges sit near task/submission titles, not lost below the fold on mobile. |
| T5 | **Mobile overflow** | Tracker cards do not clip text badly; tap targets adequate. |

---

## 5. Submission detail — QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| S1 | **Review header** | **Review this submission** (or student variant) matches expectation after picking a queue row. |
| S2 | **Student submission files** | Section title and helper line clarify these are **family uploads**. |
| S3 | **Open student submission** | Primary action to open a file is obvious and reachable on mobile (**full-width** where used). |
| S4 | **IDs subdued** | Raw IDs live under **Staff reference (optional)** `<details>`—not the dominant focus. |
| S5 | **Tap targets** | File rows easy to tap at ~390px. |

---

## 6. Teacher-marked work — QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| M1 | **Section title** | **Teacher-marked work** reads clearly vs student files. |
| M2 | **Upload** | **Upload teacher-marked work** is obvious; file input discoverable on mobile. |
| M3 | **Staff vs shared** | Badges **Staff only** / **Shared with family** match mental model. |
| M4 | **Share marked work** | **Share marked work with family** does not read as “instant email”—teacher understands release gate. |
| M5 | **Demo** | Demo marked-file area states simulation / no real upload clearly. |

---

## 7. Feedback / release — QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| F1 | **Share feedback** | **Share feedback with family** (when role allows) matches “release-gated” intent. |
| F2 | **Parent boundary** | Helper text: parents only see feedback **after** share/release. |
| F3 | **Supervisor-only** | If teacher lacks share button, explanation is kind and actionable (e.g. ask supervisor)—not error dumps. |
| F4 | **No auto-release** | Nothing implies saving a draft notifies parents. |

---

## 8. Safety / privacy — visual checklist

During QA, confirm **on screen**:

| # | Check |
|---|--------|
| P1 | No **raw storage paths**, bucket names, or **private signed URLs** pasted into visible copy. |
| P2 | No **SQL**, **RLS**, **env** names, or stack traces in UI. |
| P3 | No **provider keys**, **JWT**, **service role**, or **`real_ai`** on teacher surfaces. |
| P4 | No suggestion that **unreleased** feedback or marked files are parent-visible. |
| P5 | No **PDF export** or **email/notification send** controls introduced by this flow. |

---

## 9. Known risks to look for

- Too many panels visible at once — cognitive overload for non-technical teachers.
- **Step labels** too subtle (scrolled past on mobile).
- Teacher still unsure **where** to upload marked work vs read student files.
- **Share with family** misread as instant notification or email blast.
- **Demo** labeling too subtle — mistaken for live data.
- **Mobile** page feels endless scroll or cramped grids.

---

## 10. Recommended decision rule

| Outcome | Next step |
|---------|-----------|
| **Issues** in clarity, density, or misleading release language | Open **targeted Homework UI/copy** fixes before broader upload work. |
| **Clean QA** | Proceed to **Parent Communication** step-label UI polish (`docs/teacher-upload-step-simplification-plan.md` §12 **C**). |
| **Real provider smoke** | Still **after** teacher upload/review flows feel obvious end-to-end—not gated only by this QA doc. |

---

## 11. Validation

This file is **documentation only**.

- **`git diff --name-only`** should list only `docs/` paths when committing this checkpoint.
- **Do not** run `npm run build`, `lint`, or `typecheck` unless **`src/`** changes.

---

## 12. Optional screenshot set

1. Full page header + **By Task / By Student** strip (desktop + ~390px).  
2. **Create homework task** with three steps partially filled (demo).  
3. **Submissions to review** + selected row.  
4. **Student submission files** + one **Open student submission**.  
5. **Teacher-marked work** + **Share marked work with family** row.  
6. **Feedback** card + **Share feedback with family** + helper line.

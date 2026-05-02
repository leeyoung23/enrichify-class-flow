# Manual visual QA — navigation clarity, ParentView history, My Tasks grouping, setup cards

Date: 2026-05-02  
Type: **QA / checkpoint documentation only** — **no** code changes in this milestone. Use **fake/dev data only**; **do not** implement UI fixes here unless a separate implementation task is opened.

**UI baseline:** **`74a71bf`** (*Improve navigation clarity and parent announcement history*); sealed summary **`docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`** (**`5a5d629`** docs seal).

**Related:** `docs/navigation-clickability-simplicity-fixes-checkpoint.md`, `docs/teacher-simplicity-navigation-clickability-audit.md`, `docs/mobile-first-qa-checkpoint.md`.

---

## 1. QA purpose

Human **screenshot-friendly** pass to confirm:

- **ParentView** — simplified **Latest** + **More announcements** list with **View more history** / **Show less** (not an infinite wall of cards).
- **My Tasks** — announcement-linked tasks **grouped** (**Upload needed** → **Reply needed** → **Other requests** → **Completed**) so teachers see **what to do next**.
- **Branches / Classes / Teachers / Students** — **directory/setup preview** language and cards that **do not** falsely imply a detail route.

Run on **desktop** and **~390px** before the next implementation milestone (recommended: **Teacher upload-step simplification** after QA is clean).

---

## 2. Surfaces to preview

Preview both viewports for:

| Surface | Route / entry |
|---------|----------------|
| ParentView — **Announcements & Events** | Parent-facing view → scroll to **Latest announcements and events** (`#parent-announcements-events`). |
| **View more history** / **Show less** | Same card — only when **more than three** items exist after the featured latest row. |
| **My Tasks** — grouped **From announcements** | `/my-tasks` (teacher / branch_supervisor / hq_admin). |
| **Branches** | `/branches` |
| **Classes** | `/classes` (or **My Classes** copy for teachers). |
| **Teachers & Staff** | `/teachers` |
| **Students** | `/students` (or **My Students** for teachers). |

---

## 3. ParentView — announcement history QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| P1 | **Latest** is visually distinct | **Latest** badge + featured block; title **Latest announcements and events**. |
| P2 | History is **not** fully expanded by default | At most **three** rows under **More announcements** until **View more history** (when enough items exist). |
| P3 | **View more history** | Visible when `historyItems.length > 3`; label reads as expanding older items, not navigation away. |
| P4 | **Show less** | Collapses back to capped list; state is obvious after tap. |
| P5 | **No duplicate latest** | Featured announcement does **not** repeat as the first row in **More announcements** (implementation uses `announcements.slice(1)`). |
| P6 | **Detail + released media** | Selecting a history row still drives **Announcement detail** + **Released media** below; readable on mobile. |
| P7 | **Parent boundary** | Only **published** parent-facing content in this section — **no** drafts, **no** internal HQ-only requests surfaced as parent announcements. |
| P8 | **Mobile readability** | Badges, titles, **line-clamp** previews, and tap targets feel comfortable at **~390px**. |

---

## 4. My Tasks — QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| M1 | Section headings | **Upload needed**, **Reply needed**, **Other requests**, **Completed** are scannable. |
| M2 | **What to do next** | Intro paragraph under header guides scan order (upload → reply → other → completed). |
| M3 | **Open Announcement** | Still present on announcement task rows; navigates with context as before. |
| M4 | **Badges** | Status / priority / reply-upload badges readable; contrast acceptable on mobile. |
| M5 | **Long lists** | Many tasks do not feel like one undifferentiated pile (grouping carries the load). |
| M6 | **Mobile density** | ~390px: sections do not feel cramped past usefulness; scroll length acceptable. |

---

## 5. Setup card clarity — QA checklist

| # | Check | Pass criteria |
|---|--------|----------------|
| S1 | Cards **not** falsely clickable | No heavy **hover shadow** “button lift” on static directory grids (`border-muted/80` style). |
| S2 | **PageHeader** copy | Examples: Branches **Setup records preview**; Teachers **Directory preview**; Classes / Students teacher variants mention **no drill-down yet** / **future step**. |
| S3 | Primary CTAs | **Add Branch**, **Add Class**, **Add Student**, **Invite Staff** remain obvious where applicable. |
| S4 | **No phantom detail route** | User does not assume tapping a card opens a profile — copy sets expectation. |
| S5 | **Mobile spacing** | Grid gaps and card padding look clean at **~390px**. |

---

## 6. Safety / privacy — visual checklist

During QA, confirm nothing inappropriate appears **on screen** for the tested role:

| # | Check |
|---|--------|
| V1 | **Parents** do not see **draft** announcements or staff-only request copy in ParentView. |
| V2 | No **internal staff request** framed as a parent announcement. |
| V3 | No **raw SQL**, **RLS policy** text, or **env var** names in UI copy. |
| V4 | No **provider keys**, **JWT**, or **service role** wording exposed to the browser. |
| V5 | No **storage bucket paths** or **private signed URLs** pasted into visible copy (URLs should only appear where the product intentionally shows file links). |
| V6 | No **`real_ai`** unlock controls, **PDF export**, or **live email send** affordances introduced by this pass. |

---

## 7. Known risks to look for

- **View more history** too easy to miss (placement, contrast, or below the fold on mobile).
- Expanded history still feels **too long** for parents who only wanted “what’s new”.
- **My Tasks** group labels or intro still **too wordy** for a quick scan between classes.
- **Setup cards** still **feel** clickable despite softer styling.
- **Demo/preview** labeling too subtle — users confuse demo rows with production.
- **Mobile** spacing or **horizontal overflow** on badges/long titles.
- Teacher still **uncertain which single action** to take first when multiple groups have items.

---

## 8. Recommended decision rule

| Outcome | Next step |
|---------|-----------|
| QA finds **blocking** clarity issues (copy, density, misleading affordance) | Open a **targeted UI/copy** fix task; address those before broader workflow work. |
| QA is **clean** | Proceed to **Teacher Upload-Step Simplification** planning and incremental UI (**before** real provider smoke — teachers should trust upload/review flows first). |

---

## 9. Validation

This file is **documentation only**.

- **`git diff --name-only`** should list only `docs/` paths when committing QA checkpoints.
- **Do not** run `npm run build`, `lint`, or `typecheck` unless **`src/`** or tooling changes.

---

## 10. Suggested screenshot set (optional)

1. ParentView — collapsed history (≤3 rows + featured latest).  
2. ParentView — expanded history (**View more history**).  
3. My Tasks — all four groups visible (demo role if needed).  
4. One setup page — card grid + **PageHeader** (e.g. Branches).  
5. Same surfaces at **~390px** width.

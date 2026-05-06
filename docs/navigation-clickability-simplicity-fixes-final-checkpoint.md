# Navigation clickability + simplicity fixes — final documentation checkpoint

Date: 2026-05-02  
Type: **documentation only** — seals UI milestone **`74a71bf`** (*Improve navigation clarity and parent announcement history*). **No** app/runtime changes in this doc pass.

**Code reference:** `src/pages/ParentView.jsx`, `src/pages/MyTasks.jsx`, `src/pages/Branches.jsx`, `src/pages/Classes.jsx`, `src/pages/Teachers.jsx`, `src/pages/Students.jsx` (as of **`74a71bf`**).

**Shorter index:** `docs/navigation-clickability-simplicity-fixes-checkpoint.md`  
**Audit foundation:** `docs/teacher-simplicity-navigation-clickability-audit.md`  
**Manual visual QA runbook:** `docs/manual-qa-navigation-clickability-simplicity-checkpoint.md`

---

## 1. Key checkpoint notes

- **ParentView** — **Latest announcements and events**: compact **latest** + **limited history** + expand/collapse (**View more history** / **Show less**).
- **My Tasks** — Announcement-linked tasks **grouped** by action: **Upload needed** → **Reply needed** → **Other requests** → **Completed**.
- **Setup pages** — **Branches / Classes / Teachers / Students**: copy reads as **directory / setup preview**; **static cards** no longer use strong hover “click me” styling.
- **No** SQL/RLS/backend persistence changes; **no** ParentView visibility rule changes; **no** `real_ai`; **no** provider/email/PDF automation.

---

## 2. ParentView — announcement / history behavior

| Behavior | Detail |
|----------|--------|
| Latest | First list row shown as **Latest** card (title **Latest announcements and events**). |
| History list | Uses **`announcements.slice(1)`** — **no duplicate** of latest in the scrollable list. |
| Default cap | **Three** additional items unless expanded. |
| Expand/collapse | **View more history** shows all remaining items; **Show less** returns to capped view (button only if **more than 3** older items). |
| Selection | Row buttons still select an announcement for **detail + released media** below — logic unchanged. |
| Data boundary | Still **published** parent-facing announcements only — **no** drafts or internal staff-only rows in this section. |

---

## 3. My Tasks — behavior

| Topic | Detail |
|-------|--------|
| Grouping | **Upload needed** (requires upload, not yet provided) → **Reply needed** (requires response, not yet provided) → **Other requests** → **Completed** (`status === 'done'`). |
| Single bucket | Each task appears in **one** group only (upload branch takes priority over reply when both flags apply). |
| Actions | **Open Announcement** unchanged (`navigate` + optional `announcementId` state). |
| Copy | Teacher-facing **what to do next** intro under header. |
| Backend | Same **`listMyAnnouncementTasks`** / demo fixtures — **no** API contract change. |

---

## 4. Setup page clickability clarity

- Pages framed as **directory / setup preview**; cards use **`border-muted/80`** instead of **`hover:shadow-lg`** on static grids.
- **No** new detail or edit-from-card routes.
- **Add Branch**, **Add Class**, **Add Student**, **Invite Staff** unchanged where present.

---

## 5. Teacher simplicity principle (reaffirmed)

- Workflows should stay **obvious** and **oversimplified** for kindergarten/primary teachers.
- **Upload / reply / review** language should surface **next action** clearly.
- **Demo** and **preview** states must be **explicit**; avoid **fake-clickable** affordances on non-navigating panels.
- Prefer plain words over internal enums on primary surfaces.

---

## 6. Validation result (recorded at `74a71bf`)

Runs were executed when **`src/`** changed for that commit; **docs-only** edits **after** `74a71bf` do **not** require re-running unless **`src/`** changes again.

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run test:supabase:parent-announcements` | **PASS** (expected **CHECK** for unrelated-parent fixture / HQ context notes) |
| `npm run test:supabase:announcements:phase1` | **PASS** (expected **CHECK** when optional cross-branch fixture absent) |

---

## 7. What remains future

- **Detail routes** from setup directory cards (Branches/Classes/Teachers/Students).
- **ParentView** section **tabs/chips** vs hash-only navigation for announcements vs reports.
- **Stronger upload-step** hero strips on Homework / Parent Communication.
- **Worksheet/OCR** evidence intake; **real provider** smoke (policy-gated); **email/notification** after release; **PDF/export**.

---

## 8. Recommended next milestone

| Option | Topic |
|--------|--------|
| **A** | **Manual visual QA** — ParentView history toggle, My Tasks groups, setup cards (**~390px + desktop**) |
| **B** | **Teacher upload-step simplification** plan + incremental UI |
| **C** | Real provider smoke |
| **D** | Worksheet/OCR evidence planning |
| **E** | Email automation planning |

**Recommendation:** **A** first (quick confirmation that clarity changes read well), then **B** before **C** — teachers should finish upload/review flows confidently before real AI wiring.

**Full runbook:** **`docs/manual-qa-navigation-clickability-simplicity-checkpoint.md`** — desktop + **~390px** checklists, safety/privacy §6, known risks §7, decision rule §8.

---

## 9. Next implementation prompt (manual visual QA)

```text
Manual visual QA only — navigation clarity pass (commit 74a71bf).

Scope:
- ParentView: “Latest announcements and events” — latest card, 3-item history cap, View more history / Show less, detail panel + released media unchanged.
- My Tasks: grouped sections (Upload / Reply / Other / Completed), Open Announcement, intro copy.
- Branches / Classes / Teachers / Students: directory preview copy, static cards without heavy hover-shadow.

Viewports: desktop + ~390px. Fake/dev data only. No code changes unless blocking bug filed separately.

Report: pass/fail notes + screenshots optional.
```

See **`docs/manual-qa-navigation-clickability-simplicity-checkpoint.md`** for expanded checklists and screenshot suggestions.

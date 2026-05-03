# Real AI staff draft — manual QA unblock (create report shell)

## Why QA was blocked

1. **`listAiParentReports`** returned **no rows** because **no `ai_parent_reports` rows** existed yet for the project (typical empty DEV DB), **not** because HQ couldn’t read reports once rows exist.
2. **Create report shell** asked for **raw UUIDs** (`studentId`, `branchId`, `classId`). Staff without DB access could not obtain those quickly, so they could not create a shell → could not select a report → **Generate real AI draft** stayed blocked behind metadata/report selection.
3. **Demo mode** correctly disables real AI (explicit-click mock-only path unchanged).

## What changed (smallest safe unblock)

**Choice A — staff-friendly selectors** (implemented):

- **`AiParentReports.jsx`** — when **signed-in staff** and **not demo mode**, **Create report shell** uses dropdowns fed by existing read helpers:
  - **`getBranches()`**, **`getClasses()`**, **`getStudents()`** from **`supabaseReadService.js`** (anon JWT + **RLS only**; **no** service-role).
- Cascading filters: **branch** → optional **class** filter → **student** (student selection syncs **branch/class** from the student row).
- **Report type** + **period dates** unchanged.
- **Advanced (optional)** collapsible: paste UUIDs / optional assigned teacher — for edge cases or when RLS returns empty lists.
- **Reload lists** button re-fetches branch/class/student.
- Empty report list hint points staff to **Create report shell** without UUID typing.

**Not chosen:** separate dev fixture script (would still require DB credentials; UI fix addresses the primary UX gap).

## Safety boundaries (unchanged)

- **No** ParentView, **no** release, **no** notifications/email, **no** OCR/PDF automation.
- **No** provider keys in frontend; **no** auto **real AI** on load.
- **Demo mode:** mock draft path only; **real AI** remains disabled.
- **Draft-only:** new shells stay **`draft`** until explicit lifecycle actions elsewhere.

## Next manual QA steps

1. **`npm run dev`** → **`http://localhost:5173/ai-parent-reports`** as **real HQ** ( **no** `demoRole` ).
2. **Create report shell:** branch → student → dates → **Create report shell**.
3. Confirm report appears in **Parent Reports** list → select it.
4. Scroll to **Generate real AI draft** → click once → verify **`real_ai`** version and **no** parent visibility until release.

## Blockers if lists are empty

- **RLS** may return zero branches/classes/students — then **Advanced** UUIDs apply, or seed DEV data / fix policies (outside this UI change).

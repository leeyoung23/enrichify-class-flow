# Real AI staff draft — manual QA unblock (create report shell)

## Why QA was blocked

1. **`listAiParentReports`** returned **no rows** because **no `ai_parent_reports` rows** existed yet for the project (typical empty DEV DB), **not** because HQ couldn’t read reports once rows exist.
2. **Create report shell** showed **raw UUID fields by default** when **`canUseSupabase`** was false. That happened when **`appUser`** (mapped profile) was still **`null`** even though a valid **`session.user`** existed — the gate used **`appUser.id` only**, so the UI fell through to the legacy grid before profile hydration finished (or on transient profile failure).
3. **Demo mode** (`?demoRole=`) correctly disables real AI and keeps **mock-only** raw/dev fields; **`Demo Role Preview`** in the shell without `demoRole` does **not** set demo mode by itself.
4. **`ff41cfc`** still allowed the wrong default when **`showStaffCreatePickers`** stayed tied to **`canUseSupabase`** and **`loadPickerCatalog`** used the same gate — any frame where identity/catalog disagreed routed to the **non-picker** branch (misconfigured/no-session fallback with raw UUID **Advanced**). Native **`<details>`** could also feel like a primary surface for UUIDs.
5. **Follow-up fix:** **`showStaffSelectorShell`** = **`canAccess && !inDemoMode && isSupabaseConfigured()`** — selector UI always renders for real staff when the client exists; **`loadPickerCatalog`** uses the same gate (not **`canUseSupabase`** alone). **`hasLiveSupabaseIdentity`** still drives **`canUseSupabase`** for lists/detail elsewhere; inline banners handle missing JWT. **Advanced UUID fallback** uses **Radix Collapsible `defaultOpen={false}`** so UUID inputs are never the default visible surface.
6. **Demo Role Preview vs AI Parent Reports:** There is **no** persisted `demoRole` in localStorage — only **`?demoRole=`** in the URL (see **`getSelectedDemoRole`**). **`DemoRoleSwitcher`** lived **beside** `<Outlet />`, so **`useOutletContext()` was always empty** → badge defaulted to **Teacher** while the sidebar showed the real **HQ Admin** role from **`AppLayout`**. Fixed by passing **`layoutRole`** from **`AppLayout`**. **`AiParentReports`** uses **`useSearchParams`** for **`inDemoMode`** and adds **Exit demo preview** (strip **`demoRole`** from URL) plus **Diagnostics** line (`demo preview` / `real staff` / `no-session`).

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

1. **`npm run dev`** → **`http://localhost:5173/ai-parent-reports`** — URL **without** `?demoRole=…`, signed in as staff (HQ admin).
2. **Create report shell:** expect **Branch** → optional **Class** → **Student**, **Reload lists**, **Report type**, period dates first; **Advanced UUID fallback** stays **collapsed** until expanded. Small **Mode:** line shows **`signed-in staff`** / **`session loading`** / **`no-session`** (no secrets).
3. Confirm report appears in **Parent Reports** list → select it.
4. Scroll to **Generate real AI draft** → click once → verify **`real_ai`** version and **no** parent visibility until release.

### Automated validation (staff UI change only)

```bash
npm run build
npm run lint
npm run typecheck
npm run test:supabase:ai-parent-reports
npm run test:supabase:ai-parent-report:real-ai-persistence
npm run test:supabase:ai-parent-report:edge-generation-auth
```

## Blockers if lists are empty

- **RLS** may return zero branches/classes/students — then **Advanced** UUIDs apply, or seed DEV data / fix policies (outside this UI change).

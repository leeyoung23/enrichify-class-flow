# Navigation clickability + simplicity fixes checkpoint

Date: 2026-05-02  
Scope: **UI copy and layout only** — **no** Supabase SQL/RLS, **no** new persistence, **no** parent visibility rule changes, **no** `real_ai`, **no** provider keys, **no** email/notification/PDF.

## Summary

- **ParentView** — **Latest announcements and events**: shows **latest** card, then **up to 3** additional items by default; **View more history** / **Show less** toggles full list (still **published-only**; no drafts). Section title and jump link copy aligned. **No** new writes; **no** change to which rows load.
- **My Tasks** — **From announcements** requests grouped: **Upload needed** → **Reply needed** → **Other requests** → **Completed**; intro copy for scan order. **Open Announcement** unchanged.
- **Branches / Classes / Teachers / Students** — **Directory preview** language in `PageHeader`; **removed hover-shadow** “button” affordance on static cards (`border-muted/80` instead). **No** new detail routes.

## Safety

| Topic | Status |
|-------|--------|
| ParentView published-only | **Unchanged** — list still from published parent announcements path |
| Staff-only / draft data to parents | **Unchanged** |
| Supabase writes | **No** new write paths from this patch |

## Related

- **Canonical sealed reference:** `docs/navigation-clickability-simplicity-fixes-final-checkpoint.md`
- `docs/teacher-simplicity-navigation-clickability-audit.md`
- `docs/ai-parent-report-workflow-ux-polish-checkpoint.md`

## Validation (recorded at UI commit `74a71bf`)

When **`src/`** changes for this surface, re-run: `npm run build` · `npm run lint` · `npm run typecheck` · `npm run test:supabase:parent-announcements` · `npm run test:supabase:announcements:phase1`.

**Snapshot at `74a71bf`:** all **PASS** (expected **CHECK** lines in parent-announcements and announcements:phase1 when optional fixtures absent).

**Docs-only rule:** do **not** re-run build/lint/typecheck unless **`src/`** or tooling changes.

## Future

- Per-card **“View”** when detail routes exist.  
- **My Tasks** + general notifications merge into one visual system if product wants.  
- **ParentView** in-page **tabs** instead of hash links for parent nav (separate milestone).

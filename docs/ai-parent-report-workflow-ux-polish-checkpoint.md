# AI Parent Reports — workflow UX copy polish checkpoint

Date: 2026-05-02  
Scope: **`src/pages/AiParentReports.jsx`** copy + layout order + **`src/components/layout/AppLayout.jsx`** Company News popup presentation only. **No** SQL/RLS, **no** provider keys, **no** `real_ai` unlock, **no** ParentView change, **no** new services.

## Intent

- Shorten the page intro; add a **one-line workflow** and a **safety** line (no parent release; no real provider/PDF).
- **Evidence-first** reading order: **Report detail** (with version pick for release) → **Source Evidence Preview** (emphasised) → **Generate draft from source evidence** → **Manual version / override** → **Lifecycle**.
- **Create report shell** — less technical than “Create Draft (Manual/Demo Data)”.
- **Generate draft** — “Optional teacher notes / overrides” + “Leave blank to use source evidence where available.”
- **Manual version** — framed as optional overrides; button label **Save manual version** (same handler).
- **Lifecycle** — clarify **Release** as parent-visible boundary.

## Warm Company News popup

- **Not removed.** Softer footprint: narrower max width (`lg:max-w-[17rem]`), lighter shadow, tighter padding, shorter body clamp (`line-clamp-2`), **Dismiss** retained; bottom-right fixed position unchanged. **No** popup eligibility/data logic changes.

## Safety preserved

| Topic | Status |
|-------|--------|
| `real_ai` / provider UI | **Still absent** |
| Provider keys / SQL / env in UI | **Still avoided** |
| ParentView | **Unchanged** |
| Mock-only draft generation path | **Unchanged** |
| Auto-release / PDF / email | **Still none** |

## Related docs

- `docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`
- `docs/ai-parent-report-source-preview-hybrid-ui-final-checkpoint.md`
- `docs/manual-preview-product-direction-corrections.md`

## Validation

Run after **`src/`** changes: `npm run build`, `npm run lint`, `npm run typecheck`, and AI parent report smokes (`source-aggregation`, `rls-source-aggregation`, `mock-draft`, `ai-parent-reports`).

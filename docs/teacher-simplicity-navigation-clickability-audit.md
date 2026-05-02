# Teacher simplicity + navigation clickability audit

Date: 2026-05-02  
Type: **planning / checkpoint only** — defines principles, maps navigation, flags UX risks, and recommends implementation order. **No** SQL/RLS, **no** provider keys, **no** runtime UI changes in this milestone.

**Audience:** Kindergarten / primary teachers and staff who may not be highly technical; workflows must feel **obvious**, **short**, and **safe**.

---

## 1. Product principles

| Principle | Meaning |
|-------------|---------|
| **Obvious next step** | Each primary screen states what to do first (e.g. select class → upload → note → submit). |
| **Fewer choices per screen** | Prefer one primary action; tuck advanced setup behind clear labels. |
| **Clear upload / review / release language** | Use verbs teachers use daily; avoid “generationSource”, raw enums, or engineer jargon on primary surfaces. |
| **No hidden workflows** | If something affects parents, say so; if staff-only, say “staff only”. |
| **Avoid technical words** | Prefer “student”, “class”, “photo”, “report” over UUID, RLS, mock_ai in teacher-facing copy (internal docs/dev tools excepted). |
| **Explicit demo / placeholder** | Anything that does not persist or is local-only should say **Demo** or **Preview** — not look identical to live data. |
| **No deceptive affordances** | Cards that are **not** clickable should not use hover/raised styles that imply **click to open**. |

---

## 2. Current navigation map (from `getRoleNavigation`)

Routes come from `src/services/permissionService.js` → `ROLE_NAVIGATION`. **Assessment** is qualitative (functional vs partial vs demo/shell); verify per-environment.

### HQ Admin (`hq_admin`)

| Nav label | Route | Main action | Assessment | Clickability / risk |
|-----------|-------|-------------|------------|---------------------|
| Dashboard | `/` | Overview, stats, alerts | Functional / mixed data source | Links/buttons generally explicit |
| Announcements | `/announcements` | Requests, Company News, Parent Notices | Functional (demo + auth paths) | Many tabs — **medium** cognitive load |
| AI Parent Reports | `/ai-parent-reports` | Evidence → draft → lifecycle | Functional | Improved workflow copy (**31bd0ee**); still dense — **medium** |
| Branches | `/branches` | List branches; HQ adds branch | Functional | Branch **cards** hover but **no drill-down** — **high** dead-click risk |
| Classes | `/classes` | List/create classes; curriculum assign | Functional | Cards interactive for curriculum; complexity — **medium** |
| Teachers | `/teachers` | Staff list | Partial / data-dependent | Same card affordance risk |
| Students | `/students` | Student records | Partial / data-dependent | Same |
| Attendance | `/attendance` | Take/review attendance | Functional scope varies | Needs step clarity audit |
| Staff Time Clock | `/staff-time-clock` | Clock in/out | Feature-dependent | Verify demo vs live labeling |
| Homework | `/homework` | Upload / review homework | Functional | Core teacher workflow — **high** priority for simplicity |
| Parent Communication | `/parent-updates` | Threads, weekly progress, memories | Functional | Distinct from Announcements — **medium** confusion if nav unclear |
| Leads & Enrolment | `/leads` | CRM-style leads | Shell/partial | Often demo — label risk |
| Trial Scheduling | `/trial-scheduling` | Schedule trials | Shell/partial | |
| Teacher KPI | `/teacher-kpi` | Metrics | Shell/demo-heavy | May feel “report” not “action” |
| Fee Tracking | `/fee-tracking` | Fees | HQ-centric | Teachers may not need — OK for HQ |
| Sales Kit | `/sales-kit` | Materials | Shell/partial | |
| Observations | `/observations` | Observation UI | Partial shell | Terminology — **medium** |
| Branch Performance | `/branch-performance` | Analytics | Shell/partial | |
| Future AI Engine | `/future-ai-learning-engine` | Concept/planning | **Placeholder** | Should read **future** clearly |
| Migration Audit | `/migration-ownership-audit` | Internal audit | **Placeholder / technical** | **High** risk for non-technical teachers if ever exposed outside HQ |
| Prototype Summary | `/prototype-summary` | Summary doc page | **Placeholder** | |

### Branch Supervisor (`branch_supervisor`)

Subset of HQ: no **Branches**, no **Future AI / Migration / Prototype** in nav (cleaner). Same risks on **Classes**, **Teachers**, **Students**, **Homework**, **Parent Communication**, **Announcements**, **AI Parent Reports**.

### Teacher (`teacher`)

| Nav label | Route | Main action | Notes |
|-----------|-------|-------------|-------|
| Dashboard | `/` | Today’s snapshot | **Start Class Session** CTA — good |
| Announcements | `/announcements` | Same as HQ subset | Filter complexity |
| AI Parent Reports | `/ai-parent-reports` | Evidence-led drafting | Dense — priority simplification |
| Class Session | `/class-session` | Run session | Core |
| My Classes | `/classes` | Scoped classes | Label clarity OK |
| My Students | `/students` | Scoped students | |
| Attendance | `/attendance` | Mark attendance | |
| Staff Time Clock | `/staff-time-clock` | Clock | |
| Homework | `/homework` | Review/upload | **Critical** simplicity path |
| Parent Communication | `/parent-updates` | Updates to parents | **Critical** — distinguish from Announcements |
| My Tasks | `/my-tasks` | Internal requests | Link to HQ workflow |
| Teacher KPI | `/teacher-kpi` | Personal KPI | Less urgent than operational flows |
| Observations | `/observations` | Notes | Naming — consider “Learning notes” |

**Risk:** Teacher nav is still **long**; priority surfaces should win (Homework, Parent Communication, Class Session, Attendance).

### Parent (`parent`)

| Nav label | Route | Main action |
|-----------|-------|-------------|
| Parent Dashboard | `/parent-view` | Unified parent hub |
| Child Attendance | `/parent-view#attendance-summary` | Hash section |
| Child Homework | `/parent-view#homework-history` | Hash section |
| Parent Reports | `/parent-view#latest-report` | Released reports only (policy) |
| Student Learning Portal | `/parent-view#student-learning-portal` | Materials |

**Risk:** Hash navigation can feel **invisible** if sections don’t scroll-highlight; ensure in-page anchors obvious.

### Student (`student`)

All entries route to **`/parent-view`** with different hashes — learning-portal framing.

---

## 3. Clickability audit (summary)

| Area | Typical pattern | Classification | Recommendation |
|------|-----------------|----------------|----------------|
| **Branches** | Grid cards with `hover:shadow-lg`, no `Link` | **Clickable-looking, not clickable** | Remove hover-like affordance **or** add “View” / detail route **or** label “Directory (no drill-down yet)” |
| **Classes / Teachers / Students** | Similar cards | Mix of **list + dialogs** | Audit each: only hover on truly interactive rows |
| **Dashboard** HQ cards | **StatCard** / list cards | Mostly **informational** | Ensure lists don’t look like buttons unless linked |
| **Homework** | Actions for upload/marked work | **Functional** — priority for step labels | Step copy pass (see §5) |
| **Parent Communication** | Tabs/cards | **Functional** | Keep distinct from Announcements in intro |
| **Announcements** | Filters + create flows | **Functional** | HQ vs teacher capabilities differ — surface in UI |
| **AI Parent Reports** | Many cards | **Functional** but dense | Continue evidence-first pattern; avoid UUID in primary copy where possible |
| **Fee Tracking** | If present for role | Finance workflow | Lower priority for classroom teachers |
| **Staff Time Clock** | Clock actions | Feature-dependent | Demo vs live badge |
| **Company News popup** (`AppLayout`) | Corner popup | **Dismiss + View** | Already softened (**31bd0ee**) — watch overlap with forms |

---

## 4. Teacher simplicity audit ( focal pages )

| Page | Main teacher action | Obvious? | Upload/review clear? | Too technical? | Guide needed? | Mobile density |
|------|---------------------|----------|-------------------------|----------------|---------------|----------------|
| **Homework** | Upload worksheet / upload marked / link to class | Partial | Improving; needs **numbered steps** on hero | Some IDs in forms | **Yes** — short strip “Step 1–4” | **High** — many panels |
| **Parent Communication** | Post update / weekly progress / memories | Partial | Moderate | Improved naming | **Yes** — “what parents see” callout | **Medium** |
| **AI Parent Reports** | Shell → evidence → draft → lifecycle | Better post-polish | Evidence-first OK | Still internal labels in detail JSON | **Yes** — one onboarding sentence | **High** evidence grid |
| **Attendance** | Mark present/absent | Role-dependent | Needs per-branch UX check | Medium | Optional | Medium |
| **Class Session** | Run lesson session | OK if CTA visible | N/A | Low | Short tooltip | Medium |
| **My Tasks** | Complete HQ/internal requests | Depends on implementation | Link uploads | Medium | **Yes** — “what to upload” | Medium |
| **Observations** | Record observation | Shell risk | N/A | **Observations** jargon | Rename consideration | Medium |

---

## 5. Upload / receiving flow audit ( planned simplified steps )

Use these as **future copy** targets on hero strips or accordions — not implemented in this doc.

| Flow | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 |
|------|--------|--------|--------|--------|--------|
| **Homework upload** | Choose class & student | Attach file / photo | Add short note | Submit / save | Status: submitted / reviewed |
| **Marked work upload** | Choose submission | Attach marked file | Optional comment | Save | Visible to parent when policy allows |
| **Memory / photo** | Choose class/event | Upload media | Caption + consent flags | Submit for review | Published when approved |
| **Parent event photo (future)** | HQ requests | Teacher uploads | Supervisor review | Publish | Parents see in notices |
| **HQ request / document** | Open **My Tasks** | Read request | Upload document | Mark done | Audit trail |
| **Parent quick comment** | Parent Communication | Select thread/context | Type comment | Send | Staff notified per policy |
| **AI report draft** | Select report shell | Review **Source Evidence** | **Generate draft** | Edit / optional manual version | Submit → approve → **Release** |

---

## 6. Demo / placeholder clarity rules

1. **Non-persisting actions** → visible **Demo** or **Local only** badge near primary button.  
2. **Non-interactive summary cards** → use **static** card style (no hover shadow that mimics buttons).  
3. **Future features** → **Coming soon** or hide from roles where misleading (e.g. teacher sees “Migration Audit”).  
4. **Admin directory pages** (branches/classes lists) → subtitle like **“Setup directory — tap Add to edit”** instead of implying each card opens a record.  
5. **Internal-only pages** (prototype, future AI) → banner **Staff setup / preview only**.

---

## 7. Recommended terminology (non-binding)

| Current / internal | Friendlier option |
|--------------------|-------------------|
| Parent Updates (legacy) | **Parent Communication** (done) |
| Generate Mock Draft | **Generate draft from source evidence** (done) |
| Create Version | **Manual version / override notes** (done) |
| Branches / Classes (teacher mental model) | Optional: **Centre setup** / **Class setup** for parents brochure |
| Observations | **Student observations** / **Learning notes** |
| My Tasks | **Tasks** or **Requests from HQ** |
| My Homework Review (if used) | **Homework review** |
| Hash-only parent nav | In-page **tabs** or **section chips** for same URL |

---

## 8. UX risk register

| Risk | Level | Notes |
|------|-------|-------|
| Branch/class **cards** look clickable, no navigation | **High** | Screenshot concern |
| **Too many HQ nav items** for accidental teacher demo role confusion | **Medium** | Demo role switcher visibility |
| Technical strings (**UUID**, **mock_ai**, JSON in report detail) | **Medium** | Hide behind “Advanced” or staff-only expand |
| **Dense AI evidence** grid | **Medium** | Mobile overflow / fatigue |
| **Company News** popup vs forms | **Medium** | Mitigated; keep monitoring |
| **Announcements vs Parent Communication** | **Medium** | Doc + header copy; periodic QA |
| Parent **release** misunderstood | **High** | Lifecycle wording — partially addressed |
| **Fee / KPI / Sales** nav noise for teachers | **Low** | HQ-only or hide via role already |

---

## 9. Recommended implementation sequence

| Option | Scope |
|--------|--------|
| **A** | **Audit only** (this document) |
| **B** | **Fix non-clickable affordances + demo labels** (cards, empty CTAs) |
| **C** | **Teacher upload flows** — numbered steps, fewer fields per step |
| **D** | **Mobile simplification** pass (~390px) |
| **E** | **Real AI provider smoke** (after UX stable) |

**Recommendation:** **B → C → D** before **E**. Reduce **dead-click** and **placeholder confusion** first; then **homework/parent comm** step UX; then mobile; **real AI** last once teachers can complete flows confidently.

---

## 10. Next implementation prompt (copy-paste)

```text
Fix navigation clickability and placeholder clarity only (no SQL/RLS, no real_ai, no ParentView rule changes).

Goals:
1. Admin directory pages (Branches, Classes, Teachers, Students): remove misleading hover/click affordances on non-navigating cards OR add explicit drill-down OR add visible “directory only” / demo labels.
2. Pages that are prototype/future-only: banner or sidebar badge “Preview / coming soon” so teachers don’t mistake for daily workflow.
3. Teacher primary flows (Homework, Parent Communication): optional numbered step strip in page hero (Step 1–3) without changing backend contracts.
4. Re-run manual QA at ~390px for tap targets and overflow.

Reference: docs/teacher-simplicity-navigation-clickability-audit.md

Validate: build, lint, typecheck; smoke tests if services touched.
```

---

## Implementation note (2026-05-02)

Partial alignment: **`docs/navigation-clickability-simplicity-fixes-checkpoint.md`** — ParentView announcement **compact + expand history**; **My Tasks** **grouped sections**; setup pages **static card** affordance reduced + **directory preview** copy. Further work (detail routes, tab nav) remains future.

## Related checkpoints

- `docs/navigation-clickability-simplicity-fixes-checkpoint.md`
- `docs/manual-qa-ai-report-hybrid-source-preview-checkpoint.md`
- `docs/ai-parent-report-workflow-ux-polish-checkpoint.md`
- `docs/manual-preview-product-direction-corrections.md`
- `docs/mobile-first-qa-checkpoint.md`

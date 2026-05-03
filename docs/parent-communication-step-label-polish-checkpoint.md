# Parent Communication — step-label polish (checkpoint)

Date: 2026-05-03  
**Final seal (docs):** **`docs/parent-communication-teacher-workflow-polish-final-checkpoint.md`** — completed state, safety, QA status, parked lanes, next options (**A–F**).  
Scope: **`src/pages/ParentUpdates.jsx`** — teacher-facing **UX/copy** and **layout** only (`/parent-updates`). **No** SQL/RLS, **no** storage buckets, **no** new write contracts, **no** provider keys, **no** notification/email sending, **no** ParentView visibility rule changes.

## Teacher simplicity principle

Steps are numbered **1–5** with plain-language titles so kindergarten/primary teachers can follow **memory → type → class/student → learning evidence preview → write/review** without reading technical status names first.

## What changed

| Area | Detail |
|------|--------|
| **Page intro** | **Parent Communication** title unchanged; description states class memories, quick comments, weekly updates; **Announcements** for official centre notices/events; parents only see approved/released content |
| **Steps 1–3** | **Step 1** — Add class memory (“Upload a class moment for review”, demo upload line). **Step 2** — Choose **Quick Parent Comment** vs **Weekly Progress Report** with short explanations; full-width toggle buttons on small screens. **Step 3** — Class + student selects with amber guidance when incomplete |
| **Steps 4–5 (comments)** | **Learning evidence preview** (renamed from technical “Source Summary”); **Step 5** — teacher note + **Generate AI Comment Draft** with “Draft only — nothing is sent.” Review screen: **Review before sharing with family**; buttons **Approve & share with family**, etc. |
| **Weekly** | Same step framing: evidence preview card + weekly fields; **Share with family** instead of “Release to Parent” alone |
| **All updates panel** | Friendly status labels (**Draft**, **Needs review**, **Teacher edited**, **Ready to share with family**, **Shared with family**); **class** shows human-readable name when available; parents-never-see-drafts copy |
| **All updates — action hint (follow-up)** | Manual QA found a **no-op** outline **Button** for **Review / Edit / View** that looked clickable. Replaced with a **non-interactive** dashed-border hint: **Next: Review**, **Next: Edit**, **View only** (no `onClick`, not a button). Real row navigation / open-record behaviour remains **future** if product wants it — **no** backend/RLS/storage/provider/notification/ParentView change |

## Safety (preserved)

- **No** automatic send to parents; **no** email/notification implementation  
- **No** real AI provider requirement — existing **`generateParentCommentDraft`** / demo paths unchanged  
- **No** service role in frontend; **no** raw storage URLs in new copy  
- Parent visibility rules unchanged — release/share remains explicit staff action  

## Related

- **`docs/teacher-upload-step-simplification-plan.md`** §5, §12 (**C**)  
- **`docs/manual-preview-product-direction-corrections.md`**  
- **`docs/project-master-context-handoff.md`**, **`docs/mobile-first-qa-checkpoint.md`**, **`docs/rls-test-checklist.md`**

## Validation

Touching **`ParentUpdates.jsx`**: **`npm run build`**, **`npm run lint`**, **`npm run typecheck`**, **`npm run test:supabase:parent-announcements`**, **`npm run test:supabase:parent-announcements:media`**, optional **`npm run test:supabase:ai-parent-report:source-aggregation`** if source/evidence paths were logically touched (copy-only **may** skip).

## What remains future

- **All updates:** optional **wire** row hint to scroll/select/update workflow when product defines behaviour — not implemented in the hint-only fix above  
- Deeper **My Tasks** / Announcements verb-led buttons (**D** in simplification plan)  
- Wire evidence preview to richer live data under existing RLS (no UX contract change assumed here)  
- Notification/email automation, **real_ai**, worksheet/OCR — separate milestones  

# Parent Communication — step-label polish (checkpoint)

Date: 2026-05-03  
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
| **All updates panel** | Friendly status labels (**Draft**, **Needs review**, **Teacher edited**, **Ready to share with family**, **Shared with family**); **class** shows human-readable name when available; primary row action **Review** / **Edit** / **View**; parents-never-see-drafts copy |

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

- Deeper **My Tasks** / Announcements verb-led buttons (**D** in simplification plan)  
- Wire evidence preview to richer live data under existing RLS (no UX contract change assumed here)  
- Notification/email automation, **real_ai**, worksheet/OCR — separate milestones  

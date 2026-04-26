# Supabase Migration Blueprint

This blueprint describes how to move the current Base44 prototype into an owned Supabase-backed product without adding new product scope during the migration. It is written for a founder/operator audience: enough technical detail to guide sequencing, security decisions, and contractor review, without assuming the reader needs to inspect every source file.

## 1. Current Base44 dependencies to replace

The app still depends on Base44 for platform wiring, authentication, data, file storage, functions, email, AI calls, and user invites.

Replace these areas:

- Base44 SDK client in `src/api/base44Client.js`.
- Base44 Vite plugin in `vite.config.js`.
- Base44 environment and URL parameter handling in `src/lib/app-params.js`.
- Base44 auth/session bootstrap in `src/lib/AuthContext.jsx`.
- Base44 user lookup in `src/services/authService.js`.
- Base44 entity CRUD in `src/services/dataService.js` and `src/services/classSessionService.js`.
- Base44 logout usage in `src/components/layout/Sidebar.jsx`.
- Base44 auth probe in `src/lib/PageNotFound.jsx`.
- Direct Base44 LLM call in `src/components/classSession/StudentSessionCard.jsx`.
- Base44 function `base44/functions/sendParentReport/entry.ts`.
- Base44 packages in `package.json` and `package-lock.json`.

## 2. Target Supabase architecture

Target stack:

- React/Vite frontend remains the app shell.
- Supabase Auth manages staff, parent, and student sessions.
- Supabase Postgres stores all operational records.
- Supabase Row Level Security is the source of truth for access control.
- Supabase Storage stores homework uploads, receipts, and future scan files in private buckets.
- Supabase Edge Functions handle privileged server work: report emails, signed parent links if used, AI calls, OCR/marking orchestration, and admin-only invites.
- Optional hosted frontend, such as Vercel or Netlify, serves the Vite app.

Key principle: keep UI routes and workflows stable while replacing backend implementations behind the service layer.

## 3. Proposed database tables

Core identity and access:

- `profiles`: one row per Supabase auth user; fields include `id`, `email`, `full_name`, `role`, `branch_id`, `student_id`, `guardian_parent_id`, `status`.
- `branches`: branch records with `name`, `code`, `address`, `phone`, `status`.
- `classes`: class records with `branch_id`, `name`, `subject`, `level`, `schedule`, `status`.
- `students`: student records with `branch_id`, `class_id`, `name`, parent contact fields, and `status`.
- `teachers`: teacher profile records linked to `profiles`.
- `teacher_class_assignments`: many-to-many table for teacher access to classes.
- `guardian_student_links`: many-to-many table linking parent/guardian profiles to students.

Operations:

- `attendance_records`: per-student class attendance with `student_id`, `class_id`, `branch_id`, `teacher_id`, `session_date`, `status`, `homework_status`, `notes`.
- `parent_reports`: report workflow table with teacher note, AI draft, final message, approved report, shared report, status, approver, and timestamps.
- `homework_attachments`: metadata for parent/student uploads and teacher review.
- `fee_records`: invoices/payment tracking by student, class, branch, and fee period.
- `observations`: classroom observation scores, notes, follow-up actions, and status.
- `teacher_task_sessions`: operational completion tracking for attendance, homework, notes, drafts, approvals, and lateness.
- `leads`: enrolment lead records.
- `trial_schedules`: trial class booking records.

Future AI learning tables:

- `homework_scans`
- `curriculum_knowledge_base`
- `ai_marking_diagnoses`
- `teacher_follow_up_tasks`
- `student_reminders`

Use Postgres enums or constrained text values for roles, report statuses, attendance statuses, homework statuses, payment statuses, and upload review statuses.

## 4. Role-based RLS policy plan

RLS should be implemented before real data is entered. Frontend filtering is helpful for UX, but database policy must enforce privacy.

Roles:

- `hq_admin`: can read and manage all branches and operational records.
- `branch_supervisor`: can read and manage records where `branch_id` matches their profile branch.
- `teacher`: can read assigned classes through `teacher_class_assignments`; can access students, attendance, homework, and reports connected to those assigned classes.
- `parent`: can read only linked children through `guardian_student_links`; can see approved/shared reports only; can upload homework only for linked children.
- `student`: can read own student-facing records only; can see approved/shared feedback and own homework/attendance.

Policy helpers to create:

- `current_profile()`
- `current_role()`
- `current_branch_id()`
- `is_hq_admin()`
- `can_access_branch(branch_id)`
- `can_access_class(class_id)`
- `can_access_student(student_id)`

Do not rely on client-supplied `role`, `branch_id`, `student_id`, or `guardian_parent_id`.

## 5. Parent magic-link access plan

Recommended production approach:

1. Create parent users in Supabase Auth.
2. Link parent profiles to children through `guardian_student_links`.
3. Send Supabase Auth magic links for sign-in.
4. After login, route parents to `/parent-view?student=<id>` or a cleaner parent dashboard route.
5. Let RLS decide whether the parent can access that child.

Avoid using bare unsigned links like `/parent-view?student=<id>` as private access. A student id in a URL is not a security boundary.

If no full parent account is desired at first, use a short-lived signed token design:

- Edge Function creates a one-time or short-TTL token scoped to `student_id` and guardian email.
- Token is stored hashed in `parent_access_tokens`.
- Parent opens link, Edge Function validates token, then either exchanges it for a limited session or serves scoped data through server-side checks.

The full Supabase Auth magic-link path is safer and easier to audit.

## 6. Homework upload/storage plan

Use a private Supabase Storage bucket, for example `homework`.

Storage path convention:

- `homework/{branch_id}/{class_id}/{student_id}/{yyyy}/{mm}/{attachment_id}-{safe_filename}`

Database row in `homework_attachments` should be created in the same workflow as upload completion:

- `student_id`
- `class_id`
- `branch_id`
- `uploaded_by`
- `uploaded_by_role`
- `storage_bucket`
- `storage_path`
- `file_name`
- `mime_type`
- `file_size`
- `status`
- `ai_draft_result`
- `ai_confidence`
- `teacher_review_status`
- `teacher_comment`
- `parent_feedback_status`
- `created_at`
- `reviewed_at`
- `released_at`

Access rules:

- Parents/students can upload only for linked or own student records.
- Teachers can read/review uploads for assigned classes.
- Branch supervisors can read/review uploads in their branch.
- HQ can read/manage all uploads.
- Storage object access must require the same student/class/branch checks as the metadata row.

## 7. AI marking future architecture

Do not build the full AI marking system inside Base44. Move AI work to Supabase-compatible server boundaries.

Future flow:

1. Parent/student uploads homework file.
2. `homework_attachments` row is created with `status = 'received'`.
3. Edge Function starts OCR/extraction and creates a `homework_scans` row.
4. AI marking service compares extracted work against `curriculum_knowledge_base`.
5. Result is stored in `ai_marking_diagnoses`.
6. Teacher reviews result before any parent-facing feedback is released.
7. Approved follow-up actions create `teacher_follow_up_tasks` and optional `student_reminders`.

Important guardrail: AI output should never go directly to parents or students without teacher review.

## 8. Fee tracking persistence plan

Create `fee_records` as the source of truth for fee tracking.

Suggested fields:

- `student_id`
- `branch_id`
- `class_id`
- `fee_period`
- `fee_amount`
- `currency`
- `due_date`
- `payment_status`
- `payment_method`
- `receipt_storage_path`
- `receipt_uploaded`
- `receipt_reference_note`
- `verified_by`
- `verified_at`
- `internal_note`
- `created_at`
- `updated_at`

Recommended statuses:

- `unpaid`
- `pending_verification`
- `paid`
- `overdue`
- `waived`
- `cancelled`

Keep payment collection separate unless and until a payment gateway is intentionally added. This table can track manual payments, receipt verification, and internal notes without storing card or bank secrets.

## 9. Report workflow persistence plan

Create `parent_reports` for the full report lifecycle.

Suggested fields:

- `student_id`
- `class_id`
- `branch_id`
- `teacher_id`
- `teacher_email`
- `teacher_name`
- `note_text`
- `ai_draft`
- `final_message`
- `approved_report`
- `shared_report`
- `status`
- `approved_by`
- `approved_at`
- `shared_by`
- `shared_at`
- `created_at`
- `updated_at`

Recommended statuses:

- `note_created`
- `ai_draft_generated`
- `edited`
- `approved`
- `shared`
- `archived`

Normalize current mixed naming during migration: use `note_text` consistently rather than both `notes` and `note_text`.

Report sending should move to an Edge Function that:

- verifies the caller can send the report,
- confirms the report is approved/shared,
- creates a parent magic link or signed access link,
- sends email through a configured provider,
- writes a send/audit event.

## 10. Step-by-step migration sequence

1. Freeze new Base44-specific feature development.
2. Create Supabase project, environments, and secrets.
3. Define tables, enums, foreign keys, indexes, and audit timestamps.
4. Implement RLS policies and helper functions.
5. Seed non-sensitive demo data in Supabase.
6. Add a Supabase client and profile-loading auth service.
7. Rewrite service-layer read methods behind existing function names.
8. Rewrite write methods for attendance, reports, students, classes, and branches.
9. Add homework Storage and `homework_attachments`.
10. Add fee persistence and receipt storage.
11. Replace report email sending with Supabase Edge Function.
12. Replace AI draft calls with Edge Function boundary.
13. Replace invite/user-management flow with Supabase Auth/Admin APIs.
14. Run role-by-role manual QA: HQ, branch supervisor, teacher, parent, student.
15. Remove Base44 SDK, Vite plugin, env params, Base44 function code, and unused imports.
16. Only then consider importing real operational data.

## 11. Must be completed before real student/parent/payment data is used

Before using real data, complete:

- Supabase Auth configured for staff and parent access.
- `profiles` populated and role assignment controlled by admin-only flow.
- RLS enabled and tested on every table containing student, parent, fee, report, attendance, or homework data.
- Private Storage buckets with access policies tested.
- Parent magic-link flow verified without exposing arbitrary student ids.
- Report visibility restricted to approved/shared content.
- Fee records confirmed not to store card, bank password, or sensitive payment secrets.
- Audit logging for report sends, fee status changes, and file uploads.
- Backup/export plan for Postgres and Storage.
- Environment variable management for local, staging, and production.
- Manual QA for all roles using separate test users.
- Privacy review for child data, parent data, payment references, and AI-generated content.

## 12. What should not be built further in Base44

Avoid expanding these areas in Base44 because they will be rewritten:

- Real parent authentication or production private links.
- Real student, parent, fee, payment, or school records.
- Production homework upload workflows.
- AI marking, OCR, or diagnosis pipelines.
- Payment gateway integrations.
- Long-lived report email workflows.
- Complex invite/user administration.
- New Base44 entity schemas intended for long-term production use.
- New direct Base44 calls inside page or component files.

Base44 remains useful for prototype review and fake demo data, but production ownership should move to Supabase before sensitive data or operational workflows are introduced.

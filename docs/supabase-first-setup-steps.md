# Supabase First Setup Steps

This is a manual setup guide for the first Supabase project setup phase.

Use this before any runtime app code changes in Cursor.

---

## 1) Create Supabase project

### Step 1: Create account/project

1. Go to [Supabase](https://supabase.com/) and sign in.
2. Click **New project**.
3. Suggested project name: `young-learners-demo-mvp`
   - You can choose another name, but keep it clear and environment-specific.
4. Create a **strong database password**.
   - Save it in your password manager.
   - Do not store it in plaintext docs or chat logs.
5. Choose region:
   - Pick the region closest to your primary users/team.
   - If unsure, choose the closest stable region with low expected latency.
6. Wait for project provisioning to complete.

### Step 2: Collect project values (for later local use)

From **Project Settings -> API**, note:

- Project URL (later used as `VITE_SUPABASE_URL`)
- Anon public key (later used as `VITE_SUPABASE_ANON_KEY`)
- Service role key (server-only, never frontend)

### Step 3: What not to share

Never share publicly:

- Service role key
- Database password
- Any production secrets

Generally safe to use in frontend:

- Project URL
- Anon public key

---

## 2) Local environment setup

### Step 1: Create `.env.local` from template

In project root:

1. Open `.env.example`.
2. Create a new file `.env.local`.
3. Copy template keys from `.env.example` into `.env.local`.

### Step 2: Paste values

Set in `.env.local`:

- `VITE_SUPABASE_URL=<your-project-url>`
- `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>` (server-only placeholder for future secure backend use)
- Keep:
  - `VITE_APP_ENV=local`
  - `VITE_ENABLE_DEMO_MODE=true`
  - `VITE_PUBLIC_APP_NAME=Young's Learners`

### Step 3: Key exposure rules

- Frontend-safe:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Never expose to frontend/browser:
  - `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Git safety

- Do not commit `.env.local`.
- Do not commit real key values into any tracked file.

---

## 3) First database setup order

Run setup in this sequence inside Supabase (manual console planning order):

1. **Enums first**
   - Define role/status/type enums needed by schema.
2. **MVP tables second**
   - Create core tables first (profiles, branches, classes, students, guardians, links, assignments, attendance, homework, parent updates / parent-facing reports, etc.).
3. **Foreign keys**
   - Add FK constraints after parent tables are in place.
4. **Indexes**
   - Add indexes for common filters (branch_id, class_id, student_id, status, created_date, etc.).
5. **RLS helper functions**
   - Add helper SQL functions used by policies (role/branch/assignment checks).
6. **RLS policies**
   - Enable and apply row-level security table by table.
7. **Storage buckets**
   - Create required private/public buckets and storage policies.
8. **Fake seed data**
   - Insert only fake/demo rows for each role and branch scenario.

Do this in small checkpoints, testing each stage before moving to the next.

---

## 4) What you should not do manually yet

Do not do these yet:

- Do not import real data.
- Do not connect app runtime code to Supabase yet.
- Do not enable real email/notification sending.
- Do not enable real AI marking/report generation.
- Do not remove `demoRole`.

Goal now is safe project/database preparation only.

---

## 5) Exact next Cursor task after project creation

After you have:

- Supabase project URL
- Supabase anon key
- Local `.env.local` created

Use this prompt in Cursor:

> "I finished initial Supabase project setup and local `.env.local` with URL + anon key.  
> Do not connect runtime app code yet.  
> Please generate draft Supabase SQL migration files from existing schema docs, in safe order (enums -> tables -> FKs -> indexes -> RLS helpers -> RLS policies), plus fake seed SQL and an RLS role test script/checklist alignment.  
> Keep everything draft-only and do not change UI/runtime behavior."

This keeps work in planning/migration-draft mode before integration changes.

---

## Final safety reminder

No real student, parent, homework, fee, payment, school, or upload data should be used until:

- Auth is tested
- RLS is validated for every role
- Storage policies are validated
- Backup/recovery approach is understood
- Demo-to-Supabase parity checks pass

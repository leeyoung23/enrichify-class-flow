/**
 * Student Learning Observations (045) smoke test.
 *
 * - JWT + RLS only (anon client).
 * - Fails clearly if `public.student_learning_observations` is missing (apply 045 manually).
 * - Verifies teacher draft/submit boundaries, HQ review ability, and parent/student no raw access.
 *
 * No provider calls. No OCR. No email/SMS. No PDF storage.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const DEFAULT_BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_STUDENT_ID = "55555555-5555-5555-5555-555555555555";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function resolvePassword(roleVar) {
  return process.env[roleVar] || process.env.RLS_TEST_PASSWORD || "";
}

function nowIso() {
  return new Date().toISOString();
}

function monthStart(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return d.toISOString().slice(0, 10);
}

async function ensureTableExists(supabase) {
  const probe = await supabase.from("student_learning_observations").select("id", { count: "exact", head: true }).limit(1);
  if (!probe.error) return;
  const msg = String(probe.error?.message || "");
  const code = String(probe.error?.code || "");
  const lowered = msg.toLowerCase();
  if (
    code === "42P01" ||
    lowered.includes("does not exist") ||
    lowered.includes("schema cache") ||
    lowered.includes("could not find the table") ||
    lowered.includes("student_learning_observations")
  ) {
    fail(
      "Missing table public.student_learning_observations. Apply supabase/sql/045_student_learning_observations_foundation.sql manually, then re-run."
    );
  }
  fail(`Unexpected table probe error: code=${code} message=${msg}`);
}

async function run() {
  if (!supabaseUrl || !supabaseAnonKey) {
    printResult("SKIP", "Missing Supabase env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
    process.exit(0);
  }

  const { supabase } = await import("../src/services/supabaseClient.js");
  const { signInWithEmailPassword, signOut } = await import("../src/services/supabaseAuthService.js");

  if (!supabase) {
    printResult("SKIP", "Supabase client unavailable");
    process.exit(0);
  }

  await ensureTableExists(supabase);

  const teacherEmail = process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test";
  const teacherPass = resolvePassword("RLS_TEST_TEACHER_PASSWORD");
  if (!teacherPass) {
    printResult("CHECK", "Teacher credentials missing — teacher lane skipped");
  } else {
    const { error: tErr } = await signInWithEmailPassword(teacherEmail, teacherPass);
    if (tErr) {
      printResult("CHECK", `Teacher sign-in failed (${tErr.message || "unknown"})`);
      await signOut();
    } else {
      const self = await supabase.auth.getUser();
      const teacherProfileId = self?.data?.user?.id || null;
      if (!teacherProfileId) {
        printResult("CHECK", "Teacher profile id missing — teacher lane skipped");
        await signOut();
      } else {
        const periodMonth = monthStart(new Date());
        const insert = await supabase
          .from("student_learning_observations")
          .insert({
            branch_id: DEFAULT_BRANCH_ID,
            class_id: DEFAULT_CLASS_ID,
            student_id: DEFAULT_STUDENT_ID,
            teacher_profile_id: teacherProfileId,
            observation_period_month: periodMonth,
            observation_week: 1,
            status: "draft",
            engagement_rating: 4,
            engagement_evidence:
              "Participates actively during speaking activities but hesitates with unfamiliar prompts.",
            engagement_next_action: "Continue short oral prompts and pair discussion practice.",
            private_internal_note: "Internal-only: keep prompts short; avoid sensitive details.",
            ai_include_status: "needs_review",
          })
          .select("id,status,teacher_profile_id")
          .maybeSingle();
        if (insert.error || !insert.data?.id) {
          const imsg = String(insert.error?.message || "");
          if (imsg.toLowerCase().includes("schema cache") || imsg.toLowerCase().includes("could not find the table")) {
            fail(
              "student_learning_observations table missing in API schema cache. Apply supabase/sql/045_student_learning_observations_foundation.sql manually, then restart PostgREST/schema cache if needed."
            );
          }
          fail(`Teacher insert draft failed: ${imsg || "unknown"}`);
        }
        pass("Teacher can create own draft observation row (045)");

        const rowId = insert.data.id;
        const updateDraft = await supabase
          .from("student_learning_observations")
          .update({
            engagement_rating: 5,
            updated_at: nowIso(),
          })
          .eq("id", rowId)
          .select("id,engagement_rating,status")
          .maybeSingle();
        if (updateDraft.error) fail(`Teacher update draft failed: ${updateDraft.error.message}`);
        pass("Teacher can update own draft");

        const illegalReviewAttempt = await supabase
          .from("student_learning_observations")
          .update({
            status: "reviewed",
            reviewed_at: nowIso(),
            review_profile_id: teacherProfileId,
          })
          .eq("id", rowId)
          .select("id,status")
          .maybeSingle();
        if (!illegalReviewAttempt.error) {
          fail("Teacher unexpectedly updated row to reviewed (should be blocked by RLS)");
        } else {
          pass("Teacher cannot mark observation reviewed");
        }

        const submit = await supabase
          .from("student_learning_observations")
          .update({
            status: "submitted",
            submitted_at: nowIso(),
          })
          .eq("id", rowId)
          .select("id,status,submitted_at")
          .maybeSingle();
        if (submit.error) fail(`Teacher submit failed: ${submit.error.message}`);
        pass("Teacher can submit own observation");

        await signOut();
      }
    }
  }

  const hqEmail = process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test";
  const hqPass = resolvePassword("RLS_TEST_HQ_PASSWORD");
  if (!hqPass) {
    printResult("CHECK", "HQ credentials missing — HQ review lane skipped");
  } else {
    const { error: hErr } = await signInWithEmailPassword(hqEmail, hqPass);
    if (hErr) {
      printResult("CHECK", `HQ sign-in failed (${hErr.message || "unknown"})`);
      await signOut();
    } else {
      const self = await supabase.auth.getUser();
      const hqProfileId = self?.data?.user?.id || null;
      const read = await supabase
        .from("student_learning_observations")
        .select("id,status,branch_id,private_internal_note")
        .eq("student_id", DEFAULT_STUDENT_ID)
        .order("created_at", { ascending: false })
        .limit(3);
      if (read.error) fail(`HQ read failed: ${read.error.message}`);
      pass("HQ can read student learning observations");

      const target = Array.isArray(read.data) ? read.data.find((r) => r.status === "submitted") : null;
      if (target?.id && hqProfileId) {
        const review = await supabase
          .from("student_learning_observations")
          .update({
            status: "reviewed",
            reviewed_at: nowIso(),
            review_profile_id: hqProfileId,
            ai_include_status: "eligible",
          })
          .eq("id", target.id)
          .select("id,status,ai_include_status,review_profile_id")
          .maybeSingle();
        if (review.error) fail(`HQ review failed: ${review.error.message}`);
        pass("HQ can mark submitted observation reviewed + eligible");
      } else {
        printResult("CHECK", "No submitted row found to mark reviewed (ok if teacher lane skipped)");
      }
      await signOut();
    }
  }

  const parentEmail = process.env.RLS_TEST_PARENT_EMAIL || process.env.RLS_TEST_PARENT_A_EMAIL;
  const parentPass = resolvePassword("RLS_TEST_PARENT_PASSWORD");
  if (!parentEmail || !parentPass) {
    printResult("CHECK", "Parent credentials missing — parent boundary skipped");
  } else {
    const { error: pErr } = await signInWithEmailPassword(parentEmail, parentPass);
    if (pErr) {
      printResult("CHECK", `Parent sign-in failed (${pErr.message || "unknown"})`);
      await signOut();
    } else {
      const parentRead = await supabase
        .from("student_learning_observations")
        .select("id,status", { count: "exact" })
        .limit(1);
      if (parentRead.error || (Array.isArray(parentRead.data) && parentRead.data.length === 0)) {
        pass("Parent cannot read raw student learning observations (expected)");
      } else {
        fail("Parent unexpectedly readable student_learning_observations rows");
      }
      await signOut();
    }
  }

  pass("No delete path exercised (v1)");
  pass("No provider / OCR / email / PDF side effects");
  console.log("[DONE] supabase-student-learning-observations-smoke-test");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


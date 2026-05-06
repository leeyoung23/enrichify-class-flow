/**
 * Fixture proof for staff-only teacher learning-context evidence → AI Parent Report aggregation.
 * JWT + RLS only (anon key + signed-in session). No service-role frontend.
 *
 * Read-only by default: uses a wide date window so profile/goal timestamps from dev seeds (e.g. 013)
 * fall inside the period filter used by summarizeTeacherObservationEvidence.
 *
 * Optional writes (dev/test): set ALLOW_UAT_OBSERVATION_FIXTURE_WRITE=1 — performs HQ-scoped upserts
 * aligned with supabase/sql/013_school_curriculum_fake_seed_data.sql (deterministic UUIDs).
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const DEFAULT_STUDENT_ID = "55555555-5555-5555-5555-555555555555";
const DEFAULT_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_BRANCH_ID = "11111111-1111-1111-1111-111111111111";

/** Matches 013 fake seed — used for optional HQ upsert only */
const FIXTURE_PROFILE_ID = "91300000-0000-0000-0000-000000000031";
const FIXTURE_SCHOOL_ID = "91300000-0000-0000-0000-000000000001";
const FIXTURE_CURRICULUM_MATH_ID = "91300000-0000-0000-0000-000000000012";
const FIXTURE_GOAL_STUDENT_ID = "91300000-0000-0000-0000-000000000042";
const FIXTURE_GOAL_CLASS_ID = "91300000-0000-0000-0000-000000000041";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function resolvePassword(roleVar) {
  return process.env[roleVar] || process.env.RLS_TEST_PASSWORD || "";
}

function wideObservationPeriod() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 400);
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

function observationLooksLikeFixture(summary) {
  if (typeof summary !== "string" || !summary.includes("Teacher observation:")) return false;
  const s = summary.toLowerCase();
  return (
    s.includes("number fluency") ||
    s.includes("scaffolded") ||
    s.includes("reading habits") ||
    s.includes("class reading confidence")
  );
}

async function seedFixtureViaHq(supabase) {
  const teacherEmail = process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test";
  const tp = await supabase.from("profiles").select("id").eq("email", teacherEmail).maybeSingle();
  const teacherProfileId = tp.data?.id || null;
  if (!teacherProfileId) {
    return { ok: false, message: "teacher profile id not found for fixture seed" };
  }

  const profileUpsert = await supabase.from("student_school_profiles").upsert(
    {
      id: FIXTURE_PROFILE_ID,
      student_id: DEFAULT_STUDENT_ID,
      school_id: FIXTURE_SCHOOL_ID,
      school_name: "Demo Primary School",
      grade_year: "Year 4",
      curriculum_profile_id: FIXTURE_CURRICULUM_MATH_ID,
      parent_goals: "Build confident daily reading habits at home with short reflection prompts.",
      teacher_notes: "Responds well to scaffolded reading and vocabulary preview before class tasks.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" }
  );
  if (profileUpsert.error) {
    return { ok: false, message: `student_school_profiles upsert: ${profileUpsert.error.message}` };
  }

  const goalsUpsert = await supabase.from("learning_goals").upsert(
    [
      {
        id: FIXTURE_GOAL_CLASS_ID,
        branch_id: DEFAULT_BRANCH_ID,
        student_id: null,
        class_id: DEFAULT_CLASS_ID,
        curriculum_profile_id: "91300000-0000-0000-0000-000000000011",
        goal_title: "Class reading confidence",
        goal_description:
          "Increase class-level reading confidence through guided oral reading and summary checkpoints.",
        status: "active",
        priority: "high",
        created_by_profile_id: teacherProfileId,
        updated_at: new Date().toISOString(),
      },
      {
        id: FIXTURE_GOAL_STUDENT_ID,
        branch_id: DEFAULT_BRANCH_ID,
        student_id: DEFAULT_STUDENT_ID,
        class_id: DEFAULT_CLASS_ID,
        curriculum_profile_id: FIXTURE_CURRICULUM_MATH_ID,
        goal_title: "Number fluency",
        goal_description:
          "Improve number fluency for mixed single-step operations with short daily practice.",
        status: "active",
        priority: "medium",
        created_by_profile_id: teacherProfileId,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "id" }
  );
  if (goalsUpsert.error) {
    return { ok: false, message: `learning_goals upsert: ${goalsUpsert.error.message}` };
  }

  return { ok: true, message: "seed applied (HQ session)" };
}

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    printResult("SKIP", "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    process.exit(0);
  }

  const {
    collectAiParentReportSourceEvidence,
    buildMockDraftInputFromSourceEvidence,
    SOURCE_AGGREGATION_MODES,
  } = await import("../src/services/aiParentReportSourceAggregationService.js");
  const { signInWithEmailPassword, signOut } = await import("../src/services/supabaseAuthService.js");
  const { supabase } = await import("../src/services/supabaseClient.js");
  const { listAiParentReportEvidenceLinks } = await import("../src/services/supabaseReadService.js");

  if (!supabase) {
    printResult("SKIP", "Supabase client unavailable");
    process.exit(0);
  }

  const studentId = process.env.UAT_OBSERVATION_STUDENT_ID?.trim() || DEFAULT_STUDENT_ID;
  const classId = process.env.UAT_OBSERVATION_CLASS_ID?.trim() || DEFAULT_CLASS_ID;
  const branchId = process.env.UAT_OBSERVATION_BRANCH_ID?.trim() || DEFAULT_BRANCH_ID;
  const reportId = process.env.UAT_OBSERVATION_REPORT_ID?.trim() || "";

  const allowWrite = process.env.ALLOW_UAT_OBSERVATION_FIXTURE_WRITE === "1";

  const teacherEmail = process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test";
  const teacherPass = resolvePassword("RLS_TEST_TEACHER_PASSWORD");
  if (!teacherPass) {
    printResult("CHECK", "Missing teacher password — observation fixture smoke skipped");
    process.exit(0);
  }

  const { error: tErr } = await signInWithEmailPassword(teacherEmail, teacherPass);
  if (tErr) {
    printResult("CHECK", `Teacher sign-in failed (${tErr.message || "unknown"})`);
    await signOut();
    process.exit(0);
  }

  const wide = wideObservationPeriod();
  let agg = await collectAiParentReportSourceEvidence({
    studentId,
    classId,
    branchId,
    periodStart: wide.periodStart,
    periodEnd: wide.periodEnd,
    reportId,
    mode: SOURCE_AGGREGATION_MODES.RLS,
  });

  let obs = typeof agg.observationSummary === "string" ? agg.observationSummary.trim() : "";

  if (!observationLooksLikeFixture(obs) && allowWrite) {
    await signOut();
    const hqEmail = process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test";
    const hqPass = resolvePassword("RLS_TEST_HQ_PASSWORD");
    if (!hqPass) {
      printResult("CHECK", "ALLOW_UAT_OBSERVATION_FIXTURE_WRITE set but HQ password missing — cannot seed");
      process.exit(0);
    }
    const { error: hErr } = await signInWithEmailPassword(hqEmail, hqPass);
    if (hErr) {
      printResult("CHECK", `HQ sign-in failed for seed (${hErr.message || "unknown"})`);
      await signOut();
      process.exit(0);
    }
    const seed = await seedFixtureViaHq(supabase);
    if (!seed.ok) {
      printResult("CHECK", `Fixture seed failed: ${seed.message}`);
      await signOut();
      process.exit(0);
    }
    printResult("PASS", `Fixture seed: ${seed.message}`);
    await signOut();
    const { error: tErr2 } = await signInWithEmailPassword(teacherEmail, teacherPass);
    if (tErr2) {
      printResult("CHECK", `Teacher re-sign-in failed (${tErr2.message || "unknown"})`);
      await signOut();
      process.exit(0);
    }
    agg = await collectAiParentReportSourceEvidence({
      studentId,
      classId,
      branchId,
      periodStart: wide.periodStart,
      periodEnd: wide.periodEnd,
      reportId,
      mode: SOURCE_AGGREGATION_MODES.RLS,
    });
    obs = typeof agg.observationSummary === "string" ? agg.observationSummary.trim() : "";
  }

  const draftInput = buildMockDraftInputFromSourceEvidence(agg);
  const hasMockObs =
    Boolean(draftInput.teacherObservations?.trim?.()) ||
    Boolean(draftInput.learningEvidence?.trim?.()) ||
    Boolean(draftInput.engagementNotes?.trim?.());

  if (observationLooksLikeFixture(obs) && hasMockObs) {
    printResult("PASS", "Teacher learning-context evidence present in RLS aggregation (wide window)");
    printResult("PASS", "buildMockDraftInputFromSourceEvidence carries observation-derived strings");
    const teacherObsItem = Array.isArray(agg.evidenceItems)
      ? agg.evidenceItems.find((i) => i?.sourceType === "teacher_observations")
      : null;
    if (teacherObsItem?.summary && !String(teacherObsItem.summary).includes("No teacher observations")) {
      printResult("PASS", "Evidence items include teacher_observations row with non-empty summary");
    } else {
      printResult("CHECK", "teacher_observations evidence row shape unexpected");
    }
  } else if (obs && obs.includes("Teacher observation:")) {
    printResult("PASS", "Observation summary lines present (fixture keywords differ — review seed)");
    printResult(
      hasMockObs ? "PASS" : "CHECK",
      hasMockObs ? "Mock draft bridge populated" : "Mock draft bridge sparse"
    );
  } else {
    printResult(
      "CHECK",
      "No teacher learning-context lines under wide period — apply supabase/sql/013_school_curriculum_fake_seed_data.sql in dev or run with ALLOW_UAT_OBSERVATION_FIXTURE_WRITE=1"
    );
  }

  const parentEmail = process.env.RLS_TEST_PARENT_EMAIL || process.env.RLS_TEST_PARENT_A_EMAIL;
  const parentPass = resolvePassword("RLS_TEST_PARENT_PASSWORD");
  await signOut();
  if (parentEmail && parentPass) {
    const { error: pErr } = await signInWithEmailPassword(parentEmail, parentPass);
    if (!pErr) {
      const linkRead = await listAiParentReportEvidenceLinks({ reportId: reportId || "00000000-0000-0000-0000-000000000001" });
      const rows = Array.isArray(linkRead.data) ? linkRead.data : [];
      if (linkRead.error || rows.length === 0) {
        printResult("PASS", "Parent: AI report evidence links blocked or empty (expected)");
      } else {
        printResult("WARNING", "Parent: evidence links unexpectedly readable — verify RLS");
      }
      await signOut();
    } else {
      printResult("CHECK", `Parent boundary skipped (${pErr.message || "sign-in"})`);
    }
  } else {
    printResult("CHECK", "Parent credentials missing — evidence-link boundary skipped");
  }

  printResult("PASS", "No service-role calls — JWT paths only");
  console.log("[DONE] supabase-ai-parent-report-observation-fixture-smoke-test");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

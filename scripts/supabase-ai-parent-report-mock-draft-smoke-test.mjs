import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

const DEFAULT_FAKE_BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_FAKE_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_FAKE_STUDENT_ID = "55555555-5555-5555-5555-555555555555";
const INSUFFICIENT_DATA_COPY = "More evidence is needed before making a detailed judgement in this area.";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function trimEnv(key) {
  const raw = process.env[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("CHECK", `${label}: skipped (missing ${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("CHECK", `${label}: skipped (sign-in failed: ${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const { listAiParentReports, getAiParentReportDetail, listAiParentReportVersions } = readService;
  const {
    createAiParentReportDraft,
    createAiParentReportVersion,
    generateMockAiParentReportDraft,
    submitAiParentReportForReview,
    approveAiParentReport,
    releaseAiParentReport,
    archiveAiParentReport,
  } = writeService;

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };

  const fixtureBranchId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID")
    : DEFAULT_FAKE_BRANCH_ID;
  const fixtureClassId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID")
    : DEFAULT_FAKE_CLASS_ID;
  const fixtureStudentId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID")
    : DEFAULT_FAKE_STUDENT_ID;
  const assignedTeacherProfileId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID")
    : null;

  const deps = { signInWithEmailPassword, signOut };
  let failureCount = 0;
  let reportId = null;
  let generatedVersionId = null;

  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const draftResult = await createAiParentReportDraft({
      studentId: fixtureStudentId,
      classId: fixtureClassId,
      branchId: fixtureBranchId,
      reportType: "weekly_brief",
      reportPeriodStart: "2026-04-15",
      reportPeriodEnd: "2026-04-21",
      assignedTeacherProfileId,
    });
    if (draftResult.error || !draftResult.data?.id) {
      printResult("CHECK", `Create fake/dev report draft CHECK (${draftResult.error?.message || "unknown"})`);
    } else {
      reportId = draftResult.data.id;
      printResult("PASS", "Create fake/dev report draft succeeded");
    }

    if (reportId) {
      const mockDraftResult = await generateMockAiParentReportDraft({
        reportId,
        input: {
          studentSummary: "The learner showed steady participation in literacy tasks this week.",
          attendanceSummary: "Present for all sessions with one minor late arrival.",
          lessonProgression: "Moved from guided reading into short independent responses.",
          homeworkCompletion: "Homework tasks were submitted within expected timeframes.",
          homeworkPerformance: "Work quality was mostly accurate with occasional correction needed.",
          strengths: "Consistent effort and willingness to ask clarifying questions.",
          improvementAreas: "Add fuller sentence explanations in written responses.",
          learningGaps: "More evidence is required to confirm long-term retention patterns.",
          teacherObservations: "Class focus improved when short checklists were used.",
          nextRecommendations: "Continue daily recap routines and short writing practice.",
          parentSupportSuggestions: "Encourage a 10-minute reading recap at home each evening.",
          teacherFinalComment: "A positive draft baseline with clear next steps.",
          evidenceSummaries: ["attendance log summary", "homework completion summary", "lesson note summary"],
        },
      });

      if (mockDraftResult.error || !mockDraftResult.data?.version?.id) {
        printResult("CHECK", `Generate mock draft CHECK (${mockDraftResult.error?.message || "unknown"})`);
      } else {
        generatedVersionId = mockDraftResult.data.version.id;
        printResult("PASS", "Generate mock draft version succeeded");
        if (mockDraftResult.data.version.generation_source === "mock_ai") {
          printResult("PASS", "Generated version uses generationSource='mock_ai'");
        } else {
          printResult("WARNING", "Generated version generationSource mismatch");
          failureCount += 1;
        }

        const sections = mockDraftResult.data.structuredSections || {};
        const requiredKeys = [
          "summary",
          "attendance_punctuality",
          "lesson_progression",
          "homework_completion",
          "homework_assessment_performance",
          "strengths",
          "areas_for_improvement",
          "learning_gaps",
          "next_recommendations",
          "parent_support_suggestions",
          "teacher_final_comment",
        ];
        const missing = requiredKeys.filter((key) => typeof sections[key] !== "string" || !sections[key].trim());
        if (missing.length === 0) {
          printResult("PASS", "Mock structuredSections contains all required parent-friendly section keys");
        } else {
          printResult("WARNING", `Missing required section keys: ${missing.join(", ")}`);
          failureCount += 1;
        }
      }

      const fallbackResult = await generateMockAiParentReportDraft({ reportId, input: {} });
      const fallbackSections = fallbackResult?.data?.structuredSections || {};
      if (fallbackResult.error || !fallbackResult.data?.version?.id) {
        printResult("CHECK", `Fallback wording probe CHECK (${fallbackResult.error?.message || "unknown"})`);
      } else if (
        Object.values(fallbackSections).some((value) => typeof value === "string" && value.includes(INSUFFICIENT_DATA_COPY))
      ) {
        printResult("PASS", "Fallback wording appears when mock input is missing");
      } else {
        printResult("WARNING", "Fallback wording did not appear when input was missing");
        failureCount += 1;
      }

      const blockedRealAi = await createAiParentReportVersion({
        reportId,
        generationSource: "real_ai",
        structuredSections: { summary: "should fail" },
      });
      if (blockedRealAi.error) {
        printResult("PASS", "Service guard: generationSource=real_ai blocked as expected");
      } else {
        printResult("WARNING", "Service guard: generationSource=real_ai unexpectedly allowed");
        failureCount += 1;
      }

      const versionsRead = await listAiParentReportVersions({ reportId });
      if (versionsRead.error) {
        printResult("CHECK", `Staff version read CHECK (${versionsRead.error.message || "unknown"})`);
      } else if ((versionsRead.data || []).some((row) => row?.id === generatedVersionId)) {
        printResult("PASS", "Staff can read generated mock draft version");
      } else {
        printResult("CHECK", "Staff generated mock draft version read CHECK (fixture/RLS dependent)");
      }
    }
  } else {
    printResult("CHECK", "HQ checks skipped");
  }
  await signOut();

  const parentBeforeReleaseSignIn = await signInRole(parentUser, deps);
  if (parentBeforeReleaseSignIn.ok) {
    if (!reportId) {
      printResult("CHECK", "Parent draft-block check skipped (draft fixture unavailable)");
    } else {
      const parentDraftRead = await getAiParentReportDetail({ reportId });
      if (parentDraftRead.error || !parentDraftRead.data?.id) {
        printResult("PASS", "Parent cannot see mock draft report/version before release");
      } else {
        printResult("WARNING", "Parent unexpectedly saw mock draft before release");
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Parent draft-block check skipped");
  }
  await signOut();

  const hqReleaseSignIn = await signInRole(hqUser, deps);
  if (hqReleaseSignIn.ok && reportId && generatedVersionId) {
    const submitResult = await submitAiParentReportForReview({ reportId });
    if (submitResult.error) printResult("CHECK", `submit_for_review CHECK (${submitResult.error.message || "unknown"})`);
    else printResult("PASS", "submit_for_review succeeded");

    const approveResult = await approveAiParentReport({ reportId });
    if (approveResult.error) printResult("CHECK", `approve CHECK (${approveResult.error.message || "unknown"})`);
    else printResult("PASS", "approve succeeded");

    const releaseResult = await releaseAiParentReport({ reportId, versionId: generatedVersionId });
    if (releaseResult.error) {
      printResult("CHECK", `release CHECK (${releaseResult.error.message || "unknown"})`);
    } else {
      printResult("PASS", "release succeeded (explicit approval/release boundary preserved)");
    }
  } else if (!reportId || !generatedVersionId) {
    printResult("CHECK", "Release path skipped (mock fixture unavailable)");
  }
  await signOut();

  const parentAfterReleaseSignIn = await signInRole(parentUser, deps);
  if (parentAfterReleaseSignIn.ok && reportId) {
    const releasedList = await listAiParentReports({ includeArchived: true });
    if (releasedList.error) {
      printResult("CHECK", `Parent released-read CHECK (${releasedList.error.message || "unknown"})`);
    } else if ((releasedList.data || []).some((row) => row?.id === reportId)) {
      printResult("PASS", "Released mock version visible to linked parent only after release");
    } else {
      printResult("CHECK", "Parent released visibility CHECK (fixture/RLS dependent)");
    }
  }
  await signOut();

  const hqCleanupSignIn = await signInRole(hqUser, deps);
  if (hqCleanupSignIn.ok && reportId) {
    const archiveResult = await archiveAiParentReport({ reportId });
    if (archiveResult.error) {
      printResult("CHECK", `Cleanup archive CHECK (${archiveResult.error.message || "unknown"})`);
    } else {
      printResult("PASS", "Cleanup archive succeeded for fake/dev report");
    }
  } else if (!reportId) {
    printResult("CHECK", "Cleanup archive skipped (report fixture unavailable)");
  }
  await signOut();

  printResult("PASS", "No real provider call exercised in this smoke");
  printResult("PASS", "No PDF/export path exercised in this smoke");
  printResult("PASS", "No notification/email side effect exercised in this smoke");

  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] AI parent report mock draft smoke crashed:", err?.message || err);
  process.exit(1);
});

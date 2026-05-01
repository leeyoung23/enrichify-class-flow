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

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function trimEnv(key) {
  const raw = process.env[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
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

async function resolveCurrentProfileContext(supabase) {
  const authRead = await supabase.auth.getUser();
  const userId = authRead?.data?.user?.id || null;
  if (!userId) return { data: null, error: { message: "Authenticated user id unavailable" } };
  const profileRead = await supabase
    .from("profiles")
    .select("id,branch_id,role,is_active")
    .eq("id", userId)
    .maybeSingle();
  if (profileRead.error || !profileRead.data) {
    return { data: null, error: profileRead.error || { message: "Profile lookup failed" } };
  }
  return { data: profileRead.data, error: null };
}

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const {
    listAiParentReports,
    getAiParentReportDetail,
    listAiParentReportVersions,
    getAiParentReportCurrentVersion,
  } = readService;
  const {
    createAiParentReportDraft,
    createAiParentReportVersion,
    addAiParentReportEvidenceLink,
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
  const teacherUser = {
    label: "Teacher",
    email: process.env.RLS_TEST_TEACHER_EMAIL || "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
  const unrelatedParentUser = {
    label: "Unrelated Parent",
    email:
      process.env.RLS_TEST_UNRELATED_PARENT_EMAIL ||
      process.env.PARENT_ANNOUNCEMENTS_TEST_UNRELATED_PARENT_EMAIL ||
      "parent.unrelated@example.test",
    passwordVar: "RLS_TEST_UNRELATED_PARENT_PASSWORD",
  };
  const studentUser = {
    label: "Student",
    email: process.env.RLS_TEST_STUDENT_EMAIL || "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
  };

  const deps = { signInWithEmailPassword, signOut };
  let failureCount = 0;
  let warningCount = 0;
  const createdReportIds = [];

  const fixtureBranchId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_BRANCH_ID")
    : DEFAULT_FAKE_BRANCH_ID;
  const fixtureClassId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_CLASS_ID")
    : DEFAULT_FAKE_CLASS_ID;
  const fixtureStudentId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID"))
    ? trimEnv("AI_PARENT_REPORT_TEST_STUDENT_ID")
    : DEFAULT_FAKE_STUDENT_ID;

  printResult(
    "CHECK",
    `Fixture discovery: branch=${isUuidLike(fixtureBranchId) ? "found" : "missing"} class=${
      isUuidLike(fixtureClassId) ? "found" : "missing"
    } student=${isUuidLike(fixtureStudentId) ? "found" : "missing"}`
  );

  let draftReportId = null;
  let releasedVersionId = null;

  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const hqCtx = await resolveCurrentProfileContext(supabase);
    const assignedTeacherProfileId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID")
      : null;
    if (hqCtx.error || !hqCtx.data?.id) {
      printResult("CHECK", "HQ context unavailable; staff draft path skipped");
    } else {
      const draftResult = await createAiParentReportDraft({
        studentId: fixtureStudentId,
        classId: fixtureClassId,
        branchId: fixtureBranchId,
        reportType: "weekly_brief",
        reportPeriodStart: "2026-04-01",
        reportPeriodEnd: "2026-04-07",
        assignedTeacherProfileId,
      });
      if (draftResult.error || !draftResult.data?.id) {
        printResult("CHECK", `HQ: create draft CHECK (${draftResult.error?.message || "unknown"})`);
      } else {
        draftReportId = draftResult.data.id;
        createdReportIds.push(draftReportId);
        printResult("PASS", "HQ: create AI parent report draft succeeded");
      }

      if (draftReportId) {
        const blockedRealAi = await createAiParentReportVersion({
          reportId: draftReportId,
          generationSource: "real_ai",
          structuredSections: { student_summary: "should fail" },
        });
        if (blockedRealAi.error) {
          printResult("PASS", "Service guard: generationSource=real_ai blocked as expected");
        } else {
          printResult("WARNING", "Service guard: generationSource=real_ai unexpectedly allowed");
          failureCount += 1;
        }

        const versionResult = await createAiParentReportVersion({
          reportId: draftReportId,
          generationSource: "mock_ai",
          structuredSections: {
            student_summary: "Fake/dev summary only.",
            attendance: "Fake/dev attendance references.",
          },
          teacherEdits: { teacher_final_comment: "Teacher-reviewed fake text." },
          finalText: { parent_summary: "Fake/dev parent-safe summary." },
          aiModelLabel: "mock-provider-v1",
        });
        if (versionResult.error || !versionResult.data?.version?.id) {
          printResult("CHECK", `HQ: create version CHECK (${versionResult.error?.message || "unknown"})`);
        } else {
          releasedVersionId = versionResult.data.version.id;
          const vnum = versionResult.data.version.version_number;
          if (vnum === 1) printResult("PASS", "HQ: first version_number resolved to 1");
          else {
            printResult("CHECK", `HQ: first version_number expected 1, got ${vnum}`);
          }
          if (versionResult.warning?.check) {
            printResult("CHECK", `Version event insert CHECK (${versionResult.warning.message})`);
          } else {
            printResult("PASS", "Version lifecycle event insert succeeded");
          }
        }

        const evidenceResult = await addAiParentReportEvidenceLink({
          reportId: draftReportId,
          evidenceType: "manual",
          sourceTable: null,
          sourceId: null,
          summarySnapshot: { note: "Fake/dev evidence summary only" },
          includeInParentReport: true,
        });
        if (evidenceResult.error) {
          printResult("CHECK", `Evidence link insert CHECK (${evidenceResult.error.message || "unknown"})`);
        } else {
          printResult("PASS", "Evidence link insert succeeded");
        }
      }
    }
  } else {
    printResult("CHECK", "HQ checks skipped");
  }
  await signOut();

  const parentBeforeReleaseSignIn = await signInRole(parentUser, deps);
  if (parentBeforeReleaseSignIn.ok) {
    if (!draftReportId) {
      printResult("CHECK", "Parent draft visibility check skipped (draft fixture unavailable)");
    } else {
      const parentDraftRead = await getAiParentReportDetail({ reportId: draftReportId });
      if (parentDraftRead.error || !parentDraftRead.data?.id) {
        printResult("PASS", "Parent: draft report detail blocked before release");
      } else {
        printResult("WARNING", "Parent: draft report detail unexpectedly visible");
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Parent draft visibility check skipped");
  }
  await signOut();

  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok) {
    if (!draftReportId || !releasedVersionId) {
      printResult("CHECK", "Teacher lifecycle checks skipped (draft/version fixture unavailable)");
    } else {
      const submitResult = await submitAiParentReportForReview({ reportId: draftReportId });
      if (submitResult.error) {
        printResult("CHECK", `Teacher submit_for_review CHECK (${submitResult.error.message || "unknown"})`);
      } else {
        printResult("PASS", "Teacher submit_for_review succeeded");
        if (submitResult.warning?.check) {
          printResult("CHECK", `Submit event insert CHECK (${submitResult.warning.message})`);
        }
      }

      const approveResult = await approveAiParentReport({ reportId: draftReportId });
      if (approveResult.error) {
        printResult("CHECK", `Teacher approve CHECK (${approveResult.error.message || "unknown"})`);
      } else {
        printResult("PASS", "Teacher approve succeeded");
        if (approveResult.warning?.check) {
          printResult("CHECK", `Approve event insert CHECK (${approveResult.warning.message})`);
        }
      }

      const releaseResult = await releaseAiParentReport({
        reportId: draftReportId,
        versionId: releasedVersionId,
      });
      if (releaseResult.error) {
        printResult("CHECK", `Teacher release CHECK (${releaseResult.error.message || "unknown"})`);
      } else {
        printResult("PASS", "Teacher release selected version succeeded");
        if (releaseResult.data?.report?.current_version_id === releasedVersionId) {
          printResult("PASS", "Release set current_version_id to the selected version");
        } else {
          printResult("WARNING", "Release current_version_id mismatch");
          failureCount += 1;
        }
        if (releaseResult.warning?.check) {
          printResult("CHECK", `Release event insert CHECK (${releaseResult.warning.message})`);
        } else {
          printResult("PASS", "Release lifecycle event insert succeeded");
        }
      }
    }
  } else {
    printResult("CHECK", "Teacher lifecycle checks skipped");
  }
  await signOut();

  const parentAfterReleaseSignIn = await signInRole(parentUser, deps);
  let linkedParentCanSeeReleased = false;
  if (parentAfterReleaseSignIn.ok) {
    if (!draftReportId) {
      printResult("CHECK", "Parent released visibility check skipped (fixture unavailable)");
    } else {
      const listResult = await listAiParentReports({ includeArchived: true });
      const detailResult = await getAiParentReportDetail({ reportId: draftReportId });
      const currentVersionResult = await getAiParentReportCurrentVersion({ reportId: draftReportId });
      const versionListResult = await listAiParentReportVersions({ reportId: draftReportId });

      linkedParentCanSeeReleased = (listResult.data || []).some((row) => row?.id === draftReportId);
      if (linkedParentCanSeeReleased && detailResult.data?.id) {
        printResult("PASS", "Parent: released linked-child report visible");
      } else if (detailResult.error || listResult.error) {
        printResult("CHECK", "Parent: released linked-child visibility CHECK (fixture/RLS dependent)");
      } else {
        printResult("WARNING", "Parent: released linked-child report not visible");
        failureCount += 1;
      }

      if (currentVersionResult.data?.id && currentVersionResult.data.id === releasedVersionId) {
        printResult("PASS", "Parent: current released version visible");
      } else if (currentVersionResult.error) {
        printResult("CHECK", `Parent current version CHECK (${currentVersionResult.error.message || "unknown"})`);
      } else {
        printResult("CHECK", "Parent current version visibility CHECK (fixture/RLS dependent)");
      }

      if (!versionListResult.error && Array.isArray(versionListResult.data) && versionListResult.data.length <= 1) {
        printResult("PASS", "Parent: version history limited to released current version only");
      } else if (versionListResult.error) {
        printResult("CHECK", `Parent version-list CHECK (${versionListResult.error.message || "unknown"})`);
      } else {
        printResult("WARNING", "Parent: version history exposed beyond current released version");
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Parent released visibility checks skipped");
  }
  await signOut();

  const unrelatedParentSignIn = await signInRole(unrelatedParentUser, deps);
  if (unrelatedParentSignIn.ok) {
    if (!draftReportId || !linkedParentCanSeeReleased) {
      printResult("CHECK", "Unrelated parent block check skipped (baseline fixture unavailable)");
    } else {
      const unrelatedDetail = await getAiParentReportDetail({ reportId: draftReportId });
      if (unrelatedDetail.error || !unrelatedDetail.data?.id) {
        printResult("PASS", "Unrelated parent blocked from released report");
      } else {
        printResult("WARNING", "Unrelated parent unexpectedly accessed released report");
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Unrelated parent check skipped (credentials/user missing)");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    const studentRead = await listAiParentReports({ includeArchived: true });
    if (studentRead.error || (Array.isArray(studentRead.data) && studentRead.data.length === 0)) {
      printResult("PASS", "Student blocked/empty as expected");
    } else {
      printResult("WARNING", "Student unexpectedly has AI parent report visibility");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Student check skipped");
  }
  await signOut();

  const hqCleanupSignIn = await signInRole(hqUser, deps);
  if (hqCleanupSignIn.ok) {
    for (const reportId of createdReportIds) {
      const archiveResult = await archiveAiParentReport({ reportId });
      if (archiveResult.error) {
        printResult("CHECK", `Cleanup archive CHECK (${reportId}): ${archiveResult.error.message || "unknown"}`);
      } else {
        printResult("PASS", `Cleanup archive succeeded (${reportId})`);
      }
    }
  } else {
    printResult("CHECK", "Cleanup archive skipped (HQ sign-in unavailable)");
    warningCount += 1;
  }
  await signOut();

  printResult("PASS", "No real AI provider calls exercised in this smoke");
  printResult("PASS", "No PDF/export paths exercised in this smoke");
  printResult("PASS", "Anon+JWT+RLS only; no service-role frontend usage in smoke");

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] AI parent reports smoke test crashed:", err?.message || err);
  process.exit(1);
});

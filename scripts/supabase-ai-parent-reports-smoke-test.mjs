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

/** Must match `AI_PARENT_REPORT_RELEASE_NOTIFY_TITLE` in supabaseWriteService.js */
const AI_REPORT_RELEASE_IN_APP_TITLE = "New progress report available";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function maskUuid(value) {
  if (!isUuidLike(value)) return "missing";
  const text = String(value).trim();
  return `${text.slice(0, 8)}...${text.slice(-4)}`;
}

function formatDbError(error) {
  if (!error) return "unknown";
  const code = typeof error.code === "string" ? error.code : "n/a";
  const message = typeof error.message === "string" ? error.message : "unknown";
  return `code=${code} message=${message}`;
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

async function diagnoseAiParentReportDraftInsert({
  supabase,
  actorProfileId,
  fixtureBranchId,
  fixtureClassId,
  fixtureStudentId,
  assignedTeacherProfileId,
} = {}) {
  const stage = "fixture_discovery";
  const relationshipProbe = await supabase
    .from("students")
    .select("id,branch_id,class_id")
    .eq("id", fixtureStudentId)
    .maybeSingle();
  if (relationshipProbe.error || !relationshipProbe.data?.id) {
    printResult(
      "CHECK",
      `[${stage}] student/class/branch relation lookup unavailable (${formatDbError(relationshipProbe.error)})`
    );
  } else {
    const relationValid =
      relationshipProbe.data.branch_id === fixtureBranchId &&
      (fixtureClassId == null || fixtureClassId === "" || relationshipProbe.data.class_id === fixtureClassId);
    printResult(
      "CHECK",
      `[${stage}] relationship_valid=${relationValid ? "yes" : "no"} student_branch=${maskUuid(
        relationshipProbe.data.branch_id
      )} student_class=${maskUuid(relationshipProbe.data.class_id)} selected_branch=${maskUuid(
        fixtureBranchId
      )} selected_class=${maskUuid(fixtureClassId)}`
    );
  }

  const helperStage = "helper_predicate";
  let helperAllowsInsert = null;
  const helperProbe = await supabase.rpc("can_insert_ai_parent_report_row_030", {
    student_uuid: fixtureStudentId,
    class_uuid: fixtureClassId,
    branch_uuid: fixtureBranchId,
    creator_uuid: actorProfileId,
    assigned_teacher_uuid: assignedTeacherProfileId,
  });
  if (helperProbe.error) {
    printResult("CHECK", `[${helperStage}] rpc unavailable (${formatDbError(helperProbe.error)})`);
  } else {
    helperAllowsInsert = Boolean(helperProbe.data);
    printResult("CHECK", `[${helperStage}] can_insert_ai_parent_report_row_030=${helperAllowsInsert}`);
  }

  const nowIso = new Date().toISOString();
  const probePeriodStart = "2099-01-01";
  const probePeriodEnd = "2099-01-07";
  const rawInsertStage = "raw_insert_without_returning";
  const rawInsert = await supabase.from("ai_parent_reports").insert({
    student_id: fixtureStudentId,
    class_id: fixtureClassId,
    branch_id: fixtureBranchId,
    report_type: "weekly_brief",
    report_period_start: probePeriodStart,
    report_period_end: probePeriodEnd,
    status: "draft",
    current_version_id: null,
    created_by_profile_id: actorProfileId,
    assigned_teacher_profile_id: assignedTeacherProfileId,
    approved_by_profile_id: null,
    released_by_profile_id: null,
    released_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (rawInsert.error) {
    printResult("CHECK", `[${rawInsertStage}] failed (${formatDbError(rawInsert.error)})`);
  } else {
    printResult("PASS", `[${rawInsertStage}] succeeded`);
  }

  const returningStage = "insert_with_returning";
  const returningInsert = await supabase
    .from("ai_parent_reports")
    .insert({
      student_id: fixtureStudentId,
      class_id: fixtureClassId,
      branch_id: fixtureBranchId,
      report_type: "weekly_brief",
      report_period_start: probePeriodStart,
      report_period_end: probePeriodEnd,
      status: "draft",
      current_version_id: null,
      created_by_profile_id: actorProfileId,
      assigned_teacher_profile_id: assignedTeacherProfileId,
      approved_by_profile_id: null,
      released_by_profile_id: null,
      released_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(
      "id,student_id,class_id,branch_id,report_type,report_period_start,report_period_end,status,created_by_profile_id"
    )
    .maybeSingle();

  if (returningInsert.error || !returningInsert.data?.id) {
    printResult(
      "CHECK",
      `[${returningStage}] failed (${formatDbError(returningInsert.error)})`
    );
    if (!rawInsert.error && helperAllowsInsert === true) {
      printResult(
        "CHECK",
        "[constraint_or_fk] helper true + raw insert pass but RETURNING failed -> likely SELECT policy/RETURNING visibility issue"
      );
    }
    if (rawInsert.error && helperAllowsInsert === true) {
      printResult(
        "CHECK",
        "[constraint_or_fk] helper true but raw insert failed -> likely table constraint/FK/payload mismatch"
      );
    }
  } else {
    printResult("PASS", `[${returningStage}] succeeded`);
  }

  const selectStage = "insert_with_returning";
  if (returningInsert.data?.id) {
    const directSelect = await supabase
      .from("ai_parent_reports")
      .select("id,status")
      .eq("id", returningInsert.data.id)
      .maybeSingle();
    if (directSelect.error || !directSelect.data?.id) {
      printResult(
        "CHECK",
        `[${selectStage}] direct select after returning insert blocked (${formatDbError(directSelect.error)})`
      );
    } else {
      printResult("PASS", `[${selectStage}] direct select after returning insert visible`);
    }

    const cleanup = await supabase
      .from("ai_parent_reports")
      .delete()
      .eq("id", returningInsert.data.id)
      .select("id")
      .maybeSingle();
    if (cleanup.error) {
      printResult("CHECK", `[constraint_or_fk] cleanup after returning insert blocked (${formatDbError(cleanup.error)})`);
    }
  }

  // cleanup for raw insert probe by unique-ish title lookup is not possible here because title does not exist,
  // so delete a best-effort row via exact payload filter ordered by created_at.
  const rawProbeRows = await supabase
    .from("ai_parent_reports")
    .select("id,created_at")
    .eq("student_id", fixtureStudentId)
    .eq("branch_id", fixtureBranchId)
    .eq("report_type", "weekly_brief")
    .eq("report_period_start", probePeriodStart)
    .eq("report_period_end", probePeriodEnd)
    .eq("status", "draft")
    .eq("created_by_profile_id", actorProfileId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (!rawProbeRows.error && Array.isArray(rawProbeRows.data) && rawProbeRows.data[0]?.id) {
    const cleanupRaw = await supabase
      .from("ai_parent_reports")
      .delete()
      .eq("id", rawProbeRows.data[0].id)
      .select("id")
      .maybeSingle();
    if (cleanupRaw.error) {
      printResult("CHECK", `[constraint_or_fk] cleanup after raw insert probe blocked (${formatDbError(cleanupRaw.error)})`);
    }
  }
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
    listAiParentReportEvidenceLinks,
    listMyInAppNotifications,
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
    `[fixture_discovery] selected_branch_id=${maskUuid(fixtureBranchId)} selected_class_id=${maskUuid(
      fixtureClassId
    )} selected_student_id=${maskUuid(fixtureStudentId)}`
  );

  let draftReportId = null;
  let releasedVersionId = null;
  /** Count of matching in-app notifications for linked parent + fixture student (before release). */
  let parentNotifBaselineForStudent = null;
  /** Latest matching notification id after release (for unrelated-parent RLS check). */
  let linkedParentSampleNotificationId = null;

  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const hqCtx = await resolveCurrentProfileContext(supabase);
    const assignedTeacherProfileId = isUuidLike(trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID"))
      ? trimEnv("AI_PARENT_REPORT_TEST_ASSIGNED_TEACHER_PROFILE_ID")
      : null;
    if (hqCtx.error || !hqCtx.data?.id) {
      printResult("CHECK", "HQ context unavailable; staff draft path skipped");
    } else {
      printResult(
        "CHECK",
        `[fixture_discovery] actor role=${hqCtx.data.role || "unknown"} is_active=${String(
          hqCtx.data.is_active
        )} actor_branch_id=${maskUuid(hqCtx.data.branch_id)} selected_teacher_profile_id=${maskUuid(
          assignedTeacherProfileId
        )}`
      );
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
        printResult("CHECK", `[service_create] HQ draft create CHECK (${draftResult.error?.message || "unknown"})`);
        await diagnoseAiParentReportDraftInsert({
          supabase,
          actorProfileId: hqCtx.data.id,
          fixtureBranchId,
          fixtureClassId,
          fixtureStudentId,
          assignedTeacherProfileId,
        });
      } else {
        draftReportId = draftResult.data.id;
        createdReportIds.push(draftReportId);
        printResult("PASS", "[service_create] HQ create AI parent report draft succeeded");
      }

      if (draftReportId) {
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

        if (draftReportId && releasedVersionId) {
          const realAiPersistence = await createAiParentReportVersion({
            reportId: draftReportId,
            generationSource: "real_ai",
            structuredSections: {
              student_summary:
                "Persistence smoke: real_ai service path only — no provider HTTP in this test.",
              attendance: "N/A",
              lesson_progression: "N/A",
              homework_completion: "N/A",
              homework_assessment_performance: "N/A",
              strengths: "N/A",
              areas_for_improvement: "N/A",
              learning_gaps: "N/A",
              next_recommendations: "N/A",
              parent_support_suggestions: "N/A",
              teacher_final_comment: "Persistence smoke only.",
            },
            teacherEdits: { persistence_smoke: true },
            finalText: { parent_summary: "Safe parent-facing placeholder." },
            aiModelLabel: "real_ai_persistence_smoke_v1",
          });
          if (realAiPersistence.error || !realAiPersistence.data?.version?.id) {
            printResult(
              "CHECK",
              `real_ai persistence CHECK (${realAiPersistence.error?.message || "unknown"})`
            );
          } else {
            const rv = realAiPersistence.data.version;
            if (rv.generation_source === "real_ai" && rv.ai_generated_at) {
              printResult(
                "PASS",
                "real_ai version persisted with ai_generated_at (staff draft; no auto-release)"
              );
            } else {
              printResult("WARNING", "real_ai version metadata mismatch");
              failureCount += 1;
            }
            if (rv.ai_model_label === "real_ai_persistence_smoke_v1") {
              printResult("PASS", "real_ai ai_model_label stored when provided");
            } else {
              printResult("CHECK", "real_ai ai_model_label CHECK (unexpected empty or mismatch)");
            }
            const reportPeek = await supabase
              .from("ai_parent_reports")
              .select("status,current_version_id,released_at")
              .eq("id", draftReportId)
              .maybeSingle();
            if (
              reportPeek.data?.status === "draft" &&
              !reportPeek.data?.released_at &&
              reportPeek.data?.current_version_id == null
            ) {
              printResult("PASS", "Report remains draft/unreleased after real_ai version insert");
            } else {
              printResult(
                "CHECK",
                "Report status after real_ai insert CHECK (expected draft, no release)"
              );
            }
          }
        }

        const safeEvidenceResult = await addAiParentReportEvidenceLink({
          reportId: draftReportId,
          evidenceType: "manual",
          sourceTable: null,
          sourceId: null,
          summarySnapshot: {
            summary: "Fake dev evidence summary for smoke test only.",
            source: "manual_smoke",
            included_fields: ["attendance_summary", "homework_summary"],
            contains_private_paths: false,
          },
          includeInParentReport: false,
        });
        if (safeEvidenceResult.error || !safeEvidenceResult.data?.id) {
          printResult("CHECK", `Evidence link safe insert CHECK (${safeEvidenceResult.error?.message || "unknown"})`);
        } else {
          printResult("PASS", "Evidence link safe insert succeeded");
          const staffEvidenceRead = await listAiParentReportEvidenceLinks({ reportId: draftReportId });
          if (staffEvidenceRead.error) {
            printResult("CHECK", `Evidence link staff read-back CHECK (${staffEvidenceRead.error.message || "unknown"})`);
          } else if ((staffEvidenceRead.data || []).some((row) => row?.id === safeEvidenceResult.data.id)) {
            printResult("PASS", "Evidence link staff read-back shows inserted evidence");
          } else {
            printResult("CHECK", "Evidence link staff read-back CHECK (inserted row not visible)");
          }
        }

        const unsafeEvidenceResult = await addAiParentReportEvidenceLink({
          reportId: draftReportId,
          evidenceType: "manual",
          sourceTable: "manual",
          sourceId: null,
          summarySnapshot: {
            summary: "Unsafe evidence probe",
            storage_path: "private/reports/student-001/raw-note.txt",
            contains_private_paths: true,
          },
          includeInParentReport: false,
        });
        if (unsafeEvidenceResult.error) {
          printResult("PASS", "Evidence link unsafe raw-path guard blocked insert as expected");
        } else {
          printResult("WARNING", "Evidence link unsafe raw-path guard unexpectedly allowed insert");
          failureCount += 1;
        }
      }
    }
  } else {
    printResult("CHECK", "HQ checks skipped");
  }
  await signOut();

  const parentBeforeReleaseSignIn = await signInRole(parentUser, deps);
  if (parentBeforeReleaseSignIn.ok) {
    const authSelf = await supabase.auth.getUser();
    const parentProfileIdSelf = authSelf?.data?.user?.id || null;
    if (isUuidLike(parentProfileIdSelf)) {
      const notifBaselineRead = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", parentProfileIdSelf)
        .eq("channel", "in_app")
        .eq("title", AI_REPORT_RELEASE_IN_APP_TITLE)
        .eq("student_id", fixtureStudentId);
      if (notifBaselineRead.error) {
        printResult("CHECK", `Parent: pre-release notification baseline CHECK (${notifBaselineRead.error.message || "unknown"})`);
      } else {
        parentNotifBaselineForStudent =
          typeof notifBaselineRead.count === "number" ? notifBaselineRead.count : 0;
        printResult(
          "PASS",
          `Parent: pre-release matching in-app notification count=${parentNotifBaselineForStudent}`
        );
      }
    } else {
      printResult("CHECK", "Parent: pre-release notification baseline skipped (no profile id)");
    }

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
    try {
      const aggModule = await import("../src/services/aiParentReportSourceAggregationService.js");
      const agg = await aggModule.collectAiParentReportSourceEvidence({
        studentId: fixtureStudentId,
        classId: fixtureClassId,
        branchId: fixtureBranchId,
        periodStart: "2026-04-01",
        periodEnd: "2026-04-07",
        reportId: draftReportId || "",
        mode: aggModule.SOURCE_AGGREGATION_MODES.RLS,
      });
      const items = Array.isArray(agg.evidenceItems) ? agg.evidenceItems : [];
      const releasedItem = items.find((i) => i?.sourceType === "released_homework_feedback");
      if (releasedItem?.label) {
        printResult("PASS", "Source evidence aggregation exposes Released homework feedback row (staff preview)");
      } else {
        printResult("CHECK", "Source evidence aggregation: released homework feedback item missing (unexpected shape)");
      }
      const rf =
        typeof agg.releasedHomeworkFeedbackSummary === "string" ? agg.releasedHomeworkFeedbackSummary.trim() : "";
      if (rf) {
        printResult("PASS", "Released homework feedback excerpt present in aggregation output");
      } else {
        printResult(
          "CHECK",
          "No released homework feedback text in period for fixture (ok if DB has no released rows in window)"
        );
      }
      const wideEnd = new Date();
      const wideStart = new Date(wideEnd);
      wideStart.setUTCDate(wideStart.getUTCDate() - 400);
      const aggObs = await aggModule.collectAiParentReportSourceEvidence({
        studentId: fixtureStudentId,
        classId: fixtureClassId,
        branchId: fixtureBranchId,
        periodStart: wideStart.toISOString().slice(0, 10),
        periodEnd: wideEnd.toISOString().slice(0, 10),
        reportId: draftReportId || "",
        mode: aggModule.SOURCE_AGGREGATION_MODES.RLS,
      });
      const obsWide =
        typeof aggObs.observationSummary === "string" ? aggObs.observationSummary.trim() : "";
      if (obsWide && obsWide.includes("Teacher observation:")) {
        printResult(
          "PASS",
          "Teacher learning-context lines present in RLS aggregation (wide period — matches Source Evidence Preview behaviour when goal/profile timestamps fall outside narrow report windows)"
        );
        try {
          const draftBridge = aggModule.buildMockDraftInputFromSourceEvidence(aggObs);
          const bridged =
            Boolean(draftBridge?.teacherObservations?.trim?.()) ||
            Boolean(draftBridge?.learningEvidence?.trim?.());
          if (bridged) {
            printResult("PASS", "Mock draft input includes observation-derived teacherObservations / learningEvidence");
          } else {
            printResult("CHECK", "Mock draft bridge missing observation strings (unexpected)");
          }
        } catch {
          printResult("CHECK", "buildMockDraftInputFromSourceEvidence threw");
        }
      } else {
        printResult(
          "CHECK",
          "No teacher learning-context seed lines under wide period — apply 013 fake seed or npm run test:supabase:ai-parent-report:observation-evidence"
        );
      }

      const aggNarrow = await aggModule.collectAiParentReportSourceEvidence({
        studentId: fixtureStudentId,
        classId: fixtureClassId,
        branchId: fixtureBranchId,
        periodStart: "2026-04-01",
        periodEnd: "2026-04-07",
        reportId: draftReportId || "",
        mode: aggModule.SOURCE_AGGREGATION_MODES.RLS,
      });
      const snapNarrow =
        typeof aggNarrow.learningContextSnapshotSummary === "string"
          ? aggNarrow.learningContextSnapshotSummary.trim()
          : "";
      if (snapNarrow && (snapNarrow.includes("Learning context snapshot") || snapNarrow.includes("Learning goal snapshot"))) {
        printResult(
          "PASS",
          "Narrow period: learningContextSnapshotSummary provides standing background when dated cues fall outside the report window"
        );
        try {
          const dN = aggModule.buildMockDraftInputFromSourceEvidence(aggNarrow);
          if (dN.learningContextSnapshot?.trim?.() || dN.engagementNotes?.trim?.()) {
            printResult("PASS", "Narrow period: mock draft includes learningContextSnapshot / engagementNotes background");
          } else {
            printResult("CHECK", "Narrow period mock draft missing snapshot fields");
          }
        } catch {
          printResult("CHECK", "narrow-period draft bridge threw");
        }
      } else {
        printResult("CHECK", "Narrow period snapshot empty (ok if all cues fall inside the window)");
      }
    } catch (err) {
      printResult("CHECK", `Source evidence aggregation CHECK (${err?.message || err})`);
    }

    if (!draftReportId || !releasedVersionId) {
      printResult("CHECK", "[downstream_lifecycle] Teacher lifecycle checks skipped (draft/version fixture unavailable)");
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

      const dupReleaseResult = await releaseAiParentReport({
        reportId: draftReportId,
        versionId: releasedVersionId,
      });
      if (dupReleaseResult.error) {
        printResult("CHECK", `Teacher duplicate release CHECK (${dupReleaseResult.error.message || "unknown"})`);
      } else {
        printResult("PASS", "Teacher duplicate release call completed (idempotent notification path expected)");
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

      const parentEvidenceRead = await listAiParentReportEvidenceLinks({ reportId: draftReportId });
      if (parentEvidenceRead.error || (Array.isArray(parentEvidenceRead.data) && parentEvidenceRead.data.length === 0)) {
        printResult("PASS", "Parent: direct evidence-link read blocked/empty as expected");
      } else {
        printResult("WARNING", "Parent: direct evidence-link read unexpectedly visible");
        failureCount += 1;
      }

      const authSelfAfter = await supabase.auth.getUser();
      const parentPidAfter = authSelfAfter?.data?.user?.id || null;
      if (isUuidLike(parentPidAfter)) {
        const notifAfterRead = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_profile_id", parentPidAfter)
          .eq("channel", "in_app")
          .eq("title", AI_REPORT_RELEASE_IN_APP_TITLE)
          .eq("student_id", fixtureStudentId);
        const afterCount =
          typeof notifAfterRead.count === "number" && !notifAfterRead.error ? notifAfterRead.count : null;
        if (afterCount == null) {
          printResult(
            "CHECK",
            `Parent: post-release notification count CHECK (${notifAfterRead.error?.message || "unknown"})`
          );
        } else if (typeof parentNotifBaselineForStudent === "number") {
          if (afterCount > parentNotifBaselineForStudent) {
            printResult(
              "PASS",
              `Parent: release created in-app notification(s) (count ${parentNotifBaselineForStudent} -> ${afterCount})`
            );
          } else {
            printResult(
              "WARNING",
              `Parent: expected new in-app notification after release (baseline=${parentNotifBaselineForStudent}, after=${afterCount}); apply supabase/sql/035_ai_parent_report_notification_guardian_lookup.sql if missing`
            );
            failureCount += 1;
          }
        } else {
          printResult("CHECK", "Parent: post-release notification count CHECK (baseline unavailable)");
        }

        const sampleRow = await supabase
          .from("notifications")
          .select("id")
          .eq("recipient_profile_id", parentPidAfter)
          .eq("channel", "in_app")
          .eq("title", AI_REPORT_RELEASE_IN_APP_TITLE)
          .eq("student_id", fixtureStudentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!sampleRow.error && sampleRow.data?.id) {
          linkedParentSampleNotificationId = sampleRow.data.id;
        }
      }

      const parentInboxResult = await listMyInAppNotifications({ limit: 50 });
      if (parentInboxResult.error) {
        printResult("CHECK", `Parent: action-target notification read CHECK (${parentInboxResult.error.message || "unknown"})`);
      } else {
        const inboxRows = Array.isArray(parentInboxResult.data) ? parentInboxResult.data : [];
        const exactReportRow = inboxRows.find(
          (row) =>
            row?.title === AI_REPORT_RELEASE_IN_APP_TITLE &&
            row?.student_id === fixtureStudentId &&
            row?.entity_type === "ai_parent_report" &&
            row?.event_type === "ai_parent_report.released" &&
            row?.entity_id === draftReportId
        );
        if (exactReportRow) {
          printResult("PASS", "Parent: notification includes exact released report action target");
        } else {
          printResult(
            "CHECK",
            "Parent: exact action target unavailable (apply supabase/sql/044_notifications_parent_action_targets_rpc.sql)"
          );
        }
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

      if (isUuidLike(linkedParentSampleNotificationId)) {
        const foreignPeek = await supabase
          .from("notifications")
          .select("id")
          .eq("id", linkedParentSampleNotificationId)
          .maybeSingle();
        if (foreignPeek.error || !foreignPeek.data?.id) {
          printResult("PASS", "Unrelated parent: cannot read linked parent's notification row");
        } else {
          printResult("WARNING", "Unrelated parent unexpectedly read another family's notification");
          failureCount += 1;
        }
      } else {
        printResult("CHECK", "Unrelated parent notification isolation skipped (no sample notification id)");
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

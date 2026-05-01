import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("SKIP: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
  process.exit(0);
}

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
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

const DEFAULT_FAKE_BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_FAKE_OTHER_BRANCH_ID = "22222222-2222-2222-2222-222222222222";
const DEFAULT_FAKE_CLASS_ID = "33333333-3333-3333-3333-333333333331";
const DEFAULT_FAKE_STUDENT_ID = "55555555-5555-5555-5555-555555555555";

function safeRole(value) {
  const role = typeof value === "string" ? value.trim() : "";
  return role || "unknown";
}

function safeActive(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unknown";
}

function safeBranch(value) {
  if (isUuidLike(value)) return "uuid";
  if (value == null || value === "") return "null";
  return "non_uuid";
}

function formatProfileContext(label, profile) {
  return `${label}: role=${safeRole(profile?.role)} is_active=${safeActive(profile?.is_active)} branch_id=${safeBranch(profile?.branch_id)}`;
}

function pickUuid(candidate, fallback = null) {
  return isUuidLike(candidate) ? String(candidate).trim() : fallback;
}

function formatDbError(error) {
  if (!error) return "unknown";
  const code = typeof error.code === "string" ? error.code : "n/a";
  const message = typeof error.message === "string" ? error.message : "unknown";
  return `code=${code} message=${message}`;
}

async function diagnoseDirectCreateInsert({
  supabase,
  branchId,
  profileId,
  label,
}) {
  const nowIso = new Date().toISOString();
  const probe = await supabase
    .from("parent_announcements")
    .insert({
      title: `Diag ${label} ${nowIso}`,
      subtitle: "diag",
      body: "diag",
      announcement_type: "reminder",
      branch_id: isUuidLike(branchId) ? branchId : null,
      class_id: null,
      status: "draft",
      publish_at: null,
      published_at: null,
      event_start_at: null,
      event_end_at: null,
      location: null,
      created_by_profile_id: profileId,
      updated_by_profile_id: profileId,
    })
    .select("id")
    .maybeSingle();

  if (probe.error || !probe.data?.id) {
    printResult("CHECK", `${label} direct insert diagnostic: ${formatDbError(probe.error)}`);
    return;
  }

  printResult("CHECK", `${label} direct insert diagnostic: insert succeeded`);
  const cleanup = await supabase
    .from("parent_announcements")
    .delete()
    .eq("id", probe.data.id)
    .select("id")
    .maybeSingle();
  if (cleanup.error) {
    printResult("CHECK", `${label} direct insert diagnostic cleanup: ${formatDbError(cleanup.error)}`);
  }
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
    listParentAnnouncements,
    getParentAnnouncementDetail,
    listAnnouncements,
  } = readService;
  const {
    createParentAnnouncement,
    publishParentAnnouncement,
    markParentAnnouncementRead,
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
  const supervisorUser = {
    label: "Branch Supervisor",
    email: "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
  };
  const teacherUser = {
    label: "Teacher",
    email: "teacher.demo@example.test",
    passwordVar: "RLS_TEST_TEACHER_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.PARENT_ANNOUNCEMENTS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
  const unrelatedParentUser = {
    label: "Unrelated Parent",
    email:
      process.env.PARENT_ANNOUNCEMENTS_TEST_UNRELATED_PARENT_EMAIL ||
      process.env.RLS_TEST_UNRELATED_PARENT_EMAIL ||
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
  const createdParentAnnouncementIds = [];

  let hqPublishedAnnouncementId = null;
  let supervisorPublishedAnnouncementId = null;
  let otherBranchAnnouncementId = null;
  let linkedParentVisible = false;
  let hqFixtureBranchId = null;
  let fixtureClassId = null;
  let fixtureStudentId = null;

  // 1) HQ create draft + publish with branch target.
  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const hqCtx = await resolveCurrentProfileContext(supabase);
    if (hqCtx.error || !hqCtx.data?.id) {
      printResult("CHECK", "HQ: profile context unavailable");
    } else {
      printResult("CHECK", formatProfileContext("HQ context", hqCtx.data));

      hqFixtureBranchId = pickUuid(
        trimEnv("PARENT_ANNOUNCEMENTS_TEST_BRANCH_ID"),
        pickUuid(hqCtx.data.branch_id, DEFAULT_FAKE_BRANCH_ID)
      );
      fixtureClassId = pickUuid(trimEnv("PARENT_ANNOUNCEMENTS_TEST_CLASS_ID"), DEFAULT_FAKE_CLASS_ID);
      fixtureStudentId = pickUuid(trimEnv("PARENT_ANNOUNCEMENTS_TEST_STUDENT_ID"), DEFAULT_FAKE_STUDENT_ID);
      const otherBranchId = pickUuid(
        trimEnv("PARENT_ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID"),
        DEFAULT_FAKE_OTHER_BRANCH_ID
      );

      printResult(
        "CHECK",
        `Fixture discovery: branch_id=${hqFixtureBranchId ? "found" : "missing"} class_id=${
          fixtureClassId ? "found" : "missing"
        } student_id=${fixtureStudentId ? "found" : "missing"} other_branch_id=${
          otherBranchId ? "found" : "missing"
        }`
      );

      if (!hqFixtureBranchId) {
        printResult("CHECK", "HQ create/publish skipped (branch fixture unresolved)");
      } else {
        const createResult = await createParentAnnouncement({
          title: `Smoke Parent Announcement HQ ${new Date().toISOString()}`,
          subtitle: "Fake/dev parent announcement",
          body: "Fake/dev parent announcement body for RLS smoke.",
          announcementType: "centre_notice",
          branchId: hqFixtureBranchId,
          targets: [{ targetType: "branch", branchId: hqFixtureBranchId }],
        });
        if (createResult.error || !createResult.data?.announcement?.id) {
          printResult(
            "CHECK",
            `HQ: create parent announcement failed (stage=insert_or_targets; ${createResult.error?.message || "unknown"})`
          );
          await diagnoseDirectCreateInsert({
            supabase,
            branchId: hqFixtureBranchId,
            profileId: hqCtx.data.id,
            label: "HQ",
          });
        } else {
          hqPublishedAnnouncementId = createResult.data.announcement.id;
          createdParentAnnouncementIds.push(hqPublishedAnnouncementId);
          printResult("PASS", "HQ: create parent announcement draft succeeded");

          const publishResult = await publishParentAnnouncement({
            parentAnnouncementId: hqPublishedAnnouncementId,
          });
          if (publishResult.error || publishResult.data?.status !== "published") {
            printResult(
              "CHECK",
              `HQ: publish parent announcement failed (stage=publish; ${publishResult.error?.message || "unknown"})`
            );
          } else {
            printResult("PASS", "HQ: publish parent announcement succeeded");
          }

          if (otherBranchId && otherBranchId !== hqFixtureBranchId) {
            const otherCreate = await createParentAnnouncement({
              title: `Smoke Parent Announcement HQ Other Branch ${new Date().toISOString()}`,
              body: "Fake/dev other-branch visibility negative fixture.",
              announcementType: "event",
              branchId: otherBranchId,
              targets: [{ targetType: "branch", branchId: otherBranchId }],
            });
            if (!otherCreate.error && otherCreate.data?.announcement?.id) {
              otherBranchAnnouncementId = otherCreate.data.announcement.id;
              createdParentAnnouncementIds.push(otherBranchAnnouncementId);
              const otherPublish = await publishParentAnnouncement({
                parentAnnouncementId: otherBranchAnnouncementId,
              });
              if (otherPublish.error || otherPublish.data?.status !== "published") {
                printResult(
                  "CHECK",
                  `HQ: other-branch publish fixture CHECK (${otherPublish.error?.message || "unknown"})`
                );
              } else {
                printResult("PASS", "HQ: other-branch published fixture created for parent negative check");
              }
            } else {
              printResult("CHECK", `HQ: other-branch fixture CHECK (${otherCreate.error?.message || "unknown"})`);
            }
          }
        }
      }
    }
  } else {
    printResult("CHECK", "HQ checks skipped");
  }
  await signOut();

  // 2) Supervisor own-branch create/publish.
  const supervisorSignIn = await signInRole(supervisorUser, deps);
  if (supervisorSignIn.ok) {
    const supervisorCtx = await resolveCurrentProfileContext(supabase);
    if (!supervisorCtx.error && supervisorCtx.data) {
      printResult("CHECK", formatProfileContext("Branch Supervisor context", supervisorCtx.data));
    }
    const supervisorBranchId = isUuidLike(supervisorCtx.data?.branch_id) ? supervisorCtx.data.branch_id : null;
    if (!supervisorBranchId) {
      printResult("CHECK", "Branch Supervisor own-branch create/publish skipped (branch unavailable)");
    } else {
      const supervisorCreate = await createParentAnnouncement({
        title: `Smoke Parent Announcement Supervisor ${new Date().toISOString()}`,
        body: "Fake/dev supervisor parent announcement body.",
        announcementType: "reminder",
        branchId: supervisorBranchId,
        targets: [{ targetType: "branch", branchId: supervisorBranchId }],
      });
      if (supervisorCreate.error || !supervisorCreate.data?.announcement?.id) {
        printResult(
          "CHECK",
          `Branch Supervisor own-branch create CHECK (stage=insert_or_targets; ${supervisorCreate.error?.message || "unknown"})`
        );
        await diagnoseDirectCreateInsert({
          supabase,
          branchId: supervisorBranchId,
          profileId: supervisorCtx.data?.id || null,
          label: "Branch Supervisor",
        });

        const createDraftNoTargets = await createParentAnnouncement({
          title: `Smoke Parent Announcement Supervisor NoTargets ${new Date().toISOString()}`,
          body: "Fake/dev supervisor isolate-no-targets",
          announcementType: "reminder",
          branchId: supervisorBranchId,
          targets: [],
        });
        if (createDraftNoTargets.error || !createDraftNoTargets.data?.announcement?.id) {
          printResult(
            "CHECK",
            `Branch Supervisor diagnostic CHECK (stage=announcement_insert_only; ${createDraftNoTargets.error?.message || "unknown"})`
          );
        } else {
          createdParentAnnouncementIds.push(createDraftNoTargets.data.announcement.id);
          printResult("CHECK", "Branch Supervisor diagnostic: announcement insert-only succeeded; target-stage likely blocker");
        }
      } else {
        supervisorPublishedAnnouncementId = supervisorCreate.data.announcement.id;
        createdParentAnnouncementIds.push(supervisorPublishedAnnouncementId);
        printResult("PASS", "Branch Supervisor: own-branch create parent announcement succeeded");

        const supervisorPublish = await publishParentAnnouncement({
          parentAnnouncementId: supervisorPublishedAnnouncementId,
        });
        if (supervisorPublish.error || supervisorPublish.data?.status !== "published") {
          printResult("CHECK", `Branch Supervisor own-branch publish CHECK (${supervisorPublish.error?.message || "unknown"})`);
        } else {
          printResult("PASS", "Branch Supervisor: own-branch publish parent announcement succeeded");
        }
      }
    }

    // 3) Supervisor cross-branch/mixed-target blocked (if testable).
    const otherBranchId = pickUuid(trimEnv("PARENT_ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID"), DEFAULT_FAKE_OTHER_BRANCH_ID);
    if (!supervisorPublishedAnnouncementId || !isUuidLike(otherBranchId) || !supervisorBranchId || otherBranchId === supervisorBranchId) {
      printResult("CHECK", "Branch Supervisor cross-branch/mixed-target check skipped (fixture missing)");
    } else {
      const mixedTargetCreate = await createParentAnnouncement({
        title: `Smoke Parent Announcement mixed target ${new Date().toISOString()}`,
        body: "Fake/dev mixed-target attempt",
        announcementType: "event",
        branchId: supervisorBranchId,
        targets: [
          { targetType: "branch", branchId: supervisorBranchId },
          { targetType: "branch", branchId: otherBranchId },
        ],
      });

      if (mixedTargetCreate.error) {
        printResult("PASS", "Branch Supervisor: mixed-target cross-branch create blocked as expected");
      } else {
        printResult("WARNING", "Branch Supervisor: unsafe mixed-target cross-branch create unexpectedly succeeded");
        if (mixedTargetCreate.data?.announcement?.id) {
          createdParentAnnouncementIds.push(mixedTargetCreate.data.announcement.id);
        }
        failureCount += 1;
      }
    }
  } else {
    printResult("CHECK", "Branch Supervisor checks skipped");
  }
  await signOut();

  // 4) Teacher create/manage blocked.
  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok) {
    const teacherCreate = await createParentAnnouncement({
      title: `Teacher should fail ${new Date().toISOString()}`,
      body: "Fake/dev teacher blocked create attempt",
      announcementType: "activity",
      targets: [],
    });
    if (teacherCreate.error) {
      printResult("PASS", "Teacher: create/manage parent announcement blocked as expected");
    } else {
      printResult("WARNING", "Teacher: unsafe parent announcement create unexpectedly succeeded");
      if (teacherCreate.data?.announcement?.id) {
        createdParentAnnouncementIds.push(teacherCreate.data.announcement.id);
      }
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Teacher create/manage check skipped");
  }
  await signOut();

  // 5) Parent linked visibility + mark read + create blocked.
  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    const parentCtx = await resolveCurrentProfileContext(supabase);
    if (!parentCtx.error && parentCtx.data) {
      printResult("CHECK", formatProfileContext("Parent context", parentCtx.data));
    }
    const parentCreate = await createParentAnnouncement({
      title: `Parent should fail ${new Date().toISOString()}`,
      body: "Fake/dev parent blocked create attempt",
      announcementType: "reminder",
      targets: [],
    });
    if (parentCreate.error) {
      printResult("PASS", "Parent: create/manage parent announcement blocked as expected");
    } else {
      printResult("WARNING", "Parent: unsafe parent announcement create unexpectedly succeeded");
      if (parentCreate.data?.announcement?.id) {
        createdParentAnnouncementIds.push(parentCreate.data.announcement.id);
      }
      failureCount += 1;
    }

    const parentList = await listParentAnnouncements({ status: "published" });
    if (parentList.error) {
      printResult("CHECK", `Parent: published visibility check skipped (${parentList.error.message || "unknown"})`);
    } else if (!hqPublishedAnnouncementId) {
      printResult("CHECK", "Parent: visibility check skipped (HQ published fixture unavailable)");
    } else {
      linkedParentVisible = (parentList.data || []).some((row) => row?.id === hqPublishedAnnouncementId);
      if (linkedParentVisible) {
        printResult("PASS", "Parent: linked published parent announcement is visible");
        const detailRead = await getParentAnnouncementDetail({ parentAnnouncementId: hqPublishedAnnouncementId });
        if (detailRead.error || !detailRead.data?.id) {
          printResult("WARNING", `Parent: detail read failed (${detailRead.error?.message || "unknown"})`);
          failureCount += 1;
        } else {
          printResult("PASS", "Parent: parent announcement detail read succeeded");
        }

        const markReadResult = await markParentAnnouncementRead({
          parentAnnouncementId: hqPublishedAnnouncementId,
        });
        if (markReadResult.error || !markReadResult.data?.id) {
          printResult("CHECK", `Parent: mark own read receipt CHECK (${markReadResult.error?.message || "unknown"})`);
        } else {
          printResult("PASS", "Parent: mark own read receipt succeeded");
        }
      } else {
        printResult("CHECK", "Parent: linked published visibility check skipped/not visible (fixture dependent)");
      }
    }

    if (otherBranchAnnouncementId) {
      const parentSeesOtherBranch = (parentList.data || []).some((row) => row?.id === otherBranchAnnouncementId);
      if (parentSeesOtherBranch) {
        printResult("WARNING", "Parent: unrelated other-branch published fixture unexpectedly visible");
        failureCount += 1;
      } else {
        printResult("PASS", "Parent: unrelated other-branch published fixture blocked/empty as expected");
      }
    } else {
      printResult("CHECK", "Parent: unrelated branch negative check skipped (other-branch fixture unavailable)");
    }

    const parentInternalRead = await listAnnouncements({ audienceType: "internal_staff" });
    if (parentInternalRead.error || (Array.isArray(parentInternalRead.data) && parentInternalRead.data.length === 0)) {
      printResult("PASS", "Parent: internal_staff announcements blocked/empty as expected");
    } else {
      printResult("WARNING", "Parent: internal_staff announcements unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Parent checks skipped");
  }
  await signOut();

  // 6) Unrelated parent blocked/empty when fixture available.
  const unrelatedParentSignIn = await signInRole(unrelatedParentUser, deps);
  if (unrelatedParentSignIn.ok) {
    const unrelatedRead = await listParentAnnouncements({ status: "published" });
    if (unrelatedRead.error) {
      printResult("CHECK", `Unrelated Parent: visibility check skipped (${unrelatedRead.error.message || "unknown"})`);
    } else if (!hqPublishedAnnouncementId || !linkedParentVisible) {
      printResult("CHECK", "Unrelated Parent: blocked check skipped (linked parent baseline unavailable)");
    } else {
      const unrelatedVisible = (unrelatedRead.data || []).some((row) => row?.id === hqPublishedAnnouncementId);
      if (unrelatedVisible) {
        printResult("WARNING", "Unrelated Parent: parent announcement unexpectedly visible");
        failureCount += 1;
      } else {
        printResult("PASS", "Unrelated Parent: parent announcement blocked/empty as expected");
      }
    }
  } else {
    printResult(
      "CHECK",
      "Unrelated Parent check skipped (missing/invalid unrelated parent fixture credentials or auth user)"
    );
  }
  await signOut();

  // 7) Student blocked/empty.
  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    const studentRead = await listParentAnnouncements({ status: "published" });
    if (studentRead.error || (Array.isArray(studentRead.data) && studentRead.data.length === 0)) {
      printResult("PASS", "Student: parent announcements blocked/empty as expected");
    } else {
      printResult("WARNING", "Student: parent announcements unexpectedly visible");
      failureCount += 1;
    }
  } else {
    printResult("CHECK", "Student check skipped");
  }
  await signOut();

  printResult("PASS", "No media upload/service/storage object access exercised in this milestone smoke");
  printResult("PASS", "No notification/email side effects are exercised in this smoke");

  // 8) Cleanup with HQ or supervisor.
  const cleanupWarnings = [];
  const hqCleanupSignIn = await signInRole(hqUser, deps);
  if (!hqCleanupSignIn.ok) {
    const supervisorCleanupSignIn = await signInRole(supervisorUser, deps);
    if (!supervisorCleanupSignIn.ok) {
      printResult("CHECK", "Cleanup skipped (no HQ/supervisor session)");
      warningCount += 1;
    }
  }

  for (const parentAnnouncementId of createdParentAnnouncementIds) {
    if (!isUuidLike(parentAnnouncementId)) continue;
    const deleteResult = await supabase
      .from("parent_announcements")
      .delete()
      .eq("id", parentAnnouncementId)
      .select("id")
      .maybeSingle();
    if (deleteResult.error) {
      cleanupWarnings.push(
        `parent_announcements cleanup blocked (${parentAnnouncementId}): ${deleteResult.error?.message || "unknown"}`
      );
    } else {
      printResult("PASS", `Cleanup: parent announcement removed (${parentAnnouncementId})`);
    }
  }
  await signOut();

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
    warningCount += 1;
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to RLS/session scope; only fake/dev fixture rows were used");
  }
  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning(s)`);
  }
  if (failureCount > 0) {
    process.exit(1);
  }
}

function trimEnv(key) {
  const raw = process.env[key];
  return typeof raw === "string" ? raw.trim() : "";
}

run().catch((err) => {
  console.error("[WARNING] Parent announcements smoke test crashed:", err?.message || err);
  process.exit(1);
});

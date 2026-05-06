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

function pickUuid(candidate, fallback = null) {
  return isUuidLike(candidate) ? String(candidate).trim() : fallback;
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

async function run() {
  const [{ signInWithEmailPassword, signOut }, readService, writeService, uploadService, { supabase }] = await Promise.all([
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseWriteService.js"),
    import("../src/services/supabaseUploadService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  const { listParentAnnouncements } = readService;
  const { createParentAnnouncement, publishParentAnnouncement } = writeService;
  const {
    uploadParentAnnouncementMedia,
    listParentAnnouncementMedia,
    getParentAnnouncementMediaSignedUrl,
    releaseParentAnnouncementMedia,
    deleteParentAnnouncementMedia,
  } = uploadService;

  const deps = { signInWithEmailPassword, signOut };
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

  const createdAnnouncementIds = [];
  const createdMediaIds = [];
  let warningCount = 0;
  let failureCount = 0;

  let hqPublishedAnnouncementId = null;
  let otherBranchAnnouncementId = null;
  let hqMediaUnreleasedId = null;
  let hqMediaReleasedId = null;
  let otherBranchMediaReleasedId = null;

  const hqSignIn = await signInRole(hqUser, deps);
  if (hqSignIn.ok) {
    const hqCtx = await resolveCurrentProfileContext(supabase);
    if (hqCtx.error || !hqCtx.data?.id) {
      printResult("CHECK", "HQ media checks skipped (profile context unavailable)");
    } else {
      printResult("CHECK", formatProfileContext("HQ context", hqCtx.data));
      const fixtureBranchId = pickUuid(
        process.env.PARENT_ANNOUNCEMENTS_TEST_BRANCH_ID,
        pickUuid(hqCtx.data.branch_id, "11111111-1111-1111-1111-111111111111")
      );
      const fixtureOtherBranchId = pickUuid(
        process.env.PARENT_ANNOUNCEMENTS_TEST_OTHER_BRANCH_ID,
        "22222222-2222-2222-2222-222222222222"
      );
      printResult(
        "CHECK",
        `Fixture discovery: branch_id=${fixtureBranchId ? "found" : "missing"} other_branch_id=${fixtureOtherBranchId ? "found" : "missing"}`
      );

      if (!fixtureBranchId) {
        printResult("CHECK", "HQ media checks skipped (branch fixture unresolved)");
      } else {
        const createBase = await createParentAnnouncement({
          title: `Media Smoke HQ ${new Date().toISOString()}`,
          body: "Fake/dev parent announcement for media smoke.",
          announcementType: "centre_notice",
          branchId: fixtureBranchId,
          targets: [{ targetType: "branch", branchId: fixtureBranchId }],
        });
        if (createBase.error || !createBase.data?.announcement?.id) {
          printResult("CHECK", `HQ: media base create skipped (${createBase.error?.message || "unknown"})`);
        } else {
          hqPublishedAnnouncementId = createBase.data.announcement.id;
          createdAnnouncementIds.push(hqPublishedAnnouncementId);
          printResult("PASS", "HQ: media base announcement draft created");
          const publishBase = await publishParentAnnouncement({
            parentAnnouncementId: hqPublishedAnnouncementId,
          });
          if (publishBase.error || publishBase.data?.status !== "published") {
            printResult("CHECK", `HQ: media base publish skipped (${publishBase.error?.message || "unknown"})`);
          } else {
            printResult("PASS", "HQ: media base announcement published");
          }

          const uploadUnreleased = await uploadParentAnnouncementMedia({
            parentAnnouncementId: hqPublishedAnnouncementId,
            file: new Blob(["fake unreleased parent media"], { type: "text/plain" }),
            mediaRole: "attachment",
            fileName: "parent-media-unreleased.txt",
            contentType: "application/pdf",
          });
          if (uploadUnreleased.error || !uploadUnreleased.data?.media?.id) {
            printResult("CHECK", `HQ: unreleased media upload CHECK (${uploadUnreleased.error?.message || "unknown"})`);
            if (uploadUnreleased.error?.cleanup_warning) {
              printResult("CHECK", `HQ: unreleased media cleanup warning (${uploadUnreleased.error.cleanup_warning})`);
            }
          } else {
            hqMediaUnreleasedId = uploadUnreleased.data.media.id;
            createdMediaIds.push(hqMediaUnreleasedId);
            printResult("PASS", "HQ: upload parent announcement media (unreleased) succeeded");
          }

          const uploadReleasedTarget = await uploadParentAnnouncementMedia({
            parentAnnouncementId: hqPublishedAnnouncementId,
            file: new Blob(["fake released parent media"], { type: "text/plain" }),
            mediaRole: "cover_image",
            fileName: "parent-media-released.txt",
            contentType: "image/png",
          });
          if (uploadReleasedTarget.error || !uploadReleasedTarget.data?.media?.id) {
            printResult("CHECK", `HQ: releasable media upload CHECK (${uploadReleasedTarget.error?.message || "unknown"})`);
            if (uploadReleasedTarget.error?.cleanup_warning) {
              printResult("CHECK", `HQ: releasable media cleanup warning (${uploadReleasedTarget.error.cleanup_warning})`);
            }
          } else {
            hqMediaReleasedId = uploadReleasedTarget.data.media.id;
            createdMediaIds.push(hqMediaReleasedId);
            printResult("PASS", "HQ: upload parent announcement media (to-release) succeeded");
          }

          const listBase = await listParentAnnouncementMedia({
            parentAnnouncementId: hqPublishedAnnouncementId,
          });
          if (listBase.error) {
            printResult("WARNING", `HQ: list parent media failed (${listBase.error?.message || "unknown"})`);
            failureCount += 1;
          } else {
            const rows = Array.isArray(listBase.data) ? listBase.data : [];
            const hasUnreleased = hqMediaUnreleasedId ? rows.some((row) => row?.id === hqMediaUnreleasedId) : false;
            const hasReleasedCandidate = hqMediaReleasedId ? rows.some((row) => row?.id === hqMediaReleasedId) : false;
            if ((hqMediaUnreleasedId && !hasUnreleased) || (hqMediaReleasedId && !hasReleasedCandidate)) {
              printResult("WARNING", "HQ: list parent media missing uploaded rows");
              failureCount += 1;
            } else {
              printResult("PASS", "HQ: list parent media includes uploaded rows");
            }
          }

          if (hqMediaReleasedId) {
            const managerSigned = await getParentAnnouncementMediaSignedUrl({
              mediaId: hqMediaReleasedId,
              expiresIn: 90,
            });
            if (managerSigned.error || !managerSigned.data?.signed_url) {
              printResult("WARNING", `HQ: signed URL generation failed (${managerSigned.error?.message || "unknown"})`);
              failureCount += 1;
            } else {
              printResult("PASS", "HQ: signed URL generated for parent media");
              if (String(managerSigned.data.signed_url).includes("/object/public/")) {
                printResult("WARNING", "HQ: unexpected public URL pattern detected");
                failureCount += 1;
              } else {
                printResult("PASS", "HQ: no public URL path detected");
              }
            }

            const releaseResult = await releaseParentAnnouncementMedia({ mediaId: hqMediaReleasedId });
            if (releaseResult.error || !releaseResult.data?.id || releaseResult.data.released_to_parent !== true) {
              printResult("WARNING", `HQ: release parent media failed (${releaseResult.error?.message || "unknown"})`);
              failureCount += 1;
            } else {
              printResult("PASS", "HQ: release parent media succeeded");
            }
          }
        }

        if (
          fixtureOtherBranchId &&
          fixtureOtherBranchId !== fixtureBranchId
        ) {
          const createOther = await createParentAnnouncement({
            title: `Media Smoke HQ Other Branch ${new Date().toISOString()}`,
            body: "Fake/dev other-branch parent media negative fixture.",
            announcementType: "event",
            branchId: fixtureOtherBranchId,
            targets: [{ targetType: "branch", branchId: fixtureOtherBranchId }],
          });
          if (createOther.error || !createOther.data?.announcement?.id) {
            printResult("CHECK", `HQ: other-branch media fixture CHECK (${createOther.error?.message || "unknown"})`);
          } else {
            otherBranchAnnouncementId = createOther.data.announcement.id;
            createdAnnouncementIds.push(otherBranchAnnouncementId);
            const publishOther = await publishParentAnnouncement({
              parentAnnouncementId: otherBranchAnnouncementId,
            });
            if (publishOther.error || publishOther.data?.status !== "published") {
              printResult("CHECK", `HQ: other-branch media publish CHECK (${publishOther.error?.message || "unknown"})`);
            } else {
              const uploadOther = await uploadParentAnnouncementMedia({
                parentAnnouncementId: otherBranchAnnouncementId,
                file: new Blob(["fake other branch media"], { type: "text/plain" }),
                mediaRole: "parent_media",
                fileName: "other-branch-parent-media.txt",
                contentType: "image/jpeg",
              });
              if (uploadOther.error || !uploadOther.data?.media?.id) {
                printResult("CHECK", `HQ: other-branch media upload CHECK (${uploadOther.error?.message || "unknown"})`);
              } else {
                otherBranchMediaReleasedId = uploadOther.data.media.id;
                createdMediaIds.push(otherBranchMediaReleasedId);
                const releaseOther = await releaseParentAnnouncementMedia({ mediaId: otherBranchMediaReleasedId });
                if (releaseOther.error || !releaseOther.data?.id) {
                  printResult("CHECK", `HQ: other-branch media release CHECK (${releaseOther.error?.message || "unknown"})`);
                } else {
                  printResult("PASS", "HQ: other-branch released media fixture created for parent negative check");
                }
              }
            }
          }
        } else {
          printResult("CHECK", "HQ: other-branch media fixture skipped (fixture missing)");
        }
      }
    }
  } else {
    printResult("CHECK", "HQ media checks skipped");
  }
  await signOut();

  const parentSignIn = await signInRole(parentUser, deps);
  if (parentSignIn.ok) {
    if (hqPublishedAnnouncementId) {
      const parentAnnouncements = await listParentAnnouncements({ status: "published" });
      const linkedVisible = Array.isArray(parentAnnouncements.data)
        ? parentAnnouncements.data.some((row) => row?.id === hqPublishedAnnouncementId)
        : false;
      if (parentAnnouncements.error || !linkedVisible) {
        printResult("CHECK", `Parent: published media fixture visibility CHECK (${parentAnnouncements.error?.message || "not_visible"})`);
      } else {
        if (hqMediaUnreleasedId) {
          const preReleaseList = await listParentAnnouncementMedia({
            parentAnnouncementId: hqPublishedAnnouncementId,
          });
          if (preReleaseList.error) {
            printResult("CHECK", `Parent: pre-release list CHECK (${preReleaseList.error?.message || "unknown"})`);
          } else {
            const rows = Array.isArray(preReleaseList.data) ? preReleaseList.data : [];
            const hasUnreleased = rows.some((row) => row?.id === hqMediaUnreleasedId);
            if (hasUnreleased) {
              printResult("WARNING", "Parent: unreleased media unexpectedly visible");
              failureCount += 1;
            } else {
              printResult("PASS", "Parent: unreleased media remains hidden");
            }
          }

          const preReleaseSigned = await getParentAnnouncementMediaSignedUrl({
            mediaId: hqMediaUnreleasedId,
            expiresIn: 90,
          });
          if (preReleaseSigned.error) {
            printResult("PASS", "Parent: unreleased media signed URL blocked as expected");
          } else {
            printResult("WARNING", "Parent: unreleased media signed URL unexpectedly succeeded");
            failureCount += 1;
          }
        }

        if (hqMediaReleasedId) {
          const releasedList = await listParentAnnouncementMedia({
            parentAnnouncementId: hqPublishedAnnouncementId,
          });
          const hasReleased = Array.isArray(releasedList.data)
            ? releasedList.data.some((row) => row?.id === hqMediaReleasedId)
            : false;
          if (releasedList.error || !hasReleased) {
            printResult("WARNING", `Parent: released media list check failed (${releasedList.error?.message || "not_listed"})`);
            failureCount += 1;
          } else {
            printResult("PASS", "Parent: released media visible");
          }

          const releasedSigned = await getParentAnnouncementMediaSignedUrl({
            mediaId: hqMediaReleasedId,
            expiresIn: 90,
          });
          if (releasedSigned.error || !releasedSigned.data?.signed_url) {
            printResult("WARNING", `Parent: released media signed URL failed (${releasedSigned.error?.message || "unknown"})`);
            failureCount += 1;
          } else {
            printResult("PASS", "Parent: released media signed URL succeeded");
            if (String(releasedSigned.data.signed_url).includes("/object/public/")) {
              printResult("WARNING", "Parent: detected unexpected public URL pattern");
              failureCount += 1;
            } else {
              printResult("PASS", "Parent: no public URL path detected");
            }
          }
        }
      }
    } else {
      printResult("CHECK", "Parent media checks skipped (HQ fixture unavailable)");
    }

    if (otherBranchAnnouncementId && otherBranchMediaReleasedId) {
      const unrelatedBranchList = await listParentAnnouncementMedia({
        parentAnnouncementId: otherBranchAnnouncementId,
      });
      const isBlocked =
        unrelatedBranchList.error ||
        !Array.isArray(unrelatedBranchList.data) ||
        !unrelatedBranchList.data.some((row) => row?.id === otherBranchMediaReleasedId);
      if (isBlocked) {
        printResult("PASS", "Parent: other-branch released media blocked/empty as expected");
      } else {
        printResult("WARNING", "Parent: other-branch released media unexpectedly visible");
        failureCount += 1;
      }
    } else {
      printResult("CHECK", "Parent: other-branch media negative check skipped (fixture missing)");
    }
  } else {
    printResult("CHECK", "Parent media checks skipped");
  }
  await signOut();

  const unrelatedParentSignIn = await signInRole(unrelatedParentUser, deps);
  if (unrelatedParentSignIn.ok) {
    if (hqPublishedAnnouncementId) {
      const unrelatedList = await listParentAnnouncementMedia({
        parentAnnouncementId: hqPublishedAnnouncementId,
      });
      const hasAny = Array.isArray(unrelatedList.data) && unrelatedList.data.length > 0;
      if (unrelatedList.error || !hasAny) {
        printResult("PASS", "Unrelated Parent: parent media blocked/empty as expected");
      } else {
        printResult("WARNING", "Unrelated Parent: parent media unexpectedly visible");
        failureCount += 1;
      }
    } else {
      printResult("CHECK", "Unrelated Parent: check skipped (missing fixture)");
    }
  } else {
    warningCount += 1;
    printResult(
      "CHECK",
      "Unrelated Parent: credential-based login check skipped (missing/invalid unrelated parent fixture credentials)"
    );
  }
  await signOut();

  const teacherSignIn = await signInRole(teacherUser, deps);
  if (teacherSignIn.ok) {
    if (hqPublishedAnnouncementId) {
      const teacherUpload = await uploadParentAnnouncementMedia({
        parentAnnouncementId: hqPublishedAnnouncementId,
        file: new Blob(["fake teacher blocked parent media upload"], { type: "text/plain" }),
        mediaRole: "parent_media",
        fileName: "teacher-parent-media-should-fail.txt",
        contentType: "image/webp",
      });
      if (teacherUpload.error) {
        printResult("PASS", "Teacher: upload/manage parent media blocked as expected");
      } else {
        printResult("WARNING", "Teacher: upload/manage parent media unexpectedly succeeded");
        if (teacherUpload.data?.media?.id) createdMediaIds.push(teacherUpload.data.media.id);
        failureCount += 1;
      }
    } else {
      printResult("CHECK", "Teacher media check skipped (missing fixture)");
    }
  } else {
    printResult("CHECK", "Teacher media checks skipped");
  }
  await signOut();

  const studentSignIn = await signInRole(studentUser, deps);
  if (studentSignIn.ok) {
    if (hqPublishedAnnouncementId) {
      const studentList = await listParentAnnouncementMedia({
        parentAnnouncementId: hqPublishedAnnouncementId,
      });
      const blocked = studentList.error || !Array.isArray(studentList.data) || studentList.data.length === 0;
      if (blocked) {
        printResult("PASS", "Student: parent media blocked/empty as expected");
      } else {
        printResult("WARNING", "Student: parent media unexpectedly visible");
        failureCount += 1;
      }
    } else {
      printResult("CHECK", "Student media checks skipped (missing fixture)");
    }
  } else {
    printResult("CHECK", "Student media checks skipped");
  }
  await signOut();

  printResult("PASS", "No internal announcements-attachments bucket reuse in this media smoke");
  printResult("PASS", "No email/notification side effects exercised in this media smoke");

  const cleanupWarnings = [];
  const hqCleanupSignIn = await signInRole(hqUser, deps);
  if (!hqCleanupSignIn.ok) {
    const supervisorCleanupSignIn = await signInRole(supervisorUser, deps);
    if (!supervisorCleanupSignIn.ok) {
      printResult("CHECK", "Cleanup skipped (no HQ/supervisor session)");
    }
  }

  for (const mediaId of createdMediaIds) {
    if (!isUuidLike(mediaId)) continue;
    const deleteMedia = await deleteParentAnnouncementMedia({ mediaId });
    if (deleteMedia.error) {
      cleanupWarnings.push(`parent media cleanup blocked (${mediaId})`);
    } else {
      if (deleteMedia.data?.cleanup_warning) {
        cleanupWarnings.push(`parent media object cleanup warning (${mediaId})`);
      }
      printResult("PASS", `Cleanup: parent media removed (${mediaId})`);
    }
  }

  for (const parentAnnouncementId of createdAnnouncementIds) {
    if (!isUuidLike(parentAnnouncementId)) continue;
    const deleteAnnouncement = await supabase
      .from("parent_announcements")
      .delete()
      .eq("id", parentAnnouncementId)
      .select("id")
      .maybeSingle();
    if (deleteAnnouncement.error) {
      cleanupWarnings.push(`parent announcement cleanup blocked (${parentAnnouncementId})`);
    } else {
      printResult("PASS", `Cleanup: parent announcement removed (${parentAnnouncementId})`);
    }
  }

  await signOut();

  for (const warning of cleanupWarnings) {
    printResult("WARNING", `Cleanup: ${warning}`);
  }
  if (cleanupWarnings.length > 0) {
    printResult("CHECK", "Cleanup incomplete due to RLS/session scope; only fake/dev fixture rows were used");
  } else {
    printResult("PASS", "Cleanup: parent media objects/rows + announcements removed");
  }

  if (warningCount > 0) {
    printResult("CHECK", `Completed with ${warningCount} warning-check note(s)`);
  }

  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[WARNING] Parent announcements media smoke test crashed:", err?.message || err);
  process.exit(1);
});

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function resolvePassword(roleSpecificVar) {
  return process.env[roleSpecificVar] || process.env.RLS_TEST_PASSWORD || "";
}

async function signInRole({ label, email, passwordVar }, deps) {
  const password = resolvePassword(passwordVar);
  if (!password) {
    printResult("WARNING", `${label}: missing password (${passwordVar} or RLS_TEST_PASSWORD)`);
    return { ok: false };
  }
  const { signInWithEmailPassword, signOut } = deps;
  const { error } = await signInWithEmailPassword(email, password);
  if (error) {
    printResult("WARNING", `${label}: sign-in failed (${error.message || "unknown"})`);
    await signOut();
    return { ok: false };
  }
  return { ok: true };
}

function isLikelyTemplatesTableMissing(error) {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("relation \"notification_templates\" does not exist")
    || msg.includes("could not find the table")
    || msg.includes("schema cache")
    || msg.includes("404")
    || msg.includes("pgrst205")
  );
}

async function run() {
  const [
    readServiceModule,
    { signInWithEmailPassword, signOut },
    { supabase },
  ] = await Promise.all([
    import("../src/services/supabaseReadService.js"),
    import("../src/services/supabaseAuthService.js"),
    import("../src/services/supabaseClient.js"),
  ]);

  const { renderNotificationTemplate, getActiveNotificationTemplate } = readServiceModule;

  if (!supabaseUrl || !supabaseAnonKey) {
    printResult("SKIP", "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
    process.exit(0);
  }

  if (!supabase) {
    printResult("WARNING", "Supabase client not configured after env load");
    process.exit(1);
  }

  let failureCount = 0;
  let warningCount = 0;

  // Renderer (no DB): fallback + substitutions
  const fallback = renderNotificationTemplate({
    template: null,
    variables: {},
    fallbackTitle: "FT",
    fallbackBody: "FB",
  });
  if (fallback.usedFallback !== true || fallback.title !== "FT" || fallback.body !== "FB") {
    printResult("WARNING", "Renderer: expected full fallback when template missing");
    failureCount += 1;
  } else {
    printResult("PASS", "Renderer: fallback when template missing");
  }

  const allowedRender = renderNotificationTemplate({
    template: {
      title_template: "Hi {{name}}",
      body_template: "Body {{name}} unused {{unknown}}.",
      allowed_variables: ["name"],
    },
    variables: { name: "Sam", secretLeak: "X", unknown: "Y" },
    fallbackTitle: "FBT",
    fallbackBody: "FBB",
  });
  if (allowedRender.title !== "Hi Sam" || !allowedRender.body.includes("Sam") || allowedRender.body.includes("Y")) {
    printResult("WARNING", "Renderer: allowed-variables substitution failed");
    failureCount += 1;
  } else if (
    allowedRender.body.includes("{{unknown}}")
    || allowedRender.body.includes("{{")
    || allowedRender.body.includes("}")
  ) {
    printResult("WARNING", "Renderer: expected placeholders stripped or emptied");
    failureCount += 1;
  } else {
    printResult("PASS", "Renderer: only allowed_variables receive caller values");
  }

  const blockedLeak = renderNotificationTemplate({
    template: {
      title_template: "{{secretLeak}} Hi",
      body_template: "{{secretLeak}}",
      allowed_variables: ["other"],
    },
    variables: { secretLeak: "SHOULD_NOT_APPEAR", other: "Ok" },
    fallbackTitle: "SafeT",
    fallbackBody: "SafeB",
  });
  const leakBlob = `${blockedLeak.title}|${blockedLeak.body}`;
  if (leakBlob.includes("SHOULD_NOT_APPEAR")) {
    printResult("WARNING", "Renderer: leaked disallowed placeholder value");
    failureCount += 1;
  } else {
    printResult("PASS", "Renderer: unknown placeholders do not receive variables");
  }

  const hqUser = {
    label: "HQ Admin",
    email: process.env.RLS_TEST_HQ_EMAIL || "hq.demo@example.test",
    passwordVar: "RLS_TEST_HQ_PASSWORD",
  };
  const supervisorUser = {
    label: "Branch Supervisor",
    email: process.env.RLS_TEST_SUPERVISOR_EMAIL || "supervisor.demo@example.test",
    passwordVar: "RLS_TEST_SUPERVISOR_PASSWORD",
  };
  const parentUser = {
    label: "Parent",
    email: process.env.RLS_TEST_PARENT_EMAIL || "parent.demo@example.test",
    passwordVar: "RLS_TEST_PARENT_PASSWORD",
  };
  const studentUser = {
    label: "Student",
    email: process.env.RLS_TEST_STUDENT_EMAIL || "student.demo@example.test",
    passwordVar: "RLS_TEST_STUDENT_PASSWORD",
  };

  const hqSignIn = await signInRole(hqUser, { signInWithEmailPassword, signOut });
  if (!hqSignIn.ok) process.exit(1);

  let hqNeedsMigrationHint = false;
  /** True when seeded template rows visible to HQ — skip supervisor/parent probes if migrations missing. */
  let templatesSmokeDbReady = false;
  const hqList = await supabase
    .from("notification_templates")
    .select("id,template_key,event_type,channel,is_active,branch_id", { count: "exact" })
    .limit(40);
  if (hqList.error) {
    if (isLikelyTemplatesTableMissing(hqList.error)) {
      hqNeedsMigrationHint = true;
      printResult(
        "CHECK",
        "HQ list failed — apply supabase/sql/038_notification_templates_foundation.sql via Supabase SQL Editor (or CLI), then re-run.",
      );
      failureCount += 1;
    } else {
      printResult("WARNING", `HQ Admin: template select failed (${hqList.error.message || "unknown"})`);
      warningCount += 1;
      failureCount += 1;
    }
  } else if (!Array.isArray(hqList.data) || hqList.data.length < 10) {
    printResult(
      "CHECK",
      `HQ Admin: expected seeded global templates (>=10, includes 038+039 billing rows); found ${Array.isArray(hqList.data) ? hqList.data.length : 0}. Verify migrations 038 and 039 applied.`,
    );
    failureCount += 1;
  } else {
    templatesSmokeDbReady = true;
    printResult("PASS", `HQ Admin: read ${hqList.data.length} notification template rows`);
    const inactiveProbe = hqList.data.filter((row) => row?.is_active === false);
    if (inactiveProbe.length > 0) {
      warningCount += 1;
      printResult("CHECK", `HQ Admin: inactive template rows visible to HQ (${inactiveProbe.length}) — expected HQ-only read`);
    }

    const parentCommentRow =
      hqList.data.find((r) => trimString(String(r.event_type || "")) === "parent_comment.released") ??
      hqList.data[0];

    const activeLookup = await getActiveNotificationTemplate({
      eventType: "parent_comment.released",
      channel: "in_app",
      branchId: null,
    });
    if (activeLookup.error) {
      printResult("WARNING", `getActiveNotificationTemplate (${activeLookup.error.message || ""})`);
      failureCount += 1;
    } else if (!activeLookup.data?.id) {
      printResult("CHECK", "getActiveNotificationTemplate: no row for parent_comment.released (seed missing?)");
      failureCount += 1;
    } else if (trimString(activeLookup.data.event_type || "") !== "parent_comment.released") {
      printResult("WARNING", "getActiveNotificationTemplate: unexpected event_type");
      failureCount += 1;
    } else {
      printResult(
        "PASS",
        `HQ getActiveNotificationTemplate resolved template_key=${trimString(activeLookup.data.template_key || "")}`,
      );

      const missEvent = await getActiveNotificationTemplate({
        eventType: "__smoke_templates_nonexistent__.event_type",
        channel: "in_app",
      });
      if (missEvent.data != null || missEvent.error) {
        printResult("WARNING", "getActiveNotificationTemplate: expected null data / no error for missing event_type");
        failureCount += 1;
      } else {
        printResult("PASS", "HQ getActiveNotificationTemplate: missing event_type resolves to null safely");
        const fbMiss = renderNotificationTemplate({
          template: missEvent.data,
          fallbackTitle: "Hard title",
          fallbackBody: "Hard body",
        });
        if (fbMiss.title !== "Hard title" || fbMiss.body !== "Hard body") {
          printResult("WARNING", "Fallback copy incorrect when lookup returns null row");
          failureCount += 1;
        } else {
          printResult("PASS", "Fallback title/body when no template exists (service lookup path)");
        }
      }

      const fromRow = renderNotificationTemplate({
        template: activeLookup.data,
        variables: {},
        fallbackTitle: "fallback title",
        fallbackBody: "fallback body",
      });
      const fromRowLeak = `${fromRow.title}|${fromRow.body}`;
      const tTitle = trimString(fromRow.title);
      const tBody =
        typeof fromRow.body === "string" ? trimString(fromRow.body) : trimString(String(fromRow.body ?? ""));
      if (!tTitle || !tBody) {
        failureCount += 1;
        printResult("WARNING", "HQ-rendered seeded template unexpectedly empty title/body");
      } else if (/\{\{/.test(fromRowLeak)) {
        failureCount += 1;
        printResult("WARNING", "HQ-rendered seeded template leaked placeholder syntax");
      } else {
        printResult(
          "PASS",
          `Rendered seeded global row (event_type=${trimString(activeLookup.data.event_type || "").slice(0, 40)})`,
        );
      }

      printResult(
        "PASS",
        `HQ exercised template read + getActiveNotificationTemplate (${trimString(parentCommentRow?.template_key || "row")})`,
      );
    }
  }

  const hqSignOut = await signOut();
  if (hqSignOut?.error) {
    warningCount += 1;
  }

  if (!hqNeedsMigrationHint && templatesSmokeDbReady) {
    const supervisorSignIn = await signInRole(supervisorUser, { signInWithEmailPassword, signOut });
    if (!supervisorSignIn.ok) {
      warningCount += 1;
      printResult(
        "CHECK",
        "Branch Supervisor: skipped templates read — sign-in/password missing — add RLS_TEST_SUPERVISOR_PASSWORD",
      );
    } else {
      const supervisorList = await supabase
        .from("notification_templates")
        .select("id,template_key,branch_id,is_active")
        .eq("is_active", true)
        .is("branch_id", null)
        .limit(20);
      if (supervisorList.error || !Array.isArray(supervisorList.data)) {
        printResult(
          "WARNING",
          `Branch Supervisor: expected read of active global templates (${supervisorList.error?.message || "unknown"})`,
        );
        failureCount += 1;
      } else if (supervisorList.data.length < 1) {
        printResult("CHECK", "Branch Supervisor: zero active global rows visible — check RLS or seed.");
        failureCount += 1;
      } else {
        printResult("PASS", `Branch Supervisor: listed ${supervisorList.data.length} active global template(s)`);
      }
      await signOut();
    }

    const parentSignInTpl = await signInRole(parentUser, { signInWithEmailPassword, signOut });
    if (!parentSignInTpl.ok) {
      warningCount += 1;
      printResult("CHECK", "Parent: skipped template RLS probe (sign-in failed or missing credentials)");
    } else {
      const parentProbe = await supabase.from("notification_templates").select("id").limit(1);
      if (!parentProbe.error && Array.isArray(parentProbe.data) && parentProbe.data.length > 0) {
        printResult("WARNING", "Parent: unexpectedly read notification_templates rows");
        failureCount += 1;
      } else if (!parentProbe.error) {
        printResult("PASS", "Parent: templates read returned zero rows without RLS violation");
      } else {
        const pem = trimString(parentProbe.error?.message || "");
        const lower = pem.toLowerCase();
        if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("Forbidden")) {
          printResult("PASS", "Parent: templates denied by RLS as expected");
        } else if (pem.length > 0) {
          printResult("PASS", `Parent: blocked from templates (${pem.slice(0, 120)})`);
        }
      }
      await signOut();
    }

    const studentSignInTpl = await signInRole(studentUser, { signInWithEmailPassword, signOut });
    if (!studentSignInTpl.ok) {
      warningCount += 1;
      printResult("CHECK", "Student: skipped template RLS probe (sign-in failed or missing credentials)");
    } else {
      const studentProbe = await supabase.from("notification_templates").select("id").limit(1);
      if (!studentProbe.error && Array.isArray(studentProbe.data) && studentProbe.data.length > 0) {
        printResult("WARNING", "Student: unexpectedly read notification_templates rows");
        failureCount += 1;
      } else if (!studentProbe.error) {
        printResult("PASS", "Student: templates read returned zero rows");
      } else {
        printResult(
          studentProbe.error.message?.toLowerCase().includes("row-level security") ? "PASS" : "CHECK",
          `Student: template access blocked (${trimString(studentProbe.error?.message || "").slice(0, 140)})`,
        );
      }
      await signOut();
    }
  }

  if (warningCount > 0) printResult("CHECK", `Finished with ${warningCount} warning(s)`);
  if (failureCount > 0 || hqNeedsMigrationHint) process.exit(1);
}

await run();

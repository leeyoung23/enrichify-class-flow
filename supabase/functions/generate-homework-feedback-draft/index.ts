// @ts-nocheck
/* eslint-disable no-undef */
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleGenerateHomeworkFeedbackDraftRequestWithResolver } from "./handler.js";

// TODO(phase-next): Add provider adapter behind server-side secrets only.
// NOTE: This stub intentionally performs no provider call and uses no provider key.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

function normalizeRole(role: string) {
  const safe = String(role || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (safe === "admin" || safe === "hq" || safe === "hqadmin") return "hq_admin";
  if (safe === "branchsupervisor") return "branch_supervisor";
  return safe;
}

async function resolveAuthScope({ bearerToken, payload }) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      status: 500,
      code: "auth_config_missing",
      message: "Edge Function auth configuration is missing.",
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${bearerToken}` },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(bearerToken);
  const userId = authData?.user?.id;
  if (authError || !userId) {
    return {
      ok: false,
      status: 401,
      code: "invalid_auth",
      message: "Invalid or expired auth token.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role,branch_id,is_active")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile || profile.is_active === false) {
    return {
      ok: false,
      status: 403,
      code: "scope_denied",
      message: "Profile is not active or not allowed.",
    };
  }

  const role = normalizeRole(profile.role);
  if (role === "parent" || role === "student") {
    return {
      ok: false,
      status: 403,
      code: "scope_denied",
      message: "Parent and student roles cannot generate homework AI drafts.",
    };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("homework_submissions")
    .select("id,homework_task_id,student_id,class_id,branch_id")
    .eq("id", payload.homeworkSubmissionId)
    .maybeSingle();
  if (submissionError || !submission) {
    return {
      ok: false,
      status: 404,
      code: "submission_not_found",
      message: "Submission not found or not accessible.",
    };
  }

  if (submission.homework_task_id !== payload.homeworkTaskId) {
    return {
      ok: false,
      status: 400,
      code: "relationship_mismatch",
      message: "homeworkTaskId does not match submission relationship.",
    };
  }
  if (submission.student_id !== payload.studentId) {
    return {
      ok: false,
      status: 400,
      code: "relationship_mismatch",
      message: "studentId does not match submission relationship.",
    };
  }
  if (submission.class_id !== payload.classId) {
    return {
      ok: false,
      status: 400,
      code: "relationship_mismatch",
      message: "classId does not match submission relationship.",
    };
  }

  const { data: task, error: taskError } = await supabase
    .from("homework_tasks")
    .select("id,class_id,branch_id")
    .eq("id", payload.homeworkTaskId)
    .maybeSingle();
  if (taskError || !task) {
    return {
      ok: false,
      status: 404,
      code: "task_not_found",
      message: "Homework task not found or not accessible.",
    };
  }

  if (task.class_id !== submission.class_id || task.branch_id !== submission.branch_id) {
    return {
      ok: false,
      status: 400,
      code: "relationship_mismatch",
      message: "Task/submission class or branch alignment failed.",
    };
  }

  if (role === "teacher") {
    const { data: assignment, error: assignmentError } = await supabase
      .from("teacher_class_assignments")
      .select("class_id,teachers!inner(profile_id)")
      .eq("class_id", payload.classId)
      .eq("teachers.profile_id", userId)
      .maybeSingle();
    if (assignmentError || !assignment) {
      return {
        ok: false,
        status: 403,
        code: "scope_denied",
        message: "Teacher is not assigned to this class scope.",
      };
    }
  } else if (role === "branch_supervisor") {
    if (!profile.branch_id || profile.branch_id !== submission.branch_id) {
      return {
        ok: false,
        status: 403,
        code: "scope_denied",
        message: "Branch supervisor cannot access other branch scope.",
      };
    }
  } else if (role !== "hq_admin") {
    return {
      ok: false,
      status: 403,
      code: "scope_denied",
      message: "Role is not allowed for AI homework draft generation.",
    };
  }

  return {
    ok: true,
    requesterRole: role,
    requesterProfileId: userId,
  };
}

Deno.serve((req: Request) =>
  handleGenerateHomeworkFeedbackDraftRequestWithResolver(req, {
    resolveAuthScope,
  }),
);

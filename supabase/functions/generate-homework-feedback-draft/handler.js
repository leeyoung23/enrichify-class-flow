function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
}

function normalizeRole(role) {
  const safe = sanitizeText(role).toLowerCase().replace(/\s+/g, "_");
  if (safe === "admin" || safe === "hq" || safe === "hqadmin") return "hq_admin";
  if (safe === "branchsupervisor") return "branch_supervisor";
  return safe;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function errorBody(code, message) {
  return {
    data: null,
    error: { code, message },
  };
}

function getBearerToken(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function buildRequestPayload(body = {}) {
  return {
    homeworkSubmissionId: sanitizeText(body?.homeworkSubmissionId),
    homeworkTaskId: sanitizeText(body?.homeworkTaskId),
    studentId: sanitizeText(body?.studentId),
    classId: sanitizeText(body?.classId),
    teacherObservation: sanitizeText(body?.teacherObservation),
    mode: sanitizeText(body?.mode, "stub"),
    tone: sanitizeText(body?.tone, "supportive"),
    length: sanitizeText(body?.length, "short"),
  };
}

function validateRequestPayload(payload) {
  if (!payload.homeworkSubmissionId || !payload.homeworkTaskId || !payload.studentId || !payload.classId) {
    return "homeworkSubmissionId, homeworkTaskId, studentId, and classId are required.";
  }
  return "";
}

function defaultAuthScopeResolver() {
  return {
    ok: false,
    status: 401,
    code: "invalid_auth",
    message: "JWT verification is required but no auth resolver is configured.",
  };
}

function buildMockHomeworkDraft({
  homeworkSubmissionId,
  homeworkTaskId,
  studentId,
  classId,
  teacherObservation,
  mode,
  tone,
  length,
}) {
  const safeMode = sanitizeText(mode, "stub");
  const safeTone = sanitizeText(tone, "supportive");
  const safeLength = sanitizeText(length, "short");
  const safeObservation = sanitizeText(
    teacherObservation,
    "Teacher observation not provided; draft uses metadata-only placeholder context.",
  );

  return {
    markingSummary:
      "Mock homework marking summary (metadata-based). Teacher review is required before any parent release.",
    feedbackText: [
      "Teacher draft (AI-assisted mock):",
      `Submission ${homeworkSubmissionId} for task ${homeworkTaskId} is prepared as a draft-only response.`,
      `Observation: ${safeObservation}`,
      "This output is a stub response and must be edited by staff before save/release actions.",
    ].join(" "),
    nextStep: "Next step: teacher to verify evidence quality and refine feedback wording before saving draft.",
    learningGaps:
      "Potential learning gaps (non-diagnostic): review foundational understanding with targeted class follow-up.",
    teacherNotes: [
      "Mock/stub mode only.",
      `studentId=${studentId}`,
      `classId=${classId}`,
      "No file content parsing and no real AI provider call were performed.",
    ].join(" "),
    safetyNotes: "Draft only. Teacher approval is required. No auto-save. No auto-release to parents.",
    modelInfo: {
      provider: "mock_stub",
      model: "none",
      mode: safeMode,
      tone: safeTone,
      length: safeLength,
      externalCall: false,
      teacherApprovalRequired: true,
    },
  };
}

export async function handleGenerateHomeworkFeedbackDraftRequest(req) {
  return handleGenerateHomeworkFeedbackDraftRequestWithResolver(req, {});
}

export async function handleGenerateHomeworkFeedbackDraftRequestWithResolver(
  req,
  { resolveAuthScope = defaultAuthScopeResolver } = {},
) {
  try {
    if (req.method !== "POST") {
      return jsonResponse(errorBody("method_not_allowed", "Method not allowed. Use POST."), 405);
    }

    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
      return jsonResponse(errorBody("missing_auth", "Authorization Bearer token is required."), 401);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(errorBody("invalid_json", "Invalid JSON body."), 400);
    }

    const payload = buildRequestPayload(body);
    const requiredValidationMessage = validateRequestPayload(payload);
    if (requiredValidationMessage) {
      return jsonResponse(errorBody("invalid_request", requiredValidationMessage), 400);
    }

    const authScope = await resolveAuthScope({
      bearerToken,
      payload,
      normalizeRole,
    });
    if (!authScope?.ok) {
      const status = Number(authScope?.status) || 403;
      const code = sanitizeText(authScope?.code, "scope_denied");
      const message = sanitizeText(authScope?.message, "Role/scope denied for this request.");
      return jsonResponse(errorBody(code, message), status);
    }

    const resolvedRole = normalizeRole(authScope?.requesterRole);
    if (resolvedRole === "parent" || resolvedRole === "student") {
      return jsonResponse(
        errorBody("scope_denied", "Only authorised staff can generate homework AI drafts."),
        403,
      );
    }

    const draft = buildMockHomeworkDraft({
      homeworkSubmissionId: payload.homeworkSubmissionId,
      homeworkTaskId: payload.homeworkTaskId,
      studentId: payload.studentId,
      classId: payload.classId,
      teacherObservation: payload.teacherObservation,
      mode: payload.mode,
      tone: payload.tone,
      length: payload.length,
    });

    return jsonResponse({
      data: draft,
      error: null,
    });
  } catch {
    return jsonResponse(errorBody("internal_error", "Unexpected error while generating mock homework feedback draft."), 500);
  }
}

function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
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

function getBearerToken(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
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
  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          data: null,
          error: {
            code: "method_not_allowed",
            message: "Method not allowed. Use POST.",
          },
        },
        405,
      );
    }

    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
      return jsonResponse(
        {
          data: null,
          error: {
            code: "missing_auth",
            message: "Authorization Bearer token is required.",
          },
        },
        401,
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          data: null,
          error: {
            code: "invalid_json",
            message: "Invalid JSON body.",
          },
        },
        400,
      );
    }

    const homeworkSubmissionId = sanitizeText(body?.homeworkSubmissionId);
    const homeworkTaskId = sanitizeText(body?.homeworkTaskId);
    const studentId = sanitizeText(body?.studentId);
    const classId = sanitizeText(body?.classId);
    const teacherObservation = sanitizeText(body?.teacherObservation);
    const mode = sanitizeText(body?.mode, "stub");
    const tone = sanitizeText(body?.tone, "supportive");
    const length = sanitizeText(body?.length, "short");

    if (!homeworkSubmissionId || !homeworkTaskId || !studentId || !classId) {
      return jsonResponse(
        {
          data: null,
          error: {
            code: "invalid_request",
            message: "homeworkSubmissionId, homeworkTaskId, studentId, and classId are required.",
          },
        },
        400,
      );
    }

    const draft = buildMockHomeworkDraft({
      homeworkSubmissionId,
      homeworkTaskId,
      studentId,
      classId,
      teacherObservation,
      mode,
      tone,
      length,
    });

    return jsonResponse({
      data: draft,
      error: null,
    });
  } catch {
    return jsonResponse(
      {
        data: null,
        error: {
          code: "internal_error",
          message: "Unexpected error while generating mock homework feedback draft.",
        },
      },
      500,
    );
  }
}

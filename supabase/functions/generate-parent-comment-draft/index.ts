// @ts-nocheck
/* eslint-disable no-undef */

type GenerateParentCommentDraftRequest = {
  student_id?: string;
  class_id?: string;
  teacher_note?: string;
  tone?: string;
  language?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
        expected_method: "POST",
        is_mock: true,
      },
      405,
    );
  }

  // TODO(phase-3): Verify JWT from Authorization header.
  // TODO(phase-3): Load caller profile and role from Supabase.
  // TODO(phase-3): Validate teacher/branch/HQ scope against student_id + class_id.
  // TODO(phase-3): Fetch authorised context only (student/class/school/curriculum/attendance/homework/previous comments).
  // TODO(phase-5): Call external AI provider server-side only (never from frontend).
  // TODO(phase-5): Persist ai_generation_requests / ai_generation_outputs rows under RLS-safe server flow.
  // NOTE: This scaffold intentionally does not include any real AI key, service role key, or external API calls.

  let body: GenerateParentCommentDraftRequest;
  try {
    body = (await req.json()) as GenerateParentCommentDraftRequest;
  } catch {
    return jsonResponse(
      {
        error: "Invalid JSON body",
        is_mock: true,
      },
      400,
    );
  }

  const studentId = body.student_id?.trim();
  const classId = body.class_id?.trim();
  const teacherNote = body.teacher_note?.trim();
  const tone = body.tone?.trim() || "supportive";
  const language = body.language?.trim() || "en";

  if (!studentId || !classId || !teacherNote) {
    return jsonResponse(
      {
        error: "student_id, class_id, and teacher_note are required",
        is_mock: true,
      },
      400,
    );
  }

  const draftComment = [
    "Hello Parent/Guardian,",
    "",
    `This is a mock ${tone} (${language}) parent comment draft for student ${studentId} in class ${classId}.`,
    `Teacher note summary: ${teacherNote}`,
    "",
    "This draft is for teacher/staff review only and is not automatically sent.",
  ].join("\n");

  return jsonResponse({
    draft_comment: draftComment,
    suggested_strength_tags: ["participation", "consistency"],
    suggested_improvement_tags: ["independent_response", "practice_routine"],
    source_summary: {
      mode: "mock",
      context_used: [
        "request.student_id",
        "request.class_id",
        "request.teacher_note",
      ],
      message: "No external AI/provider call was made in this scaffold.",
    },
    is_mock: true,
  });
});

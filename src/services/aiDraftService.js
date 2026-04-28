import { getSelectedDemoRole } from "./authService.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function buildMockDraft({ studentId, classId, teacherNote, tone, language, source }) {
  const safeTone = tone?.trim() || "supportive";
  const safeLanguage = language?.trim() || "en";
  const safeNote = teacherNote?.trim() || "Class progress note placeholder.";

  return {
    draft_comment: [
      "Hello Parent/Guardian,",
      "",
      `This is a mock ${safeTone} (${safeLanguage}) draft for student ${studentId || "unknown-student"} in class ${classId || "unknown-class"}.`,
      `Teacher note summary: ${safeNote}`,
      "",
      "This draft is for teacher review only and is not automatically sent.",
    ].join("\n"),
    suggested_strength_tags: ["participation", "consistency"],
    suggested_improvement_tags: ["independent_response", "practice_routine"],
    source_summary: {
      source,
      message: "Mock AI draft response (no external AI provider call).",
    },
    is_mock: true,
  };
}

export async function generateParentCommentDraft({ studentId, classId, teacherNote, tone, language } = {}) {
  if (typeof teacherNote !== "string" || !teacherNote.trim()) {
    return {
      data: null,
      error: { message: "teacherNote is required" },
    };
  }

  const demoRoleActive = Boolean(getSelectedDemoRole());
  if (demoRoleActive) {
    return {
      data: buildMockDraft({ studentId, classId, teacherNote, tone, language, source: "demo_role_fallback" }),
      error: null,
    };
  }

  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: buildMockDraft({ studentId, classId, teacherNote, tone, language, source: "supabase_not_configured_fallback" }),
      error: null,
    };
  }

  try {
    // Anon client + active user session only. No service role key usage.
    const { data, error } = await supabase.functions.invoke("generate-parent-comment-draft", {
      body: {
        student_id: studentId,
        class_id: classId,
        teacher_note: teacherNote,
        tone,
        language,
      },
    });

    if (error) {
      return {
        data: buildMockDraft({ studentId, classId, teacherNote, tone, language, source: "edge_function_error_fallback" }),
        error: { message: error.message || "Edge Function unavailable; returned fallback mock draft." },
      };
    }

    return {
      data: {
        draft_comment: data?.draft_comment ?? "",
        suggested_strength_tags: Array.isArray(data?.suggested_strength_tags) ? data.suggested_strength_tags : [],
        suggested_improvement_tags: Array.isArray(data?.suggested_improvement_tags) ? data.suggested_improvement_tags : [],
        source_summary: data?.source_summary ?? { source: "edge_function", message: "No source summary provided." },
        is_mock: Boolean(data?.is_mock),
      },
      error: null,
    };
  } catch (err) {
    return {
      data: buildMockDraft({ studentId, classId, teacherNote, tone, language, source: "edge_function_exception_fallback" }),
      error: { message: err?.message || "Failed to invoke Edge Function; returned fallback mock draft." },
    };
  }
}

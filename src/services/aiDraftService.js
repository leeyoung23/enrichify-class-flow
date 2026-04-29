import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import {
  getClassLearningContext,
  getStudentLearningContext,
  listCurriculumProfiles,
} from "./supabaseReadService.js";

function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
}

function getSelectedDemoRoleSafe() {
  if (typeof window === "undefined" || !window.location?.search) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const value = sanitizeText(params.get("demoRole"));
    return value || null;
  } catch {
    return null;
  }
}

function normalizeLength(length) {
  const safe = sanitizeText(length, "short").toLowerCase();
  if (safe === "medium" || safe === "long") return safe;
  return "short";
}

function stripUuidLike(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[internal-id]").trim();
}

function toSentence(value, fallback = "") {
  const text = stripUuidLike(sanitizeText(value, fallback));
  if (!text) return "";
  return text.endsWith(".") ? text : `${text}.`;
}

function buildGoalSummary(goals = [], limit = 2) {
  const activeGoals = (Array.isArray(goals) ? goals : [])
    .filter((goal) => sanitizeText(goal?.status).toLowerCase() === "active")
    .map((goal) => sanitizeText(goal?.goal_title || goal?.goal_description))
    .filter(Boolean)
    .slice(0, limit);
  return activeGoals;
}

function sanitizeHomeworkDate(value) {
  const safe = sanitizeText(value);
  if (!safe) return "";
  const date = new Date(`${safe}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-AU");
}

function sanitizeHomeworkFileSummary(uploadedFileSummary = []) {
  const files = Array.isArray(uploadedFileSummary) ? uploadedFileSummary : [];
  return files
    .slice(0, 3)
    .map((file) => {
      const name = stripUuidLike(sanitizeText(file?.file_name || file?.name, "uploaded file"));
      const contentType = sanitizeText(file?.content_type || file?.contentType, "unknown type");
      const sizeRaw = Number(file?.file_size_bytes ?? file?.fileSizeBytes ?? file?.size ?? 0);
      const sizeLabel = Number.isFinite(sizeRaw) && sizeRaw > 0 ? `${Math.round(sizeRaw / 1024)}KB` : "size not provided";
      return { name, contentType, sizeLabel };
    });
}

function sanitizeSchoolProfileSummary(studentLearningContext = {}) {
  const profile = studentLearningContext?.student_school_profile || {};
  const schoolName = sanitizeText(profile?.school_name);
  const gradeYear = sanitizeText(profile?.grade_year);
  return [schoolName, gradeYear].filter(Boolean).join(", ");
}

export function buildHomeworkFeedbackDraftContext({
  homeworkTask,
  homeworkSubmission,
  studentLearningContext,
  classLearningContext,
  teacherObservation,
  uploadedFileSummary,
  mode,
  tone,
  length,
} = {}) {
  const classAssignment = Array.isArray(classLearningContext?.class_curriculum_assignments)
    ? classLearningContext.class_curriculum_assignments[0]
    : null;
  const studentGoals = buildGoalSummary(studentLearningContext?.learning_goals || [], 3);
  const fileSummary = sanitizeHomeworkFileSummary(uploadedFileSummary);
  const safeObservation = sanitizeText(teacherObservation || homeworkSubmission?.submission_note);
  const dueDateLabel = sanitizeHomeworkDate(homeworkTask?.due_date);
  return {
    taskTitle: stripUuidLike(sanitizeText(homeworkTask?.title, "Homework task")),
    taskInstructions: stripUuidLike(sanitizeText(homeworkTask?.instructions)),
    taskSubject: stripUuidLike(sanitizeText(homeworkTask?.subject)),
    dueDateLabel,
    submissionNote: stripUuidLike(sanitizeText(homeworkSubmission?.submission_note)),
    uploadedFileSummary: fileSummary,
    curriculumProfileName: stripUuidLike(sanitizeText(studentLearningContext?.curriculum_profile?.name)),
    skillFocus: stripUuidLike(sanitizeText(studentLearningContext?.curriculum_profile?.skill_focus)),
    classLearningFocus: stripUuidLike(sanitizeText(classAssignment?.learning_focus)),
    activeLearningGoals: studentGoals,
    studentSchoolProfileSummary: stripUuidLike(sanitizeSchoolProfileSummary(studentLearningContext)),
    teacherObservation: stripUuidLike(safeObservation),
    tone: sanitizeText(tone, "supportive"),
    length: normalizeLength(length),
    mode: sanitizeText(mode, "mock"),
    evidenceLimitNote:
      "Draft is based on task metadata, submission note, uploaded file metadata, curriculum context, and teacher observation. No file content was read.",
  };
}

export function generateMockHomeworkFeedbackDraft(context = {}) {
  const safeTask = toSentence(context.taskTitle, "Homework task.");
  const safeSubject = sanitizeText(context.taskSubject);
  const safeObservation = toSentence(context.teacherObservation, "Teacher observation is limited.");
  const safeLearningFocus = toSentence(
    context.classLearningFocus || context.skillFocus,
    "Class learning focus is being reviewed."
  );
  const goals = Array.isArray(context.activeLearningGoals) ? context.activeLearningGoals : [];
  const goalsLine = goals.length
    ? toSentence(`Current learning goals include ${goals.map((goal) => goal.toLowerCase()).join(" and ")}`)
    : "Learning goals will be refined after additional teacher review.";
  const fileSummary = Array.isArray(context.uploadedFileSummary) ? context.uploadedFileSummary : [];
  const fileLine = fileSummary.length
    ? `Uploaded evidence includes ${fileSummary.map((file) => `${file.name} (${file.contentType}, ${file.sizeLabel})`).join("; ")}.`
    : "No uploaded file metadata is currently available.";
  const dueDateLine = context.dueDateLabel ? `Task due date: ${context.dueDateLabel}.` : "";
  const schoolProfileLine = context.studentSchoolProfileSummary
    ? `School context: ${context.studentSchoolProfileSummary}.`
    : "";
  const sourceReminder = sanitizeText(
    context.evidenceLimitNote,
    "Draft is metadata-based and does not include direct file content analysis."
  );

  const markingSummary = stripUuidLike(
    `${safeTask} ${safeSubject ? `Subject focus: ${safeSubject}.` : ""} ${safeLearningFocus}`.replace(/\s+/g, " ").trim()
  );
  const feedbackText = stripUuidLike(
    [
      "Teacher draft (AI-assisted):",
      "This feedback is prepared as a supportive draft and should be reviewed before release.",
      safeObservation,
      "Current work shows progress opportunities aligned to class focus.",
      "Please update wording as needed before sharing with family.",
    ].join(" ")
  );
  const nextStep = stripUuidLike(
    `Next step: continue targeted practice on the class focus with short guided exercises and teacher check-in.`
  );
  const learningGaps = stripUuidLike(
    `Potential learning gaps (non-diagnostic): reinforce core concepts linked to the current task and verify understanding with follow-up teacher checks.`
  );
  const teacherNotes = stripUuidLike(
    [sourceReminder, fileLine, dueDateLine, schoolProfileLine, goalsLine].filter(Boolean).join(" ")
  );

  return {
    markingSummary,
    feedbackText,
    nextStep,
    learningGaps,
    teacherNotes,
    safetyNotes: "Draft only. Teacher approval is required. No auto-release to parents.",
    modelInfo: {
      provider: "mock",
      mode: sanitizeText(context.mode, "mock"),
      tone: sanitizeText(context.tone, "supportive"),
      length: normalizeLength(context.length),
      externalCall: false,
    },
  };
}

function buildMockDraftFromContext({ context, source, fallbackUsed = false }) {
  const safeTone = sanitizeText(context?.tone, "supportive");
  const safeLanguage = sanitizeText(context?.language, "en");
  const safeLength = normalizeLength(context?.length);
  const studentLabel = sanitizeText(context?.studentDisplayLabel, "your child");
  const className = sanitizeText(context?.className);
  const subject = sanitizeText(context?.subject);
  const schoolName = sanitizeText(context?.schoolName);
  const gradeYear = sanitizeText(context?.gradeYear);
  const curriculumProfileName = sanitizeText(context?.curriculumProfileName);
  const skillFocus = sanitizeText(context?.skillFocus);
  const classLearningFocus = sanitizeText(context?.classLearningFocus);
  const goals = Array.isArray(context?.activeLearningGoals) ? context.activeLearningGoals : [];
  const observation = sanitizeText(context?.observation, "We are continuing steady classroom learning routines.");
  const hasCurriculumContext = Boolean(curriculumProfileName || skillFocus || classLearningFocus || goals.length);

  const focusLine = toSentence(
    classLearningFocus
      ? `${studentLabel} is currently focusing on ${classLearningFocus.toLowerCase()}`
      : skillFocus
        ? `Current learning focus includes ${skillFocus.toLowerCase()}`
        : ""
  );
  const goalsLine = goals.length
    ? toSentence(`Current goals include ${goals.map((goal) => goal.toLowerCase()).join(" and ")}`)
    : "";
  const contextPreview = toSentence([className, subject, schoolName, gradeYear].filter(Boolean).join(" · "));

  const draftComment = [
    "Hello Parent/Guardian,",
    "",
    toSentence(`Here is a ${safeTone} ${safeLength} update for ${studentLabel}`, `Here is a ${safeTone} update for your child.`),
    focusLine,
    toSentence(observation),
    goalsLine,
    hasCurriculumContext ? toSentence("This comment is grounded in current curriculum and learning goals") : "",
    toSentence("Please review and adjust this draft before sharing with families"),
    "",
    `Draft language: ${safeLanguage}.`,
  ].filter(Boolean).join("\n");

  return {
    draft_comment: draftComment,
    suggested_strength_tags: hasCurriculumContext ? ["curriculum_alignment", "learning_focus"] : ["participation", "consistency"],
    suggested_improvement_tags: goals.length ? ["goal_progress", "home_practice_support"] : ["independent_response", "practice_routine"],
    source_summary: {
      source,
      mode: "mock_context_aware",
      fallback_used: Boolean(fallbackUsed),
      has_curriculum_context: hasCurriculumContext,
      message: "Curriculum-aware mock draft response (no external AI provider call).",
      context_preview: contextPreview || "General supportive context",
      curriculum_profile: curriculumProfileName || null,
    },
    is_mock: true,
  };
}

async function resolveStudentAndClassFields({ studentId, classId, fetchers }) {
  const safeStudentId = sanitizeText(studentId);
  const safeClassId = sanitizeText(classId);
  let studentDisplayLabel = "";
  let className = "";
  let subject = "";

  if (safeStudentId && fetchers.getStudentRow) {
    const studentRow = await fetchers.getStudentRow(safeStudentId);
    studentDisplayLabel = sanitizeText(studentRow?.full_name || studentRow?.name);
  }

  if (safeClassId && fetchers.getClassRow) {
    const classRow = await fetchers.getClassRow(safeClassId);
    className = sanitizeText(classRow?.name);
    subject = sanitizeText(classRow?.subject);
  }

  return { studentDisplayLabel, className, subject };
}

export async function buildParentCommentDraftContext(
  { studentId, classId, observation, teacherNote, tone, length, language } = {},
  overrides = {}
) {
  const fetchers = {
    getStudentLearningContext: overrides.getStudentLearningContext || getStudentLearningContext,
    getClassLearningContext: overrides.getClassLearningContext || getClassLearningContext,
    listCurriculumProfiles: overrides.listCurriculumProfiles || listCurriculumProfiles,
    getStudentRow: overrides.getStudentRow || (async (id) => {
      if (!isSupabaseConfigured() || !supabase) return null;
      const { data } = await supabase.from("students").select("full_name").eq("id", id).maybeSingle();
      return data ?? null;
    }),
    getClassRow: overrides.getClassRow || (async (id) => {
      if (!isSupabaseConfigured() || !supabase) return null;
      const { data } = await supabase.from("classes").select("name,subject").eq("id", id).maybeSingle();
      return data ?? null;
    }),
  };

  const safeStudentId = sanitizeText(studentId);
  const safeClassId = sanitizeText(classId);
  const safeObservation = sanitizeText(observation || teacherNote);

  const [{ studentDisplayLabel, className, subject }, studentContextResult, classContextResult] = await Promise.all([
    resolveStudentAndClassFields({ studentId: safeStudentId, classId: safeClassId, fetchers }),
    safeStudentId ? fetchers.getStudentLearningContext({ studentId: safeStudentId }) : { data: null, error: null },
    safeClassId ? fetchers.getClassLearningContext({ classId: safeClassId }) : { data: null, error: null },
  ]);

  const studentProfile = studentContextResult?.data?.student_school_profile || null;
  const assignment = (
    classContextResult?.data?.class_curriculum_assignments
    || studentContextResult?.data?.class_curriculum_assignments
    || []
  )[0] || null;
  const curriculumProfileId = sanitizeText(assignment?.curriculum_profile_id || studentProfile?.curriculum_profile_id);
  let curriculumProfileName = "";
  let skillFocus = "";

  if (curriculumProfileId) {
    const curriculumResult = await fetchers.listCurriculumProfiles({
      subject: subject || undefined,
    });
    const selectedProfile = (curriculumResult?.data || []).find((profile) => profile?.id === curriculumProfileId);
    curriculumProfileName = sanitizeText(selectedProfile?.name);
    skillFocus = sanitizeText(selectedProfile?.skill_focus);
  }

  const activeLearningGoals = buildGoalSummary(
    studentContextResult?.data?.learning_goals || classContextResult?.data?.learning_goals || []
  );

  return {
    studentDisplayLabel: studentDisplayLabel || "your child",
    className,
    subject,
    schoolName: sanitizeText(studentProfile?.school_name),
    gradeYear: sanitizeText(studentProfile?.grade_year),
    curriculumProfileName,
    skillFocus,
    classLearningFocus: sanitizeText(assignment?.learning_focus),
    activeLearningGoals,
    observation: safeObservation || "Steady class participation and practice routines this week.",
    tone: sanitizeText(tone, "supportive"),
    length: normalizeLength(length),
    language: sanitizeText(language, "en"),
  };
}

function buildLegacyFallbackDraft({ teacherNote, tone, language }) {
  return buildMockDraftFromContext({
    source: "legacy_fallback",
    fallbackUsed: true,
    context: {
      studentDisplayLabel: "your child",
      observation: sanitizeText(teacherNote, "Class progress note placeholder."),
      tone: sanitizeText(tone, "supportive"),
      length: "short",
      language: sanitizeText(language, "en"),
    },
  });
}

export async function generateParentCommentDraft({ studentId, classId, teacherNote, observation, tone, language, length } = {}) {
  const noteText = sanitizeText(observation || teacherNote);
  if (!noteText) {
    return {
      data: null,
      error: { message: "teacherNote is required" },
    };
  }

  const demoRoleActive = Boolean(getSelectedDemoRoleSafe());
  if (demoRoleActive) {
    return {
      data: buildMockDraftFromContext({
        source: "demo_role_fallback",
        context: {
          studentDisplayLabel: "demo student",
          className: "demo class",
          subject: "general learning",
          observation: noteText,
          tone: sanitizeText(tone, "supportive"),
          length: normalizeLength(length),
          language: sanitizeText(language, "en"),
        },
      }),
      error: null,
    };
  }

  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: buildLegacyFallbackDraft({ teacherNote: noteText, tone, language }),
      error: null,
    };
  }

  try {
    const context = await buildParentCommentDraftContext({
      studentId,
      classId,
      observation: noteText,
      tone,
      length: length || "short",
      language,
    });
    return {
      data: buildMockDraftFromContext({ context, source: "local_curriculum_context_mock" }),
      error: null,
    };
  } catch (err) {
    return {
      data: buildLegacyFallbackDraft({ teacherNote: noteText, tone, language }),
      error: { message: err?.message || "Context assembly unavailable; returned fallback mock draft." },
    };
  }
}

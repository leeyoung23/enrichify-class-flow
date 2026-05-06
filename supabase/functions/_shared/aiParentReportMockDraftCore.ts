/**
 * Shared deterministic mock-draft section builders for AI parent reports.
 * Edge/Deno copy aligned with `src/services/aiParentReportMockDraftCore.js`.
 * No external HTTP; no provider keys.
 */

export const MOCK_AI_PARENT_REPORT_INSUFFICIENT_DATA_COPY =
  "More evidence is needed before making a detailed judgement in this area.";

export const MOCK_AI_PARENT_REPORT_BUCKET_KEYWORDS = [
  "announcements-attachments",
  "parent-announcements-media",
  "class-memories",
  "homework-submissions",
  "staff-clock-selfies",
];

export function containsUnsafeMockDraftValue(
  input: unknown,
  parentKey = ""
): boolean {
  if (input == null) return false;
  const key = String(parentKey || "").toLowerCase();
  if (
    key.includes("provider") ||
    key.includes("debug") ||
    key.includes("api_key") ||
    key.includes("token") ||
    key.includes("secret") ||
    key === "generation_source" ||
    key === "ai_model_label"
  ) {
    return true;
  }
  if (typeof input === "string") {
    const value = input.trim();
    if (!value) return false;
    const normalized = value.toLowerCase();
    if (/https?:\/\//i.test(value) || normalized.includes("file://")) return true;
    if (/([a-z]:\\|\/users\/|\/home\/|\/private\/|\\users\\|\\private\\)/i.test(value))
      return true;
    if (/\/storage\/v1\/object\//i.test(value) || normalized.includes("supabase.co/storage"))
      return true;
    if (MOCK_AI_PARENT_REPORT_BUCKET_KEYWORDS.some((keyword) => normalized.includes(keyword)))
      return true;
    if (normalized.includes("provider metadata") || normalized.includes("debug metadata"))
      return true;
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((item) => containsUnsafeMockDraftValue(item, parentKey));
  }
  if (typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).some(([childKey, childValue]) =>
      containsUnsafeMockDraftValue(childValue, childKey)
    );
  }
  return false;
}

export function normalizeMockAiInputText(
  value: unknown,
  { maxLength = 1000 }: { maxLength?: number } = {}
): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

export function withMockFallback(value: unknown): string {
  const normalized = normalizeMockAiInputText(value);
  return normalized || MOCK_AI_PARENT_REPORT_INSUFFICIENT_DATA_COPY;
}

type MockInput = Record<string, unknown>;

export function buildMockAiParentReportStructuredSections(input: MockInput = {}): Record<
  string,
  string
> {
  const studentSummary = normalizeMockAiInputText(input.studentSummary);
  const attendanceSummary = normalizeMockAiInputText(input.attendanceSummary);
  const lessonProgression = normalizeMockAiInputText(input.lessonProgression);
  const homeworkCompletion = normalizeMockAiInputText(input.homeworkCompletion);
  const homeworkPerformance = normalizeMockAiInputText(input.homeworkPerformance);
  const strengths = normalizeMockAiInputText(input.strengths);
  const improvementAreas = normalizeMockAiInputText(input.improvementAreas);
  const learningGaps = normalizeMockAiInputText(input.learningGaps);
  const teacherObservations = normalizeMockAiInputText(input.teacherObservations);
  const nextRecommendations = normalizeMockAiInputText(input.nextRecommendations);
  const parentSupportSuggestions = normalizeMockAiInputText(input.parentSupportSuggestions);
  const teacherFinalComment = normalizeMockAiInputText(input.teacherFinalComment);

  const summaryParts = [studentSummary, teacherObservations].filter(Boolean);
  const summaryText =
    summaryParts.length > 0
      ? `Draft summary from selected evidence: ${summaryParts.join(" ")}`
      : MOCK_AI_PARENT_REPORT_INSUFFICIENT_DATA_COPY;

  return {
    summary: summaryText,
    attendance_punctuality: withMockFallback(
      attendanceSummary ? `Attendance and punctuality snapshot: ${attendanceSummary}` : ""
    ),
    lesson_progression: withMockFallback(
      lessonProgression ? `Lesson progression snapshot: ${lessonProgression}` : ""
    ),
    homework_completion: withMockFallback(
      homeworkCompletion ? `Homework completion snapshot: ${homeworkCompletion}` : ""
    ),
    homework_assessment_performance: withMockFallback(
      homeworkPerformance ? `Homework/assessment performance snapshot: ${homeworkPerformance}` : ""
    ),
    strengths: withMockFallback(strengths ? `Observed strengths: ${strengths}` : ""),
    areas_for_improvement: withMockFallback(
      improvementAreas ? `Areas for improvement from selected evidence: ${improvementAreas}` : ""
    ),
    learning_gaps: withMockFallback(
      learningGaps ? `Learning gap indicators requiring teacher validation: ${learningGaps}` : ""
    ),
    next_recommendations: withMockFallback(
      nextRecommendations ? `Suggested next recommendations: ${nextRecommendations}` : ""
    ),
    parent_support_suggestions: withMockFallback(
      parentSupportSuggestions
        ? `Parent support suggestions from selected evidence: ${parentSupportSuggestions}`
        : ""
    ),
    teacher_final_comment: withMockFallback(
      teacherFinalComment ? `Teacher final comment draft: ${teacherFinalComment}` : ""
    ),
  };
}

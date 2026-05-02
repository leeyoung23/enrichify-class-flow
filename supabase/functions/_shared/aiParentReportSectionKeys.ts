/** Stable structured output keys for AI parent reports (fake + real). */

export const REQUIRED_STRUCTURED_SECTION_KEYS = [
  "summary",
  "attendance_punctuality",
  "lesson_progression",
  "homework_completion",
  "homework_assessment_performance",
  "strengths",
  "areas_for_improvement",
  "learning_gaps",
  "next_recommendations",
  "parent_support_suggestions",
  "teacher_final_comment",
] as const;

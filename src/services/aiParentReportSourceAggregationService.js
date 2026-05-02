/**
 * Fake/dev-safe AI parent report source aggregation.
 * No Supabase reads, no persistence, no provider calls — proves pipeline shape only.
 * Future: RLS-bound reads can replace fake summaries when mode !== 'fake'.
 */

export const SOURCE_AGGREGATION_MODES = {
  FAKE: "fake",
};

/** Evidence item classification for policy and smoke tests. */
export const EVIDENCE_CLASSIFICATION = {
  SAFE_FOR_AI_SUMMARY: "safe_for_ai_summary",
  STAFF_ONLY_REQUIRES_SELECTION: "staff_only_requires_selection",
  SENSITIVE_REQUIRES_CONFIRMATION: "sensitive_requires_confirmation",
  NEVER_SEND_TO_PROVIDER: "never_send_to_provider",
};

function trimIso(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * Deterministic numeric digest from inputs (not cryptographic) — varies labels slightly per fake IDs.
 */
function fakeDigest(parts) {
  const s = parts.filter(Boolean).join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function buildFakeEvidenceItems({ periodStart, periodEnd, digest }) {
  const periodNote =
    trimIso(periodStart) && trimIso(periodEnd)
      ? `Synthetic period window ${trimIso(periodStart)}–${trimIso(periodEnd)}.`
      : "Synthetic period window (placeholder dates).";

  return [
    {
      sourceType: "attendance_summary",
      label: "Attendance (fake aggregate)",
      summary: `Demo attendance roll-up ${digest % 100}: present pattern stable; punctuality typical for class cohort. ${periodNote}`,
      confidence: "medium",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: true,
      classification: EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY,
    },
    {
      sourceType: "homework_completion_summary",
      label: "Homework completion (fake)",
      summary: `Demo homework completion snapshot ${digest % 97}: assignments viewed; submission mix simulated for pipeline test only.`,
      confidence: "medium",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: true,
      classification: EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY,
    },
    {
      sourceType: "worksheet_upload_placeholder",
      label: "Worksheet / upload evidence",
      summary:
        "Worksheet scan pipeline not connected — placeholder only. No file analysis in this milestone.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "lesson_progression_summary",
      label: "Lesson progression (fake curriculum tie-in)",
      summary: `Demo lesson focus ${digest % 89}: synthetic unit themes for narrative scaffolding only.`,
      confidence: "medium",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: true,
      classification: EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY,
    },
    {
      sourceType: "observation_placeholder",
      label: "Structured observations",
      summary:
        "Observations module not yet feeding aggregates — placeholder row only. Future: teacher-approved notes with sensitivity flags.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.SENSITIVE_REQUIRES_CONFIRMATION,
    },
    {
      sourceType: "parent_communication_summary",
      label: "Parent Communication (simulated)",
      summary: `Demo quick-comment threads ${digest % 83}: synthetic tone check; not live parent communications.`,
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "memories_media_placeholder",
      label: "Class memories / media",
      summary:
        "Approved memories could summarise warm moments — not wired in fake mode. No media paths included.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "curriculum_context",
      label: "School / curriculum context (fake)",
      summary: `Demo curriculum framing ${digest % 79}: generic programme wording only; no licensed third-party content.`,
      confidence: "medium",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: true,
      classification: EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY,
    },
    {
      sourceType: "internal_pipeline_marker",
      label: "Raw row bucket (must never leave staff)",
      summary: "Marker only: synthetic internal keys would be stripped before any provider. Not for parents.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.NEVER_SEND_TO_PROVIDER,
    },
  ];
}

/**
 * @param {object} params
 * @param {string} [params.studentId]
 * @param {string} [params.classId]
 * @param {string} [params.branchId]
 * @param {string} [params.periodStart]
 * @param {string} [params.periodEnd]
 * @param {string} [params.mode='fake']
 * @returns {Promise<object>}
 */
export async function collectAiParentReportSourceEvidence(params = {}) {
  const {
    studentId = "",
    classId = "",
    branchId = "",
    periodStart = "",
    periodEnd = "",
    mode = SOURCE_AGGREGATION_MODES.FAKE,
  } = params;

  if (mode !== SOURCE_AGGREGATION_MODES.FAKE) {
    throw new Error(
      `collectAiParentReportSourceEvidence: only mode "${SOURCE_AGGREGATION_MODES.FAKE}" is implemented`
    );
  }

  const digest = fakeDigest([studentId, classId, branchId, periodStart, periodEnd]);

  const warnings = [
    "Fake aggregation only — no Supabase reads performed.",
    "Parent Communication and memories use simulated wording only.",
  ];

  const missingEvidence = [
    "worksheet_scan_and_validation_pipeline_not_connected",
    "structured_observations_feed_not_connected",
    "live_memories_aggregate_not_connected",
  ];

  const evidenceItems = buildFakeEvidenceItems({ periodStart, periodEnd, digest });

  const pick = (sourceType) =>
    evidenceItems.find((item) => item.sourceType === sourceType)?.summary || "";

  return {
    attendanceSummary: pick("attendance_summary"),
    homeworkSummary: pick("homework_completion_summary"),
    worksheetEvidenceSummary: pick("worksheet_upload_placeholder"),
    lessonProgressionSummary: pick("lesson_progression_summary"),
    observationSummary: pick("observation_placeholder"),
    parentCommunicationSummary: pick("parent_communication_summary"),
    memoriesEvidenceSummary: pick("memories_media_placeholder"),
    curriculumContext: pick("curriculum_context"),
    warnings,
    missingEvidence,
    evidenceItems,
  };
}

/**
 * Maps aggregation output into mock-draft input keys (safe strings only).
 * Suitable for {@link buildMockAiParentReportStructuredSections} / generateMockAiParentReportDraft after teacher review.
 *
 * @param {object} sourceEvidence — output shape from collectAiParentReportSourceEvidence
 * @returns {object} mock draft input object
 */
export function buildMockDraftInputFromSourceEvidence(sourceEvidence) {
  if (sourceEvidence == null || typeof sourceEvidence !== "object" || Array.isArray(sourceEvidence)) {
    return {};
  }

  const safe = (v) => (typeof v === "string" ? v : "");

  const ev = Array.isArray(sourceEvidence.evidenceItems) ? sourceEvidence.evidenceItems : [];

  const safeItems = ev.filter(
    (item) =>
      item &&
      item.classification === EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY &&
      item.includedInDraftByDefault
  );

  const evidenceSummaries = safeItems
    .map((item) => `${item.label}: ${item.summary}`)
    .join("; ");

  const studentBits = [safe(sourceEvidence.curriculumContext), safe(sourceEvidence.attendanceSummary)]
    .filter(Boolean)
    .join(" ");

  return {
    studentSummary: studentBits || undefined,
    attendanceSummary: safe(sourceEvidence.attendanceSummary) || undefined,
    lessonProgression: safe(sourceEvidence.lessonProgressionSummary) || undefined,
    homeworkCompletion: safe(sourceEvidence.homeworkSummary) || undefined,
    homeworkPerformance: safe(sourceEvidence.homeworkSummary)
      ? `Related completion context: ${safe(sourceEvidence.homeworkSummary).slice(0, 400)}`
      : undefined,
    strengths: safe(sourceEvidence.lessonProgressionSummary) || undefined,
    improvementAreas: safe(sourceEvidence.observationSummary) || undefined,
    learningGaps: undefined,
    teacherObservations: safe(sourceEvidence.observationSummary) || undefined,
    nextRecommendations: safe(sourceEvidence.curriculumContext) || undefined,
    parentSupportSuggestions: safe(sourceEvidence.parentCommunicationSummary) || undefined,
    teacherFinalComment: undefined,
    evidenceSummaries: evidenceSummaries || undefined,
  };
}

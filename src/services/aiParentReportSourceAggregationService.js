/**
 * AI parent report source aggregation — fake and RLS-bound modes.
 * No provider calls. RLS mode uses existing Supabase read patterns + supabaseReadService only.
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import {
  getClassLearningContext,
  getStudentLearningContext,
  listAiParentReportEvidenceLinks,
  listAssignedHomeworkForStudent,
  listClassCurriculumAssignments,
  listReleasedHomeworkFeedbackForAiEvidence,
  listStudentSchoolProfiles,
} from "./supabaseReadService.js";
import { listClassMemories } from "./supabaseUploadService.js";

export const SOURCE_AGGREGATION_MODES = {
  FAKE: "fake",
  RLS: "rls",
  HYBRID: "hybrid",
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

function isUuidLike(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

/** Strip patterns that must never appear in staff preview output (URLs, storage hints). */
export function sanitizeAggregationText(value, { maxLength = 1200 } = {}) {
  if (typeof value !== "string") return "";
  let s = value.trim().replace(/\s+/g, " ");
  if (/https?:\/\//i.test(s) || /\/storage\/v1\//i.test(s) || /supabase\.co\/storage/i.test(s)) {
    return "[redacted: URL or storage reference removed]";
  }
  return s.slice(0, maxLength);
}

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
      sourceType: "released_homework_feedback",
      label: "Released homework feedback",
      summary: `Demo teacher-released homework feedback ${digest % 91}: synthetic excerpt only — internal notes and drafts excluded.`,
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
      sourceType: "teacher_observations",
      label: "Teacher observations (demo staff evidence)",
      summary:
        "Demo: synthetic staff learning evidence. In RLS mode this row uses student school profile notes and scoped learning goals only — not the classroom-quality observations table.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "learning_context_snapshot",
      label: "Learning context snapshot (demo)",
      summary:
        "Demo standing background — latest-style profile cues labelled as not limited to the synthetic report window; real mode uses student_school_profiles + active goals outside the period when needed.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "parent_communication_summary",
      label: "Parent Communication (simulated)",
      summary: `Demo quick-comment threads ${digest % 83}: synthetic tone check; not live parent communications.`,
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.SENSITIVE_REQUIRES_CONFIRMATION,
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

function buildFakeAggregationOutput(params) {
  const {
    studentId = "",
    classId = "",
    branchId = "",
    periodStart = "",
    periodEnd = "",
  } = params;

  const digest = fakeDigest([studentId, classId, branchId, periodStart, periodEnd]);

  const warnings = [
    "Fake aggregation only — no Supabase reads performed.",
    "Parent Communication and memories use simulated wording only.",
  ];

  const missingEvidence = [
    "worksheet_scan_and_validation_pipeline_not_connected",
    "live_memories_aggregate_not_connected",
  ];

  const evidenceItems = buildFakeEvidenceItems({ periodStart, periodEnd, digest });

  const pick = (sourceType) =>
    evidenceItems.find((item) => item.sourceType === sourceType)?.summary || "";

  return {
    attendanceSummary: pick("attendance_summary"),
    homeworkSummary: pick("homework_completion_summary"),
    releasedHomeworkFeedbackSummary: pick("released_homework_feedback"),
    worksheetEvidenceSummary: pick("worksheet_upload_placeholder"),
    lessonProgressionSummary: pick("lesson_progression_summary"),
    observationSummary: pick("teacher_observations"),
    learningContextSnapshotSummary: pick("learning_context_snapshot"),
    parentCommunicationSummary: pick("parent_communication_summary"),
    memoriesEvidenceSummary: pick("memories_media_placeholder"),
    curriculumContext: pick("curriculum_context"),
    warnings,
    missingEvidence,
    evidenceItems,
  };
}

function summarizeAttendanceRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const counts = {};
  for (const row of rows) {
    const st = String(row?.status || "unknown").toLowerCase();
    counts[st] = (counts[st] || 0) + 1;
  }
  const parts = Object.entries(counts).map(([k, v]) => `${k}: ${v}`);
  return sanitizeAggregationText(
    `Period attendance rolls: ${rows.length} session(s). Breakdown: ${parts.join(", ")}.`
  );
}

function summarizeHomeworkAssignees(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const byStatus = {};
  const titles = [];
  for (const row of rows.slice(0, 25)) {
    const st = String(row?.assignment_status || "unknown");
    byStatus[st] = (byStatus[st] || 0) + 1;
    const t = row?.homework_task?.title;
    if (typeof t === "string" && t.trim() && titles.length < 5) titles.push(t.trim());
  }
  const statusPart = Object.entries(byStatus)
    .map(([k, v]) => `${k} ${v}`)
    .join("; ");
  const titlePart = titles.length ? ` Sample tasks: ${titles.join("; ")}.` : "";
  return sanitizeAggregationText(
    `Homework assignee snapshot: ${rows.length} row(s). Status mix: ${statusPart}.${titlePart}`
  );
}

/** Teacher-released feedback only (feedback_text / next_step). Never internal_note or file paths. */
function summarizeReleasedHomeworkFeedbackRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const lines = [];
  for (const row of rows.slice(0, 10)) {
    const title =
      typeof row?.task_title === "string" && row.task_title.trim()
        ? row.task_title.trim()
        : "Homework task";
    const due =
      row?.task_due_date != null && String(row.task_due_date).trim()
        ? ` (due ${String(row.task_due_date).trim().slice(0, 10)})`
        : "";
    const released =
      row?.released_to_parent_at != null && String(row.released_to_parent_at).trim()
        ? ` released ${String(row.released_to_parent_at).trim().slice(0, 10)}`
        : "";
    const fb =
      typeof row?.feedback_text === "string" && row.feedback_text.trim()
        ? sanitizeAggregationText(row.feedback_text.trim().slice(0, 220))
        : "";
    const ns =
      typeof row?.next_step === "string" && row.next_step.trim()
        ? sanitizeAggregationText(row.next_step.trim().slice(0, 160))
        : "";
    const body = [fb, ns ? `Next: ${ns}` : ""].filter(Boolean).join(" · ");
    if (!body) continue;
    lines.push(
      sanitizeAggregationText(`Released homework feedback: ${title}${due}${released} — ${body}`)
    );
  }
  if (lines.length === 0) return "";
  return sanitizeAggregationText(lines.join(" | "));
}

function summarizeParentCommunicationRows(comments, weeklies) {
  const bits = [];
  if (Array.isArray(comments)) {
    for (const row of comments.slice(0, 5)) {
      const t = typeof row?.comment_text === "string" ? row.comment_text.trim() : "";
      if (t) bits.push(sanitizeAggregationText(t.slice(0, 200)));
    }
  }
  if (Array.isArray(weeklies)) {
    for (const row of weeklies.slice(0, 3)) {
      const t = typeof row?.report_text === "string" ? row.report_text.trim() : "";
      if (t) bits.push(sanitizeAggregationText(t.slice(0, 200)));
    }
  }
  if (bits.length === 0) return "";
  return sanitizeAggregationText(`Recent communication snippets (staff review required): ${bits.join(" | ")}`);
}

function summarizeCurriculumContext(studentCtx, classCtx) {
  const focus = [];
  if (studentCtx?.data?.class_curriculum_assignments?.length) {
    const a = studentCtx.data.class_curriculum_assignments[0];
    if (a?.learning_focus) focus.push(String(a.learning_focus).slice(0, 200));
  }
  if (classCtx?.data?.class_curriculum_assignments?.length) {
    const a = classCtx.data.class_curriculum_assignments[0];
    if (a?.learning_focus) focus.push(String(a.learning_focus).slice(0, 200));
  }
  if (focus.length === 0) return "";
  return sanitizeAggregationText(`Curriculum focus hints: ${focus.join(" · ")}`);
}

function summarizeLessonProgression(studentCtx, classCtx) {
  const goals = [];
  const sg = studentCtx?.data?.learning_goals;
  const cg = classCtx?.data?.learning_goals;
  if (Array.isArray(sg)) {
    for (const g of sg.slice(0, 3)) {
      if (g?.goal_title) goals.push(String(g.goal_title).slice(0, 120));
    }
  }
  if (Array.isArray(cg)) {
    for (const g of cg.slice(0, 3)) {
      if (g?.goal_title) goals.push(String(g.goal_title).slice(0, 120));
    }
  }
  if (goals.length === 0) return "";
  return sanitizeAggregationText(`Learning goal headlines: ${goals.join("; ")}`);
}

function isoDatePart(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  return s.slice(0, 10);
}

function isDateInInclusiveRange(datePart, periodStart, periodEnd) {
  const d = typeof datePart === "string" ? datePart.trim() : "";
  const ps = trimIso(periodStart).slice(0, 10);
  const pe = trimIso(periodEnd).slice(0, 10);
  if (!ps && !pe) return true;
  if (!d) return true;
  if (ps && d < ps) return false;
  if (pe && d > pe) return false;
  return true;
}

function substringLikelyContained(haystack, needlePrefix) {
  if (!needlePrefix || needlePrefix.length < 14) return false;
  const h = String(haystack || "").toLowerCase();
  const n = String(needlePrefix || "")
    .toLowerCase()
    .slice(0, 72)
    .trim();
  return n.length >= 14 && h.includes(n);
}

/**
 * Report-period only: profile narrative rows whose `updated_at` falls in the selected window, plus learning goals whose
 * timestamps fall in the window. Does not query the MVP `observations` table.
 */
export function summarizeTeacherObservationEvidence(studentData = {}, opts = {}) {
  const periodStart = trimIso(opts.periodStart || "");
  const periodEnd = trimIso(opts.periodEnd || "");
  const classId = typeof opts.classId === "string" ? opts.classId.trim() : "";
  const hasPeriod = Boolean(periodStart || periodEnd);
  const profile = studentData?.student_school_profile;
  const goals = Array.isArray(studentData?.learning_goals) ? studentData.learning_goals : [];
  const lines = [];

  const profileDateOk = !hasPeriod || isDateInInclusiveRange(isoDatePart(profile?.updated_at), periodStart, periodEnd);

  function pushObservationLine(category, datePart, excerpt) {
    const ex = sanitizeAggregationText(String(excerpt || "").trim(), { maxLength: 220 });
    if (!ex) return;
    const d = datePart ? ` ${datePart}` : "";
    lines.push(sanitizeAggregationText(`Teacher observation:${d} (${category}) — ${ex}`, { maxLength: 360 }));
  }

  if (profile && profileDateOk) {
    const d = isoDatePart(profile.updated_at) || isoDatePart(profile.created_at) || "";
    if (profile.teacher_notes && String(profile.teacher_notes).trim()) {
      pushObservationLine("teacher notes", d, profile.teacher_notes);
    }
    if (profile.subject_notes && String(profile.subject_notes).trim()) {
      pushObservationLine("subject context", d, profile.subject_notes);
    }
    if (profile.learning_context_notes && String(profile.learning_context_notes).trim()) {
      pushObservationLine("learning context", d, profile.learning_context_notes);
    }
    if (profile.parent_goals && String(profile.parent_goals).trim()) {
      pushObservationLine("shared parent goals (staff context)", d, profile.parent_goals);
    }
  }

  for (const g of goals) {
    if (classId && g?.class_id && String(g.class_id).trim() !== classId) continue;
    const gDate = isoDatePart(g.updated_at) || isoDatePart(g.created_at);
    if (hasPeriod && !isDateInInclusiveRange(gDate, periodStart, periodEnd)) continue;
    const title = g?.goal_title ? String(g.goal_title).trim() : "";
    const desc = g?.goal_description ? String(g.goal_description).trim() : "";
    const status = g?.status ? String(g.status).trim() : "";
    let excerpt = title || "Learning goal";
    if (desc) excerpt = `${title || "Goal"} — ${desc}`;
    else if (status) excerpt = `${title || "Goal"} (${status})`;
    pushObservationLine("learning goal", gDate, excerpt);
    if (lines.length >= 14) break;
  }

  if (lines.length === 0) return "";
  return sanitizeAggregationText(lines.join(" | "));
}

/**
 * Standing background for drafting when report-period rows are sparse: latest profile notes / family context and
 * active goals (especially those outside the period). Omits text already represented in `inPeriodSummary` where
 * detectable. Staff-only; never implies snapshot lines occurred “this month”.
 */
export function summarizeLearningContextSnapshot(studentData = {}, opts = {}) {
  const periodStart = trimIso(opts.periodStart || "");
  const periodEnd = trimIso(opts.periodEnd || "");
  const classId = typeof opts.classId === "string" ? opts.classId.trim() : "";
  const inPeriodSummary = typeof opts.inPeriodSummary === "string" ? opts.inPeriodSummary.trim() : "";
  const hasPeriod = Boolean(periodStart || periodEnd);
  if (!hasPeriod) return "";

  const profile = studentData?.student_school_profile;
  const goals = Array.isArray(studentData?.learning_goals) ? studentData.learning_goals : [];
  const chunks = [];

  if (profile) {
    const profDate = isoDatePart(profile.updated_at);
    const profileInPeriod = isDateInInclusiveRange(profDate, periodStart, periodEnd);
    const bits = [];
    for (const field of ["teacher_notes", "subject_notes", "learning_context_notes", "parent_goals"]) {
      const t = profile[field];
      if (t && String(t).trim()) {
        bits.push(sanitizeAggregationText(String(t).trim(), { maxLength: 240 }));
      }
    }
    if (bits.length) {
      const merged = bits.join(" · ");
      const shouldInclude =
        !inPeriodSummary ||
        !profileInPeriod ||
        !substringLikelyContained(inPeriodSummary, merged.slice(0, 80));
      if (shouldInclude) {
        chunks.push(
          sanitizeAggregationText(
            `Learning context snapshot (standing background; not limited to this report period): ${merged}`,
            { maxLength: 750 }
          )
        );
      }
    }
  }

  const goalLines = [];
  const sortedGoals = [...goals].sort((a, b) => {
    const ta = new Date(a?.updated_at || a?.created_at || 0).getTime();
    const tb = new Date(b?.updated_at || b?.created_at || 0).getTime();
    return tb - ta;
  });

  for (const g of sortedGoals) {
    if (classId && g?.class_id && String(g.class_id).trim() !== classId) continue;
    const st = String(g?.status || "").toLowerCase();
    if (st === "cancelled" || st === "archived") continue;

    const gDate = isoDatePart(g.updated_at || g.created_at);
    const goalInPeriod = isDateInInclusiveRange(gDate, periodStart, periodEnd);
    const title = g?.goal_title ? String(g.goal_title).trim() : "";
    const desc = g?.goal_description ? String(g.goal_description).trim() : "";
    const excerpt = desc ? `${title || "Goal"} — ${desc}` : title || "Learning goal";
    const line = sanitizeAggregationText(excerpt, { maxLength: 280 });

    if (!goalInPeriod) {
      goalLines.push(`Outside period — ${line}`);
    } else if (!inPeriodSummary && goalLines.length < 8) {
      goalLines.push(line);
    }
    if (goalLines.length >= 10) break;
  }

  if (goalLines.length) {
    chunks.push(
      sanitizeAggregationText(
        `Learning goal snapshot (active goals; may fall outside the selected report period — background only): ${goalLines.join(
          " | "
        )}`,
        { maxLength: 900 }
      )
    );
  }

  if (chunks.length === 0) return "";
  return sanitizeAggregationText(chunks.join(" "), { maxLength: 1200 });
}

function summarizeMemoriesCaptionOnly(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const bits = [];
  for (const row of rows.slice(0, 8)) {
    const cap = typeof row?.caption === "string" ? row.caption.trim() : "";
    const tit = typeof row?.title === "string" ? row.title.trim() : "";
    const vis = row?.visibility_status || "";
    const line = [tit, cap].filter(Boolean).join(" — ");
    if (line) bits.push(`${sanitizeAggregationText(line.slice(0, 160))} (${vis})`);
  }
  return bits.length
    ? sanitizeAggregationText(`Memory captions/metadata only (no media paths): ${bits.join(" | ")}`)
    : "";
}

function summarizeEvidenceLinks(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const bits = [];
  for (const row of rows.slice(0, 10)) {
    const snap = row?.summary_snapshot;
    if (snap && typeof snap === "object") {
      const s = snap.summary != null ? String(snap.summary) : JSON.stringify(snap);
      bits.push(sanitizeAggregationText(s.slice(0, 200)));
    } else if (row?.evidence_type) {
      bits.push(sanitizeAggregationText(String(row.evidence_type)));
    }
  }
  return bits.length
    ? sanitizeAggregationText(`Evidence link snapshots (staff): ${bits.join(" | ")}`)
    : "";
}

function buildRlsEvidenceItems({
  attendanceSummary,
  homeworkSummary,
  releasedHomeworkFeedbackSummary,
  worksheetEvidenceSummary,
  lessonProgressionSummary,
  observationSummary,
  learningContextSnapshotSummary,
  parentCommunicationSummary,
  memoriesEvidenceSummary,
  curriculumContext,
  evidenceLinkSummary,
}) {
  const releasedFb = releasedHomeworkFeedbackSummary || "";
  const releasedWarmEmpty =
    "No released homework feedback found for this period yet. Uses teacher-released feedback only; internal notes are never included.";
  const items = [
    {
      sourceType: "attendance_summary",
      label: "Attendance (RLS aggregate)",
      summary: attendanceSummary || "No attendance rows in scope for this period (or not readable under RLS).",
      confidence: attendanceSummary ? "medium" : "low",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: Boolean(attendanceSummary),
      classification: attendanceSummary
        ? EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY
        : EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "homework_completion_summary",
      label: "Homework (RLS snapshot)",
      summary: homeworkSummary || "No homework assignee rows visible for this student/class.",
      confidence: homeworkSummary ? "medium" : "low",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: Boolean(homeworkSummary),
      classification: homeworkSummary
        ? EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY
        : EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "released_homework_feedback",
      label: "Released homework feedback",
      summary: releasedFb || releasedWarmEmpty,
      confidence: releasedFb ? "medium" : "low",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: Boolean(releasedFb),
      classification: releasedFb
        ? EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY
        : EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "worksheet_upload_placeholder",
      label: "Worksheet / upload evidence",
      summary: worksheetEvidenceSummary,
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "lesson_progression_summary",
      label: "Lesson progression (curriculum/goals)",
      summary: lessonProgressionSummary || "No curriculum progression hints assembled.",
      confidence: lessonProgressionSummary ? "medium" : "low",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: Boolean(lessonProgressionSummary),
      classification: lessonProgressionSummary
        ? EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY
        : EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "teacher_observations",
      label: "Report-period learning evidence (profile & goals)",
      summary:
        typeof observationSummary === "string" && observationSummary.trim()
          ? observationSummary
          : "No report-period learning cues found for this window yet.",
      confidence: typeof observationSummary === "string" && observationSummary.trim() ? "medium" : "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "learning_context_snapshot",
      label: "Learning context snapshot (standing background)",
      summary:
        typeof learningContextSnapshotSummary === "string" && learningContextSnapshotSummary.trim()
          ? learningContextSnapshotSummary
          : "No standing learning context snapshot assembled (or none beyond report-period rows).",
      confidence: learningContextSnapshotSummary?.trim?.() ? "medium" : "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "parent_communication_summary",
      label: "Parent Communication (RLS)",
      summary:
        parentCommunicationSummary ||
        "No parent comment / weekly report text visible for this student in scope.",
      confidence: parentCommunicationSummary ? "low" : "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.SENSITIVE_REQUIRES_CONFIRMATION,
    },
    {
      sourceType: "memories_media_placeholder",
      label: "Class memories (captions only)",
      summary: memoriesEvidenceSummary || "No class memories visible or captions empty.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "curriculum_context",
      label: "Curriculum / school context",
      summary: curriculumContext || "No curriculum context lines assembled.",
      confidence: curriculumContext ? "medium" : "low",
      visibility: "draft_candidate",
      requiresTeacherConfirmation: false,
      includedInDraftByDefault: Boolean(curriculumContext),
      classification: curriculumContext
        ? EVIDENCE_CLASSIFICATION.SAFE_FOR_AI_SUMMARY
        : EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "evidence_links_staff",
      label: "AI report evidence links (staff metadata)",
      summary: evidenceLinkSummary || "No evidence link snapshots on file for this report.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.STAFF_ONLY_REQUIRES_SELECTION,
    },
    {
      sourceType: "internal_pipeline_marker",
      label: "Internal aggregation boundary",
      summary:
        "RLS aggregation returns redacted summaries only — never raw storage paths, URLs, or secrets to any provider.",
      confidence: "low",
      visibility: "staff",
      requiresTeacherConfirmation: true,
      includedInDraftByDefault: false,
      classification: EVIDENCE_CLASSIFICATION.NEVER_SEND_TO_PROVIDER,
    },
  ];

  return items;
}

async function collectRlsSourceEvidence(params) {
  const {
    studentId = "",
    classId = "",
    branchId = "",
    periodStart = "",
    periodEnd = "",
    reportId = "",
  } = params;

  const warnings = ["RLS aggregation uses JWT-scoped reads only; no service role."];
  const missingEvidence = [];

  let attendanceSummary = "";
  let homeworkSummary = "";
  let releasedHomeworkFeedbackSummary = "";
  const worksheetEvidenceSummary = sanitizeAggregationText(
    "Worksheet OCR / upload pipeline not connected — CHECK deferred per plan."
  );
  let lessonProgressionSummary = "";
  let observationSummary = "";
  let learningContextSnapshotSummary = "";
  let parentCommunicationSummary = "";
  let memoriesEvidenceSummary = "";
  let curriculumContext = "";
  let evidenceLinkSummary = "";

  if (!isSupabaseConfigured() || !supabase) {
    warnings.push("Supabase client unavailable — RLS reads skipped.");
    missingEvidence.push("supabase_not_configured");
  } else if (!isUuidLike(studentId)) {
    warnings.push("studentId must be a UUID for scoped RLS reads.");
    missingEvidence.push("invalid_or_non_uuid_student_id");
  } else {
    const sid = studentId.trim();
    const cid = isUuidLike(classId) ? classId.trim() : "";

    try {
      let attQuery = supabase
        .from("attendance_records")
        .select("session_date,status")
        .eq("student_id", sid)
        .order("session_date", { ascending: false })
        .limit(80);
      if (isUuidLike(branchId)) attQuery = attQuery.eq("branch_id", String(branchId).trim());
      if (trimIso(periodStart)) attQuery = attQuery.gte("session_date", trimIso(periodStart));
      if (trimIso(periodEnd)) attQuery = attQuery.lte("session_date", trimIso(periodEnd));
      const attRead = await attQuery;
      if (attRead.error) {
        warnings.push("attendance_read_check");
        missingEvidence.push("attendance_rows_unavailable_or_denied");
      } else {
        attendanceSummary = summarizeAttendanceRows(attRead.data || []);
        if (!attendanceSummary) missingEvidence.push("attendance_empty_in_period");
      }
    } catch {
      warnings.push("attendance_read_check");
      missingEvidence.push("attendance_exception");
    }

    try {
      const hw = await listAssignedHomeworkForStudent({ studentId: sid, classId: cid || undefined });
      if (hw.error) {
        warnings.push("homework_read_check");
        missingEvidence.push("homework_assignee_read_failed");
      } else {
        homeworkSummary = summarizeHomeworkAssignees(hw.data || []);
        if (!homeworkSummary) missingEvidence.push("homework_no_assignee_rows");
      }
    } catch {
      warnings.push("homework_read_check");
      missingEvidence.push("homework_exception");
    }

    try {
      const ps = trimIso(periodStart);
      const pe = trimIso(periodEnd);
      const fb = await listReleasedHomeworkFeedbackForAiEvidence({
        studentId: sid,
        ...(ps ? { periodStart: ps } : {}),
        ...(pe ? { periodEnd: pe } : {}),
      });
      if (fb.error) {
        warnings.push("released_homework_feedback_read_check");
        missingEvidence.push("released_homework_feedback_read_failed");
      } else {
        releasedHomeworkFeedbackSummary = summarizeReleasedHomeworkFeedbackRows(fb.data || []);
        if (!releasedHomeworkFeedbackSummary) {
          missingEvidence.push("released_homework_feedback_empty_in_period");
        }
      }
    } catch {
      warnings.push("released_homework_feedback_read_check");
      missingEvidence.push("released_homework_feedback_exception");
    }

    try {
      const pc = await supabase
        .from("parent_comments")
        .select("comment_text,status,updated_at")
        .eq("student_id", sid)
        .order("updated_at", { ascending: false })
        .limit(15);
      const wr = await supabase
        .from("weekly_progress_reports")
        .select("report_text,status,updated_at")
        .eq("student_id", sid)
        .order("updated_at", { ascending: false })
        .limit(10);
      if (pc.error) warnings.push("parent_comments_read_check");
      if (wr.error) warnings.push("weekly_reports_read_check");
      parentCommunicationSummary = summarizeParentCommunicationRows(pc.data || [], wr.data || []);
      if (!parentCommunicationSummary) missingEvidence.push("parent_communication_empty_or_denied");
    } catch {
      warnings.push("parent_communication_read_check");
      missingEvidence.push("parent_communication_exception");
    }

    try {
      const [studentCtx, classCtx] = await Promise.all([
        getStudentLearningContext({ studentId: sid }),
        cid ? getClassLearningContext({ classId: cid }) : Promise.resolve({ data: null, error: null }),
      ]);
      if (studentCtx.error) {
        warnings.push("student_learning_context_check");
        missingEvidence.push("student_learning_context_unavailable");
      }
      if (cid && classCtx.error) {
        warnings.push("class_learning_context_check");
        missingEvidence.push("class_learning_context_unavailable");
      }
      curriculumContext = summarizeCurriculumContext(studentCtx, classCtx);
      lessonProgressionSummary = summarizeLessonProgression(studentCtx, classCtx);
      observationSummary = summarizeTeacherObservationEvidence(studentCtx?.data ?? {}, {
        periodStart: trimIso(periodStart),
        periodEnd: trimIso(periodEnd),
        classId: cid,
      });
      learningContextSnapshotSummary = summarizeLearningContextSnapshot(studentCtx?.data ?? {}, {
        periodStart: trimIso(periodStart),
        periodEnd: trimIso(periodEnd),
        classId: cid,
        inPeriodSummary: observationSummary,
      });
      if (!curriculumContext) {
        const school = await listStudentSchoolProfiles({ studentId: sid });
        if (!school.error && Array.isArray(school.data) && school.data[0]) {
          const row = school.data[0];
          curriculumContext = sanitizeAggregationText(
            `School profile snapshot: ${row.school_name || "school"} · focus review only.`
          );
        } else if (cid) {
          const asg = await listClassCurriculumAssignments({ classId: cid });
          if (!asg.error && Array.isArray(asg.data) && asg.data[0]?.learning_focus) {
            curriculumContext = sanitizeAggregationText(String(asg.data[0].learning_focus).slice(0, 400));
          }
        }
        if (!curriculumContext) missingEvidence.push("curriculum_context_empty");
      }
      if (!lessonProgressionSummary) missingEvidence.push("lesson_progression_goals_empty");
    } catch {
      warnings.push("curriculum_context_read_check");
      missingEvidence.push("curriculum_context_exception");
    }

    try {
      if (cid) {
        const mem = await listClassMemories({ classId: cid, studentId: sid });
        if (mem.error) {
          warnings.push("class_memories_read_check");
          missingEvidence.push("class_memories_unavailable");
        } else {
          memoriesEvidenceSummary = summarizeMemoriesCaptionOnly(mem.data || []);
          if (!memoriesEvidenceSummary) missingEvidence.push("class_memories_empty");
        }
      } else {
        missingEvidence.push("class_id_required_for_memory_scope");
      }
    } catch {
      warnings.push("class_memories_read_check");
      missingEvidence.push("class_memories_exception");
    }

    if (isUuidLike(reportId)) {
      try {
        const ev = await listAiParentReportEvidenceLinks({ reportId: reportId.trim() });
        if (ev.error) {
          warnings.push("evidence_links_read_check");
          missingEvidence.push("ai_report_evidence_links_unavailable");
        } else {
          evidenceLinkSummary = summarizeEvidenceLinks(ev.data || []);
          if (!evidenceLinkSummary) missingEvidence.push("ai_report_evidence_links_empty");
        }
      } catch {
        warnings.push("evidence_links_read_check");
        missingEvidence.push("evidence_links_exception");
      }
    } else {
      missingEvidence.push("report_id_not_provided_for_evidence_links");
    }
  }

  missingEvidence.push("worksheet_scan_and_validation_pipeline_not_connected");
  if (!trimIso(observationSummary)) {
    missingEvidence.push("teacher_observations_empty_in_period");
  }
  if (trimIso(periodStart) || trimIso(periodEnd)) {
    if (!trimIso(learningContextSnapshotSummary)) {
      missingEvidence.push("learning_context_snapshot_missing");
    }
  }

  const evidenceItems = buildRlsEvidenceItems({
    attendanceSummary,
    homeworkSummary,
    releasedHomeworkFeedbackSummary,
    worksheetEvidenceSummary,
    lessonProgressionSummary,
    observationSummary,
    learningContextSnapshotSummary,
    parentCommunicationSummary,
    memoriesEvidenceSummary,
    curriculumContext,
    evidenceLinkSummary,
  });

  return {
    attendanceSummary: attendanceSummary || "",
    homeworkSummary: homeworkSummary || "",
    releasedHomeworkFeedbackSummary: releasedHomeworkFeedbackSummary || "",
    worksheetEvidenceSummary,
    lessonProgressionSummary: lessonProgressionSummary || "",
    observationSummary,
    learningContextSnapshotSummary,
    parentCommunicationSummary: parentCommunicationSummary || "",
    memoriesEvidenceSummary: memoriesEvidenceSummary || "",
    curriculumContext: curriculumContext || "",
    warnings,
    missingEvidence: [...new Set(missingEvidence)],
    evidenceItems,
  };
}

function mergeHybridOutputs(rlsOut, fakeOut) {
  const pick = (k) => (trimIso(rlsOut[k]) ? rlsOut[k] : fakeOut[k]);
  return {
    attendanceSummary: pick("attendanceSummary"),
    homeworkSummary: pick("homeworkSummary"),
    releasedHomeworkFeedbackSummary: pick("releasedHomeworkFeedbackSummary"),
    worksheetEvidenceSummary: pick("worksheetEvidenceSummary"),
    lessonProgressionSummary: pick("lessonProgressionSummary"),
    observationSummary: pick("observationSummary"),
    learningContextSnapshotSummary: pick("learningContextSnapshotSummary"),
    parentCommunicationSummary: pick("parentCommunicationSummary"),
    memoriesEvidenceSummary: pick("memoriesEvidenceSummary"),
    curriculumContext: pick("curriculumContext"),
    warnings: [...new Set([...(rlsOut.warnings || []), ...(fakeOut.warnings || [])])],
    missingEvidence: [...new Set([...(rlsOut.missingEvidence || []), ...(fakeOut.missingEvidence || [])])],
    evidenceItems: (rlsOut.evidenceItems && rlsOut.evidenceItems.length ? rlsOut.evidenceItems : fakeOut.evidenceItems),
  };
}

/**
 * @param {object} params
 * @param {string} [params.studentId]
 * @param {string} [params.classId]
 * @param {string} [params.branchId]
 * @param {string} [params.periodStart]
 * @param {string} [params.periodEnd]
 * @param {string} [params.reportId] — optional; enables AI report evidence link reads in RLS mode
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
    reportId = "",
    mode = SOURCE_AGGREGATION_MODES.FAKE,
  } = params;

  if (mode === SOURCE_AGGREGATION_MODES.FAKE) {
    return buildFakeAggregationOutput({
      studentId,
      classId,
      branchId,
      periodStart,
      periodEnd,
    });
  }

  if (mode === SOURCE_AGGREGATION_MODES.RLS) {
    return collectRlsSourceEvidence({
      studentId,
      classId,
      branchId,
      periodStart,
      periodEnd,
      reportId,
    });
  }

  if (mode === SOURCE_AGGREGATION_MODES.HYBRID) {
    const [rlsOut, fakeOut] = await Promise.all([
      collectRlsSourceEvidence({
        studentId,
        classId,
        branchId,
        periodStart,
        periodEnd,
        reportId,
      }),
      Promise.resolve(
        buildFakeAggregationOutput({
          studentId,
          classId,
          branchId,
          periodStart,
          periodEnd,
        })
      ),
    ]);
    return mergeHybridOutputs(rlsOut, fakeOut);
  }

  throw new Error(
    `collectAiParentReportSourceEvidence: unsupported mode "${mode}" (use fake, rls, or hybrid)`
  );
}

/**
 * Maps aggregation output into mock-draft input keys (safe strings only).
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

  const releasedFb = safe(sourceEvidence.releasedHomeworkFeedbackSummary);
  const hwComp = safe(sourceEvidence.homeworkSummary);
  const perfParts = [];
  if (releasedFb) perfParts.push(`Released feedback (staff preview): ${releasedFb.slice(0, 500)}`);
  if (hwComp) perfParts.push(`Completion snapshot: ${hwComp.slice(0, 400)}`);
  const homeworkPerformanceMerged =
    perfParts.length > 0 ? perfParts.join(" | ") : undefined;

  const lesson = safe(sourceEvidence.lessonProgressionSummary);
  const obs = safe(sourceEvidence.observationSummary);
  const snap = safe(sourceEvidence.learningContextSnapshotSummary);
  const curr = safe(sourceEvidence.curriculumContext);
  const parentComm = safe(sourceEvidence.parentCommunicationSummary);

  const strengthsMerged =
    lesson && (obs || snap)
      ? sanitizeAggregationText(
          `Lesson progression cues: ${lesson} | Report-period learning cues: ${obs || "(none)"} | Standing background (not month-specific): ${snap || "(none)"}`,
          { maxLength: 1100 }
        )
      : lesson || obs || snap || undefined;

  const recommendationsMerged =
    curr || obs || snap
      ? sanitizeAggregationText(
          `${curr ? `${curr} | ` : ""}Report-period cues: ${obs.slice(0, 280) || "(none)"} | Draft background from snapshot (do not imply month timing): ${snap.slice(0, 380) || "(none)"}`,
          { maxLength: 1100 }
        )
      : undefined;

  const parentSupportMerged =
    parentComm || obs || snap
      ? sanitizeAggregationText(
          `${parentComm ? `${parentComm} | ` : ""}Report-period: ${obs.slice(0, 260) || "(none)"} | Family/programme background (staff review; not raw parent release): ${snap.slice(0, 340) || "(none)"}`,
          { maxLength: 1100 }
        )
      : undefined;

  const learningEvidenceMerged =
    obs || snap
      ? [
          obs ? `Report-period learning evidence: ${obs.slice(0, 550)}` : "",
          snap ? `Standing learning context snapshot (background only; not dated to this month): ${snap.slice(0, 550)}` : "",
        ]
          .filter(Boolean)
          .join(" || ") || undefined
      : undefined;

  return {
    studentSummary:
      [studentBits, snap ? `Standing context snapshot (staff draft only): ${snap.slice(0, 400)}` : ""]
        .filter(Boolean)
        .join(" ") || undefined,
    attendanceSummary: safe(sourceEvidence.attendanceSummary) || undefined,
    lessonProgression: lesson || undefined,
    homeworkCompletion: hwComp || undefined,
    homeworkPerformance: homeworkPerformanceMerged,
    strengths: strengthsMerged || undefined,
    improvementAreas: obs || undefined,
    learningGaps: undefined,
    teacherObservations: obs || undefined,
    learningEvidence: learningEvidenceMerged,
    engagementNotes: snap || undefined,
    learningContextSnapshot: snap || undefined,
    nextRecommendations: recommendationsMerged || undefined,
    parentSupportSuggestions: parentSupportMerged || undefined,
    teacherFinalComment: undefined,
    evidenceSummaries: evidenceSummaries || undefined,
  };
}

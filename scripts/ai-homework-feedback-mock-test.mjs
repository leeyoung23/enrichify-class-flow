import assert from "node:assert/strict";
import {
  buildHomeworkFeedbackDraftContext,
  generateMockHomeworkFeedbackDraft,
} from "../src/services/aiDraftService.js";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";

function run() {
  const context = buildHomeworkFeedbackDraftContext({
    homeworkTask: {
      title: `Reading Reflection ${UUID_A}`,
      instructions: "Write 3 points about the story and reading strategy.",
      subject: "English",
      due_date: "2026-05-20",
    },
    homeworkSubmission: {
      submission_note: "Completed with parent support at home.",
    },
    studentLearningContext: {
      student_school_profile: {
        school_name: "Demo Learning School",
        grade_year: "Year 4",
      },
      curriculum_profile: {
        name: "Primary English Pathway",
        skill_focus: "Reading comprehension",
      },
      learning_goals: [
        { status: "active", goal_title: "Summarize key ideas" },
        { status: "active", goal_title: "Use text evidence" },
      ],
    },
    classLearningContext: {
      class_curriculum_assignments: [
        { learning_focus: "Reading fluency and comprehension" },
      ],
    },
    teacherObservation: `Steady effort in class discussion ${UUID_B}`,
    uploadedFileSummary: [
      {
        file_name: `worksheet-${UUID_A}.pdf`,
        content_type: "application/pdf",
        file_size_bytes: 204800,
      },
    ],
    mode: "mock",
    tone: "supportive",
    length: "short",
  });

  assert.equal(context.taskTitle.includes(UUID_A), false, "Context should sanitize UUID from task title");
  assert.equal(context.teacherObservation.includes(UUID_B), false, "Context should sanitize UUID from observation");
  assert.equal(context.taskSubject, "English");
  assert.equal(context.curriculumProfileName, "Primary English Pathway");
  assert.equal(context.classLearningFocus, "Reading fluency and comprehension");
  assert.equal(Array.isArray(context.activeLearningGoals), true);
  assert.equal(context.activeLearningGoals.length > 0, true);
  assert.equal(context.evidenceLimitNote.includes("No file content was read"), true);

  const draft = generateMockHomeworkFeedbackDraft(context);
  const draftBlob = JSON.stringify(draft);
  assert.equal(draft.markingSummary.toLowerCase().includes("reading reflection"), true);
  assert.equal(draft.markingSummary.toLowerCase().includes("reading fluency"), true);
  assert.equal(draft.feedbackText.toLowerCase().includes("teacher draft"), true);
  assert.equal(draft.teacherNotes.toLowerCase().includes("no file content was read"), true);
  assert.equal(draft.safetyNotes.toLowerCase().includes("draft only"), true);
  assert.equal(draft.modelInfo.externalCall, false);
  assert.equal(draftBlob.includes(UUID_A), false, "Draft output should not include raw UUID");
  assert.equal(draftBlob.includes(UUID_B), false, "Draft output should not include raw UUID");
  assert.equal(draftBlob.toLowerCase().includes("read the file content"), false, "Draft must not claim file-content reading");

  const fallbackContext = buildHomeworkFeedbackDraftContext({
    homeworkTask: {},
    homeworkSubmission: {},
    studentLearningContext: {},
    classLearningContext: {},
    uploadedFileSummary: [],
  });
  const fallbackDraft = generateMockHomeworkFeedbackDraft(fallbackContext);
  assert.equal(typeof fallbackDraft.feedbackText, "string");
  assert.equal(fallbackDraft.feedbackText.length > 0, true);
  assert.equal(fallbackDraft.teacherNotes.toLowerCase().includes("metadata"), true);

  console.log("[PASS] Homework AI mock context includes safe fields");
  console.log("[PASS] Homework AI mock draft references curriculum learning focus when available");
  console.log("[PASS] Homework AI mock draft excludes raw UUID values");
  console.log("[PASS] Homework AI mock draft does not claim file-content reading");
  console.log("[PASS] Homework AI mock draft fallback path is safe");
  console.log("[PASS] Homework AI mock draft keeps draft-only safety note");
  console.log("[PASS] Homework AI mock draft uses local mock path (no real API)");
}

run();

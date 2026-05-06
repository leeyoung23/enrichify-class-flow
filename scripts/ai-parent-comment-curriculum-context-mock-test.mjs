import { buildParentCommentDraftContext, generateParentCommentDraft } from "../src/services/aiDraftService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testContextBuilderWithFakeContext() {
  const context = await buildParentCommentDraftContext(
    {
      studentId: "11111111-1111-1111-1111-111111111111",
      classId: "22222222-2222-2222-2222-222222222222",
      observation: "Shows steady progress in reading fluency.",
      tone: "supportive",
      length: "short",
    },
    {
      getStudentRow: async () => ({ full_name: "Demo Student" }),
      getClassRow: async () => ({ name: "Demo Class A", subject: "English" }),
      getStudentLearningContext: async () => ({
        data: {
          student_school_profile: {
            school_name: "Demo Learning School",
            grade_year: "Year 4",
            curriculum_profile_id: "33333333-3333-3333-3333-333333333333",
          },
          class_curriculum_assignments: [
            { curriculum_profile_id: "33333333-3333-3333-3333-333333333333", learning_focus: "Reading fluency and comprehension" },
          ],
          learning_goals: [
            { status: "active", goal_title: "Summarise short passages clearly" },
            { status: "completed", goal_title: "Use punctuation consistently" },
          ],
        },
        error: null,
      }),
      getClassLearningContext: async () => ({
        data: {
          class_curriculum_assignments: [
            { curriculum_profile_id: "33333333-3333-3333-3333-333333333333", learning_focus: "Reading fluency and comprehension" },
          ],
          learning_goals: [],
        },
        error: null,
      }),
      listCurriculumProfiles: async () => ({
        data: [
          { id: "33333333-3333-3333-3333-333333333333", name: "Australian Curriculum ELA", skill_focus: "Inference and comprehension" },
        ],
        error: null,
      }),
    }
  );

  assert(context.studentDisplayLabel === "Demo Student", "Expected student display label");
  assert(context.classLearningFocus.includes("Reading fluency"), "Expected class learning focus");
  assert(context.curriculumProfileName === "Australian Curriculum ELA", "Expected curriculum profile name");
  assert(context.activeLearningGoals.length === 1, "Expected one active learning goal");
}

async function testFallbackWhenContextMissing() {
  const result = await generateParentCommentDraft({
    teacherNote: "Kept practicing sentence structure.",
    tone: "supportive",
    language: "en",
  });
  assert(Boolean(result.data?.draft_comment), "Expected fallback draft comment");
  assert(result.data?.is_mock === true, "Expected mock response");
}

async function testLearningFocusIncludedAndNoRawIds() {
  const result = await generateParentCommentDraft(
    {
      studentId: "11111111-1111-1111-1111-111111111111",
      classId: "22222222-2222-2222-2222-222222222222",
      teacherNote: "Working on reading fluency this week.",
      tone: "supportive",
      language: "en",
      length: "short",
    }
  );

  const draft = result.data?.draft_comment || "";
  assert(draft.toLowerCase().includes("review and adjust this draft"), "Expected editable draft language");
  assert(!draft.includes("11111111-1111-1111-1111-111111111111"), "Draft should not expose raw student UUID");
  assert(!draft.includes("22222222-2222-2222-2222-222222222222"), "Draft should not expose raw class UUID");
}

async function run() {
  await testContextBuilderWithFakeContext();
  await testFallbackWhenContextMissing();
  await testLearningFocusIncludedAndNoRawIds();
  console.log("[pass] AI parent comment curriculum context mock test");
  console.log("[info] No external AI provider call is made in this test.");
}

run().catch((error) => {
  console.error("[fail] AI parent comment curriculum context mock test");
  console.error(error?.message || error);
  process.exit(1);
});

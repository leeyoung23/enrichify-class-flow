import {
  generateHomeworkFeedbackDraftViaEdgeFunction,
  isHomeworkEdgeFunctionDraftEnabled,
} from "../src/services/aiDraftService.js";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function testRequiredFieldValidation() {
  const result = await generateHomeworkFeedbackDraftViaEdgeFunction({
    homeworkSubmissionId: "fake-submission-1",
    homeworkTaskId: "",
    studentId: "fake-student-1",
    classId: "fake-class-1",
  });
  assert(result.data === null, "Expected null data for missing required field");
  assert(result.error?.code === "invalid_request", "Expected invalid_request error for missing IDs");
  printResult("PASS", "Wrapper validates required IDs");
}

async function testResponseShapeHandling() {
  const result = await generateHomeworkFeedbackDraftViaEdgeFunction(
    {
      homeworkSubmissionId: "fake-submission-1",
      homeworkTaskId: "fake-task-1",
      studentId: "fake-student-1",
      classId: "fake-class-1",
      teacherObservation: "Fake observation only",
    },
    {
      invokeFn: async () => ({
        data: {
          data: {
            markingSummary: "Mock summary",
            feedbackText: "Mock feedback",
            nextStep: "Mock next step",
            learningGaps: "Mock gaps",
            teacherNotes: "Mock notes",
            safetyNotes: "Draft only. Teacher approval is required. No auto-release to parents.",
            modelInfo: { provider: "mock_stub", externalCall: false },
          },
          error: null,
        },
        error: null,
      }),
    },
  );
  assert(result.error === null, "Expected no wrapper error for valid mock edge response");
  assert(result.data?.markingSummary, "Expected markingSummary in wrapper data");
  assert(/draft only/i.test(result.data?.safetyNotes || ""), "Expected draft-only safety note");
  printResult("PASS", "Wrapper handles valid Edge response shape");
}

async function testEdgeErrorHandling() {
  const result = await generateHomeworkFeedbackDraftViaEdgeFunction(
    {
      homeworkSubmissionId: "fake-submission-1",
      homeworkTaskId: "fake-task-1",
      studentId: "fake-student-1",
      classId: "fake-class-1",
    },
    {
      invokeFn: async () => ({
        data: null,
        error: { code: "scope_denied", message: "Role denied" },
      }),
    },
  );
  assert(result.data === null, "Expected null data for edge error");
  assert(result.error?.code === "scope_denied", "Expected edge error code to pass through");
  printResult("PASS", "Wrapper handles Edge invoke error path");
}

function testNoProviderEnvRequirement() {
  const providerEnvKeys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "AI_PROVIDER_KEY"];
  const present = providerEnvKeys.filter((key) => Boolean(process.env[key]));
  if (present.length > 0) {
    printResult("CHECK", `Provider env keys present in shell but wrapper does not require them: ${present.join(", ")}`);
  } else {
    printResult("PASS", "No provider env key required for wrapper");
  }
}

function testDefaultLocalMockFlag() {
  assert(isHomeworkEdgeFunctionDraftEnabled() === false, "Expected local mock default (edge wrapper flag false)");
  printResult("PASS", "Local mock default remains active (edge wrapper disabled by default)");
}

async function run() {
  printResult("CHECK", "Running AI homework Edge wrapper tests");
  await testRequiredFieldValidation();
  await testResponseShapeHandling();
  await testEdgeErrorHandling();
  testNoProviderEnvRequirement();
  testDefaultLocalMockFlag();
  printResult("PASS", "AI homework Edge wrapper tests complete");
}

run().catch((err) => {
  printResult("WARNING", err?.message || String(err));
  process.exit(1);
});

import assert from "node:assert/strict";
import {
  generateProviderHomeworkFeedbackDraft,
  normalizeProviderMode,
} from "../supabase/functions/generate-homework-feedback-draft/providerAdapter.js";

function makeMockDraft(context) {
  return {
    markingSummary: `Summary for ${context.homeworkSubmissionId}`,
    feedbackText: "Draft feedback",
    nextStep: "Teacher to review",
    learningGaps: "Potential gap",
    teacherNotes: "Stub notes",
    safetyNotes: "Draft only.",
    modelInfo: {
      provider: "mock_stub",
      model: "none",
      externalCall: false,
    },
  };
}

async function run() {
  assert.equal(normalizeProviderMode(""), "disabled");
  assert.equal(normalizeProviderMode("disabled"), "disabled");
  assert.equal(normalizeProviderMode("mock"), "mock");
  assert.equal(normalizeProviderMode("future_real_provider_placeholder"), "future_real_provider_placeholder");
  assert.equal(normalizeProviderMode("unexpected"), "disabled");

  const disabledResult = await generateProviderHomeworkFeedbackDraft({
    context: { homeworkSubmissionId: "fake-submission-001" },
    providerMode: "disabled",
    buildMockDraft: makeMockDraft,
  });
  assert.equal(disabledResult.error, null);
  assert.equal(disabledResult.draft.modelInfo.providerMode, "disabled");
  assert.equal(disabledResult.draft.modelInfo.provider, "provider_stub_disabled");
  assert.equal(disabledResult.draft.modelInfo.externalCall, false);
  assert.equal(disabledResult.draft.safetyNotes.toLowerCase().includes("teacher approval is required"), true);

  const mockResult = await generateProviderHomeworkFeedbackDraft({
    context: { homeworkSubmissionId: "fake-submission-001" },
    providerMode: "mock",
    buildMockDraft: makeMockDraft,
  });
  assert.equal(mockResult.error, null);
  assert.equal(mockResult.draft.modelInfo.providerMode, "mock");
  assert.equal(mockResult.draft.modelInfo.provider, "mock_stub");
  assert.equal(mockResult.draft.modelInfo.externalCall, false);

  const placeholderResult = await generateProviderHomeworkFeedbackDraft({
    context: { homeworkSubmissionId: "fake-submission-001" },
    providerMode: "future_real_provider_placeholder",
    buildMockDraft: makeMockDraft,
  });
  assert.equal(placeholderResult.error, null);
  assert.equal(placeholderResult.draft.modelInfo.providerMode, "future_real_provider_placeholder");
  assert.equal(placeholderResult.draft.modelInfo.provider, "provider_stub_placeholder");
  assert.equal(placeholderResult.draft.modelInfo.externalCall, false);

  const configErrorResult = await generateProviderHomeworkFeedbackDraft({
    context: { homeworkSubmissionId: "fake-submission-001" },
    providerMode: "disabled",
  });
  assert.equal(configErrorResult.draft, null);
  assert.equal(configErrorResult.error.code, "provider_adapter_config_error");

  console.log("[PASS] Provider adapter stub modes are normalized safely");
  console.log("[PASS] Provider-disabled mode uses local stub output with no external call");
  console.log("[PASS] Provider adapter stub preserves draft-only safety and teacher approval gate");
}

run();


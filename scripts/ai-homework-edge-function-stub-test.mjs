import { handleGenerateHomeworkFeedbackDraftRequestWithResolver } from "../supabase/functions/generate-homework-feedback-draft/handler.js";

function printResult(kind, message) {
  console.log(`[${kind}] ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function parseJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Response is not valid JSON: ${text}`);
  }
}

function makeRequest({ method = "POST", auth = "Bearer fake-dev-token", body } = {}) {
  const headers = {};
  if (auth) headers.Authorization = auth;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return new Request("http://local.test/generate-homework-feedback-draft", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function testSuccessShape() {
  const req = makeRequest({
    body: {
      homeworkSubmissionId: "fake-submission-001",
      homeworkTaskId: "fake-task-001",
      studentId: "fake-student-001",
      classId: "fake-class-001",
      teacherObservation: "Fake/dev observation for stub validation only.",
      mode: "teacher_homework_stub_test",
      tone: "supportive",
      length: "short",
    },
  });
  const res = await handleGenerateHomeworkFeedbackDraftRequestWithResolver(req, {
    resolveAuthScope: async () => ({
      ok: true,
      requesterRole: "teacher",
    }),
  });
  const body = await parseJson(res);

  assert(res.status === 200, "Expected 200 for valid POST request");
  assert(body && typeof body === "object", "Expected response body object");
  assert(body.error === null, "Expected error to be null for success response");
  assert(body.data && typeof body.data === "object", "Expected data object");

  const requiredFields = [
    "markingSummary",
    "feedbackText",
    "nextStep",
    "learningGaps",
    "teacherNotes",
    "safetyNotes",
    "modelInfo",
  ];
  for (const field of requiredFields) {
    assert(field in body.data, `Missing required success field: ${field}`);
  }

  assert(
    /draft only/i.test(body.data.safetyNotes) && /no auto-release/i.test(body.data.safetyNotes),
    "Expected safetyNotes to include draft-only and no auto-release guidance",
  );
  assert(body.data.modelInfo?.externalCall === false, "Expected modelInfo.externalCall to be false");
  assert(
    body.data.modelInfo?.provider === "provider_stub_disabled",
    "Expected provider_stub_disabled marker for default provider-disabled mode",
  );
  assert(
    body.data.modelInfo?.providerMode === "disabled",
    "Expected provider mode to default to disabled",
  );

  printResult("PASS", "POST success shape validated");
}

async function testMissingAuth() {
  const req = makeRequest({
    auth: "",
    body: {
      homeworkSubmissionId: "fake-submission-001",
      homeworkTaskId: "fake-task-001",
      studentId: "fake-student-001",
      classId: "fake-class-001",
    },
  });
  const res = await handleGenerateHomeworkFeedbackDraftRequestWithResolver(req, {
    resolveAuthScope: async () => ({ ok: true, requesterRole: "teacher" }),
  });
  const body = await parseJson(res);
  assert(res.status === 401, "Expected 401 when Authorization header is missing");
  assert(body?.error?.code === "missing_auth", "Expected missing_auth error code");
  printResult("PASS", "Missing auth returns 401");
}

async function testBadMethod() {
  const req = makeRequest({
    method: "GET",
    body: undefined,
  });
  const res = await handleGenerateHomeworkFeedbackDraftRequestWithResolver(req);
  const body = await parseJson(res);
  assert(res.status === 405, "Expected 405 for non-POST method");
  assert(body?.error?.code === "method_not_allowed", "Expected method_not_allowed error code");
  printResult("PASS", "Bad method returns 405");
}

async function testMissingRequiredFields() {
  const req = makeRequest({
    body: {
      homeworkSubmissionId: "fake-submission-001",
      classId: "fake-class-001",
    },
  });
  const res = await handleGenerateHomeworkFeedbackDraftRequestWithResolver(req, {
    resolveAuthScope: async () => ({ ok: true, requesterRole: "teacher" }),
  });
  const body = await parseJson(res);
  assert(res.status === 400, "Expected 400 for invalid request");
  assert(body?.error?.code === "invalid_request", "Expected invalid_request error code");
  printResult("PASS", "Missing required fields returns 400");
}

async function testBlockedParentRole() {
  const req = makeRequest({
    body: {
      homeworkSubmissionId: "fake-submission-001",
      homeworkTaskId: "fake-task-001",
      studentId: "fake-student-001",
      classId: "fake-class-001",
    },
  });
  const res = await handleGenerateHomeworkFeedbackDraftRequestWithResolver(req, {
    resolveAuthScope: async () => ({
      ok: false,
      status: 403,
      code: "scope_denied",
      message: "Parent and student roles cannot generate homework AI drafts.",
    }),
  });
  const body = await parseJson(res);
  assert(res.status === 403, "Expected 403 for blocked parent/student role");
  assert(body?.error?.code === "scope_denied", "Expected scope_denied for blocked role");
  printResult("PASS", "Parent/student role blocked with 403");
}

async function testRelationshipMismatchBlocked() {
  const req = makeRequest({
    body: {
      homeworkSubmissionId: "fake-submission-001",
      homeworkTaskId: "fake-task-999",
      studentId: "fake-student-001",
      classId: "fake-class-001",
    },
  });
  const res = await handleGenerateHomeworkFeedbackDraftRequestWithResolver(req, {
    resolveAuthScope: async () => ({
      ok: false,
      status: 400,
      code: "relationship_mismatch",
      message: "homeworkTaskId does not match submission relationship.",
    }),
  });
  const body = await parseJson(res);
  assert(res.status === 400, "Expected 400 or 403 when relationship mismatch is detected");
  assert(body?.error?.code === "relationship_mismatch", "Expected relationship_mismatch error code");
  printResult("PASS", "Relationship mismatch blocked");
}

function testNoProviderEnvRequired() {
  const providerEnvKeys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "AI_PROVIDER_KEY"];
  const present = providerEnvKeys.filter((key) => Boolean(process.env[key]));
  if (present.length > 0) {
    printResult("CHECK", `Provider env keys exist in shell but stub does not require them: ${present.join(", ")}`);
    return;
  }
  printResult("PASS", "No provider env key required for stub behavior");
}

async function run() {
  printResult("CHECK", "Running local Edge Function stub contract test");
  await testSuccessShape();
  await testMissingAuth();
  await testBadMethod();
  await testMissingRequiredFields();
  await testBlockedParentRole();
  await testRelationshipMismatchBlocked();
  testNoProviderEnvRequired();
  printResult("PASS", "AI homework Edge Function stub checks complete");
}

run().catch((err) => {
  printResult("WARNING", err?.message || String(err));
  process.exit(1);
});

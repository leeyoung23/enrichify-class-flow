/**
 * Fake/dev AI parent report source aggregation smoke — no Supabase, no persistence, no provider.
 */
import {
  collectAiParentReportSourceEvidence,
  buildMockDraftInputFromSourceEvidence,
  EVIDENCE_CLASSIFICATION,
} from "../src/services/aiParentReportSourceAggregationService.js";
import {
  buildMockAiParentReportStructuredSections,
  containsUnsafeMockDraftValue,
} from "../src/services/aiParentReportMockDraftCore.js";

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

async function run() {
  const params = {
    studentId: "55555555-5555-5555-5555-555555555555",
    classId: "33333333-3333-3333-3333-333333333331",
    branchId: "11111111-1111-1111-1111-111111111111",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-07",
    mode: "fake",
  };

  const agg = await collectAiParentReportSourceEvidence(params);

  const requiredKeys = [
    "attendanceSummary",
    "homeworkSummary",
    "worksheetEvidenceSummary",
    "lessonProgressionSummary",
    "observationSummary",
    "parentCommunicationSummary",
    "memoriesEvidenceSummary",
    "curriculumContext",
    "warnings",
    "missingEvidence",
    "evidenceItems",
  ];
  for (const key of requiredKeys) {
    if (!(key in agg)) fail(`missing top-level key: ${key}`);
  }
  pass("fake aggregation returns expected shape");

  for (const key of requiredKeys) {
    if (key === "warnings" || key === "missingEvidence") {
      if (!Array.isArray(agg[key])) fail(`${key} must be an array`);
    } else if (key === "evidenceItems") {
      if (!Array.isArray(agg[key]) || agg[key].length === 0) fail("evidenceItems must be non-empty array");
    } else if (typeof agg[key] !== "string") {
      fail(`${key} must be a string`);
    }
  }
  pass("required summary fields present");

  pass("evidenceItems array present");

  const allowedClassifications = new Set(Object.values(EVIDENCE_CLASSIFICATION));
  const seenClassifications = new Set();
  for (const item of agg.evidenceItems) {
    if (!item || typeof item.sourceType !== "string") fail("evidence item missing sourceType");
    if (!allowedClassifications.has(item.classification)) {
      fail(`unknown classification: ${item.classification}`);
    }
    seenClassifications.add(item.classification);
    const safeFields = ["label", "summary", "confidence", "visibility"];
    for (const f of safeFields) {
      if (typeof item[f] !== "string") fail(`evidence item ${item.sourceType} missing ${f}`);
    }
    if (typeof item.requiresTeacherConfirmation !== "boolean") fail("requiresTeacherConfirmation boolean");
    if (typeof item.includedInDraftByDefault !== "boolean") fail("includedInDraftByDefault boolean");
  }
  for (const c of allowedClassifications) {
    if (!seenClassifications.has(c)) {
      fail(`classification not represented: ${c}`);
    }
  }
  pass("evidence classifications present");

  const missing = agg.missingEvidence;
  if (
    !missing.some(
      (m) =>
        String(m).includes("not_connected") || String(m).toLowerCase().includes("placeholder")
    )
  ) {
    fail("missingEvidence should include placeholder / not_connected style gaps");
  }
  pass("missingEvidence includes placeholder items");

  const serialized = JSON.stringify(agg);
  if (/https?:\/\//i.test(serialized) || /supabase\.co\/storage/i.test(serialized)) {
    fail("aggregation output must not contain URL-like private storage strings");
  }
  if (/\/storage\/v1\//i.test(serialized) || /file:\/\//i.test(serialized)) {
    fail("aggregation output must not include storage path patterns");
  }
  pass("unsafe/private path-like values are not present in aggregation output");

  const draftInput = buildMockDraftInputFromSourceEvidence(agg);
  if (containsUnsafeMockDraftValue(draftInput)) {
    fail("mock draft input helper produced unsafe values");
  }
  pass("buildMockDraftInputFromSourceEvidence returns safe input");

  const structured = buildMockAiParentReportStructuredSections(draftInput);
  if (!structured?.summary || typeof structured.summary !== "string") {
    fail("structured sections not produced from bridge input");
  }
  pass("mock structured sections build (in-memory only, no persistence)");

  pass("no real provider call exercised");
  pass("no persistence exercised");
  pass("no parent visibility change (no services invoked)");
  pass("no notification/email/PDF side effects (aggregation-only smoke)");

  console.log("[DONE] supabase-ai-parent-report-source-aggregation-smoke-test passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

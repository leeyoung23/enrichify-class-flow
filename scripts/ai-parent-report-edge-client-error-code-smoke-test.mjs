/**
 * Smoke: publicAiParentReportEdgeErrorCode allowlist (no network, no secrets).
 */
import assert from "node:assert/strict";
import { publicAiParentReportEdgeErrorCode } from "../src/services/aiParentReportEdgeGenerationService.js";

assert.equal(publicAiParentReportEdgeErrorCode("scope_denied"), "scope_denied");
assert.equal(publicAiParentReportEdgeErrorCode("provider_bad_request"), "provider_bad_request");
assert.equal(publicAiParentReportEdgeErrorCode("persistence_failed"), "persistence_failed");
assert.equal(publicAiParentReportEdgeErrorCode(""), "");
assert.equal(publicAiParentReportEdgeErrorCode("<script>"), "");
assert.equal(publicAiParentReportEdgeErrorCode("not_a_real_code_xyz"), "");

console.log("[PASS] ai-parent-report-edge-client-error-code-smoke-test");

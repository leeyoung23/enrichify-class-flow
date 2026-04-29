// @ts-nocheck
/* eslint-disable no-undef */
import { handleGenerateHomeworkFeedbackDraftRequest } from "./handler.js";

// TODO(phase-next): Verify JWT and role/scope claims against Supabase profile data.
// TODO(phase-next): Validate class/submission/task relationship under RLS-safe reads.
// TODO(phase-next): Add provider adapter behind server-side secrets only.
// NOTE: This stub intentionally performs no provider call and uses no provider key.

Deno.serve((req: Request) => handleGenerateHomeworkFeedbackDraftRequest(req));

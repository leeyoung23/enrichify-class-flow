function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
}

export const PROVIDER_MODES = {
  MOCK: "mock",
  DISABLED: "disabled",
  FUTURE_PLACEHOLDER: "future_real_provider_placeholder",
};

export function normalizeProviderMode(rawMode) {
  const safe = sanitizeText(rawMode).toLowerCase();
  if (safe === PROVIDER_MODES.MOCK) return PROVIDER_MODES.MOCK;
  if (safe === PROVIDER_MODES.FUTURE_PLACEHOLDER) return PROVIDER_MODES.FUTURE_PLACEHOLDER;
  return PROVIDER_MODES.DISABLED;
}

function withProviderMetadata(draft, { providerMode, providerLabel, adapterNote }) {
  const safeDraft = draft && typeof draft === "object" ? draft : {};
  const modelInfo = safeDraft.modelInfo && typeof safeDraft.modelInfo === "object" ? safeDraft.modelInfo : {};
  const existingSafetyNotes = sanitizeText(safeDraft.safetyNotes);
  const draftOnlyNote = "Draft only. Teacher approval is required. No auto-save. No auto-release to parents.";
  const providerNote = sanitizeText(adapterNote);

  const nextSafetyNotes = [existingSafetyNotes, draftOnlyNote, providerNote]
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .join(" ");

  return {
    ...safeDraft,
    safetyNotes: nextSafetyNotes,
    modelInfo: {
      ...modelInfo,
      provider: providerLabel,
      providerMode,
      model: "none",
      externalCall: false,
      teacherApprovalRequired: true,
    },
  };
}

export async function generateProviderHomeworkFeedbackDraft({
  context,
  providerMode,
  buildMockDraft,
}) {
  // Future real-provider implementation rules:
  // - provider key must be Supabase Edge secret only (never VITE_* and never frontend).
  // - provider key/value must never be logged.
  // - provider response must be normalized to existing draft shape.
  // - invalid provider responses/errors must fail safely without blocking manual teacher workflow.
  try {
    if (typeof buildMockDraft !== "function") {
      return {
        draft: null,
        error: {
          code: "provider_adapter_config_error",
          message: "Provider adapter mock builder is not configured.",
        },
      };
    }

    const normalizedMode = normalizeProviderMode(providerMode);
    const mockDraft = buildMockDraft(context);

    if (normalizedMode === PROVIDER_MODES.MOCK) {
      return {
        draft: withProviderMetadata(mockDraft, {
          providerMode: normalizedMode,
          providerLabel: "mock_stub",
          adapterNote: "Provider adapter is running in mock mode with local deterministic output only.",
        }),
        error: null,
      };
    }

    if (normalizedMode === PROVIDER_MODES.FUTURE_PLACEHOLDER) {
      return {
        draft: withProviderMetadata(mockDraft, {
          providerMode: normalizedMode,
          providerLabel: "provider_stub_placeholder",
          adapterNote:
            "Future real provider placeholder mode is not wired yet; adapter returned safe local stub output.",
        }),
        error: null,
      };
    }

    return {
      draft: withProviderMetadata(mockDraft, {
        providerMode: PROVIDER_MODES.DISABLED,
        providerLabel: "provider_stub_disabled",
        adapterNote: "Provider is disabled; no real AI provider call was performed.",
      }),
      error: null,
    };
  } catch {
    return {
      draft: null,
      error: {
        code: "provider_adapter_error",
        message:
          "Provider adapter failed safely. Teacher can continue with manual feedback workflow without AI output.",
      },
    };
  }
}


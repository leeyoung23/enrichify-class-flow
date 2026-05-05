import { createClient } from '@base44/sdk';
import { appParams } from '../lib/app-params.js';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const isNodeRuntime = typeof window === 'undefined';

function createNodeRuntimeBase44Stub() {
  return {
    auth: {
      me: async () => null,
      logout: () => undefined,
    },
  };
}

// Browser runtime keeps existing Base44 behavior.
// Node/runtime smoke scripts use a tiny no-op stub to avoid browser SDK side effects.
export const base44 = isNodeRuntime
  ? createNodeRuntimeBase44Stub()
  : createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl,
    });

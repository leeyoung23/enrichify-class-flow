const KEEP_SIGNED_IN_PREFERENCE_KEY = "enrichify_keep_signed_in";
const SESSION_STARTED_AT_KEY = "enrichify_session_started_at";
const LAST_ACTIVE_AT_KEY = "enrichify_last_active_at";
const ACTIVE_BROWSER_SESSION_KEY = "enrichify_active_browser_session";
const AUTH_SESSION_ID_KEY = "enrichify_current_auth_session_id";

const ONE_HOUR_MS = 60 * 60 * 1000;

export const SESSION_GOVERNANCE_STORAGE_KEYS = {
  KEEP_SIGNED_IN_PREFERENCE_KEY,
  SESSION_STARTED_AT_KEY,
  LAST_ACTIVE_AT_KEY,
  ACTIVE_BROWSER_SESSION_KEY,
  AUTH_SESSION_ID_KEY,
};

function safeLocalStorageGet(key) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch (_error) {
    // Ignore storage errors to keep auth flow stable.
  }
}

function safeLocalStorageRemove(key) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch (_error) {
    // Ignore storage errors to keep auth flow stable.
  }
}

function safeSessionStorageGet(key) {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function safeSessionStorageSet(key, value) {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(key, value);
  } catch (_error) {
    // Ignore storage errors to keep auth flow stable.
  }
}

function safeSessionStorageRemove(key) {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.removeItem(key);
  } catch (_error) {
    // Ignore storage errors to keep auth flow stable.
  }
}

export function getKeepSignedInPreference() {
  const raw = safeLocalStorageGet(KEEP_SIGNED_IN_PREFERENCE_KEY);
  if (raw == null) return true;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return true;
}

export function setKeepSignedInPreference(value) {
  safeLocalStorageSet(KEEP_SIGNED_IN_PREFERENCE_KEY, value ? "1" : "0");
}

export function hasActiveBrowserSessionMarker() {
  return safeSessionStorageGet(ACTIVE_BROWSER_SESSION_KEY) === "1";
}

export function setActiveBrowserSessionMarker() {
  safeSessionStorageSet(ACTIVE_BROWSER_SESSION_KEY, "1");
}

export function markSessionStartedNow() {
  safeLocalStorageSet(SESSION_STARTED_AT_KEY, String(Date.now()));
}

export function markLastActiveNow() {
  safeLocalStorageSet(LAST_ACTIVE_AT_KEY, String(Date.now()));
}

export function initializeSessionGovernanceOnSignIn() {
  setActiveBrowserSessionMarker();
  markSessionStartedNow();
  markLastActiveNow();
}

export function getCurrentAuthSessionId() {
  const keepSignedIn = getKeepSignedInPreference();
  const key = AUTH_SESSION_ID_KEY;
  const preferred = keepSignedIn ? safeLocalStorageGet(key) : safeSessionStorageGet(key);
  if (preferred) return preferred;
  // Fallback supports prior preference changes without losing existing marker.
  return keepSignedIn ? safeSessionStorageGet(key) : safeLocalStorageGet(key);
}

export function setCurrentAuthSessionId(sessionId) {
  const normalized = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!normalized) return;
  const keepSignedIn = getKeepSignedInPreference();
  if (keepSignedIn) {
    safeLocalStorageSet(AUTH_SESSION_ID_KEY, normalized);
    safeSessionStorageRemove(AUTH_SESSION_ID_KEY);
    return;
  }
  safeSessionStorageSet(AUTH_SESSION_ID_KEY, normalized);
  safeLocalStorageRemove(AUTH_SESSION_ID_KEY);
}

export function clearCurrentAuthSessionId() {
  safeLocalStorageRemove(AUTH_SESSION_ID_KEY);
  safeSessionStorageRemove(AUTH_SESSION_ID_KEY);
}

export function clearSessionGovernanceMarkers({ clearKeepSignedInPreference = false } = {}) {
  safeSessionStorageRemove(ACTIVE_BROWSER_SESSION_KEY);
  safeLocalStorageRemove(SESSION_STARTED_AT_KEY);
  safeLocalStorageRemove(LAST_ACTIVE_AT_KEY);
  if (clearKeepSignedInPreference) {
    safeLocalStorageRemove(KEEP_SIGNED_IN_PREFERENCE_KEY);
  }
}

export function getInactivityTimeoutMsForRole({ role, keepSignedIn }) {
  if (role === "hq_admin" || role === "branch_supervisor") {
    return ONE_HOUR_MS;
  }
  if (role === "teacher") {
    return 2 * ONE_HOUR_MS;
  }
  if (role === "parent" || role === "student") {
    return keepSignedIn ? 12 * ONE_HOUR_MS : 2 * ONE_HOUR_MS;
  }
  return ONE_HOUR_MS;
}

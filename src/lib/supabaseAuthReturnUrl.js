/**
 * Phase 3C-1: validate internal return paths to avoid open redirects.
 * Only same-origin relative paths are allowed; /auth-preview is excluded (loop prevention).
 */

export function isSafeInternalAppPath(pathWithSearch) {
  if (pathWithSearch == null || typeof pathWithSearch !== "string") return false;
  const t = pathWithSearch.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return false;
  const noHash = t.split("#")[0];
  const pathOnly = noHash.split("?")[0];
  if (pathOnly === "/auth-preview" || pathOnly.startsWith("/auth-preview/")) return false;
  return true;
}

/** Path + optional query for use as returnUrl query param (already a path, not encoded). */
export function sanitizeReturnUrlForRedirect(pathWithSearch) {
  const fallback = "/";
  if (!pathWithSearch || typeof pathWithSearch !== "string") return fallback;
  const noHash = pathWithSearch.trim().split("#")[0];
  if (!isSafeInternalAppPath(noHash)) return fallback;
  return noHash.slice(0, 2048);
}

/** Parse returnUrl from location.search (may be encoded). */
export function parseReturnUrlQueryParam(raw) {
  if (raw == null || raw === "") return null;
  let decoded;
  try {
    decoded = decodeURIComponent(String(raw).trim());
  } catch {
    return null;
  }
  if (!isSafeInternalAppPath(decoded)) return null;
  return decoded.split("#")[0].slice(0, 2048);
}

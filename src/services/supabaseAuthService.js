import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import { getRole } from "./permissionService.js";
import { base44 } from "../api/base44Client.js";
import {
  clearCurrentAuthSessionId,
  clearSessionGovernanceMarkers,
  getCurrentAuthSessionId,
} from "./sessionGovernanceService.js";
import {
  markAuthSessionSignedOut,
  markAuthSessionTimedOut,
  recordAuthLifecycleAudit,
} from "./supabaseWriteService.js";

/**
 * Phase 1: Supabase Auth helpers only. Does not replace demoRole or authService (Base44).
 * Uses anon client only — never service role.
 */

export async function getCurrentSession() {
  if (!isSupabaseConfigured() || !supabase) {
    return { session: null, error: null };
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session ?? null, error: error ?? null };
  } catch (e) {
    return { session: null, error: { message: e?.message || String(e) } };
  }
}

/** Supabase Auth user for the active session (not the app profile row). */
export async function getCurrentUser() {
  const { session, error } = await getCurrentSession();
  if (error || !session?.user) {
    return { user: null, error: error ?? null };
  }
  return { user: session.user, error: null };
}

export async function getCurrentProfile() {
  if (!isSupabaseConfigured() || !supabase) {
    return { profile: null, error: null };
  }
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    let uid = userData?.user?.id ?? null;
    if (userError && !uid) {
      return { profile: null, error: userError };
    }
    if (!uid) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        return { profile: null, error: sessionError };
      }
      uid = sessionData?.session?.user?.id ?? null;
    }
    if (!uid) {
      return { profile: null, error: null };
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,branch_id,linked_student_id,is_active,created_at,updated_at")
      .eq("id", uid)
      .maybeSingle();
    return { profile: data ?? null, error: error ?? null };
  } catch (e) {
    return { profile: null, error: { message: e?.message || String(e) } };
  }
}

export async function signInWithEmailPassword(email, password) {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: { user: null, session: null },
      error: { message: "Supabase is not configured" },
    };
  }
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (!trimmedEmail || password == null || String(password).length === 0) {
    return {
      data: { user: null, session: null },
      error: { message: "Email and password are required" },
    };
  }
  try {
    return await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: String(password),
    });
  } catch (e) {
    return {
      data: { user: null, session: null },
      error: { message: e?.message || String(e) },
    };
  }
}

export async function signOut(options = {}) {
  const { supabaseError } = await signOutSupabasePrimary(options);
  return { error: supabaseError ?? null };
}

const SESSION_UI_KEYS_TO_CLEAR_ON_SIGN_OUT = [
  "companyNewsPopupSessionShownIds",
  "companyNewsPopupSessionHiddenIds",
];

function clearSessionUiStateBestEffort() {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    for (const key of SESSION_UI_KEYS_TO_CLEAR_ON_SIGN_OUT) {
      window.sessionStorage.removeItem(key);
    }
  } catch (_error) {
    // Ignore storage cleanup errors to keep sign-out non-blocking.
  }
}

/**
 * Supabase-primary sign-out for real app mode.
 * - Source of truth: Supabase session invalidation.
 * - Legacy Base44 cleanup is best-effort and non-blocking.
 * - Clears only safe session UI keys used by current app shell.
 */
export async function signOutSupabasePrimary({ reason = "manual_sign_out" } = {}) {
  let supabaseError = null;
  let legacyCleanupError = null;
  const currentAuthSessionId = getCurrentAuthSessionId();

  if (reason === "manual_sign_out") {
    // Best-effort audit only; logout must never depend on audit writes.
    await recordAuthLifecycleAudit({
      actionType: "user.logout",
      reason: "manual_sign_out",
      source: "manual_sign_out",
      includeResultRow: false,
    });
  }

  if (!isSupabaseConfigured() || !supabase) {
    clearSessionUiStateBestEffort();
    clearCurrentAuthSessionId();
    clearSessionGovernanceMarkers({ clearKeepSignedInPreference: false });
    return {
      success: true,
      error: null,
      supabaseError: null,
      legacyCleanupError: null,
      reason,
    };
  }

  if (currentAuthSessionId) {
    if (reason === "session_timeout") {
      await markAuthSessionTimedOut({ sessionId: currentAuthSessionId });
    } else {
      await markAuthSessionSignedOut({ sessionId: currentAuthSessionId });
    }
  }

  try {
    const { error } = await supabase.auth.signOut();
    supabaseError = error ?? null;
  } catch (e) {
    supabaseError = { message: e?.message || String(e) };
  }

  try {
    if (base44?.auth?.logout && typeof base44.auth.logout === "function") {
      // Best-effort cleanup only; never the source of truth for sign-out.
      base44.auth.logout();
    }
  } catch (e) {
    legacyCleanupError = { message: e?.message || String(e) };
  }

  clearSessionUiStateBestEffort();
  clearCurrentAuthSessionId();
  clearSessionGovernanceMarkers({ clearKeepSignedInPreference: false });

  return {
    success: !supabaseError,
    error: supabaseError ?? null,
    supabaseError: supabaseError ?? null,
    legacyCleanupError: legacyCleanupError ?? null,
    reason,
  };
}

/**
 * Map public.profiles row to a minimal app user shape compatible with permissionService.getRole / layout.
 * Teacher class IDs / guardian IDs are not loaded here (Phase 4+).
 */
export function mapProfileToAppUser(profile) {
  if (!profile) {
    return null;
  }
  const role = getRole({ role: profile.role });
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email ?? "",
    role,
    branch_id: profile.branch_id ?? null,
    linked_student_id: profile.linked_student_id ?? null,
    student_id: profile.linked_student_id ?? null,
    is_active: profile.is_active,
  };
}

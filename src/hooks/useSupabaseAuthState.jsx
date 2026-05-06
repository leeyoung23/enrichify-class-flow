import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/services/supabaseClient.js";
import {
  getCurrentProfile,
  getCurrentSession,
  mapProfileToAppUser,
} from "@/services/supabaseAuthService.js";

const defaultValue = {
  session: null,
  user: null,
  profile: null,
  appUser: null,
  loading: false,
  error: null,
  isSupabaseAuthAvailable: false,
  refreshAuthState: async () => {},
};

const SupabaseAuthStateContext = createContext(defaultValue);

/**
 * Phase 3A: observes Supabase session + profile for the anon client.
 * Does not affect demoRole, AppLayout, or routing. Safe no-op when Supabase is not configured.
 */
export function SupabaseAuthStateProvider({ children }) {
  const isAvailable = isSupabaseConfigured() && Boolean(supabase);

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(isAvailable));
  const [error, setError] = useState(null);

  const applySession = useCallback(async (nextSession) => {
    setSession(nextSession ?? null);
    setUser(nextSession?.user ?? null);

    if (!isSupabaseConfigured() || !supabase) {
      setProfile(null);
      setAppUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!nextSession?.user) {
      setProfile(null);
      setAppUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { profile: nextProfile, error: profileError } = await getCurrentProfile();
      if (profileError) {
        setProfile(null);
        setAppUser(null);
        setError(profileError);
        return;
      }
      setProfile(nextProfile ?? null);
      setAppUser(mapProfileToAppUser(nextProfile));
    } catch (e) {
      setProfile(null);
      setAppUser(null);
      setError({ message: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAuthState = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setAppUser(null);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const { session: nextSession, error: sessionError } = await getCurrentSession();
      if (sessionError) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setAppUser(null);
        setError(sessionError);
        setLoading(false);
        return;
      }
      await applySession(nextSession ?? null);
    } catch (e) {
      setError({ message: e?.message || String(e) });
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return undefined;
    }

    void refreshAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applySession, refreshAuthState]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      appUser,
      loading,
      error,
      isSupabaseAuthAvailable: isAvailable,
      refreshAuthState,
    }),
    [session, user, profile, appUser, loading, error, isAvailable, refreshAuthState]
  );

  return <SupabaseAuthStateContext.Provider value={value}>{children}</SupabaseAuthStateContext.Provider>;
}

export function useSupabaseAuthState() {
  return useContext(SupabaseAuthStateContext);
}

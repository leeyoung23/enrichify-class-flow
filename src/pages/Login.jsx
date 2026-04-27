import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/services/supabaseClient.js";
import {
  getCurrentProfile,
  signInWithEmailPassword,
  signOut,
} from "@/services/supabaseAuthService.js";
import { parseReturnUrlQueryParam } from "@/lib/supabaseAuthReturnUrl.js";
import { useSupabaseAuthState } from "@/hooks/useSupabaseAuthState";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, appUser, loading: supabaseLoading, refreshAuthState } = useSupabaseAuthState();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const configured = isSupabaseConfigured();

  const goAfterSignIn = () => {
    const next = parseReturnUrlQueryParam(searchParams.get("returnUrl"));
    navigate(next || "/", { replace: true });
  };

  const handleSignIn = async (e) => {
    e?.preventDefault?.();
    if (!configured) return;
    setBusy(true);
    setFormError(null);
    try {
      const { error: signErr } = await signInWithEmailPassword(email, password);
      if (signErr) {
        setFormError(signErr.message || "Sign-in failed");
        return;
      }
      const { profile, error: profileErr } = await getCurrentProfile();
      if (profileErr) {
        setFormError(profileErr.message || "Could not load your profile");
        await signOut();
        return;
      }
      if (!profile) {
        setFormError("No profile found for this account. Please contact your centre.");
        await signOut();
        return;
      }
      await refreshAuthState();
      goAfterSignIn();
    } catch (err) {
      setFormError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await signOut();
      await refreshAuthState();
    } catch (err) {
      setFormError(err?.message || "Sign-out failed");
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = () => {
    goAfterSignIn();
  };

  if (!configured) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-slate-50/80 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Sign-in unavailable</CardTitle>
            <CardDescription>
              Supabase is not configured in this environment. Use demo preview links or configure your local app.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (configured && supabaseLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-slate-50/80 flex items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (configured && session?.user && !appUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-slate-50/80 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/80 shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </div>
            <CardTitle className="text-xl">Profile not ready</CardTitle>
            <CardDescription>
              You are signed in, but we could not load your centre profile. Try signing out and signing in again, or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" variant="secondary" disabled={busy} onClick={handleSignOut}>
              {busy ? "Working…" : "Sign out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (configured && session?.user && appUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-slate-50/80 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/80 shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </div>
            <CardTitle className="text-xl">You are already signed in</CardTitle>
            <CardDescription>
              Signed in as {appUser.full_name || appUser.email || "your account"}. Continue to the dashboard or sign out.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" disabled={busy} onClick={handleContinue}>
              Continue to dashboard
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={handleSignOut}>
              {busy ? "Working…" : "Sign out"}
            </Button>
          </CardContent>
          {formError ? (
            <CardContent className="pt-0">
              <p className="text-center text-sm text-destructive" role="alert">
                {formError}
              </p>
            </CardContent>
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-slate-50/80 flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <GraduationCap className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Young&apos;s Learners Portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">Secure access for staff and families</p>
          </div>
        </div>

        <Card className="border-border/80 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Use the email and password provided by your centre.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="login-email">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@example.com"
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="login-password">
                  Password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="Enter your password"
                  disabled={busy}
                />
              </div>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <Button type="submit" className="w-full gap-2" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
            <p className="mt-6 text-xs text-muted-foreground text-center leading-relaxed">
              Your role and access are loaded securely after sign-in.
            </p>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Demo preview links remain available separately.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/welcome" className="underline-offset-4 hover:underline text-primary">
            Back to welcome
          </Link>
          <span className="mx-2 text-border">·</span>
          <Link to="/auth-preview" className="underline-offset-4 hover:underline text-muted-foreground">
            Developer auth preview
          </Link>
        </p>
      </div>
    </div>
  );
}

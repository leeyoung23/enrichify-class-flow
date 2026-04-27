import React, { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/services/supabaseClient.js";
import {
  getCurrentProfile,
  mapProfileToAppUser,
  signInWithEmailPassword,
  signOut,
} from "@/services/supabaseAuthService.js";
import { parseReturnUrlQueryParam } from "@/lib/supabaseAuthReturnUrl.js";

const FAKE_USERS = [
  { label: "HQ Admin", email: "hq.demo@example.test" },
  { label: "Branch Supervisor", email: "supervisor.demo@example.test" },
  { label: "Teacher", email: "teacher.demo@example.test" },
  { label: "Parent", email: "parent.demo@example.test" },
  { label: "Student", email: "student.demo@example.test" },
];

export default function AuthPreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileRow, setProfileRow] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [busy, setBusy] = useState(false);

  const configured = isSupabaseConfigured();

  const clearSessionUi = useCallback(() => {
    setProfileRow(null);
    setAppUser(null);
    setStatusError(null);
  }, []);

  const handleSignIn = async (e) => {
    e?.preventDefault?.();
    if (!configured) return;
    setBusy(true);
    setStatusError(null);
    setProfileRow(null);
    setAppUser(null);
    try {
      const { error: signErr } = await signInWithEmailPassword(email, password);
      if (signErr) {
        setStatusError(signErr.message || "Sign-in failed");
        setBusy(false);
        return;
      }
      const { profile, error: profileErr } = await getCurrentProfile();
      if (profileErr) {
        setStatusError(profileErr.message || "Could not load profile");
        await signOut();
        setBusy(false);
        return;
      }
      if (!profile) {
        setStatusError("No profile row for this user (check Supabase seed).");
        await signOut();
        setBusy(false);
        return;
      }
      setProfileRow(profile);
      setAppUser(mapProfileToAppUser(profile));
      const nextPath = parseReturnUrlQueryParam(searchParams.get("returnUrl"));
      if (nextPath) {
        navigate(nextPath, { replace: true });
      }
    } catch (err) {
      setStatusError(err?.message || "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setStatusError(null);
    try {
      await signOut();
    } catch (err) {
      setStatusError(err?.message || "Sign-out failed");
    } finally {
      clearSessionUi();
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Supabase Auth Preview</h1>
          <p className="mt-2 text-sm">
            <Link to="/login" className="text-primary font-medium underline-offset-4 hover:underline">
              Use polished login page
            </Link>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Development and testing only. Uses fake demo accounts from your Supabase project seed—never
            production or real child data. Enter the same password you use for{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run test:supabase:auth</code>{" "}
            (from your local env; nothing is shown here). The main app still uses{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">demoRole</code> for preview. After a
            successful sign-in, if a safe internal <code className="rounded bg-muted px-1 py-0.5 text-xs">returnUrl</code>{" "}
            query param is present, you are redirected back to that path.
          </p>
        </div>

        {!configured && (
          <Card>
            <CardHeader>
              <CardTitle>Supabase not configured</CardTitle>
              <CardDescription>
                Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local environment (not committed).
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {configured && (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Quick-fill email only—you must enter the password yourself.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {FAKE_USERS.map((u) => (
                  <Button
                    key={u.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmail(u.email);
                      setStatusError(null);
                    }}
                  >
                    {u.label}
                  </Button>
                ))}
              </div>
              <form className="space-y-3" onSubmit={handleSignIn}>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="auth-preview-email">
                    Email
                  </label>
                  <Input
                    id="auth-preview-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    placeholder="hq.demo@example.test"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="auth-preview-password">
                    Password
                  </label>
                  <Input
                    id="auth-preview-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? "Working…" : "Sign in"}
                  </Button>
                  <Button type="button" variant="secondary" disabled={busy} onClick={handleSignOut}>
                    Sign out
                  </Button>
                </div>
              </form>
              {statusError && (
                <p className="text-sm text-destructive" role="alert">
                  {statusError}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {configured && appUser && profileRow && (
          <Card>
            <CardHeader>
              <CardTitle>Profile (safe fields)</CardTitle>
              <CardDescription>Mapped from <code className="text-xs">public.profiles</code> via RLS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span> {appUser.email || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Full name:</span> {appUser.full_name || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span> {appUser.role || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">branch_id:</span>{" "}
                {appUser.branch_id != null ? String(appUser.branch_id) : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">linked_student_id:</span>{" "}
                {profileRow.linked_student_id != null ? String(profileRow.linked_student_id) : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">student_id (mapped):</span>{" "}
                {appUser.student_id != null ? String(appUser.student_id) : "—"}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLES } from '@/services/permissionService';
import { getSelectedDemoRole } from '@/services/authService';
import {
  getCurrentPositionForClockEvent,
  calculateDistanceMeters,
  evaluateGeofence,
} from '@/services/locationVerificationService';
import { AlertTriangle, Camera, Clock, Loader2, MapPin, Monitor, Timer } from 'lucide-react';

const DEMO_NOTE =
  'Local demo — optional browser GPS check below (tap only; no background tracking). Mock Clock In/Out stays on this device. No camera, no Supabase writes yet.';

/** Placeholder branch centre for UI-only distance math until real `branches` lat/lng/radius are loaded from Supabase. Not a production coordinate. */
const DEMO_BRANCH_CENTRE_LABEL = 'Demo North Branch (placeholder coordinates)';
const DEMO_BRANCH_LAT = -33.8688;
const DEMO_BRANCH_LNG = 151.2093;
const DEMO_BRANCH_RADIUS_M = 150;

const FAKE_BRANCH_LABEL = DEMO_BRANCH_CENTRE_LABEL;
const FAKE_GEOFENCE_RADIUS_M = DEMO_BRANCH_RADIUS_M;

const BRANCH_STAFF_ROWS = [
  { name: 'Alex Chen', role: 'Teacher', in: '08:58', out: '17:02', status: 'Normal' },
  { name: 'Jordan Lee', role: 'Teacher', in: '09:12', out: '—', status: 'Clocked in' },
  { name: 'Sam Rivera', role: 'Support', in: '08:45', out: '17:00', status: 'Normal' },
];

const HQ_STAFF_ROWS = [
  { branch: 'North', name: 'Alex Chen', in: '08:58', out: '17:02', hours: '8.1' },
  { branch: 'North', name: 'Jordan Lee', in: '09:12', out: '—', hours: '—' },
  { branch: 'Central', name: 'Morgan Wu', in: '08:50', out: '16:55', hours: '8.1' },
  { branch: 'Central', name: 'Riley Park', in: '—', out: '—', hours: 'Absent' },
];

function formatDemoTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDurationMinutes(startIso, endIso) {
  if (!startIso || !endIso) return null;
  try {
    const ms = new Date(endIso) - new Date(startIso);
    if (Number.isNaN(ms) || ms < 0) return null;
    const m = Math.round(ms / 60000);
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h <= 0) return `${r} min`;
    return `${h}h ${r}m`;
  } catch {
    return null;
  }
}

function fakeGeofenceCheck() {
  const accuracyM = 6 + Math.floor(Math.random() * 6);
  const distanceM = 45 + Math.floor(Math.random() * 55);
  const insideGeofence = distanceM <= FAKE_GEOFENCE_RADIUS_M;
  return { distanceM, accuracyM, insideGeofence };
}

function humanizeLocationError(error) {
  if (!error?.code) return error?.message || 'Location check failed.';
  const hints = {
    PERMISSION_DENIED:
      'Location permission denied. Allow location for this site in your browser or system settings, then try again.',
    TIMEOUT: 'Location request timed out. Move to a clearer view of the sky or try again.',
    POSITION_UNAVAILABLE: 'Position unavailable. Check that location services are enabled.',
    UNSUPPORTED: 'This browser or environment does not support geolocation. You can still use mock Clock In/Out below.',
    INSECURE_CONTEXT: 'Geolocation needs a secure (HTTPS) page. Mock shift controls still work.',
    UNKNOWN: error.message || 'Location check failed.',
  };
  return hints[error.code] || error.message || 'Location check failed.';
}

function geofenceStatusBadgeVariant(status) {
  if (status === 'valid') return 'default';
  if (status === 'outside_geofence') return 'destructive';
  return 'secondary';
}

function TeacherClockDemo() {
  const isDemoRole = Boolean(getSelectedDemoRole());

  const [clockInAt, setClockInAt] = useState(null);
  const [clockOutAt, setClockOutAt] = useState(null);
  const [clockInCheck, setClockInCheck] = useState(null);
  const [clockOutCheck, setClockOutCheck] = useState(null);
  const [history, setHistory] = useState([]);
  const [demoOutsideGeofence, setDemoOutsideGeofence] = useState(false);

  const [liveCheckKind, setLiveCheckKind] = useState(null);
  const [liveClockInResult, setLiveClockInResult] = useState(null);
  const [liveClockOutResult, setLiveClockOutResult] = useState(null);
  const [liveLocationError, setLiveLocationError] = useState(null);

  const statusLabel = useMemo(() => {
    if (!clockInAt) return 'Not clocked in';
    if (!clockOutAt) return `On shift — clocked in ${formatDemoTime(clockInAt)}`;
    return `Shift ended — clock out ${formatDemoTime(clockOutAt)}`;
  }, [clockInAt, clockOutAt]);

  const shiftSummary = useMemo(() => {
    if (!clockInAt || !clockOutAt) return null;
    const dur = formatDurationMinutes(clockInAt, clockOutAt);
    return dur ? `Shift length (demo): ${dur}` : null;
  }, [clockInAt, clockOutAt]);

  const showPendingReview = demoOutsideGeofence || (clockInCheck && !clockInCheck.insideGeofence);

  const handleClockIn = () => {
    if (clockInAt && !clockOutAt) return;
    const now = new Date().toISOString();
    const check = demoOutsideGeofence
      ? { distanceM: 182, accuracyM: 9, insideGeofence: false }
      : fakeGeofenceCheck();
    setClockInAt(now);
    setClockOutAt(null);
    setClockInCheck({ ...check, label: 'Clock-in location check' });
    setClockOutCheck(null);
  };

  const handleClockOut = () => {
    if (!clockInAt || clockOutAt) return;
    const now = new Date().toISOString();
    const check = demoOutsideGeofence
      ? { distanceM: 210, accuracyM: 11, insideGeofence: false }
      : fakeGeofenceCheck();
    setClockOutAt(now);
    setClockOutCheck({ ...check, label: 'Clock-out location check' });

    const dur = formatDurationMinutes(clockInAt, now);
    setHistory((prev) => {
      const entry = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        clockInAt,
        clockOutAt: now,
        summary: dur ? `${dur} · GPS/geofence verification (mock)` : 'GPS/geofence verification (mock)',
        hadException: demoOutsideGeofence || (clockInCheck && !clockInCheck.insideGeofence) || !check.insideGeofence,
      };
      return [entry, ...prev].slice(0, 5);
    });
  };

  const handleReset = () => {
    setClockInAt(null);
    setClockOutAt(null);
    setClockInCheck(null);
    setClockOutCheck(null);
    setHistory([]);
    setDemoOutsideGeofence(false);
    setLiveClockInResult(null);
    setLiveClockOutResult(null);
    setLiveLocationError(null);
    setLiveCheckKind(null);
  };

  const canClockIn = !clockInAt || Boolean(clockOutAt);
  const canClockOut = Boolean(clockInAt) && !clockOutAt;
  const liveBusy = liveCheckKind !== null;

  const runLiveLocationCheck = async (kind) => {
    setLiveLocationError(null);
    setLiveCheckKind(kind);
    try {
      const pos = await getCurrentPositionForClockEvent();
      if (pos.error) {
        setLiveLocationError({ ...pos.error, forCheck: kind });
        setLiveCheckKind(null);
        return;
      }

      const distRes = calculateDistanceMeters({
        branchLat: DEMO_BRANCH_LAT,
        branchLng: DEMO_BRANCH_LNG,
        currentLat: pos.data.latitude,
        currentLng: pos.data.longitude,
      });
      if (distRes.error) {
        setLiveLocationError({ ...distRes.error, forCheck: kind });
        setLiveCheckKind(null);
        return;
      }

      const ev = evaluateGeofence({
        distanceMeters: distRes.data.distanceMeters,
        accuracyMeters: pos.data.accuracyMeters,
        radiusMeters: DEMO_BRANCH_RADIUS_M,
      });
      if (ev.error) {
        setLiveLocationError({ ...ev.error, forCheck: kind });
        setLiveCheckKind(null);
        return;
      }

      const row = {
        latitude: pos.data.latitude,
        longitude: pos.data.longitude,
        accuracyMeters: pos.data.accuracyMeters,
        capturedAt: pos.data.capturedAt,
        distanceMeters: distRes.data.distanceMeters,
        status: ev.data.status,
        reasons: ev.data.reasons || [],
      };
      if (kind === 'clock_in') {
        setLiveClockInResult(row);
      } else {
        setLiveClockOutResult(row);
      }
    } catch (e) {
      setLiveLocationError({
        code: 'UNKNOWN',
        message: e?.message || String(e),
        forCheck: kind,
      });
    } finally {
      setLiveCheckKind(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8 md:max-w-2xl">
      <PageHeader
        title="Staff Time Clock"
        description="Evidence-based attendance (mock): GPS/geofence verification at clock-in and clock-out, plus selfie proof — local preview only."
      />

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Timer className="h-5 w-5 shrink-0 text-primary" />
            Current shift status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-lg font-medium text-foreground">{statusLabel}</p>
          {shiftSummary && <p className="text-sm text-muted-foreground">{shiftSummary}</p>}
          <Badge variant={clockInAt && !clockOutAt ? 'default' : 'secondary'} className="mt-1">
            {clockInAt && !clockOutAt ? 'On shift' : clockOutAt ? 'Between shifts (demo)' : 'Off shift'}
          </Badge>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          size="lg"
          className="min-h-14 w-full flex-1 text-base sm:min-w-[200px]"
          onClick={handleClockIn}
          disabled={!canClockIn}
        >
          Clock In
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="min-h-14 w-full flex-1 text-base sm:min-w-[200px]"
          onClick={handleClockOut}
          disabled={!canClockOut}
        >
          Clock Out
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 shrink-0" />
            Branch &amp; GPS/geofence verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="font-medium text-foreground">Assigned branch</p>
            <p className="text-muted-foreground">{FAKE_BRANCH_LABEL}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Geofence radius (placeholder): {FAKE_GEOFENCE_RADIUS_M} m. Branch centre for distance math is a{' '}
              <strong className="text-foreground">labelled UI placeholder</strong> until real branch latitude/longitude/radius load from Supabase.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Active <strong className="text-foreground">GPS/geofence verification</strong> runs only when you tap a check button below — not in the background.
            </p>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 space-y-3">
            <p className="font-medium text-foreground">Browser: clock-in / clock-out location check</p>
            <p className="text-xs text-muted-foreground">
              Uses your device location once per tap against the placeholder branch centre above. Does not save to Supabase. No camera.
            </p>
            {isDemoRole && (
              <p className="text-xs text-muted-foreground">
                Demo role: same rules — mock shift buttons remain local-only; this GPS check is optional and still does not write to the server.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="default"
                size="lg"
                className="min-h-12 w-full sm:flex-1"
                disabled={liveBusy}
                onClick={() => runLiveLocationCheck('clock_in')}
              >
                {liveCheckKind === 'clock_in' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  'Check clock-in location (GPS)'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-12 w-full sm:flex-1"
                disabled={liveBusy}
                onClick={() => runLiveLocationCheck('clock_out')}
              >
                {liveCheckKind === 'clock_out' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  'Check clock-out location (GPS)'
                )}
              </Button>
            </div>
            {liveLocationError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <p className="font-medium">
                  {liveLocationError.forCheck === 'clock_in' ? 'Clock-in location check' : 'Clock-out location check'}
                </p>
                <p className="mt-1">{humanizeLocationError(liveLocationError)}</p>
                {liveLocationError.code && (
                  <p className="mt-1 font-mono text-[10px] opacity-80">Code: {liveLocationError.code}</p>
                )}
              </div>
            )}
            {liveClockInResult && (
              <div className="rounded-md border bg-card px-3 py-2 text-xs">
                <p className="font-medium text-foreground">Last clock-in location check (browser)</p>
                <p className="mt-1 text-muted-foreground">
                  Lat <span className="font-mono text-foreground">{liveClockInResult.latitude.toFixed(5)}</span>, lng{' '}
                  <span className="font-mono text-foreground">{liveClockInResult.longitude.toFixed(5)}</span>
                </p>
                <p className="text-muted-foreground">
                  Distance to placeholder branch:{' '}
                  <span className="font-mono text-foreground">{Math.round(liveClockInResult.distanceMeters)} m</span>
                </p>
                <p className="text-muted-foreground">
                  Accuracy:{' '}
                  <span className="font-mono text-foreground">
                    {liveClockInResult.accuracyMeters == null ? '—' : `±${Math.round(liveClockInResult.accuracyMeters)} m`}
                  </span>
                </p>
                <p className="text-muted-foreground">Captured: {formatDemoTime(liveClockInResult.capturedAt)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={geofenceStatusBadgeVariant(liveClockInResult.status)}>{liveClockInResult.status}</Badge>
                  {liveClockInResult.reasons?.length > 0 && (
                    <span className="text-muted-foreground">({liveClockInResult.reasons.join(', ')})</span>
                  )}
                </div>
              </div>
            )}
            {liveClockOutResult && (
              <div className="rounded-md border bg-card px-3 py-2 text-xs">
                <p className="font-medium text-foreground">Last clock-out location check (browser)</p>
                <p className="mt-1 text-muted-foreground">
                  Lat <span className="font-mono text-foreground">{liveClockOutResult.latitude.toFixed(5)}</span>, lng{' '}
                  <span className="font-mono text-foreground">{liveClockOutResult.longitude.toFixed(5)}</span>
                </p>
                <p className="text-muted-foreground">
                  Distance to placeholder branch:{' '}
                  <span className="font-mono text-foreground">{Math.round(liveClockOutResult.distanceMeters)} m</span>
                </p>
                <p className="text-muted-foreground">
                  Accuracy:{' '}
                  <span className="font-mono text-foreground">
                    {liveClockOutResult.accuracyMeters == null ? '—' : `±${Math.round(liveClockOutResult.accuracyMeters)} m`}
                  </span>
                </p>
                <p className="text-muted-foreground">Captured: {formatDemoTime(liveClockOutResult.capturedAt)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={geofenceStatusBadgeVariant(liveClockOutResult.status)}>{liveClockOutResult.status}</Badge>
                  {liveClockOutResult.reasons?.length > 0 && (
                    <span className="text-muted-foreground">({liveClockOutResult.reasons.join(', ')})</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs font-medium text-muted-foreground">Mock punch preview (local only)</p>
          {clockInCheck && (
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium text-foreground">{clockInCheck.label}</p>
              <p className="mt-1 text-muted-foreground">
                Distance to branch centre (mock): <span className="font-mono text-foreground">{clockInCheck.distanceM} m</span>
              </p>
              <p className="text-muted-foreground">
                GPS accuracy (mock): <span className="font-mono text-foreground">±{clockInCheck.accuracyM} m</span>
              </p>
              <p className="mt-2">
                <Badge variant={clockInCheck.insideGeofence ? 'default' : 'destructive'}>
                  {clockInCheck.insideGeofence ? 'Inside geofence (mock)' : 'Outside geofence (mock)'}
                </Badge>
              </p>
            </div>
          )}
          {clockOutCheck && (
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium text-foreground">{clockOutCheck.label}</p>
              <p className="mt-1 text-muted-foreground">
                Distance to branch centre (mock): <span className="font-mono text-foreground">{clockOutCheck.distanceM} m</span>
              </p>
              <p className="text-muted-foreground">
                GPS accuracy (mock): <span className="font-mono text-foreground">±{clockOutCheck.accuracyM} m</span>
              </p>
              <p className="mt-2">
                <Badge variant={clockOutCheck.insideGeofence ? 'default' : 'destructive'}>
                  {clockOutCheck.insideGeofence ? 'Inside geofence (mock)' : 'Outside geofence (mock)'}
                </Badge>
              </p>
            </div>
          )}
          {!clockInCheck && (
            <p className="text-muted-foreground">Use Clock In above to record a mock shift, or run a real browser GPS check first — both stay on this device only.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 shrink-0" />
            Selfie proof (placeholder)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Selfie proof will be captured at clock-in (and optionally at clock-out per policy). This preview does not use the camera or upload files.
          </p>
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-xs">
            No image — mock only. No continuous background tracking; verification runs when you punch in or out.
          </div>
        </CardContent>
      </Card>

      <Card className={showPendingReview ? 'border-amber-500/50 bg-amber-500/5' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className={`h-4 w-4 shrink-0 ${showPendingReview ? 'text-amber-600' : 'text-muted-foreground'}`} />
            Exceptions &amp; review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {showPendingReview ? (
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Outside branch geofence on last check — would show as <strong>pending supervisor review</strong> after real GPS/geofence verification.
            </p>
          ) : (
            <p className="text-muted-foreground">
              No exception banner. If a punch fails GPS/geofence verification or policy checks, status can route to <strong>pending supervisor review</strong>.
            </p>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={demoOutsideGeofence}
              onChange={(e) => setDemoOutsideGeofence(e.target.checked)}
            />
            Demo: force outside geofence on next punch (still no real GPS)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent clock history (mock)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Complete a clock out to add a row. Stays on this device only.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
                  <p className="font-medium text-foreground">
                    In {formatDemoTime(h.clockInAt)} → Out {formatDemoTime(h.clockOutAt)}
                  </p>
                  <p className="mt-1 text-muted-foreground">{h.summary}</p>
                  {h.hadException && (
                    <Badge variant="outline" className="mt-2 border-amber-600 text-amber-800 dark:text-amber-200">
                      Would flag pending supervisor review
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" variant="outline" size="sm" onClick={handleReset} className="w-full sm:w-auto">
          Reset demo
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{DEMO_NOTE}</p>
    </div>
  );
}

function ReportingPlaceholderCard({ title, body }) {
  return (
    <Card className="border-muted-foreground/20 bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Monitor className="h-4 w-4 shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{body}</p>
        <p className="mt-2 text-xs">
          Staff punch stays <strong className="text-foreground">mobile-first</strong> with GPS/geofence verification at clock-in and clock-out. This dashboard area will stay desktop/laptop friendly for review and exports (future).
        </p>
      </CardContent>
    </Card>
  );
}

function BranchSupervisorOverview() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        title="Staff Time Clock"
        description="Branch oversight (fake demo data). Staff use mobile punch with GPS/geofence verification; reporting here is a preview only."
      />

      <ReportingPlaceholderCard
        title="HQ / supervisor reporting (placeholder)"
        body="Branch-level queues for late arrivals, missed clock-outs, and pending supervisor review will appear here. Not connected to Supabase in this mock."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Staff clocked in today</p>
            <p className="mt-1 text-3xl font-bold">12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Late arrivals</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">2</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Missed clock-outs</p>
            <p className="mt-1 text-3xl font-bold text-red-600">1</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending correction requests</p>
            <p className="mt-1 text-3xl font-bold">3</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo staff time entries (North branch)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 md:hidden">
            {BRANCH_STAFF_ROWS.map((row) => (
              <div key={row.name} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-sm text-muted-foreground">{row.role}</p>
                  </div>
                  <Badge variant="outline">{row.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  In {row.in} · Out {row.out}
                </p>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Staff</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Clock in</th>
                  <th className="py-2 pr-4 font-medium">Clock out</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {BRANCH_STAFF_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{row.name}</td>
                    <td className="py-2 pr-4">{row.role}</td>
                    <td className="py-2 pr-4">{row.in}</td>
                    <td className="py-2 pr-4">{row.out}</td>
                    <td className="py-2">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{DEMO_NOTE}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function HqOverview() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        title="Staff Time Clock"
        description="Organisation-wide view (fake demo data). Staff punches use GPS/geofence verification on mobile; this screen previews HQ-style reporting."
      />

      <ReportingPlaceholderCard
        title="Organisation reporting (placeholder)"
        body="Cross-branch summaries, exception queues, and exports will live here for desktop workflows. No live staff data in this mock."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total staff clock-ins today</p>
            <p className="mt-1 text-3xl font-bold">47</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Branches active</p>
            <p className="mt-1 text-3xl font-bold">5</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Late / missed clock-outs</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">6</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly hours preview</p>
            <p className="mt-1 text-3xl font-bold">3,240h</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo report — all branches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 lg:hidden">
            {HQ_STAFF_ROWS.map((row) => (
              <div key={`${row.branch}-${row.name}`} className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="font-medium">
                  {row.name} <span className="text-muted-foreground">· {row.branch}</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  In {row.in} · Out {row.out}
                </p>
                <p className="mt-1 text-sm">Hours (demo): {row.hours}</p>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Branch</th>
                  <th className="py-2 pr-4 font-medium">Staff</th>
                  <th className="py-2 pr-4 font-medium">Clock in</th>
                  <th className="py-2 pr-4 font-medium">Clock out</th>
                  <th className="py-2 font-medium">Hours (demo)</th>
                </tr>
              </thead>
              <tbody>
                {HQ_STAFF_ROWS.map((row) => (
                  <tr key={`${row.branch}-${row.name}`} className="border-b border-border/60">
                    <td className="py-2 pr-4">{row.branch}</td>
                    <td className="py-2 pr-4 font-medium">{row.name}</td>
                    <td className="py-2 pr-4">{row.in}</td>
                    <td className="py-2 pr-4">{row.out}</td>
                    <td className="py-2">{row.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{DEMO_NOTE}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffTimeClock() {
  const { role } = useOutletContext();

  if (role === ROLES.TEACHER) {
    return <TeacherClockDemo />;
  }
  if (role === ROLES.BRANCH_SUPERVISOR) {
    return <BranchSupervisorOverview />;
  }
  if (role === ROLES.HQ_ADMIN) {
    return <HqOverview />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Staff Time Clock" description="This area is for staff roles only." />
      <Card>
        <CardContent className="flex items-start gap-3 pt-6">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Parents and students do not have access to staff time data in this prototype. Use a teacher, branch supervisor, or HQ demo role to preview the Staff Time Clock.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

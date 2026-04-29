import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  requestCameraStream,
  captureSelfieBlob,
  stopCameraStream,
} from '@/services/selfieCaptureService';
import { clockInStaff, clockOutStaff } from '@/services/staffTimeClockService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { toast } from 'sonner';
import { AlertTriangle, Camera, Clock, Loader2, MapPin, Monitor, Timer } from 'lucide-react';

const DEMO_NOTE =
  'Demo role: mock shift only on this device. Signed-in (non-demo) with Supabase: GPS + selfie + Clock In / Clock Out write to staff_time_entries via clockInStaff / clockOutStaff.';

/** Placeholder branch centre for UI-only distance math until real `branches` lat/lng/radius are loaded from Supabase. Not a production coordinate. */
const DEMO_BRANCH_CENTRE_LABEL = 'Demo North Branch (placeholder coordinates)';
const DEMO_BRANCH_LAT = -33.8688;
const DEMO_BRANCH_LNG = 151.2093;
const DEMO_BRANCH_RADIUS_M = 150;

/** UUID v4-style (loose) for branch_id validation — avoids sending demo string ids to Supabase. */
function isUuidLike(value) {
  if (value == null || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

/**
 * Real clock-in needs a branch UUID (FK). Prefer `profiles.branch_id` from session user; optional dev-only
 * `VITE_STAFF_TIME_CLOCK_DEV_BRANCH_ID` when profile has no UUID (documented in mobile UI plan).
 */
function resolveBranchIdForSupabaseClockIn(user) {
  const fromProfile = user?.branch_id;
  if (isUuidLike(fromProfile)) return String(fromProfile).trim();
  const envId =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STAFF_TIME_CLOCK_DEV_BRANCH_ID) || '';
  if (isUuidLike(envId)) return String(envId).trim();
  return null;
}

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

function humanizeCameraError(error) {
  if (!error?.code) return error?.message || 'Camera error.';
  const hints = {
    PERMISSION_DENIED:
      'Camera permission denied. Allow camera for this site in your browser or system settings, then try Start Camera again.',
    NO_CAMERA: 'No camera was found on this device.',
    HARDWARE_ERROR: 'The camera could not be started. It may be in use by another app.',
    OVERCONSTRAINED: 'Camera constraints could not be satisfied. Try again or use another device.',
    UNSUPPORTED: 'This browser does not support camera access here. Mock Clock In/Out still works.',
    INSECURE_CONTEXT: 'Camera needs a secure (HTTPS) page. Mock shift controls still work.',
    CAPTURE_FAILED: error.message || 'Could not capture selfie.',
    UNKNOWN: error.message || 'Camera error.',
  };
  return hints[error.code] || error.message || 'Camera error.';
}

/**
 * Explicit user-action selfie capture. Parent holds `selfieBlob` for Supabase Clock In or Clock Out submit when applicable.
 * `supabaseSelfieSubmitTarget`: null = demo / no Supabase punch; otherwise which punch sends the blob.
 * Remount via key from parent to reset on full demo reset.
 */
function StaffSelfieCaptureSection({ selfieBlob, onSelfieBlobChange, supabaseSelfieSubmitTarget }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (selfieBlob) {
      const url = URL.createObjectURL(selfieBlob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [selfieBlob]);

  const revokePreviewOnly = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  const detachAndStopStream = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        stopCameraStream(streamRef.current);
        streamRef.current = null;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleStartCamera = async () => {
    setCameraError(null);
    setCameraStarting(true);
    detachAndStopStream();
    onSelfieBlobChange(null);
    revokePreviewOnly();

    const res = await requestCameraStream();
    setCameraStarting(false);
    if (res.error) {
      setCameraError(res.error);
      return;
    }
    streamRef.current = res.data.stream;
    const el = videoRef.current;
    if (el) {
      el.srcObject = res.data.stream;
      el.playsInline = true;
      el.muted = true;
      try {
        await el.play();
      } catch {
        /* autoplay policies; user may need interaction */
      }
    }
    setCameraActive(true);
  };

  const handleStopCamera = () => {
    setCameraError(null);
    detachAndStopStream();
  };

  const handleCapture = async () => {
    setCameraError(null);
    const el = videoRef.current;
    if (!el || !streamRef.current) {
      setCameraError({ code: 'CAPTURE_FAILED', message: 'Start the camera first.' });
      return;
    }
    setCapturing(true);
    const res = await captureSelfieBlob(el, { maxWidth: 720, fileName: 'selfie-preview.jpg' });
    setCapturing(false);
    if (res.error) {
      setCameraError(res.error);
      return;
    }
    onSelfieBlobChange(res.data.blob);
  };

  const handleRetake = () => {
    setCameraError(null);
    onSelfieBlobChange(null);
  };

  const handleClear = () => {
    setCameraError(null);
    onSelfieBlobChange(null);
    detachAndStopStream();
  };

  const showVideo = cameraActive && streamRef.current;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4 shrink-0" />
          Selfie proof (local preview)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Selfie proof</strong> for attendance is captured only when you use the buttons below.
          The camera does <strong className="text-foreground">not</strong> open automatically.{' '}
          {supabaseSelfieSubmitTarget === 'clock_out' ? (
            <>
              When you <strong className="text-foreground">Clock Out</strong> (signed-in, non-demo), this image is sent with that action only — not on capture.
            </>
          ) : supabaseSelfieSubmitTarget === 'clock_in' ? (
            <>
              When you <strong className="text-foreground">Clock In</strong> (signed-in, non-demo), this image is sent with that action only — not on capture.
            </>
          ) : (
            <>
              Demo mode: images stay on this device — <strong className="text-foreground">not uploaded</strong> when you use mock Clock In or Clock Out.
            </>
          )}
        </p>

        {cameraError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <p>{humanizeCameraError(cameraError)}</p>
            {cameraError.code && (
              <p className="mt-1 font-mono text-[10px] opacity-80">Code: {cameraError.code}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="lg"
            variant="default"
            className="min-h-12 w-full sm:min-w-[160px] sm:flex-1"
            disabled={cameraStarting}
            onClick={handleStartCamera}
          >
            {cameraStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              'Start camera'
            )}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="min-h-12 w-full sm:min-w-[160px] sm:flex-1"
            disabled={!cameraActive || cameraStarting || capturing}
            onClick={handleCapture}
          >
            {capturing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Capturing…
              </>
            ) : (
              'Capture selfie'
            )}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-h-12 w-full sm:min-w-[140px] sm:flex-1"
            disabled={!selfieBlob}
            onClick={handleRetake}
          >
            Retake
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-h-12 w-full sm:min-w-[140px] sm:flex-1"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="min-h-12 w-full sm:min-w-[140px] sm:flex-1"
            disabled={!cameraActive}
            onClick={handleStopCamera}
          >
            Stop camera
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Live preview</p>
          <video
            ref={videoRef}
            className="mx-auto aspect-video w-full max-h-64 rounded-md border bg-black object-cover"
            playsInline
            muted
            aria-label="Camera preview"
          />
          {!showVideo && !cameraStarting && (
            <p className="text-center text-xs text-muted-foreground">Tap Start camera to open the preview (user action only).</p>
          )}
        </div>

        {previewUrl && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">
              {supabaseSelfieSubmitTarget === 'clock_out'
                ? 'Captured preview (submitted only when you tap Clock Out)'
                : supabaseSelfieSubmitTarget === 'clock_in'
                  ? 'Captured preview (submitted only when you tap Clock In)'
                  : 'Captured preview (not submitted)'}
            </p>
            <img
              src={previewUrl}
              alt="Captured selfie preview"
              className="mx-auto max-h-64 w-full max-w-md rounded-md border object-contain"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeacherClockDemo() {
  const isDemoRole = Boolean(getSelectedDemoRole());
  const { user } = useOutletContext();
  const supabaseClockInActive = !isDemoRole && isSupabaseConfigured();
  const resolvedBranchId = useMemo(() => resolveBranchIdForSupabaseClockIn(user), [user]);

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
  const [selfieResetKey, setSelfieResetKey] = useState(0);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [clockInSubmitting, setClockInSubmitting] = useState(false);
  const [clockOutSubmitting, setClockOutSubmitting] = useState(false);
  const [supabaseOpenEntryId, setSupabaseOpenEntryId] = useState(null);

  const openSupabaseShift = Boolean(
    supabaseClockInActive && supabaseOpenEntryId && clockInAt && !clockOutAt,
  );
  const supabaseSelfieSubmitTarget = useMemo(() => {
    if (!supabaseClockInActive) return null;
    if (openSupabaseShift) return 'clock_out';
    return 'clock_in';
  }, [supabaseClockInActive, openSupabaseShift]);

  const statusLabel = useMemo(() => {
    if (!clockInAt) return 'Not clocked in';
    if (!clockOutAt) return `On shift — clocked in ${formatDemoTime(clockInAt)}`;
    return `Shift ended — clock out ${formatDemoTime(clockOutAt)}`;
  }, [clockInAt, clockOutAt]);

  const shiftSummary = useMemo(() => {
    if (!clockInAt || !clockOutAt) return null;
    const dur = formatDurationMinutes(clockInAt, clockOutAt);
    return dur ? `Shift length: ${dur}` : null;
  }, [clockInAt, clockOutAt]);

  const showPendingReview = demoOutsideGeofence || (clockInCheck && !clockInCheck.insideGeofence);

  const handleDemoClockIn = () => {
    if (clockInAt && !clockOutAt) return;
    const now = new Date().toISOString();
    const check = demoOutsideGeofence
      ? { distanceM: 182, accuracyM: 9, insideGeofence: false }
      : fakeGeofenceCheck();
    setClockInAt(now);
    setClockOutAt(null);
    setClockInCheck({ ...check, label: 'Clock-in location check' });
    setClockOutCheck(null);
    setSupabaseOpenEntryId(null);
  };

  const handleSupabaseClockIn = async () => {
    if (clockInAt && !clockOutAt) return;
    if (!supabaseClockInActive) {
      toast.error('Supabase is not configured. Use demo role for local-only clock in.');
      return;
    }
    const branchId = resolvedBranchId;
    if (!branchId) {
      toast.error(
        'No branch id for clock-in. Set branch_id on your Supabase profile (UUID), or set VITE_STAFF_TIME_CLOCK_DEV_BRANCH_ID in .env.local for dev only.',
      );
      return;
    }
    if (!liveClockInResult) {
      toast.error('Run “Check clock-in location (GPS)” first, then try Clock In.');
      return;
    }
    if (!Number.isFinite(Number(liveClockInResult.accuracyMeters))) {
      toast.error('GPS check did not return accuracy. Run the clock-in location check again.');
      return;
    }
    if (!selfieBlob) {
      toast.error('Capture selfie proof first, then try Clock In.');
      return;
    }
    const st = liveClockInResult.status;
    if (st === 'outside_geofence' || st === 'pending_review') {
      const ok = window.confirm(
        `Your GPS/geofence result is “${st}”. Submit clock-in for supervisor review anyway?`,
      );
      if (!ok) return;
    }

    setClockInSubmitting(true);
    try {
      const result = await clockInStaff({
        branchId,
        latitude: liveClockInResult.latitude,
        longitude: liveClockInResult.longitude,
        accuracyMeters: liveClockInResult.accuracyMeters,
        distanceMeters: liveClockInResult.distanceMeters,
        selfieFile: selfieBlob,
        fileName: 'clock-in-selfie.jpg',
        contentType: selfieBlob.type && selfieBlob.type !== '' ? selfieBlob.type : 'image/jpeg',
      });
      if (result.error) {
        toast.error(result.error.message || 'Clock-in failed.');
        return;
      }
      const entry = result.data?.entry;
      if (!entry?.clock_in_at) {
        toast.error('Clock-in succeeded but response was unexpected.');
        return;
      }
      toast.success('Clock in saved to Supabase.');
      setClockInAt(entry.clock_in_at);
      setClockOutAt(null);
      setSupabaseOpenEntryId(entry.id);
      setClockInCheck({
        distanceM: Math.round(Number(liveClockInResult.distanceMeters)),
        accuracyM: Math.round(Number(liveClockInResult.accuracyMeters)),
        insideGeofence: st === 'valid',
        label: 'Clock-in location check (submitted)',
      });
      setClockOutCheck(null);
      setSelfieBlob(null);
    } finally {
      setClockInSubmitting(false);
    }
  };

  const handleSupabaseClockOut = async () => {
    if (!clockInAt || clockOutAt) return;
    if (!supabaseClockInActive) {
      toast.error('Supabase is not configured.');
      return;
    }
    if (!supabaseOpenEntryId) {
      toast.error('Clock in with Supabase on this device first. If you already did, refresh may have cleared state — use Reset demo, then clock in again.');
      return;
    }
    if (!liveClockOutResult) {
      toast.error('Run “Check clock-out location (GPS)” first, then try Clock Out.');
      return;
    }
    if (!Number.isFinite(Number(liveClockOutResult.accuracyMeters))) {
      toast.error('GPS check did not return accuracy. Run the clock-out location check again.');
      return;
    }
    if (!selfieBlob) {
      toast.error('Capture selfie proof first, then try Clock Out.');
      return;
    }
    const st = liveClockOutResult.status;
    if (st === 'outside_geofence' || st === 'pending_review') {
      const ok = window.confirm(
        `Your clock-out GPS/geofence result is “${st}”. Submit clock-out for supervisor review anyway?`,
      );
      if (!ok) return;
    }

    setClockOutSubmitting(true);
    try {
      const result = await clockOutStaff({
        entryId: supabaseOpenEntryId,
        latitude: liveClockOutResult.latitude,
        longitude: liveClockOutResult.longitude,
        accuracyMeters: liveClockOutResult.accuracyMeters,
        distanceMeters: liveClockOutResult.distanceMeters,
        selfieFile: selfieBlob,
        fileName: 'clock-out-selfie.jpg',
        contentType: selfieBlob.type && selfieBlob.type !== '' ? selfieBlob.type : 'image/jpeg',
      });
      if (result.error) {
        toast.error(result.error.message || 'Clock-out failed.');
        return;
      }
      const entry = result.data?.entry;
      if (!entry?.clock_out_at) {
        toast.error('Clock-out succeeded but response was unexpected.');
        return;
      }
      toast.success('Clock out saved to Supabase.');
      const outIso = entry.clock_out_at;
      setClockOutAt(outIso);
      setSupabaseOpenEntryId(null);
      setClockOutCheck({
        distanceM: Math.round(Number(liveClockOutResult.distanceMeters)),
        accuracyM: Math.round(Number(liveClockOutResult.accuracyMeters)),
        insideGeofence: st === 'valid',
        label: 'Clock-out location check (submitted)',
      });
      setSelfieBlob(null);
      const dur = formatDurationMinutes(clockInAt, outIso);
      setHistory((prev) => {
        const row = {
          id: `${outIso}-${Math.random().toString(36).slice(2, 8)}`,
          clockInAt,
          clockOutAt: outIso,
          summary: dur ? `${dur} · Supabase clock-out` : 'Supabase clock-out',
          hadException: st === 'outside_geofence' || st === 'pending_review',
        };
        return [row, ...prev].slice(0, 5);
      });
    } finally {
      setClockOutSubmitting(false);
    }
  };

  const handleClockOut = () => {
    if (!clockInAt || clockOutAt) return;
    if (isDemoRole) {
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
      return;
    }
    void handleSupabaseClockOut();
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
    setSelfieBlob(null);
    setSupabaseOpenEntryId(null);
    setClockInSubmitting(false);
    setClockOutSubmitting(false);
    setSelfieResetKey((k) => k + 1);
  };

  const canClockIn = useMemo(() => {
    if (clockInSubmitting || clockOutSubmitting) return false;
    if (!( !clockInAt || clockOutAt )) return false;
    if (isDemoRole) return true;
    if (!supabaseClockInActive) return false;
    if (!resolvedBranchId) return false;
    if (!liveClockInResult) return false;
    if (!Number.isFinite(Number(liveClockInResult.accuracyMeters))) return false;
    if (!selfieBlob) return false;
    return true;
  }, [
    clockInSubmitting,
    clockInAt,
    clockOutAt,
    isDemoRole,
    supabaseClockInActive,
    resolvedBranchId,
    liveClockInResult,
    selfieBlob,
    clockOutSubmitting,
  ]);

  const canClockOut = useMemo(() => {
    if (!clockInAt || clockOutAt) return false;
    if (clockOutSubmitting || clockInSubmitting) return false;
    if (isDemoRole) return true;
    if (!supabaseClockInActive) return false;
    if (!supabaseOpenEntryId) return false;
    if (!liveClockOutResult) return false;
    if (!Number.isFinite(Number(liveClockOutResult.accuracyMeters))) return false;
    if (!selfieBlob) return false;
    return true;
  }, [
    clockInAt,
    clockOutAt,
    clockOutSubmitting,
    clockInSubmitting,
    isDemoRole,
    supabaseClockInActive,
    supabaseOpenEntryId,
    liveClockOutResult,
    selfieBlob,
  ]);

  const clockOutDisabledTitle =
    !isDemoRole && supabaseClockInActive && clockInAt && !clockOutAt && !supabaseOpenEntryId
      ? 'Clock in with Supabase on this device first (open entry required).'
      : undefined;

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
        description="Evidence-based attendance: demo role uses local mock punches only; signed-in (non-demo) with Supabase saves Clock In and Clock Out with explicit GPS checks + selfie per punch."
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

      {supabaseClockInActive && !resolvedBranchId && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          Signed-in Supabase clock-in needs a <strong>branch UUID</strong> on your profile (<code className="font-mono">branch_id</code>) or{' '}
          <code className="font-mono">VITE_STAFF_TIME_CLOCK_DEV_BRANCH_ID</code> in <code className="font-mono">.env.local</code> for dev. Placeholder map lat/lng alone are not enough.
        </p>
      )}
      {supabaseClockInActive && resolvedBranchId && !openSupabaseShift && (
        <p className="text-xs text-muted-foreground">
          Supabase <strong>Clock In</strong>: run <strong>Check clock-in location (GPS)</strong>, capture a <strong>selfie</strong>, then tap Clock In.
        </p>
      )}
      {supabaseClockInActive && openSupabaseShift && (
        <p className="text-xs text-muted-foreground">
          Supabase <strong>Clock Out</strong>: run <strong>Check clock-out location (GPS)</strong>, capture a new <strong>selfie</strong>, then tap Clock Out.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          size="lg"
          className="min-h-14 w-full flex-1 text-base sm:min-w-[200px]"
          onClick={() => {
            if (isDemoRole) handleDemoClockIn();
            else void handleSupabaseClockIn();
          }}
          disabled={!canClockIn}
        >
          {clockInSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Clock In'
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="min-h-14 w-full flex-1 text-base sm:min-w-[200px]"
          onClick={handleClockOut}
          disabled={!canClockOut}
          title={clockOutDisabledTitle}
        >
          {clockOutSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Clock Out'
          )}
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
              Uses your device location once per tap against the placeholder branch centre above (distance math only; persisted when you submit Clock In or Clock Out to Supabase). Camera is optional for demo; required for each signed-in non-demo punch.
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
            <p className="text-muted-foreground">
              Demo: use Clock In for a mock shift. Signed-in Supabase: run the clock-in GPS check and capture a selfie; mock punch preview below updates after a successful Clock In.
            </p>
          )}
        </CardContent>
      </Card>

      <StaffSelfieCaptureSection
        key={selfieResetKey}
        selfieBlob={selfieBlob}
        onSelfieBlobChange={setSelfieBlob}
        supabaseSelfieSubmitTarget={supabaseSelfieSubmitTarget}
      />

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

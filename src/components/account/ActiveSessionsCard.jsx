import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Shield } from 'lucide-react';
import { listMyAuthSessions } from '@/services/supabaseReadService';
import { getCurrentAuthSessionId } from '@/services/sessionGovernanceService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { isDebugModeEnabled } from '@/services/authService';
import { endOwnAuthSession } from '@/services/supabaseWriteService';

const STATUS_LABELS = {
  active: 'Active',
  signed_out: 'Signed out',
  timed_out: 'Timed out',
  revoked: 'Revoked',
};

function formatDateTime(value) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleString();
}

function formatInternalRef(sessionId) {
  if (!sessionId) return '';
  const normalized = String(sessionId).trim();
  if (!normalized) return '';
  return normalized.length <= 8 ? normalized : `...${normalized.slice(-8)}`;
}

function getDeviceLabel(row, isCurrentSession) {
  if (isCurrentSession) return 'Current browser';
  const safeLabel = typeof row?.safe_device_label === 'string' ? row.safe_device_label.trim() : '';
  return safeLabel || 'Browser session';
}

export default function ActiveSessionsCard({ className = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [endingSessionId, setEndingSessionId] = useState('');
  const debugMode = isDebugModeEnabled();
  const currentSessionId = useMemo(() => getCurrentAuthSessionId(), []);

  const loadSessions = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    setError('');
    const result = await listMyAuthSessions({ limit: 20 });
    if (result.error) {
      setError(result.error.message || 'Unable to load sessions right now.');
      setRows([]);
    } else {
      setRows(Array.isArray(result.data) ? result.data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadSessions();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEndSession = async (row) => {
    const sessionId = typeof row?.id === 'string' ? row.id.trim() : '';
    if (!sessionId) return;
    if (sessionId === currentSessionId) {
      setActionMessage('This browser session cannot be ended from here.');
      return;
    }
    const confirmed = window.confirm('End this session? This will require that browser to sign in again.');
    if (!confirmed) return;
    setEndingSessionId(sessionId);
    setActionMessage('');
    const result = await endOwnAuthSession({ sessionId, source: 'active_sessions_card' });
    if (result.error) {
      setActionMessage(result.error.message || 'Could not end this session right now. Please try again.');
    } else {
      setActionMessage('Session ended.');
      await loadSessions();
    }
    setEndingSessionId('');
  };

  return (
    <Card id="parent-account-security" className={className} role="region" aria-label="Account security">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Account security</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Active Sessions shows your recent sign-ins for this account. You can end older active sessions from here.
        </p>
        {!isSupabaseConfigured() ? (
          <p className="text-sm text-muted-foreground">Sign in with your parent account to view session activity.</p>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Loading your active sessions...</span>
          </div>
        ) : null}
        {!loading && error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {!loading && !error && actionMessage ? (
          <p className="text-sm text-muted-foreground">{actionMessage}</p>
        ) : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No session activity found yet.</p>
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((row) => {
              const statusLabel = STATUS_LABELS[row?.session_status] || 'Unknown';
              const isCurrentSession = Boolean(currentSessionId && row?.id === currentSessionId);
              const canEndSession = !isCurrentSession && row?.session_status === 'active';
              return (
                <div key={row?.id || `${row?.started_at || 'row'}-${row?.created_at || 'session'}`} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isCurrentSession ? 'default' : 'outline'}>
                      {isCurrentSession ? 'Current browser' : getDeviceLabel(row, isCurrentSession)}
                    </Badge>
                    <Badge variant="secondary">{statusLabel}</Badge>
                    <Badge variant="outline">
                      Remember me: {row?.remember_me_enabled ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>Started: {formatDateTime(row?.started_at)}</p>
                    <p>Last seen: {formatDateTime(row?.last_seen_at)}</p>
                  </div>
                  {debugMode ? (
                    <p className="text-[11px] text-muted-foreground">Session ref: {formatInternalRef(row?.id)}</p>
                  ) : null}
                  {canEndSession ? (
                    <div className="pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleEndSession(row)}
                        disabled={endingSessionId === row?.id}
                      >
                        {endingSessionId === row?.id ? 'Ending…' : 'End session'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

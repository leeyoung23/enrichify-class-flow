import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield } from 'lucide-react';
import { listMyAuthSessions } from '@/services/supabaseReadService';
import { getCurrentAuthSessionId } from '@/services/sessionGovernanceService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { isDebugModeEnabled } from '@/services/authService';

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
  const debugMode = isDebugModeEnabled();
  const currentSessionId = useMemo(() => getCurrentAuthSessionId(), []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      const result = await listMyAuthSessions({ limit: 20 });
      if (cancelled) return;
      if (result.error) {
        setError(result.error.message || 'Unable to load sessions right now.');
        setRows([]);
      } else {
        setRows(Array.isArray(result.data) ? result.data : []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          Active Sessions shows your recent sign-ins for this account. Revoke controls are intentionally not enabled in this phase.
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
        {!loading && !error && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No session activity found yet.</p>
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((row) => {
              const statusLabel = STATUS_LABELS[row?.session_status] || 'Unknown';
              const isCurrentSession = Boolean(currentSessionId && row?.id === currentSessionId);
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
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

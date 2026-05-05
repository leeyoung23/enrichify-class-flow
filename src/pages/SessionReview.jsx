import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { listAuthSessionsForAdmin } from '@/services/supabaseReadService';
import { isDebugModeEnabled } from '@/services/authService';
import { getCurrentAuthSessionId } from '@/services/sessionGovernanceService';
import { revokeAuthSession } from '@/services/supabaseWriteService';

const STATUS_FILTERS = ['all', 'active', 'signed_out', 'timed_out', 'revoked'];
const ROLE_FILTERS = ['all', 'hq_admin', 'branch_supervisor', 'teacher', 'parent', 'student'];

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

function formatRef(value) {
  if (!value || typeof value !== 'string') return '—';
  const normalized = value.trim();
  if (!normalized) return '—';
  return normalized.length <= 8 ? normalized : `...${normalized.slice(-8)}`;
}

export default function SessionReview() {
  const { user } = useOutletContext();
  const role = user?.role || null;
  const debugMode = isDebugModeEnabled();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [revokingSessionId, setRevokingSessionId] = useState('');

  const canAccess = role === 'hq_admin';
  const currentSessionId = useMemo(() => getCurrentAuthSessionId(), []);

  const isStaffRole = (value) => value === 'teacher' || value === 'branch_supervisor';
  const canRevokeRow = (row) => {
    if (!canAccess) return false;
    if (!row || row.session_status !== 'active') return false;
    if (!isStaffRole(row.role)) return false;
    if (row.id === currentSessionId) return false;
    return true;
  };

  const loadSessions = async () => {
    if (!canAccess) return;
    setLoading(true);
    setError('');
    setActionError('');
    const result = await listAuthSessionsForAdmin({
      status: statusFilter === 'all' ? null : statusFilter,
      limit: 300,
    });
    if (result.error) {
      setRows([]);
      setError(result.error.message || 'Session review is temporarily unavailable.');
    } else {
      setRows(Array.isArray(result.data) ? result.data : []);
    }
    setLoading(false);
  };

  const handleRevokeSession = async (row) => {
    if (!canRevokeRow(row)) return;
    const sessionId = typeof row?.id === 'string' ? row.id.trim() : '';
    if (!sessionId) return;
    const confirmed = window.confirm('Revoke this staff session? The user may need to sign in again on that browser.');
    if (!confirmed) return;
    setRevokingSessionId(sessionId);
    setActionError('');
    setActionMessage('');
    const result = await revokeAuthSession({
      sessionId,
      reason: 'hq_revoked_staff_session',
      source: 'session_review',
      targetRole: row?.role || null,
    });
    if (result.error) {
      setActionError('Could not revoke that session right now. Please try again.');
    } else {
      setActionMessage('Session revoked.');
      await loadSessions();
    }
    setRevokingSessionId('');
  };

  useEffect(() => {
    void loadSessions();
  }, [canAccess, statusFilter]);

  const filteredRows = useMemo(() => {
    if (roleFilter === 'all') return rows;
    return rows.filter((row) => row?.role === roleFilter);
  }, [rows, roleFilter]);

  if (!canAccess) {
    return (
      <EmptyState
        icon={Shield}
        title="Access restricted"
        description="Session Review is available only to HQ Admin."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Session Review"
        description="HQ session visibility with staff revoke controls for active teacher/supervisor sessions only."
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === 'all' ? 'All statuses' : STATUS_LABELS[value] || value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Role</p>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === 'all' ? 'All roles' : value.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}
      {!loading && !error && actionError ? (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{actionError}</p>
          </CardContent>
        </Card>
      ) : null}
      {!loading && !error && actionMessage ? (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{actionMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && filteredRows.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No sessions match the current filters.</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && filteredRows.length > 0 ? (
        <div className="space-y-3">
          {filteredRows.map((row) => {
            const statusLabel = STATUS_LABELS[row?.session_status] || 'Unknown';
            return (
              <Card key={row?.id || `${row?.started_at || 'row'}-${row?.created_at || 'session'}`}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{row?.role || 'unknown'}</Badge>
                    <Badge variant="secondary">{statusLabel}</Badge>
                    <Badge variant="outline">Remember me: {row?.remember_me_enabled ? 'On' : 'Off'}</Badge>
                    <Badge variant="outline">{row?.safe_device_label?.trim() || 'Browser session'}</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>Started: {formatDateTime(row?.started_at)}</p>
                    <p>Last seen: {formatDateTime(row?.last_seen_at)}</p>
                    <p>Signed out: {formatDateTime(row?.signed_out_at)}</p>
                    <p>Timed out: {formatDateTime(row?.timed_out_at)}</p>
                    <p>Revoked: {formatDateTime(row?.revoked_at)}</p>
                  </div>
                  {debugMode ? (
                    <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                      <p>Session ref: {formatRef(row?.id)}</p>
                      <p>Profile ref: {formatRef(row?.profile_id)}</p>
                      <p>Branch ref: {formatRef(row?.branch_id)}</p>
                    </div>
                  ) : null}
                  {canRevokeRow(row) ? (
                    <div className="pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevokeSession(row)}
                        disabled={revokingSessionId === row?.id}
                      >
                        {revokingSessionId === row?.id ? 'Revoking…' : 'Revoke session'}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

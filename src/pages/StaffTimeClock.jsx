import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLES } from '@/services/permissionService';
import { Clock, Timer } from 'lucide-react';

const DEMO_NOTE =
  'Demo only — real staff attendance will be saved to Supabase after auth/write phase.';

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

function TeacherClockDemo() {
  const [clockInAt, setClockInAt] = useState(null);
  const [clockOutAt, setClockOutAt] = useState(null);

  const statusLabel = useMemo(() => {
    if (!clockInAt) return 'Not clocked in';
    if (!clockOutAt) return `Clocked in at ${formatDemoTime(clockInAt)}`;
    return `Clocked out at ${formatDemoTime(clockOutAt)}`;
  }, [clockInAt, clockOutAt]);

  const handleClockIn = () => {
    if (clockInAt && !clockOutAt) return;
    const now = new Date().toISOString();
    setClockInAt(now);
    setClockOutAt(null);
  };

  const handleClockOut = () => {
    if (!clockInAt || clockOutAt) return;
    setClockOutAt(new Date().toISOString());
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Time Clock" description="Track your shift (prototype — local demo state only)." />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />
            My shift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleClockIn} disabled={Boolean(clockInAt) && !clockOutAt}>
              Clock In
            </Button>
            <Button type="button" variant="secondary" onClick={handleClockOut} disabled={!clockInAt || Boolean(clockOutAt)}>
              Clock Out
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setClockInAt(null);
                setClockOutAt(null);
              }}
            >
              Reset demo
            </Button>
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Demo status</p>
            <p className="text-muted-foreground mt-1">{statusLabel}</p>
          </div>
          <p className="text-xs text-muted-foreground">{DEMO_NOTE}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function BranchSupervisorOverview() {
  return (
    <div className="space-y-6">
      <PageHeader title="Staff Time Clock" description="Branch staff time overview (fake demo data)." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Staff clocked in today</p><p className="text-3xl font-bold mt-1">12</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Late arrivals</p><p className="text-3xl font-bold mt-1 text-amber-600">2</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Missed clock-outs</p><p className="text-3xl font-bold mt-1 text-red-600">1</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pending correction requests</p><p className="text-3xl font-bold mt-1">3</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo staff time entries (North branch)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                  <td className="py-2"><Badge variant="outline">{row.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-4">{DEMO_NOTE}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function HqOverview() {
  return (
    <div className="space-y-6">
      <PageHeader title="Staff Time Clock" description="Organisation-wide staff time (fake demo data)." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total staff clock-ins today</p><p className="text-3xl font-bold mt-1">47</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Branches active</p><p className="text-3xl font-bold mt-1">5</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Late / missed clock-outs</p><p className="text-3xl font-bold mt-1 text-amber-600">6</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Monthly hours preview</p><p className="text-3xl font-bold mt-1">3,240h</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Demo report — all branches</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
          <p className="text-xs text-muted-foreground mt-4">{DEMO_NOTE}</p>
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
        <CardContent className="pt-6 flex items-start gap-3">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Parents and students do not have access to staff time data in this prototype. Use a teacher, branch supervisor, or HQ demo role to preview the Staff Time Clock.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarRange } from 'lucide-react';
import { getTrialSchedules } from '@/services/dataService';

const STATUS_STYLES = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  scheduled: 'bg-purple-100 text-purple-700 border-purple-200',
  attended: 'bg-green-100 text-green-700 border-green-200',
  'no-show': 'bg-amber-100 text-amber-700 border-amber-200',
  enrolled: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'not converted': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function TrialScheduling() {
  const { user } = useOutletContext();
  const role = user?.role;
  const canAccess = role === 'hq_admin' || role === 'branch_supervisor' || role === 'teacher';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const trials = useMemo(() => getTrialSchedules(user), [user]);

  const filtered = trials.filter((item) => {
    const matchesSearch = [item.child_name, item.parent_name, item.interested_programme, item.preferred_branch_name]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = status === 'all' || item.trial_status === status;
    return matchesSearch && matchesStatus;
  });

  if (!canAccess) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={role === 'teacher' ? 'My Trial Classes' : 'Trial Scheduling'}
        description={role === 'teacher' ? 'See only your assigned trial classes using demo data only.' : role === 'branch_supervisor' ? 'Demo-only branch trial scheduling, upcoming trials, and follow-up tracking.' : 'Demo-only all-branch trial scheduling and follow-up tracking.'}
      />

      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search child, parent, programme, or branch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="attended">Attended</SelectItem>
              <SelectItem value="no-show">No-show</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="not converted">Not converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Trials in view</p><p className="text-2xl font-bold mt-1">{filtered.length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Upcoming trials</p><p className="text-2xl font-bold mt-1">{filtered.filter((item) => item.trial_status === 'scheduled' || item.trial_status === 'new').length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Attended</p><p className="text-2xl font-bold mt-1">{filtered.filter((item) => item.trial_status === 'attended').length}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Needs follow-up</p><p className="text-2xl font-bold mt-1">{filtered.filter((item) => item.next_follow_up_date).length}</p></Card>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No trial schedules found"
          description="Adjust the filters or add demo trial records to review scheduling workflow."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-semibold">{item.child_name}</p>
                    <span className="text-sm text-muted-foreground">— Parent: {item.parent_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[item.trial_status]}`}>
                      {item.trial_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 text-sm text-muted-foreground">
                    <p>Phone: {item.parent_phone || '—'}</p>
                    <p>Email: {item.parent_email || '—'}</p>
                    <p>Programme: {item.interested_programme}</p>
                    <p>Branch: {item.preferred_branch_name}</p>
                    <p>Date: {item.trial_class_date}</p>
                    <p>Time: {item.trial_class_time}</p>
                    <p>Teacher: {item.assigned_teacher_name}</p>
                    <p>Next follow-up: {item.next_follow_up_date || '—'}</p>
                  </div>
                  {item.follow_up_note && (
                    <p className="text-xs text-muted-foreground mt-3 italic">{item.follow_up_note}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
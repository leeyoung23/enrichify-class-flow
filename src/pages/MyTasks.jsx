import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getSelectedDemoRole, normalizeRole } from '@/services/authService';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing } from 'lucide-react';
import { getTeacherNotifications, listTeacherNotifications } from '@/services/dataService';
import { updateTeacherTaskAssignmentStatus } from '@/services/supabaseWriteService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';

const STATUS_STYLES = {
  pending: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-amber-100 text-amber-700 border-amber-200',
};

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-orange-100 text-orange-700 border-orange-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function MyTasks() {
  const { user, role: outletRole } = useOutletContext();
  const demoRole = getSelectedDemoRole();
  const role = demoRole || outletRole || normalizeRole(user?.role);
  const { session, appUser, isSupabaseAuthAvailable } = useSupabaseAuthState();
  const canAccess = role === 'teacher' || role === 'branch_supervisor' || role === 'hq_admin';
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(() => getTeacherNotifications(user));
  const [loadingItems, setLoadingItems] = useState({});
  const [feedback, setFeedback] = useState(null);
  const loadNotifications = useCallback(async () => {
    if (demoRole) {
      setNotifications(getTeacherNotifications(user));
      return;
    }
    const next = await listTeacherNotifications(user);
    setNotifications(next);
  }, [demoRole, user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const overview = useMemo(() => ({
    pending: notifications.filter((item) => item.status === 'pending').length,
    completed: notifications.filter((item) => item.status === 'completed').length,
    overdue: notifications.filter((item) => item.status === 'overdue').length,
  }), [notifications]);
  const visibleNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((item) => item.status === filter);
  }, [notifications, filter]);

  const handleMarkComplete = useCallback(async (item) => {
    if (demoRole) {
      setFeedback({ type: 'info', text: 'Demo preview mode stays local and does not write to Supabase.' });
      return;
    }
    if (!isSupabaseAuthAvailable || !session?.user || !appUser) {
      setFeedback({ type: 'error', text: 'Task update requires an authenticated Supabase session.' });
      return;
    }
    if (!item?.assignmentId) {
      setFeedback({ type: 'error', text: 'Task assignment id is not available for this item.' });
      return;
    }

    setLoadingItems((prev) => ({ ...prev, [item.id]: true }));
    setFeedback(null);
    const completedAt = new Date().toISOString();
    const { data, error } = await updateTeacherTaskAssignmentStatus({
      assignmentId: item.assignmentId,
      status: 'completed',
      completedAt,
    });

    if (error || !data) {
      setFeedback({ type: 'error', text: error?.message || 'Could not mark this task complete.' });
      setLoadingItems((prev) => ({ ...prev, [item.id]: false }));
      return;
    }

    setNotifications((prev) => prev.map((row) => (
      row.id === item.id
        ? { ...row, status: 'completed', completed_at: completedAt }
        : row
    )));
    setFeedback({ type: 'success', text: 'Task marked complete.' });
    await loadNotifications();
    setLoadingItems((prev) => ({ ...prev, [item.id]: false }));
  }, [appUser, demoRole, isSupabaseAuthAvailable, loadNotifications, session]);

  if (!canAccess) {
    return (
      <EmptyState
        icon={BellRing}
        title="Access restricted"
        description="This page is not available for the current demo role."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="My Tasks"
        description={role === 'teacher' ? 'See your pending, completed, and overdue teacher tasks using demo data only.' : 'Demo-only task reminders and completion tracking.'}
      />
      {feedback && (
        <p className={`text-sm mb-4 ${feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} role="status">
          {feedback.text}
        </p>
      )}

      {role !== 'teacher' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5"><p className="text-sm text-muted-foreground">Pending</p><p className="text-3xl font-bold mt-1">{overview.pending}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">Completed</p><p className="text-3xl font-bold mt-1">{overview.completed}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">Overdue</p><p className="text-3xl font-bold mt-1">{overview.overdue}</p></Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>Pending</Button>
        <Button variant={filter === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('completed')}>Completed</Button>
        <Button variant={filter === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('overdue')}>Overdue</Button>
      </div>

      {visibleNotifications.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No task notifications"
          description="No pending teacher task notifications are available right now."
        />
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-0 grid gap-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">Related: {item.related_label || '—'}</p>
                  <p className="text-sm text-muted-foreground">Due: {item.due_label}</p>
                  {item.teacher_name && role !== 'teacher' && (
                    <p className="text-xs text-muted-foreground">Teacher: {item.teacher_name}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[item.status]}`}>{item.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[item.priority]}`}>{item.priority}</span>
                  {role === 'teacher' && item.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(loadingItems[item.id])}
                      onClick={() => { void handleMarkComplete(item); }}
                    >
                      {loadingItems[item.id] ? 'Saving…' : 'Mark Complete'}
                    </Button>
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
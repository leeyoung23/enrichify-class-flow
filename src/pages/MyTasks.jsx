import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getSelectedDemoRole, normalizeRole } from '@/services/authService';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing } from 'lucide-react';
import { getTeacherNotifications, listTeacherNotifications } from '@/services/dataService';
import { updateTeacherTaskAssignmentStatus } from '@/services/supabaseWriteService';
import { listMyAnnouncementTasks } from '@/services/supabaseReadService';
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

const ANNOUNCEMENT_STATUS_STYLES = {
  unread: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  undone: 'bg-orange-100 text-orange-700 border-orange-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const ANNOUNCEMENT_PRIORITY_STYLES = {
  urgent: 'bg-rose-100 text-rose-700 border-rose-200',
  high: 'bg-red-100 text-red-700 border-red-200',
  normal: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

function formatClassroomTaskStatusLabel(status) {
  const map = {
    pending: 'To do',
    completed: 'Done',
    overdue: 'Overdue',
    in_progress: 'In progress',
  };
  return map[status] ?? status ?? '—';
}

function formatClassroomTaskPriorityLabel(priority) {
  const map = {
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Low priority',
  };
  return map[priority] ?? priority ?? '—';
}

function formatAnnouncementStatusLabel(status) {
  const map = {
    pending: 'To do',
    unread: 'New',
    undone: 'Action needed',
    overdue: 'Overdue',
    done: 'Done',
    completed: 'Done',
  };
  return map[status] ?? status ?? '—';
}

function formatAnnouncementPriorityLabel(priority) {
  const map = {
    urgent: 'Urgent',
    high: 'High priority',
    normal: 'Normal',
    low: 'Low priority',
  };
  return map[priority] ?? priority ?? '—';
}

/** Display-only label for the announcement card primary button; navigation is unchanged. */
function getAnnouncementPrimaryActionLabel(task) {
  if (task?.status === 'done') return 'View in Announcements';
  if (task?.requiresUpload && !task?.uploadProvided) return 'Upload in Announcements';
  if (task?.requiresResponse && !task?.responseProvided) return 'Reply in Announcements';
  return 'Open in Announcements';
}

function partitionAnnouncementTasksForDisplay(tasks) {
  const uploadNeeded = [];
  const replyNeeded = [];
  const needsAction = [];
  const completed = [];
  for (const task of tasks) {
    if (task.status === 'done') {
      completed.push(task);
      continue;
    }
    if (task.requiresUpload && !task.uploadProvided) {
      uploadNeeded.push(task);
      continue;
    }
    if (task.requiresResponse && !task.responseProvided) {
      replyNeeded.push(task);
      continue;
    }
    needsAction.push(task);
  }
  return { uploadNeeded, replyNeeded, needsAction, completed };
}

const DEMO_ANNOUNCEMENT_TASKS = [
  {
    taskId: 'demo-ann-task-1',
    announcementId: 'demo-announcement-unread',
    source: 'announcement',
    title: 'Unread HQ request: weekly tracker check',
    bodyPreview: 'Please review this week tracker summary and confirm gaps.',
    priority: 'high',
    dueDate: '2026-05-06',
    status: 'unread',
    isOverdue: false,
    requiresResponse: true,
    responseProvided: false,
    requiresUpload: false,
    uploadProvided: false,
    replyCount: 0,
    attachmentCount: 1,
    actionUrl: '/announcements',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
  },
  {
    taskId: 'demo-ann-task-2',
    announcementId: 'demo-announcement-upload',
    source: 'announcement',
    title: 'Upload required: branch monthly evidence',
    bodyPreview: 'Upload class evidence file to complete this request.',
    priority: 'normal',
    dueDate: '2026-05-08',
    status: 'pending',
    isOverdue: false,
    requiresResponse: false,
    responseProvided: false,
    requiresUpload: true,
    uploadProvided: false,
    replyCount: 0,
    attachmentCount: 0,
    actionUrl: '/announcements',
    createdAt: '2026-05-01T08:30:00.000Z',
    updatedAt: '2026-05-01T08:30:00.000Z',
  },
  {
    taskId: 'demo-ann-task-3',
    announcementId: 'demo-announcement-response',
    source: 'announcement',
    title: 'Response required: student progress confirmation',
    bodyPreview: 'Reply with summary notes for assigned students.',
    priority: 'high',
    dueDate: '2026-05-09',
    status: 'undone',
    isOverdue: false,
    requiresResponse: true,
    responseProvided: false,
    requiresUpload: false,
    uploadProvided: false,
    replyCount: 1,
    attachmentCount: 0,
    actionUrl: '/announcements',
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:10:00.000Z',
  },
  {
    taskId: 'demo-ann-task-4',
    announcementId: 'demo-announcement-overdue',
    source: 'announcement',
    title: 'Overdue request: missing follow-up evidence',
    bodyPreview: 'This request is overdue and still missing required upload.',
    priority: 'urgent',
    dueDate: '2026-04-28',
    status: 'overdue',
    isOverdue: true,
    requiresResponse: true,
    responseProvided: true,
    requiresUpload: true,
    uploadProvided: false,
    replyCount: 2,
    attachmentCount: 1,
    actionUrl: '/announcements',
    createdAt: '2026-04-26T10:00:00.000Z',
    updatedAt: '2026-05-01T08:55:00.000Z',
  },
  {
    taskId: 'demo-ann-task-5',
    announcementId: 'demo-announcement-done',
    source: 'announcement',
    title: 'Completed request: meeting summary submitted',
    bodyPreview: 'Response and upload were provided; lifecycle marked done.',
    priority: 'low',
    dueDate: '2026-05-03',
    status: 'done',
    isOverdue: false,
    requiresResponse: true,
    responseProvided: true,
    requiresUpload: true,
    uploadProvided: true,
    replyCount: 1,
    attachmentCount: 2,
    actionUrl: '/announcements',
    createdAt: '2026-04-30T14:00:00.000Z',
    updatedAt: '2026-05-01T07:45:00.000Z',
  },
];

export default function MyTasks() {
  const navigate = useNavigate();
  const { user, role: outletRole } = useOutletContext();
  const demoRole = getSelectedDemoRole();
  const role = demoRole || outletRole || normalizeRole(user?.role);
  const { session, appUser, isSupabaseAuthAvailable } = useSupabaseAuthState();
  const canAccess = role === 'teacher' || role === 'branch_supervisor' || role === 'hq_admin';
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(() => getTeacherNotifications(user));
  const [loadingItems, setLoadingItems] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [announcementTasks, setAnnouncementTasks] = useState([]);
  const [announcementTasksLoading, setAnnouncementTasksLoading] = useState(false);
  const [announcementTasksError, setAnnouncementTasksError] = useState('');
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

  const loadAnnouncementTasks = useCallback(async () => {
    if (demoRole) {
      setAnnouncementTasks(DEMO_ANNOUNCEMENT_TASKS);
      setAnnouncementTasksError('');
      setAnnouncementTasksLoading(false);
      return;
    }

    if (!isSupabaseAuthAvailable || !session?.user || !appUser) {
      setAnnouncementTasks([]);
      setAnnouncementTasksError('Announcements require an authenticated staff session.');
      setAnnouncementTasksLoading(false);
      return;
    }

    setAnnouncementTasksLoading(true);
    setAnnouncementTasksError('');
    const { data, error } = await listMyAnnouncementTasks({ includeDone: true });
    if (error) {
      setAnnouncementTasks([]);
      setAnnouncementTasksError('Announcement requests are temporarily unavailable.');
      setAnnouncementTasksLoading(false);
      return;
    }
    setAnnouncementTasks(Array.isArray(data) ? data : []);
    setAnnouncementTasksLoading(false);
  }, [appUser, demoRole, isSupabaseAuthAvailable, session]);

  useEffect(() => {
    void loadAnnouncementTasks();
  }, [loadAnnouncementTasks]);

  const overview = useMemo(() => ({
    pending: notifications.filter((item) => item.status === 'pending').length,
    completed: notifications.filter((item) => item.status === 'completed').length,
    overdue: notifications.filter((item) => item.status === 'overdue').length,
  }), [notifications]);
  const visibleNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((item) => item.status === filter);
  }, [notifications, filter]);

  const announcementOverview = useMemo(() => ({
    total: announcementTasks.length,
    pending: announcementTasks.filter((item) => item.status === 'pending' || item.status === 'unread' || item.status === 'undone').length,
    overdue: announcementTasks.filter((item) => item.status === 'overdue').length,
    done: announcementTasks.filter((item) => item.status === 'done').length,
  }), [announcementTasks]);

  const announcementGroups = useMemo(
    () => partitionAnnouncementTasksForDisplay(announcementTasks),
    [announcementTasks]
  );

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
        description={
          role === 'teacher'
            ? 'Two areas below: reminders for your classes, and HQ requests that come through Announcements. Nothing here emails parents or sends notifications by itself — you choose when to act in each area.'
            : 'Staff task overview — demo/local preview where noted.'
        }
      />
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-medium text-foreground">Class and task reminders</span> are your everyday checklist.{' '}
        <span className="font-medium text-foreground">HQ requests</span> live under Announcements — start with uploads and replies there, then other actions, and use Done when you need history.
      </p>
      {feedback && (
        <p className={`text-sm mb-4 ${feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} role="status">
          {feedback.text}
        </p>
      )}

      {role !== 'teacher' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5"><p className="text-sm text-muted-foreground">To do</p><p className="text-3xl font-bold mt-1">{overview.pending}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">Done</p><p className="text-3xl font-bold mt-1">{overview.completed}</p></Card>
          <Card className="p-5"><p className="text-sm text-muted-foreground">Overdue</p><p className="text-3xl font-bold mt-1">{overview.overdue}</p></Card>
        </div>
      )}

      <h2 className="text-base font-semibold text-foreground mb-3">Class and task reminders</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>To do</Button>
        <Button variant={filter === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('completed')}>Done</Button>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[item.status]}`}>{formatClassroomTaskStatusLabel(item.status)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[item.priority]}`}>{formatClassroomTaskPriorityLabel(item.priority)}</span>
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

      <div className="mt-8">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">HQ requests (Announcements)</p>
              <p className="text-xs text-muted-foreground">
                Open a request to upload, reply, or wrap up what HQ asked for — same place as Announcements.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Total {announcementOverview.total}</Badge>
              <Badge variant="outline">To do {announcementOverview.pending}</Badge>
              <Badge variant="outline">Overdue {announcementOverview.overdue}</Badge>
              <Badge variant="outline">Done {announcementOverview.done}</Badge>
            </div>
          </div>
        </Card>

        {announcementTasksLoading ? (
          <Card className="p-5 mt-3">
            <p className="text-sm text-muted-foreground">Loading announcement requests...</p>
          </Card>
        ) : null}

        {!announcementTasksLoading && announcementTasksError ? (
          <Card className="p-5 mt-3 border-dashed">
            <p className="text-sm text-muted-foreground">{announcementTasksError}</p>
          </Card>
        ) : null}

        {!announcementTasksLoading && !announcementTasksError && announcementTasks.length === 0 ? (
          <Card className="p-5 mt-3 border-dashed">
            <p className="text-sm text-muted-foreground">No announcement requests right now.</p>
          </Card>
        ) : null}

        {!announcementTasksLoading && !announcementTasksError && announcementTasks.length > 0 ? (
          <div className="space-y-8 mt-3">
            {[
              {
                key: 'upload',
                title: 'Upload files',
                subtitle: 'Attach what HQ asked for, then continue.',
                items: announcementGroups.uploadNeeded,
              },
              {
                key: 'reply',
                title: 'Reply to HQ',
                subtitle: 'Add your comment or confirmation in Announcements.',
                items: announcementGroups.replyNeeded,
              },
              {
                key: 'action',
                title: 'Other action needed',
                subtitle: 'Read or finish these next.',
                items: announcementGroups.needsAction,
              },
              {
                key: 'done',
                title: 'Done',
                subtitle: 'Finished requests for your records.',
                items: announcementGroups.completed,
              },
            ].map((section) => (
              section.items.length ? (
                <div key={section.key} className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                  </div>
                  <div className="space-y-3">
                    {section.items.map((task) => (
                      <Card key={`${section.key}-${task.taskId || task.announcementId}`} className="p-4 sm:p-5 border-muted">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium">{task.title || 'Announcement request'}</p>
                              {task.bodyPreview ? (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.bodyPreview}</p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">Announcement</Badge>
                              <Badge variant="outline" className={ANNOUNCEMENT_PRIORITY_STYLES[task.priority] || ANNOUNCEMENT_PRIORITY_STYLES.normal}>
                                {formatAnnouncementPriorityLabel(task.priority || 'normal')}
                              </Badge>
                              <Badge variant="outline" className={ANNOUNCEMENT_STATUS_STYLES[task.status] || ANNOUNCEMENT_STATUS_STYLES.pending}>
                                {formatAnnouncementStatusLabel(task.status || 'pending')}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {task.dueDate ? <Badge variant="outline">Due {task.dueDate}</Badge> : null}
                            {task.requiresResponse ? (
                              <Badge variant="outline">{task.responseProvided ? 'Replied' : 'Awaiting reply'}</Badge>
                            ) : null}
                            {task.requiresUpload ? (
                              <Badge variant="outline">{task.uploadProvided ? 'Uploaded' : 'Not uploaded yet'}</Badge>
                            ) : null}
                            <Badge variant="outline">Replies {task.replyCount || 0}</Badge>
                            <Badge variant="outline">Attachments {task.attachmentCount || 0}</Badge>
                          </div>

                          <div>
                            <Button
                              size="sm"
                              className="min-h-10 w-full sm:w-auto"
                              onClick={() => {
                                const targetUrl = typeof task.actionUrl === 'string' && task.actionUrl.trim() ? task.actionUrl : '/announcements';
                                navigate(targetUrl, { state: { announcementId: task.announcementId || null } });
                              }}
                            >
                              {getAnnouncementPrimaryActionLabel(task)}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
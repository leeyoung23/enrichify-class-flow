import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { BellRing, MessageSquare, Megaphone } from 'lucide-react';
import { getSelectedDemoRole } from '@/services/authService';
import { ROLES, getRole } from '@/services/permissionService';

const FILTERS = ['Requests', 'Company News', 'Done', 'Pending'];

const DEMO_ANNOUNCEMENTS = [
  {
    id: 'demo-ann-1',
    type: 'request',
    title: 'Upload weekly reading tracker',
    subtitle: 'North Branch Year 5',
    body: 'Please upload this week reading tracker for your assigned students before Friday 5PM.',
    priority: 'high',
    dueDate: '2026-05-05',
    status: 'pending',
    branchLabel: 'Demo North Branch',
    requiresResponse: true,
    requiresUpload: false,
    targetLabel: 'Teachers · Demo North Branch',
    visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [
      { id: 'r-1', author: 'Supervisor Demo User', message: 'Please prioritise students with overdue reading logs.' },
    ],
  },
  {
    id: 'demo-ann-2',
    type: 'request',
    title: 'Parent meeting summary reminder',
    subtitle: 'Follow-up requested',
    body: 'Submit short parent meeting summary notes for all scheduled sessions this week.',
    priority: 'normal',
    dueDate: '2026-05-08',
    status: 'read',
    branchLabel: 'Demo North Branch',
    requiresResponse: true,
    requiresUpload: true,
    targetLabel: 'Teacher profile target',
    visibleTo: [ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [],
  },
  {
    id: 'demo-ann-3',
    type: 'company_news',
    title: 'Company News placeholder',
    subtitle: 'Warm update mode arrives in Phase 3',
    body: 'Company News and warm portal pop-up behavior are planned for Phase 3. This is a placeholder card only.',
    priority: 'low',
    dueDate: null,
    status: 'done',
    branchLabel: 'Global',
    requiresResponse: false,
    requiresUpload: false,
    targetLabel: 'All staff',
    visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [],
  },
];

function statusTone(status) {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'undone') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (status === 'read') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function priorityTone(priority) {
  if (priority === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (priority === 'urgent') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (priority === 'low') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

export default function Announcements() {
  const { user } = useOutletContext();
  const selectedDemoRole = getSelectedDemoRole();
  const role = selectedDemoRole || getRole(user);
  const isDemoMode = Boolean(selectedDemoRole);
  const isStaff = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR || role === ROLES.TEACHER;
  const canCreateInDemo = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;

  const [activeFilter, setActiveFilter] = useState('Requests');
  const [rows, setRows] = useState(() => DEMO_ANNOUNCEMENTS);
  const [selectedId, setSelectedId] = useState(DEMO_ANNOUNCEMENTS[0]?.id || '');
  const [draftReply, setDraftReply] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    subtitle: '',
    body: '',
    priority: 'normal',
    dueDate: '',
    requiresResponse: true,
    requiresUpload: false,
    targetType: 'branch',
    targetLabel: '',
  });

  const visibleRows = useMemo(() => {
    const scoped = rows.filter((row) => row.visibleTo.includes(role));
    if (activeFilter === 'Requests') return scoped.filter((row) => row.type === 'request');
    if (activeFilter === 'Company News') return scoped.filter((row) => row.type === 'company_news');
    if (activeFilter === 'Done') return scoped.filter((row) => row.status === 'done');
    if (activeFilter === 'Pending') return scoped.filter((row) => row.status === 'pending' || row.status === 'undone');
    return scoped;
  }, [activeFilter, rows, role]);

  const selected = useMemo(
    () => visibleRows.find((row) => row.id === selectedId) || visibleRows[0] || null,
    [visibleRows, selectedId]
  );

  const onDemoStatus = (nextStatus) => {
    if (!selected) return;
    setRows((prev) => prev.map((row) => (row.id === selected.id ? { ...row, status: nextStatus } : row)));
  };

  const onDemoReply = () => {
    const message = draftReply.trim();
    if (!selected || !message) return;
    setRows((prev) => prev.map((row) => (
      row.id === selected.id
        ? {
            ...row,
            replies: [...row.replies, { id: `reply-${Date.now()}`, author: 'Demo Staff', message }],
          }
        : row
    )));
    setDraftReply('');
  };

  const onDemoCreate = () => {
    if (!createForm.title.trim()) return;
    const created = {
      id: `demo-ann-created-${Date.now()}`,
      type: 'request',
      title: createForm.title.trim(),
      subtitle: createForm.subtitle.trim() || 'Demo request',
      body: createForm.body.trim() || 'Demo request body',
      priority: createForm.priority,
      dueDate: createForm.dueDate || null,
      status: 'pending',
      branchLabel: role === ROLES.HQ_ADMIN ? 'Global or selected branch' : 'Demo North Branch',
      requiresResponse: createForm.requiresResponse,
      requiresUpload: createForm.requiresUpload,
      targetLabel: createForm.targetLabel.trim() || `${createForm.targetType} target`,
      visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
      replies: [],
    };
    setRows((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setCreateOpen(false);
    setCreateForm({
      title: '',
      subtitle: '',
      body: '',
      priority: 'normal',
      dueDate: '',
      requiresResponse: true,
      requiresUpload: false,
      targetType: 'branch',
      targetLabel: '',
    });
  };

  if (!isStaff) {
    return (
      <EmptyState
        icon={BellRing}
        title="Staff announcements only"
        description="Announcements is a staff-only page. Parent-facing announcements remain a future phase."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Internal requests, reminders, and company updates"
        action={isDemoMode && canCreateInDemo ? (
          <Button className="min-h-10" onClick={() => setCreateOpen((prev) => !prev)}>
            Create Request
          </Button>
        ) : null}
      />

      {!isDemoMode ? (
        <Card className="p-5 border-dashed">
          <p className="text-sm text-muted-foreground">
            Announcements wiring is coming next. Backend Phase 1 service/RLS is ready.
          </p>
          {(role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR) ? (
            <Button variant="outline" className="mt-3 min-h-10" disabled>
              Create Request (preview only)
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="space-y-4">
          {createOpen && canCreateInDemo ? (
            <Card className="p-4 sm:p-5 space-y-3">
              <p className="font-medium">Create Request (demo-only local shell)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Subtitle</Label>
                  <Input value={createForm.subtitle} onChange={(e) => setCreateForm((p) => ({ ...p, subtitle: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Body</Label>
                  <Textarea value={createForm.body} onChange={(e) => setCreateForm((p) => ({ ...p, body: e.target.value }))} className="min-h-[100px]" />
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={createForm.priority} onValueChange={(value) => setCreateForm((p) => ({ ...p, priority: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Due date</Label>
                  <Input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Target type</Label>
                  <Select value={createForm.targetType} onValueChange={(value) => setCreateForm((p) => ({ ...p, targetType: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                      <SelectItem value="profile">Profile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Target label</Label>
                  <Input value={createForm.targetLabel} onChange={(e) => setCreateForm((p) => ({ ...p, targetLabel: e.target.value }))} placeholder="Demo North Branch Teachers" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={createForm.requiresResponse ? 'default' : 'outline'}
                  className="min-h-10"
                  onClick={() => setCreateForm((p) => ({ ...p, requiresResponse: !p.requiresResponse }))}
                >
                  Requires Response
                </Button>
                <Button
                  type="button"
                  variant={createForm.requiresUpload ? 'default' : 'outline'}
                  className="min-h-10"
                  onClick={() => setCreateForm((p) => ({ ...p, requiresUpload: !p.requiresUpload }))}
                >
                  Requires Upload
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="min-h-10" onClick={onDemoCreate}>Save locally</Button>
                <Button variant="outline" className="min-h-10" onClick={() => setCreateOpen(false)}>Cancel</Button>
              </div>
            </Card>
          ) : null}

          <Card className="p-3">
            <div className="flex gap-2 overflow-x-auto">
              {FILTERS.map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={activeFilter === filter ? 'default' : 'outline'}
                  className="min-h-10 whitespace-nowrap"
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </Card>

          {activeFilter === 'Company News' ? (
            <Card className="p-4 sm:p-5 border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">Company News placeholder</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Company News warm presentation and portal pop-up behavior are planned for Phase 3. No pop-up or animation behavior is included in this shell.
              </p>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            <div className="xl:col-span-2 space-y-3">
              {visibleRows.map((row) => (
                <Card
                  key={row.id}
                  className={`p-4 cursor-pointer ${selected?.id === row.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{row.title}</p>
                    <Badge variant="outline" className={priorityTone(row.priority)}>{row.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{row.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{row.body}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className={statusTone(row.status)}>{row.status}</Badge>
                    <Badge variant="outline">{row.branchLabel}</Badge>
                    {row.dueDate ? <Badge variant="outline">Due {row.dueDate}</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {row.requiresResponse ? <span>Requires response</span> : null}
                    {row.requiresUpload ? <span>Requires upload</span> : null}
                  </div>
                </Card>
              ))}
            </div>

            <div className="xl:col-span-3">
              {!selected ? (
                <Card className="p-5">
                  <p className="text-sm text-muted-foreground">No announcements in this filter.</p>
                </Card>
              ) : (
                <Card className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{selected.title}</p>
                    <Badge variant="outline" className={statusTone(selected.status)}>{selected.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selected.subtitle}</p>
                  <p className="text-sm">{selected.body}</p>
                  <p className="text-xs text-muted-foreground">Target: {selected.targetLabel}</p>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="min-h-10" onClick={() => onDemoStatus('read')}>Mark Read</Button>
                    <Button size="sm" variant="outline" className="min-h-10" onClick={() => onDemoStatus('done')}>Done</Button>
                    <Button size="sm" variant="outline" className="min-h-10" onClick={() => onDemoStatus('undone')}>Undone</Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Replies / Questions</p>
                    {selected.replies.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No replies yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selected.replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg border p-2">
                            <p className="text-xs font-medium">{reply.author}</p>
                            <p className="text-xs text-muted-foreground">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={draftReply}
                        onChange={(e) => setDraftReply(e.target.value)}
                        placeholder="Add local reply in demo mode"
                      />
                      <Button className="min-h-10" onClick={onDemoReply}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Add Reply
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-dashed p-3">
                    <p className="text-xs text-muted-foreground">Attachments coming in Phase 2</p>
                    <Button size="sm" variant="outline" className="mt-2 min-h-10" disabled>
                      Upload placeholder (disabled)
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { getSelectedDemoRole } from '@/services/authService';
import { ROLES, getRole } from '@/services/permissionService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import {
  listAnnouncements,
  listAnnouncementReplies,
  listAnnouncementStatuses,
  listAnnouncementTargets,
} from '@/services/supabaseReadService';
import {
  createAnnouncementReply,
  createAnnouncementRequest,
  markAnnouncementRead,
  updateAnnouncementDoneStatus,
} from '@/services/supabaseWriteService';

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
  const { appUser: supabaseAppUser } = useSupabaseAuthState();
  const queryClient = useQueryClient();
  const selectedDemoRole = getSelectedDemoRole();
  const role = selectedDemoRole || getRole(user);
  const isDemoMode = Boolean(selectedDemoRole);
  const isStaff = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR || role === ROLES.TEACHER;
  const canCreateInDemo = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
  const canCreateInAuth = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
  const canUseSupabaseAnnouncements = isStaff && !isDemoMode && isSupabaseConfigured() && Boolean(supabaseAppUser?.id);

  const [activeFilter, setActiveFilter] = useState('Requests');
  const [rows, setRows] = useState(() => DEMO_ANNOUNCEMENTS);
  const [selectedId, setSelectedId] = useState(DEMO_ANNOUNCEMENTS[0]?.id || '');
  const [draftReply, setDraftReply] = useState('');
  const [undoneReason, setUndoneReason] = useState('');
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
    branchId: '',
    targetBranchId: '',
    targetRole: '',
    targetProfileId: '',
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements-internal-staff', supabaseAppUser?.id, role],
    enabled: canUseSupabaseAnnouncements,
    queryFn: async () => {
      const result = await listAnnouncements({ audienceType: 'internal_staff' });
      if (result.error) throw new Error('Unable to load announcements right now.');
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const authenticatedRows = useMemo(() => {
    if (!canUseSupabaseAnnouncements) return [];
    return (announcementsQuery.data || []).map((row) => {
      const ownStatus = Array.isArray(row.announcement_statuses) ? row.announcement_statuses[0] : null;
      const doneStatus = ownStatus?.done_status || 'pending';
      const status = doneStatus === 'done' ? 'done' : doneStatus === 'undone' ? 'undone' : (ownStatus?.read_at ? 'read' : 'pending');
      return {
        id: row.id,
        type: row.announcement_type || 'request',
        title: row.title || 'Untitled announcement',
        subtitle: row.subtitle || '',
        body: row.body || '',
        priority: row.priority || 'normal',
        dueDate: row.due_date || null,
        status,
        branchLabel: row.branch_id ? `Branch ${row.branch_id.slice(0, 8)}` : 'Global',
        requiresResponse: Boolean(row.requires_response),
        requiresUpload: Boolean(row.requires_upload),
        targetLabel: row.audience_type || 'internal_staff',
        visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
        replies: [],
      };
    });
  }, [canUseSupabaseAnnouncements, announcementsQuery.data]);

  const visibleRows = useMemo(() => {
    const sourceRows = isDemoMode ? rows : authenticatedRows;
    const scoped = sourceRows.filter((row) => row.visibleTo.includes(role));
    if (activeFilter === 'Requests') return scoped.filter((row) => row.type === 'request');
    if (activeFilter === 'Company News') return [];
    if (activeFilter === 'Done') return scoped.filter((row) => row.status === 'done');
    if (activeFilter === 'Pending') return scoped.filter((row) => row.status === 'pending' || row.status === 'undone');
    return scoped;
  }, [activeFilter, rows, role, isDemoMode, authenticatedRows]);

  const selected = useMemo(
    () => visibleRows.find((row) => row.id === selectedId) || visibleRows[0] || null,
    [visibleRows, selectedId]
  );

  useEffect(() => {
    if (!selected && visibleRows.length > 0) {
      setSelectedId(visibleRows[0].id);
    }
  }, [selected, visibleRows]);

  const detailQuery = useQuery({
    queryKey: ['announcement-detail', selected?.id, supabaseAppUser?.id],
    enabled: canUseSupabaseAnnouncements && Boolean(selected?.id),
    queryFn: async () => {
      const announcementId = selected.id;
      const [targetsResult, statusesResult, repliesResult] = await Promise.all([
        listAnnouncementTargets({ announcementId }),
        listAnnouncementStatuses({ announcementId }),
        listAnnouncementReplies({ announcementId }),
      ]);
      if (targetsResult.error || statusesResult.error || repliesResult.error) {
        throw new Error('Unable to load announcement detail right now.');
      }
      return {
        targets: Array.isArray(targetsResult.data) ? targetsResult.data : [],
        statuses: Array.isArray(statusesResult.data) ? statusesResult.data : [],
        replies: Array.isArray(repliesResult.data) ? repliesResult.data : [],
      };
    },
  });

  const refreshAnnouncements = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['announcements-internal-staff'] }),
      queryClient.invalidateQueries({ queryKey: ['announcement-detail'] }),
    ]);
  };

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

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const result = await markAnnouncementRead({ announcementId: selected.id });
      if (result.error) throw new Error('Unable to mark as read right now.');
      return result.data;
    },
    onSuccess: async () => {
      toast.success('Marked as read.');
      await refreshAnnouncements();
    },
    onError: () => toast.error('Unable to mark as read right now.'),
  });

  const doneMutation = useMutation({
    mutationFn: async () => {
      const result = await updateAnnouncementDoneStatus({ announcementId: selected.id, doneStatus: 'done' });
      if (result.error) throw new Error('Unable to mark done right now.');
      return result.data;
    },
    onSuccess: async () => {
      toast.success('Marked done.');
      await refreshAnnouncements();
    },
    onError: () => toast.error('Unable to mark done right now.'),
  });

  const undoneMutation = useMutation({
    mutationFn: async () => {
      const result = await updateAnnouncementDoneStatus({
        announcementId: selected.id,
        doneStatus: 'undone',
        undoneReason: undoneReason.trim() || undefined,
      });
      if (result.error) throw new Error('Unable to mark undone right now.');
      return result.data;
    },
    onSuccess: async () => {
      toast.success('Marked undone.');
      await refreshAnnouncements();
    },
    onError: () => toast.error('Unable to mark undone right now.'),
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const body = draftReply.trim();
      if (!body) throw new Error('Reply is required.');
      const replyType = body.includes('?') ? 'question' : 'update';
      const result = await createAnnouncementReply({ announcementId: selected.id, body, replyType });
      if (result.error) throw new Error('Unable to add reply right now.');
      return result.data;
    },
    onSuccess: async () => {
      setDraftReply('');
      toast.success('Reply added.');
      await refreshAnnouncements();
    },
    onError: (error) => toast.error(error?.message || 'Unable to add reply right now.'),
  });

  function toTargetPayload(form) {
    if (form.targetType === 'role' && form.targetRole.trim()) {
      return [{ targetType: 'role', targetRole: form.targetRole.trim() }];
    }
    if (form.targetType === 'profile' && form.targetProfileId.trim()) {
      return [{ targetType: 'profile', targetProfileId: form.targetProfileId.trim() }];
    }
    if (form.targetType === 'branch' && form.targetBranchId.trim()) {
      return [{ targetType: 'branch', branchId: form.targetBranchId.trim() }];
    }
    return [];
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.title.trim()) throw new Error('Title is required.');
      if (
        !createForm.branchId.trim()
        && !createForm.targetBranchId.trim()
        && !createForm.targetRole.trim()
        && !createForm.targetProfileId.trim()
        && !createForm.targetLabel.trim()
      ) {
        throw new Error('Provide branch or target information.');
      }
      const result = await createAnnouncementRequest({
        branchId: createForm.branchId.trim() || undefined,
        title: createForm.title.trim(),
        subtitle: createForm.subtitle.trim() || undefined,
        body: createForm.body.trim() || undefined,
        priority: createForm.priority,
        dueDate: createForm.dueDate || undefined,
        requiresResponse: createForm.requiresResponse,
        requiresUpload: createForm.requiresUpload,
        targets: toTargetPayload(createForm),
      });
      if (result.error) throw new Error('Unable to create request right now.');
      return result.data;
    },
    onSuccess: async () => {
      toast.success('Request created.');
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
        branchId: '',
        targetBranchId: '',
        targetRole: '',
        targetProfileId: '',
      });
      await refreshAnnouncements();
    },
    onError: (error) => toast.error(error?.message || 'Unable to create request right now.'),
  });

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
      branchId: '',
      targetBranchId: '',
      targetRole: '',
      targetProfileId: '',
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
        action={(isDemoMode && canCreateInDemo) || (!isDemoMode && canCreateInAuth) ? (
          <Button className="min-h-10" onClick={() => setCreateOpen((prev) => !prev)}>
            Create Request
          </Button>
        ) : null}
      />

      {!isDemoMode && !canUseSupabaseAnnouncements ? (
        <Card className="p-5 border-dashed">
          <p className="text-sm text-muted-foreground">Supabase authenticated staff session is required for announcements.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {createOpen && (isDemoMode ? canCreateInDemo : canCreateInAuth) ? (
            <Card className="p-4 sm:p-5 space-y-3">
              <p className="font-medium">{isDemoMode ? 'Create Request (demo-only local shell)' : 'Create Request'}</p>
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
                <div className="space-y-1">
                  <Label>Branch ID (optional UUID)</Label>
                  <Input value={createForm.branchId} onChange={(e) => setCreateForm((p) => ({ ...p, branchId: e.target.value }))} placeholder="Branch UUID if known" />
                </div>
                <div className="space-y-1">
                  <Label>Target Branch ID (optional UUID)</Label>
                  <Input value={createForm.targetBranchId} onChange={(e) => setCreateForm((p) => ({ ...p, targetBranchId: e.target.value }))} placeholder="Target branch UUID" />
                </div>
                <div className="space-y-1">
                  <Label>Target Role (optional)</Label>
                  <Input value={createForm.targetRole} onChange={(e) => setCreateForm((p) => ({ ...p, targetRole: e.target.value }))} placeholder="teacher / branch_supervisor" />
                </div>
                <div className="space-y-1">
                  <Label>Target Profile ID (optional UUID)</Label>
                  <Input value={createForm.targetProfileId} onChange={(e) => setCreateForm((p) => ({ ...p, targetProfileId: e.target.value }))} placeholder="Staff profile UUID" />
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
                <Button
                  className="min-h-10"
                  onClick={() => (isDemoMode ? onDemoCreate() : createMutation.mutate())}
                  disabled={!isDemoMode && createMutation.isPending}
                >
                  {isDemoMode ? 'Save locally' : (createMutation.isPending ? 'Saving...' : 'Save request')}
                </Button>
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
                  <p className="text-sm text-muted-foreground">
                    {(!isDemoMode && announcementsQuery.isLoading) ? 'Loading announcements...' : 'No announcements in this filter.'}
                  </p>
                </Card>
              ) : (
                <Card className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{selected.title}</p>
                    <Badge variant="outline" className={statusTone(selected.status)}>{selected.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selected.subtitle}</p>
                  <p className="text-sm">{selected.body}</p>
                  <p className="text-xs text-muted-foreground">
                    Target: {isDemoMode ? selected.targetLabel : `${detailQuery.data?.targets?.length || 0} target row(s)`}
                  </p>
                  {!isDemoMode ? (
                    <p className="text-xs text-muted-foreground">
                      Status rows: {detailQuery.data?.statuses?.length || 0}
                    </p>
                  ) : null}
                  {!isDemoMode && detailQuery.isError ? (
                    <p className="text-xs text-amber-700">Announcement detail is temporarily unavailable.</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="min-h-10"
                      onClick={() => (isDemoMode ? onDemoStatus('read') : markReadMutation.mutate())}
                      disabled={!isDemoMode && markReadMutation.isPending}
                    >
                      Mark Read
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => (isDemoMode ? onDemoStatus('done') : doneMutation.mutate())}
                      disabled={!isDemoMode && doneMutation.isPending}
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => (isDemoMode ? onDemoStatus('undone') : undoneMutation.mutate())}
                      disabled={!isDemoMode && undoneMutation.isPending}
                    >
                      Undone
                    </Button>
                  </div>
                  {!isDemoMode ? (
                    <Input
                      value={undoneReason}
                      onChange={(e) => setUndoneReason(e.target.value)}
                      placeholder="Optional undone reason"
                    />
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Replies / Questions</p>
                    {(isDemoMode ? selected.replies.length : (detailQuery.data?.replies?.length || 0)) === 0 ? (
                      <p className="text-xs text-muted-foreground">No replies yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(isDemoMode ? selected.replies : (detailQuery.data?.replies || [])).map((reply) => (
                          <div key={reply.id} className="rounded-lg border p-2">
                            <p className="text-xs font-medium">{reply.author || reply.profile_id || 'Staff'}</p>
                            <p className="text-xs text-muted-foreground">{reply.message || reply.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={draftReply}
                        onChange={(e) => setDraftReply(e.target.value)}
                        placeholder={isDemoMode ? 'Add local reply in demo mode' : 'Add reply'}
                      />
                      <Button className="min-h-10" onClick={() => (isDemoMode ? onDemoReply() : replyMutation.mutate())}>
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

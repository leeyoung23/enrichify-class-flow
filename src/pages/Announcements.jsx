import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
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
  listAnnouncementCompletionOverview,
  listAnnouncements,
  listAnnouncementReplies,
  listAnnouncementStatuses,
  listAnnouncementTargets,
} from '@/services/supabaseReadService';
import {
  getAnnouncementAttachmentSignedUrl,
  listAnnouncementAttachments,
  uploadAnnouncementAttachment,
} from '@/services/supabaseUploadService';
import {
  createAnnouncementReply,
  createAnnouncementRequest,
  markAnnouncementRead,
  updateAnnouncementDoneStatus,
} from '@/services/supabaseWriteService';

const FILTERS = ['Requests', 'Company News', 'Done', 'Pending'];
const ANNOUNCEMENT_ATTACHMENT_ROLE_OPTIONS = [
  { value: 'hq_attachment', label: 'HQ Attachment' },
  { value: 'supervisor_attachment', label: 'Supervisor Attachment' },
  { value: 'response_upload', label: 'Response Upload' },
];

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
    title: 'Congratulations: North Branch reading milestone',
    subtitle: 'Team recognition update',
    body: 'Congratulations to the North Branch team for reaching this month reading target with excellent consistency.',
    priority: 'low',
    dueDate: null,
    status: 'read',
    branchLabel: 'Global',
    requiresResponse: false,
    requiresUpload: false,
    targetLabel: 'All staff',
    templateLabel: 'Congratulations',
    emoji: '🎉',
    publishDate: '2026-05-01',
    popupEnabled: true,
    toneLabel: 'celebratory',
    audienceLabel: 'Internal staff',
    visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [],
  },
  {
    id: 'demo-ann-4',
    type: 'company_news',
    title: 'Important update: schedule adjustment this Friday',
    subtitle: 'Operations notice',
    body: 'Friday class support rota has been adjusted. Please check the final block assignment in the branch roster.',
    priority: 'high',
    dueDate: null,
    status: 'read',
    branchLabel: 'Demo North Branch',
    requiresResponse: false,
    requiresUpload: false,
    targetLabel: 'North Branch staff',
    templateLabel: 'Important update',
    emoji: '📌',
    publishDate: '2026-05-02',
    popupEnabled: true,
    toneLabel: 'important',
    audienceLabel: 'Internal staff',
    visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [],
  },
  {
    id: 'demo-ann-5',
    type: 'company_news',
    title: 'Training reminder: phonics workshop Monday',
    subtitle: 'Staff development',
    body: 'Reminder: phonics workshop starts Monday 9:00 AM. Bring current class notes for discussion.',
    priority: 'normal',
    dueDate: null,
    status: 'pending',
    branchLabel: 'Global',
    requiresResponse: false,
    requiresUpload: false,
    targetLabel: 'All teachers',
    templateLabel: 'Training reminder',
    emoji: '📚',
    publishDate: '2026-05-03',
    popupEnabled: false,
    toneLabel: 'supportive',
    audienceLabel: 'Internal staff',
    visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [],
  },
  {
    id: 'demo-ann-6',
    type: 'company_news',
    title: 'Holiday / centre closure notice',
    subtitle: 'Public holiday schedule',
    body: 'Centre is closed next Monday for public holiday. Normal operations resume Tuesday morning.',
    priority: 'normal',
    dueDate: null,
    status: 'pending',
    branchLabel: 'Global',
    requiresResponse: false,
    requiresUpload: false,
    targetLabel: 'All staff',
    templateLabel: 'Holiday / closure',
    emoji: '🏫',
    publishDate: '2026-05-04',
    popupEnabled: true,
    toneLabel: 'informative',
    audienceLabel: 'Internal staff',
    visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [],
  },
  {
    id: 'demo-ann-7',
    type: 'company_news',
    title: 'Event reminder: Family Day booth preparation',
    subtitle: 'Event reminder',
    body: 'Family Day booth setup starts 7:30 AM Saturday. Branch teams please review assignment board.',
    priority: 'high',
    dueDate: null,
    status: 'pending',
    branchLabel: 'Demo North Branch',
    requiresResponse: false,
    requiresUpload: false,
    targetLabel: 'North Branch staff',
    templateLabel: 'Event reminder',
    emoji: '📣',
    publishDate: '2026-05-05',
    popupEnabled: true,
    toneLabel: 'warm reminder',
    audienceLabel: 'Internal staff',
    visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
    replies: [],
  },
];

const DEMO_ANNOUNCEMENT_ATTACHMENTS = {
  'demo-ann-1': [
    {
      id: 'demo-att-1',
      file_name: 'north-reading-guideline.pdf',
      file_role: 'hq_attachment',
      mime_type: 'application/pdf',
      file_size: 189240,
      created_at: '2026-05-01T09:00:00.000Z',
      staff_note: 'Reference checklist only.',
    },
  ],
  'demo-ann-2': [
    {
      id: 'demo-att-2',
      file_name: 'teacher-weekly-response.jpg',
      file_role: 'response_upload',
      mime_type: 'image/jpeg',
      file_size: 245112,
      created_at: '2026-05-01T09:30:00.000Z',
      staff_note: 'Draft response evidence.',
    },
  ],
};

const DEMO_COMPLETION_OVERVIEW = {
  'demo-ann-1': {
    totalTargeted: 4,
    readCount: 3,
    unreadCount: 1,
    doneCount: 1,
    pendingCount: 2,
    undoneCount: 1,
    responseProvidedCount: 2,
    responseMissingCount: 2,
    uploadProvidedCount: 0,
    uploadMissingCount: 0,
    overdueCount: 1,
    latestReplyAt: '2026-05-01T09:20:00.000Z',
    latestUploadAt: null,
    rows: [
      {
        profileId: 'demo-profile-1',
        staffName: 'Teacher Amy',
        role: 'teacher',
        branchName: 'Demo North Branch',
        readAt: '2026-05-01T08:40:00.000Z',
        doneStatus: 'pending',
        replyCount: 1,
        attachmentCount: 0,
        responseProvided: true,
        uploadProvided: false,
        isOverdue: false,
        lastActivityAt: '2026-05-01T09:20:00.000Z',
        undoneReason: null,
      },
      {
        profileId: 'demo-profile-2',
        staffName: 'Teacher Ben',
        role: 'teacher',
        branchName: 'Demo North Branch',
        readAt: '2026-05-01T08:55:00.000Z',
        doneStatus: 'done',
        replyCount: 1,
        attachmentCount: 0,
        responseProvided: true,
        uploadProvided: false,
        isOverdue: false,
        lastActivityAt: '2026-05-01T09:10:00.000Z',
        undoneReason: null,
      },
      {
        profileId: 'demo-profile-3',
        staffName: 'Teacher Cara',
        role: 'teacher',
        branchName: 'Demo North Branch',
        readAt: '2026-05-01T08:15:00.000Z',
        doneStatus: 'undone',
        replyCount: 0,
        attachmentCount: 0,
        responseProvided: false,
        uploadProvided: false,
        isOverdue: true,
        lastActivityAt: '2026-05-01T08:50:00.000Z',
        undoneReason: 'Need student files before completing.',
      },
      {
        profileId: 'demo-profile-4',
        staffName: 'Teacher Dan',
        role: 'teacher',
        branchName: 'Demo North Branch',
        readAt: null,
        doneStatus: 'pending',
        replyCount: 0,
        attachmentCount: 0,
        responseProvided: false,
        uploadProvided: false,
        isOverdue: false,
        lastActivityAt: null,
        undoneReason: null,
      },
    ],
  },
  'demo-ann-2': {
    totalTargeted: 3,
    readCount: 2,
    unreadCount: 1,
    doneCount: 1,
    pendingCount: 2,
    undoneCount: 0,
    responseProvidedCount: 1,
    responseMissingCount: 2,
    uploadProvidedCount: 1,
    uploadMissingCount: 2,
    overdueCount: 1,
    latestReplyAt: '2026-05-01T10:05:00.000Z',
    latestUploadAt: '2026-05-01T10:08:00.000Z',
    rows: [
      {
        profileId: 'demo-profile-5',
        staffName: 'Teacher Ella',
        role: 'teacher',
        branchName: 'Demo North Branch',
        readAt: '2026-05-01T09:40:00.000Z',
        doneStatus: 'done',
        replyCount: 1,
        attachmentCount: 1,
        responseProvided: true,
        uploadProvided: true,
        isOverdue: false,
        lastActivityAt: '2026-05-01T10:08:00.000Z',
        undoneReason: null,
      },
      {
        profileId: 'demo-profile-6',
        staffName: 'Teacher Finn',
        role: 'teacher',
        branchName: 'Demo North Branch',
        readAt: '2026-05-01T09:41:00.000Z',
        doneStatus: 'pending',
        replyCount: 0,
        attachmentCount: 0,
        responseProvided: false,
        uploadProvided: false,
        isOverdue: true,
        lastActivityAt: '2026-05-01T09:41:00.000Z',
        undoneReason: null,
      },
      {
        profileId: 'demo-profile-7',
        staffName: 'Teacher Grace',
        role: 'teacher',
        branchName: 'Demo North Branch',
        readAt: null,
        doneStatus: 'pending',
        replyCount: 0,
        attachmentCount: 0,
        responseProvided: false,
        uploadProvided: false,
        isOverdue: false,
        lastActivityAt: null,
        undoneReason: null,
      },
    ],
  },
};

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

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return 'Unknown size';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachmentDate(value) {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleDateString();
}

function formatFileType(mimeType) {
  const normalized = String(mimeType || '').trim();
  if (!normalized) return 'Unknown type';
  return normalized;
}

function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

function roleLabel(value) {
  if (!value) return 'Staff';
  if (value === 'hq_admin') return 'HQ Admin';
  if (value === 'branch_supervisor') return 'Branch Supervisor';
  if (value === 'teacher') return 'Teacher';
  return value;
}

function roleCanUploadAttachment(role) {
  return role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR || role === ROLES.TEACHER;
}

function getAllowedAttachmentRoles(role) {
  if (role === ROLES.HQ_ADMIN) return ['hq_attachment', 'supervisor_attachment'];
  if (role === ROLES.BRANCH_SUPERVISOR) return ['supervisor_attachment'];
  if (role === ROLES.TEACHER) return ['response_upload'];
  return [];
}

export default function Announcements() {
  const { user } = useOutletContext();
  const location = useLocation();
  const { appUser: supabaseAppUser } = useSupabaseAuthState();
  const queryClient = useQueryClient();
  const selectedDemoRole = getSelectedDemoRole();
  const role = selectedDemoRole || getRole(user);
  const isDemoMode = Boolean(selectedDemoRole);
  const isStaff = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR || role === ROLES.TEACHER;
  const canCreateInDemo = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
  const canCreateInAuth = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
  const canCreateCompanyNewsInDemo = role === ROLES.HQ_ADMIN;
  const canViewManagerOverview = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
  const canUploadAttachments = roleCanUploadAttachment(role);
  const allowedAttachmentRoles = getAllowedAttachmentRoles(role);
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
  const [demoAttachmentsByAnnouncementId, setDemoAttachmentsByAnnouncementId] = useState(DEMO_ANNOUNCEMENT_ATTACHMENTS);
  const [uploadRole, setUploadRole] = useState(allowedAttachmentRoles[0] || 'response_upload');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [demoUploadName, setDemoUploadName] = useState('');
  const [companyNewsCreateOpen, setCompanyNewsCreateOpen] = useState(false);
  const [companyNewsForm, setCompanyNewsForm] = useState({
    title: '',
    subtitle: '',
    body: '',
    templateLabel: 'General news',
    emoji: '📣',
    popupEnabled: true,
    toneLabel: 'warm',
    priority: 'normal',
    audienceLabel: 'Internal staff',
  });

  useEffect(() => {
    const stateAnnouncementId = location.state?.announcementId;
    const queryAnnouncementId = new URLSearchParams(location.search).get('announcementId');
    const preferredId = stateAnnouncementId || queryAnnouncementId;
    if (typeof preferredId === 'string' && preferredId.trim()) {
      setSelectedId(preferredId.trim());
    }
  }, [location.search, location.state]);

  useEffect(() => {
    if (!allowedAttachmentRoles.includes(uploadRole)) {
      setUploadRole(allowedAttachmentRoles[0] || 'response_upload');
    }
  }, [allowedAttachmentRoles, uploadRole]);

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
        templateLabel: row.announcement_type === 'company_news' ? 'General news' : 'Request',
        emoji: row.popup_emoji || null,
        publishDate: row.published_at ? String(row.published_at).slice(0, 10) : null,
        popupEnabled: Boolean(row.popup_enabled),
        toneLabel: row.announcement_type === 'company_news' ? 'warm' : 'operational',
        audienceLabel: row.audience_type || 'internal_staff',
        visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
        replies: [],
      };
    });
  }, [canUseSupabaseAnnouncements, announcementsQuery.data]);

  const visibleRows = useMemo(() => {
    const sourceRows = isDemoMode ? rows : authenticatedRows;
    const scoped = sourceRows.filter((row) => row.visibleTo.includes(role));
    if (activeFilter === 'Requests') return scoped.filter((row) => row.type === 'request');
    if (activeFilter === 'Company News') return scoped.filter((row) => row.type === 'company_news');
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
    enabled: canUseSupabaseAnnouncements && selected?.type === 'request' && Boolean(selected?.id),
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

  const attachmentsQuery = useQuery({
    queryKey: ['announcement-attachments', selected?.id, supabaseAppUser?.id, role],
    enabled: canUseSupabaseAnnouncements && selected?.type === 'request' && Boolean(selected?.id),
    queryFn: async () => {
      const result = await listAnnouncementAttachments({ announcementId: selected.id });
      if (result.error) throw new Error('Unable to load attachments right now.');
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const completionOverviewQuery = useQuery({
    queryKey: ['announcement-completion-overview', selected?.id, supabaseAppUser?.id, role],
    enabled: canUseSupabaseAnnouncements && canViewManagerOverview && selected?.type === 'request' && Boolean(selected?.id),
    queryFn: async () => {
      const result = await listAnnouncementCompletionOverview({ announcementId: selected.id });
      if (result.error) throw new Error('Completion overview is temporarily unavailable.');
      const first = Array.isArray(result.data) ? (result.data[0] || null) : null;
      return first;
    },
  });

  const refreshAnnouncements = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['announcements-internal-staff'] }),
      queryClient.invalidateQueries({ queryKey: ['announcement-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['announcement-completion-overview'] }),
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

  const uploadAttachmentMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.id) throw new Error('Select an announcement first.');
      if (!uploadFile) throw new Error('Select a file before uploading.');
      if (!allowedAttachmentRoles.includes(uploadRole)) {
        throw new Error('Attachment role is not allowed for this account.');
      }
      const result = await uploadAnnouncementAttachment({
        announcementId: selected.id,
        file: uploadFile,
        fileRole: uploadRole,
        staffNote: uploadNote.trim() || undefined,
      });
      if (result.error) {
        throw new Error('Attachment upload is unavailable right now.');
      }
      return result.data;
    },
    onSuccess: async () => {
      setUploadFile(null);
      setUploadNote('');
      toast.success('Attachment uploaded.');
      await queryClient.invalidateQueries({ queryKey: ['announcement-attachments'] });
    },
    onError: (error) => toast.error(error?.message || 'Attachment upload is unavailable right now.'),
  });

  const viewAttachmentMutation = useMutation({
    mutationFn: async (attachmentId) => {
      const result = await getAnnouncementAttachmentSignedUrl({ attachmentId, expiresIn: 300 });
      if (result.error || !result.data?.signed_url) {
        throw new Error('Attachment is unavailable right now.');
      }
      return result.data.signed_url;
    },
    onSuccess: (signedUrl) => {
      const opened = window.open(signedUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        toast.error('Allow pop-ups to open the attachment.');
      }
    },
    onError: () => toast.error('Attachment is unavailable right now.'),
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

  const onDemoCreateCompanyNews = () => {
    if (!canCreateCompanyNewsInDemo) return;
    if (!companyNewsForm.title.trim()) return;
    const created = {
      id: `demo-company-news-${Date.now()}`,
      type: 'company_news',
      title: companyNewsForm.title.trim(),
      subtitle: companyNewsForm.subtitle.trim() || 'Company News update',
      body: companyNewsForm.body.trim() || 'Company News detail preview.',
      priority: companyNewsForm.priority,
      dueDate: null,
      status: 'pending',
      branchLabel: 'Global',
      requiresResponse: false,
      requiresUpload: false,
      targetLabel: 'All staff',
      templateLabel: companyNewsForm.templateLabel,
      emoji: companyNewsForm.emoji.trim() || null,
      publishDate: new Date().toISOString().slice(0, 10),
      popupEnabled: Boolean(companyNewsForm.popupEnabled),
      toneLabel: companyNewsForm.toneLabel,
      audienceLabel: companyNewsForm.audienceLabel,
      visibleTo: [ROLES.HQ_ADMIN, ROLES.BRANCH_SUPERVISOR, ROLES.TEACHER],
      replies: [],
    };
    setRows((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setCompanyNewsCreateOpen(false);
    setCompanyNewsForm({
      title: '',
      subtitle: '',
      body: '',
      templateLabel: 'General news',
      emoji: '📣',
      popupEnabled: true,
      toneLabel: 'warm',
      priority: 'normal',
      audienceLabel: 'Internal staff',
    });
    setActiveFilter('Company News');
    toast.success('Demo Company News saved locally.');
  };

  const onDemoUploadAttachment = () => {
    if (!selected?.id) return;
    if (!allowedAttachmentRoles.includes(uploadRole)) return;
    const selectedName = demoUploadName.trim();
    const fallbackName = role === ROLES.TEACHER
      ? `demo-response-${Date.now()}.pdf`
      : `demo-internal-${Date.now()}.pdf`;
    const nextAttachment = {
      id: `demo-att-${Date.now()}`,
      file_name: selectedName || fallbackName,
      file_role: uploadRole,
      mime_type: 'application/pdf',
      file_size: 125000,
      created_at: new Date().toISOString(),
      staff_note: uploadNote.trim() || null,
    };
    setDemoAttachmentsByAnnouncementId((prev) => ({
      ...prev,
      [selected.id]: [nextAttachment, ...(prev[selected.id] || [])],
    }));
    setDemoUploadName('');
    setUploadNote('');
    toast.success('Demo attachment saved locally.');
  };

  const demoAttachments = selected ? (demoAttachmentsByAnnouncementId[selected.id] || []) : [];
  const authAttachments = Array.isArray(attachmentsQuery.data) ? attachmentsQuery.data : [];
  const attachmentRows = isDemoMode ? demoAttachments : authAttachments;
  const demoCompletionOverview = selected ? (DEMO_COMPLETION_OVERVIEW[selected.id] || null) : null;
  const authCompletionOverview = completionOverviewQuery.data || null;
  const completionOverview = isDemoMode ? demoCompletionOverview : authCompletionOverview;

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
        action={activeFilter === 'Company News'
          ? (
            isDemoMode
              ? (
                canCreateCompanyNewsInDemo ? (
                  <Button className="min-h-10" onClick={() => setCompanyNewsCreateOpen((prev) => !prev)}>
                    Create Company News
                  </Button>
                ) : null
              )
              : (
                canCreateInAuth ? (
                  <Button className="min-h-10" variant="outline" disabled>
                    Create Company News (preview only)
                  </Button>
                ) : null
              )
          )
          : (((isDemoMode && canCreateInDemo) || (!isDemoMode && canCreateInAuth)) ? (
            <Button className="min-h-10" onClick={() => setCreateOpen((prev) => !prev)}>
              Create Request
            </Button>
          ) : null)}
      />

      {!isDemoMode && !canUseSupabaseAnnouncements ? (
        <Card className="p-5 border-dashed">
          <p className="text-sm text-muted-foreground">Supabase authenticated staff session is required for announcements.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeFilter !== 'Company News' && createOpen && (isDemoMode ? canCreateInDemo : canCreateInAuth) ? (
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

          {activeFilter === 'Company News' && companyNewsCreateOpen && isDemoMode && canCreateCompanyNewsInDemo ? (
            <Card className="p-4 sm:p-5 space-y-3">
              <p className="font-medium">Create Company News (demo-only local shell)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={companyNewsForm.title} onChange={(e) => setCompanyNewsForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Subtitle</Label>
                  <Input value={companyNewsForm.subtitle} onChange={(e) => setCompanyNewsForm((p) => ({ ...p, subtitle: e.target.value }))} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Body</Label>
                  <Textarea value={companyNewsForm.body} onChange={(e) => setCompanyNewsForm((p) => ({ ...p, body: e.target.value }))} className="min-h-[100px]" />
                </div>
                <div className="space-y-1">
                  <Label>Category / template</Label>
                  <Select value={companyNewsForm.templateLabel} onValueChange={(value) => setCompanyNewsForm((p) => ({ ...p, templateLabel: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Congratulations">Congratulations</SelectItem>
                      <SelectItem value="Important update">Important update</SelectItem>
                      <SelectItem value="Training reminder">Training reminder</SelectItem>
                      <SelectItem value="Holiday / closure">Holiday / closure</SelectItem>
                      <SelectItem value="Event reminder">Event reminder</SelectItem>
                      <SelectItem value="General news">General news</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Emoji</Label>
                  <Input value={companyNewsForm.emoji} onChange={(e) => setCompanyNewsForm((p) => ({ ...p, emoji: e.target.value }))} placeholder="📣" />
                </div>
                <div className="space-y-1">
                  <Label>Tone / style</Label>
                  <Select value={companyNewsForm.toneLabel} onValueChange={(value) => setCompanyNewsForm((p) => ({ ...p, toneLabel: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celebratory">Celebratory</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="warm reminder">Warm reminder</SelectItem>
                      <SelectItem value="supportive">Supportive</SelectItem>
                      <SelectItem value="informative">Informative</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={companyNewsForm.priority} onValueChange={(value) => setCompanyNewsForm((p) => ({ ...p, priority: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={companyNewsForm.popupEnabled ? 'default' : 'outline'}
                  className="min-h-10"
                  onClick={() => setCompanyNewsForm((p) => ({ ...p, popupEnabled: !p.popupEnabled }))}
                >
                  Pop-up enabled preview
                </Button>
                <Badge variant="outline">{companyNewsForm.audienceLabel}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="min-h-10" onClick={onDemoCreateCompanyNews}>
                  Save locally
                </Button>
                <Button variant="outline" className="min-h-10" onClick={() => setCompanyNewsCreateOpen(false)}>Cancel</Button>
              </div>
            </Card>
          ) : null}

          {activeFilter === 'Company News' && !isDemoMode && canCreateInAuth ? (
            <Card className="p-4 sm:p-5 border-dashed">
              <p className="text-sm font-medium">Create Company News (preview-only in this milestone)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Real Company News write wiring is intentionally deferred. This milestone delivers UI shell and demo parity only.
              </p>
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
                  onClick={() => {
                    setActiveFilter(filter);
                    setCreateOpen(false);
                    setCompanyNewsCreateOpen(false);
                  }}
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
                <p className="font-medium">Company News shell</p>
              </div>
              <p className="text-sm text-muted-foreground">
                News-style Company News cards/details are enabled in this shell milestone. Runtime warm pop-up behavior remains future and is not implemented here.
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
                    {row.type === 'company_news'
                      ? <Badge variant="outline">Published {row.publishDate || 'TBD'}</Badge>
                      : (row.dueDate ? <Badge variant="outline">Due {row.dueDate}</Badge> : null)}
                    {row.type === 'company_news' && row.popupEnabled ? <Badge variant="outline">Pop-up enabled</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {row.type === 'company_news' ? (
                      <>
                        <span>{row.templateLabel || 'General news'}</span>
                        {row.emoji ? <span>{row.emoji}</span> : null}
                        <span>{row.toneLabel || 'warm'}</span>
                      </>
                    ) : (
                      <>
                        {row.requiresResponse ? <span>Requires response</span> : null}
                        {row.requiresUpload ? <span>Requires upload</span> : null}
                      </>
                    )}
                  </div>
                  {row.type === 'company_news' ? (
                    <div className="mt-2">
                      <Button size="sm" variant="outline" className="min-h-9">
                        View detail
                      </Button>
                    </div>
                  ) : null}
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
              ) : selected.type === 'company_news' ? (
                <Card className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{selected.title}</p>
                      {selected.emoji ? <span className="text-lg">{selected.emoji}</span> : null}
                    </div>
                    <Badge variant="outline" className={priorityTone(selected.priority)}>{selected.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selected.subtitle}</p>
                  <p className="text-sm">{selected.body}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Badge variant="outline">Category {selected.templateLabel || 'General news'}</Badge>
                    <Badge variant="outline">Audience {selected.audienceLabel || selected.targetLabel || 'Internal staff'}</Badge>
                    <Badge variant="outline">Published {selected.publishDate || 'TBD'}</Badge>
                    <Badge variant="outline">Tone {selected.toneLabel || 'warm'}</Badge>
                    {selected.popupEnabled ? <Badge variant="outline">Pop-up enabled</Badge> : <Badge variant="outline">Pop-up disabled</Badge>}
                  </div>

                  <div className="rounded-lg border border-dashed p-3 space-y-2">
                    <p className="text-sm font-medium">Warm pop-up preview (non-runtime)</p>
                    <p className="text-xs text-muted-foreground">
                      5-10 second style preview only. Runtime app-shell pop-up behavior, dismissal persistence, and frequency logic are future milestones.
                    </p>
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Preview headline</p>
                      <p className="text-sm font-medium">{selected.emoji ? `${selected.emoji} ` : ''}{selected.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{selected.subtitle || selected.body}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="min-h-9" variant="outline">View</Button>
                        <Button size="sm" className="min-h-9" variant="outline">Dismiss</Button>
                      </div>
                    </div>
                  </div>
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
                    <p className="text-sm font-medium">Attachments</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Internal staff attachments only. Parent-facing media remains disabled in this milestone.
                    </p>

                    {canUploadAttachments ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>Attachment role</Label>
                          <Select value={uploadRole} onValueChange={setUploadRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ANNOUNCEMENT_ATTACHMENT_ROLE_OPTIONS
                                .filter((option) => allowedAttachmentRoles.includes(option.value))
                                .map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>{isDemoMode ? 'Demo file name (optional)' : 'Select file'}</Label>
                          {isDemoMode ? (
                            <Input
                              value={demoUploadName}
                              onChange={(e) => setDemoUploadName(e.target.value)}
                              placeholder="demo-response-note.pdf"
                            />
                          ) : (
                            <Input
                              type="file"
                              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                              disabled={uploadAttachmentMutation.isPending}
                            />
                          )}
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Staff note (optional)</Label>
                          <Textarea
                            value={uploadNote}
                            onChange={(e) => setUploadNote(e.target.value)}
                            className="min-h-[80px]"
                            placeholder="Add internal context for staff only"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Button
                            size="sm"
                            className="min-h-10"
                            onClick={() => (isDemoMode ? onDemoUploadAttachment() : uploadAttachmentMutation.mutate())}
                            disabled={!isDemoMode && uploadAttachmentMutation.isPending}
                          >
                            {isDemoMode
                              ? 'Save demo attachment'
                              : (uploadAttachmentMutation.isPending ? 'Uploading...' : 'Upload attachment')}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      {isDemoMode ? null : (attachmentsQuery.isLoading ? (
                        <p className="text-xs text-muted-foreground">Loading attachments...</p>
                      ) : null)}
                      {!isDemoMode && attachmentsQuery.isError ? (
                        <p className="text-xs text-amber-700">Attachments are temporarily unavailable.</p>
                      ) : null}
                      {attachmentRows.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No attachments yet.</p>
                      ) : (
                        attachmentRows.map((attachment) => (
                          <div key={attachment.id} className="rounded-lg border p-2">
                            <p className="text-xs font-medium">{attachment.file_name || 'Untitled attachment'}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.file_role || 'unknown_role'} · {formatFileType(attachment.mime_type)} · {formatFileSize(attachment.file_size)} · {formatAttachmentDate(attachment.created_at)}
                            </p>
                            {attachment.staff_note ? (
                              <p className="text-xs text-muted-foreground mt-1">{attachment.staff_note}</p>
                            ) : null}
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-9"
                                onClick={() => (
                                  isDemoMode
                                    ? toast.success('Demo attachment view only (local simulation).')
                                    : viewAttachmentMutation.mutate(attachment.id)
                                )}
                                disabled={!isDemoMode && viewAttachmentMutation.isPending}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {canViewManagerOverview ? (
                    <div className="rounded-lg border p-3 space-y-3">
                      <div>
                        <p className="text-sm font-medium">Completion Overview</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Read-only manager visibility for HQ and branch supervisors only.
                        </p>
                      </div>

                      {!isDemoMode && completionOverviewQuery.isLoading ? (
                        <p className="text-xs text-muted-foreground">Loading completion overview...</p>
                      ) : null}

                      {!isDemoMode && completionOverviewQuery.isError ? (
                        <p className="text-xs text-amber-700">Completion overview is temporarily unavailable.</p>
                      ) : null}

                      {!isDemoMode && !completionOverviewQuery.isLoading && !completionOverviewQuery.isError && !completionOverview ? (
                        <p className="text-xs text-muted-foreground">No completion overview rows available for this announcement.</p>
                      ) : null}

                      {isDemoMode && !completionOverview ? (
                        <p className="text-xs text-muted-foreground">No demo completion overview for this announcement yet.</p>
                      ) : null}

                      {completionOverview ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <Badge variant="outline">Total targeted {completionOverview.totalTargeted || 0}</Badge>
                            <Badge variant="outline">Read {completionOverview.readCount || 0} / Unread {completionOverview.unreadCount || 0}</Badge>
                            <Badge variant="outline">Done {completionOverview.doneCount || 0} / Pending {completionOverview.pendingCount || 0} / Undone {completionOverview.undoneCount || 0}</Badge>
                            <Badge variant="outline">Response provided {completionOverview.responseProvidedCount || 0} / missing {completionOverview.responseMissingCount || 0}</Badge>
                            <Badge variant="outline">Upload provided {completionOverview.uploadProvidedCount || 0} / missing {completionOverview.uploadMissingCount || 0}</Badge>
                            <Badge variant="outline">Overdue {completionOverview.overdueCount || 0}</Badge>
                            <Badge variant="outline">Latest reply {formatDateTime(completionOverview.latestReplyAt)}</Badge>
                            <Badge variant="outline">Latest upload {formatDateTime(completionOverview.latestUploadAt)}</Badge>
                          </div>

                          <div className="space-y-2">
                            {(completionOverview.rows || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No per-person completion rows available.</p>
                            ) : (
                              (completionOverview.rows || []).map((person) => (
                                <div key={person.profileId} className="rounded-lg border p-2 space-y-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-medium">{person.staffName || 'Staff'}</p>
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline">{roleLabel(person.role)}</Badge>
                                      <Badge variant="outline">{person.branchName || 'No branch'}</Badge>
                                      <Badge variant="outline" className={statusTone(person.doneStatus || 'pending')}>
                                        {person.doneStatus || 'pending'}
                                      </Badge>
                                      {person.isOverdue ? <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Overdue</Badge> : null}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span>Read: {person.readAt ? formatDateTime(person.readAt) : 'Unread'}</span>
                                    <span>Replies: {person.replyCount || 0}</span>
                                    <span>Uploads: {person.attachmentCount || 0}</span>
                                    <span>{person.responseProvided ? 'Response provided' : 'Response missing'}</span>
                                    <span>{person.uploadProvided ? 'Upload provided' : 'Upload missing'}</span>
                                    <span>Last activity: {formatDateTime(person.lastActivityAt)}</span>
                                  </div>
                                  {person.undoneReason ? (
                                    <p className="text-xs text-amber-700">Undone reason: {person.undoneReason}</p>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

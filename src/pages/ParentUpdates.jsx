import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listClasses, listStudentsByClass, listParentUpdates, createParentUpdate, listAttendanceRecords, listHomeworkAttachments } from '@/services/dataService';
import { getSelectedDemoRole } from '@/services/authService';
import { ROLES, getRole, isTeacherRole } from '@/services/permissionService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { getClassMemorySignedUrl, listClassMemories, uploadClassMemory } from '@/services/supabaseUploadService';
import { approveClassMemory, rejectClassMemory, updateParentCommentDraft, releaseParentComment, updateWeeklyProgressReportDraft, releaseWeeklyProgressReport } from '@/services/supabaseWriteService';
import { generateParentCommentDraft } from '@/services/aiDraftService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import { Sparkles, Save, Loader2, CheckCircle2, Share2, MessageSquarePlus, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'note_created', label: 'Teacher note created' },
  { value: 'ai_draft_generated', label: 'AI draft generated' },
  { value: 'edited', label: 'Teacher edited final message' },
  { value: 'approved', label: 'Approved report' },
  { value: 'shared', label: 'Shared report' },
];

const STATUS_LABELS = {
  note_created: 'Teacher note created',
  ai_draft_generated: 'AI draft generated',
  edited: 'Teacher edited final message',
  approved: 'Approved report',
  shared: 'Shared report',
};

const MEMORY_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MEMORY_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function getStatusBadgeVariant(status) {
  if (status === 'shared') return 'default';
  if (status === 'approved') return 'secondary';
  return 'outline';
}

function getActionLabel(role) {
  if (role === ROLES.TEACHER) return 'Edit';
  if (role === ROLES.BRANCH_SUPERVISOR || role === ROLES.HQ_ADMIN) return 'View';
  return 'View';
}

function buildWeeklyReportText({ weeklyReport, sourceSnapshot }) {
  return [
    `Week ${weeklyReport.weekRange}`,
    `Attendance summary: ${sourceSnapshot?.latestAttendance?.status || 'Not recorded'}`,
    `Homework completion: ${sourceSnapshot?.latestAttendance?.homework_status || 'Not recorded'}`,
    `Learning focus: ${weeklyReport.learningFocus}`,
    `Strengths: ${weeklyReport.strengths}`,
    `Areas to improve: ${weeklyReport.areasToImprove}`,
    `Teacher comment: ${weeklyReport.teacherComment}`,
    `Suggested home practice: ${weeklyReport.suggestedHomePractice}`,
    `Next week focus: ${weeklyReport.nextWeekFocus}`,
  ].join('\n');
}

export default function ParentUpdates() {
  const { user } = useOutletContext();
  const { appUser: supabaseAppUser } = useSupabaseAuthState();
  const [communicationType, setCommunicationType] = useState('comment');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [notes, setNotes] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [approvedReport, setApprovedReport] = useState('');
  const [sharedReport, setSharedReport] = useState('');
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState('notes');
  const [statusFilter, setStatusFilter] = useState('all');
  const [weeklyReport, setWeeklyReport] = useState({
    weekRange: '21 Apr 2026 - 27 Apr 2026',
    learningFocus: 'Reading fluency and short comprehension responses.',
    strengths: 'Participates consistently and responds well to guided practice.',
    areasToImprove: 'Build confidence in independent written responses.',
    teacherComment: '',
    suggestedHomePractice: 'Read one short passage daily and summarise in 2-3 sentences.',
    nextWeekFocus: 'Inference questions and sentence expansion.',
    status: 'Draft',
  });
  const [weeklyDraftGenerated, setWeeklyDraftGenerated] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryCaption, setMemoryCaption] = useState('');
  const [memoryFile, setMemoryFile] = useState(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState('submitted');
  const [previewingMemoryId, setPreviewingMemoryId] = useState('');
  const queryClient = useQueryClient();
  const isTeacher = isTeacherRole(user);
  const role = getRole(user);
  const isMemoryReviewer = role === ROLES.HQ_ADMIN || role === ROLES.BRANCH_SUPERVISOR;
  const isDemoMode = Boolean(getSelectedDemoRole());
  const hasSupabaseSession = Boolean(supabaseAppUser?.id);
  const canUseSupabaseMemoryReview = isMemoryReviewer && !isDemoMode && isSupabaseConfigured() && hasSupabaseSession;

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-updates', user?.role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-updates', selectedClassId, user?.role],
    queryFn: () => listStudentsByClass(user, selectedClassId),
    enabled: !!selectedClassId && !!user,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ['parent-updates', user?.role, user?.email],
    queryFn: () => listParentUpdates(user),
    enabled: !!user,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-source-updates', user?.role, user?.email],
    queryFn: () => listAttendanceRecords(user),
    enabled: !!user,
  });

  const { data: homeworkAttachments = [] } = useQuery({
    queryKey: ['homework-source-updates', user?.role, user?.email],
    queryFn: () => listHomeworkAttachments(user),
    enabled: !!user,
    initialData: [],
  });
  const {
    data: reviewMemories = [],
    isLoading: reviewMemoriesLoading,
  } = useQuery({
    queryKey: ['class-memories-review', role, reviewStatusFilter, user?.branch_id, supabaseAppUser?.id],
    queryFn: async () => {
      const result = await listClassMemories({ status: reviewStatusFilter });
      if (result.error) {
        throw new Error(result.error.message || 'Unable to load Class Memories for review.');
      }
      return result.data || [];
    },
    enabled: canUseSupabaseMemoryReview,
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const canUseSupabaseMemoryUpload = !isDemoMode && Boolean(supabaseAppUser?.id) && isSupabaseConfigured();

  const isUuidLike = (value) => (
    typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );

  const sourceSnapshot = useMemo(() => {
    if (!selectedStudentId) {
      return null;
    }

    const studentAttendance = attendanceRecords
      .filter((item) => item.student_id === selectedStudentId)
      .sort((a, b) => new Date(b.date || b.session_date || 0) - new Date(a.date || a.session_date || 0));
    const latestAttendance = studentAttendance[0] || null;

    const studentUploads = homeworkAttachments
      .filter((item) => item.student_id === selectedStudentId)
      .sort((a, b) => new Date(b.upload_date || 0) - new Date(a.upload_date || 0));
    const latestUpload = studentUploads[0] || null;

    const studentUpdates = updates
      .filter((item) => item.student_id === selectedStudentId)
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    const latestTeacherNote = studentUpdates.find((item) => item.note_text?.trim())?.note_text || latestAttendance?.notes || '';
    const previousFeedback = studentUpdates.find((item) => item.shared_report || item.approved_report || item.final_message);
    const previousFeedbackSummary = previousFeedback
      ? (previousFeedback.shared_report || previousFeedback.approved_report || previousFeedback.final_message || '').trim()
      : '';

    const tags = [];
    if (latestAttendance?.status === 'late' || latestAttendance?.status === 'absent') {
      tags.push({ label: 'Progress concern', value: latestAttendance.status === 'late' ? 'Punctuality' : 'Attendance consistency' });
    }
    if (latestAttendance?.homework_status === 'completed') {
      tags.push({ label: 'Strength', value: 'Homework completion' });
    }
    if (latestUpload?.status === 'feedback_released') {
      tags.push({ label: 'Strength', value: 'Homework feedback cycle complete' });
    }

    return {
      latestAttendance,
      latestUpload,
      latestTeacherNote,
      previousFeedbackSummary,
      tags,
    };
  }, [selectedStudentId, attendanceRecords, homeworkAttachments, updates]);

  const needsMoreSourceData = selectedStudentId && (!notes.trim() || !sourceSnapshot?.latestAttendance?.status || !sourceSnapshot?.latestAttendance?.homework_status);

  const filteredUpdates = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? updates
      : updates.filter((item) => item.status === statusFilter);
    return [...filtered].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [updates, statusFilter]);

  const filteredCommentUpdates = useMemo(
    () => filteredUpdates.filter((item) => item.update_type !== 'weekly_report'),
    [filteredUpdates],
  );

  const filteredWeeklyUpdates = useMemo(
    () => filteredUpdates.filter((item) => item.update_type === 'weekly_report'),
    [filteredUpdates],
  );
  const selectedCommentRecord = useMemo(() => {
    if (!selectedStudentId || !selectedClassId) return null;
    return updates.find((item) =>
      item.update_type !== 'weekly_report'
      && item.student_id === selectedStudentId
      && item.class_id === selectedClassId
      && item.data_source === 'supabase_parent_comments'
    ) || null;
  }, [updates, selectedStudentId, selectedClassId]);
  const selectedWeeklyRecord = useMemo(() => {
    if (!selectedStudentId || !selectedClassId) return null;
    return updates.find((item) =>
      item.update_type === 'weekly_report'
      && item.student_id === selectedStudentId
      && item.class_id === selectedClassId
      && item.data_source === 'supabase_weekly_progress_reports'
    ) || null;
  }, [updates, selectedStudentId, selectedClassId]);

  const handleGenerate = async () => {
    if (!notes.trim()) {
      toast.message('Teacher note is required before generating a draft.');
      return;
    }
    if (!selectedStudentId) return;

    setGenerating(true);
    try {
      const { data, error } = await generateParentCommentDraft({
        studentId: selectedStudentId,
        classId: selectedClassId || selectedClass?.id || '',
        teacherNote: notes.trim(),
        observation: notes.trim(),
        tone: 'supportive',
        length: 'short',
        language: 'en',
      });

      if (error && !data) {
        toast.error(error.message || 'Unable to generate draft right now.');
        return;
      }

      const draftComment = data?.draft_comment?.trim();
      if (!draftComment) {
        toast.error('Draft generation returned empty content.');
        return;
      }

      setAiDraft(draftComment);
      setEditedMessage(draftComment);
      setApprovedReport('');
      setSharedReport('');
      setStep('review');

      if (error) {
        toast.message(error.message || 'Generated fallback mock draft.');
      } else if (data?.is_mock) {
        toast.success('Mock draft generated. Please review and edit before saving.');
      } else {
        toast.success('Draft generated. Please review and edit before saving.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.mode === 'supabase-draft') {
        const { commentId, message } = payload;
        const result = await updateParentCommentDraft({ commentId, message, status: 'draft' });
        if (result.error) {
          throw new Error(result.error.message || 'Failed to save draft');
        }
        return result.data;
      }
      if (payload.mode === 'supabase-release') {
        const { commentId, message } = payload;
        const result = await releaseParentComment({ commentId, message });
        if (result.error) {
          throw new Error(result.error.message || 'Failed to release parent comment');
        }
        return result.data;
      }
      if (payload.mode === 'supabase-weekly-draft') {
        const { reportId, reportText } = payload;
        const result = await updateWeeklyProgressReportDraft({ reportId, reportText, status: 'draft' });
        if (result.error) {
          throw new Error(result.error.message || 'Failed to save weekly report draft');
        }
        return result.data;
      }
      if (payload.mode === 'supabase-weekly-release') {
        const { reportId, reportText } = payload;
        const result = await releaseWeeklyProgressReport({ reportId, reportText });
        if (result.error) {
          throw new Error(result.error.message || 'Failed to release weekly progress report');
        }
        return result.data;
      }
      return createParentUpdate(payload.data);
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['parent-updates'] });
      if (payload?.mode === 'supabase-draft') {
        toast.success('Draft saved to Supabase successfully');
      } else if (payload?.mode === 'supabase-release') {
        toast.success('Parent comment released successfully');
      } else if (payload?.mode === 'supabase-weekly-draft') {
        toast.success('Weekly report draft saved to Supabase successfully');
      } else if (payload?.mode === 'supabase-weekly-release') {
        toast.success('Weekly progress report released successfully');
      } else {
        toast.success('Parent update saved successfully');
      }
      if (payload?.mode === 'supabase-weekly-draft' || payload?.mode === 'supabase-weekly-release') {
        return;
      }
      resetForm();
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to save parent update');
    },
  });
  const reviewApproveMutation = useMutation({
    mutationFn: async (memoryId) => {
      const result = await approveClassMemory({ memoryId });
      if (result.error || !result.data) {
        throw new Error(result.error?.message || 'Unable to approve and release Memory.');
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Memory approved and released.');
      queryClient.invalidateQueries({ queryKey: ['class-memories-review'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to approve Memory.');
    },
  });
  const reviewRejectMutation = useMutation({
    mutationFn: async ({ memoryId, reason }) => {
      const result = await rejectClassMemory({ memoryId, reason });
      if (result.error || !result.data) {
        throw new Error(result.error?.message || 'Unable to reject Memory.');
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Memory rejected.');
      queryClient.invalidateQueries({ queryKey: ['class-memories-review'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to reject Memory.');
    },
  });

  const handleSave = (statusOverride = 'edited') => {
    const hasSupabaseSession = Boolean(supabaseAppUser?.id);
    const canUseSupabaseDraftSave = (
      statusOverride === 'edited'
      && communicationType === 'comment'
      && !isDemoMode
      && isSupabaseConfigured()
      && hasSupabaseSession
    );

    if (canUseSupabaseDraftSave) {
      if (!selectedCommentRecord?.id) {
        toast.message('No real parent comment record available for Supabase draft save yet.');
        return;
      }
      if (!editedMessage.trim()) {
        toast.message('Edited message is required before saving draft.');
        return;
      }
      saveMutation.mutate({
        mode: 'supabase-draft',
        commentId: selectedCommentRecord.id,
        message: editedMessage.trim(),
      });
      return;
    }

    const canUseSupabaseRelease = (
      statusOverride === 'shared'
      && communicationType === 'comment'
      && !isDemoMode
      && isSupabaseConfigured()
      && hasSupabaseSession
    );

    if (canUseSupabaseRelease) {
      if (!selectedCommentRecord?.id) {
        toast.message('No real parent comment record available for Supabase release yet.');
        return;
      }
      if (!editedMessage.trim()) {
        toast.message('Edited message is required before release.');
        return;
      }
      saveMutation.mutate({
        mode: 'supabase-release',
        commentId: selectedCommentRecord.id,
        message: editedMessage.trim(),
      });
      return;
    }

    saveMutation.mutate({
      mode: 'legacy',
      data: {
      student_id: selectedStudentId,
      class_id: selectedClassId,
      branch_id: user?.branch_id,
      teacher_email: user?.email,
      teacher_name: user?.full_name,
      student_name: selectedStudent?.name,
      note_text: notes,
      ai_draft: aiDraft,
      final_message: editedMessage,
      approved_report: approvedReport,
      shared_report: sharedReport,
      status: statusOverride,
      update_type: 'comment',
      },
    });
  };

  const syncWeeklyTeacherComment = (value) => {
    setWeeklyReport((prev) => ({ ...prev, teacherComment: value }));
  };

  const handleGenerateWeeklyDraft = () => {
    if (!selectedStudentId) return;
    setWeeklyDraftGenerated(true);
    setWeeklyReport((prev) => ({
      ...prev,
      teacherComment: prev.teacherComment || `Demo summary for ${selectedStudent?.name || 'student'}: attendance and homework progress are reflected below.`,
      status: 'Ready for Review',
    }));
    toast.success('Weekly report draft generated in demo mode.');
  };

  const handleApproveWeeklyReport = () => {
    setWeeklyReport((prev) => ({ ...prev, status: 'Approved' }));
    toast.success('Weekly report approved for staff review.');
  };

  const handleReleaseWeeklyReport = () => {
    if (!selectedStudentId) return;
    const hasSupabaseSession = Boolean(supabaseAppUser?.id);
    const canUseSupabaseWeeklyRelease = (
      !isDemoMode
      && isSupabaseConfigured()
      && hasSupabaseSession
    );
    const reportText = buildWeeklyReportText({ weeklyReport, sourceSnapshot });

    if (canUseSupabaseWeeklyRelease) {
      if (!selectedWeeklyRecord?.id) {
        toast.message('No real weekly report record available for Supabase release yet.');
        return;
      }
      if (!reportText.trim()) {
        toast.message('Weekly report text is required before release.');
        return;
      }
      saveMutation.mutate({
        mode: 'supabase-weekly-release',
        reportId: selectedWeeklyRecord.id,
        reportText,
      });
      return;
    }

    saveMutation.mutate({
      student_id: selectedStudentId,
      class_id: selectedClassId,
      branch_id: user?.branch_id,
      teacher_email: user?.email,
      teacher_name: user?.full_name,
      student_name: selectedStudent?.name,
      note_text: weeklyReport.teacherComment,
      ai_draft: `Weekly report draft for ${selectedStudent?.name || 'student'}`,
      final_message: `Week ${weeklyReport.weekRange}\nLearning focus: ${weeklyReport.learningFocus}\nStrengths: ${weeklyReport.strengths}\nAreas to improve: ${weeklyReport.areasToImprove}\nTeacher comment: ${weeklyReport.teacherComment}\nSuggested home practice: ${weeklyReport.suggestedHomePractice}\nNext week focus: ${weeklyReport.nextWeekFocus}`,
      approved_report: `Week ${weeklyReport.weekRange}\nLearning focus: ${weeklyReport.learningFocus}\nStrengths: ${weeklyReport.strengths}\nAreas to improve: ${weeklyReport.areasToImprove}\nTeacher comment: ${weeklyReport.teacherComment}\nSuggested home practice: ${weeklyReport.suggestedHomePractice}\nNext week focus: ${weeklyReport.nextWeekFocus}`,
      shared_report: `Week ${weeklyReport.weekRange}\nLearning focus: ${weeklyReport.learningFocus}\nStrengths: ${weeklyReport.strengths}\nAreas to improve: ${weeklyReport.areasToImprove}\nTeacher comment: ${weeklyReport.teacherComment}\nSuggested home practice: ${weeklyReport.suggestedHomePractice}\nNext week focus: ${weeklyReport.nextWeekFocus}`,
      status: 'shared',
      update_type: 'weekly_report',
      weekly_report: {
        week_range: weeklyReport.weekRange,
        attendance_summary: sourceSnapshot?.latestAttendance?.status || 'Not recorded',
        homework_completion: sourceSnapshot?.latestAttendance?.homework_status || 'Not recorded',
        learning_focus: weeklyReport.learningFocus,
        strengths: weeklyReport.strengths,
        areas_to_improve: weeklyReport.areasToImprove,
        teacher_comment: weeklyReport.teacherComment,
        suggested_home_practice: weeklyReport.suggestedHomePractice,
        next_week_focus: weeklyReport.nextWeekFocus,
        report_status: 'Released',
      },
    });
  };

  const handleSaveWeeklyDraft = () => {
    if (!selectedStudentId) return;
    const hasSupabaseSession = Boolean(supabaseAppUser?.id);
    const canUseSupabaseWeeklyDraft = (
      !isDemoMode
      && isSupabaseConfigured()
      && hasSupabaseSession
    );

    if (!canUseSupabaseWeeklyDraft) {
      toast.message('Weekly report draft save remains demo/local in this mode.');
      return;
    }

    if (!selectedWeeklyRecord?.id) {
      toast.message('No real weekly report record available for Supabase draft save yet.');
      return;
    }

    const reportText = buildWeeklyReportText({ weeklyReport, sourceSnapshot });
    if (!reportText.trim()) {
      toast.message('Weekly report text is required before saving draft.');
      return;
    }

    saveMutation.mutate({
      mode: 'supabase-weekly-draft',
      reportId: selectedWeeklyRecord.id,
      reportText,
    });
  };

  const resetForm = () => {
    setNotes('');
    setAiDraft('');
    setEditedMessage('');
    setApprovedReport('');
    setSharedReport('');
    setStep('notes');
    setSelectedStudentId('');
    setWeeklyDraftGenerated(false);
    setWeeklyReport((prev) => ({ ...prev, status: 'Draft', teacherComment: '' }));
  };

  const resetMemoryForm = () => {
    setMemoryTitle('');
    setMemoryCaption('');
    setMemoryFile(null);
  };

  const memoryUploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId) {
        throw new Error('Select a class before submitting a Memory.');
      }
      if (!memoryFile) {
        throw new Error('Select an image file before submitting a Memory.');
      }
      if (!MEMORY_ALLOWED_TYPES.includes(memoryFile.type)) {
        throw new Error('Only JPEG, PNG, or WEBP images are allowed.');
      }
      if (memoryFile.size > MEMORY_MAX_SIZE_BYTES) {
        throw new Error('Image size must be 5MB or less.');
      }

      if (isDemoMode) {
        return { mode: 'demo' };
      }

      if (!canUseSupabaseMemoryUpload) {
        throw new Error('Sign in with Supabase teacher auth before submitting a Memory.');
      }

      const safeBranchId = selectedClass?.branch_id || user?.branch_id || null;
      if (!isUuidLike(safeBranchId)) {
        throw new Error('Branch ID is unavailable for this class context. Cannot upload safely yet.');
      }
      if (!isUuidLike(selectedClassId)) {
        throw new Error('Class ID is unavailable for upload. Select a valid class from Supabase data.');
      }
      if (selectedStudentId && !isUuidLike(selectedStudentId)) {
        throw new Error('Selected student ID is not valid for upload.');
      }

      const result = await uploadClassMemory({
        branchId: safeBranchId,
        classId: selectedClassId,
        studentId: selectedStudentId || null,
        title: memoryTitle,
        caption: memoryCaption,
        file: memoryFile,
        fileName: memoryFile.name,
        contentType: memoryFile.type,
        submitForReview: true,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Unable to submit Memory for review.');
      }
      return { mode: 'supabase', data: result.data };
    },
    onSuccess: (result) => {
      if (result.mode === 'demo') {
        toast.success('Demo mode: Memory submission simulated locally only. No upload was made.');
      } else {
        toast.success('Memory submitted for review.');
      }
      resetMemoryForm();
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to submit Memory for review.');
    },
  });
  const handleOpenMemoryPreview = async (memoryId) => {
    if (isDemoMode) {
      toast.message('Demo mode: Memory preview is local-only in this milestone.');
      return;
    }
    setPreviewingMemoryId(memoryId);
    try {
      const result = await getClassMemorySignedUrl({ memoryId, expiresIn: 120 });
      if (result.error || !result.data?.signed_url) {
        toast.error(result.error?.message || 'Unable to open Memory preview.');
        return;
      }
      window.open(result.data.signed_url, '_blank', 'noopener,noreferrer');
    } finally {
      setPreviewingMemoryId('');
    }
  };

  const handleRejectMemory = (memoryId) => {
    const reason = window.prompt('Enter rejection reason for this Memory:');
    if (typeof reason !== 'string' || !reason.trim()) {
      toast.message('Rejection reason is required.');
      return;
    }
    reviewRejectMutation.mutate({ memoryId, reason: reason.trim() });
  };

  const showNoClassesState = classes.length === 0 && !isMemoryReviewer;

  return (
    <div>
      <PageHeader
        title="Parent Updates"
        description={isTeacher ? 'Manage quick parent comments and weekly progress reports for assigned demo students. Nothing is sent automatically.' : 'Review parent comments and weekly progress reports in demo mode only.'}
      />

      {showNoClassesState ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="No classes available"
          description="Add or assign a class before creating parent updates."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {isMemoryReviewer && (
              <Card className="p-6">
                <h3 className="font-semibold mb-2">Class Memories Review</h3>
                <p className="text-sm text-muted-foreground mb-4">Review submitted Memories and control release to parents. Parents only see approved Memories.</p>
                {isDemoMode ? (
                  <Card className="p-4 border-dashed">
                    <p className="text-sm text-muted-foreground">Demo mode only: Class Memories review is local placeholder in this milestone. No Supabase read/write actions are executed.</p>
                  </Card>
                ) : !hasSupabaseSession || !isSupabaseConfigured() ? (
                  <Card className="p-4 border-dashed">
                    <p className="text-sm text-muted-foreground">Supabase authenticated staff session is required to review submitted Memories.</p>
                  </Card>
                ) : (
                  <>
                    <div className="mb-4 w-full sm:w-[220px]">
                      <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter review status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {reviewMemoriesLoading ? (
                      <p className="text-sm text-muted-foreground">Loading submitted Memories...</p>
                    ) : reviewMemories.length === 0 ? (
                      <EmptyState
                        icon={Eye}
                        title="No Memories for this status"
                        description="Submitted Memories will appear here for review."
                      />
                    ) : (
                      <div className="space-y-3">
                        {reviewMemories.map((memory) => (
                          <Card key={memory.id} className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <p className="font-medium">{memory.title?.trim() || 'Untitled Memory'}</p>
                                <p className="text-xs text-muted-foreground">{memory.caption?.trim() || 'No caption provided.'}</p>
                              </div>
                              <Badge variant="outline">{memory.visibility_status || 'submitted'}</Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                              <p>Branch: {memory.branch_id || '—'}</p>
                              <p>Class: {memory.class_id || '—'}</p>
                              <p>Student: {memory.student_id || 'Class-wide'}</p>
                              <p>Uploaded by: {memory.uploaded_by_profile_id || '—'}</p>
                              <p>Uploaded: {memory.created_at ? new Date(memory.created_at).toLocaleString('en-AU') : '—'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleOpenMemoryPreview(memory.id)}
                                disabled={previewingMemoryId === memory.id}
                              >
                                {previewingMemoryId === memory.id ? 'Opening...' : 'View Memory'}
                              </Button>
                              {memory.visibility_status === 'submitted' && (
                                <>
                                  <Button
                                    onClick={() => reviewApproveMutation.mutate(memory.id)}
                                    disabled={reviewApproveMutation.isPending || reviewRejectMutation.isPending}
                                  >
                                    Approve & Release
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleRejectMemory(memory.id)}
                                    disabled={reviewApproveMutation.isPending || reviewRejectMutation.isPending}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}
            {isTeacher && (
              <Card className="p-6">
                <h3 className="font-semibold mb-2">Parent Updates</h3>
                <p className="text-sm text-muted-foreground mb-4">Create teacher-approved quick comments after class, or prepare fixed weekly progress reports for parent review.</p>

                <Card className="p-4 border-dashed mb-4">
                  <h4 className="font-medium mb-1">Add Memory</h4>
                  <p className="text-xs text-muted-foreground mb-4">Submit a class Memory for review. Parents will only see approved Memories.</p>
                  <div className="space-y-3">
                    <Input
                      value={memoryTitle}
                      onChange={(e) => setMemoryTitle(e.target.value)}
                      placeholder="Memory title (optional)"
                    />
                    <Textarea
                      value={memoryCaption}
                      onChange={(e) => setMemoryCaption(e.target.value)}
                      placeholder="Caption"
                      className="min-h-[110px]"
                    />
                    <Input
                      type="file"
                      accept={MEMORY_ALLOWED_TYPES.join(',')}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (!file) {
                          setMemoryFile(null);
                          return;
                        }
                        if (!MEMORY_ALLOWED_TYPES.includes(file.type)) {
                          toast.error('Only JPEG, PNG, or WEBP images are allowed.');
                          e.target.value = '';
                          setMemoryFile(null);
                          return;
                        }
                        if (file.size > MEMORY_MAX_SIZE_BYTES) {
                          toast.error('Image size must be 5MB or less.');
                          e.target.value = '';
                          setMemoryFile(null);
                          return;
                        }
                        setMemoryFile(file);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Accepted: JPEG, PNG, WEBP up to 5MB.</p>
                    {!isDemoMode && !canUseSupabaseMemoryUpload && (
                      <p className="text-xs text-amber-700">Supabase teacher sign-in is required for real Memory upload.</p>
                    )}
                    {isDemoMode && (
                      <p className="text-xs text-muted-foreground">Demo mode only: this does not upload to Supabase.</p>
                    )}
                    <Button
                      type="button"
                      className="w-full sm:w-auto min-h-11"
                      disabled={!selectedClassId || !memoryCaption.trim() || !memoryFile || memoryUploadMutation.isPending}
                      onClick={() => memoryUploadMutation.mutate()}
                    >
                      {memoryUploadMutation.isPending ? 'Submitting...' : 'Submit Memory for review'}
                    </Button>
                    <p className="text-xs text-muted-foreground">Parents will only see approved Memories.</p>
                  </div>
                </Card>

                <div className="inline-flex rounded-lg border border-border p-1 mb-4">
                  <Button
                    type="button"
                    size="sm"
                    variant={communicationType === 'comment' ? 'default' : 'ghost'}
                    onClick={() => setCommunicationType('comment')}
                  >
                    Quick Parent Comment
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={communicationType === 'weekly_report' ? 'default' : 'ghost'}
                    onClick={() => setCommunicationType('weekly_report')}
                  >
                    Weekly Progress Report
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedStudentId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassId}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-4">
                  <Badge variant="outline">
                    Selected student: {selectedStudent?.name || 'No student selected'}
                  </Badge>
                </div>

                {communicationType === 'comment' && step === 'notes' && (
                  <>
                    <Card className="p-4 mb-4 border-dashed">
                      <h4 className="font-medium mb-2">Source Summary (Demo)</h4>
                      <p className="text-xs text-muted-foreground mb-3">AI comment draft uses teacher note + attendance + homework + previous feedback + student/class profile.</p>
                      {!selectedStudentId ? (
                        <p className="text-sm text-muted-foreground">Select a class and student to load source data.</p>
                      ) : (
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <p><span className="text-muted-foreground">Student:</span> {selectedStudent?.name || '—'}</p>
                            <p><span className="text-muted-foreground">Class:</span> {selectedClass?.name || selectedClassId || '—'}</p>
                            <p><span className="text-muted-foreground">Latest attendance:</span> {sourceSnapshot?.latestAttendance?.status || 'Not recorded'}</p>
                            <p><span className="text-muted-foreground">Homework status:</span> {sourceSnapshot?.latestAttendance?.homework_status || 'Not recorded'}</p>
                            <p><span className="text-muted-foreground">Homework upload/review:</span> {sourceSnapshot?.latestUpload?.status_label || sourceSnapshot?.latestUpload?.status || 'No upload yet'}</p>
                            <p><span className="text-muted-foreground">Previous feedback:</span> {sourceSnapshot?.previousFeedbackSummary ? 'Available' : 'None yet'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Latest teacher note</p>
                            <p className="rounded-md bg-accent/40 p-2 text-xs">
                              {sourceSnapshot?.latestTeacherNote || 'No saved teacher note yet.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sourceSnapshot?.tags?.length
                              ? sourceSnapshot.tags.map((tag, idx) => (
                                  <Badge key={`${tag.label}-${idx}`} variant="outline" className="text-xs">
                                    {tag.label}: {tag.value}
                                  </Badge>
                                ))
                              : <Badge variant="outline" className="text-xs">No strength/concern tags yet</Badge>}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">Demo only: in the future, this AI draft will use saved attendance, homework, marking results, and teacher-approved notes.</p>
                    </Card>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">1. Teacher lesson note</span>
                        <Badge variant="outline">Teacher note created</Badge>
                      </div>
                      <Textarea
                        placeholder="Write the teacher note only. Nothing is sent automatically."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[160px]"
                      />
                    </div>
                    {needsMoreSourceData && (
                      <p className="text-xs text-amber-700 mb-3">
                        Add a lesson note or confirm homework/attendance before generating a stronger draft.
                      </p>
                    )}
                    <Button
                      onClick={handleGenerate}
                      disabled={!notes.trim() || !selectedStudentId || generating}
                      className="gap-2"
                    >
                      {generating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Generate AI Comment Draft</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">No message is sent automatically. Parent sees this comment only after teacher/staff approval and release.</p>
                  </>
                )}

                {communicationType === 'comment' && step === 'review' && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Draft generated from available student/class profile, attendance record, homework status, previous feedback, and your teacher note.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">2. AI draft generated</span>
                          <Badge variant="outline" className="text-xs">AI draft generated</Badge>
                        </div>
                        <Textarea value={aiDraft} readOnly className="min-h-[120px] bg-accent/20" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">3. Teacher edited final message</span>
                          <Badge variant="outline" className="text-xs">Teacher edited final message</Badge>
                        </div>
                        <Textarea
                          value={editedMessage}
                          onChange={(e) => setEditedMessage(e.target.value)}
                          className="min-h-[150px]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">4. Approved parent comment</span>
                          <Badge variant="outline" className="text-xs">Approved report</Badge>
                        </div>
                        <Textarea
                          value={approvedReport}
                          onChange={(e) => setApprovedReport(e.target.value)}
                          placeholder="Set approved comment content before parent can view it."
                          className="min-h-[120px]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Share2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">5. Released to parent</span>
                          <Badge variant="outline" className="text-xs">Shared report</Badge>
                        </div>
                        <Textarea
                          value={sharedReport}
                          onChange={(e) => setSharedReport(e.target.value)}
                          placeholder="Optional record of the exact approved comment released later."
                          className="min-h-[120px]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => handleSave('edited')} disabled={saveMutation.isPending} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Draft
                      </Button>
                      <Button variant="outline" onClick={() => handleSave('approved')} disabled={saveMutation.isPending || !approvedReport.trim()}>
                        Approve Comment
                      </Button>
                      <Button variant="outline" onClick={() => handleSave('shared')} disabled={saveMutation.isPending || (isDemoMode && !sharedReport.trim())}>
                        Approve & Release to Parent
                      </Button>
                      <Button variant="outline" onClick={() => setStep('notes')}>
                        Back to Note
                      </Button>
                      <Button variant="ghost" onClick={resetForm}>
                        Discard
                      </Button>
                    </div>
                  </>
                )}

                {communicationType === 'weekly_report' && (
                  <div className="space-y-4">
                    <Card className="p-4 border-dashed">
                      <h4 className="font-medium mb-2">Weekly Progress Report</h4>
                      <p className="text-xs text-muted-foreground mb-3">Fixed weekly template in demo mode only. No scheduling, no auto-send.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Week range</p><p>{weeklyReport.weekRange}</p></div>
                        <div><p className="text-xs text-muted-foreground">Student name</p><p>{selectedStudent?.name || 'Select a student'}</p></div>
                        <div><p className="text-xs text-muted-foreground">Class</p><p>{selectedClass?.name || selectedClassId || 'Select a class'}</p></div>
                        <div><p className="text-xs text-muted-foreground">Attendance summary</p><p>{sourceSnapshot?.latestAttendance?.status || 'Not recorded'}</p></div>
                        <div><p className="text-xs text-muted-foreground">Homework completion</p><p>{sourceSnapshot?.latestAttendance?.homework_status || 'Not recorded'}</p></div>
                        <div><p className="text-xs text-muted-foreground">Report status</p><p>{weeklyReport.status}</p></div>
                      </div>
                      <div className="space-y-3 mt-4">
                        <div><p className="text-xs text-muted-foreground mb-1">Learning focus this week</p><Textarea value={weeklyReport.learningFocus} onChange={(e) => setWeeklyReport((prev) => ({ ...prev, learningFocus: e.target.value }))} className="min-h-[70px]" /></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Strengths</p><Textarea value={weeklyReport.strengths} onChange={(e) => setWeeklyReport((prev) => ({ ...prev, strengths: e.target.value }))} className="min-h-[70px]" /></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Areas to improve</p><Textarea value={weeklyReport.areasToImprove} onChange={(e) => setWeeklyReport((prev) => ({ ...prev, areasToImprove: e.target.value }))} className="min-h-[70px]" /></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Teacher comment</p><Textarea value={weeklyReport.teacherComment} onChange={(e) => syncWeeklyTeacherComment(e.target.value)} className="min-h-[90px]" /></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Suggested home practice</p><Textarea value={weeklyReport.suggestedHomePractice} onChange={(e) => setWeeklyReport((prev) => ({ ...prev, suggestedHomePractice: e.target.value }))} className="min-h-[70px]" /></div>
                        <div><p className="text-xs text-muted-foreground mb-1">Next week focus</p><Textarea value={weeklyReport.nextWeekFocus} onChange={(e) => setWeeklyReport((prev) => ({ ...prev, nextWeekFocus: e.target.value }))} className="min-h-[70px]" /></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">In production, weekly reports can be automatically drafted every weekend from saved attendance, homework, marking results, and teacher-approved notes. Teachers still review before parents see the report.</p>
                    </Card>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleGenerateWeeklyDraft} disabled={!selectedStudentId} className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        Generate Weekly Report Draft
                      </Button>
                      <Button variant="outline" onClick={handleSaveWeeklyDraft} disabled={!selectedStudentId || saveMutation.isPending} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Draft
                      </Button>
                      <Button variant="outline" onClick={handleApproveWeeklyReport} disabled={!weeklyDraftGenerated}>
                        Approve Weekly Report
                      </Button>
                      <Button variant="outline" onClick={handleReleaseWeeklyReport} disabled={!selectedStudentId || weeklyReport.status !== 'Approved' || saveMutation.isPending}>
                        Release to Parent
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold">All updates</h3>
                  <p className="text-sm text-muted-foreground">Quick comments and weekly reports stay in demo mode until approved and released.</p>
                </div>
                <div className="w-full sm:w-[220px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-xs text-muted-foreground">
                <p>Quick Parent Comments: short teacher-approved communication after a class/session.</p>
                <p>Weekly Progress Reports: fixed-template weekend report drafted from saved learning data (demo).</p>
              </div>

              {communicationType === 'comment' && filteredCommentUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports found for this filter.</p>
              ) : communicationType === 'weekly_report' && filteredWeeklyUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No weekly reports found for this filter.</p>
              ) : (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {(communicationType === 'comment' ? filteredCommentUpdates : filteredWeeklyUpdates).map((update) => (
                    <div key={update.id} className="rounded-lg border border-border p-4 bg-card">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="space-y-1 min-w-0">
                          <p className="font-medium truncate">{update.student_name || 'Student'}</p>
                          <p className="text-xs text-muted-foreground">{update.class_id || 'Class'} • {update.teacher_name || update.teacher_email || 'Teacher'}</p>
                          <p className="text-xs text-muted-foreground">{update.update_type === 'weekly_report' ? 'Weekly Progress Report' : 'Quick Parent Comment'}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(update.status)} className="text-xs whitespace-nowrap">
                          {STATUS_LABELS[update.status] || update.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Student name</p>
                          <p>{update.student_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Class</p>
                          <p>{update.class_id || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Teacher</p>
                          <p>{update.teacher_name || update.teacher_email || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Latest update date</p>
                          <p>{update.created_date ? new Date(update.created_date).toLocaleDateString('en-AU') : '—'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {update.shared_report || update.approved_report || update.final_message || update.ai_draft || update.note_text || 'No content yet.'}
                        </p>
                        <Button size="sm" variant="outline" className="gap-1.5">
                          {user?.role === ROLES.TEACHER ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {getActionLabel(user?.role)}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
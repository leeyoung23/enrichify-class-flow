import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BookOpen, CheckCircle2, ExternalLink, RefreshCw, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { getSelectedDemoRole } from '@/services/authService';
import { ROLES, getRole } from '@/services/permissionService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import {
  getHomeworkFileSignedUrl,
  listHomeworkFeedback,
  listHomeworkFiles,
  listHomeworkSubmissions,
  listHomeworkTasks,
} from '@/services/supabaseUploadService';
import {
  createOrUpdateHomeworkFeedback,
  markHomeworkSubmissionReviewed,
  releaseHomeworkFeedbackToParent,
  returnHomeworkForRevision,
} from '@/services/supabaseWriteService';

const SUBMISSION_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'returned_for_revision', label: 'Returned for revision' },
  { value: 'approved_for_parent', label: 'Approved for parent' },
];

const SUBMISSION_STATUS_BADGE = {
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
  reviewed: 'bg-green-100 text-green-700 border-green-200',
  returned_for_revision: 'bg-orange-100 text-orange-700 border-orange-200',
  approved_for_parent: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function Homework() {
  const { user } = useOutletContext();
  const { appUser: supabaseAppUser } = useSupabaseAuthState();
  const queryClient = useQueryClient();
  const role = getRole(user);
  const isDemoMode = Boolean(getSelectedDemoRole());
  const isStaffRole = role === ROLES.TEACHER || role === ROLES.BRANCH_SUPERVISOR || role === ROLES.HQ_ADMIN;
  const canUseSupabaseHomework = isStaffRole && !isDemoMode && isSupabaseConfigured() && Boolean(supabaseAppUser?.id);
  const canReleaseFeedback = role === ROLES.BRANCH_SUPERVISOR || role === ROLES.HQ_ADMIN;

  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('all');
  const [feedbackText, setFeedbackText] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [feedbackBoundSubmissionId, setFeedbackBoundSubmissionId] = useState('');

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['homework-review-tasks', role, supabaseAppUser?.id],
    enabled: canUseSupabaseHomework,
    queryFn: async () => {
      const result = await listHomeworkTasks({});
      if (result.error) throw new Error(result.error.message || 'Unable to load homework tasks');
      return result.data || [];
    },
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['homework-review-submissions', selectedTaskId, submissionStatusFilter, role, supabaseAppUser?.id],
    enabled: canUseSupabaseHomework,
    queryFn: async () => {
      const result = await listHomeworkSubmissions({
        homeworkTaskId: selectedTaskId || undefined,
        status: submissionStatusFilter === 'all' ? undefined : submissionStatusFilter,
      });
      if (result.error) throw new Error(result.error.message || 'Unable to load homework submissions');
      return result.data || [];
    },
  });

  const { data: feedbackRows = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['homework-review-feedback', selectedSubmissionId, role, supabaseAppUser?.id],
    enabled: canUseSupabaseHomework && Boolean(selectedSubmissionId),
    queryFn: async () => {
      const result = await listHomeworkFeedback({ homeworkSubmissionId: selectedSubmissionId });
      if (result.error) throw new Error(result.error.message || 'Unable to load homework feedback');
      return result.data || [];
    },
  });

  const { data: submissionFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['homework-review-files', selectedSubmissionId, role, supabaseAppUser?.id],
    enabled: canUseSupabaseHomework && Boolean(selectedSubmissionId),
    queryFn: async () => {
      const result = await listHomeworkFiles({ homeworkSubmissionId: selectedSubmissionId });
      if (result.error) throw new Error(result.error.message || 'Unable to load homework files');
      return result.data || [];
    },
  });

  const selectedSubmission = useMemo(
    () => submissions.find((item) => item.id === selectedSubmissionId) || null,
    [submissions, selectedSubmissionId]
  );
  const selectedFeedback = feedbackRows[0] || null;

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (submissions.length === 0) {
      setSelectedSubmissionId('');
      return;
    }
    if (!selectedSubmissionId || !submissions.some((item) => item.id === selectedSubmissionId)) {
      setSelectedSubmissionId(submissions[0].id);
    }
  }, [submissions, selectedSubmissionId]);

  useEffect(() => {
    if (!selectedSubmissionId || feedbackBoundSubmissionId === selectedSubmissionId) return;
    const seedFeedback = feedbackRows[0] || null;
    setFeedbackText(seedFeedback?.feedback_text || '');
    setNextStep(seedFeedback?.next_step || '');
    setInternalNote(seedFeedback?.internal_note || '');
    setFeedbackBoundSubmissionId(selectedSubmissionId);
  }, [selectedSubmissionId, feedbackRows, feedbackBoundSubmissionId]);

  const refreshReviewData = () => {
    void queryClient.invalidateQueries({ queryKey: ['homework-review-submissions'] });
    void queryClient.invalidateQueries({ queryKey: ['homework-review-feedback'] });
  };

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmissionId) throw new Error('Select a submission first.');
      const result = await createOrUpdateHomeworkFeedback({
        homeworkSubmissionId: selectedSubmissionId,
        feedbackText,
        nextStep,
        internalNote,
      });
      if (result.error) throw new Error(result.error.message || 'Unable to save draft feedback');
      return result.data;
    },
    onSuccess: () => {
      toast.success('Draft feedback saved.');
      refreshReviewData();
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to save draft feedback');
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmissionId) throw new Error('Select a submission first.');
      const result = await markHomeworkSubmissionReviewed({ homeworkSubmissionId: selectedSubmissionId });
      if (result.error) throw new Error(result.error.message || 'Unable to mark submission reviewed');
      return result.data;
    },
    onSuccess: () => {
      toast.success('Submission marked reviewed.');
      refreshReviewData();
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to mark submission reviewed');
    },
  });

  const returnRevisionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmissionId) throw new Error('Select a submission first.');
      const result = await returnHomeworkForRevision({
        homeworkSubmissionId: selectedSubmissionId,
        feedbackText,
        nextStep,
        internalNote,
      });
      if (result.error) throw new Error(result.error.message || 'Unable to return submission for revision');
      return result.data;
    },
    onSuccess: () => {
      toast.success('Submission returned for revision.');
      refreshReviewData();
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to return submission for revision');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFeedback?.id) throw new Error('No feedback row is available to release.');
      const result = await releaseHomeworkFeedbackToParent({ homeworkFeedbackId: selectedFeedback.id });
      if (result.error) throw new Error(result.error.message || 'Unable to release feedback to parent');
      return result.data;
    },
    onSuccess: () => {
      toast.success('Feedback released to parent.');
      refreshReviewData();
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to release feedback to parent');
    },
  });

  const openFile = async (homeworkFileId) => {
    const result = await getHomeworkFileSignedUrl({ homeworkFileId, expiresIn: 120 });
    if (result.error || !result.data?.signed_url) {
      toast.error(result.error?.message || 'Unable to open submitted file');
      return;
    }
    window.open(result.data.signed_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div>
      <PageHeader
        title={role === ROLES.TEACHER ? 'My Homework Review' : 'Homework Review'}
        description="Teacher/staff homework review workflow. Parent-facing homework UI remains a separate future milestone."
      />

      {!isStaffRole ? (
        <EmptyState
          icon={BookOpen}
          title="Homework review is staff-only"
          description="Teacher/staff homework review UI is not available for this role."
        />
      ) : isDemoMode ? (
        <Card className="p-5 border-dashed">
          <p className="font-medium mb-2">Demo-only homework review placeholder</p>
          <p className="text-sm text-muted-foreground">
            Demo role keeps this page local-only. No Supabase task/submission/file/feedback reads or writes are executed in demo mode.
          </p>
        </Card>
      ) : !canUseSupabaseHomework ? (
        <Card className="p-5 border-dashed">
          <p className="text-sm text-muted-foreground">
            Supabase authenticated staff session is required to use homework review.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="space-y-3">
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={tasksLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={tasksLoading ? 'Loading tasks...' : 'Filter by task'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title || 'Untitled task'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={submissionStatusFilter} onValueChange={setSubmissionStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter submissions" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBMISSION_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium">Submission queue</p>
                <Badge variant="outline">{submissions.length}</Badge>
              </div>
              {submissionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading submissions...</p>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions available for this filter.</p>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {submissions.map((submission) => {
                    const selected = submission.id === selectedSubmissionId;
                    const statusClass = SUBMISSION_STATUS_BADGE[submission.status] || 'bg-muted text-muted-foreground border-border';
                    return (
                      <button
                        key={submission.id}
                        type="button"
                        onClick={() => setSelectedSubmissionId(submission.id)}
                        className={`w-full text-left rounded-lg border p-3 ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{submission.student_id}</p>
                          <Badge variant="outline" className={statusClass}>
                            {submission.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">Submission: {submission.id}</p>
                        <p className="text-xs text-muted-foreground truncate">Task: {submission.homework_task_id}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="xl:col-span-3 space-y-4">
            {!selectedSubmission ? (
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Select a submission to review details and feedback actions.</p>
              </Card>
            ) : (
              <>
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="font-medium">Submission detail</p>
                    <Badge variant="outline" className={SUBMISSION_STATUS_BADGE[selectedSubmission.status] || ''}>
                      {selectedSubmission.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p><span className="text-muted-foreground">Submission ID:</span> {selectedSubmission.id}</p>
                    <p><span className="text-muted-foreground">Task ID:</span> {selectedSubmission.homework_task_id}</p>
                    <p><span className="text-muted-foreground">Student ID:</span> {selectedSubmission.student_id}</p>
                    <p><span className="text-muted-foreground">Submitted:</span> {selectedSubmission.submitted_at ? new Date(selectedSubmission.submitted_at).toLocaleString('en-AU') : '—'}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Uploaded files</p>
                    {filesLoading ? (
                      <p className="text-sm text-muted-foreground">Loading files...</p>
                    ) : submissionFiles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No files found for this submission.</p>
                    ) : (
                      <div className="space-y-2">
                        {submissionFiles.map((fileRow) => (
                          <div key={fileRow.id} className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{fileRow.file_name || 'Unnamed file'}</p>
                              <p className="text-xs text-muted-foreground">{fileRow.content_type || 'unknown type'}</p>
                            </div>
                            <Button size="sm" variant="outline" className="min-h-10" onClick={() => openFile(fileRow.id)}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View uploaded file
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">Feedback draft</p>
                    <Badge variant="outline">
                      {feedbackLoading ? 'Loading...' : (selectedFeedback?.status || 'no feedback yet')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Feedback text</p>
                    <Textarea
                      value={feedbackText}
                      onChange={(event) => setFeedbackText(event.target.value)}
                      className="min-h-[110px]"
                      placeholder="Write teacher feedback draft..."
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Next step</p>
                    <Textarea
                      value={nextStep}
                      onChange={(event) => setNextStep(event.target.value)}
                      className="min-h-[90px]"
                      placeholder="Actionable next step for revision/progress..."
                    />
                  </div>
                  <div>
                    <p className="text-xs text-amber-700 mb-1">Internal note (staff only, never parent-visible)</p>
                    <Textarea
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      className="min-h-[90px]"
                      placeholder="Internal coaching/review notes only."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="min-h-10"
                      onClick={() => saveDraftMutation.mutate()}
                      disabled={saveDraftMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Save draft feedback
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => markReviewedMutation.mutate()}
                      disabled={markReviewedMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark reviewed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => returnRevisionMutation.mutate()}
                      disabled={returnRevisionMutation.isPending}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Return for revision
                    </Button>
                    {canReleaseFeedback ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10"
                        onClick={() => releaseMutation.mutate()}
                        disabled={releaseMutation.isPending || !selectedFeedback?.id}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Release to parent
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground self-center">
                        Release remains supervisor/HQ action in this phase.
                      </p>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
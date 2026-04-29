import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BookOpen, CheckCircle2, ExternalLink, RefreshCw, Send, Sparkles } from 'lucide-react';
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
import { getClassLearningContext, getStudentLearningContext } from '@/services/supabaseReadService';
import { buildHomeworkFeedbackDraftContext, generateMockHomeworkFeedbackDraft } from '@/services/aiDraftService';
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

const DEMO_HOMEWORK_TASKS = [
  {
    id: 'demo-homework-task-1',
    title: 'Reading reflection worksheet',
    subject: 'Literacy',
    due_date: '2026-05-12',
  },
];

const DEMO_HOMEWORK_SUBMISSIONS = [
  {
    id: 'demo-homework-submission-1',
    homework_task_id: 'demo-homework-task-1',
    class_id: 'demo-class-1',
    student_id: 'demo-student-01',
    submitted_at: '2026-05-11T10:30:00.000Z',
    submission_note: 'Demo parent note: completed with support at home.',
    status: 'submitted',
  },
];

const DEMO_HOMEWORK_FILES = [
  {
    id: 'demo-homework-file-1',
    homework_submission_id: 'demo-homework-submission-1',
    file_name: 'reading-reflection-demo.pdf',
    content_type: 'application/pdf',
    file_size_bytes: 256000,
  },
];

const DEMO_HOMEWORK_FEEDBACK = [
  {
    id: 'demo-homework-feedback-1',
    homework_submission_id: 'demo-homework-submission-1',
    status: 'draft',
    feedback_text: '',
    next_step: '',
    internal_note: '',
  },
];

function isUuidLike(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

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
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftSafetyNote, setAiDraftSafetyNote] = useState('');
  const [demoSubmissions, setDemoSubmissions] = useState(() => DEMO_HOMEWORK_SUBMISSIONS);
  const [demoFeedbackRows, setDemoFeedbackRows] = useState(() => DEMO_HOMEWORK_FEEDBACK);

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

  const taskRows = isDemoMode ? DEMO_HOMEWORK_TASKS : tasks;
  const submissionRows = isDemoMode ? demoSubmissions : submissions;
  const feedbackDataRows = isDemoMode ? demoFeedbackRows : feedbackRows;
  const submissionFileRows = isDemoMode ? DEMO_HOMEWORK_FILES : submissionFiles;
  const tasksBusy = isDemoMode ? false : tasksLoading;
  const submissionsBusy = isDemoMode ? false : submissionsLoading;
  const feedbackBusy = isDemoMode ? false : feedbackLoading;
  const filesBusy = isDemoMode ? false : filesLoading;

  const selectedSubmission = useMemo(
    () => submissionRows.find((item) => item.id === selectedSubmissionId) || null,
    [submissionRows, selectedSubmissionId]
  );
  const selectedTask = useMemo(
    () => taskRows.find((item) => item.id === selectedSubmission?.homework_task_id) || null,
    [taskRows, selectedSubmission?.homework_task_id]
  );
  const selectedFeedback = feedbackDataRows[0] || null;

  useEffect(() => {
    if (!selectedTaskId && taskRows.length > 0) {
      setSelectedTaskId(taskRows[0].id);
    }
  }, [taskRows, selectedTaskId]);

  useEffect(() => {
    if (submissionRows.length === 0) {
      setSelectedSubmissionId('');
      return;
    }
    if (!selectedSubmissionId || !submissionRows.some((item) => item.id === selectedSubmissionId)) {
      setSelectedSubmissionId(submissionRows[0].id);
    }
  }, [submissionRows, selectedSubmissionId]);

  useEffect(() => {
    if (!selectedSubmissionId || feedbackBoundSubmissionId === selectedSubmissionId) return;
    const seedFeedback = feedbackDataRows[0] || null;
    setFeedbackText(seedFeedback?.feedback_text || '');
    setNextStep(seedFeedback?.next_step || '');
    setInternalNote(seedFeedback?.internal_note || '');
    setFeedbackBoundSubmissionId(selectedSubmissionId);
  }, [selectedSubmissionId, feedbackDataRows, feedbackBoundSubmissionId]);

  const refreshReviewData = () => {
    if (isDemoMode) return;
    void queryClient.invalidateQueries({ queryKey: ['homework-review-submissions'] });
    void queryClient.invalidateQueries({ queryKey: ['homework-review-feedback'] });
  };

  const updateDemoSubmissionStatus = (status) => {
    if (!selectedSubmissionId) return;
    setDemoSubmissions((prev) => prev.map((row) => (
      row.id === selectedSubmissionId ? { ...row, status } : row
    )));
    setDemoFeedbackRows((prev) => prev.map((row) => (
      row.homework_submission_id === selectedSubmissionId
        ? {
          ...row,
          status: status === 'approved_for_parent' ? 'released_to_parent' : 'draft',
          feedback_text: feedbackText,
          next_step: nextStep,
          internal_note: internalNote,
        }
        : row
    )));
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
    if (isDemoMode) {
      toast.message(`Demo mode: preview-only file ${homeworkFileId}. No signed URL call is made.`);
      return;
    }
    const result = await getHomeworkFileSignedUrl({ homeworkFileId, expiresIn: 120 });
    if (result.error || !result.data?.signed_url) {
      toast.error(result.error?.message || 'Unable to open submitted file');
      return;
    }
    window.open(result.data.signed_url, '_blank', 'noopener,noreferrer');
  };

  const draftFeedbackWithAi = async () => {
    if (!selectedSubmission) {
      toast.message('Select a submission before generating an AI draft.');
      return;
    }
    try {
      setAiDraftLoading(true);
      setAiDraftSafetyNote('');
      let studentLearningContext = {};
      let classLearningContext = {};

      if (
        !isDemoMode
        && canUseSupabaseHomework
        && isUuidLike(selectedSubmission.student_id)
        && isUuidLike(selectedSubmission.class_id)
      ) {
        const [studentContextResult, classContextResult] = await Promise.all([
          getStudentLearningContext({ studentId: selectedSubmission.student_id }),
          getClassLearningContext({ classId: selectedSubmission.class_id }),
        ]);
        studentLearningContext = studentContextResult?.data || {};
        classLearningContext = classContextResult?.data || {};
      }

      const context = buildHomeworkFeedbackDraftContext({
        homeworkTask: selectedTask || {},
        homeworkSubmission: selectedSubmission,
        studentLearningContext,
        classLearningContext,
        teacherObservation: '',
        uploadedFileSummary: submissionFileRows,
        mode: 'teacher_homework_mock',
        tone: 'supportive',
        length: 'short',
      });
      const draft = generateMockHomeworkFeedbackDraft(context);

      setFeedbackText(draft.feedbackText || '');
      setNextStep(draft.nextStep || '');
      if (draft.teacherNotes) {
        setInternalNote(draft.teacherNotes);
      }
      setAiDraftSafetyNote(draft.safetyNotes || 'AI draft generated. Teacher review is required before any save/release.');
      setFeedbackBoundSubmissionId(selectedSubmissionId);
      toast.success('Mock AI draft generated. Please review and edit before saving.');
    } catch (error) {
      toast.error(error?.message || 'Unable to generate AI draft right now.');
    } finally {
      setAiDraftLoading(false);
    }
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
      ) : !isDemoMode && !canUseSupabaseHomework ? (
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
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={tasksBusy}>
                  <SelectTrigger>
                    <SelectValue placeholder={tasksBusy ? 'Loading tasks...' : 'Filter by task'} />
                  </SelectTrigger>
                  <SelectContent>
                    {taskRows.map((task) => (
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
                <Badge variant="outline">{submissionRows.length}</Badge>
              </div>
              {submissionsBusy ? (
                <p className="text-sm text-muted-foreground">Loading submissions...</p>
              ) : submissionRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions available for this filter.</p>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {submissionRows.map((submission) => {
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
                    {filesBusy ? (
                      <p className="text-sm text-muted-foreground">Loading files...</p>
                    ) : submissionFileRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No files found for this submission.</p>
                    ) : (
                      <div className="space-y-2">
                        {submissionFileRows.map((fileRow) => (
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
                      {feedbackBusy ? 'Loading...' : (selectedFeedback?.status || 'no feedback yet')}
                    </Badge>
                  </div>
                  {isDemoMode ? (
                    <p className="text-xs text-muted-foreground">
                      Demo preview only: all actions are local and do not call Supabase.
                    </p>
                  ) : null}
                  <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">AI draft assist (mock only)</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10"
                        onClick={draftFeedbackWithAi}
                        disabled={aiDraftLoading}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {aiDraftLoading ? 'Generating...' : 'Draft feedback with AI'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generates a mock AI draft from safe metadata/context only. Teacher review and edit are required before save/release.
                    </p>
                    {aiDraftSafetyNote ? (
                      <p className="text-xs text-amber-700">{aiDraftSafetyNote}</p>
                    ) : null}
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
                      onClick={() => {
                        if (isDemoMode) {
                          updateDemoSubmissionStatus('under_review');
                          toast.success('Demo mode: draft saved locally.');
                          return;
                        }
                        saveDraftMutation.mutate();
                      }}
                      disabled={isDemoMode ? false : saveDraftMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Save draft feedback
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => {
                        if (isDemoMode) {
                          updateDemoSubmissionStatus('reviewed');
                          toast.success('Demo mode: submission marked reviewed locally.');
                          return;
                        }
                        markReviewedMutation.mutate();
                      }}
                      disabled={isDemoMode ? false : markReviewedMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark reviewed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => {
                        if (isDemoMode) {
                          updateDemoSubmissionStatus('returned_for_revision');
                          toast.success('Demo mode: returned for revision locally.');
                          return;
                        }
                        returnRevisionMutation.mutate();
                      }}
                      disabled={isDemoMode ? false : returnRevisionMutation.isPending}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Return for revision
                    </Button>
                    {canReleaseFeedback ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10"
                        onClick={() => {
                          if (isDemoMode) {
                            updateDemoSubmissionStatus('approved_for_parent');
                            toast.success('Demo mode: release action simulated locally.');
                            return;
                          }
                          releaseMutation.mutate();
                        }}
                        disabled={isDemoMode ? !selectedFeedback?.id : (releaseMutation.isPending || !selectedFeedback?.id)}
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
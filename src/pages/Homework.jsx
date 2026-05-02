import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, BookOpen, CheckCircle2, ExternalLink, Eye, RefreshCw, Send, Sparkles, Upload, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  getClassLearningContext,
  getStudentLearningContext,
  listHomeworkTrackerByClass,
  listHomeworkTrackerByStudent,
} from '@/services/supabaseReadService';
import { buildHomeworkFeedbackDraftContext, generateMockHomeworkFeedbackDraft } from '@/services/aiDraftService';
import {
  getHomeworkFileSignedUrl,
  listHomeworkFeedback,
  listHomeworkFiles,
  listHomeworkSubmissions,
  listHomeworkTasks,
  releaseHomeworkFileToParent,
  uploadMarkedHomeworkFile,
} from '@/services/supabaseUploadService';
import {
  createHomeworkTaskWithAssignees,
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
  { value: 'approved_for_parent', label: 'Feedback released' },
];

function formatTeacherSubmissionStatus(status) {
  const labels = {
    submitted: 'Submitted',
    under_review: 'Under review',
    reviewed: 'Reviewed',
    returned_for_revision: 'Returned for revision',
    approved_for_parent: 'Feedback released',
  };
  if (!status) return '—';
  return labels[status] || String(status).replace(/_/g, ' ');
}

function formatTeacherFeedbackRecordStatus(status) {
  const labels = {
    draft: 'Draft',
    released_to_parent: 'Shared with family',
  };
  if (!status) return 'No feedback yet';
  return labels[status] || String(status).replace(/_/g, ' ');
}

function shortenStaffReference(id) {
  if (!id || typeof id !== 'string') return '';
  const trimmed = id.trim();
  if (trimmed.length <= 10) return trimmed;
  return `…${trimmed.slice(-8)}`;
}

const SUBMISSION_STATUS_BADGE = {
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
  reviewed: 'bg-green-100 text-green-700 border-green-200',
  returned_for_revision: 'bg-orange-100 text-orange-700 border-orange-200',
  approved_for_parent: 'bg-purple-100 text-purple-700 border-purple-200',
};

const TRACKER_STATUS_BADGE = {
  Submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  'Not Submitted': 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Review': 'bg-amber-100 text-amber-700 border-amber-200',
  Returned: 'bg-orange-100 text-orange-700 border-orange-200',
  'Feedback Released': 'bg-purple-100 text-purple-700 border-purple-200',
  'Follow-up Needed': 'bg-rose-100 text-rose-700 border-rose-200',
};

const DEMO_HOMEWORK_TASKS = [
  {
    id: 'demo-homework-task-1',
    title: 'Reading reflection worksheet',
    subject: 'Literacy',
    due_date: '2026-05-12',
    assignment_scope: 'class',
  },
  {
    id: 'demo-homework-task-2',
    title: 'Math challenge set B',
    subject: 'Numeracy',
    due_date: '2026-05-13',
    assignment_scope: 'selected_students',
  },
  {
    id: 'demo-homework-task-3',
    title: 'Science summary paragraph',
    subject: 'Science',
    due_date: '2026-05-14',
    assignment_scope: 'individual',
  },
];

const DEMO_HOMEWORK_STUDENTS = [
  { id: 'demo-student-01', name: 'Student Demo A', school: 'School A', stream: 'Year 5 Literacy Boost' },
  { id: 'demo-student-02', name: 'Student Demo B', school: 'School B', stream: 'Year 5 Mixed Support' },
  { id: 'demo-student-03', name: 'Student Demo C', school: 'School C', stream: 'Year 5 Extension' },
];

function getSubmissionStudentLabel(studentId) {
  if (!studentId) return 'Student';
  const demo = DEMO_HOMEWORK_STUDENTS.find((s) => s.id === studentId);
  if (demo) return demo.name;
  return `Student (${shortenStaffReference(studentId)})`;
}

const ASSIGNMENT_SCOPE_LABELS = {
  class: 'Whole class',
  selected_students: 'Selected students',
  individual: 'One student',
};

const DEMO_HOMEWORK_CLASSES = [
  { id: 'demo-class-1', label: 'Demo Class A - Year 5 Mixed Group' },
];

const DEMO_TASK_ASSIGNEES = [
  { homework_task_id: 'demo-homework-task-2', student_id: 'demo-student-01' },
  { homework_task_id: 'demo-homework-task-2', student_id: 'demo-student-03' },
  { homework_task_id: 'demo-homework-task-3', student_id: 'demo-student-02' },
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
  {
    id: 'demo-homework-submission-2',
    homework_task_id: 'demo-homework-task-2',
    class_id: 'demo-class-1',
    student_id: 'demo-student-01',
    submitted_at: '2026-05-11T12:15:00.000Z',
    submission_note: 'Demo parent note: challenge set attempted independently.',
    status: 'under_review',
  },
  {
    id: 'demo-homework-submission-3',
    homework_task_id: 'demo-homework-task-2',
    class_id: 'demo-class-1',
    student_id: 'demo-student-03',
    submitted_at: '2026-05-11T15:20:00.000Z',
    submission_note: 'Demo parent note: extension work submitted.',
    status: 'approved_for_parent',
  },
  {
    id: 'demo-homework-submission-4',
    homework_task_id: 'demo-homework-task-3',
    class_id: 'demo-class-1',
    student_id: 'demo-student-02',
    submitted_at: '2026-05-12T08:05:00.000Z',
    submission_note: 'Demo parent note: needs revision for detail depth.',
    status: 'returned_for_revision',
  },
];

const DEMO_HOMEWORK_FILES = [
  {
    id: 'demo-homework-file-2',
    homework_submission_id: 'demo-homework-submission-2',
    file_name: 'math-challenge-demo-a.pdf',
    content_type: 'application/pdf',
    file_size_bytes: 322000,
  },
  {
    id: 'demo-homework-file-3',
    homework_submission_id: 'demo-homework-submission-4',
    file_name: 'science-summary-demo-b.jpg',
    content_type: 'image/jpeg',
    file_size_bytes: 198000,
  },
  {
    id: 'demo-homework-file-1',
    homework_submission_id: 'demo-homework-submission-1',
    file_name: 'reading-reflection-demo.pdf',
    content_type: 'application/pdf',
    file_size_bytes: 256000,
  },
];

const DEMO_MARKED_HOMEWORK_FILES = [
  {
    id: 'demo-marked-file-2',
    homework_submission_id: 'demo-homework-submission-2',
    file_role: 'teacher_marked_homework',
    released_to_parent: false,
    file_name: 'demo-marked-math-a.pdf',
    content_type: 'application/pdf',
    file_size_bytes: 164000,
    staff_note: 'Demo internal marking note: review algebra steps.',
    uploaded_by_label: 'Demo Teacher',
    released_by_label: null,
    released_at: null,
    created_at: '2026-05-11T13:00:00.000Z',
  },
  {
    id: 'demo-marked-file-3',
    homework_submission_id: 'demo-homework-submission-3',
    file_role: 'teacher_marked_homework',
    released_to_parent: true,
    file_name: 'demo-marked-extension-c.jpg',
    content_type: 'image/jpeg',
    file_size_bytes: 121000,
    staff_note: 'Demo internal note: extension challenge completed well.',
    uploaded_by_label: 'Demo Teacher',
    released_by_label: 'Demo Supervisor',
    released_at: '2026-05-12T10:00:00.000Z',
    created_at: '2026-05-12T09:10:00.000Z',
  },
];

const DEMO_HOMEWORK_FEEDBACK = [
  {
    id: 'demo-homework-feedback-2',
    homework_submission_id: 'demo-homework-submission-2',
    status: 'draft',
    feedback_text: '',
    next_step: '',
    internal_note: '',
  },
  {
    id: 'demo-homework-feedback-3',
    homework_submission_id: 'demo-homework-submission-3',
    status: 'released_to_parent',
    feedback_text: 'Great effort on challenge strategies. Keep showing reasoning clearly.',
    next_step: 'Try one additional extension question with step-by-step explanation.',
    internal_note: '',
  },
  {
    id: 'demo-homework-feedback-4',
    homework_submission_id: 'demo-homework-submission-4',
    status: 'draft',
    feedback_text: 'Good attempt. Expand scientific vocabulary and add one supporting example.',
    next_step: 'Revise and resubmit with 2-3 evidence points.',
    internal_note: 'Follow-up needed for writing confidence.',
  },
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
  const [activeViewMode, setActiveViewMode] = useState('by_task');
  const [selectedStudentId, setSelectedStudentId] = useState('demo-student-01');
  const [selectedStudentTaskId, setSelectedStudentTaskId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('all');
  const [feedbackText, setFeedbackText] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [feedbackBoundSubmissionId, setFeedbackBoundSubmissionId] = useState('');
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftSafetyNote, setAiDraftSafetyNote] = useState('');
  const [demoSubmissions, setDemoSubmissions] = useState(() => DEMO_HOMEWORK_SUBMISSIONS);
  const [demoFeedbackRows, setDemoFeedbackRows] = useState(() => DEMO_HOMEWORK_FEEDBACK);
  const [demoMarkedFiles, setDemoMarkedFiles] = useState(() => DEMO_MARKED_HOMEWORK_FILES);
  const [demoMarkedFileNameBySubmissionId, setDemoMarkedFileNameBySubmissionId] = useState({});
  const [demoMarkedNoteBySubmissionId, setDemoMarkedNoteBySubmissionId] = useState({});
  const [demoCreatedTasks, setDemoCreatedTasks] = useState([]);
  const [demoCreatedAssignees, setDemoCreatedAssignees] = useState([]);
  const [createHomeworkOpen, setCreateHomeworkOpen] = useState(false);
  const [markedUploadFile, setMarkedUploadFile] = useState(null);
  const [markedStaffNote, setMarkedStaffNote] = useState('');
  const [createForm, setCreateForm] = useState({
    assignmentType: 'class',
    classId: DEMO_HOMEWORK_CLASSES[0]?.id || '',
    studentIds: [],
    title: '',
    subject: '',
    instructions: '',
    dueDate: '',
    notes: '',
  });

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
      const result = await listHomeworkFiles({
        homeworkSubmissionId: selectedSubmissionId,
        fileRole: 'parent_uploaded_homework',
      });
      if (result.error) throw new Error(result.error.message || 'Unable to load homework files');
      return result.data || [];
    },
  });
  const { data: markedFilesRows = [], isLoading: markedFilesLoading } = useQuery({
    queryKey: ['homework-review-marked-files', selectedSubmissionId, role, supabaseAppUser?.id],
    enabled: canUseSupabaseHomework && Boolean(selectedSubmissionId) && isUuidLike(selectedSubmissionId),
    queryFn: async () => {
      const result = await listHomeworkFiles({
        homeworkSubmissionId: selectedSubmissionId,
        fileRole: 'teacher_marked_homework',
      });
      if (result.error) throw new Error(result.error.message || 'Unable to load marked homework files');
      return result.data || [];
    },
  });

  const classOptions = useMemo(() => {
    if (isDemoMode) return [];
    const classIdSet = new Set();
    for (const task of tasks) {
      if (isUuidLike(task?.class_id)) classIdSet.add(task.class_id);
    }
    return Array.from(classIdSet);
  }, [isDemoMode, tasks]);

  const resolvedTrackerClassId = useMemo(() => {
    if (isDemoMode) return null;
    if (isUuidLike(selectedClassId)) return selectedClassId;
    const selectedTaskClassId = tasks.find((task) => task?.id === selectedTaskId)?.class_id;
    if (isUuidLike(selectedTaskClassId)) return selectedTaskClassId;
    return classOptions[0] || null;
  }, [isDemoMode, selectedClassId, tasks, selectedTaskId, classOptions]);

  const { data: trackerByClassRows = [], isLoading: trackerByClassLoading } = useQuery({
    queryKey: ['homework-tracker-by-class', resolvedTrackerClassId, role, supabaseAppUser?.id],
    enabled: canUseSupabaseHomework && !isDemoMode && activeViewMode === 'by_task' && isUuidLike(resolvedTrackerClassId),
    queryFn: async () => {
      const result = await listHomeworkTrackerByClass({ classId: resolvedTrackerClassId });
      if (result.error) throw new Error(result.error.message || 'Unable to load homework tracker by class');
      return Array.isArray(result.data) ? result.data : [];
    },
  });

  const nonDemoStudentIdOptions = useMemo(() => {
    if (isDemoMode) return [];
    const ids = new Set();
    const selectedSubmissionRow = submissions.find((row) => row?.id === selectedSubmissionId);
    if (isUuidLike(selectedSubmissionRow?.student_id)) ids.add(selectedSubmissionRow.student_id);
    for (const row of submissions) {
      if (isUuidLike(row?.student_id)) ids.add(row.student_id);
    }
    for (const trackerRow of trackerByClassRows) {
      for (const assigneeRow of trackerRow?.assignees || []) {
        if (isUuidLike(assigneeRow?.student_id)) ids.add(assigneeRow.student_id);
      }
      for (const submissionRow of trackerRow?.submissions || []) {
        if (isUuidLike(submissionRow?.student_id)) ids.add(submissionRow.student_id);
      }
    }
    return Array.from(ids);
  }, [isDemoMode, selectedSubmissionId, submissions, trackerByClassRows]);

  const resolvedStudentId = useMemo(() => {
    if (isDemoMode) return selectedStudentId;
    if (isUuidLike(selectedStudentId)) return selectedStudentId;
    return nonDemoStudentIdOptions[0] || '';
  }, [isDemoMode, selectedStudentId, nonDemoStudentIdOptions]);

  const { data: trackerByStudentData = null, isLoading: trackerByStudentLoading } = useQuery({
    queryKey: ['homework-tracker-by-student', resolvedStudentId, role, supabaseAppUser?.id],
    enabled: canUseSupabaseHomework && !isDemoMode && activeViewMode === 'by_student' && isUuidLike(resolvedStudentId),
    queryFn: async () => {
      const result = await listHomeworkTrackerByStudent({ studentId: resolvedStudentId });
      if (result.error) throw new Error(result.error.message || 'Unable to load homework tracker by student');
      return result.data || null;
    },
  });

  const demoTaskRows = useMemo(
    () => [...demoCreatedTasks, ...DEMO_HOMEWORK_TASKS],
    [demoCreatedTasks]
  );
  const taskRows = isDemoMode ? demoTaskRows : tasks;
  const submissionRows = isDemoMode ? demoSubmissions : submissions;
  const feedbackDataRows = isDemoMode ? demoFeedbackRows : feedbackRows;
  const submissionFileRows = isDemoMode ? DEMO_HOMEWORK_FILES : submissionFiles;
  const tasksBusy = isDemoMode ? false : tasksLoading;
  const trackerBusy = isDemoMode ? false : trackerByClassLoading;
  const trackerByStudentBusy = isDemoMode ? false : trackerByStudentLoading;
  const submissionsBusy = isDemoMode ? false : submissionsLoading;
  const feedbackBusy = isDemoMode ? false : feedbackLoading;
  const filesBusy = isDemoMode ? false : filesLoading;
  const markedFilesBusy = isDemoMode ? false : markedFilesLoading;

  const selectedSubmission = useMemo(
    () => submissionRows.find((item) => item.id === selectedSubmissionId) || null,
    [submissionRows, selectedSubmissionId]
  );
  const selectedTask = useMemo(
    () => taskRows.find((item) => item.id === selectedSubmission?.homework_task_id) || null,
    [taskRows, selectedSubmission?.homework_task_id]
  );
  const selectedFeedback = feedbackDataRows[0] || null;
  const selectedTaskByFilter = useMemo(
    () => taskRows.find((item) => item.id === selectedTaskId) || null,
    [taskRows, selectedTaskId]
  );
  const selectedMarkedFiles = useMemo(() => {
    if (!selectedSubmissionId) return [];
    if (isDemoMode) {
      return demoMarkedFiles
        .filter((row) => row.homework_submission_id === selectedSubmissionId)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    return Array.isArray(markedFilesRows) ? markedFilesRows : [];
  }, [selectedSubmissionId, isDemoMode, demoMarkedFiles, markedFilesRows]);

  const demoAssignmentsByTask = useMemo(() => {
    const map = new Map();
    for (const row of [...DEMO_TASK_ASSIGNEES, ...demoCreatedAssignees]) {
      if (!map.has(row.homework_task_id)) map.set(row.homework_task_id, new Set());
      map.get(row.homework_task_id).add(row.student_id);
    }
    return map;
  }, [demoCreatedAssignees]);

  const demoTaskTrackerRows = useMemo(() => {
    if (!isDemoMode) return [];
    return taskRows.map((task) => {
      const scopedStudentIds = task.assignment_scope === 'class'
        ? DEMO_HOMEWORK_STUDENTS.map((student) => student.id)
        : Array.from(demoAssignmentsByTask.get(task.id) || []);
      const taskSubmissions = demoSubmissions.filter((submission) => submission.homework_task_id === task.id);
      const counts = {
        assigned: scopedStudentIds.length,
        submitted: 0,
        notSubmitted: 0,
        underReview: 0,
        feedbackReleased: 0,
      };
      for (const studentId of scopedStudentIds) {
        const submission = taskSubmissions.find((row) => row.student_id === studentId);
        if (!submission) {
          counts.notSubmitted += 1;
          continue;
        }
        if (submission.status === 'submitted') counts.submitted += 1;
        else if (submission.status === 'under_review' || submission.status === 'reviewed') counts.underReview += 1;
        else if (submission.status === 'approved_for_parent') counts.feedbackReleased += 1;
        else if (submission.status === 'returned_for_revision') counts.notSubmitted += 1;
      }
      const previewRows = scopedStudentIds.map((studentId) => ({
        student: DEMO_HOMEWORK_STUDENTS.find((item) => item.id === studentId) || { id: studentId, name: studentId },
        submission: taskSubmissions.find((row) => row.student_id === studentId) || null,
      }));
      return {
        task,
        counts,
        previewRows,
      };
    });
  }, [isDemoMode, taskRows, demoAssignmentsByTask, demoSubmissions]);

  const demoStudentTrackerRows = useMemo(() => {
    if (!isDemoMode) return [];
    return DEMO_HOMEWORK_STUDENTS.map((student) => {
      const assignedTasks = demoTaskRows.filter((task) => (
        task.assignment_scope === 'class'
        || (demoAssignmentsByTask.get(task.id)?.has(student.id))
      ));
      const items = assignedTasks.map((task) => {
        const submission = demoSubmissions.find((row) => row.homework_task_id === task.id && row.student_id === student.id) || null;
        let status = 'Not Submitted';
        if (submission?.status === 'submitted') status = 'Submitted';
        else if (submission?.status === 'under_review' || submission?.status === 'reviewed') status = 'Under Review';
        else if (submission?.status === 'returned_for_revision') status = 'Returned';
        else if (submission?.status === 'approved_for_parent') status = 'Feedback Released';

        const hasReleasedFeedback = Boolean(
          submission
          && demoFeedbackRows.some(
            (feedback) => feedback.homework_submission_id === submission.id && feedback.status === 'released_to_parent'
          )
        );
        const followUpNeeded = status === 'Returned' || (
          status === 'Not Submitted' && new Date(task.due_date).getTime() < Date.now()
        );
        if (followUpNeeded && status !== 'Returned') status = 'Follow-up Needed';

        return { task, submission, status, hasReleasedFeedback };
      });
      const counts = {
        submitted: items.filter((item) => item.status === 'Submitted').length,
        notSubmitted: items.filter((item) => item.status === 'Not Submitted').length,
        underReview: items.filter((item) => item.status === 'Under Review').length,
        returned: items.filter((item) => item.status === 'Returned').length,
        feedbackReleased: items.filter((item) => item.status === 'Feedback Released').length,
        followUpNeeded: items.filter((item) => item.status === 'Follow-up Needed').length,
      };
      return { student, items, counts };
    });
  }, [isDemoMode, demoAssignmentsByTask, demoSubmissions, demoFeedbackRows, demoTaskRows]);

  const selectedDemoTaskTracker = useMemo(
    () => demoTaskTrackerRows.find((row) => row.task.id === selectedTaskId) || demoTaskTrackerRows[0] || null,
    [demoTaskTrackerRows, selectedTaskId]
  );
  const selectedRealTaskTracker = useMemo(
    () => trackerByClassRows.find((row) => row?.task?.id === selectedTaskId) || trackerByClassRows[0] || null,
    [trackerByClassRows, selectedTaskId]
  );
  const selectedDemoStudentTracker = useMemo(
    () => demoStudentTrackerRows.find((row) => row.student.id === selectedStudentId) || demoStudentTrackerRows[0] || null,
    [demoStudentTrackerRows, selectedStudentId]
  );
  const selectedRealStudentItems = useMemo(
    () => (Array.isArray(trackerByStudentData?.assignedItems) ? trackerByStudentData.assignedItems : []),
    [trackerByStudentData]
  );
  const selectedRealStudentItem = useMemo(
    () => selectedRealStudentItems.find((item) => item?.task?.id === selectedStudentTaskId) || selectedRealStudentItems[0] || null,
    [selectedRealStudentItems, selectedStudentTaskId]
  );

  const getStudentTrackerStatusLabel = (item) => {
    const rawStatus = item?.status || 'assigned';
    const dueDate = item?.task?.due_date;
    const isOverdue = dueDate ? new Date(dueDate).getTime() < Date.now() : false;
    if (rawStatus === 'feedbackReleased') return 'Feedback Released';
    if (rawStatus === 'underReview') return 'Under Review';
    if (rawStatus === 'returned') return 'Returned';
    if (rawStatus === 'submitted' || rawStatus === 'reviewed') return 'Submitted';
    if (rawStatus === 'assigned') return isOverdue ? 'Follow-up Needed' : 'Not Submitted';
    return 'Not Submitted';
  };

  const createClassOptions = useMemo(() => {
    if (isDemoMode) return DEMO_HOMEWORK_CLASSES;
    return classOptions.map((classId, index) => ({ id: classId, label: `Class option ${index + 1}` }));
  }, [isDemoMode, classOptions]);

  const createStudentOptions = useMemo(() => {
    if (isDemoMode) return DEMO_HOMEWORK_STUDENTS;
    return nonDemoStudentIdOptions.map((studentId, index) => ({
      id: studentId,
      name: `Student option ${index + 1}`,
      school: '',
      stream: '',
    }));
  }, [isDemoMode, nonDemoStudentIdOptions]);

  const resolvedCreateBranchId = useMemo(() => {
    if (isDemoMode) return null;
    if (!isUuidLike(createForm.classId)) return null;
    const taskMatch = tasks.find((task) => task?.class_id === createForm.classId && isUuidLike(task?.branch_id));
    if (isUuidLike(taskMatch?.branch_id)) return taskMatch.branch_id;
    const trackerMatch = trackerByClassRows.find((row) => row?.task?.class_id === createForm.classId && isUuidLike(row?.task?.branch_id));
    if (isUuidLike(trackerMatch?.task?.branch_id)) return trackerMatch.task.branch_id;
    return null;
  }, [isDemoMode, createForm.classId, tasks, trackerByClassRows]);

  const resetCreateForm = (nextAssignmentType = 'class') => {
    setCreateForm({
      assignmentType: nextAssignmentType,
      classId: isDemoMode ? (DEMO_HOMEWORK_CLASSES[0]?.id || '') : (classOptions[0] || ''),
      studentIds: [],
      title: '',
      subject: '',
      instructions: '',
      dueDate: '',
      notes: '',
    });
  };

  const openCreateHomeworkShell = (assignmentType = 'class') => {
    resetCreateForm(assignmentType);
    if (assignmentType === 'individual' && selectedStudentId) {
      setCreateForm((prev) => ({ ...prev, studentIds: [selectedStudentId] }));
    }
    if (isDemoMode) {
      setCreateForm((prev) => ({ ...prev, classId: DEMO_HOMEWORK_CLASSES[0]?.id || prev.classId }));
    } else if (resolvedTrackerClassId && isUuidLike(resolvedTrackerClassId)) {
      setCreateForm((prev) => ({ ...prev, classId: resolvedTrackerClassId }));
    }
    setCreateHomeworkOpen(true);
  };

  const setAssignmentType = (assignmentType) => {
    setCreateForm((prev) => ({
      ...prev,
      assignmentType,
      studentIds: assignmentType === 'class' ? [] : prev.studentIds,
    }));
  };

  const toggleCreateStudent = (studentId) => {
    setCreateForm((prev) => {
      if (prev.assignmentType === 'individual') {
        return { ...prev, studentIds: [studentId] };
      }
      const set = new Set(prev.studentIds);
      if (set.has(studentId)) set.delete(studentId);
      else set.add(studentId);
      return { ...prev, studentIds: [...set] };
    });
  };

  const clearSelectedStudents = () => {
    setCreateForm((prev) => ({ ...prev, studentIds: [] }));
  };

  const saveCreateHomeworkShell = () => {
    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle) {
      toast.error('Title is required.');
      return;
    }
    if (!createForm.classId) {
      toast.error('Class is required.');
      return;
    }
    if (!isDemoMode && !isUuidLike(createForm.classId)) {
      toast.error('A valid class selection is required.');
      return;
    }
    if (createForm.assignmentType === 'selected_students' && createForm.studentIds.length === 0) {
      toast.error('Select one or more students for selected students assignment.');
      return;
    }
    if (createForm.assignmentType === 'individual' && createForm.studentIds.length !== 1) {
      toast.error('Individual assignment requires exactly one student.');
      return;
    }
    if (createForm.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(createForm.dueDate.trim())) {
      toast.error('Due date must be YYYY-MM-DD.');
      return;
    }

    if (!isDemoMode) {
      if (!isUuidLike(resolvedCreateBranchId)) {
        toast.error('Valid class/branch context is required before saving.');
        return;
      }
      createHomeworkMutation.mutate();
      return;
    }

    const assignmentScope = createForm.assignmentType;
    const taskId = `demo-created-task-${Date.now()}`;
    const safeDueDate = createForm.dueDate.trim() || null;
    const taskRow = {
      id: taskId,
      title: trimmedTitle,
      subject: createForm.subject.trim() || null,
      instructions: createForm.instructions.trim() || null,
      due_date: safeDueDate,
      assignment_scope: assignmentScope,
      class_id: createForm.classId,
      notes: createForm.notes.trim() || null,
    };
    setDemoCreatedTasks((prev) => [taskRow, ...prev]);

    if (assignmentScope !== 'class') {
      const assigneeRows = createForm.studentIds.map((studentId) => ({
        homework_task_id: taskId,
        student_id: studentId,
      }));
      setDemoCreatedAssignees((prev) => [...assigneeRows, ...prev]);
    }

    setSelectedTaskId(taskId);
    setCreateHomeworkOpen(false);
    resetCreateForm('class');
    toast.success('Demo mode: homework assignment created locally.');
  };

  useEffect(() => {
    if (!selectedTaskId && taskRows.length > 0) {
      setSelectedTaskId(taskRows[0].id);
    }
  }, [taskRows, selectedTaskId]);

  useEffect(() => {
    if (isDemoMode) return;
    if (!selectedClassId && classOptions.length > 0) {
      setSelectedClassId(classOptions[0]);
    }
  }, [isDemoMode, selectedClassId, classOptions]);

  useEffect(() => {
    if (isDemoMode) return;
    if (!isUuidLike(selectedStudentId) && nonDemoStudentIdOptions.length > 0) {
      setSelectedStudentId(nonDemoStudentIdOptions[0]);
    }
  }, [isDemoMode, selectedStudentId, nonDemoStudentIdOptions]);

  useEffect(() => {
    if (isDemoMode || activeViewMode !== 'by_task') return;
    if (trackerByClassRows.length === 0) return;
    const hasSelectedTask = trackerByClassRows.some((row) => row?.task?.id === selectedTaskId);
    if (!hasSelectedTask) {
      setSelectedTaskId(trackerByClassRows[0]?.task?.id || '');
    }
  }, [isDemoMode, activeViewMode, trackerByClassRows, selectedTaskId]);

  useEffect(() => {
    if (isDemoMode || activeViewMode !== 'by_student') return;
    if (selectedRealStudentItems.length === 0) {
      setSelectedStudentTaskId('');
      return;
    }
    const hasSelectedItem = selectedRealStudentItems.some((item) => item?.task?.id === selectedStudentTaskId);
    if (!hasSelectedItem) {
      setSelectedStudentTaskId(selectedRealStudentItems[0]?.task?.id || '');
    }
  }, [isDemoMode, activeViewMode, selectedRealStudentItems, selectedStudentTaskId]);

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

  useEffect(() => {
    setMarkedUploadFile(null);
    setMarkedStaffNote('');
  }, [selectedSubmissionId]);

  const refreshReviewData = () => {
    if (isDemoMode) return;
    void queryClient.invalidateQueries({ queryKey: ['homework-tracker-by-class'] });
    void queryClient.invalidateQueries({ queryKey: ['homework-tracker-by-student'] });
    void queryClient.invalidateQueries({ queryKey: ['homework-review-submissions'] });
    void queryClient.invalidateQueries({ queryKey: ['homework-review-feedback'] });
    void queryClient.invalidateQueries({ queryKey: ['homework-review-files'] });
    void queryClient.invalidateQueries({ queryKey: ['homework-review-marked-files'] });
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
      toast.success('Feedback shared with family.');
      refreshReviewData();
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to release feedback to parent');
    },
  });

  const createHomeworkMutation = useMutation({
    mutationFn: async () => {
      const trimmedTitle = createForm.title.trim();
      if (!trimmedTitle) throw new Error('Title is required.');
      if (!isUuidLike(createForm.classId)) throw new Error('A valid class selection is required.');
      if (!isUuidLike(resolvedCreateBranchId)) {
        throw new Error('Valid class/branch context is required before saving.');
      }
      if (createForm.assignmentType === 'selected_students' && createForm.studentIds.length === 0) {
        throw new Error('Select one or more students for selected students assignment.');
      }
      if (createForm.assignmentType === 'individual' && createForm.studentIds.length !== 1) {
        throw new Error('Individual assignment requires exactly one student.');
      }
      if (createForm.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(createForm.dueDate.trim())) {
        throw new Error('Due date must be YYYY-MM-DD.');
      }

      const result = await createHomeworkTaskWithAssignees({
        branchId: resolvedCreateBranchId,
        classId: createForm.classId,
        title: trimmedTitle,
        instructions: createForm.instructions.trim() || null,
        subject: createForm.subject.trim() || null,
        dueDate: createForm.dueDate.trim() || null,
        assignmentScope: createForm.assignmentType,
        studentIds: createForm.assignmentType === 'class' ? [] : createForm.studentIds,
        notes: createForm.notes.trim() || null,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Unable to create homework right now.');
      }
      return result.data || null;
    },
    onSuccess: (data) => {
      toast.success('Homework assignment created.');
      setCreateHomeworkOpen(false);
      resetCreateForm('class');
      if (data?.task?.id) {
        setActiveViewMode('by_task');
        setSelectedTaskId(data.task.id);
      }
      void queryClient.invalidateQueries({ queryKey: ['homework-review-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['homework-tracker-by-class'] });
      void queryClient.invalidateQueries({ queryKey: ['homework-tracker-by-student'] });
      void queryClient.invalidateQueries({ queryKey: ['homework-review-submissions'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to create homework right now.');
    },
  });

  const uploadMarkedFileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmissionId || !isUuidLike(selectedSubmissionId)) {
        throw new Error('Select a valid submission before uploading marked work.');
      }
      if (!markedUploadFile) {
        throw new Error('Select a marked file before uploading.');
      }
      const result = await uploadMarkedHomeworkFile({
        homeworkSubmissionId: selectedSubmissionId,
        file: markedUploadFile,
        notes: markedStaffNote,
      });
      if (result.error) throw new Error(result.error.message || 'Unable to upload marked file right now.');
      return result.data || null;
    },
    onSuccess: () => {
      toast.success('Marked file uploaded.');
      setMarkedUploadFile(null);
      setMarkedStaffNote('');
      void queryClient.invalidateQueries({ queryKey: ['homework-review-marked-files'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to upload marked file right now.');
    },
  });

  const releaseMarkedFileMutation = useMutation({
    mutationFn: async (fileId) => {
      if (!isUuidLike(fileId)) throw new Error('Unable to release marked file right now.');
      const result = await releaseHomeworkFileToParent({ fileId });
      if (result.error) throw new Error(result.error.message || 'Unable to release marked file to parent.');
      return result.data || null;
    },
    onSuccess: () => {
      toast.success('Marked work shared with family.');
      void queryClient.invalidateQueries({ queryKey: ['homework-review-marked-files'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to release marked file to parent.');
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

  const openMarkedFile = async (homeworkFileId) => {
    if (isDemoMode) {
      toast.message(`Demo mode: marked file preview only (${homeworkFileId}). No signed URL call is made.`);
      return;
    }
    if (!isUuidLike(homeworkFileId)) {
      toast.error('Unable to open marked file.');
      return;
    }
    const result = await getHomeworkFileSignedUrl({ homeworkFileId, expiresIn: 120 });
    if (result.error || !result.data?.signed_url) {
      toast.error(result.error?.message || 'Unable to open marked file');
      return;
    }
    window.open(result.data.signed_url, '_blank', 'noopener,noreferrer');
  };

  const demoMarkedFileName = selectedSubmissionId ? (demoMarkedFileNameBySubmissionId[selectedSubmissionId] || '') : '';
  const demoMarkedNote = selectedSubmissionId ? (demoMarkedNoteBySubmissionId[selectedSubmissionId] || '') : '';

  const handleDemoMarkedUpload = () => {
    if (!selectedSubmissionId) {
      toast.message('Select a submission before adding marked work.');
      return;
    }
    const rawName = (demoMarkedFileNameBySubmissionId[selectedSubmissionId] || '').trim();
    const fileName = rawName || `demo-marked-${selectedSubmissionId.slice(0, 8)}.pdf`;
    const staffNote = (demoMarkedNoteBySubmissionId[selectedSubmissionId] || '').trim();
    const nowIso = new Date().toISOString();
    const row = {
      id: `demo-marked-file-${Date.now()}`,
      homework_submission_id: selectedSubmissionId,
      file_role: 'teacher_marked_homework',
      released_to_parent: false,
      file_name: fileName,
      content_type: fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')
        ? 'image/jpeg'
        : (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf'),
      file_size_bytes: 128000,
      staff_note: staffNote || null,
      uploaded_by_label: 'Demo Teacher',
      released_by_label: null,
      released_at: null,
      created_at: nowIso,
    };
    setDemoMarkedFiles((prev) => [row, ...prev]);
    setDemoMarkedFileNameBySubmissionId((prev) => ({ ...prev, [selectedSubmissionId]: '' }));
    setDemoMarkedNoteBySubmissionId((prev) => ({ ...prev, [selectedSubmissionId]: '' }));
    toast.success('Demo mode: marked file added locally. No upload was performed.');
  };

  const handleDemoMarkedView = (fileId) => {
    toast.message(`Demo mode: marked file preview only (${fileId}). No signed URL call is made.`);
  };

  const handleDemoMarkedRelease = (fileId) => {
    setDemoMarkedFiles((prev) => prev.map((row) => (
      row.id === fileId
        ? {
          ...row,
          released_to_parent: true,
          released_at: new Date().toISOString(),
          released_by_label: 'Demo Supervisor',
        }
        : row
    )));
    toast.success('Demo mode: marked file release toggled locally.');
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
        title={role === ROLES.TEACHER ? 'Homework review (staff)' : 'Homework review (staff)'}
        description="For teachers and staff: check submissions, open student files, add teacher-marked work, and draft feedback here. Families only see homework feedback and marked files after you release them—nothing sends automatically. The parent homework view is separate and shows released work only."
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
            Sign in with your staff account to review homework from your centre. Demo mode below shows a safe preview without saving to the server.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-2 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={activeViewMode === 'by_task' ? 'default' : 'outline'}
                  className="min-h-10 w-full sm:w-auto"
                  onClick={() => setActiveViewMode('by_task')}
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  By Task
                </Button>
                <Button
                  type="button"
                  variant={activeViewMode === 'by_student' ? 'default' : 'outline'}
                  className="min-h-10 w-full sm:w-auto"
                  onClick={() => setActiveViewMode('by_student')}
                >
                  <Users className="h-4 w-4 mr-1" />
                  By Student
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                {isDemoMode && activeViewMode === 'by_student' ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => openCreateHomeworkShell('individual')}
                  >
                    Quick individual create
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="min-h-10 w-full sm:w-auto"
                  onClick={() => openCreateHomeworkShell('class')}
                >
                  Create homework task
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground px-1 pt-3 border-t mt-3">
              {activeViewMode === 'by_task'
                ? 'By Task: check each homework assignment and who has submitted, is waiting for review, or has feedback released.'
                : 'By Student: check each child’s homework status across assignments.'}
            </p>
          </Card>

          {createHomeworkOpen ? (
            <Card className="p-4 sm:p-5 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-lg">Create homework task</p>
                <Badge variant="outline">
                  {ASSIGNMENT_SCOPE_LABELS[createForm.assignmentType] || 'Assignment'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isDemoMode
                  ? 'Demo-only simulation: creating a task runs in the browser only. No real upload to the server.'
                  : 'Creates a homework assignment for your class or selected students. Saving does not email families or send feedback to parents.'}
                {' '}
                When signed in, this uses your staff account. It only creates the task—review and release still happen below.
              </p>

              <div>
                <p className="text-sm font-semibold text-primary mb-3">Step 1 · Choose who receives this homework</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Who is it for?</Label>
                    <Select value={createForm.assignmentType} onValueChange={setAssignmentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class">Whole class</SelectItem>
                        <SelectItem value="selected_students">Selected students</SelectItem>
                        <SelectItem value="individual">One student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select
                      value={createForm.classId}
                      onValueChange={(value) => setCreateForm((prev) => ({ ...prev, classId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {createClassOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {createForm.assignmentType !== 'class' ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        Select students {createForm.assignmentType === 'individual' ? '(pick one)' : '(pick one or more)'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Selected {createForm.studentIds.length}</Badge>
                        <Button type="button" size="sm" variant="outline" onClick={clearSelectedStudents}>
                          Clear selected
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {createStudentOptions.map((student) => {
                        const selected = createForm.studentIds.includes(student.id);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => toggleCreateStudent(student.id)}
                            className={`rounded-lg border p-3 text-left ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <p className="text-sm font-medium">{student.name}</p>
                            {student.school || student.stream ? (
                              <p className="text-xs text-muted-foreground">
                                {[student.school, student.stream].filter(Boolean).join(' · ')}
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-semibold text-primary mb-3">Step 2 · Add homework details</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={createForm.title}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Homework title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={createForm.subject}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, subject: event.target.value }))}
                      placeholder="Subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={createForm.dueDate}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Instructions</Label>
                    <Textarea
                      className="min-h-[96px]"
                      value={createForm.instructions}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, instructions: event.target.value }))}
                      placeholder="What should students do?"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes (optional, staff only)</Label>
                    <Textarea
                      className="min-h-[84px]"
                      value={createForm.notes}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Optional notes for your team—not shown to families"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-primary mb-3">Step 3 · Save homework task</p>
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  You are creating a <span className="font-medium text-foreground">{ASSIGNMENT_SCOPE_LABELS[createForm.assignmentType] || 'homework'}</span>
                  {createForm.dueDate ? ` · due ${createForm.dueDate}` : ''}.
                  {' '}This step only saves the assignment. It does not release marked work or feedback to parents.
                </div>
                <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
                  <Button
                    type="button"
                    className="min-h-10 w-full sm:w-auto"
                    onClick={saveCreateHomeworkShell}
                    disabled={!isDemoMode && createHomeworkMutation.isPending}
                  >
                    {!isDemoMode && createHomeworkMutation.isPending ? 'Saving...' : 'Save homework task'}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-10 w-full sm:w-auto"
                    variant="outline"
                    onClick={() => {
                      setCreateHomeworkOpen(false);
                      resetCreateForm('class');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 space-y-4">
            {activeViewMode === 'by_task' ? (
              <>
                <Card className="p-4">
                  <div className="space-y-3">
                    {!isDemoMode ? (
                      <Select value={selectedClassId || resolvedTrackerClassId || ''} onValueChange={setSelectedClassId} disabled={classOptions.length === 0}>
                        <SelectTrigger>
                          <SelectValue placeholder={classOptions.length === 0 ? 'No class context available' : 'Select class'} />
                        </SelectTrigger>
                        <SelectContent>
                          {classOptions.map((classId) => (
                            <SelectItem key={classId} value={classId}>
                              {classId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
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

                {isDemoMode ? (
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium">By Task tracker (demo)</p>
                        <p className="text-xs text-muted-foreground mt-1">Tap a task to filter submissions and counts.</p>
                      </div>
                      <Badge variant="outline">{demoTaskTrackerRows.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {demoTaskTrackerRows.map((row) => {
                        const selected = row.task.id === selectedTaskId;
                        const scopeLabel = row.task.assignment_scope === 'selected_students'
                          ? 'selected students'
                          : row.task.assignment_scope;
                        return (
                          <button
                            key={row.task.id}
                            type="button"
                            onClick={() => setSelectedTaskId(row.task.id)}
                            className={`w-full text-left rounded-lg border p-3 ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-medium truncate">{row.task.title}</p>
                              <Badge variant="outline">{scopeLabel}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">Due {row.task.due_date || '—'}</p>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                              <span>Assigned: {row.counts.assigned}</span>
                              <span>Submitted: {row.counts.submitted}</span>
                              <span>Not submitted: {row.counts.notSubmitted}</span>
                              <span>Under review: {row.counts.underReview}</span>
                              <span>Feedback released: {row.counts.feedbackReleased}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium">By Task tracker</p>
                        <p className="text-xs text-muted-foreground mt-1">Tap a task to filter submissions and counts.</p>
                      </div>
                      <Badge variant="outline">{trackerByClassRows.length}</Badge>
                    </div>
                    {!isUuidLike(resolvedTrackerClassId) ? (
                      <p className="text-sm text-muted-foreground">
                        No valid class context is available yet. Select a class-scoped task to load tracker rows.
                      </p>
                    ) : trackerBusy ? (
                      <p className="text-sm text-muted-foreground">Loading task tracker...</p>
                    ) : trackerByClassRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No task tracker rows available for this class.</p>
                    ) : (
                      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                        {trackerByClassRows.map((row) => {
                          const task = row?.task || {};
                          const selected = task.id === selectedTaskId;
                          const scopeLabel = task.assignment_scope === 'selected_students'
                            ? 'selected students'
                            : (task.assignment_scope || 'class');
                          return (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => setSelectedTaskId(task.id)}
                              className={`w-full text-left rounded-lg border p-3 ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-sm font-medium truncate">{task.title || 'Untitled task'}</p>
                                <Badge variant="outline">{scopeLabel}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">Due {task.due_date || '—'}</p>
                              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                <span>Assigned: {row?.counts?.assigned ?? 0}</span>
                                <span>Submitted: {row?.counts?.submitted ?? 0}</span>
                                <span>Not submitted: {row?.counts?.notSubmitted ?? 0}</span>
                                <span>Under review: {row?.counts?.underReview ?? 0}</span>
                                <span>Returned: {row?.counts?.returned ?? 0}</span>
                                <span>Reviewed: {row?.counts?.reviewed ?? 0}</span>
                                <span>Feedback released: {row?.counts?.feedbackReleased ?? 0}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}

                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium">Submissions to review</p>
                      <p className="text-xs text-muted-foreground mt-1">Pick a student submission to open files and feedback.</p>
                    </div>
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
                              <p className="text-sm font-medium truncate">{getSubmissionStudentLabel(submission.student_id)}</p>
                              <Badge variant="outline" className={statusClass}>
                                {formatTeacherSubmissionStatus(submission.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              Task ref. {shortenStaffReference(submission.homework_task_id)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <>
                <Card className="p-4">
                  <div className="space-y-3">
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {isDemoMode
                          ? DEMO_HOMEWORK_STUDENTS.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}
                            </SelectItem>
                          ))
                          : nonDemoStudentIdOptions.map((studentId) => (
                            <SelectItem key={studentId} value={studentId}>
                              {studentId}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {!isDemoMode ? (
                      <p className="text-xs text-muted-foreground">
                        Uses students from homework you can already see in this class—pick one to load their tasks.
                      </p>
                    ) : null}
                  </div>
                </Card>

                {isDemoMode ? (
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium">By Student tracker (demo)</p>
                        <p className="text-xs text-muted-foreground mt-1">Tap a student to see their homework tasks.</p>
                      </div>
                      <Badge variant="outline">{DEMO_HOMEWORK_STUDENTS.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {demoStudentTrackerRows.map((row) => {
                        const selected = row.student.id === selectedStudentId;
                        return (
                          <button
                            key={row.student.id}
                            type="button"
                            onClick={() => setSelectedStudentId(row.student.id)}
                            className={`w-full text-left rounded-lg border p-3 ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{row.student.name}</p>
                              <Badge variant="outline">{row.items.length} tasks</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{row.student.school} · {row.student.stream}</p>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
                              <span>Submitted: {row.counts.submitted}</span>
                              <span>Not submitted: {row.counts.notSubmitted}</span>
                              <span>Under review: {row.counts.underReview}</span>
                              <span>Returned: {row.counts.returned}</span>
                              <span>Released: {row.counts.feedbackReleased}</span>
                              <span>Follow-up: {row.counts.followUpNeeded}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                ) : !isUuidLike(resolvedStudentId) ? (
                  <Card className="p-4 border-dashed">
                    <p className="text-sm text-muted-foreground">
                      No valid student UUID is available from current visible homework data yet.
                    </p>
                  </Card>
                ) : trackerByStudentBusy ? (
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Loading student tracker...</p>
                  </Card>
                ) : selectedRealStudentItems.length === 0 ? (
                  <Card className="p-4 border-dashed">
                    <p className="text-sm text-muted-foreground">
                      No assigned homework items are visible for this student in current scope.
                    </p>
                  </Card>
                ) : (
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium">By Student tracker</p>
                        <p className="text-xs text-muted-foreground mt-1">Tap a task to load submission and review tools.</p>
                      </div>
                      <Badge variant="outline">{selectedRealStudentItems.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {selectedRealStudentItems.map((item) => {
                        const task = item?.task || {};
                        const label = getStudentTrackerStatusLabel(item);
                        const selected = task.id === selectedStudentTaskId;
                        return (
                          <button
                            key={`${resolvedStudentId}-${task.id || 'task'}`}
                            type="button"
                            onClick={() => {
                              setSelectedStudentTaskId(task.id || '');
                              setSelectedTaskId(task.id || '');
                              if (item?.submission?.id) {
                                setSelectedSubmissionId(item.submission.id);
                              } else {
                                setSelectedSubmissionId('');
                              }
                            }}
                            className={`w-full text-left rounded-lg border p-3 ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{task.title || 'Untitled task'}</p>
                              <Badge variant="outline" className={TRACKER_STATUS_BADGE[label] || ''}>
                                {label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Due {task.due_date || '—'} · Scope {task.assignment_scope || 'class'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item?.submission?.id ? `Submission ref. ${shortenStaffReference(item.submission.id)}` : 'No submission yet'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>

          <div className="xl:col-span-3 space-y-4">
            {!selectedSubmission ? (
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">
                  {activeViewMode === 'by_student' && !isDemoMode && selectedRealStudentItem && !selectedRealStudentItem?.submission?.id
                    ? 'No submission yet for this homework—choose another task or wait until the family uploads work.'
                    : 'Choose a submission from the list on the left to open student files, teacher-marked work, and feedback.'}
                </p>
              </Card>
            ) : (
              <>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium">
                        {activeViewMode === 'by_student' ? 'Review this student’s submission' : 'Review this submission'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Files and feedback below belong to the selected student and homework task. Nothing here is visible to parents until you release it.
                      </p>
                    </div>
                    <Badge variant="outline" className={SUBMISSION_STATUS_BADGE[selectedSubmission.status] || ''}>
                      {formatTeacherSubmissionStatus(selectedSubmission.status)}
                    </Badge>
                  </div>
                  {isDemoMode && activeViewMode === 'by_task' && selectedDemoTaskTracker ? (
                    <div className="mb-4 rounded-lg border border-dashed p-3 bg-muted/20">
                      <p className="text-sm font-medium mb-2">By Task demo detail</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {selectedTaskByFilter?.title || selectedDemoTaskTracker.task.title} · Scope {selectedDemoTaskTracker.task.assignment_scope}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <Badge variant="outline">Assigned {selectedDemoTaskTracker.counts.assigned}</Badge>
                        <Badge variant="outline">Submitted {selectedDemoTaskTracker.counts.submitted}</Badge>
                        <Badge variant="outline">Not submitted {selectedDemoTaskTracker.counts.notSubmitted}</Badge>
                        <Badge variant="outline">Under review {selectedDemoTaskTracker.counts.underReview}</Badge>
                        <Badge variant="outline">Released {selectedDemoTaskTracker.counts.feedbackReleased}</Badge>
                      </div>
                    </div>
                  ) : null}
                  {!isDemoMode && activeViewMode === 'by_task' && selectedRealTaskTracker ? (
                    <div className="mb-4 rounded-lg border border-dashed p-3 bg-muted/20">
                      <p className="text-sm font-medium mb-2">By Task detail</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {selectedRealTaskTracker?.task?.title || selectedTaskByFilter?.title || 'Untitled task'}
                        {' '}· Scope {selectedRealTaskTracker?.task?.assignment_scope || 'class'}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <Badge variant="outline">Assigned {selectedRealTaskTracker?.counts?.assigned ?? 0}</Badge>
                        <Badge variant="outline">Submitted {selectedRealTaskTracker?.counts?.submitted ?? 0}</Badge>
                        <Badge variant="outline">Not submitted {selectedRealTaskTracker?.counts?.notSubmitted ?? 0}</Badge>
                        <Badge variant="outline">Under review {selectedRealTaskTracker?.counts?.underReview ?? 0}</Badge>
                        <Badge variant="outline">Returned {selectedRealTaskTracker?.counts?.returned ?? 0}</Badge>
                        <Badge variant="outline">Reviewed {selectedRealTaskTracker?.counts?.reviewed ?? 0}</Badge>
                        <Badge variant="outline">Released {selectedRealTaskTracker?.counts?.feedbackReleased ?? 0}</Badge>
                        <Badge variant="outline">Submissions {selectedRealTaskTracker?.submissions?.length ?? 0}</Badge>
                      </div>
                    </div>
                  ) : null}
                  {isDemoMode && activeViewMode === 'by_student' && selectedDemoStudentTracker ? (
                    <div className="mb-4 rounded-lg border border-dashed p-3 bg-muted/20">
                      <p className="text-sm font-medium mb-2">By Student demo detail</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {selectedDemoStudentTracker.student.name} · {selectedDemoStudentTracker.student.school}
                      </p>
                      <div className="space-y-2">
                        {selectedDemoStudentTracker.items.map((item) => (
                          <button
                            key={`${selectedDemoStudentTracker.student.id}-${item.task.id}`}
                            type="button"
                            onClick={() => item.submission && setSelectedSubmissionId(item.submission.id)}
                            className="w-full text-left rounded-lg border p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium">{item.task.title}</p>
                              <Badge variant="outline" className={TRACKER_STATUS_BADGE[item.status] || ''}>
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {item.submission ? `Submission ref. ${shortenStaffReference(item.submission.id)}` : 'Assigned but not yet submitted'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {!isDemoMode && activeViewMode === 'by_student' && selectedRealStudentItem ? (
                    <div className="mb-4 rounded-lg border border-dashed p-3 bg-muted/20">
                      <p className="text-sm font-medium mb-2">By Student detail</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Student {resolvedStudentId} · {selectedRealStudentItem?.task?.title || 'Untitled task'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={TRACKER_STATUS_BADGE[getStudentTrackerStatusLabel(selectedRealStudentItem)] || ''}>
                          {getStudentTrackerStatusLabel(selectedRealStudentItem)}
                        </Badge>
                        {selectedRealStudentItem?.hasReleasedFeedback ? (
                          <Badge variant="outline" className={TRACKER_STATUS_BADGE['Feedback Released']}>
                            Feedback Released
                          </Badge>
                        ) : null}
                        <Badge variant="outline">
                          {selectedRealStudentItem?.submission?.id ? `Submission ref. ${shortenStaffReference(selectedRealStudentItem.submission.id)}` : 'No submission yet'}
                        </Badge>
                      </div>
                    </div>
                  ) : null}
                  <details className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground mt-3">
                    <summary className="cursor-pointer font-medium text-foreground">Staff reference (optional)</summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <p><span className="text-muted-foreground">Student:</span> {getSubmissionStudentLabel(selectedSubmission.student_id)}</p>
                      <p><span className="text-muted-foreground">Submitted:</span> {selectedSubmission.submitted_at ? new Date(selectedSubmission.submitted_at).toLocaleString('en-AU') : '—'}</p>
                      <p className="sm:col-span-2 break-all"><span className="text-muted-foreground">Submission ref.:</span> {selectedSubmission.id}</p>
                      <p className="sm:col-span-2 break-all"><span className="text-muted-foreground">Task ref.:</span> {selectedSubmission.homework_task_id}</p>
                    </div>
                  </details>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Student submission files</p>
                    <p className="text-xs text-muted-foreground">Files the family uploaded for this homework.</p>
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
                            <Button size="sm" variant="outline" className="min-h-10 w-full sm:w-auto" onClick={() => openFile(fileRow.id)}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open student submission
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Teacher-marked work</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload corrected sheets or scans here. Marked work stays staff-only until you share it—parents do not see it automatically.
                      </p>
                    </div>
                    <Badge variant="outline">Staff only until shared</Badge>
                  </div>
                  {isDemoMode ? (
                    <div className="rounded-lg border border-dashed p-3 space-y-3 bg-muted/20">
                      <p className="text-sm font-medium">Demo marked-file controls (local only)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Marked file name (fake)</Label>
                          <Input
                            placeholder="demo-marked-file.pdf"
                            value={demoMarkedFileName}
                            onChange={(event) => {
                              if (!selectedSubmissionId) return;
                              const value = event.target.value || '';
                              setDemoMarkedFileNameBySubmissionId((prev) => ({ ...prev, [selectedSubmissionId]: value }));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Staff note (optional)</Label>
                          <Input
                            placeholder="Internal note for staff only"
                            value={demoMarkedNote}
                            onChange={(event) => {
                              if (!selectedSubmissionId) return;
                              const value = event.target.value || '';
                              setDemoMarkedNoteBySubmissionId((prev) => ({ ...prev, [selectedSubmissionId]: value }));
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                        <Button type="button" className="min-h-10 w-full sm:w-auto" onClick={handleDemoMarkedUpload}>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload teacher-marked work
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10 w-full sm:w-auto"
                          disabled
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Open marked work
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Demo-only simulation: nothing is uploaded and no server calls run.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/20">
                      <p className="text-sm font-medium">Marked-file controls</p>
                      <p className="text-xs text-muted-foreground">
                        Upload and release are staff-only actions. Marked files stay internal until explicitly released.
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs">Upload teacher-marked work</Label>
                        <Input
                          type="file"
                          className="min-h-10"
                          onChange={(event) => setMarkedUploadFile(event.target.files?.[0] || null)}
                          disabled={!selectedSubmissionId || uploadMarkedFileMutation.isPending}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Staff note (optional)</Label>
                        <Input
                          placeholder="Internal note for staff only"
                          value={markedStaffNote}
                          onChange={(event) => setMarkedStaffNote(event.target.value)}
                          disabled={uploadMarkedFileMutation.isPending}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                        <Button
                          type="button"
                          className="min-h-10 w-full sm:w-auto"
                          onClick={() => uploadMarkedFileMutation.mutate()}
                          disabled={!selectedSubmissionId || uploadMarkedFileMutation.isPending}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          {uploadMarkedFileMutation.isPending ? 'Uploading...' : 'Upload teacher-marked work'}
                        </Button>
                        {!canReleaseFeedback ? (
                          <p className="text-xs text-muted-foreground self-center">
                            Release remains supervisor/HQ action in this phase.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {markedFilesBusy ? (
                      <p className="text-sm text-muted-foreground">Loading marked files...</p>
                    ) : selectedMarkedFiles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {isDemoMode
                          ? 'No demo marked files yet for this submission.'
                          : 'No marked files found for this submission yet.'}
                      </p>
                    ) : (
                      selectedMarkedFiles.map((fileRow) => (
                        <div key={fileRow.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">{fileRow.file_name || 'Marked file'}</p>
                            <Badge
                              variant="outline"
                              className={fileRow.released_to_parent ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}
                            >
                              {fileRow.released_to_parent ? 'Shared with family' : 'Staff only'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {fileRow.uploaded_by_label || 'Staff'} · {fileRow.created_at ? new Date(fileRow.created_at).toLocaleString('en-AU') : 'time unavailable'}
                          </p>
                          {fileRow.released_to_parent ? (
                            <p className="text-xs text-muted-foreground">
                              Released by {fileRow.released_by_label || 'Staff'} · {fileRow.released_at ? new Date(fileRow.released_at).toLocaleString('en-AU') : 'time unavailable'}
                            </p>
                          ) : null}
                          {fileRow.staff_note ? (
                            <p className="text-xs text-amber-700">Staff note: {fileRow.staff_note}</p>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="min-h-10 w-full sm:w-auto"
                              onClick={() => (isDemoMode ? handleDemoMarkedView(fileRow.id) : openMarkedFile(fileRow.id))}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Open marked work
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="min-h-10 w-full sm:w-auto"
                              onClick={() => (isDemoMode ? handleDemoMarkedRelease(fileRow.id) : releaseMarkedFileMutation.mutate(fileRow.id))}
                              disabled={fileRow.released_to_parent || (!isDemoMode && (releaseMarkedFileMutation.isPending || !canReleaseFeedback))}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              {releaseMarkedFileMutation.isPending && !isDemoMode ? 'Sharing...' : 'Share marked work with family'}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">Feedback draft</p>
                    <Badge variant="outline">
                      {feedbackBusy ? 'Loading...' : formatTeacherFeedbackRecordStatus(selectedFeedback?.status)}
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
                      Generates a mock AI draft from safe metadata/context only. You must review and edit before saving or sharing with families.
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
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button
                      type="button"
                      className="min-h-10 w-full sm:w-auto"
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
                      className="min-h-10 w-full sm:w-auto"
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
                      className="min-h-10 w-full sm:w-auto"
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
                        className="min-h-10 w-full sm:w-auto"
                        onClick={() => {
                          if (isDemoMode) {
                            updateDemoSubmissionStatus('approved_for_parent');
                            toast.success('Demo mode: share action simulated locally.');
                            return;
                          }
                          releaseMutation.mutate();
                        }}
                        disabled={isDemoMode ? !selectedFeedback?.id : (releaseMutation.isPending || !selectedFeedback?.id)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Share feedback with family
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground self-center">
                        Sharing feedback with families may require an administrator in your centre—ask your supervisor if you do not see this button.
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 max-w-prose">
                    Parents only see feedback after you share it. Saving a draft does not notify families.
                  </p>
                </Card>
              </>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
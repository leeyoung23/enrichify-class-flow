import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, getSelectedDemoRole } from '@/services/authService';
import { getStudentById, getClassById, listAttendanceRecords, listParentUpdatesByStudent, getStudentFeeStatus } from '@/services/dataService';
import { canAccessStudentRecord, ROLES } from '@/services/permissionService';
import { getStudentLearningContext, getClassLearningContext, listCurriculumProfiles } from '@/services/supabaseReadService';
import {
  uploadFeeReceipt,
  getFeeReceiptSignedUrl,
  listClassMemories,
  getClassMemorySignedUrl,
  listHomeworkTasks,
  listHomeworkSubmissions,
  listHomeworkFeedback,
  createHomeworkSubmission,
  uploadHomeworkFile,
} from '@/services/supabaseUploadService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  GraduationCap, CheckCircle2, XCircle, Clock, Umbrella,
  BookOpen, BookX, Minus, ExternalLink, FileText, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const ATTENDANCE_ICONS = {
  present: { icon: CheckCircle2, label: 'Present', color: 'text-green-600' },
  absent: { icon: XCircle, label: 'Absent', color: 'text-red-500' },
  late: { icon: Clock, label: 'Late', color: 'text-amber-500' },
  leave: { icon: Umbrella, label: 'Leave', color: 'text-blue-500' },
};

const HOMEWORK_ICONS = {
  completed: { icon: BookOpen, label: 'Done', color: 'text-green-600' },
  incomplete: { icon: BookX, label: 'Incomplete', color: 'text-amber-500' },
  not_submitted: { icon: XCircle, label: 'Not submitted', color: 'text-red-500' },
  not_assigned: { icon: Minus, label: 'N/A', color: 'text-muted-foreground' },
};

const PARENT_HOMEWORK_STATUS_META = {
  not_submitted: { label: 'Not submitted', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  under_review: { label: 'Under review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  reviewed: { label: 'Reviewed', className: 'bg-green-100 text-green-700 border-green-200' },
  returned_for_revision: { label: 'Returned for revision', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  approved_for_parent: { label: 'Feedback released', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const ALLOWED_HOMEWORK_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_HOMEWORK_UPLOAD_BYTES = 5 * 1024 * 1024;

function formatReleasedDateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-AU');
}

function formatMarkedWorkMetaDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-AU');
}

function ParentHomeworkStatusSection({
  isDemoMode,
  loading,
  error,
  tasks,
  feedbackBySubmissionId,
  markedWorkBySubmissionId,
  uploadDraftByTaskId,
  submitLoadingByTaskId,
  onUploadFileChange,
  onUploadNoteChange,
  onSubmitTaskUpload,
  onViewMarkedWork,
}) {
  if (loading) {
    return (
      <Card id="parent-homework-status">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Homework</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading homework status...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card id="parent-homework-status" className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Homework</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (!tasks.length) {
    return (
      <Card id="parent-homework-status" className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Homework</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No assigned homework is available right now for your linked child.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="parent-homework-status">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Homework</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {isDemoMode
            ? 'Demo-only preview: submit controls and status updates are simulated locally and do not upload to Supabase.'
            : 'Submit your child\'s work for assigned tasks and follow review status updates.'}
        </p>
        {tasks.map((task) => {
          const statusMeta = PARENT_HOMEWORK_STATUS_META[task.parentStatus] || PARENT_HOMEWORK_STATUS_META.not_submitted;
          const feedbackRow = task.latestSubmissionId ? feedbackBySubmissionId[task.latestSubmissionId] : null;
          const markedWorkItems = task.latestSubmissionId
            ? (markedWorkBySubmissionId[task.latestSubmissionId] || [])
            : [];
          const hasReleasedFeedback = Boolean(
            feedbackRow?.feedback_text || feedbackRow?.next_step || feedbackRow?.released_to_parent_at
          );
          const releasedDateLabel = formatReleasedDateLabel(feedbackRow?.released_to_parent_at);
          const uploadDraft = uploadDraftByTaskId[task.id] || { note: '', file: null };
          const isUploadAllowed = task.parentStatus === 'not_submitted' || task.parentStatus === 'returned_for_revision';
          const isSubmitting = Boolean(submitLoadingByTaskId[task.id]);
          const showWaitingCopy = !hasReleasedFeedback && ['submitted', 'under_review', 'reviewed'].includes(task.parentStatus);
          const showRevisionWaitingCopy = !hasReleasedFeedback && task.parentStatus === 'returned_for_revision';
          return (
            <div key={task.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">{task.title || 'Homework task'}</p>
                <Badge variant="outline" className={statusMeta.className}>
                  {statusMeta.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Due date: {task.dueDateLabel}</p>
              {hasReleasedFeedback ? (
                <details className="rounded-md bg-muted/40 border px-2.5 py-2">
                  <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                    Teacher feedback
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-foreground">
                      {feedbackRow.feedback_text || 'Teacher feedback has been released for this homework.'}
                    </p>
                    {feedbackRow.next_step ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Next step:</span> {feedbackRow.next_step}
                      </p>
                    ) : null}
                    {releasedDateLabel ? (
                      <p className="text-[11px] text-muted-foreground">Released: {releasedDateLabel}</p>
                    ) : null}
                  </div>
                </details>
              ) : null}
              {showWaitingCopy ? (
                <p className="text-xs text-muted-foreground">Teacher feedback will appear here after review.</p>
              ) : null}
              {showRevisionWaitingCopy ? (
                <p className="text-xs text-muted-foreground">Please revise and resubmit. Teacher feedback will appear here after release.</p>
              ) : null}
              {hasReleasedFeedback ? (
                <div className="rounded-md border bg-muted/20 px-2.5 py-2 space-y-2">
                  <p className="text-xs font-medium text-foreground">Teacher-marked work</p>
                  {markedWorkItems.length > 0 ? (
                    <div className="space-y-2">
                      {markedWorkItems.map((item) => (
                        <div key={item.id} className="rounded-md border bg-background p-2.5 space-y-1.5">
                          <p className="text-xs font-medium leading-snug text-foreground break-words">
                            {item.fileName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.fileTypeLabel}
                            {item.releasedAtLabel ? ` • Released ${item.releasedAtLabel}` : ''}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-8 px-2.5 text-xs"
                            onClick={() => onViewMarkedWork(item)}
                            disabled={item.viewDisabled}
                          >
                            View marked work
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Marked work will appear here once your teacher releases it.
                    </p>
                  )}
                </div>
              ) : null}
              {isUploadAllowed ? (
                <div className="rounded-md border border-dashed p-3 space-y-2">
                  <p className="text-sm font-medium">Upload homework</p>
                  <p className="text-xs text-muted-foreground">
                    {isDemoMode
                      ? 'Demo only: file selection and submit are local simulation only.'
                      : 'Submit your child\'s work in image or PDF format.'}
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => onUploadFileChange(task.id, event.target.files?.[0] || null)}
                    disabled={isSubmitting}
                    className="block w-full text-sm"
                  />
                  <Textarea
                    value={uploadDraft.note}
                    onChange={(event) => onUploadNoteChange(task.id, event.target.value)}
                    placeholder="Optional note for teacher review"
                    className="min-h-[84px]"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    className="w-full min-h-10"
                    disabled={isSubmitting}
                    onClick={() => onSubmitTaskUpload(task.id)}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit your child\'s work'}
                  </Button>
                </div>
              ) : task.parentStatus !== 'approved_for_parent' ? (
                <p className="text-xs text-muted-foreground">Your child&apos;s work has been submitted for teacher review.</p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AttendanceSummary({ records }) {
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  records.forEach(r => { if (r.status && counts[r.status] !== undefined) counts[r.status]++; });
  const total = records.length;
  const rate = total > 0 ? Math.round((counts.present / total) * 100) : 0;

  return (
    <Card id="attendance-summary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Attendance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-bold text-primary">{rate}%</div>
          <div className="text-sm text-muted-foreground">{counts.present} of {total} sessions attended</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
          <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(ATTENDANCE_ICONS).map(([status, { icon: Icon, label, color }]) => (
            <div key={status} className="flex items-center gap-1.5 text-sm">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{counts[status]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HomeworkSummary({ records }) {
  const counts = { completed: 0, incomplete: 0, not_submitted: 0, not_assigned: 0 };
  records.forEach(r => {
    const hw = r.homework_status || 'not_assigned';
    if (counts[hw] !== undefined) counts[hw]++;
  });
  const assigned = counts.completed + counts.incomplete + counts.not_submitted;
  const rate = assigned > 0 ? Math.round((counts.completed / assigned) * 100) : 0;

  return (
    <Card id="homework-history">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Homework Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-bold text-primary">{assigned > 0 ? `${rate}%` : '—'}</div>
          <div className="text-sm text-muted-foreground">
            {assigned > 0 ? `${counts.completed} of ${assigned} tasks completed` : 'No homework assigned'}
          </div>
        </div>
        {assigned > 0 && (
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${rate}%` }} />
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(HOMEWORK_ICONS).map(([status, { icon: Icon, label, color }]) => (
            <div key={status} className="flex items-center gap-1.5 text-sm">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{counts[status]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChildProfileSummary({ student, cls }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Child Profile Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Student</span>
          <span className="font-medium">{student.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Class</span>
          <span className="font-medium">{cls?.name || 'Demo Class'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Subject</span>
          <span className="font-medium">{cls?.subject || 'English'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Schedule</span>
          <span className="font-medium">{cls?.schedule || 'Mon 4pm'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function LearningFocusSummary({ isDemoMode, learningFocus, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Learning Focus</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading learning focus...</CardContent>
      </Card>
    );
  }

  if (isDemoMode) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Learning Focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Demo-only learning focus summary.</p>
          <p><span className="text-muted-foreground">School and year:</span> Demo Learning School, Year 4</p>
          <p><span className="text-muted-foreground">This term&apos;s focus:</span> Build reading confidence with short daily practice.</p>
        </CardContent>
      </Card>
    );
  }

  if (!learningFocus?.hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Learning Focus</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Learning focus will appear here once your child&apos;s class profile is set.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Learning Focus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {learningFocus.schoolAndYear ? (
          <p><span className="text-muted-foreground">School and year:</span> {learningFocus.schoolAndYear}</p>
        ) : null}
        {learningFocus.profileName ? (
          <p><span className="text-muted-foreground">Profile:</span> {learningFocus.profileName}</p>
        ) : null}
        {learningFocus.subject ? (
          <p><span className="text-muted-foreground">Subject:</span> {learningFocus.subject}</p>
        ) : null}
        {learningFocus.skillFocus ? (
          <p><span className="text-muted-foreground">Skill focus:</span> {learningFocus.skillFocus}</p>
        ) : null}
        {learningFocus.classLearningFocus ? (
          <p><span className="text-muted-foreground">This term&apos;s focus:</span> {learningFocus.classLearningFocus}</p>
        ) : null}
        {learningFocus.studentGoals?.length > 0 ? (
          <div className="pt-1">
            <p className="text-xs text-muted-foreground">Current goals</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {learningFocus.studentGoals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LatestParentComment({ updates }) {
  const latestComment = updates.find((item) => item.update_type !== 'weekly_report');
  return (
    <Card id="latest-parent-comment">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Latest Parent Comment</CardTitle>
          <Badge className={latestComment ? 'bg-green-100 text-green-700 border-green-200' : ''} variant="outline">
            {latestComment?.status || 'not available'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {latestComment ? (
          <>
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {latestComment.created_date ? new Date(latestComment.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recent'}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
              {latestComment.shared_report || latestComment.approved_report || latestComment.final_message || 'No message content.'}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No approved or released parent comment yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function LatestWeeklyProgressReport({ updates }) {
  const latestWeekly = updates.find((item) => item.update_type === 'weekly_report');
  const weeklyMeta = latestWeekly?.weekly_report || {};

  return (
    <Card id="latest-report">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Latest Weekly Progress Report</CardTitle>
          <Badge className={latestWeekly ? 'bg-green-100 text-green-700 border-green-200' : ''} variant="outline">
            {latestWeekly?.status || 'not available'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {latestWeekly ? (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Week range:</span> {weeklyMeta.week_range || 'Weekly summary'}</p>
            <p><span className="text-muted-foreground">Attendance summary:</span> {weeklyMeta.attendance_summary || 'Not recorded'}</p>
            <p><span className="text-muted-foreground">Homework completion:</span> {weeklyMeta.homework_completion || 'Not recorded'}</p>
            <p><span className="text-muted-foreground">Learning focus:</span> {weeklyMeta.learning_focus || 'Not available'}</p>
            <p><span className="text-muted-foreground">Strengths:</span> {weeklyMeta.strengths || 'Not available'}</p>
            <p><span className="text-muted-foreground">Areas to improve:</span> {weeklyMeta.areas_to_improve || 'Not available'}</p>
            <p><span className="text-muted-foreground">Suggested home practice:</span> {weeklyMeta.suggested_home_practice || 'Not available'}</p>
            <p><span className="text-muted-foreground">Next week focus:</span> {weeklyMeta.next_week_focus || 'Not available'}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No approved or released weekly progress report yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function TeacherFeedback({ updates, isStudentPreview }) {
  const latest = updates[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{isStudentPreview ? 'Recent Feedback' : 'Approved Teacher Feedback'}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {latest?.note_text || latest?.shared_report || latest?.approved_report || 'Your child is engaging well in class and responding positively to teacher guidance.'}
        </p>
      </CardContent>
    </Card>
  );
}

function StudentPortalSummary({ attendance, updates }) {
  const homeworkDue = attendance.filter((item) => ['incomplete', 'not_submitted'].includes(item.homework_status)).length;
  const recentFeedback = updates.slice(0, 2);
  const progressRate = attendance.length ? Math.round((attendance.filter((item) => item.status === 'present').length / attendance.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Homework Due</p><p className="text-3xl font-bold mt-1">{homeworkDue}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Recent Feedback</p><p className="text-3xl font-bold mt-1">{recentFeedback.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Learning Resources</p><p className="text-3xl font-bold mt-1">2</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Progress Summary</p><p className="text-3xl font-bold mt-1">{progressRate}%</p></CardContent></Card>
      </div>

      <Card id="recent-feedback">
        <CardHeader className="pb-3"><CardTitle className="text-base">Homework Due</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {homeworkDue > 0 ? attendance.filter((item) => ['incomplete', 'not_submitted'].includes(item.homework_status)).slice(0, 3).map((item, index) => (
              <div key={`${item.id || index}-hw`} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <span>Homework task {index + 1}</span>
                <Badge variant="outline">{item.homework_status === 'not_submitted' ? 'Not submitted' : 'Incomplete'}</Badge>
              </div>
            )) : <p className="text-muted-foreground">No homework due right now.</p>}
          </div>
        </CardContent>
      </Card>

      <Card id="learning-resources">
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent Feedback</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {recentFeedback.length > 0 ? recentFeedback.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="leading-relaxed text-foreground">{item.shared_report || item.approved_report || item.final_message || 'Approved feedback available.'}</p>
              </div>
            )) : <p className="text-muted-foreground">No recent feedback available.</p>}
          </div>
        </CardContent>
      </Card>

      <Card id="simple-progress-summary">
        <CardHeader className="pb-3"><CardTitle className="text-base">Learning Resources</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="rounded-lg border p-3">Weekly practice pack</div>
            <div className="rounded-lg border p-3">Reading and revision worksheet</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Simple Progress Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">A light overview of attendance and homework completion using fake demo data only.</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressRate}%` }} />
          </div>
          <p className="text-sm font-medium">Current progress: {progressRate}%</p>
        </CardContent>
      </Card>
    </div>
  );
}

const DEMO_CLASS_MEMORIES_HISTORY = [
  {
    id: 'm1',
    date: '18 Apr 2026',
    caption: 'Small groups shared their story summaries — great energy!',
    label: 'Class Alpha · Literacy block',
  },
  {
    id: 'm2',
    date: '10 Apr 2026',
    caption: 'Outdoor shapes hunt — linking maths to the playground.',
    label: 'Class Alpha · Maths',
  },
  {
    id: 'm3',
    date: '3 Apr 2026',
    caption: 'Music and movement warm-up before handwriting.',
    label: 'Class Alpha · Morning session',
  },
];

function isUuidLike(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

/**
 * Parent-facing Class Memories demo only (no class_media / storage; fake captions and placeholders).
 * Internal schema may use class_media — not wired here.
 */
function ClassMemoriesDemoSection({ className }) {
  const displayClass = className || 'Demo Class';

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-start gap-2">
        <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Latest Memory</h2>
          <p className="text-sm text-muted-foreground mt-1">A recent moment from your child&apos;s class.</p>
        </div>
      </div>

      <Card className="overflow-hidden border-amber-100/80 bg-gradient-to-b from-amber-50/40 to-card">
        <CardContent className="p-0">
          <div
            className="h-40 w-full bg-gradient-to-br from-amber-100 via-rose-50 to-violet-100 flex items-center justify-center text-muted-foreground/70 text-xs px-4 text-center"
            role="img"
            aria-label="Demo placeholder for a class memory image"
          >
            Soft gradient placeholder (demo — not a real photo)
          </div>
          <div className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{displayClass}</Badge>
              <span>24 Apr 2026</span>
            </div>
            <p className="text-sm font-medium leading-snug">
              Wonderful focus during our group reading today — everyone contributed!
            </p>
            <p className="text-xs text-muted-foreground">— Ms. Taylor (demo caption)</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => document.getElementById('class-memories-history')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Class Memories History
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="class-memories-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Class Memories History</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">Past Class Memories for your child&apos;s class (demo).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_CLASS_MEMORIES_HISTORY.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border/80 overflow-hidden bg-card"
              >
                <div className="h-28 w-full bg-gradient-to-r from-sky-50 via-indigo-50 to-fuchsia-50 flex items-center justify-center text-[11px] text-muted-foreground/80 px-3 text-center">
                  Activity placeholder (demo)
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{item.date}</span>
                    <Badge variant="secondary" className="text-xs font-normal">{item.label}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Demo only — real Class Memories will use a future class_media-style metadata table and Supabase Storage after the
            write phase. No uploads or real media in this preview.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ParentClassMemoriesSection({ className, latestMemory, historyMemories, signedUrlByMemoryId, loading, error }) {
  const displayClass = className || 'Class Memories';

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Class Memories...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-start gap-2">
        <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Latest Memory</h2>
          <p className="text-sm text-muted-foreground mt-1">A warm class moment from your child&apos;s learning journey.</p>
        </div>
      </div>

      {!latestMemory ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No approved Memories yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-amber-100/80 bg-gradient-to-b from-amber-50/40 to-card">
          <CardContent className="p-0">
            {signedUrlByMemoryId[latestMemory.id] ? (
              <img
                src={signedUrlByMemoryId[latestMemory.id]}
                alt={latestMemory.title || 'Latest class memory'}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="h-44 w-full bg-gradient-to-br from-amber-100 via-rose-50 to-violet-100 flex items-center justify-center text-muted-foreground/70 text-xs px-4 text-center">
                Memory preview unavailable
              </div>
            )}
            <div className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{displayClass}</Badge>
                <span>{latestMemory.created_at ? new Date(latestMemory.created_at).toLocaleDateString('en-AU') : 'Recent'}</span>
              </div>
              <p className="text-sm font-medium leading-snug">{latestMemory.title?.trim() || 'Latest Class Memory'}</p>
              <p className="text-sm text-muted-foreground">{latestMemory.caption?.trim() || 'A recent learning moment from class.'}</p>
              {historyMemories.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => document.getElementById('class-memories-history')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View Class Memories History
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card id="class-memories-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Class Memories History</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">Approved Memories from your child&apos;s class.</p>
        </CardHeader>
        <CardContent>
          {historyMemories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No earlier approved Memories yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyMemories.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/80 overflow-hidden bg-card">
                  {signedUrlByMemoryId[item.id] ? (
                    <img
                      src={signedUrlByMemoryId[item.id]}
                      alt={item.title || 'Class memory'}
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-r from-sky-50 via-indigo-50 to-fuchsia-50 flex items-center justify-center text-[11px] text-muted-foreground/80 px-3 text-center">
                      Memory preview unavailable
                    </div>
                  )}
                  <div className="p-3 space-y-1.5">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-AU') : 'Recent'}</span>
                      <Badge variant="secondary" className="text-xs font-normal">{displayClass}</Badge>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{item.title?.trim() || 'Class Memory'}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.caption?.trim() || 'No caption provided.'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ParentView() {
  const { user: supabaseUser } = useSupabaseAuthState();
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('student');
  const previewRole = urlParams.get('demoRole');
  const isDemoStudentPreview = previewRole === 'student';
  const isDemoMode = Boolean(getSelectedDemoRole());
  const hasSupabaseSession = Boolean(supabaseUser?.id);
  const ALLOWED_RECEIPT_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/plain']);
  const MAX_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

  const [student, setStudent] = useState(null);
  const [cls, setCls] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [feeStatus, setFeeStatus] = useState(null);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState(null);
  const [receiptUploadLoading, setReceiptUploadLoading] = useState(false);
  const [receiptLinkLoading, setReceiptLinkLoading] = useState(false);
  const [realClassMemories, setRealClassMemories] = useState([]);
  const [classMemorySignedUrls, setClassMemorySignedUrls] = useState({});
  const [classMemoriesLoading, setClassMemoriesLoading] = useState(false);
  const [classMemoriesError, setClassMemoriesError] = useState('');
  const [learningFocus, setLearningFocus] = useState({ hasData: false });
  const [learningFocusLoading, setLearningFocusLoading] = useState(false);
  const [parentHomeworkLoading, setParentHomeworkLoading] = useState(false);
  const [parentHomeworkError, setParentHomeworkError] = useState('');
  const [parentHomeworkTasks, setParentHomeworkTasks] = useState([]);
  const [parentHomeworkSubmissions, setParentHomeworkSubmissions] = useState([]);
  const [parentHomeworkFeedbackBySubmissionId, setParentHomeworkFeedbackBySubmissionId] = useState({});
  const [parentHomeworkMarkedWorkBySubmissionId, setParentHomeworkMarkedWorkBySubmissionId] = useState({});
  const [homeworkUploadDraftByTaskId, setHomeworkUploadDraftByTaskId] = useState({});
  const [homeworkSubmitLoadingByTaskId, setHomeworkSubmitLoadingByTaskId] = useState({});

  const latestApprovedUpdate = useMemo(() => updates[0], [updates]);
  const parentHomeworkTasksWithStatus = useMemo(() => {
    const latestSubmissionByTaskId = new Map(
      parentHomeworkSubmissions.map((submission) => [submission.homework_task_id, submission])
    );
    return parentHomeworkTasks.map((task) => {
      const latestSubmission = latestSubmissionByTaskId.get(task.id);
      const releasedFeedback = latestSubmission?.id
        ? parentHomeworkFeedbackBySubmissionId[latestSubmission.id]
        : null;
      const status = releasedFeedback ? 'approved_for_parent' : (latestSubmission?.status || 'not_submitted');
      return {
        id: task.id,
        title: task.title || 'Homework task',
        dueDateLabel: task?.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en-AU') : 'No due date',
        parentStatus: status,
        latestSubmissionId: latestSubmission?.id || null,
        branchId: task.branch_id || cls?.branch_id || null,
        classId: task.class_id || cls?.id || null,
        studentId: student?.id || null,
      };
    });
  }, [parentHomeworkTasks, parentHomeworkSubmissions, parentHomeworkFeedbackBySubmissionId, cls?.branch_id, cls?.id, student?.id]);

  useEffect(() => {
    if (!studentId) { setNotFound(true); setLoading(false); return; }
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        setViewer(currentUser);
        const targetStudentId = currentUser?.role === ROLES.PARENT ? currentUser?.student_id || 'student-01' : studentId;
        const s = await getStudentById(currentUser, targetStudentId);
        if (!s || !canAccessStudentRecord(currentUser, s, [{ guardian_parent_id: currentUser?.guardian_parent_id, student_id: s.id }])) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setStudent(s);
        const [classRecord, att, pu] = await Promise.all([
          getClassById(currentUser, s.class_id),
          listAttendanceRecords(currentUser, { student_id: s.id }),
          listParentUpdatesByStudent(currentUser, s.id),
        ]);
        setCls(classRecord || null);
        setAttendance(att || []);
        setUpdates((pu || [])
          .filter((item) => ['approved', 'shared'].includes(item.status))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        const fee = await getStudentFeeStatus(currentUser, s.id);
        setFeeStatus(fee || null);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  useEffect(() => {
    let cancelled = false;
    const loadRealParentMemories = async () => {
      if (isDemoMode || !hasSupabaseSession || !isSupabaseConfigured() || !student?.id) {
        setRealClassMemories([]);
        setClassMemorySignedUrls({});
        setClassMemoriesError('');
        setClassMemoriesLoading(false);
        return;
      }
      const safeClassId = cls?.id;
      if (!isUuidLike(student.id) || !isUuidLike(safeClassId)) {
        setRealClassMemories([]);
        setClassMemorySignedUrls({});
        setClassMemoriesError('Class Memories are not available for this parent context yet.');
        setClassMemoriesLoading(false);
        return;
      }

      setClassMemoriesLoading(true);
      setClassMemoriesError('');
      try {
        const listResult = await listClassMemories({
          classId: safeClassId,
          studentId: student.id,
          parentVisibleOnly: true,
        });
        if (listResult.error) {
          throw new Error(listResult.error.message || 'Unable to load approved Memories.');
        }

        const rows = Array.isArray(listResult.data) ? listResult.data : [];
        const orderedRows = [...rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (cancelled) return;
        setRealClassMemories(orderedRows);

        const previewRows = orderedRows.slice(0, 10);
        const signedEntries = await Promise.all(previewRows.map(async (row) => {
          const result = await getClassMemorySignedUrl({ memoryId: row.id, expiresIn: 300 });
          if (result.error || !result.data?.signed_url) {
            return [row.id, null];
          }
          return [row.id, result.data.signed_url];
        }));
        if (!cancelled) {
          setClassMemorySignedUrls(Object.fromEntries(signedEntries.filter((entry) => entry[1])));
        }
      } catch (error) {
        if (!cancelled) {
          setRealClassMemories([]);
          setClassMemorySignedUrls({});
          setClassMemoriesError(error?.message || 'Unable to load Class Memories.');
        }
      } finally {
        if (!cancelled) {
          setClassMemoriesLoading(false);
        }
      }
    };

    void loadRealParentMemories();
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, hasSupabaseSession, student?.id, cls?.id]);

  const loadParentHomeworkStatus = useCallback(async () => {
    if (isDemoStudentPreview) {
      setParentHomeworkLoading(false);
      setParentHomeworkError('');
      setParentHomeworkTasks([]);
      setParentHomeworkSubmissions([]);
      setParentHomeworkFeedbackBySubmissionId({});
      setParentHomeworkMarkedWorkBySubmissionId({});
      return;
    }
    if (isDemoMode) {
      setParentHomeworkLoading(false);
      setParentHomeworkError('');
      setParentHomeworkTasks([
        {
          id: 'demo-homework-task-1',
          title: 'Reading reflection worksheet',
          due_date: '2026-05-12',
          status: 'assigned',
        },
        {
          id: 'demo-homework-task-2',
          title: 'Spelling practice worksheet',
          due_date: '2026-05-10',
          status: 'assigned',
        },
      ]);
      setParentHomeworkSubmissions([
        {
          id: 'demo-homework-submission-2',
          homework_task_id: 'demo-homework-task-2',
          status: 'reviewed',
        },
      ]);
      setParentHomeworkFeedbackBySubmissionId({
        'demo-homework-submission-2': {
          id: 'demo-homework-feedback-2',
          feedback_text: 'Great effort. Letter sounds are improving and handwriting is clearer.',
          next_step: 'Practice 5 challenge words and read them aloud once daily.',
          released_to_parent_at: '2026-05-11T10:00:00.000Z',
        },
      });
      setParentHomeworkMarkedWorkBySubmissionId({
        'demo-homework-submission-2': [
          {
            id: 'demo-marked-file-1',
            fileName: 'reading-reflection-marked.pdf',
            fileTypeLabel: 'PDF',
            releasedAtLabel: formatMarkedWorkMetaDate('2026-05-11T10:10:00.000Z'),
            viewDisabled: false,
          },
        ],
      });
      return;
    }
    if (!hasSupabaseSession || !isSupabaseConfigured() || !student?.id || !cls?.id) {
      setParentHomeworkLoading(false);
      setParentHomeworkError('');
      setParentHomeworkTasks([]);
      setParentHomeworkSubmissions([]);
      setParentHomeworkFeedbackBySubmissionId({});
      setParentHomeworkMarkedWorkBySubmissionId({});
      return;
    }
    if (!isUuidLike(student.id) || !isUuidLike(cls.id)) {
      setParentHomeworkLoading(false);
      setParentHomeworkError('Homework status is not available for this parent context yet.');
      setParentHomeworkTasks([]);
      setParentHomeworkSubmissions([]);
      setParentHomeworkFeedbackBySubmissionId({});
      setParentHomeworkMarkedWorkBySubmissionId({});
      return;
    }

    setParentHomeworkLoading(true);
    setParentHomeworkError('');
    try {
      const [taskResult, submissionResult] = await Promise.all([
        listHomeworkTasks({ classId: cls.id, status: 'assigned' }),
        listHomeworkSubmissions({ classId: cls.id, studentId: student.id }),
      ]);
      if (taskResult.error) {
        throw new Error(taskResult.error.message || 'Unable to load assigned homework tasks.');
      }
      if (submissionResult.error) {
        throw new Error(submissionResult.error.message || 'Unable to load homework submissions.');
      }

      const tasks = Array.isArray(taskResult.data) ? taskResult.data : [];
      const submissions = Array.isArray(submissionResult.data) ? submissionResult.data : [];
      const latestSubmissionByTaskId = new Map();
      submissions.forEach((row) => {
        const existing = latestSubmissionByTaskId.get(row.homework_task_id);
        const rowTime = new Date(row.created_at || row.submitted_at || 0).getTime();
        const existingTime = new Date(existing?.created_at || existing?.submitted_at || 0).getTime();
        if (!existing || rowTime > existingTime) {
          latestSubmissionByTaskId.set(row.homework_task_id, row);
        }
      });

      const feedbackEntries = await Promise.all(
        submissions
          .filter((row) => isUuidLike(row.id))
          .map(async (row) => {
            const feedbackResult = await listHomeworkFeedback({
              homeworkSubmissionId: row.id,
              parentVisibleOnly: true,
            });
            if (feedbackResult.error) return [row.id, null];
            const latestFeedback = Array.isArray(feedbackResult.data) ? feedbackResult.data[0] : null;
            return [row.id, latestFeedback || null];
          })
      );

      setParentHomeworkTasks(tasks);
      setParentHomeworkSubmissions(Array.from(latestSubmissionByTaskId.values()));
      setParentHomeworkFeedbackBySubmissionId(
        Object.fromEntries(feedbackEntries.filter((entry) => entry[1]))
      );
      setParentHomeworkMarkedWorkBySubmissionId({});
    } catch (error) {
      setParentHomeworkTasks([]);
      setParentHomeworkSubmissions([]);
      setParentHomeworkFeedbackBySubmissionId({});
      setParentHomeworkMarkedWorkBySubmissionId({});
      setParentHomeworkError(error?.message || 'Unable to load homework status.');
    } finally {
      setParentHomeworkLoading(false);
    }
  }, [isDemoStudentPreview, isDemoMode, hasSupabaseSession, student?.id, cls?.id]);

  const handleViewMarkedWork = useCallback((item) => {
    if (isDemoMode) {
      toast.message(`Demo preview only: ${item?.fileName || 'Marked work file'} is not opened from Supabase in demo mode.`);
      return;
    }
    toast.message('Marked work preview will be available after parent-safe file viewing is wired.');
  }, [isDemoMode]);

  useEffect(() => {
    void loadParentHomeworkStatus();
  }, [loadParentHomeworkStatus]);

  useEffect(() => {
    let cancelled = false;

    const loadLearningFocus = async () => {
      if (isDemoMode) {
        setLearningFocus({ hasData: false });
        setLearningFocusLoading(false);
        return;
      }
      if (!hasSupabaseSession || !isSupabaseConfigured() || !student?.id || !isUuidLike(student.id)) {
        setLearningFocus({ hasData: false });
        setLearningFocusLoading(false);
        return;
      }

      setLearningFocusLoading(true);
      try {
        const [studentContextResult, classContextResult, profileResult] = await Promise.all([
          getStudentLearningContext({ studentId: student.id }),
          cls?.id && isUuidLike(cls.id) ? getClassLearningContext({ classId: cls.id }) : Promise.resolve({ data: null, error: null }),
          listCurriculumProfiles({}),
        ]);

        if (cancelled) return;
        if (studentContextResult?.error || classContextResult?.error || profileResult?.error) {
          setLearningFocus({ hasData: false });
          return;
        }

        const studentProfile = studentContextResult?.data?.student_school_profile || null;
        const profileRows = Array.isArray(profileResult?.data) ? profileResult.data : [];
        const profileMap = new Map(profileRows.map((row) => [row.id, row]));
        const curriculumProfile = studentProfile?.curriculum_profile_id
          ? profileMap.get(studentProfile.curriculum_profile_id)
          : null;
        const classAssignment = Array.isArray(classContextResult?.data?.class_curriculum_assignments)
          ? classContextResult.data.class_curriculum_assignments[0]
          : null;
        const activeStudentGoals = Array.isArray(studentContextResult?.data?.learning_goals)
          ? studentContextResult.data.learning_goals
            .filter((goal) => goal?.status === 'active' && goal?.student_id === student.id)
            .map((goal) => goal?.goal_title)
            .filter(Boolean)
          : [];

        const schoolAndYear = [studentProfile?.school_name, studentProfile?.grade_year].filter(Boolean).join(', ');

        const nextValue = {
          hasData: Boolean(
            schoolAndYear
              || curriculumProfile?.name
              || curriculumProfile?.subject
              || curriculumProfile?.skill_focus
              || classAssignment?.learning_focus
              || activeStudentGoals.length > 0
          ),
          schoolAndYear,
          profileName: curriculumProfile?.name || '',
          subject: curriculumProfile?.subject || '',
          skillFocus: curriculumProfile?.skill_focus || '',
          classLearningFocus: classAssignment?.learning_focus || '',
          studentGoals: activeStudentGoals,
        };

        setLearningFocus(nextValue);
      } catch {
        if (!cancelled) {
          setLearningFocus({ hasData: false });
        }
      } finally {
        if (!cancelled) {
          setLearningFocusLoading(false);
        }
      }
    };

    void loadLearningFocus();
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, hasSupabaseSession, student?.id, cls?.id]);

  const refreshFeeStatus = async () => {
    if (!viewer || !student?.id) return;
    const fee = await getStudentFeeStatus(viewer, student.id);
    setFeeStatus(fee || null);
  };

  const handleHomeworkUploadFileChange = (taskId, file) => {
    if (!taskId) return;
    if (!file) {
      setHomeworkUploadDraftByTaskId((prev) => ({
        ...prev,
        [taskId]: { ...(prev[taskId] || {}), file: null },
      }));
      return;
    }
    if (!ALLOWED_HOMEWORK_UPLOAD_TYPES.has(file.type)) {
      toast.message('Please upload a JPG, PNG, WEBP image, or PDF file.');
      return;
    }
    if (file.size > MAX_HOMEWORK_UPLOAD_BYTES) {
      toast.message('Homework file must be 5MB or smaller.');
      return;
    }
    setHomeworkUploadDraftByTaskId((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || {}), file },
    }));
  };

  const handleHomeworkUploadNoteChange = (taskId, note) => {
    if (!taskId) return;
    setHomeworkUploadDraftByTaskId((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || {}), note: note || '' },
    }));
  };

  const handleSubmitHomeworkForTask = async (taskId) => {
    const targetTask = parentHomeworkTasksWithStatus.find((task) => task.id === taskId);
    if (!targetTask) {
      toast.message('Homework task is not available for submission.');
      return;
    }
    const currentStatus = targetTask.parentStatus || 'not_submitted';
    const canSubmit = currentStatus === 'not_submitted' || currentStatus === 'returned_for_revision';
    if (!canSubmit) {
      toast.message('This homework is already submitted for teacher review.');
      return;
    }
    const uploadDraft = homeworkUploadDraftByTaskId[taskId] || {};
    const file = uploadDraft.file || null;
    const note = (uploadDraft.note || '').trim();
    if (!file) {
      toast.message('Please choose a file before submitting homework.');
      return;
    }

    if (isDemoMode) {
      const simulatedSubmissionId = `demo-homework-submission-${taskId}`;
      setParentHomeworkSubmissions((prev) => {
        const withoutTask = prev.filter((row) => row.homework_task_id !== taskId);
        return [
          ...withoutTask,
          {
            id: simulatedSubmissionId,
            homework_task_id: taskId,
            status: 'submitted',
          },
        ];
      });
      setHomeworkUploadDraftByTaskId((prev) => ({
        ...prev,
        [taskId]: { note: '', file: null },
      }));
      toast.success('Demo mode: homework submit simulated locally. Teacher review status is preview-only.');
      return;
    }
    if (!isSupabaseConfigured() || !hasSupabaseSession) {
      toast.message('A Supabase parent session is required to submit homework.');
      return;
    }
    if (!isUuidLike(targetTask.branchId) || !isUuidLike(targetTask.classId) || !isUuidLike(targetTask.studentId)) {
      toast.message('Linked child homework context is not available yet.');
      return;
    }

    try {
      setHomeworkSubmitLoadingByTaskId((prev) => ({ ...prev, [taskId]: true }));
      const submissionResult = await createHomeworkSubmission({
        homeworkTaskId: targetTask.id,
        branchId: targetTask.branchId,
        classId: targetTask.classId,
        studentId: targetTask.studentId,
        submissionNote: note || null,
      });
      if (submissionResult.error || !submissionResult.data?.id) {
        throw new Error(submissionResult.error?.message || 'Unable to create homework submission.');
      }

      const fileUploadResult = await uploadHomeworkFile({
        homeworkSubmissionId: submissionResult.data.id,
        branchId: targetTask.branchId,
        classId: targetTask.classId,
        studentId: targetTask.studentId,
        homeworkTaskId: targetTask.id,
        file,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      });
      if (fileUploadResult.error) {
        throw new Error(fileUploadResult.error.message || 'Unable to upload homework file.');
      }

      setHomeworkUploadDraftByTaskId((prev) => ({
        ...prev,
        [taskId]: { note: '', file: null },
      }));
      toast.success('Your child\'s work has been submitted for teacher review.');
      await loadParentHomeworkStatus();
    } catch (error) {
      toast.error(error?.message || 'Unable to submit homework right now.');
    } finally {
      setHomeworkSubmitLoadingByTaskId((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleReceiptFileSelect = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setSelectedReceiptFile(null);
      return;
    }
    if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
      toast.message('Allowed receipt file types: PNG, JPEG, PDF (text file allowed for testing only).');
      return;
    }
    if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
      toast.message('Receipt file must be 5MB or smaller.');
      return;
    }
    setSelectedReceiptFile(file);
  };

  const handleReceiptUpload = async () => {
    if (!feeStatus?.id) {
      toast.message('No fee record is available for receipt upload.');
      return;
    }
    if (!selectedReceiptFile) {
      toast.message('Please select a receipt file first.');
      return;
    }
    if (isDemoMode) {
      toast.message('Demo parent mode stays local and does not upload to Supabase.');
      return;
    }
    if (!isSupabaseConfigured() || !hasSupabaseSession) {
      toast.message('A Supabase parent session is required to upload a receipt.');
      return;
    }
    if (feeStatus.data_source !== 'supabase_fee_records') {
      toast.message('No real Supabase fee record is available for this parent.');
      return;
    }

    try {
      setReceiptUploadLoading(true);
      const result = await uploadFeeReceipt({
        feeRecordId: feeStatus.id,
        file: selectedReceiptFile,
        fileName: selectedReceiptFile.name,
        contentType: selectedReceiptFile.type || 'application/octet-stream',
      });
      if (result?.error) {
        toast.error(result.error.message || 'Unable to upload receipt');
        return;
      }
      setSelectedReceiptFile(null);
      await refreshFeeStatus();
      toast.success('Payment proof submitted. Status submitted for staff review.');
    } catch (error) {
      toast.error(error?.message || 'Unable to upload receipt');
    } finally {
      setReceiptUploadLoading(false);
    }
  };

  const handleOpenUploadedReceipt = async () => {
    if (!feeStatus?.id) {
      toast.message('No fee record is available for receipt viewing.');
      return;
    }
    if (isDemoMode) {
      toast.message('Demo parent mode does not open Supabase receipt links.');
      return;
    }
    if (!isSupabaseConfigured() || !hasSupabaseSession || feeStatus.data_source !== 'supabase_fee_records') {
      toast.message('Receipt link is available only for real Supabase parent records.');
      return;
    }
    try {
      setReceiptLinkLoading(true);
      const result = await getFeeReceiptSignedUrl({ feeRecordId: feeStatus.id });
      if (result?.error || !result?.data?.signed_url) {
        toast.error(result?.error?.message || 'Unable to open uploaded receipt.');
        return;
      }
      window.open(result.data.signed_url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error?.message || 'Unable to open uploaded receipt.');
    } finally {
      setReceiptLinkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Dashboard not available</h2>
          <p className="text-muted-foreground text-sm">This demo parent view could not be opened for the selected student.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-base">EduCentre</h1>
            <p className="text-xs text-muted-foreground">{isDemoStudentPreview ? 'Student Learning Portal' : 'Parent Dashboard'}</p>
          </div>
        </div>
      </div>

      {/* Student identity */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xl font-bold flex-shrink-0">
            {student.name[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {cls && <Badge variant="outline">{cls.name}</Badge>}
              {cls?.subject && <span>{cls.subject}</span>}
            </div>
          </div>
        </div>

        {!isDemoStudentPreview && (
          isDemoMode
            ? <ClassMemoriesDemoSection className={cls?.name} />
            : (
              <ParentClassMemoriesSection
                className={cls?.name}
                latestMemory={realClassMemories[0] || null}
                historyMemories={realClassMemories.slice(1)}
                signedUrlByMemoryId={classMemorySignedUrls}
                loading={classMemoriesLoading}
                error={classMemoriesError}
              />
            )
        )}

        {!isDemoStudentPreview && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Learning Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('student-learning-portal')?.scrollIntoView({ behavior: 'smooth' })}>
                  <ExternalLink className="h-4 w-4" />
                  Open Student Learning Portal
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('parent-homework-status')?.scrollIntoView({ behavior: 'smooth' })}>
                  <BookOpen className="h-4 w-4" />
                  View Homework Status
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('homework-history')?.scrollIntoView({ behavior: 'smooth' })}>
                  <BookOpen className="h-4 w-4" />
                  View Homework History
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('latest-report')?.scrollIntoView({ behavior: 'smooth' })}>
                  <FileText className="h-4 w-4" />
                  View Approved Teacher Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="mb-6" />

        <Card className="mb-4 border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {isDemoStudentPreview
                ? 'Privacy note: the student portal only shows this student’s own linked fake learning data.'
                : 'Privacy note: the parent dashboard only shows linked child data for this one fake student and does not show teacher, HQ, or internal pages.'}
            </p>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="space-y-4">
          {isDemoStudentPreview ? (
            <>
              <StudentPortalSummary attendance={attendance} updates={updates} />
              <TeacherFeedback updates={updates} isStudentPreview />
            </>
          ) : (
            <>
              <ChildProfileSummary student={student} cls={cls} />
              <LearningFocusSummary
                isDemoMode={isDemoMode}
                learningFocus={learningFocus}
                loading={learningFocusLoading}
              />
              <ParentHomeworkStatusSection
                isDemoMode={isDemoMode}
                loading={parentHomeworkLoading}
                error={parentHomeworkError}
                tasks={parentHomeworkTasksWithStatus}
                feedbackBySubmissionId={parentHomeworkFeedbackBySubmissionId}
                markedWorkBySubmissionId={parentHomeworkMarkedWorkBySubmissionId}
                uploadDraftByTaskId={homeworkUploadDraftByTaskId}
                submitLoadingByTaskId={homeworkSubmitLoadingByTaskId}
                onUploadFileChange={handleHomeworkUploadFileChange}
                onUploadNoteChange={handleHomeworkUploadNoteChange}
                onSubmitTaskUpload={handleSubmitHomeworkForTask}
                onViewMarkedWork={handleViewMarkedWork}
              />
              <LatestParentComment updates={updates} />
              <LatestWeeklyProgressReport updates={updates} />
              {feeStatus && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fee Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Current Period</p><p>{feeStatus.fee_period}</p></div>
                      <div><p className="text-xs text-muted-foreground">Status</p><p className="capitalize">{feeStatus.payment_status}</p></div>
                      <div><p className="text-xs text-muted-foreground">Due Date</p><p>{feeStatus.due_date}</p></div>
                      <div><p className="text-xs text-muted-foreground">Receipt Uploaded</p><p>{feeStatus.receipt_uploaded ? 'Yes' : 'No'}</p></div>
                    </div>
                    <div className="mt-4 rounded-lg border border-dashed p-3 sm:p-4 space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Payment proof</p>
                        <p className="text-xs text-muted-foreground">Submit only if requested by office.</p>
                        <p className="text-xs text-muted-foreground">
                          Your payment is normally checked by the centre. Upload proof only if we ask you to confirm an untracked payment.
                        </p>
                        {feeStatus.verification_status === 'submitted' && (
                          <p className="text-xs font-medium text-blue-700">Status: submitted for staff review</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf,.txt"
                          onChange={handleReceiptFileSelect}
                          disabled={receiptUploadLoading}
                          className="block w-full text-sm"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleReceiptUpload}
                            disabled={receiptUploadLoading}
                          >
                            {receiptUploadLoading ? 'Uploading...' : 'Upload Payment Proof'}
                          </Button>
                          {feeStatus.receipt_uploaded && (
                            <Button
                              variant="ghost"
                              className="w-full"
                              onClick={handleOpenUploadedReceipt}
                              disabled={receiptLinkLoading}
                            >
                              View Uploaded Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <AttendanceSummary records={attendance} />
              <HomeworkSummary records={attendance} />
              <TeacherFeedback updates={updates} />

              <Card id="student-learning-portal">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Student Learning Portal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Open the student view to see homework due, recent feedback, learning resources, and a simple progress summary.
                  </p>
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <p className="text-sm"><span className="font-medium">Homework Due:</span> {attendance.filter((item) => ['incomplete', 'not_submitted'].includes(item.homework_status)).length}</p>
                    <p className="text-sm mt-2"><span className="font-medium">Latest Report:</span> {latestApprovedUpdate ? 'Available' : 'Not available yet'}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          This is a private demo view for {isDemoStudentPreview ? student.name : (student.parent_name || 'the parent/guardian')} linked to {student.name}. Internal teacher, branch, HQ, KPI, observation, lead, trial, migration, and roadmap pages are restricted.
        </p>
      </div>
    </div>
  );
}
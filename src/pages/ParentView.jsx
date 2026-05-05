import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import {
  buildReleasedReportPdfInputFromParentViewContext,
  renderReleasedReportPdfHtml,
} from '@/services/aiParentReportPdfTemplate';
import { getCurrentUser, getSelectedDemoRole, normalizeRole, isDebugModeEnabled } from '@/services/authService';
import {
  getStudentById,
  getClassById,
  listAttendanceRecords,
  listParentUpdatesByStudent,
  getStudentFeeStatus,
  listBranches,
} from '@/services/dataService';
import { canAccessStudentRecord, ROLES } from '@/services/permissionService';
import {
  getStudentLearningContext,
  getClassLearningContext,
  listCurriculumProfiles,
  listParentAnnouncements,
  getParentAnnouncementDetail,
  listAiParentReports,
  getAiParentReportDetail,
  getAiParentReportCurrentVersion,
  listMyInAppNotifications,
  listMyNotificationPreferences,
  hasMyPolicyAcknowledgement,
} from '@/services/supabaseReadService';
import {
  uploadFeeReceipt,
  getFeeReceiptSignedUrl,
  listClassMemories,
  getClassMemorySignedUrl,
  listHomeworkTasks,
  listHomeworkSubmissions,
  listHomeworkFeedback,
  listHomeworkFiles,
  getHomeworkFileSignedUrl,
  createHomeworkSubmission,
  uploadHomeworkFile,
  listParentAnnouncementMedia,
  getParentAnnouncementMediaSignedUrl,
} from '@/services/supabaseUploadService';
import {
  markParentAnnouncementRead,
  markNotificationRead,
  upsertMyNotificationPreference,
  createMyPolicyAcknowledgement,
} from '@/services/supabaseWriteService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import ActiveSessionsCard from '@/components/account/ActiveSessionsCard';
import {
  GraduationCap, CheckCircle2, XCircle, Clock, Umbrella,
  BookOpen, BookX, Minus, ExternalLink, FileText, Loader2, Sparkles, Bell,
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

/** Legacy hash bookmarks (e.g. old “Parent Reports” target) → current section id */
const PARENT_VIEW_HASH_ALIASES = {
  'latest-report': 'parent-progress-reports',
};

const PARENT_NOTIFICATION_PREFERENCE_ROWS = [
  { category: 'attendance_safety', label: 'Attendance and safety updates' },
  { category: 'learning_report_homework', label: 'Reports and homework feedback' },
  { category: 'parent_communication', label: 'Class updates and parent communication' },
  { category: 'billing_invoice', label: 'Billing and payment notices' },
  { category: 'media_photo', label: 'Class memories and photo-related updates' },
  { category: 'marketing_events', label: 'Events and promotional updates' },
];
const PARENT_FIRST_LOGIN_POLICY_KEY = 'parent_portal_terms_privacy';
const PARENT_FIRST_LOGIN_POLICY_VERSION = 'v1';

function buildDefaultParentNotificationPreferences() {
  return {
    operational_service: { enabled: true, consentStatus: 'required_service' },
    attendance_safety: { enabled: true, consentStatus: 'consented' },
    learning_report_homework: { enabled: true, consentStatus: 'consented' },
    parent_communication: { enabled: true, consentStatus: 'consented' },
    billing_invoice: { enabled: true, consentStatus: 'consented' },
    media_photo: { enabled: false, consentStatus: 'not_set' },
    marketing_events: { enabled: false, consentStatus: 'not_set' },
  };
}

function normalizeParentPreferenceValue(row, fallbackValue) {
  const base = fallbackValue || { enabled: false, consentStatus: 'not_set' };
  const consentStatus = typeof row?.consent_status === 'string' ? row.consent_status.trim() : '';
  return {
    enabled: typeof row?.enabled === 'boolean' ? row.enabled : base.enabled,
    consentStatus: consentStatus || base.consentStatus,
  };
}

function deriveConsentStatusForSave({ category, enabled, previousConsentStatus }) {
  if (category === 'operational_service') return 'required_service';
  if (enabled) return 'consented';
  if (category === 'marketing_events' || category === 'media_photo') {
    return previousConsentStatus === 'consented' || previousConsentStatus === 'withdrawn'
      ? 'withdrawn'
      : 'not_set';
  }
  return 'withdrawn';
}

function normalizeNotificationText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function resolveParentNotificationAction(notification) {
  const haystack = `${normalizeNotificationText(notification?.title)} ${normalizeNotificationText(notification?.body)}`;

  if (haystack.includes('payment proof requested')) {
    return { label: 'Upload proof', targetId: 'parent-payment-proof' };
  }
  if (
    haystack.includes('payment proof verified')
    || haystack.includes('payment proof needs review')
    || haystack.includes('payment update')
  ) {
    return { label: 'View payment', targetId: 'parent-payment-proof' };
  }
  if (haystack.includes('attendance') || haystack.includes('arrived')) {
    return { label: 'View attendance', targetId: 'attendance-summary' };
  }
  if (haystack.includes('homework') || haystack.includes('marked file') || haystack.includes('feedback')) {
    return { label: 'View homework', targetId: 'parent-homework-status' };
  }
  if (haystack.includes('weekly progress') || haystack.includes('class update') || haystack.includes('parent comment')) {
    return { label: 'View update', targetId: 'parent-communication-updates' };
  }
  if (haystack.includes('report') || haystack.includes('progress report')) {
    return { label: 'View report', targetId: 'parent-progress-reports' };
  }
  return { label: 'View details', targetId: 'parent-in-app-notifications' };
}

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

function getMarkedWorkTypeLabel(contentType, fileName) {
  const safeContentType = typeof contentType === 'string' ? contentType.trim().toLowerCase() : '';
  if (safeContentType === 'application/pdf') return 'PDF';
  if (safeContentType === 'image/jpeg') return 'JPG image';
  if (safeContentType === 'image/png') return 'PNG image';
  if (safeContentType === 'image/webp') return 'WEBP image';
  if (safeContentType.startsWith('image/')) return 'Image';
  const extension = typeof fileName === 'string' && fileName.includes('.')
    ? fileName.split('.').pop().toUpperCase()
    : '';
  return extension || 'File';
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

const PARENT_ANNOUNCEMENT_TYPE_LABELS = {
  event: 'Event',
  activity: 'Activity',
  centre_notice: 'Centre Notice',
  holiday_closure: 'Holiday Closure',
  reminder: 'Reminder',
  celebration: 'Celebration',
  programme_update: 'Programme Update',
  parent_workshop: 'Parent Workshop',
  graduation_concert: 'Graduation Concert',
};

const DEMO_PARENT_ANNOUNCEMENTS = [
  {
    id: 'demo-parent-ann-event',
    title: 'Family Learning Fair',
    announcementType: 'event',
    bodyPreview: 'Join us for a family-friendly learning fair this Saturday with reading games and mini workshops.',
    body: 'Join us for a family-friendly learning fair this Saturday. Session highlights include reading games, maths puzzles, and teacher Q&A corners.',
    publishedAt: '2026-05-01T08:00:00.000Z',
    eventStartAt: '2026-05-04T10:00:00.000Z',
    eventEndAt: '2026-05-04T12:00:00.000Z',
    location: 'Main Hall',
    media: [{ id: 'demo-media-1', fileName: 'family-fair-poster.png', mimeType: 'image/png' }],
  },
  {
    id: 'demo-parent-ann-activity',
    title: 'Class Gardening Activity Week',
    announcementType: 'activity',
    bodyPreview: 'Students will join hands-on gardening sessions this week. Please pack a hat and water bottle.',
    body: 'Students will join hands-on gardening sessions this week. Please prepare a hat and a labeled water bottle each day.',
    publishedAt: '2026-04-30T09:00:00.000Z',
    eventStartAt: '2026-05-02T09:00:00.000Z',
    eventEndAt: '2026-05-06T14:00:00.000Z',
    location: 'School Garden Zone',
    media: [],
  },
  {
    id: 'demo-parent-ann-centre',
    title: 'Centre Notice: Term 2 Arrival Reminder',
    announcementType: 'centre_notice',
    bodyPreview: 'Please arrive 10 minutes before class to settle in and complete attendance smoothly.',
    body: 'Please arrive 10 minutes before class to settle in and complete attendance smoothly. Thank you for helping class sessions start on time.',
    publishedAt: '2026-04-29T08:30:00.000Z',
    eventStartAt: null,
    eventEndAt: null,
    location: null,
    media: [],
  },
  {
    id: 'demo-parent-ann-holiday',
    title: 'Holiday Closure Notice',
    announcementType: 'holiday_closure',
    bodyPreview: 'The centre will be closed on 2026-05-08 for a public holiday. Classes resume the next day.',
    body: 'The centre will be closed on Friday 2026-05-08 for a public holiday. Normal classes resume on Saturday.',
    publishedAt: '2026-04-27T11:00:00.000Z',
    eventStartAt: '2026-05-08T00:00:00.000Z',
    eventEndAt: '2026-05-08T23:59:00.000Z',
    location: 'All Branches',
    media: [],
  },
  {
    id: 'demo-parent-ann-reminder',
    title: 'Reminder: Reading Log Submission',
    announcementType: 'reminder',
    bodyPreview: 'Please submit this week’s reading log by Friday to help teachers review progress.',
    body: 'Please submit this week’s reading log by Friday evening. This helps teachers tailor next-week support.',
    publishedAt: '2026-04-26T07:20:00.000Z',
    eventStartAt: null,
    eventEndAt: null,
    location: null,
    media: [],
  },
  {
    id: 'demo-parent-ann-celebration',
    title: 'Celebration: Reading Stars',
    announcementType: 'celebration',
    bodyPreview: 'Congratulations to all students who completed their reading challenge milestones this month.',
    body: 'Congratulations to all students who completed reading challenge milestones this month. Families are invited to our recognition moment next week.',
    publishedAt: '2026-04-25T10:15:00.000Z',
    eventStartAt: null,
    eventEndAt: null,
    location: null,
    media: [],
  },
  {
    id: 'demo-parent-ann-workshop',
    title: 'Parent Workshop: Supporting Homework Habits',
    announcementType: 'parent_workshop',
    bodyPreview: 'A practical workshop for families on building calm and consistent homework routines at home.',
    body: 'A practical workshop for families on building calm and consistent homework routines at home. Bring your questions for a live Q&A.',
    publishedAt: '2026-04-24T09:45:00.000Z',
    eventStartAt: '2026-05-10T15:00:00.000Z',
    eventEndAt: '2026-05-10T16:00:00.000Z',
    location: 'Parent Learning Room',
    media: [{ id: 'demo-media-2', fileName: 'workshop-invite.pdf', mimeType: 'application/pdf' }],
  },
];

function formatParentAnnouncementDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const DEMO_PARENT_RELEASED_REPORTS = [
  {
    id: 'demo-parent-report-released-1',
    studentId: 'student-01',
    classId: 'class-alpha',
    branchId: 'branch-north',
    reportType: 'monthly_progress',
    reportPeriodStart: '2026-04-01',
    reportPeriodEnd: '2026-04-30',
    status: 'released',
    currentVersionId: 'demo-parent-report-released-1-v1',
    releasedAt: '2026-05-01T09:30:00.000Z',
    createdAt: '2026-05-01T09:10:00.000Z',
    updatedAt: '2026-05-01T09:30:00.000Z',
  },
  {
    id: 'demo-parent-report-released-2',
    studentId: 'student-01',
    classId: 'class-alpha',
    branchId: 'branch-north',
    reportType: 'weekly_brief',
    reportPeriodStart: '2026-04-21',
    reportPeriodEnd: '2026-04-27',
    status: 'released',
    currentVersionId: 'demo-parent-report-released-2-v1',
    releasedAt: '2026-04-28T11:00:00.000Z',
    createdAt: '2026-04-28T10:45:00.000Z',
    updatedAt: '2026-04-28T11:00:00.000Z',
  },
];

const DEMO_PARENT_RELEASED_REPORT_CURRENT_VERSION_BY_ID = {
  'demo-parent-report-released-1': {
    id: 'demo-parent-report-released-1-v1',
    reportId: 'demo-parent-report-released-1',
    versionNumber: 1,
    structuredSections: {
      summary: 'Your child has shown steady progress this month with improved confidence during reading activities.',
      attendance_punctuality: 'Attendance has been consistent, with one late arrival this period.',
      lesson_progression: 'Classwork moved from guided responses to short independent summaries.',
      homework_completion: 'Most homework tasks were completed on time with good effort.',
      strengths: 'Reading fluency and participation in class discussions.',
      areas_for_improvement: 'Adding more detail to written responses.',
      next_recommendations: 'Practice short daily summaries and explain one key idea in full sentences.',
      parent_support_suggestions: 'Read together for 10 minutes daily and ask one follow-up question about the text.',
      teacher_final_comment: 'A positive month overall. Keep routines consistent for continued growth.',
    },
    finalText: {
      teacher_final_comment: 'A positive month overall. Keep routines consistent for continued growth.',
    },
    createdAt: '2026-05-01T09:20:00.000Z',
  },
  'demo-parent-report-released-2': {
    id: 'demo-parent-report-released-2-v1',
    reportId: 'demo-parent-report-released-2',
    versionNumber: 1,
    structuredSections: {
      summary: 'A solid week of engagement with clear effort in literacy tasks.',
      attendance_punctuality: 'Present for all sessions in this report window.',
      lesson_progression: 'Completed guided reading and moved into vocabulary extension tasks.',
      homework_completion: 'Homework was submitted and reviewed within the week.',
      strengths: 'Consistency and willingness to ask helpful questions.',
      areas_for_improvement: 'Check final answers carefully before submission.',
      next_recommendations: 'Keep using a short checklist before homework submission.',
      parent_support_suggestions: 'Encourage a calm 15-minute homework block at a regular time each day.',
      teacher_final_comment: 'Thank you for strong home support this week.',
    },
    finalText: {
      teacher_final_comment: 'Thank you for strong home support this week.',
    },
    createdAt: '2026-04-28T10:50:00.000Z',
  },
};

const RELEASED_STATUS_BADGE_CLASS = 'bg-purple-100 text-purple-700 border-purple-200';

function formatParentReportTypeLabel(value) {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!key) return 'Progress report';
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapSectionValueToText(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const list = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return list.join(', ');
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function resolveParentReportSection({ currentVersion, detail }, keys) {
  if (!Array.isArray(keys) || keys.length === 0) return '';
  const structured = currentVersion?.structuredSections && typeof currentVersion.structuredSections === 'object'
    ? currentVersion.structuredSections
    : {};
  const finalText = currentVersion?.finalText && typeof currentVersion.finalText === 'object'
    ? currentVersion.finalText
    : {};

  for (const key of keys) {
    const fromStructured = mapSectionValueToText(structured[key]);
    if (fromStructured) return fromStructured;
    const fromFinalText = mapSectionValueToText(finalText[key]);
    if (fromFinalText) return fromFinalText;
  }
  const fallbackTeacherComment = mapSectionValueToText(finalText.teacher_final_comment || structured.teacher_final_comment);
  if (fallbackTeacherComment && keys.includes('teacher_final_comment')) return fallbackTeacherComment;
  return '';
}

function ParentProgressReportsSection({
  isDemoMode,
  showInternalPreview,
  loading,
  error,
  reports,
  selectedReportId,
  onSelectReport,
  detail,
  currentVersion,
  detailLoading,
  detailError,
  studentName,
  className,
  classSubject,
  branchDisplayName,
}) {
  const [showPrintablePreview, setShowPrintablePreview] = useState(false);

  useEffect(() => {
    setShowPrintablePreview(false);
  }, [selectedReportId]);

  const printablePreview = useMemo(() => {
    if (!detail || !currentVersion) return { ok: false };
    const status = typeof detail.status === 'string' ? detail.status.trim().toLowerCase() : '';
    if (status && status !== 'released') return { ok: false };
    const built = buildReleasedReportPdfInputFromParentViewContext({
      report: detail,
      currentVersion,
      context: {
        studentDisplayName: studentName || detail.student_display_name || 'Student',
        classLabel: className || '',
        programmeLabel: classSubject || '',
        branchName: (typeof branchDisplayName === 'string' && branchDisplayName.trim())
          ? branchDisplayName.trim()
          : [className, classSubject].filter(Boolean).join(' · ') || 'Learning Centre',
        footerContactLine: 'Contact your centre if you have questions about this report.',
      },
    });
    if (!built.ok) return { ok: false, error: built.error };
    const rendered = renderReleasedReportPdfHtml(built.data);
    if (!rendered.ok) return { ok: false, error: rendered.error };
    return { ok: true, html: rendered.html };
  }, [detail, currentVersion, studentName, className, classSubject, branchDisplayName]);

  const canShowPrintablePreview = printablePreview.ok === true && Boolean(printablePreview.html);
  if (loading) {
    return (
      <Card id="parent-progress-reports">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progress Reports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading released progress reports...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card id="parent-progress-reports" className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progress Reports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (!reports.length) {
    return (
      <Card id="parent-progress-reports" className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progress Reports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No released progress reports are available right now.
        </CardContent>
      </Card>
    );
  }

  const selectedSummary = reports.find((item) => item.id === selectedReportId) || reports[0];
  const latest = reports[0];
  const detailContext = { currentVersion, detail };
  const sectionRows = [
    { title: 'Summary', keys: ['summary', 'student_summary'] },
    { title: 'Attendance & punctuality', keys: ['attendance_punctuality', 'attendance_summary'] },
    { title: 'Lesson progression', keys: ['lesson_progression', 'learning_focus'] },
    { title: 'Homework completion', keys: ['homework_completion'] },
    { title: 'Strengths', keys: ['strengths'] },
    { title: 'Areas for improvement', keys: ['areas_for_improvement'] },
    { title: 'Next recommendations', keys: ['next_recommendations'] },
    { title: 'Parent support suggestions', keys: ['parent_support_suggestions', 'suggested_home_practice'] },
    { title: 'Teacher final comment', keys: ['teacher_final_comment'] },
  ]
    .map((section) => ({ ...section, text: resolveParentReportSection(detailContext, section.keys) }))
    .filter((section) => section.text);

  return (
    <Card id="parent-progress-reports">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Progress Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isDemoMode
            ? 'Demo-only preview: released report cards below use local fake data only.'
            : 'Released reports shared by your child\'s teacher are shown here.'}
        </p>

        <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{formatParentReportTypeLabel(latest.reportType)}</p>
            <Badge variant="outline" className={RELEASED_STATUS_BADGE_CLASS}>Released</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Period: {formatReleasedDateLabel(latest.reportPeriodStart)} - {formatReleasedDateLabel(latest.reportPeriodEnd)}
          </p>
          {latest.releasedAt ? (
            <p className="text-xs text-muted-foreground">
              Released: {formatParentAnnouncementDateTime(latest.releasedAt)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          {reports.map((row) => {
            const isSelected = selectedSummary?.id === row.id;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelectReport(row.id)}
                className={`w-full text-left rounded-lg border p-3 space-y-1.5 transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{formatParentReportTypeLabel(row.reportType)}</p>
                  <Badge variant="outline" className={RELEASED_STATUS_BADGE_CLASS}>Released</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Period: {formatReleasedDateLabel(row.reportPeriodStart)} - {formatReleasedDateLabel(row.reportPeriodEnd)}
                </p>
                {row.releasedAt ? (
                  <p className="text-[11px] text-muted-foreground">
                    Released: {formatParentAnnouncementDateTime(row.releasedAt)}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium">Report detail</p>
          {detailLoading ? (
            <p className="text-xs text-muted-foreground">Loading released report detail...</p>
          ) : detailError ? (
            <p className="text-xs text-muted-foreground">{detailError}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Student:</span> {studentName || 'Linked child'}</p>
                <p><span className="font-medium text-foreground">Class:</span> {className || 'Class'}</p>
                <p><span className="font-medium text-foreground">Programme:</span> {classSubject || 'Learning programme'}</p>
                <p><span className="font-medium text-foreground">Status:</span> Released</p>
              </div>
              {sectionRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Released summary sections are not available for this report yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {sectionRows.map((section) => (
                    <details key={section.title} className="rounded-md border bg-muted/20 px-2.5 py-2">
                      <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                        {section.title}
                      </summary>
                      <p className="mt-2 text-xs text-foreground whitespace-pre-line">{section.text}</p>
                    </details>
                  ))}
                </div>
              )}

              {!detailLoading && !detailError && detail && currentVersion && showInternalPreview ? (
                <div className="mt-4 space-y-2 border-t pt-3">
                  {canShowPrintablePreview ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setShowPrintablePreview((open) => !open)}
                      >
                        {showPrintablePreview ? 'Hide printable preview' : 'Preview printable report'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        This preview uses the released report content shown above. Download PDF will be added later.
                      </p>
                      {showPrintablePreview ? (
                        <div className="rounded-xl border border-sky-200/90 bg-sky-50/50 dark:bg-sky-950/25 p-3 sm:p-4 space-y-3 max-w-full overflow-x-hidden">
                          <p className="text-sm font-medium text-foreground">Printable report preview</p>
                          <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                            <li>Released report content only</li>
                            <li>No file is generated or stored yet</li>
                            <li>Download PDF will come later</li>
                          </ul>
                          <p className="text-[11px] text-muted-foreground">
                            Scroll inside the white area below to read the full page. This is a layout preview only — not a file download.
                          </p>
                          <div className="rounded-lg border border-border/80 bg-muted/30 p-1 sm:p-2 shadow-inner">
                            <iframe
                              key={selectedReportId}
                              title="Printable report preview"
                              className="w-full max-w-full block rounded-md border border-border bg-white shadow-sm"
                              style={{
                                height: 'min(88vh, 900px)',
                                minHeight: '560px',
                              }}
                              srcDoc={printablePreview.html}
                              sandbox=""
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Printable preview is not available for this report yet.
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ParentAnnouncementsEventsSection({
  isDemoMode,
  loading,
  error,
  announcements,
  selectedAnnouncementId,
  onSelectAnnouncement,
  detailLoading,
  detail,
  detailError,
  mediaRows,
  mediaLoading,
  mediaError,
  onOpenMedia,
}) {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const selectedAnnouncement = announcements.find((row) => row.id === selectedAnnouncementId) || null;
  const featured = announcements[0] || null;
  const historyItems = announcements.slice(1);
  const COLLAPSED_COUNT = 3;
  const visibleHistory = showFullHistory
    ? historyItems
    : historyItems.slice(0, COLLAPSED_COUNT);
  const hasMoreHistory = historyItems.length > COLLAPSED_COUNT;

  if (loading) {
    return (
      <Card id="parent-announcements-events">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Latest announcements and events</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading announcements and events...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card id="parent-announcements-events" className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Latest announcements and events</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (!announcements.length) {
    return (
      <Card id="parent-announcements-events" className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Latest announcements and events</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No parent announcements are available right now.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="parent-announcements-events">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Latest announcements and events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isDemoMode
            ? 'Demo-only preview: announcement and media cards are local examples only.'
            : 'Published parent updates from your centre and class will appear here.'}
        </p>

        {featured ? (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Latest</Badge>
              <Badge variant="outline">
                {PARENT_ANNOUNCEMENT_TYPE_LABELS[featured.announcementType] || 'Announcement'}
              </Badge>
            </div>
            <p className="text-sm font-medium">{featured.title}</p>
            <p className="text-xs text-muted-foreground">{featured.bodyPreview}</p>
            {featured.eventStartAt ? (
              <p className="text-xs text-muted-foreground">
                Event: {formatParentAnnouncementDateTime(featured.eventStartAt)}
                {featured.eventEndAt ? ` - ${formatParentAnnouncementDateTime(featured.eventEndAt)}` : ''}
              </p>
            ) : null}
            {featured.location ? (
              <p className="text-xs text-muted-foreground">Location: {featured.location}</p>
            ) : null}
          </div>
        ) : null}

        {historyItems.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">More announcements</p>
            <div className="space-y-2">
              {visibleHistory.map((item) => {
                const isSelected = selectedAnnouncementId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectAnnouncement(item.id)}
                    className={`w-full text-left rounded-lg border p-3 space-y-1.5 transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <Badge variant="outline">
                        {PARENT_ANNOUNCEMENT_TYPE_LABELS[item.announcementType] || 'Announcement'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.bodyPreview}</p>
                    {item.publishedAt ? (
                      <p className="text-[11px] text-muted-foreground">
                        Published: {formatParentAnnouncementDateTime(item.publishedAt)}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {hasMoreHistory ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setShowFullHistory((prev) => !prev)}
              >
                {showFullHistory ? 'Show less' : 'View more history'}
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium">
            {selectedAnnouncement?.title || detail?.title || 'Announcement detail'}
          </p>
          {detailLoading ? (
            <p className="text-xs text-muted-foreground">Loading detail...</p>
          ) : detailError ? (
            <p className="text-xs text-muted-foreground">{detailError}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {detail?.body || selectedAnnouncement?.body || selectedAnnouncement?.bodyPreview || 'No detail is available.'}
              </p>
              {(detail?.eventStartAt || selectedAnnouncement?.eventStartAt) ? (
                <p className="text-xs text-muted-foreground">
                  Event: {formatParentAnnouncementDateTime(detail?.eventStartAt || selectedAnnouncement?.eventStartAt)}
                  {(detail?.eventEndAt || selectedAnnouncement?.eventEndAt)
                    ? ` - ${formatParentAnnouncementDateTime(detail?.eventEndAt || selectedAnnouncement?.eventEndAt)}`
                    : ''}
                </p>
              ) : null}
              {(detail?.location || selectedAnnouncement?.location) ? (
                <p className="text-xs text-muted-foreground">
                  Location: {detail?.location || selectedAnnouncement?.location}
                </p>
              ) : null}
            </>
          )}

          <div className="pt-2 space-y-2">
            <p className="text-xs font-medium text-foreground">Released media</p>
            {mediaLoading ? (
              <p className="text-xs text-muted-foreground">Loading released media...</p>
            ) : mediaError ? (
              <p className="text-xs text-muted-foreground">{mediaError}</p>
            ) : mediaRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No released media for this announcement yet.</p>
            ) : (
              <div className="space-y-2">
                {mediaRows.map((mediaItem) => (
                  <div key={mediaItem.id} className="rounded-md border p-2.5 space-y-1.5">
                    <p className="text-xs font-medium break-words">{mediaItem.fileName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {mediaItem.mimeType || 'File'}{mediaItem.mediaRole ? ` • ${mediaItem.mediaRole}` : ''}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-8 px-2.5 text-xs"
                      onClick={() => onOpenMedia(mediaItem)}
                    >
                      Open media
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

function formatParentNotificationDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * In-app notification inbox for authenticated parents. Rows come only from RLS (recipient = self).
 * Displays title/body/time/read state only — no metadata, ids, or internal refs.
 */
function ParentInAppNotificationsSection({
  demoMode,
  hasSupabaseSession,
  supabaseReady,
  loading,
  error,
  notifications,
  unreadCount,
  markingId,
  onMarkRead,
  onOpenTarget,
  actionNotice,
}) {
  const unreadBadge =
    unreadCount > 0 ? (
      <Badge variant="outline" className="ml-2 font-normal text-xs">
        {unreadCount} unread
      </Badge>
    ) : null;

  let bodyContent;
  if (demoMode) {
    bodyContent = <p className="text-sm text-muted-foreground">No new notifications yet.</p>;
  } else if (!supabaseReady || !hasSupabaseSession) {
    bodyContent = (
      <p className="text-sm text-muted-foreground">Sign in with your parent account to see notifications.</p>
    );
  } else if (loading) {
    bodyContent = (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>Loading your notifications…</span>
      </div>
    );
  } else if (error) {
    bodyContent = <p className="text-sm text-destructive">{error}</p>;
  } else if (!notifications.length) {
    bodyContent = <p className="text-sm text-muted-foreground">No new notifications yet.</p>;
  } else {
    bodyContent = (
      <div className="space-y-3">
        {actionNotice ? (
          <p className="text-xs text-muted-foreground">{actionNotice}</p>
        ) : null}
        <ul className="space-y-3">
          {notifications.map((n) => {
          const unread = !n.read_at;
          const action = resolveParentNotificationAction(n);
          return (
            <li
              key={n.id}
              className={`rounded-lg border p-3 ${unread ? 'border-primary/25 bg-muted/40' : ''}`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {unread ? (
                      <Badge className="text-xs">Unread</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Read</span>
                    )}
                  </div>
                  {n.body ? (
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">{formatParentNotificationDateTime(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 self-start">
                  {unread ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={markingId === n.id}
                      onClick={() => onMarkRead(n.id)}
                    >
                      {markingId === n.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Mark as read'
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant={unread ? 'default' : 'outline'}
                    size="sm"
                    disabled={markingId === n.id}
                    onClick={() => onOpenTarget(n)}
                  >
                    {markingId === n.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      action.label
                    )}
                  </Button>
                </div>
              </div>
            </li>
          );
          })}
        </ul>
      </div>
    );
  }

  return (
    <Card id="parent-in-app-notifications" className="mb-6" role="region" aria-label="Your notifications">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Bell className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Notifications</CardTitle>
          {unreadBadge}
        </div>
        <p className="sr-only">In-app messages for your account. No report text or internal details are shown here.</p>
      </CardHeader>
      <CardContent>{bodyContent}</CardContent>
    </Card>
  );
}

function ParentNotificationSettingsSection({
  demoMode,
  hasSupabaseSession,
  supabaseReady,
  loading,
  error,
  saving,
  saveMessage,
  saveError,
  preferences,
  onToggleCategory,
  onConfirmOperationalService,
  onSave,
}) {
  const operationalPref = preferences.operational_service || { enabled: true, consentStatus: 'required_service' };
  const operationalNeedsConfirm = operationalPref.consentStatus === 'not_set';
  const isRealModeReady = !demoMode && supabaseReady && hasSupabaseSession;
  const canEdit = demoMode || isRealModeReady;

  return (
    <Card id="parent-notification-settings" className="mb-6" role="region" aria-label="Communication and notification settings">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Communication &amp; Notification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your parent portal is the main place to view your child&apos;s learning updates, reports, homework feedback, attendance information, and payment notices.
        </p>
        {demoMode ? (
          <p className="text-xs text-muted-foreground">
            Changes in demo parent mode are visual only and are not saved to Supabase.
          </p>
        ) : null}
        {!demoMode && (!supabaseReady || !hasSupabaseSession) ? (
          <p className="text-xs text-muted-foreground">
            Sign in with your parent account to manage communication settings.
          </p>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Loading your communication settings…</span>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-lg border p-3 sm:p-4 space-y-3">
          <p className="text-sm font-medium">Required service communication</p>
          <p className="text-sm text-muted-foreground">
            I acknowledge that the centre may send essential service updates through the parent portal.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{operationalNeedsConfirm ? 'Confirmation pending' : 'Acknowledged'}</Badge>
            <Badge variant="secondary">In-app only</Badge>
          </div>
          <Button
            type="button"
            variant={operationalNeedsConfirm ? 'default' : 'outline'}
            onClick={onConfirmOperationalService}
            disabled={!canEdit || loading || saving || !operationalNeedsConfirm}
            aria-label="Confirm required service communication acknowledgement"
            className="w-full sm:w-auto"
          >
            {operationalNeedsConfirm ? 'Confirm acknowledgement' : 'Acknowledged'}
          </Button>
        </div>

        <div className="space-y-3">
          {PARENT_NOTIFICATION_PREFERENCE_ROWS.map((row) => {
            const pref = preferences[row.category] || { enabled: false, consentStatus: 'not_set' };
            const statusLabel = pref.consentStatus === 'not_set'
              ? 'Not set'
              : pref.consentStatus === 'required_service'
                ? 'Required'
                : pref.consentStatus === 'withdrawn'
                  ? 'Withdrawn'
                  : 'Consented';
            return (
              <div key={row.category} className="rounded-lg border p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">In-app channel</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{statusLabel}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant={pref.enabled ? 'default' : 'outline'}
                      className="min-w-20"
                      onClick={() => onToggleCategory(row.category, true)}
                      disabled={!canEdit || loading || saving}
                      aria-label={`Turn on ${row.label}`}
                    >
                      On
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!pref.enabled ? 'default' : 'outline'}
                      className="min-w-20"
                      onClick={() => onToggleCategory(row.category, false)}
                      disabled={!canEdit || loading || saving}
                      aria-label={`Turn off ${row.label}`}
                    >
                      Off
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-dashed p-3 sm:p-4 space-y-2">
          <p className="text-sm font-medium">Future channels</p>
          <p className="text-sm text-muted-foreground">
            Email/SMS notifications are not active yet. When enabled, you will be able to manage them here.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Preferences are stored now for portal communication settings. Notification trigger enforcement is planned for a future phase.
          </p>
          <Button
            type="button"
            onClick={onSave}
            disabled={!canEdit || loading || saving}
            aria-label="Save communication settings"
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save settings'
            )}
          </Button>
        </div>
        {saveMessage ? <p className="text-sm text-green-700">{saveMessage}</p> : null}
        {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
      </CardContent>
    </Card>
  );
}

function ParentPortalAcknowledgementGate({
  checking,
  checkError,
  saveError,
  saving,
  checked,
  onCheckedChange,
  onContinue,
  sessionReady,
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-base">EduCentre</h1>
            <p className="text-xs text-muted-foreground">Parent Dashboard</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Welcome to your Parent Portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Before continuing, please confirm that you have read the portal terms and privacy notice.
              Essential class and learning updates will be shared through this portal.
            </p>

            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="#"
                onClick={(event) => event.preventDefault()}
                className="underline text-foreground"
                aria-label="Terms of Use (placeholder link)"
              >
                Terms of Use
              </a>
              <a
                href="#"
                onClick={(event) => event.preventDefault()}
                className="underline text-foreground"
                aria-label="Privacy Notice (placeholder link)"
              >
                Privacy Notice
              </a>
            </div>

            {checking ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Checking your portal acknowledgement…</span>
              </div>
            ) : (
              <>
                <label className="flex items-start gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onCheckedChange(event.target.checked)}
                    className="mt-0.5 h-4 w-4"
                    aria-label="I have read and agree to the Parent Portal Terms of Use and Privacy Notice"
                    disabled={saving || !sessionReady}
                  />
                  <span className="text-sm text-foreground">
                    I have read and agree to the Parent Portal Terms of Use and Privacy Notice. I understand the
                    centre may use the portal to share essential service updates related to my child&apos;s learning,
                    attendance, homework, reports, billing, safety, and class operations.
                  </span>
                </label>

                <p className="text-xs text-muted-foreground">
                  Your notification preferences can be managed later in Communication &amp; Notification Settings.
                </p>

                {!sessionReady ? (
                  <p className="text-sm text-destructive">
                    Sign in with your parent account to continue.
                  </p>
                ) : null}
                {checkError ? <p className="text-sm text-destructive">{checkError}</p> : null}
                {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

                <Button
                  type="button"
                  onClick={onContinue}
                  disabled={!checked || saving || !sessionReady}
                  className="w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue to parent portal'
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
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
    <div id="student-learning-portal" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Homework Due</p><p className="text-3xl font-bold mt-1">{homeworkDue}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Recent Feedback</p><p className="text-3xl font-bold mt-1">{recentFeedback.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Learning Resources</p><p className="text-3xl font-bold mt-1">2</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Progress Summary</p><p className="text-3xl font-bold mt-1">{progressRate}%</p></CardContent></Card>
      </div>

      <Card id="homework-due">
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

      <Card id="recent-feedback">
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

      <Card id="learning-resources">
        <CardHeader className="pb-3"><CardTitle className="text-base">Learning Resources</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="rounded-lg border p-3">Weekly practice pack</div>
            <div className="rounded-lg border p-3">Reading and revision worksheet</div>
          </div>
        </CardContent>
      </Card>

      <Card id="simple-progress-summary">
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
 * Real parent mode: prefer URL `student` UUID (RLS still gates listStudents/getStudents).
 * Demo URL preview: allow legacy student-01 fallback when no UUID and no profile student_id.
 */
function resolveParentViewTargetStudentIdForParent({ studentIdFromUrl, currentUserStudentId, isDemoMode }) {
  const urlTrim = typeof studentIdFromUrl === 'string' ? studentIdFromUrl.trim() : '';
  if (isUuidLike(urlTrim)) return urlTrim;
  if (typeof currentUserStudentId === 'string' && currentUserStudentId.trim()) {
    return currentUserStudentId.trim();
  }
  if (isDemoMode) return 'student-01';
  return null;
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
  const outletContext = useOutletContext();
  const outletUser = outletContext?.user ?? null;
  const { appUser: supabaseAppUser, user: supabaseSessionUser } = useSupabaseAuthState();
  const location = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('student');
  const previewRole = urlParams.get('demoRole');
  const isDemoStudentPreview = previewRole === 'student';
  const isDemoMode = Boolean(getSelectedDemoRole());
  const isDebugMode = isDebugModeEnabled();
  const showInternalDebugPanels = Boolean(isDemoMode || isDebugMode);
  const hasSupabaseSession = Boolean(supabaseSessionUser?.id);
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
  const [parentAnnouncementsLoading, setParentAnnouncementsLoading] = useState(false);
  const [parentAnnouncementsError, setParentAnnouncementsError] = useState('');
  const [parentAnnouncementsRows, setParentAnnouncementsRows] = useState([]);
  const [selectedParentAnnouncementId, setSelectedParentAnnouncementId] = useState(null);
  const [parentAnnouncementDetailLoading, setParentAnnouncementDetailLoading] = useState(false);
  const [parentAnnouncementDetailError, setParentAnnouncementDetailError] = useState('');
  const [parentAnnouncementDetail, setParentAnnouncementDetail] = useState(null);
  const [parentAnnouncementMediaLoading, setParentAnnouncementMediaLoading] = useState(false);
  const [parentAnnouncementMediaError, setParentAnnouncementMediaError] = useState('');
  const [parentAnnouncementMediaRows, setParentAnnouncementMediaRows] = useState([]);
  const [parentProgressReportsLoading, setParentProgressReportsLoading] = useState(false);
  const [parentProgressReportsError, setParentProgressReportsError] = useState('');
  const [parentProgressReports, setParentProgressReports] = useState([]);
  const [selectedParentProgressReportId, setSelectedParentProgressReportId] = useState(null);
  const [parentProgressReportDetailLoading, setParentProgressReportDetailLoading] = useState(false);
  const [parentProgressReportDetailError, setParentProgressReportDetailError] = useState('');
  const [parentProgressReportDetail, setParentProgressReportDetail] = useState(null);
  const [parentProgressReportCurrentVersion, setParentProgressReportCurrentVersion] = useState(null);
  const [pdfBranchLabel, setPdfBranchLabel] = useState('');
  const [parentInAppNotificationRows, setParentInAppNotificationRows] = useState([]);
  const [parentInAppNotificationsLoading, setParentInAppNotificationsLoading] = useState(false);
  const [parentInAppNotificationsError, setParentInAppNotificationsError] = useState('');
  const [parentInAppMarkingId, setParentInAppMarkingId] = useState(null);
  const [parentInAppActionNotice, setParentInAppActionNotice] = useState('');
  const [parentNotificationPreferences, setParentNotificationPreferences] = useState(
    buildDefaultParentNotificationPreferences()
  );
  const [initialParentNotificationPreferences, setInitialParentNotificationPreferences] = useState(
    buildDefaultParentNotificationPreferences()
  );
  const [parentNotificationPreferencesLoading, setParentNotificationPreferencesLoading] = useState(false);
  const [parentNotificationPreferencesError, setParentNotificationPreferencesError] = useState('');
  const [parentNotificationPreferencesSaving, setParentNotificationPreferencesSaving] = useState(false);
  const [parentNotificationPreferencesSaveMessage, setParentNotificationPreferencesSaveMessage] = useState('');
  const [parentNotificationPreferencesSaveError, setParentNotificationPreferencesSaveError] = useState('');
  const [parentAckGateChecking, setParentAckGateChecking] = useState(false);
  const [parentAckGateRequired, setParentAckGateRequired] = useState(false);
  const [parentAckGateCheckError, setParentAckGateCheckError] = useState('');
  const [parentAckGateSaveError, setParentAckGateSaveError] = useState('');
  const [parentAckGateSaving, setParentAckGateSaving] = useState(false);
  const [parentAckGateChecked, setParentAckGateChecked] = useState(false);

  const isParentViewerRole = normalizeRole(viewer?.role) === ROLES.PARENT;
  const shouldRunParentAckGate = !isDemoMode && !isDemoStudentPreview && isParentViewerRole;
  const parentInAppNotificationsForChild = useMemo(() => {
    if (!student?.id) {
      return parentInAppNotificationRows;
    }
    return parentInAppNotificationRows.filter(
      (row) => !row.student_id || row.student_id === student.id
    );
  }, [parentInAppNotificationRows, student?.id]);
  const parentInAppUnreadForChild = useMemo(
    () => parentInAppNotificationsForChild.filter((row) => !row.read_at).length,
    [parentInAppNotificationsForChild]
  );

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
    if (loading || notFound) return undefined;
    let raw = (location.hash || '').replace(/^#/, '');
    if (PARENT_VIEW_HASH_ALIASES[raw]) {
      raw = PARENT_VIEW_HASH_ALIASES[raw];
    }
    if (!raw) return undefined;
    const el = document.getElementById(raw);
    if (!el) return undefined;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (reduceMotion) return undefined;
    el.classList.remove('parent-view-section-enter');
    void el.offsetWidth;
    let enterTid;
    let removeTid;
    enterTid = window.setTimeout(() => {
      el.classList.add('parent-view-section-enter');
      removeTid = window.setTimeout(() => {
        el.classList.remove('parent-view-section-enter');
      }, 480);
    }, 24);
    return () => {
      if (enterTid) window.clearTimeout(enterTid);
      if (removeTid) window.clearTimeout(removeTid);
      el.classList.remove('parent-view-section-enter');
    };
  }, [loading, notFound, location.hash]);

  useEffect(() => {
    if (!studentId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let currentUser;
        if (isDemoMode) {
          currentUser = await getCurrentUser();
        } else if (outletUser) {
          currentUser = outletUser;
        } else if (supabaseAppUser) {
          currentUser = {
            ...supabaseAppUser,
            role: normalizeRole(supabaseAppUser.role) || supabaseAppUser.role,
          };
        } else {
          currentUser = await getCurrentUser();
        }
        if (cancelled) return;
        setViewer(currentUser);
        let targetStudentId;
        if (currentUser?.role === ROLES.PARENT) {
          targetStudentId = resolveParentViewTargetStudentIdForParent({
            studentIdFromUrl: studentId,
            currentUserStudentId: currentUser?.student_id,
            isDemoMode,
          });
          if (!targetStudentId) {
            setNotFound(true);
            setLoading(false);
            return;
          }
        } else {
          targetStudentId = studentId;
        }
        const s = await getStudentById(currentUser, targetStudentId);
        if (
          !s
          || !canAccessStudentRecord(currentUser, s, [
            { guardian_parent_id: currentUser?.guardian_parent_id, student_id: s.id },
          ])
        ) {
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
        if (cancelled) return;
        setCls(classRecord || null);
        setAttendance(att || []);
        setUpdates((pu || [])
          .filter((item) => ['approved', 'shared'].includes(item.status))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        const fee = await getStudentFeeStatus(currentUser, s.id);
        if (cancelled) return;
        setFeeStatus(fee || null);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, isDemoMode, outletUser?.id, outletUser?.role, supabaseAppUser?.id, supabaseAppUser?.role]);

  useEffect(() => {
    let cancelled = false;
    if (!cls?.branch_id || !viewer) {
      setPdfBranchLabel('');
      return;
    }
    (async () => {
      try {
        const branches = await listBranches(viewer);
        if (cancelled) return;
        const match = branches.find((b) => b.id === cls.branch_id);
        setPdfBranchLabel(typeof match?.name === 'string' ? match.name.trim() : '');
      } catch {
        if (!cancelled) setPdfBranchLabel('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cls?.branch_id, viewer]);

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

  const loadParentAnnouncements = useCallback(async () => {
    if (isDemoStudentPreview) {
      setParentAnnouncementsLoading(false);
      setParentAnnouncementsError('');
      setParentAnnouncementsRows([]);
      setSelectedParentAnnouncementId(null);
      setParentAnnouncementDetail(null);
      setParentAnnouncementDetailError('');
      setParentAnnouncementMediaRows([]);
      setParentAnnouncementMediaError('');
      return;
    }
    if (isDemoMode) {
      setParentAnnouncementsLoading(false);
      setParentAnnouncementsError('');
      setParentAnnouncementsRows(DEMO_PARENT_ANNOUNCEMENTS);
      setSelectedParentAnnouncementId(DEMO_PARENT_ANNOUNCEMENTS[0]?.id || null);
      return;
    }
    if (!hasSupabaseSession || !isSupabaseConfigured()) {
      setParentAnnouncementsLoading(false);
      setParentAnnouncementsError('');
      setParentAnnouncementsRows([]);
      setSelectedParentAnnouncementId(null);
      return;
    }

    setParentAnnouncementsLoading(true);
    setParentAnnouncementsError('');
    try {
      const listResult = await listParentAnnouncements({
        status: 'published',
        includeArchived: false,
      });
      if (listResult.error) {
        throw new Error(listResult.error.message || 'Unable to load parent announcements right now.');
      }
      const rows = Array.isArray(listResult.data) ? listResult.data : [];
      setParentAnnouncementsRows(rows);
      setSelectedParentAnnouncementId((prev) => {
        if (prev && rows.some((row) => row.id === prev)) return prev;
        return rows[0]?.id || null;
      });
    } catch (error) {
      setParentAnnouncementsRows([]);
      setSelectedParentAnnouncementId(null);
      setParentAnnouncementsError(error?.message || 'Unable to load parent announcements right now.');
    } finally {
      setParentAnnouncementsLoading(false);
    }
  }, [isDemoStudentPreview, isDemoMode, hasSupabaseSession]);

  useEffect(() => {
    void loadParentAnnouncements();
  }, [loadParentAnnouncements]);

  const loadParentProgressReports = useCallback(async () => {
    if (isDemoStudentPreview) {
      setParentProgressReportsLoading(false);
      setParentProgressReportsError('');
      setParentProgressReports([]);
      setSelectedParentProgressReportId(null);
      return;
    }
    if (isDemoMode) {
      const demoRows = DEMO_PARENT_RELEASED_REPORTS;
      setParentProgressReportsLoading(false);
      setParentProgressReportsError('');
      setParentProgressReports(demoRows);
      setSelectedParentProgressReportId((prev) => {
        if (prev && demoRows.some((row) => row.id === prev)) return prev;
        return demoRows[0]?.id || null;
      });
      return;
    }
    if (!hasSupabaseSession || !isSupabaseConfigured()) {
      setParentProgressReportsLoading(false);
      setParentProgressReportsError('');
      setParentProgressReports([]);
      setSelectedParentProgressReportId(null);
      return;
    }

    setParentProgressReportsLoading(true);
    setParentProgressReportsError('');
    try {
      const listResult = await listAiParentReports({ status: 'released', includeArchived: false });
      if (listResult.error) {
        throw new Error(listResult.error.message || 'Unable to load released progress reports right now.');
      }
      const rows = Array.isArray(listResult.data) ? listResult.data : [];
      const filteredRows = student?.id ? rows.filter((row) => row.studentId === student.id) : rows;
      setParentProgressReports(filteredRows);
      setSelectedParentProgressReportId((prev) => {
        if (prev && filteredRows.some((row) => row.id === prev)) return prev;
        return filteredRows[0]?.id || null;
      });
    } catch (error) {
      setParentProgressReports([]);
      setSelectedParentProgressReportId(null);
      setParentProgressReportsError(error?.message || 'Unable to load released progress reports right now.');
    } finally {
      setParentProgressReportsLoading(false);
    }
  }, [isDemoStudentPreview, isDemoMode, hasSupabaseSession, student?.id]);

  useEffect(() => {
    void loadParentProgressReports();
  }, [loadParentProgressReports]);

  const loadParentInAppNotifications = useCallback(async () => {
    if (isDemoStudentPreview || !isParentViewerRole) {
      setParentInAppNotificationRows([]);
      setParentInAppNotificationsError('');
      setParentInAppNotificationsLoading(false);
      return;
    }
    if (isDemoMode) {
      setParentInAppNotificationRows([]);
      setParentInAppNotificationsError('');
      setParentInAppNotificationsLoading(false);
      return;
    }
    if (!hasSupabaseSession || !isSupabaseConfigured()) {
      setParentInAppNotificationRows([]);
      setParentInAppNotificationsError('');
      setParentInAppNotificationsLoading(false);
      return;
    }

    setParentInAppNotificationsLoading(true);
    setParentInAppNotificationsError('');
    try {
      const listResult = await listMyInAppNotifications({ limit: 50 });
      if (listResult.error) {
        throw new Error(listResult.error.message || 'Unable to load notifications.');
      }
      setParentInAppNotificationRows(Array.isArray(listResult.data) ? listResult.data : []);
    } catch (error) {
      setParentInAppNotificationRows([]);
      setParentInAppNotificationsError(error?.message || 'Unable to load notifications.');
    } finally {
      setParentInAppNotificationsLoading(false);
    }
  }, [isDemoStudentPreview, isDemoMode, hasSupabaseSession, isParentViewerRole]);

  useEffect(() => {
    void loadParentInAppNotifications();
  }, [loadParentInAppNotifications]);

  const loadParentNotificationPreferences = useCallback(async () => {
    const defaults = buildDefaultParentNotificationPreferences();
    if (isDemoStudentPreview || !isParentViewerRole) {
      setParentNotificationPreferences(defaults);
      setInitialParentNotificationPreferences(defaults);
      setParentNotificationPreferencesError('');
      setParentNotificationPreferencesLoading(false);
      return;
    }
    if (isDemoMode) {
      setParentNotificationPreferences(defaults);
      setInitialParentNotificationPreferences(defaults);
      setParentNotificationPreferencesError('');
      setParentNotificationPreferencesLoading(false);
      return;
    }
    if (!hasSupabaseSession || !isSupabaseConfigured()) {
      setParentNotificationPreferences(defaults);
      setInitialParentNotificationPreferences(defaults);
      setParentNotificationPreferencesError('');
      setParentNotificationPreferencesLoading(false);
      return;
    }

    setParentNotificationPreferencesLoading(true);
    setParentNotificationPreferencesError('');
    try {
      const listResult = await listMyNotificationPreferences({ includeDisabled: true, limit: 200 });
      if (listResult.error) {
        throw new Error(listResult.error.message || 'Unable to load communication settings.');
      }
      const rows = Array.isArray(listResult.data) ? listResult.data : [];
      const nextPreferences = { ...defaults };
      const inAppRows = rows.filter((row) => row?.channel === 'in_app');
      for (const category of Object.keys(nextPreferences)) {
        const categoryRows = inAppRows.filter((row) => row?.category === category);
        const parentLevel = categoryRows.find((row) => row?.student_id == null);
        const pickedRow = parentLevel || categoryRows[0];
        nextPreferences[category] = normalizeParentPreferenceValue(pickedRow, defaults[category]);
      }
      setParentNotificationPreferences(nextPreferences);
      setInitialParentNotificationPreferences(nextPreferences);
    } catch (error) {
      setParentNotificationPreferences(defaults);
      setInitialParentNotificationPreferences(defaults);
      setParentNotificationPreferencesError(error?.message || 'Unable to load communication settings.');
    } finally {
      setParentNotificationPreferencesLoading(false);
    }
  }, [hasSupabaseSession, isDemoMode, isDemoStudentPreview, isParentViewerRole]);

  useEffect(() => {
    void loadParentNotificationPreferences();
  }, [loadParentNotificationPreferences]);

  useEffect(() => {
    let cancelled = false;
    const runParentAcknowledgementCheck = async () => {
      if (!shouldRunParentAckGate) {
        setParentAckGateChecking(false);
        setParentAckGateRequired(false);
        setParentAckGateCheckError('');
        setParentAckGateSaveError('');
        setParentAckGateChecked(false);
        return;
      }
      if (!hasSupabaseSession || !isSupabaseConfigured()) {
        setParentAckGateChecking(false);
        setParentAckGateRequired(true);
        setParentAckGateCheckError('We could not confirm your portal acknowledgement. Please refresh or try again.');
        setParentAckGateSaveError('');
        setParentAckGateChecked(false);
        return;
      }
      setParentAckGateChecking(true);
      setParentAckGateCheckError('');
      setParentAckGateSaveError('');
      try {
        const result = await hasMyPolicyAcknowledgement({
          policyKey: PARENT_FIRST_LOGIN_POLICY_KEY,
          policyVersion: PARENT_FIRST_LOGIN_POLICY_VERSION,
        });
        if (cancelled) return;
        if (result.error) {
          setParentAckGateRequired(true);
          setParentAckGateCheckError('We could not confirm your portal acknowledgement. Please refresh or try again.');
          return;
        }
        setParentAckGateRequired(!Boolean(result.data?.hasAcknowledged));
      } catch (_error) {
        if (cancelled) return;
        setParentAckGateRequired(true);
        setParentAckGateCheckError('We could not confirm your portal acknowledgement. Please refresh or try again.');
      } finally {
        if (!cancelled) setParentAckGateChecking(false);
      }
    };
    void runParentAcknowledgementCheck();
    return () => {
      cancelled = true;
    };
  }, [shouldRunParentAckGate, hasSupabaseSession]);

  const handleContinueParentAcknowledgementGate = useCallback(async () => {
    if (!shouldRunParentAckGate || !parentAckGateChecked || !hasSupabaseSession || !isSupabaseConfigured()) return;
    setParentAckGateSaving(true);
    setParentAckGateSaveError('');
    try {
      const result = await createMyPolicyAcknowledgement({
        policyKey: PARENT_FIRST_LOGIN_POLICY_KEY,
        policyVersion: PARENT_FIRST_LOGIN_POLICY_VERSION,
        acknowledgementSource: 'parent_portal_first_login',
        metadata: { ui_version: 'v1' },
      });
      if (result.error) {
        throw new Error(result.error.message || 'Unable to save acknowledgement');
      }
      setParentAckGateRequired(false);
      setParentAckGateChecked(false);
    } catch (_error) {
      setParentAckGateSaveError('We could not save your acknowledgement. Please try again.');
    } finally {
      setParentAckGateSaving(false);
    }
  }, [shouldRunParentAckGate, parentAckGateChecked, hasSupabaseSession]);

  const handleMarkParentNotificationRead = useCallback(async (notificationId) => {
    if (!isUuidLike(notificationId)) {
      return;
    }
    setParentInAppMarkingId(notificationId);
    try {
      const result = await markNotificationRead({ notificationId });
      if (result.error) {
        toast.error(result.error.message || 'Could not mark notification as read.');
        return;
      }
      const readAt = result.data?.read_at || new Date().toISOString();
      setParentInAppNotificationRows((prev) =>
        prev.map((row) =>
          row.id === notificationId ? { ...row, read_at: readAt, status: 'read' } : row
        )
      );
    } catch (error) {
      toast.error(error?.message || 'Could not mark notification as read.');
    } finally {
      setParentInAppMarkingId(null);
    }
  }, []);

  const scrollToParentSection = useCallback((targetId) => {
    const safeTarget = typeof targetId === 'string' ? targetId.trim() : '';
    if (!safeTarget) return false;
    const el = document.getElementById(safeTarget);
    if (!el) return false;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (typeof window !== 'undefined') {
      const nextUrl = `${window.location.pathname}${window.location.search}#${safeTarget}`;
      window.history.replaceState(null, '', nextUrl);
    }
    return true;
  }, []);

  const handleOpenParentNotificationTarget = useCallback(async (notificationRow) => {
    if (!notificationRow?.id) return;
    setParentInAppActionNotice('');

    if (!notificationRow.read_at) {
      await handleMarkParentNotificationRead(notificationRow.id);
    }

    const action = resolveParentNotificationAction(notificationRow);
    const directOk = scrollToParentSection(action.targetId);
    if (directOk) return;

    const fallbackOk = scrollToParentSection('parent-in-app-notifications');
    if (!fallbackOk) return;
    setParentInAppActionNotice('That section is not available in this view yet. You can still review the notification details here.');
  }, [handleMarkParentNotificationRead, scrollToParentSection]);

  const handleToggleParentNotificationCategory = useCallback((category, enabled) => {
    if (!Object.prototype.hasOwnProperty.call(parentNotificationPreferences, category)) return;
    setParentNotificationPreferences((prev) => {
      const existing = prev[category] || { enabled: false, consentStatus: 'not_set' };
      return {
        ...prev,
        [category]: {
          ...existing,
          enabled,
          consentStatus: deriveConsentStatusForSave({
            category,
            enabled,
            previousConsentStatus: existing.consentStatus,
          }),
        },
      };
    });
    setParentNotificationPreferencesSaveMessage('');
    setParentNotificationPreferencesSaveError('');
  }, [parentNotificationPreferences]);

  const handleConfirmOperationalServicePreference = useCallback(() => {
    setParentNotificationPreferences((prev) => ({
      ...prev,
      operational_service: {
        enabled: true,
        consentStatus: 'required_service',
      },
    }));
    setParentNotificationPreferencesSaveMessage('');
    setParentNotificationPreferencesSaveError('');
  }, []);

  const handleSaveParentNotificationSettings = useCallback(async () => {
    if (!isParentViewerRole || isDemoStudentPreview) return;
    if (isDemoMode) {
      setParentNotificationPreferencesSaveError('');
      setParentNotificationPreferencesSaveMessage('Demo mode: visual changes were kept locally for this preview.');
      return;
    }
    if (!hasSupabaseSession || !isSupabaseConfigured()) return;

    setParentNotificationPreferencesSaving(true);
    setParentNotificationPreferencesSaveError('');
    setParentNotificationPreferencesSaveMessage('');
    try {
      const categories = ['operational_service', ...PARENT_NOTIFICATION_PREFERENCE_ROWS.map((row) => row.category)];
      const pendingUpdates = categories.filter((category) => {
        const current = parentNotificationPreferences[category];
        const initial = initialParentNotificationPreferences[category];
        return current?.enabled !== initial?.enabled || current?.consentStatus !== initial?.consentStatus;
      });

      if (pendingUpdates.length === 0) {
        setParentNotificationPreferencesSaveMessage('No changes to save.');
        return;
      }

      for (const category of pendingUpdates) {
        const current = parentNotificationPreferences[category];
        const previousConsentStatus = initialParentNotificationPreferences[category]?.consentStatus || 'not_set';
        const consentStatus = deriveConsentStatusForSave({
          category,
          enabled: Boolean(current?.enabled),
          previousConsentStatus,
        });
        const result = await upsertMyNotificationPreference({
          studentId: null, // v1 strategy: parent-level defaults; child overrides can be added later.
          channel: 'in_app',
          category,
          enabled: Boolean(current?.enabled),
          consentStatus,
          consentSource: 'parent_portal_settings',
          policyVersion: 'v1',
        });
        if (result.error) {
          throw new Error(result.error.message || 'Could not save communication settings.');
        }
      }

      setInitialParentNotificationPreferences(parentNotificationPreferences);
      setParentNotificationPreferencesSaveMessage('Communication settings saved.');
    } catch (error) {
      setParentNotificationPreferencesSaveError(
        error?.message || 'Could not save communication settings. Please try again.'
      );
    } finally {
      setParentNotificationPreferencesSaving(false);
    }
  }, [
    hasSupabaseSession,
    initialParentNotificationPreferences,
    isDemoMode,
    isDemoStudentPreview,
    isParentViewerRole,
    parentNotificationPreferences,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadDetailAndMedia = async () => {
      if (isDemoStudentPreview) {
        setParentAnnouncementDetail(null);
        setParentAnnouncementDetailError('');
        setParentAnnouncementMediaRows([]);
        setParentAnnouncementMediaError('');
        setParentAnnouncementDetailLoading(false);
        setParentAnnouncementMediaLoading(false);
        return;
      }

      const selectedId = selectedParentAnnouncementId;
      if (!selectedId) {
        setParentAnnouncementDetail(null);
        setParentAnnouncementDetailError('');
        setParentAnnouncementMediaRows([]);
        setParentAnnouncementMediaError('');
        setParentAnnouncementDetailLoading(false);
        setParentAnnouncementMediaLoading(false);
        return;
      }

      if (isDemoMode) {
        const row = DEMO_PARENT_ANNOUNCEMENTS.find((item) => item.id === selectedId) || null;
        setParentAnnouncementDetail(row);
        setParentAnnouncementDetailError('');
        setParentAnnouncementMediaRows((row?.media || []).map((item) => ({
          id: item.id,
          fileName: item.fileName,
          mimeType: item.mimeType || null,
          mediaRole: 'attachment',
          demoPreview: true,
        })));
        setParentAnnouncementMediaError('');
        setParentAnnouncementDetailLoading(false);
        setParentAnnouncementMediaLoading(false);
        return;
      }

      if (!hasSupabaseSession || !isSupabaseConfigured()) {
        setParentAnnouncementDetail(null);
        setParentAnnouncementDetailError('');
        setParentAnnouncementMediaRows([]);
        setParentAnnouncementMediaError('');
        setParentAnnouncementDetailLoading(false);
        setParentAnnouncementMediaLoading(false);
        return;
      }

      setParentAnnouncementDetailLoading(true);
      setParentAnnouncementDetailError('');
      setParentAnnouncementMediaLoading(true);
      setParentAnnouncementMediaError('');
      setParentAnnouncementMediaRows([]);

      try {
        const detailResult = await getParentAnnouncementDetail({ parentAnnouncementId: selectedId });
        if (detailResult.error) {
          throw new Error(detailResult.error.message || 'Unable to load parent announcement detail right now.');
        }
        if (cancelled) return;
        setParentAnnouncementDetail(detailResult.data || null);

        const mediaResult = await listParentAnnouncementMedia({
          parentAnnouncementId: selectedId,
        });
        if (cancelled) return;
        if (mediaResult.error) {
          setParentAnnouncementMediaRows([]);
          setParentAnnouncementMediaError(mediaResult.error.message || 'Unable to load released media right now.');
        } else {
          const rows = Array.isArray(mediaResult.data) ? mediaResult.data : [];
          setParentAnnouncementMediaRows(rows.map((item) => ({
            id: item.id,
            fileName: item.file_name || 'Released media',
            mimeType: item.mime_type || null,
            mediaRole: item.media_role || null,
            demoPreview: false,
          })));
          setParentAnnouncementMediaError('');
        }

        void markParentAnnouncementRead({ parentAnnouncementId: selectedId });
      } catch (error) {
        if (!cancelled) {
          setParentAnnouncementDetail(null);
          setParentAnnouncementDetailError(error?.message || 'Unable to load parent announcement detail right now.');
          setParentAnnouncementMediaRows([]);
          setParentAnnouncementMediaError('');
        }
      } finally {
        if (!cancelled) {
          setParentAnnouncementDetailLoading(false);
          setParentAnnouncementMediaLoading(false);
        }
      }
    };

    void loadDetailAndMedia();
    return () => {
      cancelled = true;
    };
  }, [selectedParentAnnouncementId, isDemoMode, hasSupabaseSession, isDemoStudentPreview]);

  useEffect(() => {
    let cancelled = false;

    const loadProgressReportDetail = async () => {
      if (isDemoStudentPreview) {
        setParentProgressReportDetailLoading(false);
        setParentProgressReportDetailError('');
        setParentProgressReportDetail(null);
        setParentProgressReportCurrentVersion(null);
        return;
      }

      const selectedId = selectedParentProgressReportId;
      if (!selectedId) {
        setParentProgressReportDetailLoading(false);
        setParentProgressReportDetailError('');
        setParentProgressReportDetail(null);
        setParentProgressReportCurrentVersion(null);
        return;
      }

      if (isDemoMode) {
        const detailRow = DEMO_PARENT_RELEASED_REPORTS.find((row) => row.id === selectedId) || null;
        const versionRow = DEMO_PARENT_RELEASED_REPORT_CURRENT_VERSION_BY_ID[selectedId] || null;
        setParentProgressReportDetail(detailRow);
        setParentProgressReportCurrentVersion(versionRow);
        setParentProgressReportDetailLoading(false);
        setParentProgressReportDetailError('');
        return;
      }

      if (!hasSupabaseSession || !isSupabaseConfigured()) {
        setParentProgressReportDetailLoading(false);
        setParentProgressReportDetailError('');
        setParentProgressReportDetail(null);
        setParentProgressReportCurrentVersion(null);
        return;
      }

      setParentProgressReportDetailLoading(true);
      setParentProgressReportDetailError('');
      try {
        const [detailResult, currentVersionResult] = await Promise.all([
          getAiParentReportDetail({ reportId: selectedId }),
          getAiParentReportCurrentVersion({ reportId: selectedId }),
        ]);
        if (detailResult.error) {
          throw new Error(detailResult.error.message || 'Unable to load released report detail right now.');
        }
        if (cancelled) return;
        setParentProgressReportDetail(detailResult.data || null);
        setParentProgressReportCurrentVersion(currentVersionResult.error ? null : (currentVersionResult.data || null));
      } catch (error) {
        if (cancelled) return;
        setParentProgressReportDetail(null);
        setParentProgressReportCurrentVersion(null);
        setParentProgressReportDetailError(error?.message || 'Unable to load released report detail right now.');
      } finally {
        if (!cancelled) setParentProgressReportDetailLoading(false);
      }
    };

    void loadProgressReportDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedParentProgressReportId, isDemoMode, hasSupabaseSession, isDemoStudentPreview]);

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
      const latestSubmissionRows = Array.from(latestSubmissionByTaskId.values());
      const markedWorkEntries = await Promise.all(
        latestSubmissionRows
          .filter((row) => isUuidLike(row?.id))
          .map(async (row) => {
            const fileResult = await listHomeworkFiles({
              homeworkSubmissionId: row.id,
              fileRole: 'teacher_marked_homework',
              parentVisibleOnly: true,
            });
            if (fileResult.error) return [row.id, []];
            const files = Array.isArray(fileResult.data) ? fileResult.data : [];
            const parentSafeFiles = files.map((fileRow) => ({
              id: fileRow.id,
              homeworkFileId: fileRow.id,
              fileName: fileRow.file_name || 'Marked work file',
              fileTypeLabel: getMarkedWorkTypeLabel(fileRow.content_type, fileRow.file_name),
              releasedAtLabel: formatMarkedWorkMetaDate(fileRow.released_at || fileRow.created_at),
              viewDisabled: !isUuidLike(fileRow.id),
            }));
            return [row.id, parentSafeFiles];
          })
      );

      setParentHomeworkTasks(tasks);
      setParentHomeworkSubmissions(latestSubmissionRows);
      setParentHomeworkFeedbackBySubmissionId(
        Object.fromEntries(feedbackEntries.filter((entry) => entry[1]))
      );
      setParentHomeworkMarkedWorkBySubmissionId(Object.fromEntries(markedWorkEntries));
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
    if (!isSupabaseConfigured() || !hasSupabaseSession) {
      toast.message('Marked work preview is available only for authenticated parent sessions.');
      return;
    }
    const homeworkFileId = item?.homeworkFileId;
    if (!isUuidLike(homeworkFileId)) {
      toast.error('Marked work is not available to open right now.');
      return;
    }
    (async () => {
      try {
        const signedUrlResult = await getHomeworkFileSignedUrl({ homeworkFileId, expiresIn: 300 });
        if (signedUrlResult.error || !signedUrlResult.data?.signed_url) {
          toast.error('Marked work is not available to open right now.');
          return;
        }
        window.open(signedUrlResult.data.signed_url, '_blank', 'noopener,noreferrer');
      } catch {
        toast.error('Marked work is not available to open right now.');
      }
    })();
  }, [isDemoMode, hasSupabaseSession]);

  const handleOpenParentAnnouncementMedia = useCallback((mediaItem) => {
    if (isDemoMode || mediaItem?.demoPreview) {
      toast.message(`Demo preview only: ${mediaItem?.fileName || 'Released media'} does not open a real file in demo mode.`);
      return;
    }
    if (!isSupabaseConfigured() || !hasSupabaseSession) {
      toast.message('Media preview is available only for authenticated parent sessions.');
      return;
    }
    if (!isUuidLike(mediaItem?.id)) {
      toast.error('Released media is not available to open right now.');
      return;
    }
    (async () => {
      try {
        const signedUrlResult = await getParentAnnouncementMediaSignedUrl({ mediaId: mediaItem.id, expiresIn: 300 });
        if (signedUrlResult.error || !signedUrlResult.data?.signed_url) {
          toast.error('Released media is not available to open right now.');
          return;
        }
        window.open(signedUrlResult.data.signed_url, '_blank', 'noopener,noreferrer');
      } catch {
        toast.error('Released media is not available to open right now.');
      }
    })();
  }, [isDemoMode, hasSupabaseSession]);

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
          <p className="text-muted-foreground text-sm">
            {isDemoMode
              ? 'This demo parent view could not be opened for the selected student.'
              : 'This parent view could not be opened. Check that the parent account is linked to this student.'}
          </p>
        </div>
      </div>
    );
  }

  if (shouldRunParentAckGate && (parentAckGateRequired || parentAckGateChecking)) {
    return (
      <ParentPortalAcknowledgementGate
        checking={parentAckGateChecking}
        checkError={parentAckGateCheckError}
        saveError={parentAckGateSaveError}
        saving={parentAckGateSaving}
        checked={parentAckGateChecked}
        onCheckedChange={setParentAckGateChecked}
        onContinue={handleContinueParentAcknowledgementGate}
        sessionReady={hasSupabaseSession && isSupabaseConfigured()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base">EduCentre</h1>
              <p className="text-xs text-muted-foreground">{isDemoStudentPreview ? 'Student Learning Portal' : 'Parent Dashboard'}</p>
            </div>
          </div>
          {!isDemoStudentPreview && isParentViewerRole && !isDemoMode && hasSupabaseSession && isSupabaseConfigured() && parentInAppUnreadForChild > 0 ? (
            <button
              type="button"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => {
                document.getElementById('parent-in-app-notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              aria-label={`${parentInAppUnreadForChild} unread notifications. Go to notifications.`}
            >
              <Bell className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>{parentInAppUnreadForChild}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Student identity */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div id="parent-portal-overview">
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
        </div>

        {!isDemoStudentPreview && isParentViewerRole ? (
          <ParentInAppNotificationsSection
            demoMode={isDemoMode}
            hasSupabaseSession={hasSupabaseSession}
            supabaseReady={isSupabaseConfigured()}
            loading={parentInAppNotificationsLoading}
            error={parentInAppNotificationsError}
            notifications={parentInAppNotificationsForChild}
            unreadCount={parentInAppUnreadForChild}
            markingId={parentInAppMarkingId}
            onMarkRead={handleMarkParentNotificationRead}
            onOpenTarget={handleOpenParentNotificationTarget}
            actionNotice={parentInAppActionNotice}
          />
        ) : null}
        {!isDemoStudentPreview && isParentViewerRole ? (
          <ParentNotificationSettingsSection
            demoMode={isDemoMode}
            hasSupabaseSession={hasSupabaseSession}
            supabaseReady={isSupabaseConfigured()}
            loading={parentNotificationPreferencesLoading}
            error={parentNotificationPreferencesError}
            saving={parentNotificationPreferencesSaving}
            saveMessage={parentNotificationPreferencesSaveMessage}
            saveError={parentNotificationPreferencesSaveError}
            preferences={parentNotificationPreferences}
            onToggleCategory={handleToggleParentNotificationCategory}
            onConfirmOperationalService={handleConfirmOperationalServicePreference}
            onSave={handleSaveParentNotificationSettings}
          />
        ) : null}
        {!isDemoStudentPreview && isParentViewerRole ? (
          <ActiveSessionsCard className="mb-6" />
        ) : null}

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
          <div className="mb-6">
            <ParentAnnouncementsEventsSection
              isDemoMode={isDemoMode}
              loading={parentAnnouncementsLoading}
              error={parentAnnouncementsError}
              announcements={parentAnnouncementsRows}
              selectedAnnouncementId={selectedParentAnnouncementId}
              onSelectAnnouncement={setSelectedParentAnnouncementId}
              detailLoading={parentAnnouncementDetailLoading}
              detail={parentAnnouncementDetail}
              detailError={parentAnnouncementDetailError}
              mediaRows={parentAnnouncementMediaRows}
              mediaLoading={parentAnnouncementMediaLoading}
              mediaError={parentAnnouncementMediaError}
              onOpenMedia={handleOpenParentAnnouncementMedia}
            />
          </div>
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
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('parent-announcements-events')?.scrollIntoView({ behavior: 'smooth' })}>
                  <FileText className="h-4 w-4" />
                  View latest announcements
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('parent-progress-reports')?.scrollIntoView({ behavior: 'smooth' })}>
                  <FileText className="h-4 w-4" />
                  View Progress Reports
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('homework-history')?.scrollIntoView({ behavior: 'smooth' })}>
                  <BookOpen className="h-4 w-4" />
                  View Homework History
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('latest-report')?.scrollIntoView({ behavior: 'smooth' })}>
                  <FileText className="h-4 w-4" />
                  View Approved Teacher Feedback
                </Button>
                {isParentViewerRole ? (
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => document.getElementById('parent-notification-settings')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Bell className="h-4 w-4" />
                    Communication Settings
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="mb-6" />

        <Card className="mb-4 border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {isDemoStudentPreview
                ? 'Privacy note: the student portal shows only this linked student’s information.'
                : 'Privacy note: this parent dashboard shows only data for your linked child and does not include internal staff pages.'}
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
              <ParentProgressReportsSection
                isDemoMode={isDemoMode}
                showInternalPreview={showInternalDebugPanels}
                loading={parentProgressReportsLoading}
                error={parentProgressReportsError}
                reports={parentProgressReports}
                selectedReportId={selectedParentProgressReportId}
                onSelectReport={setSelectedParentProgressReportId}
                detail={parentProgressReportDetail}
                currentVersion={parentProgressReportCurrentVersion}
                detailLoading={parentProgressReportDetailLoading}
                detailError={parentProgressReportDetailError}
                studentName={student?.name}
                className={cls?.name}
                classSubject={cls?.subject}
                branchDisplayName={pdfBranchLabel}
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
              <div id="parent-communication-updates" className="space-y-4">
                <LatestParentComment updates={updates} />
                <LatestWeeklyProgressReport updates={updates} />
              </div>
              {feeStatus && (
                <Card id="parent-payment-proof">
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
          {isDemoMode
            ? `This is a private demo view for ${isDemoStudentPreview ? student.name : (student.parent_name || 'the parent/guardian')} linked to ${student.name}. Internal teacher, branch, HQ, KPI, observation, lead, trial, migration, and roadmap pages are restricted.`
            : `This is a private parent/student portal for ${student.name}. Internal teacher, branch, HQ, KPI, observation, lead, trial, migration, and roadmap pages remain restricted.`}
        </p>
      </div>
    </div>
  );
}
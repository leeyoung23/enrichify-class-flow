import React, { useMemo, useState, useEffect } from 'react';
import { getCurrentUser, getSelectedDemoRole } from '@/services/authService';
import { getStudentById, getClassById, listAttendanceRecords, listParentUpdatesByStudent, getStudentFeeStatus, listHomeworkAttachmentsByStudent, uploadHomeworkAttachment } from '@/services/dataService';
import { canAccessStudentRecord, ROLES } from '@/services/permissionService';
import { uploadFeeReceipt, getFeeReceiptSignedUrl } from '@/services/supabaseUploadService';
import { useSupabaseAuthState } from '@/hooks/useSupabaseAuthState';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  GraduationCap, CheckCircle2, XCircle, Clock, Umbrella,
  BookOpen, BookX, Minus, Upload, ExternalLink, FileText, Loader2, Sparkles
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

function HomeworkUpload({ items }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    await uploadHomeworkAttachment(file, items?.[0]?.student_id);
    setUploaded(file.name);
    setUploading(false);
  };

  return (
    <Card id="homework-upload">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Upload Homework</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Submit your child's completed homework here. Your teacher will be notified.
        </p>
        {uploaded ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">{uploaded}</span> uploaded successfully.
          </div>
        ) : (
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            <Button asChild variant="outline" className="gap-2" disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Choose File to Upload'}
              </span>
            </Button>
          </label>
        )}
        {uploaded && (
          <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setUploaded(null)}>
            Upload another file
          </Button>
        )}
        <div className="mt-5 border-t pt-4">
          <p className="text-sm font-medium mb-3">Upload History</p>
          <div className="space-y-2">
            {items.length > 0 ? items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{item.file_name}</span>
                  <span className="text-xs text-muted-foreground">{item.upload_date}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Status: {item.status_label}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No demo uploads yet for this linked child.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
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
          <p className="text-xs text-muted-foreground pt-1">
            Demo only — real Class Memories will use a future class_media-style metadata table and Supabase Storage after the
            write phase. No uploads or real media in this preview.
          </p>
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
  const [homeworkAttachments, setHomeworkAttachments] = useState([]);

  const latestApprovedUpdate = useMemo(() => updates[0], [updates]);

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
        const [classRecord, att, pu, attachments] = await Promise.all([
          getClassById(currentUser, s.class_id),
          listAttendanceRecords(currentUser, { student_id: s.id }),
          listParentUpdatesByStudent(currentUser, s.id),
          listHomeworkAttachmentsByStudent(currentUser, s.id),
        ]);
        setCls(classRecord || null);
        setAttendance(att || []);
        setUpdates((pu || [])
          .filter((item) => ['approved', 'shared'].includes(item.status))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setHomeworkAttachments(attachments || []);
        const fee = await getStudentFeeStatus(currentUser, s.id);
        setFeeStatus(fee || null);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  const refreshFeeStatus = async () => {
    if (!viewer || !student?.id) return;
    const fee = await getStudentFeeStatus(viewer, student.id);
    setFeeStatus(fee || null);
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
      toast.success('Receipt uploaded successfully. Status submitted for staff review.');
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

        {!isDemoStudentPreview && <ClassMemoriesDemoSection className={cls?.name} />}

        {!isDemoStudentPreview && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Learning Portal & Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('student-learning-portal')?.scrollIntoView({ behavior: 'smooth' })}>
                  <ExternalLink className="h-4 w-4" />
                  Open Student Learning Portal
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => document.getElementById('homework-upload')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Upload className="h-4 w-4" />
                  Upload Homework / Learning Materials
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
              <LatestParentComment updates={updates} />
              <LatestWeeklyProgressReport updates={updates} />
              {feeStatus && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fee Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Current Period</p><p>{feeStatus.fee_period}</p></div>
                      <div><p className="text-xs text-muted-foreground">Status</p><p className="capitalize">{feeStatus.payment_status}</p></div>
                      <div><p className="text-xs text-muted-foreground">Due Date</p><p>{feeStatus.due_date}</p></div>
                      <div><p className="text-xs text-muted-foreground">Receipt Uploaded</p><p>{feeStatus.receipt_uploaded ? 'Yes' : 'No'}</p></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground">Payment Receipts</p>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf,.txt"
                        onChange={handleReceiptFileSelect}
                        disabled={receiptUploadLoading}
                        className="block w-full text-sm"
                      />
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={handleReceiptUpload}
                        disabled={receiptUploadLoading}
                      >
                        {receiptUploadLoading ? 'Uploading...' : 'Upload Payment Receipt'}
                      </Button>
                      {feeStatus.receipt_uploaded && (
                        <Button
                          variant="ghost"
                          className="w-full sm:w-auto"
                          onClick={handleOpenUploadedReceipt}
                          disabled={receiptLinkLoading}
                        >
                          View Uploaded Receipt
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              <AttendanceSummary records={attendance} />
              <HomeworkSummary records={attendance} />
              <HomeworkUpload items={homeworkAttachments} />
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
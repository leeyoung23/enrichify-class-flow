import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listClasses, listStudentsByClass, listParentUpdates, createParentUpdate, generateParentMessage, listAttendanceRecords, listHomeworkAttachments } from '@/services/dataService';
import { ROLES, isTeacherRole } from '@/services/permissionService';
import { Sparkles, Save, Loader2, CheckCircle2, Share2, MessageSquarePlus, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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

export default function ParentUpdates() {
  const { user } = useOutletContext();
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
  const queryClient = useQueryClient();
  const isTeacher = isTeacherRole(user);

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

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);

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

  const handleGenerate = async () => {
    if (!notes.trim() || !selectedStudentId) return;
    setGenerating(true);
    const result = await generateParentMessage(selectedStudent, notes);
    setAiDraft(result);
    setEditedMessage(result);
    setApprovedReport('');
    setSharedReport('');
    setStep('review');
    setGenerating(false);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => createParentUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-updates'] });
      toast.success('Parent update saved successfully');
      resetForm();
    },
  });

  const handleSave = (statusOverride = 'edited') => {
    saveMutation.mutate({
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

  return (
    <div>
      <PageHeader
        title="Parent Updates"
        description={isTeacher ? 'Manage quick parent comments and weekly progress reports for assigned demo students. Nothing is sent automatically.' : 'Review parent comments and weekly progress reports in demo mode only.'}
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="No classes available"
          description="Add or assign a class before creating parent updates."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {isTeacher && (
              <Card className="p-6">
                <h3 className="font-semibold mb-2">Parent Updates</h3>
                <p className="text-sm text-muted-foreground mb-4">Create teacher-approved quick comments after class, or prepare fixed weekly progress reports for parent review.</p>

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
                      <Button variant="outline" onClick={() => handleSave('shared')} disabled={saveMutation.isPending || !sharedReport.trim()}>
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
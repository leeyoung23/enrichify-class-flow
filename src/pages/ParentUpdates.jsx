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
  };

  return (
    <div>
      <PageHeader
        title="Parent Updates"
        description={isTeacher ? 'Create, edit, and approve parent updates for your assigned students only. Nothing is sent automatically.' : 'Track teacher note, AI draft, teacher edit, approval, and sharing with no automatic sending.'}
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
                <h3 className="font-semibold mb-2">Parent Updates Workflow</h3>
                <p className="text-sm text-muted-foreground mb-4">Nothing is sent automatically. Teachers create, edit, save, approve, and later mark reports as shared.</p>

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

                {step === 'notes' && (
                  <>
                    <Card className="p-4 mb-4 border-dashed">
                      <h4 className="font-medium mb-2">Report Source Data (Demo)</h4>
                      <p className="text-xs text-muted-foreground mb-3">AI draft uses teacher note + attendance + homework + previous feedback + student/class profile.</p>
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
                        <span className="text-sm font-medium">1. Teacher note created</span>
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
                        <><Sparkles className="h-4 w-4" /> Generate AI Draft</>
                      )}
                    </Button>
                  </>
                )}

                {step === 'review' && (
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
                          <span className="text-sm font-medium">4. Approved report</span>
                          <Badge variant="outline" className="text-xs">Approved report</Badge>
                        </div>
                        <Textarea
                          value={approvedReport}
                          onChange={(e) => setApprovedReport(e.target.value)}
                          placeholder="Set the approved report here before parents can see it."
                          className="min-h-[120px]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Share2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">5. Shared report</span>
                          <Badge variant="outline" className="text-xs">Shared report</Badge>
                        </div>
                        <Textarea
                          value={sharedReport}
                          onChange={(e) => setSharedReport(e.target.value)}
                          placeholder="Optional record of the exact report shared later."
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
                        Approve Report
                      </Button>
                      <Button variant="outline" onClick={() => handleSave('shared')} disabled={saveMutation.isPending || !sharedReport.trim()}>
                        Mark as Shared
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
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold">Parent Updates List</h3>
                  <p className="text-sm text-muted-foreground">Teachers manage drafts; supervisors and HQ review visibility by status.</p>
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

              {filteredUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports found for this filter.</p>
              ) : (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {filteredUpdates.map((update) => (
                    <div key={update.id} className="rounded-lg border border-border p-4 bg-card">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="space-y-1 min-w-0">
                          <p className="font-medium truncate">{update.student_name || 'Student'}</p>
                          <p className="text-xs text-muted-foreground">{update.class_id || 'Class'} • {update.teacher_name || update.teacher_email || 'Teacher'}</p>
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
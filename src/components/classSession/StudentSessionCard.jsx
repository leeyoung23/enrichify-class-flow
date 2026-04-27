import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Check, X, Clock, Umbrella,
  BookOpen, BookX, Minus,
  Sparkles, Loader2, Copy, Save, ChevronDown, ChevronUp,
  CheckCircle2, Circle
} from 'lucide-react';
import { toast } from 'sonner';

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', icon: Check, activeClass: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'absent', label: 'Absent', icon: X, activeClass: 'bg-red-600 hover:bg-red-700 text-white' },
  { value: 'late', label: 'Late', icon: Clock, activeClass: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { value: 'leave', label: 'Leave', icon: Umbrella, activeClass: 'bg-blue-500 hover:bg-blue-600 text-white' },
];

const HOMEWORK_STATUSES = [
  { value: 'completed', label: 'Done', icon: BookOpen, activeClass: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'incomplete', label: 'Incomplete', icon: BookX, activeClass: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { value: 'not_submitted', label: 'Not Submitted', icon: X, activeClass: 'bg-red-600 hover:bg-red-700 text-white' },
  { value: 'not_assigned', label: 'N/A', icon: Minus, activeClass: 'bg-slate-400 hover:bg-slate-500 text-white' },
];

function StatusDot({ done, label }) {
  return (
    <span className={`flex items-center gap-1 text-xs ${done ? 'text-green-600' : 'text-muted-foreground'}`}>
      {done
        ? <CheckCircle2 className="h-3.5 w-3.5" />
        : <Circle className="h-3.5 w-3.5" />
      }
      {label}
    </span>
  );
}

function buildDemoParentDraft({ student, attendanceRecord, notes }) {
  const attendanceLabel = attendanceRecord?.status ? `Attendance: ${attendanceRecord.status}.` : 'Attendance is being tracked in this session.';
  const homeworkLabel = attendanceRecord?.homework_status ? `Homework: ${attendanceRecord.homework_status}.` : 'Homework status will be confirmed after class.';
  const sessionLabel = attendanceRecord?.date || attendanceRecord?.session_date
    ? `Session context: ${attendanceRecord.date || attendanceRecord.session_date}.`
    : 'Session context: current class session.';

  return `Hello ${student?.parent_name || 'Parent'},

${student?.name || 'Your child'} completed today\'s learning session.
${attendanceLabel} ${homeworkLabel}

Teacher note summary: ${notes}

${sessionLabel}
This is a demo AI draft for teacher review only.`;
}

export default function StudentSessionCard({
  student,
  attendanceRecord,
  parentUpdate,
  onAttendanceMark,
  onNotesSave,
  onSaveParentUpdate,
}) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(attendanceRecord?.notes || '');
  const [generating, setGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState(parentUpdate?.ai_draft || '');
  const [editedMessage, setEditedMessage] = useState(parentUpdate?.final_message || parentUpdate?.ai_draft || '');
  const [showMessageEditor, setShowMessageEditor] = useState(!!(parentUpdate?.ai_draft || parentUpdate?.final_message || parentUpdate?.approved_report));

  const isApproved = ['approved', 'shared'].includes(parentUpdate?.status);
  const isDraft = ['draft', 'edited', 'ai_draft_generated', 'note_created'].includes(parentUpdate?.status);

  const hasAttendance = !!attendanceRecord?.status;
  const hasHomework = !!attendanceRecord?.homework_status;
  const hasNote = !!(attendanceRecord?.notes?.trim() || localNotes.trim());
  const hasDraft = !!(parentUpdate?.ai_draft || aiDraft);
  const studentCompletedCount = [hasAttendance, hasHomework, hasNote, hasDraft, isApproved].filter(Boolean).length;
  const studentCompletionPct = Math.round((studentCompletedCount / 5) * 100);

  const handleGenerateDraft = async () => {
    const notes = localNotes.trim();
    if (!notes) {
      toast.error('Write a student note first before generating a message.');
      return;
    }
    setGenerating(true);
    const generatedText = buildDemoParentDraft({ student, attendanceRecord, notes });
    setAiDraft(generatedText);
    setEditedMessage(generatedText);
    onSaveParentUpdate(student.id, {
      notes: localNotes,
      aiDraft: generatedText,
      finalMessage: editedMessage || generatedText,
      status: 'ai_draft_generated',
    });
    setShowMessageEditor(true);
    setGenerating(false);
    toast.info('No real AI call is made in this prototype.');
  };

  const handleSaveDraft = () => {
    onSaveParentUpdate(student.id, {
      notes: localNotes,
      aiDraft,
      finalMessage: editedMessage,
      status: 'edited',
    });
    toast.success(`Draft saved for ${student.name}.`);
  };

  const handleApprove = () => {
    onSaveParentUpdate(student.id, {
      notes: localNotes,
      aiDraft,
      finalMessage: editedMessage,
      status: 'approved',
    });
    toast.success(`Parent update approved for ${student.name}.`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedMessage);
    toast.success('Message copied to clipboard.');
  };

  const handleNoteBlur = () => {
    if (localNotes !== (attendanceRecord?.notes || '')) {
      onNotesSave(student.id, localNotes);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm flex-shrink-0">
          {student.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="font-medium">{student.name}</div>
            <Badge variant="outline" className="w-fit">{studentCompletedCount}/5 complete • {studentCompletionPct}%</Badge>
          </div>
          <div className="flex gap-3 mt-1.5 flex-wrap">
            <StatusDot done={hasAttendance} label="Attendance done" />
            <StatusDot done={hasHomework} label="Homework done" />
            <StatusDot done={hasNote} label="Note added" />
            <StatusDot done={hasDraft} label="Parent draft generated" />
            <StatusDot done={isApproved} label="Parent update approved" />
            {isDraft && !isApproved && (
              <Badge variant="outline" className="text-xs py-0">Draft saved</Badge>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-5 pt-4 space-y-5">

          {/* Step 1: Attendance */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">1 · Attendance</p>
            <div className="flex flex-wrap gap-2">
              {ATTENDANCE_STATUSES.map(({ value, label, icon: Icon, activeClass }) => {
                const isActive = attendanceRecord?.status === value;
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    className={`gap-1 text-xs ${isActive ? activeClass : ''}`}
                    onClick={() => onAttendanceMark(student.id, 'status', value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Homework */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">2 · Homework</p>
            <div className="flex flex-wrap gap-2">
              {HOMEWORK_STATUSES.map(({ value, label, icon: Icon, activeClass }) => {
                const isActive = (attendanceRecord?.homework_status || 'not_assigned') === value;
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    className={`gap-1 text-xs ${isActive ? activeClass : ''}`}
                    onClick={() => onAttendanceMark(student.id, 'homework_status', value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Note */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">3 · Student Note</p>
            <Textarea
              placeholder="Brief note on today's performance, behavior, focus, etc. This will be used to generate the parent message."
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={handleNoteBlur}
              className="h-24 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">Nothing is sent automatically. Generate, edit, save draft, and approve manually.</p>
          </div>

          {/* Step 4: Parent Message */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">4 · Parent Message Draft</p>

            {!showMessageEditor ? (
              <Button
                onClick={handleGenerateDraft}
                disabled={generating || !localNotes.trim()}
                className="gap-2"
                variant="outline"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="h-4 w-4 text-primary" /> Generate Demo AI Draft</>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  AI-generated draft — edit freely before saving.
                </div>
                <p className="text-xs text-muted-foreground">No real AI call is made in this prototype.</p>
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="min-h-[160px] text-sm"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={!editedMessage.trim() || isApproved}
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isApproved ? 'Approved ✓' : 'Approve Parent Update'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={!editedMessage.trim() || isApproved}
                    className="gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save as Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    disabled={!editedMessage.trim()}
                    className="gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateDraft}
                    disabled={generating}
                    className="gap-1.5 text-muted-foreground"
                  >
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
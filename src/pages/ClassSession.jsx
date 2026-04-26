import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listClasses, listStudentsByClass, listAttendanceRecords, listParentUpdates } from '@/services/dataService';
import { saveAttendanceRecord, saveAttendanceNotes, saveSessionParentUpdate } from '@/services/classSessionService';
import { isTeacherRole } from '@/services/permissionService';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';
import ClassSelector from '@/components/classSession/ClassSelector';
import StudentSessionList from '@/components/classSession/StudentSessionList';
import SessionProgress from '@/components/classSession/SessionProgress';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassSession() {
  const { user } = useOutletContext();
  const isTeacher = isTeacherRole(user);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-session', user?.role, user?.email],
    queryFn: () => listClasses(user),
    enabled: !!user,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-session', selectedClassId, user?.role],
    queryFn: () => listStudentsByClass(user, selectedClassId),
    enabled: !!selectedClassId && !!user,
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-session', selectedClassId, selectedDate, user?.role],
    queryFn: () => listAttendanceRecords(user, { class_id: selectedClassId, date: selectedDate }),
    enabled: !!selectedClassId && !!selectedDate && !!user,
  });

  const { data: parentUpdates = [] } = useQuery({
    queryKey: ['parent-updates-session', selectedClassId, selectedDate, user?.role],
    queryFn: () => listParentUpdates(user),
    enabled: !!selectedClassId && !!user,
  });

  const attendanceMutation = useMutation({
    mutationFn: ({ studentId, field, value }) => saveAttendanceRecord(attendanceRecords, selectedClassId, selectedDate, studentId, field, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-session'] }),
  });

  const notesMutation = useMutation({
    mutationFn: ({ studentId, notes }) => saveAttendanceNotes(attendanceRecords, selectedClassId, selectedDate, studentId, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-session'] }),
  });

  const parentUpdateMutation = useMutation({
    mutationFn: ({ studentId, payload }) => saveSessionParentUpdate(parentUpdates, selectedClassId, user, studentId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-updates-session'] }),
  });

  const handleAttendanceMark = (studentId, field, value) => {
    const existing = attendanceRecords.find(r => r.student_id === studentId);
    attendanceMutation.mutate({ studentId, field, value });
  };

  const handleNotesSave = (studentId, notes) => {
    const existing = attendanceRecords.find(r => r.student_id === studentId);
    notesMutation.mutate({ studentId, notes });
  };

  const handleSaveParentUpdate = (studentId, { notes, aiDraft, finalMessage, status = 'saved' }) => {
    const existing = parentUpdates.find(p => p.student_id === studentId);
    parentUpdateMutation.mutate({
      studentId,
      payload: { notes, aiDraft, finalMessage, status },
    });
  };

  const handleSaveSession = () => {
    toast.success('Session saved. Attendance, homework, notes, and parent updates remain in demo mode only.');
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div>
      <PageHeader
        title="Class Session"
        description="Select class and date, complete each student workflow, then save the session. Nothing is sent automatically."
      />

      <ClassSelector
        classes={classes}
        selectedClassId={selectedClassId}
        onClassChange={setSelectedClassId}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {!selectedClassId ? (
        <EmptyState
          icon={ClipboardList}
          title="Select a class to begin"
          description="Choose a class and date above to start the session."
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No students in this class"
          description="Add students to this class first."
        />
      ) : (
        <>
          <SessionProgress
            students={students}
            attendanceRecords={attendanceRecords}
            parentUpdates={parentUpdates}
          />
          <StudentSessionList
            students={students}
            attendanceRecords={attendanceRecords}
            parentUpdates={parentUpdates}
            onAttendanceMark={handleAttendanceMark}
            onNotesSave={handleNotesSave}
            onSaveParentUpdate={handleSaveParentUpdate}
            selectedClass={selectedClass}
            user={user}
          />
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveSession} className="gap-2">
              <Save className="h-4 w-4" />
              Save Session
            </Button>
          </div>
        </>
      )}
    </div>
  );
}